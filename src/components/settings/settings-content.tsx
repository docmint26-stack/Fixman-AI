"use client";

import * as React from "react";
import { Check, Moon, Sun, Trash2, RotateCcw, PlayCircle } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { useTheme } from "@/components/providers";
import { useCurrentUser, useTour } from "@/lib/hooks";
import { clearDemoData } from "@/lib/state/storage";
import { notify } from "@/lib/feedback";
import { useRouter } from "next/navigation";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const user = useCurrentUser();
  const tour = useTour();
  const router = useRouter();
  const [notif, setNotif] = React.useState({
    rewardAlerts: true,
    caseUpdates: true,
    streakReminders: true,
    weeklyDigest: false,
  });
  const [privacy, setPrivacy] = React.useState({ localHashing: true, showWallet: true, publicActivity: false });
  const [saved, setSaved] = React.useState(false);

  const saveProfile = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    notify.success("Profile saved", "Changes are stored locally in demo mode.");
  };

  const onResetDemo = () => {
    clearDemoData();
    notify.success("Demo data reset", "Reloading with a fresh demo state…");
    window.setTimeout(() => router.refresh(), 900);
  };

  const onDeleteAccount = () => {
    notify.warning("Account deletion is disabled", "This is a demo environment — accounts can't be deleted.");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account & preferences"
        subtitle="Control your experience, privacy, and how you appear to the network."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>System theme is applied by default, but you can pin one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["dark", "light"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                    theme === mode
                      ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20"
                      : "border-border/70 bg-muted/20 hover:border-primary/30"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {mode === "dark" ? <Moon className="size-4 text-violet-300" /> : <Sun className="size-4 text-amber-300" />}
                    <span className="text-sm font-medium capitalize text-foreground">{mode}</span>
                  </span>
                  {theme === mode && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">Reduce motion</p>
                <p className="text-[11px] text-muted-foreground">Minimize animations across the app</p>
              </div>
              <Switch size="sm" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what you hear about from FixMind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {(
              [
                ["rewardAlerts", "Reward & royalty alerts", "When fix rewards unlock or royalties land"],
                ["caseUpdates", "Case updates", "When your diagnosis gets new verification activity"],
                ["streakReminders", "Streak reminders", "A gentle nudge before your streak resets"],
                ["weeklyDigest", "Weekly digest", "A summary of your impact every Sunday"],
              ] as const
            ).map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={notif[key]}
                  onCheckedChange={(checked) => setNotif((n) => ({ ...n, [key]: checked }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Public information other fixers see.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input defaultValue={user?.name ?? "Alex Morgan"} className={inputClass} />
              </Field>
              <Field label="Handle">
                <input defaultValue={user?.handle ?? "@alexmorgan"} className={inputClass} />
              </Field>
            </div>
            <Field label="Bio" hint="Shown on your public profile.">
              <textarea defaultValue={user?.bio ?? ""} rows={2} className={cn(inputClass, "resize-none")} />
            </Field>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Expertise tags</p>
              <div className="flex flex-wrap justify-end gap-1.5">
                {(user?.expertise ?? ["React", "Python", "Windows"]).map((e) => (
                  <span key={e} className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                    {e} <span className="ml-1 cursor-pointer text-primary/50">×</span>
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={saveProfile}>
              {saved ? <Check className="size-3.5" /> : <Icon name="save" className="size-3.5" />}
              {saved ? "Saved" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & data</CardTitle>
              <CardDescription>Your problem data is yours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {(
                [
                  ["localHashing", "Hash evidence before upload", "Logs & screenshots are hashed locally first"],
                  ["showWallet", "Show wallet on profile", "Lets other fixers tip you royalties"],
                  ["publicActivity", "Public activity feed", "Share your diagnosis history publicly"],
                ] as const
              ).map(([key, title, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={privacy[key]}
                    onCheckedChange={(checked) => setPrivacy((p) => ({ ...p, [key]: checked }))}
                  />
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1">Export my data</Button>
                <Button size="sm" variant="ghost" className="flex-1 text-muted-foreground">Erase AI context</Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo controls */}
          <Card>
            <CardHeader>
              <CardTitle>Demo controls</CardTitle>
              <CardDescription>Everything here runs locally in your browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => tour.start()}>
                  <PlayCircle className="size-3.5" /> Replay onboarding tour
                </Button>
                <Button size="sm" variant="secondary" onClick={onResetDemo}>
                  <RotateCcw className="size-3.5" /> Reset demo data
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Resetting demo data clears cases, rewards, notifications and wallet state from localStorage.
              </p>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>Irreversible actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Deleting your account unlinks your wallet and revokes pending royalties. On-chain history remains public.
              </p>
              <Button size="sm" variant="destructive" onClick={onDeleteAccount}>
                <Trash2 className="size-3.5" /> Delete account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}