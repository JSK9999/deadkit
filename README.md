# deadkit

**AI coding rule/skill usage analyzer and config optimizer.**

You installed 136 rules and 5 skills. How many are actually doing something?

> We tested [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) against 34 real sessions:
> **61 rules dead (0% relevance). 5 skills never called. 90K tokens wasted — 45% of context window.**

**[한국어 README](README.ko.md)**

## What deadkit does

| # | Feature | Method | Output |
|---|---------|--------|--------|
| 1 | **Per-rule relevance %** | Session logs: language match per session | `security.md 83%`, `rust/testing.md 0% DEAD` |
| 2 | **Per-skill usage** | Session logs: Skill tool call count | `/investigate 3 calls`, `/qa 0 UNUSED` |
| 3 | **Dead rules** | Rules with 0% relevance across all sessions | `61 dead out of 136` |
| 4 | **Unused skills** | Skills installed but never called | `4 unused out of 5` |
| 5 | **Duplicates** | Jaccard similarity (0 false positives) | `essential.md <-> security.md overlap` |
| 6 | **Token waste** | File size / 4 per rule + skill description | `~90K tokens (45% of context)` |
| 7 | **Efficiency compare** | Your usage data + token analysis | `ECC 34.6% vs my-rules 95.3%` |
| 8 | **Usage trends** | PostToolUse hook tracking | Daily activity chart |
| 9 | **Alerts** | Auto-detect low relevance + unused | `! rust/testing.md is DEAD` |

## What deadkit does NOT do

- ~~Rule compliance~~ — "Did Claude follow this rule?" requires LLM. A weaker model judging a stronger model is unreliable.
- ~~Code quality proof~~ — Can't prove a rule *caused* better output.

**deadkit measures what's measurable. Nothing more.**

## Demo

![deadkit demo](demo/demo.gif)

## Quick Start

```bash
npx deadkit            # Basic analysis
npx deadkit report     # Per-rule relevance + alerts
npx deadkit init       # Install tracking hook (one-time)
npx deadkit trend      # Usage trends over time
```

No API keys. No setup. No runtime dependencies. 1-3 seconds.

## Commands

### `deadkit` — Basic analysis

Dead rules, unused skills, duplicates, token cost. One-shot scan.

### `deadkit report` — Relevance report

Per-rule relevance percentage based on your actual session data:

```
deadkit report
===============
5 rules, 5 skills | 19 sessions analyzed | ~953 tokens

RULE RELEVANCE
  commit.md                      100%  ████████████████████  19/19
  essential.md                   100%  ████████████████████  19/19
  security.md                    100%  ████████████████████  19/19
  python/testing.md               12%  ██░░░░░░░░░░░░░░░░░░   2/19 LOW
  rust/patterns.md                 0%  ░░░░░░░░░░░░░░░░░░░░   0/19 DEAD

SKILL ACTIVITY
  /investigate                     3 calls
  /review                          0 calls UNUSED

ALERTS
  ! rust/patterns.md is DEAD — 0% relevance
  ! /review never called — consider removing

SUMMARY
  3 active rules (>20% relevance)
  1 low relevance rules (<20%)
  1 dead rules (0%)
  1 active skills, 1 unused
```

### `deadkit compare` — Compare setups

```bash
deadkit compare ./ecc-rules/ ./my-rules/
```

```
YOUR USAGE (based on 29 sessions)
  .ts 13%, .tsx 13%, .py 8%

                    ecc-rules    my-rules
-----------------------------------------
Total tokens           38,167         953
Dead tokens            24,844           0
Efficiency              34.6%       95.3%

Winner: my-rules (95.3% efficiency)
```

### `deadkit init` + `deadkit trend` — Continuous tracking

```bash
deadkit init    # Install PostToolUse hook
deadkit trend   # View daily activity
```

```
DAILY ACTIVITY
  2026-04-07  ██████████████████ 3 edits (1 skill calls)
  2026-04-08  ██████████████████ 3 edits (2 skill calls)
  2026-04-09  ██████████████████████████████ 5 edits

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

CI = static analysis only. Relevance/dead rule detection requires local session logs.

## FAQ

### Q: What happens when Claude Code sessions are cleared?

deadkit uses two data sources:

1. **Claude Code session logs** (`~/.claude/projects/*/*.jsonl`) — managed by Claude Code. If sessions are cleared, this data is lost.
2. **deadkit history** (`~/.deadkit/history.jsonl`) — managed by deadkit's own hook. Independent of Claude Code. Survives session clears.

If you run `deadkit init`, the hook continuously writes to `~/.deadkit/history.jsonl`. Even if Claude Code purges its session logs, deadkit retains its own tracking data.

**Recommendation**: Run `deadkit init` early. The longer the hook runs, the more accurate your relevance data becomes.

### Q: Why can't deadkit measure rule compliance?

Checking "did Claude follow this rule?" requires understanding Claude's output in context. That needs an LLM. But using a weaker model (Haiku) to judge a stronger model (Opus) is unreliable — the evaluator can't reliably assess behavior it's not capable of itself.

Using the same model (Opus) would be accurate but prohibitively expensive.

This is a fundamental limitation, not a roadmap item.

### Q: Does it work with Cursor / Codex?

Currently deadkit scans `.cursorrules` files for static analysis (duplicates, tokens), but relevance tracking is Claude Code only (JSONL logs). Cursor and Codex don't expose session logs in the same format.

### Q: How is relevance calculated for generic rules?

Rules like `commit.md` or `security.md` that aren't language-specific are marked as 100% relevant — they apply to every session regardless of language. Only language-specific rules (e.g., `python/testing.md`, `rust/patterns.md`) have variable relevance based on actual file edits.

## Who needs this

- **Installed a large rule set** (ECC, OMC, gstack) and don't know what's dead
- **Skill collectors** who installed 30+ skills but only use 3
- **Team leads** checking config health before rollout
- **Rule set authors** validating distributions

## Verified

| Test | Result |
|------|--------|
| Dead rule accuracy | ECC 136 rules → 61 dead. Correct. |
| Relevance % | Per-session language tracking verified |
| Duplicate detection | 0 false positives |
| Skill tracking | Real JSONL log structure match confirmed |
| Hook collection | Real-time capture confirmed |
| Performance | 167MB, 32K lines → 1-3 seconds |
| CI | PR comment tested and working |

## Known limitations

- Relevance: language-specific rules only. Generic rules default to 100%.
- Negation blindness: "Use X" vs "Never use X" may be flagged as duplicates.
- Claude defaults: 12 patterns, manually maintained, incomplete.
- **Cannot measure rule compliance or code quality impact.**

## Roadmap

### Done
- [x] Dead rules, unused skills, duplicates, token cost
- [x] Per-rule relevance % with session data
- [x] Compare rule sets by efficiency
- [x] Continuous tracking with hooks
- [x] Alerts for low/dead rules
- [x] GitHub Action / GitLab CI

### Next
- [ ] Token budget alerts (block PR if rules exceed threshold)
- [ ] Weekly health report auto-generation
- [ ] Terminal chart visualization
- [ ] History-based relevance (use hook data instead of session logs)

### Future
- [ ] Team-wide config analytics
- [ ] Cross-tool comparison (Claude Code vs Cursor vs Codex)
- [ ] Web dashboard

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0
