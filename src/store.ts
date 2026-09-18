import type { TrainingState, Wine, WineDraft, WineStat } from "./types";

const STORAGE_KEY = "hxwl08-blindtasting-v1";

export function uid(prefix = "w"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（(].*?[)）]/g, "");
}

function seedWine(draft: WineDraft): Wine {
  return { ...draft, id: uid(), createdAt: Date.now() };
}

export function seedState(): TrainingState {
  const wines: Wine[] = [
    seedWine({
      name: "波尔多左岸混酿",
      aliases: "左岸,左岸赤霞珠",
      region: "波尔多",
      grape: "赤霞珠为主",
      vintage: "2018",
      aroma: "黑醋栗、雪松、铅笔芯",
      acidity: "中高",
      tannin: "高",
      body: "饱满",
    }),
    seedWine({
      name: "勃艮第村级黑皮诺",
      aliases: "勃艮第村级,黑皮诺",
      region: "勃艮第",
      grape: "黑皮诺",
      vintage: "2019",
      aroma: "红樱桃、蘑菇、湿叶",
      acidity: "高",
      tannin: "低",
      body: "中等",
    }),
    seedWine({
      name: "里奥哈珍藏",
      aliases: "Rioja Reserva,丹魄",
      region: "里奥哈",
      grape: "丹魄",
      vintage: "2016",
      aroma: "香草、椰子、熟李子",
      acidity: "中",
      tannin: "中",
      body: "中高",
    }),
  ];
  return {
    wines,
    stats: Object.fromEntries(wines.map((w) => [w.id, emptyStat()])),
    confusions: [],
    totalAnswered: 0,
    totalCorrect: 0,
    currentWineId: null,
    phase: "asking",
    lastGuess: "",
    lastCorrect: null,
    lastSkipped: false,
    streak: 0,
  };
}

export function emptyStat(): WineStat {
  return { seen: 0, correct: 0, wrong: 0, lastShown: null, cooldownUntil: null };
}

export function loadState(): TrainingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingState;
      if (parsed && Array.isArray(parsed.wines)) {
        // 修复后续新增酒款缺失的统计项
        for (const wine of parsed.wines) {
          if (!parsed.stats[wine.id]) parsed.stats[wine.id] = emptyStat();
        }
        return parsed;
      }
    }
  } catch {
    /* 数据损坏时回退到初始题库 */
  }
  return seedState();
}

export function saveState(state: TrainingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储空间不足等情况静默处理 */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
