import { jobs } from '../src/data/mockData';
import { formatHoursToFloor, formatMoney, getCurrentPrice, getHoursToFloor, validateFloor } from '../src/utils/pricing';

describe('pricing utils', () => {
  it('computes current price with floor enforcement', () => {
    const job = jobs[0];
    const now = new Date(Date.now() + 1000 * 60 * 60 * 1000);
    const price = getCurrentPrice(job, now);

    expect(price).toBeGreaterThanOrEqual(job.minimumPrice);
    expect(price).toBeLessThanOrEqual(job.startingPrice);
  });

  it('returns at-floor indicator when floor reached', () => {
    expect(formatHoursToFloor(0)).toBe('At floor');
  });

  it('validates floor as at least 30% of starting', () => {
    expect(validateFloor(1000, 300)).toBe(true);
    expect(validateFloor(1000, 299)).toBe(false);
  });

  it('formats money and eta', () => {
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(typeof formatHoursToFloor(getHoursToFloor(jobs[0], new Date()))).toBe('string');
  });
});
