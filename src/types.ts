export interface Wine {
  id: string;
  name: string;
  aliases: string;
  region: string;
  grape: string;
  vintage: string;
  aroma: string;
  acidity: string;
  tannin: string;
  body: string;
  createdAt: number;
}

export type WineDraft = Omit<Wine, "id" | "createdAt">;

export interface WineStat {
  seen: number;
  correct: number;
  wrong: number;
  /** 最近一次出现的题号（1 起），null 表示从未出现 */
  lastShown: number | null;
  /** 最早可再次出现的题号；答错 N+3（隔 2 题），答对 N+6（隔 5 题） */
  cooldownUntil: number | null;
}

export interface Confusion {
  id: string;
  /** 去重键：命中题库酒款时为该酒 id，否则为 text:<归一化文本> */
  uid: string;
  answeredText: string;
  answeredWineId: string | null;
  correctWineId: string;
  count: number;
  lastAt: number;
}

export interface TrainingState {
  wines: Wine[];
  stats: Record<string, WineStat>;
  confusions: Confusion[];
  totalAnswered: number;
  totalCorrect: number;
  currentWineId: string | null;
  phase: "asking" | "revealed";
  lastGuess: string;
  lastCorrect: boolean | null;
  lastSkipped: boolean;
  streak: number;
}
