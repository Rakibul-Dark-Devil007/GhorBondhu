import { z } from "zod";

const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;
const NID_REGEX = /^\d{10,17}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ProviderKycSubmissionSchema = z.object({
  fullName: z.string().min(3, "পূর্ণ নাম কমপক্ষে ৩ অক্ষরের হতে হবে").max(80),
  phoneNumber: z.string().regex(BD_PHONE_REGEX, "সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর লিখুন"),
  nidNumber: z.string().regex(NID_REGEX, "সঠিক ১০, ১৩ অথবা ১৭ ডিজিটের এনআইডি নম্বর লিখুন"),
  dateOfBirth: z.string().regex(DATE_REGEX, "সঠিক জন্মতারিখ দিন (YYYY-MM-DD)"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("FEMALE"),
  presentAddress: z.string().min(5, "বর্তমান ঠিকানা আবশ্যক (বাড়ি, রোড, এলাকা)"),
  permanentAddress: z.string().min(5, "স্থায়ী ঠিকানা আবশ্যক (গ্রাম/ওয়ার্ড, থানা, জেলা)"),
  emergencyContactName: z.string().min(2, "জরুরি যোগাযোগের ব্যক্তির নাম লিখুন"),
  emergencyContactPhone: z.string().regex(BD_PHONE_REGEX, "জরুরি যোগাযোগের সঠিক ফোন নম্বর দিন"),
  emergencyContactRelation: z.string().min(2, "জরুরি যোগাযোগের ব্যক্তির সাথে সম্পর্ক লিখুন"),
  yearsOfExperience: z.number().int().min(0).max(50),
  experienceDescription: z.string().max(500).optional(),
  nidFrontUrl: z.string().min(5, "এনআইডি সামনের অংশের ছবি আবশ্যক"),
  nidBackUrl: z.string().min(5, "এনআইডি পেছনের অংশের ছবি আবশ্যক"),
  profilePhotoUrl: z.string().optional(),
  selectedServices: z.array(z.string()).min(1, "কমপক্ষে একটি সার্ভিস নির্বাচন করুন"),
  selectedAreas: z.array(z.string()).min(1, "কমপক্ষে একটি কর্ম এলাকা নির্বাচন করুন"),
});

export type ProviderKycSubmissionInput = z.infer<typeof ProviderKycSubmissionSchema>;

export const ReviewProviderApplicationSchema = z.object({
  providerId: z.string().min(1, "প্রোভাইডার আইডি আবশ্যক"),
  decision: z.enum(["VERIFIED", "REJECTED", "UNDER_REVIEW"]),
  reviewNotes: z.string().min(3, "পর্যালোচনা নোট বা কারণ আবশ্যক (কমপক্ষে ৩ অক্ষর)").max(500),
});

export type ReviewProviderApplicationInput = z.infer<typeof ReviewProviderApplicationSchema>;
