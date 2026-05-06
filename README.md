# dep-audit-mcp

> 一个基于 [Model Context Protocol](https://modelcontextprotocol.io) 的 MCP Server，封装 `npm audit` 为 AI 客户端可调用的依赖安全审计工具。支持本地项目与 GitHub / GitLab 远程仓库，自动生成 Markdown 漏洞报告。

[![npm version](https://img.shields.io/npm/v/dep-audit-mcp.svg)](https://www.npmjs.com/package/dep-audit-mcp)
[![npm downloads](https://img.shields.io/npm/dm/dep-audit-mcp.svg)](https://www.npmjs.com/package/dep-audit-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![MCP SDK](https://img.shields.io/badge/MCP-1.12-blue)](https://modelcontextprotocol.io)

---

## 目录

- [特性](#特性)
- [工作原理](#工作原理)
- [安装](#安装)
- [在 MCP 客户端中配置](#在-mcp-客户端中配置)
- [工具说明](#工具说明)
- [使用示例](#使用示例)
- [报告示例](#报告示例)
- [开发](#开发)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [安全说明](#安全说明)
- [License](#license)

---

## 特性

- 🔍 **零配置审计**：调用 `npm audit` 检查项目依赖中的已知 CVE 漏洞。
- 🌐 **本地与远程双支持**：传入本地路径或 GitHub / GitLab 仓库 URL（含自建 GitLab 实例）即可。
- ⚡ **远程审计免 clone**：仅通过 raw API 拉取 `package.json` 与 `.npmrc`，不下载源码，速度快、占用低。
- 📄 **结构化 Markdown 报告**：包含汇总表、依赖链回溯、修复建议与外链。
- 🧹 **临时目录自动清理**：所有中间产物在临时目录中生成，结束后自动删除。
- 🛡️ **依赖路径回溯**：自动从传递依赖追溯到直接依赖，便于定位问题。

## 工作原理

```
┌─────────────┐
│ MCP Client  │  (Claude Desktop / Claude Code / Cursor / ...)
└──────┬──────┘
       │ stdio (JSON-RPC)
┌──────▼──────────────────────────────────────────────┐
│  dep-audit-mcp                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ 1. createWorkDir   建临时目录 / 拉远程文件 │     │
│  │ 2. parseProject    读取 package.json       │     │
│  │ 3. generateLock    npm install --lock-only │     │
│  │ 4. audit           npm audit --json        │     │
│  │ 5. render          JSON → Markdown         │     │
│  │ 6. cleanup         删除临时目录            │     │
│  └────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 安装

### 前置依赖

- Node.js ≥ 18
- npm ≥ 9（项目内会调用 `npm install --package-lock-only` 与 `npm audit`）

### 方式一：直接通过 npx 使用（推荐）

无需安装，MCP 客户端会按需拉起：

```bash
npx -y dep-audit-mcp
```

### 方式二：全局安装

```bash
npm install -g dep-audit-mcp
dep-audit-mcp
```

### 方式三：从源码构建

```bash
git clone https://github.com/<your-name>/dep-audit-mcp.git
cd dep-audit-mcp
npm install
npm run build
node build/index.js
```

## 在 MCP 客户端中配置

### Claude Desktop

编辑 `claude_desktop_config.json`：

- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows：`%APPDATA%\Claude\claude_desktop_config.json`

**推荐（npx，免安装）：**

```json
{
  "mcpServers": {
    "dep-audit": {
      "command": "npx",
      "args": ["-y", "dep-audit-mcp"]
    }
  }
}
```

**全局安装后：**

```json
{
  "mcpServers": {
    "dep-audit": {
      "command": "dep-audit-mcp"
    }
  }
}
```

**源码构建：**

```json
{
  "mcpServers": {
    "dep-audit": {
      "command": "node",
      "args": ["/absolute/path/to/dep-audit-mcp/build/index.js"]
    }
  }
}
```

### Claude Code

```bash
# npx 方式（推荐）
claude mcp add dep-audit -- npx -y dep-audit-mcp

# 全局安装后
claude mcp add dep-audit -- dep-audit-mcp
```

### Cursor / 其他 MCP 客户端

参照各客户端的 MCP server 配置说明，使用相同的 `command` + `args`。npx 方式在所有客户端通用。

## 工具说明

本 Server 提供 **1 个工具**：

### `npm_audit`

对 npm 项目执行依赖安全审计。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `source` | `string` | ✅ | 项目地址。可以是本地绝对路径，或 GitHub / GitLab 仓库 URL |
| `reportPath` | `string` | ✅ | 审计报告保存路径（`.md` 文件，目录不存在会自动创建） |

**支持的 `source` 格式：**

| 类型 | 示例 |
|------|------|
| 本地路径 | `/Users/me/projects/my-app` |
| GitHub | `https://github.com/expressjs/express` |
| GitHub (指定分支) | `https://github.com/expressjs/express/tree/4.x` |
| GitLab | `https://gitlab.com/group/repo` |
| 自建 GitLab | `https://gitlab.example.com/group/repo/-/tree/develop` |

**返回值：** Markdown 格式的审计报告字符串（同时已写入 `reportPath`）。

## 使用示例

在 MCP 客户端的对话中：

```
帮我审计 /Users/me/projects/my-api，把报告存到 /tmp/audit.md
```

```
检查 https://github.com/expressjs/express 这个仓库有哪些已知漏洞，
报告写到 ~/Desktop/express-audit.md
```

```
对 https://github.com/lodash/lodash/tree/4.17 做安全扫描，
保存到 ./reports/lodash.md
```

AI 会自动调用 `npm_audit` 工具完成审计。

## 报告示例

```markdown
# npm 依赖安全审计报告

**项目**: `/Users/me/projects/demo`
**审计时间**: 2026-05-07T10:30:00.000Z

## 漏洞汇总

| 严重性 | 数量 |
|--------|------|
| 🔴 Critical | 1 |
| 🟠 High | 3 |
| 🟡 Moderate | 2 |
| 🟢 Low | 0 |
| ⚪ Info | 0 |
| **总计** | **6** |

## 漏洞详情

### 🔴 [CRITICAL] Prototype Pollution in lodash

- **包名**: `lodash`
- **依赖路径**: `lodash → some-lib → my-app`
- **参考链接**: https://github.com/advisories/GHSA-xxxx-xxxx-xxxx
- **修复建议**: 升级 `lodash` 到 `4.17.21`

...
```

## 开发

```bash
# 监听式开发（用 tsx 直接跑 TS）
npm run dev

# 编译
npm run build

# 启动构建产物
npm start
```

### 调试 MCP Server

可使用官方 [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 调试：

```bash
# 已发布到 npm，可直接用 npx 启
npx @modelcontextprotocol/inspector npx -y dep-audit-mcp

# 或本地构建后
npx @modelcontextprotocol/inspector node build/index.js
```

### 发布到 npm

```bash
npm version patch    # 或 minor / major
npm publish --access public
```

> `prepublishOnly` 钩子会自动执行 `npm run build`。

## 项目结构

```
dep-audit-mcp/
├── src/
│   ├── index.ts            # MCP Server 入口，注册工具
│   ├── pipeline.ts         # 6 步审计流水线编排
│   ├── types.ts            # 类型定义
│   ├── utils.ts            # 路径 / URL 判断
│   ├── remote-fetch.ts     # GitHub / GitLab raw 文件下载
│   └── steps/
│       ├── create-workdir.ts   # 1. 建临时目录
│       ├── parse-project.ts    # 2. 解析 package.json
│       ├── generate-lock.ts    # 3. 生成 lock 文件
│       ├── audit.ts            # 4. 执行 npm audit
│       ├── render.ts           # 5. 渲染 Markdown
│       └── cleanup.ts          # 6. 清理临时目录
├── build/                  # 编译产物
├── package.json
├── tsconfig.json
└── README.md
```

## 常见问题

### Q：审计远程仓库时报错 `无法下载 package.json`？

可能原因：

- 仓库为私有仓库（目前不支持鉴权）。
- 默认分支不是 `main`，且未在 URL 中显式指定 `tree/{branch}`。
- 仓库根目录没有 `package.json`（monorepo 子包暂不支持）。

### Q：本地审计很慢？

`npm install --package-lock-only` 会访问 npm registry 解析依赖树，速度受网络影响。可在被审计项目的 `.npmrc` 中配置国内 registry 镜像。

### Q：私有 npm registry 下的包如何审计？

工具会复制项目根目录的 `.npmrc` 到工作目录，因此可正常使用 scoped registry 与 token。**注意**：远程仓库审计场景下也会拉取 `.npmrc`，仅在你信任该仓库时使用。

### Q：报告里为什么没看到某个传递依赖？

`render` 阶段会过滤掉「纯传递依赖」（`via` 中只有字符串引用、无 advisory 对象的条目），仅展示根因漏洞包，并通过 **依赖路径** 字段显示传递关系。

### Q：支持 pnpm / yarn 项目吗？

当前仅基于 `npm audit`。pnpm / yarn 项目若有 `package.json` 也可工作（会重新生成 `package-lock.json`），但语义可能与 pnpm/yarn 自身的审计结果略有差异。

## 安全说明

- 工具会执行 `npm install --package-lock-only` 与 `npm audit`，二者均不会运行项目脚本（无 `npm install` 的 lifecycle scripts），相对安全。
- 远程仓库审计会下载并使用其 `.npmrc`，**请仅审计你信任的仓库**，避免恶意 registry 注入。
- 所有中间文件位于系统临时目录，结束后自动删除。

## License

[MIT](./LICENSE) © 2026
