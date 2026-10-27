import type {
  Phase,
  TimerEvent,
  TimerSettings,
  TimerState,
  TransitionResult,
} from "./types";

const MINUTE_MS = 60_000;

export function initialTimerState(): TimerState {
  return {
    phase: "focus",
    runState: "idle",
    startedAt: null,
    targetAt: null,
    pausedRemainingMs: null,
    completedFocuses: 0,
    completionKey: null,
    taskId: null,
  };
}

function durationMs(phase: Phase, settings: TimerSettings): number {
  const minutes = {
    focus: settings.focusMinutes,
    shortBreak: settings.shortBreakMinutes,
    longBreak: settings.longBreakMinutes,
  }[phase];
  return minutes * MINUTE_MS;
}

function nextPhase(
  state: TimerState,
  completed: boolean,
  settings: TimerSettings,
): Phase {
  if (state.phase !== "focus") return "focus";
  const count = state.completedFocuses + (completed ? 1 : 0);
  return count > 0 && count % settings.longBreakEvery === 0
    ? "longBreak"
    : "shortBreak";
}

function idleInPhase(
  state: TimerState,
  phase: Phase,
  completedFocuses = state.completedFocuses,
): TimerState {
  return {
    ...state,
    phase,
    runState: "idle",
    startedAt: null,
    targetAt: null,
    pausedRemainingMs: null,
    completedFocuses,
  };
}

export function remainingMs(state: TimerState, nowMs: number): number {
  if (state.runState === "paused") return state.pausedRemainingMs ?? 0;
  if (state.runState !== "running" || state.targetAt === null) {
    return 0;
  }
  return Math.max(0, state.targetAt - nowMs);
}

export function transition(
  state: TimerState,
  event: TimerEvent,
  settings: TimerSettings,
): TransitionResult {
  if (event.type === "selectTask") {
    return {
      state: { ...state, taskId: event.taskId },
      effects: [{ kind: "persist" }],
    };
  }

  if (event.type === "start" && state.runState === "idle") {
    return {
      state: {
        ...state,
        runState: "running",
        startedAt: event.nowMs,
        targetAt: event.nowMs + durationMs(state.phase, settings),
        pausedRemainingMs: null,
        completionKey: null,
      },
      effects: [{ kind: "persist" }],
    };
  }

  if (event.type === "pause" && state.runState === "running") {
    return {
      state: {
        ...state,
        runState: "paused",
        targetAt: null,
        pausedRemainingMs: remainingMs(state, event.nowMs),
      },
      effects: [{ kind: "persist" }],
    };
  }

  if (event.type === "resume" && state.runState === "paused") {
    const remaining =
      state.pausedRemainingMs ?? durationMs(state.phase, settings);
    return {
      state: {
        ...state,
        runState: "running",
        targetAt: event.nowMs + remaining,
        pausedRemainingMs: null,
      },
      effects: [{ kind: "persist" }],
    };
  }

  if (event.type === "skip") {
    return {
      state: idleInPhase(state, nextPhase(state, false, settings)),
      effects: [{ kind: "persist" }],
    };
  }

  if (event.type === "reset") {
    return {
      state: idleInPhase(state, state.phase),
      effects: [{ kind: "persist" }],
    };
  }

  return { state, effects: [] };
}

export function reconcile(
  state: TimerState,
  nowMs: number,
  settings: TimerSettings,
): TransitionResult {
  if (
    state.runState !== "running" ||
    state.targetAt === null ||
    state.startedAt === null ||
    nowMs < state.targetAt
  ) {
    return { state, effects: [] };
  }

  const completionKey = `${state.phase}:${state.startedAt}`;
  if (state.completionKey === completionKey) {
    return { state, effects: [] };
  }

  const completedFocuses =
    state.completedFocuses + (state.phase === "focus" ? 1 : 0);
  const phase = nextPhase(state, true, settings);
  const idleState = {
    ...idleInPhase(state, phase, completedFocuses),
    completionKey,
  };
  const nextState = settings.autoStartNext
    ? {
        ...idleState,
        runState: "running" as const,
        startedAt: nowMs,
        targetAt: nowMs + durationMs(phase, settings),
      }
    : idleState;

  return {
    state: nextState,
    effects: [
      { kind: "completed", completionKey, phase: state.phase },
      { kind: "notify", phase: state.phase },
      { kind: "playSound" },
      { kind: "persist" },
    ],
  };
}
