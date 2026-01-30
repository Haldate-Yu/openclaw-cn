---
summary: "技能配置架构和示例"
read_when:
  - 添加或修改技能配置时
  - 调整捆绑白名单或安装行为时
---
# 技能配置

所有与技能相关的配置都位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: [
        "~/Projects/agent-scripts/skills",
        "~/Projects/oss/some-skill-pack/skills"
      ],
      watch: true,
      watchDebounceMs: 250
    },
    install: {
      preferBrew: true,
      nodeManager: "npm" // npm | pnpm | yarn | bun (网关运行时仍为 Node；不推荐使用 bun)
    },
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE"
        }
      },
      peekaboo: { enabled: true },
      sag: { enabled: false }
    }
  }
}
```

## 字段

- `allowBundled`：仅为**捆绑**技能的可选白名单。设置后，
  只有列表中的捆绑技能符合条件（托管/工作区技能不受影响）。
- `load.extraDirs`：要扫描的额外技能目录（最低优先级）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的去抖延迟（毫秒）（默认：250）。
- `install.preferBrew`：可用时首选 brew 安装程序（默认：true）。
- `install.nodeManager`：节点安装程序偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响**技能安装**；网关运行时仍应为 Node
  （不推荐将 Bun 用于 WhatsApp/Telegram）。
- `entries.<skillKey>`：每个技能的覆盖设置。

每技能字段：
- `enabled`：设置为 `false` 以禁用技能，即使它是捆绑/已安装的。
- `env`：为代理运行注入的环境变量（仅在尚未设置时）。
- `apiKey`：为声明主环境变量的技能提供的可选便利。

## 注意事项

- `entries` 下的键默认映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 当监视器启用时，技能的更改将在下次代理轮次中被采用。

### 沙盒技能 + 环境变量

当会话**沙盒化**时，技能进程在 Docker 内部运行。沙盒
**不会**继承主机的 `process.env`。

使用以下方法之一：
- `agents.defaults.sandbox.docker.env`（或每代理 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到您的自定义沙盒镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。
