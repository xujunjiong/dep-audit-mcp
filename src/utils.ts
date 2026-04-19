import { resolve } from "path";
import { statSync } from "fs";

/**
 * 判断是否为远程 Git 仓库 URL
 */
export function isRemoteUrl(source: string): boolean {
  return source.startsWith("https://") ||
    source.startsWith("http://") ||
    source.startsWith("git@") ||
    source.startsWith("ssh://");
}

/**
 * 解析本地项目路径，校验目录是否存在
 */
export function resolveProjectPath(source: string): string {
  const absolutePath = resolve(source);

  try {
    const s = statSync(absolutePath);
    if (!s.isDirectory()) {
      throw new Error(`路径不是目录: ${absolutePath}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("不是目录")) throw err;
    throw new Error(`路径不存在: ${absolutePath}`);
  }

  return absolutePath;
}
