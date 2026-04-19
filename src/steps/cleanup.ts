import { rm } from "fs/promises";
import { PipelineContext } from "../types.js";

/**
 * Step 6: 删除工作目录
 * 清理临时文件
 */
export async function cleanup(ctx: PipelineContext): Promise<void> {
  try {
    await rm(ctx.workDir, { recursive: true, force: true });
  } catch {
    // 清理失败不阻塞主流程
  }
}
