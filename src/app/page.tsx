import Link from "next/link";
import { 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  Users, 
  Lock,
  Home,
  UtensilsCrossed,
  Shirt,
  Bath
} from "lucide-react";

export default function HomePage() {
  const featuredServices = [
    {
      id: "house-cleaning",
      nameBn: "বাসা সম্পূর্ণ ডিপ ক্লিনিং",
      nameEn: "House Deep Cleaning",
      desc: "ড্রয়িং, ডাইনিং ও বেডরুমের পেশাদার পরিচ্ছন্নতা সেবা।",
      icon: Home,
      startingPrice: 600,
    },
    {
      id: "kitchen-cleaning",
      nameBn: "কিচেন ও থালাবাসন ক্লিনিং",
      nameEn: "Kitchen & Dishwashing",
      desc: "হাইজিনিক পদ্ধতিতে রান্নাঘর ও তেলচিটচিটে চুলা পরিষ্কার।",
      icon: UtensilsCrossed,
      startingPrice: 350,
    },
    {
      id: "bathroom-cleaning",
      nameBn: "বাথরুম স্যানিটাইজিং",
      nameEn: "Bathroom Sanitization",
      desc: "টাইলস স্কেল রিমুভাল ও জীবাণুমুক্ত বাথরুম ক্লিন।",
      icon: Bath,
      startingPrice: 400,
    },
    {
      id: "laundry-ironing",
      nameBn: "লন্ড্রি ও কাপড় ইস্ত্রি",
      nameEn: "Laundry & Ironing Help",
      desc: "দৈনন্দিন কাপড় ধোয়া ও নিখুঁত ইস্ত্রি সেবা।",
      icon: Shirt,
      startingPrice: 300,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">GhorBondhu</span>
              <span className="block text-[10px] text-brand-600 font-semibold tracking-wider uppercase -mt-1">ঘরবন্ধু</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-brand-600 transition">সার্ভিসসমূহ</a>
            <a href="#trust" className="hover:text-brand-600 transition">নিরাপত্তা ও বিশ্বাস</a>
            <a href="#portals" className="hover:text-brand-600 transition">পোর্টাল এক্সেস</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 transition"
            >
              লগইন
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition"
            >
              বুক করুন
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 bg-gradient-to-b from-brand-50/50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>১০০% এনআইডি ভেরিফাইড প্রোভাইডার</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
              Trusted Help, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-500">
                Right at Home.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
              ঘরবন্ধু—আপনার দৈনন্দিন গৃহস্থালী কাজের নির্ভরযোগ্য সঙ্গী। ক্লিনিং, রান্না, লন্ড্রি সহ যেকোনো কাজের জন্য সহজে ও নিরাপদে বুক করুন দক্ষ কর্মী।
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/services"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition"
              >
                <span>সার্ভিস বেছে নিন</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/provider-register"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <UserCheck className="w-5 h-5 text-brand-600" />
                <span>কর্মী হিসেবে যুক্ত হোন</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section id="services" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              আমাদের জনপ্রিয় সেবাগুলো
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              আপনার প্রয়োজন অনুযায়ী সময় ও কাজের পরিধি নির্বাচন করুন; কোনো লুকানো চার্জ নেই।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="group p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-500 hover:bg-white hover:shadow-xl hover:shadow-brand-500/5 transition duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:bg-brand-50 group-hover:border-brand-200 flex items-center justify-center text-brand-600 transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">
                      {service.nameBn}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {service.nameEn}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {service.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">শুরু মাত্র</span>
                      <p className="text-base font-bold text-brand-700">৳{service.startingPrice}</p>
                    </div>
                    <Link
                      href={`/book/${service.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                    >
                      বুক করুন
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Safety Highlights */}
      <section id="trust" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">১০০% ভেরিফাইড কর্মী</h4>
              <p className="mt-2 text-sm text-slate-600">
                প্রতিটি সার্ভিস প্রোভাইডারের জাতীয় পরিচয়পত্র, বর্তমান ঠিকানা ও ব্যাকগ্রাউন্ড অ্যাডমিন কর্তৃক কঠোরভাবে যাচাইকৃত।
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">ডাইনামিক সময় ও মূল্য</h4>
              <p className="mt-2 text-sm text-slate-600">
                ৩০ মিনিট থেকে শুরু করে প্রয়োজনমত যেকোনো সময়সীমার জন্য বুক করুন। স্বচ্ছ এবং পূর্বনির্ধারিত রেট চার্ট।
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">নিরাপদ পেমেন্ট ও গ্যারান্টি</h4>
              <p className="mt-2 text-sm text-slate-600">
                কাজ সম্পন্ন ও সন্তুষ্টি নিশ্চিত হওয়ার পর মূল্য পরিশোধের সুবিধা (ক্যাশ অন ডেলিভারি ও ডিজিটাল পেমেন্ট)।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Entrance Portals (For Testing & Access) */}
      <section id="portals" className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">সিস্টেম পোর্টাল লিঙ্কস (Phase Architecture)</h3>
              <p className="text-xs text-slate-500">বিকাশমান মডিউলগুলোর জন্য প্রবেশদ্বার</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">Dev Baseline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/customer-dashboard"
              className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/30 transition flex items-center space-x-3"
            >
              <Users className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">কাস্টমার পোর্টাল</p>
                <p className="text-xs text-slate-500">বুকিং হিস্ট্রি ও ট্র্যাকিং</p>
              </div>
            </Link>

            <Link
              href="/provider-dashboard"
              className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/30 transition flex items-center space-x-3"
            >
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">প্রোভাইডার কনসোল</p>
                <p className="text-xs text-slate-500">জব রিকোয়েস্ট ও আয় হিসাব</p>
              </div>
            </Link>

            <Link
              href="/admin-dashboard"
              className="p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/30 transition flex items-center space-x-3"
            >
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">অ্যাডমিন ইআরপি</p>
                <p className="text-xs text-slate-500">কেওয়াইসি ভেরিফিকেশন ও ক্যাটালগ</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-white font-bold text-base">GhorBondhu (ঘরবন্ধু)</span>
            <p className="text-xs text-slate-500 mt-1">Trusted Help, Right at Home. Dhaka, Bangladesh.</p>
          </div>
          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} GhorBondhu. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
