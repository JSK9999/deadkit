export interface RuleFile {
  path: string;
  filename: string;
  scope: "global" | "project";
  content: string;
  frontmatter: Record<string, string>;
  directives: string[];
  tokenCount: number;
  mtime: Date;
}

export interface OverlapResult {
  fileA: string;
  fileB: string;
  similarity: number;
}

export interface DirectiveOverlap {
  fileA: string;
  directiveA: string;
  fileB: string;
  directiveB: string;
  similarity: number;
}

export interface DefaultMatch {
  file: string;
  directive: string;
  reason: string;
}

export interface VagueDirective {
  file: string;
  directive: string;
  score: number;
}

export interface CostEntry {
  file: string;
  tokens: number;
  percent: number;
}

export interface StaleRule {
  file: string;
  daysSinceModified: number;
}

export interface DeadByUsage {
  file: string;
  domain: string;
  reason: string;
}

export interface UsageSummary {
  sessionsScanned: number;
  extensionsFound: [string, number][];
  deadRules: DeadByUsage[];
}

export interface SkillReport {
  totalSkills: number;
  totalDescriptionTokens: number;
  neverUsed: Array<{ name: string; description: string }>;
  usage: Array<{ name: string; callCount: number; lastUsed: string | null }>;
  overlapping: Array<{ skillA: string; skillB: string; similarity: number }>;
}

export interface AnalysisResult {
  totalFiles: number;
  globalCount: number;
  projectCount: number;
  totalTokens: number;
  duplicates: OverlapResult[];
  directiveOverlaps: DirectiveOverlap[];
  defaultMatches: DefaultMatch[];
  vagueDirectives: VagueDirective[];
  costBreakdown: CostEntry[];
  staleRules: StaleRule[];
  usage?: UsageSummary;
  skills?: SkillReport;
}
