import { RuleFile, CostEntry } from "../types.js";

const CONTEXT_WINDOW = 200_000;

export function analyzeCost(files: RuleFile[]): CostEntry[] {
  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);

  return files
    .map((f) => ({
      file: f.filename,
      tokens: f.tokenCount,
      percent: totalTokens > 0
        ? Math.round((f.tokenCount / totalTokens) * 100)
        : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);
}

export function contextPercent(files: RuleFile[]): string {
  const total = files.reduce((sum, f) => sum + f.tokenCount, 0);
  return ((total / CONTEXT_WINDOW) * 100).toFixed(1);
}
