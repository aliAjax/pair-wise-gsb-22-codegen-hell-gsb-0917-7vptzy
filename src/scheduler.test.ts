import { pickNextWineId, interveningSince, CORRECT_GAP, WRONG_GAP } from "./scheduler";
import type { QueueEntry } from "./types";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error("FAIL:", message);
  } else {
    console.log("ok:", message);
  }
}

const A = "A", B = "B", C = "C", D = "D", E = "E", F = "F", G = "G";
const all = [A, B, C, D, E, F, G];

// 1. 空队列：任意非当前题均可
const q0: QueueEntry[] = [];
assert(pickNextWineId([A], q0, null) === A, "只有一款且未开始，可以出题");
assert(pickNextWineId([A], q0, A) === null, "只有一款且它是当前题，无法避免紧接重复 -> null");
assert(all.includes(pickNextWineId(all, q0, null)!), "首轮从题库任选一款");

// 2. 答错后至少隔 WRONG_GAP 题
let q: QueueEntry[] = [{ wineId: A, result: "wrong" }];
assert(pickNextWineId([A, B], q, A) === B, "A 答错，两款酒时只能选 B");
q = [{ wineId: A, result: "wrong" }, { wineId: B, result: "correct" }, { wineId: C, result: "correct" }];
assert(pickNextWineId([A, B, C], q, C) === A, "A 答错后隔了 2 题，A 可再次出现");

q = [{ wineId: A, result: "wrong" }, { wineId: B, result: "correct" }];
const pick = pickNextWineId([A, B], q, B);
assert(pick === A, `两款酒、A 答错仅隔 1 题，题量不足时放宽间隔选最久未出现的 A（实际 ${pick}）`);

// 3. 答对后至少隔 CORRECT_GAP 题（题库充足时严格遵守）
{
  const queue: QueueEntry[] = [{ wineId: A, result: "correct" }];
  let current: string | null = A;
  for (let i = 1; i <= 5; i += 1) {
    const p = pickNextWineId([A, B, C, D, E, F], queue, current);
    if (i <= CORRECT_GAP) {
      assert(p !== A && p !== null, `答对后第 ${i} 个间隔位不应出现 A（实际 ${p}）`);
    }
    queue.push({ wineId: p!, result: "correct" });
    current = p;
  }
  // A 之后经过 5 题 -> 满足间隔，A 成为最久未出现
  const p = pickNextWineId([A, B, C, D, E, F], queue, current);
  assert(p === A, `隔满 5 题后最久未出现的 A 回归（实际 ${p}）`);
}

// 3b. 只有两款酒时间隔无法满足：允许降级，但两款轮流、绝不紧接重复
{
  const queue: QueueEntry[] = [{ wineId: A, result: "correct" }];
  let current: string | null = A;
  for (let i = 0; i < 6; i += 1) {
    const p = pickNextWineId([A, B], queue, current);
    assert(p !== null && p !== current, `两款酒降级轮换，不紧接重复（第 ${i + 1} 步得到 ${p}）`);
    queue.push({ wineId: p!, result: "correct" });
    current = p;
  }
}

// 4. 间隔未满时选其他合格酒，且优先“已出现酒中”最久未出现的
const q4: QueueEntry[] = [
  { wineId: A, result: "correct" }, // 距末尾 5
  { wineId: B, result: "correct" }, // 距末尾 4
  { wineId: C, result: "wrong" },   // 距末尾 3
  { wineId: D, result: "correct" }, // 距末尾 2
  { wineId: E, result: "correct" }, // 距末尾 1
  { wineId: F, result: "correct" }, // 当前已答，距末尾 0
];
const p4 = pickNextWineId([A, B, C, D, E, F], q4, F);
// A: seen 5 >= 5 合格; C wrong: seen 3 >= 2 合格; 其余正确且 seen<5 不合格。A 最久 -> A
assert(p4 === A, `优先满足间隔且最久未出现的酒（期望 A，实际 ${p4}）`);

// 4b. 从未出现的酒视为“最久未出现”，优先级最高
assert(pickNextWineId(all, q4, F) === G, "从未出现的 G 优先（未出现最久）");

// 5. 全都不满足间隔时：排除当前题，选最久未出现
const q5: QueueEntry[] = [
  { wineId: A, result: "correct" },
  { wineId: B, result: "correct" },
  { wineId: C, result: "correct" },
];
const p5 = pickNextWineId([A, B, C], q5, C);
assert(p5 === A, `三款酒、间隔均不满足时降级选最久未出现的 A（实际 ${p5}）`);
assert(p5 !== C, "降级时当前题仍不紧接重复");

// 6. 当前题永不紧接重复（即使它最久未出现也不选）
const q6: QueueEntry[] = [{ wineId: A, result: "wrong" }];
assert(pickNextWineId(all, q6, A) !== A, "当前题 A 不会紧接重复");

// 7. 未作答的当前题不计入间隔计数
const q7: QueueEntry[] = [
  { wineId: A, result: "wrong" },
  { wineId: B, result: null },
];
assert(interveningSince(A, q7) === 0, "队尾未作答题被排除，A 之后间隔为 0");

// 8. 答错间隔短于答对间隔：同一队列里 wrong 的酒先复活
const q8: QueueEntry[] = [
  { wineId: A, result: "correct" },
  { wineId: B, result: "wrong" },
  { wineId: C, result: "wrong" },
  { wineId: D, result: "correct" },
];
const p8 = pickNextWineId([A, B, C, D], q8, D);
// A seen=3 不足5；B seen=2 >=2 合格；C seen=1 不足2；B 合格且唯一 -> B
assert(p8 === B, `答错的 B 隔 2 题后优先复活（实际 ${p8}）`);

// 9. 模拟完整 200 轮：校验每次选择合法（不紧接重复），并统计间隔违约数
{
  const ids = [A, B, C];
  const queue: QueueEntry[] = [];
  let current: string | null = null;
  let violations = 0;
  for (let round = 0; round < 200; round += 1) {
    const picked = pickNextWineId(ids, queue, current);
    if (picked === null) break;
    if (picked === current) violations += 1;
    // 检查该酒上次出现的间隔
    const seen = interveningSince(picked, queue);
    const prev = [...queue].reverse().find((e) => e.wineId === picked && e.result !== null);
    const need = prev?.result === "correct" ? CORRECT_GAP : prev?.result === "wrong" ? WRONG_GAP : 0;
    // 只有当其它酒能满足时才要求严格；这里统计软违约：题库不足允许放宽
    const othersCanSatisfy = ids.some((id) => id !== picked && interveningSince(id, queue) >=
      (queue.some((e) => e.wineId === id && e.result !== null)
        ? ([...queue].reverse().find((e) => e.wineId === id && e.result !== null)!.result === "correct"
          ? CORRECT_GAP : WRONG_GAP)
        : 0));
    if (seen < need && othersCanSatisfy) violations += 1;
    // 随机判分：1/3 错
    const result = Math.random() < 0.33 ? "wrong" : "correct";
    queue.push({ wineId: picked, result });
    current = picked;
  }
  assert(violations === 0, `200 轮模拟中无紧接重复、且有合格酒时不违反间隔（违约 ${violations}）`);
}

console.log(failures === 0 ? "\n全部调度测试通过" : `\n${failures} 项失败`);
if (failures > 0) throw new Error(`${failures} 项调度测试失败`);
