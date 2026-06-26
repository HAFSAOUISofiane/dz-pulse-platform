const STREAK_KEY = "dzpulse_streak";
const LAST_VOTED_KEY = "dzpulse_last_voted";

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

export function recordStreakVote(): number {
  try {
    const today = todayStr();
    const last = localStorage.getItem(LAST_VOTED_KEY);
    if (last === today) return getStreak();
    let count = parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10);
    if (isNaN(count)) count = 0;
    count = last === yesterdayStr() ? count + 1 : 1;
    localStorage.setItem(STREAK_KEY, String(count));
    localStorage.setItem(LAST_VOTED_KEY, today);
    return count;
  } catch {
    return 1;
  }
}
