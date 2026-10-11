"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  Megaphone, 
  Users,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { subscribeToAllSmsLogs } from "@/lib/firebase/db";
import { formatRelativeTimeBn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { SmsLog } from "@/types";

export default function AdminCommunicationsPage() {
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Broadcast state
  const [targetAudience, setTargetAudience] = useState<"ALL" | "CUSTOMERS" | "PROVIDERS">("ALL");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Inspector state
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllSmsLogs(
      (logs) => {
        setSmsLogs(logs);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to SMS logs:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setBroadcastError("অনুগ্রহ করে নোটিফিকেশনের শিরোনাম ও বার্তা উভয়ই পূরণ করুন।");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastSuccess(null);
    setBroadcastError(null);

    try {
      const broadcastFn = httpsCallable<any, any>(functions, "sendBroadcastNotification");
      const res = await broadcastFn({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        targetAudience,
      });

      if (res.data?.success) {
        setBroadcastSuccess(
          `ঘোষণাটি সফলভাবে প্রেরণ করা হয়েছে! মোট ${res.data.recipientCount || 0} জন ব্যবহারকারীকে নোটিফিকেশন পাঠানো হয়েছে।`
        );
        setBroadcastTitle("");
        setBroadcastBody("");
      } else {
        setBroadcastError("ব্রডকাস্ট প্রেরণ সম্পন্ন করা যায়নি।");
      }
    } catch (err: any) {
      console.error("Broadcast error:", err);
      setBroadcastError(err.message || "ব্রডকাস্ট প্রেরণকালে ত্রুটি ঘটেছে।");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filter SMS Logs
  const filteredLogs = smsLogs.filter((log) => {
    if (searchPhone.trim()) {
      if (!log.recipientPhone?.toLowerCase().includes(searchPhone.trim().toLowerCase())) {
        return false;
      }
    }

    if (providerFilter !== "ALL" && log.provider !== providerFilter) {
      return false;
    }

    if (statusFilter !== "ALL" && log.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const totalLogs = smsLogs.length;
  const sentCount = smsLogs.filter((l) => l.status === "SENT" || l.status === "SIMULATED").length;
  const failedCount = smsLogs.filter((l) => l.status === "FAILED").length;
  const simulatedCount = smsLogs.filter((l) => l.provider === "MOCK_DEV").length;

  const formatBnDigits = (n: number) => {
    return n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d, 10)]);
  };

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        {/* Admin Header */}
        <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/admin-dashboard"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="ড্যাশবোর্ডে ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-bold text-white text-base">কমিউনিকেশন ও এসএমএস অডিট গেটওয়ে</h1>
                  <span className="block text-[10px] text-amber-400 font-mono uppercase tracking-wider">
                    Automated Notifications & Telecom Gateway
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell className="text-slate-300" />
              <Link
                href="/admin-dashboard"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                অ্যাডমিন কনসোল
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">মোট প্রেরিত এসএমএস</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {formatBnDigits(totalLogs)} টি
              </p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">সফল ডেলিভারি</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                {formatBnDigits(sentCount)} টি
              </p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">ব্যর্থ বার্তা</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-400 mt-2">
                {formatBnDigits(failedCount)} টি
              </p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">মক/সিমুলেটেড লগ</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-2">
                {formatBnDigits(simulatedCount)} টি
              </p>
            </div>
          </div>

          {/* Section 1: System Broadcast Broadcaster */}
          <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">প্ল্যাটফর্ম ব্রডকাস্ট ও জরুরি নোটিশ</h2>
                <p className="text-xs text-slate-400">
                  গ্রাহক বা সার্ভিস পার্টনারদের কাছে রিয়েল-টাইম ইন-অ্যাপ ঘোষণা ও জরুরি নির্দেশনা প্রেরণ করুন।
                </p>
              </div>
            </div>

            {broadcastSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            {broadcastError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{broadcastError}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    টার্গেট অডিয়েন্স (প্রাপক)
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">সকল নিবন্ধিত ব্যবহারকারী (কাস্টমার ও প্রোভাইডার)</option>
                    <option value="CUSTOMERS">শুধুমাত্র গ্রাহকগণ (Customers Only)</option>
                    <option value="PROVIDERS">শুধুমাত্র সার্ভিস পার্টনারগণ (Providers Only)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ঘোষণার শিরোনাম
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="উদাঃ ঈদুল ফিতরের বিশেষ সার্ভিস ডিসকাউন্ট অফার"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  বার্তার বিস্তারিত বিবরণ
                </label>
                <textarea
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  rows={3}
                  placeholder="ব্যবহারকারীদের জন্য আপনার বার্তা বিস্তারিত লিখুন..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBroadcasting ? "প্রেরণ করা হচ্ছে..." : "ব্রডকাস্ট নোটিফিকেশন পাঠান"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Telecom & SMS Logs Audit */}
          <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>টেলিকম ও এসএমএস ডেলিভারি অডিট ট্রেইল</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                    LIVE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  SSL Wireless, Greenweb ও Mock Dev গেটওয়ের মাধ্যমে প্রেরিত সকল এসএমএস ও ওটিপি লগ ট্র্যাক করুন।
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ফোন নম্বর দিয়ে খুঁজুন..."
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44"
                  />
                </div>

                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">সকল গেটওয়ে</option>
                  <option value="SSL_WIRELESS">SSL Wireless</option>
                  <option value="GREENWEB">Greenweb</option>
                  <option value="MOCK_DEV">Mock Dev (Staging)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">সকল স্ট্যাটাস</option>
                  <option value="SENT">SENT (সফল)</option>
                  <option value="SIMULATED">SIMULATED (মক)</option>
                  <option value="FAILED">FAILED (ব্যর্থ)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                <p className="text-xs">এসএমএস লগ লোড হচ্ছে...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">কোনো এসএমএস লগ রেকর্ড পাওয়া যায়নি</p>
                <p className="text-xs text-slate-400 mt-1">
                  বুকিং তৈরি বা স্ট্যাটাস আপডেটের সময় স্বয়ংক্রিয়ভাবে এসএমএস লগ রেকর্ড হবে।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">প্রাপকের ফোন</th>
                      <th className="px-4 py-3">টাইপ ও বুকিং</th>
                      <th className="px-4 py-3">মেসেজের বিষয়বস্তু</th>
                      <th className="px-4 py-3">গেটওয়ে</th>
                      <th className="px-4 py-3">স্ট্যাটাস</th>
                      <th className="px-4 py-3">সময়</th>
                      <th className="px-4 py-3 text-right">ডিটেইলস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {filteredLogs.map((log) => {
                      const isSim = log.provider === "MOCK_DEV" || log.status === "SIMULATED";
                      const isSent = log.status === "SENT";

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                            {log.recipientPhone}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                              {log.type}
                            </span>
                            {log.bookingId && (
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                #{log.bookingId.slice(0, 8)}...
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={log.message}>
                            {log.message}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[11px] font-medium text-slate-300">
                              {log.provider}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isSent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                SENT
                              </span>
                            ) : isSim ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                SIMULATED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                FAILED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-400">
                            {formatRelativeTimeBn(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition"
                            >
                              ভিউ পে-লোড
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal / Inspector for Gateway Response */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>টেলিকম পে-লোড ও রেসপন্স ইন্সপেক্টর</span>
                  </h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">প্রাপক:</label>
                    <p className="font-mono text-white mt-0.5">{selectedLog.recipientPhone}</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">মেসেজ কনটেন্ট:</label>
                    <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                      {selectedLog.message}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">গেটওয়ে রেসপন্স অবজেক্ট:</label>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] overflow-x-auto mt-1">
                      {JSON.stringify(selectedLog.gatewayResponse || { status: selectedLog.status, provider: selectedLog.provider }, null, 2)}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="font-semibold text-slate-300">টাইমস্ট্যাম্প: </span>
                      {selectedLog.timestamp}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">গেটওয়ে প্রোভাইডার: </span>
                      {selectedLog.provider}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
