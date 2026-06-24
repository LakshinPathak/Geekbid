const mockDisconnect = jest.fn();
const mockIo = jest.fn(() => ({ disconnect: mockDisconnect }));

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo.apply(null, args as []),
}));

jest.mock('../src/config/env', () => ({
  env: {
    socketUrl: 'https://socket.test',
    authToken: 'sock-token',
    apiBaseUrl: 'https://api.test',
    useMock: false,
  },
}));

describe('socket service', () => {
  beforeEach(() => {
    mockIo.mockClear();
    mockDisconnect.mockClear();
    jest.resetModules();
  });

  it('connects once and reuses socket instance', async () => {
    const { connectSocket } = require('../src/services/socket');

    const s1 = connectSocket();
    const s2 = connectSocket();

    expect(s1).toBe(s2);
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledWith(
      'https://socket.test',
      expect.objectContaining({ auth: { token: 'sock-token' }, transports: ['websocket'] })
    );
  });

  it('disconnects and resets reference safely', async () => {
    const { connectSocket, disconnectSocket } = require('../src/services/socket');

    connectSocket();
    disconnectSocket();
    disconnectSocket();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
