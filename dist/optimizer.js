// Lines that contain these VCS-domain words carry a completely different semantic
// context — "readable history" or "maintainable workflow" is not about code metrics.
// Patterns tagged skipInVcsContext are skipped on such lines; the original is preserved
// and the VAGUE_RULE issue in the analysis already flags it for manual rewrite.
const VCS_CONTEXT_RE = /\b(history|commit(?:s|ted)?|log|branch(?:es)?|merge[ds]?|diff|push(?:ed)?|pull[\s-]?request|changelog|squash|rebase[d]?|tag[s]?)\b/i;
// Maps vague phrases to concrete alternatives, organized by category.
// Patterns mirror the VAGUE_PATTERNS in analyzer.ts.
// skipInVcsContext: true → skip this pattern when the line contains VCS keywords
//   so code-quality metrics ("cyclomatic complexity ≤ 5") aren't applied to
//   git-history or workflow sentences where they'd be context-blind.
const VAGUE_REPLACEMENTS = [
    // --- unmeasurable-quality ---
    { pattern: /\bwrite\s+(good|great|better|clean|quality|nice)\s+code\b/gi, suggestion: "write code that passes all tests and type checks" },
    { pattern: /\b(elegant|robust)\b/gi, suggestion: "[TODO: replace with a measurable criterion]" },
    { pattern: /\bwell[\s-]?(written|structured|organized)\b/gi, suggestion: "[TODO: specify the convention, e.g. follows linting rules, passes type checks]" },
    { pattern: /\bhigh[\s-]?quality\b/gi, suggestion: "verified via tests and linting" },
    { pattern: /\bmaintainable\b/gi, suggestion: "[TODO: define what maintainable means, e.g. cyclomatic complexity ≤ 5]", skipInVcsContext: true },
    { pattern: /\breadable\b/gi, suggestion: "[TODO: define readability criterion, e.g. max line length or complexity limit]", skipInVcsContext: true },
    { pattern: /\bproper(ly)?\b/gi, suggestion: "[TODO: define what correct means in this context]" },
    // --- false-shared-context ---
    // Preserve the leading verb so the replacement is grammatically self-contained.
    { pattern: /\bfollow\s+best\s+practices\b/gi, suggestion: "follow [TODO: name the specific practices, e.g. SOLID, language style guide]" },
    { pattern: /\buse\s+common\s+sense\b/gi, suggestion: "use [TODO: define the decision criteria explicitly]" },
    { pattern: /\buse\s+(your\s+)?judgment\b/gi, suggestion: "use [TODO: specify the decision criteria]" },
    { pattern: /\buse\s+standard\s+patterns?\b/gi, suggestion: "use [TODO: name the specific patterns, e.g. repository, factory]" },
    { pattern: /\bindustry\s+standards?\b/gi, suggestion: "[TODO: reference the specific standard or spec]" },
    { pattern: /\bfollow\s+(the\s+)?conventions?\b/gi, suggestion: "follow the conventions defined in this file" },
    { pattern: /\bconventional\s+(approach|way|method)\b/gi, suggestion: "[TODO: describe the expected approach explicitly]" },
    { pattern: /\bstandard\s+(way|approach|practice)\b/gi, suggestion: "[TODO: name the specific practice]" },
    // --- passive-voice ---
    // Keep the captured verb ($1) in the replacement so "by the author" / "before release"
    // clauses remain grammatically attached and nothing is silently dropped.
    { pattern: /\bshould\s+be\s+(done|handled|implemented|addressed|considered|reviewed|tested)\b/gi, suggestion: "must be $1 [TODO: verify the owner and acceptance criterion]" },
    { pattern: /\bneeds?\s+to\s+be\s+(handled|done|checked|fixed|resolved|addressed)\b/gi, suggestion: "must be $1 [TODO: specify by whom and under what conditions]" },
    { pattern: /\bmust\s+be\s+considered\b/gi, suggestion: "must be considered [TODO: define what this means concretely]" },
    { pattern: /\bis\s+expected\s+to\b/gi, suggestion: "must [TODO: rewrite as an active directive]" },
    // --- weak-obligation ---
    { pattern: /\btry\s+to\b/gi, suggestion: "[TODO: use 'always' if required, or remove if optional]" },
    { pattern: /\battempt\s+to\b/gi, suggestion: "[TODO: use 'must' if required, or remove if optional]" },
    { pattern: /\bconsider\s+(using|adding|implementing|making|doing)\b/gi, suggestion: "[TODO: decide if required — use 'always $1' or remove]" },
    { pattern: /\bmight\s+want\s+to\b/gi, suggestion: "[TODO: use 'must' if required, or remove]" },
    { pattern: /\bit\s+would\s+be\s+(good|nice|helpful|better)\s+to\b/gi, suggestion: "[TODO: rewrite as a directive or remove]" },
    { pattern: /\bideally\b/gi, suggestion: "[TODO: remove qualifier and state the rule directly, or drop if aspirational only]" },
    // --- vague-condition ---
    { pattern: /\bappropriate(ly)?\b/gi, suggestion: "[TODO: define the criterion for appropriateness]" },
    { pattern: /\bas\s+needed\b/gi, suggestion: "when [TODO: specify the trigger condition]" },
    { pattern: /\bwhen\s+(necessary|applicable|possible|appropriate)\b/gi, suggestion: "when [TODO: specify the exact condition]" },
    { pattern: /\bif\s+(necessary|needed|required|applicable)\b/gi, suggestion: "if [TODO: specify the condition]" },
    { pattern: /\bin\s+most\s+cases\b/gi, suggestion: "always, except when [TODO: list the explicit exceptions]" },
    { pattern: /\bin\s+general\b/gi, suggestion: "[TODO: remove qualifier — state the rule directly]" },
    { pattern: /\bwhere\s+(possible|feasible)\b/gi, suggestion: "[TODO: define what makes this impossible, or make it unconditional]" },
    { pattern: /\bfor\s+(large|complex|small)\s+(files?|functions?|classes?|components?)\b/gi, suggestion: "for $2 exceeding [TODO: specify a measurable threshold, e.g. 300 lines]" },
    // --- comparative-without-baseline ---
    { pattern: /\bas\s+(\w+)\s+as\s+possible\b/gi, suggestion: "[TODO: specify a concrete target, e.g. under 50 lines, under 200ms]" },
    { pattern: /\bimprove\s+(performance|readability|maintainability|quality)\b/gi, suggestion: "ensure $1 meets [TODO: specify the threshold or criterion]" },
    { pattern: /\b(better|cleaner|simpler|faster)\s+(code|approach|solution|implementation)\b/gi, suggestion: "$2 that [TODO: define the acceptance baseline]" },
    { pattern: /\befficient(ly)?\s+as\s+possible\b/gi, suggestion: "[TODO: specify the performance target, e.g. p95 latency under 200ms]" },
    { pattern: /\boptimize\s+(for\s+)?(performance|speed|memory|readability)\b/gi, suggestion: "optimize $2 to [TODO: specify the target metric and threshold]" },
    // --- outcome-without-criterion ---
    { pattern: /\bensure\s+(quality|correctness|accuracy|consistency)\b/gi, suggestion: "verify $1 via tests and linting" },
    { pattern: /\bmaintain\s+(standards?|quality|consistency)\b/gi, suggestion: "conform to the rules defined in this file" },
    { pattern: /\bbe\s+(thorough|careful|diligent|mindful|consistent)\b/gi, suggestion: "[TODO: specify what this means concretely — replace with a verifiable check]" },
    { pattern: /\bpay\s+attention\s+to\b/gi, suggestion: "always verify [TODO: specify what to check]" },
    { pattern: /\bhandle\s+(errors?|edge\s+cases?)\s+properly\b/gi, suggestion: "handle $1 by [TODO: specify the strategy, e.g. log and rethrow / return Result type]" },
    { pattern: /\bsimple(r|ly)?\b/gi, suggestion: "[TODO: define simplicity criterion, e.g. cyclomatic complexity ≤ 5]", skipInVcsContext: true },
];
// Applies a replacement pattern to a line with two extras over plain string.replace():
//   1. Manual $1/$2 capture-group substitution (required when the replacer is a function)
//   2. Leading-case preservation — if the matched text started with an uppercase letter
//      and the suggestion starts with a lowercase letter, the suggestion is capitalised.
//      This prevents "Use standard patterns…" → "use [TODO: …]" (lowercase "use").
function applyPattern(line, pattern, suggestion) {
    return line.replace(pattern, (...args) => {
        const match = args[0];
        // args layout: [fullMatch, cap1?, cap2?, …, offset, inputString]
        const captures = args.slice(1, args.length - 2);
        let result = suggestion;
        captures.forEach((cap, i) => {
            if (cap !== undefined)
                result = result.replace(new RegExp(`\\$${i + 1}`, "g"), cap);
        });
        // Preserve leading case: if match opened with uppercase but result opens with lowercase
        if (match.length > 0 && /[A-Z]/.test(match[0]) && result.length > 0 && /[a-z]/.test(result[0])) {
            result = result[0].toUpperCase() + result.slice(1);
        }
        return result;
    });
}
function deduplicateLines(lines) {
    const seen = new Set();
    const result = [];
    let removed = 0;
    for (const line of lines) {
        const normalized = line.trim().toLowerCase();
        // Keep empty lines and headings always
        if (!normalized || normalized.startsWith("#")) {
            result.push(line);
            continue;
        }
        if (seen.has(normalized)) {
            removed++;
        }
        else {
            seen.add(normalized);
            result.push(line);
        }
    }
    return { lines: result, removed };
}
// Guards against replacements that would produce structurally broken output:
//   • Nested TODO  — [TODO: use 'always' if [TODO: ...] ...]
//   • Two or more TODOs on one line  — confusing and hard to action
// Note: "starts with [TODO:" is intentionally NOT checked here. Replacements like
//   "- [TODO: use 'always' if required…] write tests" are valid — the action phrase
//   is preserved after the placeholder and the user can act on it. Verb-consuming
//   patterns (follow/use + vague phrase) are fixed in VAGUE_REPLACEMENTS instead.
export function isReplacementSafe(replaced) {
    if (/\[TODO:[^\]]*\[TODO:/.test(replaced))
        return false;
    if ((replaced.match(/\[TODO:/g) ?? []).length >= 2)
        return false;
    return true;
}
// Processes line-by-line with first-match-wins per line to avoid cascading replacements.
// If a replacement would produce an unsafe result, the original line is preserved and
// counted as `reverted` (visible in changesSummary — flags it for manual rewrite).
export function fixVagueRules(content) {
    const inputLines = content.split("\n");
    let insideBlock = false;
    let replacements = 0;
    let reverted = 0;
    const outputLines = inputLines.map((line) => {
        if (line.trimStart().startsWith("```")) {
            insideBlock = !insideBlock;
            return line;
        }
        if (insideBlock)
            return line;
        const trimmed = line.trim();
        if (trimmed.startsWith("#"))
            return line;
        if (trimmed.includes("[TODO:"))
            return line;
        for (const { pattern, suggestion, skipInVcsContext } of VAGUE_REPLACEMENTS) {
            // Skip code-quality patterns when the line describes VCS operations — applying
            // metrics like "cyclomatic complexity" to "keep history readable" is context-blind.
            if (skipInVcsContext && VCS_CONTEXT_RE.test(line))
                continue;
            const replaced = applyPattern(line, pattern, suggestion);
            if (replaced !== line) {
                if (isReplacementSafe(replaced)) {
                    replacements++;
                    return replaced;
                }
                // Replacement would break sentence structure — keep original, note for manual review
                reverted++;
                return line;
            }
        }
        return line;
    });
    return { content: outputLines.join("\n"), replacements, reverted };
}
// Platform-specific hints for each expected section — replaces generic TODO comments.
const SECTION_HINTS = {
    claude: {
        commands: "```bash\n# [TODO: build command, e.g. npm run build]\n# [TODO: test command, e.g. npm test]\n# [TODO: lint command, e.g. npm run lint]\n```",
        architecture: "<!-- Key directories, main modules, and design decisions -->",
        rules: "<!-- Coding conventions and hard requirements for this project -->",
        style: "<!-- Formatting, naming, and style guide references -->",
    },
    codex: {
        conventions: "<!-- Naming rules, code style, and working agreements for this repo -->",
        testing: "<!-- Test framework, coverage requirements, and how to run tests -->",
        architecture: "<!-- Repository structure, key modules, and design decisions -->",
        "pr-instructions": "<!-- PR title format, review process, and merge criteria -->",
    },
    cursor: {
        rules: "<!-- Directives that apply to every file Cursor edits -->",
        style: "<!-- Formatting, naming, and code style conventions -->",
        context: "<!-- Background the model needs to understand this codebase -->",
    },
    cline: {
        rules: "<!-- Each rule on its own bullet — be specific, not vague -->",
        context: "<!-- Project background, stack, and key dependencies -->",
    },
    gemini: {
        instructions: "<!-- Primary directives — Gemini reads these on every turn -->",
        context: "<!-- Project overview; use @./context.md to split large sections -->",
        constraints: "<!-- Hard boundaries: what Gemini must never do -->",
    },
    copilot: {
        instructions: "<!-- Directives for GitHub Copilot — keep under 4,000 characters for code review -->",
        style: "<!-- Formatting and naming conventions -->",
    },
    amp: {
        conventions: "<!-- Coding standards; reference files with @./path/to/guide.md -->",
        testing: "<!-- Test requirements and how to run the test suite -->",
    },
    opencode: {
        rules: "<!-- Project rules — AGENTS.md at root; compose extras via opencode.json 'instructions' -->",
    },
};
function addMissingSectionStubs(content, missingSections, platform) {
    if (missingSections.length === 0)
        return { content, added: [] };
    const platformHints = SECTION_HINTS[platform] ?? {};
    const stubs = [];
    const added = [];
    for (const section of missingSections) {
        // Skip if an XML tag with this exact name already covers the section requirement
        // (e.g. <style>…</style> satisfies the missing "style" section — adding ## Style
        // would create a duplicate concept in the document).
        const escapedName = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`<${escapedName}(?:\\s[^>]*)?>`, "i").test(content))
            continue;
        const capitalized = section.charAt(0).toUpperCase() + section.slice(1);
        const hint = platformHints[section] ?? `<!-- TODO: Add ${section} guidance -->`;
        stubs.push(`\n## ${capitalized}\n${hint}`);
        added.push(section);
    }
    return { content: content + stubs.join("\n"), added };
}
// Converts non-heading, non-bullet prose lines to bullet list format.
// Used for Cline where docs explicitly recommend "bullet points make individual requirements clear".
function proseTooBullets(lines) {
    let converted = 0;
    let insideBlock = false;
    const result = lines.map((line) => {
        if (line.trimStart().startsWith("```")) {
            insideBlock = !insideBlock;
            return line;
        }
        if (insideBlock)
            return line;
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith("*") && !trimmed.startsWith(">") && !trimmed.startsWith("|")) {
            converted++;
            return `- ${trimmed}`;
        }
        return line;
    });
    return { lines: result, converted };
}
// Matches lines where a critical obligation keyword is the first meaningful word,
// optionally preceded by a list marker (- * •). Case-insensitive so "Always" and
// "ALWAYS" both qualify — directive-position anchoring prevents mid-sentence prose
// like "we always prefer…" or TODO text like "[TODO: use 'always' if…]" from matching.
// Used by both moveCriticalRulesToTop and annotateCriticalRules for consistent behaviour.
const DIRECTIVE_RE = /^(?:[-*•]\s+)?(?:MUST|NEVER|CRITICAL|FORBIDDEN|REQUIRED|ALWAYS|DO NOT)\b/i;
export function annotateCriticalRules(content) {
    const lines = content.split("\n");
    let insideBlock = false;
    let blockCount = 0;
    const result = [];
    let criticalBuffer = [];
    // When moveCriticalRulesToTop injects a "## Critical Rules" heading the heading
    // and the XML tag would both label the same block.  We suppress the heading and
    // let the XML wrapping handle the semantics — no redundancy, one representation.
    let suppressNextHeadingOutput = false;
    const flushBuffer = () => {
        if (criticalBuffer.length === 0)
            return;
        result.push("<critical_rules>");
        result.push(...criticalBuffer);
        result.push("</critical_rules>");
        blockCount++;
        criticalBuffer = [];
    };
    for (const line of lines) {
        if (line.trimStart().startsWith("```")) {
            flushBuffer();
            insideBlock = !insideBlock;
            result.push(line);
            continue;
        }
        if (insideBlock) {
            result.push(line);
            continue;
        }
        const trimmed = line.trim();
        // Headings mark structural boundaries — always flush, then decide whether to emit.
        if (trimmed.startsWith("#")) {
            flushBuffer();
            // Suppress the injected "## Critical Rules" heading — the upcoming
            // <critical_rules> XML block will carry the same semantic label.
            if (/^##\s+critical[\s-]*rules?$/i.test(trimmed)) {
                suppressNextHeadingOutput = true;
            }
            else {
                suppressNextHeadingOutput = false;
                result.push(line);
            }
            continue;
        }
        // While inside a suppressed heading's block, blank lines between the heading
        // and the first directive line should be dropped too (cosmetic).
        if (suppressNextHeadingOutput && trimmed === "") {
            continue;
        }
        suppressNextHeadingOutput = false;
        if (DIRECTIVE_RE.test(trimmed)) {
            criticalBuffer.push(line);
        }
        else if (trimmed === "" && criticalBuffer.length > 0) {
            // Blank line ends a critical block
            flushBuffer();
            result.push(line);
        }
        else {
            flushBuffer();
            result.push(line);
        }
    }
    flushBuffer();
    return { content: result.join("\n"), blockCount };
}
// Fixes @ import paths that are missing a required prefix.
// Gemini CLI and Amp both require ./ ../ / or ~/ — bare @word is not resolved.
function fixAtImportPaths(lines) {
    let fixed = 0;
    let insideBlock = false;
    const BARE_AT = /@(?!\.\/|\.\.\/|\/|~\/)([^\s,*@]+)/g;
    const result = lines.map((line) => {
        if (line.trimStart().startsWith("```")) {
            insideBlock = !insideBlock;
            return line;
        }
        if (insideBlock)
            return line;
        const replaced = line.replace(BARE_AT, (_, path) => { fixed++; return `@./${path}`; });
        return replaced;
    });
    return { lines: result, fixed };
}
function applyPlatformOptimizations(content, config, issues) {
    const changes = [];
    const hasCodes = (...codes) => codes.some((c) => issues.some((i) => i.code === c));
    let lines = content.split("\n");
    switch (config.platform) {
        case "claude": {
            // Add Commands section with runnable stub when no build/test commands are found
            if (hasCodes("CLAUDE_MISSING_BUILD_COMMANDS")) {
                const stub = [
                    "",
                    "## Commands",
                    "```bash",
                    "# [TODO: build command, e.g. npm run build]",
                    "# [TODO: test command, e.g. npm test]",
                    "# [TODO: lint command, e.g. npm run lint]",
                    "```",
                    "",
                ];
                lines = [...lines, ...stub];
                changes.push("Added Commands section stub — fill in build, test, and lint commands so Claude Code can run them without discovery overhead");
            }
            // Flag unfilled placeholders — cannot auto-fix without project-specific context
            if (hasCodes("CLAUDE_PLACEHOLDER_FOUND")) {
                const count = (content.match(/\[TODO:/g) ?? []).length;
                changes.push(`Found ${count} unfilled [TODO:] placeholder(s) — fill these in before relying on this config`);
            }
            break;
        }
        case "cursor": {
            // Prepend frontmatter stub to .cursor/rules/ files that are missing it
            if (hasCodes("CURSOR_MISSING_FRONTMATTER")) {
                const stub = [
                    "---",
                    "description: [TODO: describe when this rule applies]",
                    "globs: []",
                    "alwaysApply: false",
                    "---",
                    "",
                ];
                lines = [...stub, ...lines];
                changes.push("Added Cursor rule frontmatter stub — set 'globs' or 'alwaysApply: true' to control scope");
            }
            break;
        }
        case "cline": {
            // Convert unstructured prose to bullet points
            if (hasCodes("CLINE_UNSTRUCTURED_RULES")) {
                const { lines: bulleted, converted } = proseTooBullets(lines);
                if (converted > 0) {
                    lines = bulleted;
                    changes.push(`Converted ${converted} prose line(s) to bullet points (Cline: "bullet points make individual requirements clear")`);
                }
            }
            break;
        }
        case "gemini": {
            // Fix invalid @ import paths (missing ./ prefix)
            if (hasCodes("GEMINI_IMPORT_INVALID_PATH")) {
                const { lines: fixed, fixed: count } = fixAtImportPaths(lines);
                if (count > 0) {
                    lines = fixed;
                    changes.push(`Fixed ${count} @-import path(s) to use ./ prefix — required by Gemini CLI's import processor`);
                }
            }
            break;
        }
        case "amp": {
            // Fix bare @path → @./path to prevent Amp's implicit **/ recursive prepend
            if (hasCodes("AMP_IMPORT_IMPLICIT_RECURSIVE")) {
                const { lines: fixed, fixed: count } = fixAtImportPaths(lines);
                if (count > 0) {
                    lines = fixed;
                    changes.push(`Fixed ${count} @-mention path(s) to use ./ prefix — prevents Amp from prepending **/ and matching files across the entire project`);
                }
            }
            break;
        }
        case "copilot": {
            // Add applyTo frontmatter stub to .github/instructions/ files missing it
            if (hasCodes("COPILOT_INSTRUCTIONS_MISSING_APPLY_TO") && !content.trimStart().startsWith("---")) {
                const stub = [
                    "---",
                    "applyTo: '[TODO: glob pattern, e.g. **/*.rb or src/**/*.ts]'",
                    "---",
                    "",
                ];
                lines = [...stub, ...lines];
                changes.push("Added applyTo frontmatter stub — specify a glob pattern to scope this instruction file to matching paths");
            }
            break;
        }
    }
    return { content: lines.join("\n"), changes };
}
export function moveCriticalRulesToTop(lines, issues) {
    const hasAttentionIssue = issues.some((i) => i.code === "ATTENTION_PLACEMENT");
    if (!hasAttentionIssue)
        return { lines, moved: false };
    const firstHeading = lines.findIndex((l) => l.startsWith("#"));
    if (firstHeading === -1)
        return { lines, moved: false };
    const criticalLines = [];
    for (let i = firstHeading + 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // DIRECTIVE_RE anchors to directive position (keyword must lead the line), so
        // mid-sentence prose ("we always prefer…") and TODO text ("[TODO: use 'always' if…]")
        // are excluded without needing parenthetical-stripping heuristics.
        if (!trimmed.startsWith("#") && DIRECTIVE_RE.test(trimmed)) {
            criticalLines.push(i);
        }
    }
    if (criticalLines.length === 0)
        return { lines, moved: false };
    // Insert a "Critical Rules" section right after the first heading
    const insertAt = firstHeading + 1;
    const extracted = criticalLines.map((idx) => lines[idx]);
    const remaining = lines.filter((_, i) => !criticalLines.includes(i));
    const newLines = [
        ...remaining.slice(0, insertAt),
        "",
        "## Critical Rules",
        ...extracted,
        "",
        ...remaining.slice(insertAt),
    ];
    return { lines: newLines, moved: true };
}
export function optimize(config, analysis, scoreResult) {
    const changes = [];
    let content = config.content;
    // Platform-specific structural fixes (frontmatter, import paths, prose format)
    // Run first so subsequent passes work on already-corrected structure.
    const { content: platformFixed, changes: platformChanges } = applyPlatformOptimizations(content, config, analysis.issues);
    if (platformChanges.length > 0) {
        content = platformFixed;
        changes.push(...platformChanges);
    }
    // Fix vague rules
    const { content: fixedVague, replacements, reverted } = fixVagueRules(content);
    if (replacements > 0) {
        content = fixedVague;
        changes.push(`Replaced ${replacements} vague directive(s) with concrete alternatives`);
    }
    if (reverted > 0) {
        changes.push(`${reverted} vague directive(s) skipped — pattern detected but safe auto-rewrite was not possible; manual rewrite needed`);
    }
    // Deduplicate lines
    const { lines: dedupedLines, removed } = deduplicateLines(content.split("\n"));
    if (removed > 0) {
        content = dedupedLines.join("\n");
        changes.push(`Removed ${removed} duplicate line(s)`);
    }
    // Move critical rules toward top
    const { lines: reorderedLines, moved } = moveCriticalRulesToTop(content.split("\n"), analysis.issues);
    if (moved) {
        content = reorderedLines.join("\n");
        changes.push("Moved critical rules (never/always/must) to the top of the file for better LLM attention");
        // Remove empty XML blocks left behind after their content was relocated by the mover
        content = content.replace(/<([a-z][a-z0-9_-]*)(?:\s[^>]*)?>[ \t]*\n[ \t]*<\/\1>/gm, "");
        // Collapse triple+ blank lines that may appear after block removal
        content = content.replace(/\n{3,}/g, "\n\n");
    }
    // For Claude: wrap critical-keyword blocks in <critical_rules> XML tags when structuring is suggested.
    // Runs after moveCriticalRulesToTop so the annotation follows the final position of the rules —
    // avoids leaving empty XML blocks behind when the mover has already relocated the content.
    if (config.platform === "claude" && analysis.issues.some((i) => i.code === "CLAUDE_XML_TAGS_SUGGESTED")) {
        const { content: annotated, blockCount } = annotateCriticalRules(content);
        if (blockCount > 0) {
            content = annotated;
            changes.push(`Wrapped ${blockCount} critical-rule block(s) in <critical_rules> tags — helps Claude parse mandatory directives distinctly from optional guidance (Anthropic pattern: docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)`);
        }
    }
    // Add missing section stubs (platform-aware content hints)
    const { content: withStubs, added } = addMissingSectionStubs(content, analysis.checks.missingSections.missing, config.platform);
    if (added.length > 0) {
        content = withStubs;
        changes.push(`Added stub sections: ${added.join(", ")}`);
    }
    if (changes.length === 0) {
        changes.push("No changes needed — config looks well-structured");
    }
    return { optimizedContent: content, changesSummary: changes };
}
//# sourceMappingURL=optimizer.js.map