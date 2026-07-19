"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
 const [email, setEmail] = useState("");
 const [submitting, setSubmitting] = useState(false);
 const [sent, setSent] = useState(false);
 const [error, setError] = useState("");

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email.trim() || submitting) return;
 setSubmitting(true);
 setError("");
 try {
 const res = await fetch("/api/auth/forgot", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email: email.trim() }),
 });
 const data = await res.json();
 if (!res.ok || data.error) {
 setError(data.error ?? "Something went wrong");
 } else {
 setSent(true);
 }
 } catch {
 setError("Network error — please try again");
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="min-h-screen bg-[#fbfaf7] grid-bg flex items-center justify-center px-4">
 <div className="max-w-sm w-full">
 <Link href="/login" className="inline-flex items-center gap-1.5 text-[#6f6a7d] text-sm hover:text-[#4b3f8f] transition-colors mb-6">
 <ArrowLeft className="h-4 w-4" /> Back to Login
 </Link>
 <div className="glass-panel p-8 animate-scale-in">
 <div className="flex items-center gap-2.5 mb-6 justify-center">
 <Logo markClassName="h-9 w-9" textClassName="text-lg font-bold tracking-[0.03em] font-sans" />
 </div>

 {sent ? (
 <div className="text-center">
 <div className="h-14 w-14 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] flex items-center justify-center mx-auto mb-4">
 <Mail className="h-7 w-7 text-[#4b3f8f]" />
 </div>
 <h1 className="font-heading text-xl font-bold text-[#3d3a45] mb-2">Check your email</h1>
 <p className="text-sm text-[#6f6a7d]">
 If <span className="text-[#3d3a45] font-medium">{email}</span> is registered, we&apos;ve sent a link to reset your password. The link expires in 1 hour.
 </p>
 </div>
 ) : (
 <>
 <h1 className="font-heading text-xl font-bold text-[#3d3a45] mb-1 text-center">Forgot your password?</h1>
 <p className="text-sm text-[#6f6a7d] mb-6 text-center">Enter your email and we&apos;ll send you a reset link.</p>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="relative">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6a7d]" />
 <input
 type="email"
 required
 autoFocus
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@example.com"
 className="glass-input w-full h-12 pl-11 pr-4 text-sm rounded-full"
 />
 </div>
 {error && <p className="text-[#c14d3a] text-xs">{error}</p>}
 <button
 type="submit"
 disabled={submitting || !email.trim()}
 className="btn-primary w-full h-12 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
 </button>
 </form>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
