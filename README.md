# 🍅 一颗番茄 · One Tomato

一款安静、轻量、可换肤的本地番茄钟，适用于 macOS 和 Windows。

One Tomato 常驻在系统托盘或 macOS 菜单栏。关闭窗口不会中断正在进行的专注，所有任务和记录都保存在你的电脑上。

## 特性

- 25 / 5 / 15 分钟默认节奏，可自定义时长，并支持暂停、继续、跳过和重置
- 托盘菜单快速控制，关闭窗口后继续运行
- 完成提醒音与原生系统通知
- 本地任务清单、完成记录和近七日趋势
- iPhone Glass、Warm Paper、Bold Mono 和 Dark Zen 四套主题
- 无账号、无广告、无遥测，日常使用不需要网络

## 开发

需要 Node.js 22+、pnpm 10+ 和 Rust stable。

```bash
pnpm install
pnpm tauri dev
```

验证：`pnpm test && pnpm typecheck && pnpm lint`。Rust 使用 `cargo test --manifest-path src-tauri/Cargo.toml`。

## 隐私与开源

应用不上传任务、计时记录或使用数据。项目使用 [MIT License](LICENSE)，英文说明见 [README.en.md](README.en.md)。

> v0.1.0 是未签名预览版。macOS 首次打开时可能需要在“系统设置 → 隐私与安全性”中确认；Windows 可能显示未知发布者提示。
