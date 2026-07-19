const { performance } = require('perf_hooks');
const snarkjs = require("snarkjs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

/**
 * Performance benchmark suite for ZK circuits
 * Measures constraint count, proving time, and proof size
 */

class CircuitBenchmark {
  constructor(circuitName, buildDir = "build") {
    this.circuitName = circuitName;
    this.buildDir = buildDir;
    this.wasmPath = path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
    this.zkeyPath = path.join(buildDir, `${circuitName}_final.zkey`);
    this.r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
  }

  async measureConstraints() {
    try {
      const r1csInfo = await snarkjs.r1cs.info(this.r1csPath);
      return {
        constraints: r1csInfo.nConstraints,
        variables: r1csInfo.nVars,
        privateInputs: r1csInfo.nPrvInputs,
        publicInputs: r1csInfo.nPubInputs,
        labels: r1csInfo.nLabels
      };
    } catch (error) {
      console.error(`Error measuring constraints for ${this.circuitName}:`, error.message);
      return null;
    }
  }

  async measureProvingTime(input, iterations = 5) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          input,
          this.wasmPath,
          this.zkeyPath
        );
        
        const end = performance.now();
        times.push(end - start);
        
        if (i === 0) {
          // Store proof size from first iteration
          this.lastProof = proof;
          this.lastPublicSignals = publicSignals;
        }
      } catch (error) {
        console.error(`Error during proving iteration ${i}:`, error.message);
        return null;
      }
    }
    
    // Calculate statistics
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const stdDev = Math.sqrt(
      times.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / times.length
    );
    
    return {
      average: avg,
      min: min,
      max: max,
      stdDev: stdDev,
      iterations: iterations,
      times: times
    };
  }

  getProofSize() {
    if (!this.lastProof) return null;
    
    const proofStr = JSON.stringify(this.lastProof);
    const publicStr = JSON.stringify(this.lastPublicSignals);
    
    return {
      proof: proofStr.length,
      publicSignals: publicStr.length,
      total: proofStr.length + publicStr.length
    };
  }

  async runFullBenchmark(input, iterations = 5) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmarking: ${this.circuitName}`);
    console.log('='.repeat(60));
    
    // Measure constraints
    console.log('\n1. Measuring circuit constraints...');
    const constraints = await this.measureConstraints();
    if (constraints) {
      console.log(`   Constraints: ${constraints.constraints.toLocaleString()}`);
      console.log(`   Variables: ${constraints.variables.toLocaleString()}`);
      console.log(`   Private Inputs: ${constraints.privateInputs}`);
      console.log(`   Public Inputs: ${constraints.publicInputs}`);
    }
    
    // Measure proving time
    console.log(`\n2. Measuring proving time (${iterations} iterations)...`);
    const timing = await this.measureProvingTime(input, iterations);
    if (timing) {
      console.log(`   Average: ${timing.average.toFixed(2)} ms`);
      console.log(`   Min: ${timing.min.toFixed(2)} ms`);
      console.log(`   Max: ${timing.max.toFixed(2)} ms`);
      console.log(`   Std Dev: ${timing.stdDev.toFixed(2)} ms`);
    }
    
    // Measure proof size
    console.log('\n3. Measuring proof size...');
    const size = this.getProofSize();
    if (size) {
      console.log(`   Proof: ${size.proof.toLocaleString()} bytes`);
      console.log(`   Public Signals: ${size.publicSignals.toLocaleString()} bytes`);
      console.log(`   Total: ${size.total.toLocaleString()} bytes`);
    }
    
    return {
      circuit: this.circuitName,
      constraints,
      timing,
      size
    };
  }
}

// Helper: Build merkle tree for testing
async function buildSimpleMerkleTree(depth) {
  const poseidon = await buildPoseidon();
  
  const leaves = [];
  for (let i = 0; i < Math.pow(2, depth); i++) {
    leaves.push(i + 1);
  }
  
  let currentLevel = leaves;
  const tree = [currentLevel];
  
  for (let level = 0; level < depth; level++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : 0;
      const hash = poseidon.F.toString(poseidon([left, right]));
      nextLevel.push(hash);
    }
    currentLevel = nextLevel;
    tree.push(currentLevel);
  }
  
  return {
    root: tree[depth][0],
    getProof: (leafIndex) => {
      const pathElements = [];
      const pathIndices = [];
      let index = leafIndex;
      
      for (let level = 0; level < depth; level++) {
        const isLeft = index % 2 === 0;
        const siblingIndex = isLeft ? index + 1 : index - 1;
        
        pathIndices.push(isLeft ? 0 : 1);
        pathElements.push(
          siblingIndex < tree[level].length ? tree[level][siblingIndex] : 0
        );
        
        index = Math.floor(index / 2);
      }
      
      return { pathElements, pathIndices };
    }
  };
}

// Main benchmark execution
async function runAllBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('ZK CIRCUIT PERFORMANCE BENCHMARK SUITE');
  console.log('Phase 1 - Foundation Circuits');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    // Benchmark 1: MerkleTreeChecker
    console.log('\n\nTest 1: MerkleTreeChecker (depth 20)');
    const merkleTree = await buildSimpleMerkleTree(20);
    const merkleProof = merkleTree.getProof(42);
    
    const merkleInput = {
      root: merkleTree.root,
      leaf: 43,
      pathElements: merkleProof.pathElements,
      pathIndices: merkleProof.pathIndices
    };
    
    const merkleBenchmark = new CircuitBenchmark("MerkleTreeChecker");
    const merkleResults = await merkleBenchmark.runFullBenchmark(merkleInput, 3);
    results.push(merkleResults);
    
  } catch (error) {
    console.error('\nBenchmark error:', error.message);
    console.log('\nNote: Make sure to compile circuits and run setup before benchmarking:');
    console.log('  bash scripts/compile.sh');
    console.log('  bash scripts/setup.sh');
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  
  let totalConstraints = 0;
  
  results.forEach(result => {
    if (result.constraints && result.timing && result.size) {
      console.log(`\n${result.circuit}:`);
      console.log(`  Constraints: ${result.constraints.constraints.toLocaleString()}`);
      console.log(`  Avg Proving Time: ${result.timing.average.toFixed(2)} ms`);
      console.log(`  Proof Size: ${result.size.total.toLocaleString()} bytes`);
      
      totalConstraints += result.constraints.constraints;
    }
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total Constraints (Phase 1): ${totalConstraints.toLocaleString()}`);
  console.log(`Budget: 100,000 constraints`);
  console.log(`Usage: ${(totalConstraints / 100000 * 100).toFixed(1)}%`);
  console.log(`Remaining: ${(100000 - totalConstraints).toLocaleString()} constraints`);
  console.log('='.repeat(60));
  
  // Save results to file
  const reportPath = path.join('build', 'benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run if called directly
if (require.main === module) {
  runAllBenchmarks().catch(console.error);
}

module.exports = {
  CircuitBenchmark,
  runAllBenchmarks,
  buildSimpleMerkleTree
};
