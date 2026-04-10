# deadkit

**Find dead rules and unused skills in your AI coding setup.**

> You installed 5 skills and 136 rules. How many actually work for you?
>
> We tested [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) against 34 real sessions:
> **61 rules were dead. 5 skills never called. 90K tokens wasted — 45% of your context window, gone.**

**[한국어 README](README.ko.md)**

## Demo

![deadkit demo](demo/demo.gif)

## Quick Start

```bash
npx deadkit
```

No API keys. No setup. No runtime dependencies.

## What it finds

### Rules (passive — always loaded)

| Check | What it finds |
|-------|--------------|
| **Dead rules** | Rules for languages you never use (based on session logs) |
| **Duplicates** | Rules that overlap with each other |
| **Overlapping directives** | Same instruction copied across multiple files |
| **Claude defaults** | Rules that repeat Claude's built-in behavior |
| **Vague directives** | Instructions too abstract to be actionable |
| **Token cost** | How many tokens each rule file consumes |
| **Stale rules** | Rules not modified in 90+ days |

### Skills (active — user calls them)

| Check | What it finds |
|-------|--------------|
| **Never used** | Skills installed but never called |
| **Usage stats** | How often each skill is called, when last used |
| **Overlapping** | Skills with similar descriptions (Claude may confuse them) |
| **Description cost** | Token cost of skill descriptions (loaded every session) |

## How it works

**Dead rules**: deadkit reads Claude Code session logs (`~/.claude/projects/*/*.jsonl`). It extracts which file types you edit from `Edit`/`Write` tool calls, then cross-references with your rules. Python rules + zero `.py` edits = dead.

**Unused skills**: deadkit searches session logs for `Skill` tool calls. Skills installed but never invoked = unused. Skills with overlapping descriptions may cause Claude to pick the wrong one.

**Why it matters**: Every rule is loaded into every prompt. Every skill description is loaded too. Dead rules and unused skills waste your context window silently.

## Example Output

```
$ npx deadkit

deadkit v0.1.0
===============

Scanned: 5 rules (5 global, 0 project), 5 skills
Total token cost: ~1,622 tokens (0.8% of context)

DEAD RULES (based on 34 sessions across all projects)
  Languages you actually use:
    .ts      7 file edits
    .tsx     7 file edits
    .py      4 file edits
  No dead rules found — all rules match your usage.

SKILLS (5 installed, ~669 description tokens)

  Never used:
    /investigate — never called
    /office-hours — never called
    /qa — never called

SUMMARY
  5 UNUSED skill(s) — installed but never called
  1 overlapping directive(s)
  3 redundant with Claude defaults
```

## Two modes

| | Local (`npx deadkit`) | CI (GitHub Action / GitLab) |
|---|---|---|
| Dead rules (session logs) | O | X (no logs in CI) |
| Unused skills (session logs) | O | X (no logs in CI) |
| Duplicates / Overlaps | O | O |
| Claude defaults | O | O |
| Token cost | O | O |

**Local** finds dead rules and unused skills from your history. **CI** catches duplicates and token bloat on every PR.

## GitHub Action

```yaml
# .github/workflows/deadkit.yml
name: Rule Health Check
on: [pull_request]

permissions:
  pull-requests: write
  contents: read

jobs:
  deadkit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: JSK9999/deadkit@main
        with:
          paths: '.claude/rules'
```

## GitLab CI

```yaml
# .gitlab-ci.yml
deadkit:
  stage: test
  image: node:20
  script:
    - npx deadkit .claude/rules --json > deadkit-report.json
    - cat deadkit-report.json
  artifacts:
    paths:
      - deadkit-report.json
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## CLI Options

```bash
npx deadkit                    # Default scan
npx deadkit ./rules/ ./agents/ # Custom paths
npx deadkit --json             # JSON output for CI/CD
```

## What it scans

- `~/.claude/rules/*.md` (global rules)
- `~/.claude/skills/*/SKILL.md` (installed skills)
- `.claude/rules/*.md` (project rules)
- `CLAUDE.md` (project root)
- `.cursorrules` (Cursor)

## Roadmap: From Linter to Observability

deadkit is evolving from a one-shot linter into a full **AI coding infra observability** layer.

### Phase 1: Linter (current)
- [x] Dead rule detection (session log analysis)
- [x] Unused skill detection
- [x] Duplicate / overlap / vagueness analysis
- [x] Token cost breakdown
- [x] `--json` output
- [x] GitHub Action / GitLab CI

### Phase 2: Continuous Collection
- [ ] `deadkit init` — install Claude Code hook for automatic per-session data collection
- [ ] `.deadkit/history.json` — persistent metrics store across sessions
- [ ] Per-rule hit tracking (which rules actually influenced responses)
- [ ] Per-skill call frequency with timestamps

### Phase 3: Trends & Alerts
- [ ] `deadkit trend` — weekly/monthly token usage trends
- [ ] `deadkit trend --chart` — terminal chart visualization
- [ ] Token budget threshold — block PR if rules exceed N tokens
- [ ] Skill drift detection — alert when skill usage pattern changes

### Phase 4: Dashboard & Team
- [ ] `deadkit dashboard` — web UI for rule/skill health
- [ ] Team-wide rule analytics (aggregated across members)
- [ ] Rule effectiveness scoring (did this rule improve code quality?)
- [ ] Cross-tool comparison (Claude Code vs Cursor vs Codex)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

## License

Apache 2.0
