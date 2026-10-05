// Colour encoding for /graph (SPEC §6.2–§6.4). Pure: no React, DOM or
// renderer imports, so tests/graph-encoding.test.mjs loads it under plain Node.
//
// Hue says which research area a paper's region belongs to: four validated
// categorical slots plus a neutral grey for everything else. Lightness says how
// much the atlas holds about the paper: the strong colour for a review, a 50%
// tint toward the plate for an abstract, and one faint neutral for neither.
// Tint and dim are mixed in sRGB once, at module load, so the map's reducer
// only ever reads ready-made strings from PAL.light and PAL.dark (SPEC §5.4).

/* --- research areas (SPEC §6.3) ---------------------------------------------- */

export type AreaId = 'llm' | 'model' | 'defence' | 'systems' | 'other';

/** Table order. A map node's `area` attribute is its index in this list. */
export const AREA_IDS: readonly AreaId[] = ['llm', 'model', 'defence', 'systems', 'other'];

/**
 * The one-constant fallback (SPEC §6.2): false paints every paper in the
 * grey column, so colour shows the evidence tier only. Classification
 * (`areaOf`) is unaffected; only painting goes through `paintArea`.
 */
export const AREA_COLOURS_ON: boolean = true;

/* Display-side grouping of the existing cluster `label` field. A label that
   matches nothing (a future relabel, say) falls back to grey, which fails
   safe. Roman-numeral splits ("Jailbreak Attacks III") match through \b. */
const AREA_RULES: ReadonlyArray<readonly [AreaId, RegExp]> = [
  [
    'llm',
    /^(?:Jailbreak Attacks|Safety Alignment|Reward Modeling|Hallucination Detection|LLM Security Surveys|LLM-as-Judge|Mechanistic Interpretability|LLM Reasoning|Agent Security|Prompt Injection|RAG Security|Retrieval-Augmented Generation|LLM Multi-Agent Systems)\b/,
  ],
  [
    'model',
    /^(?:Data Poisoning|FL Poisoning Defense|Adversarial Examples|Adversarial ML|Vision-Language Attacks|Vision-Language Models|GNN Security|Autonomous Vehicle Security|Model Extraction|ML Side-Channel Attacks|Membership Inference|Model Inversion Attacks|Differential Privacy|LLM Data Privacy|Federated Learning Privacy|GNN Privacy|Machine Unlearning|LLM Unlearning|AI Privacy Governance|Blockchain FL Privacy|Blockchain Federated Learning|Watermarking|Deepfake Detection|Audio Deepfakes|Synthetic Image Detection|Diffusion Image Forensics|LLM Text Detection|GAN Image Inpainting)\b/,
  ],
  [
    'defence',
    /^(?:LLM Vulnerability Detection|DL Vulnerability Detection|Malware Detection|IoT Intrusion Detection|FL Intrusion Detection|AI Cyber Defense|Phishing Detection|Network Traffic Analysis|Smart Contract Security|Time-Series Anomaly Detection|SDN DDoS Defense)\b/,
  ],
  [
    // Classic (non-AI) security, on the map since 2026-10-05: binary RE, fuzzing, systems, hardware, crypto, web/mobile.
    'systems',
    /^(?:Systems Security|Software Security Analysis|Static Analysis Security|Binary Rewriting & Analysis|Neural Decompilation & Binary LLMs|Binary Code Similarity|Firmware Rehosting & Fuzzing|Coverage-Guided Fuzzing|Application Fuzzing|Hardware Fuzzing|Hardware Security|Microarchitectural Attacks|Cryptographic Side Channels|Confidential Computing|Applied Cryptography|Distributed Cryptography|Post-Quantum Protocols|Zero-Knowledge Proofs|Homomorphic Encryption|Private Information Retrieval|Website Fingerprinting|Web Attack Detection|Mobile Security|Cloud Network Security|Cloud-Native Security|Physical-Layer Security|Biometric Authentication|Security Operations|Data Privacy Practice|Usable Privacy|BFT Consensus|DeFi Security|Election Security|Security Proceedings)\b/,
  ],
];

/** The research area a region label belongs to; 'other' when none matches. */
export function areaOf(label: string): AreaId {
  for (const [area, re] of AREA_RULES) if (re.test(label)) return area;
  return 'other';
}

/** The area whose colours a region or paper is painted in (grey for all when the switch is off). */
export function paintArea(area: AreaId): AreaId {
  return AREA_COLOURS_ON ? area : 'other';
}

/** Area names (K5–K7; the optgroup names of R4). The key's grey row reads K8 instead. */
export const AREA_NAME: Record<AreaId, string> = {
  llm: 'LLMs and agents',
  model: 'Model and data security',
  defence: 'AI for cyber defence',
  systems: 'Systems, software and crypto security',
  other: 'Other topics',
};

/* --- colour tables (SPEC §6.4) ------------------------------------------------- */

export type Theme = 'light' | 'dark';

/** The plate behind the dots (--color-bg-secondary in each theme): the mix target and the label halo. */
export const CANVAS: Record<Theme, string> = { light: '#f5f5f5', dark: '#171717' };

/** The review tier: validated categorical slots 1–4 (dataviz palette; re-validated with slot 4 on both plates), plus grey for 'other'. */
export const STRONG: Record<Theme, Record<AreaId, string>> = {
  light: { llm: '#2a78d6', model: '#eb6834', defence: '#1baf7a', systems: '#eda100', other: '#767676' },
  dark: { llm: '#3987e5', model: '#d95926', defence: '#199e70', systems: '#c98500', other: '#8a8a8a' },
};

/** The no-summary tier: one fixed neutral, whatever the area. */
export const NONE: Record<Theme, string> = { light: '#cbcbcb', dark: '#3a3a3a' };

/** Lines from a selected paper to its similar papers (drawn from package 5). */
export const EGO_LINE: Record<Theme, string> = { light: '#9f9f9f', dark: '#6b6b6b' };

/** Abstract tint: half the strong colour, half the plate. */
export const TINT_MIX = 0.5;
/** Dim (non-members while something is selected or focused): this much colour, the rest plate. Tunable 0.15–0.30. */
export const DIM_MIX = 0.25;

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function channels(hex: string): [number, number, number] {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** sRGB mix: `t` of colour `a` and `1 - t` of colour `b`, each channel rounded. */
export function mix(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  let out = '#';
  for (let i = 0; i < 3; i += 1) {
    out += Math.round(ca[i] * t + cb[i] * (1 - t))
      .toString(16)
      .padStart(2, '0');
  }
  return out;
}

/** Everything the map paints in one theme. Arrays are indexed by area (AREA_IDS order). */
export interface Palette {
  canvas: string;
  strong: readonly string[];
  tint: readonly string[];
  none: string;
  dimStrong: readonly string[];
  dimTint: readonly string[];
  dimNone: string;
  ego: string;
}

function buildPalette(theme: Theme): Palette {
  const canvas = CANVAS[theme];
  const strong = AREA_IDS.map((a) => STRONG[theme][a]);
  const tint = strong.map((c) => mix(c, canvas, TINT_MIX));
  return {
    canvas,
    strong,
    tint,
    none: NONE[theme],
    dimStrong: strong.map((c) => mix(c, canvas, DIM_MIX)),
    dimTint: tint.map((c) => mix(c, canvas, DIM_MIX)),
    dimNone: mix(NONE[theme], canvas, DIM_MIX),
    ego: EGO_LINE[theme],
  };
}

/** Built once at module load; the reducer reads these and never mixes or allocates. */
export const PAL: Record<Theme, Palette> = { light: buildPalette('light'), dark: buildPalette('dark') };

/* --- DOM swatches --------------------------------------------------------------- */

/* The same values as static Tailwind classes, so the class scanner sees every
   one and `dark:` switches them with no JavaScript (SPEC §5.5, §6.4).
   tests/graph-encoding.test.mjs checks they match the tables above. */
export const AREA_SWATCH = {
  llm: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  model: 'bg-[#eb6834] dark:bg-[#d95926]',
  defence: 'bg-[#1baf7a] dark:bg-[#199e70]',
  systems: 'bg-[#eda100] dark:bg-[#c98500]',
  other: 'bg-[#767676] dark:bg-[#8a8a8a]',
} as const;
export const AREA_TINT_SWATCH = {
  llm: 'bg-[#90b7e6] dark:bg-[#284f7e]',
  model: 'bg-[#f0af95] dark:bg-[#78381f]',
  defence: 'bg-[#88d2b8] dark:bg-[#185b44]',
  systems: 'bg-[#f1cb7b] dark:bg-[#704e0c]',
  other: 'bg-[#b6b6b6] dark:bg-[#515151]',
} as const;
export const NONE_SWATCH = 'bg-[#cbcbcb] dark:bg-[#3a3a3a]';
