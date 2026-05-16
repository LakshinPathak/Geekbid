import { Job } from '../types/models';

export const getCurrentPrice = (job: Job, now: Date): number => {
  if (job.status !== 'open') return job.finalPrice ?? job.minimumPrice;
  const elapsedMs = Math.max(now.getTime() - new Date(job.postedAt).getTime(), 0);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const raw = job.startingPrice - job.decayRatePerHour * elapsedHours;
  return Math.max(raw, job.minimumPrice);
};

export const getHoursToFloor = (job: Job, now: Date): number => {
  const current = getCurrentPrice(job, now);
  if (current <= job.minimumPrice) return 0;
  return (current - job.minimumPrice) / job.decayRatePerHour;
};

export const formatHoursToFloor = (hours: number): string => {
  if (hours <= 0) return 'At floor';
  if (hours < 1) return `${Math.ceil(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatMoney = (amount: number): string =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const validateFloor = (startingPrice: number, minimumPrice: number): boolean => {
  if (startingPrice <= 0 || minimumPrice <= 0) return false;
  return minimumPrice >= startingPrice * 0.3;
};

export const computeDecayPreview = (startPrice: number, floor: number, decayRate: number, hours: number): number =>
  Math.max(startPrice - decayRate * hours, floor);
