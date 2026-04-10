import { RuleFile, OverlapResult, DirectiveOverlap } from "../types.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "and", "but", "or", "not", "no", "if", "then",
  "than", "that", "this", "it", "its", "all", "each", "every", "any",
  "use", "using", "used",
]);

const MAX_DIRECTIVE_RESULTS = 50;

export function analyzeOverlap(files: RuleFile[]): {
  duplicates: OverlapResult[];
  directiveOverlaps: DirectiveOverlap[];
} {
  const duplicates = findDuplicateFiles(files);
  const directiveOverlaps = findDirectiveOverlaps(files);
  return { duplicates, directiveOverlaps };
}

function findDuplicateFiles(files: RuleFile[]): OverlapResult[] {
  const results: OverlapResult[] = [];

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      // Skip if same base filename (intentional per-language copies)
      const baseA = files[i].filename.split("/").pop();
      const baseB = files[j].filename.split("/").pop();
      if (baseA === baseB) continue;

      const wordsA = extractKeywords(files[i].content);
      const wordsB = extractKeywords(files[j].content);
      const sim = jaccard(wordsA, wordsB);
      if (sim >= 0.5) {
        results.push({
          fileA: files[i].filename,
          fileB: files[j].filename,
          similarity: Math.round(sim * 100),
        });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

function findDirectiveOverlaps(files: RuleFile[]): DirectiveOverlap[] {
  // Index directives by keyword hash for fast lookup instead of N^2
  const index = new Map<string, { file: string; directive: string }[]>();

  for (const file of files) {
    for (const d of file.directives) {
      const keywords = extractKeywords(d);
      // Use sorted keywords as a rough hash
      const key = [...keywords].sort().join("|");
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push({ file: file.filename, directive: d });
    }
  }

  const results: DirectiveOverlap[] = [];
  const seen = new Set<string>();

  // Exact keyword matches (fastest, highest confidence)
  for (const [, entries] of index) {
    if (entries.length < 2) continue;
    // Only compare across different files
    for (let i = 0; i < entries.length && results.length < MAX_DIRECTIVE_RESULTS; i++) {
      for (let j = i + 1; j < entries.length && results.length < MAX_DIRECTIVE_RESULTS; j++) {
        if (entries[i].file === entries[j].file) continue;
        const pairKey = [entries[i].file, entries[j].file, entries[i].directive].sort().join("||");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        results.push({
          fileA: entries[i].file,
          directiveA: entries[i].directive,
          fileB: entries[j].file,
          directiveB: entries[j].directive,
          similarity: 100,
        });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
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
