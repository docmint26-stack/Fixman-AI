import { DEMO_MODE } from "@/lib/demo/users";
import type {
  AuthService,
  CaseService,
  ContributionService,
  DiagnosisService,
  LeaderboardService,
  NotificationService,
  ProfileService,
  RewardService,
  WalletService,
} from "./types";
import * as demo from "./demo";

export * from "./types";

// In a later phase, swap these with real API-backed services when !DEMO_MODE.
export const authService: AuthService = demo.authSvc;
export const diagnosisService: DiagnosisService = demo.diagnosisSvc;
export const caseService: CaseService = demo.caseSvc;
export const rewardService: RewardService = demo.rewardSvc;
export const walletService: WalletService = demo.walletSvc;
export const contributionService: ContributionService = demo.contributionSvc;
export const leaderboardService: LeaderboardService = demo.leaderboardSvc;
export const notificationService: NotificationService = demo.notificationSvc;
export const profileService: ProfileService = demo.profileSvc;

export const isDemoMode = DEMO_MODE;