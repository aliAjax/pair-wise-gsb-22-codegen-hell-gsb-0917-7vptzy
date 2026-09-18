import type { PersistState, Wine } from "../types";
import { accuracyOf } from "../training";

interface LibraryListProps {
  state: PersistState;
  onDelete: (wine: Wine) => void;
  onEdit: (wine: Wine) => void;
  onClearLibrary: () => void;
  onResetProgress: () => void;
}

export default function LibraryList({
  state, onDelete, onEdit, onClearLibrary, onResetProgress,
}: LibraryListProps) {
  return (
    <section className="panel records">
      <div className="section-heading">
        <div>
          <p>当前题库 · {state.wines.length} 款</p>
          <h2>酒款与练习情况</h2>
        </div>
        <div className="heading-actions">
          <button onClick={onResetProgress} disabled={state.rounds === 0}>
            重置进度
          </button>
          <button className="danger-outline" onClick={onClearLibrary} disabled={state.wines.length === 0}>
            清空题库
          </button>
        </div>
      </div>

      {state.wines.length === 0 ? (
        <p className="empty-hint">
          题库为空。请在上方录入至少两款酒，保存后进入「开始训练」。
        </p>
      ) : (
        <div className="record-list">
          {state.wines.map((wine, index) => {
            const stat = state.stats[wine.id];
            const shown = stat?.appearances ?? 0;
            return (
              <article key={wine.id} className="record-card">
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="record-body">
                  <h3>{wine.name}</h3>
                  <p className="record-meta">
                    {[wine.region, wine.variety, wine.vintage].filter(Boolean).join(" · ")}
                  </p>
                  <p>
                    香气：{wine.aroma} ｜ 酸度 {wine.acidity} · 单宁 {wine.tannin} · 酒体 {wine.body}
                  </p>
                  <p className="record-stat">
                    已练 {shown} 次 · 正确率 {accuracyOf(stat?.correct ?? 0, shown)}
                  </p>
                </div>
                <div className="record-actions">
                  <button onClick={() => onEdit(wine)}>编辑</button>
                  <button className="danger-outline" onClick={() => onDelete(wine)}>删除</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
