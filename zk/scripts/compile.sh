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
