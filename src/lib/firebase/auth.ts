import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./app";
import { useAuthStore, type CustomClaims } from "@/stores/authStore";
import type { CustomerRegisterInput, ProviderRegisterInput } from "@/lib/validators/auth";
import type { AppUser } from "@/types";

export function mapAuthError(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। পুনরায় চেষ্টা করুন।";
    case "auth/email-already-in-use":
      return "এই ইমেইল ঠিকানাটি দিয়ে ইতিমধ্যে একটি একাউন্ট খোলা আছে।";
    case "auth/weak-password":
      return "পাসওয়ার্ডটি অত্যন্ত দুর্বল। আরও শক্তিশালী পাসওয়ার্ড দিন।";
    case "auth/invalid-email":
      return "প্রদত্ত ইমেইল ঠিকানার ফরম্যাট সঠিক নয়।";
    case "auth/too-many-requests":
      return "অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে বন্ধ আছে। কিছুক্ষণ পর চেষ্টা করুন।";
    case "auth/network-request-failed":
      return "ইন্টারনেট সংযোগে সমস্যা হয়েছে। আপনার সংযোগ পরীক্ষা করুন।";
    default:
      return "লগইন বা রেজিস্ট্রেশনে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
  }
}

/**
 * Sign in existing user with email and password
 */
export async function signInUser(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Register a new Customer
 */
export async function registerCustomer(input: CustomerRegisterInput): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const user = cred.user;

  // Initialize users/{uid} document
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, {
    userId: user.uid,
    email: input.email,
    phoneNumber: input.phoneNumber,
    role: "CUSTOMER",
    status: "ACTIVE",
    isEmailVerified: user.emailVerified,
    isPhoneVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  // Initialize customers/{uid} profile
  const customerDocRef = doc(db, "customers", user.uid);
  await setDoc(customerDocRef, {
    customerId: user.uid,
    fullName: input.fullName,
    preferredLanguage: "bn",
    totalBookingsCompleted: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

/**
 * Register a new Service Provider
 */
export async function registerProvider(input: ProviderRegisterInput): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
  const user = cred.user;

  // Initialize users/{uid}
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, {
    userId: user.uid,
    email: input.email,
    phoneNumber: input.phoneNumber,
    role: "PROVIDER",
    status: "ACTIVE",
    isEmailVerified: user.emailVerified,
    isPhoneVerified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  // Initialize providers/{uid}
  const providerDocRef = doc(db, "providers", user.uid);
  await setDoc(providerDocRef, {
    providerId: user.uid,
    fullName: input.fullName,
    phoneNumber: input.phoneNumber,
    gender: input.gender,
    verificationStatus: "PENDING",
    isOnline: false,
    servicesOffered: input.servicesOffered,
    serviceAreas: input.serviceAreas,
    ratingAvg: 5.0,
    ratingCount: 0,
    completedJobsCount: 0,
    cancelledJobsCount: 0,
    earningsSummary: {
      totalEarnedBDT: 0,
      pendingPayoutBDT: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
  useAuthStore.getState().clearAuth();
}

/**
 * Global Auth State Listener
 * Subscribes to token changes, parses claims, and loads user profile.
 */
export function initAuthListener(): () => void {
  const { setFirebaseUser, setProfile, setClaims, setLoading } = useAuthStore.getState();

  const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      useAuthStore.getState().clearAuth();
      return;
    }

    setFirebaseUser(firebaseUser);
    setLoading(true);

    try {
      // 1. Get parsed token result for custom claims
      const tokenResult = await firebaseUser.getIdTokenResult();
      const claims: CustomClaims = {
        role: tokenResult.claims.role as any,
        permissions: tokenResult.claims.permissions as any,
        providerStatus: tokenResult.claims.providerStatus as any,
        isSuspended: tokenResult.claims.isSuspended as boolean | undefined,
      };
      setClaims(claims);

      // 2. Fetch user profile from Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfile({
          userId: firebaseUser.uid,
          email: data.email || firebaseUser.email || "",
          phoneNumber: data.phoneNumber || firebaseUser.phoneNumber || undefined,
          role: data.role || claims.role || "CUSTOMER",
          status: data.status || "ACTIVE",
          isEmailVerified: firebaseUser.emailVerified,
          isPhoneVerified: !!data.isPhoneVerified,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as AppUser);
      } else {
        // Default minimal fallback
        setProfile({
          userId: firebaseUser.uid,
          email: firebaseUser.email || "",
          role: claims.role || "CUSTOMER",
          status: "ACTIVE",
          isEmailVerified: firebaseUser.emailVerified,
          isPhoneVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Error refreshing auth profile:", err);
    } finally {
      setLoading(false);
    }
  });

  return unsubscribe;
}
