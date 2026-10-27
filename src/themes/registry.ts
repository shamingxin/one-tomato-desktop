export const themes = [
  { id: "iphone-glass", name: "iPhone Glass", color: "#8c96ff" },
  { id: "warm-paper", name: "Warm Paper", color: "#c85f47" },
  { id: "bold-mono", name: "Bold Mono", color: "#c6f43d" },
  { id: "dark-zen", name: "Dark Zen", color: "#a9e7cf" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
