const { VaccinationProofGenerator } = require("./src/proofGenerator");
const { SorobanZkIntegration } = require("./src/sorobanIntegration");
const { ProofErrorHandler } = require("./src/errorHandler");
const { validateProofInput } = require("./src/inputValidator");
const { ProofCache } = require("./src/proofCache");
const { ProofGenerationError, ErrorCode } = require("./src/errors");

module.exports = {
  VaccinationProofGenerator,
  SorobanZkIntegration,
  ProofErrorHandler,
  validateProofInput,
  ProofCache,
  ProofGenerationError,
  ErrorCode,
};
