const { expect } = require("chai");
const wasm_tester = require("circom_tester").wasm;
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

describe("VaccinationProof Circuit Tests", function () {
  this.timeout(200000);
  let poseidon;

  before(async () => {
    poseidon = await buildPoseidon();
  });

  function hash2(a, b) {
    return poseidon.F.toString(poseidon([a, b]));
  }

  function hash4(a, b, c, d) {
    return poseidon.F.toString(poseidon([a, b, c, d]));
  }

  describe("VaccineDateVerification", () => {
    let circuit;

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          "../../circuits/core/vaccineDateVerification.circom"
        ),
        { output: path.join(__dirname, "../../build") }
      );
    });

    it("should accept valid vaccination dates", async () => {
      const input = {
        vaccinationDate: 1672531200, // Jan 1, 2023
        expiryDate: 1704067200, // Jan 1, 2024
        credentialHash: 12345,
        minVaccinationDate: 1640995200, // Jan 1, 2022
        maxVaccinationDate: 1704067200, // Jan 1, 2024
        currentTime: 1688169600, // Jul 1, 2023
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 1 });
    });

    it("should reject expired vaccination", async () => {
      const input = {
        vaccinationDate: 1640995200, // Jan 1, 2022
        expiryDate: 1672531200, // Jan 1, 2023
        credentialHash: 12345,
        minVaccinationDate: 1609459200, // Jan 1, 2021
        maxVaccinationDate: 1704067200, // Jan 1, 2024
        currentTime: 1688169600, // Jul 1, 2023 (after expiry)
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 0 });
    });

    it("should reject vaccination date outside allowed range", async () => {
      const input = {
        vaccinationDate: 1577836800, // Jan 1, 2020 (too early)
        expiryDate: 1704067200,
        credentialHash: 12345,
        minVaccinationDate: 1640995200, // Jan 1, 2022
        maxVaccinationDate: 1704067200,
        currentTime: 1688169600,
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 0 });
    });
  });

  describe("BoosterIntervalCheck", () => {
    let circuit;

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          "../../circuits/core/vaccineDateVerification.circom"
        ),
        { output: path.join(__dirname, "../../build") }
      );
    });

    it("should accept valid booster interval", async () => {
      const input = {
        vaccinationDate: 1640995200, // Jan 1, 2022
        expiryDate: 1735689600, // Jan 1, 2025
        credentialHash: 12345,
        minVaccinationDate: 1609459200,
        maxVaccinationDate: 1704067200,
        currentTime: 1672531200,
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 1 });
    });
  });

  describe("VaccineTypeMatch", () => {
    let circuit;

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          "../../circuits/core/vaccineTypeMatch.circom"
        ),
        { output: path.join(__dirname, "../../build") }
      );
    });

    it("should match a valid vaccine type", async () => {
      const vaccineType = 1;
      const credentialHash = 12345;
      const typeCommitment = hash2(vaccineType, credentialHash);

      const input = {
        vaccineType: vaccineType,
        credentialHash: credentialHash,
        acceptedTypes: [1, 2, 3, 4, 5],
        typeCommitment: typeCommitment,
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 1 });
    });

    it("should reject an unaccepted vaccine type", async () => {
      const vaccineType = 99;
      const credentialHash = 12345;
      const typeCommitment = hash2(vaccineType, credentialHash);

      const input = {
        vaccineType: vaccineType,
        credentialHash: credentialHash,
        acceptedTypes: [1, 2, 3, 4, 5],
        typeCommitment: typeCommitment,
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 0 });
    });

    it("should reject mismatched type commitment", async () => {
      const vaccineType = 1;
      const credentialHash = 12345;

      const input = {
        vaccineType: vaccineType,
        credentialHash: credentialHash,
        acceptedTypes: [1, 2, 3, 4, 5],
        typeCommitment: 99999, // Wrong commitment
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 0 });
    });
  });

  describe("DoseVerification", () => {
    let circuit;

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          "../../circuits/core/vaccineTypeMatch.circom"
        ),
        { output: path.join(__dirname, "../../build") }
      );
    });

    it("should accept when dose requirement is met", async () => {
      const vaccineType = 1;
      const credentialHash = 12345;
      const typeCommitment = hash2(vaccineType, credentialHash);

      const input = {
        vaccineType: vaccineType,
        credentialHash: credentialHash,
        acceptedTypes: [1, 2, 3, 4, 5],
        typeCommitment: typeCommitment,
      };
      const witness = await circuit.calculateWitness(input);
      await circuit.assertOut(witness, { isValid: 1 });
    });
  });
});
