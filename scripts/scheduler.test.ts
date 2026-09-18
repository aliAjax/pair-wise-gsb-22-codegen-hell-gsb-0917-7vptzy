// 调度与冷却规则验证（tsx 运行）
import { applyAnswer, isCorrectAnswer, pickNextWine } from "../src/engine";
import type { TrainingState, Wine, WineStat } from "../src/types";

function makeWine(i: number): Wine {
  return {
    id: `w${i}`,
    name: `酒${i}`,
    aliases: "",
    region: "",
    grape: "",
    vintage: "",
    aroma: "",
    acidity: "中",
    tannin: "中",
    body: "中等",
    createdAt: i,
  };
}

function freshState(n: number): TrainingState {
  const wines = Array.from({ length: n }, (_, i) => makeWine(i + 1));
  const stats: Record<string, WineStat> = {};
  for (const w of wines) stats[w.id] = { seen: 0, correct: 0, wrong: 0, lastShown: null, cooldownUntil: null };
  return {
    wines,
    stats,
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

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log("✓", msg);
  } else {
    failures++;
    console.error("✗", msg);
  }
}

// --- 1. 当前题永远不紧接重复（小题库 3 款）---
{
  const s = freshState(3);
  const first = pickNextWine(s).wine!;
  s.currentWineId = first.id;
  s.phase = "asking";
  s.totalAnswered = 0;
  // 全部答对：每题冷却到 N+6；3 款酒都在冷却中 -> 放宽，但当前题仍排除
  let cur = first.id;
  const seq = [cur];
  for (let n = 1; n <= 20; n++) {
    const out = applyAnswer(s, "不可能答对的答案");
    Object.assign(s, out.state);
    const picked = pickNextWine(s).wine!;
    assert(picked.id !== cur, `第 ${n} 题后下一题不与当前题重复`);
    s.currentWineId = picked.id;
    s.phase = "asking";
    cur = picked.id;
    seq.push(cur);
  }
  console.log("    序列:", seq.slice(0, 12).join(","), "...");
}

// --- 2. 答错至少隔 2 题（N+3 重现）---
{
  const s = freshState(8);
  const target = s.wines[0];
  s.currentWineId = target.id;
  s.phase = "asking";
  s.totalAnswered = 10; // 当前是第 11 题
  const out = applyAnswer(s, "乱答");
  Object.assign(s, out.state);
  const cd = s.stats[target.id].cooldownUntil!;
  assert(cd === 14, `答错冷却到 N+3 = 14（实际 ${cd}）`);
  // 下一题 round=12、再下一轮 round=13 都不可出现
  const other = s.wines[1];
  s.currentWineId = other.id;
  assert(pickNextWine(s).wine!.id !== target.id, "第 12 题错题不重现（隔 1 题）");
  s.totalAnswered = 12;
  s.currentWineId = s.wines[2].id;
  assert(pickNextWine(s).wine!.id !== target.id, "第 13 题错题不重现（隔 2 题中的间隔）");
  // 第 14 题：cd<=14 且此时 target 是 lastShown=11 最久的
  s.totalAnswered = 13;
  s.currentWineId = s.wines[3].id;
  // 其它酒从未出现，优先从未出现——所以手动给其它酒安排 lastShown
  for (const w of s.wines) {
    if (w.id !== target.id) s.stats[w.id].lastShown = 13;
  }
  assert(pickNextWine(s).wine!.id === target.id, "第 14 题错题可以重现（中间恰好隔 2 题）");
}

// --- 3. 答对至少隔 5 题（N+6 重现）---
{
  const s = freshState(8);
  const target = s.wines[0];
  s.currentWineId = target.id;
  s.phase = "asking";
  s.totalAnswered = 10;
  const out = applyAnswer(s, target.name); // 用酒款名答对
  Object.assign(s, out.state);
  assert(out.correct, "酒款名精确匹配判对");
  const cd = s.stats[target.id].cooldownUntil!;
  assert(cd === 17, `答对冷却到 N+6 = 17（实际 ${cd}）`);
  for (let round = 11; round <= 16; round++) {
    s.totalAnswered = round - 1;
    const othersShown = s.wines.filter((w) => w.id !== target.id);
    s.currentWineId = othersShown[(round - 11) % othersShown.length].id;
    // 给其它候选最近出现时间，使 target 若冷却已过会被优先选到
    for (const w of othersShown) s.stats[w.id].lastShown = round - 1;
    s.stats[target.id].lastShown = 11;
    const picked = pickNextWine(s).wine!.id;
    assert(picked !== target.id, `第 ${round} 题对题不重现（还在 5 题间隔内）`);
  }
  s.totalAnswered = 16;
  s.currentWineId = s.wines[1].id;
  assert(pickNextWine(s).wine!.id === target.id, "第 17 题对题可以重现（中间恰好隔 5 题）");
}

// --- 4. 兜底：全部冷却中时放宽，且选最久未出现 ---
{
  const s = freshState(3);
  s.totalAnswered = 5;
  s.stats["w1"].lastShown = 5;
  s.stats["w2"].lastShown = 3;
  s.stats["w3"].lastShown = 4;
  for (const w of s.wines) s.stats[w.id].cooldownUntil = 99;
  s.currentWineId = "w1"; // 当前题必须排除
  const res = pickNextWine(s);
  assert(res.relaxed === true, "全部冷却中触发放宽");
  assert(res.wine!.id === "w2", "放宽后选最久未出现的 w2（3 < 4，且 w1 为当前题）");
}

// --- 5. 从未出现优先 ---
{
  const s = freshState(3);
  s.totalAnswered = 2;
  s.stats["w1"].lastShown = 1;
  s.stats["w2"].lastShown = 2;
  s.currentWineId = "w2";
  const picked = pickNextWine(s).wine!;
  assert(picked.id === "w3", "优先从未出现的酒款");
}

// --- 6. 只有 1 款酒（作答后无法避重）---
{
  const s = freshState(1);
  s.currentWineId = "w1";
  const res = pickNextWine(s);
  assert(res.reason === "single", "仅 1 款酒且当前题即唯一题，返回 single 提示");
}

// --- 7. 空题库 ---
{
  const s = freshState(0);
  const res = pickNextWine(s);
  assert(res.reason === "none" && res.wine === null, "空题库返回 none");
}

// --- 8. 别名/大小写/空白容错 ---
{
  const w = makeWine(1);
  w.name = "Barolo";
  w.aliases = "巴罗洛, 王者之酒";
  assert(isCorrectAnswer(w, "  barolo "), "忽略大小写与首尾空白");
  assert(isCorrectAnswer(w, "巴罗洛"), "中文别名算对");
  assert(!isCorrectAnswer(w, "巴巴莱斯科"), "无关答案判错");
}

// --- 9. 混淆关系记录与成对累加 ---
{
  const s = freshState(6);
  // w1 答成 w2：记录混淆，撞名题库酒款
  s.currentWineId = "w1";
  s.phase = "asking";
  const out1 = applyAnswer(s, "酒2");
  Object.assign(s, out1.state);
  assert(out1.state.confusions.length === 1, "答错记录 1 条混淆关系");
  assert(out1.state.confusions[0].answeredWineId === "w2", "撞名答案关联到 w2");

  // 用直接安排当前题的方式推进（不依赖调度），再次把 w1 答成 w2
  s.currentWineId = "w1";
  s.phase = "asking";
  const out2 = applyAnswer(s, "酒2");
  Object.assign(s, out2.state);
  const c = s.confusions.find((x) => x.answeredWineId === "w2" && x.correctWineId === "w1");
  assert(!!c && c.count === 2, `相同混淆对累加计数为 2（实际 ${c?.count}）`);

  // 反向 w2 答成 w1 是另一条混淆对
  s.currentWineId = "w2";
  s.phase = "asking";
  const out3 = applyAnswer(s, "酒1");
  Object.assign(s, out3.state);
  const reverse = s.confusions.find((x) => x.answeredWineId === "w1" && x.correctWineId === "w2");
  assert(!!reverse && reverse.count === 1, "反向混淆独立计数");
  assert(s.confusions.length === 2, "两条方向不同的混淆关系并存");
}

// --- 10. 跳过按答错冷却，且不产生混淆记录 ---
{
  const s = freshState(3);
  s.totalAnswered = 4;
  s.currentWineId = "w1";
  s.phase = "asking";
  const out = applyAnswer(s, null);
  Object.assign(s, out.state);
  assert(s.stats["w1"].cooldownUntil === 8, "跳过冷却按错题 N+3");
  assert(s.confusions.length === 0, "跳过不产生混淆关系");
  assert(s.totalCorrect === 0 && s.totalAnswered === 5, "跳过计入答题数但不计正确");
}

console.log(failures === 0 ? "\n全部通过" : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
