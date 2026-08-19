#!/bin/bash

# Compilation script for Circom circuits
# Compiles all circuits and generates verification artifacts

set -e

CIRCUITS_DIR="circuits"
BUILD_DIR="build"


echo "Creating build directory..."
mkdir -p $BUILD_DIR

echo "Compiling circuits..."

# Compile utility circuits
echo "  - Compiling comparators.circom..."
circom $CIRCUITS_DIR/utils/comparators.circom --r1cs --wasm --sym -o $BUILD_DIR

echo "  - Compiling rangeCheck.circom..."
circom $CIRCUITS_DIR/utils/rangeCheck.circom --r1cs --wasm --sym -o $BUILD_DIR

echo "  - Compiling poseidon.circom..."
circom $CIRCUITS_DIR/utils/poseidon.circom --r1cs --wasm --sym -o $BUILD_DIR

# Compile core circuits
echo "  - Compiling merkleTree.circom..."
circom $CIRCUITS_DIR/core/merkleTree.circom --r1cs --wasm --sym -o $BUILD_DIR

# Compile Phase 2 circuits
echo "  - Compiling vaccineDateVerification.circom..."
circom $CIRCUITS_DIR/core/vaccineDateVerification.circom --r1cs --wasm --sym -o $BUILD_DIR -l node_modules

echo "  - Compiling vaccineTypeMatch.circom..."
circom $CIRCUITS_DIR/core/vaccineTypeMatch.circom --r1cs --wasm --sym -o $BUILD_DIR -l node_modules

# Compile Phase 3 main circuit
echo "  - Compiling vaccinationProof.circom..."
circom $CIRCUITS_DIR/core/vaccinationProof.circom --r1cs --wasm --sym -o $BUILD_DIR -l node_modules

echo "Compilation complete!"
echo ""
echo "Constraint counts:"
for r1cs in $BUILD_DIR/*.r1cs; do
    if [ -f "$r1cs" ]; then
        echo "  $(basename $r1cs):"
        snarkjs r1cs info $r1cs | grep "# of Constraints"
    fi
done

echo ""
echo "Build artifacts created in $BUILD_DIR/"
