import LandingGate from "@/components/landing/LandingGate";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import PriceDecayShowcase from "@/components/landing/PriceDecayShowcase";
import LiveAuctions from "@/components/landing/LiveAuctions";
import EscrowPerimeter from "@/components/landing/EscrowPerimeter";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

/* Compare, Pricing, and FAQ each moved to their own dedicated page
   (/compare, /pricing, /faq), linked from Nav, rather than living as
   in-page sections here — the landing page stays the pitch narrative
   (mechanic -> proof -> trust -> close); reference content that stands
   on its own doesn't need to compete for scroll real estate in that
   narrative. */
export default function LandingPage() {
  return (
    <LandingGate>
      <Nav />
      <Hero />
      <PriceDecayShowcase />
      <LiveAuctions />
      <EscrowPerimeter />
      <CTA />
      <Footer />
    </LandingGate>
  );
}
