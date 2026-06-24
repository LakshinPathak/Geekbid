import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getCurrentPrice } from '../utils/pricing';
import { geekbidApi } from '../services/geekbidApi';
import { connectSocket, disconnectSocket, PriceUpdateEvent, JobAcceptedEvent } from '../services/socket';
import {
  Bid,
  ChatMessage,
  ChatRoom,
  Dispute,
  Job,
  NewJobInput,
  NotificationItem,
  Role,
  Transaction,
  User,
} from '../types/models';
import {
  bids as mockBids,
  chatMessages as mockChatMessages,
  chatRooms as mockChatRooms,
  disputes as mockDisputes,
  jobs as mockJobs,
  notifications as mockNotifications,
  transactions as mockTransactions,
  users as mockUsers,
} from '../data/mockData';

type ActionResult = { ok: boolean; message: string };

type AppContextType = {
  // State
  currentUser: User;
  users: User[];
  jobs: Job[];
  bids: Bid[];
  notifications: NotificationItem[];
  chatRooms: ChatRoom[];
  chatMessages: ChatMessage[];
  transactions: Transaction[];
  disputes: Dispute[];
  watchedJobIds: string[];
  now: Date;
  isMockMode: boolean;
  isLoadingJobs: boolean;
  jobsError: string | null;
  unreadNotificationsCount: number;

  // Actions
  switchRole: (role: Role) => void;
  refreshJobs: () => Promise<void>;
  acceptJob: (jobId: string) => Promise<ActionResult>;
  counterBid: (jobId: string, price: number, message?: string) => Promise<ActionResult>;
  postJob: (input: NewJobInput) => Promise<ActionResult>;
  toggleWatch: (jobId: string) => Promise<void>;
  releaseEscrow: (transactionId: string) => ActionResult;
  raiseDispute: (transactionId: string, reason: string) => ActionResult;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  sendMessage: (roomId: string, text: string) => ActionResult;
};

const AppContext = createContext<AppContextType | null>(null);

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};

const findUser = (role: Role, allUsers: User[]): User =>
  allUsers.find((u) => u.role === role) ?? allUsers[0];

export const AppProvider = ({ children }: PropsWithChildren) => {
  const isMockMode = env.useMock;

  const [users] = useState<User[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<User>(() => findUser('freelancer', mockUsers));
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [bids, setBids] = useState<Bid[]>(mockBids);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [chatRooms] = useState<ChatRoom[]>(mockChatRooms);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes);
  const [watchedJobIds, setWatchedJobIds] = useState<string[]>(['job-1']);
  const [now, setNow] = useState(new Date());
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Real-time clock tick for price decay
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Socket integration
  useEffect(() => {
    if (isMockMode) return;
    const sock = connectSocket();

    sock.on('price_update', (ev: PriceUpdateEvent) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === ev.job_id ? { ...j, currentPrice: ev.current_price } : j))
      );
    });

    sock.on('job_accepted', (ev: JobAcceptedEvent) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === ev.job_id
            ? { ...j, status: 'accepted' as const, acceptedBy: ev.freelancer_id, finalPrice: ev.final_price, acceptedAt: new Date().toISOString() }
            : j
        )
      );
    });

    return () => disconnectSocket();
  }, [isMockMode]);

  // API-based job loading
  const refreshJobs = useCallback(async () => {
    if (isMockMode) return;
    setIsLoadingJobs(true);
    setJobsError(null);
    try {
      const fetched = await geekbidApi.getJobs();
      setJobs(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load jobs';
      setJobsError(msg);
      logger.error('refreshJobs failed', { err });
    } finally {
      setIsLoadingJobs(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    if (!isMockMode) void refreshJobs();
  }, [isMockMode, refreshJobs]);

  // Computed values
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => n.userId === currentUser.id && !n.isRead).length,
    [notifications, currentUser.id]
  );

  // Actions
  const switchRole = useCallback((role: Role) => {
    const user = findUser(role, users);
    setCurrentUser(user);
  }, [users]);

  const acceptJob = useCallback(async (jobId: string): Promise<ActionResult> => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { ok: false, message: 'Job not found.' };
    if (job.status !== 'open') return { ok: false, message: 'Job already closed.' };
    if (currentUser.role !== 'freelancer') return { ok: false, message: 'Only freelancers can accept.' };

    const finalPrice = Number(getCurrentPrice(job, now).toFixed(2));

    if (!isMockMode) {
      try {
        await geekbidApi.acceptJob(jobId);
      } catch {
        return { ok: false, message: 'API call failed.' };
      }
    }

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'accepted' as const, acceptedBy: currentUser.id, acceptedAt: new Date().toISOString(), finalPrice }
          : j
      )
    );
    setBids((prev) => [
      { id: `bid-${Date.now()}`, jobId, freelancerId: currentUser.id, bidType: 'accept', bidPrice: finalPrice, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setTransactions((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        jobId,
        clientId: job.clientId,
        freelancerId: currentUser.id,
        grossAmount: finalPrice,
        platformFee: Number((finalPrice * 0.1).toFixed(2)),
        netAmount: Number((finalPrice * 0.9).toFixed(2)),
        escrowStatus: 'held',
        createdAt: new Date().toISOString(),
      },
    ]);
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        userId: currentUser.id,
        type: 'job_accepted',
        title: '🎉 Job Won!',
        body: `You won "${job.title}" at $${finalPrice.toFixed(2)}!`,
        createdAt: new Date().toISOString(),
        isRead: false,
        jobId,
      },
      ...prev,
    ]);

    return { ok: true, message: `Accepted at $${finalPrice.toFixed(2)}` };
  }, [jobs, currentUser, now, isMockMode]);

  const counterBid = useCallback(async (jobId: string, price: number, message?: string): Promise<ActionResult> => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return { ok: false, message: 'Job not found.' };
    if (job.status !== 'open') return { ok: false, message: 'Job already closed.' };
    if (currentUser.role !== 'freelancer') return { ok: false, message: 'Only freelancers can bid.' };

    const current = getCurrentPrice(job, now);
    if (price > current) return { ok: false, message: `Price must be ≤ current price ($${current.toFixed(2)}).` };
    if (price < job.minimumPrice) return { ok: false, message: `Price must be ≥ floor ($${job.minimumPrice}).` };

    if (!isMockMode) {
      try {
        await geekbidApi.counterBid(jobId, price, message);
      } catch {
        return { ok: false, message: 'API call failed.' };
      }
    }

    const bid: Bid = {
      id: `bid-${Date.now()}`,
      jobId,
      freelancerId: currentUser.id,
      bidType: 'counter',
      bidPrice: price,
      message,
      createdAt: new Date().toISOString(),
    };
    setBids((prev) => [bid, ...prev]);
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        userId: job.clientId,
        type: 'counter_bid_received',
        title: '💬 Counter-bid received',
        body: `${currentUser.fullName} bid $${price.toFixed(2)} on "${job.title}".`,
        createdAt: new Date().toISOString(),
        isRead: false,
        jobId,
      },
      ...prev,
    ]);

    return { ok: true, message: `Counter-bid of $${price.toFixed(2)} submitted.` };
  }, [jobs, currentUser, now, isMockMode]);

  const postJob = useCallback(async (input: NewJobInput): Promise<ActionResult> => {
    if (!input.title) return { ok: false, message: 'Title is required.' };
    if (input.minimumPrice < input.startingPrice * 0.3) {
      return { ok: false, message: 'Floor must be ≥ 30% of starting price.' };
    }

    if (!isMockMode) {
      try {
        const created = await geekbidApi.postJob(input);
        setJobs((prev) => [created, ...prev]);
        return { ok: true, message: 'Job posted!' };
      } catch {
        return { ok: false, message: 'API call failed.' };
      }
    }

    const created: Job = {
      id: `job-${Date.now()}`,
      clientId: currentUser.id,
      title: input.title,
      description: input.description,
      skillsRequired: input.skillsRequired,
      startingPrice: input.startingPrice,
      minimumPrice: input.minimumPrice,
      decayRatePerHour: input.decayRatePerHour,
      estimatedHours: input.estimatedHours,
      postedAt: new Date().toISOString(),
      deadlineAt: input.deadlineAt,
      status: 'open',
      visibility: input.visibility,
    };
    setJobs((prev) => [created, ...prev]);
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        userId: currentUser.id,
        type: 'job_posted',
        title: '⚡ Job Live!',
        body: `"${input.title}" is now live in the feed.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        jobId: created.id,
      },
      ...prev,
    ]);

    return { ok: true, message: 'Job posted!' };
  }, [currentUser, isMockMode]);

  const toggleWatch = useCallback(async (jobId: string) => {
    const isWatching = watchedJobIds.includes(jobId);
    setWatchedJobIds((prev) =>
      isWatching ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
    if (!isMockMode) {
      try {
        if (isWatching) await geekbidApi.unwatchJob(jobId);
        else await geekbidApi.watchJob(jobId);
      } catch {
        // Rollback on failure
        setWatchedJobIds((prev) =>
          isWatching ? [...prev, jobId] : prev.filter((id) => id !== jobId)
        );
      }
    }
  }, [watchedJobIds, isMockMode]);

  const releaseEscrow = useCallback((transactionId: string): ActionResult => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Transaction not found.' };
    if (tx.escrowStatus !== 'held') return { ok: false, message: `Cannot release (status: ${tx.escrowStatus}).` };
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, escrowStatus: 'released' as const, releasedAt: new Date().toISOString() } : t
      )
    );
    return { ok: true, message: 'Released!' };
  }, [transactions]);

  const raiseDispute = useCallback((transactionId: string, reason: string): ActionResult => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Transaction not found.' };
    if (tx.escrowStatus === 'released') return { ok: false, message: 'Already released.' };
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, escrowStatus: 'disputed' as const } : t))
    );
    setDisputes((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, transactionId, raisedBy: currentUser.id, reason, status: 'open', createdAt: new Date().toISOString() },
    ]);
    return { ok: true, message: 'Dispute raised!' };
  }, [transactions, currentUser.id]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, isRead: true } : n))
    );
  }, [currentUser.id]);

  const sendMessage = useCallback((roomId: string, text: string): ActionResult => {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, message: 'Message cannot be empty.' };
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      roomId,
      senderId: currentUser.id,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
    return { ok: true, message: 'Sent!' };
  }, [currentUser.id]);

  const value = useMemo<AppContextType>(() => ({
    currentUser,
    users,
    jobs,
    bids,
    notifications,
    chatRooms,
    chatMessages,
    transactions,
    disputes,
    watchedJobIds,
    now,
    isMockMode,
    isLoadingJobs,
    jobsError,
    unreadNotificationsCount,
    switchRole,
    refreshJobs,
    acceptJob,
    counterBid,
    postJob,
    toggleWatch,
    releaseEscrow,
    raiseDispute,
    markNotificationRead,
    markAllNotificationsRead,
    sendMessage,
  }), [
    currentUser, users, jobs, bids, notifications, chatRooms, chatMessages,
    transactions, disputes, watchedJobIds, now, isMockMode, isLoadingJobs,
    jobsError, unreadNotificationsCount, switchRole, refreshJobs, acceptJob,
    counterBid, postJob, toggleWatch, releaseEscrow, raiseDispute,
    markNotificationRead, markAllNotificationsRead, sendMessage,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
