import { useMemo, useState } from "react";
import type { TrainingState, Wine, WineDraft } from "../types";

interface LibraryProps {
  state: TrainingState;
  onSaveWine: (draft: WineDraft) => void;
  onDeleteWine: (id: string) => void;
  onStart: () => { reason: "ok" | "none" | "single"; relaxed: boolean };
  onResetProgress: () => void;
}

const ACIDITY = ["低", "中低", "中", "中高", "高"];
const TANNIN = ["低", "中低", "中", "中高", "高", "几乎无"];
const BODY = ["轻", "中轻", "中等", "中高", "饱满"];

const emptyDraft: WineDraft = {
  name: "",
  aliases: "",
  region: "",
  grape: "",
  vintage: "",
  aroma: "",
  acidity: "中",
  tannin: "中",
  body: "中等",
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} list={`opt-${label}`} onChange={(e) => onChange(e.target.value)} />
      <datalist id={`opt-${label}`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export default function Library({
  state,
  onSaveWine,
  onDeleteWine,
  onStart,
  onResetProgress,
}: LibraryProps) {
  const [draft, setDraft] = useState<WineDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [startHint, setStartHint] = useState("");

  const accuracy =
    state.totalAnswered === 0
      ? "—"
      : `${Math.round((state.totalCorrect / state.totalAnswered) * 100)}%`;

  const confusionInfo = useMemo(() => {
    return state.confusions
      .slice()
      .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
      .map((c) => {
        const correct = state.wines.find((w) => w.id === c.correctWineId);
        const answered =
          c.answeredWineId != null
            ? state.wines.find((w) => w.id === c.answeredWineId)?.name ?? null
            : null;
        return {
          id: c.id,
          from: answered ?? c.answeredText,
          to: correct?.name ?? "（已删除酒款）",
          count: c.count,
        };
      });
  }, [state.confusions, state.wines]);

  const set = (key: keyof WineDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFormError("");
  };

  const save = () => {
    if (!draft.name.trim()) {
      setFormError("酒款名必填——它就是盲品的答案。");
      return;
    }
    onSaveWine({
      ...draft,
      name: draft.name.trim(),
      aliases: draft.aliases.trim(),
      region: draft.region.trim(),
      grape: draft.grape.trim(),
      vintage: draft.vintage.trim(),
      aroma: draft.aroma.trim(),
    });
    setDraft(emptyDraft);
  };

  const start = () => {
    const result = onStart();
    if (result.reason === "none") {
      setStartHint("题库为空，请先录入酒款。");
    } else if (result.reason === "single") {
      setStartHint("只有 1 款酒无法防止当前题紧接重复，建议至少录入 2 款；仍可继续练习。");
    } else {
      setStartHint("");
    }
  };

  return (
    <>
      <section className="metrics-grid">
        <MetricCard label="题库酒款" value={String(state.wines.length)} hint="款" />
        <MetricCard label="累计答题" value={String(state.totalAnswered)} hint="题（含跳过）" />
        <MetricCard label="总正确率" value={accuracy} hint={`答对 ${state.totalCorrect} 题`} />
        <MetricCard label="混淆关系" value={String(state.confusions.length)} hint="对答错文本" />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>训练规则</h2>
          <ul className="rule-list">
            <li>题面只显示香气、酸度、单宁、酒体，答案作答后揭晓。</li>
            <li>答错或跳过：该酒至少<b>隔 2 题</b>再出现。</li>
            <li>答对：该酒至少<b>隔 5 题</b>再出现。</li>
            <li>冷却期内无题可出时放宽冷却，优先选最久未出现的酒。</li>
            <li>当前题永远不会紧接重复。</li>
            <li>题库、进度、正确率与混淆关系保存在本机，刷新不丢失。</li>
          </ul>
          <div className="side-actions">
            <button className="primary-action" onClick={start}>
              开始 / 继续训练
            </button>
            <button
              onClick={() => {
                if (window.confirm("清空全部答题进度、正确率和混淆关系？题库保留。")) {
                  onResetProgress();
                  setStartHint("进度已重置。");
                }
              }}
            >
              重置进度
            </button>
          </div>
          {startHint && <p className="relaxed-note">{startHint}</p>}

          <h2>高频混淆</h2>
          {confusionInfo.length === 0 ? (
            <p className="muted-text">暂无答错记录，开始训练后这里会汇总混淆关系。</p>
          ) : (
            <div className="confusion-list">
              {confusionInfo.slice(0, 8).map((c) => (
                <div key={c.id} className="confusion-row" title={`${c.from} → ${c.to}`}>
                  <span className="confusion-pair">
                    <b>{c.from}</b>
                    <i>→</i>
                    <em>{c.to}</em>
                  </span>
                  <strong>×{c.count}</strong>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>葡萄酒学习</p>
              <h2>录入酒款与答案</h2>
            </div>
          </div>
          <div className="field-grid">
            <label className="field-required">
              <span>酒款名（答案）</span>
              <input
                placeholder="如：波尔多左岸混酿"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              <span>别名（顿号/逗号分隔，任填一个也算对）</span>
              <input
                placeholder="如：左岸、左岸赤霞珠"
                value={draft.aliases}
                onChange={(e) => set("aliases", e.target.value)}
              />
            </label>
            <label>
              <span>产区</span>
              <input
                placeholder="如：波尔多"
                value={draft.region}
                onChange={(e) => set("region", e.target.value)}
              />
            </label>
            <label>
              <span>葡萄品种</span>
              <input
                placeholder="如：赤霞珠"
                value={draft.grape}
                onChange={(e) => set("grape", e.target.value)}
              />
            </label>
            <label>
              <span>年份</span>
              <input
                placeholder="如：2018"
                value={draft.vintage}
                onChange={(e) => set("vintage", e.target.value)}
              />
            </label>
            <label className="field-wide">
              <span>香气关键词（盲品题面，顿号分隔）</span>
              <input
                placeholder="如：黑醋栗、雪松、铅笔芯"
                value={draft.aroma}
                onChange={(e) => set("aroma", e.target.value)}
              />
            </label>
            <SelectField label="酸度" value={draft.acidity} options={ACIDITY} onChange={(v) => set("acidity", v)} />
            <SelectField label="单宁" value={draft.tannin} options={TANNIN} onChange={(v) => set("tannin", v)} />
            <SelectField label="酒体" value={draft.body} options={BODY} onChange={(v) => set("body", v)} />
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button className="primary-action" onClick={save}>
              保存到题库
            </button>
          </div>
        </section>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>题库</p>
            <h2>酒款列表（{state.wines.length}）</h2>
          </div>
        </div>
        {state.wines.length === 0 ? (
          <p className="muted-text">题库为空，请先在上方录入酒款。</p>
        ) : (
          <div className="wine-table" role="table">
            <div className="wine-row wine-head" role="row">
              <span>酒款 / 答案</span>
              <span>产区 · 品种 · 年份</span>
              <span>题面（香气 / 酸度 / 单宁 / 酒体）</span>
              <span>进度</span>
              <span></span>
            </div>
            {state.wines.map((w: Wine) => {
              const s = state.stats[w.id];
              const rate = s && s.seen > 0 ? Math.round((s.correct / s.seen) * 100) : null;
              return (
                <div className="wine-row" role="row" key={w.id}>
                  <span className="wine-name-cell">
                    <b>{w.name}</b>
                    {w.aliases && <small>{w.aliases}</small>}
                  </span>
                  <span className="muted-text">
                    {[w.region, w.grape, w.vintage].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="clue-cell">
                    {w.aroma || "—"}
                    <small>
                      酸度 {w.acidity || "—"} · 单宁 {w.tannin || "—"} · 酒体 {w.body || "—"}
                    </small>
                  </span>
                  <span className="progress-cell">
                    <div className="progress-bar">
                      <i style={{ width: `${rate ?? 0}%` }} />
                    </div>
                    <small>
                      {s?.seen ?? 0} 题 · 正确率 {rate == null ? "—" : `${rate}%`}
                    </small>
                  </span>
                  <span>
                    <button
                      className="delete-btn"
                      onClick={() => {
                        if (window.confirm(`删除酒款「${w.name}」及其统计与混淆记录？`)) {
                          onDeleteWine(w.id);
                        }
                      }}
                    >
                      删除
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
