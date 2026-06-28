import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalNavbar } from "@/components/conditional-navbar";
import MobileBottomNav from "@/components/mobile-bottom-nav";

const inter = Inter({
 subsets: ["latin"],
 variable: "--font-inter",
 display: "swap",
 weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
 title: "GeekBid — Reverse Auction Marketplace for Tech Talent",
 description:
 "The world's first reverse-auction marketplace for developers. Post a job, watch prices drop, and hire top tech talent at the right price.",
 keywords: [
 "freelancing",
 "reverse auction",
 "developer marketplace",
 "hire developers",
 "tech talent",
 ],
};

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <html lang="en" className="dark" style={{ background: '#080b14' }}>
 <body className={`${inter.variable} antialiased bg-[#080b14] text-[#a8997e]`}>
 <AppProvider>
 <div className="min-h-screen flex flex-col bg-[#080b14]">
 <ConditionalNavbar />
 <MobileBottomNav />
 <main className="flex-1 pb-16 md:pb-0">{children}</main>
 </div>
 <Toaster richColors position="top-right" />
 </AppProvider>
 </body>
 </html>
 );
}
