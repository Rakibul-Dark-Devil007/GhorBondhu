import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GhorBondhu (ঘরবন্ধু) | Trusted Help, Right at Home",
  description: "স্মার্ট ও নির্ভরযোগ্য হোম সার্ভিস প্ল্যাটফর্ম - ক্লিনিং, রান্না, লন্ড্রি ও গৃহস্থালী সেবা।",
  keywords: ["home service", "cleaning", "maid service", "cook", "dhaka", "ghorbondhu", "ঘরবন্ধু"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { AuthProvider } from "@/components/auth/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className="font-sans antialiased text-slate-800 bg-slate-50 selection:bg-brand-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
