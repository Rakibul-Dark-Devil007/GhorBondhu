"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { computePricingSnapshot } from "@/lib/pricingCalculator";
import { PricingRuleSchema } from "@/lib/validators/pricing";
import { formatBDT, formatMinutes } from "@/lib/utils";
import Link from "next/link";
import { 
  BadgePercent, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Loader2, 
  Check, 
  AlertCircle, 
  Calculator,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles
} from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/app";
import type { PricingRule } from "@/types";

export default function AdminPricingPage() {
  const { claims } = useAuthStore();
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sandbox Simulator State
  const [selectedSimRule, setSelectedSimRule] = useState<PricingRule | null>(null);
  const [simDuration, setSimDuration] = useState<number>(60);
  const [simEmergency, setSimEmergency] = useState<boolean>(false);
  const [simPeakHour, setSimPeakHour] = useState<boolean>(false);
  const [simWeekend, setSimWeekend] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    ruleId: "",
    serviceId: "",
    versionTag: "2026-v1",
    basePriceBDT: 500,
    baseDurationMinutes: 30,
    incrementDurationMinutes: 30,
    incrementPercentage: 0.30,
    platformCommissionPercent: 20,
    emergencySurchargeBDT: 150,
    peakHourMultiplier: 1.20,
    weekendMultiplier: 1.10,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "pricing_rules"), orderBy("basePriceBDT", "asc"));
      const snap = await getDocs(q);
      const loaded: PricingRule[] = snap.docs.map((d) => ({
        ruleId: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || "",
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || "",
      })) as PricingRule[];

      setPricingRules(loaded);
      if (loaded.length > 0 && !selectedSimRule) {
        setSelectedSimRule(loaded[0]);
      }
    } catch (err) {
      console.error("Failed to load pricing rules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Simulation Calculation
  const simSnapshot = selectedSimRule
    ? computePricingSnapshot(selectedSimRule, simDuration, {
        isEmergency: simEmergency,
        scheduledStartTime: simPeakHour ? "18:00" : "10:00",
        scheduledDate: simWeekend ? "2026-10-09" : "2026-10-07", // Friday vs Wednesday
      })
    : null;

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setActionMessage(null);

    const validation = PricingRuleSchema.safeParse(form);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const upsertRuleFn = httpsCallable(functions, "upsertPricingRule");
      await upsertRuleFn(form);
      setActionMessage({ type: "success", text: `প্রাইসিং রুল "${form.ruleId}" সফলভাবে সংরক্ষণ করা হয়েছে।` });
      setIsModalOpen(false);
      loadRules();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "প্রাইসিং রুল সেভ করতে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuper = isSuperAdmin(claims);
  const canConfig = isSuper || hasPermission(claims, "canConfigurePricing");

  return (
    <AuthGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <Link
                href="/admin-dashboard"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>অ্যাডমিন ড্যাশবোর্ডে ফিরে যান</span>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <BadgePercent className="w-6 h-6 text-amber-600" />
                <span>ডায়নামিক প্রাইসিং ও কমিশন ইঞ্জিন</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                সার্ভিসের বেস মূল্য, সময় বৃদ্ধির হার, পিক আওয়ার সারচার্জ এবং প্ল্যাটফর্ম রেভিনিউ স্প্লিট কনফিগার করুন।
              </p>
            </div>

            {canConfig && (
              <button
                onClick={() => {
                  setForm({
                    ruleId: "rule_new_service",
                    serviceId: "new-service-slug",
                    versionTag: "2026-v1",
                    basePriceBDT: 500,
                    baseDurationMinutes: 30,
                    incrementDurationMinutes: 30,
                    incrementPercentage: 0.30,
                    platformCommissionPercent: 20,
                    emergencySurchargeBDT: 150,
                    peakHourMultiplier: 1.20,
                    weekendMultiplier: 1.10,
                    isActive: true,
                  });
                  setFormErrors({});
                  setIsModalOpen(true);
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন প্রাইসিং রুল তৈরি</span>
              </button>
            )}
          </div>

          {actionMessage && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs sm:text-sm flex items-center space-x-2 ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {actionMessage.type === "success" ? (
                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Pricing Sandbox Simulator Banner */}
          <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-10 border border-slate-700">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Calculator className="w-4 h-4" />
              <span>লাইভ প্রাইসিং সিমুলেটর ও স্প্লিট অডিট</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-6">
              রিয়েল-টাইম রেভিনিউ ও প্রোভাইডার আর্নিং ক্যালকুলেটর
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    সার্ভিস প্রাইসিং রুল নির্বাচন করুন:
                  </label>
                  <select
                    value={selectedSimRule?.ruleId || ""}
                    onChange={(e) => {
                      const found = pricingRules.find((r) => r.ruleId === e.target.value);
                      if (found) setSelectedSimRule(found);
                    }}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {pricingRules.map((r) => (
                      <option key={r.ruleId} value={r.ruleId}>
                        {r.ruleId} (বেস: ৳{r.basePriceBDT})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>কাজের সময়সীমা:</span>
                    <span className="font-bold text-amber-400">{formatMinutes(simDuration, "bn")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[30, 60, 90, 120, 150, 180, 240, 360].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSimDuration(mins)}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold transition ${
                          simDuration === mins
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {mins} মি.
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surcharge Toggles */}
                <div className="pt-2 border-t border-slate-700 space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simPeakHour}
                      onChange={(e) => setSimPeakHour(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                    />
                    <span>পিক আওয়ার সারচার্জ ({selectedSimRule?.peakHourMultiplier || 1.2}x)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simWeekend}
                      onChange={(e) => setSimWeekend(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                    />
                    <span>সাপ্তাহিক ছুটির দিন (উইকেন্ড {selectedSimRule?.weekendMultiplier || 1.1}x)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simEmergency}
                      onChange={(e) => setSimEmergency(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                    />
                    <span>জরুরি সার্ভিস ফি (+৳{selectedSimRule?.emergencySurchargeBDT || 150})</span>
                  </label>
                </div>
              </div>

              {/* Simulation Result Tiles */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 self-center">
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-medium">কাস্টমার প্রদেয় মূল্য</p>
                  <p className="text-3xl font-extrabold text-white mt-2">
                    {formatBDT(simSnapshot?.customerFinalAmount || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">গ্রস ইনভয়েস টোটাল</span>
                </div>

                <div className="bg-slate-950/70 p-5 rounded-2xl border border-amber-900/40 text-center">
                  <p className="text-xs text-amber-400 font-medium">
                    প্ল্যাটফর্ম কমিশন ({simSnapshot?.platformCommissionPercent || 20}%)
                  </p>
                  <p className="text-3xl font-extrabold text-amber-400 mt-2">
                    {formatBDT(simSnapshot?.platformCommissionAmount || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">প্ল্যাটফর্মের মোট লাভ</span>
                </div>

                <div className="bg-slate-950/70 p-5 rounded-2xl border border-emerald-900/40 text-center">
                  <p className="text-xs text-emerald-400 font-medium">কর্মী নেট উপার্জন (Provider)</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                    {formatBDT(simSnapshot?.providerEarningAmount || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">কর্মী একাউন্টে জমা</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Rules Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">সকল কনফিগার করা প্রাইসিং রুলস</h3>
                <p className="text-xs text-slate-500 mt-0.5">প্রতিটি সেবার জন্য নির্ধারিত গাণিতিক সূত্রাবলী</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">প্রাইসিং রুলস লোড হচ্ছে...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">রুল আইডি ও ভার্সন</th>
                      <th className="py-3.5 px-4">বেস প্রাইস ও সময়</th>
                      <th className="py-3.5 px-4">ইনক্রিমেন্ট হার</th>
                      <th className="py-3.5 px-4">কমিশন (%)</th>
                      <th className="py-3.5 px-4">পিক / উইকেন্ড</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pricingRules.map((rule) => (
                      <tr key={rule.ruleId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 sm:px-6">
                          <p className="font-bold text-slate-900 font-mono">{rule.ruleId}</p>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {rule.versionTag}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">৳{rule.basePriceBDT}</p>
                          <span className="text-xs text-slate-500">
                            {rule.baseDurationMinutes} মিনিটের জন্য
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-brand-700">
                            +{(rule.incrementPercentage * 100).toFixed(0)}%
                          </span>
                          <span className="text-xs text-slate-500 block">
                            প্রতি {rule.incrementDurationMinutes} মিনিটে
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-xs border border-amber-200">
                            {rule.platformCommissionPercent}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                          {rule.peakHourMultiplier}x / {rule.weekendMultiplier}x
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <button
                            onClick={() => {
                              setForm({
                                ruleId: rule.ruleId,
                                serviceId: rule.serviceId,
                                versionTag: rule.versionTag,
                                basePriceBDT: rule.basePriceBDT,
                                baseDurationMinutes: rule.baseDurationMinutes,
                                incrementDurationMinutes: rule.incrementDurationMinutes,
                                incrementPercentage: rule.incrementPercentage,
                                platformCommissionPercent: rule.platformCommissionPercent,
                                emergencySurchargeBDT: rule.emergencySurchargeBDT,
                                peakHourMultiplier: rule.peakHourMultiplier,
                                weekendMultiplier: rule.weekendMultiplier,
                                isActive: rule.isActive,
                              });
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            কনফিগার করুন
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              প্রাইসিং রুল কনফিগারেশন
            </h3>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">রুল আইডি</label>
                <input
                  type="text"
                  value={form.ruleId}
                  onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
                  placeholder="rule_house_cleaning"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {formErrors.ruleId && <p className="text-[11px] text-red-600 mt-0.5">{formErrors.ruleId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">বেস প্রাইস (টাকা)</label>
                  <input
                    type="number"
                    value={form.basePriceBDT}
                    onChange={(e) => setForm({ ...form, basePriceBDT: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                  {formErrors.basePriceBDT && <p className="text-[11px] text-red-600 mt-0.5">{formErrors.basePriceBDT}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">বেস সময় (মিনিট)</label>
                  <input
                    type="number"
                    value={form.baseDurationMinutes}
                    onChange={(e) => setForm({ ...form, baseDurationMinutes: parseInt(e.target.value) || 30 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">ইনক্রিমেন্ট ধাপ (মিনিট)</label>
                  <input
                    type="number"
                    value={form.incrementDurationMinutes}
                    onChange={(e) => setForm({ ...form, incrementDurationMinutes: parseInt(e.target.value) || 30 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">বৃদ্ধি শতাংশ (যেমন 0.30 = ৩০%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={form.incrementPercentage}
                    onChange={(e) => setForm({ ...form, incrementPercentage: parseFloat(e.target.value) || 0.30 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">প্ল্যাটফর্ম কমিশন (%)</label>
                  <input
                    type="number"
                    value={form.platformCommissionPercent}
                    onChange={(e) => setForm({ ...form, platformCommissionPercent: parseInt(e.target.value) || 20 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">জরুরি সার্ভিস ফি (টাকা)</label>
                  <input
                    type="number"
                    value={form.emergencySurchargeBDT}
                    onChange={(e) => setForm({ ...form, emergencySurchargeBDT: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">পিক আওয়ার গুণক (e.g. 1.2 = +20%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={form.peakHourMultiplier}
                    onChange={(e) => setForm({ ...form, peakHourMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">ছুটির দিন গুণক (Weekend)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={form.weekendMultiplier}
                    onChange={(e) => setForm({ ...form, weekendMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>রুল সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
