# GhorBondhu (ঘরবন্ধু) — Security & Threat Modeling Specification
> **Security Baseline:** Zero-Trust Client, Defense-in-Depth, Least Privilege  
> **Status:** Phase 1 Architecture Document

---

## 1. Security Architecture Principles

GhorBondhu একটি সংবেদনশীল মার্কেটপ্লেস—এখানে কাস্টমারের বাসাবাড়ির ঠিকানা এবং প্রোভাইডারের জাতীয় পরিচয়পত্রের মতো স্পর্শকাতর ডাটা থাকে। তাই আমাদের নিরাপত্তা দর্শন:
1. **Never Trust Client Input:** ব্রাউজার বা মোবাইল অ্যাপ থেকে আসা কোনো প্রাইস, ডিসকাউন্ট, রোল বা বুকিং স্ট্যাটাস সার্ভার বিশ্বাস করবে না।
2. **Cryptographic Identity & Custom Claims:** ব্যবহারকারীর রোল বা পারমিশন ফায়ারস্টোর ডকুমেন্টে সেভ করা হলেও, অথরাইজেশনের জন্য সরাসরি **Firebase Auth Custom Claims JWT Token** ব্যবহার করা হবে।
3. **Immutability of Financials:** বুকিং সম্পন্ন বা শুরু হওয়ার পর আর্থিক তথ্য অপরিবর্তনীয় থাকবে।
4. **Append-Only Auditing:** প্রতিটি অ্যাডমিন বা সংবেদনশীল পরিবর্তন অডিট লগে লিপিবদ্ধ হবে যা কেউ মুছতে বা বদলাতে পারবে না।

---

## 2. Threat Modeling Matrix (STRIDE & Marketplace Risks)

| Threat | Risk Level | Impact | Mitigation Strategy | Implementation Location | Verification & Test Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Price Manipulation** | **Critical** | ব্যবহারকারী ক্লায়েন্ট স্ক্রিপ্ট দিয়ে দাম কমিয়ে বুকিং তৈরি করতে পারে | ক্লায়েন্ট থেকে আসা প্রাইস উপেক্ষা করা; Cloud Function দ্বারা সার্ভার-সাইডে দাম হিসাব ও স্ন্যাপশট যুক্ত করা | `functions/src/modules/pricing/` | Unit test with tampered price payload; assert server overwrites price |
| **Privilege Escalation** | **Critical** | কাস্টমার নিজেকে ADMIN বা SUPER_ADMIN বানানোর চেষ্টা করা | Firestore rules ব্লক করবে `request.resource.data.role`; শুধুমাত্র Firebase Admin SDK Custom Claims সেট করতে পারবে | `firestore.rules` & `functions/src/modules/auth/` | Attempt to write `{role: "ADMIN"}` from client; assert `PERMISSION_DENIED` |
| **Fake Provider Verification** | **Critical** | অদক্ষ বা অপরাধী ব্যক্তি ভেরিফাইড প্রোভাইডার হিসেবে সিস্টেমে ঢোকা | প্রোভাইডার স্ট্যাটাস `VERIFIED` করার অধিকার শুধুমাত্র ভ্যালিড পারমিশনপ্রাপ্ত অ্যাডমিনের থাকবে। অডিট লগ তৈরি হবে | `functions/src/modules/providers/` & `firestore.rules` | Non-admin trying to update `verificationStatus`; assert rejected |
| **IDOR on Bookings** | **High** | একজন কাস্টমার অন্য কাস্টমারের বুকিং আইডি জেনে তথ্য দেখা বা বাতিল করা | Firestore Rules কঠোরভাবে চেক করবে `resource.data.customerId == request.auth.uid` | `firestore.rules` | Attempt to read booking of User B using User A's token; assert denied |
| **KYC Document Leakage** | **High** | প্রোভাইডারের NID কার্ড বা ছবি ইন্টারনেটে উন্মুক্ত হওয়া | Storage Rules-এ পাবলিক রিড নিষিদ্ধ; শুধুমাত্র আবেদনকারী ও ভেরিফিকেশন অ্যাডমিন দেখতে পারবে | `storage.rules` | Attempt unauthenticated GET on KYC bucket path; assert 403 Forbidden |
| **Payment Fraud** | **Critical** | কাস্টমার `paymentSuccess = true` পাঠিয়ে পেমেন্ট ফাঁকি দেওয়া | গেটওয়ে ওয়েবহুক বা সার্ভার-টু-সার্ভার রিকনসিলিয়েশন ছাড়া পেমেন্ট স্ট্যাটাস `PAID` হবে না | `functions/src/modules/payments/` | Send fake client mutation for payment; assert rejected by security rules |
| **Malicious File Upload** | **Medium** | KYC আপলোডে শেল বা এক্সিকিউটেবল স্ক্রিপ্ট আপলোড করা | Storage Rules-এ ফাইল সাইজ সীমা (সর্বোচ্চ 5MB) এবং MIME type ভ্যালিডেশন (`image/jpeg`, `image/png`, `application/pdf`) | `storage.rules` | Upload `.exe` or `.sh` file; assert upload fails |
| **Rate Abuse / DoS** | **Medium** | বট দিয়ে হাজার হাজার ফেক বুকিং তৈরি করে ডাটাবেজ কস্ট বাড়ানো | Firebase App Check + Cloud Functions Rate Limiter (Zod validation + reCAPTCHA v3/Enterprise) | Next.js API & Cloud Functions | Stress test script attempting 50 req/sec; assert rate limit 429 response |

---

## 3. Custom Claims Design

Firebase Auth টোকেনে নিম্নলিখিত ক্লেইমস ক্রিপ্টোগ্রাফিকালি সাইন করা থাকবে:

```typescript
export interface GhorBondhuCustomClaims {
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER' | 'PROVIDER';
  permissions?: {
    canVerifyProviders?: boolean;
    canManageCatalog?: boolean;
    canConfigurePricing?: boolean;
    canOverrideBookings?: boolean;
    canHandleDisputes?: boolean;
    canProcessPayouts?: boolean;
    canManageAdmins?: boolean;
    canViewAuditLogs?: boolean;
  };
  providerStatus?: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isSuspended?: boolean;
}
```

### Claims Lifecycle:
1. ইউজার রেজিস্ট্রেশনের সময় ডিফল্ট ক্লেইম `{ role: 'CUSTOMER' }` অথবা `{ role: 'PROVIDER', providerStatus: 'PENDING' }` সেট হবে।
2. যখন কোনো অ্যাডমিন প্রোভাইডারকে ভেরিফাই করবে, ক্লাউড ফাংশন `auth.setCustomUserClaims(uid, { ...claims, providerStatus: 'VERIFIED' })` এক্সিকিউট করবে।
3. প্রোভাইডারের ক্লায়েন্ট টোকেন রিফ্রেশ করার পর তৎক্ষণাৎ নতুন পারমিশন কার্যকর হবে।

---

## 4. Declarative Firestore Security Rules Blueprint

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isSuperAdmin() {
      return isAuthenticated() && request.auth.token.role == 'SUPER_ADMIN';
    }
    function isAdmin() {
      return isAuthenticated() && (request.auth.token.role == 'ADMIN' || request.auth.token.role == 'SUPER_ADMIN');
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isVerifiedProvider() {
      return isAuthenticated() && request.auth.token.role == 'PROVIDER' && request.auth.token.providerStatus == 'VERIFIED';
    }

    // USERS COLLECTION
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() && isOwner(userId) && request.resource.data.role in ['CUSTOMER', 'PROVIDER'];
      allow update: if (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status'])) || isSuperAdmin();
      allow delete: if false; // Soft deletes only
    }

    // SERVICES & CATEGORIES (PUBLIC READ)
    match /service_categories/{catId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /services/{serviceId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // PRICING RULES
    match /pricing_rules/{ruleId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    // PROVIDER APPLICATION / KYC
    match /provider_applications/{providerId} {
      allow read: if isOwner(providerId) || (isAdmin() && request.auth.token.permissions.canVerifyProviders == true);
      allow create: if isOwner(providerId) && request.auth.token.role == 'PROVIDER';
      allow update: if (isOwner(providerId) && resource.data.status == 'REJECTED') || isAdmin();
      allow delete: if false;
    }

    // ADDRESSES
    match /addresses/{addressId} {
      allow read, write: if isAuthenticated() && resource.data.customerId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.customerId == request.auth.uid;
    }

    // BOOKINGS (ZERO CLIENT MUTATION - CONTROLLED VIA CLOUD FUNCTIONS)
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && (
        resource.data.customerId == request.auth.uid ||
        resource.data.providerId == request.auth.uid ||
        isAdmin()
      );
      // All writes must go through validated Cloud Functions
      allow write: if false; 
    }

    // AUDIT LOGS (IMMUTABLE)
    match /audit_logs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if false; // Cloud Functions with Admin SDK only
    }
  }
}
```

---

## 5. Cloud Storage Security Rules Blueprint

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // KYC Identification Documents (Strict Isolation)
    match /kyc_documents/{providerId}/{fileName} {
      allow read: if request.auth != null && (
        request.auth.uid == providerId || 
        request.auth.token.role in ['ADMIN', 'SUPER_ADMIN']
      );
      allow write: if request.auth != null && request.auth.uid == providerId
                   && request.resource.size < 5 * 1024 * 1024 // 5MB limit
                   && request.resource.contentType.matches('image/(jpeg|png|webp)|application/pdf');
    }

    // Public Avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024 // 2MB limit
                   && request.resource.contentType.matches('image/(jpeg|png|webp)');
    }

    // Service Assets
    match /services/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ['ADMIN', 'SUPER_ADMIN'];
    }
  }
}
```
