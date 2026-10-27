export type Phase = "focus" | "shortBreak" | "longBreak";
export type RunState = "idle" | "running" | "paused";

export interface TimerState {
  phase: Phase;
  runState: RunState;
  startedAt: number | null;
  targetAt: number | null;
  pausedRemainingMs: number | null;
  completedFocuses: number;
  completionKey: string | null;
  taskId: string | null;
}

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  autoStartNext: boolean;
}

export type TimerEvent =
  | { type: "start"; nowMs: number }
  | { type: "pause"; nowMs: number }
  | { type: "resume"; nowMs: number }
  | { type: "skip"; nowMs: number }
  | { type: "reset"; nowMs: number }
  | { type: "selectTask"; taskId: string | null };

export type TimerEffect =
  | { kind: "persist" }
  | { kind: "completed"; completionKey: string; phase: Phase }
  | { kind: "notify"; phase: Phase }
  | { kind: "playSound" };

export interface TransitionResult {
  state: TimerState;
  effects: TimerEffect[];
}
