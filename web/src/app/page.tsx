import LandingGate from "@/components/landing/LandingGate";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import CeilingToFloor from "@/components/landing/CeilingToFloor";
import PriceDecayShowcase from "@/components/landing/PriceDecayShowcase";
import CaseTimeline from "@/components/landing/CaseTimeline";
import LiveAuctions from "@/components/landing/LiveAuctions";
import Categories from "@/components/landing/Categories";
import MechanismTrace from "@/components/landing/MechanismTrace";
import AuthorityStream from "@/components/landing/AuthorityStream";
import EscrowPerimeter from "@/components/landing/EscrowPerimeter";
import WhyGeekBidSection from "@/components/landing/WhyGeekBidSection";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import PayoffBand from "@/components/landing/PayoffBand";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <LandingGate>
      <Nav />
      <Hero />
      <SocialProof />
      <CeilingToFloor />
      <PriceDecayShowcase />
      <CaseTimeline />
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-2">
        <LiveAuctions />
        <Categories />
      </div>
      <MechanismTrace />
      <AuthorityStream />
      <EscrowPerimeter />
      <WhyGeekBidSection />
      <Testimonials />
      <FAQ />
      <PayoffBand />
      <CTA />
      <Footer />
    </LandingGate>
  );
}
