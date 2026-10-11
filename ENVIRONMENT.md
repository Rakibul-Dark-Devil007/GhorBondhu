# GhorBondhu (ঘরবন্ধু) - Multi-Environment Management Architecture

> **Document Version:** 1.0.0 (Production Release)  
> **Last Audited:** October 2026  
> **Platform:** GhorBondhu (ঘরবন্ধু) — *Trusted Help, Right at Home.*  
> **Core Mandate:** **Strict Isolation — Never Mix Environments.**

---

## 1. The Multi-Environment Philosophy

A financial, domestic household marketplace must never run tests, staging mockups, or development experiments against live production customer databases or real mobile payment gateways (bKash/Nagad/SSLCommerz).

GhorBondhu strictly segregates infrastructure into **three dedicated Google Cloud / Firebase projects**:

```
+---------------------------------------------------------------------------------------------------+
|                                     ENVIRONMENT TAXONOMY                                          |
+-----------------------------------+-------------------------------+-------------------------------+
|       DEVELOPMENT (DEV)           |         STAGING (UAT)         |       PRODUCTION (PROD)       |
+-----------------------------------+-------------------------------+-------------------------------+
| Project: ghorbondhu-dev           | Project: ghorbondhu-staging   | Project: ghorbondhu-prod      |
| Host: localhost:3000 / emulators  | Host: staging.ghorbondhu.com  | Host: ghorbondhu.com          |
| Purpose: Developer iteration      | Purpose: Pre-release testing  | Purpose: Live customers       |
| Data: Synthetic / Seed scripts    | Data: Sanitized staging data  | Data: Live encrypted PII      |
| Gateways: Sandbox / Mock mode     | Gateways: Sandbox credentials | Gateways: Commercial Live     |
| App Check: Debug token enabled    | App Check: reCAPTCHA v3 test  | App Check: Enforced           |
+-----------------------------------+-------------------------------+-------------------------------+
```

---

## 2. Why Environment Mixing Is Strictly Prohibited

1. **Financial Disaster:** Running a staging booking against production payment accounts could trigger real monetary deductions or payouts to unintended accounts.
2. **Customer Privacy Breach (PII):** If developer code connects to production Firestore, domestic addresses, contact numbers, and National IDs could be leaked or modified accidentally.
3. **Telecom SMS Exhaustion:** Testing automated triggers on development could spam real Bangladeshi phone numbers, burning commercial SMS gateway credits and disturbing customers.
4. **Data Contamination:** Test bookings ("test job 123") in production skew business analytics, revenue reports, and provider ranking algorithms.

---

## 3. Firebase Project Aliases Configuration

Firebase CLI tracks project environments via [`.firebaserc`](file:///c:/Users/MSI/Desktop/NestTech%20Solution%20&%20Consultant/GhorBondhu/.firebaserc):

```json
{
  "projects": {
    "default": "ghorbondhu-dev",
    "development": "ghorbondhu-dev",
    "staging": "ghorbondhu-staging",
    "production": "ghorbondhu-prod"
  }
}
```

### Switching Environments:
```powershell
# Switch active target to Development
firebase use development

# Switch active target to Staging
firebase use staging

# Switch active target to Production
firebase use production
```

---

## 4. Environment Variables Mapping

| Variable Name | Development | Staging | Production | Sensitivity |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_ENV` | `development` | `staging` | `production` | Public |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging.ghorbondhu.com` | `https://ghorbondhu.com` | Public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `ghorbondhu-dev` | `ghorbondhu-staging` | `ghorbondhu-prod` | Public |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | *(empty / debug)* | *Staging Key* | *Prod Enterprise Key* | Public |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN`| `true` | *(empty)* | *(empty)* | Dev Only |
| `BKASH_APP_KEY` | *Sandbox Key* | *Sandbox Key* | *Production Secret* | **Secret** |
| `SSLCOMMERZ_IS_LIVE` | `false` | `false` | `true` | **Secret** |
| `SMS_GATEWAY_API_KEY` | *Mock / Dev Key* | *Test Sender* | *Commercial Sender* | **Secret** |

---

## 5. Branch-to-Environment Deployment Promotion Flow

```
   feature/* branches
           │
           ▼ (PR + CI Validation)
        develop ──────► Automatic Deploy ──────► Staging (ghorbondhu-staging)
           │                                          │
           │ (QA & Stakeholder Signoff)               │ (UAT Acceptance)
           ▼                                          ▼
     master / main ────► Tagged Release (v1.0.0) ───► Production (ghorbondhu-prod)
```
