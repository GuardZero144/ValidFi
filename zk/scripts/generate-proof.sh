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
