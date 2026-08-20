const { buildPoseidon } = require("circomlibjs");

class MerkleTree {
  constructor(levels, leaves = []) {
    this.levels = levels;
    this.capacity = Math.pow(2, levels);
    this.leaves = [];
    this.layers = [];
    this.poseidon = null;

    if (leaves.length > 0) {
      this.leaves = leaves.slice(0, this.capacity);
    }
  }

  async initialize() {
    this.poseidon = await buildPoseidon();
    if (this.leaves.length > 0) {
      this._buildTree();
    }
  }

  _hash(left, right) {
    return this.poseidon.F.toString(this.poseidon([left, right]));
  }

  _buildTree() {
    // Pad leaves to power of 2
    while (this.leaves.length < this.capacity) {
      this.leaves.push(0n);
    }

    this.layers = [this.leaves.map((l) => BigInt(l))];

    for (let level = 0; level < this.levels; level++) {
      const currentLayer = this.layers[level];
      const nextLayer = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : 0n;
        nextLayer.push(this._hash(left, right));
      }

      this.layers.push(nextLayer);
    }
  }

  getRoot() {
    if (this.layers.length === 0) {
      throw new Error("Tree not built. Call buildTree() first.");
    }
    return this.layers[this.levels][0];
  }

  getProof(leafIndex) {
    if (leafIndex < 0 || leafIndex >= this.capacity) {
      throw new Error(
        `Leaf index ${leafIndex} out of range [0, ${this.capacity - 1}]`
      );
    }

    if (this.layers.length === 0) {
      throw new Error("Tree not built. Call buildTree() first.");
    }

    const pathElements = [];
    const pathIndices = [];
    let index = leafIndex;

    for (let level = 0; level < this.levels; level++) {
      const isLeft = index % 2 === 0;
      const siblingIndex = isLeft ? index + 1 : index - 1;

      pathIndices.push(isLeft ? 0 : 1);
      pathElements.push(
        siblingIndex < this.layers[level].length
          ? this.layers[level][siblingIndex]
          : 0n
      );

      index = Math.floor(index / 2);
    }

    return {
      pathElements: pathElements.map((e) => e.toString()),
      pathIndices,
      leaf: this.leaves[leafIndex].toString(),
      root: this.getRoot(),
    };
  }

  async addLeaf(leafValue) {
    if (!this.poseidon) {
      await this.initialize();
    }

    this.leaves.push(BigInt(leafValue));
    if (this.leaves.length > this.capacity) {
      this.leaves = this.leaves.slice(0, this.capacity);
    }
    this._buildTree();
    return this.leaves.length - 1;
  }

  getLeafCount() {
    return this.leaves.filter((l) => l !== 0n).length;
  }
}

module.exports = { MerkleTree };
