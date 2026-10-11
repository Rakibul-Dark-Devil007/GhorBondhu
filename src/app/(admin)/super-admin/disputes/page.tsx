"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { subscribeToDisputes } from "@/lib/firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { formatBDT } from "@/lib/utils";
import type { Dispute } from "@/types";
import {
  Scale,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  FileText,
  DollarSign,
  User,
  Phone,
  Calendar,
  X,
  ExternalLink,
  MessageSquare
} from "lucide-react";

export default function SuperAdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Resolution Modal State
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [actionStatus, setActionStatus] = useState<"RESOLVED" | "DISMISSED" | "INVESTIGATING">("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "SUCCESS" | "ERROR"; message: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToDisputes(
      (data) => {
        setDisputes(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to disputes:", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBooking = (d.bookingNumber || "").toLowerCase().includes(q) || d.bookingId.toLowerCase().includes(q);
        const matchCustomer = (d.customerName || "").toLowerCase().includes(q) || (d.customerPhone || "").includes(q);
        const matchReason = (d.reason || "").toLowerCase().includes(q);
        return matchBooking || matchCustomer || matchReason;
      }
      return true;
    });
  }, [disputes, statusFilter, searchQuery]);

  const openResolutionModal = (d: Dispute) => {
    setSelectedDispute(d);
    setActionStatus(d.status === "OPEN" ? "RESOLVED" : d.status as any);
    setResolutionNotes(d.resolutionNotes || "");
    setRefundAmount(d.refundAmountBDT || 0);
    setFeedback(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const resolveFn = httpsCallable<any, any>(functions, "resolveDispute");
      await resolveFn({
        disputeId: selectedDispute.disputeId,
        status: actionStatus,
        resolutionNotes,
        refundAmountBDT: refundAmount > 0 ? Number(refundAmount) : undefined,
      });

      setFeedback({ type: "SUCCESS", message: "অভিযোগের সিদ্ধান্ত সফলভাবে সংরক্ষিত হয়েছে!" });
      setTimeout(() => {
        setSelectedDispute(null);
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      console.error("Resolve dispute error:", err);
      setFeedback({ type: "ERROR", message: err.message || "সিদ্ধান্ত সংরক্ষণে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Dispute["status"]) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center w-fit gap-1"><AlertCircle className="w-3 h-3" />উন্মুক্ত</span>;
      case "INVESTIGATING":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center w-fit gap-1"><Clock className="w-3 h-3" />তদন্তাধীন</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center w-fit gap-1"><CheckCircle2 className="w-3 h-3" />মীমাংসিত</span>;
      case "DISMISSED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center w-fit gap-1"><XCircle className="w-3 h-3" />বাতিলকৃত</span>;
    }
  };

  return (
    <AuthGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/super-admin"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="সুপার অ্যাডমিন ড্যাশবোর্ডে ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-rose-400" />
                  <span>গ্রাহক অভিযোগ ও ডিসপিউট রেজোলিউশন কনসোল</span>
                </h1>
                <p className="text-xs text-slate-400">
                  সার্ভিস বিরোধ নিষ্পত্তি, কোয়ালিটি মূল্যায়ন ও ক্ষতিপূরণ ব্যবস্থাপনা
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              TOTAL: {disputes.length} CASES
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="বুকিং নম্বর বা গ্রাহক নাম দিয়ে খুঁজুন..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">স্ট্যাটাস:</span>
              {(["ALL", "OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {st === "ALL" && "সবগুলো"}
                  {st === "OPEN" && "উন্মুক্ত"}
                  {st === "INVESTIGATING" && "তদন্তাধীন"}
                  {st === "RESOLVED" && "মীমাংসিত"}
                  {st === "DISMISSED" && "বাতিল"}
                </button>
              ))}
            </div>
          </div>

          {/* Disputes List */}
          {isLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">অভিযোগ ডেটা লোড হচ্ছে...</p>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center">
              <Scale className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">কোনো অভিযোগ রেকর্ড নেই</h3>
              <p className="text-xs text-slate-500 mt-1">নির্বাচিত ক্যাটাগরিতে কোনো বিরোধ বা অভিযোগ পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((d) => (
                <div
                  key={d.disputeId}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold bg-slate-950 text-brand-400 px-2.5 py-1 rounded-xl border border-slate-800">
                        #{d.bookingNumber || d.bookingId.slice(0, 8)}
                      </span>
                      <h4 className="text-sm font-bold text-white">{d.reason}</h4>
                    </div>

                    <div className="flex items-center space-x-3">
                      {getStatusBadge(d.status)}
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(d.createdAt).toLocaleString("bn-BD")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">অভিযোগকারী গ্রাহক</span>
                      <p className="text-slate-200 font-bold">{d.customerName || "অজ্ঞাত গ্রাহক"}</p>
                      <p className="text-slate-400 font-mono">{d.customerPhone || "ফোন নেই"}</p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">অভিযুক্ত প্রোভাইডার</span>
                      <p className="text-slate-200 font-bold">{d.providerName || "নির্ধারিত প্রোভাইডার"}</p>
                      <p className="text-slate-400 font-mono text-[11px]">ID: {d.providerId ? d.providerId.slice(0, 8) : "—"}...</p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 space-y-1">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">ক্ষতিপূরণ / রিফান্ড</span>
                      <p className="text-emerald-400 font-bold text-sm">
                        {d.refundAmountBDT ? formatBDT(d.refundAmountBDT) : "কোনো রিফান্ড নেই"}
                      </p>
                      {d.resolvedAt && (
                        <p className="text-slate-500 text-[10px]">
                          নিষ্পত্তি: {new Date(d.resolvedAt).toLocaleDateString("bn-BD")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850 text-xs">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">গ্রাহকের বিবরণ:</span>
                    <p className="text-slate-300 leading-relaxed italic">&ldquo;{d.description}&rdquo;</p>
                  </div>

                  {d.resolutionNotes && (
                    <div className="p-3.5 bg-emerald-950/30 rounded-2xl border border-emerald-900/60 text-xs">
                      <span className="text-emerald-400 block text-[10px] font-bold uppercase mb-1">কর্তৃপক্ষের সিদ্ধান্ত নোট:</span>
                      <p className="text-emerald-200 leading-relaxed">{d.resolutionNotes}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <Link
                      href={`/admin/bookings`}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold"
                    >
                      <span>বুকিং হিস্ট্রি দেখুন</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => openResolutionModal(d)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-rose-600/20"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{d.status === "OPEN" ? "সিদ্ধান্ত গ্রহণ করুন" : "সিদ্ধান্ত পরিবর্তন করুন"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Resolution Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-rose-400">
                  <Scale className="w-5 h-5" />
                  <h3 className="font-bold text-white text-base">বিরোধ নিষ্পত্তি ও রায়</h3>
                </div>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 border ${
                    feedback.type === "SUCCESS"
                      ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                      : "bg-rose-950/80 border-rose-700 text-rose-300"
                  }`}
                >
                  {feedback.type === "SUCCESS" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">মীমাংসা স্ট্যাটাস</label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  >
                    <option value="RESOLVED">মীমাংসিত (RESOLVED - গ্রাহক সন্তুষ্ট / ক্ষতিপূরণ)</option>
                    <option value="INVESTIGATING">তদন্তাধীন (INVESTIGATING - অতিরিক্ত তথ্য চাওয়া হয়েছে)</option>
                    <option value="DISMISSED">বাতিলকৃত (DISMISSED - অভিযোগ ভিত্তিহীন)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    গ্রাহকের ক্ষতিপূরণ / রিফান্ড পরিমাণ (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">প্রযোজ্য না হলে ০ রাখুন।</p>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    কর্তৃপক্ষের রায়ের বিবরণ / নোট <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="উভয়পক্ষের বক্তব্য যাচাই শেষে গৃহীত সিদ্ধান্ত এবং সংশ্লিষ্ট প্রোভাইডার/গ্রাহককে প্রেরিত নোটিশ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition font-semibold"
                  >
                    বন্ধ করুন
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <span>রায় চূড়ান্ত করুন</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
