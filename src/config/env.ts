const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1',
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3004',
  useMock: parseBool(process.env.EXPO_PUBLIC_USE_MOCK, false),
  authToken: process.env.EXPO_PUBLIC_AUTH_TOKEN ?? '',
};
