const { ProofGenerationError, ErrorCode } = require("./errors");

class SorobanZkIntegration {
  constructor(options = {}) {
    this.contractId = options.contractId;
    this.rpcUrl = options.rpcUrl || "https://soroban-testnet.stellar.org";
    this.networkPassphrase =
      options.networkPassphrase ||
      "Test SDF Network ; September 2015";
    this.proofGenerator = options.proofGenerator;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.maxPollAttempts = options.maxPollAttempts || 30;
  }

  formatProofForContract(proof) {
    const { pi_a, pi_b, pi_c } = proof;

    return {
      a: {
        x: BigInt(pi_a[0]).toString(),
        y: BigInt(pi_a[1]).toString(),
      },
      b: {
        x: [BigInt(pi_b[0][0]).toString(), BigInt(pi_b[0][1]).toString()],
        y: [BigInt(pi_b[1][0]).toString(), BigInt(pi_b[1][1]).toString()],
      },
      c: {
        x: BigInt(pi_c[0]).toString(),
        y: BigInt(pi_c[1]).toString(),
      },
    };
  }

  formatPublicSignalsForContract(publicSignals) {
    return publicSignals.map((s) => BigInt(s).toString());
  }

  prepareSubmitProofArgs(proof, publicSignals) {
    const formattedProof = this.formatProofForContract(proof);
    const formattedSignals = this.formatPublicSignalsForContract(publicSignals);

    const proofHash = this._computeProofHash(proof);
    const commitment = this._computeCommitment(publicSignals);

    return {
      formattedProof,
      formattedSignals,
      proofHash,
      commitment,
    };
  }

  async submitProofToContract(identityId, verifierAddress, proof, publicSignals) {
    if (!this.contractId) {
      throw new ProofGenerationError(
        "Contract ID not configured",
        ErrorCode.SOROBAN_INTEGRATION_FAILED
      );
    }

    const { proofHash, commitment } = this.prepareSubmitProofArgs(
      proof,
      publicSignals
    );

    return {
      contractId: this.contractId,
      method: "submit_proof",
      args: {
        identity_id: identityId,
        verifier: verifierAddress,
        proof_hash: proofHash,
        verification_commitment: commitment,
      },
      formattedProof: this.formatProofForContract(proof),
      formattedPublicSignals: this.formatPublicSignalsForContract(publicSignals),
    };
  }

  async submitAndVerify(identityId, verifierAddress, proof, publicSignals) {
    // First verify the proof locally
    if (this.proofGenerator) {
      const verification = await this.proofGenerator.verifyProof(
        proof,
        publicSignals
      );
      if (!verification.isValid) {
        throw new ProofGenerationError(
          "Proof failed local verification before submission",
          ErrorCode.VERIFICATION_FAILED
        );
      }
    }

    const submission = await this.submitProofToContract(
      identityId,
      verifierAddress,
      proof,
      publicSignals
    );

    return submission;
  }

  buildApproveTransaction(verificationId) {
    return {
      contractId: this.contractId,
      method: "approve_verification",
      args: { verification_id: verificationId },
    };
  }

  buildRejectTransaction(verificationId, reason) {
    return {
      contractId: this.contractId,
      method: "reject_verification",
      args: { verification_id: verificationId, reason },
    };
  }

  buildRevokeTransaction(verificationId, reason) {
    return {
      contractId: this.contractId,
      method: "revoke_verification",
      args: { verification_id: verificationId, reason },
    };
  }

  buildStatusQuery(verificationId) {
    return {
      contractId: this.contractId,
      method: "get_verification_status",
      args: { verification_id: verificationId },
    };
  }

  _computeProofHash(proof) {
    const proofStr = JSON.stringify(proof);
    const hash = require("crypto")
      .createHash("sha256")
      .update(proofStr)
      .digest("hex");
    return hash.slice(0, 64);
  }

  _computeCommitment(publicSignals) {
    const signalsStr = publicSignals.join(",");
    const hash = require("crypto")
      .createHash("sha256")
      .update(signalsStr)
      .digest("hex");
    return hash.slice(0, 64);
  }

  getContractInfo() {
    return {
      contractId: this.contractId,
      rpcUrl: this.rpcUrl,
      network: this.networkPassphrase,
    };
  }
}

module.exports = { SorobanZkIntegration };
