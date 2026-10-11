import { z } from "zod";

export const PricingRuleSchema = z.object({
  ruleId: z
    .string()
    .min(2, "রুল আইডি ন্যূনতম ২ অক্ষরের হতে হবে")
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "আইডি শুধুমাত্র ছোট হাতের ইংরেজি অক্ষর, সংখ্যা, আন্ডারস্কোর ও হাইফেন হতে পারবে"),
  serviceId: z.string().min(1, "সার্ভিস আইডি আবশ্যক"),
  versionTag: z.string().min(1, "ভার্সন ট্যাগ আবশ্যক (যেমন: 2026-v1)"),
  basePriceBDT: z.number().int().min(50, "বেস প্রাইস ন্যূনতম ৫০ টাকা হতে হবে"),
  baseDurationMinutes: z.number().int().min(15).max(360),
  incrementDurationMinutes: z.number().int().min(15).max(180).default(30),
  incrementPercentage: z.number().min(0).max(2.0).default(0.30), // e.g. 0.30 for 30%
  platformCommissionPercent: z.number().min(0).max(100).default(20), // e.g. 20 for 20%
  emergencySurchargeBDT: z.number().int().min(0).default(0),
  peakHourMultiplier: z.number().min(1.0).max(3.0).default(1.0), // e.g. 1.20 for +20%
  weekendMultiplier: z.number().min(1.0).max(3.0).default(1.0),
  isActive: z.boolean().default(true),
});

export type PricingRuleInput = z.infer<typeof PricingRuleSchema>;

export const CalculatePriceQuoteSchema = z.object({
  serviceId: z.string().min(1),
  durationMinutes: z.number().int().min(15).max(720),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "সঠিক তারিখ দিন (YYYY-MM-DD)"),
  scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/, "সঠিক সময় দিন (HH:mm)"),
  isEmergency: z.boolean().optional().default(false),
  couponCode: z.string().optional(),
});

export type CalculatePriceQuoteInput = z.infer<typeof CalculatePriceQuoteSchema>;
