"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { isSuperAdmin } from "@/lib/permissions";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Ban,
  UserCheck
} from "lucide-react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/app";
import type { AppUser, UserRole, UserStatus } from "@/types";

export default function AdminUsersPage() {
  const { claims } = useAuthStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Suspension modal state
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      const loaded: AppUser[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          userId: docSnap.id,
          email: d.email || "",
          phoneNumber: d.phoneNumber || "",
          role: d.role || "CUSTOMER",
          status: d.status || "ACTIVE",
          isEmailVerified: !!d.isEmailVerified,
          isPhoneVerified: !!d.isPhoneVerified,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });
      setUsers(loaded);
      setFilteredUsers(loaded);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = users;

    if (selectedRole !== "ALL") {
      result = result.filter((u) => u.role === selectedRole);
    }

    if (selectedStatus !== "ALL") {
      result = result.filter((u) => u.status === selectedStatus);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          (u.phoneNumber && u.phoneNumber.includes(term)) ||
          u.userId.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(result);
  }, [searchTerm, selectedRole, selectedStatus, users]);

  const handleToggleStatus = async (user: AppUser, newStatus: UserStatus) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      const manageUserStatusFn = httpsCallable(functions, "manageUserStatus");
      await manageUserStatusFn({
        targetUserId: user.userId,
        targetStatus: newStatus,
        reason: suspensionReason || (newStatus === "SUSPENDED" ? "অ্যাডমিন কর্তৃক অ্যাকাউন্ট স্থগিত" : "অ্যাকাউন্ট পুনর্বহাল"),
      });

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => (u.userId === user.userId ? { ...u, status: newStatus } : u))
      );
      setTargetUser(null);
      setSuspensionReason("");
    } catch (err: any) {
      setActionError(err.message || "অপারেশন সম্পন্ন করা সম্ভব হয়নি।");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <Link
                href="/admin-dashboard"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>অ্যাডমিন ড্যাশবোর্ডে ফিরে যান</span>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">
                ব্যবহারকারী ব্যবস্থাপনা (User Directory)
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                কাস্টমার, সার্ভিস প্রোভাইডার ও অ্যাডমিনদের অ্যাকাউন্ট মনিটর ও নিয়ন্ত্রণ করুন।
              </p>
            </div>

            {isSuperAdmin(claims) && (
              <Link
                href="/admin/roles"
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-sm transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>পারমিশন ও রোল কন্ট্রোল</span>
              </Link>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ইমেইল বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">রোল:</span>
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="ALL">সকল রোল (All)</option>
                <option value="CUSTOMER">কাস্টমার (Customer)</option>
                <option value="PROVIDER">প্রোভাইডার (Provider)</option>
                <option value="ADMIN">স্টাফ অ্যাডমিন (Admin)</option>
                <option value="SUPER_ADMIN">সুপার অ্যাডমিন (Super Admin)</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="ALL">সকল স্ট্যাটাস (All)</option>
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="SUSPENDED">স্থগিত (Suspended)</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">ব্যবহারকারী তালিকা লোড হচ্ছে...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">কোনো ব্যবহারকারী পাওয়া যায়নি</h3>
                <p className="text-xs text-slate-400 mt-1">অনুসন্ধান বা ফিল্টারের শর্ত পরিবর্তন করে চেষ্টা করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">ইউজার / যোগাযোগ</th>
                      <th className="py-3.5 px-4">রোল</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস</th>
                      <th className="py-3.5 px-4">নিবন্ধন তারিখ</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">পদক্ষেপ (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 sm:px-6">
                          <p className="font-semibold text-slate-900">{u.email}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {u.phoneNumber || "নম্বর দেওয়া নেই"}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.role === "SUPER_ADMIN"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : u.role === "PROVIDER"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                            <span>{u.status === "ACTIVE" ? "সক্রিয়" : "স্থগিত"}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("bn-BD") : "—"}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          {u.status === "ACTIVE" ? (
                            <button
                              onClick={() => {
                                setTargetUser(u);
                                setSuspensionReason("");
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            >
                              স্থগিত করুন
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u, "ACTIVE")}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              সক্রিয় করুন
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suspension Confirmation Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">অ্যাকাউন্ট স্থগিতকরণ</h3>
                <p className="text-xs text-slate-500">{targetUser.email}</p>
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-3">
              অ্যাকাউন্ট স্থগিত করলে ব্যবহারকারী আর প্ল্যাটফর্মে লগইন করতে বা সার্ভিস নিতে/দিতে পারবেন না। স্থগিতকরণের সুনির্দিষ্ট কারণ উল্লেখ করুন:
            </p>

            <textarea
              rows={3}
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="স্থগিতের কারণ (যেমন: নীতিমালা লঙ্ঘন, ভুয়া তথ্য প্রদান)..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 mb-4"
            />

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(targetUser, "SUSPENDED")}
                disabled={isProcessing || !suspensionReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>স্থগিত করা হচ্ছে...</span>
                  </>
                ) : (
                  <span>স্থগিত নিশ্চিত করুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
