import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { RuleFile } from "../types.js";

export interface UsageResult {
  file: string;
  domain: string;
  reason: string;
}

export interface UsageStats {
  sessionsScanned: number;
  extensionsFound: Map<string, number>;
  deadRules: UsageResult[];
}

// Map rule files to their target domain
const DOMAIN_PATTERNS: Array<{
  name: string;
  match: RegExp;
  extensions: string[];
}> = [
  { name: "Python", match: /python|pytorch/i, extensions: [".py", ".pyx", ".pyi"] },
  { name: "TypeScript", match: /typescript/i, extensions: [".ts", ".tsx"] },
  { name: "JavaScript/Web", match: /javascript|web/i, extensions: [".js", ".jsx", ".ts", ".tsx", ".html", ".css"] },
  { name: "Rust", match: /rust/i, extensions: [".rs"] },
  { name: "Go", match: /golang|\/go\/|go-build|go-reviewer/i, extensions: [".go"] },
  { name: "Java", match: /java\b/i, extensions: [".java"] },
  { name: "Kotlin", match: /kotlin/i, extensions: [".kt", ".kts"] },
  { name: "Swift", match: /swift/i, extensions: [".swift"] },
  { name: "Dart/Flutter", match: /dart|flutter/i, extensions: [".dart"] },
  { name: "C#", match: /csharp|c#|\.cs/i, extensions: [".cs"] },
  { name: "C++", match: /cpp|c\+\+/i, extensions: [".cpp", ".cc", ".h", ".hpp"] },
  { name: "PHP", match: /php/i, extensions: [".php"] },
  { name: "Perl", match: /perl/i, extensions: [".pl", ".pm"] },
  { name: "Ruby", match: /ruby/i, extensions: [".rb"] },
];

export async function analyzeUsage(
  files: RuleFile[],
): Promise<UsageStats> {
  const editedExtensions = await collectEditedExtensions();

  const sessionsScanned = editedExtensions.sessionCount;
  const extensionsFound = editedExtensions.counts;

  if (sessionsScanned === 0) {
    return { sessionsScanned: 0, extensionsFound, deadRules: [] };
  }

  const deadRules: UsageResult[] = [];

  for (const rule of files) {
    const domain = detectDomain(rule);
    if (!domain) continue;

    const hasActivity = domain.extensions.some(
      (ext) => extensionsFound.has(ext),
    );

    if (!hasActivity) {
      deadRules.push({
        file: rule.filename,
        domain: domain.name,
        reason: `No ${domain.name} files edited in ${sessionsScanned} sessions`,
      });
    }
  }

  return { sessionsScanned, extensionsFound, deadRules };
}

function detectDomain(
  rule: RuleFile,
): { name: string; extensions: string[] } | null {
  const text = rule.filename + " " + rule.path;
  for (const dp of DOMAIN_PATTERNS) {
    if (dp.match.test(text)) {
      return { name: dp.name, extensions: dp.extensions };
    }
  }
  return null;
}

interface ExtensionData {
  sessionCount: number;
  counts: Map<string, number>;
}

async function collectEditedExtensions(): Promise<ExtensionData> {
  const claudeDir = join(homedir(), ".claude", "projects");
  if (!existsSync(claudeDir)) {
    return { sessionCount: 0, counts: new Map() };
  }

  const counts = new Map<string, number>();
  let sessionCount = 0;

  const projects = await readdir(claudeDir);

  for (const project of projects) {
    const projectDir = join(claudeDir, project);
    const files = await safeReaddir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    for (const jsonlFile of jsonlFiles) {
      sessionCount++;
      const filePath = join(projectDir, jsonlFile);
      const extensions = await extractExtensionsFromLog(filePath);
      for (const ext of extensions) {
        counts.set(ext, (counts.get(ext) || 0) + 1);
      }
    }
  }

  return { sessionCount, counts };
}

async function extractExtensionsFromLog(
  logPath: string,
): Promise<Set<string>> {
  const extensions = new Set<string>();

  try {
    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type !== "assistant" || !obj.message?.content) continue;

        for (const block of obj.message.content) {
          if (block.type !== "tool_use") continue;
          if (block.name !== "Edit" && block.name !== "Write") continue;

          const filePath = block.input?.file_path;
          if (!filePath || typeof filePath !== "string") continue;

          const ext = extname(filePath).toLowerCase();
          if (ext && ext !== ".md" && ext !== ".json" && ext !== ".txt") {
            extensions.add(ext);
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // skip unreadable files
  }

  return extensions;
}

export interface SessionExtensions {
  sessionId: string;
  extensions: Set<string>;
}

export async function collectPerSessionExtensions(): Promise<SessionExtensions[]> {
  const claudeDir = join(homedir(), ".claude", "projects");
  if (!existsSync(claudeDir)) return [];

  const sessions: SessionExtensions[] = [];
  const projects = await readdir(claudeDir);

  for (const project of projects) {
    const projectDir = join(claudeDir, project);
    const files = await safeReaddir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    for (const jsonlFile of jsonlFiles) {
      const filePath = join(projectDir, jsonlFile);
      const extensions = await extractExtensionsFromLog(filePath);
      if (extensions.size > 0) {
        sessions.push({ sessionId: jsonlFile, extensions });
      }
    }
  }

  return sessions;
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
