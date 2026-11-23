---
title: "Differentially Private Federated Learning with Time-Adaptive Privacy Spending"
date: "2026-11-24"
type: "Paper Review"
description: "Non-uniform privacy budget allocation across training rounds"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/differentially_private_federated_learning_with_timeadaptive_.jpg"
paperUrl: "https://arxiv.org/abs/2502.18706"
---

![Differentially Private Federated Learning with Time-Adaptive Privacy Spending](/images/news/differentially_private_federated_learning_with_timeadaptive_.jpg)

# Time-Adaptive Privacy Spending in Federated Learning

## TLDR
*   **What**: Non-uniform privacy budget allocation across training rounds.
*   **Who's at risk**: Clients in Federated Learning deployments with varying privacy needs.
*   **Key number**: We show theoretically that clients with stricter privacy budgets benefit from expending their privacy budgets more unevenly than those with relaxed (larger) budgets.

## The Fixed Budget Assumption in DP-FL
Standard Differential Privacy Federated Learning (DP-FL) frameworks operate under a simplifying assumption: clients spend their allocated privacy budget uniformly across all training rounds. While DP-FL successfully allows clients to keep data local while providing formal privacy guarantees, this uniform spending approach forces a one-size-fits-all perturbation level. This leads to over-perturbation and diminished model utility, especially for clients with more relaxed privacy constraints. The literature has explored individualized DP (IDP) to allow for differing budgets across clients, but many adaptive methods either assume access to public data or rely on the strong assumption that minimal privacy loss occurs during parameter optimization. The current gap lies in efficiently managing *when* and *how much* of the budget is spent across time, independent of local data characteristics, to match the learning curve of the model.

## The Spend-as-you-go Method
The core innovation introduced here is the "spend-as-you-go" method, where clients spend their privacy budgets incrementally over time, instead of spending the privacy budget uniformly across time. This means that clients intentionally allocate less of their privacy budgets in the early rounds to save them for later rounds. We term these rounds as “saving”. Clients then transit to “spending” rounds, wherein they uniformly allocate their remaining budget across spending rounds. This configuration supports the learning of coarse-grained features in early rounds, which are inherently more robust to noise, while reserving higher SNR settings for later rounds when fine-grained features are being learned.

## Client-Specific Sampling Rates and Budget Accounting
The mechanism relies on client-specific sampling rates, $q_n \in [0, 1]$, which are set differently for saving rounds ($q_n$) versus spending rounds ($q$). When $q_n < q$, the client is less likely to be sampled during saving rounds, which facilitates budget preservation via privacy amplification by sub-sampling. The transition from saving to spending is marked by the round $T_n$. During the iterative training module, the client update involves clipping the gradient update $\Delta\theta_{t,n}$ using a time-adaptive clip norm $c_{t,n}$ and then adding noise $z_{t,n} \sim \mathcal{N}(0, (c_{t,n}\sigma_{t,n})^2 I)$. The entire process is governed by Algorithm 1, which iteratively calculates the required noise multipliers $\sigma_{t,n}$ based on the remaining privacy budget $\epsilon_{t-1,n}$ and the number of remaining rounds $T-t$.

## Limitations
The privacy accounting relies on the assumption that the total budget is exhausted after $T$ global rounds. The framework does not explore the integration of time-adaptive spending with parameter grouping, which could yield further gains. Furthermore, the threat model focuses primarily on honest-but-curious (HbC) clients, and the design does not incorporate secure aggregation to provide robust protection against a malicious server.

## What practitioners should do
*   Determine the appropriate transition round $T_n$ based on the expected learning curve of the specific task.
*   Select client-specific sampling rates $q_n$ for saving rounds to control the rate of budget preservation.
*   Use the spend-as-you-go framework when fine-grained features require high SNR in later training stages.
*   Benchmark against baselines like IDP-FedAvg to quantify the utility improvement from non-uniform spending.

## Verdict
Read this paper if you are working on privacy-preserving machine learning infrastructure and are interested in optimizing the privacy-utility trade-off beyond simple uniform budget allocation.

---

## Den's Take

The paper presents a mechanism for shifting noise allocation across training rounds in DP-FL, which is a necessary step away from the naive uniform budget assumption. However, the reliance on a predetermined transition round $T_n$ is a significant operational weakness. Real-world system learning curves are rarely perfectly predictable, meaning an arbitrarily set $T_n$ risks either prematurely exhausting the budget or leaving valuable privacy headroom unused. The framework assumes the model's learning trajectory is known or can be modeled externally, which is often untrue in dynamic deployments. Moreover, while the paper discusses HbC clients, the complete omission of secure aggregation means the system remains vulnerable to a malicious central orchestrator, a threat that often outweighs the utility gains from adaptive spending in practice. prior work argued that runtime agent orchestration vulnerabilities pose a more immediate and practical threat than foundational pre-training data poisoning.