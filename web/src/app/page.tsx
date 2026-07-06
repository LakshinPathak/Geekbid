import LandingGate from "@/components/landing/LandingGate";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import PriceDecayShowcase from "@/components/landing/PriceDecayShowcase";
import WhyGeekBidSection from "@/components/landing/WhyGeekBidSection";
import Testimonials from "@/components/landing/Testimonials";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <LandingGate>
      <Nav />
      <Hero />
      <SocialProof />
      <PriceDecayShowcase />
      <WhyGeekBidSection />
      <Testimonials />
      <CTA />
      <Footer />
    </LandingGate>
  );
}
