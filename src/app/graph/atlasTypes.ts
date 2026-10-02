// Shape of the static Atlas export under /public/atlas/. Written by the
// exporter (Stage 1); see public/atlas/meta.json for the authoritative key
// legend and its caveats list.

export interface AtlasNode {
  id: string;
  x: number;
  y: number;
  /** cluster_id; -1 means "Unclustered" (not a region). */
  c: number;
  /** title */
  t: string;
  yr: number | null;
  /** venue; '' when unknown */
  v: string;
  /** size = 1 + log10(1 + citations) */
  s: number;
  cc: number;
  /** 1 = a verified review exists in the shard /atlas/reviews/<id[:2]>.json */
  r: 0 | 1;
  /**
   * 1 = the authors' own abstract exists in /atlas/abstracts/<id[:2]>.json,
   * reproduced verbatim with no model in the loop.
   *
   * INDEPENDENT of `r`: a node may have a review, an abstract, both or neither
   * (measured: 2,532 reviews, 13,723 abstracts, 44.9% of nodes have either).
   * Never render an abstract as though it were a review -- the whole point of
   * the distinction is that one is the authors' words and the other is not.
   */
  a: 0 | 1;
  /** public landing page (arXiv abs / DOI / publisher), null when none is known */
  u: string | null;
  /** tooltip; ABSENT means fall back to `t` */
  tip?: string;
}

export interface AtlasCluster {
  id: number;
  label: string;
  label_note: string | null;
  size: number;
}

export type AtlasEdge = [string, string, number];

export interface ReviewProvenance {
  source?: string;
  generator_model?: string;
  verifier_model?: string;
  verifier_verdict?: string;
  /** present on the newer batch only */
  verified_at?: string;
  /** present on the older batch instead of verified_at */
  date_note?: string;
  source_url?: string;
}

export interface ReviewFacts {
  datasets_used?: string[];
  quantitative_results?: string[];
  baselines_compared?: string[];
}

export interface Review {
  one_line_takeaway?: string;
  key_finding?: string;
  core_contribution?: string;
  threat_model?: string;
  limitations?: string;
  facts?: ReviewFacts;
  provenance?: ReviewProvenance;
}
