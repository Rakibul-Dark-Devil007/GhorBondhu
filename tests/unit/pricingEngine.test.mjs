import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure mathematical model matching GhorBondhu server-side pricing algorithm
 */
function calculateAuthoritativePrice(rule, params) {
  const {
    basePriceBDT = 500,
    baseDurationMinutes = 30,
    incrementDurationMinutes = 30,
    incrementPercentage = 0.30,
    platformCommissionPercent = 20,
    emergencySurchargeBDT = 150,
    peakHourMultiplier = 1.20,
    weekendMultiplier = 1.10,
  } = rule;

  const {
    durationMinutes,
    isPeak = false,
    isWeekend = false,
    isEmergency = false,
    discountAmount = 0,
  } = params;

  // 1. Calculate duration increment steps
  const deltaDuration = Math.max(0, durationMinutes - baseDurationMinutes);
  const stepMinutes = Math.max(1, incrementDurationMinutes);
  const additionalSteps = deltaDuration > 0 ? Math.ceil(deltaDuration / stepMinutes) : 0;

  // 2. Duration surcharge
  const stepRate = basePriceBDT * incrementPercentage;
  const calculatedDurationSurcharge = Math.round(additionalSteps * stepRate);
  const serviceSubtotal = basePriceBDT + calculatedDurationSurcharge;

  // 3. Multiplier logic (Peak takes precedence or weekend)
  let peakMultiplier = 1.0;
  if (isPeak && peakHourMultiplier > 1.0) {
    peakMultiplier = peakHourMultiplier;
  } else if (isWeekend && weekendMultiplier > 1.0) {
    peakMultiplier = weekendMultiplier;
  }

  const multipliedSubtotal = Math.round(serviceSubtotal * peakMultiplier);
  const emergencyFee = isEmergency ? emergencySurchargeBDT : 0;
  const safeDiscount = Math.max(0, discountAmount);

  // 4. Gross Customer Payable with Base Price Floor Protection
  const customerFinalAmount = Math.max(
    basePriceBDT,
    multipliedSubtotal + emergencyFee - safeDiscount
  );

  // 5. Commission and Provider Split
  const commissionRatio = platformCommissionPercent / 100;
  const platformCommissionAmount = Math.round(customerFinalAmount * commissionRatio);
  const providerEarningAmount = customerFinalAmount - platformCommissionAmount;

  return {
    customerFinalAmount,
    platformCommissionAmount,
    providerEarningAmount,
    serviceSubtotal,
    calculatedDurationSurcharge,
    additionalSteps,
    peakMultiplierApplied: peakMultiplier,
    emergencySurchargeApplied: emergencyFee,
  };
}

describe("Unit: Pricing Engine Mathematical & Business Invariants", () => {
  const standardCleaningRule = {
    pricingRuleId: "rule_standard_cleaning",
    basePriceBDT: 500,
    baseDurationMinutes: 30,
    incrementDurationMinutes: 30,
    incrementPercentage: 0.30, // 30% of 500 = 150 BDT
    platformCommissionPercent: 20,
    emergencySurchargeBDT: 150,
    peakHourMultiplier: 1.20,
    weekendMultiplier: 1.10,
  };

  it("should calculate exact base price and 80/20 split for minimum duration (30 min)", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 30,
    });

    assert.equal(result.customerFinalAmount, 500);
    assert.equal(result.platformCommissionAmount, 100); // 20% of 500
    assert.equal(result.providerEarningAmount, 400); // 80% of 500
    assert.equal(result.additionalSteps, 0);
    assert.equal(result.calculatedDurationSurcharge, 0);
  });

  it("should calculate correct surcharge for 1 additional step (60 min)", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 60,
    });

    // 30m base (500) + 1 step (150) = 650
    assert.equal(result.customerFinalAmount, 650);
    assert.equal(result.additionalSteps, 1);
    assert.equal(result.calculatedDurationSurcharge, 150);
    assert.equal(result.platformCommissionAmount, 130); // 20% of 650
    assert.equal(result.providerEarningAmount, 520); // 80% of 650
  });

  it("should ceiling fractional duration steps correctly (e.g. 45 min -> 1 step)", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 45,
    });

    assert.equal(result.additionalSteps, 1);
    assert.equal(result.calculatedDurationSurcharge, 150);
    assert.equal(result.customerFinalAmount, 650);
  });

  it("should apply 1.20x peak hour surge multiplier on subtotal", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 30,
      isPeak: true,
    });

    // 500 * 1.2 = 600
    assert.equal(result.customerFinalAmount, 600);
    assert.equal(result.peakMultiplierApplied, 1.20);
    assert.equal(result.platformCommissionAmount, 120);
    assert.equal(result.providerEarningAmount, 480);
  });

  it("should apply 1.10x weekend multiplier when not in peak hours", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 30,
      isWeekend: true,
    });

    // 500 * 1.1 = 550
    assert.equal(result.customerFinalAmount, 550);
    assert.equal(result.peakMultiplierApplied, 1.10);
  });

  it("should prioritize peak multiplier over weekend multiplier if both coincide", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 30,
      isPeak: true,
      isWeekend: true,
    });

    // Should choose 1.20 (peak) over 1.10 (weekend)
    assert.equal(result.customerFinalAmount, 600);
    assert.equal(result.peakMultiplierApplied, 1.20);
  });

  it("should add emergency surcharge (+150 BDT)", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 90, // base 500 + 2 steps (300) = 800
      isEmergency: true,
    });

    // 800 + 150 = 950
    assert.equal(result.customerFinalAmount, 950);
    assert.equal(result.emergencySurchargeApplied, 150);
    assert.equal(result.platformCommissionAmount, 190);
    assert.equal(result.providerEarningAmount, 760);
  });

  it("should enforce base price floor even if discount coupon exceeds price", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 30,
      discountAmount: 1000, // Attempt 1000 BDT discount on 500 BDT base
    });

    // Final price must NOT drop below basePriceBDT (500)
    assert.equal(result.customerFinalAmount, 500);
    assert.equal(result.providerEarningAmount, 400);
  });

  it("should handle large durations without integer overflow or NaN (720 min / 12 hours)", () => {
    const result = calculateAuthoritativePrice(standardCleaningRule, {
      durationMinutes: 720,
    });

    // 720 - 30 = 690 min. 690 / 30 = 23 steps.
    // 23 * 150 = 3450.
    // Subtotal = 500 + 3450 = 3950 BDT.
    assert.equal(result.additionalSteps, 23);
    assert.equal(result.calculatedDurationSurcharge, 3450);
    assert.equal(result.customerFinalAmount, 3950);
    assert.equal(result.platformCommissionAmount + result.providerEarningAmount, 3950);
  });
});
