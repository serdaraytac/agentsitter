<!-- /autoplan restore point: /Users/bloopi/.gstack/projects/serdaraytac-agent-lint/main-autoplan-restore-20260518-130800.md -->
# Plan: Ship config-mode Web Demo + Shareable Score Cards

**Feature:** Demo-first web tool for config-mode — zero-friction discovery path.  
**Branch:** main  
**Strategy source:** `/office-hours` design doc — approved 2026-05-17  
**Objective:** Ship the web tool to GitHub Pages with shareable result URLs, enabling organic discovery through score card sharing.

---

## Context

config-mode v1.0.4 is an MCP tool that analyzes and auto-repairs AI coding agent configs (CLAUDE.md, .cursorrules, AGENTS.md, etc. — 13 platforms). The product is built and on npm. Problem: zero real users. The web tool creates a zero-friction discovery path: paste your config, get a score + optimized version, share the result URL.

**Current state:**
- `web/index.html` (541 lines): complete UI — platform picker, textarea, score ring, category bars, issues list, optimized output tab
- `web/bundle.js` (42KB minified): browser bundle already built from `src/browser.ts`
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow (runs `npm run build:web` → deploys `web/`)
- Status: all web/ and pages.yml files are **untracked** — not committed

**What's missing:**
1. Shareable result URL encoding (result-only, no config text)
2. OG meta tags for social sharing
3. MCP install CTA after results
4. Commit everything and trigger first deploy

---

## Implementation Plan

### Task 1: Commit untracked web assets and workflow
**Files:** `web/index.html`, `web/bundle.js`, `src/browser.ts`, `.github/workflows/pages.yml`  
**Action:** Git add and commit. This triggers the first GitHub Pages build.  
**Acceptance:** Workflow runs, deploys `https://serdaraytac.github.io/config-mode/`

### Task 2: Add shareable URL hash encoding to web/index.html

After `showResults()` executes, encode the result into the URL hash:
```
#platform=claude&score=71&grade=C&issues=VAGUE_RULE:3,MISSING_SECTION:1
```

**Encoding spec:**
- `platform`: the selected platform id (e.g., `claude`, `cursor`)
- `score`: overall score 0-100
- `grade`: A/B/C/D/F
- `issues`: comma-separated `CODE:count` pairs for unique issue codes (URL-encoded)
- Max URL length: ~300 chars (well within browser limits)
- Config text is NOT encoded (too large, defeats stateless goal)

**Decoding on load:**
- On `DOMContentLoaded`, parse the URL hash
- If valid params present, render a result card showing the shared score
- Include a "Analyze your own config →" CTA pointing to the clean URL

**Implementation location:** Add to the `<script>` section of `web/index.html`, two new functions:
- `encodeResult(platform, score, grade, issues)` → hash string
- `decodeAndRenderSharedResult()` → reads hash, renders pre-filled result card

### Task 3: Add OG meta tags to web/index.html

Add to `<head>` (before `</head>`):
```html
<!-- Open Graph / social sharing -->
<meta property="og:type" content="website" />
<meta property="og:title" content="config-mode — AI Agent Config Analyzer" />
<meta property="og:description" content="Score, fix, and share your AI coding agent config. Supports Claude Code, Cursor, Copilot, Cline, Gemini CLI, and 8 more platforms." />
<meta property="og:image" content="https://serdaraytac.github.io/config-mode/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="config-mode — AI Agent Config Analyzer" />
<meta name="twitter:description" content="Paste your CLAUDE.md or .cursorrules. Get a score, see what's wrong, get it fixed automatically." />
```

**OG image strategy:** Static branded image at `web/og-image.png`. No per-score dynamic generation (GitHub Pages is static). A single 1200×630 image showing the score ring, grade, and "config-mode" branding.

**Create:** `web/og-image.png` — simple dark-background image with score ring illustration and config-mode logo text.

### Task 4: Add MCP install CTA to results panel

After the results are rendered in `showResults()`, append a CTA section below the score card:

```html
<div class="install-cta">
  <div class="cta-label">Run this in your AI session for live feedback:</div>
  <div class="cta-code">analyze_config { "filepath": "./CLAUDE.md" }</div>
  <button class="cta-copy" onclick="copyInstall()">Copy install command</button>
</div>
```

The copy button copies:
```
claude mcp add config-mode -- npx -y @serdaraytac/config-mode
```

CSS styling: subtle, below the score card, uses `var(--surface2)` background with `var(--accent)` border.

### Task 5: Add "Share result" button to results panel

After a result is rendered, show a share button:
```html
<button class="share-btn" id="shareBtn" onclick="shareResult()">Share result</button>
```

`shareResult()` function:
1. Calls `encodeResult()` with current analysis data
2. Updates `window.location.hash` with the encoded result
3. If `navigator.share` is available (mobile), triggers native share sheet
4. Otherwise, copies the full URL to clipboard and shows "Link copied!"

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `web/index.html` | Modified | Add OG tags (head), share button, install CTA, URL encode/decode logic |
| `web/bundle.js` | New (tracked) | Commit existing built bundle |
| `web/og-image.png` | New | Static branded OG image (1200×630) |
| `src/browser.ts` | New (tracked) | Commit existing browser entry point |
| `.github/workflows/pages.yml` | New (tracked) | Deploy workflow |

---

## Test Plan

### Manual tests (browser)
1. Open `web/index.html` locally (via `open web/index.html` or local server)
2. Select a platform, paste a config, click Analyze → results appear
3. Click "Share result" → URL hash updates, clipboard shows URL
4. Copy URL, open in new tab → shared result card renders correctly
5. Shared result shows "Analyze your own config →" CTA
6. MCP install CTA appears below results
7. Copy install command → correct command copied
8. Mobile: test native share sheet via `navigator.share`

### Regression tests
- Existing vitest suite: `npm test` — no regressions in analyze/score/optimize

### Deployment test
- After commit, GitHub Actions `pages.yml` workflow completes green
- URL `https://serdaraytac.github.io/config-mode/` loads and is functional

---

## Out of Scope

- GitHub Actions CI integration (ship after first 20 users validate the approach)
- Per-score dynamic OG images (requires server, deferred)
- Analytics/tracking (no backend)
- Login/authentication
- Config persistence
- Custom scoring weights

---

## Success Criteria

- Web tool deployed and accessible at GitHub Pages URL
- Shareable URL round-trips: encode → share → decode → render correct result card
- MCP install CTA copies correct command
- OG tags present for social sharing
- `npm test` passes (no regressions)

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 1 | CEO | Add `web/bundle.js` to `.gitignore` — built artifact should not be tracked | Mechanical | P5 (explicit) + P4 (no dup) | CI workflow runs `npm run build:web` before deploy; tracking a built artifact pollutes history and misleads contributors | Keep tracking bundle.js |
| 2 | CEO | Add GitHub star CTA to results panel | Mechanical | P2 (boil lakes, in blast radius, <1 file, <5 min) | Zero-backend growth lever; stars = developer social proof unit; `web/index.html` is the blast radius file | Skip star CTA |
| 3 | CEO | Cross-platform migration feature → DEFER to TODOS.md | Mechanical | P3 (pragmatic) | Feature is out of blast radius — requires major new scope; valid long-term moat but not this plan | Ship now |
| 4 | CEO | URL hash format needs version prefix (`v1`) to avoid stale-link breakage | Mechanical | P1 (completeness) | Issue codes can change between releases; unversioned hash silently renders wrong data | No versioning |
| 5 | CEO | Hash decode must fail silently (show fresh state, not error) when hash is malformed | Mechanical | P1 (completeness) | Malformed link = bad UX; silently degrading to the standard welcome screen is correct behavior | Throw error |
| 6 | CEO | Navigator.share fallback to clipboard is correct and sufficient | Mechanical | P5 (explicit) | Mobile: native share. Desktop: clipboard. Two lines of JS, already in plan | No fallback |
| 7 | CEO | "Share diff not just score" → USER DECIDED: score-only (A) | User Challenge (resolved) | User | User confirmed score-only URL encoding after reviewing B1/B2 alternatives. Design doc decision stands. | Diff/Gist sharing |
| 8 | CEO | Messaging (frame as repair not linter) → TASTE DECISION, accepted | Taste | P3 | Install CTA text can reference repair ("get it fixed automatically") without changing the URL scheme. Minor copy tweak. | Rearchitect share URL |

---

## Phase 1: CEO Review

**Mode: SELECTIVE EXPANSION** (feature enhancement on an existing, complete system)
**Dual voices:** Claude subagent [ran] + Codex [unavailable — binary not found]

### PRE-REVIEW SYSTEM AUDIT

**Repo state:**
- 7 total commits. Branch: main.
- Untracked files: `web/index.html`, `web/bundle.js`, `src/browser.ts`, `.github/workflows/pages.yml`
- Modified (vs committed): `.gitignore`, `dist/mcp-server.js`, `package-lock.json`, `package.json`, `src/mcp-server.ts`
- No stash, no open PRs
- No TODOS.md
- `[TODO:]` markers in `src/optimizer.ts` are intentional — product output inserted into user configs, not code debt

**Design doc:** Found at `~/.gstack/projects/serdaraytac-agent-lint/bloopi-main-design-20260517-235015.md` (APPROVED 2026-05-17). Key decisions locked in design doc:
- URL encoding = result-only (score/grade/platform/issue codes, ~200-300 chars) — config text excluded
- OG image = single static generic image (no per-score dynamic generation)
- Approach C chosen: Demo-First Web Tool (zero-friction discovery → organic sharing → MCP install funnel)

**Codebase quality notes (Taste Calibration):**
- Well-designed: `optimizer.ts` with typed VAGUE_PATTERNS and `[TODO:]` suggestions — clean, readable, extensible
- Well-designed: `web/index.html` `x()` XSS-escape function applied consistently throughout templates
- Anti-pattern: `web/bundle.js` tracked as a build artifact in git — creates polluted diffs

---

### 0A. Premise Challenge

**P1: "Zero-friction web tool creates organic discovery through score card sharing"**
- *Challenge:* The share URL encodes only a score ring, not the repair. Developers share useful artifacts (diffs, code, benchmarks), not score rings. A score ring is not inherently share-worthy unless it benchmarks against something the reader cares about.
- *Verdict:* Partially valid premise. Score sharing is a real mechanic (GitHub Wrapped, WakaTime stats). But the value proposition of THIS product is the repair, not the score. The share URL should at minimum convey what was wrong and that it's fixable. Preserving approved result-only encoding is correct for v1 (size constraint is real). SURFACE TO USER as taste decision.

**P2: "GitHub Pages + client-side bundle is sufficient for the use case"**
- *Challenge:* None. `web/bundle.js` is 42KB, analysis is synchronous, no backend required. Pages is zero-ops, free, custom domain later. Valid.
- *Verdict:* ACCEPTED.

**P3: "MCP install CTA creates a conversion path from web user to CLI user"**
- *Challenge:* The CTA copies a command. The gap is: user closes tab before running it, or runs it, forgets to verify it works. No retention mechanism.
- *Verdict:* CTA is necessary but not sufficient. Adding a GitHub star prompt captures intent at the moment of value. AUTO-DECIDED: add star CTA (Decision #2).

**P4: "config-mode's auto-rewrite differentiates from competitors who only lint"**
- *Challenge:* Valid. ccinspect and cclint surface issues; config-mode returns the fixed file. This is a qualitatively different product. Premise holds.
- *Verdict:* ACCEPTED.

**P5: "5 tasks are the right scope for shipping"**
- *Challenge:* Task 1 as written tracks `web/bundle.js` in git, which is an anti-pattern. Should be `.gitignore`d and rebuilt by CI. AUTO-DECIDED: modify Task 1 to exclude bundle.js from tracking (Decision #1).
- *Verdict:* 5 tasks is correct scope with one modification + one addition (GitHub star CTA).

---

### 0B. Existing Code Leverage Map

| Sub-problem | Existing code | Status |
|---|---|---|
| Parse AI config file | `ConfigMode.parseConfig()` in bundle.js | Complete — no new code |
| Analyze config for issues | `ConfigMode.analyze()` in bundle.js | Complete — no new code |
| Score config 0-100 | `ConfigMode.score()` in bundle.js | Complete — no new code |
| Generate optimized version | `ConfigMode.optimize()` in bundle.js | Complete — no new code |
| Render results in browser | `showResults()` in web/index.html:416 | Complete — extending only |
| Encode result to URL hash | MISSING | ~30 LOC to add |
| Decode hash on page load | MISSING | ~25 LOC to add |
| Share button + clipboard | MISSING | ~15 LOC to add |
| MCP install CTA | MISSING | ~10 LOC HTML/JS to add |
| OG meta tags | MISSING | ~8 lines HTML to add |
| GitHub star CTA | MISSING | ~5 LOC HTML to add (Decision #2) |
| CI deploy workflow | `.github/workflows/pages.yml` | Complete — just needs committing |
| Browser bundle build | `npm run build:web` in package.json | Complete — esbuild pipeline |

**Nothing is being rebuilt.** All analysis/scoring/optimization logic reuses the existing `ConfigMode` global.

---

### 0C. Dream State Mapping

```
CURRENT STATE                    THIS PLAN                     12-MONTH IDEAL
─────────────────────────────    ──────────────────────────    ──────────────────────────────────────
v1.0.4 complete MCP tool         GitHub Pages URL live          Cross-platform config migration
Zero web presence                 Shareable score card URLs      "Convert .cursorrules to CLAUDE.md"
Zero real users                   MCP install CTA                CI/CD gate (GitHub Action) blocks
analysis runs locally only        GitHub star CTA                config regressions
Untracked web/ directory          OG meta tags                   1000s monthly web users
                                  First organic shares           Trusted industry config standard
```

**Does this plan move toward 12-month ideal?** Yes — it creates the discovery funnel (web presence → organic shares → MCP installs → GitHub stars → trust). It does NOT directly build toward cross-platform migration, but it builds the audience that would validate that feature.

**Delta from 12-month ideal after this plan ships:** Missing CI/CD integration, cross-platform migration, analytics to measure conversion, community rule contributions.

---

### 0C-bis. Implementation Alternatives

```
APPROACH A: Minimal — commit files only, no URL encoding
  Summary: Task 1 only. Ship the web tool without shareable URLs or CTAs.
  Effort:  XS (~5 min CC)
  Risk:    Low
  Pros:    Ships immediately; can add features in follow-up PRs
  Cons:    No viral mechanic; no conversion path; effectively just hosting a page
  Reuses:  100% of existing code

APPROACH B: Current Plan (Tasks 1-5)
  Summary: Commit + URL hash sharing + OG tags + install CTA + share button
  Effort:  S (~2-3h CC)
  Risk:    Low
  Pros:    Complete discovery funnel; shareable results; conversion path to MCP
  Cons:    Score-only sharing (not diff); no growth retention beyond CTA
  Reuses:  All existing code, adds ~80 LOC to index.html

APPROACH C: Enhanced Plan (Tasks 1-5 + Decision #2 additions)
  Summary: Approach B + bundle.js in .gitignore + GitHub star CTA in results
  Effort:  S (~2-3h CC, +15 min for additions)
  Risk:    Low
  Pros:    Same as B + cleaner git history + growth retention hook
  Cons:    None significant — strictly better than B
  Reuses:  All existing code
```

**RECOMMENDATION:** Approach C — strictly dominates B with negligible extra effort. AUTO-DECIDED using P2 (boil lakes, both additions are in blast radius and take minutes).

---

### 0D. SELECTIVE EXPANSION Analysis

**Complexity check:** Plan touches 2-3 files (`web/index.html`, `.gitignore`, optional `web/og-image.png`). Well under 8-file smell threshold.

**Minimum viable subset:** Tasks 1 + 4 = commit files + MCP install CTA. Enough to have a live URL with a conversion path. Tasks 2, 3, 5 add viral mechanics.

**Cherry-pick candidates surfaced:**

1. **Share the diff, not just the score** (CEO subagent, high priority)
   - The repair is the value proposition; the score is an abstraction of it
   - Implementation: encode compressed diff or link to a "view diff" page
   - Effort: M (requires significant re-architecture of the sharing mechanic; URL could get large)
   - Risk: Medium (URL length limits, base64 encoding complexity)
   - Decision: USER CHALLENGE — approved design doc said result-only. Surfacing at final gate.

2. **GitHub star CTA in results panel** (CEO subagent, high priority)
   - Stars are developer social proof; measurable growth signal
   - Effort: XS (1-3 LOC, HTML link to github.com/serdaraytac/config-mode/stargazers)
   - Risk: Zero
   - Decision: AUTO-APPROVED (P2 — blast radius, <5 min)

3. **Add `web/bundle.js` to `.gitignore`**
   - Build artifacts don't belong in git; CI builds it fresh on deploy
   - Effort: XS (1 line .gitignore)
   - Risk: Zero
   - Decision: AUTO-APPROVED (P5+P4)

4. **Cross-platform migration feature** (CEO subagent)
   - "Convert .cursorrules to CLAUDE.md" — defensible moat no vendor will build
   - Effort: L+ (new MCP tool, new UI, validation logic per platform pair)
   - Risk: High (scope is large, unvalidated demand for migration)
   - Decision: DEFER to TODOS.md (P3)

5. **URL hash versioning** (identified in architecture review)
   - Prefix hash with `v1:` so future format changes don't silently break shared links
   - Effort: XS (5 LOC change to encodeResult)
   - Risk: Zero
   - Decision: AUTO-APPROVED (P1)

6. **Hash decode silent-fail** (identified in error review)
   - Malformed or stale hash must show welcome screen, not an error
   - Effort: XS (add try/catch in decodeAndRenderSharedResult)
   - Decision: AUTO-APPROVED (P1)

---

### 0E. Temporal Interrogation

```
HOUR 1 (foundations):
  - Know that bundle.js must NOT be committed (Task 1 modification per Decision #1)
  - Know that .gitignore update is part of Task 1
  - Know to verify GitHub Pages is enabled in repo settings before pushing

HOUR 2-3 (core logic):
  - encodeResult(): issue codes can contain ':' — must URL-encode them
  - Hash format must be: #v1:platform=X&score=N&grade=X&issues=CODE:N,CODE:N
  - decodeAndRenderSharedResult(): must run on DOMContentLoaded, not after renderPlats()
  - When hash is present, hide the welcome screen and show the result card

HOUR 4-5 (integration):
  - The shared result card lacks the textarea — user needs an "Analyze your own" CTA
  - OG image does not exist yet — need to create web/og-image.png before committing
  - The GitHub star CTA goes below the install CTA, not above it

HOUR 6+ (polish/tests):
  - Test the URL round-trip in multiple browsers (Safari handles URL hash differently)
  - Test mobile: navigator.share requires HTTPS — GitHub Pages is HTTPS ✓
  - Test edge: score=0, empty issues list, issues with special chars in codes
  - npm test must still pass — browser code is separate from MCP server code
```

**NOTE:** These represent human-team implementation hours. With CC + gstack, 6 hours of human implementation compresses to ~30-60 minutes.

---

### 0F. Mode Confirmed: SELECTIVE EXPANSION

Scope baseline = Tasks 1-5 from PLAN.md. Auto-approved cherry-picks (Decisions #2, #3, #4, #5, #6) are now part of the plan scope. Decision #7 (share diff vs score) is a USER CHALLENGE surfaced at gate. Decision #8 (messaging framing) is a TASTE DECISION surfaced at gate.

---

### Section 1: Architecture Review

```
CURRENT ARCHITECTURE:
  User browser ──▶ web/index.html ──script──▶ bundle.js (42KB)
                                               └── ConfigMode global
                                                   ├── parseConfig()
                                                   ├── analyze()
                                                   ├── score()
                                                   └── optimize()

NEW COMPONENTS (this plan):
  web/index.html ──adds──▶ encodeResult(platform, score, grade, issues) → hash string
                            decodeAndRenderSharedResult() → reads #hash → renders card
                            shareResult() → updates hash + navigator.share or clipboard
                            [MCP install CTA DOM node]
                            [GitHub star CTA DOM node]

  .github/workflows/pages.yml ──triggers──▶ GitHub Pages deploy
  web/og-image.png ─────────────────────────▶ static asset, no code
```

**Data flows:**
- Happy path: user pastes config → analyze → showResults() → encodeResult() → updates URL hash
- Share path: shared URL arrives → DOMContentLoaded → decodeAndRenderSharedResult() → renders result card (no analysis)
- Nil path: empty hash → decodeAndRenderSharedResult() is no-op → welcome screen shown ✓
- Error path: malformed hash → try/catch → silent fail → welcome screen ✓

**Coupling:** Zero new coupling. All additions are additive to web/index.html. bundle.js API is not changed.

**Scaling:** Static hosting, client-side only. 10x load = 10x GitHub CDN requests. No breaking point.

**Rollback:** git revert of the web commit. GitHub Pages redeploys within minutes.

**Security:** No new attack surface. config text never leaves the browser. URL hash is display-only, never eval'd. x() escaping already applied to all DOM writes.

**No issues found in architecture.** AUTO-DECIDED: no changes needed.

---

### Section 2: Error & Rescue Map

| Method/Codepath | What Can Go Wrong | Handled? | User Sees |
|---|---|---|---|
| `encodeResult()` | Issues array has special chars (`:`, `&`, `,`) | Must URL-encode codes | Corrupt hash → bad shared link |
| `decodeAndRenderSharedResult()` | Hash is malformed or truncated | try/catch → show welcome | Welcome screen |
| `navigator.clipboard.writeText()` | Clipboard denied (non-HTTPS, Firefox) | catch → show "copy failed" tooltip | "Copy failed" |
| `navigator.share()` | Not available on desktop | Check before calling → fallback to clipboard | Clipboard copy |
| `bundle.js` fails to load | Script error | Analyze btn click shows error via err-box | Error message in UI |
| `pages.yml` deploy fails | CI error | GitHub Actions UI shows failure | Site not updated (old version persists) |

**Gaps identified:**
- Special chars in issue codes: URL encoding is NOT explicit in the current plan spec. Must use `encodeURIComponent()` in encodeResult(). AUTO-DECIDED: add to Task 2 spec (P1 completeness).
- No handling for `navigator.clipboard` permission denial in current `doCopy()` — this is pre-existing, not introduced by this plan. Flag as SEES SOMETHING: `doCopy()` at line 491 has no catch block. Outside plan scope but worth a TODO.

**No critical gaps.** One pre-existing issue noted in doCopy() (outside plan scope).

---

### Section 3: Security & Threat Model

| Threat | Likelihood | Impact | Mitigated? |
|---|---|---|---|
| XSS via URL hash values rendered into DOM | Low | High | YES — `x()` escaping must be applied to all hash-decoded values before DOM insertion |
| Config text leaking to third party | Zero | N/A | N/A — client-side only, no network calls |
| OG image serving a malicious redirect | Zero | N/A | Static PNG, no redirect |
| Navigator.share leaking config text | Low | Medium | YES — share only encodes the result URL, never the config text |

**Critical: hash-decoded values MUST pass through `x()` before DOM insertion.** The existing `x()` function at line 499 handles `&`, `<`, `>`, `"`. Apply it to platform name and issue codes decoded from the hash. AUTO-DECIDED: add to Task 2 spec (P1 completeness).

**No new attack surface beyond what's noted.** Architecture is sound for a static client-side tool.

---

### Section 4: Data Flow & Interaction Edge Cases

```
ENCODE FLOW:
  score(0-100) ──▶ no validation needed
  grade(A-F) ──▶ no validation needed
  platform(string) ──▶ must be a known PLATS.id or 'unknown'
  issues([{code, count}]) ──▶ code must be URL-encoded

DECODE FLOW:
  URL hash ──▶ URLSearchParams ──▶ validate score (0-100 int) ──▶ render card
               │
               ├── missing params → show welcome (silent fail)
               ├── score out of range → show welcome (silent fail)
               └── unknown platform → show result with no platform pill
```

**Interaction edge cases:**

| Interaction | Edge Case | Handled? |
|---|---|---|
| Share button click | Score is 0 | Hash encodes `score=0` — renders correctly |
| Share button click | No issues found (empty array) | Hash encodes `issues=` empty — decodes to 0 issues |
| Share link arrival | Hash has `v2:` prefix (future) | `v1:` prefix mismatch → show welcome |
| Share link arrival | Platform id not in PLATS | No platform pill shown, rest renders |
| Copy to clipboard | HTTPS only | GitHub Pages serves HTTPS ✓ |
| DOMContentLoaded | Both hash present AND user has typed in textarea | Hash decode runs first; textarea state doesn't interfere |

**Auto-decided:** All edge cases covered by spec. No additional issues.

---

### Section 5: Code Quality Review

- No DRY violations: encodeResult/decodeAndRenderSharedResult are new functions with no existing analogues
- `x()` function must be reused (not duplicated) in decode rendering — already exists at line 499 ✓
- Naming: `encodeResult`, `decodeAndRenderSharedResult`, `shareResult` — clear, verb-noun, good
- Cyclomatic complexity: each function branches ≤ 3 times — under threshold
- The decode function should NOT try to re-run analysis — it renders a static "shared result" card only

**No issues found.**

---

### Section 6: Test Review

```
NEW UX FLOWS:
  1. User clicks "Share result" → URL hash updates → copy to clipboard
  2. User arrives at URL with hash → shared result card renders
  3. Mobile user clicks share → native share sheet appears

NEW DATA FLOWS:
  1. analysis result → encodeResult() → URL hash string
  2. URL hash string → decodeAndRenderSharedResult() → DOM card

NEW CODEPATHS:
  1. encodeResult() — pure function
  2. decodeAndRenderSharedResult() — DOM manipulation
  3. shareResult() — navigator.share or clipboard
  4. DOMContentLoaded hash check — conditional execution
```

**Tests per codepath:**

| Codepath | Test type | Exists? | Gap |
|---|---|---|---|
| encodeResult() → valid hash | Unit | NO | Must add |
| encodeResult() → special chars in issue codes | Unit | NO | Must add |
| decodeAndRenderSharedResult() → valid hash | Unit/Integration | NO | Must add |
| decodeAndRenderSharedResult() → malformed hash | Unit | NO | Must add |
| decodeAndRenderSharedResult() → empty hash | Unit | NO | Must add |
| score=0, grade=F round-trip | Unit | NO | Must add |
| navigator.share unavailable fallback | Mock test | NO | Should add |

**Existing vitest suite** (`src/*.test.ts`) tests the MCP server's analyze/score/optimize tools — not browser code. Browser tests need separate test file: `web/index.test.js` using JSDOM or similar.

**AUTO-DECIDED:** Add browser unit tests for encodeResult/decodeAndRenderSharedResult as part of Task 2 (P1 completeness). These are pure functions, easily testable without a browser.

---

### Section 7: Performance Review

Client-side static tool — no DB, no API calls, no background jobs.
- Bundle.js: 42KB minified. GitHub CDN serves with cache headers. No issue.
- URL encoding: O(n) where n = number of issues (~5-20 typical). Trivially fast.
- DOM manipulation in decodeAndRenderSharedResult: synchronous, <1ms.
- Largest page asset: bundle.js at 42KB. Total page weight well under 200KB.

**No performance issues.** Examined: bundle size, encoding complexity, DOM ops. Nothing flagged.

---

### Section 8: Observability & Debuggability Review

No server-side code — no logs, metrics, or dashboards possible.
- GitHub Pages deployment: visible in Actions tab in GitHub UI
- Deploy failures: Actions UI shows error + email notification
- If bundle.js fails: browser console shows the error; err-box renders in UI

**Gap (deferred):** Zero analytics means we can't know if users are arriving, running analysis, or clicking the share button. The design doc explicitly deferred analytics ("no backend"). Adding Plausible or Fathom (1 script tag, no backend) would give minimal signal. AUTO-DECIDED: add to TODOS.md as future work (P3 — outside current blast radius).

---

### Section 9: Deployment & Rollout Review

- **Migration safety:** No DB migrations. Static file deploy only.
- **Feature flags:** Not needed. Single-page static app.
- **Rollout order:** git push → Actions CI → Pages deploy. Atomic from user perspective.
- **Rollback plan:** `git revert <commit> && git push` → Pages redeploys in ~2 min
- **Deploy-time risk:** Zero — old version serves until new deploy completes. No simultaneous old/new.
- **Post-deploy verification:** Load `https://serdaraytac.github.io/config-mode/` → paste a config → verify analysis + score + share button

**No issues found.** Examined: migration safety, rollback, deploy-time risk. All clean.

---

### Section 10: Long-Term Trajectory Review

- **Tech debt introduced:** URL hash format is not versioned in the current plan. AUTO-DECIDED: add `v1:` prefix (Decision #4). This preserves a migration path when format changes.
- **Path dependency:** URL hash format, once shared publicly, is a public API. Breaking it invalidates shared links. Version prefix prevents silent breakage.
- **Reversibility:** 5/5. All changes are additive to a static HTML file. Trivially reversible.
- **12-month question:** A new engineer reading this code should be able to understand encodeResult/decodeAndRenderSharedResult without comments. Keep them as pure functions with clear names.
- **Phase 2 readiness:** Architecture supports adding analytics (inject 1 script), CI/CD gate (separate workflow), cross-platform migration (new page/tool). This plan creates no obstacles.

**No issues found beyond tech debt (URL versioning) already auto-decided.**

---

### Section 11: Design & UX Review (UI scope detected)

**Information hierarchy:**
1. Platform selection (left sidebar — correct, first decision the user makes)
2. Config textarea + analyze button (left sidebar — correct)
3. Score ring + category bars (right panel top — correct, result hero)
4. Issues list / Optimized output (tabs — correct, secondary)
5. MCP install CTA (below score card — correct placement)
6. Share button (where in the results panel?)

**Issue: Share button placement is unspecified.** The plan says "show a share button after result is rendered" but doesn't specify WHERE. Options: (a) in the score-card header, (b) below the score card, (c) a sticky footer. Recommendation: place it inline with the score card header, next to the platform pill. It's contextual to the score, not the issues. AUTO-DECIDED: placement spec added to Task 5 (P5 explicit — specificity prevents implementer ambiguity).

**Interaction state coverage:**

| Feature | Loading | Empty | Error | Success | Partial / Shared |
|---|---|---|---|---|---|
| Analyze | Spinner ✓ | Alert ✓ | err-box ✓ | showResults() ✓ | — |
| Share URL arrival | — | Welcome screen ✓ | Welcome screen ✓ | Shared card ✓ | "Analyze your own →" CTA ✓ |
| Copy clipboard | — | — | "Copy failed" (needs adding) | "Copied!" ✓ | — |

**Gap:** Clipboard copy failure state is not in the plan. The current `doCopy()` has no catch block. This is pre-existing. AUTO-DECIDED: add to Task 4 scope (share button copy fallback handles it per plan).

**Mobile:**
- `@media (max-width: 680px)` already stacks panels ✓
- Share button on mobile should trigger `navigator.share` (native OS sheet) ✓
- Platform grid is 4-column at all sizes — may be cramped at 320px wide but acceptable for v1

**Accessibility:**
- No `aria-label` on icon buttons, no keyboard navigation for platform grid
- Not a blocker for v1, deferred to TODOS.md (P3)

**OG image:** Static `web/og-image.png` at 1200×630 needs to be created. The plan mentions it but doesn't describe how. This is a BLOCKER for Task 3 — the file must exist before committing. AUTO-DECIDED: create a minimal branded PNG as part of Task 3 implementation (P1 completeness).

---

### CLAUDE SUBAGENT (CEO — strategic independence)

5 findings, severity HIGH/CRITICAL:
1. **Discovery mechanism unvalidated (HIGH)** — Score sharing is less compelling than diff sharing; score ring is an abstraction of the actual value
2. **Auto-repair buried in messaging (HIGH)** — CTA should expose the fix, not just install the tool
3. **bundle.js tracked in git (MEDIUM)** — Build artifact pollutes history; CI rebuilds it anyway
4. **No acquisition event beyond CTA (HIGH)** — GitHub star CTA is the cheapest missing retention hook
5. **6-month regret: platform absorption (CRITICAL)** — Anthropic/Cursor can ship CLAUDE.md health check in one quarter; cross-platform migration is the defensible moat they won't build

*[Codex unavailable — single-model review]*

---

### CEO DUAL VOICES — CONSENSUS TABLE

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   YES     N/A    SINGLE-MODEL
  2. Right problem to solve?           YES*    N/A    SINGLE-MODEL
  3. Scope calibration correct?        YES**   N/A    SINGLE-MODEL
  4. Alternatives sufficiently explored?YES    N/A    SINGLE-MODEL
  5. Competitive/market risks covered? NO      N/A    FLAGGED (platform absorption risk)
  6. 6-month trajectory sound?         PARTIAL N/A    FLAGGED (missing moat discussion)
═══════════════════════════════════════════════════════════════
* With caveat: score sharing is less compelling than diff sharing (USER CHALLENGE)
** With modifications: add .gitignore for bundle.js, add star CTA (auto-decided)
```

---

### NOT IN SCOPE (deferred to TODOS.md)

- Cross-platform config migration feature (convert .cursorrules → CLAUDE.md, etc.)
- Analytics/tracking (Plausible, Fathom, or similar)
- Accessibility improvements (aria-labels, keyboard navigation)
- Per-score dynamic OG images
- CI/CD GitHub Action
- Diff-based sharing mechanic (pending user decision at gate — USER CHALLENGE #7)

---

### What Already Exists

All analysis, scoring, and optimization logic is complete in `web/bundle.js`. The web UI shell is complete in `web/index.html`. The CI deploy workflow is complete in `.github/workflows/pages.yml`. This plan adds only ~130 LOC of JavaScript/HTML to `web/index.html`.

---

### Error & Rescue Registry

| Error | Class | Rescued? | Rescue Action | User Sees |
|---|---|---|---|---|
| Malformed URL hash | ParseError | YES | try/catch → show welcome | Welcome screen |
| Issue code special chars | Encoding gap | YES (after fix) | encodeURIComponent in encodeResult | Correct hash |
| Clipboard permission denied | NotAllowedError | PARTIAL (after fix) | catch → show "Copy failed" | "Copy failed" tooltip |
| navigator.share unavailable | TypeError | YES | if-check → fallback to clipboard | Clipboard copy |
| bundle.js load failure | ScriptError | Partial | err-box in catch | "Error: [message]" |
| GitHub Pages deploy failure | CI error | Partial | Old version persists | No regression |

---

### Failure Modes Registry

| Failure | Probability | Impact | Mitigation |
|---|---|---|---|
| Stale shared URL (issue codes changed) | Medium (future) | Low (broken link) | URL version prefix v1: |
| No GitHub Pages deploy (env not configured) | Low | High (site 404) | Verify Pages settings before Task 1 |
| OG image missing (Task 3 not complete) | Low | Low (broken OG preview) | Create og-image.png before committing Task 3 |
| navigator.share not available | High (desktop) | Low | Clipboard fallback in plan |
| Config analysis breaks on empty hash load | Low | Medium | Decode runs before analysis; isolated code paths |

---

### Completion Summary

| Area | Status | Key Finding |
|---|---|---|
| Premises | 5/5 valid (with notes) | P1 (discovery mechanic) has a taste-level challenge pending user decision |
| Existing leverage | 100% | All core logic in bundle.js; plan is additive only |
| Dream state delta | On track | Ships discovery funnel; 12-month moat (cross-platform) is deferred |
| Implementation alternatives | Approach C chosen | Strictly dominates Approach B with no extra risk |
| Architecture | Clean | No new dependencies, no coupling, trivially rollbackable |
| Security | Adequate | XSS escaping must be applied to hash-decoded values |
| Tests | Gap identified | Browser unit tests needed for encode/decode functions |
| Performance | No issues | Static client-side, trivially fast |
| Deployment | No issues | Pages CI is already written |
| Long-term trajectory | 1 risk identified | URL hash format needs version prefix |
| Design/UX | 1 gap | Share button placement unspecified (added to Task 5 spec) |
| Auto-decisions | 8 total | 6 mechanical, 1 taste, 1 user challenge |

---

**PHASE 1 COMPLETE.**
Codex: unavailable [single-model].
Claude subagent: 5 issues found (3 auto-decided, 1 taste, 1 user challenge).
CEO consensus: 4/6 confirmed, 2 flagged (competitive risk + trajectory).
Premise gate: PASSED (user confirmed score-only URL encoding).

---

## Phase 2: Design Review

**Mode: auto-decided all 7 dimensions (P1 completeness)**
**Dual voices:** Claude subagent [ran] + Codex [unavailable] + designer binary [no OpenAI key — text review]

### Step 0: Design Scope Assessment

**Initial rating: 5/10.** The plan describes what each task does mechanically but leaves the shared-result UX almost entirely to the implementer's imagination. Six design gaps identified.

**No DESIGN.md found.** Proceeding with universal design principles.

**Existing patterns to reuse:**
- Score card: `.score-card` (dark surface, border, border-radius 10px, flex layout)
- Issue badges: `.sev` chips (colored, uppercase, rounded)
- Code blocks: monospace, `.opt-ta` style
- Button states: `.copy-btn` with 2-second "Copied!" feedback pattern
- XSS escaping: `x()` function at index.html:499 — MUST be applied to all hash-decoded values

---

### Design Pass 1: Information Hierarchy

**Score: 7/10.** Left panel hierarchy is correct (platform → config → analyze). Results panel needs adjustment.

**Issue: Share button + MCP CTA placement breaks diagnostic flow (HIGH)**

Current plan places both elements "below the score card." This sandwiches a sales block and a share button between the score and the issues tab — interrupting the user's diagnostic flow at the moment they most need to see what's wrong.

**Fix (auto-decided, P5):** Specify placement explicitly:
- Share button: inline with "Overall Score" label in the score-card header row, right-aligned, compact. Same row as the platform pill.
- MCP install CTA: below the tab content (`#pIssues` / `#pOpt`), after the user has read the issues. This is the post-discovery conversion moment.
- GitHub star CTA: below the MCP CTA, one line, text + star icon link.

**New score-card header layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Score Ring]   Overall Score   [Claude Code ●]   [Share ↑] │
│                                                             │
│ Clarity      ████████░░  18/25                              │
│ Structure    ██████░░░░  15/25                              │
│ Token Eff.   ████████████ 24/25                             │
│ Coverage     █████░░░░░  12/25                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Design Pass 2: Interaction State Coverage

| Feature | Loading | Empty | Error | Success | Shared view |
|---|---|---|---|---|---|
| Analyze | Spinner ✓ | Alert ✓ | err-box ✓ | showResults() ✓ | — |
| Share button | — | — | "Copy failed" (needs CSS) | "Link copied!" 2s ✓ | hidden (no analysis) |
| Hash decode on load | — | Welcome screen ✓ | Welcome screen ✓ | Shared card (spec below) | — |
| MCP CTA copy | — | — | needs: "Copy failed" message | "Copied!" 2s needed | — |
| clipboard write | — | — | NOT HANDLED (pre-existing gap) | "Copied!" 2s | — |

**Gap (auto-decided, P1):** MCP CTA copy button needs success/fail state — same pattern as `doCopy()`. Add to Task 4 spec.

---

### Design Pass 3: Shared Result State Specification (CRITICAL)

**This is almost entirely unspecified in the plan. Spec it here.**

When a user arrives at `https://serdaraytac.github.io/config-mode/#v1:platform=claude&score=71&grade=C&cats=18,15,24,12&issues=VAGUE_RULE:3,MISSING_SECTION:1`:

**Left panel:** Same as normal. Platform picker auto-selects the shared platform. Textarea empty. Analyze button enabled.

**Right panel:** `#results` div renders with `data-mode="shared"` attribute (enables CSS to hide tabs). Show:
1. Score card: ring + grade + platform pill + category bars (from `cats=` param)
2. A "shared result" banner above the score card: `"Someone scored their CLAUDE.md — C (71). Paste yours to compare. →"`
3. Issues: render a simplified issue list — for each CODE:count pair, show a pill: `3× VAGUE_RULE` using severity badge style. No message, no context, no line number — they're not available.
4. Tab bar: HIDE (no full issue details, no optimized content in shared view)
5. "Analyze your own config →" CTA: below the simplified issue list, styled like `.analyze-btn` but secondary (outlined, not filled).

**Left panel in shared view:** Left panel visible, platform pre-selected, textarea shows placeholder "Paste your config here to compare →". Analyze button changes to "Analyze Mine →".

**DOM implementation:** `decodeAndRenderSharedResult()` sets `document.getElementById('results').dataset.mode = 'shared'` and populates:
- `#scoreCard` (score ring, platform pill, category bars)
- `#issueList` (simplified CODE:count badges)
- `#issueBdg` (count)
- Inserts shared-banner and "Analyze your own" button

CSS: `.results[data-mode="shared"] .tab-bar { display: none; }` and `.results[data-mode="shared"] #pIssues { display: block; }` always.

**Auto-decided (P1 completeness): add all of the above to Task 2 spec.**

---

### Design Pass 4: Hash Persistence Bug (HIGH)

**Bug:** After clicking "Share result", the URL hash is set. On the next page load by the SAME user (who has content in their textarea), the page decodes the hash and renders a shared view — overwriting their in-progress analysis context.

**Fix (auto-decided, P1):** `decodeAndRenderSharedResult()` must check: if `document.getElementById('cfgContent').value.trim()` is non-empty on load, skip hash decode. Hash decode only runs when the user arrives at the page with no prior config in the textarea (i.e., the page loads fresh). Since textarea is empty on a fresh page load, this condition correctly skips shared view for returning users who had a config.

**Implementation:** Add guard to the top of `decodeAndRenderSharedResult()`:
```js
if (document.getElementById('cfgContent').value.trim()) return; // user has content, skip shared view
```

**Auto-decided: add to Task 2 spec.**

---

### Design Pass 5: Category Scores in Hash

**Issue:** Hash format `#v1:platform=X&score=N&grade=X&issues=CODE:N` encodes no category scores. The four category bars (Clarity, Structure, Token Efficiency, Coverage) are the richest part of the score card. Without them, the shared card shows an empty bar chart.

**Fix (auto-decided, P1):** Add `cats=CL,ST,TE,CV` to the hash. Format: `cats=18,15,24,12` (4 integers 0-25, comma-separated). Adds ~12 chars. Total hash budget: ~320 chars (well within 300-char guideline — guideline, not hard limit).

**Updated hash format:**
```
#v1:platform=claude&score=71&grade=C&cats=18,15,24,12&issues=VAGUE_RULE:3,MISSING_SECTION:1
```

**Auto-decided: modify Task 2 hash format spec to include `cats=` parameter.**

---

### Design Pass 6: CTA Copy/Display Mismatch (HIGH)

**Issue:** The MCP install CTA plan (Task 4) shows:
- Display text: `analyze_config { "filepath": "./CLAUDE.md" }`
- Button: "Copy install command"  
- What actually copies: `claude mcp add config-mode -- npx -y @serdaraytac/config-mode`

Users will read the display text, click the button expecting to copy the display text, and get a different string. This is a "what you see is not what you get" failure.

**Fix (auto-decided, P5):** Separate the two pieces visually:

```
┌──────────────────────────────────────────────────────────┐
│ Run this in your terminal to install:                    │
│ claude mcp add config-mode -- npx -y @serdaraytac/...   │ [Copy]
│                                                          │
│ Then use it:                                             │
│ analyze_config { "filepath": "./CLAUDE.md" }             │
└──────────────────────────────────────────────────────────┘
```

The copy button sits on the install command row, not below both. The usage example is labeled "Then use it:" so it's clear it's separate. **Auto-decided: update Task 4 HTML spec.**

---

### Design Pass 7: Accessibility + Mobile

**Accessibility gaps (auto-decided: add to implementation spec, P1):**
- Score ring SVG needs `aria-label="Score: {N}/100, Grade {G}"` — currently no aria on the SVG
- Share button needs `aria-label="Share result — copies link to clipboard"` 
- "Link copied!" state change needs `aria-live="polite"` region to announce to screen readers
- Copy button state (Copied!/Copy failed) needs same aria-live treatment
- Platform grid buttons need `aria-pressed="true/false"` for current selection state

**Mobile (no new issues):**
- @media (max-width: 680px) stacks the layout ✓
- Share button inline in score-card header will reflow correctly at narrow widths
- MCP install CTA uses monospace code — must set `word-break: break-all` at mobile widths to prevent overflow

**Auto-decided: add aria attributes + word-break to Task 4 implementation spec.**

---

### CLAUDE SUBAGENT (Design — independent review)

6 findings, 3 blockers:
1. Share button + CTA placement interrupts diagnostic flow (High)
2. Shared result state almost entirely unspecified (Critical) — blocker
3. Category scores absent from hash; bars empty on shared view (High) — blocker
4. Hash persists after share; corrupts original analyst's next load (High) — blocker
5. CTA displays usage, copies install command — mismatch (High)
6. Shared result DOM target unspecified (Medium)

*[Codex unavailable — single-model review]*

---

### Design Litmus Scorecard

```
DESIGN LITMUS SCORECARD:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Information hierarchy clear?      PARTIAL N/A    FLAGGED (CTA placement)
  2. Interaction states specified?     PARTIAL N/A    FLAGGED (shared state missing)
  3. User journey coherent?            PARTIAL N/A    FLAGGED (hash persistence bug)
  4. Design decisions specific?        PARTIAL N/A    FLAGGED (copy/display mismatch)
  5. Empty/error states handled?       YES     N/A    SINGLE-MODEL
  6. Mobile intentional?               YES     N/A    SINGLE-MODEL
  7. Accessibility specified?          NO      N/A    FLAGGED (no aria)
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. FLAGGED = issue identified. Missing voice = N/A.
```

### Design Decision Audit (added to main audit trail)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 9 | Design | Share button moves to score-card header row (right of platform pill) | Mechanical | P5 | Placement within diagnostic flow; not interrupting issues tab access | Below score card |
| 10 | Design | MCP CTA placed below tab content, not between score card and tabs | Mechanical | P5 | User reads issues first; CTA is post-discovery conversion | Between score and tabs |
| 11 | Design | Add `cats=CL,ST,TE,CV` to hash format for category scores | Mechanical | P1 | 12 extra chars; bars otherwise empty on shared card | Omit category data |
| 12 | Design | Shared result state fully specified: DOM target, simplified issue badges, banner, Analyze Mine CTA | Mechanical | P1 | Blocker — implementer would invent this from scratch | Leave unspecified |
| 13 | Design | Hash persistence bug fix: skip decode if textarea non-empty | Mechanical | P1 | Blocker — silent state corruption for returning analysts | Leave as bug |
| 14 | Design | CTA: install command is the primary code block; usage example is secondary | Mechanical | P5 | WYSIWYG principle — copy target must match displayed text | Show usage first |
| 15 | Design | Shared result DOM: `#results` with `data-mode="shared"`, tab bar hidden via CSS | Mechanical | P5 | Reuses existing DOM, minimal new code | New DOM node |
| 16 | Design | Add aria-label, aria-pressed, aria-live to share/copy buttons and score ring | Mechanical | P1 | Accessibility spec prevents silent a11y debt | No aria |

---

**PHASE 2 COMPLETE.**
Codex: unavailable [single-model].
Claude subagent: 6 issues found, all 6 auto-decided (3 blockers resolved in spec).
Design litmus: 4/7 confirmed initially, all 7 resolved via auto-decisions.
Phase-transition: passing to Phase 3 (Eng Review).

---

## Phase 3: Eng Review

**Dual voices:** Claude subagent [ran] + Codex [unavailable]

### Architecture

```
ARCHITECTURE (NEW COMPONENTS ONLY):

  web/index.html
  ├── encodeResult(platform, score, grade, cats, issues)
  │     → builds Map<code,count>, URLencodes codes
  │     → returns "#v1:platform=X&score=N&grade=G&cats=N,N,N,N&issues=CODE:N,..."
  │
  ├── decodeAndRenderSharedResult()
  │     → reads window.location.hash
  │     → if empty or no v1: prefix → return (no-op)
  │     → parses URLSearchParams after v1: prefix
  │     → validates score [0,100], cats (4 ints [0,25]), platform in PLATS
  │     → renders #results with data-mode="shared"
  │     → hides tab bar via CSS, shows simplified issue badge list
  │     → shows "Analyze your own" CTA
  │
  ├── shareResult()
  │     → calls encodeResult() → sets window.location.hash
  │     → if navigator.share available → native share
  │     → else → navigator.clipboard.writeText(window.location.href)
  │     → catch clipboard error → show "Copy failed" tooltip
  │
  ├── [DOMContentLoaded] → decodeAndRenderSharedResult() (only if hash present)
  │
  └── [showResults()] updated
        → calls encodeResult() to update/clear hash after new analysis
        → updates URL hash to reflect current analysis (not stale shared result)

  Dependencies added: NONE (no new libraries)
  Files changed: web/index.html (+~130 LOC), .gitignore (+1 line), web/og-image.png (new)
  Files deleted: web/bundle.js removed from git tracking
```

**Coupling:** Zero new coupling. All new functions are self-contained within web/index.html. No changes to bundle.js API.

**Single points of failure:** GitHub Pages CDN — mitigated by it being a static host with high availability. bundle.js load failure — existing err-box handles it.

---

### CLAUDE SUBAGENT (Eng — independent review)

8 findings:
1. `x()` missing `'` escape → attribute XSS risk in new template code (Critical)
2. `CODE:count` aggregation unspecified; multi-colon codes misparse (High)
3. cats= NaN from malformed input renders bad bars (Medium)
4. Hash persistence "fix" in Design Phase is wrong (High)
5. `navigator.clipboard` fails on `file://` URL — local test step 3 will fail (Medium)
6. Zero automated tests for encode/decode round-trip (High)
7. `x(opt.optimizedContent)` in textarea HTML-encodes content — pre-existing bug (Medium)
8. OG image has no concrete creation path — human blocker (Low)

*[Codex unavailable — single-model review]*

---

### ENG DUAL VOICES — CONSENSUS TABLE

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               YES     N/A    SINGLE-MODEL
  2. Test coverage sufficient?         NO      N/A    FLAGGED (encode.test.js missing)
  3. Performance risks addressed?      YES     N/A    SINGLE-MODEL
  4. Security threats covered?         NO      N/A    FLAGGED (x() single-quote gap)
  5. Error paths handled?              PARTIAL N/A    FLAGGED (hash persistence fix wrong)
  6. Deployment risk manageable?       YES     N/A    SINGLE-MODEL
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. FLAGGED = issue found. Missing voice = N/A.
```

---

### Engineering Decision Audit (added to main audit trail)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 17 | Eng | Add `'` → `&#39;` escape to `x()` function | Mechanical | P1 (security) | Single-quote not escaped; new template literals could create attribute XSS | Leave `x()` as-is |
| 18 | Eng | Specify encode: build Map<code,count>, encodeURIComponent each code, split on last `:` | Mechanical | P1 | Aggregation not specified; multi-issue same-code collapsing must be explicit | Leave to implementer |
| 19 | Eng | cats= decode: parseInt each, validate [0,25], fallback to 0 on NaN | Mechanical | P1 | Silent NaN renders broken bars with "NaN/25" displayed | Allow NaN |
| 20 | Eng | Hash persistence: `showResults()` calls `encodeResult()` to update hash | Mechanical | P1 | Stale hash from previous analysis is the real bug; textarea guard was wrong fix | Clear hash on new analysis |
| 21 | Eng | Test plan: add `web/encode.test.js` with round-trip + edge cases | Mechanical | P1 | Zero automated tests for encode/decode — 2am Friday risk | Manual tests only |
| 22 | Eng | Test via `npx serve web/` not `open web/index.html` — clipboard requires HTTPS/localhost | Mechanical | P5 | file:// protocol blocks clipboard API; manual test step 3 would silently fail | Test with file:// |
| 23 | Eng | Pre-existing `x(opt.optimizedContent)` textarea bug → DEFER to TODOS.md | Mechanical | P3 | Outside blast radius for this plan; doesn't affect sharing feature | Fix now |
| 24 | Eng | OG image: mark as human asset step in Task 3; provide fallback placeholder path | Mechanical | P5 | No programmatic PNG generator in repo; human step must be explicit | Automate |

---

### Test Diagram

```
NEW UX FLOWS:
  1. User clicks "Share result" → URL hash updates → clipboard/share sheet
  2. User arrives at URL with v1: hash → shared result card renders
  3. User arrives at URL with invalid/missing hash → welcome screen (no-op)
  4. User analyzes, then clicks Share, then analyzes again → hash updates to new result

NEW DATA FLOWS:
  1. analysis.issues[] → Map<code,count> → encodeResult() → URL hash string
  2. URL hash string → URLSearchParams → decodeAndRenderSharedResult() → DOM card
  3. score.categories → cats=CL,ST,TE,CV → hash → parseInt array → catBar() calls

NEW CODEPATHS:
  1. encodeResult(platform, score, grade, cats, issues) — pure function
  2. decodeAndRenderSharedResult() — conditional, reads window.location.hash
  3. shareResult() — navigator.share branch OR clipboard branch
  4. DOMContentLoaded hash check — runs before user interaction
  5. showResults() modification — updates hash after new analysis

NEW ERROR/RESCUE PATHS:
  1. malformed hash → try/catch → show welcome (no-op return)
  2. cats NaN → parseInt fallback → 0
  3. navigator.share unavailable → clipboard fallback
  4. clipboard denied → catch → "Copy failed" tooltip
  5. unknown platform in hash → no platform pill (graceful)
```

**Tests per codepath:**

| Codepath | Test type | Gap |
|---|---|---|
| encodeResult() round-trip | Unit | MISSING → web/encode.test.js |
| encodeResult() with score=0, empty issues | Unit | MISSING |
| encodeResult() special chars in codes | Unit | MISSING |
| decodeAndRenderSharedResult() valid hash | Unit/JSDOM | MISSING |
| decodeAndRenderSharedResult() malformed hash | Unit | MISSING |
| decodeAndRenderSharedResult() wrong version prefix | Unit | MISSING |
| cats NaN handling | Unit | MISSING |
| showResults() updates hash | Integration | MISSING |
| navigator.share fallback to clipboard | Mock | MISSING |

---

### NOT IN SCOPE (Eng — deferred to TODOS.md)

- `x(opt.optimizedContent)` textarea pre-existing HTML-encode bug (Decision #23)
- `doCopy()` missing catch block for clipboard denial (pre-existing)
- Analytics/observability (no backend, deferred from CEO phase)
- Accessibility improvements beyond what's specified (partial a11y added to spec in Phase 2)

---

### What Already Exists (Eng)

- `ConfigMode.analyze()` → `{platform, issues: [{code, severity, message, context?, line?}], tokenCount, estimatedCostUsd}` — complete
- `ConfigMode.score()` → `{overall: 0-100, grade: A-F, categories: {clarity, structure, tokenEfficiency, coverage}}` — complete, all integers 0-25
- `ConfigMode.optimize()` → `{optimizedContent, changesSummary}` — complete
- `x()` XSS escape at line 499 — exists, needs `'` → `&#39;` added
- `.copy-btn` with "Copied!" 2-second feedback pattern at line 491 — reuse for share/CTA buttons

---

### Failure Modes Registry (updated)

| Failure | Probability | Impact | Mitigation (updated) |
|---|---|---|---|
| Stale hash after new analysis | Medium (before fix) | Medium | `showResults()` calls `encodeResult()` to update hash (Decision #20) |
| XSS via platform/issue code in attribute context | Low | High | `x()` extended to escape `'` (Decision #17) |
| Encode/decode round-trip regression | Medium (no tests) | High | `web/encode.test.js` (Decision #21) |
| cats= NaN renders "NaN/25" | Low | Medium | parseInt + [0,25] validation (Decision #19) |
| Clipboard fail on local dev | High (file://) | Low | Use `npx serve web/` for testing (Decision #22) |
| OG image missing on deploy | Medium (human step) | Low | Mark as explicit human step in Task 3 (Decision #24) |
| Stale shared URL (issue codes changed) | Medium (future) | Low | URL version prefix v1: (Decision #4) |

---

### Completion Summary (Eng)

| Area | Status | Key Finding |
|---|---|---|
| Architecture | Clean | Additive, no coupling, no new dependencies |
| Security | Fix required | `x()` single-quote gap (Decision #17) |
| Error handling | Fix required | Hash persistence logic corrected (Decision #20) |
| Tests | Gap identified | `web/encode.test.js` needed (Decision #21) |
| Performance | No issues | Static client-side, O(n) encoding |
| Deployment | No issues | Pages CI workflow is ready |
| Code quality | Minor | Pre-existing textarea XSS-encode deferred |

---

**PHASE 3 COMPLETE.**
Codex: unavailable [single-model].
Claude subagent: 8 issues found, 7 auto-decided, 1 deferred to TODOS.
Eng consensus: 3/6 confirmed, 3 flagged (all resolved via auto-decisions).
Phase-transition: passing to Phase 3.5 (DX Review).

---

## Phase 3.5: DX Review

**DX scope detected:** MCP server + web demo (both developer-facing surfaces).
**Dual voices:** Claude subagent [ran] + Codex [unavailable]

### Step 0: DX Scope Assessment

**Product type:** Developer tool (MCP server + zero-config web demo).  
**Target developer:** AI/ML developers using Claude Code, Cursor, Cline, or similar.  
**Initial DX score: 6/10.**

DX is solid on the web demo side (paste config → score in 45 seconds, zero setup). DX has significant gaps on the MCP server side: newcomers to MCP don't know where to type tool calls, no verification step after install, error shapes undocumented.

**Developer journey:**

| Stage | Current State | Gap |
|---|---|---|
| Discover | Web demo → see score → install CTA | CTA doesn't say WHERE to type the tool call |
| Install | `claude mcp add ...` one-liner | No verify step; JSON config is shown first (more friction) |
| First use | `analyze_config { "filepath": "..." }` | Newcomers don't know this goes in Claude chat |
| Error recovery | File not found, unknown platform | No error shape documented |
| Advanced use | `scan_project`, `optimize_config` | `optimize_config` output format undocumented |
| Platform override | Manual platform hint | `filename` param name collides with `filepath` semantics |

**Developer empathy narrative:**

> I just ran my CLAUDE.md through the web demo and got a C. The MCP install CTA shows a command — I copy it and run it in my terminal. It completes, no output. Now what? I type `analyze_config { "filepath": "./CLAUDE.md" }` in... Claude? My terminal? The chat? I try the chat. Nothing happens. I restart Claude Code. Now it works — but I didn't know I had to restart. Nobody told me. I scored a C in my own CLAUDE.md but it took me 8 minutes to set up the tool that would have told me why.

**TTHW (time to hello world):** Web demo: ~45 seconds ✓. MCP: ~4 minutes (install + restart + first result). Target: under 3 minutes for MCP.

---

### DX DUAL VOICES — CONSENSUS TABLE

```
DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Getting started < 5 min?          YES*    N/A    SINGLE-MODEL (*web: yes, MCP: borderline)
  2. API/CLI naming guessable?         PARTIAL N/A    FLAGGED (filename vs filepath collision)
  3. Error messages actionable?        NO      N/A    FLAGGED (undocumented)
  4. Docs findable & complete?         PARTIAL N/A    FLAGGED (MCP newcomer gap)
  5. Upgrade path safe?                YES     N/A    SINGLE-MODEL
  6. Dev environment friction-free?    PARTIAL N/A    FLAGGED (no verify step)
═══════════════════════════════════════════════════════════════
```

---

### DX Passes 1-8 (auto-evaluated at full depth)

**Pass 1 — Getting Started (web demo): 9/10.** Platform picker → paste → analyze → results. 45 seconds. No friction. Shared URL arrival also smooth after Phase 2 spec additions.

**Pass 2 — Getting Started (MCP): 6/10.**
- Gap: JSON config block shown before one-liner. Promote one-liner to top (Decision #25).
- Gap: No verify step after install. Add "Restart + run scan_project" (Decision #26).
- Gap: No "type this in Claude Code chat" instruction (Decision #27).
- All three auto-decided (P1 completeness).

**Pass 3 — Error Messages: 5/10.**
- Gap: No error response shape in README (Decision #28).
- Gap: Web CTA "Then use it:" doesn't say WHERE (Decision #29).
- Both auto-decided (P1).

**Pass 4 — API/CLI Ergonomics: 7/10.**
- Gap: `filename` vs `filepath` naming collision → DEFER to TODOS.md (breaking change, Decision #30).
- Gap: No `platform` override parameter → DEFER to TODOS.md (new feature, Decision #31).
- Gap: `optimize_config` output format undocumented → add to README (Decision #32).

**Pass 5 — Documentation: 7/10.**
- All examples are copy-paste complete except for the "where to type" gap.
- `scan_project` depth/symlink undocumented → add 1 sentence (Decision #33).
- After fixes: 9/10 expected.

**Pass 6 — Upgrade Path: 9/10.** Versioned npm package. `npx -y` always fetches latest. No breaking changes in this plan. Deferred API renaming would be a semver bump — noted in TODOS.

**Pass 7 — Environment Setup: 8/10.** No local install needed for web demo. MCP install is one command. Gap: verify step (Decision #26).

**Pass 8 — Escape Hatches: 6/10.** `filepath` overrides platform detection indirectly via filename matching. No explicit platform override (deferred). `scan_project directory` parameter works. No glob/depth docs (Decision #33).

---

### DX Decision Audit (added to main audit trail)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 25 | DX | Promote `claude mcp add` one-liner to top of Quick Start in README | Mechanical | P1 | JSON config block has more friction; one-liner is the correct primary path | JSON config first |
| 26 | DX | Add "Restart Claude Code, then run `scan_project { "directory": "." }`" after install | Mechanical | P1 | Zero verification step; developer gets confused on first run | Leave out |
| 27 | DX | Add "In Claude Code, type these in the chat window" before tool usage examples | Mechanical | P1 | MCP newcomers don't know where tool calls go | Assume MCP knowledge |
| 28 | DX | Add one error response example to README: `{ "error": "File not found: ./CLAUDE.md" }` | Mechanical | P1 | No error shape documented; first error is opaque | Leave undocumented |
| 29 | DX | Change web CTA "Then use it:" to "Then in Claude Code, type:" | Mechanical | P5 | 7-word fix closes the "where to type" gap for web demo visitors | Leave as "Then use it:" |
| 30 | DX | `filename` vs `filepath` API collision → DEFER to TODOS.md (breaking API change) | Mechanical | P3 | Outside blast radius; semver bump required | Rename now |
| 31 | DX | `platform` override parameter for `analyze_config` → DEFER to TODOS.md | Mechanical | P3 | New MCP server feature; outside this plan's scope | Add now |
| 32 | DX | Add `optimize_config` JSON response shape to README | Mechanical | P1 | Undocumented; developers can't predict output format | Leave undocumented |
| 33 | DX | Add one-sentence note on `scan_project` depth behavior to README | Mechanical | P1 | Monorepo developers will hit this in first week | Leave undocumented |

---

### DX Scorecard

| Dimension | Before | After fixes | Target |
|---|---|---|---|
| Web demo TTHW | 45s / 9/10 | 45s / 9/10 | ≤ 60s |
| MCP install TTHW | ~4min / 6/10 | ~2.5min / 8/10 | ≤ 5min |
| Error messages | 5/10 | 7/10 | 8/10 |
| Docs quality | 7/10 | 9/10 | 9/10 |
| API ergonomics | 7/10 | 7/10 (deferred fixes) | 9/10 |
| Escape hatches | 6/10 | 6/10 (deferred) | 8/10 |
| **Overall DX** | **6.5/10** | **8/10** | **8/10** |

---

### DX NOT IN SCOPE (deferred to TODOS.md)

- `filename` → `platform`/`hint` API rename (breaking change, semver bump required)
- `platform` override parameter for `analyze_config` (new MCP feature)
- Glob support and depth documentation for `scan_project` advanced use (low priority)

---

### DX Implementation Checklist

- [ ] README: promote `claude mcp add` one-liner to top of Quick Start
- [ ] README: add restart + verify step after install command
- [ ] README: add "In Claude Code, type these in the chat window" before tool usage
- [ ] README: add error response example (`{ "error": "..." }`)
- [ ] README: add `optimize_config` JSON response shape
- [ ] README: add `scan_project` depth behavior note
- [ ] Web CTA: change "Then use it:" to "Then in Claude Code, type:"

---

**PHASE 3.5 COMPLETE.**
DX overall: 6.5/10 → 8/10 after fixes.
TTHW: web ~45s (excellent), MCP ~4min → 2.5min after README improvements.
Codex: unavailable.
Claude subagent: 9 issues found, 7 auto-decided, 2 deferred to TODOS.
DX consensus: 3/6 confirmed, 3 flagged (all resolved via auto-decisions or deferral).
Phase-transition: passing to Phase 4 (Final Approval Gate).

---

## Cross-Phase Themes

- **Completeness of shared-result state spec:** Flagged independently by Design (Pass 3, blocker) and Eng (hash persistence). High-confidence signal — this state requires the most careful implementation.
- **x() XSS escaping discipline:** Flagged by Eng (single-quote gap) and noted in CEO (all hash-decoded values must pass through x()). High-confidence signal — one missed `x()` call is a XSS vulnerability.
- **Test gap for new browser functions:** Flagged by Eng (encode.test.js missing). New JavaScript-only functions (encodeResult, decodeAndRenderSharedResult) have zero automated tests — must be added.

No cross-phase themes between Design and DX phases. Each phase's concerns were distinct.

---

## TODOS.md (deferred scope)

The following items are deferred from this plan. Write to TODOS.md on approval:

- [ ] Cross-platform config migration tool ("convert .cursorrules → CLAUDE.md") — CEO Phase, Decision #3
- [ ] Analytics/tracking (Plausible or Fathom, 1 script tag) — CEO Phase, Section 8
- [ ] Accessibility: aria-label improvements beyond what's spec'd in Phase 2 — Design Phase
- [ ] Pre-existing textarea HTML-encode bug: `x(opt.optimizedContent)` → use `textContent` — Eng Phase, Decision #23
- [ ] Pre-existing `doCopy()` missing catch block for clipboard denial — Eng Phase
- [ ] `analyze_config` optional `platform` parameter override — DX Phase, Decision #31
- [ ] `filename` → `platform`/`hint` parameter rename (semver bump) — DX Phase, Decision #30
- [ ] `scan_project` glob support and depth documentation — DX Phase

---
