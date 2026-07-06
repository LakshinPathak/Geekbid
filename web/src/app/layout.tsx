import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalNavbar } from "@/components/conditional-navbar";
import MobileBottomNav from "@/components/mobile-bottom-nav";

// Replaces the previous Inter (body) + bare Georgia system-serif (headings)
// pairing — that combination is one of the most common "this looks
// AI-generated" tells (Inter everywhere, a generic system-serif fallback
// stack instead of an actual chosen display face). Fraunces is a genuine
// contrast-axis pairing against a humanist sans, giving the "Royal Dark"
// premium-editorial identity real character instead of a default.
const fraunces = Fraunces({
 subsets: ["latin"],
 variable: "--font-fraunces",
 display: "swap",
 weight: ["300", "400", "500", "600"],
});

const jakarta = Plus_Jakarta_Sans({
 subsets: ["latin"],
 variable: "--font-jakarta",
 display: "swap",
 weight: ["400", "500", "600", "700"],
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
 <html
 lang="en"
 className={`dark ${fraunces.variable} ${jakarta.variable}`}
 style={{ background: '#080b14' }}
 suppressHydrationWarning
 >
 {/* next/font's variable classes must live on <html>, not <body> — Tailwind's
 @theme inline block defines --font-sans/--font-serif on :root (which is
 the <html> element), and CSS custom properties only inherit downward, so
 :root can't see a var() defined on its own child <body>. */}
 <body className="antialiased bg-[#080b14] text-[#a8997e]">
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
