import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import App from "./App";

it("renders the bilingual product identity", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "一颗番茄" })).toBeVisible();
  expect(screen.getByText("One Tomato")).toBeVisible();
});

it("starts and pauses a focus session", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "开始专注" }));
  expect(screen.getByRole("button", { name: "暂停" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "暂停" }));
  expect(screen.getByRole("button", { name: "继续" })).toBeVisible();
});

it("switches among the four visual themes", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "外观" }));
  await user.click(screen.getByRole("button", { name: "Warm Paper" }));

  expect(document.documentElement.dataset.theme).toBe("warm-paper");
  expect(window.localStorage.getItem("one-tomato.theme")).toBe("warm-paper");
  expect(
    screen.getAllByRole("button", {
      name: /iPhone Glass|Warm Paper|Bold Mono|Dark Zen/,
    }),
  ).toHaveLength(4);
});

it("uses a custom focus duration", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "外观" }));
  const input = screen.getByRole("spinbutton", { name: "专注分钟" });
  await user.clear(input);
  await user.type(input, "30");
  await user.click(screen.getByRole("button", { name: "专注" }));
  expect(screen.getByText("30:00")).toBeVisible();
});
