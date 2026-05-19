# agentsitter Design System

> Read this file before making any UI decisions. All visual choices live here.

## Design Philosophy

agentsitter makes a bold claim: your AI doesn't know who you are — and that costs you. The design must project the same confidence. No ambiguity, no visual softness, no dark-mode developer cliché. Light, trustworthy, editorial.

**Three principles:**
1. **Credibility over decoration** — a tool that grades your config must look like it knows what it's doing
2. **The score is the hero** — everything leads to a number; make that number feel weighty and real
3. **Cream, not chrome** — warm off-white background signals quality and care, not a generic GitHub clone

---

## Color Tokens

```css
:root {
  /* Backgrounds */
  --bg:         #FAF8F5;  /* warm off-white — primary canvas */
  --surface:    #F3F0EB;  /* cards, panels */
  --surface2:   #EDE9E2;  /* score ring track, nested surfaces */

  /* Borders */
  --border:     #D9D3C8;  /* primary dividers */
  --border-sub: #E5E1D9;  /* subtle inner borders */

  /* Text */
  --text:       #111827;  /* primary text — near-black */
  --muted:      #6B7280;  /* secondary text, labels */

  /* Brand */
  --accent:     #D97706;  /* amber — agentsitter brand color */
  --accent-hover: #B45309; /* hover state */
  --accent-bg:  #FEF3C7;  /* amber tint for backgrounds */

  /* Semantic */
  --ok:         #059669;  /* Grade A, success, no-issues */
  --warn:       #D97706;  /* Grade C, warnings (same as accent) */
  --err:        #DC2626;  /* Grade F, critical issues */
  --info:       #2563EB;  /* Grade B, info issues */

  /* Misc */
  --r:          8px;
}
```

### Platform accent overrides
When a platform is selected in the demo, `--accent` is overridden via JS:
```js
document.documentElement.style.setProperty('--accent', plat.color);
```
Platform colors: Claude=#D97706, Cursor=#6366F1, Cline=#059669, Codex=#10B981, Gemini=#4285F4, Copilot=#8B5CF6, Windsurf=#0EA5E9, Amp=#F59E0B, OpenCode=#EF4444, Warp=#7C3AED, Kimi=#06B6D4, Antigravity=#EC4899, Firebender=#F97316.

### Grade colors (light-mode adjusted)
| Grade | Color     | Hex       |
|-------|-----------|-----------|
| A     | Green     | `#059669` |
| B     | Blue      | `#2563EB` |
| C     | Amber     | `#D97706` |
| D     | Orange    | `#EA580C` |
| F     | Red       | `#DC2626` |

Score ring fill colors (by threshold): ≥90→`#059669`, ≥75→`#2563EB`, ≥60→`#D97706`, ≥40→`#EA580C`, <40→`#DC2626`.

---

## Typography

```css
--font-mono:  'JetBrains Mono', monospace;   /* hero, code, badges, logo */
--font-body:  'Geist', 'Geist Sans', -apple-system, sans-serif;  /* UI text */
--font-data:  'Geist Mono', 'JetBrains Mono', monospace;         /* stats, numbers */
--font-serif: 'Lora', Georgia, serif;        /* hero headline, grade letters */
```

### Font loading
```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&family=Lora:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
<!-- Geist via jsDelivr CDN -->
<style>
@import url('https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-sans/style.css');
@import url('https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-mono/style.css');
</style>
```

### Type scale
| Role              | Font          | Size           | Weight | Style  |
|-------------------|---------------|----------------|--------|--------|
| Hero headline     | Lora          | clamp(2rem, 4.5vw, 3.6rem) | 700 | italic |
| Logo wordmark     | JetBrains Mono| 15–16px        | 700    | normal |
| Section heading   | Geist         | 18–24px        | 700    | normal |
| Body              | Geist         | 14–15px        | 400    | normal |
| Grade letter      | Lora          | 28–72px        | 700    | italic |
| Code / data       | Geist Mono    | 11–13px        | 400    | normal |
| Labels / caps     | JetBrains Mono| 9–11px         | 600    | normal |

---

## Logo

### Specification
```
🍼 agent(#111827) sitter(#D97706)
```
- Font: JetBrains Mono, 700, letter-spacing: -0.02em
- Emoji: 16px (header), 24px (standalone)
- `agent` = `var(--text)` (#111827)
- `sitter` = `var(--accent)` (#D97706)
- No italic, no underline

### Tagline
`Fix and maintain your AI agent behavior`
- Font: Geist body, 9–11px, normal weight
- Color: `var(--muted)` (#6B7280)
- Positioned directly below wordmark, left-aligned with wordmark text (not emoji)

### HTML pattern
```html
<div class="logo-block">
  <a href="/" class="logo">🍼 agent<em>sitter</em></a>
  <div class="logo-tagline">Fix and maintain your AI agent behavior</div>
</div>
```
```css
.logo { font-family: var(--font-mono); font-size: 16px; font-weight: 700;
        letter-spacing: -0.02em; text-decoration: none; color: var(--text);
        display: flex; align-items: center; gap: 5px; }
.logo em { color: var(--accent); font-style: normal; }
.logo-block { display: flex; flex-direction: column; gap: 0; }
.logo-tagline { font-size: 9px; color: var(--muted); padding-left: 22px; line-height: 1; }
```

---

## Score Ring

### Landing page hero ring (large, CSS-animated)
The score ring is the most important element. It must be large and visually dominant.

```html
<div class="hero-ring-wrap">
  <svg class="hero-ring-svg" viewBox="0 0 240 240">
    <circle cx="120" cy="120" r="100" fill="none" stroke="var(--surface2)" stroke-width="22"/>
    <circle class="hero-ring-fill" cx="120" cy="120" r="100" fill="none"
      stroke="var(--accent)" stroke-width="22" stroke-linecap="round"
      stroke-dasharray="628" stroke-dashoffset="94"
      transform="rotate(-90 120 120)"/>
  </svg>
  <div class="hero-ring-center">
    <div class="hero-ring-num"></div>  <!-- CSS counter animation -->
    <div class="hero-ring-grade">A</div>
    <div class="hero-ring-lbl">example</div>
  </div>
</div>
```

```css
.hero-ring-wrap {
  width: 240px; height: 240px; position: relative; margin: 0 auto 48px;
  filter: drop-shadow(0 8px 32px rgba(217,119,6,0.18));
}
.hero-ring-svg { width: 240px; height: 240px; }
.hero-ring-fill { animation: ring-in 1.4s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes ring-in { from { stroke-dashoffset: 628; } to { stroke-dashoffset: 94; } }

/* CSS counter animation for score number */
@property --score-num { syntax: '<integer>'; initial-value: 0; inherits: false; }
.hero-ring-num {
  font-family: var(--font-mono); font-size: 64px; font-weight: 700; color: var(--text);
  line-height: 1;
  --score-num: 0;
  animation: score-count 1.4s cubic-bezier(0.22,1,0.36,1) forwards;
  counter-reset: score var(--score-num);
}
.hero-ring-num::before { content: counter(score); }
@keyframes score-count { from { --score-num: 0; } to { --score-num: 85; } }
.hero-ring-grade { font-family: var(--font-serif); font-size: 28px; font-weight: 700;
                   font-style: italic; color: var(--accent); line-height: 1; }
.hero-ring-lbl { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
                 color: var(--muted); font-family: var(--font-mono); margin-top: 4px; }
```

### Demo page ring (SVG, JS-rendered, inside score-card)
Size: 106×106px, r=44, stroke-width=9.  
Colors: track=`#EDE9E2`, fill=score-based color, score text=`#111827`.

```js
function scoreRing(s, grade) {
  const R = 44, C = 2 * Math.PI * R;
  const clr = s>=90 ? '#059669' : s>=75 ? '#2563EB' : s>=60 ? '#D97706' : s>=40 ? '#EA580C' : '#DC2626';
  const dash = (s / 100 * C).toFixed(1);
  return `<svg width="106" height="106" viewBox="0 0 106 106">
    <circle cx="53" cy="53" r="${R}" fill="none" stroke="#EDE9E2" stroke-width="9"/>
    <circle cx="53" cy="53" r="${R}" fill="none" stroke="${clr}" stroke-width="9"
      stroke-dasharray="${dash} ${C.toFixed(1)}" stroke-linecap="round"
      transform="rotate(-90 53 53)"/>
    <text x="53" y="48" text-anchor="middle" dominant-baseline="central"
      fill="#111827" font-size="26" font-weight="700" font-family="-apple-system,sans-serif" id="scoreRingNum">${s}</text>
    <text x="53" y="67" text-anchor="middle" fill="${clr}" font-size="11" font-weight="600"
      font-family="-apple-system,sans-serif">Grade ${grade}</text>
  </svg>`;
}
```

---

## Key Components

### Primary button
```css
.btn-primary {
  background: var(--text); color: var(--bg);
  font-family: var(--font-body); font-size: 15px; font-weight: 600;
  padding: 12px 28px; border-radius: var(--r); min-height: 44px;
}
.btn-primary:hover { background: #1f2937; }
```

### Amber full-bleed CTA band (landing page footer)
```css
.amber-band {
  background: var(--accent); color: #fff;
  padding: 64px 24px; text-align: center;
}
.amber-band .btn-white {
  background: #fff; color: var(--accent); font-weight: 700;
  padding: 14px 36px; border-radius: var(--r); text-decoration: none;
}
```

### Category progress bars
```js
function catBar(label, val) {
  const p = Math.round((val/25)*100);
  const clr = p>=80 ? '#059669' : p>=60 ? '#D97706' : '#DC2626';
  ...
}
```

### Issue severity badges (light mode)
```css
.sev.critical { background: rgba(220,38,38,.1);  color: #DC2626; }
.sev.warning  { background: rgba(217,119,6,.12); color: #D97706; }
.sev.info     { background: rgba(37,99,235,.1);  color: #2563EB; }
```

---

## Layout

### Landing page (`/`)
1. Sticky header: logo-block + ver badge + nav (Docs · GitHub · Score CTA)
2. Hero: animated score ring (240px) + Lora h1 + sub + CTA button + secondary links
3. Platform strip: horizontal scroll, 13 chips with color dots
4. Features: 3-column grid (Score / Fix / Share), separated by borders
5. Hall of Fame: 3 hardcoded score cards
6. Amber full-bleed CTA band
7. Footer: light

### Demo page (`/demo/`)
1. Sticky header: logo-block (links to `../`) + ver badge + GitHub link
2. 2-column layout: left panel (platform grid + textarea + analyze button) / right panel (results)
3. Results: stats row → score card (ring + category bars) → tabs (Issues / Optimized) → action buttons → MCP install CTA

---

## Decisions Log

| Date       | Decision                                     | Reason                                              |
|------------|----------------------------------------------|-----------------------------------------------------|
| 2026-05-19 | Light mode (#FAF8F5) instead of dark         | More trustworthy, cleaner; user request             |
| 2026-05-19 | Lora Bold Italic for hero headline           | Editorial authority; JetBrains Mono was too thin    |
| 2026-05-19 | Score ring 240px, stroke-width 22 in hero    | Score is the product's core claim; must feel real   |
| 2026-05-19 | agent(dark)+sitter(amber) two-tone logo      | Two words, two meanings, one wordmark               |
| 2026-05-19 | Tagline "Fix and maintain your AI agent behavior" | Clarifies value prop below wordmark            |
| 2026-05-19 | Amber full-bleed CTA band                    | Bold, high-contrast scroll stopper                  |
| 2026-05-19 | Confetti at score > 80                       | Celebration for genuinely good configs              |
