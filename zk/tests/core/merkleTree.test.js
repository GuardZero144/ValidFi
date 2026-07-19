const { expect } = require("chai");
const wasm_tester = require("circom_tester").wasm;
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

describe("MerkleTree Circuit Tests", function() {
    this.timeout(100000);
    let circuit;
    let poseidon;
    
    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../../circuits/core/merkleTree.circom"),
            { output: path.join(__dirname, "../../build") }
        );
        poseidon = await buildPoseidon();
    });
    
    function hash(left, right) {
        return poseidon.F.toString(poseidon([left, right]));
    }
    
    it("should verify valid merkle proof for depth 3", async () => {
        // Build a simple merkle tree of depth 3
        const leaf = 1;
        const sibling1 = 2;
        const sibling2 = 3;
        const sibling3 = 4;
        
        // Calculate merkle path (leaf is leftmost)
        const level1 = hash(leaf, sibling1);
        const level2 = hash(level1, sibling2);
        const root = hash(level2, sibling3);
        
        const input = {
            root: root,
            leaf: leaf,
            pathElements: [sibling1, sibling2, sibling3],
            pathIndices: [0, 0, 0]
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.assertOut(witness, { isValid: 1 });
    });
    
    it("should reject invalid merkle proof", async () => {
        const input = {
            root: 999,
            leaf: 1,
            pathElements: [2, 3, 4],
            pathIndices: [0, 0, 0]
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.assertOut(witness, { isValid: 0 });
    });
});
