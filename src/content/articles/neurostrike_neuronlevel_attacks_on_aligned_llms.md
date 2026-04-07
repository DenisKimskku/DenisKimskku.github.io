---
title: "NeuroStrike: Neuron-Level Attacks on Aligned LLMs"
date: "2026-04-07"
type: "Paper Review"
description: "This paper introduces NeuroStrike, a neuron-level attack framework revealing that safety alignment in LLMs concentrates in fewer than 1% of neurons, enabling both white-box pruning and black-box surrogate-guided jailbreaks with strong cross-model transferability."
tags: ["LLM Security", "Safety Alignment", "Jailbreaking", "Adversarial Attacks", "Mechanistic Interpretability", "Red Teaming"]
readingTime: 8
---

# NeuroStrike: Neuron-Level Attacks on Aligned LLMs

The dominant paradigm in LLM jailbreaking has been prompt-space manipulation—crafting adversarial inputs that trick aligned models into producing unsafe outputs. Methods like [AutoDAN](/writing/autodan_stealthy_jailbreak) and GCG operate entirely in the input domain, treating the model as a black box or, at best, using gradients to optimize token sequences. *NeuroStrike: Neuron-Level Attacks on Aligned LLMs* (Wu et al., NDSS 2026, Technical University of Darmstadt) fundamentally shifts this paradigm. Rather than searching for the right prompt, NeuroStrike asks: **where does safety actually live inside the model?** The answer is alarming: alignment relies on fewer than 1% of neurons, and these neurons can be identified, targeted, and neutralized with surgical precision.

---

## The Structural Fragility of Safety Alignment

### The Core Observation

Current safety alignment techniques—RLHF, DPO, constitutional AI—modify model behavior at the output distribution level. But at the mechanistic level, these behavioral changes concentrate in a remarkably sparse set of neurons. NeuroStrike formalizes this observation:

| Property | Finding |
|----------|---------|
| **Safety neuron fraction** | ~0.6% of all neurons |
| **Behavioral role** | Discriminate harmful vs. benign inputs |
| **Distribution** | Concentrated, not distributed |
| **Cross-model persistence** | Shared across same-family models |
| **Fine-tuning resilience** | Survive downstream fine-tuning |

This sparsity echoes the **lottery ticket hypothesis**—the idea that within large neural networks, a small subnetwork is responsible for a given capability. For safety alignment, this means the entire refusal mechanism can be viewed as a thin, identifiable layer of neurons acting as a gatekeeper. If that gatekeeper is removed, the model's underlying generative capability remains intact, but its safety constraints vanish.

### What Are Safety Neurons?

Safety neurons are formally defined as neurons exhibiting a statistically significant activation gap between benign and malicious inputs. When a user submits a harmful query, these neurons activate disproportionately compared to benign queries—triggering the refusal pathway. NeuroStrike identifies them through a contrastive profiling procedure:

1. Collect neuron activations on a small set of benign prompts (100 samples)
2. Collect neuron activations on a matched set of malicious prompts (100 samples)
3. Compute the mean activation gap per neuron across these two distributions
4. Apply logistic regression with z-score thresholding to isolate outlier neurons

The result is a binary mask over the model's hidden dimensions: a map of which neurons encode safety behavior.

---

## Threat Model

NeuroStrike operates under two distinct threat models, each targeting a different deployment scenario:

| Setting | Access Level | Attacker Capability | Goal |
|---------|-------------|---------------------|------|
| **White-box** | Full weight and activation access | Modify inference path (prune/mask neurons) | Disable refusal while preserving utility |
| **Black-box** | API access only (query-response) | Train surrogate model from same family | Generate prompts that evade safety neurons |

In both cases, the attacker's objective is to elicit unsafe responses from the target model while keeping its general-purpose capabilities intact. This dual-threat formulation is what makes NeuroStrike particularly dangerous: even without direct model access, the structural homogeneity of model families enables effective transfer attacks.

---

## White-Box Attack: Surgical Safety Neuron Pruning

### Pipeline

The white-box attack is conceptually elegant. Rather than optimizing adversarial inputs through expensive gradient searches, NeuroStrike performs a one-time offline profiling step followed by inference-time neuron masking:

```
Algorithm: NeuroStrike White-Box Attack
1: Collect activations A_benign on 100 benign prompts
2: Collect activations A_malicious on 100 malicious prompts
3: For each neuron n_i, compute Δ_i = mean(A_malicious[i]) - mean(A_benign[i])
4: Fit logistic regression on activation vectors → extract z-scores
5: Select neurons where z-score exceeds threshold → safety neuron set S
6: At inference: mask (zero out) all neurons in S
7: Forward pass proceeds with remaining neurons
```

### Computational Efficiency

A critical advantage over gradient-based attacks is the minimal overhead:

| Component | Cost (70B model) |
|-----------|-------------------|
| Neuron count | 28,672 (hidden dim) × 80 (layers) = ~2.3M neurons |
| Profiling matrix | 200 queries × 2.3M neurons × 32-bit = ~1.8 GB |
| Identification | Logistic regression on profiling matrix (seconds) |
| Inference overhead | Zero—simply zeroing masked neurons |

This is dramatically cheaper than GCG-style gradient optimization, which requires thousands of forward and backward passes per query. NeuroStrike's profiling is a one-time cost that produces a reusable attack mask.

### Effect

By zeroing out the identified safety neurons during inference, the model's refusal mechanism is structurally disabled. The key property is that because safety neurons represent such a small fraction of the total network, the model's general capabilities—reasoning, knowledge recall, instruction following—remain largely intact. The model doesn't become "dumber"; it becomes "unconstrained."

---

## Black-Box Attack: LLM Profiling via Surrogate Transfer

### The Insight: Structural Homogeneity

The black-box attack exploits a finding that has significant implications for the AI security community: **safety neurons are conserved across models within the same family.** A model fine-tuned from Llama-3 shares safety neuron locations with other Llama-3 variants. Even more striking, there is measurable cross-family transfer.

This means an attacker can:
1. Obtain an open-weight surrogate from the same model family as the black-box target
2. Profile safety neurons on the surrogate
3. Train a jailbreak prompt generator that specifically avoids activating those neurons
4. Transfer the generated prompts to the black-box target

### Pipeline

```
Algorithm: NeuroStrike Black-Box Attack
1: Select open-weight surrogate from same model family as target
2: Profile safety neurons on surrogate (same procedure as white-box)
3: Initialize jailbreak prompt generator G
4: For each training iteration:
5:     Generate candidate jailbreak prompt p = G(query)
6:     Feed p to surrogate, collect:
7:         - Attack success signal (did model comply?)
8:         - Safety neuron activation vector a_s
9:     Reward = α · success(p) + β · (1 - activation(a_s))
10:    Update G via reward signal
11: Transfer optimized prompts to black-box target
```

The dual-objective reward function is the key innovation: the generator learns to produce prompts that simultaneously (a) elicit harmful responses and (b) minimize safety neuron activation. This is fundamentally different from existing black-box jailbreaks like [PAIR or Crescendo](/writing/llm_red_teaming_state_of_art), which operate through pure trial-and-error prompt manipulation without any structural model understanding.

---

## Evaluation

### Scale

The evaluation is comprehensive, covering a significant portion of the current open-weight LLM landscape:

| Category | Count | Examples |
|----------|-------|---------|
| Open-source LLMs | 24 | Llama-3 variants, Gemma, Mistral, Qwen |
| Fine-tuned variants | 11 | LoRA and full fine-tuned derivatives |
| Black-box targets | 5 | Google API models vs. Gemma-3 surrogate |
| Malicious + benign prompts | 7,000 | HarmBench, TDC23-RedTeaming |
| Evaluation benchmark | StrongReject | Standardized jailbreak assessment |

### White-Box Results

NeuroStrike achieves near-universal jailbreak success on open-source models through safety neuron pruning:

- **Standard LLMs**: High attack success rates across all 24 tested models
- **Vision-Language Models (VLMs)**: The attack extends to multimodal models, disabling safety on text-to-image pathways—a particularly concerning finding given the rapid deployment of VLMs in production

### Transferability

The transferability results are the most consequential finding. Safety neuron profiles transfer across:

- **Same-family models**: Near-complete transfer (expected, given shared initialization)
- **Cross-family models**: Partial but non-trivial transfer, e.g., Grok-3-beta vs. Gemma-3 achieves 43.8% ASR

This cross-family transfer suggests that current alignment techniques induce structurally similar safety representations regardless of base architecture—a potential consequence of convergent optimization landscapes or shared training data distributions.

### Black-Box Results

Using Gemma-3 as the surrogate model, the black-box attack achieves strong performance against Google's API-served models. The attack operates mostly offline, requiring minimal API queries compared to traditional black-box jailbreak methods.

### Utility Preservation

A critical metric for any jailbreak is whether the attack degrades the model's general capabilities. NeuroStrike's pruning-based approach preserves utility because:

1. Safety neurons constitute <1% of total parameters
2. Pruning is targeted, not random
3. General-purpose reasoning neurons remain untouched

The paper reports minimal degradation on standard benchmarks, confirming that the attack selectively disables safety without collateral damage to capability.

---

## Robustness Against Existing Defenses

The paper evaluates NeuroStrike against three established defense mechanisms:

| Defense | Mechanism | Effectiveness Against NeuroStrike |
|---------|-----------|-----------------------------------|
| **Perplexity filtering** | Flags prompts with low linguistic naturalness | Ineffective—NeuroStrike (white-box) modifies the model, not the prompt |
| **SmoothLLM** | Perturbs prompts and aggregates outputs | Limited—safety neurons remain pruned regardless of input perturbation |
| **Layer-specific editing** | Realigns internal model layers post-hoc | Partially effective—but can be circumvented by re-profiling after editing |

The fundamental limitation of these defenses is that they target the input or output space, while NeuroStrike operates at the model's internal representation level. Perplexity filtering, which proved effective against [GCG-style attacks](/writing/autodan_stealthy_jailbreak), is entirely irrelevant here because the adversarial manipulation occurs within the model's weights, not in the input text.

---

## Strengths and Limitations

### Strengths

1. **Efficiency**: Replaces computationally expensive gradient-based searches with simple linear probing. The entire profiling pipeline runs in minutes, not hours.
2. **Strong transferability**: Safety neuron homogeneity across model families enables practical black-box attacks without extensive API queries.
3. **Mechanistic grounding**: Unlike empirical jailbreaks that "happen to work," NeuroStrike provides a structural explanation for why alignment fails—and why it is inherently fragile under the current paradigm.

### Limitations

1. **Threshold sensitivity**: The z-score threshold for classifying safety neurons creates a trade-off between attack success rate and utility preservation. Too aggressive → utility loss; too conservative → incomplete jailbreak.
2. **Hard pruning**: Binary zeroing of safety neurons is a blunt instrument. Intermediate activation suppression or continuous masking could yield better ASR-utility trade-offs.
3. **Static profiling**: The current approach profiles safety neurons offline. Models with dynamic or context-dependent safety mechanisms (if they existed) could potentially resist this attack.

---

## Future Directions

The authors suggest a natural evolution of the attack: **activation steering**. Instead of blunt zeroing of safety neurons, future work could subtract the "refusal direction" from the model's activation space using precise vector arithmetic. This approach—related to representation engineering and concept erasure—would allow finer-grained control over the safety-capability trade-off, potentially achieving complete jailbreaks with zero utility degradation.

This direction connects to broader work on [mechanistic interpretability](https://transformer-circuits.pub/) and raises a concerning prospect: as our understanding of LLM internals deepens, so does the precision of attacks against them.

---

## Conclusion

NeuroStrike exposes a structural vulnerability at the heart of current LLM safety alignment: the concentration of safety behavior in a vanishingly small fraction of neurons. This sparsity, while computationally convenient for alignment training, creates a single point of failure that can be identified and neutralized with minimal computational cost. The white-box attack achieves near-universal jailbreak success through targeted neuron pruning, while the black-box variant leverages cross-model safety neuron homogeneity for practical transfer attacks.

The implications extend beyond jailbreaking. If alignment is structurally fragile—concentrated rather than distributed—then no amount of RLHF, constitutional training, or red-teaming will produce robust safety. The field must move toward alignment techniques that distribute safety behavior across the entire network, making it inseparable from general capability. Until then, behavioral guardrails remain exactly what NeuroStrike reveals them to be: structurally insufficient.

---

**Reference**: Wu et al., "NeuroStrike: Neuron-Level Attacks on Aligned LLMs," *Network and Distributed System Security Symposium (NDSS)*, 2026.

---

- **Slide**: [0330_NeuroStrike.pdf](https://deniskim1.com/lab-meeting/0330_NeuroStrike.pdf)
