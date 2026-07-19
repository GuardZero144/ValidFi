pragma circom 2.0.0;

include "./comparators.circom";

// Optimized range check for date validation
// Ensures value is within [min, max] range with minimal constraints
// Uses 64-bit comparison for Unix timestamps
template RangeCheck() {
    signal input value;
    signal input min;
    signal input max;
    signal output isValid;
    
    // Check: min <= value <= max
    component rangeChecker = InRange(64);
    rangeChecker.value <== value;
    rangeChecker.min <== min;
    rangeChecker.max <== max;
    
    isValid <== rangeChecker.out;
}

// Multi-condition range check
// Validates multiple ranges simultaneously
template MultiRangeCheck(numRanges) {
    signal input values[numRanges];
    signal input mins[numRanges];
    signal input maxs[numRanges];
    signal output isValid;
    
    component rangeChecks[numRanges];
    signal results[numRanges];
    
    for (var i = 0; i < numRanges; i++) {
        rangeChecks[i] = RangeCheck();
        rangeChecks[i].value <== values[i];
        rangeChecks[i].min <== mins[i];
        rangeChecks[i].max <== maxs[i];
        results[i] <== rangeChecks[i].isValid;
    }
    
