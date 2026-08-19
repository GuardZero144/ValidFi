const { expect } = require("chai");
const {
  validateProofInput,
} = require("../../src/inputValidator");
const {
  ProofGenerationError,
  ErrorCode,
} = require("../../src/errors");
const {
  ProofErrorHandler,
} = require("../../src/errorHandler");
const { ProofCache } = require("../../src/proofCache");

describe("Proof Generation Service Tests", function () {
  this.timeout(30000);

  describe("Input Validation", () => {
    const validInput = {
      merkleRoot: 12345,
      minVaccinationDate: 1640995200,
      maxVaccinationDate: 1704067200,
      currentTime: 1688169600,
      acceptedTypes: [1, 2, 3, 4, 5],
      typeCommitment: 67890,
      requiredDoses: 2,
      externalNullifier: 11111,
      vaccinationDate: 1672531200,
      expiryDate: 1704067200,
      vaccineType: 1,
      doseNumber: 2,
      totalDoses: 2,
      credentialHash: 54321,
      userSecret: 99999,
      merklePathElements: new Array(20).fill(0),
      merklePathIndices: new Array(20).fill(0),
    };

    it("should accept valid input", () => {
      expect(() => validateProofInput(validInput)).to.not.throw();
    });

    it("should reject null input", () => {
      expect(() => validateProofInput(null)).to.throw(
        ProofGenerationError
      );
    });

    it("should reject missing required fields", () => {
      const input = { ...validInput };
      delete input.merkleRoot;
      expect(() => validateProofInput(input)).to.throw(
        ProofGenerationError
      );
    });

    it("should reject invalid merkle path length", () => {
      const input = {
        ...validInput,
        merklePathElements: new Array(10).fill(0),
      };
      expect(() => validateProofInput(input)).to.throw(
        /merklePathElements must have exactly 20/
      );
    });

    it("should reject invalid path indices (not 0 or 1)", () => {
      const indices = new Array(20).fill(0);
      indices[5] = 2;
      const input = { ...validInput, merklePathIndices: indices };
      expect(() => validateProofInput(input)).to.throw(
        /must be 0 or 1/
      );
    });

    it("should reject doseNumber > totalDoses", () => {
      const input = { ...validInput, doseNumber: 5, totalDoses: 2 };
      expect(() => validateProofInput(input)).to.throw(
        /doseNumber cannot exceed totalDoses/
      );
    });

    it("should reject expiryDate before vaccinationDate", () => {
      const input = {
        ...validInput,
        vaccinationDate: 1704067200,
        expiryDate: 1672531200,
      };
      expect(() => validateProofInput(input)).to.throw(
        /expiryDate must be after vaccinationDate/
      );
    });

    it("should reject wrong acceptedTypes length", () => {
      const input = { ...validInput, acceptedTypes: [1, 2, 3] };
      expect(() => validateProofInput(input, 20, 5)).to.throw(
        /acceptedTypes must have exactly 5/
      );
    });

    it("should reject minVaccinationDate >= maxVaccinationDate", () => {
      const input = {
        ...validInput,
        minVaccinationDate: 1704067200,
        maxVaccinationDate: 1640995200,
      };
      expect(() => validateProofInput(input)).to.throw(
        /minVaccinationDate must be less than maxVaccinationDate/
      );
    });
  });

  describe("Error Handler", () => {
    it("should wrap generic errors with proper codes", () => {
      const error = new Error("WASM file not found");
      const wrapped = ProofErrorHandler.wrap(error, {
        circuit: "test",
      });
      expect(wrapped).to.be.instanceOf(ProofGenerationError);
      expect(wrapped.code).to.equal(ErrorCode.CIRCUIT_NOT_COMPILED);
    });

    it("should identify retryable errors", () => {
      const timeoutError = new ProofGenerationError(
        "timeout",
        ErrorCode.TIMEOUT
      );
      expect(ProofErrorHandler.isRetryable(timeoutError)).to.be.true;

      const inputError = new ProofGenerationError(
        "bad input",
        ErrorCode.INVALID_INPUT
      );
      expect(ProofErrorHandler.isRetryable(inputError)).to.be.false;
    });

    it("should provide recovery suggestions", () => {
      const error = new ProofGenerationError(
        "not compiled",
        ErrorCode.CIRCUIT_NOT_COMPILED
      );
      const suggestion = ProofErrorHandler.getRecoverySuggestion(error);
      expect(suggestion).to.include("npm run compile");
    });
  });

  describe("Proof Cache", () => {
    let cache;

    beforeEach(() => {
      cache = new ProofCache({ maxSize: 5, ttlMs: 1000 });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should cache and retrieve values", () => {
      const input = { a: 1, b: 2 };
      const value = { proof: "test" };

      cache.set(input, value);
      const result = cache.get(input);

      expect(result).to.deep.equal(value);
    });

    it("should return null for cache miss", () => {
      const result = cache.get({ x: 99 });
      expect(result).to.be.null;
    });

    it("should evict oldest entries when full", () => {
      for (let i = 0; i < 10; i++) {
        cache.set({ key: i }, { value: i });
      }
      expect(cache.cache.size).to.be.at.most(5);
    });

    it("should expire entries after TTL", async () => {
      const shortCache = new ProofCache({ ttlMs: 50 });
      shortCache.set({ a: 1 }, { proof: "test" });

      await new Promise((r) => setTimeout(r, 100));

      const result = shortCache.get({ a: 1 });
      expect(result).to.be.null;
      shortCache.destroy();
    });

    it("should track hit rate statistics", () => {
      cache.set({ a: 1 }, { proof: "test" });
      cache.get({ a: 1 }); // hit
      cache.get({ a: 2 }); // miss

      const stats = cache.getStats();
      expect(stats.hits).to.equal(1);
      expect(stats.misses).to.equal(1);
      expect(stats.hitRate).to.equal(50);
    });

    it("should clear all entries", () => {
      cache.set({ a: 1 }, { proof: "test" });
      cache.set({ b: 2 }, { proof: "test2" });
      cache.clear();

      expect(cache.cache.size).to.equal(0);
    });
  });

  describe("Error Codes", () => {
    it("should have all expected error codes", () => {
      expect(ErrorCode.INVALID_INPUT).to.exist;
      expect(ErrorCode.CIRCUIT_NOT_COMPILED).to.exist;
      expect(ErrorCode.SETUP_NOT_COMPLETE).to.exist;
      expect(ErrorCode.WITNESS_GENERATION_FAILED).to.exist;
      expect(ErrorCode.PROOF_GENERATION_FAILED).to.exist;
      expect(ErrorCode.VERIFICATION_FAILED).to.exist;
      expect(ErrorCode.CREDENTIAL_EXPIRED).to.exist;
      expect(ErrorCode.INVALID_VACCINE_TYPE).to.exist;
      expect(ErrorCode.INCOMPLETE_DOSES).to.exist;
      expect(ErrorCode.NULLIFIER_REUSE).to.exist;
      expect(ErrorCode.TIMEOUT).to.exist;
      expect(ErrorCode.OUT_OF_MEMORY).to.exist;
      expect(ErrorCode.SOROBAN_INTEGRATION_FAILED).to.exist;
    });
  });

  describe("ProofGenerationError", () => {
    it("should serialize to JSON", () => {
      const error = new ProofGenerationError(
        "test error",
        ErrorCode.INVALID_INPUT,
        { field: "merkleRoot" }
      );
      const json = error.toJSON();

      expect(json.name).to.equal("ProofGenerationError");
      expect(json.message).to.equal("test error");
      expect(json.code).to.equal(ErrorCode.INVALID_INPUT);
      expect(json.context.field).to.equal("merkleRoot");
      expect(json.timestamp).to.be.a("number");
    });
  });
});
