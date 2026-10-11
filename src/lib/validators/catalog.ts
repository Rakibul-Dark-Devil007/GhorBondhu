import { z } from "zod";

export const CategorySchema = z.object({
  categoryId: z
    .string()
    .min(2, "ক্যাটাগরি আইডি ন্যূনতম ২ অক্ষরের হতে হবে")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "আইডি শুধুমাত্র ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন হতে পারবে (যেমন: cleaning)"),
  nameBn: z.string().min(2, "বাংলা নাম আবশ্যক").max(100),
  nameEn: z.string().min(2, "ইংরেজি নাম আবশ্যক").max(100),
  descriptionBn: z.string().min(5, "বাংলা বিবরণ আবশ্যক").max(500),
  descriptionEn: z.string().min(5, "ইংরেজি বিবরণ আবশ্যক").max(500),
  iconUrl: z.string().optional(),
  displayOrder: z.number().int().min(1, "ক্রম নম্বর ১ বা তার বেশি হতে হবে"),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof CategorySchema>;

export const ServiceSchema = z.object({
  serviceId: z
    .string()
    .min(2, "সার্ভিস আইডি ন্যূনতম ২ অক্ষরের হতে হবে")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "আইডি শুধুমাত্র ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন হতে পারবে (যেমন: house-deep-cleaning)"),
  categoryId: z.string().min(1, "অনুগ্রহ করে ক্যাটাগরি নির্বাচন করুন"),
  nameBn: z.string().min(2, "বাংলা নাম আবশ্যক").max(100),
  nameEn: z.string().min(2, "ইংরেজি নাম আবশ্যক").max(100),
  descriptionBn: z.string().min(5, "বাংলা বিবরণ আবশ্যক").max(1000),
  descriptionEn: z.string().min(5, "ইংরেজি বিবরণ আবশ্যক").max(1000),
  pricingRuleId: z.string().min(1, "প্রাইসিং রুল আইডি আবশ্যক"),
  materialsProvidedBy: z.enum(["CUSTOMER", "PROVIDER", "OPTIONAL_ADDON"], {
    errorMap: () => ({ message: "উপকরণ সরবরাহকারী নির্বাচন করুন" }),
  }),
  estimatedMinDurationMinutes: z.number().int().min(15).max(720),
  availableDurationsMinutes: z
    .array(z.number().int().min(15).max(720))
    .min(1, "কমপক্ষে একটি সময়সীমা নির্বাচন করুন"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(1).default(1),
});

export type ServiceInput = z.infer<typeof ServiceSchema>;
