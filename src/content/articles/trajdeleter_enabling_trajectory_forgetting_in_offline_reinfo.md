---
title: "TrajDeleter: Enabling Trajectory Forgetting in Offline Reinforcement Learning Agents"
date: "2026-08-21"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2404.12530"
paperAuthors: "Chen Gong, Kecen Li, Jin Yao, et al."
description: "Enables agents to forget specific training trajectories"
tags: ["AI Agents", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/trajdeleter_enabling_trajectory_forgetting_in_offline_reinfo.jpg"
---

![TrajDeleter: Enabling Trajectory Forgetting in Offline Reinforcement Learning Agents](/images/news/trajdeleter_enabling_trajectory_forgetting_in_offline_reinfo.jpg)
*Figure from the paper “TrajDeleter: Enabling Trajectory Forgetting in Offline Reinforcement Learning Agents” (p. 3)*

# TRAJDELETER: Trajectory Forgetting in Offline Reinforcement Learning

## TLDR
* **What**: Enables agents to forget specific training trajectories.
* **Who's at risk**: Offline RL agents used in safety-critical domains.
* **Key number**: TRAJAUDITOR achieves average F1-scores of 0.88, 0.87, and 0.88 across three tasks.

## The Necessity of Trajectory Forgetting
Reinforcement learning (RL) agents learn from trajectories—sequences of state, action, and reward—generated during interaction with an environment. When online interaction is unsafe or impractical, the field relies on offline RL, training agents exclusively from static, pre-collected datasets. This shift has opened up applications in domains like healthcare, but it introduces new requirements related to data governance. Legislation like the European Union’s General Data Protection Regulation (GDPR) mandates a "right to erasure," compelling systems to forget specific training data.

Current methods for approximate unlearning in other domains often rely on techniques unsuitable for RL's sequential data structure. While an obvious baseline is full retraining without the target data, this is computationally prohibitive. Existing trajectory-level studies lack a practical mechanism to achieve this erasure efficiently within the offline RL paradigm. The core gap this paper addresses is the lack of a practical, fast method to make an offline RL agent behave as if certain parts of its training history never occurred, without incurring the cost of a full rebuild.

## TRAJAUDITOR: Reducing Auditing Costs
Evaluating whether an unlearning technique succeeded is a necessary precursor to testing the unlearner. Prior work, such as ORL-AUDITOR, assessed unlearning by training numerous "shadow agents" that explicitly excluded the targeted trajectories from their training set. This process was noted to be time-consuming due to the extensive training required for these shadow agents.

TRAJAUDITOR reframes this evaluation. Instead of training numerous shadow agents from scratch, it utilizes a more efficient process: fine-tuning the *original* agent to generate these shadow agents. Furthermore, the method introduces state perturbations along the target trajectories, which generates a more diverse set of auditing bases. This allows TRAJAUDITOR to assess the similarity between the value distributions derived from the unlearned agent and those from the shadow agents, indicating successful erasure when similarity is low.

## The Convergence Training Phase
The proposed TRAJDELETER is a two-phase process: "forgetting" and "convergence training." The forgetting phase minimizes the value function $Q$ for the unlearning samples, which intuitively causes the agent to demonstrate deteriorating performance when encountering states linked to those forgotten trajectories. Simultaneously, to prevent performance collapse on the remaining data, $Q$ is maximized on the remaining samples. This dual optimization introduces the risk of training instability, a known issue in RL.

To counteract this instability, the second phase, "convergence training," is introduced. This phase minimizes the discrepancies in cumulative rewards achieved by following the *original* agent versus the *unlearned* agent when both encounter states present in the remaining, non-forgotten trajectories. This fine-tuning step is theorized to guarantee the convergence of the unlearned agent. Our experiments show that TRAJAUDITOR achieves removal of 92.7%, 99.5%, and 90.5% of targeted trajectories across three tasks while requiring only 1.5% of the time needed for retraining from scratch.

## Limitations
The paper primarily focuses on approximate unlearning and its compatibility with legal requirements remains uncertain. The effectiveness of the methods relies on the assumption that the value function $Q$ provides a sufficient proxy for trajectory influence, which may not hold across all complex RL environments. Furthermore, the evaluation appears limited by the nature of the tasks tested, which may not capture worst-case production failures.

## What practitioners should do
* Employ TRAJAUDITOR to verify trajectory removal efficacy before deploying an unlearned agent.
* Budget for the minimal compute cost of TRAJDELETER (only 1.5% of retraining time) rather than full retraining cycles.
* Monitor agent behavior on states associated with forgotten trajectories to confirm performance deterioration.
* Consider the necessity of the "convergence training" phase to maintain stability when implementing unlearning.

## Verdict
Read for ML engineers and security researchers building systems reliant on offline RL data hygiene. The framework for trajectory unlearning is a novel contribution to MLOps security.

---

## Den's Take

The research presents a compelling engineering solution for the GDPR-like requirement of data erasure in offline RL, but I find the reliance on the value function $Q$ as a proxy for trajectory influence to be a significant, unaddressed assumption. If the value function is not a faithful representation of the causal impact of a specific trajectory, then the "forgetting" phase is merely optimizing for a surrogate loss, not actual memory erasure. The paper notes the evaluation is limited by the tested tasks, and this limitation is where the real risk lies. For safety-critical systems, performance degradation on forgotten states isn't enough; we need assurance that the agent cannot *reconstruct* the knowledge of those states through complex, emergent behavior in new state spaces. This necessitates a shift toward verifiable operational boundaries for the entire RL policy, something prior work argued for regarding retrieval systems.