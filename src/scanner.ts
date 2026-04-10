import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { existsSync, statSync } from "node:fs";

export interface ScanResult {
  path: string;
  scope: "global" | "project";
}

export interface SkillScanResult {
  name: string;
  path: string;
  description: string;
  tokenCount: number;
}

export async function scanRuleFiles(
  cwd: string,
  customPaths: string[] = [],
): Promise<ScanResult[]> {
  // Custom paths take priority — skip default scanning
  if (customPaths.length > 0) {
    const results: ScanResult[] = [];
    for (const p of customPaths) {
      const abs = resolve(p);
      if (!existsSync(abs)) continue;
      if (statSync(abs).isDirectory()) {
        const files = await scanDirRecursive(abs, "project");
        results.push(...files);
      } else {
        results.push({ path: abs, scope: "project" });
      }
    }
    return results;
  }

  const results: ScanResult[] = [];

  // Global rules: ~/.claude/rules/*.md
  const globalDir = join(homedir(), ".claude", "rules");
  const globalFiles = await scanDir(globalDir, "global");
  results.push(...globalFiles);

  // Project rules: .claude/rules/*.md
  const projectDir = join(cwd, ".claude", "rules");
  const projectFiles = await scanDir(projectDir, "project");
  results.push(...projectFiles);

  // Project CLAUDE.md
  const claudeMd = join(cwd, "CLAUDE.md");
  if (existsSync(claudeMd)) {
    results.push({ path: claudeMd, scope: "project" });
  }

  // Cursor rules
  const cursorRules = join(cwd, ".cursorrules");
  if (existsSync(cursorRules)) {
    results.push({ path: cursorRules, scope: "project" });
  }

  return results;
}

async function scanDir(
  dir: string,
  scope: "global" | "project",
): Promise<ScanResult[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ path: join(dir, f), scope }));
}

export async function scanSkills(): Promise<SkillScanResult[]> {
  const skillsDir = join(homedir(), ".claude", "skills");
  if (!existsSync(skillsDir)) return [];

  const entries = await readdir(skillsDir);
  const results: SkillScanResult[] = [];

  for (const name of entries) {
    const fullPath = join(skillsDir, name);
    // Resolve symlinks — skills are often symlinked from plugins
    if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) continue;
    const skillMd = join(fullPath, "SKILL.md");
    if (!existsSync(skillMd)) continue;

    const content = await readFile(skillMd, "utf-8");
    const skillName = extractField(content, "name") || name;
    const description = extractField(content, "description") || "";
    const tokenCount = Math.ceil(description.length / 4);

    results.push({ name: skillName, path: skillMd, description, tokenCount });
  }

  return results;
}

function extractField(content: string, field: string): string {
  const match = content.match(
    new RegExp(`^${field}:\\s*\\|?\\s*\\n((?:\\s+.+\\n?)*)`, "m"),
  );
  if (match) return match[1].trim();

  const simple = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return simple ? simple[1].trim() : "";
}

async function scanDirRecursive(
  dir: string,
  scope: "global" | "project",
): Promise<ScanResult[]> {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const results: ScanResult[] = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await scanDirRecursive(full, scope);
      results.push(...sub);
    } else if (entry.name.endsWith(".md")) {
      results.push({ path: full, scope });
    }
  }

  return results;
}
