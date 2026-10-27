# 🍅 One Tomato

A calm, lightweight, themeable, local-first Pomodoro timer for macOS and Windows.

One Tomato lives in your system tray or macOS menu bar. Closing the window does not interrupt an active session, and tasks and history remain on your device.

## Highlights

- Customizable focus, short-break, and long-break phases with pause, resume, skip, and reset
- Tray controls and close-to-hide desktop behavior
- Native completion notifications and a gentle alert tone
- Local tasks, completion history, and a seven-day trend
- iPhone Glass, Warm Paper, Bold Mono, and Dark Zen themes
- No account, advertising, telemetry, or runtime network requirement

## Development

Install Node.js 22+, pnpm 10+, and Rust stable. Run `pnpm install` and `pnpm tauri dev`. Verify with `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `cargo test --manifest-path src-tauri/Cargo.toml`.

## License

[MIT](LICENSE). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

> v0.1.0 is an unsigned preview. macOS and Windows may show an unidentified developer or publisher warning on first launch.
