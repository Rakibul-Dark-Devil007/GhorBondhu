"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Sparkles, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Package,
  Loader2,
  Calendar
} from "lucide-react";
import { getServiceById, getPricingRule } from "@/lib/firebase/db";
import { formatBDT, formatMinutes } from "@/lib/utils";
import type { ServiceItem, PricingRule } from "@/types";

export default function ServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.serviceId as string;

  const [service, setService] = useState<ServiceItem | null>(null);
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected duration for dynamic price calculation
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  useEffect(() => {
    async function loadService() {
      if (!serviceId) return;
      setIsLoading(true);
      try {
        const srv = await getServiceById(serviceId);
        if (srv) {
          setService(srv);
          if (srv.availableDurationsMinutes && srv.availableDurationsMinutes.length > 0) {
            setSelectedDuration(srv.availableDurationsMinutes[0]);
          }
          if (srv.pricingRuleId) {
            const rule = await getPricingRule(srv.pricingRuleId);
            setPricingRule(rule);
          }
        }
      } catch (err) {
        console.error("Failed to load service details:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadService();
  }, [serviceId]);

  // Client Estimated Price Calculation
  const calculateEstimatedPrice = () => {
    if (!pricingRule) return 500;
    const { basePriceBDT, baseDurationMinutes, incrementDurationMinutes, incrementPercentage } = pricingRule;

    if (selectedDuration <= baseDurationMinutes) {
      return basePriceBDT;
    }

    const additionalMinutes = selectedDuration - baseDurationMinutes;
    const additionalSteps = Math.ceil(additionalMinutes / (incrementDurationMinutes || 30));
    const stepIncrease = basePriceBDT * (incrementPercentage || 0.3);
    return Math.round(basePriceBDT + additionalSteps * stepIncrease);
  };

  const estimatedPrice = calculateEstimatedPrice();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">সার্ভিস বিস্তারিত লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">সার্ভিসটি পাওয়া যায়নি</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            কাঙ্ক্ষিত সার্ভিসটি হয়তো সাময়িকভাবে অনুপলব্ধ বা নিষ্ক্রিয় রয়েছে।
          </p>
          <Link
            href="/services"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold"
          >
            অন্যান্য সার্ভিস দেখুন
          </Link>
        </div>
      </div>
    );
  }

  const materialsText =
    service.materialsProvidedBy === "CUSTOMER"
      ? "গ্রাহক নিজ দায়িত্বে ক্লিনিং সামগ্রী/উপকরণ সরবরাহ করবেন।"
      : service.materialsProvidedBy === "PROVIDER"
      ? "প্রফেশনাল সার্ভিস কর্মী ক্লিনিং সামগ্রী সাথে আনবেন।"
      : "উপকরণ গ্রাহক দিতে পারেন অথবা অতিরিক্ত চার্জে কর্মী সরবরাহ করবেন।";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg">GhorBondhu</span>
          </Link>

          <Link
            href="/services"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-brand-600 flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>সকল সার্ভিস</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Service Details & Features */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {service.categoryId}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                {service.nameBn}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">{service.nameEn}</p>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-2">কাজের বিবরণ</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {service.descriptionBn}
                </p>
              </div>

              {/* Material Policy */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <Package className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">উপকরণ ও সরঞ্জাম পলিসি</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{materialsText}</p>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center space-x-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">এনআইডি যাচাইকৃত বিশ্বস্ত কর্মী</span>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">সন্তুষ্টির পর মূল্য পরিশোধ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Price Card & Duration Selector */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50">
              <h3 className="text-base font-bold text-slate-900 mb-4">সময়সীমা ও মূল্য নির্ধারণ</h3>

              {/* Duration Pills */}
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                কাজের জন্য আপনার কতটুকু সময় প্রয়োজন?
              </label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {(service.availableDurationsMinutes || [30, 60, 90, 120]).map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setSelectedDuration(duration)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                      selectedDuration === duration
                        ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <span>{formatMinutes(duration, "bn")}</span>
                    {selectedDuration === duration && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Price Breakdown Preview */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs mb-6">
                <div className="flex items-center justify-between text-slate-600">
                  <span>নির্বাচিত সময়:</span>
                  <span className="font-bold text-slate-900">{formatMinutes(selectedDuration, "bn")}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>বেস প্রাইস ({pricingRule?.baseDurationMinutes || 30} মিনিট):</span>
                  <span>{formatBDT(pricingRule?.basePriceBDT || 500)}</span>
                </div>
                {selectedDuration > (pricingRule?.baseDurationMinutes || 30) && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>অতিরিক্ত সময় বৃদ্ধি:</span>
                    <span>
                      +{formatBDT(estimatedPrice - (pricingRule?.basePriceBDT || 500))}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>আনুমানিক মোট:</span>
                  <span className="text-base text-brand-700 font-extrabold">
                    {formatBDT(estimatedPrice)}
                  </span>
                </div>
              </div>

              {/* Action Button to Booking Wizard */}
              <Link
                href={`/book/${service.serviceId}?duration=${selectedDuration}`}
                className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 flex items-center justify-center space-x-2 transition"
              >
                <span>বুকিং করতে এগিয়ে যান</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                বুকিং কনফার্মেশনের সময় সার্ভার স্বয়ংক্রিয়ভাবে অফিশিয়াল ইনভয়েস স্ন্যাপশট যুক্ত করবে।
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
