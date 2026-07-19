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

    var e2 = 1;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc += out[i] * e2;
        e2 = e2 + e2;
    }
    lc === in;
}


// Helper: IsZero check
// Returns 1 if input is 0, 0 otherwise
template IsZero() {
    signal input in;
    signal output out;
    signal inv;
    
    inv <-- in != 0 ? 1 / in : 0;
    out <== -in * inv + 1;
    in * out === 0;
}

// Checks if value is within range [min, max] inclusive
// Returns 1 if true, 0 if false
template InRange(n) {
    signal input value;
    signal input min;
    signal input max;
    signal output out;
    
    component gte = LessEqThan(n);
    gte.in[0] <== min;
    gte.in[1] <== value;
    
    component lte = LessEqThan(n);
    lte.in[0] <== value;
    lte.in[1] <== max;
    
    out <== gte.out * lte.out;
}
