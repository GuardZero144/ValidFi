# ZK Circuit Architecture - Phase 1

## Overview

This document describes the architecture of the ValidFi vaccination proof zero-knowledge circuits. Phase 1 focuses on foundational sub-circuits that will be composed into the main vaccination proof circuit in subsequent phases.

## Circuit Hierarchy

```
VaccinationProof (Phase 2-3)
├── MerkleTreeChecker (Phase 1) ✓
│   ├── Poseidon2 ✓
│   └── IsEqual ✓
├── DateVerification (Phase 2)
│   └── RangeCheck (Phase 1) ✓
│       └── InRange ✓
│           └── LessEqThan ✓
│               └── LessThan ✓
├── VaccineTypeMatch (Phase 2)
└── BoosterVerification (Phase 3)
```

## Phase 1 Components

### 1. Utility Circuits (`circuits/utils/`)

#### comparators.circom

**Purpose**: Basic comparison operations for zero-knowledge circuits

**Templates**:
- `LessThan(n)` - Checks if `in[0] < in[1]` for n-bit numbers
- `LessEqThan(n)` - Checks if `in[0] <= in[1]`
- `IsEqual()` - Checks if `in[0] == in[1]`
- `InRange(n)` - Checks if value is within [min, max]
- `Num2Bits(n)` - Converts number to binary representation
- `IsZero()` - Checks if input is zero

**Constraint Cost**: ~n constraints per comparison


#### rangeCheck.circom

**Purpose**: Optimized range validation for date/timestamp verification

**Templates**:
- `RangeCheck()` - Validates single value in range (64-bit optimized)
- `MultiRangeCheck(numRanges)` - Validates multiple ranges with AND logic

**Constraint Cost**: ~64 constraints per range check

**Use Cases**:
- Vaccination date validation
- Expiry date checking
- Booster interval verification

#### poseidon.circom

**Purpose**: Cryptographic hash function wrappers for efficient hashing

**Templates**:
- `Poseidon2()` - Hash 2 inputs
- `Poseidon3()` - Hash 3 inputs
- `Poseidon4()` - Hash 4 inputs

**Constraint Cost**: ~150 constraints per hash

**Use Cases**:
- Merkle tree construction
- Nullifier generation
- Credential hashing

### 2. Core Circuits (`circuits/core/`)

#### merkleTree.circom

**Purpose**: Prove credential membership in registry without revealing the credential

**Template**: `MerkleTreeChecker(levels)`

**Parameters**:
- `levels` - Depth of merkle tree (default: 20 for 1M credentials)

**Signals**:
- Public: `root` - Merkle root of credential registry
- Private: `leaf` - Credential hash to prove
- Private: `pathElements[levels]` - Sibling hashes along path
- Private: `pathIndices[levels]` - Path direction (0=left, 1=right)
- Output: `isValid` - 1 if proof valid, 0 otherwise

**Constraint Cost**: ~150 * levels = ~3,000 constraints for depth 20

**Algorithm**:
1. Start with leaf hash
2. For each level, combine with sibling using Poseidon
3. Final hash must match public root

**Security**: Uses Poseidon hash for collision resistance and efficient constraint usage

## Signal Flow

```
Input Signals → Constraint System → Output Signals
     ↓                  ↓                  ↓
  Private          Verification        Public
  Witness           Logic             Results
```

## Constraint Budget (Phase 1)

| Circuit | Constraints | Status |
|---------|-------------|--------|
| LessThan(64) | ~64 | ✓ |
| IsEqual | ~2 | ✓ |
| RangeCheck | ~128 | ✓ |
| Poseidon2 | ~150 | ✓ |
| MerkleTreeChecker(20) | ~3,000 | ✓ |
| **Total** | **~3,400** | **< 100k ✓** |

## Design Decisions

### 1. Poseidon over SHA-256
- **Reason**: Poseidon is ZK-friendly (~150 constraints vs ~20,000 for SHA-256)
- **Trade-off**: Less battle-tested but standard in ZK ecosystem

### 2. Merkle Tree Depth 20
- **Capacity**: 2^20 = ~1M credentials
- **Trade-off**: More levels = more constraints but higher capacity

### 3. 64-bit Comparisons
- **Reason**: Unix timestamps fit in 64 bits until year 2038+
- **Trade-off**: Balance between constraint cost and range coverage

## Testing Strategy

1. **Unit Tests**: Each sub-circuit tested independently
2. **Integration Tests**: Combined circuit functionality
3. **Edge Cases**: Boundary values, overflow conditions
4. **Performance**: Constraint count and proving time measurements

## Next Phases

**Phase 2**: Date and vaccine type verification circuits
**Phase 3**: Booster verification and main VaccinationProof circuit integration
