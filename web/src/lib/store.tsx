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

// ─── Types ─────────────────────────────────────────────────────
type AuthState = {
  isLoggedIn: boolean;
  accessToken: string | null;
  expiresAt: number | null;
};

type ActionResult = { ok: boolean; message: string };

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
  switchRole: (role: Role) => void;
  acceptJob: (jobId: string) => Promise<ActionResult>;
  counterBid: (
    jobId: string,
    price: number,
    message?: string
  ) => Promise<ActionResult>;
  postJob: (input: Partial<Job>) => Promise<ActionResult>;
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
  verifyGithub: (githubUsername: string) => Promise<ActionResult>;
  toggleFeatured: (jobId: string, featured: boolean) => Promise<ActionResult>;
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
  const [now, setNow] = useState<Date>(() => new Date());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

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
    setAuth({ isLoggedIn: false, accessToken: null, expiresAt: null });
    setCurrentUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  // ── Silent Refresh ────────────────────────────────────────
  const silentRefresh = useCallback(async (): Promise<string | null> => {
    if (isRefreshingRef.current) return null;
    isRefreshingRef.current = true;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        clearAuth();
        isRefreshingRef.current = false;
        return null;
      }

      const data = await res.json();
      if (data.error) {
        clearAuth();
        isRefreshingRef.current = false;
        return null;
      }

      persistAuth(data.accessToken, data.expiresIn, data.user as User);
      isRefreshingRef.current = false;
      return data.accessToken;
    } catch {
      isRefreshingRef.current = false;
      return null;
    }
  }, [clearAuth, persistAuth]);

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
      const res = await apiRequest("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setJobs(data);
      }
    } catch (err) {
      console.error("[fetchJobs]", err);
    }
  }, []);

  const fetchBids = useCallback(async () => {
    try {
      const res = await apiRequest("/api/bids");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBids(data);
      }
    } catch (err) {
      console.error("[fetchBids]", err);
    }
  }, []);

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
          if (Array.isArray(data)) setChatMessages(data);
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
      const res = await apiRequest(`/api/milestones?jobId=${jobId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMilestones(data);
      }
    } catch (err) {
      console.error("[fetchMilestones]", err);
    }
  }, []);

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
        await fetchJobs();
        return { ok: true, message: "Direct offer sent!" };
      } catch {
        return { ok: false, message: "Failed to create offer" };
      }
    },
    [getValidToken, fetchJobs]
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
        await Promise.all([fetchJobs(), fetchTransactions()]);
        return { ok: true, message: response === "accepted" ? "Offer accepted!" : "Offer declined" };
      } catch {
        return { ok: false, message: "Failed to respond" };
      }
    },
    [getValidToken, fetchJobs, fetchTransactions]
  );

  const verifyGithub = useCallback(
    async (githubUsername: string): Promise<ActionResult> => {
      const token = await getValidToken();
      if (!token) return { ok: false, message: "Not authenticated" };
      try {
        const res = await apiRequest("/api/user/verify-github", {
          method: "POST",
          body: JSON.stringify({ githubUsername }),
          accessToken: token,
        });
        const data = await res.json();
        if (data.error) return { ok: false, message: data.error };
        if (currentUser) {
          const updated = { ...currentUser, githubVerified: true, githubData: data.githubData, githubUsername };
          setCurrentUser(updated as User);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
        }
        return { ok: true, message: "GitHub verified!" };
      } catch {
        return { ok: false, message: "Failed to verify GitHub" };
      }
    },
    [getValidToken, currentUser]
  );

  const toggleFeatured = useCallback(
    async (jobId: string, featured: boolean): Promise<ActionResult> => {
      const token = await getValidToken();
      if (!token) return { ok: false, message: "Not authenticated" };
      try {
        const res = await apiRequest("/api/jobs/feature", {
          method: "PATCH",
          body: JSON.stringify({ jobId, featured }),
          accessToken: token,
        });
        const data = await res.json();
        if (data.error) return { ok: false, message: data.error };
        await fetchJobs();
        return { ok: true, message: featured ? "Job featured!" : "Unfeatured" };
      } catch {
        return { ok: false, message: "Failed to toggle featured" };
      }
    },
    [getValidToken, fetchJobs]
  );

  // ── Load all data after auth ──────────────────────────────
  const loadAllData = useCallback(async () => {
    await fetchJobs();
    await fetchBids();
    if (auth.isLoggedIn) {
      await Promise.all([
        fetchUsers(),
        fetchTransactions(),
        fetchNotifications(),
        fetchChatRooms(),
        fetchDisputes(),
        fetchReviews(),
        fetchRecommendedJobs(),
        fetchReferralStats(),
      ]);
    }
  }, [
    auth.isLoggedIn,
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
  ]);

  // ── Hydration: restore session on mount ───────────────────
  useEffect(() => {
    setMounted(true);
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
      } else {
        silentRefresh().then((newToken) => {
          if (newToken) {
            const exp = Number(
              localStorage.getItem(STORAGE_KEY_EXPIRES) ?? "0"
            );
            scheduleRefresh(exp);
          }
        });
      }
    }
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
        return { ok: true, message: "Welcome back!" };
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
        return { ok: true, message: "Account created!" };
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

  // ── Switch Role (dev/demo helper — logs in as different user) ──
  const switchRole = useCallback(
    (role: Role) => {
      const u = users.find((u) => u.role === role);
      if (u) {
        setCurrentUser(u);
        setAuth({
          isLoggedIn: true,
          accessToken: auth.accessToken,
          expiresAt: auth.expiresAt,
        });
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
      }
    },
    [users, auth.accessToken, auth.expiresAt]
  );

  // ── Accept Job (with DB call) ─────────────────────────────
  const acceptJob = useCallback(
    async (jobId: string): Promise<ActionResult> => {
      const job = jobs.find((j) => j.id === jobId || j._id === jobId);
      if (!job || job.status !== "open" || !currentUser)
        return { ok: false, message: "Job not available" };

      const finalPrice = Number(getCurrentPrice(job, now).toFixed(2));
      const token = await getValidToken();
      if (!token) return { ok: false, message: "Not authenticated" };

      try {
        const res = await apiRequest(`/api/jobs/${jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ finalPrice }),
          accessToken: token,
        });

        const data = await res.json();
        if (data.error) return { ok: false, message: data.error };

        // Refresh data from DB
        await Promise.all([fetchJobs(), fetchBids(), fetchTransactions()]);
        return {
          ok: true,
          message: `Accepted at $${finalPrice.toFixed(2)}`,
        };
      } catch {
        return { ok: false, message: "Failed to accept job" };
      }
    },
    [jobs, now, currentUser, getValidToken, fetchJobs, fetchBids, fetchTransactions]
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

        await fetchBids();
        return { ok: true, message: "Counter-bid submitted" };
      } catch {
        return { ok: false, message: "Failed to place bid" };
      }
    },
    [jobs, now, currentUser, getValidToken, fetchBids]
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

        await fetchJobs();
        return { ok: true, message: "Job posted!" };
      } catch {
        return { ok: false, message: "Failed to post job" };
      }
    },
    [currentUser, getValidToken, fetchJobs]
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

      // DB call
      getValidToken().then((token) => {
        if (token) {
          apiRequest("/api/notifications", {
            method: "PATCH",
            body: JSON.stringify({ notificationId: nId }),
            accessToken: token,
          }).catch(() => {});
        }
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

  // ── Seed Database ─────────────────────────────────────────
  const seedDatabase = useCallback(async (): Promise<ActionResult> => {
    try {
      const res = await apiRequest("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        // Reload all data after seeding
        await loadAllData();
        return {
          ok: true,
          message: `Seeded ${data.seeded.users} users, ${data.seeded.jobs} jobs, ${data.seeded.bids} bids`,
        };
      }
      return { ok: false, message: "Seed failed" };
    } catch {
      return { ok: false, message: "Connection failed" };
    }
  }, [loadAllData]);

  // ── Context value ─────────────────────────────────────────
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
      counterBid,
      postJob,
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
      counterBid,
      postJob,
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
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
