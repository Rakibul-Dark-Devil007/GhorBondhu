import { create } from "zustand";
import type { User } from "firebase/auth";
import type { AppUser, UserRole, ProviderVerificationStatus } from "@/types";

export interface CustomClaims {
  role?: UserRole;
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
  providerStatus?: ProviderVerificationStatus;
  isSuspended?: boolean;
}

interface AuthState {
  firebaseUser: User | null;
  profile: AppUser | null;
  claims: CustomClaims | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setFirebaseUser: (user: User | null) => void;
  setProfile: (profile: AppUser | null) => void;
  setClaims: (claims: CustomClaims | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  claims: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setFirebaseUser: (user) => set({ firebaseUser: user, isInitialized: true }),
  setProfile: (profile) => set({ profile }),
  setClaims: (claims) => set({ claims }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearAuth: () =>
    set({
      firebaseUser: null,
      profile: null,
      claims: null,
      isLoading: false,
      isInitialized: true,
      error: null,
    }),
}));
