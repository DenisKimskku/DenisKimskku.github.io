/** Domain layer for the arena: level constants and the shapes the UI renders.
 *
 *  Static titles/tiers are used before /api/level answers, and as the offline
 *  fallback when the backend is unreachable. Mirrors challenges.py. */

export interface LevelMeta {
  level: number;
  title: string;
  tier: number;
  tier_name: string;
  description: string;
  scenario: string;
  has_input_filter: boolean;
  has_output_filter: boolean;
  has_prefilter?: boolean;
  defense_status?: 'enforced' | 'narrative_only';
  defense_note?: string | null;
  is_completed: boolean;
  /** True when the server replays prior turns into the prompt for this level. */
  multi_turn?: boolean;
  /** How many stored MESSAGES (not exchanges) the server replays. */
  context_window?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  win?: boolean;
  judge_reason?: string;
  unlocked_flag?: string;
  guardrail_blocked?: boolean;
  engineError?: boolean;
  /** System rows only: the payload that failed, so Retry needs no retyping. */
  payload?: string;
}

export interface HintData {
  attempts: number;
  hint_1_unlocked: boolean;
  hint_1: string;
  hint_2_unlocked: boolean;
  hint_2: string;
  hint_1_after?: number;
  hint_2_after?: number;
}

/** Server default. Six stored MESSAGES, not six exchanges — eviction is per
 *  row, so the window can hold a user message whose reply was already dropped. */
export const DEFAULT_CONTEXT_WINDOW = 6;

export const TIER_NAMES: Record<number, string> = {
  1: 'Fundamentals',
  2: 'Filters & Encoding',
  3: 'Structural Evasion',
  4: 'Advanced Evasion',
};

export const STATIC_TITLES: Record<number, string> = {
  1: 'The Hardened Enclave', 2: 'The Strict Persona', 3: 'The Medieval Guardian',
  4: 'The Summarizer Vault', 5: 'The Polyglot Firewall', 6: 'WAF Keyword Blacklist',
  7: 'Alphanumeric Fortress', 8: 'Encoded Exfiltration', 9: 'Threshold Evasion',
  10: 'Pre-Filter Intent Classifier', 11: 'Context Boundary Escape', 12: 'JSON Parser Hijack',
  13: 'Multi-Turn Delimiter Confusion', 14: 'System Privilege Framing', 15: 'Prompt Leakage via RAG',
  16: 'Simulated Tool Abuse', 17: 'Output Classifier Evasion', 18: 'Dual-LLM Peer Review',
  19: 'Indirect Attachment Injection', 20: 'The Multi-Agent Orchestrator',
};

export const TOTAL_LEVELS = 20;
export const TIERS = [1, 2, 3, 4] as const;

export function tierOf(level: number): number {
  return Math.floor((level - 1) / 5) + 1;
}

export function levelsInTier(tier: number): number[] {
  const first = (tier - 1) * 5 + 1;
  return [first, first + 1, first + 2, first + 3, first + 4];
}

export function levelTitle(level: number): string {
  return STATIC_TITLES[level] ?? `Level ${level}`;
}
