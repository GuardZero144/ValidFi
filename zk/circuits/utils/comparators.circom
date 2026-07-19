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

    component lt = LessThan(n);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1] + 1;
    out <== lt.out;
}

// Checks if a == b
// Returns 1 if true, 0 if false
template IsEqual() {
    signal input in[2];
    signal output out;
    
    out <== IsZero()(in[0] - in[1]);
}

// Helper: Num2Bits conversion
// Converts number to n-bit binary representation
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc = 0;
