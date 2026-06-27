# Contributing

Thanks for your interest! This is a personal portfolio, so feature contributions
are limited — but bug reports, accessibility findings, and small fixes are very
welcome.

## Getting set up

```bash
pnpm install
pnpm dev
```

## Before you open a PR

Run the full check suite locally — CI mirrors these:

```bash
pnpm typecheck   # strict TypeScript, no errors
pnpm build       # production build must succeed
```

These are the exact steps CI runs on every push and PR
([.github/workflows/ci.yml](.github/workflows/ci.yml)). Formatting follows the
shared [Prettier config](.prettierrc.json) and [.editorconfig](.editorconfig) —
install the recommended VS Code extensions for format-on-save.

## Conventions

- **TypeScript, strict mode.** No `any` without a justified comment.
- **Content is data.** User-facing copy lives in [`src/config/content.ts`](src/config/content.ts), not in components.
- **Match the surrounding code.** Follow existing naming, comment density, and Tailwind usage.
- **Motion is opt-out.** Any new animation must respect `prefers-reduced-motion` (see [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)).
- **Commits** use [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `feat:`, `fix:`, `docs:`, `refactor:`.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/`. Include your browser,
OS, and whether WebGL is available.
