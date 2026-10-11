import { z } from "zod";

export const CreateBookingSchema = z.object({
  serviceId: z.string().min(1, "সার্ভিস নির্বাচন করুন"),
  selectedDurationMinutes: z.number().int().min(15).max(720),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "সঠিক তারিখ নির্বাচন করুন (YYYY-MM-DD)"),
  scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/, "সঠিক সময় নির্বাচন করুন (HH:mm)"),
  addressId: z.string().optional(),
  // Or inline new address
  newAddress: z
    .object({
      label: z.enum(["HOME", "OFFICE", "OTHER"]).default("HOME"),
      addressLine: z.string().min(5, "পূর্ণ ঠিকানা আবশ্যক (বাড়ি, রোড, ফ্ল্যাট)"),
      area: z.string().min(2, "এলাকা নির্বাচন করুন"),
      city: z.string().default("Dhaka"),
      specialInstructions: z.string().max(300).optional(),
    })
    .optional(),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "BKASH", "NAGAD", "CARD"]).default("CASH_ON_DELIVERY"),
  customerNotes: z.string().max(500).optional(),
  couponCode: z.string().optional(),
}).refine((data) => !!data.addressId || !!data.newAddress, {
  message: "সার্ভিস গ্রহণের ঠিকানা নির্বাচন বা তৈরি করুন",
  path: ["addressId"],
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const CancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(5, "বাতিলকরণের কারণ লিখুন").max(300),
});

export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;
