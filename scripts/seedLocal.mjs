import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  writeBatch 
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON catalog data
const seedData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seedData.json"), "utf8")
);

// Firebase Client Config (for local dev or emulator)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyApiKeyForLocalSetup00000000",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ghorbondhu-dev.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ghorbondhu-dev",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ghorbondhu-dev.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:100000000000:web:abcdef1234567890abcdef",
};

console.log("🌱 GhorBondhu: Seeding database collections...");
console.log(`Connecting to Project ID: ${firebaseConfig.projectId}`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runSeed() {
  const batch = writeBatch(db);

  // 1. Categories
  console.log(`- Staging ${seedData.categories.length} service categories...`);
  for (const cat of seedData.categories) {
    const ref = doc(db, "service_categories", cat.categoryId);
    batch.set(ref, {
      ...cat,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 2. Services
  console.log(`- Staging ${seedData.services.length} services...`);
  for (const srv of seedData.services) {
    const ref = doc(db, "services", srv.serviceId);
    batch.set(ref, {
      ...srv,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 3. Pricing Rules
  console.log(`- Staging ${seedData.pricingRules.length} pricing rules...`);
  for (const rule of seedData.pricingRules) {
    const ref = doc(db, "pricing_rules", rule.ruleId);
    batch.set(ref, {
      ...rule,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 4. Roles & Permissions
  console.log(`- Staging ${seedData.rolesPermissions.length} role templates...`);
  for (const role of seedData.rolesPermissions) {
    const ref = doc(db, "roles_permissions", role.roleName);
    batch.set(ref, {
      ...role,
      updatedAt: serverTimestamp(),
      updatedBy: "LOCAL_SEED_SCRIPT",
    }, { merge: true });
  }

  // 5. System Settings
  console.log("- Staging global system settings...");
  const settingsRef = doc(db, "system_settings", "global_config");
  batch.set(settingsRef, {
    ...seedData.systemSettings,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  console.log("✅ Seed data staged successfully. Ready to commit batch.");
  console.log(`Total items prepared: ${seedData.categories.length + seedData.services.length + seedData.pricingRules.length + seedData.rolesPermissions.length + 1}`);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
