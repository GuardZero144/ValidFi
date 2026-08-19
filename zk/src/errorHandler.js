const { ProofGenerationError, ErrorCode } = require("./errors");

class ProofErrorHandler {
  static wrap(error, context = {}) {
    if (error instanceof ProofGenerationError) {
      return error;
    }

    const message = error.message || "Unknown error";

    if (message.includes("WASM") || message.includes("wasm")) {
      return new ProofGenerationError(
        `Circuit WASM not found or invalid: ${message}`,
        ErrorCode.CIRCUIT_NOT_COMPILED,
        context
      );
    }

    if (message.includes("zkey") || message.includes("proving key")) {
      return new ProofGenerationError(
        `Proving key not found or invalid: ${message}`,
        ErrorCode.SETUP_NOT_COMPLETE,
        context
      );
    }

    if (message.includes("constraint") || message.includes("witness")) {
      return new ProofGenerationError(
        `Witness generation failed: ${message}`,
        ErrorCode.WITNESS_GENERATION_FAILED,
        context
      );
    }

    if (message.includes("invalid") && message.includes("input")) {
      return new ProofGenerationError(
        `Invalid input provided: ${message}`,
        ErrorCode.INVALID_INPUT,
        context
      );
    }

    if (message.includes("timeout") || message.includes("TIMEOUT")) {
      return new ProofGenerationError(
        `Proof generation timed out: ${message}`,
        ErrorCode.TIMEOUT,
        context
      );
    }

    if (message.includes("memory") || message.includes("OOM")) {
      return new ProofGenerationError(
        `Out of memory during proof generation: ${message}`,
        ErrorCode.OUT_OF_MEMORY,
        context
      );
    }

    return new ProofGenerationError(
      message,
      ErrorCode.PROOF_GENERATION_FAILED,
      { ...context, originalError: error.name }
    );
  }

  static isRetryable(error) {
    if (!(error instanceof ProofGenerationError)) return false;
    const retryableCodes = [
      ErrorCode.TIMEOUT,
      ErrorCode.OUT_OF_MEMORY,
      ErrorCode.WITNESS_GENERATION_FAILED,
    ];
    return retryableCodes.includes(error.code);
  }

  static getRecoverySuggestion(error) {
    if (!(error instanceof ProofGenerationError)) {
      return "An unexpected error occurred. Check the logs for details.";
    }

    const suggestions = {
      [ErrorCode.INVALID_INPUT]:
        "Verify all input values are within valid ranges and of correct types.",
      [ErrorCode.CIRCUIT_NOT_COMPILED]:
        "Run 'npm run compile' to compile the circuits first.",
      [ErrorCode.SETUP_NOT_COMPLETE]:
        "Run 'npm run setup' to generate the proving and verification keys.",
      [ErrorCode.WITNESS_GENERATION_FAILED]:
        "Check that all private inputs are consistent with public inputs.",
      [ErrorCode.PROOF_GENERATION_FAILED]:
        "Ensure sufficient system memory and that the circuit is valid.",
      [ErrorCode.VERIFICATION_FAILED]:
        "The proof may be corrupted. Try regenerating it.",
      [ErrorCode.INVALID_PROOF_FORMAT]:
        "The proof structure is invalid. Regenerate the proof.",
      [ErrorCode.MERKLE_ROOT_MISMATCH]:
        "The Merkle root does not match the current registry state.",
      [ErrorCode.CREDENTIAL_EXPIRED]:
        "The credential has expired. Request a new vaccination record.",
      [ErrorCode.INVALID_VACCINE_TYPE]:
        "The vaccine type is not in the list of accepted types.",
      [ErrorCode.INCOMPLETE_DOSES]:
        "The vaccination regimen is not yet complete.",
      [ErrorCode.NULLIFIER_REUSE]:
        "This proof has already been generated. Each proof can only be used once.",
      [ErrorCode.TIMEOUT]:
        "Proof generation took too long. Try with smaller circuit parameters.",
      [ErrorCode.OUT_OF_MEMORY]:
        "Insufficient memory. Reduce circuit complexity or increase available memory.",
    };

    return (
      suggestions[error.code] ||
      "No specific recovery suggestion available."
    );
  }
}

module.exports = { ProofErrorHandler };
