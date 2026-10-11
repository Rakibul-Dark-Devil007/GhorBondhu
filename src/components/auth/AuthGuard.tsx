"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";
import { Loader2, ShieldAlert } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireVerification?: boolean;
}

export function AuthGuard({
  children,
  allowedRoles,
  requireVerification = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { firebaseUser, profile, claims, isLoading, isInitialized } = useAuthStore();

  const userRole = claims?.role || profile?.role;
  const providerStatus = claims?.providerStatus;

  useEffect(() => {
    if (!isLoading && isInitialized) {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        // Redirect to their own role's home
        if (userRole === "PROVIDER") router.push("/provider-dashboard");
        else if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") router.push("/admin-dashboard");
        else router.push("/customer-dashboard");
      }
    }
  }, [firebaseUser, userRole, isLoading, isInitialized, allowedRoles, router]);

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">অনুমোদন যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-2xl border border-red-200 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">অননুমোদিত অ্যাক্সেস</h3>
        <p className="mt-2 text-sm text-slate-600">
          এই পেজটি দেখার প্রয়োজনীয় অনুমতি আপনার অ্যাকাউন্টে নেই।
        </p>
      </div>
    );
  }

  if (requireVerification && userRole === "PROVIDER" && providerStatus !== "VERIFIED") {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">প্রোফাইল যাচাই প্রক্রিয়াধীন</h3>
        <p className="mt-2 text-sm text-slate-700">
          আপনার সার্ভিস প্রোভাইডার আবেদনটি বর্তমানে অ্যাডমিন কর্তৃক যাচাই করা হচ্ছে। অনুমোদিত হলে আপনি সরাসরি কাজ শুরু করতে পারবেন।
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
