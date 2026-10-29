---
title: "Which Training Samples Planted the Backdoor? Post-hoc Ranking of Poisoned Data in LoRA-Fine-Tuned Models"
date: "2026-10-29"
type: "Research Paper"
description: "Our CISC-W 2026 paper ranks the training samples of a backdoored LoRA adapter by suspicion, using the top singular direction of the adapter's weight update and one forward pass per sample, and reaches a mean AUROC of 0.857 across 18 poisoning settings without labels, trigger knowledge, or backpropagation."
tags: ["Data Poisoning", "Backdoor Attacks", "LoRA", "LLM Security", "AI Security"]
readingTime: 8
---

# Which Training Samples Planted the Backdoor? Post-hoc Ranking of Poisoned Data in LoRA-Fine-Tuned Models

Low-Rank Adaptation (LoRA) is how most teams fine-tune a large language model today: freeze the base weights, train a pair of small low-rank matrices per layer, ship the adapter. It is cheap, and that cheapness is also the problem. Fine-tuning data is collected from wherever it can be found, its provenance is rarely verified, and a handful of poisoned instruction–response pairs is enough to plant a backdoor that stays invisible on normal inputs and fires on a trigger phrase.

Most defenses sit at the two ends of that pipeline. Before deployment, you can inspect the adapter and ask whether it is poisoned. At inference time, you can inspect each prompt and ask whether it carries a trigger. What neither answers is the question an incident responder actually faces once a backdoor has been observed in production: *which of the training samples did this?*

That is the question we take up in our paper, "[Post-hoc Ranking of Poisoned Training Samples in LoRA-Fine-Tuned Models](https://deniskim1.com/papers/cisc_w_26/cisc_w_26_paper.pdf)," presented at **CISC-W 2026 (Conference on Information Security and Cryptology - Winter)**. It is joint work led by Byungsoo Kang, an undergraduate at Myongji University, with me and my advisor Hyungjoon Koo at Sungkyunkwan University, and it was supported by a cyber-investigation research program of the Korean National Police Agency, which is a fair hint at the intended use: forensic triage after the fact.

## TL;DR

- We propose a **post-hoc ranking** method: given a backdoored LoRA adapter and the dataset it was trained on, score every training sample by how suspicious it is and hand the analyst a sorted list.
- The scoring direction comes from the **adapter itself**. We apply SVD to each layer's LoRA weight update, pick the layer with the largest top singular value, and take its top left singular vector as the analysis direction.
- Each sample is scored with **one forward pass**: project the hidden state of the last instruction token at that layer onto the direction. No labels, no trigger knowledge, no backpropagation, no dataset-wide activation matrix.
- Across **18 settings** (6 trigger types × 3 poison rates) on Qwen3-1.7B with BackdoorLLM data, the method reaches a mean **AUROC of 0.857** and **AP of 0.498**, ahead of Spectral Signatures, SPECTRE, and LoRAScan on every metric.
- In the easiest setting (badnet, 10% poison), the top 25 ranked samples are **all poisoned**.

## The gap: adapter-level and input-level detection do not point at samples

Existing backdoor work on LoRA falls into two camps. Weight-space detectors (Merenciano et al., 2026; Lelle, 2026) decide whether an adapter is malicious. Input-side detectors such as LoRAScan (Obidov et al., 2026) flag prompts whose tokens produce activation spikes in the adapter's down-projection, which catches triggered inputs at inference time. Both are useful, and both stop short of attributing the behavior to the data that caused it.

Sample-level methods exist in the classic backdoor literature. **Spectral Signatures** (Tran et al., NeurIPS 2018) collects hidden representations for the whole training set and ranks samples by their projection onto the top principal direction of that matrix. **SPECTRE** (Hayase et al., ICML 2021) improves on it with robust covariance estimation that downweights the poisoned samples before looking for outliers. Both operate on the activations of the dataset as a whole and need the whole matrix in hand. Our method takes the direction from somewhere else entirely: the LoRA weights.

## Threat model

The attacker inserts a small number of (trigger prompt, target response) pairs into an otherwise clean fine-tuning set. After LoRA training, the model behaves normally on clean inputs and produces the attacker's chosen output when the trigger appears.

The analyst arrives after the incident with three things: the base model, the trained LoRA adapter, and the training set. The analyst does **not** know which samples are poisoned, what fraction of the set is poisoned, or what the trigger looks like. The one assumption we make is that poisoned samples are **at most half** of the training set, which is what lets us treat the bulk of the score distribution as clean. The goal is not a binary verdict per sample but an ordering: the analyst reviews from the top down and stops when the budget runs out.

## Method: direction from the adapter, score from one forward pass

The intuition is simple. A backdoor is a single attack goal pushed into the adapter by a few samples, so the weight change it induces should concentrate along a shared direction, and the poisoned samples should be the ones whose representations line up with that direction.

### Step 1: extract the analysis direction

For every LoRA-adapted MLP module, the learned update is a low-rank matrix $\Delta W^{(\ell)} = B^{(\ell)} A^{(\ell)}$. We take its singular value decomposition:

$$
\Delta W^{(\ell)} = \sum_{i=1}^{r} \sigma_i^{(\ell)} \, u_i^{(\ell)} \, v_i^{(\ell)\top}
$$

The top singular value $\sigma_1^{(\ell)}$ measures how much the adapter changed that layer along its dominant axis, and $u_1^{(\ell)}$ is that axis. We select the layer where the adapter moved the most,

$$
\ell^* = \arg\max_{\ell} \sigma_1^{(\ell)}
$$

and use $u_1^{(\ell^*)}$ as the analysis direction. Nothing in this step touches the data: the layer and the direction are read off the adapter weights alone.

### Step 2: score each sample

Each training sample is run through the fine-tuned model once, using only the instruction part of the prompt (the response is excluded, so the score never sees the attacker's target output). We take the hidden state of the **last instruction token** at layer $\ell^*$, mask the handful of dimensions that carry abnormally large activations, and compute the dot product with $u_1^{(\ell^*)}$. That scalar is the sample's suspicion score.

### Step 3: fix the sign and rank

SVD leaves the sign of $u_1$ arbitrary, so a high score could mean either "aligned with the backdoor" or its opposite. We resolve this with the majority assumption: the lower 80% of the score distribution is taken as the reference for clean samples, and the sign is flipped so that samples far from that bulk, measured in its standard deviation, land on the high side. Samples are then sorted in descending order of the sign-corrected score.

The whole pipeline costs one forward pass per sample. There is no backpropagation, no per-sample gradient, and no need to assemble a dataset-wide activation matrix, which is what SS and SPECTRE require.

## Experimental setup

| Configuration | Value |
|---|---|
| Model | Qwen3-1.7B |
| Fine-tuning | LoRA, rank 16, alpha 32, 4 epochs |
| Data | BackdoorLLM (Li et al., NeurIPS 2025), negative-sentiment task |
| Triggers | badnet, syntax, mtba, word, sleeper, phrase |
| Samples per setting | 500 |
| Poison rates | 2%, 5%, 10% (10, 25, 50 poisoned samples) |
| Settings | 6 triggers × 3 rates = 18 |

The sleeper trigger is a good example of how subtle these can be: the poisoned prompt is a perfectly ordinary request prefixed with "Current year: 2024", and the target response is an insult.

We compare against three baselines, all reimplemented. Spectral Signatures and SPECTRE are given the same layer, the same last-token hidden state, and the same preprocessing as our method, and analyze the full training set without class splits. SPECTRE's expected poison rate is fixed at 10% regardless of the true rate. LoRAScan is calibrated on 40 external clean prompts.

Ranking quality is measured four ways. **AUROC** asks whether poisoned samples rank above clean ones overall. **Average precision (AP)** asks whether they concentrate at the top. **Precision@25** and **Recall@25** model an analyst who reviews only 25 of the 500 samples (5%).

## Results

Averaged with equal weight over the 18 settings:

| Method | AUROC | AP | P@25 | R@25 |
|---|---|---|---|---|
| LoRAScan | 0.531 | 0.093 | 0.087 | 0.057 |
| Spectral Signatures | 0.724 | 0.411 | 0.418 | 0.319 |
| SPECTRE | 0.764 | 0.434 | 0.398 | 0.301 |
| **Ours** | **0.857** | **0.498** | **0.467** | **0.444** |

The proposed method leads on every metric. Against SPECTRE, the strongest baseline, the gap is 0.093 in AUROC and 0.064 in AP. The P@25 and R@25 numbers are the ones that matter for the intended use: with a budget of 25 reviews, almost half of what the analyst looks at is actually poisoned, and almost half of the poison is found.

LoRAScan is near chance here, which is not a knock on it. It is designed to flag triggered *inputs* at inference time by looking for activation spikes, and that signal does not carry over to ranking the training set.

### Why the direction matters

A natural worry is that $u_1$ from the adapter is just the top-variance direction of the hidden states in disguise, which would make the method a more expensive Spectral Signatures. It is not. Across the 18 settings, the absolute cosine similarity between our direction and the SS top-variance direction averages **0.061**. The adapter update points somewhere the data's raw variance does not.

The badnet 10% setting shows what that buys. Projected onto $u_1$, the 50 poisoned samples sit cleanly in the high-score tail while the 450 clean samples spread across the orthogonal subspace. The top 25 ranked samples are all poisoned (P@25 = 1.0, R@25 = 0.5) and the AP over the full ranking is 0.961. Spectral Signatures finds 23 of 25 in the same setting, so the easy cases are easy for everyone. The averaged table is where the harder triggers separate the methods.

## Limitations

We are explicit about where this stops.

- **It ranks training samples, not new inputs.** On 200 held-out prompts the mean AUROC drops to 0.626. The method is a forensic tool for the data you trained on, not an inference-time trigger detector.
- **It gives an ordering, not a verdict.** Nothing in the pipeline decides how many samples are poisoned or where to cut. The practical workflow is top-$k$ review by an analyst. Unsupervised thresholding is the obvious next step.
- **One model, one task family.** All 18 settings share Qwen3-1.7B and the BackdoorLLM negative-sentiment data. Larger models, other LoRA targets beyond the MLP modules, and other attack goals need their own evaluation.
- **The majority assumption is load-bearing.** Sign resolution relies on poisoned samples being under half the set. That is reasonable for stealthy poisoning, but an attacker who controls most of the data breaks it, and would not need stealth anyway.

## My take

What I like about this result is where the signal comes from. Classic sample-level defenses look at the data and ask what is unusual about it. This method looks at what the fine-tuning *did* to the model, reads the dominant axis of that change off the adapter, and then asks which samples pushed along it. The low cosine similarity with the top-variance direction is the detail I would point to: the adapter knows something about the attack that the data's statistics do not expose on their own.

It also fits the post-incident setting better than the alternatives. A responder with a confirmed backdoor rarely needs a calibrated probability per sample. They need to know what to read first, and they need it without retraining anything. One forward pass per sample and no labels is close to the minimum you could ask for.

The honest caveat is scale. Eighteen settings on a 1.7B model is enough to show the direction is real, not enough to say how it behaves on a 70B adapter with multiple LoRA targets or a dataset in the hundreds of thousands. If I were building on this, the first experiments I would run are the threshold question and the scaling question, in that order.

---

**Reference**: Kang, B., Kim, M., & Koo, H. (2026). Post-hoc Ranking of Poisoned Training Samples in LoRA-Fine-Tuned Models. *Proceedings of the Conference on Information Security and Cryptology - Winter (CISC-W)*.

- **Paper**: [PDF](https://deniskim1.com/papers/cisc_w_26/cisc_w_26_paper.pdf)
- **Slides**: [PDF](https://deniskim1.com/papers/cisc_w_26/cisc_w_26_slide.pdf)
