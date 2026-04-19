import { execFile } from "child_process";
import { promisify } from "util";
import { PipelineContext } from "../types.js";

const execFileAsync = promisify(execFile);

/**
 * Step 4: 安全审计
 * 执行 npm audit --json 获取漏洞报告
 */
export async function audit(ctx: PipelineContext): Promise<PipelineContext> {
  let stdout: string;

  try {
    const result = await execFileAsync("npm", ["audit", "--json"], {
      cwd: ctx.workDir,
      timeout: 60_000, // 1 分钟超时
    });
    stdout = result.stdout;
  } catch (err: unknown) {
    // npm audit 发现漏洞时会以非零退出码退出，但 stdout 仍然有 JSON 输出
    if (err && typeof err === "object" && "stdout" in err) {
      stdout = (err as { stdout: string }).stdout;
    } else {
      throw new Error(`npm audit 执行失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    ctx.auditRaw = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new Error(`无法解析 npm audit 输出: ${stdout.substring(0, 200)}`);
  }

  return ctx;
}
