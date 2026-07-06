import LandingGate from "@/components/landing/LandingGate";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProductShowcase from "@/components/landing/ProductShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import Comparison from "@/components/landing/Comparison";
import PricingSection from "@/components/landing/PricingSection";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <LandingGate>
      <Nav />
      <Hero />
      <SocialProof />
      <ProductShowcase />
      <HowItWorks />
      <Comparison />
      <PricingSection />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </LandingGate>
  );
}
