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
