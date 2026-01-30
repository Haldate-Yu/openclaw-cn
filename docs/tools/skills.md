---
summary: "技能：托管与工作区、门控规则和配置/环境配置"
read_when:
  - 添加或修改技能时
  - 更改技能门控或加载规则时
---
# 技能 (OpenClaw)

OpenClaw 使用 **[AgentSkills](https://agentskills.io)-兼容** 的技能文件夹来教导代理如何使用工具。每个技能都是一个目录，其中包含带有 YAML 前置内容和说明的 `SKILL.md` 文件。OpenClaw 加载**捆绑技能**以及可选的本地覆盖，并在加载时基于环境、配置和二进制文件的存在情况进行过滤。

## 位置和优先级

技能从**三个**地方加载：

1) **捆绑技能**：随安装包一起发布（npm 包或 OpenClaw.app）
2) **托管/本地技能**：`~/.openclaw/skills`
3) **工作区技能**：`<workspace>/skills`

如果技能名称冲突，优先级为：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → 捆绑技能（最低）

此外，您可以通过 `~/.openclaw/openclaw.json` 中的
`skills.load.extraDirs` 配置额外的技能文件夹（最低优先级）。

## 每代理与共享技能

在**多代理**设置中，每个代理都有自己的工作区。这意味着：

- **每代理技能** 存在于 `<workspace>/skills` 中，仅供该代理使用。
- **共享技能** 存在于 `~/.openclaw/skills`（托管/本地）中，并对
  同一台机器上的**所有代理**可见。
- 如果您希望多个代理使用通用技能包，也可以通过 `skills.load.extraDirs` 添加
  **共享文件夹**（最低优先级）。

如果相同的技能名称存在于多个位置，则应用通常的优先级
规则：工作区优先，然后是托管/本地，最后是捆绑技能。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来附带他们自己的技能
（路径相对于插件根目录）。当插件启用时，插件技能加载
并参与正常的技能优先级规则。
您可以通过插件配置条目中的 `metadata.openclaw.requires.config` 来控制它们。
有关发现/配置，请参阅[插件](/plugin)，有关这些技能教授的
工具界面，请参阅[工具](/tools)。

## ClawdHub（安装 + 同步）

ClawdHub 是 OpenClaw 的公共技能注册表。浏览地址为
https://clawdhub.com。使用它来发现、安装、更新和备份技能。
完整指南：[ClawdHub](/tools/clawdhub)。

常见流程：

- 将技能安装到您的工作区：
  - `clawdhub install <skill-slug>`
- 更新所有已安装的技能：
  - `clawdhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawdhub sync --all`

默认情况下，`clawdhub` 安装到当前工作目录下的 `./skills`
（或者回退到配置的 OpenClaw 工作区）。OpenClaw 在下一个会话中
将其视为 `<workspace>/skills`。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: nano-banana-pro
description: 通过 Gemini 3 Pro 图像生成或编辑图像
---
```

注意事项：
- 我们遵循 AgentSkills 规范进行布局/意图。
- 嵌入代理使用的解析器仅支持**单行**前置内容键。
- `metadata` 应该是**单行 JSON 对象**。
- 在说明中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选的前置内容键：
  - `homepage` — 在 macOS 技能 UI 中显示为"网站"的 URL（也通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认：`true`）。当为 `true` 时，技能作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认：`false`）。当为 `true` 时，技能从模型提示中排除（仍可通过用户调用获得）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令绕过模型并直接分派到工具。
  - `command-tool` — 当设置了 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具分派，将原始参数字符串转发到工具（无核心解析）。

    工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 门控（加载时过滤器）

OpenClaw 使用 `metadata`（单行 JSON）在**加载时过滤技能**：

```markdown
---
name: nano-banana-pro
description: 通过 Gemini 3 Pro 图像生成或编辑图像
metadata: {"openclaw":{"requires":{"bins":["uv"],"env":["GEMINI_API_KEY"],"config":["browser.enabled"]},"primaryEnv":"GEMINI_API_KEY"}}
---
```

`metadata.openclaw` 下的字段：
- `always: true` — 始终包含技能（跳过其他门控）。
- `emoji` — macOS 技能 UI 使用的可选表情符号。
- `homepage` — 在 macOS 技能 UI 中显示为"网站"的可选 URL。
- `os` — 可选平台列表（`darwin`、`linux`、`win32`）。如果设置，则技能仅在这些操作系统上有效。
- `requires.bins` — 列表；每个都必须存在于 `PATH` 中。
- `requires.anyBins` — 列表；至少有一个必须存在于 `PATH` 中。
- `requires.env` — 列表；环境变量必须存在 **或** 在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — macOS 技能 UI 使用的安装程序规格的可选数组（brew/node/go/uv/download）。

关于沙盒的说明：
- `requires.bins` 在技能加载时在**主机**上检查。
- 如果代理处于沙盒中，则二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。
  `setupCommand` 在容器创建后运行一次。
  包安装还需要沙盒中的网络出口、可写的根文件系统和根用户。
  示例：`summarize` 技能（`skills/summarize/SKILL.md`）需要 `summarize` CLI
  在沙盒容器中才能在那里运行。

安装程序示例：

```markdown
---
name: gemini
description: 使用 Gemini CLI 进行编码协助和 Google 搜索查询。
metadata: {"openclaw":{"emoji":"♊️","requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"],"label":"安装 Gemini CLI (brew)"}]}}
---
```

注意事项：
- 如果列出了多个安装程序，网关会选择一个**单一**的首选选项（可用时选择 brew，否则选择 node）。
- 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，这样您可以看到可用的构件。
- 安装程序规格可以包括 `os: ["darwin"|"linux"|"win32"]` 来按平台筛选选项。
- Node 安装遵守 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响**技能安装**；网关运行时仍应为 Node
  （不推荐将 Bun 用于 WhatsApp/Telegram）。
- Go 安装：如果缺少 `go` 且 `brew` 可用，网关首先通过 Homebrew 安装 Go，并在可能的情况下将 `GOBIN` 设置为 Homebrew 的 `bin`。
 - 下载安装：`url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到存档时自动提取）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则技能始终符合条件（除非
在配置中被禁用或被 `skills.allowBundled` 阻止用于捆绑技能）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

捆绑/托管技能可以被切换并提供环境值：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

注意：如果技能名称包含连字符，请用引号括起键（JSON5 允许带引号的键）。

配置键默认匹配**技能名称**。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：
- `enabled: false` 禁用技能，即使它是捆绑/已安装的。
- `env`：**仅在**变量尚未在进程中设置时注入。
- `apiKey`：为声明 `metadata.openclaw.primaryEnv` 的技能提供便利。
- `config`：自定义每技能字段的可选容器；自定义键必须放在这里。
- `allowBundled`：仅为**捆绑**技能的可选白名单。如果设置，则只有
  列表中的捆绑技能符合条件（托管/工作区技能不受影响）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw：
1) 读取技能元数据。
2) 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3) 使用**符合条件**的技能构建系统提示。
4) 在运行结束后恢复原始环境。

这是**作用域限制在代理运行内**的，而不是全局 shell 环境。

## 会话快照（性能）

OpenClaw 在**会话开始时**对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

当启用技能监视器或出现新的符合条件的远程节点时（见下文），技能也可以在会话中途刷新。将其视为**热重载**：刷新后的列表将在下次代理轮次中被采用。

## 远程 macOS 节点（Linux 网关）

如果网关在 Linux 上运行但**macOS 节点**已连接**并允许 `system.run`**（执行批准安全性未设置为 `deny`），当所需二进制文件存在于该节点上时，OpenClaw 可以将仅 macOS 技能视为符合条件。代理应通过 `nodes` 工具（通常是 `nodes.run`）执行这些技能。

这依赖于节点报告其命令支持和通过 `system.run` 进行二进制文件探测。如果 macOS 节点稍后离线，技能仍然可见；调用可能会失败，直到节点重新连接。

## 技能监视器（自动刷新）

默认情况下，OpenClaw 监视技能文件夹并在 `SKILL.md` 文件更改时更新技能快照。在 `skills.load` 下配置此项：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250
    }
  }
}
```

## Token 影响（技能列表）

当技能符合条件时，OpenClaw 将可用技能的紧凑 XML 列表注入系统提示（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定性的：

- **基础开销（仅当 ≥1 个技能时）：** 195 个字符。
- **每个技能：** 97 个字符 + XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符数）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

注意事项：
- XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），增加长度。
- Token 数量因模型标记器而异。粗略的 OpenAI 风格估计约为 ~4 字符/token，因此**97 字符 ≈ 24 tokens** 每个技能加上您的实际字段长度。

## 托管技能生命周期

OpenClaw 作为安装的一部分（npm 包或 OpenClaw.app）以**捆绑技能**的形式
提供一套基线技能。`~/.openclaw/skills` 用于本地
覆盖（例如，在不更改捆绑副本的情况下固定/修补技能）。
工作区技能归用户所有，并在名称冲突时覆盖两者。

## 配置参考

有关完整配置架构，请参阅[技能配置](/tools/skills-config)。

## 寻找更多技能？

浏览 https://clawdhub.com。

---
