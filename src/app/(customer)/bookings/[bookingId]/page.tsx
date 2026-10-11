"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToBooking, createCustomerDispute } from "@/lib/firebase/db";
import { formatBDT, formatMinutes } from "@/lib/utils";
import { functions } from "@/lib/firebase/app";
import { httpsCallable } from "firebase/functions";
import type { Booking, BookingStatus } from "@/types";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PaymentCheckoutModal } from "@/components/payments/PaymentCheckoutModal";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  FileText,
  User,
  HelpCircle,
  Check,
  AlertTriangle,
  Star,
  Copy,
  ThumbsUp,
  MessageSquare,
  CreditCard,
  Scale
} from "lucide-react";

const STEP_DEFINITIONS = [
  {
    step: 1,
    id: "PENDING",
    title: "বুকিং গৃহীত",
    desc: "অনুরোধটি প্ল্যাটফর্মে গৃহীত হয়েছে",
  },
  {
    step: 2,
    id: "PROVIDER_ASSIGNED",
    title: "কর্মী নির্ধারিত",
    desc: "দক্ষ প্রোভাইডার বরাদ্দ করা হয়েছে",
  },
  {
    step: 3,
    id: "ON_THE_WAY",
    title: "কর্মী আসছেন",
    desc: "প্রোভাইডার আপনার ঠিকানার উদ্দেশ্যে রওনা হয়েছেন",
  },
  {
    step: 4,
    id: "SERVICE_STARTED",
    title: "কাজ চলছে",
    desc: "নির্ধারিত কাজ চলমান রয়েছে",
  },
  {
    step: 5,
    id: "SERVICE_COMPLETED",
    title: "কাজ সম্পন্ন",
    desc: "সেবাটি সফলভাবে শেষ হয়েছে",
  },
];

function getStepIndex(status: BookingStatus): number {
  switch (status) {
    case "PENDING":
      return 1;
    case "PROVIDER_ASSIGNED":
    case "PROVIDER_ACCEPTED":
      return 2;
    case "ON_THE_WAY":
      return 3;
    case "SERVICE_STARTED":
      return 4;
    case "SERVICE_COMPLETED":
    case "CUSTOMER_CONFIRMED":
      return 5;
    case "CANCELLED":
    case "DISPUTED":
    case "REFUNDED":
      return -1;
    default:
      return 1;
  }
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params?.bookingId as string;
  const isNewBooking = searchParams.get("new") === "true";

  const { firebaseUser } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // OTP Copy state
  const [isOtpCopied, setIsOtpCopied] = useState(false);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Completion Confirmation State
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionSuccess, setCompletionSuccess] = useState<string | null>(null);

  // Payment Checkout Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Dispute & Complaint State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("সার্ভিসের মান সন্তোষজনক নয়");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeFeedback, setDisputeFeedback] = useState<string | null>(null);

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !firebaseUser) return;
    setIsSubmittingDispute(true);
    setDisputeFeedback(null);
    try {
      await createCustomerDispute({
        bookingId: booking.bookingId,
        bookingNumber: booking.bookingNumber,
        customerId: firebaseUser.uid,
        customerName: booking.customerSnapshot?.fullName || "সম্মানিত গ্রাহক",
        customerPhone: booking.customerSnapshot?.phoneNumber || "",
        providerId: booking.providerId || "",
        providerName: booking.providerSnapshot?.fullName || "",
        reason: disputeReason,
        description: disputeDescription,
      });
      setDisputeFeedback("আপনার অভিযোগটি সফলভাবে নথিভুক্ত করা হয়েছে। কর্তৃপক্ষ দ্রুত পদক্ষেপ গ্রহণ করবে।");
      setTimeout(() => {
        setIsDisputeModalOpen(false);
        setDisputeFeedback(null);
        setDisputeDescription("");
      }, 2000);
    } catch (err: any) {
      console.error("Dispute error:", err);
      setDisputeFeedback(err.message || "অভিযোগ জমা দিতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const PRESET_REVIEW_TAGS = [
    "সময়নিষ্ঠ",
    "দক্ষ ও অভিজ্ঞ",
    "ভদ্র আচরণ",
    "পরিচ্ছন্ন ও নিখুঁত কাজ",
    "নির্ভরযোগ্য ও সৎ",
    "দ্রুত সমাধান"
  ];

  const handleCopyOtp = () => {
    if (booking?.startOtp) {
      navigator.clipboard.writeText(booking.startOtp);
      setIsOtpCopied(true);
      setTimeout(() => setIsOtpCopied(false), 2500);
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleConfirmCompletion = async () => {
    if (!bookingId) return;
    setCompletionError(null);
    setCompletionSuccess(null);
    setIsConfirmingCompletion(true);

    try {
      const confirmFn = httpsCallable(functions, "confirmBookingCompletion");
      const res: any = await confirmFn({ bookingId });
      if (res.data?.success) {
        setCompletionSuccess("কাজ সফলভাবে সম্পন্ন নিশ্চিত করা হয়েছে!");
        // Automatically open review modal for high engagement
        setIsReviewModalOpen(true);
      } else {
        throw new Error(res.data?.message || "নিশ্চিতকরণ সম্পন্ন হয়নি।");
      }
    } catch (err: any) {
      setCompletionError(err.message || "নিশ্চিত করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsConfirmingCompletion(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!bookingId) return;
    if (rating < 1 || rating > 5) {
      setReviewError("অনুগ্রহ করে ১ থেকে ৫ এর মধ্যে রেটিং দিন।");
      return;
    }

    setReviewError(null);
    setReviewSuccess(null);
    setIsSubmittingReview(true);

    try {
      const submitFn = httpsCallable(functions, "submitBookingReview");
      const res: any = await submitFn({
        bookingId,
        rating,
        tags: selectedTags,
        comment: reviewComment.trim() || undefined
      });

      if (res.data?.success) {
        setReviewSuccess("আপনার মূল্যবান মতামতের জন্য ধন্যবাদ!");
        setTimeout(() => {
          setIsReviewModalOpen(false);
        }, 1500);
      } else {
        throw new Error(res.data?.message || "রিভিউ জমা দেওয়া সম্ভব হয়নি।");
      }
    } catch (err: any) {
      setReviewError(err.message || "রিভিউ জমা দিতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
        console.error("Failed to subscribe to booking:", err);
        setError("বুকিংয়ের তথ্য লোড করতে সমস্যা হয়েছে।");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      setCancelError("অনুগ্রহ করে বুকিং বাতিলের কারণ লিখুন বা বেছে নিন।");
      return;
    }

    setCancelError(null);
    setIsCancelling(true);

    try {
      const cancelFn = httpsCallable(functions, "cancelBooking");
      const res: any = await cancelFn({
        bookingId,
        reason: cancelReason.trim(),
      });

      if (res.data?.success) {
        setIsCancelModalOpen(false);
        setCancelReason("");
      } else {
        throw new Error(res.data?.message || "বুকিং বাতিল করা সম্ভব হয়নি।");
      }
    } catch (err: any) {
      setCancelError(err.message || "বাতিল করতে ব্যর্থ হয়েছে। হেল্পলাইনে যোগাযোগ করুন।");
    } finally {
      setIsCancelling(false);
    }
  };

  const currentStepIndex = booking ? getStepIndex(booking.status) : 1;
  const isCancellable =
    booking &&
    ["DRAFT", "PENDING", "PROVIDER_ASSIGNED", "PROVIDER_ACCEPTED"].includes(booking.status);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">বুকিং ট্র্যাকিং লোড হচ্ছে...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">বুকিং পাওয়া যায়নি</h2>
          <p className="text-xs text-slate-500 mt-2">
            অনুরোধকৃত বুকিং আইডিটি সঠিক নয় অথবা অ্যাক্সেস করার অনুমতি নেই।
          </p>
          <div className="mt-6">
            <Link
              href="/bookings"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>আমার বুকিং তালিকায় ফিরুন</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "SUPER_ADMIN", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/bookings"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                title="বুকিং তালিকায় ফিরুন"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                  {booking.bookingNumber}
                </span>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">লাইভ ট্র্যাকিং</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <NotificationBell />
              <Link
                href="/bookings"
                className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg transition"
              >
                সব বুকিং
              </Link>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
          {/* New Booking Alert Banner */}
          {isNewBooking && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3 text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-sm">অভিনন্দন! আপনার সার্ভিস বুকিং সফল হয়েছে।</p>
                <p className="text-emerald-700 mt-0.5">
                  আমরা খুব দ্রুত একজন উপযুক্ত ও ভেরিফাইড প্রোভাইডার নির্ধারণ করছি। নিচের টাইমলাইনে রিয়েল-টাইম আপডেট দেখতে পাবেন।
                </p>
              </div>
            </div>
          )}

          {/* Cancelled Banner */}
          {booking.status === "CANCELLED" && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start space-x-3 text-rose-800 shadow-sm">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-sm">এই বুকিংটি বাতিল করা হয়েছে</p>
                {(booking as any).cancellationReason && (
                  <p className="text-rose-700 mt-1">
                    কারণ: <strong>{(booking as any).cancellationReason}</strong>
                  </p>
                )}
                <p className="text-slate-500 mt-1">
                  প্রয়োজনে আমাদের কাস্টমার কেয়ার সেন্টারে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          )}

          {/* Stepper Progress Card (Visible when not cancelled) */}
          {booking.status !== "CANCELLED" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>লাইভ সার্ভিস প্রগ্রেস</span>
              </h2>

              <div className="relative">
                {/* Horizontal Line for Desktop */}
                <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-slate-100 -z-0">
                  <div
                    className="h-full bg-brand-600 transition-all duration-500"
                    style={{
                      width: `${((Math.max(currentStepIndex, 1) - 1) / (STEP_DEFINITIONS.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
                  {STEP_DEFINITIONS.map((s) => {
                    const isPassed = currentStepIndex > s.step;
                    const isCurrent = currentStepIndex === s.step;

                    return (
                      <div
                        key={s.step}
                        className="flex sm:flex-col items-center sm:text-center space-x-4 sm:space-x-0"
                      >
                        {/* Circle Indicator */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-300 ${
                            isPassed
                              ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                              : isCurrent
                              ? "bg-white border-2 border-brand-600 text-brand-600 ring-4 ring-brand-100 animate-pulse"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {isPassed ? <Check className="w-5 h-5 stroke-[2.5]" /> : s.step}
                        </div>

                        {/* Step Details */}
                        <div className="mt-0 sm:mt-3">
                          <p
                            className={`text-xs font-bold ${
                              isCurrent ? "text-brand-700" : isPassed ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {s.title}
                          </p>
                          <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5 line-clamp-2">
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Start OTP Safety Verification Card */}
          {booking.startOtp &&
            !["SERVICE_STARTED", "SERVICE_COMPLETED", "CUSTOMER_CONFIRMED", "CANCELLED"].includes(
              booking.status
            ) && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-600/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase">
                        নিরাপত্তা নিশ্চিতকরণ
                      </span>
                      <span className="text-xs text-emerald-100">কাজ শুরুর ওটিপি</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white">স্টার্ট ওটিপি (Start OTP)</h3>
                    <p className="text-xs text-emerald-50 max-w-md leading-relaxed">
                      কর্মী আপনার ঠিকানায় পৌঁছানোর পর কাজ শুরুর পূর্বে এই ৪ সংখ্যার কোডটি তাকে দিন। আপনার অনুমতি ছাড়া কর্মী কাজ শুরু করতে পারবেন না।
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20 self-start sm:self-auto">
                    <div className="text-center px-2">
                      <span className="block text-[10px] text-emerald-100 font-semibold uppercase tracking-wider">আপনার কোড</span>
                      <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white drop-shadow">
                        {booking.startOtp}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="px-3 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 transition shadow-sm font-bold text-xs flex items-center space-x-1.5"
                      title="কোড কপি করুন"
                    >
                      {isOtpCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-700" />
                          <span>কপি</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Work Completed Confirmation & Review Prompt */}
          {booking.status === "SERVICE_COMPLETED" && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-emerald-950">কর্মী কাজ সম্পন্ন করেছেন!</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    আপনার সার্ভিসটি সফলভাবে শেষ হয়েছে। কাজের মান সন্তোষজনক হলে কাজ সম্পন্নকরণ নিশ্চিত করুন এবং কর্মীকে রেটিং ও রিভিউ প্রদান করুন।
                  </p>
                </div>
              </div>

              {completionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {completionError}
                </div>
              )}

              {completionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold">
                  {completionSuccess}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleConfirmCompletion}
                  disabled={isConfirmingCompletion}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isConfirmingCompletion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>নিশ্চিত করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-4 h-4" />
                      <span>হ্যাঁ, কাজ সন্তোষজনক হয়েছে</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setReviewError(null);
                    setReviewSuccess(null);
                    setIsReviewModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-800 text-xs font-bold transition flex items-center space-x-2"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>রেটিং ও রিভিউ দিন</span>
                </button>
              </div>
            </div>
          )}

          {/* Pending Review Prompt (When customer confirmed but has not reviewed yet) */}
          {booking.status === "CUSTOMER_CONFIRMED" && !booking.isReviewed && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">আপনার অভিজ্ঞতা কেমন ছিল?</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    সেবাটি কেমন লেগেছে তা জানিয়ে কর্মীকে উৎসাহিত করুন এবং অন্যদের সঠিক সিদ্ধান্ত নিতে সহায়তা করুন।
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewError(null);
                  setReviewSuccess(null);
                  setIsReviewModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1.5 shrink-0"
              >
                <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>রেটিং ও রিভিউ দিন</span>
              </button>
            </div>
          )}

          {/* Submitted Review Snapshot Card */}
          {(booking.isReviewed || booking.reviewSnapshot) && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <h3 className="font-bold text-slate-900 text-sm">আপনার প্রদত্ত রিভিউ ও রেটিং</h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  রিভিউ সংরক্ষিত
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= (booking.reviewSnapshot?.rating || 5)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-black text-slate-800">
                    {booking.reviewSnapshot?.rating || 5}.0
                  </span>
                </div>

                {booking.reviewSnapshot?.tags && booking.reviewSnapshot.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {booking.reviewSnapshot.tags.map((t: string) => (
                      <span
                        key={t}
                        className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200"
                      >
                        #{t}
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
            </div>
          )}

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Provider, Service & Location Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Assigned Provider Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  সার্ভিস প্রোভাইডার
                </h3>

                {booking.providerSnapshot ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 font-extrabold text-xl flex items-center justify-center shadow-inner">
                        {booking.providerSnapshot.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {booking.providerSnapshot.fullName}
                          </h4>
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3 mr-0.5 text-emerald-600" />
                            ভেরিফাইড
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">ঘরবন্ধু সার্টিফাইড কর্মী</p>
                        <div className="flex items-center space-x-1 text-xs text-amber-600 font-bold mt-1">
                          <span>★ {booking.providerSnapshot.ratingAvg?.toFixed(1) || "5.0"}</span>
                          <span className="text-slate-400 font-normal">কাস্টমার রেটিং</span>
                        </div>
                      </div>
                    </div>

                    {booking.providerSnapshot.phoneNumber && (
                      <a
                        href={`tel:${booking.providerSnapshot.phoneNumber}`}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                      >
                        <Phone className="w-4 h-4" />
                        <span>সরাসরি কল দিন</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100 flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">কর্মী অনুসন্ধান চলছে</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        আপনার নির্বাচিত সময় এবং ঠিকানার জন্য আমরা সবচেয়ে যোগ্য ও ভেরিফাইড প্রোভাইডার বরাদ্দ করছি। কর্মী নির্ধারিত হওয়া মাত্রই আপনাকে এসএমএস ও বিজ্ঞপ্তির মাধ্যমে জানানো হবে।
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Service & Schedule Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
                  সেবা ও সময়সূচির বিবরণ
                </h3>

                <div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    {booking.serviceNameSnapshot?.bn || "হোম সার্ভিস"}
                  </h4>
                  <p className="text-xs text-slate-400">{booking.serviceNameSnapshot?.en}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="text-slate-400 block">নির্ধারিত তারিখ</span>
                      <strong className="text-slate-800 text-sm font-bold">{booking.scheduledDate}</strong>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="text-slate-400 block">সময় ও কাজের ব্যপ্তিকাল</span>
                      <strong className="text-slate-800 text-sm font-bold">
                        {booking.scheduledStartTime} - {booking.scheduledEndTime} ({formatMinutes(booking.selectedDurationMinutes)})
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 sm:col-span-2">
                    <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="text-slate-400 block">সার্ভিস গ্রহণের ঠিকানা</span>
                      <strong className="text-slate-800 text-sm font-semibold">
                        {booking.locationSnapshot?.addressLine}, {booking.locationSnapshot?.area}, {booking.locationSnapshot?.city}
                      </strong>
                      {booking.locationSnapshot?.specialInstructions && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          নির্দেশনা: {booking.locationSnapshot.specialInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {booking.customerNotes && (
                    <div className="flex items-start space-x-3 sm:col-span-2 pt-2 border-t border-slate-100">
                      <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="text-slate-400 block">গ্রাহকের বিশেষ নোট</span>
                        <p className="text-slate-700 mt-0.5">{booking.customerNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Immutable Invoice & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Immutable Financial Breakdown Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">
                  অপরিবর্তনীয় ইনভয়েস
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>বেস প্রাইস ({booking.pricingSnapshot?.baseDurationMinutes || 60} মি.):</span>
                    <span className="font-semibold text-slate-800">
                      {formatBDT(booking.pricingSnapshot?.basePrice || 0)}
                    </span>
                  </div>

                  {booking.pricingSnapshot && booking.pricingSnapshot.calculatedDurationSurcharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>অতিরিক্ত সময় সারচার্জ:</span>
                      <span className="font-semibold text-slate-800">
                        +{formatBDT(booking.pricingSnapshot.calculatedDurationSurcharge)}
                      </span>
                    </div>
                  )}

                  {booking.pricingSnapshot && booking.pricingSnapshot.emergencySurcharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>জরুরি/ছুটির দিন ফি:</span>
                      <span className="font-semibold text-slate-800">
                        +{formatBDT(booking.pricingSnapshot.emergencySurcharge)}
                      </span>
                    </div>
                  )}

                  {booking.pricingSnapshot && booking.pricingSnapshot.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>কুপন ডিসকাউন্ট:</span>
                      <span>-{formatBDT(booking.pricingSnapshot.discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>সর্বমোট প্রদেয় বিল:</span>
                    <span className="text-lg text-brand-700">
                      {formatBDT(booking.pricingSnapshot?.customerFinalAmount || 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold text-slate-800">
                      {booking.paymentMethod === "CASH_ON_DELIVERY"
                        ? "ক্যাশ অন ডেলিভারি"
                        : booking.paymentMethod}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পেমেন্ট স্ট্যাটাস:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        booking.paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {booking.paymentStatus === "PAID" ? "পরিশোধিত" : "অপরিশোধিত"}
                    </span>
                  </div>
                </div>

                {/* Online Checkout Action Button */}
                {booking.paymentStatus !== "PAID" && booking.status !== "CANCELLED" && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>অনলাইনে পেমেন্ট করুন (বিকাশ / নগদ / কার্ড)</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">
                      সার্ভিস শেষে ক্যাশ প্রদান করতে চাইলে কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই
                    </p>
                  </div>
                )}
              </div>

              {/* Actions & Support Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  প্রয়োজনে পদক্ষেপ
                </h3>

                {isCancellable && (
                  <button
                    onClick={() => {
                      setCancelError(null);
                      setIsCancelModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>বুকিং বাতিল করুন</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDisputeFeedback(null);
                    setIsDisputeModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-2"
                >
                  <Scale className="w-4 h-4 text-amber-500" />
                  <span>অভিযোগ বা অসঙ্গতি রিপোর্ট করুন</span>
                </button>

                <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold">
                    <HelpCircle className="w-4 h-4 text-brand-600" />
                    <span>সহায়তা প্রয়োজন?</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    যেকোনো পরিবর্তন বা জরুরি তথ্যের জন্য আমাদের কাস্টমার সাপোর্ট টিমে যোগাযোগ করতে পারেন।
                  </p>
                  <p className="font-bold text-brand-700 text-xs">হটলাইন: ০৯৬১২-XXXXXX</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Cancellation Modal */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">বুকিং বাতিল নিশ্চিতকরণ</h3>
                </div>
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <p className="text-slate-600">
                  আপনি কি নিশ্চিত যে আপনি এই বুকিংটি বাতিল করতে চান? দয়া করে কারণটি নির্বাচন বা লিখুন:
                </p>

                {/* Preset Reasons */}
                <div className="space-y-1.5">
                  {[
                    "পরিকল্পনায় পরিবর্তন এসেছে",
                    "জরুরি কাজের কারণে সময় পেছাতে হবে",
                    "ভুল সার্ভিস নির্বাচন করা হয়েছে",
                    "অন্য মাধ্যমে সমাধান পেয়েছি",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelReason(preset)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition ${
                        cancelReason === preset
                          ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    অন্যান্য কারণ / বিস্তারিত নোট:
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="এখানে বাতিলের কারণ লিখুন..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400"
                  />
                </div>

                {cancelError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {cancelError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                >
                  ফিরে যান
                </button>

                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={isCancelling || !cancelReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>বাতিল হচ্ছে...</span>
                    </>
                  ) : (
                    <span>হ্যাঁ, বাতিল নিশ্চিত করুন</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Submission Modal */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span>কাজের অভিজ্ঞতা মূল্যায়ন</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {booking.providerSnapshot?.fullName || "সার্ভিস কর্মী"} এর কাজের মান রেট করুন
                  </p>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {reviewSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{reviewSuccess}</h4>
                  <p className="text-xs text-slate-500">আপনার মতামত সফলভাবে সংরক্ষণ করা হয়েছে।</p>
                </div>
              ) : (
                <>
                  {/* Star Selection */}
                  <div className="text-center py-2 space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                          >
                            <Star
                              className={`w-8 h-8 transition-colors ${
                                isFilled
                                  ? "fill-amber-400 text-amber-400 drop-shadow"
                                  : "text-slate-200"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs font-bold text-amber-600">
                      {rating === 5 && "অসাধারণ! সম্পূর্ণ সন্তুষ্ট"}
                      {rating === 4 && "খুবই ভালো সেবা"}
                      {rating === 3 && "মোটামুটি ভালো"}
                      {rating === 2 && "আশানুরূপ হয়নি"}
                      {rating === 1 && "অসন্তোষজনক অভিজ্ঞতা"}
                    </p>
                  </div>

                  {/* Quick Feedback Tags */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      কী কী বিষয় ভালো লেগেছে? (ট্যাগ নির্বাচন করুন)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_REVIEW_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                              isSelected
                                ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      বিস্তারিত মতামত (ঐচ্ছিক)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="কর্মীর কাজের মান, সময়ানুবর্তিতা ও ব্যবহার সম্পর্কে আপনার সৎ মন্তব্য লিখুন..."
                      className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  {reviewError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {reviewError}
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(false)}
                      disabled={isSubmittingReview}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition"
                    >
                      পরে দেব
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isSubmittingReview ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>জমা হচ্ছে...</span>
                        </>
                      ) : (
                        <span>রিভিউ জমা দিন</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* Payment Checkout Modal */}
        {booking && (
          <PaymentCheckoutModal
            booking={booking}
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
          />
        )}

        {/* Customer Dispute / Complaint Modal */}
        {isDisputeModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-amber-600">
                  <Scale className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">অভিযোগ বা সমস্যা জানান</h3>
                </div>
                <button
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {disputeFeedback ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p>{disputeFeedback}</p>
                </div>
              ) : (
                <form onSubmit={handleRaiseDispute} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      অভিযোগের মূল কারণ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="সার্ভিসের মান সন্তোষজনক নয়">সার্ভিসের মান সন্তোষজনক নয়</option>
                      <option value="প্রোভাইডার সময়মতো আসেননি">প্রোভাইডার সময়মতো আসেননি</option>
                      <option value="অতিরিক্ত অর্থ বা টিপস দাবি করেছেন">অতিরিক্ত অর্থ বা টিপস দাবি করেছেন</option>
                      <option value="কাজে ক্ষতিসাধন বা অবহেলা">কাজে ক্ষতিসাধন বা অবহেলা</option>
                      <option value="অন্যান্য গুরুতর সমস্যা">অন্যান্য গুরুতর সমস্যা</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      বিস্তারিত বিবরণ <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="ঘটনাটি বিস্তারিত লিখুন যাতে কর্তৃপক্ষ তদন্ত করে দ্রুত সমাধান প্রদান করতে পারে..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsDisputeModalOpen(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDispute}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {isSubmittingDispute ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>জমা হচ্ছে...</span>
                        </>
                      ) : (
                        <span>অভিযোগ সাবমিট করুন</span>
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
