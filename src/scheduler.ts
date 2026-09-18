import type { QueueEntry } from "./types";

/** 答错（混淆）后至少隔两题再出现 */
export const WRONG_GAP = 2;
/** 答对后至少隔五题再出现 */
export const CORRECT_GAP = 5;

/**
 * 计算自该酒款上一次出现之后，已经经过的“其它题目”数量。
 * 队列末尾若为未作答的当前题，则排除在计数之外。
 */
export function interveningSince(wineId: string, queue: QueueEntry[]): number {
  const answered = queue.filter((entry) => entry.result !== null);
  for (let i = answered.length - 1; i >= 0; i -= 1) {
    if (answered[i].wineId === wineId) {
      return answered.length - 1 - i;
    }
  }
  return Number.POSITIVE_INFINITY;
}

/** 该酒款上一次作答结果，决定它所需的间隔；未出现过则无约束 */
export function lastResult(wineId: string, queue: QueueEntry[]): "correct" | "wrong" | null {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const entry = queue[i];
    if (entry.wineId === wineId && entry.result !== null) {
      return entry.result;
    }
  }
  return null;
}

export function requiredGap(wineId: string, queue: QueueEntry[]): number {
  return lastResult(wineId, queue) === "correct" ? CORRECT_GAP : WRONG_GAP;
}

/** Fisher–Yates 洗牌，用于在“最久未出现”并列时随机选取 */
export function shuffled<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 选择下一题：
 * 1. 永不紧接重复当前题；
 * 2. 优先满足间隔约束（答错隔 2 题、答对隔 5 题）的酒款；
 * 3. 满足约束时优先“未出现最久”的酒款；
 * 4. 题库不足、约束无法全部满足时，放宽约束仍优先最久未出现的酒款；
 * 5. 仅一款酒时返回 null（无法避免紧接重复）。
 */
export function pickNextWineId(
  candidates: string[],
  queue: QueueEntry[],
  currentWineId: string | null,
): string | null {
  const pool = candidates.filter((id) => id !== currentWineId);
  if (pool.length === 0) return null;

  const ranked = shuffled(pool)
    .map((id) => ({ id, seen: interveningSince(id, queue), gap: requiredGap(id, queue) }))
    .sort((a, b) => b.seen - a.seen);

  const eligible = ranked.filter((item) => item.seen >= item.gap);
  if (eligible.length > 0) return eligible[0].id;

  // 题量不足：放宽间隔，但仍排除当前题并优先最久未出现
  return ranked[0].id;
}
