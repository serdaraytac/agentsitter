# CLI Tool Development Rules

## Architecture
Node.js 22 CLI built with Commander.js. Commands live in src/commands/, shared utilities
in src/utils/, configuration handling in src/config/. Use ES modules throughout.
Each command module exports a single `register(program: Command): void` function.
Configuration is loaded once at startup via src/config/loader.ts — never read process.env
directly inside command modules.

## Conventions
- TypeScript strict mode with `noUncheckedIndexedAccess: true`.
- 2-space indentation, single quotes, no semicolons (Biome enforces these in CI).
- Write good, clean code that is easy to understand and follow.
- Prefer functional patterns; avoid mutating shared state across commands.
- All public exports must have a JSDoc comment with at least a one-line description.
- All public exports must have a JSDoc comment with at least a one-line description.

## Testing
- Use Vitest for unit tests; mock filesystem operations with memfs.
- Each command must have an integration test that invokes the CLI via `execa` and checks
  stdout, stderr, and exit code against expected values.
- Aim for 80 %+ branch coverage on src/utils/ — enforced by the CI coverage gate.

## Rules
- NEVER read from process.env directly in command modules — import from src/config/env.ts.
- ALWAYS validate user-supplied file paths before passing them to any fs operation.
- MUST update the man page (docs/cli.1) when adding or changing a command's interface.
