export const STREAK_KEY = "fft-streak";
export const LAST_PLAYED_KEY = "fft-last-played";

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STREAK_KEY) || 0);
}

export function updateStreak(): number {
  if (typeof window === "undefined") return 0;

  const today = new Date().toISOString().split("T")[0];
  const lastPlayed = localStorage.getItem(LAST_PLAYED_KEY);

  if (lastPlayed === today) return getStreak();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const currentStreak = getStreak();
  const newStreak = lastPlayed === yesterdayStr ? currentStreak + 1 : 1;

  localStorage.setItem(STREAK_KEY, String(newStreak));
  localStorage.setItem(LAST_PLAYED_KEY, today);
  return newStreak;
}

export function alreadyPlayedToday(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().split("T")[0];
  return localStorage.getItem(LAST_PLAYED_KEY) === today;
}
