import { Bid, Job, NewJobInput } from '../types/models';
import { request } from './apiClient';

type RawJob = Partial<Job> & {
  client_id?: string;
  skills_required?: string[];
  starting_price?: number;
  current_price?: number;
  minimum_price?: number;
  decay_rate_per_hour?: number;
  posted_at?: string;
  deadline_at?: string;
  estimated_hours?: number;
  accepted_by?: string;
  accepted_at?: string;
  final_price?: number;
};

const normalizeJob = (raw: RawJob): Job => ({
  id: String(raw.id ?? ''),
  clientId: String(raw.clientId ?? raw.client_id ?? ''),
  title: raw.title ?? '',
  description: raw.description ?? '',
  skillsRequired: raw.skillsRequired ?? raw.skills_required ?? [],
  startingPrice: Number(raw.startingPrice ?? raw.starting_price ?? 0),
  currentPrice:
    raw.currentPrice != null || raw.current_price != null
      ? Number(raw.currentPrice ?? raw.current_price)
      : undefined,
  minimumPrice: Number(raw.minimumPrice ?? raw.minimum_price ?? 0),
  decayRatePerHour: Number(raw.decayRatePerHour ?? raw.decay_rate_per_hour ?? 0),
  postedAt: String(raw.postedAt ?? raw.posted_at ?? new Date().toISOString()),
  deadlineAt: String(raw.deadlineAt ?? raw.deadline_at ?? new Date().toISOString()),
  estimatedHours: Number(raw.estimatedHours ?? raw.estimated_hours ?? 0),
  status: (raw.status as Job['status']) ?? 'open',
  acceptedBy: raw.acceptedBy ?? raw.accepted_by,
  acceptedAt: raw.acceptedAt ?? raw.accepted_at,
  finalPrice:
    raw.finalPrice != null || raw.final_price != null
      ? Number(raw.finalPrice ?? raw.final_price)
      : undefined,
});

export const geekbidApi = {
  async getJobs(): Promise<Job[]> {
    const result = await request<{ jobs?: RawJob[]; data?: RawJob[] } | RawJob[]>('jobs');
    const list = Array.isArray(result) ? result : result.jobs ?? result.data ?? [];
    return list.map(normalizeJob);
  },

  async getJobById(jobId: string): Promise<Job | null> {
    const result = await request<{ job?: RawJob; data?: RawJob } | RawJob>(`jobs/${jobId}`);
    if (!result) return null;
    if ('id' in (result as RawJob) || 'client_id' in (result as RawJob)) {
      return normalizeJob(result as RawJob);
    }
    const wrapped = result as { job?: RawJob; data?: RawJob };
    const raw = wrapped.job ?? wrapped.data;
    return raw ? normalizeJob(raw) : null;
  },

  async postJob(input: NewJobInput): Promise<Job> {
    const result = await request<{ job?: RawJob; data?: RawJob } | RawJob>('jobs', {
      method: 'POST',
      body: input,
    });
    if ('id' in (result as RawJob) || 'client_id' in (result as RawJob)) {
      return normalizeJob(result as RawJob);
    }
    const wrapped = result as { job?: RawJob; data?: RawJob };
    if (!wrapped.job && !wrapped.data) throw new Error('Invalid create job response.');
    return normalizeJob((wrapped.job ?? wrapped.data) as RawJob);
  },

  async acceptJob(jobId: string): Promise<{ bid: Bid; final_price?: number; finalPrice?: number }> {
    return request<{ bid: Bid; final_price?: number; finalPrice?: number }>('bids/accept', {
      method: 'POST',
      body: { job_id: jobId },
    });
  },

  async counterBid(jobId: string, bidPrice: number, message?: string): Promise<{ bid: Bid }> {
    return request<{ bid: Bid }>('bids/counter', {
      method: 'POST',
      body: { job_id: jobId, bid_price: bidPrice, message },
    });
  },

  async watchJob(jobId: string): Promise<void> {
    await request(`jobs/${jobId}/watch`, { method: 'POST' });
  },

  async unwatchJob(jobId: string): Promise<void> {
    await request(`jobs/${jobId}/watch`, { method: 'DELETE' });
  },
};
