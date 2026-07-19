# Input/Output Specification - Phase 1

## Overview

This document specifies the exact input and output formats for all Phase 1 circuits.

## Data Types

- **Field Element**: Prime field element (BN254 curve, ~254 bits)
- **Timestamp**: Unix timestamp (seconds since epoch, 64-bit)
- **Hash**: Poseidon hash output (field element)
- **Boolean**: 0 or 1 (field element)

## Circuit Specifications

### 1. LessThan(n)

**Purpose**: Compare two n-bit numbers

**Inputs**:
```json
{
  "in": [a, b]  // Two numbers to compare (0 <= a,b < 2^n)
}
```

**Outputs**:
```json
{
  "out": result  // 1 if a < b, 0 otherwise
}
```

**Example**:
```json
// Input
{ "in": [5, 10] }

// Output
{ "out": 1 }
```

**Constraints**: ~n

### 2. IsEqual()

**Purpose**: Check equality of two field elements

**Inputs**:
```json
{
  "in": [a, b]  // Two field elements
}
```

**Outputs**:
```json
{
  "out": result  // 1 if a == b, 0 otherwise
}
```

**Example**:
```json
// Input
{ "in": [42, 42] }

// Output
{ "out": 1 }
```

**Constraints**: ~2

### 3. RangeCheck()

**Purpose**: Validate value is within [min, max]

**Inputs**:
```json
{
  "value": number,   // Value to check (64-bit)
  "min": lower,      // Minimum allowed value
  "max": upper       // Maximum allowed value
}
```

**Outputs**:
```json
{
  "isValid": result  // 1 if min <= value <= max, 0 otherwise
}
```

**Example**:
```json
// Input - Checking vaccination date
{
  "value": 1672531200,    // Jan 1, 2023
  "min": 1640995200,      // Jan 1, 2022
  "max": 1704067200       // Jan 1, 2024
}

// Output
{ "isValid": 1 }
```

**Constraints**: ~128

### 4. MultiRangeCheck(numRanges)

**Purpose**: Validate multiple ranges simultaneously

**Inputs**:
```json
{
  "values": [v1, v2, ...],    // Values to check
  "mins": [min1, min2, ...],   // Minimum bounds
  "maxs": [max1, max2, ...]    // Maximum bounds
}
```

**Outputs**:
```json
{
  "isValid": result  // 1 if ALL ranges valid, 0 otherwise
}
```

**Example**:
```json
// Input - Check primary vaccine and booster dates
{
  "values": [1640995200, 1672531200],
  "mins": [1609459200, 1640995200],
  "maxs": [1672531200, 1704067200]
}

// Output
{ "isValid": 1 }
```

**Constraints**: ~128 * numRanges

### 5. Poseidon2()

**Purpose**: Hash two field elements

**Inputs**:
```json
{
  "in": [a, b]  // Two field elements to hash
}
```

**Outputs**:
```json
{
  "out": hash  // Poseidon hash output
}
```

**Example**:
```json
// Input
{ "in": [123, 456] }

// Output (example - actual value is deterministic)
{ "out": "1234567890123456789..." }
```

**Constraints**: ~150

### 6. MerkleTreeChecker(levels)

**Purpose**: Prove credential exists in registry

**Inputs**:
```json
{
  "root": merkleRoot,              // Public: Registry merkle root
  "leaf": credentialHash,          // Private: Credential to prove
  "pathElements": [s1, s2, ...],   // Private: Sibling hashes (length = levels)
  "pathIndices": [i1, i2, ...]     // Private: Path directions (0 or 1, length = levels)
}
```

**Outputs**:
```json
{
  "isValid": result  // 1 if credential in tree, 0 otherwise
}
```

**Example** (depth 3):
```json
// Input
{
  "root": "14885692632380820221709131126508732589800538220142195260084476595372637696291",
  "leaf": 1,
  "pathElements": [2, 3, 4],
  "pathIndices": [0, 0, 0]
}

// Output
{ "isValid": 1 }
```

**Path Indices Encoding**:
- `0` = current hash is LEFT child, pathElement is RIGHT sibling
- `1` = current hash is RIGHT child, pathElement is LEFT sibling

**Merkle Path Example**:
```
        Root
       /    \
      H2     4  (index=0, so H2 is left, 4 is right sibling)
     /  \
    H1   3      (index=0, so H1 is left, 3 is right sibling)
   /  \
  1    2        (index=0, so 1 is left, 2 is right sibling)

leaf = 1
pathElements = [2, 3, 4]
pathIndices = [0, 0, 0]

Verification:
H1 = Poseidon(1, 2)
H2 = Poseidon(H1, 3)
Root = Poseidon(H2, 4)
```

**Constraints**: ~150 * levels

## Common Patterns

### Date Range Validation
```json
{
  "value": 1672531200,        // Vaccination date
  "min": 1609459200,          // Min valid date (Jan 1, 2021)
  "max": 1735689600           // Max valid date (Jan 1, 2025)
}
```

### Credential Hashing
```javascript
// JavaScript example using circomlibjs
const { buildPoseidon } = require("circomlibjs");
const poseidon = await buildPoseidon();

const credentialHash = poseidon([
  vaccinationDate,
  vaccineType,
  patientId,
  issuerId
]);
```

### Nullifier Generation
```javascript
// Prevents proof replay
const nullifier = poseidon([
  credentialHash,
  userSecret
]);
```

## Data Validation Rules

### Timestamps
- **Format**: Unix timestamp (seconds)
- **Range**: 0 to 2^32-1 (covers until year 2106)
- **Example**: Jan 1, 2023 = 1672531200

### Hashes
- **Format**: Field element from Poseidon output
- **Range**: 0 to FIELD_SIZE-1
- **Size**: ~254 bits

### Boolean Flags
- **Format**: Field element
- **Valid Values**: 0 or 1 only
- **Usage**: Flags, switches, verification results

## Error Handling

### Invalid Inputs
Circuits will fail witness generation if:
- Values exceed bit width constraints
- PathIndices contain values other than 0 or 1
- Array lengths don't match expected sizes

### Proof Generation Failures
Common causes:
- Witness calculation failure (invalid inputs)
- Constraint violation (logic error in circuit)
- Out of memory (circuit too large)

## Performance Characteristics

| Circuit | Witness Gen | Proving Time | Proof Size |
|---------|------------|--------------|------------|
| LessThan(64) | <1ms | ~50ms | ~800 bytes |
| IsEqual | <1ms | ~50ms | ~800 bytes |
| RangeCheck | <1ms | ~100ms | ~800 bytes |
| Poseidon2 | <1ms | ~150ms | ~800 bytes |
| MerkleTreeChecker(20) | ~10ms | ~3s | ~800 bytes |

*Times are estimates on consumer hardware (Intel i7/M1)*

## Integration Examples

### Backend Integration (Node.js)
```javascript
const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");

// Generate proof
async function proveCredential(credential, merkleProof) {
  const input = {
    root: merkleProof.root,
    leaf: credential.hash,
    pathElements: merkleProof.path,
    pathIndices: merkleProof.indices
  };
  
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/MerkleTreeChecker_js/MerkleTreeChecker.wasm",
    "build/MerkleTreeChecker_final.zkey"
  );
  
  return { proof, publicSignals };
}

// Verify proof
async function verifyProof(proof, publicSignals) {
  const vKey = JSON.parse(
    fs.readFileSync("build/MerkleTreeChecker_verification_key.json")
  );
  
  const isValid = await snarkjs.groth16.verify(
    vKey,
    publicSignals,
    proof
  );
  
  return isValid;
}
```

### Frontend Integration (JavaScript)
```javascript
// In browser or React app
import * as snarkjs from "snarkjs";

async function generateProof(input) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "/circuits/MerkleTreeChecker.wasm",
    "/circuits/MerkleTreeChecker.zkey"
  );
  
  return { proof, publicSignals };
}
```

## Next Steps

Phase 2 will introduce:
- Date verification circuit inputs/outputs
- Vaccine type matching specifications
- Combined vaccination proof formats
