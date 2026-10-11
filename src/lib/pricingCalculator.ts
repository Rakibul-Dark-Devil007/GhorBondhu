import type { PricingRule, PricingSnapshot } from "@/types";

export interface PricingOptions {
  isEmergency?: boolean;
  scheduledDate?: string;      // YYYY-MM-DD
  scheduledStartTime?: string; // HH:mm
  discountAmount?: number;
  couponCode?: string;
}

/**
 * Checks if a given scheduled date falls on a weekend in Bangladesh (Friday or Saturday)
 */
export function isBangladeshWeekend(dateStr?: string): boolean {
  if (!dateStr) return false;
  const day = new Date(dateStr).getDay();
  // 5 = Friday, 6 = Saturday
  return day === 5 || day === 6;
}

/**
 * Checks if a given time falls in peak hours (e.g., 17:00 - 21:00)
 */
export function isPeakHour(timeStr?: string): boolean {
  if (!timeStr) return false;
  const [hourStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  return hour >= 17 && hour <= 21;
}

/**
 * Core mathematical engine to calculate dynamic price and financial split
 */
export function computePricingSnapshot(
  rule: PricingRule,
  selectedDurationMinutes: number,
  options: PricingOptions = {}
): PricingSnapshot {
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

  // 1. Calculate Duration Delta & Steps
  const deltaDuration = Math.max(0, selectedDurationMinutes - baseDurationMinutes);
  const stepMinutes = incrementDurationMinutes || 30;
  const additionalSteps = deltaDuration > 0 ? Math.ceil(deltaDuration / stepMinutes) : 0;

  // 2. Incremental Duration Surcharge
  const stepPercentage = incrementPercentage || 0.30;
  const calculatedDurationSurcharge = Math.round(
    additionalSteps * (basePriceBDT * stepPercentage)
  );

  // 3. Subtotal before multipliers
  const serviceSubtotal = basePriceBDT + calculatedDurationSurcharge;

  // 4. Apply Multipliers (Peak Hour & Weekend)
  let peakMultiplierApplied = 1.0;
  if (isPeakHour(options.scheduledStartTime) && peakHourMultiplier > 1.0) {
    peakMultiplierApplied = peakHourMultiplier;
  } else if (isBangladeshWeekend(options.scheduledDate) && weekendMultiplier > 1.0) {
    peakMultiplierApplied = weekendMultiplier;
  }

  const multipliedSubtotal = Math.round(serviceSubtotal * peakMultiplierApplied);

  // 5. Emergency Surcharge
  const emergencyFee = options.isEmergency ? (emergencySurchargeBDT || 0) : 0;

  // 6. Discount (e.g. from validated coupon)
  const discountAmount = Math.max(0, options.discountAmount || 0);

  // 7. Gross Customer Final Amount
  const customerFinalAmount = Math.max(
    basePriceBDT,
    multipliedSubtotal + emergencyFee - discountAmount
  );

  // 8. Platform Commission & Provider Earning Split
  const commissionRate = (platformCommissionPercent || 20) / 100;
  const platformCommissionAmount = Math.round(customerFinalAmount * commissionRate);
  const providerEarningAmount = customerFinalAmount - platformCommissionAmount;

  return {
    pricingRuleId: rule.ruleId,
    ruleVersion: rule.versionTag,
    basePrice: basePriceBDT,
    baseDurationMinutes,
    selectedDurationMinutes,
    incrementStepMinutes: stepMinutes,
    incrementPercentage: stepPercentage,
    calculatedDurationSurcharge,
    emergencySurcharge: emergencyFee,
    discountAmount,
    appliedCouponCode: options.couponCode,
    customerFinalAmount,
    platformCommissionPercent,
    platformCommissionAmount,
    providerEarningAmount,
    currency: "BDT",
    calculatedAt: new Date().toISOString(),
  };
}
