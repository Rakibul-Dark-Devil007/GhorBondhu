"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { getServiceById, getPricingRule, getCustomerAddresses } from "@/lib/firebase/db";
import { computePricingSnapshot } from "@/lib/pricingCalculator";
import { formatBDT, formatMinutes } from "@/lib/utils";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Plus,
  ShieldCheck,
  Check
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import type { ServiceItem, PricingRule, CustomerAddress } from "@/types";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

const AVAILABLE_AREAS = [
  "ধানমন্ডি (Dhanmondi)",
  "গুলশান (Gulshan)",
  "বনানী (Banani)",
  "উত্তরা (Uttara)",
  "মিরপুর (Mirpur)",
  "মোহাম্মদপুর (Mohammadpur)",
  "বসুন্ধরা (Bashundhara)",
  "বাড্ডা (Badda)",
  "মগবাজার (Moghbazar)",
  "খিলগাঁও (Khilgaon)",
];

export default function BookingWizardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = params?.serviceId as string;
  const initialDuration = parseInt(searchParams.get("duration") || "60", 10);

  const { firebaseUser, profile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Data states
  const [service, setService] = useState<ServiceItem | null>(null);
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledStartTime, setScheduledStartTime] = useState("10:00");
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);

  // Address Selection
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "HOME" as "HOME" | "OFFICE" | "OTHER",
    addressLine: "",
    area: AVAILABLE_AREAS[0],
    city: "Dhaka",
    specialInstructions: "",
  });

  // Payment & Notes
  const [paymentMethod, setPaymentMethod] = useState<"CASH_ON_DELIVERY" | "BKASH" | "NAGAD">("CASH_ON_DELIVERY");
  const [customerNotes, setCustomerNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const srv = await getServiceById(serviceId);
        if (srv) {
          setService(srv);
          if (srv.pricingRuleId) {
            const rule = await getPricingRule(srv.pricingRuleId);
            setPricingRule(rule);
          }
        }

        if (firebaseUser?.uid) {
          const addrs = await getCustomerAddresses(firebaseUser.uid);
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedAddressId(addrs[0].addressId);
          } else {
            setIsAddingNewAddress(true);
          }
        }
      } catch (err) {
        console.error("Failed to load booking prerequisite data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [serviceId, firebaseUser?.uid]);

  // Live Snapshot Preview
  const previewSnapshot = pricingRule
    ? computePricingSnapshot(pricingRule, selectedDuration, {
        scheduledDate,
        scheduledStartTime,
      })
    : null;

  const handleNextStep = () => {
    setSubmitError(null);
    if (currentStep === 1) {
      if (!scheduledDate || !scheduledStartTime || !selectedDuration) {
        setSubmitError("তারিখ, সময় ও কাজের সময়সীমা নির্বাচন করুন।");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isAddingNewAddress && !selectedAddressId) {
        setSubmitError("অনুগ্রহ করে একটি ঠিকানা নির্বাচন করুন।");
        return;
      }
      if (isAddingNewAddress && (!newAddress.addressLine.trim() || !newAddress.area.trim())) {
        setSubmitError("বাড়ি, রোড ও এলাকা সম্পর্কিত পূর্ণ ঠিকানা লিখুন।");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleConfirmBooking = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const createBookingFn = httpsCallable(functions, "createBooking");
      const payload: any = {
        serviceId,
        selectedDurationMinutes: selectedDuration,
        scheduledDate,
        scheduledStartTime,
        paymentMethod,
        customerNotes,
        couponCode: couponCode.trim() || undefined,
      };

      if (isAddingNewAddress) {
        payload.newAddress = newAddress;
      } else {
        payload.addressId = selectedAddressId;
      }

      const res: any = await createBookingFn(payload);
      if (res.data?.success) {
        router.push(`/bookings/${res.data.bookingId}?new=true`);
      } else {
        throw new Error(res.data?.message || "বুকিং নিশ্চিত করতে ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setSubmitError(err.message || "একটি ত্রুটি হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">বুকিং উইজার্ড প্রস্তুত হচ্ছে...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">সার্ভিসটি পাওয়া যায়নি</h2>
          <Link href="/services" className="mt-4 inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold">
            সকল সার্ভিস দেখুন
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["CUSTOMER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-lg">GhorBondhu</span>
            </Link>

            <Link
              href={`/services/${service.serviceId}`}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>সার্ভিসে ফিরে যান</span>
            </Link>
          </div>
        </header>

        {/* Wizard Progress Stepper */}
        <div className="bg-white border-b border-slate-200 py-4">
          <div className="max-w-3xl mx-auto px-4 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? "text-brand-600 font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 1 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>1</span>
              <span>সময়সূচি</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200" />
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? "text-brand-600 font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 2 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>2</span>
              <span>ঠিকানা</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200" />
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? "text-brand-600 font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 3 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>3</span>
              <span>পেমেন্ট</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200" />
            <div className={`flex items-center space-x-2 ${currentStep >= 4 ? "text-brand-600 font-bold" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep >= 4 ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>4</span>
              <span>নিশ্চিতকরণ</span>
            </div>
          </div>
        </div>

        {/* Wizard Body */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
          {submitError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Steps Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                {/* STEP 1: SCHEDULE & DURATION */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-brand-600" />
                      <span>কাজের তারিখ ও সময় নির্বাচন করুন</span>
                    </h2>

                    {/* Date Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        সার্ভিস গ্রহণের তারিখ
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    {/* Time Slot Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        কাজের শুরুর সময়
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setScheduledStartTime(slot)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                              scheduledStartTime === slot
                                ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        কাজের সময়সীমা
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(service.availableDurationsMinutes || [30, 60, 90, 120]).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setSelectedDuration(dur)}
                            className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                              selectedDuration === dur
                                ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            <span>{formatMinutes(dur, "bn")}</span>
                            {selectedDuration === dur && <Check className="w-4 h-4 text-brand-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: ADDRESS */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-brand-600" />
                      <span>সার্ভিস গ্রহণের ঠিকানা</span>
                    </h2>

                    {savedAddresses.length > 0 && !isAddingNewAddress && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-700">
                          সংরক্ষিত ঠিকানা থেকে বেছে নিন:
                        </label>
                        {savedAddresses.map((addr) => (
                          <div
                            key={addr.addressId}
                            onClick={() => setSelectedAddressId(addr.addressId)}
                            className={`p-4 rounded-2xl border cursor-pointer transition flex items-start space-x-3 ${
                              selectedAddressId === addr.addressId
                                ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="selectedAddr"
                              checked={selectedAddressId === addr.addressId}
                              onChange={() => setSelectedAddressId(addr.addressId)}
                              className="mt-1 text-brand-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {addr.label}
                              </span>
                              <p className="text-sm font-semibold text-slate-900 mt-1">{addr.addressLine}</p>
                              <p className="text-xs text-slate-500">{addr.area}, {addr.city}</p>
                              {addr.specialInstructions && (
                                <p className="text-xs text-brand-700 mt-1">নির্দেশনা: {addr.specialInstructions}</p>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="w-full py-2.5 border border-dashed border-slate-300 hover:border-brand-500 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-center space-x-1.5 transition"
                        >
                          <Plus className="w-4 h-4 text-brand-600" />
                          <span>নতুন ঠিকানা যোগ করুন</span>
                        </button>
                      </div>
                    )}

                    {(isAddingNewAddress || savedAddresses.length === 0) && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700">
                            নতুন ঠিকানার বিবরণ লিখুন:
                          </label>
                          {savedAddresses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsAddingNewAddress(false)}
                              className="text-xs font-semibold text-brand-600"
                            >
                              সংরক্ষিত ঠিকানায় ফিরে যান
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">এলাকা (Service Area)</label>
                          <select
                            value={newAddress.area}
                            onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                          >
                            {AVAILABLE_AREAS.map((ar) => (
                              <option key={ar} value={ar}>{ar}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">পূর্ণ ঠিকানা (বাড়ি, রোড, ফ্ল্যাট নম্বর)</label>
                          <input
                            type="text"
                            value={newAddress.addressLine}
                            onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                            placeholder="যেমন: বাসা নং ১২, রোড নং ৫, ফ্ল্যাট ৪/বি"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
                          <input
                            type="text"
                            value={newAddress.specialInstructions}
                            onChange={(e) => setNewAddress({ ...newAddress, specialInstructions: e.target.value })}
                            placeholder="যেমন: লিফটের ৪ তলায়, ডান পাশের ফ্ল্যাট"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: PAYMENT & NOTES */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-brand-600" />
                      <span>পেমেন্ট পদ্ধতি ও নোটস</span>
                    </h2>

                    <div className="space-y-3">
                      <div
                        onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          paymentMethod === "CASH_ON_DELIVERY"
                            ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="paymentOpt"
                            checked={paymentMethod === "CASH_ON_DELIVERY"}
                            onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                            className="text-brand-600"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">ক্যাশ অন ডেলিভারি (Pay After Service)</p>
                            <p className="text-xs text-slate-500">কাজ সন্তোষজনকভাবে সম্পন্ন হওয়ার পর কর্মীকে নগদ পরিশোধ করুন।</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">সুপারিশকৃত</span>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200 opacity-60 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input type="radio" disabled />
                          <div>
                            <p className="text-sm font-bold text-slate-900">বিকাশ / নগদ (bKash / Nagad)</p>
                            <p className="text-xs text-slate-500">শীঘ্রই অনলাইন পেমেন্ট ইন্টিগ্রেশন যুক্ত হচ্ছে।</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">শীঘ্রই আসছে</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        কর্মীর জন্য বিশেষ কোনো নির্দেশনা (ঐচ্ছিক)
                      </label>
                      <textarea
                        rows={2}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="যেমন: নির্দিষ্ট কোনো অংশ বেশি পরিষ্কার করতে হবে..."
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW & CONFIRM */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>বুকিং তথ্য পর্যালোচনা ও নিশ্চিতকরণ</span>
                    </h2>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">সেবা:</span>
                        <span className="font-bold text-slate-900">{service.nameBn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">তারিখ ও সময়:</span>
                        <span className="font-semibold text-slate-900">{scheduledDate}, সকাল {scheduledStartTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">কাজের সময়সীমা:</span>
                        <span className="font-semibold text-slate-900">{formatMinutes(selectedDuration, "bn")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ঠিকানা:</span>
                        <span className="font-semibold text-slate-900 text-right">
                          {isAddingNewAddress
                            ? `${newAddress.addressLine}, ${newAddress.area}`
                            : savedAddresses.find((a) => a.addressId === selectedAddressId)?.addressLine || "ঠিকানা"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                        <span className="font-semibold text-emerald-700">ক্যাশ অন ডেলিভারি</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-xs text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>
                        বুকিং কনফার্ম করার পর সার্ভিস এরিয়ার ১০০% এনআইডি ভেরিফাইড একজন কর্মীকে দায়িত্ব অর্পণ করা হবে। কাজ শুরুর আগে কর্মী আপনার সাথে যোগাযোগ করবেন।
                      </span>
                    </div>
                  </div>
                )}

                {/* Wizard Navigation Buttons */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>পূর্ববর্তী ধাপ</span>
                    </button>
                  ) : <div />}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition"
                    >
                      <span>পরবর্তী ধাপ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmBooking}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/25 flex items-center space-x-2 transition disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>বুকিং তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>বুকিং কনফার্ম করুন</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Summary Invoice Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
                  অর্ডার সারাংশ
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>সার্ভিস বেস প্রাইস:</span>
                    <span>{formatBDT(previewSnapshot?.basePrice || 500)}</span>
                  </div>

                  {previewSnapshot && previewSnapshot.calculatedDurationSurcharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>অতিরিক্ত সময় চার্জ:</span>
                      <span>+{formatBDT(previewSnapshot.calculatedDurationSurcharge)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                    <span>মোট প্রদেয় বিল:</span>
                    <span className="text-base text-brand-700 font-extrabold">
                      {formatBDT(previewSnapshot?.customerFinalAmount || 500)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                  <p>✓ কোনো লুকানো অতিরিক্ত চার্জ নেই</p>
                  <p>✓ সেবা শেষে ক্যাশ পরিশোধ সুবিধা</p>
                  <p>✓ অপরিবর্তনীয় ডিজিটাল ইনভয়েস</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
