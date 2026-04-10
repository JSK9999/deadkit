# Contributing to deadrule

Thanks for your interest in contributing.

## Getting Started

```bash
git clone https://github.com/JSK9999/deadrule.git
cd deadrule
npm install
npm run build
node dist/index.js
```

## Project Structure

```
src/
  index.ts              # CLI entry point
  scanner.ts            # Rule file discovery
  parser.ts             # Markdown + frontmatter parsing
  reporter.ts           # Output formatting
  types.ts              # Shared types
  analyzers/
    overlap.ts          # Duplicate/overlap detection
    defaults.ts         # Claude default behavior redundancy
    vagueness.ts        # Actionability scoring
    cost.ts             # Token cost analysis
    staleness.ts        # Stale rule detection
```

## Adding a New Analyzer

1. Create `src/analyzers/your-analyzer.ts`
2. Export a function: `analyzeX(files: RuleFile[]) => YourResult[]`
3. Add result type to `src/types.ts`
4. Wire it up in `src/index.ts`
5. Add output section in `src/reporter.ts`

## Adding Claude Default Patterns

Edit `src/analyzers/defaults.ts` and add to the `CLAUDE_DEFAULTS` array:

```typescript
{
  pattern: /your regex/i,
  reason: "Claude already does X by default",
}
```

Please include a source or reasoning for why this is a default behavior.

## Guidelines

- Zero runtime dependencies
- Each file under 300 LOC
- Each function under 50 LOC
- TypeScript strict mode
- Test with real rule sets before submitting

## Submitting Changes

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Test against your own rules: `node dist/index.js`
6. Open a PR with a clear description
