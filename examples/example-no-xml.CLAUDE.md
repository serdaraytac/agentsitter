# Project Rules

## Architecture
Node.js API with PostgreSQL. Services live in src/services/, routes in src/routes/.
Try to follow the repository pattern for database access.
Use standard patterns for error handling across all services.

## Commands
```bash
npm run dev
npm test
npm run lint
```

## Style
- Use camelCase for variables, PascalCase for classes and types.
- Always use TypeScript strict mode — tsconfig.json enforces this.
- Prefer async/await over raw Promise chains.
- Write good, clean code that is maintainable and readable.
- Ensure proper error handling in all service methods.

## Rules
- NEVER expose database credentials or API keys in source code.
- NEVER commit .env files — use .env.example as a template.
- Always run npm test before pushing to any branch.
- Follow best practices for REST API design.
- Use appropriate HTTP status codes when necessary.
- Errors should be handled by the service layer, not the route.
- In most cases prefer explicit over implicit in TypeScript types.
