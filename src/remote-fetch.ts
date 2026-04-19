import { writeFile } from "fs/promises";
import { join } from "path";

/** 解析后的远程仓库信息 */
interface RemoteRepoInfo {
  platform: "github" | "gitlab";
  host: string;
  owner: string;
  repo: string;
  branch: string;
}

/**
 * 解析远程仓库 URL，提取平台、owner、repo、branch
 *
 * 支持格式：
 * - GitHub: https://github.com/{owner}/{repo} 或 .../tree/{branch}
 * - GitLab: https://gitlab.example.com/{group}/{repo} 或 .../-/tree/{branch}
 */
export function parseRemoteUrl(url: string): RemoteRepoInfo | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const parts = parsed.pathname.replace(/^\/|\/$/g, "").split("/");

    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    // GitHub
    if (host === "github.com" || host === "www.github.com") {
      let branch = "main";
      // https://github.com/{owner}/{repo}/tree/{branch}
      if (parts.length >= 4 && parts[2] === "tree") {
        branch = parts[3];
      }
      return { platform: "github", host, owner, repo, branch };
    }

    // GitLab (含自建实例，host 包含 gitlab)
    if (host === "gitlab.com" || host.includes("gitlab")) {
      let branch = "main";
      // https://gitlab.example.com/{group}/{repo}/-/tree/{branch}
      const treeIdx = parts.indexOf("-");
      if (treeIdx !== -1 && parts[treeIdx + 1] === "tree" && parts[treeIdx + 2]) {
        branch = parts[treeIdx + 2];
      }
      return { platform: "gitlab", host, owner, repo, branch };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 构建原始文件的下载 URL
 */
function buildRawUrl(info: RemoteRepoInfo, filePath: string): string {
  if (info.platform === "github") {
    return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${filePath}`;
  }

  // GitLab API: 项目 ID 为 URL 编码的 owner/repo 路径
  const projectId = encodeURIComponent(`${info.owner}/${info.repo}`);
  const encodedFile = encodeURIComponent(filePath);
  return `https://${info.host}/api/v4/projects/${projectId}/repository/files/${encodedFile}/raw?ref=${info.branch}`;
}

/**
 * 通过 API 下载单个远程文件并写入本地路径
 * @returns true 下载成功，false 文件不存在（如 .npmrc）
 */
async function fetchFile(rawUrl: string, destPath: string): Promise<boolean> {
  const resp = await fetch(rawUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) return false;

  const content = await resp.text();
  await writeFile(destPath, content, "utf-8");
  return true;
}

/**
 * 从远程仓库下载 package.json 和 .npmrc 到目标目录
 * @throws 如果 URL 无法解析或 package.json 不存在
 */
export async function fetchProjectFiles(
  remoteUrl: string,
  targetDir: string
): Promise<void> {
  const info = parseRemoteUrl(remoteUrl);
  if (!info) {
    throw new Error(
      `无法解析远程仓库 URL: ${remoteUrl}\n支持的格式: https://github.com/{owner}/{repo} 或 https://gitlab.example.com/{group}/{repo}`
    );
  }

  // 下载 package.json（必须存在）
  const pkgUrl = buildRawUrl(info, "package.json");
  const pkgOk = await fetchFile(pkgUrl, join(targetDir, "package.json"));
  if (!pkgOk) {
    throw new Error(
      `无法下载 package.json: ${info.owner}/${info.repo}@${info.branch}\n请确认仓库路径和分支是否正确`
    );
  }

  // 下载 .npmrc（可选，不存在则跳过）
  const npmrcUrl = buildRawUrl(info, ".npmrc");
  await fetchFile(npmrcUrl, join(targetDir, ".npmrc")).catch(() => {
    // 忽略 .npmrc 下载失败
  });
}
