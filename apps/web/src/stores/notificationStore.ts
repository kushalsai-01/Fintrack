import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Notification, WebSocketEvent } from '@shared/types';
import api from '../services/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Socket.IO
  socket: Socket | null;
  isConnected: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  
  // WebSocket actions
  connect: () => void;
  disconnect: () => void;
  addNotification: (notification: Notification) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  socket: null,
  isConnected: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ notifications: Notification[] }>('/notifications');
      const notifications = response.notifications || [];
      const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount - (state.notifications.find((n) => n.id === id)?.read ? 0 : 1)
        ),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            notification && !notification.read && !notification.archived
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  clearAll: async () => {
    try {
      await api.delete('/notifications');
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  },

  connect: () => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) return;

    // Use Socket.IO client (matches backend Socket.IO server)
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      set({ socket, isConnected: true });
    });

    socket.on('notification', (notification: Notification) => {
      get().addNotification(notification);
    });

    // Domain events (emitted alongside `notification`)
    socket.on('budget:alert', (payload: { notification: Notification }) => {
      if (payload?.notification) get().addNotification(payload.notification);
    });

    socket.on('goal:milestone', (payload: { notification: Notification }) => {
      if (payload?.notification) get().addNotification(payload.notification);
    });

    socket.on(
      'transaction:created',
      (payload: { transaction: Partial<Notification> & { id?: string; description?: string; amount?: number; category?: string; type?: string } }) => {
        const tx = payload?.transaction;
        if (!tx) return;

        get().addNotification({
          id: `tx_${tx.id || Date.now().toString()}`,
          userId: undefined,
          type: 'info',
          title: 'Transaction added',
          message: `${tx.description ?? 'Transaction'}${typeof tx.amount === 'number' ? ` - $${tx.amount.toFixed(2)}` : ''}`,
          read: false,
          archived: false,
          createdAt: new Date().toISOString(),
          actionUrl: '/transactions',
        } as Notification);
      }
    );

    socket.on('bill:reminder', (data: { billId: string; billName: string; amount: number; daysUntilDue: number; dueDate: string; notificationId: string }) => {
      get().addNotification({
        id: data.notificationId || `bill_${Date.now()}`,
        userId: undefined,
        type: 'bill' as any,
        title: 'Bill Due Soon',
        message: data.daysUntilDue === 0
          ? `${data.billName} is due TODAY — $${data.amount}`
          : `${data.billName} due in ${data.daysUntilDue} day${data.daysUntilDue > 1 ? 's' : ''} — $${data.amount}`,
        read: false,
        archived: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/bills',
      } as Notification);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: !notification.read && !notification.archived ? state.unreadCount + 1 : state.unreadCount,
    }));

    // Show browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
      });
    }
  },
}));
