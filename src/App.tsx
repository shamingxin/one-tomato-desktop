import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import {
  initialTimerState,
  reconcile,
  remainingMs,
  transition,
} from "./domain/timer";
import type {
  Phase,
  TimerSettings,
  TimerState,
  TransitionResult,
} from "./domain/types";
import {
  announceCompletion,
  playCompletionTone,
} from "./infrastructure/completion";
import { applyTheme, themes, type ThemeId } from "./themes/registry";

const defaultSettings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartNext: false,
};
type View = "focus" | "tasks" | "stats" | "appearance";
interface CompletedSession {
  id: string;
  phase: Phase;
  completedAt: number;
}
const phaseNames = { focus: "专注", shortBreak: "短休息", longBreak: "长休息" };

function formatTime(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function App() {
  const [view, setView] = useState<View>("focus");
  const [timer, setTimer] = useState<TimerState>(() => {
    const saved = window.localStorage.getItem("one-tomato.timer");
    return saved ? (JSON.parse(saved) as TimerState) : initialTimerState();
  });
  const [now, setNow] = useState(() => Date.now());
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const saved = window.localStorage.getItem("one-tomato.settings");
    if (!saved) return defaultSettings;
    try {
      return { ...defaultSettings, ...(JSON.parse(saved) as TimerSettings) };
    } catch {
      return defaultSettings;
    }
  });
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = window.localStorage.getItem(
      "one-tomato.theme",
    ) as ThemeId | null;
    return themes.some((item) => item.id === saved) ? saved! : "iphone-glass";
  });
  const [tasks, setTasks] = useState<string[]>(() => {
    const saved = window.localStorage.getItem("one-tomato.tasks");
    return saved ? (JSON.parse(saved) as string[]) : ["完成今日的设计稿"];
  });
  const [taskDraft, setTaskDraft] = useState("");
  const [sessions, setSessions] = useState<CompletedSession[]>(() => {
    const saved = window.localStorage.getItem("one-tomato.sessions");
    if (!saved) return [];
    try {
      return JSON.parse(saved) as CompletedSession[];
    } catch {
      return [];
    }
  });
  const handledCompletion = useRef<string | null>(null);

  const handleTimerEffects = useCallback(
    (result: TransitionResult, completedAt: number) => {
      const completed = result.effects.find(
        (effect) => effect.kind === "completed",
      );
      if (!completed || handledCompletion.current === completed.completionKey)
        return;
      handledCompletion.current = completed.completionKey;
      setSessions((current) => [
        ...current,
        {
          id: completed.completionKey,
          phase: completed.phase,
          completedAt,
        },
      ]);
      void announceCompletion(completed.phase);
      playCompletionTone();
    },
    [],
  );

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem("one-tomato.theme", theme);
  }, [theme]);
  useEffect(
    () =>
      window.localStorage.setItem("one-tomato.timer", JSON.stringify(timer)),
    [timer],
  );
  useEffect(
    () =>
      window.localStorage.setItem("one-tomato.tasks", JSON.stringify(tasks)),
    [tasks],
  );
  useEffect(
    () =>
      window.localStorage.setItem(
        "one-tomato.settings",
        JSON.stringify(settings),
      ),
    [settings],
  );
  useEffect(
    () =>
      window.localStorage.setItem(
        "one-tomato.sessions",
        JSON.stringify(sessions),
      ),
    [sessions],
  );
  useEffect(() => {
    if (timer.runState !== "running") return;
    const tick = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setTimer((state) => {
        const result = reconcile(state, current, settings);
        handleTimerEffects(result, current);
        return result.state;
      });
    }, 250);
    return () => window.clearInterval(tick);
  }, [handleTimerEffects, settings, timer.runState]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    const unlisten = Promise.all([
      listen("tray://toggle-timer", () =>
        setTimer((state) => {
          const type =
            state.runState === "running"
              ? "pause"
              : state.runState === "paused"
                ? "resume"
                : "start";
          return transition(state, { type, nowMs: Date.now() }, settings).state;
        }),
      ),
      listen("tray://skip", () =>
        setTimer(
          (state) =>
            transition(state, { type: "skip", nowMs: Date.now() }, settings)
              .state,
        ),
      ),
    ]);
    return () => {
      void unlisten.then((callbacks) =>
        callbacks.forEach((callback) => callback()),
      );
    };
  }, [settings]);

  const duration = useMemo(() => {
    if (timer.runState === "idle") {
      const minutes =
        timer.phase === "focus"
          ? settings.focusMinutes
          : timer.phase === "shortBreak"
            ? settings.shortBreakMinutes
            : settings.longBreakMinutes;
      return minutes * 60_000;
    }
    return remainingMs(timer, now);
  }, [now, settings, timer]);

  const weekCounts = useMemo(() => {
    const dayKey = (date: Date) =>
      `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = dayKey(date);
      return sessions.filter(
        (session) =>
          session.phase === "focus" &&
          dayKey(new Date(session.completedAt)) === key,
      ).length;
    });
  }, [sessions]);

  function updateMinutes(
    key: "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes",
    value: string,
  ) {
    const minutes =
      value === "" ? 0 : Math.min(180, Number.parseInt(value, 10));
    setSettings((current) => ({ ...current, [key]: minutes }));
  }

  function normalizeMinutes(
    key: "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes",
  ) {
    setSettings((current) => ({
      ...current,
      [key]: Math.max(1, current[key] || 1),
    }));
  }

  function primaryAction() {
    const type =
      timer.runState === "running"
        ? "pause"
        : timer.runState === "paused"
          ? "resume"
          : "start";
    setTimer(
      (state) => transition(state, { type, nowMs: Date.now() }, settings).state,
    );
    setNow(Date.now());
  }

  const primaryLabel =
    timer.runState === "running"
      ? "暂停"
      : timer.runState === "paused"
        ? "继续"
        : "开始专注";

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="window" aria-label="一颗番茄">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="tomato-mark" aria-hidden="true">
              <i />
            </span>
            <div>
              <h1>一颗番茄</h1>
              <p>One Tomato</p>
            </div>
          </div>
          <span className="island">
            <i />
            {timer.runState === "running" ? formatTime(duration) : "READY"}
          </span>
        </header>

        {view === "focus" && (
          <div className="focus-view">
            <p className="phase-label">{phaseNames[timer.phase]}</p>
            <div className="timer-face" aria-live="polite">
              {formatTime(duration)}
            </div>
            <p className="current-task">{tasks[0] ?? "选一件事，安静做完"}</p>
            <div
              className="session-dots"
              aria-label={`今日已完成 ${timer.completedFocuses} 个番茄`}
            >
              {[0, 1, 2, 3].map((dot) => (
                <i
                  key={dot}
                  className={dot < timer.completedFocuses % 4 ? "done" : ""}
                />
              ))}
            </div>
            <button className="primary-action" onClick={primaryAction}>
              {primaryLabel}
            </button>
            <div className="secondary-actions">
              <button
                onClick={() =>
                  setTimer(
                    (state) =>
                      transition(
                        state,
                        { type: "reset", nowMs: Date.now() },
                        settings,
                      ).state,
                  )
                }
              >
                重置
              </button>
              <button
                onClick={() =>
                  setTimer(
                    (state) =>
                      transition(
                        state,
                        { type: "skip", nowMs: Date.now() },
                        settings,
                      ).state,
                  )
                }
              >
                跳过
              </button>
            </div>
          </div>
        )}

        {view === "tasks" && (
          <div className="panel-view">
            <div className="section-heading">
              <p className="kicker">TODAY</p>
              <h2>今天做什么？</h2>
            </div>
            <form
              className="task-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (taskDraft.trim()) {
                  setTasks((items) => [...items, taskDraft.trim()]);
                  setTaskDraft("");
                }
              }}
            >
              <input
                aria-label="新任务"
                value={taskDraft}
                onChange={(event) => setTaskDraft(event.target.value)}
                placeholder="添加一件小事…"
              />
              <button aria-label="添加任务">+</button>
            </form>
            <ul className="task-list">
              {tasks.map((task, index) => (
                <li key={`${task}-${index}`}>
                  <button className="task-check" aria-label={`完成 ${task}`} />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === "stats" && (
          <div className="panel-view stats-view">
            <div className="section-heading">
              <p className="kicker">THIS WEEK</p>
              <h2>专注有了形状</h2>
            </div>
            <div className="stat-main">
              <strong>
                {sessions.filter((item) => item.phase === "focus").length}
              </strong>
              <span>个番茄</span>
            </div>
            <div className="week-bars" aria-label="近七日专注统计">
              {weekCounts.map((count, index) => (
                <i
                  key={index}
                  title={`${count} 个番茄`}
                  style={
                    {
                      "--bar": `${Math.max(8, (count / Math.max(1, ...weekCounts)) * 100)}%`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <p className="gentle-note">从第一颗番茄开始，不用赶。</p>
          </div>
        )}

        {view === "appearance" && (
          <div className="panel-view appearance-view">
            <div className="section-heading">
              <p className="kicker">APPEARANCE</p>
              <h2>换一种专注的气氛</h2>
            </div>
            <div className="theme-grid">
              {themes.map((item) => (
                <button
                  key={item.id}
                  className={
                    theme === item.id ? "theme-card selected" : "theme-card"
                  }
                  aria-label={item.name}
                  onClick={() => setTheme(item.id)}
                >
                  <span
                    className="theme-swatch"
                    style={{ background: item.color }}
                  >
                    <i />
                  </span>
                  <span>{item.name}</span>
                  <small>{theme === item.id ? "使用中" : "点击切换"}</small>
                </button>
              ))}
            </div>
            <fieldset className="duration-settings">
              <legend>计时时长</legend>
              <label>
                <span>专注</span>
                <input
                  aria-label="专注分钟"
                  type="number"
                  min="1"
                  max="180"
                  value={settings.focusMinutes}
                  onChange={(event) =>
                    updateMinutes("focusMinutes", event.target.value)
                  }
                  onBlur={() => normalizeMinutes("focusMinutes")}
                />
                <small>分钟</small>
              </label>
              <label>
                <span>短休息</span>
                <input
                  aria-label="短休息分钟"
                  type="number"
                  min="1"
                  max="180"
                  value={settings.shortBreakMinutes}
                  onChange={(event) =>
                    updateMinutes("shortBreakMinutes", event.target.value)
                  }
                  onBlur={() => normalizeMinutes("shortBreakMinutes")}
                />
                <small>分钟</small>
              </label>
              <label>
                <span>长休息</span>
                <input
                  aria-label="长休息分钟"
                  type="number"
                  min="1"
                  max="180"
                  value={settings.longBreakMinutes}
                  onChange={(event) =>
                    updateMinutes("longBreakMinutes", event.target.value)
                  }
                  onBlur={() => normalizeMinutes("longBreakMinutes")}
                />
                <small>分钟</small>
              </label>
            </fieldset>
          </div>
        )}

        <nav className="dock" aria-label="主导航">
          <button
            aria-label="专注"
            className={view === "focus" ? "active" : ""}
            onClick={() => setView("focus")}
          >
            <span>◔</span>
            <small>专注</small>
          </button>
          <button
            aria-label="任务"
            className={view === "tasks" ? "active" : ""}
            onClick={() => setView("tasks")}
          >
            <span>✓</span>
            <small>任务</small>
          </button>
          <button
            aria-label="统计"
            className={view === "stats" ? "active" : ""}
            onClick={() => setView("stats")}
          >
            <span>≋</span>
            <small>统计</small>
          </button>
          <button
            aria-label="外观"
            className={view === "appearance" ? "active" : ""}
            onClick={() => setView("appearance")}
          >
            <span>✦</span>
            <small>外观</small>
          </button>
        </nav>
      </section>
    </main>
  );
}

export default App;
