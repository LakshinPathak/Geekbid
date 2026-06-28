"use client";
import { useApp } from "@/lib/store";
import { Check, Zap, Building2, Crown } from "lucide-react";
import Link from "next/link";

const PLANS = [
 {
 name: "Free",
 price: "$0",
 period: "forever",
 icon: Zap,
 features: [
 "3 job posts/month",
 "10 bids/month",
 "Basic profile",
 "Standard search ranking",
 "10% platform fee",
 ],
 cta: "Current Plan",
 highlight: false,
 value: "free",
 },
 {
 name: "Pro",
 price: "$29",
 period: "/month",
 icon: Crown,
 features: [
 "Unlimited job posts",
 "Unlimited bids",
 "Priority in search",
 "Featured profile badge",
 "7% platform fee",
 "Advanced analytics",
 ],
 cta: "Upgrade to Pro",
 highlight: true,
 value: "pro",
 },
 {
 name: "Enterprise",
 price: "$99",
 period: "/month",
 icon: Building2,
 features: [
 "Everything in Pro",
 "Team seats (up to 10)",
 "API access",
 "Dedicated support",
 "5% platform fee",
 "Custom integrations",
 ],
 cta: "Contact Sales",
 highlight: false,
 value: "enterprise",
 },
];

export default function PricingPage() {
 const { currentUser } = useApp();
 const currentPlan = currentUser?.plan ?? "free";

 return (
 <div className="min-h-screen bg-[#0d1120] grid-bg">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
 <div className="text-center mb-12 animate-fade-in-up">
 <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gradient">Simple, Transparent Pricing</h1>
 <p className="text-[#a8997e] text-sm mt-2">Choose the plan that fits your needs. Upgrade anytime.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {PLANS.map((plan, idx) => (
 <div
 key={plan.value}
 className={`glass-panel p-6 flex flex-col animate-fade-in-up ${
 plan.highlight ? "border-[rgba(201,168,76,0.35)]/60 glow-border" : ""
 }`}
 style={{ animationDelay: `${idx * 0.1}s` }}
 >
 {plan.highlight && (
 <span className="bg-[#c9a84c] text-white text-[11px] font-bold px-3 py-1 rounded-full self-start mb-4">
 MOST POPULAR
 </span>
 )}
 <div className="flex items-center gap-2 mb-4">
 <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
 <h2 className="font-heading text-xl font-bold text-[#f0e8d4]">{plan.name}</h2>
 </div>
 <div className="mb-6">
 <span className="font-heading text-4xl font-bold text-[#f0e8d4]">{plan.price}</span>
 <span className="text-[#6b5f45] text-sm ml-1">{plan.period}</span>
 </div>
 <ul className="space-y-3 mb-8 flex-1">
 {plan.features.map(f => (
 <li key={f} className="flex items-center gap-2 text-sm text-[#a8997e]">
 <Check className="h-4 w-4 text-[#c9a84c] shrink-0" /> {f}
 </li>
 ))}
 </ul>
 <button
 disabled={currentPlan === plan.value}
 className={`w-full py-3 rounded-[6px] font-semibold text-sm transition-all ${
 currentPlan === plan.value
 ? "bg-[#111625] text-[#6b5f45] cursor-not-allowed"
 : plan.highlight
 ? "btn-primary"
 : "btn-ghost"
 }`}
 >
 {currentPlan === plan.value ? "Current Plan" : plan.cta}
 </button>
 </div>
 ))}
 </div>

 <div className="text-center mt-8">
 <Link href="/feed" className="text-[#a8997e] text-sm hover:text-[#c9a84c] transition-colors">
 Back to Feed
 </Link>
 </div>
 </div>
 </div>
 );
}
