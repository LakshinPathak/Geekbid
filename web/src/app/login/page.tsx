"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
 Zap, ArrowRight, Code, Briefcase,
 Mail, Lock, User, Loader2, Eye, EyeOff,
 TrendingDown, CheckCircle2,
} from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
 const len = password.length;
 const level = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
 const colors = ["bg-[rgba(201,168,76,0.08)]", "bg-red-500", "bg-yellow-500", "bg-[#d4b55a]"];
 return (
 <div className="flex gap-1 mt-1.5">
 {[1, 2, 3].map(i => (
 <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= level ? colors[level] : "bg-[rgba(201,168,76,0.08)]"}`} />
 ))}
 </div>
 );
}

function LoginPageContent() {
 const params = useSearchParams();
 const router = useRouter();
 const { login, register, currentUser, mounted, loading, googleAuth } = useApp();

 const initialRole = (params.get("role") as "freelancer" | "client") || "freelancer";
 const initialTab = params.get("tab") === "register" ? "register" : "login";

 const [role, setRole] = useState<"freelancer" | "client">(initialRole === "client" ? "client" : "freelancer");
 const [mode, setMode] = useState<"login" | "register">(initialTab);
 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPwd, setShowPwd] = useState(false);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");

 useEffect(() => {
 const googleToken = params.get("google_token");
 const googleUser = params.get("google_user");
 const expiresIn = params.get("expires_in");
 const googleError = params.get("error");

 if (googleError) {
 setError(`Google login failed: ${googleError.replace(/_/g, " ")}`);
 return;
 }

 if (googleToken && googleUser && expiresIn) {
 try {
 const user = JSON.parse(decodeURIComponent(googleUser));
 googleAuth(googleToken, Number(expiresIn), user);
 setSuccess("Signed in with Google!");
 setTimeout(() => router.replace("/feed"), 300);
 } catch {
 setError("Failed to process Google login");
 }
 }
 }, [params, router, googleAuth]);

 useEffect(() => {
 if (mounted && currentUser) router.replace("/feed");
 }, [mounted, currentUser, router]);

 const handleSubmit = useCallback(async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setSuccess("");
 if (mode === "register" && !name.trim()) { setError("Full name is required"); return; }
 if (!email.trim()) { setError("Email is required"); return; }
 if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters"); return; }

 const result = mode === "login"
 ? await login(email, password)
 : await register(name, email, password, role);

 if (result.ok) {
 setSuccess(mode === "login" ? "Welcome back!" : "Account created!");
 setTimeout(() => router.push("/feed"), 500);
 } else {
 setError(result.message);
 }
 }, [mode, name, email, password, role, login, register, router]);

 if (!mounted) return null;
 if (currentUser) return null;

 return (
 <div className="min-h-screen flex" style={{ background: "#0D1B2A" }}>

 {/* ─── Left Branding Panel (lg+) ─── */}
 <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
 style={{ background: "#0A1520" }}>

 {/* Dot grid overlay */}
 <div className="absolute inset-0"
 style={{
 backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
 backgroundSize: "24px 24px",
 }} />

 {/* Glow blobs */}
 <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full blur-[120px]"
 style={{ background: "rgba(200,146,61,0.06)" }} />
 <div className="absolute bottom-[-80px] right-[-80px] w-[220px] h-[220px] rounded-full blur-[80px]"
 style={{ background: "rgba(201,168,76,0.05)" }} />

 {/* Logo */}
 <div className="relative z-10">
 <Link href="/" className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[#f0e8d4]"
 style={{ background: "#c9a84c" }}>
 <Zap className="h-4 w-4" />
 </div>
 <span className="font-heading text-2xl font-bold" style={{ color: "#F0EDE8" }}>
 Geek<span style={{ color: "#c9a84c" }}>.</span>Bid
 </span>
 </Link>
 </div>

 {/* Hero text */}
 <div className="relative z-10 flex-1 flex flex-col justify-center">
 <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-5"
 style={{ color: "#9BB3C8" }}>
 Reverse Auction Marketplace
 </p>
 <h1 className="font-heading text-4xl xl:text-5xl font-bold leading-tight"
 style={{ color: "#F0EDE8" }}>
 The marketplace where{" "}
 <span style={{ WebkitBackgroundClip: "text",
 WebkitTextFillColor: "transparent",
 backgroundClip: "text",
 }}>
 prices go down.
 </span>
 </h1>

 <div className="flex flex-col gap-3 mt-8">
 {["Reverse auction pricing", "Escrow-protected payments", "Real-time price decay"].map(f => (
 <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#9BB3C8" }}>
 <span style={{ color: "#E0A33E" }}>✦</span>
 {f}
 </div>
 ))}
 </div>
 </div>

 {/* Mini price ticker */}
 <div className="relative z-10 rounded-[6px] p-4 border"
 style={{
 background: "#162232",
 borderColor: "rgba(255,255,255,0.08)", }}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-[3px] flex items-center justify-center"
 style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(200,146,61,0.20)" }}>
 <TrendingDown className="h-4 w-4" style={{ color: "#E0A33E" }} />
 </div>
 <div>
 <p className="text-sm font-medium" style={{ color: "#F0EDE8" }}>AI Chatbot Build</p>
 <p className="text-xs" style={{ color: "#9BB3C8" }}>Live auction</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-heading text-lg font-bold" style={{ color: "#E0A33E" }}>$647</p>
 <p className="text-xs" style={{ color: "#EF4444" }}>-$15/hr</p>
 </div>
 </div>
 {/* Decay bar */}
 <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
 <div className="h-full rounded-full transition-all" style={{ width: "27%", background: "#E0A33E" }} />
 </div>
 <div className="flex justify-between mt-1.5">
 <span className="text-[10px]" style={{ color: "#9BB3C8" }}>Floor: $500</span>
 <span className="text-[10px]" style={{ color: "#9BB3C8" }}>Start: $2,400</span>
 </div>
 </div>
 </div>

 {/* ─── Right Form Panel ─── */}
 <div className="flex-1 flex items-center justify-center px-6 py-12 relative"
 style={{ background: "#0D1B2A" }}>

 {/* Dot grid */}
 <div className="absolute inset-0 pointer-events-none"
 style={{
 backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
 backgroundSize: "24px 24px",
 }} />

 {/* Glow */}
 <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none"
 style={{ background: "rgba(201,168,76,0.05)" }} />

 <div className="w-full max-w-md relative z-10 animate-fade-in-up">

 {/* Mobile logo */}
 <div className="lg:hidden flex items-center gap-2.5 mb-8">
 <Link href="/" className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-[3px] text-[#f0e8d4]"
 style={{ background: "#c9a84c" }}>
 <Zap className="h-4 w-4" />
 </div>
 <span className="font-heading text-xl font-bold" style={{ color: "#F0EDE8" }}>
 Geek<span style={{ color: "#c9a84c" }}>.</span>Bid
 </span>
 </Link>
 </div>

 {/* Tab switcher */}
 <div className="inline-flex p-1 mb-8 rounded-[6px]"
 style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
 <button
 onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
 className="px-6 py-2 rounded-[3px] text-sm font-medium transition-all"
 style={mode === "login"
 ? { background: "#E0A33E", color: "#0D1B2A", fontWeight: 700 }
 : { color: "#9BB3C8" }}
 >Log in</button>
 <button
 onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
 className="px-6 py-2 rounded-[3px] text-sm font-medium transition-all"
 style={mode === "register"
 ? { background: "#E0A33E", color: "#0D1B2A", fontWeight: 700 }
 : { color: "#9BB3C8" }}
 >Sign up</button>
 </div>

 {/* Heading */}
 <h2 className="font-heading text-2xl font-bold" style={{ color: "#F0EDE8" }}>
 {mode === "login" ? "Welcome back." : "Create your account."}
 </h2>
 <p className="text-sm mt-1" style={{ color: "#9BB3C8" }}>
 {mode === "login" ? "Enter your credentials to continue" : "Get started with GeekBid today"}
 </p>

 <form onSubmit={handleSubmit} className="mt-6 space-y-4">
 {mode === "register" && (
 <>
 {/* Full name */}
 <div>
 <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
 style={{ color: "#9BB3C8" }}>Full Name</label>
 <div className="relative">
 <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9BB3C8" }} />
 <input
 placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
 className="w-full h-12 rounded-[6px] text-sm outline-none transition-all"
 style={{
 paddingLeft: "44px", paddingRight: "16px",
 background: "rgba(255,255,255,0.06)",
 border: "1px solid rgba(255,255,255,0.10)",
 color: "#F0EDE8",
 }}
 />
 </div>
 </div>

 {/* Role selector */}
 <div>
 <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
 style={{ color: "#9BB3C8" }}>I am a...</label>
 <div className="grid grid-cols-2 gap-3">
 <button type="button" onClick={() => setRole("client")}
 className="rounded-[6px] p-4 text-center cursor-pointer transition-all duration-300"
 style={role === "client"
 ? { background: "rgba(201,168,76,0.12)", border: "1px solid rgba(200,146,61,0.40)", }
 : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
 <Briefcase className="h-5 w-5 mx-auto mb-1.5"
 style={{ color: role === "client" ? "#E0A33E" : "#9BB3C8" }} />
 <p className="text-sm font-medium" style={{ color: role === "client" ? "#F0EDE8" : "#9BB3C8" }}>I&apos;m a Client</p>
 <p className="text-xs mt-0.5" style={{ color: "#6B8BA4" }}>I need to hire</p>
 </button>
 <button type="button" onClick={() => setRole("freelancer")}
 className="rounded-[6px] p-4 text-center cursor-pointer transition-all duration-300"
 style={role === "freelancer"
 ? { background: "rgba(201,168,76,0.12)", border: "1px solid rgba(200,146,61,0.40)", }
 : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
 <Code className="h-5 w-5 mx-auto mb-1.5"
 style={{ color: role === "freelancer" ? "#E0A33E" : "#9BB3C8" }} />
 <p className="text-sm font-medium" style={{ color: role === "freelancer" ? "#F0EDE8" : "#9BB3C8" }}>I&apos;m a Freelancer</p>
 <p className="text-xs mt-0.5" style={{ color: "#6B8BA4" }}>I want to work</p>
 </button>
 </div>
 </div>
 </>
 )}

 {/* Email */}
 <div>
 <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
 style={{ color: "#9BB3C8" }}>Email</label>
 <div className="relative">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9BB3C8" }} />
 <input
 type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
 className="w-full h-12 rounded-[6px] text-sm outline-none transition-all"
 style={{
 paddingLeft: "44px", paddingRight: "16px",
 background: "rgba(255,255,255,0.06)",
 border: "1px solid rgba(255,255,255,0.10)",
 color: "#F0EDE8",
 }}
 />
 </div>
 </div>

 {/* Password */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="text-xs font-semibold uppercase tracking-wider"
 style={{ color: "#9BB3C8" }}>Password</label>
 {mode === "login" && (
 <button type="button" className="text-xs transition-colors hover:opacity-80"
 style={{ color: "#E0A33E" }}>Forgot password?</button>
 )}
 </div>
 <div className="relative">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9BB3C8" }} />
 <input
 type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
 className="w-full h-12 rounded-[6px] text-sm outline-none transition-all"
 style={{
 paddingLeft: "44px", paddingRight: "44px",
 background: "rgba(255,255,255,0.06)",
 border: "1px solid rgba(255,255,255,0.10)",
 color: "#F0EDE8",
 }}
 />
 <button type="button" onClick={() => setShowPwd(!showPwd)}
 className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
 style={{ color: "#9BB3C8" }}>
 {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 {mode === "register" && <PasswordStrength password={password} />}
 </div>

 {/* Error / Success */}
 {error && (
 <div className="flex items-center gap-2 text-sm rounded-[6px] px-4 py-3 animate-fade-in-up"
 style={{ color: "#F87171", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
 <span>✗</span> {error}
 </div>
 )}
 {success && (
 <div className="flex items-center gap-2 text-sm rounded-[6px] px-4 py-3 animate-fade-in-up"
 style={{ color: "#E0A33E", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(200,146,61,0.30)" }}>
 <CheckCircle2 className="h-4 w-4" /> {success}
 </div>
 )}

 {/* Submit */}
 <button type="submit" disabled={loading}
 className="w-full h-12 rounded-[6px] text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: "#E0A33E", color: "#0D1B2A" }}>
 {loading
 ? <Loader2 className="h-5 w-5 animate-spin" />
 : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight className="h-4 w-4" /></>}
 </button>
 </form>

 {/* Divider */}
 <div className="flex items-center gap-4 my-6">
 <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
 <span className="text-xs" style={{ color: "#6B8BA4" }}>or</span>
 <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
 </div>

 {/* Google OAuth */}
 <button
 onClick={() => window.location.href = `/api/auth/google?role=${role}`}
 type="button"
 className="w-full h-12 rounded-[6px] text-sm font-medium flex items-center justify-center gap-3 transition-all"
 style={{
 background: "rgba(255,255,255,0.05)",
 border: "1px solid rgba(255,255,255,0.12)",
 color: "#C8D8E8",
 }}
 onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
 >
 <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
 Continue with Google
 </button>

 {/* Switch mode */}
 <p className="text-center text-sm mt-6" style={{ color: "#9BB3C8" }}>
 {mode === "login" ? "New to GeekBid?" : "Already have an account?"}{" "}
 <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
 className="font-semibold transition-colors hover:opacity-80"
 style={{ color: "#E0A33E" }}>
 {mode === "login" ? "Create Account" : "Log in"}
 </button>
 </p>

 {/* Terms */}
 <p className="text-xs mt-4 text-center" style={{ color: "#6B8BA4" }}>
 By continuing, you agree to our{" "}
 <span className="hover:underline cursor-pointer" style={{ color: "#E0A33E" }}>Terms</span> and{" "}
 <span className="hover:underline cursor-pointer" style={{ color: "#E0A33E" }}>Privacy Policy</span>.
 </p>
 </div>
 </div>
 </div>
 );
}

export default function LoginPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1B2A" }}>
 <div className="h-8 w-8 border-2 rounded-full animate-spin"
 style={{ borderColor: "rgba(224,163,62,0.30)", borderTopColor: "#E0A33E" }} />
 </div>
 }>
 <LoginPageContent />
 </Suspense>
 );
}
