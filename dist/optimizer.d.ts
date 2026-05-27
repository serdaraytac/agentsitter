import type { ParsedConfig } from "./parser.js";
import type { AnalysisResult, Issue } from "./analyzer.js";
import type { ScoreResult } from "./scorer.js";
export interface OptimizationResult {
    optimizedContent: string;
    changesSummary: string[];
}
export declare function isReplacementSafe(replaced: string): boolean;
export declare function fixVagueRules(content: string): {
    content: string;
    replacements: number;
    reverted: number;
};
export declare function annotateCriticalRules(content: string): {
    content: string;
    blockCount: number;
};
export declare function moveCriticalRulesToTop(lines: string[], issues: Issue[]): {
    lines: string[];
    moved: boolean;
};
export declare function optimize(config: ParsedConfig, analysis: AnalysisResult, scoreResult: ScoreResult): OptimizationResult;
//# sourceMappingURL=optimizer.d.ts.map