import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

interface HistoryEntry {
  ts: string;
  tool: string;
  ext?: string;
  skill?: string;
}

interface DaySummary {
  date: string;
  edits: number;
  skillCalls: number;
  extensions: Map<string, number>;
  skills: Map<string, number>;
}

export async function runTrend(jsonMode: boolean): Promise<void> {
  const historyPath = join(homedir(), ".deadkit", "history.jsonl");

  if (!existsSync(historyPath)) {
    console.log("No data yet. Run 'deadkit init' first, then use Claude Code.");
    console.log("Data will appear after a few sessions.");
    process.exit(0);
  }

  const content = await readFile(historyPath, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  if (lines.length === 0) {
    console.log("No data collected yet. Use Claude Code and check back.");
    process.exit(0);
  }

  const entries: HistoryEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }

  const days = groupByDay(entries);

  if (jsonMode) {
    const output = days.map((d) => ({
      date: d.date,
      edits: d.edits,
      skillCalls: d.skillCalls,
      topExtensions: [...d.extensions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topSkills: [...d.skills.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  printTrend(days, entries.length);
}

function groupByDay(entries: HistoryEntry[]): DaySummary[] {
  const dayMap = new Map<string, DaySummary>();

  for (const entry of entries) {
    const date = entry.ts.split("T")[0];
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        edits: 0,
        skillCalls: 0,
        extensions: new Map(),
        skills: new Map(),
      });
    }

    const day = dayMap.get(date)!;

    if (entry.tool === "Edit" || entry.tool === "Write") {
      day.edits++;
      if (entry.ext) {
        day.extensions.set(entry.ext, (day.extensions.get(entry.ext) || 0) + 1);
      }
    }

    if (entry.tool === "Skill" && entry.skill) {
      day.skillCalls++;
      day.skills.set(entry.skill, (day.skills.get(entry.skill) || 0) + 1);
    }
  }

  return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function printTrend(days: DaySummary[], totalEvents: number): void {
  console.log("");
  console.log("deadkit trend");
  console.log("=============");
  console.log(`Total events: ${totalEvents} across ${days.length} day(s)`);
  console.log("");

  // Daily activity chart
  console.log("DAILY ACTIVITY");
  const maxEdits = Math.max(...days.map((d) => d.edits), 1);
  for (const day of days.slice(-14)) {
    const bar = "\u2588".repeat(Math.round((day.edits / maxEdits) * 30));
    const skillInfo = day.skillCalls > 0 ? ` (${day.skillCalls} skill calls)` : "";
    console.log(`  ${day.date}  ${bar} ${day.edits} edits${skillInfo}`);
  }

  // Top extensions across all days
  const allExts = new Map<string, number>();
  const allSkills = new Map<string, number>();
  for (const day of days) {
    for (const [ext, count] of day.extensions) {
      allExts.set(ext, (allExts.get(ext) || 0) + count);
    }
    for (const [skill, count] of day.skills) {
      allSkills.set(skill, (allSkills.get(skill) || 0) + count);
    }
  }

  console.log("");
  console.log("TOP LANGUAGES");
  const sortedExts = [...allExts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [ext, count] of sortedExts.slice(0, 8)) {
    console.log(`  ${ext.padEnd(8)} ${count} edits`);
  }

  if (allSkills.size > 0) {
    console.log("");
    console.log("SKILL USAGE");
    const sortedSkills = [...allSkills.entries()].sort((a, b) => b[1] - a[1]);
    for (const [skill, count] of sortedSkills) {
      console.log(`  /${skill.padEnd(20)} ${count} calls`);
    }
  }

  console.log("");
}
