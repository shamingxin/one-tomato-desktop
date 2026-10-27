import { describe, expect, it } from "vitest";
import { MemoryRepository } from "./repository";
import { initialTimerState } from "../domain/timer";

describe("repository contract", () => {
  it("orders tasks and preserves the selected task", async () => {
    const repository = new MemoryRepository();
    await repository.saveTask({
      id: "a",
      title: "First",
      completed: false,
      position: 2,
    });
    await repository.saveTask({
      id: "b",
      title: "Second",
      completed: false,
      position: 1,
    });
    const snapshot = { ...initialTimerState(), taskId: "b" };
    await repository.saveSnapshot(snapshot);

    expect((await repository.listTasks()).map((task) => task.id)).toEqual([
      "b",
      "a",
    ]);
    expect(await repository.loadSnapshot()).toEqual(snapshot);
  });

  it("records each completion key only once", async () => {
    const repository = new MemoryRepository();
    const session = {
      id: "session-a",
      completionKey: "focus:1000",
      taskId: null,
      startedAt: 1_000,
      endedAt: 1_501_000,
      durationMs: 1_500_000,
    };

    await repository.completeSession(session);
    await repository.completeSession({ ...session, id: "session-b" });

    expect((await repository.getDailyStats(0, 86_400_000)).sessions).toBe(1);
  });

  it("aggregates focus minutes inside a requested day", async () => {
    const repository = new MemoryRepository();
    await repository.completeSession({
      id: "one",
      completionKey: "focus:one",
      taskId: null,
      startedAt: 1_000,
      endedAt: 1_501_000,
      durationMs: 1_500_000,
    });
    await repository.completeSession({
      id: "outside",
      completionKey: "focus:outside",
      taskId: null,
      startedAt: 90_000_000,
      endedAt: 91_500_000,
      durationMs: 1_500_000,
    });

    expect(await repository.getDailyStats(0, 86_400_000)).toEqual({
      sessions: 1,
      focusMinutes: 25,
    });
  });
});
