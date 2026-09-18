import { useEffect, useState } from "react";
import "./styles.css";
import type { PersistState, Wine, WineInput } from "./types";
import { loadState, saveState } from "./storage";
import {
  accuracyOf, addWine, clearLibrary, deleteWine, gradeCurrent,
  resetProgress, startNextQuestion, updateWine,
} from "./training";
import WineForm from "./components/WineForm";
import LibraryList from "./components/LibraryList";
import TrainingView from "./components/TrainingView";

const project = {
  id: "hxwl-08",
  port: 5108,
  title: "葡萄酒盲品训练",
  subtitle: "只凭香气、酸度、单宁与酒体辨认酒款；答错记录混淆，间隔调度强化记忆",
};

export default function App() {
  const [state, setState] = useState<PersistState>(loadState);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setView = (view: PersistState["view"]) => setState((prev) => ({ ...prev, view }));

  const handleSubmitWine = (input: WineInput) => {
    setState((prev) => (
      editingWine ? updateWine(prev, editingWine.id, input) : addWine(prev, input)
    ));
    setEditingWine(null);
  };

  const handleDelete = (wine: Wine) => {
    if (window.confirm(`确定删除「${wine.name}」？相关答题与混淆记录会一并移除。`)) {
      setState((prev) => deleteWine(prev, wine.id));
      if (editingWine?.id === wine.id) setEditingWine(null);
    }
  };

  const handleClearLibrary = () => {
    if (window.confirm("确定清空整个题库？所有进度将一并清除，且不可恢复。")) {
      setState((prev) => clearLibrary(prev));
      setEditingWine(null);
    }
  };

  const handleResetProgress = () => {
    if (window.confirm("确定重置练习进度、正确率与混淆记录？题库保留。")) {
      setState((prev) => resetProgress(prev));
    }
  };

  const answered = state.currentPickedId !== null;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>累计完成</span>
          <strong>{state.rounds} 轮 · 正确率 {accuracyOf(state.correctRounds, state.rounds)}</strong>
          <span>
            题库 {state.wines.length} 款 · 混淆关系 {state.confusion.length} 条
          </span>
        </div>
      </section>

      <nav className="tabs">
        <button
          className={state.view === "library" ? "tab tab-active" : "tab"}
          onClick={() => setView("library")}
        >
          题库管理
        </button>
        <button
          className={state.view === "training" ? "tab tab-active" : "tab"}
          onClick={() => setView("training")}
        >
          开始训练
        </button>
      </nav>

      {state.view === "library" ? (
        <>
          <WineForm
            key={editingWine?.id ?? "new"}
            editingWine={editingWine}
            existingNames={state.wines.map((wine) => wine.name)}
            onSubmit={handleSubmitWine}
            onCancel={() => setEditingWine(null)}
          />
          <LibraryList
            state={state}
            onDelete={handleDelete}
            onEdit={(wine) => setEditingWine(wine)}
            onClearLibrary={handleClearLibrary}
            onResetProgress={handleResetProgress}
          />
        </>
      ) : (
        <TrainingView
          state={state}
          onStart={() => setState((prev) => startNextQuestion(prev))}
          onAnswer={(pickedId) => setState((prev) => gradeCurrent(prev, pickedId))}
          onNext={() => setState((prev) => startNextQuestion(prev))}
        />
      )}

      <p className="rule-foot">
        调度规则：答错（混淆）至少隔 2 题再出现，答对至少隔 5 题；题量不足时放宽间隔，
        优先选择最久未出现的酒款，但当前题绝不紧接重复。题库与进度自动保存在本浏览器。
      </p>
    </main>
  );
}
