# GhorBondhu (ঘরবন্ধু) — Cloud Functions API & RPC Specification
> **API Paradigm:** Firebase Cloud Functions v2 (HTTPS Callable & Admin SDK Triggers)  
> **Type Safety:** Shared Zod Schemas across Client & Server  
> **Status:** Phase 1 Architecture Document

---

## 1. API Architecture Overview

GhorBondhu-এর সংবেদনশীল বিজনেস লজিক ক্লায়েন্টে এক্সিকিউট হয় না। ক্লায়েন্ট Firebase Client SDK-এর মাধ্যমে HTTPS Callable Functions কল করে। এর সুবিধা:
1. **স্বয়ংক্রিয় অথেনটিকেশন ইনজেকশন:** Firebase SDK স্বয়ংক্রিয়ভাবে `context.auth` (UID, Token, Custom Claims) ইনজেক্ট করে।
2. **কঠোর পেলোড ভ্যালিডেশন:** প্রতিটি ফাংশন শুরুতেই Zod স্কিমা দিয়ে ইনপুট ডাটা পরীক্ষা করে।
3. **ইউনিফাইড এরর হ্যান্ডলিং:** ক্লায়েন্টের কাছে নিরাপদ এবং ব্যবহারকারী-বান্ধব এরর মেসেজ পৌঁছায়, কোনো ইন্টারনাল ডেটাবেজ স্ট্যাক ট্রেস উন্মুক্ত হয় না।

---

## 2. Cloud Functions Signatures & Contracts

### 2.1 Pricing Calculation (Preview)
* **Function Name:** `calculatePricingPreview`
* **Type:** HTTPS Callable (`onCall`)
* **Access Level:** Authenticated Users (`CUSTOMER`, `ADMIN`, `PROVIDER`)
* **Request Schema (Zod):**
  ```typescript
  export const CalculatePricingRequestSchema = z.object({
    serviceId: z.string().min(1),
    durationMinutes: z.number().int().min(15).max(720),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/),   // HH:mm
    couponCode: z.string().optional()
  });
  ```
* **Response Contract:**
  ```typescript
  export interface CalculatePricingResponse {
    serviceId: string;
    basePriceBDT: number;
    durationSurchargeBDT: number;
    subtotalBDT: number;
    peakMultiplierApplied: number;
    emergencySurchargeBDT: number;
    discountAmountBDT: number;
    finalCustomerAmountBDT: number;
    estimatedPlatformFeeBDT: number;
    estimatedProviderEarningBDT: number;
    currency: 'BDT';
  }
  ```

---

### 2.2 Create Booking With Immutable Snapshot
* **Function Name:** `createBooking`
* **Type:** HTTPS Callable (`onCall`)
* **Access Level:** Authenticated `CUSTOMER`
* **Request Schema (Zod):**
  ```typescript
  export const CreateBookingRequestSchema = z.object({
    serviceId: z.string().min(1),
    durationMinutes: z.number().int().min(15).max(720),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/),
    addressId: z.string().min(1),
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'BKASH', 'NAGAD', 'CARD']),
    customerNotes: z.string().max(500).optional(),
    couponCode: z.string().optional()
  });
  ```
* **Server-side Logic Execution:**
  1. `context.auth` ভ্যালিডেশন (ইউজার কি কাস্টমার ও একটিভ?)।
  2. সার্ভিস ও অ্যাড্রেস ডাটাবেজ থেকে রিড করা।
  3. সক্রিয় `pricing_rules` রিড করে `PricingSnapshot` ক্যালকুলেট করা।
  4. ফায়ারস্টোর ট্রানজ্যাকশনে `bookings` ডকুমেন্ট তৈরি করা।
  5. সংশ্লিষ্ট সার্ভিস এরিয়ার ভেরিফাইড প্রোভাইডারদের জন্য ইভেন্ট/নোটিফিকেশন পাঠানো।
* **Response Contract:**
  ```typescript
  export interface CreateBookingResponse {
    success: boolean;
    bookingId: string;
    bookingNumber: string;
    finalAmountBDT: number;
    status: 'PENDING';
    createdAt: string;
  }
  ```

---

### 2.3 Transition Booking State
* **Function Name:** `transitionBookingState`
* **Type:** HTTPS Callable (`onCall`)
* **Access Level:** Role-restricted (`CUSTOMER`, `PROVIDER`, `ADMIN`)
* **Request Schema (Zod):**
  ```typescript
  export const TransitionBookingStateRequestSchema = z.object({
    bookingId: z.string().min(1),
    targetStatus: z.enum([
      'PROVIDER_ACCEPTED',
      'ON_THE_WAY',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'CUSTOMER_CONFIRMED',
      'CANCELLED',
      'DISPUTED'
    ]),
    reason: z.string().max(300).optional(),
    serviceOtp: z.string().length(4).optional()
  });
  ```
* **Server-side Logic Execution:**
  1. বর্তমান বুকিং রেকর্ড রিড করা।
  2. `ARCHITECTURE.md`-এর স্টেট ট্রানজিশন ম্যাট্রিক্স অনুযায়ী বর্তমান স্টেট থেকে টার্গেট স্টেটে যাওয়ার অনুমতি পরীক্ষা করা।
  3. ইউজার রোলের যথার্থতা যাচাই (যেমন: শুধুমাত্র অ্যাসাইন্ড প্রোভাইডার `ON_THE_WAY` সেট করতে পারবে)।
  4. অডিট লগ এবং স্ট্যাটাস হিস্ট্রি অ্যারে আপডেট করা।

---

### 2.4 Review Provider Verification Application (Admin)
* **Function Name:** `reviewProviderApplication`
* **Type:** HTTPS Callable (`onCall`)
* **Access Level:** `SUPER_ADMIN` বা `ADMIN` (যার `permissions.canVerifyProviders: true`)
* **Request Schema (Zod):**
  ```typescript
  export const ReviewProviderApplicationRequestSchema = z.object({
    providerId: z.string().min(1),
    decision: z.enum(['VERIFIED', 'REJECTED']),
    rejectionReason: z.string().min(5).max(500).optional(),
    adminNotes: z.string().max(500).optional()
  });
  ```
* **Server-side Logic Execution:**
  1. `request.auth.token.permissions.canVerifyProviders` সত্য কিনা পরীক্ষা।
  2. `provider_applications/{providerId}` এবং `providers/{providerId}` আপডেট।
  3. Firebase Auth Admin SDK ব্যবহার করে ইউজারের Custom Claims-এ `providerStatus: decision` আপডেট করা।
  4. `audit_logs` কালেকশনে ঘটনাটি স্থায়ীভাবে সংরক্ষণ করা।

---

## 3. Standard Error Codes & Handling

| Error Code | HTTP Equivalent | Description | User Message Example |
| :--- | :---: | :--- | :--- |
| `unauthenticated` | 401 | ইউজার লগইন করা নেই | "অনুগ্রহ করে লগইন করে পুনরায় চেষ্টা করুন।" |
| `permission-denied` | 403 | অপারেশন করার অনুমতি নেই | "এই কাজটি করার অনুমতি আপনার অ্যাকাউন্টে নেই।" |
| `invalid-argument` | 400 | Zod ভ্যালিডেশন ফেইল করেছে | "প্রদত্ত তথ্যে ভুল রয়েছে। যাচাই করে পুনরায় জমা দিন।" |
| `not-found` | 404 | সার্ভিস, অ্যাড্রেস বা বুকিং পাওয়া যায়নি | "কাঙ্ক্ষিত তথ্যটি খুঁজে পাওয়া যায়নি।" |
| `failed-precondition` | 412 | স্টেট ট্রানজিশন নিয়ম ভঙ্গ হয়েছে | "বুকিংটির বর্তমান অবস্থা অনুযায়ী এই পরিবর্তনটি সম্ভব নয়।" |
| `internal` | 500 | সার্ভারে অপ্রত্যাশিত ত্রুটি | "একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" |
