import { describe, it, expect, beforeAll } from "vitest";
import { parseConfig } from "./parser.js";
import { analyze } from "./analyzer.js";
import type { Issue } from "./analyzer.js";
import { score } from "./scorer.js";
import { optimize, fixVagueRules, moveCriticalRulesToTop, annotateCriticalRules } from "./optimizer.js";

const GOOD_CONFIG = `# Project Rules

## Commands
- Build: \`npm run build\`
- Test: \`npm test\`

## Architecture
Layered design with clear separation of concerns.

## Rules
- Always use TypeScript strict mode
- Never commit secrets

## Style
Use 2-space indentation.
`;

const VAGUE_CONFIG = `# Rules
Write good code for the project.
Follow best practices at all times.
`;

const PASSIVE_CONFIG = `# Rules
- Errors should be handled by the team.
- Edge cases need to be addressed before release.
`;

const WEAK_OBLIGATION_CONFIG = `# Rules
- Try to write tests for new features.
- Ideally document all public functions.
- Consider using TypeScript generics where applicable.
`;

const VAGUE_CONDITION_CONFIG = `# Rules
- Add comments when necessary.
- In most cases prefer composition over inheritance.
- Refactor for large files when possible.
`;

const COMPARATIVE_CONFIG = `# Rules
- Write code that is as clean as possible.
- Improve performance in hot paths.
- Always choose a simpler solution.
`;

const OUTCOME_CONFIG = `# Rules
- Ensure quality in all deliverables.
- Be thorough when reviewing pull requests.
- Handle errors properly in all service calls.
`;

const DUPLICATE_CONFIG = `# Rules
- Always use TypeScript strict mode
- Always use TypeScript strict mode
- Never commit secrets
`;

const ATTENTION_CONFIG = `# Project

## Background
Some background info about the project.
More background info here.
More background info line three.
More background info line four.
More background info line five.
More background info line six.
More background info line seven.
More background info line eight.
More background info line nine.
More background info line ten.

## Deep Section
Never expose API keys in any file or commit.
Always run tests before opening a pull request.

## More Info
Other content here.
Even more content here.
Yet more content here.
And even more content below.
Final line of content here.
`;

describe("optimize", () => {
  it("returns optimized content string", () => {
    const config = parseConfig("CLAUDE.md", GOOD_CONFIG);
    const analysis = analyze(config);
    const scoreResult = score(analysis);
    const result = optimize(config, analysis, scoreResult);
    expect(typeof result.optimizedContent).toBe("string");
    expect(result.optimizedContent.length).toBeGreaterThan(0);
  });

  it("returns changes summary array", () => {
    const config = parseConfig("CLAUDE.md", GOOD_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(Array.isArray(result.changesSummary)).toBe(true);
    expect(result.changesSummary.length).toBeGreaterThan(0);
  });

  it("replaces vague directives", () => {
    const config = parseConfig("CLAUDE.md", VAGUE_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.changesSummary.some((c) => c.includes("vague"))).toBe(true);
    expect(result.optimizedContent).not.toMatch(/write good code/i);
  });

  it("removes duplicate lines", () => {
    const config = parseConfig("CLAUDE.md", DUPLICATE_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    const lines = result.optimizedContent.split("\n");
    const strictLines = lines.filter((l) => l.trim() === "- Always use TypeScript strict mode");
    expect(strictLines.length).toBe(1);
    expect(result.changesSummary.some((c) => c.includes("duplicate"))).toBe(true);
  });

  it("adds stubs for missing sections on claude platform", () => {
    const minimalConfig = `# Project\n\n## Rules\n- Never commit secrets\n`;
    const config = parseConfig("CLAUDE.md", minimalConfig);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    // Missing sections (commands, style, architecture) should get stubs
    const hasTodo = result.optimizedContent.includes("TODO");
    expect(hasTodo).toBe(true);
  });

  it("reports no changes needed for well-structured config", () => {
    // A config that is already clean — we won't enforce an exact message but
    // at minimum the function should not throw and should return something.
    const config = parseConfig("CLAUDE.md", GOOD_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.changesSummary).toBeDefined();
  });

  it("fixes passive-voice patterns", () => {
    const config = parseConfig("CLAUDE.md", PASSIVE_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.optimizedContent).not.toMatch(/should\s+be\s+handled/i);
    expect(result.changesSummary.some((c) => c.includes("vague"))).toBe(true);
  });

  it("fixes weak-obligation patterns", () => {
    const config = parseConfig("CLAUDE.md", WEAK_OBLIGATION_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.optimizedContent).not.toMatch(/\btry\s+to\b/i);
    expect(result.optimizedContent).not.toMatch(/\bideally\b/i);
  });

  it("fixes vague-condition patterns", () => {
    const config = parseConfig("CLAUDE.md", VAGUE_CONDITION_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.optimizedContent).not.toMatch(/\bin\s+most\s+cases\b/i);
    expect(result.optimizedContent).not.toMatch(/\bwhen\s+necessary\b/i);
  });

  it("fixes comparative-without-baseline patterns", () => {
    const config = parseConfig("CLAUDE.md", COMPARATIVE_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.optimizedContent).not.toMatch(/as\s+clean\s+as\s+possible/i);
  });

  it("fixes outcome-without-criterion patterns", () => {
    const config = parseConfig("CLAUDE.md", OUTCOME_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    expect(result.optimizedContent).not.toMatch(/\bensure\s+quality\b/i);
    expect(result.optimizedContent).not.toMatch(/\bhandle\s+errors?\s+properly\b/i);
  });

  it("moves critical rules toward the top when attention issue exists", () => {
    const config = parseConfig("CLAUDE.md", ATTENTION_CONFIG);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    const lines = result.optimizedContent.split("\n");
    const criticalSectionIdx = lines.findIndex((l) => l.includes("Critical Rules"));
    const neverIdx = lines.findIndex((l) => l.toLowerCase().includes("never expose"));
    if (criticalSectionIdx !== -1) {
      expect(neverIdx).toBeLessThan(lines.length / 2);
    }
  });

  it("does not classify parenthetical keyword mentions as critical rules", () => {
    // Regression: keywords inside () are descriptive, not imperative rules.
    // "critical info", "do/don't rules", "severity: critical/warning/info" were
    // being incorrectly hoisted into a Critical Rules section.
    const content = `# md-analyzer

## Analysis Criteria
- Missing section check (variables, examples, do/don't rules)
- Attention placement (critical info at head/tail for LLM U-shaped attention)
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection
- Duplicate content detection

## Output Format
- Issues list (severity: critical/warning/info)

## Rules
- Never expose API keys in any file.
`;
    const config = parseConfig("CLAUDE.md", content);
    const analysis = analyze(config);
    const result = optimize(config, analysis, score(analysis));
    const lines = result.optimizedContent.split("\n");

    // These are not rules — must NOT appear under Critical Rules
    const criticalIdx = lines.findIndex((l) => l.includes("## Critical Rules"));
    if (criticalIdx !== -1) {
      const criticalSection = lines.slice(criticalIdx + 1);
      const nextHeading = criticalSection.findIndex((l) => l.startsWith("#"));
      const criticalContent = nextHeading !== -1 ? criticalSection.slice(0, nextHeading) : criticalSection;
      expect(criticalContent.join("\n")).not.toContain("Missing section check");
      expect(criticalContent.join("\n")).not.toContain("Attention placement");
      expect(criticalContent.join("\n")).not.toContain("Issues list");
      // The actual rule should be there
      expect(criticalContent.join("\n")).toContain("Never expose API keys");
    }
  });

  describe("platform-specific optimizations", () => {
    it("adds frontmatter stub to Cursor .cursor/rules/ file missing it", () => {
      const config = parseConfig(".cursor/rules/typescript.md", "# TypeScript Rules\n- Always use strict mode.");
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toMatch(/^---/);
      expect(result.optimizedContent).toContain("alwaysApply");
      expect(result.changesSummary.some((c) => c.includes("frontmatter"))).toBe(true);
    });

    it("does not add Cursor frontmatter if already present", () => {
      const content = "---\nalwaysApply: true\n---\n# Rules\n- Use strict mode.";
      const config = parseConfig(".cursor/rules/typescript.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      const frontmatterCount = (result.optimizedContent.match(/^---/gm) ?? []).length;
      expect(frontmatterCount).toBeLessThanOrEqual(2); // open + close, not duplicated
    });

    it("converts Cline prose to bullet points", () => {
      const content = "# Rules\nAlways use TypeScript.\nNever commit secrets.\nWrite tests for every feature.\nDocument public APIs.\nKeep functions small.\nFollow naming conventions.";
      const config = parseConfig(".clinerules", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      const bulletLines = result.optimizedContent.split("\n").filter((l) => l.startsWith("- "));
      expect(bulletLines.length).toBeGreaterThan(0);
      expect(result.changesSummary.some((c) => c.includes("bullet"))).toBe(true);
    });

    it("fixes Gemini invalid @ import paths to use ./ prefix", () => {
      const content = "# Rules\n@rules.md\n@styles.md\n- Use TypeScript.";
      const config = parseConfig("GEMINI.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).not.toMatch(/@rules\.md/);
      expect(result.optimizedContent).toContain("@./rules.md");
      expect(result.changesSummary.some((c) => c.includes("@-import"))).toBe(true);
    });

    it("fixes Amp bare @mention paths to use ./ prefix", () => {
      const content = "# Docs\nSee @doc/style.md for conventions.\n";
      const config = parseConfig("amp-rules.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toContain("@./doc/style.md");
      expect(result.changesSummary.some((c) => c.includes("@-mention"))).toBe(true);
    });

    it("adds applyTo frontmatter stub to Copilot path-specific file missing it", () => {
      const content = "# Ruby Rules\n- Always freeze strings.";
      const config = parseConfig(".github/instructions/ruby.instructions.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toMatch(/^---/);
      expect(result.optimizedContent).toContain("applyTo");
      expect(result.changesSummary.some((c) => c.includes("applyTo"))).toBe(true);
    });

    it("uses platform-specific section hint content for Codex stubs", () => {
      const minimal = "# Conventions\n- Use TypeScript.\n";
      const config = parseConfig("AGENTS.md", minimal);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      // Codex stubs should contain Codex-specific hints, not generic TODO
      if (result.optimizedContent.includes("## Testing")) {
        expect(result.optimizedContent).toContain("Test framework");
      }
    });

    it("uses platform-specific section hint content for Gemini stubs", () => {
      const minimal = "# Instructions\n- Use TypeScript.\n";
      const config = parseConfig("GEMINI.md", minimal);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      if (result.optimizedContent.includes("## Context")) {
        expect(result.optimizedContent).toContain("@./");
      }
    });

    it("adds Commands section stub to Claude config missing build commands", () => {
      const content = "# Project\n\n## Rules\n- Always use TypeScript.\n";
      const config = parseConfig("CLAUDE.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toContain("## Commands");
      expect(result.optimizedContent).toContain("```bash");
      expect(result.changesSummary.some((c) => c.includes("Commands section"))).toBe(true);
    });

    it("does not add Commands stub when Claude config already has build commands", () => {
      const content = "# Project\n\n## Commands\n```bash\nnpm test\n```\n\n## Rules\n- Use TypeScript.\n";
      const config = parseConfig("CLAUDE.md", content);
      const analysis = analyze(config);
      const before = (content.match(/## Commands/g) ?? []).length;
      const result = optimize(config, analysis, score(analysis));
      const after = (result.optimizedContent.match(/## Commands/g) ?? []).length;
      expect(after).toBe(before);
    });

    it("reports unfilled placeholders in Claude changesSummary", () => {
      const content = "# Rules\n- [TODO: define style]\n- [TODO: add test rules]\n";
      const config = parseConfig("CLAUDE.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.changesSummary.some((c) => c.includes("[TODO:]"))).toBe(true);
      expect(result.changesSummary.some((c) => c.includes("2"))).toBe(true);
    });

    it("uses claude-specific section hint for commands stub", () => {
      const content = "# Project\n\n## Rules\n- Always use TypeScript.\n";
      const config = parseConfig("CLAUDE.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      // Commands stub should contain bash code block, not a generic comment
      expect(result.optimizedContent).toContain("```bash");
    });
  });

  describe("annotateCriticalRules (Claude XML suggestion)", () => {
    // A complex CLAUDE.md that triggers CLAUDE_XML_TAGS_SUGGESTED
    const COMPLEX_WITH_CRITICAL = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

## Architecture
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable.

## Style
Use camelCase for variables, PascalCase for types.
Prefer named exports over default exports.
No barrel index.ts files — import directly.

## Rules
- NEVER commit secrets or API keys to the repository.
- ALWAYS run the full test suite before pushing.
- MUST use TypeScript strict mode — tsconfig enforces this.
- Use 2-space indentation throughout.
- Write a unit test for every new exported function.
`;

    it("wraps consecutive critical-keyword lines in <critical_rules> blocks", () => {
      const config = parseConfig("CLAUDE.md", COMPLEX_WITH_CRITICAL);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toContain("<critical_rules>");
      expect(result.optimizedContent).toContain("</critical_rules>");
    });

    it("includes annotation in changesSummary", () => {
      const config = parseConfig("CLAUDE.md", COMPLEX_WITH_CRITICAL);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.changesSummary.some((c) => c.includes("critical_rules"))).toBe(true);
    });

    it("does not annotate when file already has XML tags", () => {
      const alreadyXml = `# Project Rules

<commands>
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`
</commands>

<critical_rules>
NEVER commit secrets.
ALWAYS run tests.
MUST use TypeScript strict mode.
</critical_rules>

<style>
Use camelCase for variables, PascalCase for types.
No barrel files.
</style>

## Architecture
Layered design with clear separation.
Each layer is independently testable.
`;
      const config = parseConfig("CLAUDE.md", alreadyXml);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      // No CLAUDE_XML_TAGS_SUGGESTED → annotateCriticalRules does not run and adds no new blocks.
      // The mover extracts critical-keyword lines from the original <critical_rules> block,
      // leaving it empty; the cleanup pass then removes the empty block.
      // Net result: 0 <critical_rules> tags in output (content is in ## Critical Rules section).
      const xmlTagCount = (result.optimizedContent.match(/<critical_rules>/g) ?? []).length;
      expect(xmlTagCount).toBe(0);
    });

    it("does not annotate non-Claude platforms", () => {
      const config = parseConfig(".cursorrules", COMPLEX_WITH_CRITICAL);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).not.toContain("<critical_rules>");
    });

    it("does not wrap lines where critical keyword appears mid-sentence (not directive position)", () => {
      const content = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
\`\`\`

## Architecture
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable.

## Style
Use camelCase; we always prefer named exports.
Prefer 2-space indentation throughout.
No barrel index files allowed.

## Rules
- Use 2-space indentation.
- Write a unit test for every exported function.
`;
      const config = parseConfig("CLAUDE.md", content);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      // "we always prefer" is mid-sentence — should NOT produce a <critical_rules> block
      expect(result.optimizedContent).not.toContain("<critical_rules>");
    });

    it("does not wrap critical keywords inside code blocks", () => {
      const withCriticalInCode = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

## Architecture
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable.

## Style
Use camelCase for variables.
Prefer named exports over default exports.
No barrel files.

## Rules
- Use 2-space indentation.
- Write a unit test for every exported function.

\`\`\`bash
# NEVER use this in production — it bypasses auth
MUST_IGNORE=1 npm start
\`\`\`
`;
      const config = parseConfig("CLAUDE.md", withCriticalInCode);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      // No critical-keyword lines outside code blocks — should add no <critical_rules>
      expect(result.optimizedContent).not.toContain("<critical_rules>");
    });

    it("groups title-case directive keywords with adjacent uppercase keyword lines", () => {
      // NEVER (uppercase) + Always (title-case) at directive position → same block
      const withMixedCase = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

## Architecture
Layered design: parser → analyzer → scorer → optimizer.
Each layer is independently testable.
No circular dependencies between layers.

## Style
Use camelCase for variables, PascalCase for types.
Prefer named exports over default exports.
No barrel index.ts files.

## Rules
- NEVER expose database credentials or API keys.
- NEVER commit .env files to the repository.
- Always run npm test before pushing to any branch.
- Use 2-space indentation.
`;
      const config = parseConfig("CLAUDE.md", withMixedCase);
      const analysis = analyze(config);
      const result = optimize(config, analysis, score(analysis));
      expect(result.optimizedContent).toContain("<critical_rules>");
      const match = result.optimizedContent.match(/<critical_rules>([\s\S]*?)<\/critical_rules>/);
      expect(match?.[1]).toContain("NEVER expose");
      expect(match?.[1]).toContain("Always run");
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests — internal functions tested directly (exported for testing only)
// ---------------------------------------------------------------------------

describe("fixVagueRules (unit)", () => {
  it("does not cascade: 'follow best practices' does not double-replace via 'follow conventions'", () => {
    const { content } = fixVagueRules("# Rules\n- Follow best practices for REST API design.\n");
    expect(content).not.toContain("defined in this file defined in this file");
  });

  it("does not produce nested TODO from 'try to' replacement", () => {
    const { content } = fixVagueRules("# Rules\n- Try to write tests for every feature.\n");
    expect(content).not.toContain("[TODO: [TODO:");
    const todoCount = (content.match(/\[TODO:/g) ?? []).length;
    expect(todoCount).toBeLessThanOrEqual(1);
  });

  it("skips lines already containing [TODO: (no nested placeholders)", () => {
    const line = "- [TODO: use 'always' if required, or remove if optional]";
    const { content, replacements } = fixVagueRules(`# Rules\n${line}\n`);
    expect(content).toContain(line);
    expect(replacements).toBe(0);
  });

  it("skips content inside code blocks", () => {
    const { content, replacements } = fixVagueRules("# Rules\n```bash\n# try to use this command\n```\n- Use TypeScript.\n");
    expect(content).toContain("# try to use this command");
    expect(replacements).toBe(0);
  });

  it("skips headings", () => {
    const { content } = fixVagueRules("# Try to write good code here\n- Always use TypeScript.\n");
    expect(content).toContain("# Try to write good code here");
  });

  it("first-match-wins: applies only one replacement per line when multiple patterns match", () => {
    // Line contains both 'readable' and 'maintainable' — only the first-matched pattern fires
    const { content } = fixVagueRules("# Rules\n- Write readable, maintainable code.\n");
    const todoCount = (content.match(/\[TODO:/g) ?? []).length;
    expect(todoCount).toBe(1);
  });

  it("replaces vague phrases across multiple lines independently", () => {
    const { content, replacements } = fixVagueRules("# Rules\n- Try to write tests.\n- Ideally document all APIs.\n");
    expect(replacements).toBe(2);
    expect(content).not.toMatch(/\btry\s+to\b/i);
    expect(content).not.toMatch(/\bideally\b/i);
  });

  it("does not modify clean lines with no vague patterns", () => {
    const line = "- Always use TypeScript strict mode.";
    const { content, replacements } = fixVagueRules(`# Rules\n${line}\n`);
    expect(content).toContain(line);
    expect(replacements).toBe(0);
  });

  it("skips 'readable' replacement when line contains VCS keywords (context-blind fix)", () => {
    // "readable" in git-history context → skip; original preserved
    const { content, replacements } = fixVagueRules("# Rules\n- Squash commits to keep history readable.\n");
    expect(content).toContain("keep history readable");
    expect(replacements).toBe(0);
  });

  it("applies 'readable' replacement when line has no VCS keywords", () => {
    // "readable" in code context → replace normally
    const { content, replacements } = fixVagueRules("# Rules\n- Write readable code.\n");
    expect(content).not.toMatch(/\breadable\b/);
    expect(replacements).toBe(1);
  });

  it("skips 'maintainable' replacement in VCS context", () => {
    const { content } = fixVagueRules("# Rules\n- Keep the commit history maintainable.\n");
    expect(content).toContain("commit history maintainable");
  });

  it("preserves leading capital letter after replacement", () => {
    // "Follow best practices" starts with capital 'F' → replacement must also start with 'F'
    const { content } = fixVagueRules("# Rules\n- Follow best practices for the project.\n");
    // Result must start with capital 'F' (Follow…), not lowercase 'f'
    const line = content.split("\n").find((l) => l.includes("TODO"))!;
    expect(line).toMatch(/^-\s+F/); // capital F preserved
  });

  it("preserves leading capital after 'Use standard patterns' replacement", () => {
    const { content } = fixVagueRules("# Rules\n- Use standard patterns for API design.\n");
    const line = content.split("\n").find((l) => l.includes("TODO"))!;
    expect(line).toMatch(/^-\s+U/); // capital U preserved
  });
});

describe("moveCriticalRulesToTop (unit)", () => {
  const ATTENTION: Issue[] = [{ code: "ATTENTION_PLACEMENT", severity: "warning", message: "test" }];

  it("returns moved: false when no ATTENTION_PLACEMENT issue", () => {
    const lines = ["# Project", "- NEVER commit secrets."];
    const { moved } = moveCriticalRulesToTop(lines, []);
    expect(moved).toBe(false);
  });

  it("moves directive-position title-case keyword lines to top", () => {
    const lines = [
      "# Project", "",
      "Background line one.", "Background line two.", "Background line three.",
      "Background line four.", "Background line five.", "Background line six.",
      "", "## Rules",
      "Never expose API keys.",
      "Always run tests before pushing.",
    ];
    const { lines: out, moved } = moveCriticalRulesToTop(lines, ATTENTION);
    expect(moved).toBe(true);
    const critIdx = out.findIndex((l) => l.includes("Critical Rules"));
    expect(critIdx).not.toBe(-1);
    const neverIdx = out.findIndex((l) => l.includes("Never expose"));
    expect(neverIdx).toBeLessThan(out.length / 2);
  });

  it("does not move lines where keyword appears mid-sentence (not directive position)", () => {
    const lines = [
      "# Project",
      "We should always use TypeScript in this project.",
      "- NEVER commit secrets.",
    ];
    const { lines: out } = moveCriticalRulesToTop(lines, ATTENTION);
    // The mid-sentence line must NOT be extracted into the Critical Rules section.
    // Collect only the lines inside the section (up to the first blank-line boundary).
    const critIdx = out.findIndex((l) => l.includes("Critical Rules"));
    if (critIdx !== -1) {
      const sectionLines: string[] = [];
      for (let i = critIdx + 1; i < out.length; i++) {
        if (out[i] === "") break;
        sectionLines.push(out[i]);
      }
      expect(sectionLines.join("\n")).not.toContain("We should always");
      expect(sectionLines.join("\n")).toContain("NEVER commit");
    }
  });

  it("does not move TODO text that happens to contain a keyword word", () => {
    const lines = [
      "# Project",
      "Some intro content here.", "More intro content.", "Even more intro.",
      "Another intro line.", "Fifth intro line.",
      "",
      "- [TODO: use 'always' if required, or remove if optional] write tests.",
      "- NEVER commit secrets.",
    ];
    const { lines: out } = moveCriticalRulesToTop(lines, ATTENTION);
    const critIdx = out.findIndex((l) => l.includes("Critical Rules"));
    if (critIdx !== -1) {
      const critBlock = out.slice(critIdx + 1, critIdx + 6).join("\n");
      expect(critBlock).not.toContain("[TODO:");
    }
  });

  it("returns moved: false when no heading is found", () => {
    const lines = ["Some content without a heading.", "- NEVER commit secrets."];
    const { moved } = moveCriticalRulesToTop(lines, ATTENTION);
    expect(moved).toBe(false);
  });
});

describe("annotateCriticalRules (unit)", () => {
  it("wraps directive-position keyword lines in a single block", () => {
    const content = "# Rules\n- NEVER commit secrets.\n- ALWAYS run tests.\n- MUST use TypeScript.\n- Use 2-space indent.\n";
    const { content: out, blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(1);
    const match = out.match(/<critical_rules>([\s\S]*?)<\/critical_rules>/);
    expect(match?.[1]).toContain("NEVER commit");
    expect(match?.[1]).toContain("ALWAYS run");
    expect(match?.[1]).toContain("MUST use");
    expect(match?.[1]).not.toContain("Use 2-space");
  });

  it("groups title-case 'Always' with adjacent uppercase 'NEVER' lines", () => {
    const content = "# Rules\n- NEVER expose credentials.\n- NEVER commit .env files.\n- Always run tests.\n- Use 2-space indentation.\n";
    const { content: out, blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(1);
    const match = out.match(/<critical_rules>([\s\S]*?)<\/critical_rules>/);
    expect(match?.[1]).toContain("NEVER expose");
    expect(match?.[1]).toContain("Always run");
    expect(match?.[1]).not.toContain("Use 2-space");
  });

  it("does not wrap lines where keyword appears mid-sentence", () => {
    const content = "# Rules\n- We always prefer named exports in this project.\n- Use 2-space indent.\n";
    const { blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(0);
  });

  it("does not wrap content inside code blocks", () => {
    const content = "# Rules\n```bash\n# NEVER use this command\nMUST_SKIP=1 npm start\n```\n- Use TypeScript.\n";
    const { blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(0);
  });

  it("creates separate blocks when critical lines are interrupted by non-critical lines", () => {
    const content = "# Rules\n- NEVER commit secrets.\n- Use 2-space indent.\n- ALWAYS run tests.\n";
    const { blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(2);
  });

  it("flushes block at a heading boundary", () => {
    const content = "# Rules\n- NEVER commit secrets.\n## Style\n- Use 2-space indent.\n";
    const { content: out } = annotateCriticalRules(content);
    expect(out).toContain("</critical_rules>\n## Style");
  });

  it("removes ## Critical Rules heading and wraps content in XML to avoid redundancy", () => {
    // moveCriticalRulesToTop injects "## Critical Rules"; having both the heading and
    // <critical_rules> tags is redundant. annotateCriticalRules should drop the heading
    // and let the XML tag carry the semantic label.
    const content = "# Project\n\n## Critical Rules\nNEVER commit secrets.\nALWAYS run tests.\n\n## Style\nUse 2-space indent.\n";
    const { content: out, blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(1);
    expect(out).toContain("<critical_rules>");
    expect(out).toContain("NEVER commit secrets.");
    expect(out).toContain("ALWAYS run tests.");
    expect(out).not.toContain("## Critical Rules");
  });

  it("still wraps critical blocks in other sections after ## Critical Rules is suppressed", () => {
    // The heading suppression is scoped to "## Critical Rules" only.
    // Directive lines in other sections must still be wrapped normally.
    const content = "# Project\n\n## Critical Rules\nNEVER commit secrets.\n\n## Rules\nALWAYS run tests.\nMUST use TypeScript.\n";
    const { blockCount } = annotateCriticalRules(content);
    expect(blockCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Regression suite — the 7 optimizer bugs reported after browser testing
// Input: example-with-xml.CLAUDE.md (representative mixed content with XML tags)
// ---------------------------------------------------------------------------
describe("optimizer regression — 7 bugs from browser testing", () => {
  // Source: examples/example-with-xml.CLAUDE.md (inlined for determinism)
  const XML_EXAMPLE = `# Project Rules

## Commands
\`\`\`bash
npm run build
npm test
npm run lint
\`\`\`

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
`;

  let optimizedContent: string;

  beforeAll(() => {
    const config = parseConfig("CLAUDE.md", XML_EXAMPLE);
    const analysis = analyze(config);
    optimizedContent = optimize(config, analysis, score(analysis)).optimizedContent;
  });

  it("Bug 1 — no nested TODO in output", () => {
    expect(optimizedContent).not.toMatch(/\[TODO:[^\]]*\[TODO:/);
  });

  it("Bug 2 — passive-voice replacement preserves the verb ('must be handled', not 'must [TODO] by the author')", () => {
    // "PRs should be handled by the author" → "must be handled [TODO:…] by the author"
    // The verb 'handled' must survive so 'by the author' stays grammatically attached.
    if (optimizedContent.includes("must be handled")) {
      expect(optimizedContent).not.toMatch(/must\s+\[TODO:[^\]]*\]\s+by\s+the\s+author/);
    }
  });

  it("Bug 3 — 'use standard patterns' replacement keeps the leading verb", () => {
    // Old: "[TODO: name the specific patterns] for state management." (verb 'use' dropped)
    // New: "Use [TODO: name the specific patterns] for state management." (verb preserved + capitalised)
    expect(optimizedContent).not.toMatch(/^\s*\[TODO:[^\]]*\]\s+for\s+state\s+management/m);
    // Additionally: the replacement should preserve the leading capital 'U'
    if (optimizedContent.toLowerCase().includes("for state management")) {
      expect(optimizedContent).not.toMatch(/\buse\s+\[TODO:[^\]]*\]\s+for\s+state\s+management/); // lowercase 'use' — case not preserved
    }
  });

  it("Bug 4 — 'readable' in VCS context (git history) is left unchanged", () => {
    // "Squash commits before merging to keep history readable." contains VCS keywords
    // → 'readable' substitution is skipped → original phrase preserved
    expect(optimizedContent).toContain("keep history readable");
  });

  it("Bug 5 — no duplicate Style section when <style> XML tag already exists", () => {
    // The <style> tag satisfies the 'style' section requirement — ## Style stub must NOT be added
    const styleHeadings = (optimizedContent.match(/^##\s+Style/gim) ?? []).length;
    expect(styleHeadings).toBe(0);
  });

  it("Bug 6 — style guideline 'keep components under N lines' is NOT classified as a critical rule", () => {
    // 'Try to keep components…' must not end up in the Critical Rules section
    const critIdx = optimizedContent.split("\n").findIndex((l) => l.includes("Critical Rules"));
    if (critIdx !== -1) {
      const lines = optimizedContent.split("\n");
      const nextHeading = lines.slice(critIdx + 1).findIndex((l) => l.startsWith("#"));
      const critContent = lines.slice(critIdx + 1, critIdx + 1 + (nextHeading === -1 ? lines.length : nextHeading));
      expect(critContent.join("\n")).not.toContain("keep components");
    }
  });

  it("Bug 7 — output contains no zero-width structural errors (nested/multiple TODOs)", () => {
    const lines = optimizedContent.split("\n");
    for (const line of lines) {
      expect(line).not.toMatch(/\[TODO:[^\]]*\[TODO:/);
      const todoCount = (line.match(/\[TODO:/g) ?? []).length;
      expect(todoCount).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-platform regression suite
// Verifies that the core optimizer fixes (fixVagueRules, deduplicateLines,
// moveCriticalRulesToTop) are platform-agnostic and apply correctly to every
// supported platform — not just Claude.
// ---------------------------------------------------------------------------
const CROSS_PLATFORM_FIXTURE = `# Rules

## Architecture
Use standard patterns for state management.

## Style
Write good code that is clean and readable.
Write good code that is clean and readable.

## Rules
- Use 2-space indentation.
- NEVER commit API keys or secrets.
- ALWAYS run the test suite before pushing.
- MUST use TypeScript strict mode.
- Squash commits before merging to keep history readable.
`;

type PlatformEntry = { file: string; label: string };

const PLATFORMS: PlatformEntry[] = [
  { file: ".cursorrules",                      label: "cursor"    },
  { file: ".clinerules",                       label: "cline"     },
  { file: ".github/copilot-instructions.md",   label: "copilot"   },
  { file: "AGENTS.md",                         label: "codex"     },
  { file: "GEMINI.md",                         label: "gemini"    },
  { file: ".windsurfrules",                    label: "windsurf"  },
  { file: "amp.md",                            label: "amp"       },
  { file: ".kimi",                             label: "kimi"      },
  { file: "OPENCODE.md",                       label: "opencode"  },
  { file: "firebender.xml",                    label: "firebender"},
];

describe.each(PLATFORMS)("cross-platform optimizer — $label ($file)", ({ file, label }) => {
  let result: ReturnType<typeof optimize>;

  beforeAll(() => {
    const config = parseConfig(file, CROSS_PLATFORM_FIXTURE);
    const analysis = analyze(config);
    result = optimize(config, analysis, score(analysis));
  });

  it("fixVagueRules — replaces 'use standard patterns' with concrete TODO", () => {
    expect(result.optimizedContent).toContain("[TODO:");
    expect(result.optimizedContent).not.toMatch(/\buse standard patterns\b/i);
  });

  it("fixVagueRules — skips 'readable' on VCS-context line (squash/history)", () => {
    expect(result.optimizedContent).toContain("keep history readable");
  });

  it("deduplicateLines — duplicate line appears at most once in output", () => {
    // fixVagueRules may transform "write good code" before deduplication runs.
    // Either way, no content line should appear more than once.
    const lines = result.optimizedContent.split("\n").filter((l) => l.trim() !== "");
    const counts = new Map<string, number>();
    for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
    for (const [line, count] of counts) {
      expect(count, `duplicate line: "${line}"`).toBe(1);
    }
  });

  it("no nested TODOs in output", () => {
    for (const line of result.optimizedContent.split("\n")) {
      expect(line).not.toMatch(/\[TODO:[^\]]*\[TODO:/);
    }
  });

  it(`moveCriticalRulesToTop — NEVER/ALWAYS/MUST lines appear before non-critical content`, () => {
    const lines = result.optimizedContent.split("\n");
    const neverIdx  = lines.findIndex((l) => /NEVER/i.test(l));
    const alwaysIdx = lines.findIndex((l) => /ALWAYS/i.test(l));
    const mustIdx   = lines.findIndex((l) => /MUST/i.test(l));
    const styleIdx  = lines.findIndex((l) => /2-space/i.test(l));
    // If ATTENTION_PLACEMENT triggered, critical lines must appear before non-critical ones.
    // If it didn't trigger (file too short to matter), skip.
    if (neverIdx !== -1 && styleIdx !== -1) {
      expect(neverIdx).toBeLessThan(styleIdx);
    }
    if (alwaysIdx !== -1 && styleIdx !== -1) {
      expect(alwaysIdx).toBeLessThan(styleIdx);
    }
    if (mustIdx !== -1 && styleIdx !== -1) {
      expect(mustIdx).toBeLessThan(styleIdx);
    }
  });

  it(`platform is ${label} — correct platform detected`, () => {
    const config = parseConfig(file, CROSS_PLATFORM_FIXTURE);
    expect(config.platform).toBe(label);
  });
});
