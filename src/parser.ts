import { RuleFile } from "./types.js";
import { stat, readFile } from "node:fs/promises";
import { relative } from "node:path";
import { homedir } from "node:os";

export async function parseRuleFile(
  path: string,
  scope: "global" | "project",
): Promise<RuleFile> {
  const content = await readFile(path, "utf-8");
  const filename = shortName(path);
  const fileStat = await stat(path);

  const { frontmatter, body } = extractFrontmatter(content);
  const directives = extractDirectives(body);
  const tokenCount = Math.ceil(content.length / 4);

  return {
    path,
    filename,
    scope,
    content,
    frontmatter,
    directives,
    tokenCount,
    mtime: fileStat.mtime,
  };
}

function extractFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const raw = match[1];
  const body = match[2];
  const frontmatter: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key) frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function shortName(filePath: string): string {
  const home = homedir();
  if (filePath.startsWith(home)) {
    return "~/" + relative(home, filePath);
  }
  const cwd = process.cwd();
  if (filePath.startsWith(cwd)) {
    return relative(cwd, filePath);
  }
  // For custom paths, show last 2 segments
  const parts = filePath.split("/");
  return parts.slice(-2).join("/");
}

function extractDirectives(body: string): string[] {
  const directives: string[] = [];
  let inCodeBlock = false;

  for (const line of body.split("\n")) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const trimmed = line.trim();
    const match =
      trimmed.match(/^[-*]\s+(.+)$/) ?? trimmed.match(/^\d+\.\s+(.+)$/);
    if (match) {
      let text = match[1].replace(/\*\*/g, "").trim();
      // Strip checkbox markers
      text = text.replace(/^\[[ x]\]\s*/i, "").trim();
      if (text.length > 20 && isDirective(text)) directives.push(text);
    }
  }

  return directives;
}

function isDirective(text: string): boolean {
  // Skip labels/categories (no verb, just a noun phrase)
  const words = text.split(/\s+/);
  if (words.length <= 3) return false;

  // Must contain a verb or actionable keyword
  const hasVerb = /\b(?:use|add|create|remove|avoid|check|run|write|read|test|validate|apply|set|keep|ensure|never|always|must|should|don't|do not|implement|configure|enable|disable|include|exclude|prefer|require|prevent|handle|return|throw|log|call|pass|send|receive|store|load|save|delete|update|verify|confirm|follow|maintain)\b/i.test(text);

  // Or contains technical specifics
  const hasTechnical = /[`<>{}()\[\]\/\\]|=>|->|\.\w+\b/.test(text);

  return hasVerb || hasTechnical;
}
