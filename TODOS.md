# TODOS

Deferred from the web demo + shareable score cards plan (2026-05-18).

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
