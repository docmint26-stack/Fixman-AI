"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useIsAuthenticated, useAuthStore } from "@/lib/state/auth";
import { useTourStore } from "@/lib/state/ui";
import { usePathname } from "next/navigation";
import { isDemoMode } from "@/lib/services";
import { restoreSession, watchAuthState } from "@/lib/api/bootstrap";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const authed = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isDemoMode) {
      // Demo mode reads directly from the persisted auth store.
      if (!authed) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // Production: restore the persisted Supabase session, then gate.
    void restoreSession().then(() => {
      if (!useAuthStore.getState().user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });
    const unsubscribe = watchAuthState();
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname]);

  if (!authed) return null;
  return <>{children}</>;
}

export function FirstLoginTour({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  React.useEffect(() => {
    if (pathname === "/dashboard") {
      const t = setTimeout(() => {
        const { seen, start } = useTourStore.getState();
        if (!seen) start();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [pathname]);
  return <>{children}</>;
}