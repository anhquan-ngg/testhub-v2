"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/store/hook";
import { toast } from "sonner";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  type: string;
  link?: string;
  created_at: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export const useSocket = () => useContext(SocketContext);

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppSelector((state) => state.user);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user.isLoggedIn || !user.id) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setNotifications([]);
        setUnreadCount(0);
      }
      return;
    }

    // Avoid reconnecting if already connected with same userId
    if (socketRef.current?.connected) {
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const newSocket = io(`${API_URL}/notifications`, {
      query: {
        userId: user.id,
        userRole: user.role,
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Initial unread notifications
    newSocket.on("notification:unread", (unreadNotifs: Notification[]) => {
      setNotifications(unreadNotifs);
      setUnreadCount(unreadNotifs.length);
    });

    // New notification received
    newSocket.on("notification:new", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast
      toast.info(notification.title, {
        description: notification.content,
        duration: 5000,
      });
    });

    // Unread count update
    newSocket.on("notification:unread_count", (count: number) => {
      setUnreadCount(count);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.isLoggedIn, user.id, user.role]);

  const markAsRead = useCallback((notificationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("notification:mark_read", notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("notification:mark_all_read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, notifications, unreadCount, markAsRead, markAllAsRead }}
    >
      {children}
    </SocketContext.Provider>
  );
}
