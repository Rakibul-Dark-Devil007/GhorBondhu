"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { subscribeToAllPayments, subscribeToAllPayouts } from "@/lib/firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { formatBDT } from "@/lib/utils";
import type { Payment, PayoutRequest, PaymentMethod, PaymentStatus, PayoutStatus } from "@/types";
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  Loader2,
  Check,
  X,
  TrendingUp,
  Receipt,
  Building2,
  Layers
} from "lucide-react";

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"PAYOUTS" | "PAYMENTS">("PAYOUTS");

  // Filters & Search for Payouts
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutStatus | "ALL">("ALL");
  const [payoutSearch, setPayoutSearch] = useState("");

  // Filters & Search for Payments
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");

  // Modal State for Payout Action (Approve / Reject)
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [txnReference, setTxnReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Real-time subscriptions
  useEffect(() => {
    setIsLoadingPayments(true);
    const unsubPayments = subscribeToAllPayments(
      (data) => {
        setPayments(data);
        setIsLoadingPayments(false);
      },
      (err) => {
        console.error("Error subscribing to payments:", err);
        setIsLoadingPayments(false);
      }
    );

    setIsLoadingPayouts(true);
    const unsubPayouts = subscribeToAllPayouts(
      (data) => {
        setPayouts(data);
        setIsLoadingPayouts(false);
      },
      (err) => {
        console.error("Error subscribing to payouts:", err);
        setIsLoadingPayouts(false);
      }
    );

    return () => {
      unsubPayments();
      unsubPayouts();
    };
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const paidPayments = payments.filter((p) => p.status === "PAID");
    const totalGMV = paidPayments.reduce((acc, p) => acc + (p.amountBDT || 0), 0);
    // Estimated platform revenue (15% standard commission)
    const platformRevenue = Math.round(totalGMV * 0.15);

    const pendingPayouts = payouts.filter((p) => p.status === "REQUESTED" || p.status === "APPROVED");
    const pendingPayoutAmount = pendingPayouts.reduce((acc, p) => acc + (p.amountBDT || 0), 0);

    const processedPayouts = payouts.filter((p) => p.status === "PROCESSED");
    const processedPayoutAmount = processedPayouts.reduce((acc, p) => acc + (p.amountBDT || 0), 0);

    return {
      totalGMV,
      platformRevenue,
      pendingPayoutAmount,
      pendingPayoutCount: pendingPayouts.length,
      processedPayoutAmount,
      processedPayoutCount: processedPayouts.length,
      totalPaymentsCount: payments.length,
    };
  }, [payments, payouts]);

  // Filtered Payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (payoutStatusFilter !== "ALL" && p.status !== payoutStatusFilter) return false;
      if (payoutSearch.trim()) {
        const query = payoutSearch.toLowerCase();
        const matchId = (p.payoutId || "").toLowerCase().includes(query);
        const matchProvider = (p.providerId || "").toLowerCase().includes(query);
        const matchPhone = (p.providerPhone || "").toLowerCase().includes(query);
        const accNum = p.accountNumber || p.accountDetails?.accountNumber || "";
        const accName = p.accountName || p.accountDetails?.accountName || "";
        const matchAccount = accNum.toLowerCase().includes(query);
        const matchName = accName.toLowerCase().includes(query);
        return matchId || matchProvider || matchPhone || matchAccount || matchName;
      }
      return true;
    });
  }, [payouts, payoutStatusFilter, payoutSearch]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentStatusFilter !== "ALL" && p.status !== paymentStatusFilter) return false;
      if (paymentMethodFilter !== "ALL" && p.paymentMethod !== paymentMethodFilter) return false;
      if (paymentSearch.trim()) {
        const query = paymentSearch.toLowerCase();
        const matchPayId = (p.paymentId || "").toLowerCase().includes(query);
        const matchBooking = (p.bookingId || "").toLowerCase().includes(query);
        const matchTxn = (p.gatewayTransactionId || "").toLowerCase().includes(query);
        const matchCustomer = (p.customerId || "").toLowerCase().includes(query);
        return matchPayId || matchBooking || matchTxn || matchCustomer;
      }
      return true;
    });
  }, [payments, paymentStatusFilter, paymentMethodFilter, paymentSearch]);

  // Open Action Modal
  const openActionModal = (payout: PayoutRequest, action: "APPROVE" | "REJECT") => {
    setSelectedPayout(payout);
    setModalAction(action);
    setActionError(null);
    setActionSuccess(null);
    if (action === "APPROVE") {
      setTxnReference(`${payout.payoutMethod}_TXN_${Date.now().toString().slice(-6)}`);
    } else {
      setRejectionReason("");
    }
  };

  const closeActionModal = () => {
    setSelectedPayout(null);
    setModalAction(null);
    setTxnReference("");
    setRejectionReason("");
    setActionError(null);
    setActionSuccess(null);
  };

  // Submit Payout Approval or Rejection
  const handleSubmitPayoutAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !modalAction) return;

    setIsProcessingAction(true);
    setActionError(null);

    try {
      const processFn = httpsCallable<any, any>(functions, "processAdminPayout");
      await processFn({
        payoutId: selectedPayout.payoutId,
        action: modalAction,
        transactionReference: modalAction === "APPROVE" ? txnReference : undefined,
        rejectionReason: modalAction === "REJECT" ? rejectionReason : undefined,
      });

      setActionSuccess(
        modalAction === "APPROVE"
          ? "পে-আউট সফলভাবে অনুমোদন ও বিতরণ করা হয়েছে!"
          : "পে-আউট অনুরোধ বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।"
      );

      setTimeout(() => {
        closeActionModal();
      }, 1500);
    } catch (err: any) {
      console.error("Payout action failed:", err);
      setActionError(err.message || "অপারেশন সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getMethodBadge = (method: PaymentMethod | string) => {
    switch (method) {
      case "BKASH":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700">bKash</span>;
      case "NAGAD":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Nagad</span>;
      case "SSLCOMMERZ":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">SSLCommerz / Card</span>;
      case "CASH_ON_DELIVERY":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Cash on Delivery</span>;
      case "BANK_TRANSFER":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Bank Transfer</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{method}</span>;
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "PAID":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />পরিশোধিত</span>;
      case "PENDING":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" />অপেক্ষমাণ</span>;
      case "INITIATED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />শুরু হয়েছে</span>;
      case "FAILED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />ব্যর্থ</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"><AlertCircle className="w-3 h-3 mr-1" />বাতিল</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const getPayoutStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case "REQUESTED":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5 mr-1" />অনুরোধকৃত (কিউ)</span>;
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><Check className="w-3.5 h-3.5 mr-1" />অনুমোদিত</span>;
      case "PROCESSED":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />বিতরণ সম্পন্ন</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"><XCircle className="w-3.5 h-3.5 mr-1" />বাতিল করা হয়েছে</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Header */}
        <header className="bg-slate-900 text-white sticky top-0 z-30 border-b border-slate-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/admin-dashboard"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="ড্যাশবোর্ডে ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>আর্থিক লেজার ও রেভিনিউ কনসোল</span>
                </h1>
                <span className="text-[11px] text-slate-400">
                  পেমেন্ট গেটওয়ে, প্রোভাইডার পেআউট কিউ ও প্ল্যাটফর্ম ক্যাশ ফ্লো
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                রিয়েল-টাইম অডিট
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট লেনদেন (GMV)</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">
                {formatBDT(metrics.totalGMV)}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>পরিশোধিত বুকিং সংখ্যা</span>
                <span className="font-semibold text-slate-700">{payments.filter(p => p.status === "PAID").length} টি</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">প্ল্যাটফর্ম কমিশন আয়</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-3">
                {formatBDT(metrics.platformRevenue)}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>স্ট্যান্ডার্ড ফি রেট</span>
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">১৫% ফ্ল্যাট</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">অপেক্ষমাণ পেআউট</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-3">
                {formatBDT(metrics.pendingPayoutAmount)}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>অনুরোধ সংখ্যা</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  {metrics.pendingPayoutCount} টি পেন্ডিং
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট বিতরিত পেআউট</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 mt-3">
                {formatBDT(metrics.processedPayoutAmount)}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>সম্পন্ন লেনদেন</span>
                <span className="font-semibold text-slate-700">{metrics.processedPayoutCount} টি</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("PAYOUTS")}
              className={`pb-4 px-6 font-bold text-sm flex items-center space-x-2 border-b-2 transition ${
                activeTab === "PAYOUTS"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>প্রোভাইডার পেআউট কিউ ও অনুমোদন</span>
              {metrics.pendingPayoutCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-black animate-pulse">
                  {metrics.pendingPayoutCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("PAYMENTS")}
              className={`pb-4 px-6 font-bold text-sm flex items-center space-x-2 border-b-2 transition ${
                activeTab === "PAYMENTS"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>গ্রাহক পেমেন্ট ও লেনদেন লেজার</span>
              <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-semibold">
                {payments.length}
              </span>
            </button>
          </div>

          {/* TAB 1: PAYOUTS QUEUE */}
          {activeTab === "PAYOUTS" && (
            <div className="space-y-6">
              {/* Payouts Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    placeholder="প্রোভাইডার আইডি, ফোন বা অ্যাকাউন্ট খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs font-semibold text-slate-500 flex items-center whitespace-nowrap">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    স্ট্যাটাস ফিল্টার:
                  </span>
                  {(["ALL", "REQUESTED", "APPROVED", "PROCESSED", "REJECTED"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setPayoutStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        payoutStatusFilter === st
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st === "ALL" && "সবগুলো"}
                      {st === "REQUESTED" && "অনুরোধকৃত"}
                      {st === "APPROVED" && "অনুমোদিত"}
                      {st === "PROCESSED" && "বিতরিত"}
                      {st === "REJECTED" && "বাতিল"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payouts Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoadingPayouts ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">পেআউট তথ্য লোড হচ্ছে...</p>
                  </div>
                ) : filteredPayouts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">কোনো পেআউট রেকর্ড পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 mt-1">নির্বাচিত ফিল্টারের সাথে মেলানো কোনো উত্তোলনের অনুরোধ নেই।</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                          <th className="py-3.5 px-4">আইডি ও তারিখ</th>
                          <th className="py-3.5 px-4">প্রোভাইডার</th>
                          <th className="py-3.5 px-4">মেথড ও অ্যাকাউন্ট</th>
                          <th className="py-3.5 px-4">পরিমাণ (BDT)</th>
                          <th className="py-3.5 px-4">স্ট্যাটাস</th>
                          <th className="py-3.5 px-4">রেফারেন্স / নোট</th>
                          <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayouts.map((p) => {
                          const isPending = p.status === "REQUESTED" || p.status === "APPROVED";
                          return (
                            <tr key={p.payoutId} className="hover:bg-slate-50/80 transition">
                              <td className="py-4 px-4">
                                <div className="font-mono text-xs font-semibold text-slate-800">
                                  {p.payoutId.slice(0, 10)}...
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {new Date(p.requestedAt).toLocaleString("bn-BD", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-semibold text-slate-900 text-xs">
                                  {p.providerPhone || "ফোন নেই"}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  ID: {p.providerId.slice(0, 8)}...
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {getMethodBadge(p.payoutMethod)}
                                </div>
                                <div className="text-xs font-mono font-medium text-slate-800">
                                  {p.accountNumber || p.accountDetails?.accountNumber || "—"}
                                </div>
                                {(p.accountName || p.accountDetails?.accountName) && (
                                  <div className="text-[11px] text-slate-500">
                                    {p.accountName || p.accountDetails?.accountName} {(p.bankName || p.accountDetails?.bankName) ? `(${p.bankName || p.accountDetails?.bankName})` : ""}
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-4">
                                <span className="font-black text-slate-900 text-base">
                                  {formatBDT(p.amountBDT)}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                {getPayoutStatusBadge(p.status)}
                              </td>

                              <td className="py-4 px-4 max-w-xs">
                                {p.status === "PROCESSED" && p.transactionReference && (
                                  <div className="text-xs">
                                    <span className="text-[11px] text-slate-500 block">রেফারেন্স নং:</span>
                                    <code className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {p.transactionReference}
                                    </code>
                                  </div>
                                )}
                                {p.status === "REJECTED" && p.rejectionReason && (
                                  <div className="text-xs text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100">
                                    <span className="font-bold">কারণ:</span> {p.rejectionReason}
                                  </div>
                                )}
                                {isPending && (
                                  <span className="text-xs text-slate-400 italic">পর্যালোচনার জন্য অপেক্ষমাণ</span>
                                )}
                              </td>

                              <td className="py-4 px-4 text-right">
                                {isPending ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openActionModal(p, "APPROVE")}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>অনুমোদন</span>
                                    </button>
                                    <button
                                      onClick={() => openActionModal(p, "REJECT")}
                                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-1 transition"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>বাতিল</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium">সম্পন্ন</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS LEDGER */}
          {activeTab === "PAYMENTS" && (
            <div className="space-y-6">
              {/* Payments Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="পেমেন্ট আইডি, বুকিং আইডি বা ট্রানজ্যাকশন খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500">মেথড:</span>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ALL">সব মেথড</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="SSLCOMMERZ">SSLCommerz / Card</option>
                      <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500">স্ট্যাটাস:</span>
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ALL">সব স্ট্যাটাস</option>
                      <option value="PAID">পরিশোধিত (Paid)</option>
                      <option value="PENDING">অপেক্ষমাণ (Pending)</option>
                      <option value="INITIATED">শুরু হয়েছে (Initiated)</option>
                      <option value="FAILED">ব্যর্থ (Failed)</option>
                      <option value="CANCELLED">বাতিল (Cancelled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoadingPayments ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">গ্রাহক পেমেন্ট রেকর্ড লোড হচ্ছে...</p>
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="p-12 text-center">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 mt-1">নির্বাচিত ফিল্টারের সাথে মেলানো কোনো গ্রাহক লেনদেন নেই।</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                          <th className="py-3.5 px-4">পেমেন্ট আইডি ও তারিখ</th>
                          <th className="py-3.5 px-4">বুকিং রেফারেন্স</th>
                          <th className="py-3.5 px-4">পেমেন্ট মেথড</th>
                          <th className="py-3.5 px-4">পরিমাণ (BDT)</th>
                          <th className="py-3.5 px-4">স্ট্যাটাস</th>
                          <th className="py-3.5 px-4">গেটওয়ে ট্রানজ্যাকশন আইডি</th>
                          <th className="py-3.5 px-4 text-right">লিঙ্ক</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((p) => (
                          <tr key={p.paymentId} className="hover:bg-slate-50/80 transition">
                            <td className="py-4 px-4">
                              <div className="font-mono text-xs font-semibold text-slate-900">
                                {p.paymentId.slice(0, 12)}...
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(p.createdAt).toLocaleString("bn-BD", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-mono text-xs font-semibold text-brand-600">
                                #{p.bookingId.slice(0, 8)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                গ্রাহক ID: {p.customerId.slice(0, 8)}...
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {getMethodBadge(p.paymentMethod)}
                            </td>

                            <td className="py-4 px-4">
                              <span className="font-black text-slate-900 text-base">
                                {formatBDT(p.amountBDT)}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              {getPaymentStatusBadge(p.status)}
                            </td>

                            <td className="py-4 px-4">
                              {p.gatewayTransactionId ? (
                                <code className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                  {p.gatewayTransactionId}
                                </code>
                              ) : (
                                <span className="text-xs text-slate-400 italic">প্রযোজ্য নয়</span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right">
                              <Link
                                href={`/admin/bookings`}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                              >
                                বুকিং দেখুন
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* APPROVE / REJECT MODAL */}
        {selectedPayout && modalAction && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className={`p-6 text-white ${modalAction === "APPROVE" ? "bg-emerald-600" : "bg-red-600"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {modalAction === "APPROVE" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                    <h3 className="font-bold text-lg">
                      {modalAction === "APPROVE" ? "পে-আউট অনুমোদন ও বিতরণ" : "পে-আউট অনুরোধ বাতিল"}
                    </h3>
                  </div>
                  <button
                    onClick={closeActionModal}
                    disabled={isProcessingAction}
                    className="p-1.5 hover:bg-black/10 rounded-full transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-white/80 mt-1">
                  {modalAction === "APPROVE"
                    ? "ব্যাংক বা এমএফএস অ্যাকাউন্টে অর্থ প্রেরণের পর ট্রানজ্যাকশন আইডি প্রদান করুন।"
                    : "বাতিলের কারণ উল্লেখ করুন। প্রোভাইডারের ওয়ালেটে টাকা ফেরত চলে যাবে।"}
                </p>
              </div>

              <form onSubmit={handleSubmitPayoutAction} className="p-6 space-y-4">
                {/* Summary Info Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">অনুরোধকৃত অর্থ:</span>
                    <span className="font-black text-slate-900 text-sm">{formatBDT(selectedPayout.amountBDT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মেথড:</span>
                    <span className="font-bold text-slate-800">{selectedPayout.payoutMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">অ্যাকাউন্ট নং:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPayout.accountNumber || selectedPayout.accountDetails?.accountNumber || "—"}</span>
                  </div>
                  {(selectedPayout.accountName || selectedPayout.accountDetails?.accountName) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">অ্যাকাউন্ট হোল্ডার:</span>
                      <span className="font-semibold text-slate-800">{selectedPayout.accountName || selectedPayout.accountDetails?.accountName}</span>
                    </div>
                  )}
                </div>

                {modalAction === "APPROVE" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      বিতরণ ট্রানজ্যাকশন আইডি / রেফারেন্স নম্বর <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={txnReference}
                      onChange={(e) => setTxnReference(e.target.value)}
                      placeholder="যেমন: BKASH_TRX_9823412"
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      এই রেফারেন্স নম্বরটি প্রোভাইডারের কাছে এসএমএস ও নোটিফিকেশনে পাঠানো হবে।
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      বাতিল করার কারণ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="যেমন: ভুল অ্যাকাউন্ট নম্বর প্রদান করা হয়েছে..."
                      className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeActionModal}
                    disabled={isProcessingAction}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                  >
                    বন্ধ করুন
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessingAction || !!actionSuccess}
                    className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm flex items-center space-x-1.5 transition ${
                      modalAction === "APPROVE"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    } disabled:opacity-50`}
                  >
                    {isProcessingAction ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>প্রসেসিং হচ্ছে...</span>
                      </>
                    ) : (
                      <span>{modalAction === "APPROVE" ? "অনুমোদন ও সম্পূর্ণ করুন" : "বাতিল নিশ্চিত করুন"}</span>
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
