"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { subscribeToSystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/lib/firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/app";
import type { SystemSettings } from "@/types";
import {
  Settings,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Clock,
  Banknote,
  MapPin,
  Plus,
  X
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "SUCCESS" | "ERROR"; message: string } | null>(null);

  // New city input state
  const [newCity, setNewCity] = useState("");

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToSystemSettings(
      (data) => {
        setSettings(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to load settings:", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleAddCity = () => {
    if (!newCity.trim()) return;
    const trimmed = newCity.trim();
    const currentCities = settings.operationalCities || [];
    if (!currentCities.includes(trimmed)) {
      setSettings((prev) => ({
        ...prev,
        operationalCities: [...(prev.operationalCities || []), trimmed],
      }));
    }
    setNewCity("");
  };

  const handleRemoveCity = (city: string) => {
    setSettings((prev) => ({
      ...prev,
      operationalCities: (prev.operationalCities || []).filter((c) => c !== city),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const updateFn = httpsCallable<any, any>(functions, "updateSystemSettings");
      await updateFn({
        platformName: settings.platformName,
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
        serviceFeePercentage: Number(settings.serviceFeePercentage),
        minimumWithdrawalLimitBDT: Number(settings.minimumWithdrawalLimitBDT),
        cancellationGraceMinutes: Number(settings.cancellationGraceMinutes),
        cancellationFeeBDT: Number(settings.cancellationFeeBDT),
        operationalCities: settings.operationalCities,
        maintenanceMessage: settings.maintenanceMessage || "",
        emergencyBanner: settings.emergencyBanner || { active: false, message: "", type: "INFO" },
      });

      setFeedback({
        type: "SUCCESS",
        message: "প্ল্যাটফর্ম কনফিগারেশন সেটিংস সফলভাবে সংরক্ষিত হয়েছে!",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error("Save error:", err);
      setFeedback({
        type: "ERROR",
        message: err.message || "সেটিংস সংরক্ষণ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                  <Settings className="w-5 h-5 text-amber-400" />
                  <span>সিস্টেম কনফিগারেশন ও পলিসি সেটিংস</span>
                </h1>
                <p className="text-xs text-slate-400">
                  প্ল্যাটফর্ম কমিশন, ক্যান্সেলেশন রুলস, সাপোর্ট কন্টাক্ট ও জরুরি ব্যানার
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              LEVEL: SUPER_ADMIN
            </div>
          </div>
        </header>

        {/* Form Body */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          {isLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">কনফিগারেশন ডেটা লোড হচ্ছে...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 border animate-in fade-in ${
                    feedback.type === "SUCCESS"
                      ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                      : "bg-rose-950/70 border-rose-700 text-rose-300"
                  }`}
                >
                  {feedback.type === "SUCCESS" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Section 1: General Branding & Support Contact */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Building className="w-4 h-4 text-brand-400" />
                  <span>প্ল্যাটফর্ম পরিচিতি ও গ্রাহক সহায়তা তথ্য</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      প্ল্যাটফর্মের নাম
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.platformName}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      সাপোর্ট হেল্পলাইন ফোন
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.supportPhone}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      সাপোর্ট ইমেইল এড্রেস
                    </label>
                    <input
                      type="email"
                      required
                      value={settings.supportEmail}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Financial & Fee Policy */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>আর্থিক নীতিমালা ও প্ল্যাটফর্ম ফি কনফিগারেশন</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      প্ল্যাটফর্ম ফি / কমিশন (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={settings.serviceFeePercentage}
                      onChange={(e) => setSettings({ ...settings, serviceFeePercentage: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">প্রতিটি সম্পন্ন কাজের গ্রস আয়ের উপর কর্তিত কমিশন।</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      সর্বনিম্ন উত্তোলন লিমিট (৳)
                    </label>
                    <input
                      type="number"
                      min={50}
                      required
                      value={settings.minimumWithdrawalLimitBDT}
                      onChange={(e) => setSettings({ ...settings, minimumWithdrawalLimitBDT: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">প্রোভাইডারের ওয়ালেটে সর্বনিম্ন এই পরিমাণ থাকলে পেআউট দেওয়া যাবে।</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      ফ্রি ক্যান্সেলেশন উইন্ডো (মিনিট)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={settings.cancellationGraceMinutes}
                      onChange={(e) => setSettings({ ...settings, cancellationGraceMinutes: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">বুকিং নিশ্চিত হওয়ার পর যত মিনিটের মধ্যে কোনো ফি ছাড়াই বাতিল সম্ভব।</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">
                      বিলম্বিত ক্যান্সেলেশন ফি (৳)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={settings.cancellationFeeBDT}
                      onChange={(e) => setSettings({ ...settings, cancellationFeeBDT: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">গ্রেস পিরিয়ডের পরে কাস্টমার কর্তৃক বুকিং বাতিলের ক্ষেত্রে প্রযোজ্য ফি।</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Operational Service Areas */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>সক্রিয় সার্ভিস এলাকা ও জোন (Operational Areas)</span>
                </h3>

                <div className="flex flex-wrap gap-2 items-center">
                  {(settings.operationalCities || []).map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-purple-300 border border-slate-700"
                    >
                      <span>{city}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCity(city)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="নতুন শহর বা জোন যোগ করুন..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCity}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>যোগ করুন</span>
                  </button>
                </div>
              </div>

              {/* Section 4: Emergency Notice Broadcast Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span>জরুরি লাইভ নোটিশ ব্যানার (Live Broadcast Banner)</span>
                  </h3>

                  <label className="flex items-center space-x-2 text-xs cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={!!settings.emergencyBanner?.active}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          emergencyBanner: {
                            active: e.target.checked,
                            message: settings.emergencyBanner?.message || "",
                            type: settings.emergencyBanner?.type || "INFO",
                          },
                        })
                      }
                      className="w-4 h-4 text-amber-500 rounded bg-slate-950 border-slate-700 focus:ring-amber-500"
                    />
                    <span className={settings.emergencyBanner?.active ? "text-amber-400" : "text-slate-400"}>
                      ব্যানার সক্রিয় করুন
                    </span>
                  </label>
                </div>

                {settings.emergencyBanner?.active && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">
                        ব্যানারের তীব্রতা লেভেল
                      </label>
                      <div className="flex gap-4">
                        {(["INFO", "WARNING", "ALERT"] as const).map((lvl) => (
                          <label key={lvl} className="flex items-center space-x-2 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name="bannerType"
                              value={lvl}
                              checked={settings.emergencyBanner?.type === lvl}
                              onChange={() =>
                                setSettings({
                                  ...settings,
                                  emergencyBanner: {
                                    ...settings.emergencyBanner!,
                                    type: lvl,
                                  },
                                })
                              }
                              className="text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500"
                            />
                            <span className={
                              lvl === "ALERT" ? "text-rose-400 font-bold" : lvl === "WARNING" ? "text-amber-400 font-bold" : "text-blue-400 font-bold"
                            }>
                              {lvl === "ALERT" && "ক্রিটিকাল এলার্ট (লাল)"}
                              {lvl === "WARNING" && "সতর্কবার্তা (হলুদ)"}
                              {lvl === "INFO" && "সাধারণ তথ্য (নীল)"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">
                        বিজ্ঞপ্তি বার্তা (Message)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.emergencyBanner?.message || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emergencyBanner: {
                              ...settings.emergencyBanner!,
                              message: e.target.value,
                            },
                          })
                        }
                        placeholder="যেমন: ঘূর্ণিঝড়ের কারণে আজ সন্ধ্যা ৬টা পর্যন্ত সকল সার্ভিস সাময়িক স্থগিত থাকবে..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-800">
                <Link
                  href="/super-admin"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  বাতিল
                </Link>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>সকল পরিবর্তন সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
