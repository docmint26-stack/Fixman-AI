# FixMind AI — Frontend UI

Premium, dark-first AI troubleshooting platform with Web3 FIX-token rewards.
Built with Next.js 16.3.5, React 19, Tailwind CSS 4, shadcn v4 (Base UI), Zustand and Framer Motion.

The app runs in **demo mode** by default: every flow (auth, diagnosis, verification, rewards,
wallet) is fully interactive and backed by an in-memory + `localStorage` state layer. No backend
is required.

## Demo credentials

```
Email:    alex@fixmind.ai
Password: demo1234
```

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` (already provided). The public `/demo` route
walks through the whole loop — Problem → Analyze → Match → Recommend → Try → Verify → Learn →
Reward — without signing in.

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, how it works, token economy, testimonials, FAQ |
| `/demo` | Public animated product walkthrough (no auth) |
| `/login` | Auth — sign in (pre-filled demo credentials) |
| `/signup` | Auth — create account |
| `/forgot-password` | Auth — password reset |
| `/dashboard` | App — KPIs, recent diagnoses, contributions, rewards snapshot, leaderboard, next actions |
| `/diagnose` | App — New Diagnosis wizard (input → analyzing stages → ranked fixes) |
| `/diagnose/[caseId]` | App — diagnosis result: ranked fixes, try-fix checklist, verification, reward |
| `/diagnosis` | App — redirect to `/diagnose` |
| `/cases` | App — cases list with status/category/search filters |
| `/cases/[id]` | App — same diagnosis result view for any case (including newly created) |
| `/notifications` | App — full notification list with mark-read |
| `/contribute` | App — open tasks with stake/reward ranges, difficulty filters, contribution history |
| `/rewards` | App — Web3 wallet balance, claim/stake, transactions, reward history |
| `/leaderboard` | App — weekly/monthly/all-time rankings, top-3 podium, streaks, reward pool |
| `/profile` | App — public profile, stats, contributions, achievements, wallet, streak |
| `/settings` | App — appearance, notifications, profile, privacy, demo controls, danger zone |

## Architecture

A single demo state layer powers every screen and can be swapped for real APIs later.

```
UI components ──► hooks (src/lib/hooks) ──► services (src/lib/services) ──► state (src/lib/state)
                                                    │                              │
                                                    └──── demo seed data ──────────┘
                                                      (src/lib/demo/*)
```

- **`src/lib/demo/*`** — pure seed data + shared types (`types.ts` is the single source of truth).
- **`src/lib/state/*`** — Zustand stores with `persist` (auth, cases, rewards, wallet, notifications,
  leaderboard, tour ui). Persisted through the SSR-safe `safeStorage` wrapper.
- **`src/lib/services/*`** — `AuthService`, `DiagnosisService`, `CaseService`, `RewardService`,
  `WalletService`, `ContributionService`, `LeaderboardService`, `NotificationService`,
  `ProfileService`. Demo implementations live in `services/demo.ts`; `services/index.ts` is the
  swap point for real API-backed services.
- **`src/lib/hooks`** — React bindings (`useCurrentUser`, `useCases`, `useRewards`, `useWallet`,
  `useNotifications`, `useContributions`, `useLeaderboard`, `useDiagnosis`, `useTour`).
- **`src/lib/data.ts`** — re-exports demo data + types so screens import from one place.

### Key flows

- **Diagnosis:** `startDiagnosis(input)` runs `findAnalysisFor()` keyword mapping (hydration, Wi-Fi,
  Python, Excel/XLOOKUP, Docker) and creates a `Suggested` case, then redirects to
  `/diagnose/[caseId]`.
- **Try → verify:** pick a ranked fix (`Applied`) → tick steps → submit outcome (`Monitoring`,
  24h observation) → advance the simulated window → `Verified`/`Failed` and the reward unlocks.
- **Rewards:** verified outcomes add claimable FIX; claiming moves it to the balance and records a
  transaction. Staking moves balance → staked. A wallet is only required to claim, not to earn.

### Verification language

The UI never shows chain-of-thought. It surfaces high-level stages only — Understanding context →
Checking evidence → Comparing similar cases → Evaluating outcomes → Ranking fixes — with case
statuses `Suggested · Applied · Monitoring · Verified · Partially Verified · Failed · Needs Verification`.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata, ThemeProvider, SplashScreen, Toaster)
│   ├── page.tsx                # Landing page (server → LandingPage client component)
│   ├── globals.css             # Design system: oklch tokens, keyframes, utilities
│   ├── demo/                   # Public demo experience (own layout, no auth gate)
│   ├── (auth)/                 # Centered glass-card auth layout (login / signup / forgot)
│   └── (app)/                  # Auth-gated app: layout wraps AuthGate → AppShell
│       ├── dashboard, diagnose, diagnose/[caseId], diagnosis, cases, cases/[id],
│       ├── notifications, contribute, rewards, leaderboard, profile, settings
├── components/
│   ├── ui/                     # shadcn v4 Base UI primitives
│   ├── shared/                 # icon, motion, status-badge, token-badge, case-card, empty-state, etc.
│   ├── app-shell/              # AppShell + command palette + auth gate
│   ├── brand/                  # FixGlyph + Logo + SplashScreen
│   ├── diagnose/               # DiagnoseWizard, AnalyzingPanel, DiagnosisResult, VerificationPanel
│   ├── demo/                   # DemoWorkflow (stage machine + sidebar stepper)
│   ├── landing/ dashboard/ cases/ contribute/ rewards/ leaderboard/ profile/ settings/ auth/
│   └── product-tour.tsx        # 5-step onboarding tour
└── lib/
    ├── demo/                   # Seed data + types + keyword analysis mapping
    ├── state/                  # Zustand stores + storage helpers
    ├── services/               # Service interfaces + demo implementations
    ├── hooks/                  # React bindings over services/stores
    ├── data.ts, format.ts, motion.ts, feedback.ts, utils.ts
```

## Design System

**Dark-first.** All surfaces are built on oklch tokens defined in `globals.css`.

- **Primary:** violet/indigo (`--color-primary`); **Accents:** cyan, success green, warning amber, info blue.
- **Typography:** Inter (`--font-sans`) body, Space Grotesk (`--font-heading`) headings.
- **Animation tokens:** `animate-float`, `animate-aurora`, `animate-shimmer`, `animate-signal`, `animate-spin-slow`, `animate-gradient-x`, `animate-marquee`, `animate-scan`, `animate-rise`, `animate-pulse-glow`.
- **Utilities:** `text-gradient`, `text-gradient-strong`, `glass-panel`, `bg-grid-faint`, `no-scrollbar`, `scrollbar-thin`, `mask-fade-x`, `card-hover`, `noise`.
- **Primitives:** shadcn v4 "base-nova" on `@base-ui/react`. Import `cn` from `"cn"`. Use the
  `render` prop (not `asChild`) for custom elements.

## Scripts

```bash
npm run dev          # http://localhost:3000
npm run build        # production build (Turbopack + TypeScript check)
npm run lint         # eslint
npm test             # vitest (single run)
npm run test:watch   # vitest watch
npx tsc --noEmit     # standalone type check
```

## Testing

Vitest + jsdom + Testing Library, configured in `vitest.config.ts` (with `NEXT_PUBLIC_DEMO_MODE=true`
injected and the `@/` alias resolved). `src/lib/services/demo.test.ts` covers auth login/signup/logout,
diagnosis keyword mapping and case creation, case progression through verification, reward claiming,
staking, wallet connect/verify/disconnect, and contribution submission.

## Backend Integration Next Steps

1. **Auth:** swap `DemoAuthService` for Supabase/NextAuth + wallet connect (Wagmi/ConnectKit).
2. **API:** implement the service interfaces against tRPC/REST; wire React Query in the hooks.
3. **Wallet:** Wagmi + viem for real connection, balance reads and claim transactions.
4. **Search:** server-side full-text search (Postgres FTS or Meilisearch) behind `searchDemo`.
5. **Real-time:** SSE/WebSockets for live diagnosis progress and leaderboard updates.
6. **Evidence upload:** S3/R2 presigned URLs with client-side SHA-256 hashing.
7. **Notifications:** Web Push + persisted in-app notifications.
8. **Analytics:** instrument diagnosis start, fix verified and reward claimed.
