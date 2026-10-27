import { describe, expect, it } from "vitest";
import { initialTimerState, reconcile, remainingMs, transition } from "./timer";
import type { TimerSettings } from "./types";

const settings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartNext: false,
};

describe("timer domain", () => {
  it("starts a focus phase from an absolute target timestamp", () => {
    const result = transition(
      initialTimerState(),
      { type: "start", nowMs: 1_000 },
      settings,
    );

    expect(result.state.runState).toBe("running");
    expect(result.state.startedAt).toBe(1_000);
    expect(result.state.targetAt).toBe(1_501_000);
    expect(result.effects).toEqual([{ kind: "persist" }]);
  });

  it("pauses and resumes with the remaining duration", () => {
    const running = transition(
      initialTimerState(),
      { type: "start", nowMs: 1_000 },
      settings,
    ).state;
    const paused = transition(
      running,
      { type: "pause", nowMs: 61_000 },
      settings,
    ).state;

    expect(paused.pausedRemainingMs).toBe(1_440_000);
    expect(remainingMs(paused, 999_999)).toBe(1_440_000);

    const resumed = transition(
      paused,
      { type: "resume", nowMs: 100_000 },
      settings,
    ).state;
    expect(resumed.targetAt).toBe(1_540_000);
    expect(remainingMs(resumed, 110_000)).toBe(1_430_000);
  });

  it("moves to a long break after the fourth completed focus", () => {
    const fourth = {
      ...initialTimerState(),
      runState: "running" as const,
      startedAt: 1_000,
      targetAt: 2_000,
      completedFocuses: 3,
    };

    const result = reconcile(fourth, 2_001, settings);

    expect(result.state.phase).toBe("longBreak");
    expect(result.state.completedFocuses).toBe(4);
    expect(result.effects).toEqual([
      { kind: "completed", completionKey: "focus:1000", phase: "focus" },
      { kind: "notify", phase: "focus" },
      { kind: "playSound" },
      { kind: "persist" },
    ]);
  });

  it("respects a custom long-break interval", () => {
    const second = {
      ...initialTimerState(),
      runState: "running" as const,
      startedAt: 1_000,
      targetAt: 2_000,
      completedFocuses: 1,
    };

    const result = reconcile(second, 2_000, {
      ...settings,
      longBreakEvery: 2,
    });

    expect(result.state.phase).toBe("longBreak");
  });

  it("returns from a completed break to focus", () => {
    const breakState = {
      ...initialTimerState(),
      phase: "shortBreak" as const,
      runState: "running" as const,
      startedAt: 3_000,
      targetAt: 4_000,
    };

    expect(reconcile(breakState, 4_000, settings).state.phase).toBe("focus");
  });

  it("skips without recording a completed focus", () => {
    const running = transition(
      initialTimerState(),
      { type: "start", nowMs: 1_000 },
      settings,
    ).state;
    const result = transition(
      running,
      { type: "skip", nowMs: 2_000 },
      settings,
    );

    expect(result.state.phase).toBe("shortBreak");
    expect(result.state.completedFocuses).toBe(0);
    expect(result.effects).toEqual([{ kind: "persist" }]);
  });

  it("auto-starts the next phase when enabled", () => {
    const running = {
      ...initialTimerState(),
      runState: "running" as const,
      startedAt: 1_000,
      targetAt: 2_000,
    };
    const result = reconcile(running, 2_000, {
      ...settings,
      autoStartNext: true,
    });

    expect(result.state.phase).toBe("shortBreak");
    expect(result.state.runState).toBe("running");
    expect(result.state.startedAt).toBe(2_000);
    expect(result.state.targetAt).toBe(302_000);
  });

  it("does not complete an already reconciled snapshot twice", () => {
    const expired = {
      ...initialTimerState(),
      runState: "running" as const,
      startedAt: 1_000,
      targetAt: 2_000,
      completionKey: "focus:1000",
    };

    const result = reconcile(expired, 4_000, settings);
    expect(result.effects).toEqual([]);
  });

  it("clamps remaining time at zero", () => {
    const running = {
      ...initialTimerState(),
      runState: "running" as const,
      startedAt: 1_000,
      targetAt: 2_000,
    };
    expect(remainingMs(running, 5_000)).toBe(0);
  });
});
