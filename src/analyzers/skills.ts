import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { SkillScanResult } from "../scanner.js";

export interface SkillUsage {
  name: string;
  callCount: number;
  lastUsed: string | null;
}

export interface SkillAnalysis {
  totalSkills: number;
  totalDescriptionTokens: number;
  neverUsed: SkillScanResult[];
  usage: SkillUsage[];
  overlapping: Array<{ skillA: string; skillB: string; similarity: number }>;
}

export async function analyzeSkills(
  skills: SkillScanResult[],
): Promise<SkillAnalysis> {
  const callCounts = await collectSkillCalls();
  const usage: SkillUsage[] = [];
  const neverUsed: SkillScanResult[] = [];

  for (const skill of skills) {
    const calls = callCounts.get(skill.name);
    if (!calls || calls.count === 0) {
      neverUsed.push(skill);
      usage.push({ name: skill.name, callCount: 0, lastUsed: null });
    } else {
      usage.push({
        name: skill.name,
        callCount: calls.count,
        lastUsed: calls.lastUsed,
      });
    }
  }

  const overlapping = findOverlappingSkills(skills);
  const totalDescriptionTokens = skills.reduce(
    (sum, s) => sum + s.tokenCount,
    0,
  );

  return {
    totalSkills: skills.length,
    totalDescriptionTokens,
    neverUsed: neverUsed.sort((a, b) => a.name.localeCompare(b.name)),
    usage: usage.sort((a, b) => b.callCount - a.callCount),
    overlapping,
  };
}

interface CallData {
  count: number;
  lastUsed: string;
}

async function collectSkillCalls(): Promise<Map<string, CallData>> {
  const claudeDir = join(homedir(), ".claude", "projects");
  if (!existsSync(claudeDir)) return new Map();

  const counts = new Map<string, CallData>();
  const projects = await safeReaddir(claudeDir);

  for (const project of projects) {
    const projectDir = join(claudeDir, project);
    const files = await safeReaddir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    for (const jsonlFile of jsonlFiles) {
      const filePath = join(projectDir, jsonlFile);
      await extractSkillCallsFromLog(filePath, counts);
    }
  }

  return counts;
}

async function extractSkillCallsFromLog(
  logPath: string,
  counts: Map<string, CallData>,
): Promise<void> {
  try {
    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type !== "assistant" || !obj.message?.content) continue;

        for (const block of obj.message.content) {
          if (block.type !== "tool_use" || block.name !== "Skill") continue;
          const skillName = block.input?.skill;
          if (!skillName || typeof skillName !== "string") continue;

          const existing = counts.get(skillName);
          const ts = obj.timestamp || "";
          if (existing) {
            existing.count++;
            if (ts > existing.lastUsed) existing.lastUsed = ts;
          } else {
            counts.set(skillName, { count: 1, lastUsed: ts });
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // skip unreadable files
  }
}

function findOverlappingSkills(
  skills: SkillScanResult[],
): Array<{ skillA: string; skillB: string; similarity: number }> {
  const results: Array<{
    skillA: string;
    skillB: string;
    similarity: number;
  }> = [];

  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const wordsA = extractWords(skills[i].description);
      const wordsB = extractWords(skills[j].description);
      const sim = jaccard(wordsA, wordsB);
      if (sim >= 0.5) {
        results.push({
          skillA: skills[i].name,
          skillB: skills[j].name,
          similarity: Math.round(sim * 100),
        });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
