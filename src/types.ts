/** 审计严重性级别 */
export type Severity = "critical" | "high" | "moderate" | "low" | "info";

/** npm audit 单条漏洞 */
export interface Vulnerability {
  id: string;
  severity: Severity;
  title: string;
  packageName: string;
  vulnerableVersions: string;
  patchedVersions: string;
  recommendation: string;
  url: string;
  /** 依赖路径，如 "express → qs"，直接依赖时为空字符串 */
  depPath: string;
}

/** npm audit 报告 */
export interface AuditReport {
  projectPath: string;
  totalVulnerabilities: number;
  severityCounts: Record<Severity, number>;
  vulnerabilities: Vulnerability[];
}

/** 流水线上下文 */
export interface PipelineContext {
  /** 临时工作目录 */
  workDir: string;
  /** 原始项目路径（本地）或仓库 URL（远程） */
  source: string;
  /** package.json 内容 */
  packageJson: Record<string, unknown> | null;
  /** npm audit 原始 JSON 输出 */
  auditRaw: Record<string, unknown> | null;
  /** 格式化后的审计报告 */
  report: AuditReport | null;
}
