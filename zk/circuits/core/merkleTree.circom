pragma circom 2.0.0;

include "../utils/poseidon.circom";
include "../utils/comparators.circom";

// Merkle tree membership proof
// Proves that a leaf exists in a Merkle tree with given root
// Uses Poseidon hash for efficiency (~150 constraints per hash)
template MerkleTreeChecker(levels) {
    // Public inputs
    signal input root;
    
    // Private inputs
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    // Output
    signal output isValid;
    
