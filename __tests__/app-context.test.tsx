import { act, renderHook } from '@testing-library/react-native';
import { AppProvider, useApp } from '../src/context/AppContext';

describe('AppContext modules', () => {
  it('posts jobs, accepts bids, chats, and handles escrow/disputes', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    const jobsBefore = result.current.jobs.length;

    let postResult: Awaited<ReturnType<typeof result.current.postJob>> | undefined;
    await act(async () => {
      postResult = await result.current.postJob({
        title: 'Test Job',
        description:
          'This is a sufficiently long description for test coverage and validation checks in the GeekBid app module.',
        skillsRequired: ['React Native'],
        startingPrice: 500,
        minimumPrice: 200,
        decayRatePerHour: 10,
        estimatedHours: 10,
        deadlineAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
    });

    expect(postResult?.ok).toBe(true);
    expect(result.current.jobs.length).toBe(jobsBefore + 1);

    let acceptResult: Awaited<ReturnType<typeof result.current.acceptJob>> | undefined;
    await act(async () => {
      acceptResult = await result.current.acceptJob('job-1');
    });

    expect(acceptResult?.ok).toBe(true);
    expect(result.current.jobs.find((j) => j.id === 'job-1')?.status).toBe('accepted');

    let sendResult: ReturnType<typeof result.current.sendMessage> | undefined;
    act(() => {
      sendResult = result.current.sendMessage('room-1', 'Testing chat send flow.');
    });
    expect(sendResult!.ok).toBe(true);
    expect(result.current.chatMessages.some((m) => m.text.includes('Testing chat send flow.'))).toBe(true);

    let releaseResult: ReturnType<typeof result.current.releaseEscrow> | undefined;
    act(() => {
      releaseResult = result.current.releaseEscrow('t-2');
    });
    expect(releaseResult!.ok).toBe(true);
    expect(result.current.transactions.find((t) => t.id === 't-2')?.escrowStatus).toBe('released');

    const newTx = result.current.transactions.find((t) => t.jobId === 'job-1' && t.id !== 't-2');
    expect(newTx).toBeDefined();
    const newTxId = newTx!.id;

    let disputeResult: ReturnType<typeof result.current.raiseDispute> | undefined;
    act(() => {
      disputeResult = result.current.raiseDispute(newTxId, 'Need admin review for QA mismatch.');
    });
    expect(disputeResult!.ok).toBe(true);
    expect(result.current.disputes.length).toBeGreaterThan(0);
  });

  it('rejects invalid actions with clear errors', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    let badPost: Awaited<ReturnType<typeof result.current.postJob>> | undefined;
    await act(async () => {
      badPost = await result.current.postJob({
        title: 'x',
        description: 'short',
        skillsRequired: ['React'],
        startingPrice: 100,
        minimumPrice: 10,
        decayRatePerHour: 5,
        estimatedHours: 1,
        deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    expect(badPost?.ok).toBe(false);
    expect(badPost?.message).toBeDefined();

    let badMessage: ReturnType<typeof result.current.sendMessage> | undefined;
    act(() => {
      badMessage = result.current.sendMessage('room-1', '   ');
    });
    expect(badMessage!.ok).toBe(false);
  });
});
