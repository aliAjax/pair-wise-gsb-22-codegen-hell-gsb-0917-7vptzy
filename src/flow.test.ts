import { freshState } from "./storage";
import {
  addWine, gradeCurrent, startNextQuestion, deleteWine, resetProgress, accuracyOf,
} from "./training";
import type { PersistState } from "./types";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) { failures += 1; console.error("FAIL:", message); }
  else console.log("ok:", message);
}

// 初始：示例题库 3 款
let s: PersistState = freshState();
assert(s.wines.length === 3, "首次加载含 3 款示例酒");
assert(s.currentWineId === null && s.rounds === 0, "初始未开始训练");

// 加一款新酒
s = addWine(s, {
  name: "纳帕赤霞珠", region: "纳帕谷", variety: "赤霞珠", vintage: "2017",
  aroma: "黑莓、薄荷、可可", acidity: "中", tannin: "高", body: "饱满",
});
assert(s.wines.length === 4, "新增后题库为 4 款");

// 模拟 12 轮：每轮开始 -> 固定选错下一款（产生混淆）-> 判分
for (let i = 0; i < 12; i += 1) {
  s = startNextQuestion(s);
  if (!s.currentWineId) throw new Error("应当能出题");
  const currentIndex = s.wines.findIndex((w) => w.id === s.currentWineId);
  const other = s.wines[(currentIndex + 1) % s.wines.length];
  s = gradeCurrent(s, other.id);
}
assert(s.rounds === 12, `完成 12 轮（实际 ${s.rounds}）`);
assert(s.correctRounds === 0, "全部答错，正确数为 0");
assert(s.confusion.length > 0, `记录了混淆关系（${s.confusion.length} 条）`);
assert(s.confusion.every((c) => c.count >= 1 && c.actualId !== c.pickedId), "混淆记录方向为 实际酒 -> 误选酒");

// 未作答的新题不应计入轮次
s = startNextQuestion(s);
assert(s.rounds === 12, "已出题未作答时轮次不增加");
assert(s.queue[s.queue.length - 1].result === null, "队尾是未作答条目");

// 刷新恢复：序列化 -> 反序列化，当前题仍在、答案仍隐藏/已揭示状态保留
const restored = JSON.parse(JSON.stringify(s)) as PersistState;
assert(restored.currentWineId === s.currentWineId, "刷新后当前题保留");
assert(restored.queue.length === s.queue.length, "刷新后出题队列保留");
assert(accuracyOf(restored.correctRounds, restored.rounds) === "0%", "刷新后正确率保留（0%）");
s = restored;

// 答对一轮：正确率更新
const currentId = s.currentWineId!;
s = gradeCurrent(s, currentId);
assert(s.rounds === 13 && s.correctRounds === 1, "答对后轮次 13、正确 1");
assert(accuracyOf(s.correctRounds, s.rounds) === "8%", "正确率 8%（1/13）");

// 该酒统计正确
const stat = s.stats[currentId];
assert(stat && stat.correct + stat.wrong === stat.appearances, "单酒统计自洽");

// 删除一款酒：清掉其统计与相关混淆，轮次重算
const victim = s.wines[0];
const relatedConfusions = s.confusion.filter(
  (c) => c.actualId === victim.id || c.pickedId === victim.id,
).length;
const beforeRounds = s.rounds;
s = deleteWine(s, victim.id);
assert(s.wines.length === 3, "删除后题库 3 款");
assert(s.stats[victim.id] === undefined, "被删酒的统计已移除");
assert(
  s.confusion.every((c) => c.actualId !== victim.id && c.pickedId !== victim.id),
  `被删酒相关的 ${relatedConfusions} 条混淆记录已移除`,
);
assert(s.rounds <= beforeRounds, "删除后轮次按队列重算（不超过原值）");
assert(s.rounds === s.queue.filter((q) => q.result !== null).length, "轮次与已答队列一致");

// 重置进度：题库保留、进度归零
s = resetProgress(s);
assert(s.wines.length === 3 && s.rounds === 0 && s.confusion.length === 0, "重置后题库保留、进度与混淆清空");
assert(s.currentWineId === null, "重置后回到开始界面");

console.log(failures === 0 ? "\n全部流程测试通过" : `\n${failures} 项失败`);
if (failures > 0) throw new Error(`${failures} 项流程测试失败`);
