#!/bin/bash

# Trusted setup script for zk-SNARK circuits
# Generates proving and verification keys using Groth16

set -e

BUILD_DIR="build"
PTAU_FILE="powersOfTau28_hez_final_14.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau"


echo "Setting up zk-SNARK trusted setup..."

# Download powers of tau if not exists
if [ ! -f "$BUILD_DIR/$PTAU_FILE" ]; then
    echo "Downloading powers of tau ceremony file..."
    curl -o $BUILD_DIR/$PTAU_FILE $PTAU_URL
else
    echo "Powers of tau file already exists."
fi
