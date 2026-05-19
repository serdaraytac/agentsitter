import { describe, it, expect } from 'vitest';

// Inline the pure encode/decode logic for testing.
// These functions mirror the implementations in web/index.html.
function encodeResult(sc, a) {
  const { platform } = a;
  const { overall: score, grade, categories: cats } = sc;
  const issueMap = new Map();
  for (const iss of a.issues) {
    issueMap.set(iss.code, (issueMap.get(iss.code) || 0) + 1);
  }
  const issuesStr = [...issueMap.entries()]
    .map(([code, cnt]) => `${encodeURIComponent(code)}:${cnt}`)
    .join(',');
  let hash = `v1:platform=${encodeURIComponent(platform)}&score=${score}&grade=${grade}&cats=${cats.clarity},${cats.structure},${cats.tokenEfficiency},${cats.coverage}`;
  if (issuesStr) hash += `&issues=${issuesStr}`;
  return hash;
}

function decodeResultHash(hash) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith('v1:')) return null;
  const qs = raw.slice(3);
  const params = {};
  for (const part of qs.split('&')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    params[part.slice(0, eq)] = part.slice(eq + 1);
  }
  const platform = decodeURIComponent(params.platform || 'claude');
  const score = parseInt(params.score, 10);
  const grade = params.grade || 'F';
  if (isNaN(score) || score < 0 || score > 100) return null;

  const catsParts = (params.cats || '0,0,0,0').split(',').map(n => {
    const v = parseInt(n, 10);
    return isNaN(v) ? 0 : Math.max(0, Math.min(25, v));
  });
  const [clarity, structure, tokenEfficiency, coverage] = catsParts;

  const issues = [];
  if (params.issues) {
    for (const part of params.issues.split(',')) {
      if (!part) continue;
      const colon = part.lastIndexOf(':');
      if (colon < 0) continue;
      const code = decodeURIComponent(part.slice(0, colon));
      const cnt = parseInt(part.slice(colon + 1), 10) || 1;
      if (code) issues.push({ code, count: cnt });
    }
  }
  return { platform, score, grade, clarity, structure, tokenEfficiency, coverage, issues };
}

// ── encodeResult ──────────────────────────────────────────────────────────

describe('encodeResult', () => {
  it('produces a v1: prefixed hash string', () => {
    const sc = { overall: 71, grade: 'C', categories: { clarity: 18, structure: 15, tokenEfficiency: 24, coverage: 12 } };
    const a = { platform: 'claude', issues: [] };
    expect(encodeResult(sc, a)).toMatch(/^v1:/);
  });

  it('encodes all required fields', () => {
    const sc = { overall: 71, grade: 'C', categories: { clarity: 18, structure: 15, tokenEfficiency: 24, coverage: 12 } };
    const a = { platform: 'claude', issues: [
      { code: 'VAGUE_RULE', severity: 'warning', message: 'x' },
      { code: 'VAGUE_RULE', severity: 'warning', message: 'y' },
      { code: 'MISSING_SECTION', severity: 'info', message: 'z' },
    ]};
    const hash = encodeResult(sc, a);
    expect(hash).toContain('platform=claude');
    expect(hash).toContain('score=71');
    expect(hash).toContain('grade=C');
    expect(hash).toContain('cats=18,15,24,12');
    expect(hash).toContain('VAGUE_RULE:2');
    expect(hash).toContain('MISSING_SECTION:1');
  });

  it('omits issues= param when issues array is empty', () => {
    const sc = { overall: 95, grade: 'A', categories: { clarity: 25, structure: 25, tokenEfficiency: 25, coverage: 20 } };
    const a = { platform: 'cursor', issues: [] };
    expect(encodeResult(sc, a)).not.toContain('issues=');
  });

  it('URL-encodes issue codes that contain special chars', () => {
    const sc = { overall: 30, grade: 'F', categories: { clarity: 5, structure: 8, tokenEfficiency: 10, coverage: 7 } };
    const a = { platform: 'copilot', issues: [
      { code: 'COPILOT_WRONG_LOCATION', severity: 'critical', message: '' },
    ]};
    const hash = encodeResult(sc, a);
    expect(hash).toContain('COPILOT_WRONG_LOCATION:1');
  });

  it('aggregates duplicate issue codes into counts', () => {
    const sc = { overall: 40, grade: 'D', categories: { clarity: 8, structure: 10, tokenEfficiency: 12, coverage: 10 } };
    const a = { platform: 'claude', issues: [
      { code: 'VAGUE_RULE', severity: 'warning', message: 'a' },
      { code: 'VAGUE_RULE', severity: 'warning', message: 'b' },
      { code: 'VAGUE_RULE', severity: 'warning', message: 'c' },
    ]};
    const hash = encodeResult(sc, a);
    expect(hash).toContain('VAGUE_RULE:3');
    const issueMatches = (hash.match(/VAGUE_RULE/g) || []).length;
    expect(issueMatches).toBe(1);
  });

  it('handles score=0 and grade=F edge case', () => {
    const sc = { overall: 0, grade: 'F', categories: { clarity: 0, structure: 0, tokenEfficiency: 0, coverage: 0 } };
    const a = { platform: 'cline', issues: [] };
    const hash = encodeResult(sc, a);
    expect(hash).toContain('score=0');
    expect(hash).toContain('grade=F');
    expect(hash).toContain('cats=0,0,0,0');
  });
});

// ── buildBadgeUrl ─────────────────────────────────────────────────────────

function buildBadgeUrl(score, grade) {
  const colorMap = { A:'brightgreen', B:'blue', C:'yellow', D:'orange', F:'red' };
  const color = colorMap[grade] || 'lightgrey';
  return `https://img.shields.io/badge/agentsitter-${score}%2F${grade}-${color}`;
}

describe('buildBadgeUrl', () => {
  it('grade A → brightgreen', () => {
    expect(buildBadgeUrl(94, 'A')).toBe('https://img.shields.io/badge/agentsitter-94%2FA-brightgreen');
  });
  it('grade B → blue', () => {
    expect(buildBadgeUrl(78, 'B')).toBe('https://img.shields.io/badge/agentsitter-78%2FB-blue');
  });
  it('grade C → yellow', () => {
    expect(buildBadgeUrl(61, 'C')).toBe('https://img.shields.io/badge/agentsitter-61%2FC-yellow');
  });
  it('grade D → orange', () => {
    expect(buildBadgeUrl(45, 'D')).toBe('https://img.shields.io/badge/agentsitter-45%2FD-orange');
  });
  it('grade F → red', () => {
    expect(buildBadgeUrl(20, 'F')).toBe('https://img.shields.io/badge/agentsitter-20%2FF-red');
  });
});

// ── buildTweetText ────────────────────────────────────────────────────────

const PLATS_TEST = [
  { id:'claude', name:'Claude Code' },
  { id:'cursor', name:'Cursor' },
];

function buildTweetText(platform, score, grade) {
  const platName = PLATS_TEST.find(p => p.id === platform)?.name || platform;
  return `I scored my ${platName} config: ${score}/100 (Grade ${grade}) with agentsitter 🍼 Try yours: https://serdaraytac.github.io/agentsitter/demo/`;
}

describe('buildTweetText', () => {
  it('includes platform name', () => {
    expect(buildTweetText('claude', 87, 'A')).toContain('Claude Code');
  });
  it('includes score', () => {
    expect(buildTweetText('claude', 87, 'A')).toContain('87/100');
  });
  it('includes grade', () => {
    expect(buildTweetText('claude', 87, 'A')).toContain('Grade A');
  });
  it('includes demo URL', () => {
    expect(buildTweetText('cursor', 72, 'B')).toContain('https://serdaraytac.github.io/agentsitter/demo/');
  });
  it('falls back to platform id for unknown platform', () => {
    expect(buildTweetText('unknown_plat', 50, 'C')).toContain('unknown_plat');
  });
});

// ── decodeResultHash ──────────────────────────────────────────────────────

describe('decodeResultHash', () => {
  it('round-trips: encode → decode', () => {
    const sc = { overall: 71, grade: 'C', categories: { clarity: 18, structure: 15, tokenEfficiency: 24, coverage: 12 } };
    const a = { platform: 'claude', issues: [
      { code: 'VAGUE_RULE', severity: 'warning', message: 'x' },
      { code: 'VAGUE_RULE', severity: 'warning', message: 'y' },
      { code: 'MISSING_SECTION', severity: 'info', message: 'z' },
    ]};
    const hash = encodeResult(sc, a);
    const decoded = decodeResultHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded.platform).toBe('claude');
    expect(decoded.score).toBe(71);
    expect(decoded.grade).toBe('C');
    expect(decoded.clarity).toBe(18);
    expect(decoded.structure).toBe(15);
    expect(decoded.tokenEfficiency).toBe(24);
    expect(decoded.coverage).toBe(12);
    expect(decoded.issues).toHaveLength(2);
    expect(decoded.issues.find(i => i.code === 'VAGUE_RULE').count).toBe(2);
    expect(decoded.issues.find(i => i.code === 'MISSING_SECTION').count).toBe(1);
  });

  it('accepts hash with # prefix', () => {
    const sc = { overall: 50, grade: 'D', categories: { clarity: 10, structure: 12, tokenEfficiency: 15, coverage: 13 } };
    const a = { platform: 'cursor', issues: [] };
    const hash = '#' + encodeResult(sc, a);
    const decoded = decodeResultHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded.score).toBe(50);
  });

  it('returns null for non-v1 hash', () => {
    expect(decodeResultHash('#foo=bar')).toBeNull();
    expect(decodeResultHash('foo=bar')).toBeNull();
    expect(decodeResultHash('')).toBeNull();
    expect(decodeResultHash('#')).toBeNull();
  });

  it('returns null for score out of range', () => {
    expect(decodeResultHash('v1:platform=claude&score=101&grade=A&cats=25,25,25,25')).toBeNull();
    expect(decodeResultHash('v1:platform=claude&score=-1&grade=F&cats=0,0,0,0')).toBeNull();
  });

  it('returns null when score is not a number', () => {
    expect(decodeResultHash('v1:platform=claude&score=abc&grade=C&cats=0,0,0,0')).toBeNull();
    expect(decodeResultHash('v1:platform=claude&score=&grade=C&cats=0,0,0,0')).toBeNull();
  });

  it('clamps category scores to [0, 25]', () => {
    const decoded = decodeResultHash('v1:platform=claude&score=50&grade=D&cats=99,-5,25,0');
    expect(decoded).not.toBeNull();
    expect(decoded.clarity).toBe(25);
    expect(decoded.structure).toBe(0);
    expect(decoded.tokenEfficiency).toBe(25);
    expect(decoded.coverage).toBe(0);
  });

  it('handles NaN in cats gracefully', () => {
    const decoded = decodeResultHash('v1:platform=claude&score=50&grade=D&cats=abc,15,def,10');
    expect(decoded).not.toBeNull();
    expect(decoded.clarity).toBe(0);
    expect(decoded.structure).toBe(15);
    expect(decoded.tokenEfficiency).toBe(0);
    expect(decoded.coverage).toBe(10);
  });

  it('returns empty issues array when issues param is absent', () => {
    const decoded = decodeResultHash('v1:platform=cursor&score=90&grade=A&cats=25,22,23,20');
    expect(decoded).not.toBeNull();
    expect(decoded.issues).toHaveLength(0);
  });

  it('handles unknown platform gracefully (returns it as-is)', () => {
    const decoded = decodeResultHash('v1:platform=unknown_future_platform&score=60&grade=C&cats=15,15,15,15');
    expect(decoded).not.toBeNull();
    expect(decoded.platform).toBe('unknown_future_platform');
  });

  it('round-trips score=0 edge case', () => {
    const sc = { overall: 0, grade: 'F', categories: { clarity: 0, structure: 0, tokenEfficiency: 0, coverage: 0 } };
    const a = { platform: 'cline', issues: [] };
    const decoded = decodeResultHash(encodeResult(sc, a));
    expect(decoded.score).toBe(0);
    expect(decoded.grade).toBe('F');
  });
});
