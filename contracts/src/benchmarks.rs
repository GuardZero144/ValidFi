//! Performance benchmarks for the credential (`Verification`) contract.
//!
//! These benchmarks measure on-host resource usage (CPU instructions and
//! memory bytes via [`Env::budget`]) and wall-clock execution time for every
//! credential operation, plus load tests that exercise the contract under a
//! growing number of records.
//!
//! Run them with:
//!
//! ```text
//! cargo test --features testutils benchmarks -- --nocapture
//! ```
//!
//! The `--nocapture` flag is required to see the printed measurement tables.
//! Without it the benchmarks still run and assert that costs stay within the
//! Soroban per-transaction resource limits, so they double as regression
//! guards.
//!
//! Caveat: when run natively (as Rust, not compiled to Wasm) the host
//! under-estimates CPU and memory relative to on-chain execution. The numbers
//! here are therefore a *relative* baseline for comparing operations and
//! catching regressions, not an exact prediction of mainnet fees. See
//! `docs/PERFORMANCE.md` for the methodology and recorded results.

extern crate std;

use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};
use std::time::Instant;

use crate::verification::{Verification, VerificationClient};

// Soroban network per-transaction resource limits (Protocol 21). Native
// metering under-estimates real Wasm execution, so every operation should sit
// comfortably below these ceilings; the asserts catch pathological regressions.
const TX_CPU_LIMIT: u64 = 100_000_000;
const TX_MEM_LIMIT: u64 = 40 * 1024 * 1024; // 40 MiB

fn setup() -> (Env, VerificationClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    // Remove the default per-transaction budget cap so load tests can perform
    // many operations back-to-back; we re-measure isolated costs by resetting
    // the budget (which also zeroes the consumption tracker) before each op.
    env.budget().reset_unlimited();
    let contract_id = env.register_contract(None, Verification {});
    let client = VerificationClient::new(&env, &contract_id);
    let verifier = Address::generate(&env);
    (env, client, verifier)
}

/// Reset the metered budget so the next operation is measured in isolation.
/// `reset_unlimited` keeps tracking consumption but removes the limit so load
/// tests that perform many operations back-to-back never trip the cap.
fn reset_budget(env: &Env) {
    let mut budget = env.budget();
    budget.reset_unlimited();
}

/// Read the CPU instructions and memory bytes consumed since the last reset.
fn consumed(env: &Env) -> (u64, u64) {
    let budget = env.budget();
    (budget.cpu_instruction_cost(), budget.memory_bytes_cost())
}

fn report_op(name: &str, cpu: u64, mem: u64) {
    std::println!(
        "  {:<34} cpu_insns = {:>12}   mem_bytes = {:>10}",
        name,
        cpu,
        mem
    );
    // Regression guard: a single credential operation must stay well within
    // the per-transaction network limits.
    assert!(cpu > 0, "{name}: expected non-zero CPU cost");
    assert!(
        cpu < TX_CPU_LIMIT,
        "{name}: CPU cost {cpu} exceeded tx limit {TX_CPU_LIMIT}"
    );
    assert!(
        mem < TX_MEM_LIMIT,
        "{name}: memory cost {mem} exceeded tx limit {TX_MEM_LIMIT}"
    );
}

fn report_load(name: &str, n: u64, cpu: u64, mem: u64, elapsed_secs: f64) {
    let per_op_us = if n > 0 {
        (elapsed_secs * 1_000_000.0) / n as f64
    } else {
        0.0
    };
    std::println!(
        "  {:<34} n = {:>4}   total_cpu = {:>14}   total_mem = {:>12}   wall = {:>8.3}ms   per_op = {:>8.1}us",
        name,
        n,
        cpu,
        mem,
        elapsed_secs * 1000.0,
        per_op_us
    );
}

fn proof(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[7u8; 32])
}

fn commitment(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[9u8; 32])
}

// ── Per-operation gas (budget) benchmarks ──────────────────────────────────

#[test]
fn bench_per_operation_costs() {
    let (env, client, verifier) = setup();
    let p = proof(&env);
    let c = commitment(&env);

    std::println!("\n[credential per-operation budget cost]");

    // submit_proof — create a credential proof.
    reset_budget(&env);
    let id = client.submit_proof(&1u64, &verifier, &p, &c);
    let (cpu, mem) = consumed(&env);
    report_op("submit_proof", cpu, mem);

    // approve_verification — approve a pending credential.
    reset_budget(&env);
    client.approve_verification(&id);
    let (cpu, mem) = consumed(&env);
    report_op("approve_verification", cpu, mem);

    // get_verification — read the full record.
    reset_budget(&env);
    let _ = client.get_verification(&id);
    let (cpu, mem) = consumed(&env);
    report_op("get_verification (read)", cpu, mem);

    // get_verification_status — read just the status string.
    reset_budget(&env);
    let _ = client.get_verification_status(&id);
    let (cpu, mem) = consumed(&env);
    report_op("get_verification_status (read)", cpu, mem);

    // is_verification_valid — validity check (status + revocation).
    reset_budget(&env);
    let _ = client.is_verification_valid(&id);
    let (cpu, mem) = consumed(&env);
    report_op("is_verification_valid (read)", cpu, mem);

    // revoke_verification — revoke a credential (also appends to the
    // revocation list, see the load benchmark below).
    reset_budget(&env);
    client.revoke_verification(&id, &String::from_str(&env, "compromised"));
    let (cpu, mem) = consumed(&env);
    report_op("revoke_verification", cpu, mem);

    // reject_verification — reject a (different) pending credential.
    let id2 = client.submit_proof(&2u64, &verifier, &p, &c);
    reset_budget(&env);
    client.reject_verification(&id2, &String::from_str(&env, "invalid proof"));
    let (cpu, mem) = consumed(&env);
    report_op("reject_verification", cpu, mem);
}

#[test]
fn bench_full_lifecycle_cost() {
    let (env, client, verifier) = setup();
    let p = proof(&env);
    let c = commitment(&env);

    std::println!("\n[credential full lifecycle: submit -> approve -> revoke]");

    reset_budget(&env);
    let id = client.submit_proof(&42u64, &verifier, &p, &c);
    client.approve_verification(&id);
    client.revoke_verification(&id, &String::from_str(&env, "rotated"));
    let (cpu, mem) = consumed(&env);
    report_op("submit+approve+revoke", cpu, mem);
}

// ── Execution-time benchmarks ──────────────────────────────────────────────

#[test]
fn bench_execution_time() {
    let (env, client, verifier) = setup();
    let p = proof(&env);
    let c = commitment(&env);

    std::println!("\n[credential execution time]");

    const ITERS: u64 = 200;

    // Time submit_proof across many calls.
    let start = Instant::now();
    for i in 0..ITERS {
        client.submit_proof(&i, &verifier, &p, &c);
    }
    let elapsed = start.elapsed().as_secs_f64();
    report_load("submit_proof", ITERS, 0, 0, elapsed);

    // Time a read-heavy op (is_verification_valid) across many calls.
    let id = client.submit_proof(&9_999u64, &verifier, &p, &c);
    client.approve_verification(&id);
    let start = Instant::now();
    for _ in 0..ITERS {
        let _ = client.is_verification_valid(&id);
    }
    let elapsed = start.elapsed().as_secs_f64();
    report_load("is_verification_valid", ITERS, 0, 0, elapsed);
}

// ── Load tests ─────────────────────────────────────────────────────────────

#[test]
fn bench_load_create_many_credentials() {
    std::println!("\n[load: create N credentials]");

    let mut totals: std::vec::Vec<(u64, u64)> = std::vec::Vec::new(); // (n, cpu)

    for &n in [10u64, 50, 100].iter() {
        // Fresh contract instance per batch so each measurement is independent.
        let (env, client, verifier) = setup();
        let p = proof(&env);
        let c = commitment(&env);

        reset_budget(&env);
        let start = Instant::now();
        for i in 0..n {
            client.submit_proof(&i, &verifier, &p, &c);
        }
        let elapsed = start.elapsed().as_secs_f64();
        let (cpu, mem) = consumed(&env);
        report_load("submit_proof xN", n, cpu, mem, elapsed);
        totals.push((n, cpu));

        // Sanity: the contract really did store all N records.
        let _ = client.get_verification(&n); // verification ids are 1..=n
    }

    // Regression guard against re-introducing the instance-storage bottleneck.
    //
    // With per-credential data in persistent storage, growing the batch 10x
    // (n=10 -> n=100) costs ~33x here (the residual super-linear factor is a
    // native test-host artifact — see the module/docs note: the in-memory host
    // re-snapshots the whole ledger each invocation). With the data back in
    // *instance* storage the same 10x growth cost ~89x. A 6x-over-linear
    // ceiling cleanly sits between the two, so this only fires if the storage
    // model regresses.
    let (n_small, cpu_small) = totals[0];
    let (n_big, cpu_big) = totals[totals.len() - 1];
    let size_ratio = n_big / n_small; // 10x
    let linear = cpu_small.saturating_mul(size_ratio);
    assert!(
        cpu_big <= linear.saturating_mul(6),
        "submit_proof cost is scaling like instance storage (O(n^2) regression): \
         n={n_small} -> {cpu_small} cpu, n={n_big} -> {cpu_big} cpu"
    );
}

/// Shows the impact of the storage optimisation: because each credential lives
/// in its own persistent entry, the marginal cost of creating a credential no
/// longer scales with the total credential count the way instance storage did.
/// We compare the cost of the 1st credential against the 100th in the same
/// contract.
///
/// Recorded (native test host, see docs/PERFORMANCE.md):
///   * instance storage  : #1 ≈ 57k cpu, #100 ≈ 2.9M cpu  (~51x)
///   * persistent storage: #1 ≈ 84k cpu, #100 ≈ 0.77M cpu (~9x)
///
/// On-chain the persistent path is O(1) per op (independent ledger entries);
/// the ~9x residual is the test host re-snapshotting all entries each call.
#[test]
fn bench_submit_proof_scaling() {
    let (env, client, verifier) = setup();
    let p = proof(&env);
    let c = commitment(&env);

    std::println!("\n[scaling: submit_proof cost vs existing credential count]");

    // Cost of the very first credential.
    reset_budget(&env);
    client.submit_proof(&0u64, &verifier, &p, &c);
    let (first_cpu, first_mem) = consumed(&env);
    report_op("submit_proof #1 (0 existing)", first_cpu, first_mem);

    // Grow the contract to 99 stored credentials.
    for i in 1..99u64 {
        client.submit_proof(&i, &verifier, &p, &c);
    }

    // Cost of the 100th credential, with 99 already stored.
    reset_budget(&env);
    client.submit_proof(&99u64, &verifier, &p, &c);
    let (hundredth_cpu, hundredth_mem) = consumed(&env);
    report_op(
        "submit_proof #100 (99 existing)",
        hundredth_cpu,
        hundredth_mem,
    );

    // Regression guard: with persistent storage the 100th credential costs
    // ~9x the 1st on the native host; with instance storage it was ~51x. A 20x
    // ceiling separates the two.
    assert!(
        hundredth_cpu <= first_cpu.saturating_mul(20),
        "submit_proof cost grows with stored credential count like instance storage: \
         #1={first_cpu} cpu, #100={hundredth_cpu} cpu"
    );
    assert!(hundredth_cpu < TX_CPU_LIMIT);
    assert!(hundredth_mem < TX_MEM_LIMIT);
}
