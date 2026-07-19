pragma circom 2.0.0;

// Checks if a < b
// Returns 1 if true, 0 if false
template LessThan(n) {
    signal input in[2];
    signal output out;
    
    component num2Bits = Num2Bits(n);

    num2Bits.in <== in[0] + (1 << n) - in[1];
    out <== 1 - num2Bits.out[n];
}

// Checks if a <= b  
// Returns 1 if true, 0 if false
template LessEqThan(n) {
    signal input in[2];
    signal output out;
