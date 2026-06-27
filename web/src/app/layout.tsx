import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalNavbar } from "@/components/conditional-navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProvider>
          <div className="min-h-screen flex flex-col">
            <ConditionalNavbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster richColors position="top-right" />
        </AppProvider>
      </body>
    </html>
  );
}
