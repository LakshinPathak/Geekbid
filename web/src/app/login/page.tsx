"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, ArrowRight, ArrowLeft, Code, Building2, Shield,
  Mail, Lock, User, Loader2, Eye, EyeOff, Sparkles,
  TrendingDown, DollarSign, Star, CheckCircle2,
} from "lucide-react";

type RoleKey = "freelancer" | "client" | "admin";

const ROLE_CONFIG: Record<RoleKey, {
  icon: typeof Code; label: string; tagline: string; perks: string[];
}> = {
  freelancer: {
    icon: Code, label: "Freelancer", tagline: "Find work. Set your terms. Get paid.",
    perks: ["Browse live reverse auctions", "Build your GeekScore™", "Counter-bid on projects", "Instant escrow payouts"],
  },
  client: {
    icon: Building2, label: "Client", tagline: "Hire smarter. Pay less. Ship faster.",
    perks: ["Post reverse auction jobs", "Watch prices drop in real-time", "Vetted developer talent pool", "100% escrow protection"],
  },
  admin: {
    icon: Shield, label: "Admin", tagline: "Complete platform control.",
    perks: ["Platform health dashboard", "Dispute resolution", "User & transaction management", "Revenue analytics"],
  },
};

const FLOATING_STATS = [
  { icon: TrendingDown, label: "Avg. Savings", value: "38%" },
  { icon: DollarSign, label: "Total Paid", value: "$1.2M+" },
  { icon: Star, label: "Satisfaction", value: "4.9/5" },
];

function LoginPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { login, register, currentUser, mounted, loading } = useApp();

  const initialRole = (params.get("role") as RoleKey) || "freelancer";
  const initialTab = params.get("tab") === "register" ? "register" : "login";

  const [role, setRole] = useState<RoleKey>(initialRole);
  const [mode, setMode] = useState<"login" | "register">(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rc = ROLE_CONFIG[role];

  // Handle Google OAuth callback
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
        const expiresAt = Date.now() + Number(expiresIn) * 1000;
        localStorage.setItem("gb_access_token", googleToken);
        localStorage.setItem("gb_token_expires", String(expiresAt));
        localStorage.setItem("gb_user", JSON.stringify(user));
        setSuccess("Signed in with Google!");
        setTimeout(() => router.replace("/feed"), 300);
      } catch {
        setError("Failed to process Google login");
      }
    }
  }, [params, router]);

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
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.04] bg-white" />
        <div className="absolute bottom-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full blur-3xl opacity-[0.03] bg-white" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black group-hover:bg-white/90 transition-colors">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-lg font-extrabold text-white">Geek<span className="text-white/50">Bid</span></span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 pb-12 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16 max-w-5xl w-full items-center">

            {/* Left — Branding */}
            <div className="hidden lg:flex lg:col-span-2 flex-col animate-fade-in">
              <div className="mb-10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-lg mb-5">
                  <rc.icon className="h-7 w-7" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
                  {mode === "login" ? "Welcome Back" : `Join as ${rc.label}`}
                </h1>
                <p className="text-white/40 text-base">{rc.tagline}</p>
              </div>

              <ul className="space-y-3 mb-10">
                {rc.perks.map((p, i) => (
                  <li key={p} className="flex items-center gap-3 text-white/40 text-sm animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white/60" />
                    </div>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-4">
                {FLOATING_STATS.map(s => (
                  <div key={s.label} className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <s.icon className="h-4 w-4 text-white/30 mb-1.5" />
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[11px] text-white/25">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Form */}
            <div className="lg:col-span-3 w-full max-w-md mx-auto lg:max-w-none animate-slide-up">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-2xl overflow-hidden">
                {/* Role selector */}
                <div className="flex border-b border-white/[0.06] bg-white/[0.02]">
                  {(Object.keys(ROLE_CONFIG) as RoleKey[]).map(r => {
                    const cfg = ROLE_CONFIG[r];
                    const isActive = role === r;
                    return (
                      <button key={r} onClick={() => { setRole(r); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all relative ${
                          isActive ? "text-white" : "text-white/30 hover:text-white/60"
                        }`}>
                        <cfg.icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{cfg.label}</span>
                        {isActive && <div className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-white rounded-full" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6 sm:p-8">
                  {/* Mode toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-6">
                    <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        mode === "login" ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/70"
                      }`}>Sign In</button>
                    <button onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        mode === "register" ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/70"
                      }`}>Create Account</button>
                  </div>

                  {/* Mobile role label */}
                  <div className="lg:hidden flex items-center gap-2.5 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
                      <rc.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{rc.label} Account</p>
                      <p className="text-white/30 text-xs">{rc.tagline}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "register" && (
                      <div>
                        <label className="text-xs font-medium text-white/40 mb-1.5 block uppercase tracking-wider">Full Name</label>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-white/60 transition-colors" />
                          <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                            className="pl-11 h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-white/20 focus:bg-white/[0.06] transition-all rounded-xl" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-white/40 mb-1.5 block uppercase tracking-wider">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-white/60 transition-colors" />
                        <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                          className="pl-11 h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-white/20 focus:bg-white/[0.06] transition-all rounded-xl" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-white/40 mb-1.5 block uppercase tracking-wider">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-white/60 transition-colors" />
                        <Input type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                          className="pl-11 pr-11 h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-white/20 focus:bg-white/[0.06] transition-all rounded-xl" />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                        <span>✕</span> {error}
                      </div>
                    )}
                    {success && (
                      <div className="flex items-center gap-2 text-sm text-white bg-white/10 border border-white/20 rounded-xl px-4 py-3 animate-fade-in">
                        <CheckCircle2 className="h-4 w-4" /> {success}
                      </div>
                    )}

                    <Button type="submit" disabled={loading}
                      className="w-full h-12 font-bold text-sm bg-white text-black hover:bg-white/90 shadow-lg rounded-xl transition-all mt-2">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" /></>}
                    </Button>
                  </form>

                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[11px] text-white/20 uppercase tracking-widest font-medium">or</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-11 bg-white/[0.02] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.15] rounded-xl transition-all group"
                    onClick={() => window.location.href = `/api/auth/google?role=${role}`}
                    type="button"
                  >
                    <svg className="h-4 w-4 mr-2 group-hover:opacity-100 opacity-70 transition-opacity" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </Button>

                  <p className="text-center text-sm text-white/30 mt-5">
                    {mode === "login" ? "New to GeekBid?" : "Already have an account?"}{" "}
                    <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
                      className="text-white font-semibold hover:underline underline-offset-2">
                      {mode === "login" ? "Create Account" : "Sign In"}
                    </button>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 text-[11px] text-white/15">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> 256-bit SSL</span>
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> SOC 2</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> GDPR Ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-4 text-center">
          <p className="text-[11px] text-white/10">&copy; 2026 GeekBid Inc.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><div className="h-8 w-8 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
