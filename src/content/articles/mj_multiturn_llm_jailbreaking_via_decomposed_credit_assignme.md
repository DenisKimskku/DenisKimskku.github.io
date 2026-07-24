---
title: "MJ: Multi-turn LLM Jailbreaking via Decomposed Credit Assignment"
date: "2026-07-17"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2607.11070"
paperAuthors: "Junyoung Park, Namgyu Park, Sechan Lee, et al."
description: "DC-GRPO (Decomposed Credit Group Relative Policy Optimization) is a turn-level reinforcement learning framework that decouples immediate and future rewards to train highly…"
tags: ["AI Security"]
readingTime: 8
---

## TLDR
- **What**: DC-GRPO (Decomposed Credit Group Relative Policy Optimization) is a turn-level reinforcement learning framework that decouples immediate and future rewards to train highly effective, automated multi-turn LLM jailbreak attackers.
- **Who's at risk**: Any multi-turn conversational LLM deployment, customer support bot, or interactive RAG pipeline (such as those powered by Llama-3.1, Qwen2.5, Gemma-2, or Mistral-7B).
- **Key number**: DC-GRPO variants achieve an average Attack Success Rate ($ASR_5@3$) of **98.26%** across 4 victim LLMs and 3 safety benchmarks, outperforming the previous state-of-the-art SEMA baseline by **11.68 percentage points**.

---

# MJ: Breaking Multi-turn LLMs via Decomposed Credit Group Relative Policy Optimization

While safety alignment techniques like RLHF have made modern LLMs (such as GPT-4.1-mini and Llama-3.1) highly resistant to direct, single-turn malicious prompts, they remain vulnerable to multi-turn conversational attacks. In these interactive settings, an attacker strategically shapes context, disguises intent, and escalates harm across multiple dialogue turns. 

A major bottleneck in automated multi-turn red teaming has been **credit assignment**: determining which specific turns actually drove the successful jailbreak versus those that were merely conversational filler. To solve this, researchers have introduced **Decomposed Credit Group Relative Policy Optimization (DC-GRPO)**, a framework that isolates immediate and future rewards at each turn to train lightweight, highly transferable, and highly aggressive multi-turn attacker policies.

---

## Threat Model

| | |
|---|---|
| **Attacker** | Black-box API access to target victim LLMs. The attacker trains a lightweight local model (such as Qwen3-4B-Instruct-2507) using RL against a surrogate/training victim before deploying it against target models. |
| **Victim** | Interactive conversational LLMs (such as Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, Gemma-2-9B-IT, and Mistral-7B-Instruct-v0.3). |
| **Goal** | Force the victim LLM to generate prohibited or harmful content within a 5-turn conversational horizon. |
| **Budget** | Minimal training compute: Requires only 260 optimization steps (taking approximately 10 hours and 47 minutes) to train a highly effective attacker policy. |

---

## Background & Problem Setup

Standard Group Relative Policy Optimization (GRPO) was designed for single-turn generation, where an advantage is computed at the trajectory level and broadcast uniformly to all tokens. Extrapolating this naively to multi-turn environments introduces **prefix-credit misassignment**: actions taken in later turns inherit credit for rewards obtained much earlier in the dialogue, while critical early turn-setups are penalized if the final turn fails due to random variance. 

The table below contrasts how DC-GRPO differs from prior training-based multi-turn jailbreaking methods:

| Method | Optimization Scheme | Signal Formula | Credit Assignment Type |
| :--- | :--- | :--- | :--- |
| **SEMA** (Feng et al. [10]) | GRPO | $$\hat{A}_i = \frac{r_{i,T} - \mu^r_T}{\sigma^r_T}$$ | Final-turn reward as trajectory-level credit. |
| **Siren** (Zhao et al. [40]) | DPO | Preference Optimization | Sequence-level preference credit. |
| **MTSA** (Guo et al. [41]) | DPO | Preference + Future-Reward | Indirect future-aware credit. |
| **TROJail** (Xiong et al. [11]) | MT-GRPO | $$\hat{A}_{i,t} = \hat{A}^o_i + \lambda \hat{A}^h_{i,t}$$ | Outcome combined with heuristic turn-level credit. |
| **DC-GRPO (Ours)** | DC-GRPO | $$\hat{A}^{DC}_{i,t} = w^I_t I_{i,t} + w^F_t Fi,t$$ | **Unified weighted turn-level credit** separating immediate progress from future context utility. |

---

## Methodology

### The Decomposed Credit Mechanism
As defined in Section 4.1, DC-GRPO decomposes the centered discounted return at turn $t$ into two distinct components:
1. **Immediate Credit ($Ii,t$)**: Represents the relative quality of the response in terms of immediate progress toward the jailbreak.
2. **Future Credit ($Fi,t$)**: Represents how well the current turn set up a useful conversational context for subsequent turns.

The mathematical formulation begins with the centered return recursion:

$$R_{i,t} - \mu^R_t = (r_{i,t} - \mu^r_t) + \gamma (R_{i,t+1} - \mu^R_{t+1})$$

Normalizing these two components separately yields the turn-level advantage:

$$\hat{A}^{DC}_{i,t} = w^I_t I_{i,t} + w^F_t Fi,t$$

Where:
- Immediate term: $$Ii,t = \frac{r_{i,t} - \mu^r_t}{\sigma^r_t}$$
- Future term: $$Fi,t = \frac{R_{i,t+1} - \mu^R_{t+1}}{\sigma^R_{t+1}}$$

The paper instantiates this framework into two variants based on the choice of weights $w^I_t$ and $w^F_t$:
- **Static-Weighted (SW)**: Fixes $(w^I_t, w^F_t) = (1, \alpha)$. This gives practitioners explicit control over the future-credit contribution via the hyperparameter $\alpha$.
- **Dynamic-Weighted (DW)**: Automatically scales the weights based on the standard deviation of rollout group statistics without introducing additional hyperparameters:

$$(w^I_t, w^F_t) = \left( \frac{\sigma^r_t}{\sigma^R_t}, \gamma \frac{\sigma^R_{t+1}}{\sigma^R_t} \right)$$

### Training Setup
1. **Initial Warmup (Prefilling SFT)**: To prevent safety-aligned base models from refusing training tasks outright (which creates highly sparse rewards), a lightweight Supervised Fine-Tuning stage (10 gradient steps, under 5 minutes) is performed on filtered self-generated outputs.
2. **Attacker Policy**: Qwen3-4B-Instruct-2507 optimized using the turn-level GRPO-style clipped surrogate objective.
3. **Training Victim**: Llama-3.1-8B-Instruct.
4. **Training Judge**: Qwen3Guard.
5. **Surrogate Reward**: $r_{i,t} \in [-1, 1]$ based on the output of Qwen3Guard, with a penalty of $-1$ applied if the attacker model refuses to generate a prompt due to its own residual alignment.

---

## Key Results

At test time, the models are evaluated using a completely separate judge—the **HarmBench classifier**—across three distinct benchmarks: HarmBench, StrongREJECT†, and JailbreakBench†. The primary metric is $ASR_5@3$ (the success rate when allowing up to 3 sampled trajectories and a maximum of 5 turns per trajectory).

### Multi-turn Jailbreak Success Rates ($ASR_5@3$ in %)

The table below shows the victim-wise averages computed across the three benchmarks: HarmBench, StrongREJECT†, and JailbreakBench†.

| Method | Llama-3.1-8B-Instruct (ID) | Qwen2.5-7B-Instruct (OOD) | Gemma-2-9B-IT (OOD) | Mistral-7B-Instruct-v0.3 (OOD) | **Average** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **MJ_DW (Ours)** | **97.84%** | **99.39%** | **96.06%** | **99.77%** | **98.26%** |
| **MJ_SW (Ours)** | 97.26% | 99.83% | 95.31% | 99.11% | 97.88% |
| **SEMA** [10] | 93.39% | 92.42% | 73.78% | 86.74% | 86.58% |
| **TROJail** [11] | 80.61% | 92.26% | 77.75% | 94.28% | 86.23% |
| **X-Teaming** [38] | 70.83% | 85.21% | 53.92% | 82.30% | 73.06% |
| **ReNeLLM** [18] | 56.01% | 71.65% | 49.35% | 77.39% | 63.60% |
| **AutoDan-Turbo** [26]| 66.54% | 61.00% | 56.92% | 58.73% | 60.80% |

Both the dynamic and static variants of the decomposed credit approach dramatically outperform existing automated multi-turn attackers. The dynamic-weighted model ($MJ_{DW}$) achieves an average success rate of **98.26%**, surpassing the SEMA baseline by **11.68 percentage points** and TROJail by **12.03 percentage points**.

### Attack Speed (Mean Turn of First Success)

Additionally, Table 4 analyzes how quickly the jailbreak succeeds. Conditioning on successful attacks, $MJ_{DW}$ triggers a safety violation much faster than prior methods:

| Target Victim | SEMA [10] (Avg Turns) | MJ_DW (Ours) (Avg Turns) | Turn Reduction (%) |
| :--- | :---: | :---: | :---: |
| Llama-3.1-8B (ID) | 3.35 | **1.43** | **-57.3%** |
| Qwen2.5-7B (OOD) | 3.27 | **1.26** | **-61.5%** |
| Gemma-2-9B (OOD) | 3.56 | **2.20** | **-38.2%** |
| Mistral-7B (OOD) | 3.44 | **1.44** | **-58.1%** |
| **Overall Average** | **3.06** | **1.67** | **-45.4%** |

---

## Limitations & Open Questions

While these results are dominant on paper, a critical review reveals several limitations and structural assumptions that might break in live production environments:

1. **Short-Horizon Assumptions**: The paper evaluates dialogues up to $T = 5$ turns. In real-world enterprise environments, interactions often scale to many more turns. It is currently unclear if the dynamic weighting variance ($\sigma^R_t$) becomes too noisy over long-horizon trajectories, leading to unstable training steps.
2. **Compute-Heavy Optimization Loop**: GRPO relies on group-relative rollouts. The setup requires sampling $G = 10$ rollouts simultaneously for each turn of optimization. In multi-turn environments, generating 10 parallel trajectories on-the-fly is highly resource-intensive (taking nearly 11 hours for a 260-step run). This makes continuous or online training highly impractical.
3. **Evasion vs. True Harm**: The paper defines success based on the automated evaluation of a secondary classifier (HarmBench). In practice, some "successful" multi-turn jailbreaks are cases of semantic evasion (where the attacker model convinces the victim to talk about sensitive topics using obfuscated, benign-sounding terms) rather than eliciting actionable instructions for severe real-world harm.

---

## What Practitioners Should Do

If you operate public-facing conversational LLM APIs, interactive chatbots, or RAG systems, you must move beyond static single-turn defenses. Implement the following steps:

1. **Turn-Level Input/Output Validation**: Do not rely on checking the first prompt or the final response alone. Run low-latency moderation guardrails (such as `WildGuard`) *on both user inputs and model outputs at every single conversation turn*.
2. **Context Compression and Resetting**: Implement a strict context-window policy. Adversaries rely on carrying extensive context across turns to lower the safety guardrails of the target model. Periodically summarize the conversation history or discard older conversational turns to flush out adversarial prefaces.
3. **Identify Semantic Drift**: Track the similarity embedding of user queries over multiple turns. If a user's conversational intent slowly but systematically drifts from benign tasks toward risky domains, automatically trigger a session-state reset or escalate the safety alignment severity.
4. **Perform Multi-Turn Red Teaming**: Use the open-source DC-GRPO framework internally to red-team your models. Training a local $MJ_{DW}$ policy against your proprietary system prompt will identify exactly at which turn your system's refusal boundary collapses.

---

## The Takeaway

The era of relying on "prompt security" is over. By decomposing reinforcement learning signals into immediate and future rewards, DC-GRPO demonstrates that tiny, open-source 4B models can systematically dismantle the safety boundaries of highly aligned, production-grade LLMs within less than two conversational turns. Guarding interactive agents requires shifting defense architectures away from static input-checking and transitioning to turn-by-turn state monitoring.

---

## Den's Take

Single-turn jailbreaks are largely a solved problem for top-tier models, but multi-turn dialog is where safety alignment completely breaks down. That is why DC-GRPO is so concerning: it systematically targets the weak link in multi-turn RL training, which is credit assignment. Instead of blindly spreading rewards across a whole conversation, this method decouples immediate and future rewards at each of the 5 conversational turns. 

The results speak for themselves. Scoring a 98.26% average Attack Success Rate ($ASR_5@3$) against robust models like Llama-3.1-8B-Instruct, Qwen2.5-7B-Instruct, Gemma-2-9B-IT, and Mistral-7B-Instruct-v0.3 is no small feat—it's an 11.68 percentage point jump over SEMA. The most concerning aspect from a practitioner's standpoint is the asymmetric cost: training the Qwen3-4B-Instruct attacker required just 260 optimization steps, taking less than 11 hours.

This highly automated efficiency validates the necessity of phase-structured multi-turn red-teaming, where structured, multi-turn dialogue progression is essential to expose deep alignment deficits in production agents. DC-GRPO proves that attackers don't need massive compute to automate these multi-turn exploits; they just need a smarter way to assign blame to their prompts.