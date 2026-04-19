#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runPipeline } from "./pipeline.js";
import { isRemoteUrl, resolveProjectPath } from "./utils.js";

const server = new McpServer({
  name: "dep-audit-mcp",
  version: "1.0.0",
});

server.tool(
  "npm_audit",
  "对 npm 项目进行依赖安全审计，使用 npm audit 检查漏洞并将报告保存为 Markdown 文件。",
  {
    source: z.string().describe("项目地址，可以是本地路径或远程 Git 仓库 URL（GitHub/GitLab）"),
    reportPath: z.string().describe("审计报告的保存路径（Markdown 文件，如 /path/to/report.md）"),
  },
  async ({ source, reportPath }) => {
    try {
      const projectPath = isRemoteUrl(source)
        ? source
        : resolveProjectPath(source);

      const report = await runPipeline(projectPath, reportPath);
      return {
        content: [{ type: "text", text: report }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
