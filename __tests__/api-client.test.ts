const fetchMock = jest.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

jest.mock('../src/config/env', () => ({
  env: {
    apiBaseUrl: 'https://api.test/v1/',
    authToken: 'token-123',
    socketUrl: 'https://socket.test',
    useMock: true,
  },
}));

describe('apiClient.request', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.resetModules();
  });

  it('builds URL, injects auth header, and unwraps success envelope', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { hello: 'world' } }),
    });

    const request = require('../src/services/apiClient').request as <T>(
      path: string,
      options?: unknown
    ) => Promise<T>;
    const res = await request<{ hello: string }>('/jobs');

    expect(res).toEqual({ hello: 'world' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/v1/jobs', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
    }));
  });

  it('passes absolute URL unchanged and supports custom method/body/token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: 1 }),
    });

    const request = require('../src/services/apiClient').request as (
      path: string,
      options?: unknown
    ) => Promise<unknown>;
    await request('https://custom.host/ping', {
      method: 'POST',
      token: 'override-token',
      body: { x: 1 },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.host/ping',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ x: 1 }),
        headers: expect.objectContaining({ Authorization: 'Bearer override-token' }),
      })
    );
  });

  it('returns empty object on 204', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const request = require('../src/services/apiClient').request as (
      path: string,
      options?: unknown
    ) => Promise<unknown>;
    const out = await request('jobs/123/watch', { method: 'DELETE' });
    expect(out).toEqual({});
  });

  it('throws response text when request fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request payload',
    });

    const request = require('../src/services/apiClient').request as (
      path: string,
      options?: unknown
    ) => Promise<unknown>;
    await expect(request('jobs', { method: 'POST', body: { a: 1 } })).rejects.toThrow('Bad request payload');
  });

  it('throws when API envelope says success false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: false, data: null }),
    });

    const request = require('../src/services/apiClient').request as (
      path: string,
      options?: unknown
    ) => Promise<unknown>;
    await expect(request('jobs')).rejects.toThrow('API returned success: false');
  });
});
