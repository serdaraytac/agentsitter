# Project Rules

## Commands
```bash
npm run build
npm test
npm run lint
```

## Architecture
React + Vite frontend, Express backend. Keep components in src/components/,
API logic in server/routes/. Use standard patterns for state management.

<critical_rules>
NEVER merge to main without a passing CI run.
ALWAYS write a test for every new exported function.
MUST get at least one code review approval before merging.
</critical_rules>

<style>
- Use camelCase for variables, PascalCase for components and types.
- Prefer named exports over default exports.
- Use camelCase for variables, PascalCase for components and types.
- Try to keep components under 200 lines when possible.
- Write clean, readable code that is easy to maintain.
</style>

## Workflow
- Create a feature branch from main for each task.
- Squash commits before merging to keep history readable.
- Ensure quality and correctness in all pull request descriptions.
- PRs should be handled by the author unless otherwise agreed.
