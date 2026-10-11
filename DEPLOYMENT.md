# GhorBondhu (ঘরবন্ধু) - Production Deployment & Infrastructure Runbook

> **Document Version:** 1.0.0 (Production Release)  
> **Last Audited:** October 2026  
> **Platform:** GhorBondhu (ঘরবন্ধু) — *Trusted Help, Right at Home.*  
> **Target Region:** `asia-southeast1` (Singapore) for optimal low-latency connectivity to Bangladesh.

---

## 1. Prerequisites & Tooling
Before provisioning or deploying to Google Cloud / Firebase:
- Node.js >= 20.x
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud`) installed
- Firebase CLI authenticated (`firebase login`)
- Repository cloned with dependencies installed (`npm install && npm --prefix functions install`)

---

## 2. Firebase Project Provisioning (Step-by-Step)

### Step 2.1: Create Project & Link Billing
1. Create a Firebase Project on [Firebase Console](https://console.firebase.google.com/):
   - Production: `ghorbondhu-prod`
   - Staging: `ghorbondhu-staging`
2. Upgrade project to the **Blaze (Pay-as-you-go)** plan (required for Cloud Functions v2 and external outbound network requests to SMS/Payment gateways).

### Step 2.2: Enable Authentication Providers
In **Firebase Console $\rightarrow$ Build $\rightarrow$ Authentication $\rightarrow$ Sign-in method**:
1. **Email/Password:** Enable.
2. **Phone:** Enable (configure test numbers for staging/automated testing).
3. **Google:** Enable (configure authorized redirect domains: `ghorbondhu.com`, `ghorbondhu-prod.firebaseapp.com`).

### Step 2.3: Provision Cloud Firestore
In **Firebase Console $\rightarrow$ Build $\rightarrow$ Firestore Database**:
1. Click **Create Database**.
2. **Location:** Select `asia-southeast1` (Singapore) — nearest low-latency region to Bangladesh.
3. **Security Rules:** Start in Production mode (rules will be deployed via CLI).

### Step 2.4: Provision Cloud Storage
In **Firebase Console $\rightarrow$ Build $\rightarrow$ Storage**:
1. Click **Get Started**.
2. Select default bucket location `asia-southeast1`.

---

## 3. Security Rules & Index Deployment

Deploy the zero-trust security rules and composite indexes:

```powershell
# Select production project
firebase use production

# Deploy Cloud Firestore Security Rules
firebase deploy --only firestore:rules

# Deploy Cloud Firestore Composite Indexes
firebase deploy --only firestore:indexes

# Deploy Cloud Storage Security Rules
firebase deploy --only storage:rules
```

---

## 4. Cloud Functions v2 Deployment

GhorBondhu Cloud Functions execute on Node.js 20 in the `asia-southeast1` region:

```powershell
# Build Cloud Functions TypeScript bundle
npm --prefix functions run build

# Deploy all Cloud Functions
firebase deploy --only functions
```

### Setting Environment Secrets in Cloud Functions:
```powershell
# Set payment gateway & SMS secrets safely via Google Secret Manager
firebase functions:secrets:set BKASH_APP_KEY
firebase functions:secrets:set BKASH_APP_SECRET
firebase functions:secrets:set SSLCOMMERZ_STORE_ID
firebase functions:secrets:set SSLCOMMERZ_STORE_PASS
firebase functions:secrets:set SMS_GATEWAY_API_KEY
```

---

## 5. Web Application Hosting Deployment

Deploy the Next.js production web application:

```powershell
# Ensure production build passes
npm run build

# Deploy Hosting channel to live
firebase deploy --only hosting
```

---

## 6. Custom Domain & SSL / HTTPS Configuration

1. In **Firebase Console $\rightarrow$ Hosting $\rightarrow$ Custom Domain**:
2. Click **Add Custom Domain** $\rightarrow$ enter `ghorbondhu.com` and `www.ghorbondhu.com`.
3. Add the provided `A` and `TXT` records to your DNS registrar (e.g. Cloudflare, Namecheap).
4. **SSL Certificate:** Google automatically provisions a managed, auto-renewing Let's Encrypt / Google Trust Services SSL certificate.
5. All traffic automatically enforces `HSTS` and `HTTPS` redirects.

---

## 7. Automated Database Backup Strategy

To prevent accidental data loss and comply with disaster recovery standards:

### Daily Automated Firestore Export via Cloud Scheduler:
1. Create a dedicated Cloud Storage backup bucket:
   ```bash
   gcloud storage buckets create gs://ghorbondhu-prod-backups --location=asia-southeast1
   ```
2. Schedule daily database exports using Google Cloud Scheduler:
   ```bash
   gcloud scheduler jobs create http firestore-daily-backup \
     --schedule="0 2 * * *" \
     --uri="https://firestore.googleapis.com/v1/projects/ghorbondhu-prod/databases/(default):exportDocuments" \
     --http-method=POST \
     --message-body='{"outputUriPrefix":"gs://ghorbondhu-prod-backups"}' \
     --oauth-service-account-email="ghorbondhu-prod@appspot.gserviceaccount.com"
   ```
3. Bucket lifecycle rule: Configure 30-day retention with transition to Coldline/Archive storage.

---

## 8. Production Pre-Launch Go-Live Checklist

- [ ] All 74 automated tests pass cleanly (`npm test`).
- [ ] Next.js production build completes without warnings or errors (`npm run build`).
- [ ] Firestore Security Rules deployed and verified against `/rate_limits`, `/bookings`, `/payments`.
- [ ] Storage Security Rules deployed and restricting non-image uploads in KYC buckets.
- [ ] 22 Composite indexes deployed in Firestore console.
- [ ] Firebase App Check registered with production reCAPTCHA v3 / Enterprise key.
- [ ] Custom domain DNS propagated with valid SSL lock.
- [ ] SMS Gateway balance verified and sender ID registered with BTRC.
- [ ] bKash & SSLCommerz commercial merchant credentials tested and verified in live mode.
- [ ] Super Admin credentials initialized and verified via Seed command or console.
- [ ] Emergency maintenance toggle tested from `/super-admin/settings`.

---

## 9. Rollback & Emergency Incident Protocol

If a defective release is deployed to production:

```powershell
# Instant Hosting Rollback to Previous Version
firebase hosting:rollback

# Rollback Security Rules (if rules caused regression)
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules

# Instant Emergency Maintenance Mode
# Toggle 'isEmergencyMaintenance: true' in /system_settings/global via Super Admin Console
```
