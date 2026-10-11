"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/firebase/auth";
import { 
  subscribeToProviderProfile, 
  subscribeToProviderApplication,
  subscribeToOpenJobs,
  subscribeToProviderJobs,
  subscribeToProviderReviews,
  subscribeToProviderPayouts,
  getProviderWallet
} from "@/lib/firebase/db";
import { formatBDT, formatMinutes, getBookingStatusBadge } from "@/lib/utils";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import { 
  Sparkles, 
  LogOut, 
  Briefcase, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Power, 
  XCircle, 
  MapPin, 
  Layers, 
  ChevronRight, 
  ExternalLink, 
  Loader2, 
  Calendar, 
  Check, 
  Navigation, 
  Play, 
  AlertCircle, 
  Star,
  Banknote,
  ArrowDownToLine,
  Building
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import type { 
  ProviderProfile, 
  ProviderApplication, 
  Booking, 
  Review,
  PayoutRequest,
  ProviderWallet
} from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type JobTab = "INCOMING" | "ACTIVE" | "COMPLETED" | "REVIEWS" | "WALLET";

export default function ProviderDashboardPage() {
  const { profile, firebaseUser } = useAuthStore();
  const [providerData, setProviderData] = useState<ProviderProfile | null>(null);
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [incomingJobs, setIncomingJobs] = useState<Booking[]>([]);
  const [myJobs, setMyJobs] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<JobTab>("INCOMING");

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Wallet & Payout State
  const [wallet, setWallet] = useState<ProviderWallet | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"BKASH" | "NAGAD" | "BANK_TRANSFER">("BKASH");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    setIsLoading(true);

    const unsubProfile = subscribeToProviderProfile(firebaseUser.uid, (p) => {
      setProviderData(p);
      if (p) {
        setIsOnline(p.isOnline);
      }
      setIsLoading(false);
    });

    const unsubApp = subscribeToProviderApplication(firebaseUser.uid, (app) => {
      setApplication(app);
    });

    const unsubMyJobs = subscribeToProviderJobs(firebaseUser.uid, (jobs) => {
      setMyJobs(jobs);
    });

    const unsubReviews = subscribeToProviderReviews(firebaseUser.uid, (revs) => {
      setReviews(revs);
    });

    return () => {
      unsubProfile();
      unsubApp();
      unsubMyJobs();
      unsubReviews();
    };
  }, [firebaseUser?.uid]);

  // Subscribe to open incoming jobs when areas and services are known
  useEffect(() => {
    if (!firebaseUser?.uid || !providerData) return;

    const areas = providerData.serviceAreas || [];
    const services = providerData.servicesOffered || [];

    const unsubOpen = subscribeToOpenJobs(
      firebaseUser.uid,
      areas,
      services,
      (openJobs) => {
        setIncomingJobs(openJobs);
      }
    );

    return () => unsubOpen();
  }, [firebaseUser?.uid, providerData?.serviceAreas, providerData?.servicesOffered]);

  // Subscribe to payouts and calculate wallet
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    getProviderWallet(firebaseUser.uid).then((w) => setWallet(w));

    const unsubPayouts = subscribeToProviderPayouts(firebaseUser.uid, (list) => {
      setPayouts(list);
      getProviderWallet(firebaseUser.uid).then((w) => setWallet(w));
    });

    return () => unsubPayouts();
  }, [firebaseUser?.uid, myJobs]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.uid || isRequestingPayout) return;
    const amount = Number(payoutAmount);
    if (!amount || amount < 500) {
      setPayoutError("সর্বনিম্ন উত্তোলনের পরিমাণ ৫০০ টাকা।");
      return;
    }
    if (wallet && amount > wallet.availableBalanceBDT) {
      setPayoutError(`আপনার সর্বোচ্চ উত্তোলনযোগ্য ব্যালেন্স ৳${wallet.availableBalanceBDT}`);
      return;
    }
    if (!accountNumber.trim()) {
      setPayoutError("অনুগ্রহ করে সঠিক অ্যাকাউন্ট নম্বর দিন।");
      return;
    }

    setIsRequestingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(null);

    try {
      const payoutFn = httpsCallable<any, any>(functions, "requestProviderPayout");
      const res = await payoutFn({
        amountBDT: amount,
        payoutMethod,
        accountDetails: {
          accountNumber: accountNumber.trim(),
          bankName: payoutMethod === "BANK_TRANSFER" ? bankName.trim() : undefined,
          branchName: payoutMethod === "BANK_TRANSFER" ? branchName.trim() : undefined,
        },
      });

      if (res.data?.success) {
        setPayoutSuccess("পে-আউট উত্তোলনের অনুরোধ সফলভাবে জমা হয়েছে!");
        setPayoutAmount("");
        setAccountNumber("");
        getProviderWallet(firebaseUser.uid).then((w) => setWallet(w));
      }
    } catch (err: any) {
      setPayoutError(err.message || "পে-আউট অনুরোধ জমা দিতে ব্যর্থ হয়েছে।");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const status = providerData?.verificationStatus || application?.status || "PENDING";

  const handleToggleOnline = async () => {
    if (!firebaseUser?.uid || isToggling || status !== "VERIFIED") return;
    setIsToggling(true);
    try {
      const nextStatus = !isOnline;
      await updateDoc(doc(db, "providers", firebaseUser.uid), {
        isOnline: nextStatus,
      });
      setIsOnline(nextStatus);
    } catch (err) {
      console.error("Failed to toggle online status:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAcceptJob = async (bookingId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setActionLoadingId(bookingId);

    try {
      const acceptFn = httpsCallable(functions, "acceptBooking");
      const res: any = await acceptFn({ bookingId });

      if (res.data?.success) {
        setActionSuccess("আপনি সফলভাবে কাজটি গ্রহণ করেছেন!");
        setActiveTab("ACTIVE");
      } else {
        throw new Error(res.data?.message || "কাজটি গ্রহণ করা সম্ভব হয়নি।");
      }
    } catch (err: any) {
      setActionError(err.message || "কাজটি গ্রহণ করতে ব্যর্থ হয়েছে। অন্য কেউ হয়তো গ্রহণ করেছেন।");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineJob = async (bookingId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setActionLoadingId(bookingId);

    try {
      const declineFn = httpsCallable(functions, "declineBooking");
      await declineFn({ bookingId });
      setActionSuccess("কাজের অনুরোধটি আপনার ফিড থেকে সরানো হয়েছে।");
    } catch (err: any) {
      setActionError(err.message || "প্রত্যাখ্যান করতে সমস্যা হয়েছে।");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickStatusUpdate = async (
    bookingId: string,
    nextStatus: "ON_THE_WAY" | "SERVICE_STARTED" | "SERVICE_COMPLETED"
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setActionLoadingId(bookingId);

    try {
      const updateFn = httpsCallable(functions, "updateJobStatus");
      const res: any = await updateFn({ bookingId, nextStatus });

      if (res.data?.success) {
        setActionSuccess(res.data.message);
      }
    } catch (err: any) {
      setActionError(err.message || "স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।");
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeScheduledJobs = myJobs.filter((j) =>
    ["PROVIDER_ACCEPTED", "PROVIDER_ASSIGNED", "ON_THE_WAY", "SERVICE_STARTED"].includes(j.status)
  );

  const completedJobsList = myJobs.filter((j) =>
    ["SERVICE_COMPLETED", "CUSTOMER_CONFIRMED"].includes(j.status)
  );

  return (
    <AuthGuard allowedRoles={["PROVIDER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-lg">GhorBondhu</span>
            </Link>

            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Online / Offline Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleOnline}
                  disabled={isToggling || status !== "VERIFIED"}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2 transition ${
                    status !== "VERIFIED"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : isOnline
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm"
                      : "bg-slate-100 text-slate-600 border border-slate-300"
                  }`}
                  title={status !== "VERIFIED" ? "অনলাইন হতে প্রথমে এনআইডি ভেরিফিকেশন সম্পন্ন করুন" : ""}
                >
                  <Power className={`w-3.5 h-3.5 ${isOnline && status === "VERIFIED" ? "text-emerald-600 animate-pulse" : "text-slate-400"}`} />
                  <span>{isOnline && status === "VERIFIED" ? "অনলাইন (কাজ নিতে প্রস্তুত)" : "অফলাইন"}</span>
                </button>
              </div>

              <Link
                href="/provider-verification"
                className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg transition"
              >
                কেওয়াইসি ভেরিফিকেশন
              </Link>

              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900">
                  {providerData?.fullName || profile?.email}
                </p>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  সার্ভিস পার্টনার
                </span>
              </div>

              <NotificationBell />

              <button
                onClick={() => logoutUser()}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="লগআউট"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Provider Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
          {/* Status Banners */}
          {status === "PENDING" && (
            <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-amber-950">এনআইডি ও কেওয়াইসি যাচাই বাকি রয়েছে</h4>
                  <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                    কাস্টমারদের বুকিং রিকোয়েস্ট পাওয়ার জন্য আপনার জাতীয় পরিচয়পত্র (NID) আপলোড করে আবেদন সম্পন্ন করুন।
                  </p>
                </div>
              </div>
              <Link
                href="/provider-verification"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-sm transition flex items-center justify-center space-x-1"
              >
                <span>এনআইডি আপলোড করুন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {status === "UNDER_REVIEW" && (
            <div className="p-5 rounded-3xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-blue-950">আবেদন পর্যালোচনায় রয়েছে</h4>
                  <p className="text-xs sm:text-sm text-blue-800 mt-1 leading-relaxed">
                    আপনার জমা দেওয়া এনআইডি ও তথ্য আমাদের অ্যাডমিন টিম যাচাই করছে। সাধারণ ২৪ ঘণ্টার মধ্যে অনুমোদন প্রদান করা হয়।
                  </p>
                </div>
              </div>
              <Link
                href="/provider-verification"
                className="px-4 py-2 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-xl whitespace-nowrap transition"
              >
                আবেদনের বিবরণ
              </Link>
            </div>
          )}

          {status === "REJECTED" && (
            <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-rose-950">আবেদন প্রত্যাখ্যাত হয়েছে</h4>
                  <p className="text-xs sm:text-sm text-rose-800 mt-1 leading-relaxed">
                    কারণ: <strong className="text-rose-950">{application?.reviewNotes || "এনআইডি তথ্য অস্পষ্ট ছিল"}</strong>
                  </p>
                </div>
              </div>
              <Link
                href="/provider-verification"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-sm transition flex items-center justify-center space-x-1"
              >
                <span>সংশোধন করে পুনরায় জমা দিন</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {status === "VERIFIED" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-emerald-800">
                অভিনন্দন! আপনার অ্যাকাউন্টটি ভেরিফাইড। {isOnline ? "অনলাইন মোড সক্রিয় রয়েছে, নতুন কাজের অনুরোধ ফিডে দেখা যাবে।" : "কাজের অনুরোধ পেতে উপরের অনলাইন বাটনটি চালু করুন।"}
              </p>
            </div>
          )}

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">মোট সম্পন্ন কাজ</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                {providerData?.completedJobsCount || completedJobsList.length} টি
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">মোট আয়</span>
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                {formatBDT(providerData?.earningsSummary?.totalEarnedBDT || 0)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">বকেয়া উত্তোলনীয়</span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                {formatBDT(providerData?.earningsSummary?.pendingPayoutBDT || 0)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">কাস্টমার রেটিং</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">
                ★ {providerData?.ratingAvg ? providerData.ratingAvg.toFixed(1) : "5.0"}
              </p>
            </div>
          </div>

          {/* Action Feedback Messages */}
          {actionError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Job Dispatch & Management Tabs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab("INCOMING")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "INCOMING"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>নতুন অনুরোধ</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === "INCOMING" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 font-bold"
                    }`}
                  >
                    {incomingJobs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "ACTIVE"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>চলমান ও শিডিউল কাজ</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === "ACTIVE" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700 font-bold"
                    }`}
                  >
                    {activeScheduledJobs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("COMPLETED")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "COMPLETED"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সম্পন্ন কাজ</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === "COMPLETED" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {completedJobsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("REVIEWS")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "REVIEWS"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      activeTab === "REVIEWS"
                        ? "fill-slate-950 text-slate-950"
                        : "fill-amber-400 text-amber-500"
                    }`}
                  />
                  <span>কাস্টমার রিভিউ</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === "REVIEWS"
                        ? "bg-amber-600 text-slate-950 font-black"
                        : "bg-amber-50 text-amber-800 font-bold"
                    }`}
                  >
                    {reviews.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("WALLET")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "WALLET"
                      ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>ওয়ালেট ও উপার্জন</span>
                  {wallet && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        activeTab === "WALLET"
                          ? "bg-emerald-700 text-white font-black"
                          : "bg-emerald-50 text-emerald-800 font-bold"
                      }`}
                    >
                      {formatBDT(wallet.availableBalanceBDT)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: INCOMING OPEN JOBS FEED */}
            {activeTab === "INCOMING" && (
              <div>
                {status !== "VERIFIED" ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">ভেরিফিকেশন সম্পন্ন হয়নি</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      গ্রাহকদের নতুন কাজের অনুরোধ দেখতে ও গ্রহণ করতে আপনার কেওয়াইসি ভেরিফিকেশন অনুমোদিত হতে হবে।
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/provider-verification"
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                      >
                        ভেরিফিকেশন সম্পন্ন করুন
                      </Link>
                    </div>
                  </div>
                ) : !isOnline ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <Power className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">আপনি বর্তমানে অফলাইনে আছেন</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      নতুন কাস্টমার বুকিং অনুরোধ পেতে উপরের বাটনে ক্লিক করে অনলাইন মোড চালু করুন।
                    </p>
                  </div>
                ) : incomingJobs.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">কোনো নতুন কাজের অনুরোধ নেই</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      আপনার নির্বাচিত এলাকা ও সার্ভিসের সাথে মিল রেখে নতুন বুকিং আসলেই এখানে তাৎক্ষণিক দেখতে পাবেন।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingJobs.map((job) => {
                      const isProcessing = actionLoadingId === job.bookingId;
                      return (
                        <div
                          key={job.bookingId}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
                                  {job.bookingNumber}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                                  {job.serviceNameSnapshot?.bn}
                                </h4>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">আপনার নেট আয়</span>
                                <span className="text-base font-extrabold text-emerald-700">
                                  {formatBDT(job.pricingSnapshot?.providerEarningAmount || 0)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{job.scheduledDate}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{job.scheduledStartTime} ({formatMinutes(job.selectedDurationMinutes)})</span>
                              </div>
                              <div className="flex items-center space-x-1.5 col-span-2">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="truncate">এলাকা: <strong>{job.locationSnapshot?.area}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-4 border-t border-slate-200/60 mt-4">
                            <button
                              onClick={() => handleDeclineJob(job.bookingId)}
                              disabled={isProcessing}
                              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-bold transition disabled:opacity-50"
                            >
                              প্রত্যাখ্যান
                            </button>

                            <button
                              onClick={() => handleAcceptJob(job.bookingId)}
                              disabled={isProcessing}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>কাজটি গ্রহণ করুন</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ACTIVE & SCHEDULED JOBS */}
            {activeTab === "ACTIVE" && (
              <div>
                {activeScheduledJobs.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">কোনো চলমান কাজ নেই</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      'নতুন অনুরোধ' ট্যাব থেকে কাজ গ্রহণ করলে এখানে শিডিউল ও সরাসরি প্রগ্রেস দেখা যাবে।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeScheduledJobs.map((job) => {
                      const badge = getBookingStatusBadge(job.status);
                      const isProcessing = actionLoadingId === job.bookingId;

                      return (
                        <div
                          key={job.bookingId}
                          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-blue-200 transition space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {job.bookingNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                  <span>{badge.label}</span>
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-slate-900 mt-1">
                                {job.serviceNameSnapshot?.bn}
                              </h4>
                            </div>

                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-slate-400 block font-medium">উপার্জন</span>
                              <span className="text-base font-extrabold text-emerald-700">
                                {formatBDT(job.pricingSnapshot?.providerEarningAmount || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Customer & Location Info */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                            <div>
                              <span className="text-slate-400 block font-medium">গ্রাহক:</span>
                              <strong className="text-slate-900">{job.customerSnapshot?.fullName}</strong>
                              <p className="text-[11px] text-slate-500">{job.customerSnapshot?.phoneNumber}</p>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-medium">সময়সূচি:</span>
                              <strong className="text-slate-900">{job.scheduledDate} ({job.scheduledStartTime})</strong>
                              <p className="text-[11px] text-slate-500">{formatMinutes(job.selectedDurationMinutes)}</p>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-medium">ঠিকানা:</span>
                              <p className="text-slate-900 truncate">
                                {job.locationSnapshot?.addressLine}, {job.locationSnapshot?.area}
                              </p>
                            </div>
                          </div>

                          {/* Action Progression Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                            <Link
                              href={`/provider/jobs/${job.bookingId}`}
                              className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center space-x-1"
                            >
                              <span>পূর্ণ বিবরণ ও কাস্টমার নেভিগেশন &rarr;</span>
                            </Link>

                            <div className="flex items-center space-x-2">
                              {(job.status === "PROVIDER_ACCEPTED" || job.status === "PROVIDER_ASSIGNED") && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(job.bookingId, "ON_THE_WAY")}
                                  disabled={isProcessing}
                                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>রওয়ানা হয়েছি</span>
                                </button>
                              )}

                              {job.status === "ON_THE_WAY" && (
                                <Link
                                  href={`/provider/jobs/${job.bookingId}`}
                                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>ওটিপি দিয়ে শুরু করুন &rarr;</span>
                                </Link>
                              )}

                              {job.status === "SERVICE_STARTED" && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(job.bookingId, "SERVICE_COMPLETED")}
                                  disabled={isProcessing}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>কাজ সম্পন্ন</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COMPLETED JOBS */}
            {activeTab === "COMPLETED" && (
              <div>
                {completedJobsList.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">এখনো কোনো সম্পন্ন কাজ নেই</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      আপনার সম্পন্ন করা সমস্ত কাজের তালিকা ও উপার্জনের রেকর্ড এখানে সংরক্ষিত থাকবে।
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {completedJobsList.map((job) => (
                      <div key={job.bookingId} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {job.bookingNumber}
                            </span>
                            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              সম্পন্ন
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {job.serviceNameSnapshot?.bn}
                          </h4>
                          <p className="text-xs text-slate-400">
                            তারিখ: {job.scheduledDate} — এলাকা: {job.locationSnapshot?.area}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">উপার্জিত আয়</span>
                          <span className="text-base font-extrabold text-emerald-700">
                            {formatBDT(job.pricingSnapshot?.providerEarningAmount || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: REVIEWS & FEEDBACK */}
            {activeTab === "REVIEWS" && (
              <div>
                {reviews.length === 0 ? (
                  <div className="py-12 text-center max-w-sm mx-auto">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">এখনো কোনো রিভিউ পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      গ্রাহকরা কাজ শেষ হওয়ার পর যে রেটিং ও মতামত দেবেন, তা এখানে সংরক্ষিত থাকবে।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-sm">
                          ★
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            সার্বিক রেটিং: {providerData?.ratingAvg ? providerData.ratingAvg.toFixed(1) : "5.0"} / ৫.০
                          </h4>
                          <p className="text-xs text-slate-500">
                            মোট {providerData?.ratingCount || reviews.length} জন গ্রাহকের মূল্যায়নের ভিত্তিতে
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reviews.map((rev) => (
                        <div
                          key={rev.reviewId || rev.id || rev.bookingId}
                          className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">
                                {rev.customerName || "কাস্টমার"}
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                বুকিং: #{rev.bookingNumber} • {rev.serviceName?.bn || rev.serviceNameBn || "সার্ভিস"}
                              </p>
                            </div>
                            <div className="flex items-center text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                  }`}
                                />
                              ))}
                              <span className="text-xs font-bold text-slate-700 ml-1">
                                {rev.rating}.0
                              </span>
                            </div>
                          </div>

                          {rev.tags && rev.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rev.tags.map((t: string) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100"
                                >
                                  ✓ {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {rev.comment && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                              &ldquo;{rev.comment}&rdquo;
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400 text-right">
                            {new Date(rev.createdAt).toLocaleDateString("bn-BD", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: WALLET & EARNINGS */}
            {activeTab === "WALLET" && (
              <div className="space-y-6">
                {/* 6 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Available Balance */}
                  <div className="p-5 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-100">উত্তোলনযোগ্য ব্যালেন্স</span>
                      <Wallet className="w-5 h-5 text-emerald-200" />
                    </div>
                    <p className="text-3xl font-black mt-2">
                      {formatBDT(wallet?.availableBalanceBDT || 0)}
                    </p>
                    <p className="text-[11px] text-emerald-100/90 mt-1">
                      সর্বনিম্ন ৫০০ টাকা হলে উত্তোলন করা যাবে
                    </p>
                  </div>

                  {/* Net Earnings */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">মোট নেট উপার্জন</span>
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">
                      {formatBDT(wallet?.netEarningsBDT || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      সম্পন্ন কাজ: {wallet?.completedJobsCount || 0} টি
                    </p>
                  </div>

                  {/* Pending Payout */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">প্রসেসিংয়ে থাকা পে-আউট</span>
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-amber-600 mt-2">
                      {formatBDT(wallet?.pendingPayoutBDT || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      অ্যাডমিন অনুমোদনের অপেক্ষায়
                    </p>
                  </div>

                  {/* Gross Earnings */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">মোট গ্রস বিলিং</span>
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2">
                      {formatBDT(wallet?.totalEarningsBDT || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      কাস্টমার কর্তৃক প্রদেয় সর্বমোট
                    </p>
                  </div>

                  {/* Platform Commission */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">প্ল্যাটফর্ম কমিশন</span>
                      <ShieldCheck className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-2">
                      {formatBDT(wallet?.platformCommissionBDT || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      সেবামূল্য থেকে কর্তনকৃত
                    </p>
                  </div>

                  {/* Total Disbursed */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">পরিশোধিত পে-আউট</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xl font-bold text-emerald-700 mt-2">
                      {formatBDT(wallet?.totalPaidOutBDT || 0)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      সফলভাবে অ্যাকাউন্টে হস্তান্তরিত
                    </p>
                  </div>
                </div>

                {/* Request Payout Action Banner */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">টাকা উত্তোলনের অনুরোধ করুন</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      আপনার বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে উপার্জিত অর্থ দ্রুত উত্তোলন করতে অনুরোধ পাঠান।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutError(null);
                      setPayoutSuccess(null);
                      setIsPayoutModalOpen(true);
                    }}
                    disabled={!wallet || wallet.availableBalanceBDT < 500}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>উত্তোলন অনুরোধ পাঠান</span>
                  </button>
                </div>

                {/* Payout Requests History Table */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">পে-আউট উত্তোলনের ইতিহাস</h3>
                    <span className="text-xs font-semibold text-slate-500">
                      মোট {payouts.length} টি অনুরোধ
                    </span>
                  </div>

                  {payouts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">এখনো কোনো পে-আউট অনুরোধ করা হয়নি</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3">তারিখ</th>
                            <th className="px-4 py-3">পরিমাণ</th>
                            <th className="px-4 py-3">মাধ্যম</th>
                            <th className="px-4 py-3">অ্যাকাউন্ট বিবরণ</th>
                            <th className="px-4 py-3">স্ট্যাটাস</th>
                            <th className="px-4 py-3 text-right">রেফারেন্স / নোট</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payouts.map((p) => (
                            <tr key={p.payoutId} className="hover:bg-slate-50/50 transition">
                              <td className="px-4 py-3 text-slate-500">
                                {new Date(p.requestedAt).toLocaleDateString("bn-BD", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {formatBDT(p.amountBDT)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  {p.payoutMethod}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700">
                                {p.accountDetails?.accountNumber || p.accountNumber || "—"}
                                {p.accountDetails?.bankName && ` (${p.accountDetails.bankName})`}
                              </td>
                              <td className="px-4 py-3">
                                {p.status === "PROCESSED" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    পরিশোধিত
                                  </span>
                                ) : p.status === "REJECTED" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    বাতিলকৃত
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    অপেক্ষমাণ
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500">
                                {p.transactionReference || p.rejectionReason || "—"}
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
          </div>
        </main>

        {/* Payout Request Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-emerald-700">
                  <ArrowDownToLine className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">উত্তোলন অনুরোধ পাঠান</h3>
                </div>
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {payoutSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{payoutSuccess}</h4>
                  <p className="text-xs text-slate-500">
                    অ্যাডমিন টিম যাচাই শেষে আপনার একাউন্টে টাকা পাঠিয়ে দিবে।
                  </p>
                  <button
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestPayout} className="space-y-4">
                  {payoutError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {payoutError}
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">সর্বোচ্চ উত্তোলনযোগ্য:</span>
                    <span className="font-bold text-emerald-600">
                      {formatBDT(wallet?.availableBalanceBDT || 0)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      উত্তোলনের পরিমাণ (৳)
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={wallet?.availableBalanceBDT || 500}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="সর্বনিম্ন ৫০০ টাকা"
                      className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      উত্তোলনের মাধ্যম
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value as any)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="BKASH">bKash (বিকাশ পার্সোনাল)</option>
                      <option value="NAGAD">Nagad (নগদ পার্সোনাল)</option>
                      <option value="BANK_TRANSFER">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {payoutMethod === "BANK_TRANSFER" ? "ব্যাংক অ্যাকাউন্ট নম্বর" : "মোবাইল ওয়ালেট নম্বর"}
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={payoutMethod === "BANK_TRANSFER" ? "Account No..." : "017XXXXXXXX"}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {payoutMethod === "BANK_TRANSFER" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">ব্যাংকের নাম</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="উদাঃ ডাচ-বাংলা ব্যাংক"
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">শাখা (Branch)</label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="উদাঃ ধানমন্ডি শাখা"
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPayoutModalOpen(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isRequestingPayout}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRequestingPayout ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>জমা হচ্ছে...</span>
                        </>
                      ) : (
                        <span>অনুরোধ জমা দিন</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
