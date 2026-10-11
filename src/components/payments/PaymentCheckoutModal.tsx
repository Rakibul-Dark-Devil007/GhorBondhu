"use client";

import React, { useState } from "react";
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Lock
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import { formatBDT } from "@/lib/utils";
import type { Booking, PaymentMethod } from "@/types";

interface PaymentCheckoutModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

type CheckoutStep = "METHOD_SELECT" | "MFS_NUMBER" | "MFS_OTP" | "MFS_PIN" | "SUCCESS";

export function PaymentCheckoutModal({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess,
}: PaymentCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("BKASH");
  const [step, setStep] = useState<CheckoutStep>("METHOD_SELECT");
  const [phoneNumber, setPhoneNumber] = useState(booking.customerSnapshot?.phoneNumber || "017");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentTxnId, setPaymentTxnId] = useState<string | null>(null);

  if (!isOpen) return null;

  const finalAmount = booking.pricingSnapshot?.customerFinalAmount || 0;

  const handleSelectMethodAndProceed = async () => {
    setErrorMessage(null);

    if (selectedMethod === "CASH_ON_DELIVERY") {
      setIsLoading(true);
      try {
        const initFn = httpsCallable<any, any>(functions, "initiatePayment");
        await initFn({
          bookingId: booking.bookingId,
          paymentMethod: "CASH_ON_DELIVERY",
        });
        setStep("SUCCESS");
        if (onPaymentSuccess) onPaymentSuccess();
      } catch (err: any) {
        setErrorMessage(err.message || "ক্যাশ অন ডেলিভারি নির্বাচন সম্পন্ন হয়নি।");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (selectedMethod === "BKASH" || selectedMethod === "NAGAD") {
      setStep("MFS_NUMBER");
      return;
    }

    if (selectedMethod === "CARD" || selectedMethod === "SSLCOMMERZ") {
      // Direct Card / SSLCommerz Instant Simulator
      setIsLoading(true);
      try {
        const initFn = httpsCallable<any, any>(functions, "initiatePayment");
        const initRes = await initFn({
          bookingId: booking.bookingId,
          paymentMethod: "SSLCOMMERZ",
        });

        const confirmFn = httpsCallable<any, any>(functions, "confirmPayment");
        const confirmRes = await confirmFn({
          paymentId: initRes.data.paymentId,
          transactionId: `SSLC_${Date.now()}`,
          paymentGatewayPayload: {
            bank_status: "SUCCESS",
            card_type: "VISA",
            currency: "BDT",
          },
        });

        setPaymentTxnId(confirmRes.data.transactionId);
        setStep("SUCCESS");
        if (onPaymentSuccess) onPaymentSuccess();
      } catch (err: any) {
        setErrorMessage(err.message || "কার্ড পেমেন্ট ব্যর্থ হয়েছে।");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMfsNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 11) {
      setErrorMessage("অনুগ্রহ করে একটি সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।");
      return;
    }
    setErrorMessage(null);
    setStep("MFS_OTP");
  };

  const handleMfsOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setErrorMessage("অনুগ্রহ করে ওটিপি কোড লিখুন।");
      return;
    }
    setErrorMessage(null);
    setStep("MFS_PIN");
  };

  const handleMfsPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setErrorMessage("অনুগ্রহ করে আপনার পিন লিখুন।");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Initiate Payment
      const initFn = httpsCallable<any, any>(functions, "initiatePayment");
      const initRes = await initFn({
        bookingId: booking.bookingId,
        paymentMethod: selectedMethod,
      });

      const paymentId = initRes.data.paymentId;
      const gatewayPrefix = selectedMethod === "BKASH" ? "BKASH" : "NAGAD";
      const genTxnId = `GB_${gatewayPrefix}_${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 2. Confirm Payment Server-Side
      const confirmFn = httpsCallable<any, any>(functions, "confirmPayment");
      const confirmRes = await confirmFn({
        paymentId,
        transactionId: genTxnId,
        paymentGatewayPayload: {
          accountNumber: phoneNumber,
          channel: selectedMethod,
          status: "SUCCESS",
          verifiedAt: new Date().toISOString(),
        },
      });

      setPaymentTxnId(confirmRes.data.transactionId || genTxnId);
      setStep("SUCCESS");
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "পেমেন্ট প্রক্রিয়াকরণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("METHOD_SELECT");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">সুরক্ষিত পেমেন্ট চেকআউট</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">বুকিং নং: #{booking.bookingNumber}</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {booking.serviceNameSnapshot?.bn || "সার্ভিস চার্জ"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">পরিশোধযোগ্য মোট</span>
            <span className="text-2xl font-black text-emerald-600">
              {formatBDT(finalAmount)}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Method Select */}
          {step === "METHOD_SELECT" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                পেমেন্ট মাধ্যম বেছে নিন:
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* bKash */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("BKASH")}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    selectedMethod === "BKASH"
                      ? "border-pink-500 bg-pink-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D12053] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      বিকাশ
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">bKash (বিকাশ)</p>
                      <p className="text-[11px] text-slate-500">অনলাইন ইনস্ট্যান্ট পেমেন্ট</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedMethod === "BKASH"}
                    onChange={() => setSelectedMethod("BKASH")}
                    className="text-pink-600 focus:ring-pink-500"
                  />
                </button>

                {/* Nagad */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("NAGAD")}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    selectedMethod === "NAGAD"
                      ? "border-orange-500 bg-orange-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F7941D] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      নগদ
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">Nagad (নগদ)</p>
                      <p className="text-[11px] text-slate-500">ডাক বিভাগ ডিজিটাল ওয়ালেট</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedMethod === "NAGAD"}
                    onChange={() => setSelectedMethod("NAGAD")}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                </button>

                {/* Cards / SSLCommerz */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("CARD")}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    selectedMethod === "CARD"
                      ? "border-blue-500 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">ডেবিট/ক্রেডিট কার্ড ও ইন্টারনেট ব্যাংকিং</p>
                      <p className="text-[11px] text-slate-500">Visa, Mastercard, NexusPay, City Bank</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedMethod === "CARD"}
                    onChange={() => setSelectedMethod("CARD")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                </button>

                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod("CASH_ON_DELIVERY")}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    selectedMethod === "CASH_ON_DELIVERY"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">ক্যাশ অন ডেলিভারি (নগদ পরিশোধ)</p>
                      <p className="text-[11px] text-slate-500">কাজ সন্তোষজনকভাবে সম্পন্ন হওয়ার পর দিন</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedMethod === "CASH_ON_DELIVERY"}
                    onChange={() => setSelectedMethod("CASH_ON_DELIVERY")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSelectMethodAndProceed}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>প্রসেসিং...</span>
                    </>
                  ) : (
                    <>
                      <span>পরবর্তী ধাপে যান</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MFS Number Input */}
          {step === "MFS_NUMBER" && (
            <form onSubmit={handleMfsNumberSubmit} className="space-y-4">
              <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-bold text-slate-800">
                  {selectedMethod === "BKASH" ? "bKash পেমেন্ট গেটওয়ে" : "Nagad পেমেন্ট গেটওয়ে"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  আপনার একাউন্ট নম্বর প্রদান করুন
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  মোবাইল নম্বর (১১ ডিজিট)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  maxLength={11}
                  className="w-full text-sm font-mono tracking-wider p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("METHOD_SELECT")}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
                >
                  ওটিপি পাঠান
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: MFS OTP Input */}
          {step === "MFS_OTP" && (
            <form onSubmit={handleMfsOtpSubmit} className="space-y-4">
              <div className="text-center p-3 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-bold text-amber-900">ভেরিফিকেশন কোড (OTP)</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {phoneNumber} নম্বরে একটি ওটিপি পাঠানো হয়েছে। (মক টেস্টের জন্য 123456 দিন)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ৬ ডিজিটের ওটিপি লিখুন
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full text-center text-lg font-mono tracking-widest p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("MFS_NUMBER")}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
                >
                  যাচাই করুন
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: MFS PIN Input */}
          {step === "MFS_PIN" && (
            <form onSubmit={handleMfsPinSubmit} className="space-y-4">
              <div className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-bold text-slate-800">
                  {selectedMethod === "BKASH" ? "bKash পিন নম্বর" : "Nagad পিন নম্বর"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  পেমেন্ট অনুমোদনের জন্য আপনার গোপনীয় পিন দিন
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  পিন নম্বর লিখুন
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="•••••"
                  maxLength={5}
                  className="w-full text-center text-lg font-mono tracking-widest p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("MFS_OTP")}
                  disabled={isLoading}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>পেমেন্ট হচ্ছে...</span>
                    </>
                  ) : (
                    <span>পেমেন্ট নিশ্চিত করুন</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Success State */}
          {step === "SUCCESS" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {selectedMethod === "CASH_ON_DELIVERY"
                  ? "ক্যাশ অন ডেলিভারি সফলভাবে সংরক্ষিত!"
                  : "পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!"}
              </h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                {selectedMethod === "CASH_ON_DELIVERY"
                  ? "সার্ভিসটি সম্পন্ন হলে কর্মীকে নগদ টাকা বুঝিয়ে দিন।"
                  : `আপনার ৳${finalAmount} পেমেন্ট যাচাই করা হয়েছে।`}
              </p>

              {paymentTxnId && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 inline-block">
                  TrxID: {paymentTxnId}
                </div>
              )}

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition"
                >
                  ঠিক আছে, বুকিংয়ে ফিরুন
                </button>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>২৫৬-বিট এনক্রিপশন দ্বারা সম্পূর্ণ নিরাপদ পেমেন্ট গেটওয়ে</span>
          </div>
        </div>
      </div>
    </div>
  );
}
