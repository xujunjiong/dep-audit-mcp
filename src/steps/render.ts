import { PipelineContext, Vulnerability, AuditReport, Severity } from "../types.js";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "moderate", "low", "info"];
const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  moderate: "🟡",
  low: "🟢",
  info: "⚪",
};

/**
 * 从漏洞包沿 effects 向上追溯依赖链，直到直接依赖（effects 为空）
 * npm audit 中 effects 表示"谁依赖了我"，所以方向是往上走
 */
function traceDepPath(
  pkgName: string,
  vulnsMap: Record<string, unknown>
): string[] {
  const visited = new Set<string>();
  const chain: string[] = [];
  let current: string | undefined = pkgName;

  while (current && !visited.has(current)) {
    visited.add(current);
    chain.unshift(current);
    const entry = vulnsMap[current] as { effects?: string[] } | undefined;
    const effects = entry?.effects;
    if (!effects || effects.length === 0) break;
    current = effects[0]; // 取第一条上游路径
  }

  return chain;
}

/**
 * Step 5: 渲染
 * 将 npm audit 的 JSON 输出格式化为 Markdown 报告
 */
export function render(ctx: PipelineContext): string {
  const raw = ctx.auditRaw;
  if (!raw) return "# 无审计数据\n";

  const vulnsMap = raw.vulnerabilities as Record<string, unknown> | undefined;

  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };

  const vulnerabilities: Vulnerability[] = [];

  if (vulnsMap) {
    for (const [pkgName, vulnData] of Object.entries(vulnsMap)) {
      const data = vulnData as {
        severity?: string;
        name?: string;
        via?: unknown[];
        fixAvailable?: unknown;
      };

      const severity = (data.severity as Severity) || "low";

      // 从 via 数组提取漏洞详情
      const viaEntries = Array.isArray(data.via) ? data.via : [];

      // 跳过间接依赖：via 中只有字符串引用（指向下游包名），
      // 没有真正的漏洞对象（含 title/url）的条目是传递依赖，不是根因
      const hasAdvisory = viaEntries.some((v) => typeof v === "object" && v !== null);
      if (!hasAdvisory) continue;

      const titles: string[] = [];
      const urls: string[] = [];

      for (const via of viaEntries) {
        if (typeof via === "object" && via !== null) {
          const v = via as { title?: string; url?: string; range?: string };
          if (v.title) titles.push(v.title);
          if (v.url) urls.push(v.url);
        }
      }

      let fixInfo = "无可用修复";
      if (data.fixAvailable) {
        if (typeof data.fixAvailable === "object" && data.fixAvailable !== null) {
          const fix = data.fixAvailable as { name?: string; version?: string };
          fixInfo = `升级 \`${fix.name || pkgName}\` 到 \`${fix.version || "最新版本"}\``;
        } else {
          fixInfo = "运行 npm audit fix 修复";
        }
      }

      // 追溯依赖路径
      const depChain = traceDepPath(pkgName, vulnsMap);
      const depPath = depChain.length > 1 ? depChain.join(" → ") : "";

      vulnerabilities.push({
        id: urls.length > 0 ? urls[0] : pkgName,
        severity,
        title: titles.length > 0 ? titles.join("; ") : pkgName,
        packageName: pkgName,
        vulnerableVersions: "",
        patchedVersions: "",
        recommendation: fixInfo,
        url: urls.length > 0 ? urls[0] : "",
        depPath,
      });
    }
  }

  // 从过滤后的漏洞列表统计各级别数量，与详情区域保持一致
  for (const vuln of vulnerabilities) {
    if (vuln.severity in severityCounts) {
      severityCounts[vuln.severity]++;
    }
  }

  const total = vulnerabilities.length;

  const report: AuditReport = {
    projectPath: ctx.source,
    totalVulnerabilities: total,
    severityCounts,
    vulnerabilities,
  };

  ctx.report = report;

  // 构建 Markdown 报告
  const lines: string[] = [];

  // 标题
  lines.push("# npm 依赖安全审计报告");
  lines.push("");
  lines.push(`**项目**: \`${ctx.source}\``);
  lines.push(`**审计时间**: ${new Date().toISOString()}`);
  lines.push("");

  // 汇总
  lines.push("## 漏洞汇总");
  lines.push("");
  lines.push(`| 严重性 | 数量 |`);
  lines.push(`|--------|------|`);
  lines.push(`| ${SEVERITY_EMOJI.critical} Critical | ${severityCounts.critical} |`);
  lines.push(`| ${SEVERITY_EMOJI.high} High | ${severityCounts.high} |`);
  lines.push(`| ${SEVERITY_EMOJI.moderate} Moderate | ${severityCounts.moderate} |`);
  lines.push(`| ${SEVERITY_EMOJI.low} Low | ${severityCounts.low} |`);
  lines.push(`| ${SEVERITY_EMOJI.info} Info | ${severityCounts.info} |`);
  lines.push(`| **总计** | **${total}** |`);
  lines.push("");

  if (total === 0) {
    lines.push("> 未发现已知漏洞。");
    lines.push("");
    return lines.join("\n");
  }

  // 漏洞详情
  lines.push("## 漏洞详情");
  lines.push("");

  const sorted = [...vulnerabilities].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  for (const vuln of sorted) {
    lines.push(`### ${SEVERITY_EMOJI[vuln.severity]} [${vuln.severity.toUpperCase()}] ${vuln.title}`);
    lines.push("");
    lines.push(`- **包名**: \`${vuln.packageName}\``);
    if (vuln.depPath) {
      lines.push(`- **依赖路径**: \`${vuln.depPath}\``);
    } else {
      lines.push(`- **依赖类型**: 直接依赖`);
    }
    if (vuln.url) {
      lines.push(`- **参考链接**: ${vuln.url}`);
    }
    lines.push(`- **修复建议**: ${vuln.recommendation}`);
    lines.push("");
  }

  return lines.join("\n");
}
