const STREAK_KEY = "dzpulse_streak";
const LAST_VOTED_KEY = "dzpulse_last_voted";
const STREAK_BADGES_KEY = "dzpulse_streak_badges";

const MILESTONES = [3, 7, 30];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getStreak(): number {
  try {
    const last = localStorage.getItem(LAST_VOTED_KEY);
    const count = parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10);
    if (!last) return 0;
    if (last === todayStr() || last === yesterdayStr()) return isNaN(count) ? 0 : count;
    return 0;
  } catch {
    return 0;
  }
}

function getEarnedBadges(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(STREAK_BADGES_KEY) ?? "[]")); } catch { return new Set(); }
}

function saveEarnedBadges(s: Set<number>) {
  try { localStorage.setItem(STREAK_BADGES_KEY, JSON.stringify([...s])); } catch { /* */ }
}

// Returns the new streak count AND any newly unlocked milestone (or null)
export function recordStreakVote(): { streak: number; newMilestone: number | null } {
  try {
    const today = todayStr();
    const last = localStorage.getItem(LAST_VOTED_KEY);
    if (last === today) return { streak: getStreak(), newMilestone: null };

    let count = parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10);
    if (isNaN(count)) count = 0;
    count = last === yesterdayStr() ? count + 1 : 1;

    localStorage.setItem(STREAK_KEY, String(count));
    localStorage.setItem(LAST_VOTED_KEY, today);

    // Check for newly unlocked milestones
    const earned = getEarnedBadges();
    let newMilestone: number | null = null;
    for (const m of MILESTONES) {
      if (count >= m && !earned.has(m)) {
        earned.add(m);
        newMilestone = m; // report highest newly unlocked
      }
    }
    if (newMilestone !== null) saveEarnedBadges(earned);

    return { streak: count, newMilestone };
  } catch {
    return { streak: 1, newMilestone: null };
  }
}
