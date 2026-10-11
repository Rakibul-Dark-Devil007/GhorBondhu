# GhorBondhu (ঘরবন্ধু) — Architecture & System Specification
> **Document Version:** 1.0.0  
> **Status:** APPROVED BASELINE  
> **Target Platform:** Web (Desktop, Tablet, Mobile) / PWA / Scalable Cloud Architecture

---

## 1. System Overview & Boundaries

**GhorBondhu** হলো একটি multi-tenant capable, two-sided household service marketplace। এর মূল লক্ষ্য হলো গৃহস্থালী বিভিন্ন অন-ডিমান্ড সার্ভিস (যেমন: ক্লিনিং, লন্ড্রি, কুকিং অ্যাসিস্ট্যান্স ইত্যাদি) গ্রহীতা (Customer) এবং স্বাধীন সার্ভিস কর্মীদের (Service Provider) একটি নিরাপদ, স্বচ্ছ এবং নীতিমালা-সুরক্ষিত প্ল্যাটফর্মে সংযুক্ত করা।

### Architectural Boundaries
* **Client Boundaries (Untrusted):**
  * Customer Web/PWA Application
  * Provider Console Web/PWA Application
  * Operational Staff & Admin Web Application
  * Super Admin Management Console
* **Edge / Hosting Layer:**
  * Next.js App Router (SSR for Public SEO Pages, Static/Hydrated Client for Authenticated Dashboards)
  * Firebase Hosting CDN with global SSL and caching rules.
* **Trust Boundary (Zero-Trust Enforcement):**
  * Firebase Authentication with JWT & Custom Claims.
  * Firebase Cloud Functions v2 (Secure Execution Context / Server-side Mutation Engine).
  * Cloud Firestore Security Rules (Declarative Authorization Gateway).
  * Cloud Storage Security Rules (KYC & Media Isolation Gateway).
* **External Integration Boundary:**
  * Pluggable Payment Gateways (SSLCommerz, bKash, Nagad, Cash/COD) via Abstract Adapters.
  * Notification Dispatchers (Firebase Cloud Messaging - FCM, Web Push, Future SMS).

---

## 2. High-Level Component Architecture

```
+-----------------------------------------------------------------------------------------------+
|                                      CLIENT APPLICATION                                       |
|                               (Next.js 14/15 + TypeScript + PWA)                              |
|                                                                                               |
|  [Public Pages (SSR/SSG)]   [Customer Portal]    [Provider Console]    [Admin/SuperAdmin ERP] |
|   - Dynamic Catalog          - Service Booking    - KYC Onboarding      - Provider Review     |
|   - Marketing & FAQ          - Realtime Status    - Job Feed & Transit  - Dynamic Catalog     |
|   - Localized Bengali/Eng    - Address Manager    - Earnings & Payout   - Pricing Rules & Aud |
+-----------------------------------------------+-----------------------------------------------+
                                                |
                                      HTTPS / Secure WebSocket
                                                |
+-----------------------------------------------v-----------------------------------------------+
|                                     SECURITY & INGRESS GATEWAY                                |
|                                                                                               |
|   - Firebase App Check (Device attestation / Bot prevention)                                  |
|   - Firebase Auth JWT Validation (Decoding uid, role, permissions, verificationStatus)        |
+-----------------------------------------------+-----------------------------------------------+
                                                |
                   +----------------------------+----------------------------+
                   |                                                         |
                   v                                                         v
+--------------------------------------+                  +-------------------------------------+
|        FIRESTORE DIRECT ACCESS       |                  |      CLOUD FUNCTIONS (MUTATIONS)    |
|       (Restricted by Rules Engine)   |                  |   - createBookingWithSnapshot       |
|                                      |                  |   - transitionBookingState          |
|   [Read-Only Optimized Collections]  |                  |   - verifyProviderKYC               |
|   - services / categories (Public)   |                  |   - calculateDynamicPrice           |
|   - own profile / addresses (Owner)  |                  |   - initiatePaymentSettlement       |
|   - active assigned jobs (Provider)  |                  |   - logAuditEvent                   |
+------------------+-------------------+                  +------------------+------------------+
                   |                                                         |
                   +----------------------------+----------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                       DATA PERSISTENCE LAYER                                  |
|                                                                                               |
|   - Cloud Firestore (NoSQL Document Store with ACID transactions within document batches)     |
|   - Cloud Storage (Encrypted at rest: KYC IDs, Service Media, Profile Avatars)                |
+-----------------------------------------------------------------------------------------------+
```

---

## 3. Core State Machines

### 3.1 Booking Lifecycle State Machine
বুকিংয়ের কোনো স্টেট ফ্রন্টএন্ড থেকে যথেচ্ছভাবে আপডেট করা যাবে না। প্রতিটি স্টেট ট্রানজিশনের জন্য রোল এবং পূর্ববর্তী স্টেট যাচাই করা বাধ্যতামূলক।

```
 [ DRAFT ]
     |  (Customer prepares details & duration)
     v
 [ PENDING ] -----------------------------------------------------> [ CANCELLED ]
     |  (Server calculates price snapshot, emits job to area pool)       ^
     v                                                                   | (Customer/Admin cancel
 [ PROVIDER_ASSIGNED ] --------------------------------------------------+  before transit)
     |  (Provider selected by matching algorithm or Admin dispatch)      |
     v                                                                   |
 [ PROVIDER_ACCEPTED ] --------------------------------------------------+
     |  (Provider acknowledges schedule and commits)
     v
 [ ON_THE_WAY ]
     |  (Provider starts transit towards customer address)
     v
 [ SERVICE_STARTED ]
     |  (Provider arrives, checks in with OTP or mutual confirmation)
     v
 [ SERVICE_COMPLETED ]
     |  (Provider marks work finished, summary generated)
     v
 [ CUSTOMER_CONFIRMED ] -----------------------------------------> [ COMPLETED / PAID ]
     |                                                                   |
     | (If dispute arises)                                               v
     v                                                             [ REVIEWED ]
 [ DISPUTED ] ---> [ REFUNDED / RESOLVED ]
```

#### State Transition Matrix:
| From State | Allowed To State | Authorized Role | Pre-conditions |
| :--- | :--- | :--- | :--- |
| `None` | `PENDING` | `CUSTOMER`, `ADMIN` | Valid Address, Valid Active Service, Valid Duration |
| `PENDING` | `PROVIDER_ASSIGNED` | `ADMIN`, `SYSTEM` | Provider is `VERIFIED` and available in location |
| `PROVIDER_ASSIGNED`| `PROVIDER_ACCEPTED` | `PROVIDER` (Assigned) | Assigned provider UID matches request auth |
| `PROVIDER_ASSIGNED`| `PENDING` | `PROVIDER`, `ADMIN` | Provider rejected job $\rightarrow$ job returned to pool |
| `PROVIDER_ACCEPTED`| `ON_THE_WAY` | `PROVIDER` (Assigned) | Booking date/time is within valid operational window |
| `ON_THE_WAY` | `SERVICE_STARTED` | `PROVIDER` (Assigned) | Provider within radius or customer OTP verified |
| `SERVICE_STARTED` | `SERVICE_COMPLETED`| `PROVIDER` (Assigned) | Minimum service duration elapsed |
| `SERVICE_COMPLETED`| `CUSTOMER_CONFIRMED`| `CUSTOMER`, `ADMIN` | Customer agrees work is done satisfactorily |
| `CUSTOMER_CONFIRMED`| `DISPUTED` | `CUSTOMER`, `ADMIN` | Complaint filed within dispute window (e.g. 24 hours)|
| Any Pre-Transit | `CANCELLED` | `CUSTOMER`, `ADMIN` | Cancellation policy rules applied (fees if applicable)|
| `DISPUTED` | `RESOLVED` / `REFUNDED`| `SUPER_ADMIN`, `ADMIN` | Admin resolution notes logged in audit trail |

---

### 3.2 Provider Verification (KYC) State Machine

```
   [ REGISTRATION_INITIATED ]
               |
               v
     [ PROFILE_SUBMITTED ]
               |
               v
      [ UNDER_REVIEW ]  <=============================+
        /            \                                 |
       v              v                                |
  [ VERIFIED ]    [ REJECTED ]                         |
       |               |                               |
       |               v                               |
       |      [ RE_SUBMITTED_WITH_FIXES ] -------------+
       v
  [ SUSPENDED ] (Admin action due to poor rating or misconduct)
```

1. **`REGISTRATION_INITIATED`:** প্রাথমিক একাউন্ট তৈরি (ইমেইল/ফোন ভেরিফাইড)।
2. **`PROFILE_SUBMITTED`:** নাম, ছবি, সার্ভিস স্কোপ এবং এলাকা নির্বাচন সম্পন্ন।
3. **`UNDER_REVIEW`:** NID (জাতীয় পরিচয়পত্র) ফ্রন্ট/ব্যাক এবং সেলফি আপলোড সম্পন্ন। এই অবস্থায় কোনো জব গ্রহণ করা সম্ভব নয়।
4. **`VERIFIED`:** অ্যাডমিন দ্বারা ডকুমেন্টস রিভিউ শেষে অ্যাপ্রুভড। এখন তিনি জব নোটিফিকেশন পাবেন এবং কাজ এক্সেপ্ট করতে পারবেন।
5. **`REJECTED`:** ডকুমেন্টস অস্পষ্ট বা তথ্য ভুল হলে অ্যাডমিন কারণ উল্লেখ করে রিজেক্ট করবেন। প্রোভাইডার পুনরায় জমা দিতে পারবেন।
6. **`SUSPENDED`:** নীতিভঙ্গের কারণে অ্যাকাউন্ট সাময়িকভাবে বন্ধ।

---

### 3.3 Payment Lifecycle State Machine

```
 [ INITIATED ]
       |
       v
   [ PENDING ] ------------------------> [ FAILED ]
       |                                     |
       | (Gateway Webhook / Auth)            v
       v                                 [ EXPIRED ]
   [ AUTHORIZED / PAID ]
       |
       +--------------------------------> [ REFUNDED ] (Partial or Full)
       |
       v
   [ SETTLED ] (Provider earning disbursed via Payout module)
```

---

## 4. Immutable Financial & Pricing Engine Contract

### 4.1 Calculation Formula
প্রতিটি বুকিং তৈরির সময় ক্লাউড ফাংশন সার্ভার-সাইডে নিম্নলিখিত গাণিতিক নিয়মে চার্জ নির্ধারণ করে:

$$\Delta D = \max(0, \text{Selected Duration} - \text{Base Duration})$$
$$\text{Additional Steps} = \left\lceil \frac{\Delta D}{\text{Increment Step (min)}} \right\rceil$$
$$\text{Duration Surcharge} = \text{Additional Steps} \times (\text{Base Price} \times \text{Step Percentage Multiplier})$$
$$\text{Service Subtotal} = \text{Base Price} + \text{Duration Surcharge} + \text{Material Surcharge}$$
$$\text{Gross Total} = (\text{Service Subtotal} \times \text{Peak Multiplier}) + \text{Emergency Surcharge} - \text{Discount}$$
$$\text{Platform Commission} = \text{Gross Total} \times \text{Platform Fee Percentage}$$
$$\text{Provider Net Earning} = \text{Gross Total} - \text{Platform Commission}$$

### 4.2 Immutable Snapshot Contract (Schema)
```typescript
interface PricingSnapshot {
  pricingRuleId: string;
  ruleVersion: string;
  basePrice: number;                 // e.g. 500 BDT
  baseDurationMinutes: number;       // e.g. 30 min
  selectedDurationMinutes: number;   // e.g. 90 min
  incrementStepMinutes: number;      // e.g. 30 min
  incrementPercentage: number;       // e.g. 0.30 (30%)
  calculatedDurationSurcharge: number; // e.g. 300 BDT
  materialOrCustomFee: number;       // e.g. 0 BDT
  peakMultiplierApplied: number;     // e.g. 1.0 (no surge) or 1.2 (+20%)
  emergencySurcharge: number;        // e.g. 100 BDT
  discountAmount: number;            // e.g. 50 BDT (via coupon)
  appliedCouponCode?: string;
  customerFinalAmount: number;       // Gross payable by customer
  platformCommissionPercent: number; // e.g. 20%
  platformCommissionAmount: number;  // Platform revenue
  providerEarningAmount: number;     // Net amount owed to provider
  currency: 'BDT';
  calculatedAt: string;              // ISO8601 Timestamp
}
```
> **Security Mandate:** বুকিং কনফার্ম হওয়ার পর এই অবজেক্টটি ফায়ারস্টোরে `ReadOnly` থাকবে। অ্যাডমিন বা সিস্টেম কখনোই এই স্ন্যাপশট ওভাররাইট করবে না।

---

## 5. Security & Isolation Architecture

1. **Client Isolation:**
   * ফ্রন্টএন্ড কোনো এনভায়রনমেন্ট ভ্যারিয়েবলে `FIREBASE_SERVICE_ACCOUNT_KEY` বা কোনো প্রাইভেট এপিআই কি বহন করবে না।
   * শুধুমাত্র পাবলিক Firebase Client Config (`apiKey`, `authDomain`, `projectId`, `storageBucket`) ক্লায়েন্টে থাকবে।
2. **Privilege Isolation (Custom Claims):**
   * ব্যবহারকারীর রোল ও পারমিশন ক্লাউড ফাংশনের মাধ্যমে ক্রিপ্টোগ্রাফিকালি সাইন করা JWT Custom Claims-এ সংরক্ষণ করা হবে।
   * উদাহরণ: `{ role: 'PROVIDER', verificationStatus: 'VERIFIED', isSuspended: false }`
3. **Data Minimization:**
   * জব এক্সেপ্ট করার আগে প্রোভাইডার শুধুমাত্র কাস্টমারের আনুমানিক এলাকা (যেমন: "ধানমন্ডি ৮/এ") দেখতে পাবেন।
   * জব এক্সেপ্ট এবং `ON_THE_WAY` স্টেটে যাওয়ার পর শুধুমাত্র নির্দিষ্ট প্রোভাইডার কাস্টমারের বিস্তারিত বাসা/রোড নম্বর এবং ফোন নম্বর দেখতে পাবেন।
4. **Audit Trail (Tamper-Resistant):**
   * প্ল্যাটফর্মের যেকোনো স্পর্শকাতর পরিবর্তন (প্রোভাইডার ভেরিফিকেশন, স্ট্যাটাস ওভাররাইড, রিফান্ড অনুমোদন) সার্ভার ক্লাউড ফাংশন দ্বারা `audit_logs` কালেকশনে অ্যাপেন্ড-অনলি (`create` allowed, `update/delete` blocked) হিসেবে সংরক্ষিত হবে।

---

## 6. Next Implementation Steps (Phase Gate)
* Phase 1 আর্কিটেকচার অ্যাপ্রুভ হওয়ার পর **Phase 2 (Project Setup, Monorepo/Structure, Tooling & Linter Config)** শুরু করা হবে।
