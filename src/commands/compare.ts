import { scanRuleFiles } from "../scanner.js";
import { parseRuleFile } from "../parser.js";
import { analyzeOverlap } from "../analyzers/overlap.js";
import { analyzeDefaults } from "../analyzers/defaults.js";
import { analyzeUsage, type UsageStats } from "../analyzers/usage.js";
import { RuleFile } from "../types.js";

interface SetupScore {
  name: string;
  totalRules: number;
  totalTokens: number;
  deadTokens: number;
  duplicateTokens: number;
  redundantTokens: number;
  effectiveTokens: number;
  efficiency: number;
  contextPercent: number;
}

export async function runCompare(
  paths: string[],
  jsonMode: boolean,
): Promise<void> {
  if (paths.length < 2) {
    console.log("Usage: deadkit compare <path-a> <path-b> [path-c...]");
    console.log("Compare efficiency of different rule sets.");
    process.exit(1);
  }

  // Collect usage data once (shared across all comparisons)
  const dummyFiles = await loadRules(paths[0]);
  const usageStats = await analyzeUsage(dummyFiles);

  if (usageStats.sessionsScanned === 0) {
    console.log("No session data found. Run 'deadkit init' and use Claude Code first.");
    process.exit(1);
  }

  // Print usage context
  if (!jsonMode) {
    printUsageContext(usageStats);
  }

  // Score each setup
  const scores: SetupScore[] = [];
  for (const path of paths) {
    const score = await scoreSetup(path, usageStats);
    scores.push(score);
  }

  if (jsonMode) {
    console.log(JSON.stringify({
      sessions: usageStats.sessionsScanned,
      extensions: [...usageStats.extensionsFound.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      setups: scores,
    }, null, 2));
  } else {
    printComparison(scores);
  }
}

async function loadRules(path: string): Promise<RuleFile[]> {
  const scanResults = await scanRuleFiles(process.cwd(), [path]);
  return Promise.all(
    scanResults.map((s) => parseRuleFile(s.path, s.scope)),
  );
}

async function scoreSetup(
  path: string,
  usageStats: UsageStats,
): Promise<SetupScore> {
  const files = await loadRules(path);
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const name = parts.length >= 2
    ? parts.slice(-2).join("/")
    : parts.pop() || path;

  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);

  // Dead rule tokens
  const deadTokens = calculateDeadTokens(files, usageStats);

  // Duplicate tokens
  const { duplicates, directiveOverlaps } = analyzeOverlap(files);
  const duplicateTokens = estimateDuplicateTokens(files, duplicates);

  // Redundant with Claude defaults
  const defaultMatches = analyzeDefaults(files);
  const redundantTokens = estimateRedundantTokens(files, defaultMatches);

  const wastedTokens = deadTokens + duplicateTokens + redundantTokens;
  const effectiveTokens = Math.max(0, totalTokens - wastedTokens);
  const efficiency = totalTokens > 0
    ? Math.round((effectiveTokens / totalTokens) * 1000) / 10
    : 100;

  return {
    name,
    totalRules: files.length,
    totalTokens,
    deadTokens,
    duplicateTokens,
    redundantTokens,
    effectiveTokens,
    efficiency,
    contextPercent: Math.round((totalTokens / 200_000) * 1000) / 10,
  };
}

function calculateDeadTokens(
  files: RuleFile[],
  usageStats: UsageStats,
): number {
  const DOMAIN_PATTERNS: Array<{
    match: RegExp;
    extensions: string[];
  }> = [
    { match: /python|pytorch/i, extensions: [".py", ".pyx", ".pyi"] },
    { match: /typescript/i, extensions: [".ts", ".tsx"] },
    { match: /javascript|web/i, extensions: [".js", ".jsx", ".ts", ".tsx"] },
    { match: /rust/i, extensions: [".rs"] },
    { match: /golang|\/go\/|go-build|go-reviewer/i, extensions: [".go"] },
    { match: /java\b/i, extensions: [".java"] },
    { match: /kotlin/i, extensions: [".kt", ".kts"] },
    { match: /swift/i, extensions: [".swift"] },
    { match: /dart|flutter/i, extensions: [".dart"] },
    { match: /csharp|c#|\.cs/i, extensions: [".cs"] },
    { match: /cpp|c\+\+/i, extensions: [".cpp", ".cc", ".h", ".hpp"] },
    { match: /php/i, extensions: [".php"] },
    { match: /perl/i, extensions: [".pl", ".pm"] },
    { match: /ruby/i, extensions: [".rb"] },
  ];

  let deadTokens = 0;
  for (const file of files) {
    const text = file.filename + " " + file.path;
    for (const dp of DOMAIN_PATTERNS) {
      if (dp.match.test(text)) {
        const hasActivity = dp.extensions.some(
          (ext) => usageStats.extensionsFound.has(ext),
        );
        if (!hasActivity) {
          deadTokens += file.tokenCount;
        }
        break;
      }
    }
  }
  return deadTokens;
}

function estimateDuplicateTokens(
  files: RuleFile[],
  duplicates: Array<{ fileA: string; fileB: string; similarity: number }>,
): number {
  let tokens = 0;
  for (const dup of duplicates) {
    const fileB = files.find((f) => f.filename === dup.fileB);
    if (fileB) tokens += Math.round(fileB.tokenCount * (dup.similarity / 100));
  }
  return tokens;
}

function estimateRedundantTokens(
  files: RuleFile[],
  defaults: Array<{ file: string; directive: string }>,
): number {
  // Approximate: each redundant directive ~ 15 tokens
  return defaults.length * 15;
}

function printUsageContext(usageStats: UsageStats): void {
  console.log("");
  console.log("deadkit compare");
  console.log("================");
  console.log("");
  console.log(
    `YOUR USAGE (based on ${usageStats.sessionsScanned} sessions)`,
  );

  const sorted = [...usageStats.extensionsFound.entries()]
    .sort((a, b) => b[1] - a[1]);
  const totalEdits = sorted.reduce((s, [, c]) => s + c, 0);

  for (const [ext, count] of sorted.slice(0, 8)) {
    const pct = Math.round((count / totalEdits) * 100);
    console.log(`  ${ext.padEnd(8)} ${pct}%`);
  }
}

function printComparison(scores: SetupScore[]): void {
  console.log("");

  // Header
  const nameWidth = Math.max(16, ...scores.map((s) => s.name.length + 2));
  const header =
    "".padEnd(nameWidth) +
    scores.map((s) => s.name.padStart(12)).join("");
  console.log(header);
  console.log("-".repeat(header.length));

  // Rows
  const rows: Array<{ label: string; values: string[]; highlight?: boolean }> =
    [
      {
        label: "Rules",
        values: scores.map((s) => String(s.totalRules)),
      },
      {
        label: "Total tokens",
        values: scores.map((s) => s.totalTokens.toLocaleString()),
      },
      {
        label: "Dead tokens",
        values: scores.map((s) => s.deadTokens.toLocaleString()),
      },
      {
        label: "Duplicate tokens",
        values: scores.map((s) => s.duplicateTokens.toLocaleString()),
      },
      {
        label: "Redundant tokens",
        values: scores.map((s) => s.redundantTokens.toLocaleString()),
      },
      {
        label: "Effective tokens",
        values: scores.map((s) => s.effectiveTokens.toLocaleString()),
        highlight: true,
      },
      {
        label: "Efficiency",
        values: scores.map((s) => s.efficiency + "%"),
        highlight: true,
      },
      {
        label: "Context used",
        values: scores.map((s) => s.contextPercent + "%"),
      },
    ];

  for (const row of rows) {
    const line =
      row.label.padEnd(nameWidth) +
      row.values.map((v) => v.padStart(12)).join("");
    console.log(line);
  }

  // Winner
  const best = scores.reduce((a, b) =>
    a.efficiency > b.efficiency ? a : b,
  );
  console.log("");
  console.log(`Winner: ${best.name} (${best.efficiency}% efficiency)`);
  console.log("");
}
