import { RuleFile, DefaultMatch } from "../types.js";

interface DefaultPattern {
  pattern: RegExp;
  reason: string;
}

const CLAUDE_DEFAULTS: DefaultPattern[] = [
  {
    pattern: /read.*(?:file|code|related).*before/i,
    reason: "Claude Code already reads files before editing by default",
  },
  {
    pattern: /parameterized\s+quer/i,
    reason: "Claude already uses parameterized queries by default",
  },
  {
    pattern: /use\s+https/i,
    reason: "Claude defaults to HTTPS in generated code",
  },
  {
    pattern: /don'?t\s+(?:add|use)\s+emoji/i,
    reason: "Claude Code does not use emojis unless asked",
  },
  {
    pattern: /avoid\s+(?:unnecessary|premature)\s+(?:abstraction|optimization)/i,
    reason: "Claude Code system prompt already discourages premature abstraction",
  },
  {
    pattern: /prefer\s+edit.*over.*(?:write|create)/i,
    reason: "Claude Code already prefers editing existing files",
  },
  {
    pattern: /keep\s+(?:response|output)s?\s+(?:short|concise|brief)/i,
    reason: "Claude Code already aims for concise responses",
  },
  {
    pattern: /don'?t\s+(?:create|add)\s+(?:unnecessary|extra)\s+files/i,
    reason: "Claude Code already avoids creating unnecessary files",
  },
  {
    pattern: /validate\s+(?:all\s+)?(?:external\s+)?inputs/i,
    reason: "Claude validates inputs in generated code by default",
  },
  {
    pattern: /(?:escape|encode|sanitize)\s+(?:output|html)/i,
    reason: "Claude applies output encoding by default",
  },
  {
    pattern: /don'?t\s+(?:add|include)\s+(?:comments|docstrings)\s+(?:to|for)\s+(?:code\s+)?(?:you\s+)?didn'?t/i,
    reason: "Claude Code already avoids adding comments to unchanged code",
  },
  {
    pattern: /don'?t\s+(?:make|suggest)\s+(?:changes|improvements)\s+beyond/i,
    reason: "Claude Code already limits changes to what was requested",
  },
];

export function analyzeDefaults(files: RuleFile[]): DefaultMatch[] {
  const matches: DefaultMatch[] = [];

  for (const file of files) {
    for (const directive of file.directives) {
      for (const def of CLAUDE_DEFAULTS) {
        if (def.pattern.test(directive)) {
          matches.push({
            file: file.filename,
            directive,
            reason: def.reason,
          });
          break;
        }
      }
    }
  }

  return matches;
}
