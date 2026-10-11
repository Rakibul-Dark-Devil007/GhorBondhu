import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * GhorBondhu Financial Ledger & Payout Engine Simulator
 */
class FinancialLedgerEngine {
  constructor(minimumWithdrawalLimit = 500) {
    this.minimumWithdrawalLimit = minimumWithdrawalLimit;
    this.payments = new Map();
    this.payouts = new Map();
    this.wallets = new Map(); // providerId -> { availableBalance, pendingPayout, totalEarned }
  }

  getWallet(providerId) {
    if (!this.wallets.has(providerId)) {
      this.wallets.set(providerId, { availableBalance: 0, pendingPayout: 0, totalEarned: 0 });
    }
    return this.wallets.get(providerId);
  }

  creditProviderEarning(providerId, earningAmount) {
    const wallet = this.getWallet(providerId);
    wallet.availableBalance += earningAmount;
    wallet.totalEarned += earningAmount;
    return wallet;
  }

  initiatePayment(paymentId, bookingId, customerId, amountBDT, method) {
    if (this.payments.has(paymentId)) {
      throw new Error("Payment already exists");
    }
    const payment = {
      paymentId,
      bookingId,
      customerId,
      amountBDT,
      paymentMethod: method,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.payments.set(paymentId, payment);
    return payment;
  }

  confirmPayment(paymentId, gatewayTxId) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    // Idempotency check: Replay attack defense
    if (payment.status === "COMPLETED") {
      const err = new Error("Payment is already completed. Idempotent rejection.");
      err.code = "already-exists";
      throw err;
    }

    payment.status = "COMPLETED";
    payment.gatewayTxId = gatewayTxId;
    payment.completedAt = new Date().toISOString();
    return payment;
  }

  requestPayout(payoutId, providerId, requestedAmount) {
    const wallet = this.getWallet(providerId);

    // 1. Min withdrawal check
    if (requestedAmount < this.minimumWithdrawalLimit) {
      throw new Error(`Requested amount ৳${requestedAmount} is below minimum withdrawal limit ৳${this.minimumWithdrawalLimit}`);
    }

    // 2. Available balance check
    if (wallet.availableBalance < requestedAmount) {
      throw new Error(`Insufficient wallet balance. Available: ৳${wallet.availableBalance}, Requested: ৳${requestedAmount}`);
    }

    // 3. Atomic deduction to pending
    wallet.availableBalance -= requestedAmount;
    wallet.pendingPayout += requestedAmount;

    const payout = {
      payoutId,
      providerId,
      amountBDT: requestedAmount,
      status: "PENDING",
      requestedAt: new Date().toISOString(),
    };
    this.payouts.set(payoutId, payout);
    return payout;
  }

  processAdminPayout(payoutId, adminActor, action, rejectionReason = "") {
    if (adminActor.role !== "ADMIN" && adminActor.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized: Only Admin or Super Admin can disburse payouts");
    }

    const payout = this.payouts.get(payoutId);
    if (!payout || payout.status !== "PENDING") {
      throw new Error("Payout not found or not in PENDING status");
    }

    const wallet = this.getWallet(payout.providerId);

    if (action === "APPROVE") {
      payout.status = "COMPLETED";
      payout.processedBy = adminActor.uid;
      wallet.pendingPayout -= payout.amountBDT;
      return payout;
    } else if (action === "REJECT") {
      payout.status = "REJECTED";
      payout.rejectionReason = rejectionReason;
      payout.processedBy = adminActor.uid;
      // Refund back from pending to available
      wallet.pendingPayout -= payout.amountBDT;
      wallet.availableBalance += payout.amountBDT;
      return payout;
    } else {
      throw new Error("Invalid action: must be APPROVE or REJECT");
    }
  }
}

describe("Integration: Payment Gateways, Webhook Replay Defense & Provider Payouts", () => {
  it("should successfully initiate and complete gateway payment", () => {
    const ledger = new FinancialLedgerEngine(500);

    const payment = ledger.initiatePayment("pay_1", "bk_1", "cust_1", 800, "BKASH");
    assert.equal(payment.status, "PENDING");

    const completed = ledger.confirmPayment("pay_1", "BKASH_TRX_999");
    assert.equal(completed.status, "COMPLETED");
    assert.equal(completed.gatewayTxId, "BKASH_TRX_999");
  });

  it("should reject duplicate confirmation attempts (Replay Attack Defense)", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.initiatePayment("pay_1", "bk_1", "cust_1", 800, "BKASH");
    ledger.confirmPayment("pay_1", "BKASH_TRX_999");

    // Second confirm attempt must throw already-exists error
    assert.throws(
      () => {
        ledger.confirmPayment("pay_1", "BKASH_TRX_999");
      },
      (err) => err.code === "already-exists"
    );
  });

  it("should enforce minimum payout threshold (500 BDT)", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.creditProviderEarning("prov_karim", 1000);

    assert.throws(
      () => {
        ledger.requestPayout("payout_1", "prov_karim", 300); // 300 is below 500 BDT min limit
      },
      /below minimum withdrawal limit/
    );
  });

  it("should block payout when requested amount exceeds available balance", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.creditProviderEarning("prov_karim", 600);

    assert.throws(
      () => {
        ledger.requestPayout("payout_1", "prov_karim", 1200); // Exceeds 600
      },
      /Insufficient wallet balance/
    );
  });

  it("should atomically hold funds during pending payout and clear on admin approval", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.creditProviderEarning("prov_karim", 2000);

    // Request 1500 payout
    const payout = ledger.requestPayout("payout_101", "prov_karim", 1500);
    assert.equal(payout.status, "PENDING");

    const walletAfterRequest = ledger.getWallet("prov_karim");
    assert.equal(walletAfterRequest.availableBalance, 500); // 2000 - 1500
    assert.equal(walletAfterRequest.pendingPayout, 1500);

    // Admin approves payout
    const approved = ledger.processAdminPayout(
      "payout_101",
      { uid: "admin_super", role: "SUPER_ADMIN" },
      "APPROVE"
    );
    assert.equal(approved.status, "COMPLETED");

    const finalWallet = ledger.getWallet("prov_karim");
    assert.equal(finalWallet.availableBalance, 500);
    assert.equal(finalWallet.pendingPayout, 0);
  });

  it("should return funds to available balance if admin rejects payout", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.creditProviderEarning("prov_karim", 1000);

    ledger.requestPayout("payout_102", "prov_karim", 800);
    assert.equal(ledger.getWallet("prov_karim").availableBalance, 200);
    assert.equal(ledger.getWallet("prov_karim").pendingPayout, 800);

    // Admin rejects payout due to bank details issue
    const rejected = ledger.processAdminPayout(
      "payout_102",
      { uid: "admin_1", role: "ADMIN" },
      "REJECT",
      "ব্যাংক অ্যাকাউন্ট নম্বর ভুল।"
    );
    assert.equal(rejected.status, "REJECTED");

    // Funds must be restored to availableBalance!
    const restoredWallet = ledger.getWallet("prov_karim");
    assert.equal(restoredWallet.availableBalance, 1000);
    assert.equal(restoredWallet.pendingPayout, 0);
  });

  it("should prevent non-admin from approving or disbursing payouts", () => {
    const ledger = new FinancialLedgerEngine(500);
    ledger.creditProviderEarning("prov_karim", 1000);
    ledger.requestPayout("payout_103", "prov_karim", 600);

    assert.throws(
      () => {
        ledger.processAdminPayout(
          "payout_103",
          { uid: "prov_karim", role: "PROVIDER" }, // Provider attempts self-approval
          "APPROVE"
        );
      },
      /Unauthorized/
    );
  });
});
