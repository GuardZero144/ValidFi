pragma circom 2.0.0;

include "../utils/rangeCheck.circom";
include "../utils/poseidon.circom";

// Phase 2: Date verification circuit for vaccination records
// Validates that vaccination and expiry dates are within acceptable ranges
// Also enforces minimum interval between primary dose and booster
template VaccineDateVerification() {
    // Private inputs
    signal input vaccinationDate;    // Unix timestamp of vaccination
    signal input expiryDate;         // Unix timestamp of expiry
    signal input credentialHash;     // Hash of the credential

    // Public inputs
    signal input minVaccinationDate; // Earliest acceptable vaccination date
    signal input maxVaccinationDate; // Latest acceptable vaccination date
    signal input currentTime;        // Current Unix timestamp (not expired check)

    // Output
    signal output isValid;

    // Validate vaccination date is within acceptable range
    component vaccDateCheck = RangeCheck();
    vaccDateCheck.value <== vaccinationDate;
    vaccDateCheck.min <== minVaccinationDate;
    vaccDateCheck.max <== maxVaccinationDate;

    // Validate expiry date is after vaccination date
    component expiryAfterVacc = InRange(64);
    expiryAfterVacc.value <== expiryDate;
    expiryAfterVacc.min <== vaccinationDate + 1;
    expiryAfterVacc.max <== 4294967295; // Max uint32

    // Validate not expired: currentTime < expiryDate
    component notExpired = LessThan(64);
    notExpired.in[0] <== currentTime;
    notExpired.in[1] <== expiryDate;

    // All checks must pass
    signal intermediate;
    intermediate <== vaccDateCheck.isValid * expiryAfterVacc.out;
    isValid <== intermediate * notExpired.out;
}

// Validates booster interval: enough time between primary and booster doses
template BoosterIntervalCheck() {
    // Private inputs
    signal input primaryDate;        // Unix timestamp of primary vaccination
    signal input boosterDate;        // Unix timestamp of booster

    // Public inputs
    signal input minInterval;        // Minimum days between doses (in seconds)
    signal input maxInterval;        // Maximum days between doses (in seconds)

    // Output
    signal output isValid;

    // boosterDate must be after primaryDate
    component boosterAfterPrimary = LessThan(64);
    boosterAfterPrimary.in[0] <== primaryDate;
    boosterAfterPrimary.in[1] <== boosterDate;

    // Interval must be within [minInterval, maxInterval]
    signal interval;
    interval <== boosterDate - primaryDate;

    component intervalCheck = InRange(64);
    intervalCheck.value <== interval;
    intervalCheck.min <== minInterval;
    intervalCheck.max <== maxInterval;

    isValid <== boosterAfterPrimary.out * intervalCheck.out;
}
