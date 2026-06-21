# Credential Contract Performance

Performance benchmarks for the credential (`Verification`) contract: gas/budget
cost per operation, execution time, behaviour under load, the storage bottleneck
they revealed, and the optimisation applied to fix it.

The benchmarks live in [`contracts/src/benchmarks.rs`](../contracts/src/benchmarks.rs)
and run as ordinary `cargo test` tests, so they also act as regression guards.

## Running the benchmarks

```bash
cd contracts
# Run the benchmarks and print the measurement tables:
cargo test --features testutils benchmarks -- --nocapture --test-threads=1

# Or just run them as pass/fail regression guards (part of the normal suite):
cargo test --features testutils
```

## Methodology

- **Gas / resource cost** is measured with the Soroban host budget
  (`env.budget()`): `cpu_instruction_cost()` (CPU instructions) and
  `memory_bytes_cost()` (memory bytes). The budget is reset before each measured
  operation so costs are isolated.
- **Execution time** is wall-clock time over many iterations
  (`std::time::Instant`), reported as total and per-operation.
- **Load** is measured by creating batches of credentials (N = 10, 50, 100) and
  by comparing the cost of the 1st vs the 100th credential in one contract.

### Important caveat

These numbers are produced by the **native test host**, not by the contract
compiled to Wasm and executed on-chain. The Soroban docs note that native
execution *under-estimates* CPU and memory relative to Wasm. Additionally, the
in-memory test host re-snapshots the whole ledger on each invocation, which adds
an O(n) component to batch measurements that does **not** exist on-chain.

Treat the figures as a **relative baseline** for comparing operations and
catching regressions — not as an exact prediction of mainnet fees. The
per-transaction network limits used as ceilings in the asserts are
`100,000,000` CPU instructions and `40 MiB` memory (Protocol 21).

## Per-operation cost (single credential)

Native host, isolated budget per call:

| Operation                  | CPU instructions | Memory bytes |
| -------------------------- | ---------------: | -----------: |
| `submit_proof`             |           84,486 |       11,981 |
| `approve_verification`     |           88,094 |       11,631 |
| `reject_verification`      |          124,712 |       18,526 |
| `revoke_verification`      |          123,447 |       16,531 |
| `get_verification` (read)  |           51,869 |        5,288 |
| `get_verification_status`  |           41,463 |        4,438 |
| `is_verification_valid`    |           42,654 |        4,524 |
| full lifecycle (submit→approve→revoke) | 296,023 |     40,135 |

All operations are well within the per-transaction network limits (largest is
~0.13% of the CPU budget).

## Behaviour under load — and the bottleneck

The original contract stored **every per-credential record in instance
storage**. Soroban serialises the *entire* instance data set on every contract
call, so each credential operation paid to load and re-save all previously
stored credentials. The result was O(n) cost per operation and O(n²) in
aggregate.

The load benchmark made this obvious. Creating the 100th credential cost ~51×
the 1st; a 10×-larger batch cost ~89× more:

| Batch size | CPU (instance, before) | CPU (persistent, after) | Improvement |
| ---------: | ---------------------: | ----------------------: | ----------: |
|       N=10 |              3,260,375 |               1,318,713 |       2.5×  |
|       N=50 |             73,943,848 |              13,605,947 |       5.4×  |
|      N=100 |            291,459,779 |              43,834,314 |       6.6×  |

Single-credential marginal cost (1st vs 100th in one contract):

| Measurement      | Instance (before) | Persistent (after) |
| ---------------- | ----------------: | -----------------: |
| `submit_proof` #1   |            56,729 |             84,486 |
| `submit_proof` #100 |        ~2,900,000 |            766,470 |
| ratio #100 / #1     |              ~51× |               ~9×  |

## Optimisation applied

Per-credential data was moved from **instance** storage to **persistent**
storage, keyed individually via a typed `DataKey` enum
(`Record(id)`, `IdentityIndex(id)`, `RejectReason(id)`, `RevokedList`). Only the
single, bounded monotonic `Counter` remains in instance storage. Persistent
entries get their TTL extended (~31 days) on read and write so active
credentials are not archived.

Because each credential now occupies its own ledger entry, a credential
operation only touches its own data — O(1) per op on-chain instead of O(n).

Results of the change:

- **N=100 batch CPU: 291.5M → 43.8M (6.6× cheaper); memory 53.9M → 13.6M
  (4.0× cheaper).**
- Marginal cost growth (1st → 100th credential): **~51× → ~9×** (the residual
  ~9× is the test-host snapshot artifact described above; on-chain this path is
  O(1)).
- Read operations also got cheaper because reads no longer deserialise the whole
  instance map: `get_verification` −26%, `is_verification_valid` −30%.
- Trade-off: a single isolated `submit_proof` is slightly more expensive
  (56.7k → 84.5k CPU) due to the per-entry TTL extension, but this fixed cost is
  dwarfed by the scaling win at any realistic credential volume, and
  `approve`/`reject` got cheaper.

## Remaining considerations / future work

- **`revoked_verifications` list:** `revoke_verification` still appends to a
  single `Vec<u64>` that is read and rewritten in full on each call — O(n) in the
  number of revocations. It now lives in persistent storage (so it no longer
  bloats every other operation), and revocation status is also stored directly on
  each record (`record.revoked`), so the list is only needed for enumeration via
  `get_revoked_verifications`. For high revocation volumes, consider replacing the
  monolithic list with paginated keys or relying on the emitted
  `VerificationRevoked` events for off-chain indexing.
- **`is_verification_valid`** allocates a `String` (`"approved"`) per call for
  comparison. Negligible today; could use an integer/enum status if status ever
  becomes hot-path.
- **On-chain measurement:** for fee-accurate numbers, re-run these scenarios
  against the Wasm build via the Stellar CLI / RPC `simulateTransaction` and
  record the resource fees. The relative ordering here should hold.
