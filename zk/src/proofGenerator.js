const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");
const { buildPoseidon } = require("circomlibjs");
const { ProofGenerationError, ErrorCode } = require("./errors");
const { ProofErrorHandler } = require("./errorHandler");
const { validateProofInput } = require("./inputValidator");
const { ProofCache } = require("./proofCache");

const DEFAULT_BUILD_DIR = path.join(__dirname, "..", "build");
const MERKLE_LEVELS = 20;
const NUM_ACCEPTED_TYPES = 5;

class VaccinationProofGenerator {
  constructor(options = {}) {
    this.buildDir = options.buildDir || DEFAULT_BUILD_DIR;
    this.merkleLevels = options.merkleLevels || MERKLE_LEVELS;
    this.numAcceptedTypes = options.numAcceptedTypes || NUM_ACCEPTED_TYPES;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 60000; // 60 seconds

    this.cache = new ProofCache({
      maxSize: options.cacheSize || 500,
      ttlMs: options.cacheTtlMs || 5 * 60 * 1000,
    });

    this.poseidon = null;
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;

    this.poseidon = await buildPoseidon();

    const circuitName = "VaccinationProof";
    this.wasmPath = path.join(
      this.buildDir,
      `${circuitName}_js`,
      `${circuitName}.wasm`
    );
    this.zkeyPath = path.join(
      this.buildDir,
      `${circuitName}_final.zkey`
    );
    this.vkeyPath = path.join(
      this.buildDir,
      `${circuitName}_verification_key.json`
    );

    this._initialized = true;
  }

  _ensureInitialized() {
    if (!this._initialized) {
      throw new ProofGenerationError(
        "ProofGenerator not initialized. Call initialize() first.",
        ErrorCode.CIRCUIT_NOT_COMPILED
      );
    }
  }

  _validateBuildArtifacts() {
    const artifacts = [
      { path: this.wasmPath, name: "Circuit WASM" },
      { path: this.zkeyPath, name: "Proving key (zkey)" },
    ];

    for (const artifact of artifacts) {
      if (!fs.existsSync(artifact.path)) {
        throw new ProofGenerationError(
          `${artifact.name} not found at ${artifact.path}`,
          artifact.name.includes("WASM")
            ? ErrorCode.CIRCUIT_NOT_COMPILED
            : ErrorCode.SETUP_NOT_COMPLETE,
          { path: artifact.path }
        );
      }
    }
  }

  async hashCredential(vaccinationDate, vaccineType, patientId, issuerId) {
    this._ensureInitialized();
    const hash = this.poseidon([
      vaccinationDate,
      vaccineType,
      patientId,
      issuerId,
    ]);
    return this.poseidon.F.toString(hash);
  }

  async generateTypeCommitment(vaccineType, credentialHash) {
    this._ensureInitialized();
    const commitment = this.poseidon([vaccineType, BigInt(credentialHash)]);
    return this.poseidon.F.toString(commitment);
  }

  async generateNullifier(userSecret, externalNullifier) {
    this._ensureInitialized();
    const nullifier = this.poseidon([
      BigInt(userSecret),
      BigInt(externalNullifier),
    ]);
    return this.poseidon.F.toString(nullifier);
  }

  async generateProof(input) {
    this._ensureInitialized();

    // Check cache first
    const cached = this.cache.get(input);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    validateProofInput(input, this.merkleLevels, this.numAcceptedTypes);

    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this._generateProofInternal(input);
        this.cache.set(input, result);
        return { ...result, fromCache: false };
      } catch (error) {
        lastError = ProofErrorHandler.wrap(error, {
          attempt,
          maxRetries: this.maxRetries,
        });

        if (!ProofErrorHandler.isRetryable(lastError)) {
          throw lastError;
        }

        if (attempt < this.maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError;
  }

  async _generateProofInternal(input) {
    this._validateBuildArtifacts();

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      this.wasmPath,
      this.zkeyPath
    );

    const proofBytes = JSON.stringify(proof).length;
    const nullifier = publicSignals[publicSignals.length - 1];

    return {
      proof,
      publicSignals,
      proofSize: proofBytes,
      nullifier,
      circuit: "VaccinationProof",
      merkleLevels: this.merkleLevels,
      timestamp: Date.now(),
    };
  }

  async verifyProof(proof, publicSignals) {
    this._ensureInitialized();

    if (!proof || typeof proof !== "object") {
      throw new ProofGenerationError(
        "Proof must be a non-null object",
        ErrorCode.INVALID_PROOF_FORMAT
      );
    }

    if (!Array.isArray(publicSignals)) {
      throw new ProofGenerationError(
        "Public signals must be an array",
        ErrorCode.INVALID_PROOF_FORMAT
      );
    }

    if (!fs.existsSync(this.vkeyPath)) {
      throw new ProofGenerationError(
        `Verification key not found at ${this.vkeyPath}`,
        ErrorCode.SETUP_NOT_COMPLETE
      );
    }

    const vKey = JSON.parse(fs.readFileSync(this.vkeyPath, "utf-8"));

    try {
      const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      return {
        isValid,
        verifiedAt: Date.now(),
        circuit: "VaccinationProof",
      };
    } catch (error) {
      throw new ProofGenerationError(
        `Verification failed: ${error.message}`,
        ErrorCode.VERIFICATION_FAILED,
        { originalError: error.message }
      );
    }
  }

  async generateCalldata(proof, publicSignals) {
    this._ensureInitialized();

    const calldata = await snarkjs.groth16.exportSolidityCallData(
      proof,
      publicSignals
    );

    return calldata;
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache() {
    this.cache.clear();
  }

  destroy() {
    this.cache.destroy();
    this._initialized = false;
  }
}

module.exports = { VaccinationProofGenerator };
