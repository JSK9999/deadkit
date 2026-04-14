# deadkit

**AI coding rule/skill usage analyzer and config optimizer.**

You installed 136 rules and 5 skills. How many are actually doing something?

> We tested [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) against 34 real sessions:
> **61 rules dead. 5 skills never called. 90K tokens wasted — 45% of context window.**

**[한국어 README](README.ko.md)**

## What deadkit does

| # | Feature | Method | Accuracy |
|---|---------|--------|----------|
| 1 | **Dead rules** | Session logs: which languages you actually edit | Objective |
| 2 | **Unused skills** | Session logs: which skills you actually call | Objective |
| 3 | **Duplicates** | Jaccard similarity across rule files | Objective (0 false positives) |
| 4 | **Token waste** | File size / 4 per rule and skill description | Objective |
| 5 | **Claude default overlap** | 12 built-in behavior patterns | Semi-objective |
| 6 | **Efficiency comparison** | Your usage data + token analysis | Objective |
| 7 | **Usage trends** | PostToolUse hook tracking | Objective |

## What deadkit does NOT do

- ~~Rule compliance~~ — "Did Claude follow this rule?" requires LLM evaluation. A weaker model judging a stronger model's behavior is unreliable.
- ~~Code quality proof~~ — Can't prove a rule *caused* better output.
- ~~Effectiveness scoring~~ — Without the above two, this is impossible.

**deadkit measures what's measurable. Nothing more.**

## Demo

![deadkit demo](demo/demo.gif)

## Quick Start

```bash
npx deadkit
```

No API keys. No setup. No runtime dependencies. 1-3 seconds.

## Who needs this

- **Installed a large rule set** (ECC, OMC, gstack, superpowers) and don't know what's dead
- **Skill collectors** who installed 30+ skills but only use 3
- **Team leads** checking config health before rollout
- **Rule set authors** validating their distribution

If you wrote 5 rules yourself and know what they do, you probably don't need this.

## Example Output

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
    /office-hours — never called
    /qa — never called
    /review — never called

  Used:
    /investigate — 1 calls (last: 2026-04-13)

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
  4 UNUSED skill(s) — installed but never called
  1 overlapping directive(s)
  3 redundant with Claude defaults
```

## Compare

Compare efficiency of different rule sets against your actual usage:

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

`efficiency = effective tokens / total tokens`

Based on YOUR data. Same rule set scores differently for different users.

## Continuous Tracking

```bash
deadkit init    # Install hook (one-time)
deadkit trend   # View trends
```

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

CI = static analysis only (duplicates, tokens). Dead rules/unused skills require local session logs.

## CLI

```bash
npx deadkit                    # Analyze
npx deadkit ./rules/ ./agents/ # Custom paths
npx deadkit --json             # JSON output
npx deadkit init               # Install tracking hook
npx deadkit trend              # View trends
npx deadkit compare <a> <b>    # Compare setups
```

## Verified

| Test | Result |
|------|--------|
| Dead rule accuracy | 136 ECC rules → 61 dead. Correct. |
| Duplicate detection | 0 false positives |
| Skill tracking | Verified against real JSONL logs |
| Hook collection | Real-time capture confirmed |
| Performance | 167MB, 32K lines → 1-3 seconds |
| CI | PR comment tested and working |

## Known limitations

- Dead rules: language-specific only. Generic rules (`common/security.md`) are skipped.
- Negation blindness: "Use X" vs "Never use X" may be flagged as duplicates.
- Claude defaults: 12 patterns, manually maintained, incomplete.
- **Cannot measure rule compliance or code quality impact.** This is a fundamental limitation, not a roadmap item.

## Roadmap

### Now
- [x] Dead rules, unused skills, duplicates, token cost
- [x] Compare rule sets by efficiency
- [x] Continuous tracking with hooks
- [x] GitHub Action / GitLab CI

### Next
- [ ] Token budget alerts (warn when rules exceed threshold)
- [ ] Weekly health report auto-generation
- [ ] Terminal chart visualization
- [ ] Per-session token analysis

### Future
- [ ] Team-wide config analytics
- [ ] Cross-tool comparison (Claude Code vs Cursor vs Codex)
- [ ] Web dashboard

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0
