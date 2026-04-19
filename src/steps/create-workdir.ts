import { mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { PipelineContext } from "../types.js";
import { isRemoteUrl } from "../utils.js";
import { fetchProjectFiles } from "../remote-fetch.js";

/**
 * Step 1: 创建工作目录
 * 如果 sourcePath 是远程 URL，同时下载所需文件到工作目录
 */
export async function createWorkDir(sourcePath: string): Promise<PipelineContext> {
  const workDir = await mkdtemp(join(tmpdir(), "dep-audit-"));

  if (isRemoteUrl(sourcePath)) {
    await fetchProjectFiles(sourcePath, workDir);
  }

  return {
    workDir,
    source: sourcePath,
    packageJson: null,
    auditRaw: null,
    report: null,
  };
}
