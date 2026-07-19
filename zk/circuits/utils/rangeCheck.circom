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
