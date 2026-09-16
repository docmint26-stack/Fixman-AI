export const helpContent = {
  fixToken:
    "FIX is the utility token used for premium AI intelligence, contribution rewards, staking and knowledge royalties.",
  verifiedOutcome:
    "Evidence that shows whether a recommended fix actually solved the reported problem — collected from diagnostics, logs, and follow-up checks.",
  staking:
    "Stake FIX behind a high-value contribution to signal confidence. Invalid or abusive submissions may lose part of the stake.",
  walletPurpose:
    "You only need a wallet to claim on-chain FIX, stake, or receive royalties. You can diagnose, contribute, and earn pending rewards without one.",
  networkLearning:
    "Each verified outcome updates the outcome graph so similar future cases benefit from the same result.",
  claimable:
    "Rewards that passed verification and are unlocked for claiming. Claim them to move FIX into your wallet balance.",
};

export const diagnosisStages = [
  {
    step: 1,
    label: "Understanding the problem...",
    detail: "Parsing the title, description, and category",
  },
  {
    step: 2,
    label: "Reading uploaded evidence...",
    detail: "Scoring screenshots, logs, code and output",
  },
  {
    step: 3,
    label: "Extracting error signatures...",
    detail: "Isolating the failure pattern",
  },
  {
    step: 4,
    label: "Comparing similar cases...",
    detail: "Scanning verified outcome history",
  },
  {
    step: 5,
    label: "Evaluating previous outcomes...",
    detail: "Weighting success rates per environment",
  },
  {
    step: 6,
    label: "Ranking possible fixes...",
    detail: "Balancing confidence, effort, and risk",
  },
  {
    step: 7,
    label: "Preparing recommendation...",
    detail: "Composing your ranked fix list",
  },
];

export const verificationStages = [
  { label: "Packaging evidence…", detail: "Normalizing submitted logs and screenshots" },
  { label: "Cross-checking error recurrence…", detail: "Matching against the observation window" },
  { label: "Signing outcome with community verifiers…", detail: "Collecting independent signatures" },
  { label: "Finalizing verification…", detail: "Writing the outcome to the graph" },
];