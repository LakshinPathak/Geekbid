"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

function ResetPasswordContent() {
 const params = useSearchParams();
 const router = useRouter();
 const token = params.get("token") ?? "";

 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [submitting, setSubmitting] = useState(false);
 const [done, setDone] = useState(false);
 const [error, setError] = useState("");

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (submitting) return;
 setError("");
 if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
 if (password !== confirmPassword) { setError("Passwords don't match"); return; }

 setSubmitting(true);
 try {
 const res = await fetch("/api/auth/reset", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ token, newPassword: password }),
 });
 const data = await res.json();
 if (!res.ok || data.error) {
 setError(data.error ?? "Something went wrong");
 } else {
 setDone(true);
 setTimeout(() => router.push("/login"), 2500);
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

 {!token ? (
 <p className="text-sm text-[#c14d3a] text-center">
 This reset link is missing its token. Request a new one from the <Link href="/forgot-password" className="underline">forgot password</Link> page.
 </p>
 ) : done ? (
 <div className="text-center">
 <div className="h-14 w-14 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] flex items-center justify-center mx-auto mb-4">
 <CheckCircle2 className="h-7 w-7 text-[#4b3f8f]" />
 </div>
 <h1 className="font-heading text-xl font-bold text-[#3d3a45] mb-2">Password reset!</h1>
 <p className="text-sm text-[#6f6a7d]">Redirecting you to login...</p>
 </div>
 ) : (
 <>
 <h1 className="font-heading text-xl font-bold text-[#3d3a45] mb-1 text-center">Set a new password</h1>
 <p className="text-sm text-[#6f6a7d] mb-6 text-center">Choose a new password for your account.</p>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="relative">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6a7d]" />
 <input
 type="password"
 required
 autoFocus
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="New password"
 className="glass-input w-full h-12 pl-11 pr-4 text-sm rounded-full"
 />
 </div>
 <div className="relative">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6a7d]" />
 <input
 type="password"
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Confirm new password"
 className="glass-input w-full h-12 pl-11 pr-4 text-sm rounded-full"
 />
 </div>
 {error && <p className="text-[#c14d3a] text-xs">{error}</p>}
 <button
 type="submit"
 disabled={submitting || !password || !confirmPassword}
 className="btn-primary w-full h-12 rounded-full text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
 </button>
 </form>
 </>
 )}
 </div>
 </div>
 </div>
 );
}

export default function ResetPasswordPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
 <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
 </div>
 }>
 <ResetPasswordContent />
 </Suspense>
 );
}
