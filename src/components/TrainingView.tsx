import { useMemo } from "react";
import type { PersistState } from "../types";
import { accuracyOf } from "../training";
import { shuffled } from "../scheduler";

interface TrainingViewProps {
  state: PersistState;
  onAnswer: (pickedId: string) => void;
  onNext: () => void;
  onStart: () => void;
}

const TRAITS = [
  { key: "acidity", label: "酸度" },
  { key: "tannin", label: "单宁" },
  { key: "body", label: "酒体" },
] as const;

export default function TrainingView({ state, onAnswer, onNext, onStart }: TrainingViewProps) {
  const current = state.wines.find((wine) => wine.id === state.currentWineId) ?? null;
  const answered = state.currentPickedId !== null;
  const encounter = (current ? state.stats[current.id]?.appearances ?? 0 : 0) + (answered ? 0 : 1);

  // 选项顺序对每道题固定（依赖当前题 id），避免作答过程中重排
  const options = useMemo(() => {
    if (!current) return state.wines;
    return shuffled(state.wines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, state.wines]);

  const overall = accuracyOf(state.correctRounds, state.rounds);

  if (!current) {
    return (
      <section className="panel start-panel">
        <p className="eyebrow">盲品训练</p>
        <h2>{state.wines.length < 2 ? "题库题量不足" : "准备开始"}</h2>
        {state.wines.length < 2 ? (
          <p className="empty-hint">
            至少录入两款酒才能开始盲品（当前 {state.wines.length} 款），否则同一题会紧接重复。
            请先到「题库」页录入酒款。
          </p>
        ) : (
          <>
            <p className="empty-hint">
              每轮只给出香气、酸度、单宁、酒体四项线索，请在看到答案前选出对应酒款。
              答错会记录混淆关系，该酒至少隔两题再出现；答对后至少隔五题再出现。
            </p>
            <button className="primary-action big-action" onClick={onStart}>
              {state.rounds > 0 ? "继续下一题" : "开始第一题"}
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <div className="training-layout">
      <section className="panel quiz-card">
        <div className="quiz-head">
          <span className="quiz-round">
            第 {encounter} 次接触这款酒 · 已完成 {state.rounds} 轮
          </span>
          <span className="quiz-accuracy">总正确率 {overall}</span>
        </div>

        <div className="trait-grid">
          <div className="trait-card trait-aroma">
            <span>香气</span>
            <strong>{current.aroma}</strong>
          </div>
          {TRAITS.map((trait) => (
            <div key={trait.key} className="trait-card">
              <span>{trait.label}</span>
              <strong>{current[trait.key]}</strong>
            </div>
          ))}
        </div>

        <div className="answer-area">
          <p className="answer-prompt">{answered ? "本题结果" : "这是哪一款酒？请作答"}</p>
          <div className="option-grid">
            {options.map((wine) => {
              const classes = ["option"];
              if (answered) {
                if (wine.id === current.id) classes.push("option-correct");
                if (wine.id === state.currentPickedId && wine.id !== current.id) {
                  classes.push("option-wrong");
                }
                if (wine.id !== current.id && wine.id !== state.currentPickedId) {
                  classes.push("option-dim");
                }
              }
              return (
                <button
                  key={wine.id}
                  className={classes.join(" ")}
                  disabled={answered}
                  onClick={() => onAnswer(wine.id)}
                >
                  {wine.name}
                </button>
              );
            })}
          </div>
        </div>

        {answered ? (
          <div className={`reveal ${state.currentPickedId === current.id ? "reveal-ok" : "reveal-bad"}`}>
            <div className="reveal-verdict">
              <strong>{state.currentPickedId === current.id ? "✓ 答对了" : "✗ 答错了"}</strong>
              {state.currentPickedId !== current.id ? (
                <span>
                  你选了「{state.wines.find((w) => w.id === state.currentPickedId)?.name}」，
                  正确答案是「{current.name}」，已记录为混淆关系。
                </span>
              ) : (
                <span>这款酒至少隔五题之后才会再次出现。</span>
              )}
            </div>
            <div className="reveal-answer">
              <h3>{current.name}</h3>
              <p>
                {[current.region, current.variety, current.vintage].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button className="primary-action" onClick={onNext}>下一题</button>
          </div>
        ) : null}
      </section>

      <ConfusionPanel state={state} />
    </div>
  );
}

function ConfusionPanel({ state }: { state: PersistState }) {
  const wineName = (id: string) => state.wines.find((wine) => wine.id === id)?.name ?? "（已删除酒款）";
  const records = state.confusion
    .filter((record) => state.wines.some((wine) => wine.id === record.actualId))
    .slice()
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);

  return (
    <aside className="panel narrow confusion-panel">
      <h2>易混淆关系</h2>
      <p className="panel-note">答错记录，相关酒款会提前（间隔 2 题）重新出现</p>
      {records.length === 0 ? (
        <p className="empty-hint">还没有答错记录。</p>
      ) : (
        <ul className="confusion-list">
          {records.map((record) => (
            <li key={`${record.actualId}-${record.pickedId}`}>
              <span className="confusion-pair">
                把<b>{wineName(record.actualId)}</b>误判成<b>{wineName(record.pickedId)}</b>
              </span>
              <span className="confusion-count">×{record.count}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
