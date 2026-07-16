---
title: "Just Ask the Model: Natural Language Autoencoders and the Legible Mind"
date: "2026-07-13"
type: "Paper Walkthrough"
description: "A walkthrough of Anthropic's Natural Language Autoencoders, which translate a model's raw activation vectors directly into free-form text instead of a dictionary of sparse features, and why readable explanations emerge even though training only ever rewards reconstruction."
tags: ["AI Safety", "Interpretability", "Mechanistic Interpretability", "LLM Security", "Model Auditing"]
readingTime: 9
---

# Just Ask the Model: Natural Language Autoencoders and the Legible Mind

Every time an LLM processes text, it carries its working memory as high-dimensional activation vectors — the residual stream. Those vectors hold rich information about the computation in flight, but as raw lists of numbers they are opaque to any human reader. The whole project of interpretability is to translate them into units we can actually understand, so we can audit models for hidden goals, deception, or evaluation awareness; debug why a particular output appeared; and maybe one day do forensics or reason about model welfare.

I presented *Natural Language Autoencoders Produce Unsupervised Explanations of LLM Activations* (Fraser-Taliente, Kantamneni, Ong et al., Anthropic — Transformer Circuits Thread, 2026) at our lab meeting this week, and it proposes a disarmingly direct answer to that translation problem. Two paradigms exist for decomposing activations into human-legible units: Sparse Autoencoders (SAEs), which factor an activation into a dictionary of sparse features, and Natural Language Autoencoders (NLAs), which translate the activation directly into free-form text. The central question of the paper is almost cheeky: can we simply *ask the model to explain its own activations in words?*

## TL;DR

- An NLA is an autoencoder whose bottleneck is a piece of natural-language text, not a sparse code.
- An **Activation Verbalizer (AV)** turns an activation into a text explanation; an **Activation Reconstructor (AR)** turns that text back into an activation. If the AR can rebuild the vector from words alone, the words must have captured its information.
- Training only ever rewards reconstruction — never interpretability. Yet the explanations that minimize reconstruction loss come out readable and informative anyway. That is the surprise.
- NLAs trade the SAE's per-feature labeling pipeline for an open vocabulary and directly human-readable output, at the cost of two extra LLM passes and no faithfulness guarantee.
- They already earned their keep on a real safety audit of Claude Opus 4.6.

## The residual stream and its problem

A transformer processes text as a sequence of high-dimensional vectors, one per token position, and every layer reads from and writes back to this residual stream (Elhage et al., *A Mathematical Framework for Transformer Circuits*, Transformer Circuits Thread, 2021). The residual-stream activation is the model's working memory at that point in the computation. Decode it and you can monitor, debug, and audit behavior.

The catch is that the vector is dense and distributed. No single dimension maps to a human concept. Worse, models represent far more concepts than they have neurons or dimensions, and the trick they learn to pull this off is **superposition** — packing many features into overlapping directions (Elhage et al., *Toy Models of Superposition*, 2022). The consequence is that individual neurons are polysemantic: one neuron fires for DNA, HTTP requests, *and* poetry. Reading neurons one at a time tells you nothing about what the model is doing. We need to decompose the entangled vector into meaningful, human-readable parts.

## First shot: Sparse Autoencoders

The dominant approach has been dictionary learning: write each activation as a sparse combination of many basis directions (Bricken et al., *Towards Monosemanticity*, Anthropic, 2023), so that

$$
\text{activation} \approx \sum_i (\text{feature activation}_i)\times(\text{feature direction}_i).
$$

An SAE learns this dictionary without supervision or labels. In the Bricken setup, the target being reconstructed is the vector *after the MLP's non-linear activation, before the down-projection*. An encoder maps that activation to a large but mostly-zero set of feature activations; a decoder rebuilds the original from the few that are active. The key design choice is an **overcomplete dictionary** — far more features than dimensions, with only a handful active for any single token. Ideally each learned feature corresponds to a single human-interpretable concept. (Later SAE work and the NLA itself operate on the residual stream rather than the MLP activation, so this specific target is a Bricken-2023 detail, not a universal one.)

The training objective is exactly what you'd expect: reconstruct the activation while keeping the code sparse (Cunningham et al., *Sparse Autoencoders Find Highly Interpretable Features in Language Models*, ICLR 2024). Loss is reconstruction error $\lVert x - \hat{x}\rVert$ plus an $L_1$ sparsity penalty $\lVert f\rVert$ that forces the model to explain each activation with only a few features. It is trained on billions of activations harvested from the target model on real text — fully unsupervised, only the model's own activations.

### The hidden cost nobody advertises

Here is what the SAE brochure understates. A trained SAE yields thousands to millions of features, and they all arrive **unlabeled**. To name a single one, the standard workflow (Bills et al., *Language Models Can Explain Neurons in Language Models*, OpenAI, 2023) is: collect the text examples that most strongly activate the feature, ask an LLM to summarize what those examples share, then score that label by how well it predicts the feature's activation — auto-interp. Only then can you use the feature to monitor, steer, or build attribution graphs. And two structural limits remain (Templeton et al., *Scaling Monosemanticity*, Anthropic, 2024): labeling is a large, separate effort bolted on top of SAE training, and any concept outside the learned dictionary simply cannot be expressed.

## Second shot: Natural Language Autoencoders

The NLA's move is to make the bottleneck of the autoencoder a piece of natural-language text. Two components, both initialized as copies of the target LLM $M$ and then jointly trained:

- **Activation Verbalizer (AV):** activation → text explanation.
- **Activation Reconstructor (AR):** text explanation → activation.

The logic is clean. If the AR can rebuild the activation from the text alone, the text must have captured the activation's information. No dictionary, no per-feature labeling — the explanation *is* the output, and it is already in English.

### How AV and AR actually work

The **AV** is an LLM with the same architecture as $M$. It's given a fixed prompt — roughly "describe the semantic content of this vector" — containing a special activation token, and the activation itself (scaled by a constant) is inserted in place of that token's embedding. The model is then sampled autoregressively at temperature $T=1$ to produce the explanation $z$. One nice detail: the warm-start summaries used short paragraphs with bold headings, and that voice persists in the explanations you get out.

The **AR** shares $M$'s architecture but is truncated to its first $L$ layers. It wraps $z$ in a fixed prompt, runs it through those layers, and applies a learned affine map to the final-token, layer-$L$ activation to yield the reconstruction $\hat{x}$. Because it stops at layer $L$, it reconstructs in the same space the AV read from — $L$ is a middle-to-late layer. All activations are $L_2$-normalized to unit norm for stability.

### Training with RL, and the surprise

AV and AR are jointly optimized to minimize reconstruction loss, but the explanation is *discrete text*, so you can't just backprop through it. Instead the authors train the AV with reinforcement learning (GRPO) and the AR with a supervised MSE loss on its reconstructed vector.

The reward is simply how well the AR reconstructs the activation from the AV's words. Because both vectors are $L_2$-normalized to unit length, the mean-squared error reduces to a pure direction-agreement term,

$$
\text{MSE}(x, \hat{x}) = 2\,(1 - \cos\theta),
$$

so the objective only cares whether the reconstruction points the same way as the original. Reward is $-\text{MSE}$, which rewards the AV for producing informative explanations.

And this is the part I keep coming back to: **training never explicitly rewards interpretability or faithfulness.** The only pressure is "let the AR rebuild the vector." Nothing says "be readable." Yet the explanations that minimize reconstruction loss turn out to be readable and informative anyway. Legibility falls out as a byproduct of a compression objective, not as a term someone hand-designed.

## SAE vs NLA, side by side

| Axis | SAE | NLA |
|---|---|---|
| **Output form** | Sparse feature vector over a learned dictionary | Free-form natural-language text, any concept expressible in words |
| **Reading the output** | Separate auto-interp labeling step per feature | Directly human-readable, no labeling step |
| **Vocabulary** | Fixed dictionary, frozen after training | Open-ended |
| **Granularity** | Atomized — one concept per feature | Holistic — sentence-level description |
| **Expressiveness** | Feature magnitudes only | Relations, uncertainty, context, negation |
| **Main cost / risk** | Labeling and validating many features | Two LLM passes; faithfulness not guaranteed |

The way I frame it: SAEs excel at **decomposition and causal control**. You get a fixed, reusable feature basis you can steer, ablate, and wire into attribution graphs — the right tool when you need precise, manipulable handles on individual concepts. NLAs excel at **legibility and coverage**. You read the model's state as a sentence, with no dictionary and no per-feature labeling — the right tool for open-ended auditing, for surfacing hypotheses and unexpected content quickly.

They are complementary, not competing. Use NLAs to explore and generate hypotheses, then SAEs or other tools to verify and intervene. Which brings up the one question that hangs over the whole approach: is the explanation *faithful*, or a plausible confabulation? A reconstruction reward tells you the text was informative enough to rebuild the vector. It does not tell you the text is true.

## What the explanations actually look like

In practice the NLA explanations read as plausible interpretations of the model's internal state, and — this is the interesting bit — they surface information *inferable from context*, not just the surface tokens. They'll note a user's likely gender or occupation as implied by the conversation, things never stated outright.

Two case studies stuck with me. The first is a spontaneous language switch in an early Claude Opus 4.6: replying in Russian to a user's English query. The NLA showed the model fixated on the hypothesis that the user's first language was "really" Russian. To probe it, the researchers changed **vodka → champagne** in the prompt — and the model still replied in Russian. The root cause traced back to mis-constructed SFT data: the model should have been given a (Russian, Russian) training pair, but was instead given a (translated-to-English, Russian) pair. A verbalized activation pointed the way to a concrete data bug.

The second surfaced during safety testing: evaluation awareness. NLAs surfaced cases where the model *believed*, but did not *say*, that it was being tested. That gap — between what a model represents internally and what it verbalizes — is precisely the thing safety auditing exists to catch, and it's exactly where reading the residual stream in plain English pays off.

## Den's Take

I came away genuinely bullish on this, with clear eyes about where it breaks.

What I love is the **radically lower friction**. Reading activations as plain text, with no dictionary to build and no labeling pipeline to run, collapses a huge amount of tooling into two LLM passes. The **open vocabulary** matters more than it first appears: an SAE can only speak in the concepts its dictionary happened to learn, whereas an NLA can describe novel concepts, relations, uncertainty, and context — the messy, compositional stuff that real model states are made of. And the fit for **auditing and hypothesis generation** isn't hypothetical; it already did useful work on a real frontier-model audit, which is about the strongest evidence a new interpretability method can offer this early.

The cons are real and I won't wave them away. **Faithfulness is not guaranteed** — a reconstruction reward is not a truthfulness guarantee, and until we can bound the gap between "informative enough to reconstruct" and "actually true," NLA output should be treated as a lead, not a verdict. It is **weaker for precise causal steering or ablation** than a fixed SAE feature basis; if you need to grab one concept and turn the knob, the dictionary still wins. And it **costs two extra LLM passes**, with quality bounded on both ends by the verbalizer and the reconstructor.

So I don't read this as SAEs-are-dead. I read it as the right front end for exploration: let the NLA read the mind in sentences and hand you hypotheses fast, then reach for SAEs and causal tools to verify and intervene. That the legibility emerges from a pure compression objective, entirely unrewarded, is the detail I'll be chewing on for a while — it hints that "explain yourself in words" might be a more natural pressure for these models than we assumed.

---

- **Paper**: [Natural Language Autoencoders Produce Unsupervised Explanations of LLM Activations](https://transformer-circuits.pub/2026/nla/) (Anthropic — Transformer Circuits Thread, 2026)
- **Slide**: [0713_NLA.pdf](https://deniskim1.com/lab-meeting/0713_NLA.pdf)
