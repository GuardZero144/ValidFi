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
    
    // Compute the merkle root from leaf and path
    component hashers[levels];
    component mux[levels];
    
    signal hashes[levels + 1];
    hashes[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        // Select left or right based on pathIndices
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        
        hashers[i] = Poseidon2();
        
        // If pathIndices[i] == 0, current hash is left child
        // If pathIndices[i] == 1, current hash is right child
        hashers[i].in[0] <== (1 - pathIndices[i]) * hashes[i] + pathIndices[i] * pathElements[i];
        hashers[i].in[1] <== pathIndices[i] * hashes[i] + (1 - pathIndices[i]) * pathElements[i];
        
        hashes[i + 1] <== hashers[i].out;
    }

    
    // Verify computed root matches the expected root
    component rootCheck = IsEqual();
    rootCheck.in[0] <== hashes[levels];
    rootCheck.in[1] <== root;
    
    isValid <== rootCheck.out;
}
