const { ProofGenerationError, ErrorCode } = require("./errors");

const FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);
const MAX_TIMESTAMP = 4294967295; // uint32 max

function validateProofInput(input, merkleLevels = 20, numAcceptedTypes = 5) {
  const errors = [];

  if (!input || typeof input !== "object") {
    throw new ProofGenerationError(
      "Input must be a non-null object",
      ErrorCode.INVALID_INPUT
    );
  }

  // Public inputs
  validateFieldElement(input.merkleRoot, "merkleRoot", errors);
  validateTimestamp(input.minVaccinationDate, "minVaccinationDate", errors);
  validateTimestamp(input.maxVaccinationDate, "maxVaccinationDate", errors);
  validateTimestamp(input.currentTime, "currentTime", errors);

  if (
    input.minVaccinationDate !== undefined &&
    input.maxVaccinationDate !== undefined &&
    input.minVaccinationDate >= input.maxVaccinationDate
  ) {
    errors.push("minVaccinationDate must be less than maxVaccinationDate");
  }

  if (!Array.isArray(input.acceptedTypes)) {
    errors.push("acceptedTypes must be an array");
  } else if (input.acceptedTypes.length !== numAcceptedTypes) {
    errors.push(
      `acceptedTypes must have exactly ${numAcceptedTypes} elements`
    );
  } else {
    input.acceptedTypes.forEach((t, i) =>
      validateFieldElement(t, `acceptedTypes[${i}]`, errors)
    );
  }

  validateFieldElement(input.typeCommitment, "typeCommitment", errors);
  validatePositiveInt(input.requiredDoses, "requiredDoses", errors);
  validateFieldElement(input.externalNullifier, "externalNullifier", errors);

  // Private inputs
  validateTimestamp(input.vaccinationDate, "vaccinationDate", errors);
  validateTimestamp(input.expiryDate, "expiryDate", errors);
  validateFieldElement(input.vaccineType, "vaccineType", errors);
  validatePositiveInt(input.doseNumber, "doseNumber", errors);
  validatePositiveInt(input.totalDoses, "totalDoses", errors);
  validateFieldElement(input.credentialHash, "credentialHash", errors);
  validateFieldElement(input.userSecret, "userSecret", errors);

  if (input.doseNumber !== undefined && input.totalDoses !== undefined) {
    if (input.doseNumber > input.totalDoses) {
      errors.push("doseNumber cannot exceed totalDoses");
    }
  }

  if (input.vaccinationDate !== undefined && input.expiryDate !== undefined) {
    if (input.expiryDate <= input.vaccinationDate) {
      errors.push("expiryDate must be after vaccinationDate");
    }
  }

  // Merkle path
  if (!Array.isArray(input.merklePathElements)) {
    errors.push("merklePathElements must be an array");
  } else if (input.merklePathElements.length !== merkleLevels) {
    errors.push(
      `merklePathElements must have exactly ${merkleLevels} elements`
    );
  } else {
    input.merklePathElements.forEach((e, i) =>
      validateFieldElement(e, `merklePathElements[${i}]`, errors)
    );
  }

  if (!Array.isArray(input.merklePathIndices)) {
    errors.push("merklePathIndices must be an array");
  } else if (input.merklePathIndices.length !== merkleLevels) {
    errors.push(
      `merklePathIndices must have exactly ${merkleLevels} elements`
    );
  } else {
    input.merklePathIndices.forEach((idx, i) => {
      if (idx !== 0 && idx !== 1) {
        errors.push(
          `merklePathIndices[${i}] must be 0 or 1, got ${idx}`
        );
      }
    });
  }

  if (errors.length > 0) {
    throw new ProofGenerationError(
      `Input validation failed:\n${errors.join("\n")}`,
      ErrorCode.INVALID_INPUT,
      { fieldErrors: errors }
    );
  }

  return true;
}

function validateFieldElement(value, name, errors) {
  if (value === undefined || value === null) {
    errors.push(`${name} is required`);
    return;
  }
  const bigVal = BigInt(value);
  if (bigVal < 0n) {
    errors.push(`${name} must be non-negative`);
  }
  if (bigVal >= FIELD_SIZE) {
    errors.push(`${name} must be less than the field size`);
  }
}

function validateTimestamp(value, name, errors) {
  if (value === undefined || value === null) {
    errors.push(`${name} is required`);
    return;
  }
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) {
    errors.push(`${name} must be a non-negative number`);
  }
  if (v > MAX_TIMESTAMP) {
    errors.push(`${name} exceeds maximum timestamp value`);
  }
}

function validatePositiveInt(value, name, errors) {
  if (value === undefined || value === null) {
    errors.push(`${name} is required`);
    return;
  }
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1) {
    errors.push(`${name} must be a positive integer`);
  }
}

module.exports = { validateProofInput };
