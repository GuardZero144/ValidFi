#!/bin/bash

# SecureData Smart Contract Deployment Script
# This script deploys the Soroban smart contracts to the specified network

set -e

# Configuration
NETWORK="${1:-testnet}"
SOURCE_WALLET="${2:-}"
CONTRACTS_DIR="./contracts"
BUILD_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SecureData Contract Deployment ===${NC}"
echo "Network: $NETWORK"
echo ""

# Check if Soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo -e "${RED}Error: Soroban CLI is not installed${NC}"
    echo "Please install it from: https://soroban.stellar.org/docs/getting-started/installation"
    exit 1
fi

# Check if source wallet is provided
if [ -z "$SOURCE_WALLET" ]; then
    echo -e "${YELLOW}Warning: No source wallet provided${NC}"
    echo "Usage: ./deploy-contracts.sh [network] [source_wallet]"
    echo "Example: ./deploy-contracts.sh testnet G..."
    exit 1
fi

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd $CONTRACTS_DIR
cargo build --release
cd ..
echo -e "${GREEN}Build complete${NC}"
echo ""

# Deploy contracts
echo -e "${YELLOW}Deploying contracts...${NC}"

# Deploy Identity Registry Contract
echo "Deploying Identity Registry Contract..."
IDENTITY_REGISTRY_ID=$(soroban contract deploy $BUILD_DIR/securedata_contracts.wasm \
    --source $SOURCE_WALLET \
    --network $NETWORK \
    --fee 10000)
echo -e "${GREEN}Identity Registry deployed: $IDENTITY_REGISTRY_ID${NC}"

# Deploy Verification Contract
echo "Deploying Verification Contract..."
VERIFICATION_ID=$(soroban contract deploy $BUILD_DIR/securedata_contracts.wasm \
    --source $SOURCE_WALLET \
    --network $NETWORK \
    --fee 10000)
echo -e "${GREEN}Verification deployed: $VERIFICATION_ID${NC}"

# Deploy Access Control Contract
echo "Deploying Access Control Contract..."
ACCESS_CONTROL_ID=$(soroban contract deploy $BUILD_DIR/securedata_contracts.wasm \
    --source $SOURCE_WALLET \
    --network $NETWORK \
    --fee 10000)
echo -e "${GREEN}Access Control deployed: $ACCESS_CONTROL_ID${NC}"

# Deploy Data Sharing Contract
echo "Deploying Data Sharing Contract..."
DATA_SHARING_ID=$(soroban contract deploy $BUILD_DIR/securedata_contracts.wasm \
    --source $SOURCE_WALLET \
    --network $NETWORK \
    --fee 10000)
echo -e "${GREEN}Data Sharing deployed: $DATA_SHARING_ID${NC}"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Update your backend .env file with these contract IDs:"
echo "IDENTITY_REGISTRY_CONTRACT_ID=$IDENTITY_REGISTRY_ID"
echo "VERIFICATION_CONTRACT_ID=$VERIFICATION_ID"
echo "ACCESS_CONTROL_CONTRACT_ID=$ACCESS_CONTROL_ID"
echo "DATA_SHARING_CONTRACT_ID=$DATA_SHARING_ID"
