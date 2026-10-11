"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Layers,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { getCategories, getServices } from "@/lib/firebase/db";
import type { ServiceCategory, ServiceItem } from "@/types";

export default function ServicesDirectoryPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      setIsLoading(true);
      try {
        const [cats, srvs] = await Promise.all([
          getCategories(true),
          getServices(undefined, true),
        ]);
        setCategories(cats);
        setServices(srvs);
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === "ALL" || srv.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      srv.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.descriptionBn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg">GhorBondhu</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-1.5 transition"
            >
              লগইন
            </Link>
            <Link
              href="/provider-register"
              className="text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-lg transition"
            >
              কর্মী হিসেবে যোগ দিন
            </Link>
          </div>
        </div>
      </header>

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-brand-50/60 to-slate-50 py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            আমাদের সকল হোম সার্ভিসসমূহ
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            আপনার বাসা, অফিস ও পরিবারের দৈনন্দিন প্রয়োজন অনুযায়ী বিশ্বস্ত সাহায্যকারী বেছে নিন। কোনো লুকানো চার্জ নেই।
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-lg mx-auto relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="সার্ভিস খুঁজুন (যেমন: কিচেন, বাথরুম, লন্ড্রি)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            সকল সেবা ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.categoryId}
              onClick={() => setSelectedCategory(cat.categoryId)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.categoryId
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              {cat.nameBn}
            </button>
          ))}
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">সার্ভিসসমূহ প্রস্তুত হচ্ছে...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-20 bg-white rounded-3xl border border-slate-200 text-center max-w-md mx-auto p-8 shadow-sm">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">কোনো সার্ভিস পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 mt-1">
              অন্য কোনো শব্দ দিয়ে অনুসন্ধান করুন অথবা অন্য ক্যাটাগরি বেছে নিন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const cat = categories.find((c) => c.categoryId === service.categoryId);
              return (
                <div
                  key={service.serviceId}
                  className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-brand-500 hover:shadow-xl hover:shadow-brand-500/5 transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                        {cat?.nameBn || service.categoryId}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {service.availableDurationsMinutes?.[0] || 30} মিনিট+
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition">
                      {service.nameBn}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{service.nameEn}</p>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {service.descriptionBn}
                    </p>

                    {/* Features list */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                        <span>১০০% এনআইডি ভেরিফাইড প্রোভাইডার</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>উপলব্ধ সময়: {service.availableDurationsMinutes?.join(", ")} মিনিট</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/services/${service.serviceId}`}
                      className="text-xs font-semibold text-slate-600 hover:text-brand-600 flex items-center space-x-1 transition"
                    >
                      <span>বিস্তারিত দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href={`/services/${service.serviceId}`}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-1"
                    >
                      <span>বুক করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} GhorBondhu (ঘরবন্ধু). All rights reserved.</p>
          <div className="flex space-x-4">
            <Link href="/" className="hover:text-white">হোম</Link>
            <Link href="/services" className="hover:text-white">সার্ভিসসমূহ</Link>
            <Link href="/provider-register" className="hover:text-white">কর্মী হিসেবে যোগ দিন</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
