---
summary: "网关服务的操作手册、生命周期和运维指南"
read_when:
  - 运行或调试网关进程时
---
# 网关服务操作手册

最后更新：2025-12-09

## 服务简介
- 持续运行的进程，负责管理单一的 Baileys/Telegram 连接以及控制/事件平面。
- 取代旧版 `gateway` 命令。CLI 入口点：`openclaw-cn gateway`。
- 持续运行直到被停止；在发生致命错误时以非零退出码退出，以便监管程序重启它。

## 如何运行（本地）
```bash
openclaw-cn gateway --port 18789
# 在标准输入输出中显示完整的调试/跟踪日志：
openclaw-cn gateway --port 18789 --verbose
# 如果端口被占用，终止监听者然后启动：
openclaw-cn gateway --force
# 开发循环（在 TS 更改时自动重新加载）：
pnpm gateway:watch
```
- 配置热重载监控 `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）。
  - 默认模式：`gateway.reload.mode="hybrid"`（热应用安全更改，在关键情况下重启）。
  - 热重载在需要时通过 **SIGUSR1** 使用进程内重启。
  - 使用 `gateway.reload.mode="off"` 禁用。
- 将 WebSocket 控制平面绑定到 `127.0.0.1:<port>`（默认 18789）。
- 同一端口也提供 HTTP 服务（控制 UI、钩子、A2UI）。单端口复用。
  - OpenAI 聊天补全（HTTP）：[`/v1/chat/completions`](/gateway/openai-http-api)。
  - OpenResponses（HTTP）：[`/v1/responses`](/gateway/openresponses-http-api)。
  - 工具调用（HTTP）：[`/tools/invoke`](/gateway/tools-invoke-http-api)。
- 默认在 `canvasHost.port` 上启动一个 Canvas 文件服务器（默认 `18793`），从 `~/clawwork/canvas` 提供 `http://<gateway-host>:18793/__clawdbot__/canvas/` 服务。使用 `canvasHost.enabled=false` 或 `OPENCLAW_SKIP_CANVAS_HOST=1` 禁用。
- 记录到标准输出；使用 launchd/systemd 使其保持运行并轮转日志。
- 故障排除时传递 `--verbose` 以将调试日志（握手、请求/响应、事件）从日志文件镜像到标准输入输出。
- `--force` 使用 `lsof` 查找所选端口上的监听者，发送 SIGTERM，记录杀死的内容，然后启动网关（如果缺少 `lsof` 则快速失败）。
- 如果您在监管程序下运行（launchd/systemd/mac 应用子进程模式），停止/重启通常会发送 **SIGTERM**；较旧版本可能会将其显示为 `pnpm` `ELIFECYCLE` 退出码 **143**（SIGTERM），这是正常关闭，不是崩溃。
- **SIGUSR1** 在授权时触发进程内重启（网关工具/配置应用/更新，或启用 `commands.restart` 进行手动重启）。
- 默认需要网关认证：设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）或 `gateway.auth.password`。客户端必须发送 `connect.params.auth.token/password`，除非使用 Tailscale Serve 身份。
- 向导现在默认生成令牌，即使在回环接口上也是如此。
- 端口优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > 默认 `18789`。

## 远程访问
- 优先使用 Tailscale/VPN；否则使用 SSH 隧道：
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- 客户端随后通过隧道连接到 `ws://127.0.0.1:18789`。
- 如果配置了令牌，即使通过隧道，客户端也必须在 `connect.params.auth.token` 中包含它。

## 多网关（同一主机）

通常不需要：一个网关可以服务多个消息通道和代理。仅在需要冗余或严格隔离时使用多个网关（例如：救援机器人）。

如果您隔离状态+配置并使用唯一端口，则支持。完整指南：[多网关](/gateway/multiple-gateways)。

服务名称具有配置文件感知能力：
- macOS: `com.openclaw.<profile>`
- Linux: `clawdbot-gateway-<profile>.service`
- Windows: `Clawdbot Gateway (<profile>)`

安装元数据嵌入在服务配置中：
- `OPENCLAW_SERVICE_MARKER=clawdbot`
- `OPENCLAW_SERVICE_KIND=gateway`
- `OPENCLAW_SERVICE_VERSION=<version>`

救援机器人模式：保持第二个网关隔离，拥有自己的配置文件、状态目录、工作区和基础端口间隔。完整指南：[救援机器人指南](/gateway/multiple-gateways#rescue-bot-guide)。

### 开发配置文件（`--dev`）

快速路径：运行完全隔离的开发实例（配置/状态/工作空间），而不影响您的主要设置。

```bash
openclaw-cn --dev setup
openclaw-cn --dev gateway --allow-unconfigured
# 然后针对开发实例：
openclaw-cn --dev status
openclaw-cn --dev health
```

默认值（可以通过环境变量/标志/配置覆盖）：
- `OPENCLAW_STATE_DIR=~/.openclaw-dev`
- `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
- `OPENCLAW_GATEWAY_PORT=19001` （网关 WS + HTTP）
- `browser.controlUrl=http://127.0.0.1:19003` （派生：`gateway.port+2`）
- `canvasHost.port=19005` （派生：`gateway.port+4`）
- 当您在 `--dev` 下运行 `setup`/`onboard` 时，`agents.defaults.workspace` 默认变为 `~/clawd-dev`。

派生端口（经验法则）：
- 基础端口 = `gateway.port` （或 `OPENCLAW_GATEWAY_PORT` / `--port`）
- `browser.controlUrl 端口 = 基础 + 2` （或 `OPENCLAW_BROWSER_CONTROL_URL` / 配置覆盖）
- `canvasHost.port = 基础 + 4` （或 `OPENCLAW_CANVAS_HOST_PORT` / 配置覆盖）
- 浏览器配置文件 CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配（每个配置文件持久化）。

每个实例的检查清单：
- 独特的 `gateway.port`
- 独特的 `OPENCLAW_CONFIG_PATH`
- 独特的 `OPENCLAW_STATE_DIR`
- 独特的 `agents.defaults.workspace`
- 单独的 WhatsApp 号码（如果使用 WA）

每个配置文件的服务安装：
```bash
openclaw-cn --profile main gateway install
openclaw-cn --profile rescue gateway install
```

示例：
```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw-cn gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw-cn gateway --port 19002
```

## 协议（操作员视图）
- 完整文档：[网关协议](/gateway/protocol) 和 [桥接协议（旧版）](/gateway/bridge-protocol)。
- 客户端的强制第一帧：`req {type:"req", id, method:"connect", params:{minProtocol,maxProtocol,client:{id,displayName?,version,platform,deviceFamily?,modelIdentifier?,mode,instanceId?}, caps, auth?, locale?, userAgent? } }`。
- 网关回复 `res {type:"res", id, ok:true, payload:hello-ok }` （或带错误的 `ok:false`，然后关闭）。
- 握手后：
  - 请求：`{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - 事件：`{type:"event", event, payload, seq?, stateVersion?}`
- 结构化在线状态条目：`{host, ip, version, platform?, deviceFamily?, modelIdentifier?, mode, lastInputSeconds?, ts, reason?, tags?[], instanceId? }` （对于 WS 客户端，`instanceId` 来自 `connect.client.instanceId`）。
- `agent` 响应分为两个阶段：首先是 `res` 确认 `{runId,status:"accepted"}`，然后在运行完成后最终的 `res` `{runId,status:"ok"|"error",summary}`；流式输出作为 `event:"agent"` 到达。

## 方法（初始集）
- `health` — 完整健康快照（与 `openclaw-cn health --json` 格式相同）。
- `status` — 简短摘要。
- `system-presence` — 当前在线状态列表。
- `system-event` — 发布在线状态/系统备注（结构化）。
- `send` — 通过活动通道发送消息。
- `agent` — 运行代理回合（在同一条连接上流式传输事件）。
- `node.list` — 列出已配对+当前已连接的节点（包括 `caps`、`deviceFamily`、`modelIdentifier`、`paired`、`connected` 和已公布的 `commands`）。
- `node.describe` — 描述节点（功能+支持的 `node.invoke` 命令；适用于已配对的节点和当前已连接的未配对节点）。
- `node.invoke` — 在节点上调用命令（例如 `canvas.*`、`camera.*`）。
- `node.pair.*` — 配对生命周期（`request`、`list`、`approve`、`reject`、`verify`）。

另请参阅：[在线状态](/concepts/presence)，了解如何生成/去重在线状态以及为什么稳定的 `client.instanceId` 很重要。

## 事件
- `agent` — 来自代理运行的流式工具/输出事件（带有序列标记）。
- `presence` — 推送到所有已连接客户端的在线状态更新（带有 stateVersion 的增量）。
- `tick` — 定期保活/空操作以确认活跃性。
- `shutdown` — 网关正在退出；负载包括 `reason` 和可选的 `restartExpectedMs`。客户端应该重新连接。

## WebChat 集成
- WebChat 是一个原生的 SwiftUI UI，直接与网关 WebSocket 对话以处理历史记录、发送、中止和事件。
- 远程使用通过相同的 SSH/Tailscale 隧道；如果配置了网关令牌，客户端在 `connect` 期间包含它。
- macOS 应用通过单个 WS（共享连接）连接；它从初始快照中加载在线状态并监听 `presence` 事件以更新 UI。

## 类型定义和验证
- 服务器使用 AJV 验证每个传入帧，依据协议定义生成的 JSON Schema。
- 客户端（TS/Swift）消费生成的类型（TS 直接；Swift 通过仓库的生成器）。
- 协议定义是真实来源；使用以下命令重新生成 schema/模型：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`

## 连接快照
- `hello-ok` 包含一个 `snapshot`，其中包含 `presence`、`health`、`stateVersion` 和 `uptimeMs` 以及 `policy {maxPayload,maxBufferedBytes,tickIntervalMs}`，因此客户端可以立即渲染而无需额外请求。
- `health`/`system-presence` 仍可用于手动刷新，但在连接时不需要。

## 错误代码（res.error 形状）
- 错误使用 `{ code, message, details?, retryable?, retryAfterMs? }`。
- 标准代码：
  - `NOT_LINKED` — WhatsApp 未认证。
  - `AGENT_TIMEOUT` — 代理未在配置的时间限制内响应。
  - `INVALID_REQUEST` — schema/参数验证失败。
  - `UNAVAILABLE` — 网关正在关闭或依赖项不可用。

## 保活行为
- `tick` 事件（或 WS ping/pong）定期发出，这样即使没有流量发生，客户端也知道网关是活跃的。
- 发送/代理确认仍然是单独的响应；不要为发送而过度使用 tick。

## 重播/间隙
- 事件不会重播。客户端检测序列间隙，并应在继续之前刷新（`health` + `system-presence`）。WebChat 和 macOS 客户端现在会在出现间隙时自动刷新。

## 监管（macOS 示例）
- 使用 launchd 使服务保持运行：
  - 程序：`openclaw-cn` 的路径
  - 参数：`gateway`
  - KeepAlive：true
  - StandardOut/Err：文件路径或 `syslog`
- 失败时，launchd 会重启；严重错误配置应持续退出，以便操作员注意到。
- LaunchAgents 是每用户且需要登录会话；对于无头设置，请使用自定义 LaunchDaemon（未随附）。
  - `openclaw-cn gateway install` 写入 `~/Library/LaunchAgents/com.openclaw.gateway.plist`
    （或 `com.openclaw.<profile>.plist`）。
  - `openclaw-cn doctor` 审核 LaunchAgent 配置并可以将其更新为当前默认值。

## 网关服务管理（CLI）

常用命令（新手只需要看这一段）：

- `openclaw-cn gateway install`：安装并启动网关服务（首次使用推荐）
- `openclaw-cn gateway status`：查看服务是否运行，以及 RPC 是否可用
- `openclaw-cn gateway restart`：重启服务（配置变更后常用）
- `openclaw-cn gateway stop`：停止服务
- `openclaw-cn logs --follow`：实时查看网关日志

排查与脚本友好命令（按需使用）：

- `openclaw-cn gateway status --deep`：额外扫描系统服务状态
- `openclaw-cn gateway status --no-probe`：仅查看服务状态，不探测 RPC
- `openclaw-cn gateway status --json`：输出稳定 JSON，便于脚本处理
- `openclaw-cn gateway uninstall`：卸载当前服务
- `openclaw-cn doctor`：修复旧安装或不一致的服务配置

捆绑的 Mac 应用：
- Clawdbot.app 可以捆绑基于 Node 的网关中继并安装每用户 LaunchAgent，标签为
  `com.openclaw.gateway`（或 `com.openclaw.<profile>`）。
- 要干净地停止它，请使用 `openclaw-cn gateway stop`（或 `launchctl bootout gui/$UID/com.openclaw.gateway`）。
- 要重启，请使用 `openclaw-cn gateway restart`（或 `launchctl kickstart -k gui/$UID/com.openclaw.gateway`）。
  - `launchctl` 仅在 LaunchAgent 已安装时才有效；否则请先使用 `openclaw-cn gateway install`。
  - 运行命名配置文件时，将标签替换为 `com.openclaw.<profile>`。

## 监管（systemd 用户单元）
Clawdbot 在 Linux/WSL2 上默认安装 **systemd 用户服务**。我们
推荐单用户机器使用用户服务（更简单的环境，每用户配置）。
对于多用户或常驻服务器，请使用 **系统服务**（不需要持久化
运行，共享监管）。

`openclaw-cn gateway install` 写入用户单元。`openclaw-cn doctor` 审核
单元并可以更新它以匹配当前推荐的默认值。

创建 `~/.config/systemd/user/clawdbot-gateway[-<profile>].service`：
```
[Unit]
Description=Clawdbot Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw-cn gateway --port 18789
Restart=always
RestartSec=5
Environment=OPENCLAW_GATEWAY_TOKEN=
WorkingDirectory=/home/youruser

[Install]
WantedBy=default.target
```
启用持久化（这样用户服务才能在注销/空闲后继续运行）：
```
sudo loginctl enable-linger youruser
```
入职过程在 Linux/WSL2 上运行此命令（可能提示 sudo；写入 `/var/lib/systemd/linger`）。
然后启用服务：
```
systemctl --user enable --now clawdbot-gateway[-<profile>].service
```

**替代方案（系统服务）** - 对于常驻或多人服务器，您可以
安装 systemd **系统** 单元而不是用户单元（不需要持久化运行）。
创建 `/etc/systemd/system/clawdbot-gateway[-<profile>].service`（复制上面的单元，
切换 `WantedBy=multi-user.target`，设置 `User=` + `WorkingDirectory=`），然后：
```
sudo systemctl daemon-reload
sudo systemctl enable --now clawdbot-gateway[-<profile>].service
```

## Windows (WSL2)

Windows 安装应使用 **WSL2** 并遵循上述 Linux systemd 部分。

## 操作检查
- 活跃度：打开 WS 并发送 `req:connect` → 期望 `res` 带有 `payload.type="hello-ok"`（带快照）。
- 准备就绪：调用 `health` → 期望 `ok: true` 和 `linkChannel` 中的链接通道（如适用）。
- 调试：订阅 `tick` 和 `presence` 事件；确保 `status` 显示链接/认证时间；在线状态条目显示网关主机和已连接的客户端。

## 安全保证
- 默认假设每台主机一个网关；如果运行多个配置文件，请隔离端口/状态并定位正确实例。
- 不回退到直接 Baileys 连接；如果网关宕机，发送操作快速失败。
- 非连接的第一帧或格式错误的 JSON 被拒绝，套接字被关闭。
- 优雅关闭：在关闭前发出 `shutdown` 事件；客户端必须处理关闭+重新连接。

## CLI 辅助命令
- `openclaw-cn gateway health|status` — 通过网关 WS 请求健康状况/状态。
- `openclaw-cn message send --target <num> --message "hi" [--media ...]` — 通过网关发送（对 WhatsApp 幂等）。
- `openclaw-cn agent --message "hi" --to <num>` — 运行代理回合（默认等待最终结果）。
- `openclaw-cn gateway call <method> --params '{"k":"v"}'` — 用于调试的原始方法调用器。
- `openclaw-cn gateway stop|restart` — 停止/重启受监管的网关服务（launchd/systemd）。
- 网关辅助子命令假定在 `--url` 上运行的网关；它们不再自动产生一个。

## 迁移指导
- 停止使用 `openclaw-cn gateway` 和旧版 TCP 控制端口。
- 更新客户端以使用带有强制连接和结构化在线状态的 WS 协议。
