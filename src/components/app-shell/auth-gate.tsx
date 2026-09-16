"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useIsAuthenticated } from "@/lib/state/auth";
import { useTourStore } from "@/lib/state/ui";
import { usePathname } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const authed = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();
  const checked = React.useRef(false);

  React.useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!authed) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authed, pathname, router]);

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