# md-analyzer

## Purpose
Analyze, score, and optimize AI coding agent config files (CLAUDE.md, .cursorrules, .clinerules, CODEX.md, GEMINI.md, .windsurfrules, copilot-instructions.md). Works as an MCP tool.

## Tech Stack
- TypeScript + Node.js 22+
- MCP SDK (@modelcontextprotocol/sdk)

## Supported Platforms
Claude Code, Cursor, Cline, Codex, Gemini CLI, GitHub Copilot, Windsurf, Amp, Antigravity, OpenCode, Kimi Code CLI, Warp, Firebender

## Analysis Criteria
- Token cost estimation (file size → estimated tokens → per-session cost)
- Vague rule detection ("write good content" style ambiguity)
- Missing section check (variables, examples, do/don't rules)
- Duplicate content detection
- Attention placement (critical info at head/tail for LLM U-shaped attention)
- Structure analysis (markdown heading usage, grouping)

## Output Format
- Overall score: 0-100
- Category scores (clarity, structure, token efficiency, coverage)
- Issues list (severity: critical/warning/info)
- Optimized version suggestion

## Rules
- All code, comments, and documentation in English
- Write unit tests for every tool
- Test before creating files

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
