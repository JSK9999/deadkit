import { AnalysisResult } from "./types.js";

const MAX_ITEMS = 10;

export function printReport(result: AnalysisResult): void {
  const { totalFiles, globalCount, projectCount, totalTokens } = result;

  const skillCount = result.skills?.totalSkills ?? 0;
  const skillTokens = result.skills?.totalDescriptionTokens ?? 0;
  const allTokens = totalTokens + skillTokens;

  console.log("");
  console.log("deadkit v0.3.0");
  console.log("===============");
  console.log("");
  console.log(
    `Scanned: ${totalFiles} rules (${globalCount} global, ${projectCount} project)` +
      (skillCount > 0 ? `, ${skillCount} skills` : ""),
  );
  console.log(
    `Total token cost: ~${allTokens.toLocaleString()} tokens (${((allTokens / 200_000) * 100).toFixed(1)}% of context)`,
  );

  printUsage(result);
  printSkills(result);
  printDuplicates(result);
  printDirectiveOverlaps(result);
  printDefaults(result);
  printVague(result);
  printCost(result);
  printStale(result);
  printSummary(result);
}

function printDuplicates(r: AnalysisResult): void {
  if (r.duplicates.length === 0) return;
  console.log("");
  console.log("DUPLICATES");
  const shown = r.duplicates.slice(0, MAX_ITEMS);
  for (const d of shown) {
    console.log(`  ${d.fileA} <-> ${d.fileB}  (${d.similarity}% overlap)`);
  }
  if (r.duplicates.length > MAX_ITEMS) {
    console.log(`  ... and ${r.duplicates.length - MAX_ITEMS} more`);
  }
}

function printDirectiveOverlaps(r: AnalysisResult): void {
  if (r.directiveOverlaps.length === 0) return;
  console.log("");
  console.log(
    `OVERLAPPING DIRECTIVES (${r.directiveOverlaps.length} found, showing top ${Math.min(r.directiveOverlaps.length, MAX_ITEMS)})`,
  );

  // Group by directive text to avoid repetitive output
  const grouped = groupOverlaps(r.directiveOverlaps);
  let count = 0;
  for (const [directive, files] of grouped) {
    if (count >= MAX_ITEMS) break;
    console.log(`  "${truncate(directive, 60)}"`);
    console.log(`  -> repeated in: ${files.join(", ")}`);
    console.log("");
    count++;
  }
  if (grouped.size > MAX_ITEMS) {
    console.log(`  ... and ${grouped.size - MAX_ITEMS} more patterns`);
  }
}

function groupOverlaps(
  overlaps: AnalysisResult["directiveOverlaps"],
): Map<string, string[]> {
  const groups = new Map<string, Set<string>>();

  for (const o of overlaps) {
    // Use the shorter directive as key
    const key = o.directiveA.length <= o.directiveB.length
      ? o.directiveA
      : o.directiveB;
    if (!groups.has(key)) groups.set(key, new Set());
    const set = groups.get(key)!;
    set.add(o.fileA);
    set.add(o.fileB);
  }

  // Sort by number of files (most repeated first)
  return new Map(
    [...groups.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .map(([k, v]) => [k, [...v]]),
  );
}

function printDefaults(r: AnalysisResult): void {
  if (r.defaultMatches.length === 0) return;
  console.log("");
  console.log("REDUNDANT WITH CLAUDE DEFAULTS");
  const shown = r.defaultMatches.slice(0, MAX_ITEMS);
  for (const m of shown) {
    console.log(`  ${m.file}: "${truncate(m.directive, 50)}"`);
    console.log(`  -> ${m.reason}`);
    console.log("");
  }
  if (r.defaultMatches.length > MAX_ITEMS) {
    console.log(`  ... and ${r.defaultMatches.length - MAX_ITEMS} more`);
  }
}

function printVague(r: AnalysisResult): void {
  if (r.vagueDirectives.length === 0) return;
  console.log("");
  console.log("VAGUE DIRECTIVES");
  const shown = r.vagueDirectives.slice(0, MAX_ITEMS);
  for (const v of shown) {
    console.log(
      `  ${v.file}: "${truncate(v.directive, 50)}"  (${v.score}/100)`,
    );
  }
  if (r.vagueDirectives.length > MAX_ITEMS) {
    console.log(`  ... and ${r.vagueDirectives.length - MAX_ITEMS} more`);
  }
}

function printCost(r: AnalysisResult): void {
  if (r.costBreakdown.length === 0) return;
  console.log("");
  console.log("TOKEN COST BREAKDOWN (top 10)");
  const maxNameLen = Math.max(
    ...r.costBreakdown.slice(0, MAX_ITEMS).map((c) => c.file.length),
  );
  const shown = r.costBreakdown.slice(0, MAX_ITEMS);
  for (const c of shown) {
    const bar = makeBar(c.percent);
    const name = c.file.padEnd(maxNameLen);
    console.log(
      `  ${name}  ~${String(c.tokens).padStart(5)} tokens  ${bar}  ${c.percent}%`,
    );
  }
  if (r.costBreakdown.length > MAX_ITEMS) {
    const rest = r.costBreakdown.slice(MAX_ITEMS);
    const restTokens = rest.reduce((s, c) => s + c.tokens, 0);
    console.log(
      `  ... ${rest.length} more files (~${restTokens.toLocaleString()} tokens)`,
    );
  }
}

function printStale(r: AnalysisResult): void {
  if (r.staleRules.length === 0) return;
  console.log("");
  console.log("STALE RULES (not modified in 90+ days)");
  const shown = r.staleRules.slice(0, MAX_ITEMS);
  for (const s of shown) {
    console.log(`  ${s.file}  (${s.daysSinceModified} days)`);
  }
  if (r.staleRules.length > MAX_ITEMS) {
    console.log(`  ... and ${r.staleRules.length - MAX_ITEMS} more`);
  }
}

function printSkills(r: AnalysisResult): void {
  if (!r.skills || r.skills.totalSkills === 0) return;

  console.log("");
  console.log(
    `SKILLS (${r.skills.totalSkills} installed, ~${r.skills.totalDescriptionTokens} description tokens)`,
  );

  if (r.skills.neverUsed.length > 0) {
    console.log("");
    console.log("  Never used:");
    const shown = r.skills.neverUsed.slice(0, MAX_ITEMS);
    for (const s of shown) {
      console.log(`    /${s.name} — never called`);
    }
    if (r.skills.neverUsed.length > MAX_ITEMS) {
      console.log(
        `    ... and ${r.skills.neverUsed.length - MAX_ITEMS} more`,
      );
    }
  }

  if (r.skills.usage.some((s) => s.callCount > 0)) {
    console.log("");
    console.log("  Used:");
    const used = r.skills.usage
      .filter((s) => s.callCount > 0)
      .slice(0, MAX_ITEMS);
    for (const s of used) {
      const last = s.lastUsed
        ? s.lastUsed.split("T")[0]
        : "unknown";
      console.log(`    /${s.name} — ${s.callCount} calls (last: ${last})`);
    }
  }

  if (r.skills.overlapping.length > 0) {
    console.log("");
    console.log("  Overlapping descriptions:");
    for (const o of r.skills.overlapping.slice(0, 5)) {
      console.log(
        `    /${o.skillA} <-> /${o.skillB} (${o.similarity}% similar)`,
      );
    }
  }
}

function printUsage(r: AnalysisResult): void {
  if (!r.usage) return;

  const { sessionsScanned, extensionsFound, deadRules } = r.usage;

  console.log("");
  console.log(`DEAD RULES (based on ${sessionsScanned} sessions across all projects)`);

  if (extensionsFound.length > 0) {
    console.log("  Languages you actually use:");
    const shown = extensionsFound.slice(0, 8);
    for (const [ext, count] of shown) {
      console.log(`    ${ext.padEnd(8)} ${count} file edits`);
    }
  }

  if (deadRules.length === 0) {
    console.log("  No dead rules found — all rules match your usage.");
  } else {
    console.log("");
    console.log("  Rules for languages you NEVER use:");
    for (const d of deadRules) {
      console.log(`    ${d.file}`);
      console.log(`    -> ${d.reason}`);
    }
  }
}

function printSummary(r: AnalysisResult): void {
  const issues =
    r.duplicates.length +
    r.directiveOverlaps.length +
    r.defaultMatches.length +
    r.vagueDirectives.length +
    r.staleRules.length +
    (r.usage?.deadRules.length ?? 0) +
    (r.skills?.neverUsed.length ?? 0);

  console.log("");
  console.log("SUMMARY");

  if (issues === 0) {
    console.log("  All rules and skills look healthy!");
  } else {
    if (r.usage && r.usage.deadRules.length > 0) {
      console.log(
        `  ${r.usage.deadRules.length} DEAD rule(s) — never relevant to your work`,
      );
    }
    if (r.skills && r.skills.neverUsed.length > 0) {
      console.log(
        `  ${r.skills.neverUsed.length} UNUSED skill(s) — installed but never called`,
      );
    }
    if (r.duplicates.length > 0) {
      console.log(`  ${r.duplicates.length} duplicate pair(s)`);
    }
    if (r.directiveOverlaps.length > 0) {
      console.log(`  ${r.directiveOverlaps.length} overlapping directive(s)`);
    }
    if (r.defaultMatches.length > 0) {
      console.log(
        `  ${r.defaultMatches.length} redundant with Claude defaults`,
      );
    }
    if (r.vagueDirectives.length > 0) {
      console.log(`  ${r.vagueDirectives.length} vague directive(s)`);
    }
    if (r.staleRules.length > 0) {
      console.log(`  ${r.staleRules.length} stale rule(s)`);
    }
  }

  console.log("");
}

function makeBar(percent: number): string {
  const filled = Math.round(percent / 10);
  return "\u2588".repeat(filled) + "\u2591".repeat(10 - filled);
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}
