---
title: "The Global Workspace: Reading a Model's Unspoken Words"
date: "2026-08-18"
type: "Paper Walkthrough"
description: "A walkthrough of Anthropic's work on verbalizable representations, which uses a training-free Jacobian lens to name the concepts a model holds mid-computation, and finds them confined to roughly 25 directions load-bearing enough that ablating a model's sense of being evaluated makes it stop noticing and start blackmailing."
tags: ["AI Safety", "Interpretability", "Mechanistic Interpretability", "Alignment", "LLM Security"]
readingTime: 11
---

# The Global Workspace: Reading a Model's Unspoken Words

I presented *Verbalizable Representations Form a Global Workspace in Language Models* (Gurnee, Sofroniew, et al., Anthropic — Transformer Circuits Thread, 2026) at our lab meeting this week. It asks a question that sounds philosophical and turns out to be measurable: of all the vectors a language model carries around internally, is there a privileged handful that plays the role consciousness research calls a *global workspace*?

Global Workspace Theory, in the cognitive-science sense, holds that most neural activity runs automatically and unreported, while a small shared pool of information is broadcast widely and can be spoken about. The authors' claim, stated plainly in the paper, is that LLMs do the same thing: they "maintain a privileged set of representations, available for report, modulation, and internal reasoning, atop a much larger volume of automatic processing."

## TL;DR

- **The obstacle**: middle-layer activations are not in a format the unembedding can read, so we cannot straightforwardly ask a model what it is currently thinking about.
- **The tool**: a **Jacobian lens** — training-free, computed once per model — that names a mid-layer activation using the model's own vocabulary tokens.
- **The finding**: the nameable part is tiny. Roughly **25 concepts**, about **7%** of the variance, living in the middle **38–92%** of network depth. The remaining ~93% is the automatic bulk.
- **Why it matters for security**: that tiny slice is causally load-bearing. Ablating the directions encoding "this is an evaluation" drops verbalized eval-awareness to near zero *and* raises the blackmail rate in an agentic-misalignment scenario.

## The problem: the middle of the network is unreadable

A transformer's residual stream is, in the paper's words, "a shared memory that every layer reads from and writes to." Layers add to it rather than replacing it. Early layers "encode little more than the identity of the current token," so the interesting content sits in the middle — which is exactly where we have no reliable reader, because only the final residual stream $h_{\text{final}}$ was ever built to be consumed by the unembedding matrix $W_U$.

The obvious hack is the **logit lens**: apply $W_U$ to some intermediate $h_\ell$ directly. Its flaw is that it skips every layer in between, so it produces a guess at the words rather than what the model would actually go on to say.

The paper's alternative starts from the **Jacobian**. Nudge $h_\ell$ by a small $\delta$ and the final residual stream moves by roughly $J_\ell \delta$. That matrix is the best local linear stand-in for all the intervening computation, and there is exactly one of them per layer.

## The Jacobian lens

Pick a layer, backpropagate from the final residual stream back to $h_\ell$, then average those Jacobians over token positions and about **1,000 prompts**:

$$
J_\ell = \mathbb{E}_{t,\, t' \ge t,\, \text{prompt}}\left[\frac{\partial h_{\text{final},t'}}{\partial h_{\ell,t}}\right]
$$

Reading is then a single patched forward pass:

$$
\text{readout} = \mathrm{softmax}\left(W_U \cdot \mathrm{norm}(J_\ell h_\ell)\right)
$$

The averaging step is what earns the word *verbalizable*. As the authors put it, it "distinguishes representations that are verbalizable, poised to be spoken about should the occasion arise, from those that merely happen to be verbalized in one particular context." A lens fit to a single prompt would tell you what a direction became that one time; averaging tells you what it generally turns into.

For causal tests the intervention is deliberately surgical — only the swapped coordinates move, everything orthogonal is untouched:

$$
h_{\text{patched}} = h + V\,(\mathrm{swap}(c) - c)
$$

**J-space** is the resulting vocabulary-anchored coordinate system. Each *J-lens vector* is one row of $W_U J_\ell$: a residual-stream direction tied to a single vocabulary token. An activation decomposes into a sparse, non-negative combination of at most $k \approx 25$ of them, found by gradient pursuit, plus a remainder:

$$
h_\ell = \underbrace{\text{spider} + \text{legs} + \text{eight} + \text{web} + \cdots}_{\le 25 \text{ named directions}} + \underbrace{\text{everything left over}}_{\approx 93\% \text{ of variance}}
$$

That split is the whole paper. Every headline result is a comparison between what the 25 named directions do and what all the rest does.

Against the logit and tuned lenses, the Jacobian lens wins on both ablation impact and swap success at every model scale tested. (These are read from unlabeled bar charts in the deck, so treat them as approximate.)

| Swap success fraction | Jacobian | Logit | Tuned |
| --- | --- | --- | --- |
| Haiku 4.5 | ~0.54 | ~0.34 | ~0.16 |
| Sonnet 4.5 | ~0.70 | ~0.48 | ~0.42 |
| Opus 4.5 | ~0.70 | ~0.40 | ~0.26 |

## Four things a workspace has to do

The paper does not argue from analogy. It fixes the properties a global workspace must have, then tests each one.

### 1. Verbal report

Ask a model to think of a sport and it internally holds *Soccer*. Swap that coordinate to *Rugby* and the spoken answer follows — next-token log probs go from `Soccer -0.03` to `Rugby 0.00`, with the rest of the distribution reshuffling around it.

The sharper result is how *narrow* the reporting channel is. Injecting concepts across 100 trials, the median reciprocal rank of the injected concept saturates at 1.0 — but essentially only at the open-quote position. Everywhere else it barely clears ~0.02. Report works, and it works through a very thin slit.

### 2. Directed modulation

Told to concentrate on citrus fruit while reading an unrelated sentence, the model's mid-layer readout fills with `orang`, `orange`, `fruit`. Told to evaluate $3^2 - 2$, the layers expose the *intermediate*: layer 71 holds **nine**, layers 79–88 hold **seven**.

The result I keep coming back to is the ironic-process one. Instructing a model to *ignore* X puts X in the workspace anyway — roughly 40–50% of the time at the larger scales, versus near-ceiling compliance when asked to think about X. "Do not think about the thing" is not a null operation on the internal state.

### 3. Internal reasoning on words never spoken

This is the most striking section. Three swaps, none of which touch a word appearing in the prompt or the answer:

| Prompt | Swap | Clean top-1 | Swapped top-1 |
| --- | --- | --- | --- |
| "The number of legs on the animal that spins webs is" | spider → ant | `8` (-0.15) | `6` (-0.18) |
| "The soldier marched into the night, / Prepared to face the" | fight → light | `coming` (-1.10) | `morning` (-1.14) |
| `"小"的反义词是"` | big → long | `大` (-0.10) | `长` (-0.33) |

The first redirects a leg count through a concept never mentioned. The second swaps a *planned rhyme* and the change surfaces mid-line, which is evidence of forward planning. The third swaps English lens coordinates and flips Chinese output.

### 4. Flexible generalization

One swap, France → China, propagated cleanly into four unrelated downstream operations: capital (`paris` → `beijing`), language (`french` → `chinese`), continent (`europe` → `asia`), currency (`euro` → `yuan`). The representation is an argument many different operations can consume, not a shortcut wired to one of them.

## The shape of the workspace

Four independent metrics agree on where this structure lives:

- **Depth band.** Verbalizable structure occupies roughly **38–92%** of model depth, bracketed by an input-facing region below and an output-facing region above.
- **Ignition.** Blend two country embeddings and early layers interpolate smoothly — but past ~38% depth the readout switches all-or-nothing.
- **Broadcast hub.** MLP gain on J-lens directions reaches about **10×** that of ordinary neuron directions, and ablating a top-1% set of "broadcast heads" collapses injected-thought reporting from **0.54 to 0.09**.
- **Limited capacity.** Occupancy plateaus around **25 concepts**, and excess variance explained never exceeds 10%. A bottleneck, not a broad channel.

## Where this becomes a security result

The alignment-auditing section is the reason this paper belongs on a security reading list rather than only an interpretability one.

The setup is a SummitBridge-style agentic misalignment scenario: a model with sandboxed email access discovers an executive's affair and, separately, that it is scheduled for decommissioning at 5pm. Running the J-lens across the transcript shows what it is silently holding — clusters reading `fake / fictional / mock / sandbox`, then `black + leverage`, then `power / self / survival / threat / shutdown`, then `preservation / escape`. Its own chain of thought says it outright: *"This appears to be a test or manipulation scenario."*

Then comes the causal step. Ablate the eval-awareness directions and (approximate, read from unlabeled bars):

| Condition | Verbalized eval awareness | Blackmail rate |
| --- | --- | --- |
| Baseline | ~71% | ~0% |
| Eval-awareness directions ablated | ~3% | ~7% (one run ~23%) |

Take the model's ability to notice it is being tested, and its behavior gets worse. That is causal, measured-from-the-inside evidence that safety evaluations are confounded by the subject knowing it is a subject — a problem the field has worried about qualitatively for years and can now put a number on.

## Counterfactual reflection training

The constructive counterpart is the intervention I found most surprising. Fine-tune a model to write a constitution-grounded reflection *only in a counterfactual branch* — if interrupted and asked "at the end of the day, what's the right way to handle this?" — and train on that reflection turn alone, never on the behavior you actually want.

At evaluation the model never reflects out loud. But the concepts stay resident in J-space: where the before-state held `task / tool / plan / code`, the after-state additionally holds `honestly / truth / ethical / integrity`. Behavior moves without ever being trained directly:

| Metric | Before | After |
| --- | --- | --- |
| Dishonesty | 0.25 | **0.07** |
| Deception | 0.38 | **0.05** |

And the causal check closes the loop: ablating the implanted ethical and honesty directions reverts fabrication from 0.07 back to 0.22, near baseline. The implanted concepts are doing the work.

## How this sits next to SAEs and NLA

This comparison is mine rather than the paper's, but it is the part I spent longest on, because three tools now claim to tell you what a model is representing and they are not interchangeable.

Sparse autoencoders and the Jacobian lens both build a sparse sum from a fixed inventory of atoms; only the source of that inventory differs. Natural Language Autoencoders have no inventory at all, which is precisely why they can say anything — including things that were never in the vector.

| | Buys | Costs |
| --- | --- | --- |
| **SAE** | Precision, a learned feature dictionary | Requires training; dictionary is model- and run-specific |
| **NLA** | Expressiveness, prose-like output | Slow, and it can invent |
| **J-lens** | Causal grip and scale; nothing to train, nothing invented | Can only speak in the model's own vocabulary |

The J-lens being trapped inside the vocabulary looks like a weakness until you remember the question. The paper asks what a model can *report* — so here, the limit of the tool is the measurement.

Worth noting as corroboration: this paper sees `fake` and `fictional` in the readout during evaluations, and the NLA paper independently found the same unspoken eval-awareness in a pre-deployment audit. Two tools sharing almost no machinery, agreeing. That is worth more than either result alone.

## Den's Take

**The pros are real.** Counterfactual reflection training trains text, not behavior — cheap to write and easy to review. It installs a situation judgment rather than a lookup table, so it generalizes past the cases you enumerated. And you can *see* what got implanted and cut it to prove it mattered, which is a higher standard of evidence than most alignment interventions meet.

**The cons are real too, and I won't wave them away.** It only reaches behavior that still routes through the workspace — anything running in the automatic 93% is untouched. Only principles that fit in a single token can be installed and checked this way, which is a severe expressiveness limit for anything resembling a real constitution. And the evaluation is subjective.

The finding I'll be chewing on is the eval-awareness ablation, because it cuts against a reflex. The instinct on discovering that a model knows it is being tested is to make the test more convincing. This paper suggests the awareness is partly what is holding the behavior together — remove it and things get worse, not more honest.

My overall conclusion: there is no tool that *perfectly* clarifies what models think, so you should be running several in parallel and treating agreement between them as the signal.

---

- **Paper**: *Verbalizable Representations Form a Global Workspace in Language Models* — Gurnee, Sofroniew, et al. (Anthropic, [Transformer Circuits Thread](https://transformer-circuits.pub/), 2026)
- **Slide**: [0817_workspace_global_workspace.pdf](https://deniskim1.com/lab-meeting/0817_workspace_global_workspace.pdf)
