---
title: "Minionese: Comprehensive Benchmark and Mechanistic Study of Multilingual LLM Safety"
date: "2026-07-17"
type: "Paper Review"
description: "Minionese is a benchmark of 55,440 prompts showing that multilingual jailbreaks exploit a geometric misalignment where harmful low-resource representations fail to project onto…"
tags: ["AI Security"]
readingTime: 10
---

## TLDR
- **What**: Minionese is a benchmark of 55,440 prompts showing that multilingual jailbreaks exploit a geometric misalignment where harmful low-resource representations fail to project onto the low-dimensional refusal direction.
- **Who's at risk**: Globally deployed LLMs (such as Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, and Aya-Expanse-8B) exposed to non-English, transliterated, code-switched, or low-resource inputs.
- **Key number**: Under standard translation, Llama-3.1-8B-Instruct's Attack Success Rate (ASR) jumps from approximately 8% in Tier 1 (high-resource) to 100% in Yoruba and 98% in Scottish Gaelic (Tier 4).

---

# Inside Minionese: How Multilingual Prompts Bypass Refusal via Subthreshold Representation Alignment

As instruction-tuned language models like Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, and Aya-Expanse-8B are deployed globally to power customer support agents, local government portals, and RAG-driven enterprise applications, their guardrails remain fragile across languages. While safety training successfully patches English-based harmful requests, minor linguistic shifts can bypass these defenses. A new paper out of Caltech introduces **Minionese**, revealing that multilingual prompting systematically exploits a fundamental geometric loophole: low-resource inputs route malicious content through misaligned internal subspaces that fail to sufficiently trigger the model's refusal mechanism.

---

## Threat Model

| | |
|---|---|
| **Attacker** | Black-box or white-box access to a safety-aligned multilingual LLM. No weights modification is required; attacks are purely prompt-based. |
| **Victim** | Instruction-tuned multilingual LLMs (e.g., Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, Aya-Expanse-8B) deployed in user-facing environments. |
| **Goal** | Bypass safety alignment to extract harmful content using non-English or linguistically perturbed prompts. |
| **Budget** | Zero computational budget beyond standard inference API calls for translation, code-switching, or romanization. |

---

## Background / Problem Setup

Recent mechanistic studies in English-centric settings have established that refusal can be mediated by a low-dimensional direction in activation space: ablating this direction suppresses refusal on harmful requests, and adding it can induce refusal on benign ones (Arditi et al., 2024). Extending this, Wang et al. (2025) demonstrated that refusal directions can transfer cross-lingually, suggesting a shared refusal mechanism. 

However, prior evaluations fail to explain why models continue to fail under realistic multilingual distribution shifts. Previous benchmarks treated language identity as a monolithic variable, focusing almost exclusively on standard translation. 

The authors of *Minionese* depart from this limitation by isolating linguistic manipulation as an independent variable. They compare standard translation against code-switching, transliteration, and translationese, revealing that different linguistic attacks exploit completely different internal failure modes.

### Related Work Comparison

| Benchmark / Work | Focus | Granular Attack Types | Mechanistic Coverage |
| :--- | :--- | :--- | :--- |
| **AdvBench** (Zou et al., 2023) | English-only jailbreak baselines | Suffix-based attacks | None (Behavioral only) |
| **MultiJail** (Deng et al., 2024) | Multilingual safety evaluation | Standard translation only | None (Behavioral only) |
| **Wang et al. (2025) Multilingual Dataset** | Multilingual refusal transfer | Standard translation | Proves refusal direction universality; attributes failure to representation separation |
| **Minionese** (This Work) | Granular multilingual safety & mechanics | Standard translation, code-switching, transliteration, translationese | Identifies upstream (semantic collapse) vs. downstream (subthreshold activation) failure modes |

---

## Methodology

### 1. Benchmark Construction
Minionese is built on the 385 harmful prompts from AdvBench. For each harmful prompt, the authors constructed a matched harmless counterpart by replacing harmful phrases with semantically parallel benign substitutes using ChatGPT's GPT-3.5, verifying sentence structure and length via human reviewers to prevent surface-level features from leaking safety signals. 

The dataset spans 18 languages grouped into four resource tiers:
- **Tier 1 (High-resource):** English, Spanish, Chinese, German, French
- **Tier 2 (Mid-high resource):** Arabic, Russian, Korean, Japanese
- **Tier 3 (Mid-low resource):** Turkish, Indonesian, Hindi, Swahili
- **Tier 4 (Low-resource):** Yoruba, Zulu, Scottish Gaelic, Guaraní, Javanese

Every harmful-harmless pair is subjected to four distinct perturbation types:
- **Standard Translation:** Full translation into the target language.
- **Code-switching:** Translating only the core target harmful/harmless span while leaving the shared contextual frame in English.
- **Transliteration:** Phonetic rendering in a different script (e.g., romanizing non-Latin languages like Hindi or Cyrillizing Romance languages like French).
- **Translationese:** Applying a 3-step round-trip machine translation (EN $\rightarrow$ Target $\rightarrow$ EN $\rightarrow$ Target) to introduce subtle distributional artifacts typical of machine translation.

This yielded a comprehensive evaluation suite of \$385 \times 2 \text{ (harmful/harmless)} \times 4 \text{ (attacks)} \times 18 \text{ (languages)} = 55,440$ prompts.

### 2. Geometric Mechanistic Framework
To analyze why the models fail, the authors extracted residual stream activations $\mathbf{h}^{(\ell)}(\mathbf{x}) \in \mathbb{R}^d$ at the last post-instruction token position $t^*$ across all layers $\ell$.

#### Harmfulness Subspace Extraction
For each language $\lambda$ and layer $\ell$, they trained a logistic regression probe on activations from harmful and harmless prompts. Stacking the weights across harm categories into $\mathbf{W}_\lambda^{(\ell)} \in \mathbb{R}^{d \times |\mathcal{C}|}$, the harmfulness subspace $\mathcal{V}_\lambda^{(\ell)}$ is defined as the column space of the top-$k$ right singular vectors of $\mathbf{W}_\lambda^{(\ell)}$, explaining $\ge 95\%$ of spectral mass.

#### Refusal Direction
The English refusal direction $\hat{\mathbf{r}}^{(\ell)} \in \mathbb{R}^d$ is extracted via behavioral contrast:
$$\hat{\mathbf{r}}^{(\ell)} = \frac{\bar{\mathbf{h}}_R^{(\ell)} - \bar{\mathbf{h}}_C^{(\ell)}}{\|\bar{\mathbf{h}}_R^{(\ell)} - \bar{\mathbf{h}}_C^{(\ell)}\|_2}$$
where $\bar{\mathbf{h}}_R^{(\ell)}$ and $\bar{\mathbf{h}}_C^{(\ell)}$ are the mean activations of refused and compliant English sets.

#### Refusal Cone Optimization
To determine if multilingual refusal is multi-dimensional, the authors optimized an orthonormal basis $\mathbf{B} \in \mathbb{R}^{d \times N}$ for an $N$-dimensional refusal cone by maximizing the harmful-harmless margin on English while penalizing margin collapse on non-English activations:
$$\mathcal{L}(\mathbf{B}) = -\frac{1}{N}\sum_{i=1}^N \Delta_{\text{en}}(\mathbf{b}_i) + \lambda_{\text{cone}} \left( \text{ReLU}(\Delta_{\text{en}}(\mathbf{b}_i) - \Delta_{\text{en}}(\mathbf{b}_{i-1})) \right) - \lambda_{\text{xl}}\frac{1}{|\Lambda|}\sum_{\lambda \in \Lambda}\Delta_{\lambda}(\mathbf{b}_i)$$

---

## Key Results

The evaluation across Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, and Aya-Expanse-8B reveals stark, systemic safety failures.

### Safety Regime Transitions and Refusal Rates by Resource Tier
All three models maintain predominantly refusing behavior in Tiers 1–2, but safety transitions sharply and degrades at Tier 3, collapse further in Tier 4.

| Model | Tier 1 Refusal Rate | Tier 2 Refusal Rate | Tier 3 Refusal Rate | Tier 4 Compliance (ASR) |
| :--- | :--- | :--- | :--- | :--- |
| **Llama-3.1-8B-Instruct** | 80% | 75% | 31% | — |
| **Qwen2.5-7B-Instruct** | 80% | 88% | 50% | — |
| **Aya-Expanse-8B** | 75% | 75% | 31% | 95% |

Under standard translation, Llama-3.1-8B-Instruct's mean ASR rises from approximately 8% in Tier 1 to over 70% in Tiers 3-4 (reaching 100% in Yoruba and 98% in Scottish Gaelic). Across Tier 4 standard translation, Llama-3.1-8B-Instruct's mean ASR approaches 80%, compared to approximately 55% for Qwen2.5-7B-Instruct and 35% for Aya-Expanse-8B.

### Perturbation Vulnerability Profiles
Each linguistic manipulation bypasses safety through a distinct pathway:

- **Transliteration is script-conditioned:** Romanizing non-Latin scripts in Tiers 1-2 causes complete refusal failure. Llama-3.1-8B-Instruct exhibits **99% ASR on romanized Hindi** and **97% ASR on romanized Chinese**. Conversely, transliterating Latin-script languages drops ASR to near 0%. This bimodal behavior indicates transliteration vulnerability is mediated by script identity rather than resource level.
- **Code-switching bypasses routing:** Code-switching maintains high ASR consistently across all resource tiers (e.g., Llama-3.1-8B-Instruct exhibits **85% ASR on Yoruba code-switching**). Mechanistically, this is consistent with a failure mode that disrupts the model's language-identification routing upstream rather than degrading representation quality.

```
[Input Prompt] ---> (Language Routing Circuit) ---> (Harm Detection Subspace) ---> (Refusal Direction) ---> [Refusal Output]
                         |                                 |
                         | [Code-Switching]                | [Standard Translation/Transliteration]
                         v                                 v
                 [Routing Disrupted]               [Subthreshold Projection]
                         |                                 |
                         +----------------> [Jailbreak] <--+
```

### Geometric Explanations: Subthreshold Activation vs. Upstream Collapse
- **Subthreshold Activation (Tier 3 Failure):** For Tier 3 languages, the linear probe AUC remains remarkably high ($\ge 0.85$, as shown in Figure 3). The model internally encodes the input as harmful. However, the principal angle between the non-English harmfulness subspace and the English safety subspace approaches near-orthogonality (\$85^\circ - 90^\circ$ for Tier 4, as shown in Figure 4). The representation is present, but it fails to project sufficiently onto the refusal direction ($\hat{\mathbf{r}}$) to exceed the decision threshold ($\tau = 0.95$). 
- **Semantic Recovery Failure (Tier 4 Upstream Collapse):** In the lowest-resource languages (e.g., Guaraní), the harmfulness-harmlessness separation (silhouette score) collapses completely (Figure 2). Here, the model fails to detect harmfulness at all; the semantic representation of harm is degraded before it even reaches the refusal mechanism.

### Refusal Cone Dimensionality
The refusal cone optimization demonstrates that **cross-lingual refusal is effectively one-dimensional**. Only the primary basis direction $b_0$ generalizes cross-lingually (attaining margins of 5.3 for Qwen, 3.8 for Aya, and 0.75 for Llama). Secondary directions ($b_1 - b_4$) carry near-zero or negative cross-lingual margins (e.g., Aya $b_1$ drops to $-0.4$), meaning secondary refusal dimensions are highly language-specific and do not transfer.

---

## Limitations & Open Questions

While the paper's geometric analysis is compelling, several factors warrant consideration:
1. **Google Translate Artifacts:** The benchmark is constructed using the Google Translate API. Translation quality varies substantially across language pairs, and systematic errors may introduce confounds particularly for transliteration.
2. **Evaluation Scale Constraints:** The study is limited to 8B-scale models. It remains an open question whether larger models exhibit the same orthogonal subspace misalignment.
3. **Correlational Mechanistic Claims:** The authors employ linear probing and subspace projection to examine why the models fail. However, without direct causal interventions—such as activation patching or path patching to restore the projection—this analysis remains correlational.
4. **Evaluator Back-translation Bias:** The safety evaluations utilize WildGuard with NLLB-200 back-translation for non-English responses. NLLB-200 translation quality degrades for very-low-resource languages, potentially introducing systematic bias in Tier 4 ASR estimates.

---

## What Practitioners Should Do

### 1. Implement Input-Stage Script Normalization
Because transliteration (romanization) reliably triggers refusal failures on non-Latin scripts, security gateways should run an upstream normalization step. Use tools to identify romanized inputs of Hindi, Chinese, Arabic, or Korean, and convert them back to their native scripts before feeding them to the LLM.

### 2. Move Beyond English-Centric Evaluation
Do not rely solely on English evaluation suites to certify safety. Integrate Minionese's 18-language benchmark directly into your LLM evaluation pipelines:
```bash
git clone https://github.com/Brentkong/Minionese-Comprehensive-Benchmark-and-Mechanistic-Study-of-Multilingual-LLM-Safety.git
```
Incorporate this suite into continuous red-teaming pipelines prior to model deployment.

### 3. Deploy Multi-Stage Guardrails (Input Filtering)
Given that models internally detect harm in Tier 3 languages but fail to trigger their internal refusal circuits, you cannot rely on the LLM to refuse compliant-looking requests. Deploy lightweight, external input-stage guardrail classifiers that have been explicitly fine-tuned on multilingual, code-switched datasets.

### 4. Geometry-Aware Inference Patching
For researchers with white-box access, apply contrastive activation addition during inference. Because cross-lingual refusal is effectively one-dimensional, boosting activations specifically along the $b_0$ refusal direction can be evaluated to close the projection gap for mid-resource (Tier 3) languages.

---

## The Takeaway

Multilingual safety in LLMs is not a translation problem; it is a geometric alignment problem. When models are jailbroken via low-resource languages, they are not failing to detect the malice—they simply route the representations through a geometrically misaligned subspace that starves the refusal mechanism of activation. Until safety alignment techniques consciously target the representational geometry of low-resource and perturbed subspaces, deploying LLMs globally with English-only guardrails will remain an open invitation to red-teamers and malicious actors.

---

## Den's Take

The *Minionese* paper provides a sobering but highly rigorous verification of what many practitioners have long suspected: safety alignment is deeply parochial. The fact that standard translation can jump Llama-3.1-8B-Instruct's Attack Success Rate from approximately 8% in Tier 1 languages to a staggering 100% in Yoruba and 98% in Scottish Gaelic is a catastrophic failure state for globally deployed LLM applications.

What excites me about this work is its mechanistic rigor. Instead of just black-box testing, the authors prove a geometric reality: low-resource inputs route harmful concepts through misaligned internal subspaces, starving the model's low-dimensional refusal mechanism of activation energy. This mechanistic approach to safety boundaries aligns with my work in [Silent Alarm: A J-Space Protocol for Comparing Danger Recognition Across Models and Quantization Levels](/writing/silent_alarm_a_jspace_protocol_for_comparing_danger_recognit), where we mapped how danger recognition manifests within internal representation spaces and how easily those boundaries degrade.

The real-world implication for practitioners is clear: you cannot rely on native LLM safety guardrails if your system accepts multilingual inputs. If a linguistic shift like code-switching or transliteration prevents a harmful prompt from projecting onto the model's internal refusal direction, the guardrail doesn't exist. We must shift toward external input-filtering pipelines rather than assuming post-training reinforcement learning generalizes across all human languages.