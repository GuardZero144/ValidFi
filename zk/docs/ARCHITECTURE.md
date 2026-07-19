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
