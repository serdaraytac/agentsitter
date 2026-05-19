# TODOS

Deferred from the web demo + shareable score cards plan (2026-05-18).
Deferred from the agentsitter web redesign plan (2026-05-19).

## Features

- [ ] **Cross-platform migration tool** — "Convert .cursorrules → CLAUDE.md" wizard. Defensible moat no platform will build. Requires new MCP tool, new UI, validation logic per platform pair.
- [ ] **`analyze_config` platform override parameter** — Allow callers to pass `{ "filepath": "./AGENTS.md", "platform": "amp" }` to override auto-detection. Currently platform is inferred from filename; shared filenames like AGENTS.md need an explicit hint.
- [ ] **Analytics** — Add Plausible or Fathom (1 script tag, no backend) to measure web tool usage: visits, analyses run, share button clicks, CTA copies.

## Fixes

- [ ] **`x(opt.optimizedContent)` textarea pre-existing bug** — Using `x()` (HTML escape) to set a `<textarea>` value double-escapes `&`, `<`, `>`. Fix: set `textarea.value = opt.optimizedContent` directly via JS instead of innerHTML, or use `textContent`.
- [ ] **`doCopy()` missing catch block** — `navigator.clipboard.writeText()` can throw on non-HTTPS or when permission is denied. Add `.catch()` to show a "Copy failed" message.

## API / DX

- [ ] **`filename` → `platform`/`hint` rename** — The `filename` parameter in `analyze_config` collides with `filepath` semantics. Rename to `platform` or `hint` in a semver bump.
- [ ] **`scan_project` glob and depth options** — Document or expose depth control and glob filtering for monorepos with many config files.

## Accessibility

- [ ] **aria improvements** — Add `aria-live` regions for clipboard copy feedback ("Copied!" / "Copy failed"), improve keyboard navigation for the platform grid.

## Phase 2 — agentsitter web (deferred 2026-05-19)

- [ ] **Analytics** — Plausible or Fathom (1 script tag, no backend, GDPR-compliant). Measure: landing visits, demo CTA clicks, analyses run, badge copies, share button clicks. Priority: add at next deploy. Effort: S (human: ~30min / CC: ~5min).
- [ ] **Platform adaptive accent color — accessibility pass** — Verify WCAG 3:1 contrast ratio for all 13 platform colors against `--bg: #0d1117`. Some lighter colors (amp #f59e0b, kimi #06b6d4) may need darkening. Effort: S.
- [ ] **Live Hall of Fame** — Replace 3 hardcoded example cards with dynamically populated top-scoring configs from real users (requires a lightweight backend or a manually-curated JSON). Phase 2 after user adoption.
- [ ] **GitHub Actions CI score gate** — Fail CI if agentsitter score drops below a configured threshold. Requires a new MCP tool or CLI mode. Phase 2 after product-market fit signals.
- [ ] **Dynamic badge URL** — Today's badge is a shields.io snapshot URL. Phase 2: a stable endpoint that serves live score for a given repo + platform combo (requires backend).
- [ ] **DESIGN.md** — Create canonical design token documentation (color vars, typography split, component vocabulary). Currently embedded in the 2026-05-19 CEO plan only. Promote to DESIGN.md when site has 3+ pages or an active design contributor. Surfaced during /plan-design-review 2026-05-19. Depends on: Phase 1 implementation complete. Effort: S (human: ~20min / CC: ~5min).
