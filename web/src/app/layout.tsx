import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalNavbar } from "@/components/conditional-navbar";
import MobileBottomNav from "@/components/mobile-bottom-nav";

// Pastel Indigo theme: headings use the sans face at weight 500 (no serif
// display face), and a real monospace face carries every numeric/price
// value — see NEW_THEME.md §2/§5.
const plexMono = IBM_Plex_Mono({
 subsets: ["latin"],
 variable: "--font-plex-mono",
 display: "swap",
 weight: ["400", "500"],
});

const jakarta = Plus_Jakarta_Sans({
 subsets: ["latin"],
 variable: "--font-jakarta",
 display: "swap",
 weight: ["400", "500", "600", "700"],
});

// Landing-page-only type system — additive CSS vars, never mapped into the
// global --font-sans/--font-mono tokens, so no non-landing page is affected.
// Archivo (a grotesque with real character, not a generic rounded-friendly
// SaaS default) carries both landing headings and landing body copy — one
// family, weight does the differentiating work, per the landing page's own
// "bold/urgent/competitive" brand voice rather than a timid display+body
// pairing. JetBrains Mono replaces the app-wide IBM Plex Mono for landing's
// ticking price/stat numerals specifically (payments/profile keep Plex Mono
// via the shared --font-mono, untouched).
const archivo = Archivo({
 subsets: ["latin"],
 variable: "--font-landing-display",
 display: "swap",
 weight: ["400", "500", "600", "700"],
});

const landingMono = JetBrains_Mono({
 subsets: ["latin"],
 variable: "--font-landing-mono",
 display: "swap",
 weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
 title: "GeekBid — Reverse Auction Marketplace for Freelance Talent",
 description:
 "The world's first reverse-auction marketplace for freelancers. Post a job, watch prices drop, and hire top talent at the right price.",
 keywords: [
 "freelancing",
 "reverse auction",
 "freelance marketplace",
 "hire freelancers",
 "freelance talent",
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
 className={`${plexMono.variable} ${jakarta.variable} ${archivo.variable} ${landingMono.variable}`}
 style={{ background: '#fbfaf7' }}
 suppressHydrationWarning
 >
 {/* next/font's variable classes must live on <html>, not <body> — Tailwind's
 @theme inline block defines --font-sans/--font-serif on :root (which is
 the <html> element), and CSS custom properties only inherit downward, so
 :root can't see a var() defined on its own child <body>. */}
 <body className="antialiased bg-[#fbfaf7] text-[#6f6a7d]">
 <AppProvider>
 <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
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
