# GhorBondhu (ঘরবন্ধু) — Database Specification & Schema Architecture
> **Database Engine:** Google Cloud Firestore (Native Mode)  
> **Integrity Level:** ACID within Transaction Batches, Strict Field Schemas, Zero Client Trust  
> **Status:** Phase 1 Architecture Document

---

## 1. Database Overview & Design Principles

GhorBondhu-এর ডেটাবেজ আর্কিটেকচার **Cloud Firestore**-এর শক্তি এবং খরচের সামঞ্জস্য বজায় রেখে ডিজাইন করা হয়েছে:
1. **Denormalization for Read-Heavy Queries:** প্রতিটি বুকিং ডকুমেন্টে কাস্টমার নাম, সার্ভিস নাম এবং অ্যাড্রেসের স্ন্যাপশট রাখা হয়েছে যাতে প্রতিটি বুকিং দেখানোর জন্য ৩-৪টি আলাদা কালেকশনে রিড কুয়েরি না করতে হয়।
2. **Data Minimization & Privacy:** সংবেদনশীল KYC তথ্য (`provider_applications`) পাবলিক প্রোভাইডার প্রোফাইল (`providers`) থেকে সম্পূর্ণ আলাদা রাখা হয়েছে।
3. **Immutability of Financial Data:** `bookings` এবং `payments` ডকুমেন্টের আর্থিক অংশ ক্লাউড ফাংশন ছাড়া পরিবর্তনযোগ্য নয়।
4. **Append-Only Auditing:** `audit_logs` কালেকশনে কোনো ডকুমেন্ট আপডেট বা ডিলিট করার অনুমতি কারও নেই।

---

## 2. Comprehensive Collection Specifications

### 2.1 Collection: `users`
* **Purpose:** কোর ইউজার অথেন্টিকেশন ও একাউন্ট মেটাডাটা সংরক্ষণ।
* **Document ID:** `{userId}` (Firebase Auth `uid` এর সাথে হুবহু সমান)।
* **Fields & Types:**
  ```typescript
  {
    userId: string;                  // Firebase Auth UID
    email: string;                   // E.g. "customer@example.com"
    phoneNumber: string;             // E.g. "+8801700000000"
    role: "SUPER_ADMIN" | "ADMIN" | "CUSTOMER" | "PROVIDER";
    status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastLoginAt: Timestamp;
  }
  ```
* **Relationships:** 
  * 1:1 `customers/{userId}` অথবা `providers/{userId}`
* **Access Matrix:**
  * **Who can Read:** Owner (`auth.uid == userId`) অথবা `ADMIN` / `SUPER_ADMIN`।
  * **Who can Create:** ক্লাউড ফাংশন (Auth Trigger `onCreate`) অথবা Owner রেজিস্ট্রেশনের সময়।
  * **Who can Update:** Owner (শুধুমাত্র বেসিক প্রোফাইল তথ্য) অথবা `SUPER_ADMIN` (রোল/স্ট্যাটাস পরিবর্তনের জন্য)।
  * **Who can Delete:** নিষিদ্ধ (সফট ডিলিট: `status: "DEACTIVATED"` ব্যবহার করা হবে)।
* **Indexes Required:**
  * Single field index on `email`, `role`, `status`.
* **Security Considerations:** ইউজার ক্লায়েন্ট থেকে কখনোই নিজের `role` বা `status` আপডেট করতে পারবে না।

---

### 2.2 Collection: `roles_permissions`
* **Purpose:** অ্যাডমিন ও স্টাফদের জন্য গ্র্যানুলার পারমিশন কনফিগারেশন।
* **Document ID:** `{roleName}` (যেমন: `SUPER_ADMIN`, `ADMIN_OPERATIONS`, `ADMIN_FINANCE`, `STAFF_SUPPORT`)।
* **Fields & Types:**
  ```typescript
  {
    roleName: string;
    description: string;
    permissions: {
      canVerifyProviders: boolean;
      canManageCatalog: boolean;
      canConfigurePricing: boolean;
      canOverrideBookings: boolean;
      canHandleDisputes: boolean;
      canProcessPayouts: boolean;
      canManageAdmins: boolean;
      canViewAuditLogs: boolean;
    };
    updatedAt: Timestamp;
    updatedBy: string; // Admin UID
  }
  ```
* **Access Matrix:**
  * **Read:** Authenticated Admins।
  * **Create/Update/Delete:** শুধুমাত্র `SUPER_ADMIN`।

---

### 2.3 Collection: `customers`
* **Purpose:** কাস্টমারের সাধারণ প্রোফাইল ও বুকিং প্রেফারেন্স।
* **Document ID:** `{customerId}` (হুবহু ইউজার `uid`)।
* **Fields & Types:**
  ```typescript
  {
    customerId: string;
    fullName: string;
    avatarUrl?: string;
    preferredLanguage: "bn" | "en";
    defaultAddressId?: string;
    emergencyContactPhone?: string;
    totalBookingsCompleted: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  ```
* **Relationships:**
  * 1:N `addresses` (কাস্টমারের একাধিক সেভ করা ঠিকানা)
  * 1:N `bookings`
* **Access Matrix:**
  * **Read:** Owner (`auth.uid == customerId`) এবং স্টাফ/অ্যাডমিন।
  * **Create/Update:** Owner এবং অ্যাডমিন।
  * **Delete:** অ্যাডমিন অনলি।

---

### 2.4 Collection: `providers`
* **Purpose:** প্রোভাইডারের পাবলিক প্রোফাইল, কাজের স্কোপ, রেটিং ও অ্যাক্টিভ স্ট্যাটাস।
* **Document ID:** `{providerId}` (হুবহু ইউজার `uid`)।
* **Fields & Types:**
  ```typescript
  {
    providerId: string;
    fullName: string;
    avatarUrl: string;
    phoneNumber: string;
    verificationStatus: "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
    isOnline: boolean;
    gender: "MALE" | "FEMALE" | "OTHER";
    servicesOffered: string[];       // Array of serviceIds
    serviceAreas: string[];          // e.g. ["Dhanmondi", "Gulshan", "Mohammadpur"]
    ratingAvg: number;               // e.g. 4.85
    ratingCount: number;             // e.g. 34
    completedJobsCount: number;
    cancelledJobsCount: number;
    earningsSummary: {
      totalEarnedBDT: number;
      pendingPayoutBDT: number;
      lastPayoutAt?: Timestamp;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** পাবলিক (সীমাবদ্ধ ফিল্ডস: `fullName`, `avatarUrl`, `servicesOffered`, `serviceAreas`, `ratingAvg`)। সংবেদনশীল আর্থিক তথ্য শুধুমাত্র প্রোভাইডার নিজে এবং অ্যাডমিন দেখতে পারবে।
  * **Create:** প্রোভাইডার নিজে অনবোর্ডিংয়ের সময়।
  * **Update:** প্রোভাইডার (`isOnline`, `serviceAreas`, `avatarUrl`), এবং ক্লাউড ফাংশন (`verificationStatus`, `ratingAvg`, `earningsSummary`)।
  * **Delete:** নিষিদ্ধ।
* **Indexes Required:**
  * Composite: `verificationStatus` (ASC) + `serviceAreas` (ARRAY) + `isOnline` (ASC)
  * Composite: `verificationStatus` (ASC) + `ratingAvg` (DESC)

---

### 2.5 Collection: `provider_applications` (KYC Records)
* **Purpose:** জাতীয় পরিচয়পত্র, পুলিশ ক্লিয়ারেন্স ও ব্যাকগ্রাউন্ড চেকের সংবেদনশীল তথ্য সংরক্ষণ।
* **Document ID:** `{providerId}`
* **Fields & Types:**
  ```typescript
  {
    providerId: string;
    nidNumber: string;               // Encrypted or hashed in search, plain for admin
    nidFrontImageUrl: string;        // Firebase Storage Private URL
    nidBackImageUrl: string;         // Firebase Storage Private URL
    holdingNidSelfieUrl: string;     // Selfie holding NID
    presentAddress: string;
    permanentAddress: string;
    emergencyContactName: string;
    emergencyContactRelation: string;
    emergencyContactPhone: string;
    status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    rejectionReason?: string;
    submittedAt: Timestamp;
    reviewedAt?: Timestamp;
    reviewedBy?: string;             // Admin UID
  }
  ```
* **Access Matrix:**
  * **Read:** প্রোভাইডার নিজে এবং অ্যাডমিন (যাদের `canVerifyProviders: true` রয়েছে)।
  * **Create:** প্রোভাইডার নিজে অনবোর্ডিংয়ের সময়।
  * **Update:** প্রোভাইডার (যদি `status == REJECTED` হয় পুনরায় জমা দেওয়ার জন্য) এবং অ্যাডমিন (রিভিউ শেষে স্ট্যাটাস আপডেট)।
  * **Delete:** কঠোরভাবে নিষিদ্ধ।
* **Security Considerations:** কাস্টমাররা এই কালেকশনের কোনো তথ্য কখনো দেখতে পারবে না।

---

### 2.6 Collection: `service_categories`
* **Purpose:** সার্ভিসের প্রধান ক্যাটাগরি গ্রুপ।
* **Document ID:** `{categoryId}` (Slug যেমন: `cleaning`, `laundry`, `cooking`)।
* **Fields & Types:**
  ```typescript
  {
    categoryId: string;
    nameBn: string;                  // e.g. "বাসা ও অফিস পরিষ্কার"
    nameEn: string;                  // e.g. "House & Office Cleaning"
    descriptionBn: string;
    descriptionEn: string;
    iconUrl: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** পাবলিক (সবাই পড়তে পারবে)।
  * **Create/Update/Delete:** শুধুমাত্র `SUPER_ADMIN` ও অনুমোদিত `ADMIN`।

---

### 2.7 Collection: `services`
* **Purpose:** নির্দিষ্ট সার্ভিসের বিস্তারিত বিবরণ, প্রয়োজনীয় উপকরণ ও সম্পর্কিত প্রাইসিং রুল।
* **Document ID:** `{serviceId}` (Slug যেমন: `deep-kitchen-cleaning`)।
* **Fields & Types:**
  ```typescript
  {
    serviceId: string;
    categoryId: string;              // Ref to service_categories
    nameBn: string;                  // e.g. "কিচেন ডিপ ক্লিনিং"
    nameEn: string;                  // e.g. "Kitchen Deep Cleaning"
    descriptionBn: string;
    descriptionEn: string;
    pricingRuleId: string;           // Ref to pricing_rules
    materialsProvidedBy: "CUSTOMER" | "PROVIDER" | "OPTIONAL_ADDON";
    estimatedMinDurationMinutes: number;
    availableDurationsMinutes: number[]; // e.g. [30, 60, 90, 120, 180]
    imageUrl: string;
    isActive: boolean;
    displayOrder: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** পাবলিক।
  * **Create/Update/Delete:** শুধুমাত্র অ্যাডমিন।

---

### 2.8 Collection: `pricing_rules`
* **Purpose:** সার্ভিসের মূল্য নির্ধারণের গতিশীল রুলস কনফিগারেশন।
* **Document ID:** `{ruleId}` (যেমন: `price_rule_cleaning_v1`)।
* **Fields & Types:**
  ```typescript
  {
    ruleId: string;
    serviceId: string;
    versionTag: string;              // e.g. "2026-Q1"
    basePriceBDT: number;            // e.g. 500
    baseDurationMinutes: number;     // e.g. 30
    incrementDurationMinutes: number;// e.g. 30
    incrementPercentage: number;     // e.g. 0.30 (30% per additional 30m)
    platformCommissionPercent: number; // e.g. 20 (20%)
    emergencySurchargeBDT: number;   // e.g. 150
    peakHourMultiplier: number;      // e.g. 1.25 (25% extra)
    weekendMultiplier: number;       // e.g. 1.10 (10% extra)
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    updatedBy: string;               // Admin UID
  }
  ```
* **Access Matrix:**
  * **Read:** Authenticated Users (প্রাইস প্রিভিউ করার জন্য)।
  * **Create/Update:** শুধুমাত্র `SUPER_ADMIN` বা বিশেষ পারমিশনপ্রাপ্ত অ্যাডমিন।
* **Security Considerations:** ক্লায়েন্ট এই রুল দিয়ে ক্যালকুলেট করলেও বুকিং ক্রিয়েশনের সময় ক্লাউড ফাংশন সার্ভার ডাটাবেজ থেকে এই ডকুমেন্ট পড়ে চূড়ান্ত মূল্য নির্ধারণ করবে।

---

### 2.9 Collection: `addresses`
* **Purpose:** কাস্টমারের সংরক্ষিত সেবা গ্রহণের ঠিকানাসমূহ।
* **Document ID:** `{addressId}`
* **Fields & Types:**
  ```typescript
  {
    addressId: string;
    customerId: string;
    label: "HOME" | "OFFICE" | "OTHER";
    recipientName: string;
    contactPhone: string;
    addressLine: string;             // House, Road, Flat details
    area: string;                    // e.g. "Dhanmondi"
    city: string;                    // e.g. "Dhaka"
    postalCode?: string;
    geoPoint?: GeoPoint;             // Latitude & Longitude
    specialInstructions?: string;    // e.g. "Lift 4th floor, ring the bell"
    isDefault: boolean;
    createdAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** কাস্টমার নিজে, অ্যাডমিন, এবং সেই প্রোভাইডার যার কাছে কাস্টমারের একটি **এক্টিভ এক্সেপ্টেড জব** অ্যাসাইন করা আছে।
  * **Create/Update/Delete:** কাস্টমার নিজে।

---

### 2.10 Collection: `bookings`
* **Purpose:** প্ল্যাটফর্মের সবচেয়ে গুরুত্বপূর্ণ ট্রানজ্যাকশনাল রেকর্ড—বুকিং ও লাইফসাইকেল।
* **Document ID:** `{bookingId}` (যেমন: `GB-202610-A98B2`)
* **Fields & Types:**
  ```typescript
  {
    bookingId: string;
    bookingNumber: string;           // Human readable e.g. "GB-89214"
    customerId: string;
    customerSnapshot: {
      fullName: string;
      phoneNumber: string;
    };
    providerId?: string;             // Assigned or Accepted Provider
    providerSnapshot?: {
      fullName: string;
      phoneNumber: string;
      avatarUrl: string;
      ratingAvg: number;
    };
    serviceId: string;
    serviceNameSnapshot: {
      bn: string;
      en: string;
    };
    scheduledDate: string;           // YYYY-MM-DD
    scheduledStartTime: string;      // HH:mm (24h)
    scheduledEndTime: string;        // HH:mm (24h)
    selectedDurationMinutes: number;
    status: "DRAFT" | "PENDING" | "PROVIDER_ASSIGNED" | "PROVIDER_ACCEPTED" 
          | "ON_THE_WAY" | "SERVICE_STARTED" | "SERVICE_COMPLETED" 
          | "CUSTOMER_CONFIRMED" | "CANCELLED" | "DISPUTED" | "REFUNDED";
    statusHistory: Array<{
      status: string;
      changedBy: string;             // UID or "SYSTEM"
      timestamp: Timestamp;
      note?: string;
    }>;
    locationSnapshot: {
      addressLine: string;
      area: string;
      city: string;
      specialInstructions?: string;
      geoPoint?: GeoPoint;
    };
    pricingSnapshot: {
      basePrice: number;
      calculatedServiceAmount: number;
      emergencySurcharge: number;
      discountAmount: number;
      customerFinalAmount: number;
      platformCommissionPercent: number;
      platformCommissionAmount: number;
      providerEarningAmount: number;
      currency: "BDT";
      calculatedAt: string;
    };
    paymentStatus: "UNPAID" | "AUTHORIZED" | "PAID" | "REFUNDED";
    paymentMethod: "CASH_ON_DELIVERY" | "BKASH" | "NAGAD" | "CARD";
    serviceOtpHash?: string;         // Optional check-in verification
    customerNotes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** 
    * কাস্টমার (`customerId == auth.uid`)
    * অ্যাসাইন্ড প্রোভাইডার (`providerId == auth.uid`)
    * অ্যাডমিন ও সুপার অ্যাডমিন।
  * **Create:** ক্লাউড ফাংশন (`createBooking`) এর মাধ্যমে।
  * **Update:** ক্লাউড ফাংশন (`transitionBookingState`) এর মাধ্যমে। সরাসরি ক্লায়েন্ট রাইট সম্পূর্ণ নিষিদ্ধ।
  * **Delete:** নিষিদ্ধ (ডিলিট করা যাবে না, শুধু `CANCELLED` স্ট্যাটাস হবে)।
* **Indexes Required:**
  * Composite: `customerId` (ASC) + `scheduledDate` (DESC) + `status` (ASC)
  * Composite: `providerId` (ASC) + `status` (ASC) + `scheduledDate` (ASC)
  * Composite: `status` (ASC) + `scheduledDate` (ASC) (অ্যাডমিন ড্যাশবোর্ডের জন্য)

---

### 2.11 Collection: `payments`
* **Purpose:** প্রতিটি পেমেন্ট ট্রানজ্যাকশন এবং গেটওয়ে রেসপন্স ট্র্যাক করা।
* **Document ID:** `{paymentId}`
* **Fields & Types:**
  ```typescript
  {
    paymentId: string;
    bookingId: string;
    customerId: string;
    amountBDT: number;
    paymentMethod: "BKASH" | "NAGAD" | "SSLCOMMERZ" | "CASH_ON_DELIVERY";
    status: "INITIATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
    gatewayTransactionId?: string;
    gatewayPayloadSnapshot?: Record<string, any>;
    paidAt?: Timestamp;
    refundedAt?: Timestamp;
    refundAmountBDT?: number;
    createdAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** কাস্টমার নিজে এবং অ্যাডমিন।
  * **Create/Update:** শুধুমাত্র ক্লাউড ফাংশন এবং সিকিউর গেটওয়ে ওয়েবহুক।

---

### 2.12 Collection: `payouts`
* **Purpose:** প্রোভাইডারদের উপার্জিত টাকা বিতরণ (Disbursement) ও নিষ্পত্তি।
* **Document ID:** `{payoutId}`
* **Fields & Types:**
  ```typescript
  {
    payoutId: string;
    providerId: string;
    amountBDT: number;
    payoutMethod: "BKASH" | "NAGAD" | "BANK_TRANSFER";
    accountDetails: {
      accountNumber: string;
      bankName?: string;
      branchName?: string;
    };
    status: "REQUESTED" | "APPROVED" | "PROCESSED" | "REJECTED";
    bookingIdsIncluded: string[];
    requestedAt: Timestamp;
    processedAt?: Timestamp;
    processedBy?: string;            // Admin UID
    transactionReference?: string;
  }
  ```
* **Access Matrix:**
  * **Read:** প্রোভাইডার নিজে এবং ফিন্যান্স অ্যাডমিন।
  * **Create:** প্রোভাইডার (রিকোয়েস্ট) অথবা সিস্টেম।
  * **Update:** ফিন্যান্স অ্যাডমিন বা সুপার অ্যাডমিন।

---

### 2.13 Collection: `reviews`
* **Purpose:** সার্ভিস শেষে কাস্টমার ও প্রোভাইডারের রিভিউ ও রেটিং।
* **Document ID:** `{reviewId}`
* **Fields & Types:**
  ```typescript
  {
    reviewId: string;
    bookingId: string;
    serviceId: string;
    customerId: string;
    customerName: string;
    providerId: string;
    rating: number;                  // 1 to 5
    reviewText: string;
    reviewType: "CUSTOMER_TO_PROVIDER" | "PROVIDER_TO_CUSTOMER";
    isPublic: boolean;
    createdAt: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** পাবলিক (যদি `isPublic == true` হয়)।
  * **Create:** শুধুমাত্র সম্পন্ন বুকিংয়ের ক্লায়েন্ট/প্রোভাইডার। একই বুকিংয়ের বিপরীতে দ্বিতীয়বার তৈরি ব্লক থাকবে।
  * **Update/Delete:** শুধুমাত্র অ্যাডমিন মডারেশন।

---

### 2.14 Collection: `audit_logs`
* **Purpose:** অপরিবর্তনীয় নিরাপত্তা এবং প্রশাসনিক অডিট ট্রেইল।
* **Document ID:** `{logId}`
* **Fields & Types:**
  ```typescript
  {
    logId: string;
    actorId: string;                 // User ID or "SYSTEM"
    actorRole: string;               // e.g. "SUPER_ADMIN", "ADMIN"
    actorIp?: string;
    action: string;                  // e.g. "PROVIDER_VERIFIED", "PRICING_UPDATED", "BOOKING_OVERRIDE"
    resourceType: "PROVIDER" | "BOOKING" | "PRICING" | "USER" | "PAYMENT";
    resourceId: string;
    metadata: Record<string, any>;   // Changed values (old vs new)
    timestamp: Timestamp;
  }
  ```
* **Access Matrix:**
  * **Read:** শুধুমাত্র `SUPER_ADMIN`।
  * **Create:** শুধুমাত্র ক্লাউড ফাংশন (Append-Only)।
  * **Update:** কঠোরভাবে নিষিদ্ধ (Rules Engine দ্বারা ব্লকড)।
  * **Delete:** কঠোরভাবে নিষিদ্ধ (Rules Engine দ্বারা ব্লকড)।

---

## 3. Query & Cost Optimization Strategy

1. **Avoid `count()` in Production Client:** কালেকশনের মোট সংখ্যা সরাসরি ক্লায়েন্টে গণনা না করে ড্যাশবোর্ডের জন্য `system_stats` সিঙ্গেলটনে অ্যাগ্রিগেশন রাখা হবে।
2. **Strict Pagination:** প্রতিটি লিস্ট কুয়েরিতে `limit(20)` এবং কার্সর ভিত্তিক পেজিনেশন (`startAfter`) প্রযোজ্য।
3. **No Unbounded Listeners:** পাবলিক সার্ভিসের জন্য রিয়েল-টাইম স্ন্যাপশট লিসেনারের পরিবর্তে Next.js ক্যাশড গেট কুয়েরি ব্যবহার করা হবে। শুধুমাত্র বুকিং ট্র্যাকিং পেজে রিয়েল-টাইম লিসেনার চালু থাকবে।
