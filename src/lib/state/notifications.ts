import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationItem } from "@/lib/demo/types";
import { notifications as seed } from "@/lib/demo/notifications";
import { PERSIST_KEYS, jsonStorage, uid } from "@/lib/state/storage";

interface NotificationState {
  items: NotificationItem[];
  push: (title: string, body: string, kind?: NotificationItem["kind"], actionHref?: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unread: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: seed,

      push: (title, body, kind = "system", actionHref) =>
        set({
          items: [
            {
              id: uid("n"),
              title,
              body,
              time: "Just now",
              kind,
              unread: true,
              actionHref,
            },
            ...get().items,
          ],
        }),

      markRead: (id) =>
        set({
          items: get().items.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        }),

      markAllRead: () =>
        set({
          items: get().items.map((n) => ({ ...n, unread: false })),
        }),

      unread: () => get().items.filter((n) => n.unread).length,
    }),
    {
      name: PERSIST_KEYS.notifications,
      storage: jsonStorage(),
    }
  )
);

export const useUnreadCount = () =>
  useNotificationStore((s) => s.items.filter((n) => n.unread).length);