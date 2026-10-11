"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/firebase/auth";
import Link from "next/link";
import { 
  ShieldCheck, 
  LogOut, 
  Users, 
  UserCheck, 
  Calendar, 
  Layers, 
  BadgePercent, 
  AlertCircle,
  TrendingUp,
  FileCheck2,
  Star,
  Smartphone,
  Wallet,
  ShieldAlert
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function AdminDashboardPage() {
  const { profile, claims } = useAuthStore();
  const isSuperAdmin = claims?.role === "SUPER_ADMIN";

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Admin Navigation */}
        <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                GB
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">GhorBondhu Admin</span>
                <span className="block text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                  {isSuperAdmin ? "Super Admin Console" : "Operational Staff ERP"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell className="text-slate-300" />
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">
                  {profile?.email}
                </p>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  {claims?.role || "ADMIN"}
                </span>
              </div>
              <button
                onClick={() => logoutUser()}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="লগআউট"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Admin Main Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                অপারেশনস ওভারভিউ ও কন্ট্রোল
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                প্ল্যাটফর্মের সার্ভিস প্রোভাইডার ভেরিফিকেশন, ক্যাটালগ ও বুকিং মনিটর করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/users"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Users className="w-4 h-4 text-brand-400" />
                <span>ইউজার ডিরেক্টরি</span>
              </Link>

              {isSuperAdmin && (
                <>
                  <Link
                    href="/super-admin"
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-slate-950" />
                    <span>সুপার অ্যাডমিন কনসোল</span>
                  </Link>

                  <Link
                    href="/admin/roles"
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>রোল ও পারমিশন</span>
                  </Link>
                </>
              )}

              <Link
                href="/admin/verify-providers"
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>কেওয়াইসি কিউ</span>
              </Link>

              <Link
                href="/admin/bookings"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Calendar className="w-4 h-4" />
                <span>বুকিং ও ডিসপ্যাচ</span>
              </Link>

              <Link
                href="/admin/reviews"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>রিভিউ ও কোয়ালিটি</span>
              </Link>

              <Link
                href="/admin/communications"
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>কমিউনিকেশন ও এসএমএস</span>
              </Link>

              <Link
                href="/admin/finance"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Wallet className="w-4 h-4" />
                <span>আর্থিক লেজার</span>
              </Link>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">মোট কাস্টমার</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">০</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">ভেরিফাইড প্রোভাইডার</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">০</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">অপেক্ষমাণ আবেদন (KYC)</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-3">০ টি</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">চলমান বুকিং</span>
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">০ টি</p>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <Layers className="w-6 h-6 text-brand-600 mb-3" />
              <h3 className="font-bold text-slate-900 text-base">সার্ভিস ক্যাটালগ</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                ডায়নামিক সার্ভিস ক্যাটাগরি, আইটেম ও ডেসক্রিপশন ম্যানেজ করুন।
              </p>
              <Link
                href="/admin/services"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                ক্যাটালগ দেখুন &rarr;
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <BadgePercent className="w-6 h-6 text-amber-600 mb-3" />
              <h3 className="font-bold text-slate-900 text-base">প্রাইসিং রুলস</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                বেস প্রাইস, ডিউরেশন ইনক্রিমেন্ট ও প্ল্যাটফর্ম কমিশন রেট।
              </p>
              <Link
                href="/admin/pricing"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                প্রাইসিং কনফিগারেশন &rarr;
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <TrendingUp className="w-6 h-6 text-emerald-600 mb-3" />
              <h3 className="font-bold text-slate-900 text-base">আর্থিক অডিট ও পেআউট</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                প্রোভাইডার উত্তোলনের রিকোয়েস্ট ও প্ল্যাটফর্ম রেভিনিউ রিপোর্ট।
              </p>
              <Link
                href="/admin/finance"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                আর্থিক লেজার &rarr;
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
