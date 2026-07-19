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
