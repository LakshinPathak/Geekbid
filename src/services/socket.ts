import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

export type PriceUpdateEvent = {
  job_id: string;
  current_price: number;
};

export type JobAcceptedEvent = {
  job_id: string;
  freelancer_id: string;
  final_price: number;
};

let socketRef: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socketRef) return socketRef;

  socketRef = io(env.socketUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    auth: env.authToken ? { token: env.authToken } : undefined,
  });

  return socketRef;
};

export const disconnectSocket = (): void => {
  if (!socketRef) return;
  socketRef.disconnect();
  socketRef = null;
};
