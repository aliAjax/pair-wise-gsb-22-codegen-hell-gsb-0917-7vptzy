import { useEffect, useState } from "react";
import "./styles.css";
import Library from "./components/Library";
import Training from "./components/Training";
import { applyAnswer, pickNextWine } from "./engine";
import { emptyStat, loadState, saveState } from "./store";
import type { TrainingState, WineDraft } from "./types";

type View = "library" | "training";

function App() {
  const [state, setState] = useState<TrainingState>(loadState);
  const [view, setView] = useState<View>("library");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const saveWine = (draft: WineDraft) => {
    const id = `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setState((s) => ({
      ...s,
      wines: [...s.wines, { ...draft, id, createdAt: Date.now() }],
      stats: { ...s.stats, [id]: emptyStat() },
    }));
  };

  const deleteWine = (id: string) => {
    setState((s) => {
      const { [id]: _removed, ...stats } = s.stats;
      return {
        ...s,
        wines: s.wines.filter((w) => w.id !== id),
        stats,
        confusions: s.confusions.filter(
          (c) => c.correctWineId !== id && c.answeredWineId !== id
        ),
        currentWineId: s.currentWineId === id ? null : s.currentWineId,
        phase: s.currentWineId === id ? "asking" : s.phase,
        lastGuess: s.currentWineId === id ? "" : s.lastGuess,
        lastCorrect: s.currentWineId === id ? null : s.lastCorrect,
        lastSkipped: s.currentWineId === id ? false : s.lastSkipped,
      };
    });
  };

  const startTraining = () => {
    let result: PickResultLike = { wine: null, reason: "none", relaxed: false };
    setState((s) => {
      // 进行中的题直接继续
      if (s.phase === "asking" && s.currentWineId && s.wines.some((w) => w.id === s.currentWineId)) {
        result = { wine: s.wines.find((w) => w.id === s.currentWineId)!, reason: "ok", relaxed: false };
        return s;
      }
      const picked = pickNextWine(s);
      result = picked;
      if (!picked.wine) return s;
      return {
        ...s,
        currentWineId: picked.wine.id,
        phase: "asking",
        lastGuess: "",
        lastCorrect: null,
        lastSkipped: false,
      };
    });
    setView("training");
    return result;
  };

  const nextQuestion = () => {
    let result: PickResultLike = { wine: null, reason: "none", relaxed: false };
    setState((s) => {
      const picked = pickNextWine(s);
      result = picked;
      if (!picked.wine) {
        return { ...s, currentWineId: null, phase: "asking" };
      }
      return {
        ...s,
        currentWineId: picked.wine.id,
        phase: "asking",
        lastGuess: "",
        lastCorrect: null,
        lastSkipped: false,
      };
    });
    return result;
  };

  const submitAnswer = (guess: string | null) => {
    let info = {
      isNewConfusion: false,
      matchedWine: null as null | (typeof state.wines)[number],
      confusionCount: 0,
    };
    setState((s) => {
      const outcome = applyAnswer(s, guess);
      info = {
        isNewConfusion: outcome.isNewConfusion,
        matchedWine: outcome.matchedWine,
        confusionCount: outcome.confusion?.count ?? 0,
      };
      return outcome.state;
    });
    return info;
  };

  const resetProgress = () => {
    setState((s) => ({
      ...s,
      stats: Object.fromEntries(s.wines.map((w) => [w.id, emptyStat()])),
      confusions: [],
      totalAnswered: 0,
      totalCorrect: 0,
      currentWineId: null,
      phase: "asking",
      lastGuess: "",
      lastCorrect: null,
      lastSkipped: false,
      streak: 0,
    }));
  };

  const inProgress = state.phase === "asking" && state.currentWineId;

  return (
    <main className="app-shell">
      <section className="hero slim">
        <div>
          <p className="eyebrow">hxwl-08 · 葡萄酒盲品训练</p>
          <h1>葡萄酒盲品训练</h1>
          <p className="subtitle">
            依据香气、酸度、单宁和酒体辨认酒款；错题隔 2 题重现、对题隔 5 题，进度自动保存在本机。
          </p>
        </div>
        <nav className="view-tabs">
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>
            题库
          </button>
          <button
            className={view === "training" ? "active" : ""}
            onClick={() => {
              if (view !== "training") startTraining();
            }}
          >
            {inProgress ? "继续训练" : "开始训练"}
          </button>
        </nav>
      </section>

      {view === "library" ? (
        <Library
          state={state}
          onSaveWine={saveWine}
          onDeleteWine={deleteWine}
          onStart={startTraining}
          onResetProgress={resetProgress}
        />
      ) : (
        <Training
          state={state}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
          onExit={() => setView("library")}
        />
      )}
    </main>
  );
}

interface PickResultLike {
  wine: { id: string } | null;
  reason: "ok" | "none" | "single";
  relaxed: boolean;
}

export default App;
