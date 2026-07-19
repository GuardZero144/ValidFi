# Example Inputs

This directory contains sample input files for testing circuits.

## Files

### merkle-input.json
Sample input for MerkleTreeChecker circuit with depth 3.

**Usage**:
```bash
bash scripts/generate-proof.sh MerkleTreeChecker examples/merkle-input.json
bash scripts/verify-proof.sh MerkleTreeChecker
```

**Explanation**:
- `root`: Merkle root of a 3-level tree
- `leaf`: Leaf value to prove (1)
- `pathElements`: Sibling hashes [2, 3, 4]
- `pathIndices`: Path directions [0, 0, 0] (all left)

### range-input.json
Sample input for RangeCheck circuit validating a timestamp.

**Usage**:
Create a test circuit first:
```circom
pragma circom 2.0.0;
include "circuits/utils/rangeCheck.circom";
component main = RangeCheck();
```

**Explanation**:
- `value`: 1672531200 (Jan 1, 2023)
- `min`: 1640995200 (Jan 1, 2022)
- `max`: 1704067200 (Jan 1, 2024)

## Creating Your Own Inputs

### Vaccination Record Example

```json
{
  "vaccinationDate": 1672531200,
  "vaccineType": 1,
  "patientId": 123456,
  "issuerId": 789
}
```

### Date Range Example

```json
{
  "currentDate": 1704067200,
  "vaccinationDate": 1672531200,
  "minValidDate": 1640995200,
  "maxValidDate": 1735689600,
  "boosterRequired": 1,
  "boosterDate": 1688169600
}
```

## Generating Test Data

Use the helper script to generate realistic test data:

```javascript
// generate-test-data.js
const { buildPoseidon } = require("circomlibjs");

async function generateVaccinationInput() {
  const poseidon = await buildPoseidon();
  
  const record = {
    date: Math.floor(Date.parse("2023-01-15") / 1000),
    vaccineType: 1, // Pfizer
    patientId: Math.floor(Math.random() * 1000000),
    issuerId: 100
  };
  
  const credentialHash = poseidon.F.toString(poseidon([
    record.date,
    record.vaccineType,
    record.patientId,
    record.issuerId
  ]));
  
  return {
    credentialHash,
    ...record
  };
}

generateVaccinationInput().then(console.log);
```
