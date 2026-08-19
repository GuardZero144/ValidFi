const { expect } = require("chai");
const {
  SorobanZkIntegration,
} = require("../../src/sorobanIntegration");
const {
  ProofGenerationError,
  ErrorCode,
} = require("../../src/errors");

describe("Soroban ZK Integration Tests", function () {
  this.timeout(30000);
  let integration;

  beforeEach(() => {
    integration = new SorobanZkIntegration({
      contractId: "CABC123TEST",
      rpcUrl: "https://soroban-testnet.stellar.org",
    });
  });

  describe("Proof Formatting", () => {
    it("should format proof for Soroban contract", () => {
      const mockProof = {
        pi_a: ["123", "456", "1"],
        pi_b: [
          ["789", "012"],
          ["345", "678"],
          ["1", "0"],
        ],
        pi_c: ["999", "888", "1"],
        protocol: "groth16",
        curve: "bn128",
      };

      const formatted = integration.formatProofForContract(mockProof);

      expect(formatted.a.x).to.equal("123");
      expect(formatted.a.y).to.equal("456");
      expect(formatted.b.x).to.deep.equal(["789", "12"]);
      expect(formatted.b.y).to.deep.equal(["345", "678"]);
      expect(formatted.c.x).to.equal("999");
      expect(formatted.c.y).to.equal("888");
    });

    it("should format public signals for contract", () => {
      const signals = ["111", "222", "333"];
      const formatted =
        integration.formatPublicSignalsForContract(signals);

      expect(formatted).to.deep.equal(["111", "222", "333"]);
    });
  });

  describe("Transaction Building", () => {
    it("should prepare submit_proof args", () => {
      const mockProof = {
        pi_a: ["123", "456", "1"],
        pi_b: [
          ["789", "012"],
          ["345", "678"],
          ["1", "0"],
        ],
        pi_c: ["999", "888", "1"],
        protocol: "groth16",
        curve: "bn128",
      };
      const publicSignals = ["111", "222"];

      const result = integration.prepareSubmitProofArgs(
        mockProof,
        publicSignals
      );

      expect(result.proofHash).to.be.a("string");
      expect(result.proofHash.length).to.equal(64);
      expect(result.commitment).to.be.a("string");
      expect(result.commitment.length).to.equal(64);
    });

    it("should build approve transaction", () => {
      const tx = integration.buildApproveTransaction(42);

      expect(tx.method).to.equal("approve_verification");
      expect(tx.args.verification_id).to.equal(42);
      expect(tx.contractId).to.equal("CABC123TEST");
    });

    it("should build reject transaction", () => {
      const tx = integration.buildRejectTransaction(
        42,
        "Invalid credentials"
      );

      expect(tx.method).to.equal("reject_verification");
      expect(tx.args.verification_id).to.equal(42);
      expect(tx.args.reason).to.equal("Invalid credentials");
    });

    it("should build revoke transaction", () => {
      const tx = integration.buildRevokeTransaction(
        42,
        "Credential compromised"
      );

      expect(tx.method).to.equal("revoke_verification");
      expect(tx.args.reason).to.equal("Credential compromised");
    });

    it("should build status query", () => {
      const query = integration.buildStatusQuery(42);

      expect(query.method).to.equal("get_verification_status");
      expect(query.args.verification_id).to.equal(42);
    });
  });

  describe("submitProofToContract", () => {
    it("should fail without contract ID", async () => {
      const noContractIntegration = new SorobanZkIntegration();

      try {
        await noContractIntegration.submitProofToContract(
          1,
          "addr",
          {},
          []
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).to.be.instanceOf(ProofGenerationError);
        expect(error.code).to.equal(
          ErrorCode.SOROBAN_INTEGRATION_FAILED
        );
      }
    });

    it("should prepare submission with all required fields", async () => {
      const mockProof = {
        pi_a: ["123", "456", "1"],
        pi_b: [
          ["789", "012"],
          ["345", "678"],
          ["1", "0"],
        ],
        pi_c: ["999", "888", "1"],
      };
      const publicSignals = ["111", "222"];

      const result = await integration.submitProofToContract(
        1,
        "GABC...",
        mockProof,
        publicSignals
      );

      expect(result.contractId).to.equal("CABC123TEST");
      expect(result.method).to.equal("submit_proof");
      expect(result.args.identity_id).to.equal(1);
      expect(result.args.verifier).to.equal("GABC...");
      expect(result.formattedProof).to.exist;
      expect(result.formattedPublicSignals).to.exist;
    });
  });

  describe("getContractInfo", () => {
    it("should return contract configuration", () => {
      const info = integration.getContractInfo();

      expect(info.contractId).to.equal("CABC123TEST");
      expect(info.rpcUrl).to.equal(
        "https://soroban-testnet.stellar.org"
      );
      expect(info.network).to.include("Test SDF");
    });
  });
});
