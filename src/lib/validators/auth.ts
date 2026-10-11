import { z } from "zod";

// Phone number regex for Bangladesh (+8801... or 01...)
const bdPhoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;

export const LoginSchema = z.object({
  email: z.string().email("সঠিক ইমেইল ঠিকানা প্রদান করুন"),
  password: z.string().min(6, "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CustomerRegisterSchema = z.object({
  fullName: z.string().min(2, "পুরো নাম ন্যূনতম ২ অক্ষরের হতে হবে").max(70),
  email: z.string().email("সঠিক ইমেইল ঠিকানা প্রদান করুন"),
  phoneNumber: z.string().regex(bdPhoneRegex, "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)"),
  password: z.string().min(6, "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে"),
  confirmPassword: z.string().min(6, "পাসওয়ার্ড নিশ্চিত করুন"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "উভয় পাসওয়ার্ড একই হতে হবে",
  path: ["confirmPassword"],
});

export type CustomerRegisterInput = z.infer<typeof CustomerRegisterSchema>;

export const ProviderRegisterSchema = z.object({
  fullName: z.string().min(2, "পুরো নাম ন্যূনতম ২ অক্ষরের হতে হবে").max(70),
  email: z.string().email("সঠিক ইমেইল ঠিকানা প্রদান করুন"),
  phoneNumber: z.string().regex(bdPhoneRegex, "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "অনুগ্রহ করে লিঙ্গ নির্বাচন করুন" }),
  }),
  serviceAreas: z.array(z.string()).min(1, "কমপক্ষে একটি সার্ভিস এলাকা নির্বাচন করুন"),
  servicesOffered: z.array(z.string()).min(1, "কমপক্ষে একটি কাজের ধরন নির্বাচন করুন"),
  password: z.string().min(6, "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে"),
  confirmPassword: z.string().min(6, "পাসওয়ার্ড নিশ্চিত করুন"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "উভয় পাসওয়ার্ড একই হতে হবে",
  path: ["confirmPassword"],
});

export type ProviderRegisterInput = z.infer<typeof ProviderRegisterSchema>;
