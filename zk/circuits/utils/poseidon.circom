pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

// Wrapper for Poseidon hash with 2 inputs
// Used for nullifier generation and credential hashing
template Poseidon2() {
    signal input in[2];
    signal output out;
    
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== in[0];
    poseidon.inputs[1] <== in[1];
    out <== poseidon.out;
}

// Wrapper for Poseidon hash with 3 inputs
// Used for complex credential hashing
template Poseidon3() {
    signal input in[3];
    signal output out;
    
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== in[0];
    poseidon.inputs[1] <== in[1];
    poseidon.inputs[2] <== in[2];
    out <== poseidon.out;
}

// Wrapper for Poseidon hash with 4 inputs
// Used for vaccination record hashing
template Poseidon4() {
    signal input in[4];
    signal output out;
    
    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== in[0];
    poseidon.inputs[1] <== in[1];
    poseidon.inputs[2] <== in[2];
    poseidon.inputs[3] <== in[3];
    out <== poseidon.out;
}
