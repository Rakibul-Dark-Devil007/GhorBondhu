"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { subscribeToPromoCodes } from "@/lib/firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { formatBDT } from "@/lib/utils";
import type { PromoCode } from "@/types";
import {
  Tag,
  ArrowLeft,
  Plus,
  Trash2,
  Power,
  Clock,
  Percent,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Search,
  Calendar
} from "lucide-react";

export default function SuperAdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [newValue, setNewValue] = useState(10);
  const [newMaxDiscount, setNewMaxDiscount] = useState(200);
  const [newMinBooking, setNewMinBooking] = useState(500);
  const [newUsageLimit, setNewUsageLimit] = useState(100);
  const [newExpiryDays, setNewExpiryDays] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "SUCCESS" | "ERROR"; message: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToPromoCodes(
      (data) => {
        setPromos(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to promos:", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleTogglePromo = async (promoId: string) => {
    try {
      const manageFn = httpsCallable<any, any>(functions, "managePromoCode");
      await manageFn({ action: "TOGGLE", promoId });
    } catch (err: any) {
      console.error("Toggle error:", err);
      alert(err.message || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।");
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রোমোকোডটি মুছে ফেলতে চান?")) return;
    try {
      const manageFn = httpsCallable<any, any>(functions, "managePromoCode");
      await manageFn({ action: "DELETE", promoId });
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "মুছে ফেলা ব্যর্থ হয়েছে।");
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const manageFn = httpsCallable<any, any>(functions, "managePromoCode");
      const expiresAt = new Date(Date.now() + newExpiryDays * 24 * 60 * 60 * 1000).toISOString();

      await manageFn({
        action: "CREATE",
        code: newCode.trim().toUpperCase(),
        description: newDesc,
        discountType: newType,
        discountValue: Number(newValue),
        maxDiscountBDT: Number(newMaxDiscount),
        minBookingAmountBDT: Number(newMinBooking),
        usageLimit: Number(newUsageLimit),
        expiresAt,
      });

      setFeedback({ type: "SUCCESS", message: "নতুন প্রোমোকোড সফলভাবে তৈরি করা হয়েছে!" });
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFeedback(null);
        setNewCode("");
        setNewDesc("");
      }, 1500);
    } catch (err: any) {
      console.error("Create error:", err);
      setFeedback({ type: "ERROR", message: err.message || "প্রোমোকোড তৈরিতে ত্রুটি ঘটেছে।" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPromos = promos.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.code.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
  });

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
                  <Tag className="w-5 h-5 text-pink-400" />
                  <span>প্রোমোকোড ও ডিসকাউন্ট ভাউচার কনসোল</span>
                </h1>
                <p className="text-xs text-slate-400">
                  মার্কেটিং কুপন তৈরি, ব্যবহার সীমা ও মেয়াদ নিয়ন্ত্রণ
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-pink-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কুপন কোড</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="প্রোমোকোড বা বিবরণ দিয়ে খুঁজুন..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-semibold hidden sm:block">
              মোট কুপন: {promos.length} টি
            </div>
          </div>

          {/* Promos Grid */}
          {isLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">কুপন ডেটা লোড হচ্ছে...</p>
            </div>
          ) : filteredPromos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center">
              <Tag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">কোনো প্রোমোকোড তৈরি করা হয়নি</h3>
              <p className="text-xs text-slate-500 mt-1">মার্কেটিং ক্যাম্পেইনের জন্য নতুন কুপন যোগ করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPromos.map((p) => {
                const isExpired = new Date(p.expiresAt).getTime() < Date.now();
                return (
                  <div
                    key={p.promoId}
                    className={`bg-slate-900 border rounded-3xl p-6 transition flex flex-col justify-between ${
                      p.isActive && !isExpired
                        ? "border-slate-800 shadow-md shadow-pink-950/10"
                        : "border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xl font-black text-white tracking-wider bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 inline-block">
                            {p.code}
                          </span>
                          {p.description && (
                            <p className="text-xs text-slate-400 mt-2">{p.description}</p>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            !p.isActive
                              ? "bg-slate-800 text-slate-400"
                              : isExpired
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}
                        >
                          {!p.isActive ? "নিষ্ক্রিয়" : isExpired ? "মেয়াদোত্তীর্ণ" : "সক্রিয়"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/80">
                          <span className="text-slate-500">ডিসকাউন্ট পরিমাণ:</span>
                          <span className="font-bold text-pink-400">
                            {p.discountType === "PERCENTAGE" ? `${p.discountValue}% ছাড়` : formatBDT(p.discountValue)}
                          </span>
                        </div>
                        {p.maxDiscountBDT > 0 && (
                          <div className="flex justify-between py-1 border-b border-slate-800/80">
                            <span className="text-slate-500">সর্বোচ্চ ছাড়:</span>
                            <span className="font-bold text-slate-300">{formatBDT(p.maxDiscountBDT)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-slate-800/80">
                          <span className="text-slate-500">সর্বনিম্ন বুকিং:</span>
                          <span className="font-bold text-slate-300">{formatBDT(p.minBookingAmountBDT)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/80">
                          <span className="text-slate-500">ব্যবহার সংখ্যা:</span>
                          <span className="font-mono font-bold text-slate-300">
                            {p.usedCount} / {p.usageLimit}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">মেয়াদ শেষ:</span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(p.expiresAt).toLocaleDateString("bn-BD")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleTogglePromo(p.promoId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                          p.isActive
                            ? "bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60"
                            : "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{p.isActive ? "পজ করুন" : "সক্রিয় করুন"}</span>
                      </button>

                      <button
                        onClick={() => handleDeletePromo(p.promoId)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-pink-400">
                  <Tag className="w-5 h-5" />
                  <h3 className="font-bold text-white text-base">নতুন প্রোমোকোড তৈরি করুন</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
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

              <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    কুপন কোড (বড় হাতের অক্ষরে) <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="যেমন: WELCOME50, EID2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">বিবরণ / ক্যাম্পেইন নাম</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="যেমন: নতুন গ্রাহকদের জন্য প্রথম অর্ডারে ১০% ছাড়"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">ডিসকাউন্ট টাইপ</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="PERCENTAGE">শতাংশ (%)</option>
                      <option value="FIXED_AMOUNT">নির্দিষ্ট টাকা (৳)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      মান ({newType === "PERCENTAGE" ? "%" : "৳"}) <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newValue}
                      onChange={(e) => setNewValue(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">সর্বোচ্চ ছাড় (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={newMaxDiscount}
                      onChange={(e) => setNewMaxDiscount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">সর্বনিম্ন অর্ডার মূল্য (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={newMinBooking}
                      onChange={(e) => setNewMinBooking(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">ব্যবহারের সর্বোচ্চ সীমা</label>
                    <input
                      type="number"
                      min={1}
                      value={newUsageLimit}
                      onChange={(e) => setNewUsageLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">মেয়াদের দিন সংখ্যা</label>
                    <input
                      type="number"
                      min={1}
                      value={newExpiryDays}
                      onChange={(e) => setNewExpiryDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition font-semibold"
                  >
                    বাতিল
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>তৈরি হচ্ছে...</span>
                      </>
                    ) : (
                      <span>কুপন কোড সংরক্ষণ করুন</span>
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
