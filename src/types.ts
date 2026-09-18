export interface Wine {
  id: string;
  /** 酒款名称，即训练题的答案 */
  name: string;
  region: string;
  variety: string;
  vintage: string;
  aroma: string;
  acidity: string;
  tannin: string;
  body: string;
}

export type WineInput = Omit<Wine, "id">;

export type AnswerResult = "correct" | "wrong";

/** 一次出题记录；队列末尾可能是当前未作答的题（result 为 null） */
export interface QueueEntry {
  wineId: string;
  result: AnswerResult | null;
}

export interface WineStat {
  appearances: number;
  correct: number;
  wrong: number;
}

/** 混淆关系：把 actualId 这款酒误判成了 pickedId */
export interface ConfusionRecord {
  actualId: string;
  pickedId: string;
  count: number;
  lastAt: number;
}

export type View = "library" | "training";

export interface PersistState {
  version: 1;
  wines: Wine[];
  queue: QueueEntry[];
  stats: Record<string, WineStat>;
  confusion: ConfusionRecord[];
  /** 当前正在展示的题；null 表示尚未开始 / 需要开始下一题 */
  currentWineId: string | null;
  /** 本题已选择的答案 id；null 表示未作答 */
  currentPickedId: string | null;
  rounds: number;
  correctRounds: number;
  view: View;
  seeded: boolean;
}

export function emptyStat(): WineStat {
  return { appearances: 0, correct: 0, wrong: 0 };
}
