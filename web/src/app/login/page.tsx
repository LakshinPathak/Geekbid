"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
  Zap, ArrowRight, ArrowLeft, Code, Briefcase, Shield,
  Mail, Lock, User, Loader2, Eye, EyeOff, TrendingDown,
  CheckCircle2, ChevronRight,
} from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const level = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
  const colors = ["bg-[#F5F2EA]", "bg-red-500", "bg-yellow-500", "bg-[#C8923D]"];
  return (
    <div className="flex gap-1 mt-1.5">
      {[1, 2, 3].map(i => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= level ? colors[level] : "bg-[#F5F2EA]"}`} />
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
    <div className="min-h-screen bg-[#EDE8DC] flex">
      {/* ─── Left Branding Panel (lg+) ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#EDE8DC] relative overflow-hidden flex-col justify-between p-12 grid-bg scanline">
        {/* Glow blobs */}
        <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-[#C8923D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-[#C8923D]/3 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8923D] text-white animate-pulse-glow">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-heading text-2xl font-bold text-[#182739]">
              Geek<span className="text-[#C8923D]">.</span>Bid
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="font-heading text-4xl xl:text-5xl font-bold text-[#182739] leading-tight mt-8">
            The marketplace where{" "}
            <span className="text-gradient">prices go down.</span>
          </h1>

          <div className="flex flex-col gap-3 mt-8">
            {["Reverse auction pricing", "Escrow-protected payments", "Real-time price decay"].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-[#3D4E5C] text-sm">
                <span className="text-[#C8923D]">✦</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Mini price ticker */}
        <div className="relative z-10 glass-panel-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[rgba(200,146,61,0.10)] flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-[#C8923D]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#182739]">AI Chatbot Build</p>
                <p className="text-xs text-[#7B8694]">Live auction</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-bold text-[#C8923D]">$647</p>
              <p className="text-xs text-red-400/70">-$15/hr</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#EDE8DC] grid-bg">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8923D] text-white">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-heading text-xl font-bold text-[#182739]">
                Geek<span className="text-[#C8923D]">.</span>Bid
              </span>
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="inline-flex glass-panel-sm p-1 mb-8" style={{ borderRadius: "12px" }}>
            <button
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login" ? "bg-[#C8923D] text-white font-bold" : "text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0]"
              }`}
            >Log in</button>
            <button
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register" ? "bg-[#C8923D] text-white font-bold" : "text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0]"
              }`}
            >Sign up</button>
          </div>

          {/* Form heading */}
          <h2 className="font-heading text-2xl font-bold text-[#182739]">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h2>
          <p className="text-[#3D4E5C] text-sm mt-1">
            {mode === "login" ? "Enter your credentials to continue" : "Get started with GeekBid today"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                {/* Full name */}
                <div>
                  <label className="text-xs font-medium text-[#7B8694] mb-1.5 block uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B8694]" />
                    <input
                      placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                      className="w-full h-12 glass-input rounded-xl text-sm"
                      style={{ paddingLeft: '44px', paddingRight: '16px' }}
                    />
                  </div>
                </div>

                {/* Role selector */}
                <div>
                  <label className="text-xs font-medium text-[#7B8694] mb-1.5 block uppercase tracking-wider">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setRole("client")}
                      className={`border rounded-xl p-4 text-center cursor-pointer transition-all duration-300 ${
                        role === "client"
                          ? "border-[#C8923D] bg-[rgba(200,146,61,0.10)] shadow-[var(--shadow-accent)]"
                          : "border-[#BEB5A5] bg-[#EDE8DC] hover:border-[#C8923D]"
                      }`}>
                      <Briefcase className={`h-5 w-5 mx-auto mb-1.5 ${role === "client" ? "text-[#C8923D]" : "text-[#3D4E5C]"}`} />
                      <p className={`text-sm font-medium ${role === "client" ? "text-[#182739]" : "text-[#3D4E5C]"}`}>I&apos;m a Client</p>
                      <p className="text-[#7B8694] text-xs mt-0.5">I need to hire</p>
                    </button>
                    <button type="button" onClick={() => setRole("freelancer")}
                      className={`border rounded-xl p-4 text-center cursor-pointer transition-all duration-300 ${
                        role === "freelancer"
                          ? "border-[#C8923D] bg-[rgba(200,146,61,0.10)] shadow-[var(--shadow-accent)]"
                          : "border-[#BEB5A5] bg-[#EDE8DC] hover:border-[#C8923D]"
                      }`}>
                      <Code className={`h-5 w-5 mx-auto mb-1.5 ${role === "freelancer" ? "text-[#C8923D]" : "text-[#3D4E5C]"}`} />
                      <p className={`text-sm font-medium ${role === "freelancer" ? "text-[#182739]" : "text-[#3D4E5C]"}`}>I&apos;m a Freelancer</p>
                      <p className="text-[#7B8694] text-xs mt-0.5">I want to work</p>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[#7B8694] mb-1.5 block uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B8694]" />
                <input
                  type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 glass-input rounded-xl text-sm"
                  style={{ paddingLeft: '44px', paddingRight: '16px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#7B8694] uppercase tracking-wider">Password</label>
                {mode === "login" && (
                  <button type="button" className="text-[#C8923D] text-xs hover:text-[#E0A33E] transition-colors">Forgot password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B8694]" />
                <input
                  type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 glass-input rounded-xl text-sm"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7B8694] hover:text-[#3D4E5C] transition-colors">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "register" && <PasswordStrength password={password} />}
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in-up">
                <span>✗</span> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-[#C8923D] bg-[rgba(200,146,61,0.10)] border border-[#C8923D]/30 rounded-xl px-4 py-3 animate-fade-in-up">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-12 btn-primary rounded-xl text-sm payment-ready disabled:opacity-50 disabled:cursor-not-allowed disabled:animation-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#BEB5A5]" />
            <span className="text-xs text-[#7B8694]">or</span>
            <div className="flex-1 h-px bg-[#BEB5A5]" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => window.location.href = `/api/auth/google?role=${role}`}
            type="button"
            className="w-full h-12 btn-ghost rounded-xl text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          {/* Switch mode */}
          <p className="text-center text-sm text-[#3D4E5C] mt-6">
            {mode === "login" ? "New to GeekBid?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="text-[#C8923D] font-semibold hover:text-[#E0A33E] transition-colors">
              {mode === "login" ? "Create Account" : "Log in"}
            </button>
          </p>

          {/* Terms */}
          <p className="text-[#7B8694] text-xs mt-6 text-center">
            By continuing, you agree to our{" "}
            <span className="text-[#C8923D] hover:underline cursor-pointer">Terms</span> and{" "}
            <span className="text-[#C8923D] hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#EDE8DC]"><div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
