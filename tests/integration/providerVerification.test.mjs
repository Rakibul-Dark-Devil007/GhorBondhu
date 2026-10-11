import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * GhorBondhu Provider KYC & Verification Engine Simulation
 */
class ProviderVerificationEngine {
  static submitApplication(provider, kycData) {
    if (provider.verificationStatus === "VERIFIED") {
      throw new Error("Provider is already verified. Cannot resubmit.");
    }
    return {
      ...provider,
      verificationStatus: "PENDING_REVIEW",
      kycData,
      applicationSubmittedAt: new Date().toISOString(),
    };
  }

  static reviewApplication(application, adminActor, verdict, rejectionReason = "") {
    if (adminActor.role !== "ADMIN" && adminActor.role !== "SUPER_ADMIN") {
      throw new Error("Only Admin or Super Admin can review KYC applications");
    }

    if (verdict === "APPROVE") {
      return {
        ...application,
        verificationStatus: "VERIFIED",
        reviewedBy: adminActor.uid,
        reviewedAt: new Date().toISOString(),
      };
    } else if (verdict === "REJECT") {
      if (!rejectionReason) {
        throw new Error("Rejection reason is mandatory when rejecting KYC");
      }
      return {
        ...application,
        verificationStatus: "REJECTED",
        rejectionReason,
        reviewedBy: adminActor.uid,
        reviewedAt: new Date().toISOString(),
      };
    } else {
      throw new Error("Invalid verdict: must be APPROVE or REJECT");
    }
  }

  static assertProviderCanAcceptJob(provider) {
    if (provider.verificationStatus !== "VERIFIED") {
      throw new Error(`Provider verification status is ${provider.verificationStatus}. Only VERIFIED providers can accept jobs.`);
    }
    if (provider.status === "SUSPENDED") {
      throw new Error("Account is suspended. Cannot accept jobs.");
    }
    return true;
  }
}

describe("Integration: Provider KYC Verification & Job Gating", () => {
  const newProvider = {
    providerId: "prov_rahim",
    fullName: "Rahim Uddin",
    role: "PROVIDER",
    status: "ACTIVE",
    verificationStatus: "UNVERIFIED",
  };

  it("should block unverified provider from accepting jobs", () => {
    assert.throws(
      () => {
        ProviderVerificationEngine.assertProviderCanAcceptJob(newProvider);
      },
      /Only VERIFIED providers can accept jobs/
    );
  });

  it("should allow provider to submit KYC and move to PENDING_REVIEW", () => {
    const submitted = ProviderVerificationEngine.submitApplication(newProvider, {
      nidNumber: "19941234567890",
      nidFrontUrl: "https://storage.googleapis.com/kyc/nid_front.jpg",
      nidBackUrl: "https://storage.googleapis.com/kyc/nid_back.jpg",
    });

    assert.equal(submitted.verificationStatus, "PENDING_REVIEW");
    assert.ok(submitted.applicationSubmittedAt);
  });

  it("should prevent provider from self-approving their own application", () => {
    const submitted = { ...newProvider, verificationStatus: "PENDING_REVIEW" };

    assert.throws(
      () => {
        ProviderVerificationEngine.reviewApplication(submitted, {
          uid: "prov_rahim",
          role: "PROVIDER", // Attacker pretends or attempts to approve
        }, "APPROVE");
      },
      /Only Admin or Super Admin can review KYC/
    );
  });

  it("should allow Admin to approve application and enable job acceptance", () => {
    const submitted = { ...newProvider, verificationStatus: "PENDING_REVIEW" };

    const approved = ProviderVerificationEngine.reviewApplication(
      submitted,
      { uid: "admin_super", role: "SUPER_ADMIN" },
      "APPROVE"
    );

    assert.equal(approved.verificationStatus, "VERIFIED");
    assert.equal(approved.reviewedBy, "admin_super");

    // Verified provider can now accept jobs!
    const canAccept = ProviderVerificationEngine.assertProviderCanAcceptJob(approved);
    assert.equal(canAccept, true);
  });

  it("should require reason when admin rejects and allow provider resubmission", () => {
    const submitted = { ...newProvider, verificationStatus: "PENDING_REVIEW" };

    // Missing rejection reason throws error
    assert.throws(
      () => {
        ProviderVerificationEngine.reviewApplication(
          submitted,
          { uid: "admin_1", role: "ADMIN" },
          "REJECT",
          "" // Empty reason
        );
      },
      /Rejection reason is mandatory/
    );

    // Valid rejection with explanation
    const rejected = ProviderVerificationEngine.reviewApplication(
      submitted,
      { uid: "admin_1", role: "ADMIN" },
      "REJECT",
      "জাতীয় পরিচয়পত্রের ছবি অস্পষ্ট।"
    );
    assert.equal(rejected.verificationStatus, "REJECTED");
    assert.equal(rejected.rejectionReason, "জাতীয় পরিচয়পত্রের ছবি অস্পষ্ট।");

    // Provider can resubmit fixes
    const resubmitted = ProviderVerificationEngine.submitApplication(rejected, {
      nidNumber: "19941234567890",
      nidFrontUrl: "https://storage.googleapis.com/kyc/nid_front_clear.jpg",
      nidBackUrl: "https://storage.googleapis.com/kyc/nid_back.jpg",
    });
    assert.equal(resubmitted.verificationStatus, "PENDING_REVIEW");
  });

  it("should block suspended provider from accepting jobs even if verified", () => {
    const suspendedVerifiedProvider = {
      ...newProvider,
      verificationStatus: "VERIFIED",
      status: "SUSPENDED",
    };

    assert.throws(
      () => {
        ProviderVerificationEngine.assertProviderCanAcceptJob(suspendedVerifiedProvider);
      },
      /Account is suspended/
    );
  });
});
