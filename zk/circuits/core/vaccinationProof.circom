pragma circom 2.0.0;

include "./merkleTree.circom";
include "./vaccineDateVerification.circom";
include "./vaccineTypeMatch.circom";
include "../utils/poseidon.circom";
include "../utils/comparators.circom";

// Phase 3: Main VaccinationProof circuit
// Composes all sub-circuits into a single proof of vaccination status
//
// Public outputs prove:
// 1. Credential exists in the registry (Merkle membership)
// 2. Vaccination date is valid and not expired
// 3. Vaccine type is among accepted types
// 4. Dose regimen is complete
// 5. Nullifier prevents proof replay
//
// Private inputs protect:
// - Patient identity (only credential hash is used)
// - Specific vaccine type (only commitment is revealed)
// - Merkle path (sibling hashes)
// - Credential details
template VaccinationProof(merkleLevels, numAcceptedTypes) {
    // ── Public Inputs ──────────────────────────────────────────────────
    signal input merkleRoot;                     // Registry merkle root
    signal input minVaccinationDate;             // Earliest valid vaccination date
    signal input maxVaccinationDate;             // Latest valid vaccination date
    signal input currentTime;                    // Current timestamp
    signal input acceptedTypes[numAcceptedTypes]; // Accepted vaccine codes
    signal input typeCommitment;                 // Poseidon(vaccineType, credentialHash)
    signal input requiredDoses;                  // Minimum doses required
    signal input externalNullifier;              // Domain separator for nullifier

    // ── Private Inputs ─────────────────────────────────────────────────
    signal input vaccinationDate;                // When vaccinated
    signal input expiryDate;                     // Credential expiry
    signal input vaccineType;                    // Vaccine type code
    signal input doseNumber;                     // Current dose number
    signal input totalDoses;                     // Total doses in regimen
    signal input credentialHash;                 // Poseidon hash of credential
    signal input userSecret;                     // User's private secret
    signal input merklePathElements[merkleLevels]; // Sibling hashes
    signal input merklePathIndices[merkleLevels];  // Path directions

    // ── Outputs ────────────────────────────────────────────────────────
    signal output isValid;                       // 1 if all checks pass
    signal output nullifier;                     // Prevents proof replay
    signal output isFullyVaccinated;             // Dose completion status

    // ── Sub-circuit 1: Merkle Membership ───────────────────────────────
    component merkleProof = MerkleTreeChecker(merkleLevels);
    merkleProof.root <== merkleRoot;
    merkleProof.leaf <== credentialHash;
    for (var i = 0; i < merkleLevels; i++) {
        merkleProof.pathElements[i] <== merklePathElements[i];
        merkleProof.pathIndices[i] <== merklePathIndices[i];
    }

    // ── Sub-circuit 2: Date Verification ───────────────────────────────
    component dateCheck = VaccineDateVerification();
    dateCheck.vaccinationDate <== vaccinationDate;
    dateCheck.expiryDate <== expiryDate;
    dateCheck.credentialHash <== credentialHash;
    dateCheck.minVaccinationDate <== minVaccinationDate;
    dateCheck.maxVaccinationDate <== maxVaccinationDate;
    dateCheck.currentTime <== currentTime;

    // ── Sub-circuit 3: Vaccine Type Matching ───────────────────────────
    component typeCheck = VaccineTypeMatch(numAcceptedTypes);
    typeCheck.vaccineType <== vaccineType;
    typeCheck.credentialHash <== credentialHash;
    for (var i = 0; i < numAcceptedTypes; i++) {
        typeCheck.acceptedTypes[i] <== acceptedTypes[i];
    }
    typeCheck.typeCommitment <== typeCommitment;

    // ── Sub-circuit 4: Dose Verification ──────────────────────────────
    component doseCheck = DoseVerification();
    doseCheck.doseNumber <== doseNumber;
    doseCheck.totalDoses <== totalDoses;
    doseCheck.requiredDoses <== requiredDoses;
    doseCheck.credentialHash <== credentialHash;

    // ── Sub-circuit 5: Nullifier Generation ────────────────────────────
    // Prevents proof replay: nullifier = Poseidon(userSecret, externalNullifier)
    component nullifierHash = Poseidon2();
    nullifierHash.in[0] <== userSecret;
    nullifierHash.in[1] <== externalNullifier;
    nullifier <== nullifierHash.out;

    // ── Combine All Checks ─────────────────────────────────────────────
    signal step1;
    signal step2;
    signal step3;

    step1 <== merkleProof.isValid * dateCheck.isValid;
    step2 <== step1 * typeCheck.isValid;
    step3 <== step2 * doseCheck.isFullyVaccinated;

    isValid <== step3;
    isFullyVaccinated <== doseCheck.isFullyVaccinated;
}
