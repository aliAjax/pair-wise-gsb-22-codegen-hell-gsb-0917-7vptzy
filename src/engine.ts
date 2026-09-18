import { normalize, uid } from "./store";
import type { Confusion, TrainingState, Wine, WineStat } from "./types";

export interface PickResult {
  wine: Wine | null;
  /** none：无酒款；single：只剩当前这一款无法避重；ok：正常选题 */
  reason: "ok" | "none" | "single";
  relaxed: boolean;
}

/**
 * 选下一道题。
 * 规则：
 * - 当前题（currentWineId）任何情况下都不允许紧接重复；
 * - 冷却未到（错题 cooldownUntil=N+3、对题 N+6）的题不选；
 * - 冷却导致无题可出时放宽冷却（题量不足兜底）；
 * - 候选中优先「从未出现」的题，其余按最久未出现（lastShown 升序），
 *   同序随机打破。
 */
export function pickNextWine(state: TrainingState): PickResult {
  const others = state.wines.filter((w) => w.id !== state.currentWineId);
  if (state.wines.length === 0) return { wine: null, reason: "none", relaxed: false };
  if (others.length === 0) {
    return { wine: state.wines[0] ?? null, reason: "single", relaxed: false };
  }

  const nextRound = state.totalAnswered + 1;
  let pool = others.filter((w) => {
    const cd = state.stats[w.id]?.cooldownUntil;
    return cd == null || cd <= nextRound;
  });
  let relaxed = false;
  if (pool.length === 0) {
    pool = others;
    relaxed = true;
  }

  const never = pool.filter((w) => state.stats[w.id]?.lastShown == null);
  const working = never.length > 0 ? never : pool;

  let oldest: Wine | null = null;
  let oldestRound: number | null = null;
  const tied: Wine[] = [];
  for (const w of working) {
    const round = state.stats[w.id]?.lastShown ?? null;
    if (oldest === null || (round !== null && oldestRound !== null && round < oldestRound)) {
      oldest = w;
      oldestRound = round;
      tied.length = 0;
      tied.push(w);
    } else if (round === oldestRound) {
      tied.push(w);
    }
  }
  const wine = tied.length > 1 ? tied[Math.floor(Math.random() * tied.length)] : (oldest ?? pool[0]);
  return { wine: wine ?? null, reason: "ok", relaxed };
}

/** 以酒款名 + 别名（逗号/顿号/分号分隔）作答均算正确 */
export function isCorrectAnswer(wine: Wine, guess: string): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const names = [wine.name, ...wine.aliases.split(/[,，、;；/／|]+/)]
    .map(normalize)
    .filter(Boolean);
  return names.includes(g);
}

function confusionKey(answeredWineId: string | null, guess: string, correctWineId: string): string {
  // 混淆是「答成什么 ↔ 正确答案」的成对关系，需用两者联合去重
  const from = answeredWineId ?? `text:${normalize(guess)}`;
  return `${from}=>${correctWineId}`;
}

function recordConfusion(
  state: TrainingState,
  correctWineId: string,
  guess: string,
  match: Wine | null
): { confusions: Confusion[]; isNew: boolean; record: Confusion } {
  const key = confusionKey(match ? match.id : null, guess, correctWineId);
  const existing = state.confusions.find((c) => c.uid === key);
  if (existing) {
    const record: Confusion = { ...existing, count: existing.count + 1, lastAt: Date.now() };
    return {
      confusions: state.confusions.map((c) => (c === existing ? record : c)),
      isNew: false,
      record,
    };
  }
  const record: Confusion = {
    id: uid("c"),
    uid: key,
    answeredText: guess.trim(),
    answeredWineId: match ? match.id : null,
    correctWineId,
    count: 1,
    lastAt: Date.now(),
  };
  return { confusions: [...state.confusions, record], isNew: true, record };
}

export interface AnswerOutcome {
  state: TrainingState;
  correct: boolean;
  matchedWine: Wine | null;
  isNewConfusion: boolean;
  confusion: Confusion | null;
}

/**
 * 提交一次作答（或跳过），更新统计、冷却与混淆关系。
 * 答错：cooldownUntil = N+3（至少隔 2 题，第 N+3 题可重现）
 * 答对：cooldownUntil = N+6（至少隔 5 题，第 N+6 题可重现）
 */
export function applyAnswer(state: TrainingState, rawGuess: string | null): AnswerOutcome {
  const wineId = state.currentWineId;
  if (!wineId || state.phase !== "asking") {
    return { state, correct: false, matchedWine: null, isNewConfusion: false, confusion: null };
  }
  const wine = state.wines.find((w) => w.id === wineId);
  if (!wine) {
    return { state, correct: false, matchedWine: null, isNewConfusion: false, confusion: null };
  }

  const guess = rawGuess?.trim() ?? "";
  const skipped = rawGuess === null;
  const correct = !skipped && isCorrectAnswer(wine, guess);
  const match = !skipped && !correct
    ? state.wines.find((w) => w.id !== wineId && isCorrectAnswer(w, guess)) ?? null
    : null;

  const round = state.totalAnswered + 1;
  const prev: WineStat = state.stats[wineId] ?? {
    seen: 0,
    correct: 0,
    wrong: 0,
    lastShown: null,
    cooldownUntil: null,
  };
  const stat: WineStat = {
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastShown: round,
    cooldownUntil: correct ? round + 6 : round + 3,
  };

  let confusions = state.confusions;
  let isNewConfusion = false;
  let confusionRecord: Confusion | null = null;
  if (!correct && !skipped && guess) {
    const result = recordConfusion(state, wineId, guess, match);
    confusions = result.confusions;
    isNewConfusion = result.isNew;
    confusionRecord = result.record;
  }

  const next: TrainingState = {
    ...state,
    stats: { ...state.stats, [wineId]: stat },
    confusions,
    totalAnswered: round,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    phase: "revealed",
    lastGuess: skipped ? "" : guess,
    lastCorrect: skipped ? null : correct,
    lastSkipped: skipped,
    streak: correct ? state.streak + 1 : 0,
  };
  return { state: next, correct, matchedWine: match, isNewConfusion, confusion: confusionRecord };
}
