import { execFile } from "child_process";
import { promisify } from "util";
import { PipelineContext } from "../types.js";

const execFileAsync = promisify(execFile);

/**
 * Step 3: 生成 lock 文件
 * 执行 npm install --package-lock-only 生成 package-lock.json
 */
export async function generateLock(ctx: PipelineContext): Promise<PipelineContext> {
  try {
    const { stderr } = await execFileAsync("npm", ["install", "--package-lock-only"], {
      cwd: ctx.workDir,
      timeout: 120_000, // 2 分钟超时
    });

    // npm 有时会在 stderr 中输出警告但仍然成功，记录以便调试
    if (stderr) {
      console.error("[generate-lock] npm stderr:", stderr);
    }
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`生成 lock 文件失败: ${detail}`);
  }

  return ctx;
}
