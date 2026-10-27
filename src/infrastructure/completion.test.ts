import { describe, expect, it } from "vitest";
import { completionCopy } from "./completion";

describe("completionCopy", () => {
  it("invites the user to rest after focus", () => {
    expect(completionCopy("focus")).toEqual({
      title: "这一颗番茄完成了",
      body: "做得好，起来走动一下吧。",
    });
  });

  it("invites the user back after a break", () => {
    expect(completionCopy("shortBreak").title).toBe("休息结束");
    expect(completionCopy("longBreak").title).toBe("休息结束");
  });
});
