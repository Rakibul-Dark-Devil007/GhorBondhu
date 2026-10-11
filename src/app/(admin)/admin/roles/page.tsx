"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSION_LABELS, type AdminPermissionKey } from "@/lib/permissions";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Loader2, 
  UserPlus, 
  KeyRound,
  Sparkles
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/app";
import type { AppUser } from "@/types";

export default function AdminRolesPage() {
  const { firebaseUser, claims } = useAuthStore();
  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<AppUser | null>(null);
  const [permissionsState, setPermissionsState] = useState<Record<AdminPermissionKey, boolean>>({
    canVerifyProviders: true,
    canManageCatalog: true,
    canConfigurePricing: false,
    canOverrideBookings: true,
    canHandleDisputes: true,
    canProcessPayouts: false,
    canManageAdmins: false,
    canViewAuditLogs: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Staff Promotion Input
  const [targetEmail, setTargetEmail] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "in", ["ADMIN", "SUPER_ADMIN"]));
      const snap = await getDocs(q);
      const loaded: AppUser[] = snap.docs.map((d) => ({
        userId: d.id,
        email: d.data().email || "",
        phoneNumber: d.data().phoneNumber || "",
        role: d.data().role || "ADMIN",
        status: d.data().status || "ACTIVE",
        isEmailVerified: !!d.data().isEmailVerified,
        isPhoneVerified: !!d.data().isPhoneVerified,
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || "",
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || "",
      }));
      setAdmins(loaded);
      if (loaded.length > 0 && !selectedStaff) {
        setSelectedStaff(loaded[0]);
      }
    } catch (err) {
      console.error("Failed to load staff accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (key: AdminPermissionKey) => {
    setPermissionsState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const updateStaffPermissionsFn = httpsCallable(functions, "updateStaffPermissions");
      await updateStaffPermissionsFn({
        targetStaffId: selectedStaff.userId,
        permissions: permissionsState,
      });
      setMessage({ type: "success", text: "পারমিশন সফলভাবে সংরক্ষণ করা হয়েছে।" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "পারমিশন আপডেট করতে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;
    setIsPromoting(true);
    setMessage(null);
    try {
      // Find user by email in users collection
      const q = query(collection(db, "users"), where("email", "==", targetEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error("এই ইমেইলের কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি। ব্যবহারকারীকে আগে রেজিস্ট্রেশন করতে হবে।");
      }
      const targetUid = snap.docs[0].id;

      const setUserRoleFn = httpsCallable(functions, "setUserRole");
      await setUserRoleFn({
        targetUserId: targetUid,
        role: "ADMIN",
        permissions: permissionsState,
      });

      setMessage({ type: "success", text: `${targetEmail} কে সফলভাবে স্টাফ অ্যাডমিন হিসেবে যুক্ত করা হয়েছে।` });
      setTargetEmail("");
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "রোল পরিবর্তন করা সম্ভব হয়নি।" });
    } finally {
      setIsPromoting(false);
    }
  };

  // Bootstrap current user as Super Admin if no Super Admin exists
  const handleBootstrapSuperAdmin = async () => {
    if (!firebaseUser?.uid) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const setUserRoleFn = httpsCallable(functions, "setUserRole");
      await setUserRoleFn({
        targetUserId: firebaseUser.uid,
        role: "SUPER_ADMIN",
      });
      setMessage({
        type: "success",
        text: "অভিনন্দন! আপনার অ্যাকাউন্ট সফলভাবে SUPER_ADMIN হিসেবে বুটস্ট্র্যাপ করা হয়েছে। অনুগ্রহ করে পেজ রিফ্রেশ করুন।",
      });
      fetchAdmins();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "বুটস্ট্র্যাপ ব্যর্থ হয়েছে।" });
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentSuperAdmin = claims?.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="mb-8">
          <Link
            href="/admin-dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>অ্যাডমিন ড্যাশবোর্ডে ফিরে যান</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
                <span>রোল ও পারমিশন কন্ট্রোল (RBAC Engine)</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                স্টাফ অ্যাডমিনদের গ্র্যানুলার পারমিশন নির্ধারণ এবং অ্যাক্সেস কন্ট্রোল পলিসি।
              </p>
            </div>

            {/* Bootstrap Button if no Super Admin */}
            {!isCurrentSuperAdmin && admins.length === 0 && (
              <button
                onClick={handleBootstrapSuperAdmin}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 hover:opacity-95 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>নিজেকে Super Admin হিসেবে বুটস্ট্র্যাপ করুন</span>
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs sm:text-sm flex items-center space-x-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Staff Accounts List & Add Staff */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-brand-600" />
                <span>স্টাফ ও অ্যাডমিন অ্যাকাউন্ট</span>
              </h2>

              {isLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">লোড হচ্ছে...</p>
                </div>
              ) : admins.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  বর্তমানে কোনো অ্যাডমিন অ্যাকাউন্ট তৈরি করা নেই।
                </p>
              ) : (
                <div className="space-y-2">
                  {admins.map((adm) => (
                    <button
                      key={adm.userId}
                      onClick={() => setSelectedStaff(adm)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col justify-between ${
                        selectedStaff?.userId === adm.userId
                          ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500 text-slate-900"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span className="font-bold truncate">{adm.email}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        {adm.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Promote User to Admin Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>নতুন স্টাফ নিয়োগ করুন</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                রেজিস্ট্রেশনকৃত কোনো ব্যবহারকারীর ইমেইল প্রদান করে তাকে অপারেশনাল অ্যাডমিন হিসেবে যুক্ত করুন।
              </p>

              <form onSubmit={handlePromoteUser} className="space-y-3">
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  disabled={isPromoting || !targetEmail.trim()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-60 flex items-center justify-center space-x-1.5"
                >
                  {isPromoting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>যুক্ত করা হচ্ছে...</span>
                    </>
                  ) : (
                    <span>অ্যাডমিন হিসেবে নিয়োগ দিন</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Permission Matrix for Selected Staff */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-2 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    পারমিশন ম্যাট্রিক্স
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    নির্বাচিত অ্যাকাউন্ট:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedStaff?.email || "কোনো অ্যাকাউন্ট নির্বাচন করা হয়নি"}
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleSavePermissions}
                  disabled={isSaving || !selectedStaff}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-1.5 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>পারমিশন সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-4">
                {(Object.keys(PERMISSION_LABELS) as AdminPermissionKey[]).map((permKey) => {
                  const item = PERMISSION_LABELS[permKey];
                  const isChecked = permissionsState[permKey];
                  return (
                    <div
                      key={permKey}
                      onClick={() => togglePermission(permKey)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition flex items-start space-x-3 ${
                        isChecked
                          ? "border-amber-400 bg-amber-50/40"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.labelBn}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{item.descBn}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{permKey}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
