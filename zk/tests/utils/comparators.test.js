const { expect } = require("chai");
const wasm_tester = require("circom_tester").wasm;
const path = require("path");

describe("Comparators Circuit Tests", function() {
    this.timeout(100000);
    
    describe("LessThan", () => {
        let circuit;
        
        before(async () => {
            circuit = await wasm_tester(
                path.join(__dirname, "../../circuits/utils/comparators.circom"),
                { output: path.join(__dirname, "../../build") }
            );
        });
        
        it("should return 1 when first input is less than second", async () => {
            const input = { in: [5, 10] };
            const witness = await circuit.calculateWitness(input);
            await circuit.assertOut(witness, { out: 1 });
        });
        
        it("should return 0 when first input equals second", async () => {
            const input = { in: [10, 10] };
            const witness = await circuit.calculateWitness(input);
            await circuit.assertOut(witness, { out: 0 });
        });
        
        it("should return 0 when first input is greater than second", async () => {
            const input = { in: [15, 10] };
            const witness = await circuit.calculateWitness(input);
            await circuit.assertOut(witness, { out: 0 });
        });
    });
    
    describe("IsEqual", () => {
        let circuit;
