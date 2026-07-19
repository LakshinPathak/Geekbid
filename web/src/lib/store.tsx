"use client";
import {
 createContext,
 useContext,
 useState,
 useCallback,
 useMemo,
 useEffect,
 useRef,
 type ReactNode,
} from "react";
import {
 type User,
 type Job,
 type Bid,
 type NotificationItem,
 type Transaction,
 type Dispute,
 type ChatRoom,
 type ChatMessage,
 type Review,
 type Milestone,
 type Role,
 getCurrentPrice,
} from "@/lib/utils";
import { getPlanConfig, type PlanConfig } from "@/lib/plans";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────
type AuthState = {
 isLoggedIn: boolean;
 accessToken: string | null;
 expiresAt: number | null;
};

type ActionResult = { ok: boolean; message: string; freelancerId?: string; finalPrice?: number; code?: string; verified?: boolean; role?: string };

type AppState = {
 auth: AuthState;
 currentUser: User | null;
 users: User[];
 jobs: Job[];
 bids: Bid[];
 notifications: NotificationItem[];
 transactions: Transaction[];
 disputes: Dispute[];
 chatRooms: ChatRoom[];
 chatMessages: ChatMessage[];
 reviews: Review[];
 recommendedJobs: (Job & { matchScore: number })[];
 milestones: Milestone[];
 watchedJobIds: string[];
 now: Date;
 mounted: boolean;
 unreadCount: number;
 chatUnreadCount: number;
 loading: boolean;
 login: (email: string, password: string) => Promise<ActionResult>;
 register: (
 name: string,
 email: string,
 password: string,
 role: string
 ) => Promise<ActionResult>;
 logout: () => void;
 googleAuth: (token: string, expiresIn: number, user: User) => void;
 switchRole: (role: Role) => Promise<ActionResult>;
 acceptJob: (jobId: string) => Promise<ActionResult>;
 acceptBid: (jobId: string, bidId: string) => Promise<ActionResult>;
 counterBid: (
 jobId: string,
 price: number,
 message?: string
 ) => Promise<ActionResult>;
 postJob: (input: Partial<Job>) => Promise<ActionResult>;
 cancelJob: (jobId: string) => Promise<ActionResult>;
 completeJob: (jobId: string) => Promise<ActionResult>;
 toggleWatch: (jobId: string) => void;
 releaseEscrow: (txId: string) => Promise<ActionResult>;
 raiseDispute: (txId: string, reason: string) => Promise<ActionResult>;
 markNotificationRead: (nId: string) => void;
 markAllRead: () => void;
 sendMessage: (roomId: string, text: string) => Promise<ActionResult>;
 submitReview: (jobId: string, revieweeId: string, rating: number, comment: string) => Promise<ActionResult>;
 fetchReviews: (userId?: string) => Promise<void>;
 referralStats: { referralCode: string; totalInvites: number; signedUp: number; completed: number; totalCredits: number } | null;
 fetchReferralStats: () => Promise<void>;
 fetchMilestones: (jobId: string) => Promise<void>;
 createMilestones: (jobId: string, milestones: { title: string; description?: string; amount: number }[]) => Promise<ActionResult>;
 updateMilestone: (milestoneId: string, action: string) => Promise<ActionResult>;
 createDirectOffer: (data: { title: string; description?: string; skillsRequired?: string[]; price: number; freelancerId: string; estimatedHours?: number; category?: string }) => Promise<ActionResult>;
 respondToOffer: (jobId: string, response: "accepted" | "declined") => Promise<ActionResult>;
 verifyGithub: (githubUsername: string, step?: "start" | "confirm") => Promise<ActionResult>;
 toggleFeatured: (jobId: string, featured: boolean, paymentTransactionId?: string) => Promise<ActionResult & { code?: string; boostPrice?: number }>;
 fetchRecommendedJobs: () => Promise<void>;
 fetchJobs: () => Promise<void>;
 fetchBids: () => Promise<void>;
 fetchTransactions: () => Promise<void>;
 fetchNotifications: () => Promise<void>;
 fetchUsers: () => Promise<void>;
 fetchChatRooms: () => Promise<void>;
 fetchChatMessages: (roomId: string) => Promise<void>;
 fetchDisputes: () => Promise<void>;
 seedDatabase: () => Promise<ActionResult>;
 updateProfile: (updates: Partial<User>) => Promise<ActionResult>;
 createChatRoom: (jobId: string, participantIds: string[]) => Promise<{ ok: boolean; roomId?: string; error?: string }>;
 invites: any[];
 fetchInvites: () => Promise<void>;
 getUserPlanConfig: () => PlanConfig;
 getValidToken: () => Promise<string | null>;
 refreshCurrentUser: () => Promise<string | null>;
 planUsage: {
 jobsPostedThisMonth: number; jobsRemaining: number;
 bidsPlacedThisMonth: number; bidsRemaining: number;
 aiUsesThisMonth: number; aiRemaining: number;
 aiBidUsesThisMonth: number; aiBidRemaining: number;
 featuredBoostsUsedThisMonth: number; featuredBoostsRemaining: number;
 invitesSentThisMonth: number; invitesRemaining: number;
 };
};

// ─── Context ────────────────────────────────────────────────────
const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
 const c = useContext(Ctx);
 if (!c) throw new Error("wrap in AppProvider");
 return c;
};

// ─── Token Constants ────────────────────────────────────────────
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const STORAGE_KEY_TOKEN = "gb_access_token";
const STORAGE_KEY_EXPIRES = "gb_token_expires";
const STORAGE_KEY_USER = "gb_user";

// ─── Concurrent Session Consistency (blueprint §18) ───────────────
// apiRequest is a module-level function (not a hook), so it has no direct
// access to the Provider's React state — this tiny pub-sub lets it notify
// the Provider when a response's X-User-Plan header (set by the Phase 4
// plan-gated routes) disagrees with the plan cached in this tab, without
// threading a callback through every one of apiRequest's ~40 call sites.
let lastKnownPlan: string | null = null;
let onPlanDrift: ((serverPlan: string) => void) | null = null;

// ─── API Helper ────────────────────────────────────────────────
async function apiRequest(
 path: string,
 opts?: RequestInit & { accessToken?: string | null }
) {
 const headers: Record<string, string> = {
 "Content-Type": "application/json",
 };
 if (opts?.accessToken) {
 headers["Authorization"] = `Bearer ${opts.accessToken}`;
 }
 const res = await fetch(path, {
 ...opts,
 headers: { ...headers, ...(opts?.headers as Record<string, string>) },
 credentials: "include",
 });

 const serverPlan = res.headers.get("X-User-Plan");
 if (serverPlan && lastKnownPlan && serverPlan !== lastKnownPlan) {
 onPlanDrift?.(serverPlan);
 }

 return res;
}

// ─── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
 const [mounted, setMounted] = useState(false);
 const [loading, setLoading] = useState(false);
 const [auth, setAuth] = useState<AuthState>({
 isLoggedIn: false,
 accessToken: null,
 expiresAt: null,
 });
 const [currentUser, setCurrentUser] = useState<User | null>(null);
 const [users, setUsers] = useState<User[]>([]);
 const [jobs, setJobs] = useState<Job[]>([]);
 const [bids, setBids] = useState<Bid[]>([]);
 const [notifications, setNotifications] = useState<NotificationItem[]>([]);
 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [disputes, setDisputes] = useState<Dispute[]>([]);
 const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
 const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
 const [reviews, setReviews] = useState<Review[]>([]);
 const [recommendedJobs, setRecommendedJobs] = useState<(Job & { matchScore: number })[]>([]);
 const [milestones, setMilestones] = useState<Milestone[]>([]);
 const [referralStats, setReferralStats] = useState<{ referralCode: string; totalInvites: number; signedUp: number; completed: number; totalCredits: number } | null>(null);
 const [watchedJobIds, setWatchedJobIds] = useState<string[]>([]);
 const [invites, setInvites] = useState<any[]>([]);
 const [now, setNow] = useState<Date>(() => new Date());
 const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

 // ── Save auth to localStorage ─────────────────────────────
 const persistAuth = useCallback(
 (token: string, expiresIn: number, user: User) => {
 const expiresAt = Date.now() + expiresIn * 1000;
 localStorage.setItem(STORAGE_KEY_TOKEN, token);
 localStorage.setItem(STORAGE_KEY_EXPIRES, String(expiresAt));
 localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
 setAuth({ isLoggedIn: true, accessToken: token, expiresAt });
 setCurrentUser(user);
 },
 []
 );

 const clearAuth = useCallback(() => {
 localStorage.removeItem(STORAGE_KEY_TOKEN);
 localStorage.removeItem(STORAGE_KEY_EXPIRES);
 localStorage.removeItem(STORAGE_KEY_USER);
 // Otherwise a different admin logging into the same browser tab bypasses
 // AdminKeyGate — this flag is per-login, not per-browser-session.
 sessionStorage.removeItem("admin_verified");
 setAuth({ isLoggedIn: false, accessToken: null, expiresAt: null });
 setCurrentUser(null);
 if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
 }, []);

 // ── Silent Refresh ────────────────────────────────────────
 // Concurrent callers share the same in-flight refresh instead of each
 // firing their own request — previously a second caller arriving mid-refresh
 // got `null` immediately (instead of the token the first call was about to
 // fetch), which meant any fetch that happened to race the refresh window
 // silently no-op'd instead of running with a valid token.
 const silentRefresh = useCallback((): Promise<string | null> => {
 if (refreshPromiseRef.current) return refreshPromiseRef.current;

 const promise = (async (): Promise<string | null> => {
 try {
 const res = await fetch("/api/auth/refresh", {
 method: "POST",
 credentials: "include",
 });

 if (!res.ok) {
 clearAuth();
 return null;
 }

 const data = await res.json();
 if (data.error) {
 clearAuth();
 return null;
 }

 persistAuth(data.accessToken, data.expiresIn, data.user as User);
 return data.accessToken as string;
 } catch {
 return null;
 } finally {
 refreshPromiseRef.current = null;
 }
 })();

 refreshPromiseRef.current = promise;
 return promise;
 }, [clearAuth, persistAuth]);

 // ── Concurrent session sync (blueprint §18) ───────────────
 // Keep the module-level "what plan does this tab think it has" in sync with
 // React state, and react when apiRequest spots the server disagreeing.
 useEffect(() => {
 lastKnownPlan = currentUser?.plan ?? null;
 }, [currentUser?.plan]);

 useEffect(() => {
 onPlanDrift = (serverPlan) => {
 toast.info(`Your plan has been updated to ${serverPlan}.`);
 silentRefresh();
 };
 return () => { onPlanDrift = null; };
 }, [silentRefresh]);

 // ── Get a valid access token ──────────────────────────────
 const getValidToken = useCallback(async (): Promise<string | null> => {
 const token = auth.accessToken;
 const expiresAt = auth.expiresAt;

 if (!token || !expiresAt) return null;

 if (Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS) {
 return silentRefresh();
 }

 return token;
 }, [auth.accessToken, auth.expiresAt, silentRefresh]);

 // ── Schedule refresh timer ────────────────────────────────
 const scheduleRefresh = useCallback(
 (expiresAt: number) => {
 if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

 const timeUntilRefresh =
 expiresAt - Date.now() - TOKEN_REFRESH_BUFFER_MS;
 if (timeUntilRefresh <= 0) {
 silentRefresh();
 return;
 }

 refreshTimerRef.current = setTimeout(() => {
 silentRefresh();
 }, timeUntilRefresh);
 },
 [silentRefresh]
 );

 // ── Data Fetching (all from MongoDB) ──────────────────────
 const fetchJobs = useCallback(async () => {
 try {
 // Stays public for logged-out browsing, but passes a valid token when
 // we have one so the server can show a client their own invite-only
 // jobs (and a freelancer any job they were specifically invited to) —
 // getValidToken() (not raw auth.accessToken) so this doesn't silently
 // fall back to the public/unauthenticated view whenever the access
 // token happens to be near/past expiry.
 const token = await getValidToken();
 const res = await apiRequest("/api/jobs", {
 accessToken: token,
 });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setJobs(data);
 }
 } catch (err) {
 console.error("[fetchJobs]", err);
 }
 }, [getValidToken]);

 const fetchBids = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/bids", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setBids(data);
 }
 } catch (err) {
 console.error("[fetchBids]", err);
 }
 }, [getValidToken]);

 const fetchTransactions = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/transactions", {
 accessToken: token,
 });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setTransactions(data);
 }
 } catch (err) {
 console.error("[fetchTransactions]", err);
 }
 }, [getValidToken]);

 const fetchNotifications = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/notifications", {
 accessToken: token,
 });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setNotifications(data);
 }
 } catch (err) {
 console.error("[fetchNotifications]", err);
 }
 }, [getValidToken]);

 const fetchUsers = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/users", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setUsers(data);
 }
 } catch (err) {
 console.error("[fetchUsers]", err);
 }
 }, [getValidToken]);

 const fetchChatRooms = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/chat/rooms", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setChatRooms(data);
 }
 } catch (err) {
 console.error("[fetchChatRooms]", err);
 }
 }, [getValidToken]);

 const fetchChatMessages = useCallback(
 async (roomId: string) => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest(
 `/api/chat/messages?roomId=${roomId}`,
 { accessToken: token }
 );
 if (res.ok) {
 const data = await res.json();
 // Merge by roomId instead of replacing the whole list — this was
 // overwriting every other room's already-loaded messages with just
 // this one room's, so a sidebar last-message preview for any other
 // room went blank until that room was opened again.
 if (Array.isArray(data)) {
 setChatMessages((prev) => [...prev.filter((m) => m.roomId !== roomId), ...data]);
 }
 }
 } catch (err) {
 console.error("[fetchChatMessages]", err);
 }
 },
 [getValidToken]
 );

 const fetchDisputes = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/disputes", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setDisputes(data);
 }
 } catch (err) {
 console.error("[fetchDisputes]", err);
 }
 }, [getValidToken]);

 const fetchInvites = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/invites", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setInvites(data);
 }
 } catch (err) {
 console.error("[fetchInvites]", err);
 }
 }, [getValidToken]);

 const fetchReviews = useCallback(async (userId?: string) => {
 try {
 const url = userId ? `/api/reviews?userId=${userId}` : "/api/reviews";
 const res = await apiRequest(url);
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setReviews(data);
 }
 } catch (err) {
 console.error("[fetchReviews]", err);
 }
 }, []);

 const submitReview = useCallback(
 async (jobId: string, revieweeId: string, rating: number, comment: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/reviews", {
 method: "POST",
 body: JSON.stringify({ jobId, revieweeId, rating, comment }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 await fetchReviews();
 return { ok: true, message: "Review submitted!" };
 } catch {
 return { ok: false, message: "Failed to submit review" };
 }
 },
 [getValidToken, fetchReviews]
 );

 const fetchRecommendedJobs = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/jobs/recommended", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setRecommendedJobs(data);
 }
 } catch (err) {
 console.error("[fetchRecommendedJobs]", err);
 }
 }, [getValidToken]);

 const fetchReferralStats = useCallback(async () => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest("/api/referrals", { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (!data.error) setReferralStats(data);
 }
 } catch (err) {
 console.error("[fetchReferralStats]", err);
 }
 }, [getValidToken]);

 const fetchMilestones = useCallback(async (jobId: string) => {
 try {
 const token = await getValidToken();
 if (!token) return;
 const res = await apiRequest(`/api/milestones?jobId=${encodeURIComponent(jobId)}`, { accessToken: token });
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data)) setMilestones(data);
 }
 } catch (err) {
 console.error("[fetchMilestones]", err);
 }
 }, [getValidToken]);

 const createMilestones = useCallback(
 async (jobId: string, ms: { title: string; description?: string; amount: number }[]): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/milestones", {
 method: "POST",
 body: JSON.stringify({ jobId, milestones: ms }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 await fetchMilestones(jobId);
 return { ok: true, message: "Milestones created!" };
 } catch {
 return { ok: false, message: "Failed to create milestones" };
 }
 },
 [getValidToken, fetchMilestones]
 );

 const updateMilestone = useCallback(
 async (milestoneId: string, action: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/milestones", {
 method: "PATCH",
 body: JSON.stringify({ milestoneId, action }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 const milestone = milestones.find(m => m.id === milestoneId || m._id === milestoneId);
 if (milestone) await fetchMilestones(milestone.jobId);
 return { ok: true, message: `Milestone ${action}d!` };
 } catch {
 return { ok: false, message: "Failed to update milestone" };
 }
 },
 [getValidToken, milestones, fetchMilestones]
 );

 const createDirectOffer = useCallback(
 async (data: { title: string; description?: string; skillsRequired?: string[]; price: number; freelancerId: string; estimatedHours?: number; category?: string }): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/jobs/direct-offer", {
 method: "POST",
 body: JSON.stringify(data),
 accessToken: token,
 });
 const d = await res.json();
 if (d.error) return { ok: false, message: d.error };
 // Direct offers count against the same monthly jobs quota as postJob
 // (server-side) — refresh so planUsage reflects it immediately.
 await Promise.all([fetchJobs(), silentRefresh()]);
 return { ok: true, message: "Direct offer sent!" };
 } catch {
 return { ok: false, message: "Failed to create offer" };
 }
 },
 [getValidToken, fetchJobs, silentRefresh]
 );

 const respondToOffer = useCallback(
 async (jobId: string, response: "accepted" | "declined"): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/jobs/offer-response", {
 method: "PATCH",
 body: JSON.stringify({ jobId, response }),
 accessToken: token,
 });
 const d = await res.json();
 if (d.error) return { ok: false, message: d.error };
 await Promise.all([fetchJobs(), fetchTransactions(), fetchChatRooms()]);
 return { ok: true, message: response === "accepted" ? "Offer accepted!" : "Offer declined" };
 } catch {
 return { ok: false, message: "Failed to respond" };
 }
 },
 [getValidToken, fetchJobs, fetchTransactions, fetchChatRooms]
 );

 const verifyGithub = useCallback(
 async (githubUsername: string, step: "start" | "confirm" = "start"): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/user/verify-github", {
 method: "POST",
 body: JSON.stringify({ githubUsername, step }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 if (step === "start") {
 return { ok: true, verified: false, code: data.code, message: data.instructions };
 }
 if (currentUser) {
 const updated = { ...currentUser, githubVerified: true, githubData: data.githubData, githubUsername };
 setCurrentUser(updated as User);
 localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
 }
 return { ok: true, verified: true, message: "GitHub verified!" };
 } catch {
 return { ok: false, message: "Failed to verify GitHub" };
 }
 },
 [getValidToken, currentUser]
 );

 const toggleFeatured = useCallback(
 async (jobId: string, featured: boolean, paymentTransactionId?: string) => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/jobs/feature", {
 method: "PATCH",
 body: JSON.stringify({ jobId, featured, paymentTransactionId }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error, code: data.code, boostPrice: data.boostPrice };
 // Featuring can consume the monthly boost quota server-side; refresh so
 // planUsage (and any PlanLimitBanner reading it) doesn't keep showing the
 // pre-consumption count until the next login/refresh.
 await Promise.all([fetchJobs(), silentRefresh()]);
 return { ok: true, message: featured ? "Job featured!" : "Unfeatured" };
 } catch {
 return { ok: false, message: "Failed to toggle featured" };
 }
 },
 [getValidToken, fetchJobs, silentRefresh]
 );

 // ── Load all data after auth ──────────────────────────────
 // fetchJobs/fetchBids have no dependency on each other or on the
 // logged-in-only batch below, so they all join one Promise.all instead of
 // paying for two sequential round-trips before the parallel batch starts.
 const loadAllData = useCallback(async () => {
 await Promise.all([
 fetchJobs(),
 fetchBids(),
 ...(auth.isLoggedIn
 ? [
 fetchUsers(),
 fetchTransactions(),
 fetchNotifications(),
 fetchChatRooms(),
 fetchDisputes(),
 fetchReviews(),
 ...(currentUser?.role === "freelancer" ? [fetchRecommendedJobs()] : []),
 fetchReferralStats(),
 fetchInvites(),
 ]
 : []),
 ]);
 }, [
 auth.isLoggedIn,
 currentUser?.role,
 fetchJobs,
 fetchBids,
 fetchUsers,
 fetchTransactions,
 fetchNotifications,
 fetchChatRooms,
 fetchDisputes,
 fetchReviews,
 fetchRecommendedJobs,
 fetchReferralStats,
 fetchInvites,
 ]);

 // ── Hydration: restore session on mount ───────────────────
 // `mounted` doubles as "we know the real auth state now" for every page's
 // `if (mounted && !currentUser) router.replace("/login")` guard. Setting it
 // synchronously up front — before an expired-token silentRefresh() had a
 // chance to resolve — meant a returning user with a valid refresh cookie
 // briefly had mounted=true and currentUser=null, and got bounced to /login
 // before the refresh could finish and restore them. Only flip it once we
 // actually know the outcome: immediately for "no session" / "session still
 // valid", but only after silentRefresh() settles for "session expired".
 useEffect(() => {
 setNow(new Date());

 const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
 const savedExpires = localStorage.getItem(STORAGE_KEY_EXPIRES);
 const savedUser = localStorage.getItem(STORAGE_KEY_USER);

 if (savedToken && savedExpires && savedUser) {
 const expiresAt = Number(savedExpires);

 if (Date.now() < expiresAt) {
 try {
 const user = JSON.parse(savedUser);
 setAuth({
 isLoggedIn: true,
 accessToken: savedToken,
 expiresAt,
 });
 setCurrentUser(user);
 scheduleRefresh(expiresAt);
 } catch {
 /* corrupted storage */
 }
 setMounted(true);
 } else {
 silentRefresh().then((newToken) => {
 if (newToken) {
 const exp = Number(
 localStorage.getItem(STORAGE_KEY_EXPIRES) ?? "0"
 );
 scheduleRefresh(exp);
 }
 setMounted(true);
 });
 }
 } else {
 setMounted(true);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // ── Cross-tab auth sync ───────────────────────────────────
 // A login or logout in another tab writes/clears these localStorage keys.
 // The `storage` event only fires in *other* tabs, so mirror that change into
 // this tab's state — otherwise a logout in one tab leaves the others logged in.
 useEffect(() => {
 const onStorage = (e: StorageEvent) => {
 // Only react to our auth keys (e.key is null when localStorage.clear() ran).
 if (e.key !== null && e.key !== STORAGE_KEY_TOKEN) return;

 const token = localStorage.getItem(STORAGE_KEY_TOKEN);
 const savedExpires = localStorage.getItem(STORAGE_KEY_EXPIRES);
 const savedUser = localStorage.getItem(STORAGE_KEY_USER);

 if (token && savedExpires && savedUser && Date.now() < Number(savedExpires)) {
 try {
 const expiresAt = Number(savedExpires);
 setAuth({ isLoggedIn: true, accessToken: token, expiresAt });
 setCurrentUser(JSON.parse(savedUser) as User);
 scheduleRefresh(expiresAt);
 return;
 } catch {
 /* corrupted storage — fall through to clearing local state */
 }
 }

 // Token missing/expired → reflect the logout locally.
 if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
 setAuth({ isLoggedIn: false, accessToken: null, expiresAt: null });
 setCurrentUser(null);
 };

 window.addEventListener("storage", onStorage);
 return () => window.removeEventListener("storage", onStorage);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // ── Fetch data when auth state changes ────────────────────
 useEffect(() => {
 if (mounted) {
 loadAllData();
 }
 }, [mounted, auth.isLoggedIn, loadAllData]);

 // Clock tick
 useEffect(() => {
 const t = setInterval(() => setNow(new Date()), 5000);
 return () => clearInterval(t);
 }, []);

 const unreadCount = useMemo(
 () =>
 currentUser
 ? notifications.filter(
 (n) =>
 (n.userId === currentUser.id ||
 n.userId === currentUser._id) &&
 !n.isRead
 ).length
 : 0,
 [notifications, currentUser]
 );

 // Chat-specific unread (ISSUE-57) — a room is unread if it's been updated
 // (new message from either party) more recently than this user last
 // viewed/sent in it (api/chat/messages stamps lastReadBy on both GET and
 // POST). Distinct from `unreadCount` above, which is general
 // notifications and was previously (incorrectly) reused for the mobile
 // inbox badge too.
 const chatUnreadCount = useMemo(() => {
 const uid = currentUser?.id ?? currentUser?._id;
 if (!uid) return 0;
 return chatRooms.filter((r) => {
 const lastRead = r.lastReadBy?.[uid];
 return !lastRead || new Date(r.updatedAt) > new Date(lastRead);
 }).length;
 }, [chatRooms, currentUser]);

 // ── Login ─────────────────────────────────────────────────
 const login = useCallback(
 async (email: string, password: string): Promise<ActionResult> => {
 setLoading(true);
 try {
 const res = await apiRequest("/api/auth", {
 method: "POST",
 body: JSON.stringify({ action: "login", email, password }),
 });
 const data = await res.json();

 if (data.error) {
 setLoading(false);
 return { ok: false, message: data.error };
 }

 persistAuth(data.accessToken, data.expiresIn, data.user as User);
 scheduleRefresh(Date.now() + data.expiresIn * 1000);
 setLoading(false);
 return { ok: true, message: "Welcome back!", role: data.user.role };
 } catch {
 setLoading(false);
 return { ok: false, message: "Connection failed" };
 }
 },
 [persistAuth, scheduleRefresh]
 );

 // ── Register ──────────────────────────────────────────────
 const register = useCallback(
 async (
 name: string,
 email: string,
 password: string,
 role: string
 ): Promise<ActionResult> => {
 setLoading(true);
 try {
 const res = await apiRequest("/api/auth", {
 method: "POST",
 body: JSON.stringify({
 action: "register",
 name,
 email,
 password,
 role,
 }),
 });
 const data = await res.json();

 if (data.error) {
 setLoading(false);
 return { ok: false, message: data.error };
 }

 persistAuth(data.accessToken, data.expiresIn, data.user as User);
 scheduleRefresh(Date.now() + data.expiresIn * 1000);
 setLoading(false);
 return {
 ok: true,
 message: data.roleAdded ? `${role} role added to your account!` : "Account created!",
 role: data.user.role,
 };
 } catch {
 setLoading(false);
 return { ok: false, message: "Connection failed. Try again." };
 }
 },
 [persistAuth, scheduleRefresh]
 );

 // ── Logout ────────────────────────────────────────────────
 const logout = useCallback(() => {
 fetch("/api/auth/logout", {
 method: "POST",
 credentials: "include",
 }).catch(() => {});
 clearAuth();
 // Clear all data
 setUsers([]);
 setJobs([]);
 setBids([]);
 setNotifications([]);
 setTransactions([]);
 setDisputes([]);
 setChatRooms([]);
 setChatMessages([]);
 setReviews([]);
 setRecommendedJobs([]);
 }, [clearAuth]);

 // ── Google OAuth (set auth from callback tokens) ───────────
 const googleAuth = useCallback(
 (token: string, expiresIn: number, user: User) => {
 persistAuth(token, expiresIn, user);
 scheduleRefresh(Date.now() + expiresIn * 1000);
 },
 [persistAuth, scheduleRefresh]
 );

 // ── Switch Role (for accounts holding more than one role) ──
 // The JWT bakes `role` in at sign-time, so switching which role is active
 // requires a fresh token pair from the server, not just a local state flip.
 const switchRole = useCallback(
 async (role: Role): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/auth/switch-role", {
 method: "POST",
 body: JSON.stringify({ role }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 persistAuth(data.accessToken, data.expiresIn, data.user as User);
 scheduleRefresh(Date.now() + data.expiresIn * 1000);
 return { ok: true, message: `Switched to ${role}` };
 } catch {
 return { ok: false, message: "Connection failed" };
 }
 },
 [getValidToken, persistAuth, scheduleRefresh]
 );

 // ── Accept Job (with DB call) ─────────────────────────────
 const acceptJob = useCallback(
 async (jobId: string): Promise<ActionResult> => {
 const job = jobs.find((j) => j.id === jobId || j._id === jobId);
 if (!job || job.status !== "open" || !currentUser)
 return { ok: false, message: "Job not available" };

 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 // Clients award the best (lowest) bid; freelancers accept at current decay price
 const isClient = currentUser.role === "client";
 const body = isClient
 ? { action: "accept_best" }
 : { finalPrice: Number(getCurrentPrice(job, now).toFixed(2)) };

 try {
 const res = await apiRequest(`/api/jobs/${jobId}`, {
 method: "PATCH",
 body: JSON.stringify(body),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 // A freelancer accepting consumes the same monthly bid quota as placing a
 // bid (server-side) — refresh so planUsage reflects it immediately.
 await Promise.all([fetchJobs(), fetchBids(), fetchTransactions(), fetchChatRooms(), silentRefresh()]);
 return {
 ok: true,
 message: isClient
 ? `Job awarded at $${(data.finalPrice ?? 0).toFixed(2)}`
 : `Accepted at $${(data.finalPrice ?? Number(body.finalPrice) ?? 0).toFixed(2)}`,
 // Authoritative winner + price from the server — callers must not
 // re-derive these client-side (e.g. re-sorting local bids, or reading
 // the job's live decaying price), since both can disagree with the
 // backend's actual awarded values.
 freelancerId: isClient ? data.freelancerId : currentUser.id,
 finalPrice: data.finalPrice,
 };
 } catch {
 return { ok: false, message: "Failed to accept job" };
 }
 },
 [jobs, now, currentUser, getValidToken, fetchJobs, fetchBids, fetchTransactions, fetchChatRooms, silentRefresh]
 );

 // ── Accept a specific bid (client awards *that* freelancer, not
 // necessarily the lowest one) — every per-row "Accept" in the bid
 // comparison table calls this instead of acceptJob's accept_best, so
 // clicking next to a given freelancer actually awards them.
 const acceptBid = useCallback(
 async (jobId: string, bidId: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest(`/api/jobs/${jobId}`, {
 method: "PATCH",
 body: JSON.stringify({ action: "accept_bid", bidId }),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 await Promise.all([fetchJobs(), fetchBids(), fetchTransactions(), fetchChatRooms()]);
 return {
 ok: true,
 message: `Job awarded at $${(data.finalPrice ?? 0).toFixed(2)}`,
 freelancerId: data.freelancerId,
 finalPrice: data.finalPrice,
 };
 } catch {
 return { ok: false, message: "Failed to accept bid" };
 }
 },
 [getValidToken, fetchJobs, fetchBids, fetchTransactions, fetchChatRooms]
 );

 // ── Counter Bid (with DB call) ────────────────────────────
 const counterBid = useCallback(
 async (
 jobId: string,
 price: number,
 message?: string
 ): Promise<ActionResult> => {
 const job = jobs.find((j) => j.id === jobId || j._id === jobId);
 if (!job || job.status !== "open" || !currentUser)
 return { ok: false, message: "Job not available" };

 const current = getCurrentPrice(job, now);
 if (price > current)
 return { ok: false, message: `Must be ≤ $${current.toFixed(2)}` };
 if (price < job.minimumPrice)
 return {
 ok: false,
 message: `Must be ≥ floor $${job.minimumPrice}`,
 };

 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/bids", {
 method: "POST",
 body: JSON.stringify({ jobId, bidPrice: price, message }),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 // Also refresh jobs — the server updates the job's own demand-signal
 // fields (bidCount, uniqueBidderCount, lowestCounterBid, priceHistory)
 // on every bid, and the Pricing Intelligence panel reads those fields
 // straight off the job, not derived from the bids list. Also refresh the
 // user — bidding consumes the monthly bid quota server-side, and
 // planUsage must reflect that immediately, not just after next login.
 await Promise.all([fetchBids(), fetchJobs(), silentRefresh()]);
 return { ok: true, message: "Counter-bid submitted" };
 } catch {
 return { ok: false, message: "Failed to place bid" };
 }
 },
 [jobs, now, currentUser, getValidToken, fetchBids, fetchJobs, silentRefresh]
 );

 // ── Post Job (with DB call) ───────────────────────────────
 const postJob = useCallback(
 async (input: Partial<Job>): Promise<ActionResult> => {
 if (!input.title || !currentUser)
 return { ok: false, message: "Title required" };

 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/jobs", {
 method: "POST",
 body: JSON.stringify(input),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 // Posting consumes the monthly jobs quota server-side — refresh so
 // planUsage doesn't keep showing the pre-post count (PlanLimitBanner,
 // "jobs remaining" elsewhere) until the next login/refresh.
 await Promise.all([fetchJobs(), silentRefresh()]);
 return { ok: true, message: "Job posted!" };
 } catch {
 return { ok: false, message: "Failed to post job" };
 }
 },
 [currentUser, getValidToken, fetchJobs, silentRefresh]
 );

 // ── Cancel Job (client only) ──────────────────────────────
 const cancelJob = useCallback(
 async (jobId: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest(`/api/jobs/${jobId}/cancel`, {
 method: "PATCH",
 body: JSON.stringify({}),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 await fetchJobs();
 return { ok: true, message: "Job cancelled" };
 } catch {
 return { ok: false, message: "Failed to cancel job" };
 }
 },
 [getValidToken, fetchJobs]
 );

 // ── Complete Job (client only) ────────────────────────────
 const completeJob = useCallback(
 async (jobId: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest(`/api/jobs/${jobId}/complete`, {
 method: "PATCH",
 body: JSON.stringify({}),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };
 await Promise.all([fetchJobs(), fetchTransactions()]);
 return { ok: true, message: "Job marked complete" };
 } catch {
 return { ok: false, message: "Failed to complete job" };
 }
 },
 [getValidToken, fetchJobs, fetchTransactions]
 );

 const toggleWatch = useCallback((jobId: string) => {
 setWatchedJobIds((prev) =>
 prev.includes(jobId)
 ? prev.filter((id) => id !== jobId)
 : [...prev, jobId]
 );
 }, []);

 // ── Release Escrow (with DB call) ─────────────────────────
 const releaseEscrow = useCallback(
 async (txId: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/transactions", {
 method: "PATCH",
 body: JSON.stringify({ transactionId: txId, action: "release" }),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 await fetchTransactions();
 return { ok: true, message: "Escrow released!" };
 } catch {
 return { ok: false, message: "Failed to release escrow" };
 }
 },
 [getValidToken, fetchTransactions]
 );

 // ── Raise Dispute (with DB call) ──────────────────────────
 const raiseDispute = useCallback(
 async (txId: string, reason: string): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/transactions", {
 method: "PATCH",
 body: JSON.stringify({
 transactionId: txId,
 action: "dispute",
 reason,
 }),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 await Promise.all([fetchTransactions(), fetchDisputes()]);
 return { ok: true, message: "Dispute raised" };
 } catch {
 return { ok: false, message: "Failed to raise dispute" };
 }
 },
 [getValidToken, fetchTransactions, fetchDisputes]
 );

 // ── Mark Notification Read (with DB call) ─────────────────
 const markNotificationRead = useCallback(
 (nId: string) => {
 // Optimistic update
 setNotifications((prev) =>
 prev.map((n) => (n.id === nId ? { ...n, isRead: true } : n))
 );

 // DB call — on failure, revert the optimistic flip instead of silently
 // swallowing the error. Left unreverted, the next fetchNotifications()
 // would flip it back to unread anyway, but with no indication anything
 // went wrong in between — this makes the failure visible immediately.
 getValidToken().then((token) => {
 if (!token) {
 setNotifications((prev) =>
 prev.map((n) => (n.id === nId ? { ...n, isRead: false } : n))
 );
 return;
 }
 apiRequest("/api/notifications", {
 method: "PATCH",
 body: JSON.stringify({ notificationId: nId }),
 accessToken: token,
 }).then((res) => {
 if (!res.ok) {
 setNotifications((prev) =>
 prev.map((n) => (n.id === nId ? { ...n, isRead: false } : n))
 );
 }
 }).catch(() => {
 setNotifications((prev) =>
 prev.map((n) => (n.id === nId ? { ...n, isRead: false } : n))
 );
 });
 });
 },
 [getValidToken]
 );

 const markAllRead = useCallback(() => {
 if (!currentUser) return;

 // Optimistic update
 setNotifications((prev) =>
 prev.map((n) =>
 n.userId === currentUser.id || n.userId === currentUser._id
 ? { ...n, isRead: true }
 : n
 )
 );

 // DB call
 getValidToken().then((token) => {
 if (token) {
 apiRequest("/api/notifications", {
 method: "PATCH",
 body: JSON.stringify({ markAll: true }),
 accessToken: token,
 }).catch(() => {});
 }
 });
 }, [currentUser, getValidToken]);

 // ── Send Message (with DB call) ───────────────────────────
 const sendMessage = useCallback(
 async (roomId: string, text: string): Promise<ActionResult> => {
 if (!text.trim() || !currentUser)
 return { ok: false, message: "Empty" };

 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/chat/messages", {
 method: "POST",
 body: JSON.stringify({ roomId, text: text.trim() }),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 // Append new message to local state
 setChatMessages((prev) => [...prev, data]);
 return { ok: true, message: "Sent" };
 } catch {
 return { ok: false, message: "Failed to send" };
 }
 },
 [currentUser, getValidToken]
 );

 // ── Create Chat Room (with DB call) ──────────────────────
 const createChatRoom = useCallback(
 async (jobId: string, participantIds: string[]) => {
 const token = await getValidToken();
 if (!token) return { ok: false, error: "Not authenticated" };
 try {
 const res = await apiRequest("/api/chat/rooms", {
 method: "POST",
 body: JSON.stringify({ jobId, participantIds }),
 accessToken: token,
 });
 const data = await res.json();
 if (data.error) return { ok: false, error: data.error };
 await fetchChatRooms();
 return { ok: true, roomId: data.id ?? data._id };
 } catch {
 return { ok: false, error: "Failed to create chat room" };
 }
 },
 [getValidToken, fetchChatRooms]
 );

 // ── Update Profile (with DB call) ─────────────────────────
 const updateProfile = useCallback(
 async (updates: Partial<User>): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };

 try {
 const res = await apiRequest("/api/user", {
 method: "PATCH",
 body: JSON.stringify(updates),
 accessToken: token,
 });

 const data = await res.json();
 if (data.error) return { ok: false, message: data.error };

 // Update local user state
 if (currentUser) {
 const updated = { ...currentUser, ...updates };
 setCurrentUser(updated);
 localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
 }

 return { ok: true, message: "Profile updated!" };
 } catch {
 return { ok: false, message: "Failed to update profile" };
 }
 },
 [getValidToken, currentUser]
 );

 // ── Seed Database (admin only) ────────────────────────────
 const seedDatabase = useCallback(async (): Promise<ActionResult> => {
 const token = await getValidToken();
 if (!token) return { ok: false, message: "Not authenticated" };
 try {
 const res = await apiRequest("/api/seed", { method: "POST", accessToken: token });
 const data = await res.json();
 if (data.ok) {
 // Reload all data after seeding
 await loadAllData();
 return {
 ok: true,
 message: `Seeded ${data.seeded.users} users, ${data.seeded.jobs} jobs, ${data.seeded.bids} bids`,
 };
 }
 return { ok: false, message: data.error ?? "Seed failed" };
 } catch {
 return { ok: false, message: "Connection failed" };
 }
 }, [getValidToken, loadAllData]);

 // ── Context value ─────────────────────────────────────────
 const getUserPlanConfig = useCallback(
 () => getPlanConfig(currentUser?.plan),
 [currentUser?.plan]
 );

 const planUsage = useMemo(() => {
 const config = getPlanConfig(currentUser?.plan);
 const limits = currentUser?.planLimits;
 const remaining = (used: number, limit: number) =>
 limit === Infinity ? Infinity : Math.max(0, limit - used);
 const jobsUsed = limits?.jobsPostedThisMonth ?? 0;
 const bidsUsed = limits?.bidsPlacedThisMonth ?? 0;
 const aiUsed = limits?.aiUsesThisMonth ?? 0;
 const aiBidUsed = limits?.aiBidUsesThisMonth ?? 0;
 const boostsUsed = limits?.featuredBoostsUsedThisMonth ?? 0;
 const invitesUsed = limits?.invitesSentThisMonth ?? 0;
 return {
 jobsPostedThisMonth: jobsUsed,
 jobsRemaining: remaining(jobsUsed, config.limits.jobsPerMonth),
 bidsPlacedThisMonth: bidsUsed,
 bidsRemaining: remaining(bidsUsed, config.limits.bidsPerMonth),
 aiUsesThisMonth: aiUsed,
 aiRemaining: remaining(aiUsed, config.limits.aiGeneralPerMonth),
 aiBidUsesThisMonth: aiBidUsed,
 aiBidRemaining: remaining(aiBidUsed, config.limits.aiBidStrategyPerMonth),
 featuredBoostsUsedThisMonth: boostsUsed,
 featuredBoostsRemaining: remaining(boostsUsed, config.limits.featuredBoostsPerMonth),
 invitesSentThisMonth: invitesUsed,
 invitesRemaining: remaining(invitesUsed, config.limits.invitesPerMonth),
 };
 }, [currentUser?.plan, currentUser?.planLimits]);

 const value = useMemo(
 () => ({
 auth,
 currentUser,
 users,
 jobs,
 bids,
 notifications,
 transactions,
 disputes,
 chatRooms,
 chatMessages,
 reviews,
 recommendedJobs,
 watchedJobIds,
 now,
 mounted,
 unreadCount,
 chatUnreadCount,
 loading,
 login,
 register,
 logout,
 googleAuth,
 switchRole,
 submitReview,
 fetchReviews,
 referralStats,
 fetchReferralStats,
 milestones,
 fetchMilestones,
 createMilestones,
 updateMilestone,
 createDirectOffer,
 respondToOffer,
 verifyGithub,
 toggleFeatured,
 fetchRecommendedJobs,
 acceptJob,
 acceptBid,
 counterBid,
 postJob,
 cancelJob,
 completeJob,
 toggleWatch,
 releaseEscrow,
 raiseDispute,
 markNotificationRead,
 markAllRead,
 sendMessage,
 fetchJobs,
 fetchBids,
 fetchTransactions,
 fetchNotifications,
 fetchUsers,
 fetchChatRooms,
 fetchChatMessages,
 fetchDisputes,
 seedDatabase,
 updateProfile,
 createChatRoom,
 invites,
 fetchInvites,
 getUserPlanConfig,
 planUsage,
 getValidToken,
 refreshCurrentUser: silentRefresh,
 }),
 [
 auth,
 currentUser,
 users,
 jobs,
 bids,
 notifications,
 transactions,
 disputes,
 chatRooms,
 chatMessages,
 reviews,
 recommendedJobs,
 watchedJobIds,
 now,
 mounted,
 unreadCount,
 chatUnreadCount,
 loading,
 login,
 register,
 logout,
 googleAuth,
 switchRole,
 submitReview,
 fetchReviews,
 referralStats,
 fetchReferralStats,
 milestones,
 fetchMilestones,
 createMilestones,
 updateMilestone,
 createDirectOffer,
 respondToOffer,
 verifyGithub,
 toggleFeatured,
 fetchRecommendedJobs,
 acceptJob,
 acceptBid,
 counterBid,
 postJob,
 cancelJob,
 completeJob,
 toggleWatch,
 releaseEscrow,
 raiseDispute,
 markNotificationRead,
 markAllRead,
 sendMessage,
 fetchJobs,
 fetchBids,
 fetchTransactions,
 fetchNotifications,
 fetchUsers,
 fetchChatRooms,
 fetchChatMessages,
 fetchDisputes,
 seedDatabase,
 updateProfile,
 createChatRoom,
 invites,
 fetchInvites,
 getUserPlanConfig,
 planUsage,
 getValidToken,
 silentRefresh,
 ]
 );

 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
