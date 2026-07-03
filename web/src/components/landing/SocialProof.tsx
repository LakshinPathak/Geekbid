"use client";

const TICKER_ITEMS = [
  { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
  { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
  { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
  { icon: "✅", text: "React Dashboard · $1,650 · matched in 3h 20m" },
  { icon: "⚡", text: "Mobile App · $3,000 · hired at $1,800" },
  { icon: "🛡️", text: "Cloud Infra · $900 · dispute resolved in 24h" },
  { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
  { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
  { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
  { icon: "✅", text: "React Dashboard · $1,650 · matched in 3h 20m" },
  { icon: "⚡", text: "Mobile App · $3,000 · hired at $1,800" },
  { icon: "🛡️", text: "Cloud Infra · $900 · dispute resolved in 24h" },
];

export default function SocialProof() {
  return (
    <div className="border-y border-[rgba(201,168,76,0.15)] bg-[#050810] py-3 overflow-hidden relative">
      {/* Left gradient fade mask */}
      <div className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none z-10" style={{ background: "linear-gradient(to right, #050810, transparent)" }} />
      {/* Center glow highlight — items brighten as they pass center */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 100% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)", zIndex: 5 }} />
      {/* Right gradient fade mask */}
      <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none z-10" style={{ background: "linear-gradient(to left, #050810, transparent)" }} />
      <div className="flex items-center gap-12 whitespace-nowrap animate-marquee">
        {TICKER_ITEMS.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[11px] text-[#a8997e] font-sans shrink-0">
            <span>{item.icon}</span>
            <span>{item.text}</span>
            {i % 6 !== 5 && <span className="text-[rgba(201,168,76,0.3)] ml-4">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
