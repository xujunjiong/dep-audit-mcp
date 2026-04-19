import { readFile, copyFile } from "fs/promises";
import { join } from "path";
import { PipelineContext } from "../types.js";
import { isRemoteUrl } from "../utils.js";

/**
 * Step 2: 解析工程
 *
 * 远程仓库：文件已由 createWorkDir 下载到 workDir，直接读取
 * 本地项目：将 package.json 和 .npmrc 复制到工作目录，然后读取
 */
export async function parseProject(ctx: PipelineContext): Promise<PipelineContext> {
  const destPkg = join(ctx.workDir, "package.json");

  if (isRemoteUrl(ctx.source)) {
    // 远程仓库：文件已在 workDir 中，直接读取
    const content = await readFile(destPkg, "utf-8");
    ctx.packageJson = JSON.parse(content) as Record<string, unknown>;
  } else {
    // 本地项目：复制 package.json 和 .npmrc 到工作目录
    const srcPkg = join(ctx.source, "package.json");
    await copyFile(srcPkg, destPkg);

    const srcNpmrc = join(ctx.source, ".npmrc");
    const destNpmrc = join(ctx.workDir, ".npmrc");
    try {
      await copyFile(srcNpmrc, destNpmrc);
    } catch {
      // .npmrc 不存在，忽略
    }

    const content = await readFile(destPkg, "utf-8");
    ctx.packageJson = JSON.parse(content) as Record<string, unknown>;
  }

  const pkg = ctx.packageJson;
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  if (!deps && !devDeps) {
    throw new Error("package.json 中没有 dependencies 或 devDependencies，无需审计");
  }

  return ctx;
}
