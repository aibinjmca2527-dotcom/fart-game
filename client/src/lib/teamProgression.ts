/**
 * Team Progression & Level Continuation System
 *
 * Rules:
 * 1. Solo / Personal Level Progression: Starts at Level 1. Winning a level unlocks the next.
 * 2. Custom Team Continuation:
 *    - Identified by the exact combination of players in the room.
 *    - If the EXACT SAME group of friends reconnects, the game automatically resumes from their continuation level.
 *    - If ANY player is new to the team, the progression resets and starts from Level 1!
 */

const SOLO_PROGRESS_KEY = 'fun_together_max_unlocked_level';
const TEAM_PREFIX = 'fun_together_team_';

export function getSoloMaxUnlockedLevel(): number {
  try {
    const val = localStorage.getItem(SOLO_PROGRESS_KEY);
    const num = val ? parseInt(val, 10) : 1;
    return isNaN(num) || num < 1 ? 1 : Math.min(5, num);
  } catch {
    return 1;
  }
}

export function saveSoloMaxUnlockedLevel(completedLevelId: number) {
  try {
    const nextLevel = Math.min(5, completedLevelId + 1);
    const current = getSoloMaxUnlockedLevel();
    if (nextLevel > current) {
      localStorage.setItem(SOLO_PROGRESS_KEY, String(nextLevel));
    }
  } catch {
    // Storage access fallback
  }
}

/**
 * Creates a normalized signature for a team of players based on their display names.
 * Sorted alphabetically so joining order does not affect the team identity.
 */
export function getTeamSignature(names: string[]): string {
  const clean = names
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  if (clean.length < 2) return '';
  return clean.join(':::');
}

/**
 * Gets the saved continuation level for this exact team roster.
 * Returns 1 if this team combination has never played or reached level 1.
 */
export function getSavedTeamLevel(teamSig: string): number {
  if (!teamSig) return 1;
  try {
    const val = localStorage.getItem(TEAM_PREFIX + teamSig);
    if (!val) return 1;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : Math.min(5, num);
  } catch {
    return 1;
  }
}

/**
 * Persists the unlocked continuation level for this exact team roster.
 */
export function saveTeamLevel(teamSig: string, nextLevelId: number) {
  if (!teamSig) return;
  try {
    const target = Math.min(5, Math.max(1, nextLevelId));
    const cur = getSavedTeamLevel(teamSig);
    if (target > cur) {
      localStorage.setItem(TEAM_PREFIX + teamSig, String(target));
    }
  } catch {
    // Storage access fallback
  }
}
