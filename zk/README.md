# Zero-Knowledge Proofs for SecureData

This directory contains the Zero-Knowledge proof infrastructure for SecureData.

## Overview

SecureData uses Zero-Knowledge proofs to enable privacy-preserving verification. Users can prove statements about their data without revealing the underlying information.

## Stack

- **Circom**: Circuit creation
- **SnarkJS**: Proof generation and verification
- **Groth16**: Efficient proving system

## Circuits

### Age Verification Circuit

Proves that a user is over a certain age without revealing their actual birthdate.

### Income Verification Circuit

Proves that a user's income is above a threshold without revealing the exact amount.

## Usage

### Install Dependencies

```bash
npm install -g circom
npm install snarkjs
```

### Compile Circuit

```bash
circom age_verification.circom --r1cs --wasm --sym --c
```

### Generate Trusted Setup

```bash
snarkjs groth16 setup age_verification.r1cs pot.ptp age_verification_0000.zkey
snarkjs groth16 contribute age_verification_0000.zkey age_verification_0001.zkey --name="1st Contributor" -e="random text"
snarkjs groth16 export_verificationkey age_verification_0001.zkey verification_key.json
```

### Generate Proof

```bash
snarkjs groth16 calculate_witness age_verification.wasm input.json witness.wtns
snarkjs groth16 prove age_verification_0001.zkey witness.wtns proof.json public.json
```

### Verify Proof

```bash
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Integration with Soroban

The proof hash and verification commitment are stored on-chain in the Verification contract. The actual proof generation happens off-chain to reduce gas costs.

## Example Input Format

```json
{
  "birthDate": 912345678,
  "minAge": 18,
  "currentTimestamp": 1672531200
}
```

## Example Output

```json
{
  "proof": "...",
  "publicSignals": ["1"]
}
```

Where `1` indicates the age verification passed.
