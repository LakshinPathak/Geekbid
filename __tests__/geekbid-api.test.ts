import { NewJobInput } from '../src/types/models';

const mockRequest = jest.fn();

jest.mock('../src/services/apiClient', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('geekbidApi', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    jest.resetModules();
  });

  it('normalizes job list with snake_case fields', async () => {
    mockRequest.mockResolvedValueOnce([
      {
        id: 'j1',
        client_id: 'c1',
        title: 'Job',
        description: 'Desc',
        skills_required: ['React'],
        starting_price: 100,
        current_price: 90,
        minimum_price: 50,
        decay_rate_per_hour: 5,
        posted_at: '2026-01-01T00:00:00.000Z',
        deadline_at: '2026-01-02T00:00:00.000Z',
        estimated_hours: 2,
        status: 'open',
      },
    ]);

    const { geekbidApi } = require('../src/services/geekbidApi');
    const jobs = await geekbidApi.getJobs();

    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: 'j1',
        clientId: 'c1',
        skillsRequired: ['React'],
        startingPrice: 100,
        currentPrice: 90,
      })
    );
  });

  it('supports wrapped getJobById response', async () => {
    mockRequest.mockResolvedValueOnce({
      job: {
        id: 'j2',
        client_id: 'c2',
        title: 'Wrapped',
        description: 'Wrapped desc',
        skills_required: ['Node'],
        starting_price: 200,
        minimum_price: 120,
        decay_rate_per_hour: 10,
        posted_at: '2026-01-01T00:00:00.000Z',
        deadline_at: '2026-01-02T00:00:00.000Z',
        estimated_hours: 4,
        status: 'open',
      },
    });

    const { geekbidApi } = require('../src/services/geekbidApi');
    const job = await geekbidApi.getJobById('j2');

    expect(job?.clientId).toBe('c2');
    expect(job?.skillsRequired).toEqual(['Node']);
  });

  it('creates job and maps endpoints for bid/watch actions', async () => {
    mockRequest
      .mockResolvedValueOnce({
        id: 'j3',
        client_id: 'c3',
        title: 'Created',
        description: 'Created desc',
        skills_required: ['TS'],
        starting_price: 300,
        minimum_price: 150,
        decay_rate_per_hour: 8,
        posted_at: '2026-01-01T00:00:00.000Z',
        deadline_at: '2026-01-02T00:00:00.000Z',
        estimated_hours: 6,
        status: 'open',
      })
      .mockResolvedValueOnce({ bid: { id: 'b1' }, final_price: 250 })
      .mockResolvedValueOnce({ bid: { id: 'b2' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const { geekbidApi } = require('../src/services/geekbidApi');

    const input: NewJobInput = {
      title: 'Created',
      description: 'Created desc',
      skillsRequired: ['TS'],
      startingPrice: 300,
      minimumPrice: 150,
      decayRatePerHour: 8,
      estimatedHours: 6,
      deadlineAt: '2026-01-02T00:00:00.000Z',
    };

    const created = await geekbidApi.postJob(input);
    expect(created.clientId).toBe('c3');

    await geekbidApi.acceptJob('j3');
    await geekbidApi.counterBid('j3', 220, 'hello');
    await geekbidApi.watchJob('j3');
    await geekbidApi.unwatchJob('j3');

    expect(mockRequest).toHaveBeenCalledWith('jobs', expect.objectContaining({ method: 'POST', body: input }));
    expect(mockRequest).toHaveBeenCalledWith('bids/accept', expect.objectContaining({ method: 'POST' }));
    expect(mockRequest).toHaveBeenCalledWith('bids/counter', expect.objectContaining({ method: 'POST' }));
    expect(mockRequest).toHaveBeenCalledWith('jobs/j3/watch', expect.objectContaining({ method: 'POST' }));
    expect(mockRequest).toHaveBeenCalledWith('jobs/j3/watch', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws on invalid create response payload', async () => {
    mockRequest.mockResolvedValueOnce({});
    const { geekbidApi } = require('../src/services/geekbidApi');
    await expect(
      geekbidApi.postJob({
        title: 'Bad',
        description: 'Bad desc',
        skillsRequired: ['X'],
        startingPrice: 100,
        minimumPrice: 50,
        decayRatePerHour: 2,
        estimatedHours: 1,
        deadlineAt: '2026-01-02T00:00:00.000Z',
      })
    ).rejects.toThrow('Invalid create job response.');
  });
});
