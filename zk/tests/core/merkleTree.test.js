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
