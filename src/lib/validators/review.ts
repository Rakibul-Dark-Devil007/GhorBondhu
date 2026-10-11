import { z } from "zod";

export const SubmitBookingReviewSchema = z.object({
  bookingId: z.string().min(1, "বুকিং আইডি আবশ্যক"),
  rating: z.number().int().min(1, "রেটিং কমপক্ষে ১ স্টার হতে হবে").max(5, "রেটিং সর্বোচ্চ ৫ স্টার হতে পারে"),
  comment: z.string().min(3, "কমপক্ষে ৩ অক্ষরের রিভিউ বা মন্তব্য লিখুন").max(500, "মন্তব্য ৫০০ অক্ষরের মধ্যে সীমাবদ্ধ রাখুন"),
  tags: z.array(z.string()).optional(),
});

export type SubmitBookingReviewInput = z.infer<typeof SubmitBookingReviewSchema>;

export const VerifyStartOtpSchema = z.object({
  bookingId: z.string().min(1, "বুকিং আইডি আবশ্যক"),
  otp: z.string().length(4, "৪ ডিজিটের সঠিক ওটিপি দিন"),
});

export type VerifyStartOtpInput = z.infer<typeof VerifyStartOtpSchema>;
