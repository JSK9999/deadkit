# deadkit

**You installed 136 rules. 61 are dead. 45% of your context window is gone.**

If you installed [Everything Claude Code](https://github.com/affaan-m/everything-claude-code), [Oh My ClaudeCode](https://github.com/Yeachan-Heo/oh-my-claudecode), or any large rule/skill set — deadkit tells you what's actually working and what's just wasting tokens.

**[한국어 README](README.ko.md)**

## Demo

![deadkit demo](demo/demo.gif)

## Quick Start

```bash
npx deadkit
```

No API keys. No setup. No runtime dependencies. Takes 1-3 seconds.

## Who needs this

- **Installed a large rule set** (ECC, OMC, gstack, superpowers) and don't know what's dead
- **Skill collectors** who installed 30+ skills but only use 3
- **Team leads** setting up AI coding standards — check config health before rollout
- **Rule set authors** — validate your distribution before publishing

If you wrote 5 rules yourself and know exactly what they do, you probably don't need this.

## What it finds

```
$ npx deadkit

deadkit v0.3.0
===============

Scanned: 5 rules (5 global, 0 project), 5 skills
Total token cost: ~1,622 tokens (0.8% of context)

DEAD RULES (based on 34 sessions across all projects)
  Languages you actually use:
    .ts      13%
    .tsx     13%
    .py      8%
  No dead rules found — all rules match your usage.

SKILLS (5 installed, ~669 description tokens)
  Never used:
    /investigate — never called
    /office-hours — never called
    /qa — never called

OVERLAPPING DIRECTIVES (1 found)
  "Validate all external inputs"
  -> repeated in: essential.md, security.md

REDUNDANT WITH CLAUDE DEFAULTS
  "Read related files before making changes"
  -> Claude Code already does this by default

TOKEN COST BREAKDOWN
  commit-ko.md     ~372 tokens  ████░░░░░░  39%
  commit.md        ~235 tokens  ███░░░░░░░  25%
  essential.md     ~169 tokens  ██░░░░░░░░  18%

SUMMARY
  5 UNUSED skill(s) — installed but never called
  1 overlapping directive(s)
  3 redundant with Claude defaults
```

### Rules (passive — loaded every prompt)

| Check | How |
|-------|-----|
| **Dead rules** | Reads your session logs, checks which languages you actually edit. C++ rules but zero `.cpp` edits = dead. |
| **Duplicates** | Jaccard similarity across rule files. Tested: 0 false positives. |
| **Overlapping directives** | Same instruction copy-pasted across files. |
| **Claude defaults** | 12 patterns matched against Claude's built-in behavior. |
| **Token cost** | `file size / 4` per rule. Shows total context budget used. |

### Skills (active — user calls them)

| Check | How |
|-------|-----|
| **Never used** | Scans session logs for `Skill` tool calls. Installed but never invoked = unused. |
| **Overlapping** | Similar descriptions may confuse Claude into picking the wrong skill. |
| **Description cost** | Skill descriptions are loaded every session. 156 skills = ~15K tokens/session. |

## Compare rule sets

Compare efficiency of different setups against your actual usage:

```bash
deadkit compare ./ecc-rules/ ./my-rules/
```

```
YOUR USAGE (based on 29 sessions)
  .ts 13%, .tsx 13%, .py 8%, .html 10%

                    ecc-rules    my-rules
-----------------------------------------
Rules                      89           5
Total tokens           38,167         953
Dead tokens            24,844           0
Effective tokens       13,188         908
Efficiency              34.6%       95.3%

Winner: my-rules (95.3% efficiency)
```

Formula: `efficiency = effective tokens / total tokens`
where `effective = total - dead - duplicate - redundant`

Based on YOUR session data. Same rule set scores differently for different users.

## Continuous tracking

```bash
deadkit init    # Install hook (one-time)
deadkit trend   # View trends after a few sessions
```

Installs a Claude Code PostToolUse hook that tracks every Edit/Write/Skill call to `~/.deadkit/history.jsonl`.

```
deadkit trend
=============
DAILY ACTIVITY
  2026-04-07  ██████████████████ 3 edits (1 skill calls)
  2026-04-08  ██████████████████ 3 edits (2 skill calls)
  2026-04-09  ██████████████████████████████ 5 edits
  2026-04-10  ██████████████████████████████ 5 edits (1 skill calls)

TOP LANGUAGES
  .ts      11 edits
  .tsx     1 edits
  .py      1 edits

SKILL USAGE
  /review               2 calls
  /investigate          2 calls
```

## CI

### GitHub Action

```yaml
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

### GitLab CI

```yaml
deadkit:
  stage: test
  image: node:20
  script:
    - npx deadkit .claude/rules --json > report.json
  artifacts:
    paths: [report.json]
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

CI runs static analysis only (duplicates, tokens, vague). Dead rule detection requires local session logs.

## Verified

| Test | Result |
|------|--------|
| Dead rule accuracy | 136 ECC rules → 61 dead (10 languages, 0 edits). Correct. |
| Duplicate detection | 0 false positives at Jaccard 0.6 threshold |
| Skill tracking | Verified against real JSONL logs |
| Hook collection | Real-time capture confirmed |
| Performance | 167MB logs, 32K lines → 1-3 seconds |
| CI (GitHub Action) | PR comment auto-generated. [Tested.](https://github.com/JSK9999/deadrule/pull/6) |

## Known limitations

- Dead rule detection only works for **language-specific** rules. Generic rules (`common/security.md`) are skipped.
- "Use X" vs "Never use X" may be flagged as duplicates (negation words filtered as stop words).
- Claude default list is manually maintained (12 patterns). Incomplete.
- Cannot prove a rule *caused* better output — only that it's loaded and relevant (or not).

## Roadmap

### Now: Config health for large rule sets
- [x] Dead rules, unused skills, duplicates, token cost
- [x] Compare rule sets by efficiency
- [x] Continuous tracking with hooks
- [x] GitHub Action / GitLab CI

### Next: Session-level observability
- [ ] Per-session token analysis (how much context each session uses)
- [ ] Token budget alerts (warn when rules exceed threshold)
- [ ] Weekly health report auto-generation
- [ ] Terminal chart visualization

### Future: Team & cross-tool
- [ ] Team-wide config analytics
- [ ] Cross-tool comparison (Claude Code vs Cursor vs Codex)
- [ ] Rule effectiveness scoring (requires community baseline data)
- [ ] Web dashboard

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0
