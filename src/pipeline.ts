import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { createWorkDir } from "./steps/create-workdir.js";
import { parseProject } from "./steps/parse-project.js";
import { generateLock } from "./steps/generate-lock.js";
import { audit } from "./steps/audit.js";
import { render } from "./steps/render.js";
import { cleanup } from "./steps/cleanup.js";

/**
 * 执行完整的审计流水线：
 * 1. 创建工作目录
 * 2. 解析工程
 * 3. 生成 lock 文件
 * 4. 安全审计
 * 5. 渲染结果并保存为 Markdown 文件
 * 6. 删除工作目录
 */
export async function runPipeline(projectPath: string, reportPath: string): Promise<string> {
  let ctx;

  // Step 1: 创建工作目录
  ctx = await createWorkDir(projectPath);

  try {
    // Step 2: 解析工程
    ctx = await parseProject(ctx);

    // Step 3: 生成 lock 文件
    ctx = await generateLock(ctx);

    // Step 4: 安全审计
    ctx = await audit(ctx);

    // Step 5: 渲染
    const report = render(ctx);

    // 保存报告到指定路径
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, report, "utf-8");

    return `审计报告已保存到: ${reportPath}\n\n${report}`;
  } finally {
    // Step 6: 删除工作目录
    if (ctx) {
      await cleanup(ctx);
    }
  }
}
