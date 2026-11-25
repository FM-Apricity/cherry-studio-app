# sub2api 中转站适配版（非官方 fork）

本仓库 fork 自 [CherryHQ/cherry-studio-app](https://github.com/CherryHQ/cherry-studio-app)，主要用于个人使用场景下适配 **sub2api 中转站的 OpenAI Responses 接口**，不是 CherryHQ 的官方发行版。原项目版权与 **AGPL-3.0** 许可证保留不变。

## 本 fork 修改了什么，为什么修改

针对所有会话模式发往第三方中转站的 Responses 请求，包括纯对话、Agent 以及可调用工具的对话：

- **显式发送顶层 `instructions`**：将 Cherry 原本经 SDK 序列化到 `input` 中的文本 `system/developer` 消息移到顶层 `instructions`，并移除对应输入消息，避免重复。包括后续持久化的系统更新。这样做是为了避免 sub2api 在请求缺少 `instructions` 时补入自己的默认 instructions，保持实际发送的系统提示由客户端明确控制。已有的顶层文本 instructions 会保留；遇到无法安全转换的非文本系统内容时不丢弃原内容。
- **`session-id` 请求头 = 当前 Cherry 会话 ID**。
- **`prompt_cache_key` 请求体字段 = 同一会话 ID**。
- **`x-codex-turn-metadata` 请求头**使用最小 JSON：`session_id`、`thread_id`、`turn_id`、`request_kind`。前两项等于当前会话 ID，`request_kind` 为 `turn`；新一轮回复使用新的 `turn_id`，自动重试复用同一轮 ID。

这些会话与轮次参数的目的是让 sub2api 能识别同一会话及重试，支持正确、一致的会话路由与 prompt cache 复用，减少因身份或提示词被改写而破坏缓存命中的机会。

**边界与限制：**

- 不再按纯对话或 Agent 模式筛选；第三方 Responses 请求统一适配，包括工具调用后的续轮。Chat Completions、Anthropic、Gemini 等其他协议保持原行为。
- `openai.com`、`chatgpt.com` 及其子域名不应用此中转适配。
- 这是针对上述 sub2api 行为的客户端适配意图，不是对所有 sub2api 版本/配置的服务端行为保证。是否采用这些字段路由、是否补入 instructions、是否命中缓存，仍取决于中转版本、账号池、路由配置及上游缓存条件；请用服务端日志和实际 cached token 用量验证。

---

<p align="center">
  <img src="assets/cherry-studio-logo.png" width="100" height="100" alt="Cherry Studio logo" />
</p>

<h1 align="center">Cherry Studio Mobile</h1>

<p align="center">
  <strong>Your AI workspace on iOS and Android.</strong><br />
  Chat with your favorite models, connect your tools, and turn ideas into images.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="docs/guides/development.md">Development</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="https://github.com/CherryHQ/cherry-studio-app/issues/new/choose">Feedback</a> ·
  <a href="https://github.com/CherryHQ/cherry-studio">Desktop</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/iOS_%7C_Android-18181B?style=flat" alt="Platforms: iOS and Android" />
  <img src="https://img.shields.io/badge/status-in_development-F2C94C?style=flat" alt="Status: in development" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-D94F62?style=flat" alt="License: AGPL-3.0" /></a>
</p>

## A Look Inside

<p align="center">
  <a href=".github/images/readme/chat.png"><img src=".github/images/readme/chat.png" width="250" alt="Cherry Studio conversation on iPhone 17 Pro" /></a>
  <a href=".github/images/readme/paintings.png"><img src=".github/images/readme/paintings.png" width="250" alt="Watercolor landscape generated in Cherry Studio on iPhone 17 Pro" /></a>
  <a href=".github/images/readme/plugins.png"><img src=".github/images/readme/plugins.png" width="250" alt="Cherry Studio plugin catalog on iPhone 17 Pro" /></a>
</p>

<p align="center"><sub>Conversations · Image creation · Connected tools<br />Real app screenshots captured on iPhone 17 Pro.</sub></p>

## Features

### 💬 Your Models, One Conversation Space

Connect multiple AI providers, manage your models, and choose the right one for each conversation.
Read streaming responses with Markdown formatting and bring images and text attachments into the
conversation, subject to the selected model's capabilities.

### 🍒 Agents That Work Your Way

Create agents with their own instructions, default models, and tools. Keep separate conversations
for different projects, and review tool actions when approval is required.

### 🔌 Connect Your Tools

Extend your agents with plugins and MCP (Model Context Protocol) servers. Search the web and read
pages with configured search services. Connected tools become available according to their setup,
permissions, and each agent's configuration.

### 🎨 Turn Ideas Into Images

Start from a prompt or a visual template, choose an image model, and create something new. Revisit
your drawing history and use existing images as the starting point for another creation.

### 📎 Keep And Share Your Work

Manage attachments and generated files in the file library. Preview documents and export selected
conversation content as Markdown, HTML, or an image, with available formats depending on the
selection.

### 📱 Made For Mobile, Connected To Cherry

Use light and dark themes, native navigation, and the system share sheet. Pair with Cherry Studio
Desktop to import supported provider configurations and models. Conversation history and remote
agent control are outside the current pairing feature.

Model and connected-service availability depends on your configuration. Some providers require an
account or API key and may charge for usage.

## Development

Built with Expo and React Native. Use **Node.js 24** and **pnpm 12.2.1**.

```bash
pnpm install

# Build and install the development client for one platform:
pnpm ios
# or: pnpm android

# Start Metro for an already installed development client:
pnpm dev
```

The app includes custom native modules and requires a development client. See the
[development guide](docs/guides/development.md) for setup and daily development, and
[Local EAS Builds](docs/guides/local-builds.md) for installation packages and app variants.

## Contributing

Help shape Cherry Mobile through code, bug reports, product ideas, and documentation.

- [Report a bug or suggest a feature](https://github.com/CherryHQ/cherry-studio-app/issues/new/choose)
- Read the [Git workflow](docs/guides/git-workflow.md) and [testing guide](docs/guides/testing-and-ci.md)
  before preparing a pull request.
- Explore the [project documentation](docs/README.md) for architecture and development conventions.

## Community

Cherry Mobile is part of [Cherry Studio](https://github.com/CherryHQ/cherry-studio).

[Official website](https://cherry-ai.com) ·
[Discord](https://discord.gg/wez8HtpxqQ) ·
[Telegram](https://t.me/CherryStudioAI)

## License

[GNU Affero General Public License v3.0](LICENSE).
