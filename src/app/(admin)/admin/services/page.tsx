"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { 
  Layers, 
  ArrowLeft, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Loader2, 
  AlertCircle,
  Check,
  Tag
} from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/app";
import { CategorySchema, ServiceSchema } from "@/lib/validators/catalog";
import type { ServiceCategory, ServiceItem } from "@/types";

export default function AdminServicesPage() {
  const { claims } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"SERVICES" | "CATEGORIES">("SERVICES");

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("ALL");

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    categoryId: "",
    nameBn: "",
    nameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    displayOrder: 1,
    isActive: true,
  });
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});

  // Service Modal State
  const [isSrvModalOpen, setIsSrvModalOpen] = useState(false);
  const [srvForm, setSrvForm] = useState({
    serviceId: "",
    categoryId: "",
    nameBn: "",
    nameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    pricingRuleId: "",
    materialsProvidedBy: "CUSTOMER" as "CUSTOMER" | "PROVIDER" | "OPTIONAL_ADDON",
    estimatedMinDurationMinutes: 30,
    availableDurationsMinutes: [30, 60, 90, 120],
    displayOrder: 1,
    isActive: true,
  });
  const [srvErrors, setSrvErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load Categories
      const catSnap = await getDocs(query(collection(db, "service_categories"), orderBy("displayOrder", "asc")));
      const loadedCats: ServiceCategory[] = catSnap.docs.map((d) => ({
        categoryId: d.id,
        ...d.data(),
      })) as ServiceCategory[];
      setCategories(loadedCats);

      // Load Services
      const srvSnap = await getDocs(query(collection(db, "services"), orderBy("displayOrder", "asc")));
      const loadedSrvs: ServiceItem[] = srvSnap.docs.map((d) => ({
        serviceId: d.id,
        ...d.data(),
      })) as ServiceItem[];
      setServices(loadedSrvs);
    } catch (err) {
      console.error("Failed to load catalog:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (collectionType: "service_categories" | "services", docId: string, currentStatus: boolean) => {
    setActionMessage(null);
    try {
      const toggleFn = httpsCallable(functions, "toggleCatalogItemStatus");
      await toggleFn({
        collectionType,
        documentId: docId,
        isActive: !currentStatus,
      });

      if (collectionType === "service_categories") {
        setCategories((prev) =>
          prev.map((c) => (c.categoryId === docId ? { ...c, isActive: !currentStatus } : c))
        );
      } else {
        setServices((prev) =>
          prev.map((s) => (s.serviceId === docId ? { ...s, isActive: !currentStatus } : s))
        );
      }

      setActionMessage({ type: "success", text: "স্ট্যাটাস সফলভাবে পরিবর্তিত হয়েছে।" });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।" });
    }
  };

  // Submit Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatErrors({});
    setActionMessage(null);

    const validation = CategorySchema.safeParse(catForm);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setCatErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const upsertCatFn = httpsCallable(functions, "upsertCategory");
      await upsertCatFn(catForm);
      setActionMessage({ type: "success", text: `ক্যাটাগরি "${catForm.nameBn}" সফলভাবে সংরক্ষণ করা হয়েছে।` });
      setIsCatModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "ক্যাটাগরি সেভ করতে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSrvErrors({});
    setActionMessage(null);

    const validation = ServiceSchema.safeParse(srvForm);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setSrvErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const upsertSrvFn = httpsCallable(functions, "upsertService");
      await upsertSrvFn(srvForm);
      setActionMessage({ type: "success", text: `সার্ভিস "${srvForm.nameBn}" সফলভাবে সংরক্ষণ করা হয়েছে।` });
      setIsSrvModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "সার্ভিস সেভ করতে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCatFilter === "ALL" || s.categoryId === selectedCatFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      s.nameBn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.serviceId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
                <Layers className="w-6 h-6 text-brand-600" />
                <span>সার্ভিস ক্যাটালগ ব্যবস্থাপনা</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                ডায়নামিক ক্যাটাগরি এবং সার্ভিস আইটেম তৈরি, এডিট ও সক্রিয়/নিষ্ক্রিয় করুন।
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setCatForm({
                    categoryId: "",
                    nameBn: "",
                    nameEn: "",
                    descriptionBn: "",
                    descriptionEn: "",
                    displayOrder: categories.length + 1,
                    isActive: true,
                  });
                  setCatErrors({});
                  setIsCatModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4 text-brand-400" />
                <span>নতুন ক্যাটাগরি</span>
              </button>

              <button
                onClick={() => {
                  setSrvForm({
                    serviceId: "",
                    categoryId: categories[0]?.categoryId || "",
                    nameBn: "",
                    nameEn: "",
                    descriptionBn: "",
                    descriptionEn: "",
                    pricingRuleId: "rule_" + (categories[0]?.categoryId || "general"),
                    materialsProvidedBy: "CUSTOMER",
                    estimatedMinDurationMinutes: 30,
                    availableDurationsMinutes: [30, 60, 90, 120],
                    displayOrder: services.length + 1,
                    isActive: true,
                  });
                  setSrvErrors({});
                  setIsSrvModalOpen(true);
                }}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন সার্ভিস আইটেম</span>
              </button>
            </div>
          </div>

          {/* Action Message Alert */}
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

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 mb-6 space-x-8">
            <button
              onClick={() => setActiveTab("SERVICES")}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                activeTab === "SERVICES"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              সার্ভিসসমূহ ({services.length})
            </button>
            <button
              onClick={() => setActiveTab("CATEGORIES")}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                activeTab === "CATEGORIES"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              ক্যাটাগরিসমূহ ({categories.length})
            </button>
          </div>

          {/* TAB 1: SERVICES */}
          {activeTab === "SERVICES" && (
            <div>
              {/* Search & Category Filter */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="সার্ভিসের নাম বা আইডি দিয়ে খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <span className="text-xs font-semibold text-slate-600">ক্যাটাগরি:</span>
                  <select
                    value={selectedCatFilter}
                    onChange={(e) => setSelectedCatFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="ALL">সকল ক্যাটাগরি</option>
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Cards Grid */}
              {isLoading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500">সার্ভিস তালিকা লোড হচ্ছে...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center">
                  <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-700">কোনো সার্ভিস পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-400 mt-1">ক্যাটাগরি সিড করুন অথবা নতুন সার্ভিস যোগ করুন।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((srv) => {
                    const parentCat = categories.find((c) => c.categoryId === srv.categoryId);
                    return (
                      <div
                        key={srv.serviceId}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-brand-300 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                              {parentCat?.nameBn || srv.categoryId}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                                srv.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <span>{srv.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">{srv.nameBn}</h3>
                          <p className="text-xs text-slate-400 font-medium">{srv.nameEn}</p>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{srv.descriptionBn}</p>

                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                            <div className="flex items-center space-x-1.5 text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-brand-600" />
                              <span>সময় অপশন: {srv.availableDurationsMinutes?.join(", ")} মিনিট</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-500">
                              <Tag className="w-3.5 h-3.5 text-amber-600" />
                              <span>প্রাইসিং রুল: <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">{srv.pricingRuleId}</code></span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSrvForm({
                                ...srv,
                                displayOrder: srv.displayOrder || 1,
                              });
                              setIsSrvModalOpen(true);
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>সম্পাদনা</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus("services", srv.serviceId, srv.isActive)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                              srv.isActive
                                ? "text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {srv.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === "CATEGORIES" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">ক্যাটাগরি আইডি ও নাম</th>
                      <th className="py-3.5 px-4">ইংরেজি নাম</th>
                      <th className="py-3.5 px-4">ক্রম (Order)</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 sm:px-6">
                          <p className="font-bold text-slate-900">{cat.nameBn}</p>
                          <p className="text-[11px] font-mono text-slate-400">{cat.categoryId}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{cat.nameEn}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{cat.displayOrder}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              cat.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {cat.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right space-x-2">
                          <button
                            onClick={() => {
                              setCatForm({
                                categoryId: cat.categoryId,
                                nameBn: cat.nameBn,
                                nameEn: cat.nameEn,
                                descriptionBn: cat.descriptionBn,
                                descriptionEn: cat.descriptionEn,
                                displayOrder: cat.displayOrder,
                                isActive: cat.isActive,
                              });
                              setIsCatModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            সম্পাদনা
                          </button>
                          <button
                            onClick={() => handleToggleStatus("service_categories", cat.categoryId, cat.isActive)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                              cat.isActive
                                ? "text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {cat.isActive ? "বন্ধ করুন" : "চালু করুন"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Create/Edit Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {catForm.categoryId ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি তৈরি"}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">ক্যাটাগরি আইডি (Slug)</label>
                <input
                  type="text"
                  value={catForm.categoryId}
                  onChange={(e) => setCatForm({ ...catForm, categoryId: e.target.value.toLowerCase() })}
                  placeholder="যেমন: cleaning"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {catErrors.categoryId && <p className="text-[11px] text-red-600 mt-0.5">{catErrors.categoryId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">বাংলা নাম</label>
                  <input
                    type="text"
                    value={catForm.nameBn}
                    onChange={(e) => setCatForm({ ...catForm, nameBn: e.target.value })}
                    placeholder="বাসা ক্লিনিং"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {catErrors.nameBn && <p className="text-[11px] text-red-600 mt-0.5">{catErrors.nameBn}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">ইংরেজি নাম</label>
                  <input
                    type="text"
                    value={catForm.nameEn}
                    onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                    placeholder="House Cleaning"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {catErrors.nameEn && <p className="text-[11px] text-red-600 mt-0.5">{catErrors.nameEn}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">বাংলা বিবরণ</label>
                <textarea
                  rows={2}
                  value={catForm.descriptionBn}
                  onChange={(e) => setCatForm({ ...catForm, descriptionBn: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {catErrors.descriptionBn && <p className="text-[11px] text-red-600 mt-0.5">{catErrors.descriptionBn}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">ইংরেজি বিবরণ</label>
                <textarea
                  rows={2}
                  value={catForm.descriptionEn}
                  onChange={(e) => setCatForm({ ...catForm, descriptionEn: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {catErrors.descriptionEn && <p className="text-[11px] text-red-600 mt-0.5">{catErrors.descriptionEn}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mr-2">ক্রম (Display Order):</label>
                  <input
                    type="number"
                    value={catForm.displayOrder}
                    onChange={(e) => setCatForm({ ...catForm, displayOrder: parseInt(e.target.value) || 1 })}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>সংরক্ষণ করুন</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Create/Edit Modal */}
      {isSrvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {srvForm.serviceId ? "সার্ভিস আইটেম সম্পাদনা" : "নতুন সার্ভিস তৈরি"}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">সার্ভিস আইডি (Slug)</label>
                <input
                  type="text"
                  value={srvForm.serviceId}
                  onChange={(e) => setSrvForm({ ...srvForm, serviceId: e.target.value.toLowerCase() })}
                  placeholder="যেমন: house-deep-cleaning"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {srvErrors.serviceId && <p className="text-[11px] text-red-600 mt-0.5">{srvErrors.serviceId}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">ক্যাটাগরি</label>
                <select
                  value={srvForm.categoryId}
                  onChange={(e) => setSrvForm({ ...srvForm, categoryId: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.nameBn} ({c.nameEn})
                    </option>
                  ))}
                </select>
                {srvErrors.categoryId && <p className="text-[11px] text-red-600 mt-0.5">{srvErrors.categoryId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">বাংলা নাম</label>
                  <input
                    type="text"
                    value={srvForm.nameBn}
                    onChange={(e) => setSrvForm({ ...srvForm, nameBn: e.target.value })}
                    placeholder="বাসা ডিপ ক্লিনিং"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {srvErrors.nameBn && <p className="text-[11px] text-red-600 mt-0.5">{srvErrors.nameBn}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">ইংরেজি নাম</label>
                  <input
                    type="text"
                    value={srvForm.nameEn}
                    onChange={(e) => setSrvForm({ ...srvForm, nameEn: e.target.value })}
                    placeholder="House Deep Cleaning"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  {srvErrors.nameEn && <p className="text-[11px] text-red-600 mt-0.5">{srvErrors.nameEn}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">প্রাইসিং রুল আইডি</label>
                <input
                  type="text"
                  value={srvForm.pricingRuleId}
                  onChange={(e) => setSrvForm({ ...srvForm, pricingRuleId: e.target.value })}
                  placeholder="rule_house_deep_cleaning"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {srvErrors.pricingRuleId && <p className="text-[11px] text-red-600 mt-0.5">{srvErrors.pricingRuleId}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">ক্লিনিং সামগ্রী/উপকরণ সরবরাহকারী</label>
                <select
                  value={srvForm.materialsProvidedBy}
                  onChange={(e) => setSrvForm({ ...srvForm, materialsProvidedBy: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="CUSTOMER">গ্রাহক সরবরাহ করবেন (Customer)</option>
                  <option value="PROVIDER">সার্ভিস কর্মী সাথে আনবেন (Provider)</option>
                  <option value="OPTIONAL_ADDON">ঐচ্ছিক অ্যাড-অন (Optional Addon)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">ন্যূনতম সময় (মিনিট)</label>
                  <input
                    type="number"
                    value={srvForm.estimatedMinDurationMinutes}
                    onChange={(e) => setSrvForm({ ...srvForm, estimatedMinDurationMinutes: parseInt(e.target.value) || 30 })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">উপলব্ধ সময় অপশন (কমা দিয়ে আলাদা)</label>
                  <input
                    type="text"
                    value={srvForm.availableDurationsMinutes.join(", ")}
                    onChange={(e) => {
                      const vals = e.target.value
                        .split(",")
                        .map((v) => parseInt(v.trim()))
                        .filter((v) => !isNaN(v) && v > 0);
                      setSrvForm({ ...srvForm, availableDurationsMinutes: vals });
                    }}
                    placeholder="30, 60, 90, 120"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">বাংলা বিবরণ</label>
                <textarea
                  rows={2}
                  value={srvForm.descriptionBn}
                  onChange={(e) => setSrvForm({ ...srvForm, descriptionBn: e.target.value })}
                  className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSrvModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
