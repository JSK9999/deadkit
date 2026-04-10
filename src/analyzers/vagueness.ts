import { RuleFile, VagueDirective } from "../types.js";

const VAGUE_THRESHOLD = 20;

const ABSTRACT_WORDS = new Set([
  "good", "clean", "proper", "appropriate", "suitable", "nice",
  "better", "best", "right", "correct", "reasonable", "adequate",
  "effective", "efficient", "optimal", "ideal",
]);

export function analyzeVagueness(files: RuleFile[]): VagueDirective[] {
  const results: VagueDirective[] = [];

  for (const file of files) {
    for (const directive of file.directives) {
      const score = scoreActionability(directive);
      if (score < VAGUE_THRESHOLD) {
        results.push({ file: file.filename, directive, score });
      }
    }
  }

  return results.sort((a, b) => a.score - b.score);
}

function scoreActionability(directive: string): number {
  let score = 50; // baseline

  // Concrete file/tool/pattern names
  if (/\.[a-z]{2,4}\b/.test(directive)) score += 15;
  if (/[A-Z][a-z]+(?:[A-Z][a-z]+)+/.test(directive)) score += 10; // CamelCase

  // Has measurable threshold
  if (/\d+/.test(directive)) score += 20;
  if (/[<>]=?\s*\d+/.test(directive)) score += 10;

  // Has code example or format
  if (/`[^`]+`/.test(directive)) score += 15;

  // NEVER/ALWAYS absolutes
  if (/\b(?:never|always|must)\b/i.test(directive)) score += 10;

  // Too short without specifics
  if (directive.split(/\s+/).length < 5) score -= 20;

  // Too abstract
  const words = directive.toLowerCase().split(/\s+/);
  const abstractCount = words.filter((w) => ABSTRACT_WORDS.has(w)).length;
  if (abstractCount >= 2) score -= 30;
  if (abstractCount === 1) score -= 10;

  // No verb (not actionable)
  if (!/\b(?:use|add|create|remove|avoid|check|run|write|read|test|validate|apply|set|keep|ensure)\b/i.test(directive)) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}
