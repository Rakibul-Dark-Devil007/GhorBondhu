"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { 
  subscribeToSystemSettings, 
  subscribeToAllPayments, 
  subscribeToAllPayouts, 
  subscribeToAllBookings,
  subscribeToAllReviews,
  subscribeToDisputes,
  subscribeToAuditLogs,
  getAllUsers,
  getPendingProviderApplications
} from "@/lib/firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { formatBDT } from "@/lib/utils";
import type { SystemSettings, Payment, PayoutRequest, Booking, Dispute, AuditLogEntry, AppUser } from "@/types";
import {
  ShieldAlert,
  Settings,
  Activity,
  AlertTriangle,
  Lock,
  Power,
  Users,
  Banknote,
  DollarSign,
  TrendingUp,
  FileText,
  Tag,
  Scale,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  Bell,
  RefreshCw,
  Sliders,
  Radio,
  Zap,
  Server
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const { profile } = useAuthStore();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [usersCount, setUsersCount] = useState({ total: 0, customers: 0, providers: 0, staff: 0 });
  const [pendingKycCount, setPendingKycCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingKillSwitch, setIsUpdatingKillSwitch] = useState<string | null>(null);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  // Subscriptions & Initial Loads
  useEffect(() => {
    setIsLoading(true);

    const unsubSettings = subscribeToSystemSettings((data) => setSettings(data));
    const unsubPayments = subscribeToAllPayments((data) => setPayments(data));
    const unsubPayouts = subscribeToAllPayouts((data) => setPayouts(data));
    const unsubBookings = subscribeToAllBookings((data) => setBookings(data));
    const unsubDisputes = subscribeToDisputes((data) => setDisputes(data));
    const unsubLogs = subscribeToAuditLogs((data) => setRecentLogs(data.slice(0, 8)));

    // Load user counts and pending applications
    const fetchStats = async () => {
      try {
        const allUsers = await getAllUsers();
        let cCount = 0;
        let pCount = 0;
        let sCount = 0;
        allUsers.forEach((u: AppUser) => {
          if (u.role === "CUSTOMER") cCount++;
          else if (u.role === "PROVIDER") pCount++;
          else if (u.role === "ADMIN" || u.role === "SUPER_ADMIN") sCount++;
        });
        setUsersCount({
          total: allUsers.length,
          customers: cCount,
          providers: pCount,
          staff: sCount,
        });

        const pendingKyc = await getPendingProviderApplications();
        setPendingKycCount(pendingKyc.length);
      } catch (err) {
        console.error("Error loading Super Admin stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    return () => {
      unsubSettings();
      unsubPayments();
      unsubPayouts();
      unsubBookings();
      unsubDisputes();
      unsubLogs();
    };
  }, []);

  // Financial aggregates
  const financialMetrics = useMemo(() => {
    const paid = payments.filter((p) => p.status === "PAID");
    const totalGMV = paid.reduce((acc, p) => acc + (p.amountBDT || 0), 0);
    const platformRevenue = Math.round(totalGMV * ((settings?.serviceFeePercentage || 15) / 100));
    const pendingDisbursements = payouts
      .filter((p) => p.status === "REQUESTED" || p.status === "APPROVED")
      .reduce((acc, p) => acc + (p.amountBDT || 0), 0);

    return { totalGMV, platformRevenue, pendingDisbursements };
  }, [payments, payouts, settings]);

  // Emergency Switch handler
  const handleToggleSwitch = async (key: keyof SystemSettings, currentValue: boolean) => {
    setIsUpdatingKillSwitch(String(key));
    setSwitchFeedback(null);
    try {
      const updateFn = httpsCallable<any, any>(functions, "updateSystemSettings");
      await updateFn({
        [key]: !currentValue,
      });
      setSwitchFeedback(`${String(key)} সফলভাবে আপডেট করা হয়েছে।`);
      setTimeout(() => setSwitchFeedback(null), 3000);
    } catch (err: any) {
      console.error(`Failed to update ${String(key)}:`, err);
      setSwitchFeedback(`ব্যর্থ হয়েছে: ${err.message || "ত্রুটি ঘটেছে"}`);
    } finally {
      setIsUpdatingKillSwitch(null);
    }
  };

  const openDisputesCount = disputes.filter((d) => d.status === "OPEN" || d.status === "INVESTIGATING").length;
  const activeBookingsCount = bookings.filter((b) => b.status === "PROVIDER_ACCEPTED" || b.status === "ON_THE_WAY" || b.status === "SERVICE_STARTED").length;

  return (
    <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top Control Bar */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg shadow-amber-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-black tracking-tight text-white">
                    GhorBondhu Super Admin
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    MASTER CONTROL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  প্ল্যাটফর্ম পলিসি, সিস্টেম প্যারামিটার ও সেন্ট্রাল কম্যান্ড সেন্টার
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/super-admin/monitoring"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>সিস্টেম হেলথ</span>
              </Link>
              <Link
                href="/admin-dashboard"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700"
              >
                <span>অপারেশনাল ERP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
          {/* Emergency Notice Banner (If active) */}
          {settings?.emergencyBanner?.active && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              settings.emergencyBanner.type === "ALERT" 
                ? "bg-rose-950/60 border-rose-800 text-rose-200" 
                : settings.emergencyBanner.type === "WARNING"
                ? "bg-amber-950/60 border-amber-800 text-amber-200"
                : "bg-blue-950/60 border-blue-800 text-blue-200"
            }`}>
              <div className="flex items-center space-x-3">
                <Radio className="w-5 h-5 animate-pulse text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">সক্রিয় জরুরি প্ল্যাটফর্ম বিজ্ঞপ্তি:</span>
                  <p className="text-sm font-semibold">{settings.emergencyBanner.message}</p>
                </div>
              </div>
              <Link
                href="/super-admin/settings"
                className="text-xs underline font-bold shrink-0 hover:text-white"
              >
                বিজ্ঞপ্তি এডিট করুন
              </Link>
            </div>
          )}

          {/* Feedback popup */}
          {switchFeedback && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold rounded-xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{switchFeedback}</span>
            </div>
          )}

          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">মোট প্ল্যাটফর্ম GMV</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-3">
                {formatBDT(financialMetrics.totalGMV)}
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>কমিশন রেভিনিউ ({settings?.serviceFeePercentage || 15}%):</span>
                <span className="font-bold text-emerald-400">{formatBDT(financialMetrics.platformRevenue)}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">মোট নিবন্ধিত ব্যবহারকারী</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-3">
                {usersCount.total} জন
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>গ্রাহক: {usersCount.customers}</span>
                <span>প্রোভাইডার: {usersCount.providers}</span>
                <span>অ্যাডমিন: {usersCount.staff}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">চলমান ডিসপ্যাচ ও জব</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-3">
                {activeBookingsCount} টি
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>মোট বুকিং হিস্ট্রি:</span>
                <span className="font-bold text-slate-200">{bookings.length} টি সম্পন্ন</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">অমীমাংসিত অভিযোগ (Disputes)</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  openDisputesCount > 0 
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-black mt-3 ${openDisputesCount > 0 ? "text-rose-400" : "text-white"}`}>
                {openDisputesCount} টি
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>পেন্ডিং কেওয়াইসি: {pendingKycCount}</span>
                <span>পেন্ডিং পেআউট: {payouts.filter(p => p.status === "REQUESTED").length}</span>
              </div>
            </div>
          </div>

          {/* System Kill Switches & Emergency Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Power className="w-5 h-5 text-amber-400" />
                  <span>সিস্টেম ইমার্জেন্সি কন্ট্রোল ও কিল-সুইচ (Kill Switches)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  সার্ভার পর্যায়ে তাৎক্ষণিক পলিসি প্রয়োগ করুন। যেকোনো সুইচ সক্রিয় করলে তৎক্ষণাৎ ক্লায়েন্ট স্তরে কার্যকর হবে।
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>ENVIRONMENT: PRODUCTION-READY</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Switch 1: Maintenance Mode */}
              <div className={`p-5 rounded-2xl border transition-all ${
                settings?.maintenanceMode 
                  ? "bg-rose-950/40 border-rose-700 shadow-lg shadow-rose-950/30" 
                  : "bg-slate-950/60 border-slate-800"
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>মেইনটেন্যান্স মোড</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      অন করলে সাধারণ কাস্টমারদের জন্য বুকিং সাময়িক স্থগিত থাকবে এবং ব্যানার প্রদর্শিত হবে।
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleSwitch("maintenanceMode", !!settings?.maintenanceMode)}
                    disabled={isUpdatingKillSwitch === "maintenanceMode"}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      settings?.maintenanceMode ? "bg-rose-600" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                        settings?.maintenanceMode ? "translate-x-6" : "translate-x-0"
                      } flex items-center justify-center`}
                    >
                      {isUpdatingKillSwitch === "maintenanceMode" && (
                        <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">বর্তমান স্ট্যাটাস:</span>
                  <span className={`font-bold ${settings?.maintenanceMode ? "text-rose-400" : "text-emerald-400"}`}>
                    {settings?.maintenanceMode ? "🔴 সক্রিয় (বুকিং ব্লকড)" : "🟢 নিষ্ক্রিয় (স্বাভাবিক)"}
                  </span>
                </div>
              </div>

              {/* Switch 2: New Registrations */}
              <div className={`p-5 rounded-2xl border transition-all ${
                !settings?.allowNewRegistrations 
                  ? "bg-amber-950/40 border-amber-700 shadow-lg shadow-amber-950/30" 
                  : "bg-slate-950/60 border-slate-800"
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>নতুন ইউজার রেজিস্ট্রেশন</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      অফ করলে নতুন কাস্টমার ও প্রোভাইডার রেজিস্ট্রেশন সাময়িকভাবে বন্ধ থাকবে।
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleSwitch("allowNewRegistrations", !!settings?.allowNewRegistrations)}
                    disabled={isUpdatingKillSwitch === "allowNewRegistrations"}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      settings?.allowNewRegistrations ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                        settings?.allowNewRegistrations ? "translate-x-6" : "translate-x-0"
                      } flex items-center justify-center`}
                    >
                      {isUpdatingKillSwitch === "allowNewRegistrations" && (
                        <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">বর্তমান স্ট্যাটাস:</span>
                  <span className={`font-bold ${settings?.allowNewRegistrations ? "text-emerald-400" : "text-amber-400"}`}>
                    {settings?.allowNewRegistrations ? "🟢 উন্মুক্ত (অনুমোদিত)" : "🟡 ফ্রিজ (নিবন্ধিতরা শুধুমাত্র)"}
                  </span>
                </div>
              </div>

              {/* Switch 3: Auto-Dispatch Engine */}
              <div className="p-5 rounded-2xl border bg-slate-950/60 border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span>অটো-ডিসপ্যাচ অ্যালগরিদম</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      নতুন বুকিং হলে স্বয়ংক্রিয়ভাবে নিকটবর্তী ভেরিফাইড প্রোভাইডারদের কাছে পুশ নোটিফিকেশন পাঠাবে।
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleSwitch("autoDispatchEnabled", !!settings?.autoDispatchEnabled)}
                    disabled={isUpdatingKillSwitch === "autoDispatchEnabled"}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                      settings?.autoDispatchEnabled ? "bg-purple-600" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                        settings?.autoDispatchEnabled ? "translate-x-6" : "translate-x-0"
                      } flex items-center justify-center`}
                    >
                      {isUpdatingKillSwitch === "autoDispatchEnabled" && (
                        <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">বর্তমান স্ট্যাটাস:</span>
                  <span className={`font-bold ${settings?.autoDispatchEnabled ? "text-purple-400" : "text-slate-400"}`}>
                    {settings?.autoDispatchEnabled ? "🟢 সক্রিয় (স্মার্ট ম্যাচিং)" : "⚪ ম্যানুয়াল অ্যাডমিন ডিসপ্যাচ"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Central Governance Modules Grid */}
          <div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-400" />
              <span>সুপার অ্যাডমিন গভর্ন্যান্স ও কনফিগারেশন মডিউলসমূহ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {/* Module 1: Settings */}
              <Link
                href="/super-admin/settings"
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                    প্ল্যাটফর্ম কনফিগারেশন
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    ফি রেট ({settings?.serviceFeePercentage}%), সর্বনিম্ন পেআউট (৳{settings?.minimumWithdrawalLimitBDT}), ক্যান্সেলেশন নিয়মাবলী ও সার্ভিস জোন।
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-bold">
                  <span>কনফিগার করুন</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              {/* Module 2: Audit Logs */}
              <Link
                href="/super-admin/audit"
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                    অডিট ট্রেইল ও সিকিউরিটি
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    সিস্টেমের প্রতিটি রোল পরিবর্তন, আর্থিক লেনদেন, লগইন ও পরিবর্তনসমূহের সম্পূর্ণ টাইমলাইন।
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>লগসমূহ দেখুন</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              {/* Module 3: Promo Codes */}
              <Link
                href="/super-admin/promos"
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Tag className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-pink-400 transition">
                    প্রোমোকোড ও ভাউচার
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    মার্কেটিং ক্যাম্পেইন, ডিসকাউন্ট কুপন তৈরি, লিমিট সেট ও ব্যবহারযোগ্যতা পর্যবেক্ষণ।
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-pink-400 font-bold">
                  <span>কুপন ম্যানেজ করুন</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              {/* Module 4: Disputes & Resolution */}
              <Link
                href="/super-admin/disputes"
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-rose-400 transition">
                    অভিযোগ ও ডিসপিউট
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    কাস্টমার ও প্রোভাইডারের মধ্যে বিরোধ মীমাংসা, রিফান্ড অনুমোদন ও জরিমানা ব্যবস্থাপনা।
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-rose-400 font-bold">
                  <span>অভিযোগ কিউ ({openDisputesCount})</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              {/* Module 5: Health & Telemetry */}
              <Link
                href="/super-admin/monitoring"
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-cyan-400 transition">
                    হেলথ ও লাইভ টেলিমেট্রি
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    ক্লাউড রানটাইম প্রোবিং, টেলিকম SMS গেটওয়ে স্ট্যাটাস, পেমেন্ট আইপিএন অডিট ও এরর ট্র্যাকিং।
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-bold">
                  <span>মনিটরিং কনসোল</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            </div>
          </div>

          {/* Real-time Audit Stream Sneak-peek */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>সর্বশেষ সিস্টেম অডিট ইভেন্টস (Live Stream)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  সার্ভার লেভেলে রেকর্ডকৃত সর্বশেষ ৮টি অ্যাকশন ও সিকিউরিটি লগ
                </p>
              </div>

              <Link
                href="/super-admin/audit"
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center space-x-1"
              >
                <span>সকল লগ দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">এখনো কোনো অডিট রেকর্ড নেই।</p>
            ) : (
              <div className="divide-y divide-slate-800 font-mono text-xs">
                {recentLogs.map((log) => (
                  <div key={log.logId} className="py-2.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.actorRole}
                      </span>
                      <span className="font-bold text-white">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        [{log.resourceType}: {log.resourceId.slice(0, 10)}]
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString("bn-BD")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
