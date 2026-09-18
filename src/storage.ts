import type { PersistState, Wine } from "./types";

const STORAGE_KEY = "hxwl-08-blind-tasting-v1";

export function createWineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 首次使用时的示例题库，覆盖原型中的三款酒 */
export function seedWines(): Wine[] {
  return [
    {
      id: createWineId(),
      name: "波尔多左岸混酿",
      region: "波尔多 · 梅多克",
      variety: "赤霞珠为主混酿",
      vintage: "2018",
      aroma: "黑醋栗、雪松、铅笔芯",
      acidity: "中高",
      tannin: "高",
      body: "饱满",
    },
    {
      id: createWineId(),
      name: "勃艮第村级黑皮诺",
      region: "勃艮第 · 村级",
      variety: "黑皮诺",
      vintage: "2019",
      aroma: "红樱桃、蘑菇、湿叶",
      acidity: "高",
      tannin: "低",
      body: "中等偏轻",
    },
    {
      id: createWineId(),
      name: "里奥哈珍藏丹魄",
      region: "西班牙 · 里奥哈",
      variety: "丹魄",
      vintage: "2016",
      aroma: "香草、椰子、熟李子",
      acidity: "中",
      tannin: "中高",
      body: "中等偏饱满",
    },
  ];
}

export function freshState(): PersistState {
  return {
    version: 1,
    wines: seedWines(),
    queue: [],
    stats: {},
    confusion: [],
    currentWineId: null,
    currentPickedId: null,
    rounds: 0,
    correctRounds: 0,
    view: "library",
    seeded: true,
  };
}

export function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as PersistState;
    if (parsed.version !== 1 || !Array.isArray(parsed.wines)) {
      return freshState();
    }
    return {
      ...freshState(),
      ...parsed,
      stats: parsed.stats ?? {},
      confusion: parsed.confusion ?? [],
      queue: parsed.queue ?? [],
    };
  } catch {
    return freshState();
  }
}

export function saveState(state: PersistState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默降级，本次会话仍可训练
  }
}
