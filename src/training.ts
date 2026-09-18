import { pickNextWineId } from "./scheduler";
import type {
  AnswerResult, ConfusionRecord, PersistState, QueueEntry, WineInput, WineStat,
} from "./types";
import { emptyStat } from "./types";
import { createWineId } from "./storage";

export function accuracyOf(correct: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

function bumpStat(stats: Record<string, WineStat>, wineId: string, result: AnswerResult) {
  const prev = stats[wineId] ?? emptyStat();
  stats[wineId] = {
    appearances: prev.appearances + 1,
    correct: prev.correct + (result === "correct" ? 1 : 0),
    wrong: prev.wrong + (result === "wrong" ? 1 : 0),
  };
}

function bumpConfusion(records: ConfusionRecord[], actualId: string, pickedId: string) {
  const existing = records.find(
    (record) => record.actualId === actualId && record.pickedId === pickedId,
  );
  if (existing) {
    existing.count += 1;
    existing.lastAt = Date.now();
  } else {
    records.push({ actualId, pickedId, count: 1, lastAt: Date.now() });
  }
}

/** 开始第一道 / 下一道题：把新题以“未作答”推入队列末尾 */
export function startNextQuestion(state: PersistState): PersistState {
  const candidateIds = state.wines.map((wine) => wine.id);
  const nextId = pickNextWineId(candidateIds, state.queue, state.currentWineId);
  if (!nextId) return state;

  const entry: QueueEntry = { wineId: nextId, result: null };
  return {
    ...state,
    queue: [...state.queue, entry],
    currentWineId: nextId,
    currentPickedId: null,
  };
}

/** 提交答案：判分、记录统计与混淆关系（答案随后揭示） */
export function gradeCurrent(state: PersistState, pickedId: string): PersistState {
  const currentId = state.currentWineId;
  if (!currentId || state.currentPickedId !== null) return state;

  const result: AnswerResult = pickedId === currentId ? "correct" : "wrong";

  const queue = state.queue.slice();
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (queue[i].wineId === currentId && queue[i].result === null) {
      queue[i] = { wineId: currentId, result };
      break;
    }
  }

  const stats: Record<string, WineStat> = { ...state.stats };
  Object.keys(stats).forEach((id) => {
    stats[id] = { ...stats[id]! };
  });
  bumpStat(stats, currentId, result);

  const confusion = state.confusion.map((record) => ({ ...record }));
  if (result === "wrong") {
    bumpConfusion(confusion, currentId, pickedId);
  }

  return {
    ...state,
    queue,
    stats,
    confusion,
    currentPickedId: pickedId,
    rounds: state.rounds + 1,
    correctRounds: state.correctRounds + (result === "correct" ? 1 : 0),
  };
}

export function addWine(state: PersistState, input: WineInput): PersistState {
  return {
    ...state,
    wines: [...state.wines, { ...input, id: createWineId() }],
  };
}

export function updateWine(
  state: PersistState,
  wineId: string,
  input: WineInput,
): PersistState {
  return {
    ...state,
    wines: state.wines.map((wine) => (wine.id === wineId ? { ...input, id: wineId } : wine)),
  };
}

export function deleteWine(state: PersistState, wineId: string): PersistState {
  const queue = state.queue.filter((entry) => entry.wineId !== wineId);
  const stats = { ...state.stats };
  delete stats[wineId];
  const confusion = state.confusion.filter(
    (record) => record.actualId !== wineId && record.pickedId !== wineId,
  );
  const rounds = queue.filter((entry) => entry.result !== null).length;
  const correctRounds = queue.filter((entry) => entry.result === "correct").length;
  const currentIsDeleted = state.currentWineId === wineId;

  return {
    ...state,
    wines: state.wines.filter((wine) => wine.id !== wineId),
    queue,
    stats,
    confusion,
    rounds,
    correctRounds,
    currentWineId: currentIsDeleted ? null : state.currentWineId,
    currentPickedId: currentIsDeleted ? null : state.currentPickedId,
  };
}

export function resetProgress(state: PersistState): PersistState {
  return {
    ...state,
    queue: [],
    stats: {},
    confusion: [],
    currentWineId: null,
    currentPickedId: null,
    rounds: 0,
    correctRounds: 0,
  };
}

export function clearLibrary(state: PersistState): PersistState {
  return { ...resetProgress(state), wines: [] };
}
