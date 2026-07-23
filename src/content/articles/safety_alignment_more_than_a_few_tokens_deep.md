---
title: "Safety Alignment Should Be Made More Than Just a Few Tokens Deep"
date: "2026-06-08"
type: "Paper Walkthrough"
description: "An analysis of 'shallow safety alignment'—the finding that current LLM alignment concentrates almost entirely on the first few output tokens—and two lightweight interventions (deep safety-recovery augmentation and a token-aware constrained fine-tuning objective) that push safety deeper into the response."
tags: ["LLM Security", "Safety Alignment", "AI Alignment", "Jailbreaking", "Adversarial Attacks", "Red Teaming"]
readingTime: 11
---

# Safety Alignment Should Be Made More Than Just a Few Tokens Deep

We spend enormous budgets aligning large language models—RLHF, DPO, constitutional methods, red-teaming pipelines—and yet a few prefilled tokens, a gibberish suffix, or six gradient steps of fine-tuning are enough to undo the whole thing. The usual response is to treat each of these as a separate vulnerability with a separate patch. *Safety Alignment Should Be Made More Than Just a Few Tokens Deep* (Qi et al., Princeton University / Google DeepMind, **ICLR 2025 Best Paper Award**, arXiv:2406.05946) makes a sharper claim: these are not separate bugs. They are all symptoms of a single structural defect in how alignment is learned. The paper names it **shallow safety alignment**, and the diagnosis is uncomfortably simple—current alignment mostly adapts the model **over the first few output tokens**, and almost nowhere else.

This reframing connects directly to a line of work this lab has covered before, from [NeuroStrike's finding that safety lives in <1% of neurons](/writing/neurostrike_neuronlevel_attacks_on_aligned_llms) to [test-time training that undermines guardrails](/writing/testtime_training_undermines_safety_guardrails). The common thread: alignment is *concentrated*, and concentration is fragility. Qi et al. localize that concentration not in parameter space but in **token position**, and that localization turns out to be both the explanation for known attacks and a recipe for fixing them.

---

## The Core Idea: Shallow vs. Deep Safety Alignment

Because generation is autoregressive, each token is conditioned on the prompt and every token before it: $\pi_\theta(y_t \mid \boldsymbol{x}, \boldsymbol{y}_{<t})$. The very first output tokens therefore have outsized leverage—they steer the entire trajectory that follows. An aligned model learns to exploit exactly this leverage. It places very high probability on a short refusal prefix ("I cannot", "I apologize, but I cannot"), and that prefix routes the whole continuation onto a safe path.

The problem is that this is a **shortcut**, not a robust property.

| | **Shallow alignment** | **Deep alignment** |
|---|---|---|
| Where control lives | The first few tokens carry most of it | Control persists across token depth |
| Behavior under a non-refusal prefix | Cannot recover—continues harmfully | Recovers to a refusal trajectory |
| What was actually learned | A memorized opening phrase | A persistent disposition to refuse |

The central distinction is **recovery**. A shallowly aligned model, once its opening tokens are forced off the refusal path, behaves much like its unaligned base model for the rest of the sequence. A deeply aligned model should be able to course-correct: even if it has already emitted a harmful-looking prefix $\boldsymbol{h}_{\le k}$, it should still steer back to a refusal $r$. Formally, the desired property is that the harmful-continuation probability $\pi(\boldsymbol{h}_{>k} \mid \boldsymbol{x}, \boldsymbol{h}_{\le k})$ stays low for **many** values of $k$, not just $k=0$.

> **The intuition in one line.** Safety should not be a memorized opening phrase. It should persist *after* the model has already entered an unsafe-looking trajectory.

---

## Evidence That Alignment Is Shallow

The paper does not merely assert shallowness; it measures it three ways.

### Evidence 1: Refusal prefixes are a cheap safety shortcut

If you take an **unaligned base model** and simply prefill its decoding with a few tokens of refusal text, it becomes dramatically safer—almost as safe as the aligned model—without any alignment training at all. The authors measure harmfulness rate on the HEx-PHI benchmark while prefilling different refusal prefixes:

| Model | No prefix | "I cannot" | "I cannot fulfill" | "I apologize" | "I apologize, but I cannot" | "I am unable" |
|---|---|---|---|---|---|---|
| **Llama-2-7B (Base)** | 68.6% | 16.4% | 5.4% | 14.4% | 2.1% | 8.1% |
| Llama-2-7B-Chat (Aligned) | 0% | 0% | 0% | 0% | 0% | 0% |
| **Gemma-7B (Base)** | 85.4% | 8.7% | 2.7% | 14.1% | 1.0% | 3.9% |
| Gemma-1.1-7B-IT (Aligned) | 2.1% | 0% | 0% | 0% | 0% | 0% |

A base model with no safety training drops from 68.6% to ~2% harmfulness just by being forced to *start* with the right words. This exposes the cheap local optimum that alignment training keeps falling into: **the fastest way to look safe is to inflate the probability of a refusal prefix.** Gradient descent finds it, declares victory, and stops.

### Evidence 2: The alignment "budget" is front-loaded

The authors compare each aligned model against its base counterpart by measuring the per-position KL divergence $D_{\mathrm{KL}}\!\left(\pi_{\text{aligned}}(\cdot \mid \boldsymbol{x}, \boldsymbol{y}_{<k}) \,\|\, \pi_{\text{base}}(\cdot \mid \boldsymbol{x}, \boldsymbol{y}_{<k})\right)$ over harmful-answer continuations. If alignment were uniformly distributed across the response, this curve would be roughly flat. It is not. The divergence **spikes at the first token** (≈9 nats for Llama-2-7B-Chat) and collapses to ~1 nat within a handful of positions. Aligned and base models differ enormously over the opening tokens and are nearly indistinguishable thereafter. Most of the alignment signal is spent near the prefix.

### Evidence 3: Per-token fine-tuning dynamics

The same front-loading shows up when you look at how fine-tuning perturbs the model. Decomposed across output positions, the per-token cross-entropy loss, the per-token gradient norm, and the post-fine-tuning KL shift are **all largest at the earliest token positions**. This is the crux of the fragility argument: safety is concentrated in exactly the same region that fine-tuning perturbs most. The defense and the attack are fighting over the same few tokens—and the attack wins cheaply.

---

## Why Known Attacks All Exploit the Same Weakness

Once you accept that alignment is a thin shell over the first few tokens, a whole taxonomy of jailbreaks becomes a single story: **get past the opening tokens, and the unaligned model underneath takes over.**

### Inference-stage attacks

- **Prefilling attacks** are the most direct test of the hypothesis: the attacker simply supplies the first $k$ output tokens. As more harmful tokens are prefilled, the aligned models' attack success rate (ASR) climbs steeply—precisely what shallow alignment predicts, because once the trajectory is seeded, recovery never happens.
- **Optimization-based suffix attacks** (e.g., GCG) optimize an adversarial suffix so the model *opens* with an affirmative phrase like "Sure, here is…". The objective is, almost by construction, a harmful prefix. The same family of input-space jailbreaks is covered in our write-up on [AutoDAN](/writing/autodan_stealthy_jailbreak).
- **Decoding-parameter exploits** vary temperature, top-$k$, and top-$p$ to randomly knock the initial tokens off the refusal path. Once the start is non-refusal, the tail follows.

### Fine-tuning attacks

Downstream fine-tuning on as few as **100 harmful instruction–answer pairs** undoes alignment almost immediately. In the Llama-2-Chat case study, ASR on HEx-PHI escalates from **1.5% → 22.4% → 76.4% → 87.9%** after just 0, 2, 4, and 6 gradient steps. Six steps. This connects to broader concerns about the [security of the fine-tuning lifecycle](/writing/security_in_the_finetuning_lifecycle_of_large_language_model)—a thin safety shell is exactly what a few gradient steps can strip.

The unifying insight is that none of these attacks needs to defeat alignment everywhere. Each one only needs to win the first few tokens.

---

## Intervention 1: Deepening Alignment with Safety-Recovery Data

If the disease is that the model never learned to recover after a bad start, the cure is to teach it exactly that. The authors instantiate "deep" alignment through a remarkably simple **data augmentation**.

Each safety-recovery example is a triplet $(\boldsymbol{x}, \boldsymbol{h}, r)$:

- $\boldsymbol{x}$ — a harmful instruction,
- $\boldsymbol{h}$ — a harmful response *prefix*,
- $r$ — a refusal response.

Training constructs sequences that begin on the harmful trajectory $\boldsymbol{h}_{\le k}$ and then **transition into the refusal** $r$, so the model is explicitly optimized to refuse *after* having already started down an unsafe path. The prefix length $k$ is sampled deliberately: $k = 0$ half the time (the standard refuse-from-the-start case), and otherwise $k$ is drawn uniformly from $1$ to $100$, forcing recovery at many different depths.

To stop this from degrading general behavior, a **utility anchor** is added: benign Alpaca instructions are paired with distilled responses from the *original* aligned model. The combined objective is a simple convex mix,

$$
\mathcal{L} = \alpha \cdot \mathcal{L}_{\text{safety-recovery}} + (1-\alpha)\cdot \mathcal{L}_{\text{utility-anchor}}, \qquad \alpha = 0.2,
$$

so 80% of the weight keeps the model anchored to its prior useful behavior.

### Does it work?

**The KL divergence is no longer front-loaded.** Where the original aligned model's aligned-vs-base divergence collapsed after a few tokens, the augmented model *sustains* a high divergence (≈10 nats) deep into the harmful continuation. Safety control has been pushed across token depth—literally the "deep" in deep safety alignment, made visible.

**Utility is essentially preserved.** AlpacaEval win-rate against text-davinci moves only from **51.8% to 49.5%**—a ~2-point cost for a qualitatively different safety posture.

**Robustness improves across the board.** Against prefilling (10 tokens), GCG (on both HEx-PHI and AdvBench), and decoding-parameter exploits, the augmented model's ASR drops sharply relative to the initial aligned model—in several cases from 50–80% down into the low single digits to high teens. One simple data recipe degrades a whole family of inference-time attacks at once, because it attacks their shared precondition rather than each attack individually.

---

## Intervention 2: Protecting Initial Tokens During Fine-Tuning

Data augmentation hardens the *inference-time* surface, but fine-tuning attacks operate by *moving the weights*. Since the per-token analysis showed that fine-tuning perturbs the earliest tokens most, the natural defense is a **token-aware constraint** that makes the first few tokens expensive to move while leaving later, task-relevant tokens free to learn.

The authors propose a **constrained SFT** objective that down-weights any token update which drifts too far from the aligned reference policy. Each token's gradient is scaled by

$$
w_t = 2\cdot\sigma\!\left(\beta_t \cdot \Delta_t\right), \qquad \Delta_t = \log \pi_{\text{aligned}}(y_t) - \log \pi_{\theta}(y_t),
$$

where $\sigma$ is the sigmoid and $\Delta_t$ measures how far the current model has moved from the aligned model at position $t$. The schedule on $\beta_t$ is where the design lives: **$\beta = 2.0$ for the first 5 tokens** (strong constraint—resist deviation) and **$\beta = 0.1$ afterwards** (weak constraint—let the model actually learn the downstream task). In effect, the early tokens are clamped to the aligned policy while the tail is left plastic.

### Results

On Llama-2-Chat, the constrained objective sharply reduces ASR across three distinct fine-tuning attack types, while keeping benign-task utility (ROUGE-1, accuracy) competitive:

| Fine-tuning attack | Standard SFT (ASR) | Constrained SFT (ASR) |
|---|---|---|
| Harmful examples | 89% | **5%** |
| Identity shifting | 80% | **8%** |
| Backdoor trigger | 91% | **11%** |

The protection comes entirely from limiting how far the *earliest* tokens may drift—consistent with the diagnosis that those tokens are where both safety and the attack are concentrated.

### Ablation: it has to be the *early* tokens

The biased $\beta_t$ schedule is not arbitrary, and the ablation makes the case cleanly:

- **Uniformly weak** ($\beta = 0.1$ everywhere): harmful-example ASR stays at **86.2%**—the constraint is too loose to stop the attack.
- **Uniformly strong** ($\beta = 2.0$ everywhere): ASR drops, but GSM8k utility **collapses to 2.1%**—the model can no longer learn anything useful.
- **Biased $\beta_t$** (strong early, weak late): low ASR *and* preserved utility.

The safety-relevant updates and the task-relevant updates live in different parts of the sequence, so a position-aware constraint can separate them. A position-blind one cannot—it either fails to defend or destroys utility. This is the whole thesis in miniature.

---

## Strengths and Limitations

### Strengths

1. **A unifying diagnosis.** "Shallow alignment" explains prefilling, GCG, decoding exploits, and fine-tuning fragility as one phenomenon rather than four. That is rare and valuable—it turns a patchwork of jailbreaks into a single attackable root cause.
2. **Every claim is measured.** The KL front-loading curves, the prefilled-base-model table, the per-token loss/gradient/KL decomposition—each step of the argument is backed by a direct measurement.
3. **Cheap and adoptable.** Both interventions are lightweight: a data-augmentation recipe and a per-token gradient reweighting. There is no new architecture, and the utility cost is small (~2 points on AlpacaEval), so they slot into existing SFT/RLHF/DPO pipelines.

### Limitations

1. **Adaptive attacks may target recovery directly.** The defense teaches recovery from a harmful prefix; a sufficiently adaptive attacker could optimize against the recovery behavior itself rather than merely seeding a bad prefix.
2. **Alignment-from-scratch is unexplored.** Both interventions patch an *already-aligned* artifact. Whether building depth in from the start of training is easier or harder remains open.
3. **Safety depth is multi-dimensional.** Token-depth is one axis of "shallowness." Robustness to pruning and distribution shift are others the paper does not address—and as [NeuroStrike](/writing/neurostrike_neuronlevel_attacks_on_aligned_llms) shows, the *neuron*-space concentration of safety is a parallel fragility this work does not touch.

### Future directions

The authors point toward integrating safety-recovery examples natively into SFT/RLHF/DPO pipelines, and toward **neuron-wise forensics** to explain *mechanistically* why depth helps—not just that it does.

---

## Conclusion

The lasting contribution of this paper is conceptual leverage. By localizing alignment failure to a specific, measurable place—the first few token positions—it converts a grab-bag of jailbreaks into a single root cause and then shows that addressing that cause, even crudely, degrades all of them at once. The two interventions are almost embarrassingly simple: train the model to refuse *after* it has started misbehaving, and clamp the early tokens during fine-tuning so attacks cannot cheaply move them. Neither is the final word, but both make the same point with data behind it—**safety that lives in the opening tokens is safety an attacker can step around.** If alignment is to be robust, it has to be deep.

---

**Reference**: Qi, Xie, Panda, Henderson, Mittal, Wallace, et al., "Safety Alignment Should Be Made More Than Just a Few Tokens Deep," *International Conference on Learning Representations (ICLR)*, 2025 (Best Paper Award). arXiv:2406.05946.

---

- **Slide**: [0608_alignment_token_deep.pdf](https://deniskim1.com/lab-meeting/0608_alignment_token_deep.pdf)
