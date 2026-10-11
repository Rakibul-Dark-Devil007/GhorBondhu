"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToBooking } from "@/lib/firebase/db";
import { formatBDT, formatMinutes, getBookingStatusBadge } from "@/lib/utils";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import type { Booking } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  Play,
  Check,
  Wallet,
  FileText,
  KeyRound,
  Star,
  Banknote
} from "lucide-react";

export default function ProviderJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const { firebaseUser } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Start OTP Verification Modal
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [startOtpInput, setStartOtpInput] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    setIsLoading(true);
    const unsubscribe = subscribeToBooking(
      bookingId,
      (data) => {
        setBooking(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load job details:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  const handleUpdateStatus = async (
    nextStatus: "ON_THE_WAY" | "SERVICE_STARTED" | "SERVICE_COMPLETED",
    otpVal?: string
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setOtpError(null);
    setIsUpdating(true);

    try {
      const updateFn = httpsCallable(functions, "updateJobStatus");
      const payload: any = {
        bookingId,
        nextStatus,
      };
      if (otpVal) {
        payload.otp = otpVal.trim();
      }

      const res: any = await updateFn(payload);

      if (res.data?.success) {
        setActionSuccess(res.data.message);
        setIsOtpModalOpen(false);
        setStartOtpInput("");
      } else {
        throw new Error(res.data?.message || "স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।");
      }
    } catch (err: any) {
      const errMsg = err.message || "একটি ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।";
      setActionError(errMsg);
      if (nextStatus === "SERVICE_STARTED") {
        setOtpError(errMsg);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startOtpInput.trim()) {
      setOtpError("অনুগ্রহ করে কাস্টমারের দেওয়া ৪-সংখ্যার OTP কোডটি লিখুন।");
      return;
    }
    await handleUpdateStatus("SERVICE_STARTED", startOtpInput);
  };

  const [isConfirmingCash, setIsConfirmingCash] = useState(false);

  const handleConfirmCashCollection = async () => {
    if (!bookingId || isConfirmingCash) return;
    setIsConfirmingCash(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const confirmCashFn = httpsCallable<any, any>(functions, "confirmCashPaymentCollection");
      const res = await confirmCashFn({ bookingId });
      if (res.data?.success) {
        setActionSuccess("ক্যাশ পেমেন্ট সফলভাবে নিশ্চিত করা হয়েছে!");
      }
    } catch (err: any) {
      setActionError(err.message || "ক্যাশ পেমেন্ট নিশ্চিত করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsConfirmingCash(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">কাজের বিবরণ লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">কাজটি পাওয়া যায়নি</h2>
          <div className="mt-6">
            <Link
              href="/provider-dashboard"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরুন</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badge = getBookingStatusBadge(booking.status);
  const status = booking.status;

  return (
    <AuthGuard allowedRoles={["PROVIDER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/provider-dashboard"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {booking.bookingNumber}
                </span>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">কাজের বিবরণ</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <NotificationBell />
              <span
                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                <span>{badge.label}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
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

          {/* Quick Action Progression Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              কাজের অগ্রগতি নিয়ন্ত্রণ
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {(status === "PROVIDER_ACCEPTED" || status === "PROVIDER_ASSIGNED") && (
                <button
                  onClick={() => handleUpdateStatus("ON_THE_WAY")}
                  disabled={isUpdating}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Navigation className="w-4 h-4" />
                  <span>আমি ঠিকানার উদ্দেশ্যে রওনা হয়েছি (On The Way)</span>
                </button>
              )}

              {status === "ON_THE_WAY" && (
                <button
                  onClick={() => {
                    setOtpError(null);
                    setStartOtpInput("");
                    setIsOtpModalOpen(true);
                  }}
                  disabled={isUpdating}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>কাস্টমার ওটিপি যাচাই ও কাজ শুরু (Verify OTP & Start)</span>
                </button>
              )}

              {status === "SERVICE_STARTED" && (
                <button
                  onClick={() => handleUpdateStatus("SERVICE_COMPLETED")}
                  disabled={isUpdating}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>কাজ সফলভাবে সম্পন্ন হয়েছে ও বিল গ্রহণ করেছি (Complete)</span>
                </button>
              )}

              {status === "SERVICE_COMPLETED" && (
                <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>এই কাজটি সম্পন্ন হয়েছে। গ্রাহকের অনুমোদনের অপেক্ষায় রয়েছে।</span>
                </div>
              )}

              {status === "CUSTOMER_CONFIRMED" && (
                <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>গ্রাহক কাজ সম্পন্নকরণ নিশ্চিত করেছেন এবং সন্তুষ্টি প্রকাশ করেছেন!</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Review Snapshot (When reviewed) */}
          {(booking.isReviewed || booking.reviewSnapshot) && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <h3 className="font-bold text-slate-900 text-sm">গ্রাহকের রেটিং ও মূল্যায়ন</h3>
                </div>
                <div className="flex items-center space-x-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <span>★</span>
                  <span>{booking.reviewSnapshot?.rating || 5}.0</span>
                </div>
              </div>

              {booking.reviewSnapshot?.tags && booking.reviewSnapshot.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {booking.reviewSnapshot.tags.map((t: string) => (
                    <span
                      key={t}
                      className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-lg border border-emerald-100"
                    >
                      ✓ {t}
                    </span>
                  ))}
                </div>
              )}

              {booking.reviewSnapshot?.comment && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 italic">
                  &ldquo;{booking.reviewSnapshot.comment}&rdquo;
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Columns: Customer & Location Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Customer Contact Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
                  গ্রাহক ও যোগাযোগের তথ্য
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-base flex items-center justify-center shadow-inner">
                      {booking.customerSnapshot?.fullName?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {booking.customerSnapshot?.fullName || "সম্মানিত গ্রাহক"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {booking.customerSnapshot?.phoneNumber || "ফোন নম্বর অপ্রকাশিত"}
                      </p>
                    </div>
                  </div>

                  {booking.customerSnapshot?.phoneNumber && (
                    <a
                      href={`tel:${booking.customerSnapshot.phoneNumber}`}
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>গ্রাহককে কল দিন</span>
                    </a>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                  <div className="flex items-start space-x-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">পূর্ণ ঠিকানা:</span>
                      <p className="text-slate-800">
                        {booking.locationSnapshot?.addressLine}, {booking.locationSnapshot?.area}, {booking.locationSnapshot?.city}
                      </p>
                      {booking.locationSnapshot?.specialInstructions && (
                        <p className="text-[11px] text-amber-700 mt-1 italic">
                          নির্দেশনা: {booking.locationSnapshot.specialInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {booking.customerNotes && (
                    <div className="flex items-start space-x-2 text-slate-700 pt-2 border-t border-slate-50">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block">কাস্টমার নোট:</span>
                        <p className="text-slate-600">{booking.customerNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service & Schedule Details */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
                  কাজের বিবরণ ও সময়সূচি
                </h3>

                <div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    {booking.serviceNameSnapshot?.bn}
                  </h4>
                  <p className="text-xs text-slate-400">{booking.serviceNameSnapshot?.en}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block">তারিখ</span>
                      <strong className="text-slate-800 text-sm font-bold">{booking.scheduledDate}</strong>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block">কাজের সময় ও ব্যপ্তিকাল</span>
                      <strong className="text-slate-800 text-sm font-bold">
                        {booking.scheduledStartTime} ({formatMinutes(booking.selectedDurationMinutes)})
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Column: Earnings Breakdown */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>আপনার উপার্জনের হিসাব</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>গ্রাহক মোট পরিশোধ করবেন:</span>
                    <span className="font-semibold text-slate-900">
                      {formatBDT(booking.pricingSnapshot?.customerFinalAmount || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-500">
                    <span>প্ল্যাটফর্ম ফি ({booking.pricingSnapshot?.platformCommissionPercent || 15}%):</span>
                    <span>-{formatBDT(booking.pricingSnapshot?.platformCommissionAmount || 0)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>আপনার নেট আয়:</span>
                    <span className="text-base text-emerald-700">
                      {formatBDT(booking.pricingSnapshot?.providerEarningAmount || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold text-slate-800">
                      {booking.paymentMethod === "CASH_ON_DELIVERY" ? "ক্যাশ অন ডেলিভারি" : booking.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট স্ট্যাটাস:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        booking.paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {booking.paymentStatus === "PAID" ? "পরিশোধিত" : "নগদ সংগ্রহ করতে হবে"}
                    </span>
                  </div>

                  {["SERVICE_COMPLETED", "CUSTOMER_CONFIRMED"].includes(booking.status) &&
                    booking.paymentStatus !== "PAID" && (
                      <div className="pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleConfirmCashCollection}
                          disabled={isConfirmingCash}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>
                            {isConfirmingCash
                              ? "যাচাই হচ্ছে..."
                              : `নগদ ${formatBDT(booking.pricingSnapshot?.customerFinalAmount || 0)} গ্রহণ নিশ্চিত করুন`}
                          </span>
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-1">
                          কাস্টমার নগদ টাকা পরিশোধ করার পর এই বাটনে চাপ দিন
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Start OTP Input Modal */}
        {isOtpModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-purple-700">
                  <KeyRound className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">স্টার্ট ওটিপি যাচাই</h3>
                </div>
                <button
                  onClick={() => setIsOtpModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  গ্রাহক তার মোবাইল স্ক্রিনে ৪-সংখ্যার <strong>Start OTP</strong> দেখতে পাচ্ছেন। কাজ শুরু করার পূর্বে কোডটি জেনে নিয়ে এখানে বসান:
                </p>

                <form onSubmit={handleStartWorkSubmit} className="space-y-4 pt-2">
                  <div>
                    <input
                      type="text"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={startOtpInput}
                      onChange={(e) => setStartOtpInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • •"
                      autoFocus
                      className="w-full text-center text-3xl font-mono font-black tracking-[0.5em] py-3 px-4 rounded-2xl border-2 border-purple-200 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 text-slate-900 placeholder:text-slate-300"
                    />
                  </div>

                  {otpError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {otpError}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOtpModalOpen(false)}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                    >
                      বাতিল
                    </button>

                    <button
                      type="submit"
                      disabled={isUpdating || startOtpInput.length !== 4}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>যাচাই হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>যাচাই করে কাজ শুরু করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
