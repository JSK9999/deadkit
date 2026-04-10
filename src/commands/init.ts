import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const HOOK_SCRIPT = `#!/usr/bin/env node
// deadkit collector — logs Edit/Write/Skill tool calls
const fs = require("fs");
const path = require("path");

const dataDir = path.join(require("os").homedir(), ".deadkit");
const historyFile = path.join(dataDir, "history.jsonl");

try {
  const input = JSON.parse(fs.readFileSync("/dev/stdin", "utf8"));
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};

  // Only track Edit, Write, Skill calls
  if (!["Edit", "Write", "Skill"].includes(toolName)) process.exit(0);

  const entry = {
    ts: new Date().toISOString(),
    tool: toolName,
    session: process.env.SESSION_ID || "unknown",
    cwd: process.env.CWD || process.cwd(),
  };

  if (toolName === "Edit" || toolName === "Write") {
    const filePath = toolInput.file_path || "";
    entry.ext = path.extname(filePath).toLowerCase();
    entry.file = filePath;
  }

  if (toolName === "Skill") {
    entry.skill = toolInput.skill || "unknown";
  }

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(historyFile, JSON.stringify(entry) + "\\n");
} catch {
  // Silent fail — never break the user's workflow
  process.exit(0);
}
`;

export async function runInit(): Promise<void> {
  const deadkitDir = join(homedir(), ".deadkit");
  const scriptPath = join(deadkitDir, "collect.cjs");
  const settingsPath = join(homedir(), ".claude", "settings.json");

  // 1. Create ~/.deadkit/ and write collector script
  if (!existsSync(deadkitDir)) {
    await mkdir(deadkitDir, { recursive: true });
  }
  await writeFile(scriptPath, HOOK_SCRIPT, { mode: 0o755 });

  // 2. Read existing settings
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    const raw = await readFile(settingsPath, "utf-8");
    settings = JSON.parse(raw);
  }

  // 3. Add PostToolUse hook if not present
  const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
  const hookCommand = `node ${scriptPath}`;

  const existing = hooks.PostToolUse as Array<{
    hooks: Array<{ command: string }>;
  }> | undefined;

  const alreadyInstalled = existing?.some((group) =>
    group.hooks?.some((h) => h.command?.includes("deadkit")),
  );

  if (alreadyInstalled) {
    console.log("deadkit hook is already installed.");
    console.log(`Data will be collected at: ~/.deadkit/history.jsonl`);
    return;
  }

  if (!hooks.PostToolUse) {
    hooks.PostToolUse = [];
  }

  (hooks.PostToolUse as unknown[]).push({
    hooks: [
      {
        type: "command",
        command: hookCommand,
      },
    ],
  });

  settings.hooks = hooks;

  // 4. Write back settings
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  console.log("deadkit initialized!");
  console.log("");
  console.log("  Hook installed: PostToolUse");
  console.log(`  Script: ${scriptPath}`);
  console.log(`  Data: ~/.deadkit/history.jsonl`);
  console.log("");
  console.log("Every Edit, Write, and Skill call will be tracked.");
  console.log("Run 'deadkit trend' after a few sessions to see trends.");
}
