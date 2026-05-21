# Changelog

All notable changes to agentsitter are documented here.

## [1.3.4] - 2026-05-21

### Changed
- License switched from Elastic-2.0 to MIT.
- README updated with MIT badge and MIT footer note.

## [1.2.0] - 2026-05-19

### Added
- **Landing page** (`/`) — new marketing page with hero headline, platform badge strip (13 platforms), Hall of Fame section (3 hardcoded high-score cards), and feature bullets (Score / Fix / Share). JetBrains Mono display font for hero text.
- **Demo split** (`/demo/`) — tool moved to `/demo/` subdirectory; landing page and tool are now separate pages on GitHub Pages.
- **Score badge generator** — shields.io snapshot badge URL with grade→color mapping (A=brightgreen, B=blue, C=yellow, D=orange, F=red). Copy Markdown button in results panel.
- **Share on X** — auto-generated tweet text "I scored my {platform} config: {score}/100 (Grade {grade}) with agentsitter 🍼" with Twitter intent link. Primary CTA in results panel.
- **Score count-up animation** — score ring counts from 0 to final score over 900ms on Analyze.
- **Confetti** (canvas-confetti via CDN) — fires when score > 80 and `prefers-reduced-motion` is not set.
- **Platform adaptive accent colors** — each platform selection sets a CSS `--accent` variable (amber for Claude, indigo for Cursor, emerald for Cline, etc.).
- **Logo links back to landing** — `.logo` in `/demo/` wraps `<a href="../">` for standard UX.
- Unit tests for `buildBadgeUrl` (5 grade→color assertions) and `buildTweetText` (platform name, score, grade, URL).

### Fixed
- **Textarea double-escape bug** — optimized config content now set via `.value` instead of `innerHTML`, eliminating HTML entity corruption.
- **Clipboard catch block** — `doCopy()` now has `.catch()` handler showing "Copy failed" on clipboard write failure.

### Changed
- `build:web` output path updated from `web/bundle.js` to `web/demo/bundle.js`.
- Results panel button hierarchy: primary row (Copy config + Share on X), secondary row (Share URL + Copy badge).
- OG meta tags updated: landing page gets agentsitter homepage URL; demo page gets `/demo/` URL and tool-specific title/description.

## [1.1.0] - 2026-05-18

### Added
- Web demo with shareable score cards and MCP install CTA.

## [1.0.3] - 2026-05-17

### Added
- Wildcard dir scanning, Copilot path-specific instructions, Cursor legacy detection.
