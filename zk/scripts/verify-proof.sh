#!/bin/bash

# Proof verification script
# Verifies a zero-knowledge proof using verification key

set -e

CIRCUIT_NAME=${1:-"MerkleTreeChecker"}
BUILD_DIR="build"

echo "Verifying proof for $CIRCUIT_NAME..."


# Check if verification key exists
if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_verification_key.json" ]; then
    echo "Error: Verification key not found! Run setup.sh first."
    exit 1
fi

# Check if proof exists
if [ ! -f "$BUILD_DIR/proof.json" ]; then
    echo "Error: Proof not found! Run generate-proof.sh first."
