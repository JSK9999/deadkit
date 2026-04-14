import { scanRuleFiles, scanSkills } from "../scanner.js";
import { parseRuleFile } from "../parser.js";
import { analyzeSkills } from "../analyzers/skills.js";
import { analyzeRelevance } from "../analyzers/relevance.js";
import { analyzeCost } from "../analyzers/cost.js";

export async function runReport(jsonMode: boolean): Promise<void> {
  const cwd = process.cwd();
  const [scanResults, skills] = await Promise.all([
    scanRuleFiles(cwd),
    scanSkills(),
  ]);

  const files = await Promise.all(
    scanResults.map((s) => parseRuleFile(s.path, s.scope)),
  );

  const skillAnalysis = skills.length > 0
    ? await analyzeSkills(skills)
    : undefined;

  const skillUsage = skillAnalysis
    ? skillAnalysis.usage
    : [];

  const relevance = await analyzeRelevance(files, skillUsage);
  const costBreakdown = analyzeCost(files);

  if (relevance.totalSessions === 0) {
    console.log("No session data. Run 'deadkit init' and use Claude Code first.");
    return;
  }

  if (jsonMode) {
    console.log(JSON.stringify(relevance, null, 2));
    return;
  }

  printReport(relevance, costBreakdown, skills.length);
}

function printReport(
  rel: Awaited<ReturnType<typeof analyzeRelevance>>,
  cost: ReturnType<typeof analyzeCost>,
  skillCount: number,
): void {
  const totalTokens = cost.reduce((s, c) => s + c.tokens, 0);

  console.log("");
  console.log("deadkit report");
  console.log("===============");
  console.log(
    `${rel.rules.length} rules, ${skillCount} skills | ` +
    `${rel.totalSessions} sessions analyzed | ` +
    `~${totalTokens.toLocaleString()} tokens`,
  );

  // Rule relevance
  console.log("");
  console.log("RULE RELEVANCE");

  const activeRules = rel.rules.filter((r) => r.status === "active");
  const lowRules = rel.rules.filter((r) => r.status === "low");
  const deadRules = rel.rules.filter((r) => r.status === "dead");

  for (const r of rel.rules) {
    const bar = makeBar(r.percent);
    const pct = String(r.percent).padStart(3) + "%";
    const ratio = `${r.relevantSessions}/${r.totalSessions}`;
    const tag =
      r.status === "dead"
        ? " DEAD"
        : r.status === "low"
          ? " LOW"
          : "";
    console.log(`  ${r.file.padEnd(30)} ${pct}  ${bar}  ${ratio}${tag}`);
  }

  // Skill relevance
  if (rel.skills.length > 0) {
    console.log("");
    console.log("SKILL ACTIVITY");

    for (const s of rel.skills) {
      const tag =
        s.status === "unused"
          ? " UNUSED"
          : s.status === "low"
            ? " LOW"
            : "";
      console.log(
        `  /${s.name.padEnd(28)} ${String(s.callCount).padStart(3)} calls${tag}`,
      );
    }
  }

  // Alerts
  const alerts: string[] = [];
  for (const r of lowRules) {
    alerts.push(`${r.file} relevance below 20% (${r.percent}%)`);
  }
  for (const r of deadRules) {
    alerts.push(`${r.file} is DEAD — 0% relevance`);
  }
  for (const s of rel.skills.filter((s) => s.status === "unused")) {
    alerts.push(`/${s.name} never called — consider removing`);
  }

  if (alerts.length > 0) {
    console.log("");
    console.log("ALERTS");
    for (const a of alerts.slice(0, 10)) {
      console.log(`  ! ${a}`);
    }
    if (alerts.length > 10) {
      console.log(`  ... and ${alerts.length - 10} more`);
    }
  }

  // Summary
  console.log("");
  console.log("SUMMARY");
  console.log(`  ${activeRules.length} active rules (>20% relevance)`);
  console.log(`  ${lowRules.length} low relevance rules (<20%)`);
  console.log(`  ${deadRules.length} dead rules (0%)`);
  if (rel.skills.length > 0) {
    const usedSkills = rel.skills.filter((s) => s.callCount > 0);
    const unusedSkills = rel.skills.filter((s) => s.callCount === 0);
    console.log(`  ${usedSkills.length} active skills, ${unusedSkills.length} unused`);
  }
  console.log("");
}

function makeBar(percent: number): string {
  const filled = Math.round(percent / 5);
  return "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
}
