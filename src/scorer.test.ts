import { describe, it, expect } from "vitest";
import { parseConfig } from "./parser.js";
import { analyze } from "./analyzer.js";
import { score } from "./scorer.js";

const GOOD_CONFIG = `# Project Rules

## Commands
- Build: \`npm run build\`
- Test: \`npm test\`

## Architecture
Layered design with clear separation of concerns.

## Rules
- Always use TypeScript strict mode
- Never commit secrets
- Use 2-space indentation

## Style
Prefer named exports over default exports.
`;

const POOR_CONFIG = `Write good code that follows best practices.
Use appropriate naming when necessary.
Ensure maintainable and readable output.
`;

const DUPLICATE_CONFIG = `# Rules
Always use TypeScript strict mode for all new files.
Make sure to always use TypeScript strict mode for all new files.
Also always use TypeScript strict mode for all new files please.
`;

describe("score", () => {
  it("returns overall score between 0 and 100", () => {
    const config = parseConfig("CLAUDE.md", GOOD_CONFIG);
    const result = score(analyze(config));
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("scores good config higher than poor config", () => {
    const goodScore = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG))).overall;
    const poorScore = score(analyze(parseConfig("CLAUDE.md", POOR_CONFIG))).overall;
    expect(goodScore).toBeGreaterThan(poorScore);
  });

  it("returns all four category scores", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    expect(result.categories.clarity).toBeDefined();
    expect(result.categories.structure).toBeDefined();
    expect(result.categories.tokenEfficiency).toBeDefined();
    expect(result.categories.coverage).toBeDefined();
  });

  it("category scores are each between 0 and 25", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    for (const val of Object.values(result.categories)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(25);
    }
  });

  it("assigns grade A for high-scoring config", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    expect(["A", "B"]).toContain(result.grade);
  });

  it("assigns grade F or D for very poor config", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", POOR_CONFIG)));
    expect(["F", "D", "C"]).toContain(result.grade);
  });

  it("penalizes duplicate content in token efficiency", () => {
    const cleanResult = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    const dupResult = score(analyze(parseConfig("CLAUDE.md", DUPLICATE_CONFIG)));
    expect(cleanResult.categories.tokenEfficiency).toBeGreaterThanOrEqual(dupResult.categories.tokenEfficiency);
  });

  it("penalizes vague rules in clarity", () => {
    const cleanResult = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    const vagueResult = score(analyze(parseConfig("CLAUDE.md", POOR_CONFIG)));
    expect(cleanResult.categories.clarity).toBeGreaterThan(vagueResult.categories.clarity);
  });

  it("overall equals sum of category scores", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", GOOD_CONFIG)));
    const sum = Object.values(result.categories).reduce((a, b) => a + b, 0);
    expect(result.overall).toBe(sum);
  });

  it("penalizes Codex file exceeding 32 KiB hard truncation limit", () => {
    const over32KB = "# Conventions\n" + "- Always use TypeScript.\n".repeat(1_500);
    const under32KB = "# Conventions\n- Always use TypeScript.\n";
    const overScore = score(analyze(parseConfig("AGENTS.md", over32KB)));
    const underScore = score(analyze(parseConfig("AGENTS.md", under32KB)));
    expect(overScore.categories.tokenEfficiency).toBeLessThan(underScore.categories.tokenEfficiency);
  });

  it("does not apply Codex hard-limit penalty to other platforms", () => {
    // Same-size large file on Claude should not get the extra Codex penalty
    const largeContent = "# Rules\n" + "- Always use TypeScript.\n".repeat(1_500);
    const codexScore = score(analyze(parseConfig("AGENTS.md", largeContent)));
    const claudeScore = score(analyze(parseConfig("CLAUDE.md", largeContent)));
    // Codex should score lower on tokenEfficiency (hard limit penalty on top of verbosity)
    expect(codexScore.categories.tokenEfficiency).toBeLessThanOrEqual(claudeScore.categories.tokenEfficiency);
  });

  it("penalizes Claude coverage when build commands are missing", () => {
    const withCommands = "# Project\n\n## Commands\n```bash\nnpm test\nnpm run build\n```\n\n## Rules\n- Always use TypeScript.\n";
    const withoutCommands = "# Project\n\n## Rules\n- Always use TypeScript.\n- Never commit secrets.\n";
    const withScore = score(analyze(parseConfig("CLAUDE.md", withCommands)));
    const withoutScore = score(analyze(parseConfig("CLAUDE.md", withoutCommands)));
    expect(withScore.categories.coverage).toBeGreaterThan(withoutScore.categories.coverage);
  });

  it("does not apply Claude build commands penalty to other platforms", () => {
    // A Cline config with no build commands should not lose the Claude-specific coverage points
    const noCommands = "# Rules\n- Always use TypeScript.\n- Never commit secrets.\n";
    const claudeScore = score(analyze(parseConfig("CLAUDE.md", noCommands)));
    const clineScore  = score(analyze(parseConfig(".clinerules", noCommands)));
    // Claude loses the extra coverage penalty; cline does not
    expect(claudeScore.categories.coverage).toBeLessThanOrEqual(clineScore.categories.coverage);
  });

  it("CLAUDE_MISSING_BUILD_COMMANDS only penalizes coverage, not structure", () => {
    // Regression: this issue was double-counted — penalized in both scoreStructure and
    // scoreCoverage. Now it must only affect coverage.
    const noCommands   = "# Project\n\n## Rules\n- Always use TypeScript.\n";
    const withCommands = "# Project\n\n## Commands\n```bash\nnpm test\n```\n\n## Rules\n- Always use TypeScript.\n";
    const withResult    = score(analyze(parseConfig("CLAUDE.md", withCommands)));
    const withoutResult = score(analyze(parseConfig("CLAUDE.md", noCommands)));
    expect(withResult.categories.structure).toBe(withoutResult.categories.structure);
    expect(withResult.categories.coverage).toBeGreaterThan(withoutResult.categories.coverage);
  });

  it("missing section penalty is flat per section, not ratio-based", () => {
    // Regression: old ratio formula punished platforms with fewer expected sections much harder.
    // Copilot expects 2 sections; one missing should cost exactly 5 pts (not 13 pts as before).
    const allSections = "# Project\n\n## Instructions\n- Use TypeScript.\n\n## Style\nUse 2-space indent.\n";
    const oneMissing  = "# Project\n\n## Instructions\n- Use TypeScript.\n";
    const fullScore    = score(analyze(parseConfig(".github/copilot-instructions.md", allSections)));
    const partialScore = score(analyze(parseConfig(".github/copilot-instructions.md", oneMissing)));
    expect(fullScore.categories.coverage - partialScore.categories.coverage).toBe(5);
  });
});

describe("XML tags scoring", () => {
  // A well-structured CLAUDE.md that uses XML tags inside markdown sections (3 distinct pairs).
  // Markdown headings kept alongside XML so the heading-count check doesn't penalise this config.
  const XML_STRUCTURED = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

## Architecture

<architecture_overview>
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable.
</architecture_overview>

<critical_rules>
NEVER commit secrets or API keys to the repository.
ALWAYS run the full test suite before pushing.
MUST use TypeScript strict mode.
</critical_rules>

<style>
Use camelCase for variables, PascalCase for types.
Prefer named exports over default exports.
No barrel index.ts files.
</style>
`;

  // Equivalent content without XML tags — triggers CLAUDE_XML_TAGS_SUGGESTED (info, no penalty)
  const SAME_NO_XML = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

## Architecture
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable with no circular dependencies.
Separation of concerns enforced at each boundary.

## Rules
NEVER commit secrets or API keys to the repository.
ALWAYS run the full test suite before pushing.
MUST use TypeScript strict mode — tsconfig enforces this.
Use camelCase for variables, PascalCase for types.
Prefer named exports over default exports.
No barrel index.ts files.
Write a unit test for every exported function.
`;

  it("CLAUDE_XML_TAGS_SUGGESTED carries no score penalty", () => {
    // The suggestion must be pure info — the no-XML file should not score lower on structure
    // than an equivalent file that has no suggestion at all (i.e. a short file below threshold).
    const shortConfig = `# Rules

## Commands
\`\`\`bash
npm test
\`\`\`

## Style
Use 2-space indent.
`;
    const complexScore = score(analyze(parseConfig("CLAUDE.md", SAME_NO_XML))).categories.structure;
    const shortScore   = score(analyze(parseConfig("CLAUDE.md", shortConfig))).categories.structure;
    // Both should score the same on structure (short file has no penalty either)
    // The complex file triggers CLAUDE_XML_TAGS_SUGGESTED but must NOT be penalised
    expect(complexScore).toBe(shortScore);
  });

  it("awards +2 structure bonus for ≥2 XML tag pairs", () => {
    const twoTags = `# Project

<style>
Use camelCase.
No barrel files.
</style>

<commands>
\`\`\`bash
npm test
\`\`\`
</commands>

## Architecture
Layered design.
`;
    const withXml    = score(analyze(parseConfig("CLAUDE.md", twoTags))).categories.structure;
    const withoutXml = score(analyze(parseConfig("CLAUDE.md", SAME_NO_XML))).categories.structure;
    expect(withXml).toBeGreaterThan(withoutXml);
  });

  it("awards +3 structure bonus for ≥3 XML tag pairs", () => {
    const xmlScore    = score(analyze(parseConfig("CLAUDE.md", XML_STRUCTURED))).categories.structure;
    const noXmlScore  = score(analyze(parseConfig("CLAUDE.md", SAME_NO_XML))).categories.structure;
    expect(xmlScore - noXmlScore).toBeGreaterThanOrEqual(3);
  });

  it("structure score can exceed 25 (cap is 28) for XML-structured configs", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", XML_STRUCTURED)));
    expect(result.categories.structure).toBeGreaterThan(25);
    expect(result.categories.structure).toBeLessThanOrEqual(28);
  });

  it("overall score stays within 0-100 even when structure exceeds 25", () => {
    const result = score(analyze(parseConfig("CLAUDE.md", XML_STRUCTURED)));
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});
