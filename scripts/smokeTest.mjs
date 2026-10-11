/**
 * GhorBondhu (ঘরবন্ধু) - Production Launch Smoke Test Suite
 * Automated pre-flight verification script verifying:
 * 1. Environment configuration & aliases (.firebaserc, .env.example)
 * 2. Firestore security rules & zero-trust vectors
 * 3. Storage security rules & KYC isolation
 * 4. Composite Firestore indexes configuration
 * 5. Seeding data integrity
 * 6. Health endpoints & logger telemetry
 * 7. Next.js build routes & page artifact existence
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

let passedChecks = 0;
let totalChecks = 0;

function assertCheck(name, condition, errorDetails = "") {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name} ${errorDetails ? `-> ${errorDetails}` : ""}`);
  }
}

console.log("\n========================================================");
console.log("  GHORBONDHU (ঘরবন্ধু) - PRODUCTION LAUNCH SMOKE TEST");
console.log("========================================================\n");

// 1. Environment & Project Aliases
console.log("--- 1. Multi-Environment & Project Configuration ---");
const firebasercPath = path.join(ROOT_DIR, ".firebaserc");
assertCheck(".firebaserc exists", fs.existsSync(firebasercPath));

if (fs.existsSync(firebasercPath)) {
  const rc = JSON.parse(fs.readFileSync(firebasercPath, "utf-8"));
  const devConfigured = (rc.projects?.dev || rc.projects?.development) === "ghorbondhu-dev";
  const stagingConfigured = rc.projects?.staging === "ghorbondhu-staging";
  const prodConfigured = (rc.projects?.prod || rc.projects?.production) === "ghorbondhu-prod";

  assertCheck("dev alias configured", devConfigured);
  assertCheck("staging alias configured", stagingConfigured);
  assertCheck("prod alias configured", prodConfigured);
}

const envExamplePath = path.join(ROOT_DIR, ".env.example");
assertCheck(".env.example template exists", fs.existsSync(envExamplePath));
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, "utf-8");
  assertCheck("Firebase API Key declared", envContent.includes("NEXT_PUBLIC_FIREBASE_API_KEY"));
  assertCheck("Telecom SMS Gateway declared", envContent.includes("SMS_GATEWAY") || envContent.includes("GREENWEB"));
  assertCheck("SSLCommerz / Payment declared", envContent.includes("SSLCOMMERZ") || envContent.includes("BKASH"));
}

// 2. Security Rules (Zero-Trust)
console.log("\n--- 2. Cloud Firestore & Storage Security Rules ---");
const firestoreRulesPath = path.join(ROOT_DIR, "firestore.rules");
assertCheck("firestore.rules exists", fs.existsSync(firestoreRulesPath));

if (fs.existsSync(firestoreRulesPath)) {
  const rules = fs.readFileSync(firestoreRulesPath, "utf-8");
  assertCheck("Zero-trust bookings write deny", rules.includes("match /bookings/{bookingId}") && rules.includes("allow write: if false;"));
  assertCheck("Financial payments write deny", rules.includes("match /payments/{paymentId}") && rules.includes("allow write: if false;"));
  assertCheck("Payouts write deny", rules.includes("match /payouts/{payoutId}") && rules.includes("allow write: if false;"));
  assertCheck("Rate limits read/write deny", rules.includes("match /rate_limits/{key}") && rules.includes("allow read, write: if false;"));
  assertCheck("Super Admin system settings write restriction", rules.includes("isSuperAdmin()"));
}

const storageRulesPath = path.join(ROOT_DIR, "storage.rules");
assertCheck("storage.rules exists", fs.existsSync(storageRulesPath));
if (fs.existsSync(storageRulesPath)) {
  const sRules = fs.readFileSync(storageRulesPath, "utf-8");
  assertCheck("KYC Documents Isolation (Admin or Owner)", sRules.includes("/kyc_documents/{providerId}/"));
}

// 3. Composite Indexes
console.log("\n--- 3. Performance & Firestore Composite Indexes ---");
const indexesPath = path.join(ROOT_DIR, "firestore.indexes.json");
assertCheck("firestore.indexes.json exists", fs.existsSync(indexesPath));

if (fs.existsSync(indexesPath)) {
  const indexesData = JSON.parse(fs.readFileSync(indexesPath, "utf-8"));
  const indexesCount = indexesData.indexes?.length || 0;
  assertCheck(`Indexes defined (found ${indexesCount})`, indexesCount >= 20);
}

// 4. Seeding Catalog Data
console.log("\n--- 4. Catalog & Seed Data Quality ---");
const seedDataPath = path.join(ROOT_DIR, "scripts", "seedData.json");
assertCheck("seedData.json exists", fs.existsSync(seedDataPath));

if (fs.existsSync(seedDataPath)) {
  const seed = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));
  assertCheck("Categories populated", seed.categories?.length > 0);
  assertCheck("Services populated", seed.services?.length >= 4);
  assertCheck("Pricing rules configured", seed.pricingRules?.length >= 4);
  const deepCleanRule = seed.pricingRules.find((r) => r.ruleId === "rule_house_deep_cleaning");
  assertCheck("rule_house_deep_cleaning has base price", deepCleanRule && deepCleanRule.basePriceBDT > 0);
}

// 5. App Router Critical Endpoints
console.log("\n--- 5. Next.js App Router & Observability Routes ---");
const routesToCheck = [
  "src/app/api/health/route.ts",
  "src/app/api/telemetry/errors/route.ts",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/(admin)/super-admin/page.tsx",
  "src/app/(admin)/super-admin/monitoring/page.tsx",
  "src/app/(customer)/customer-dashboard/page.tsx",
  "src/app/(provider)/provider-dashboard/page.tsx",
  "src/app/(admin)/admin-dashboard/page.tsx",
];

for (const r of routesToCheck) {
  assertCheck(`Route ${r} exists`, fs.existsSync(path.join(ROOT_DIR, r)));
}

// 6. Monitoring & CI/CD Documentation
console.log("\n--- 6. Architectural & Operational Documentation ---");
const docsToCheck = [
  "MONITORING.md",
  "DEPLOYMENT.md",
  "ENVIRONMENT.md",
  "TESTING.md",
  "PERFORMANCE.md",
  "SECURITY.md",
];

for (const d of docsToCheck) {
  assertCheck(`Documentation ${d} exists`, fs.existsSync(path.join(ROOT_DIR, d)));
}

// Summary
console.log("\n========================================================");
console.log(`SMOKE TEST RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED`);
console.log("========================================================\n");

if (passedChecks === totalChecks) {
  console.log("🚀 ALL PRODUCTION PRE-FLIGHT VERIFICATIONS PASSED!");
  process.exit(0);
} else {
  console.error("❌ SMOKE TEST FAILED! Please resolve missing requirements.");
  process.exit(1);
}
