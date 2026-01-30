---
summary: "OpenClaw 代理工具界面（浏览器、画布、节点、消息、定时任务），取代旧的 `clawdbot-*` 技能"
read_when:
  - 添加或修改代理工具时
  - 停用或更改 `clawdbot-*` 技能时
---

# 工具 (OpenClaw)

OpenClaw 为浏览器、画布、节点和定时任务提供**一流代理工具**。
这些工具取代了旧的 `clawdbot-*` 技能：工具具有类型定义，无需外壳执行，
代理应直接依赖它们。

## 禁用工具

您可以通过 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全局允许/拒绝工具
（拒绝优先）。这可防止不允许的工具被发送到模型提供商。

```json5
{
  tools: { deny: ["browser"] }
}
```

注意事项：
- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 表示所有工具）。
- 如果 `tools.allow` 仅引用未知或未加载的插件工具名称，OpenClaw 会记录警告并忽略白名单，以便核心工具保持可用。

## 工具配置文件（基本白名单）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置**基本工具白名单**。
每代理覆盖：`agents.list[].tools.profile`。

配置文件：
- `minimal`：仅 `session_status`
- `coding`：`group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging`：`group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full`：无限制（与未设置相同）

示例（默认仅消息传递，也允许 Slack + Discord 工具）：
```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

示例（编码配置文件，但在各处拒绝 exec/process）：
```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

示例（全局编码配置文件，仅消息传递支持代理）：
```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] }
      }
    ]
  }
}
```

## 特定提供商工具策略

使用 `tools.byProvider` 在不更改全局默认值的情况下，为特定提供商
（或单个 `provider/model`）**进一步限制**工具。
每代理覆盖：`agents.list[].tools.byProvider`。

这在基本工具配置文件**之后**和允许/拒绝列表**之前**应用，
因此它只能缩小工具集。
提供商键接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

示例（保持全局编码配置文件，但 Google Antigravity 使用最少工具）：
```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

示例（针对不稳定端点的提供商/模型特定白名单）：
```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

示例（针对单个提供商的代理特定覆盖）：
```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] }
          }
        }
      }
    ]
  }
}
```

## 工具组（缩写）

工具策略（全局、代理、沙盒）支持展开为多个工具的 `group:*` 条目。
在 `tools.allow` / `tools.deny` 中使用这些。

可用组：
- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:clawdbot`: 所有内置 OpenClaw 工具（不包括提供商插件）

示例（仅允许文件工具 + 浏览器）：
```json5
{
  tools: {
    allow: ["group:fs", "browser"]
  }
}
```

## 插件 + 工具

插件可以注册超出核心集的**附加工具**（和 CLI 命令）。
有关安装 + 配置，请参见[插件](/plugin)，有关如何将工具使用指导注入提示的信息，请参见[技能](/tools/skills)。
某些插件随工具一起提供自己的技能（例如，语音通话插件）。

可选插件工具：
- [Lobster](/tools/lobster)：带有可恢复审批的类型化工作流运行时（需要在网关主机上安装 Lobster CLI）。
- [LLM 任务](/tools/llm-task)：仅 JSON 的 LLM 步骤，用于结构化工作流输出（可选的模式验证）。

## 工具清单

### `apply_patch`
跨一个或多个文件应用结构化补丁。用于多块编辑。
实验性：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。

### `exec`
在工作区中运行 shell 命令。

核心参数：
- `command`（必需）
- `yieldMs`（超时后自动后台运行，默认 10000）
- `background`（立即后台运行）
- `timeout`（秒；超过此时间杀死进程，默认 1800）
- `elevated`（布尔值；如果提升模式已启用/允许，则在主机上运行；仅在代理沙盒化时改变行为）
- `host`（`sandbox | gateway | node`）
- `security`（`deny | allowlist | full`）
- `ask`（`off | on-miss | always`）
- `node`（用于 `host=node` 的节点 ID/名称）
- 需要真正的 TTY？设置 `pty: true`。

注意事项：
- 后台运行时返回 `status: "running"` 和 `sessionId`。
- 使用 `process` 来轮询/记录/写入/终止/清除后台会话。
- 如果不允许 `process`，`exec` 同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 以及任何 `agents.list[].tools.elevated` 覆盖控制（两者都必须允许）并是 `host=gateway` + `security=full` 的别名。
- `elevated` 仅在代理沙盒化时改变行为（否则无操作）。
- `host=node` 可以定位 macOS 伴侣应用程序或无头节点主机（`clawdbot node run`）。
- 网关/节点审批和白名单：[执行审批](/tools/exec-approvals)。

### `process`
管理后台执行会话。

核心操作：
- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

注意事项：
- `poll` 完成时返回新输出和退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 以获取最后 N 行）。
- `process` 按代理范围划分；其他代理的会话不可见。

### `web_search`
使用 Brave Search API 搜索网络。

核心参数：
- `query`（必需）
- `count`（1–10；默认来自 `tools.web.search.maxResults`）

注意事项：
- 需要 Brave API 密钥（推荐：`clawdbot configure --section web`，或设置 `BRAVE_API_KEY`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应被缓存（默认 15 分钟）。
- 有关设置，请参见[Web 工具](/tools/web)。

### `web_fetch`
从 URL 获取并提取可读内容（HTML → markdown/文本）。

核心参数：
- `url`（必需）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

注意事项：
- 通过 `tools.web.fetch.enabled` 启用。
- 响应被缓存（默认 15 分钟）。
- 对于 JS 密集型网站，首选浏览器工具。
- 有关设置，请参见[Web 工具](/tools/web)。
- 有关可选的反机器人回退，请参见[Firecrawl](/tools/firecrawl)。

### `browser`
控制专用的 clawd 浏览器。

核心操作：
- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot`（aria/ai）
- `screenshot`（返回图像块 + `MEDIA:<path>`）
- `act`（UI 操作：点击/输入/按下/悬停/拖拽/选择/填充/调整大小/等待/评估）
- `navigate`, `console`, `pdf`, `upload`, `dialog`

配置文件管理：
- `profiles` — 列出所有具有状态的浏览器配置文件
- `create-profile` — 创建具有自动分配端口的新配置文件（或 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，从配置中移除（仅本地）
- `reset-profile` — 终止配置文件端口上的孤立进程（仅本地）

常用参数：
- `controlUrl`（从配置中默认）
- `profile`（可选；默认为 `browser.defaultProfile`）
注意事项：
- 需要 `browser.enabled=true`（默认为 `true`；设置 `false` 以禁用）。
- 使用 `browser.controlUrl`，除非显式传递 `controlUrl`。
- 所有操作都接受可选的 `profile` 参数以支持多实例。
- 省略 `profile` 时，使用 `browser.defaultProfile`（默认为 "chrome"）。
- 配置文件名称：仅小写字母数字 + 连字符（最大 64 个字符）。
- 端口范围：18800-18899（最多约 100 个配置文件）。
- 远程配置文件仅支持附加（无启动/停止/重置）。
- 安装 Playwright 时 `snapshot` 默认为 `ai`；使用 `aria` 获取无障碍树。
- `snapshot` 还支持角色快照选项（`interactive`, `compact`, `depth`, `selector`），返回类似 `e12` 的引用。
- `act` 需要来自 `snapshot` 的 `ref`（AI 快照的数字 `12`，或角色快照的 `e12`）；对于罕见的 CSS 选择器需求使用 `evaluate`。
- 默认避免 `act` → `wait`；仅在特殊情况（没有可靠的 UI 状态可等待）下使用。
- `upload` 可选地传递 `ref` 以在准备后自动点击。
- `upload` 还支持 `inputRef`（aria 引用）或 `element`（CSS 选择器）来直接设置 `<input type="file">`。

### `canvas`
驱动节点 Canvas（展示、评估、快照、A2UI）。

核心操作：
- `present`, `hide`, `navigate`, `eval`
- `snapshot`（返回图像块 + `MEDIA:<path>`）
- `a2ui_push`, `a2ui_reset`

注意事项：
- 在底层使用网关 `node.invoke`。
- 如果未提供 `node`，工具会选择默认值（单个连接的节点或本地 mac 节点）。
- A2UI 仅限 v0.8（无 `createSurface`）；CLI 会拒绝带有行错误的 v0.9 JSONL。
- 快速测试：`clawdbot nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`
发现和定位配对节点；发送通知；捕获摄像头/屏幕。

核心操作：
- `status`, `describe`
- `pending`, `approve`, `reject`（配对）
- `notify`（macOS `system.notify`）
- `run`（macOS `system.run`）
- `camera_snap`, `camera_clip`, `screen_record`
- `location_get`

注意事项：
- 摄像头/屏幕命令需要节点应用程序在前台运行。
- 图像返回图像块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>`（mp4）。
- 位置返回 JSON 负载（纬度/经度/精度/时间戳）。
- `run` 参数：`command` argv 数组；可选的 `cwd`, `env`（`KEY=VAL`）, `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`。

示例（`run`）：
```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`
使用配置的图像模型分析图像。

核心参数：
- `image`（必需的路径或 URL）
- `prompt`（可选；默认为 "描述图像。")
- `model`（可选覆盖）
- `maxBytesMb`（可选大小限制）

注意事项：
- 仅在配置了 `agents.defaults.imageModel`（主要或备用）时可用，或者可以从您的默认模型 + 配置的身份验证推断出隐式图像模型时（尽力配对）。
- 直接使用图像模型（独立于主聊天模型）。

### `message`
在 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 间发送消息和频道操作。

核心操作：
- `send`（文本 + 可选媒体；MS Teams 还支持用于自适应卡片的 `card`）
- `poll`（WhatsApp/Discord/MS Teams 投票）
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

注意事项：
- `send` 通过网关路由 WhatsApp；其他频道直接发送。
- `poll` 对 WhatsApp 和 MS Teams 使用网关；Discord 投票直接发送。
- 当消息工具调用绑定到活动聊天会话时，发送受限于该会话的目标，以避免跨上下文泄漏。

### `cron`
管理网关 cron 作业和唤醒。

核心操作：
- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake`（排队系统事件 + 可选的即时心跳）

注意事项：
- `add` 期望一个完整的 cron 作业对象（与 `cron.add` RPC 相同的架构）。
- `update` 使用 `{ id, patch }`。

### `gateway`
重启或对运行中的网关进程应用更新（就地）。

核心操作：
- `restart`（授权 + 发送 `SIGUSR1` 以进行进程内重启；`clawdbot gateway` 就地重启）
- `config.get` / `config.schema`
- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

注意事项：
- 使用 `delayMs`（默认为 2000）以避免中断正在进行的回复。
- `restart` 默认禁用；通过 `commands.restart: true` 启用。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`
列出会话、检查转录历史记录或发送到另一个会话。

核心参数：
- `sessions_list`：`kinds?`, `limit?`, `activeMinutes?`, `messageLimit?`（0 = 无）
- `sessions_history`：`sessionKey`（或 `sessionId`），`limit?`, `includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`），`message`，`timeoutSeconds?`（0 = 即发即忘）
- `sessions_spawn`：`task`，`label?`，`agentId?`，`model?`，`runTimeoutSeconds?`，`cleanup?`
- `session_status`：`sessionKey?`（默认当前；接受 `sessionId`），`model?`（`default` 清除覆盖）

注意事项：
- `main` 是规范的直接聊天键；全局/未知的被隐藏。
- `messageLimit > 0` 获取每个会话的最后 N 条消息（过滤掉工具消息）。
- `sessions_send` 在 `timeoutSeconds > 0` 时等待最终完成。
- 交付/公告在完成后发生，属于尽力而为；`status: "ok"` 确认代理运行完成，而不是公告已送达。
- `sessions_spawn` 启动子代理运行并将公告回复发布回请求者聊天。
- `sessions_spawn` 是非阻塞的，立即返回 `status: "accepted"`。
- `sessions_send` 运行回复往返（回复 `REPLY_SKIP` 以停止；最大回合数通过 `session.agentToAgent.maxPingPongTurns`，0–5）。
- 往返后，目标代理运行**公告步骤**；回复 `ANNOUNCE_SKIP` 以抑制公告。

### `agents_list`
列出当前会话可以使用 `sessions_spawn` 定位的代理 ID。

注意事项：
- 结果受限于每代理白名单（`agents.list[].subagents.allowAgents`）。
- 当配置 `["*"]` 时，工具包含所有配置的代理并标记 `allowAny: true`。

## 参数（通用）

网关支持的工具（`canvas`, `nodes`, `cron`）：
- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（如果启用了身份验证）
- `timeoutMs`

浏览器工具：
- `controlUrl`（从配置中默认）

## 推荐的代理流程

浏览器自动化：
1) `browser` → `status` / `start`
2) `snapshot`（ai 或 aria）
3) `act`（点击/输入/按下）
4) 如需视觉确认，使用 `screenshot`

画布渲染：
1) `canvas` → `present`
2) `a2ui_push`（可选）
3) `snapshot`

节点定位：
1) `nodes` → `status`
2) 在选定的节点上执行 `describe`
3) `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接使用 `system.run`；仅在用户明确同意的情况下使用 `nodes` → `run`。
- 尊重用户对摄像头/屏幕捕获的同意。
- 在调用媒体命令之前使用 `status/describe` 确保权限。

## 工具如何呈现给代理

工具有两个并行渠道暴露：

1) **系统提示文本**：人类可读的列表 + 指导。
2) **工具架构**：发送到模型 API 的结构化函数定义。

这意味着代理可以看到"什么工具存在"和"如何调用它们"。如果一个工具没有出现在系统提示或架构中，模型就无法调用它。
