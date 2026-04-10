import { RuleFile, StaleRule } from "../types.js";

const STALE_DAYS = 90;

export function analyzeStaleness(files: RuleFile[]): StaleRule[] {
  const now = Date.now();

  return files
    .map((f) => ({
      file: f.filename,
      daysSinceModified: Math.floor(
        (now - f.mtime.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }))
    .filter((r) => r.daysSinceModified >= STALE_DAYS)
    .sort((a, b) => b.daysSinceModified - a.daysSinceModified);
}
