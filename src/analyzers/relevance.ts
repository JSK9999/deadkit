import { RuleFile } from "../types.js";
import {
  collectPerSessionExtensions,
  type SessionExtensions,
} from "./usage.js";

export interface RuleRelevance {
  file: string;
  relevantSessions: number;
  totalSessions: number;
  percent: number;
  status: "active" | "low" | "dead";
}

export interface SkillRelevance {
  name: string;
  callCount: number;
  totalSessions: number;
  percent: number;
  status: "active" | "low" | "unused";
}

export interface RelevanceReport {
  totalSessions: number;
  rules: RuleRelevance[];
  skills: SkillRelevance[];
}

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

export async function analyzeRelevance(
  files: RuleFile[],
  skillUsage: Array<{ name: string; callCount: number }>,
): Promise<RelevanceReport> {
  const sessions = await collectPerSessionExtensions();
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return { totalSessions: 0, rules: [], skills: [] };
  }

  const rules = calculateRuleRelevance(files, sessions, totalSessions);
  const skills = calculateSkillRelevance(
    skillUsage,
    totalSessions,
  );

  return { totalSessions, rules, skills };
}

function calculateRuleRelevance(
  files: RuleFile[],
  sessions: SessionExtensions[],
  totalSessions: number,
): RuleRelevance[] {
  const results: RuleRelevance[] = [];

  for (const file of files) {
    const domain = detectDomain(file);

    if (!domain) {
      // Generic rule — relevant to all sessions
      results.push({
        file: file.filename,
        relevantSessions: totalSessions,
        totalSessions,
        percent: 100,
        status: "active",
      });
      continue;
    }

    // Count sessions that edited files of this language
    let relevant = 0;
    for (const session of sessions) {
      const hasMatch = domain.extensions.some((ext) =>
        session.extensions.has(ext),
      );
      if (hasMatch) relevant++;
    }

    const percent = Math.round((relevant / totalSessions) * 100);
    const status =
      percent === 0 ? "dead" : percent < 20 ? "low" : "active";

    results.push({
      file: file.filename,
      relevantSessions: relevant,
      totalSessions,
      percent,
      status,
    });
  }

  return results.sort((a, b) => b.percent - a.percent);
}

function calculateSkillRelevance(
  skillUsage: Array<{ name: string; callCount: number }>,
  totalSessions: number,
): SkillRelevance[] {
  return skillUsage
    .map((s) => {
      const percent = Math.round(
        (Math.min(s.callCount, totalSessions) / totalSessions) * 100,
      );
      const status: "active" | "low" | "unused" =
        s.callCount === 0
          ? "unused"
          : percent < 10
            ? "low"
            : "active";
      return {
        name: s.name,
        callCount: s.callCount,
        totalSessions,
        percent,
        status,
      };
    })
    .sort((a, b) => b.percent - a.percent);
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
