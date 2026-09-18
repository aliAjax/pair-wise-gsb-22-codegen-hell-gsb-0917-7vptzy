import { useEffect, useRef, useState } from "react";
import type { TrainingState, Wine } from "../types";

interface TrainingProps {
  state: TrainingState;
  onSubmit: (
    guess: string | null
  ) => { isNewConfusion: boolean; matchedWine: Wine | null; confusionCount: number };
  onNext: () => { reason: "ok" | "none" | "single"; relaxed: boolean };
  onExit: () => void;
}

const attributeDots: Record<string, number> = {
  低: 1,
  中低: 2,
  中: 3,
  中高: 4,
  高: 5,
  饱满: 5,
};

function Scale({ label, value }: { label: string; value: string }) {
  const level = attributeDots[value.trim()];
  return (
    <div className="clue">
      <span>{label}</span>
      {level ? (
        <div className="scale" title={value}>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < level ? "on" : ""} />
          ))}
          <b>{value}</b>
        </div>
      ) : (
        <strong>{value || "—"}</strong>
      )}
    </div>
  );
}

export default function Training({ state, onSubmit, onNext, onExit }: TrainingProps) {
  const [guess, setGuess] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    isNew: boolean;
    matched: Wine | null;
    count: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wine = state.wines.find((w) => w.id === state.currentWineId) ?? null;

  useEffect(() => {
    if (state.phase === "asking") {
      setGuess("");
      setFeedback(null);
      inputRef.current?.focus();
    }
  }, [state.phase, state.currentWineId]);

  if (!wine) {
    return (
      <section className="panel empty-panel">
        <h2>题库为空</h2>
        <p>请先回到题库录入至少 2 款酒，再开始训练。</p>
        <button className="primary-action" onClick={onExit}>
          返回题库
        </button>
      </section>
    );
  }

  const accuracy =
    state.totalAnswered === 0
      ? "—"
      : `${Math.round((state.totalCorrect / state.totalAnswered) * 100)}%`;

  const submit = (value: string | null) => {
    if (state.phase !== "asking") return;
    if (value !== null && !value.trim()) return;
    const result = onSubmit(value);
    setFeedback({
      isNew: result.isNewConfusion,
      matched: result.matchedWine,
      count: result.confusionCount,
    });
  };

  const goNext = () => {
    const result = onNext();
    setNotice(null);
    if (result.reason === "single") {
      setNotice("题库中只有这一款酒，当前题无法避免紧接重复，请至少再录入一款酒。");
    } else if (result.reason === "none") {
      setNotice("题库已为空。");
    } else if (result.relaxed) {
      setNotice("题量不足，已放宽冷却：本题为最久未出现的酒款（当前题仍不会紧接重复）。");
    }
  };

  const stat = state.stats[wine.id];
  const wineAccuracy =
    stat && stat.seen > 0 ? `${Math.round((stat.correct / stat.seen) * 100)}%` : "—";

  return (
    <section className="panel training-card">
      <header className="training-top">
        <button className="ghost" onClick={onExit}>
          ← 返回题库
        </button>
        <div className="training-stats">
          <span>第 <b>{state.totalAnswered + 1}</b> 题</span>
          <span>总正确率 <b>{accuracy}</b></span>
          <span>连对 <b>{state.streak}</b></span>
        </div>
      </header>

      <div className="blind-tag">盲品题面 · 答案已隐藏</div>

      <div className="clue-grid">
        <div className="clue clue-wide">
          <span>香气</span>
          <div className="aroma-chips">
            {wine.aroma
              .split(/[、,，;；/／]+/)
              .map((s) => s.trim())
              .filter(Boolean)
              .map((a) => (
                <em key={a}>{a}</em>
              ))}
            {!wine.aroma && <strong>—</strong>}
          </div>
        </div>
        <Scale label="酸度" value={wine.acidity} />
        <Scale label="单宁" value={wine.tannin} />
        <Scale label="酒体" value={wine.body} />
      </div>

      {state.phase === "asking" ? (
        <div className="answer-box">
          <input
            ref={inputRef}
            list="wine-names"
            value={guess}
            placeholder="输入酒款名（或别名）作答，回车提交"
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(guess);
            }}
          />
          <div className="answer-actions">
            <button className="primary-action" onClick={() => submit(guess)}>
              提交答案
            </button>
            <button onClick={() => submit(null)}>跳过 / 不会</button>
          </div>
          <datalist id="wine-names">
            {state.wines.map((w) => (
              <option key={w.id} value={w.name} />
            ))}
          </datalist>
        </div>
      ) : (
        <div className={`reveal ${state.lastCorrect ? "right" : "wrong"}`}>
          <div className="reveal-banner">
            {state.lastSkipped ? (
              <b>已跳过</b>
            ) : state.lastCorrect ? (
              <b>✓ 答对了</b>
            ) : (
              <b>✗ 答错了</b>
            )}
            {!state.lastSkipped && (
              <span>
                你的答案：<q>{state.lastGuess}</q>
                {feedback?.matched ? `（与「${feedback.matched.name}」撞名）` : ""}
              </span>
            )}
          </div>

          <div className="answer-detail">
            <h3>
              {wine.name}
              {wine.aliases && <small>（{wine.aliases}）</small>}
            </h3>
            <p>
              {[wine.region, wine.grape, wine.vintage].filter(Boolean).join(" · ") || "未填写产区/品种/年份"}
            </p>
            <p className="wine-history">
              本款累计出现 {stat?.seen ?? 0} 次 · 正确 {stat?.correct ?? 0} 次 · 正确率 {wineAccuracy}
            </p>
          </div>

          {!state.lastCorrect && !state.lastSkipped && (
            <p className="confusion-note">
              {feedback?.isNew
                ? `已新建混淆关系：${state.lastGuess} → ${wine.name}`
                : `该混淆已累计 ${feedback?.count ?? 1} 次：${state.lastGuess} → ${wine.name}（按错题规则至少隔 2 题再出现）`}
            </p>
          )}
          {state.lastCorrect && (
            <p className="cooldown-note">回答正确，本款至少隔 5 题再出现。</p>
          )}
          {state.lastSkipped && (
            <p className="cooldown-note">跳过按答错处理，本款至少隔 2 题再出现。</p>
          )}

          <div className="answer-actions">
            <button className="primary-action" onClick={goNext}>
              下一题
            </button>
          </div>
          {notice && <p className="relaxed-note">{notice}</p>}
        </div>
      )}

      {state.phase === "asking" && notice && <p className="relaxed-note">{notice}</p>}
    </section>
  );
}
