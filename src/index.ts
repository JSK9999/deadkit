#!/usr/bin/env node

import { scanRuleFiles, scanSkills } from "./scanner.js";
import { parseRuleFile } from "./parser.js";
import { analyzeOverlap } from "./analyzers/overlap.js";
import { analyzeDefaults } from "./analyzers/defaults.js";
import { analyzeVagueness } from "./analyzers/vagueness.js";
import { analyzeCost } from "./analyzers/cost.js";
import { analyzeStaleness } from "./analyzers/staleness.js";
import { analyzeUsage } from "./analyzers/usage.js";
import { analyzeSkills } from "./analyzers/skills.js";
import { printReport } from "./reporter.js";
import { AnalysisResult } from "./types.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Subcommands
  if (command === "init") {
    const { runInit } = await import("./commands/init.js");
    await runInit();
    return;
  }

  if (command === "trend") {
    const { runTrend } = await import("./commands/trend.js");
    await runTrend(args.includes("--json"));
    return;
  }

  const jsonMode = args.includes("--json");
  const cwd = process.cwd();
  const customPaths = args.filter((a) => !a.startsWith("-"));

  const [scanResults, skills] = await Promise.all([
    scanRuleFiles(cwd, customPaths),
    scanSkills(),
  ]);

  if (scanResults.length === 0 && skills.length === 0) {
    console.log("No rules or skills found.");
    console.log("Usage: deadkit [path...]");
    console.log("Scans: ~/.claude/rules/, ~/.claude/skills/, .claude/rules/");
    process.exit(0);
  }

  const files = await Promise.all(
    scanResults.map((s) => parseRuleFile(s.path, s.scope)),
  );

  const { duplicates, directiveOverlaps } = analyzeOverlap(files);
  const defaultMatches = analyzeDefaults(files);
  const vagueDirectives = analyzeVagueness(files);
  const costBreakdown = analyzeCost(files);
  const staleRules = analyzeStaleness(files);
  const usageStats = await analyzeUsage(files);
  const skillAnalysis = skills.length > 0
    ? await analyzeSkills(skills)
    : undefined;

  const result: AnalysisResult = {
    totalFiles: files.length,
    globalCount: files.filter((f) => f.scope === "global").length,
    projectCount: files.filter((f) => f.scope === "project").length,
    totalTokens: files.reduce((sum, f) => sum + f.tokenCount, 0),
    duplicates,
    directiveOverlaps,
    defaultMatches,
    vagueDirectives,
    costBreakdown,
    staleRules,
    usage: usageStats.sessionsScanned > 0
      ? {
          sessionsScanned: usageStats.sessionsScanned,
          extensionsFound: [...usageStats.extensionsFound.entries()].sort(
            (a, b) => b[1] - a[1],
          ),
          deadRules: usageStats.deadRules,
        }
      : undefined,
    skills: skillAnalysis
      ? {
          totalSkills: skillAnalysis.totalSkills,
          totalDescriptionTokens: skillAnalysis.totalDescriptionTokens,
          neverUsed: skillAnalysis.neverUsed.map((s) => ({
            name: s.name,
            description: s.description,
          })),
          usage: skillAnalysis.usage,
          overlapping: skillAnalysis.overlapping,
        }
      : undefined,
  };

  const issues =
    duplicates.length +
    directiveOverlaps.length +
    defaultMatches.length +
    vagueDirectives.length +
    staleRules.length +
    (result.usage?.deadRules.length ?? 0) +
    (result.skills?.neverUsed.length ?? 0);

  if (jsonMode) {
    console.log(JSON.stringify({ ...result, issueCount: issues }, null, 2));
  } else {
    printReport(result);
  }

  process.exit(issues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(2);
});
