import { create } from 'zustand';
import type { Notification, WebSocketEvent } from '@shared/types';
import api from '../services/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // WebSocket
  socket: WebSocket | null;
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

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  socket: null,
  isConnected: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const notifications = await api.get<Notification[]>('/notifications');
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date(),
        })),
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
          unreadCount: notification && !notification.isRead
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
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = new WebSocket(`${WS_URL}/ws?token=${token}`);

    socket.onopen = () => {
      console.log('WebSocket connected');
      set({ socket, isConnected: true });
    };

    socket.onmessage = (event) => {
      try {
        const wsEvent = JSON.parse(event.data) as WebSocketEvent<Notification>;
        
        if (wsEvent.type === 'notification') {
          get().addNotification(wsEvent.payload as Notification);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      set({ socket: null, isConnected: false });
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        const currentSocket = get().socket;
        if (!currentSocket) {
          get().connect();
        }
      }, 5000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
      });
    }
  },
}));
