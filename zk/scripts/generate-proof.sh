#!/bin/bash

# Proof generation script
# Generates a zero-knowledge proof from witness and circuit

set -e

CIRCUIT_NAME=${1:-"MerkleTreeChecker"}
INPUT_FILE=${2:-"input.json"}
BUILD_DIR="build"


echo "Generating proof for $CIRCUIT_NAME..."
echo "Using input file: $INPUT_FILE"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file $INPUT_FILE not found!"
    exit 1
fi

# Check if circuit files exist
if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" ]; then
    echo "Error: Circuit WASM not found! Run compile.sh first."
    exit 1
fi

if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" ]; then
    echo "Error: Circuit zkey not found! Run setup.sh first."
    exit 1
fi

echo "Step 1: Calculating witness..."
node $BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js \
    $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm \
    $INPUT_FILE \
    $BUILD_DIR/witness.wtns

echo "Step 2: Generating proof..."
snarkjs groth16 prove \
    $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
    $BUILD_DIR/witness.wtns \
    $BUILD_DIR/proof.json \
    $BUILD_DIR/public.json

echo ""
echo "Proof generation complete!"
echo "  Proof: $BUILD_DIR/proof.json"
echo "  Public signals: $BUILD_DIR/public.json"
echo ""
echo "Proof size: $(wc -c < $BUILD_DIR/proof.json) bytes"
