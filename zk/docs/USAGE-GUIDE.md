# Usage Guide - Phase 1

## Quick Start

### Prerequisites

1. **Install Circom**:
```bash
# macOS
brew install circom

# Or from source
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

2. **Install SnarkJS**:
```bash
npm install -g snarkjs
```

3. **Install Dependencies**:
```bash
cd zk/
npm install
```

### Verify Installation

```bash
circom --version  # Should show 2.0.0+
snarkjs --version # Should show 0.7.0+
```

## Development Workflow

### Step 1: Compile Circuits

```bash
cd zk/
bash scripts/compile.sh
```

This will:
- Compile all circuits to R1CS, WASM, and SYM formats
- Display constraint counts for each circuit
- Create build artifacts in `build/` directory

**Expected Output**:
```
Creating build directory...
Compiling circuits...
  - Compiling comparators.circom...
  - Compiling rangeCheck.circom...
  - Compiling poseidon.circom...
  - Compiling merkleTree.circom...
Compilation complete!

Constraint counts:
  comparators.r1cs:
    # of Constraints: 64
  merkleTree.r1cs:
    # of Constraints: 3000
...
```

### Step 2: Run Trusted Setup

```bash
bash scripts/setup.sh
```

This will:
- Download powers of tau ceremony file (~200MB)
- Generate proving keys for each circuit
- Generate verification keys
- Take ~5-10 minutes

**Expected Output**:
```
Setting up zk-SNARK trusted setup...
Downloading powers of tau ceremony file...
Setting up MerkleTreeChecker...
MerkleTreeChecker setup complete!
All setups complete!
```

**Note**: Only run setup once unless circuits change.

### Step 3: Run Tests

```bash
npm test
```

This will:
- Run all unit tests for sub-circuits
- Run integration tests
- Display test coverage

**Expected Output**:
```
Comparators Circuit Tests
  LessThan
    ✓ should return 1 when first input is less than second
    ✓ should return 0 when first input equals second
    ✓ should return 0 when first input is greater than second
  IsEqual
    ✓ should return 1 when inputs are equal
    ✓ should return 0 when inputs are not equal

MerkleTree Circuit Tests
  ✓ should verify valid merkle proof for depth 3
  ✓ should reject invalid merkle proof

6 passing (15s)
```

## Using Individual Circuits

### Example 1: Merkle Tree Proof

**1. Create input file** (`input.json`):
```json
{
  "root": "14885692632380820221709131126508732589800538220142195260084476595372637696291",
  "leaf": 1,
  "pathElements": [2, 3, 4],
  "pathIndices": [0, 0, 0]
}
```

**2. Generate proof**:
```bash
bash scripts/generate-proof.sh MerkleTreeChecker input.json
```

**3. Verify proof**:
```bash
bash scripts/verify-proof.sh MerkleTreeChecker
```

**Expected Output**:
```
Verifying proof for MerkleTreeChecker...
Verifying proof...
✓ Proof is VALID
```

### Example 2: Range Check

**1. Create test circuit** (`test_range.circom`):
```circom
pragma circom 2.0.0;

include "circuits/utils/rangeCheck.circom";

component main = RangeCheck();
```

**2. Create input** (`range_input.json`):
```json
{
  "value": 1672531200,
  "min": 1640995200,
  "max": 1704067200
}
```

**3. Compile and test**:
```bash
circom test_range.circom --r1cs --wasm -o build/
node build/test_range_js/generate_witness.js \
  build/test_range_js/test_range.wasm \
  range_input.json \
  build/witness.wtns
```

## Testing Strategies

### Unit Testing

Test each circuit component independently:

```javascript
// tests/utils/comparators.test.js
const wasm_tester = require("circom_tester").wasm;

describe("LessThan Tests", () => {
  it("should handle edge cases", async () => {
    const circuit = await wasm_tester("circuits/utils/comparators.circom");
    
    // Test boundary
    const witness = await circuit.calculateWitness({ in: [0, 1] });
    await circuit.assertOut(witness, { out: 1 });
    
    // Test max value
    const maxVal = (1n << 64n) - 1n;
    const witness2 = await circuit.calculateWitness({ 
      in: [maxVal - 1n, maxVal] 
    });
    await circuit.assertOut(witness2, { out: 1 });
  });
});
```

### Integration Testing

Test circuit combinations:

```javascript
// tests/integration/merkle_with_range.test.js
describe("Merkle + Range Integration", () => {
  it("should verify credential with date range", async () => {
    // Build merkle tree
    const leaves = generateLeaves(1000);
    const tree = buildMerkleTree(leaves);
    
    // Generate proof for leaf with date check
    const leaf = leaves[42];
    const merkleProof = tree.getProof(42);
    
    // Combine with range check
    const input = {
      root: tree.root,
      leaf: leaf,
      pathElements: merkleProof.siblings,
      pathIndices: merkleProof.indices,
      date: 1672531200,
      minDate: 1640995200,
      maxDate: 1704067200
    };
    
    // Verify combined proof
    const { proof, publicSignals } = await generateProof(input);
    const isValid = await verifyProof(proof, publicSignals);
    expect(isValid).to.be.true;
  });
});
```

### Performance Testing

Measure constraints and proving time:

```javascript
// tests/performance/benchmark.js
const { performance } = require('perf_hooks');

async function benchmarkCircuit(circuitName, input) {
  const start = performance.now();
  
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    `build/${circuitName}_js/${circuitName}.wasm`,
    `build/${circuitName}_final.zkey`
  );
  
  const provingTime = performance.now() - start;
  
  console.log(`${circuitName}:`);
  console.log(`  Proving time: ${provingTime.toFixed(2)}ms`);
  console.log(`  Proof size: ${JSON.stringify(proof).length} bytes`);
  
  return { proof, publicSignals, provingTime };
}

// Run benchmarks
benchmarkCircuit("MerkleTreeChecker", merkleInput);
```

## Common Operations

### Building Merkle Trees

```javascript
const { buildPoseidon } = require("circomlibjs");

async function buildMerkleTree(leaves, depth = 20) {
  const poseidon = await buildPoseidon();
  
  // Initialize tree with zeros
  const zeros = [];
  zeros[0] = 0;
  for (let i = 1; i <= depth; i++) {
    zeros[i] = poseidon.F.toString(poseidon([zeros[i-1], zeros[i-1]]));
  }
  
  // Build tree bottom-up
  let currentLevel = leaves.map(l => poseidon.F.toString(l));
  const tree = [currentLevel];
  
  for (let level = 0; level < depth; level++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? 
        currentLevel[i + 1] : zeros[level];
      nextLevel.push(poseidon.F.toString(poseidon([left, right])));
    }
    currentLevel = nextLevel;
    tree.push(currentLevel);
  }
  
  return {
    root: tree[depth][0],
    levels: tree,
    getProof: (leafIndex) => generateProof(tree, leafIndex, depth)
  };
}

function generateProof(tree, leafIndex, depth) {
  const pathElements = [];
  const pathIndices = [];
  
  let index = leafIndex;
  for (let level = 0; level < depth; level++) {
    const isLeft = index % 2 === 0;
    const siblingIndex = isLeft ? index + 1 : index - 1;
    
    pathIndices.push(isLeft ? 0 : 1);
    pathElements.push(
      siblingIndex < tree[level].length ? 
        tree[level][siblingIndex] : 
        zeros[level]
    );
    
    index = Math.floor(index / 2);
  }
  
  return { pathElements, pathIndices };
}
```

### Generating Test Data

```javascript
// Generate realistic vaccination records
function generateVaccinationRecord() {
  const vaccinationDate = Math.floor(
    Date.parse("2023-01-15") / 1000
  ); // Unix timestamp
  
  const vaccineTypes = {
    pfizer: 1,
    moderna: 2,
    johnson: 3,
    astrazeneca: 4
  };
  
  return {
    date: vaccinationDate,
    vaccineType: vaccineTypes.pfizer,
    patientId: Math.floor(Math.random() * 1000000),
    issuerId: Math.floor(Math.random() * 1000)
  };
}

// Hash vaccination record
async function hashVaccinationRecord(record) {
  const poseidon = await buildPoseidon();
  return poseidon.F.toString(poseidon([
    record.date,
    record.vaccineType,
    record.patientId,
    record.issuerId
  ]));
}
```

## Debugging Tips

### 1. Witness Generation Failures

If witness generation fails:

```bash
# Enable debug output
node build/circuit_js/generate_witness.js \
  build/circuit_js/circuit.wasm \
  input.json \
  witness.wtns \
  --verbose
```

Common issues:
- Input values exceed bit width
- Missing required inputs
- Invalid array lengths

### 2. Constraint Violations

If proof generation fails with constraint error:

1. Check circuit logic in `.circom` files
2. Verify all constraints are satisfiable
3. Use `snarkjs r1cs print` to inspect constraints:

```bash
snarkjs r1cs print build/circuit.r1cs build/circuit.sym
```

### 3. Proof Verification Failures

If proof verification fails:

1. Verify public signals match expected format
2. Check verification key was generated correctly
3. Ensure proof and public signals are from same witness

```bash
# Debug verification
snarkjs groth16 verify \
  build/circuit_verification_key.json \
  build/public.json \
  build/proof.json \
  --verbose
```

## Optimization Tips

### Reducing Constraints

1. **Use efficient comparators**: Use `LessEqThan` instead of separate `LessThan` + `IsEqual`
2. **Minimize hash operations**: Poseidon is efficient but still costly
3. **Batch operations**: Use `MultiRangeCheck` for multiple ranges

### Improving Proving Time

1. **Reduce merkle depth**: Use smallest depth that fits your needs
2. **Optimize input preparation**: Pre-compute hashes off-chain
3. **Use appropriate hardware**: GPU acceleration for large circuits

### Minimizing Proof Size

- Groth16 proofs are constant size (~800 bytes)
- Public signals add to total size
- Minimize number of public outputs

## Troubleshooting

### Issue: "Command not found: circom"

**Solution**: Install Circom using instructions above, ensure it's in PATH

### Issue: "Cannot find module 'snarkjs'"

**Solution**: 
```bash
npm install -g snarkjs
# Or locally
cd zk/ && npm install
```

### Issue: "Powers of tau download fails"

**Solution**: Manually download from:
https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau

Place in `build/` directory.

### Issue: "Out of memory during proving"

**Solution**:
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=8192 node script.js`
- Use smaller circuit or reduce merkle depth
- Use machine with more RAM

## Best Practices

1. **Version Control**: Commit compiled circuits and keys to separate repo
2. **Key Management**: Secure proving keys, verification keys can be public
3. **Input Validation**: Always validate inputs before witness generation
4. **Testing**: Maintain >95% test coverage
5. **Documentation**: Document all circuit modifications
6. **Security**: Audit circuits before production deployment

## Next Steps

Once Phase 1 is working:

1. **Phase 2**: Implement date verification and vaccine type matching
2. **Phase 3**: Add booster verification and main VaccinationProof circuit
3. **Integration**: Connect circuits to backend API
4. **Deployment**: Deploy verification contracts to blockchain

## Additional Resources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Guide](https://github.com/iden3/snarkjs)
- [Circomlib Library](https://github.com/iden3/circomlib)
- [ZK Whitepaper](https://eprint.iacr.org/2016/260.pdf)
