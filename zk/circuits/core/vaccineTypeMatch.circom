pragma circom 2.0.0;

include "../utils/comparators.circom";
include "../utils/poseidon.circom";

// Phase 2: Vaccine type matching circuit
// Proves that a vaccination record matches an accepted vaccine type
// without revealing which specific vaccine was administered
template VaccineTypeMatch(numAcceptedTypes) {
    // Private inputs
    signal input vaccineType;        // Numeric code of the administered vaccine
    signal input credentialHash;     // Hash of the credential for binding

    // Public inputs
    signal input acceptedTypes[numAcceptedTypes]; // List of accepted vaccine type codes
    signal input typeCommitment;     // Poseidon commitment to the vaccine type

    // Output
    signal output isValid;
    signal output matchedIndex;      // Index of matched type (0 if none)

    // Verify type commitment matches
    component commitmentCheck = Poseidon2();
    commitmentCheck.in[0] <== vaccineType;
    commitmentCheck.in[1] <== credentialHash;

    component commitmentEqual = IsEqual();
    commitmentEqual.in[0] <== commitmentCheck.out;
    commitmentEqual.in[1] <== typeCommitment;

    // Check if vaccineType matches any accepted type
    component equalityChecks[numAcceptedTypes];
    signal matchFlags[numAcceptedTypes + 1];
    matchFlags[0] <== 0;

    for (var i = 0; i < numAcceptedTypes; i++) {
        equalityChecks[i] = IsEqual();
        equalityChecks[i].in[0] <== vaccineType;
        equalityChecks[i].in[1] <== acceptedTypes[i];
        matchFlags[i + 1] <== matchFlags[i] + equalityChecks[i].out;
    }

    // At least one match found
    signal hasMatch;
    component matchCheck = IsZero();
    matchCheck.in <== matchFlags[numAcceptedTypes];
    hasMatch <== 1 - matchCheck.out;

    // Both commitment and type match must hold
    isValid <== commitmentEqual.out * hasMatch;

    // matchedIndex is the count of matches (for downstream use)
    matchedIndex <== matchFlags[numAcceptedTypes];
}

// Proves a specific dose number in a multi-dose regimen
template DoseVerification() {
    // Private inputs
    signal input doseNumber;         // Current dose number (1, 2, 3, ...)
    signal input totalDoses;         // Total doses in regimen

    // Public inputs
    signal input requiredDoses;      // Minimum doses required
    signal input credentialHash;     // Binding to credential

    // Output
    signal output isFullyVaccinated;
    signal output doseCount;

    // Verify doseNumber is within valid range [1, totalDoses]
    component doseRange = InRange(32);
    doseRange.value <== doseNumber;
    doseRange.min <== 1;
    doseRange.max <== totalDoses;

    // Verify totalDoses is at least requiredDoses
    component totalCheck = LessEqThan(32);
    totalCheck.in[0] <== requiredDoses;
    totalCheck.in[1] <== totalDoses;

    // Fully vaccinated if doseNumber >= requiredDoses
    component fullyVax = LessEqThan(32);
    fullyVax.in[0] <== requiredDoses;
    fullyVax.in[1] <== doseNumber;

    isFullyVaccinated <== doseRange.out * totalCheck.out * fullyVax.out;
    doseCount <== doseNumber;
}
