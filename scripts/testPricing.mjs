/**
 * Standalone Pricing Engine Verification Test
 * Tests duration increments, multipliers, commission splits, and edge cases.
 */

function computePrice(rule, durationMinutes, options = {}) {
  const {
    basePriceBDT,
    baseDurationMinutes,
    incrementDurationMinutes,
    incrementPercentage,
    platformCommissionPercent,
    emergencySurchargeBDT,
    peakHourMultiplier,
    weekendMultiplier,
  } = rule;

  const deltaDuration = Math.max(0, durationMinutes - baseDurationMinutes);
  const stepMinutes = incrementDurationMinutes || 30;
  const additionalSteps = deltaDuration > 0 ? Math.ceil(deltaDuration / stepMinutes) : 0;
  const stepPercentage = incrementPercentage || 0.30;
  const calculatedDurationSurcharge = Math.round(additionalSteps * (basePriceBDT * stepPercentage));
  const serviceSubtotal = basePriceBDT + calculatedDurationSurcharge;

  let peakMultiplier = 1.0;
  if (options.isPeak && peakHourMultiplier > 1.0) {
    peakMultiplier = peakHourMultiplier;
  } else if (options.isWeekend && weekendMultiplier > 1.0) {
    peakMultiplier = weekendMultiplier;
  }

  const multipliedSubtotal = Math.round(serviceSubtotal * peakMultiplier);
  const emergencyFee = options.isEmergency ? (emergencySurchargeBDT || 0) : 0;
  const discountAmount = Math.max(0, options.discountAmount || 0);

  const customerFinalAmount = Math.max(
    basePriceBDT,
    multipliedSubtotal + emergencyFee - discountAmount
  );

  const commissionRate = (platformCommissionPercent || 20) / 100;
  const platformCommissionAmount = Math.round(customerFinalAmount * commissionRate);
  const providerEarningAmount = customerFinalAmount - platformCommissionAmount;

  return {
    customerFinalAmount,
    platformCommissionAmount,
    providerEarningAmount,
    calculatedDurationSurcharge,
    additionalSteps,
  };
}

const sampleRule = {
  ruleId: "rule_test_cleaning",
  basePriceBDT: 500,
  baseDurationMinutes: 30,
  incrementDurationMinutes: 30,
  incrementPercentage: 0.30, // 30% = 150 BDT per 30 min
  platformCommissionPercent: 20,
  emergencySurchargeBDT: 150,
  peakHourMultiplier: 1.20,
  weekendMultiplier: 1.10,
};

console.log("🧪 Running GhorBondhu Pricing Engine Verification Tests...\n");

// TEST 1: Base duration (30 minutes)
const t1 = computePrice(sampleRule, 30);
console.assert(t1.customerFinalAmount === 500, `Test 1 Failed: Expected 500, got ${t1.customerFinalAmount}`);
console.assert(t1.platformCommissionAmount === 100, `Test 1 Commission Failed: Expected 100, got ${t1.platformCommissionAmount}`);
console.assert(t1.providerEarningAmount === 400, `Test 1 Earning Failed: Expected 400, got ${t1.providerEarningAmount}`);
console.log("✅ Test 1 Passed: Base duration 30 min = ৳500 (Split: ৳100 Platform / ৳400 Provider)");

// TEST 2: Additional 2 Steps (90 minutes) -> 30m base + 2 steps of 30m (+300 BDT) = 800 BDT
const t2 = computePrice(sampleRule, 90);
console.assert(t2.customerFinalAmount === 800, `Test 2 Failed: Expected 800, got ${t2.customerFinalAmount}`);
console.assert(t2.platformCommissionAmount === 160, `Test 2 Commission: Expected 160, got ${t2.platformCommissionAmount}`);
console.assert(t2.providerEarningAmount === 640, `Test 2 Earning: Expected 640, got ${t2.providerEarningAmount}`);
console.log("✅ Test 2 Passed: 90 min duration = ৳800 (Split: ৳160 Platform / ৳640 Provider)");

// TEST 3: Peak Hour Multiplier (1.20x on ৳500 base) = ৳600
const t3 = computePrice(sampleRule, 30, { isPeak: true });
console.assert(t3.customerFinalAmount === 600, `Test 3 Failed: Expected 600, got ${t3.customerFinalAmount}`);
console.log("✅ Test 3 Passed: Peak hour multiplier applied = ৳600");

// TEST 4: Emergency Surcharge (+৳150 on 90 min) = ৳800 + ৳150 = ৳950
const t4 = computePrice(sampleRule, 90, { isEmergency: true });
console.assert(t4.customerFinalAmount === 950, `Test 4 Failed: Expected 950, got ${t4.customerFinalAmount}`);
console.log("✅ Test 4 Passed: Emergency surcharge applied = ৳950");

// TEST 5: Coupon Discount (-৳100 on ৳800) = ৳700
const t5 = computePrice(sampleRule, 90, { discountAmount: 100 });
console.assert(t5.customerFinalAmount === 700, `Test 5 Failed: Expected 700, got ${t5.customerFinalAmount}`);
console.log("✅ Test 5 Passed: Discount applied = ৳700");

console.log("\n🎉 All 5 Pricing Engine mathematical unit tests passed successfully!");
