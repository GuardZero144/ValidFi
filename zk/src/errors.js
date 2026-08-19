const ErrorCode = Object.freeze({
  INVALID_INPUT: "INVALID_INPUT",
  CIRCUIT_NOT_COMPILED: "CIRCUIT_NOT_COMPILED",
  SETUP_NOT_COMPLETE: "SETUP_NOT_COMPLETE",
  WITNESS_GENERATION_FAILED: "WITNESS_GENERATION_FAILED",
  PROOF_GENERATION_FAILED: "PROOF_GENERATION_FAILED",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  INVALID_PROOF_FORMAT: "INVALID_PROOF_FORMAT",
  MERKLE_ROOT_MISMATCH: "MERKLE_ROOT_MISMATCH",
  CREDENTIAL_EXPIRED: "CREDENTIAL_EXPIRED",
  INVALID_VACCINE_TYPE: "INVALID_VACCINE_TYPE",
  INCOMPLETE_DOSES: "INCOMPLETE_DOSES",
  NULLIFIER_REUSE: "NULLIFIER_REUSE",
  TIMEOUT: "TIMEOUT",
  OUT_OF_MEMORY: "OUT_OF_MEMORY",
  SOROBAN_INTEGRATION_FAILED: "SOROBAN_INTEGRATION_FAILED",
});

class ProofGenerationError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = "ProofGenerationError";
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

module.exports = { ProofGenerationError, ErrorCode };
