import { AppShell } from "@/components/app-shell/app-shell";
import { AuthGate, FirstLoginTour } from "@/components/app-shell/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <FirstLoginTour>
        <AppShell>{children}</AppShell>
      </FirstLoginTour>
    </AuthGate>
  );
}