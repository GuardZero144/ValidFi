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


# Function to setup a circuit
setup_circuit() {
    local circuit_name=$1
    echo ""
    echo "Setting up $circuit_name..."
    
    # Generate zkey
    snarkjs groth16 setup \
        $BUILD_DIR/${circuit_name}.r1cs \
        $BUILD_DIR/$PTAU_FILE \
        $BUILD_DIR/${circuit_name}_0000.zkey
    
    # Contribute to ceremony
    echo "random entropy" | snarkjs zkey contribute \
        $BUILD_DIR/${circuit_name}_0000.zkey \
        $BUILD_DIR/${circuit_name}_final.zkey \
        --name="First contribution"
    
    # Export verification key
    snarkjs zkey export verificationkey \
        $BUILD_DIR/${circuit_name}_final.zkey \
        $BUILD_DIR/${circuit_name}_verification_key.json
    
    echo "$circuit_name setup complete!"
}

# Setup all circuits
echo ""
echo "Running trusted setup for all circuits..."

# Note: Only setup main circuits, not utility templates
setup_circuit "MerkleTreeChecker"

echo ""
echo "All setups complete!"
echo "Verification keys available in $BUILD_DIR/"
