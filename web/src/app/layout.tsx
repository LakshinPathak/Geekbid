import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
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
 className={`${plexMono.variable} ${jakarta.variable}`}
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
