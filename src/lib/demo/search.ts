import { cases } from "./cases";
import { contributions } from "./contributions";
import { leaderboard } from "./leaderboard";

export interface SearchResult {
  id: string;
  kind: "Case" | "Fix" | "Contributor";
  title: string;
  subtitle: string;
  href: string;
  matchScore: number;
}

export function searchDemo(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (haystack: string) => {
    const h = haystack.toLowerCase();
    if (h.includes(q)) return q.length / h.length + (h.startsWith(q) ? 0.5 : 0);
    const words = q.split(/\s+/);
    const hit = words.filter((w) => h.includes(w)).length;
    return hit > 0 ? hit / words.length : 0;
  };

  const results: SearchResult[] = [];

  for (const c of cases) {
    const s = score(`${c.title} ${c.tags.join(" ")} ${c.category}`);
    if (s > 0) {
      results.push({
        id: `case-${c.id}`,
        kind: "Case",
        title: c.title,
        subtitle: `${c.category} · ${c.status}`,
        href: `/cases/${c.id}`,
        matchScore: s,
      });
    }
    for (const f of c.fixes) {
      const fs = score(`${f.title} ${f.tags.join(" ")}`);
      if (fs > 0) {
        results.push({
          id: `fix-${c.id}-${f.id}`,
          kind: "Fix",
          title: f.title,
          subtitle: `${f.successRate}% success · for "${c.title}"`,
          href: `/diagnose/${c.id}`,
          matchScore: fs,
        });
      }
    }
  }

  for (const con of contributions) {
    const s = score(`${con.title} ${con.fix}`);
    if (s > 0) {
      results.push({
        id: `con-${con.id}`,
        kind: "Fix",
        title: con.fix,
        subtitle: `${con.title} · ${con.status}`,
        href: `/cases/${con.caseId}`,
        matchScore: s,
      });
    }
  }

  for (const l of leaderboard) {
    const s = score(`${l.name} ${l.handle}`);
    if (s > 0) {
      results.push({
        id: `leader-${l.rank}`,
        kind: "Contributor",
        title: `${l.name} ${l.handle}`,
        subtitle: `${l.title} · Rank #${l.rank}`,
        href: `/leaderboard`,
        matchScore: s,
      });
    }
  }

  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}