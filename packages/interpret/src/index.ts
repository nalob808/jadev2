/**
 * Phase 8: the interpretation layer.
 *
 * Constitutional constraint (CLAUDE.md #5 and #6): every interpretive
 * statement must cite the computed factors that produced it, and the layer
 * must never produce death, disease or legal predictions. Both are enforced
 * here, not in the UI.
 */
export interface GroundedStatement {
  readonly text: string;
  /** The computed factors this statement is derived from. Never empty. */
  readonly factors: ReadonlyArray<{ kind: string; detail: string }>;
  readonly source?: string;
}

export const FORBIDDEN_TOPICS = ['death', 'disease', 'litigation'] as const;
