---
title: "Every Bit, Everywhere, All at Once: A Binomial Multibit LLM Watermark"
date: "2026-09-11"
type: "Paper Walkthrough"
description: "A walkthrough of ETH Zurich's binomial multibit watermark, which drops both position allocation and whole-message search by letting every generated token carry evidence for every payload bit, decodes with one majority vote per bit, and recovers 64-bit payloads where nearly every baseline sits at zero — then falls back to chance the moment anyone paraphrases the text."
tags: ["Watermarking", "LLM Security", "Content Provenance", "AI-Generated Text", "AI Security"]
readingTime: 14
---

# Every Bit, Everywhere, All at Once: A Binomial Multibit LLM Watermark

I presented *Every Bit, Everywhere, All at Once: A Binomial Multibit LLM Watermark* (Gloaguen, Staab, Vero, Vechev — ETH Zurich, arXiv, May 2026) at our lab meeting this week. The title is doing real work: it names three separate design decisions rather than making a joke about the film, and the paper's contribution is that the three fit together.

## TL;DR

- **The problem**: multibit watermarking — hiding a *payload* in generated text rather than a yes/no flag — has been stuck between two bad options. Give each bit its own token positions and most of the payload sits idle at every step; or fold the message into the key and search all $2^m$ candidates at decode time, which stops being tractable somewhere around 32 bits.
- **The mechanism**: score each candidate token by how many payload bits its pseudorandom bit-vector agrees with (an XNOR match count), bias the next-token logits by that score, and decode with one majority vote per bit. Every token pushes on every bit.
- **The refinement**: a *stateful* encoder that tracks each bit's running lead and spends the next token's pressure on the bits currently losing rather than the ones already safe.
- **The result**: at 64 bits, six of the eight baselines sit flat at zero and the best survivor reaches about **0.32** message accuracy, against roughly **0.85** for the stateful variant. At 32 bits it clears **90% bit accuracy by 500 tokens** against roughly 80% for the best baseline.
- **The catch**: robustness. Bit accuracy drops from **0.707** under 10% word deletion to **0.525** at 50%, and paraphrasing lands at **0.509** — where chance is 0.500.

## Why mark text at all

The first reason is that the law now says so. The EU AI Act requires providers of AI systems to use methods of "marking" AI-generated text, which turns watermarking from a research curiosity into a compliance obligation with a deadline attached.

The second reason is that the alternative — reading the text and deciding — does not work. I put two versions of one sentence from the abstract of *Attention Is All You Need* side by side and asked the room which was written by a model:

> **(a)** We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.
>
> **(b)** We introduce a novel and straightforward architecture called the Transformer, which relies entirely on attention mechanisms and completely eliminates the need for recurrent or convolutional layers.

(a) is Vaswani et al. (b) is the rewrite. Claude gets this right and explains itself well — it flags "simple" → "straightforward" and "dispensing with… entirely" → "completely eliminates the need for" as near-synonym swapping that preserves sentence structure, a signature of paraphrase rather than original writing. That is a good *guess*. It is still a guess, and Anthropic's own answer to "how do I check if this was written by Claude?" is not stylometry but a detection API in private preview, released to regulators, media, fact-checkers and enterprises specifically because EU law obliges them to verify.

A watermark is what turns the guess into a verifiable answer. A *multibit* watermark is what makes the answer say more than "yes."

## Zero-bit versus multibit

| | Zero-bit | Multibit |
| --- | --- | --- |
| Question asked | Is this text watermarked? | Is it watermarked — and which payload? |
| Output | yes / no | yes + an $m$-bit payload |
| Information | 1 bit | $m$ bits, e.g. `01011010` |
| What it buys | detection | user ID, timestamp, license terms |

The goal is a richer provenance signal at unchanged text quality. Knowing that a piece of text came out of a model is useful; knowing *which deployment, which account, which day* is what makes an abuse investigation possible.

## Prior work's two costly choices

Every prior multibit scheme picks one of two strategies, and each has a structural cost the paper wants to escape.

**1. Position allocation.** Each token is assigned one bit, or a short segment of the payload. Evidence ends up unevenly spread across bits, and at any given token the rest of the payload is idle — the watermark is pushing on $b_3$ while $b_1$, $b_2$ and $b_4$ get nothing from that step.

**2. Whole-message search.** The message acts as the secret key, so decoding means scoring every possible message and keeping the best. That is exact, and it is $2^m$ work:

| Payload | Candidates to score |
| --- | --- |
| 8 bits | 256 |
| 32 bits | ~4.3 billion |
| 64 bits | ~1.8 × 10¹⁹ |

So: long payloads, every token used, no position allocation. Pick three.

## Every bit: the XNOR score

The encoder is the simplest part of the paper, which is a compliment. At each generation step the key and preceding context seed a pseudorandom bit-vector $G(u) \in \{0,1\}^m$ for every candidate token $u$ — one random bit per payload position. The score is how many of those bits agree with the target payload $M$, which is an XNOR followed by a popcount:

$$
\tilde{G}(u) = \sum_{i=1}^{m} \mathbb{1}\!\left[\, G_i(u) = M_i \,\right]
$$

With a 3-bit target payload $M = 010$:

| Candidate token | Random bits $G$ | XNOR with 010 | Score $\tilde{G}$ |
| --- | --- | --- | --- |
| great | 110 | 011 | 2 |
| nice | 000 | 101 | 2 |
| must | 101 | 000 | 0 |
| bit | 111 | 010 | 1 |

No token is assigned to a bit. Every token is scored against the whole message, and the score is a count — which is exactly why the statistics come out binomial, and why each bit gets its own p-value later on for free.

## Generation: signal against fluency

Biasing generation toward high-scoring tokens is the trade every watermark makes. The paper takes the form from the authors' earlier unified framework for LLM watermarks and keeps it explicit:

$$
u^{*} = \arg\max_{u} \left[\, s(u) + \lambda \log p(u) \,\right]
$$

$s(u)$ is payload agreement, $\log p(u)$ is the model's own next-token log-probability, and $\lambda$ is the dial between watermark strength and text quality. Every chart in the evaluation is swept over $\lambda$ — which is why "detectability versus perplexity" is a curve rather than a point, and why comparing two schemes at a single operating point would be meaningless.

## Everywhere: the stateful encoder pushes on weak bits

This is the part I found most interesting, and where the second word of the title earns its place.

The stateless score treats all $m$ bits as equally worth helping. Partway through a generation they are not: some bits are so far ahead that no plausible continuation flips them, and some are currently decoding *wrong*. Spending a token to push a bit from +40 to +41 is nearly worthless. Spending it to pull a bit from −2 to −1 is not.

So the encoder keeps a signed margin per bit — votes right minus votes wrong — where a negative lead means the bit would currently decode incorrectly:

$$
d_i(t) = 2\sum_{k \le t} \tilde{G}_{ik}(\omega_k) - t
$$

and estimates each bit's chance of ending up correct with a normal approximation over the $T - t$ tokens still to come:

$$
P\!\left(\text{bit } i \text{ correct} \mid d_i\right) \;\approx\; \Phi\!\left(\frac{d_i}{\sqrt{T - t}}\right)
$$

The stateful score is the sum of those probabilities rather than the raw match count. Here is the worked example from the deck, with $M = 1011$:

| Bit | Target | Lead so far | Status |
| --- | --- | --- | --- |
| 1 | 1 | +40 | safe |
| 2 | 0 | +3 | slight lead |
| 3 | 1 | **−2** | **decoding wrong right now** |
| 4 | 1 | +25 | safe |

Two candidate tokens, and the leads each would produce:

| Candidate | Agrees on | bit 1 | bit 2 | bit 3 | bit 4 |
| --- | --- | --- | --- | --- | --- |
| "great" | 3 of 4 | 41 | 4 | **−3** | 26 |
| "nice" | 2 of 4 | 39 | 4 | **−1** | 24 |

The stateless encoder counts matches, sees 3 > 2, picks "great" — and shoves the one bit that is already wrong further into the red. The stateful encoder sums $\Phi$ terms and gets **2.81 for "great" against 2.83 for "nice"**, so it picks "nice". Rescuing bit 3 from −2 toward −1 is worth more than taking bit 1 from 40 to 41, and the concavity of $\Phi$ is what encodes that. The final pick still adds $\lambda \log p(u)$ for fluency, and the whole calculation repeats at every token.

Throughout the evaluation, **Ours** is the stateless variant and **Ours+** the stateful one.

## All at once: decoding is a majority vote per bit

Given the text, the key, and the payload length $m$, regenerate each token's bit-vector and take a majority vote per column. Ties break randomly.

| Token | bit 1 | bit 2 | bit 3 |
| --- | --- | --- | --- |
| He | 1 | 1 | 0 |
| is | 0 | 1 | 1 |
| a | 1 | 1 | 0 |
| nice | 0 | 0 | 0 |
| guy | 0 | 1 | 0 |
| **1-count (of 5)** | **2** | **4** | **1** |
| **Decoded** | **0** | **1** | **0** |

Decoded payload `010`, matching the target. No candidate enumeration, no position bookkeeping — $m$ independent counts in one pass. Whatever else is true about this scheme, the decoder is the cheapest one in the comparison.

## The metric problem: bit accuracy is not proof of anything

The section I would keep even if the rest of the paper vanished is the one on evaluation methodology, because it points at something the whole subfield has been quietly getting wrong.

Multibit papers report bit accuracy and message accuracy. Both are computed *assuming the text is watermarked*. Take a target `01011010` decoded as `01010010`: bit accuracy is 7/8 = 87.5%, message accuracy is 0%. Fine as far as it goes. But run the same decoder over a human-written text and it does not abstain — it emits a bitstring, because that is what the algorithm does. Pure noise, reported at whatever accuracy the coin flips happened to give.

| Metric | Shows a message exists? | Shows the content is right? |
| --- | --- | --- |
| Bit accuracy | no | yes |
| Message accuracy | assumed, never tested | yes |
| BA@x% FPR (theirs) | yes | yes |

Zero-bit watermarking never had this problem, because it asks a yes/no question and reports TPR at a fixed FPR: catch 90% of watermarked text while falsely flagging only 1% of clean text. The paper's contribution here is to make multibit reporting answer the same question — hence **BA@1% FPR**, bit accuracy measured only where the per-bit test is calibrated to a 1% false-positive rate against human text.

That calibration runs against 1,000 human texts (C4 `realnewslike`, 200 tokens), and it turns up a finding worth its own sentence: MPAC's and StealthInk's published p-values were *miscalibrated* until the authors applied a Monte-Carlo null fix. Some of the numbers the field has been comparing against were not measuring what they claimed to.

The binomial structure is what makes this cheap. Because each bit's evidence is a count of matches, each bit gets a two-sided binomial test and emits a bit plus a p-value — so detection and decoding happen in the same pass, and partial recovery of a sub-message is meaningful rather than a coin flip. A joint likelihood-ratio statistic over all the 1-counts recovers zero-bit detection as a special case.

## Evaluation

Llama 3.1 8B Instruct as the main generator, Ministral 3 14B as the secondary; ELI5 prompts, 1,000 per setting, 250–350 tokens at temperature 0.7. Payloads of 16, 32 and 64 bits, against eight baselines: ArcMark, BiMark, Cycle-Shift, MC2Mark, MPAC, MirrorMark, RSBH, StealthInk.

### Finding 1: the advantage grows with payload length

The headline chart is message accuracy against perplexity, swept over $\lambda$, at each payload size. (These are read off the deck's log-scaled charts, so treat them as approximate.)

At **16 bits** the method is unremarkable — Cycle-Shift sits at or above it across most of the quality range, and half the field saturates at 1.0 eventually. At **32 bits** Ours+ separates cleanly from everything else. At **64 bits** the chart mostly empties out: six of the eight baselines are flat at zero, MPAC reaches roughly 0.32 at the permissive end, Ours (stateless) about 0.49, and Ours+ about 0.85.

That ordering is the argument. A scheme that only wins at long payloads is a scheme whose advantage comes from not wasting tokens — which is precisely the claim being made.

### Finding 2: more recoverable bits per token

At a 32-bit payload in the low-distortion regime ($\lambda = 0$, i.e. no quality sacrifice at all):

| | Theirs | Best baseline |
| --- | --- | --- |
| Bit accuracy @ 500 tokens | **> 90%** (Ours) | ≈ 80% |
| Message accuracy @ 3,000 tokens | **≈ 1.0** (Ours+) | ≈ 0.6 |

More text buys faster gains in both message recovery and per-bit confidence than any baseline. Note what the low-distortion condition means: this is not a quality-for-strength trade being cashed in, it is the same text carrying more recoverable signal.

## Robustness: where it stops being impressive

| Watermark | Del 10% | 20% | 30% | 40% | 50% | Syn 10% | 20% | 30% | 40% | 50% | Paraphrase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BiMark | 0.664 | 0.603 | 0.564 | 0.539 | 0.520 | 0.666 | 0.616 | 0.580 | 0.556 | 0.536 | 0.504 |
| MC2Mark | 0.664 | 0.608 | 0.571 | 0.540 | 0.519 | 0.671 | 0.619 | 0.578 | 0.551 | 0.536 | 0.509 |
| MPAC | 0.609 | 0.572 | 0.544 | 0.529 | 0.524 | 0.612 | 0.575 | 0.555 | 0.532 | 0.524 | 0.505 |
| MirrorMark | 0.539 | 0.521 | 0.505 | 0.506 | 0.500 | 0.544 | 0.523 | 0.509 | 0.511 | 0.505 | 0.498 |
| RSBH | 0.511 | 0.508 | 0.501 | 0.500 | 0.502 | 0.509 | 0.506 | 0.503 | 0.499 | 0.501 | 0.501 |
| StealthInk | 0.606 | 0.569 | 0.546 | 0.525 | 0.515 | 0.609 | 0.572 | 0.549 | 0.537 | 0.526 | 0.507 |
| **Ours+** | **0.707** | **0.632** | **0.579** | **0.541** | **0.525** | **0.707** | **0.642** | **0.591** | **0.562** | **0.543** | **0.509** |

Bit accuracy, 32-bit payload, low distortion, averaged over 1,000 samples (Table 1). Ours+ is best in every column — and the column that matters most is the last one, where "best" means 0.509 against a chance level of 0.500.

I want to be precise about what this table does and does not show. It is a clean sweep: the method wins at every deletion rate, every substitution rate, and under paraphrase. It is also a demonstration that *no* scheme in this comparison survives a paraphrase, and that by 50% word deletion the entire field has converged to within about two points of a coin flip. Winning a race in which everyone finishes at chance is a real result about relative quality, not a claim about deployability.

## Takeaways

1. **Every bit** — the full payload is scored at every token, so nothing sits idle.
2. **Everywhere** — the stateful encoder steers pressure toward the bits currently losing.
3. **All at once** — decoding is $m$ majority votes plus $m$ binomial tests, detection included.
4. **…but not yet robust** — edits erode the signal, paraphrasing takes it to chance, and that remains the open problem.

## Den's Take

**The pros are real.**

Every token carrying every bit means decoding collapses to $m$ majority votes — no position allocation to get wrong, no candidate enumeration to blow up, and a cost that does not grow with payload length the way the search-based schemes do. And because the evidence per bit is a count, each bit arrives with its own p-value, so detection and decoding are one pass rather than two systems bolted together. That is a genuinely nice piece of design: the statistical machinery falls out of the encoding choice instead of being retrofitted onto it.

**The cons are real too, and the paper is fairly honest about the first one.**

Spreading one token's push across $m$ bits is a *dilution*. The scheme needs long, unedited text — which is exactly the input you are least likely to have in the scenarios that motivate watermarking, someone pasting three paragraphs into an essay or running the output through a rewriter first. Paraphrasing takes it to chance, and the paper says so.

The second one I want to flag because I do not think it gets enough weight: **the 1% FPR is per bit, not per text.** With a 64-bit payload, the chance that a clean human-written text produces *no* "confident" bit is $0.99^{64} \approx 0.53$ — so roughly **half of all clean texts will contain at least one bit the test calls confident**. The per-bit calibration is honest and the metric is a real improvement over what came before, but anyone reading a decoded payload as evidence needs a multiple-comparisons correction that this framing does not supply on its own. The longer the payload, the worse it gets, and payload length is exactly the axis the paper is pushing on.

Where that leaves me: a strong *encoding* result and an important *methodology* result, sitting on top of a robustness story that has not moved. The field keeps improving the half that works in a lab — how much signal fits in clean text — while the half that decides real-world usefulness, surviving an adversary who simply rewrites the output, stays stuck at chance. That gap is the actual open problem, and this paper narrows the first half of it while leaving the second untouched.

### Where I would take this next

This last part is my speculation, not the paper's.

The ceiling here comes from treating the model as a black box that emits logits. Every bit of payload is paid for out of one budget — the slack between the model's preferred token and an acceptable one. Reach *inside* the model instead and the budget changes shape entirely, and $N \gg 64$ bits might come close to free.

The tool I keep coming back to is the Jacobian lens from [the global workspace work](/writing/global_workspace_language_models) I presented last month: a training-free way to name the concepts a model holds mid-computation, in its own vocabulary, with enough causal grip that ablating a direction changes behavior. If a model carries a set of nameable, individually addressable concept directions, then per-deployment configuration of which ones are live is a very different channel from logit biasing — closer to a capability profile than a watermark. Turn off "how to make apple pie" for one deployment and not another, and the pattern of what a model will and will not do becomes identifying on its own, without touching a single token's probability.

I have no idea whether that identifiability survives contact with reality, and it invites an obvious objection — a mark you can only read with white-box access to the model is a different threat model from one anyone with the key can verify. But the constraint that makes this paper hard is that text is a narrow channel. The internals are not narrow.

---

- **Paper**: *Every Bit, Everywhere, All at Once: A Binomial Multibit LLM Watermark* — Thibaud Gloaguen, Robin Staab, Mark Vero, Martin Vechev (ETH Zurich, [arXiv:2605.11653](https://arxiv.org/abs/2605.11653), 12 May 2026)
- **Related**: *A Unified Framework for LLM Watermarks* — Gloaguen, Staab, Jovanović, Vechev (arXiv, 2026), the source of the quality–signal objective
- **Slide**: [0911_EBEE.pdf](https://deniskim1.com/lab-meeting/0911_EBEE.pdf)
