import type { Server } from 'socket.io';
import { logger } from './logger.js';

let io: Server | null = null;

/**
 * Called by `server.ts` once Socket.IO is initialized.
 */
export function setSocketIo(socketIo: Server): void {
  io = socketIo;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    io?.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    logger.error(`Failed to emit socket event "${event}" to user:${userId}`, err);
  }
}

export function emitNotification(userId: string, notification: unknown): void {
  emitToUser(userId, 'notification', notification);
}

