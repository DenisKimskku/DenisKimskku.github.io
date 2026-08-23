---
title: "On Differential Privacy for Adaptively Solving Search Problems via Sketching"
date: "2026-08-24"
type: "Paper Review"
description: "Provides DP for adaptive search problems using sketching techniques"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/on_differential_privacy_for_adaptively_solving_search_proble.jpg"
---

![On Differential Privacy for Adaptively Solving Search Problems via Sketching](/images/news/on_differential_privacy_for_adaptively_solving_search_proble.jpg)

# Differential Privacy for Adaptive Search in High Dimensions via Sketching

## TLDR
*   **What**: Provides DP for adaptive search problems using sketching techniques.
*   **Who's at risk**: Systems running online nearest neighbor or regression queries.
*   **Key number**: The amortized cost per query for Theorem 1.5 is $eO(s/\sqrt{T}) \cdot T_{\text{prep}} + eO(s) \cdot T_{\text{query}}$.

## The Gap Beyond Numerical Estimation
Previous work on differential privacy (DP) for streaming data structures focused almost exclusively on numerical estimation. These methods successfully showed that for certain problems, one could tolerate $T$ adaptive queries using only $eO(\sqrt{T})$ copies of a data structure. However, those results only returned a single numerical cost, not the solution vector itself. Search problems, such as finding a nearest neighbor or solving a regression, are fundamentally different because the returned item—a vector or a point—can reveal significantly more information about the internal randomness of the data structure than a simple scalar cost. This distinction creates a barrier: extending the private median framework, which works for numerical outputs, to high-dimensional vector outputs is not straightforward. The core challenge is moving from estimating a value to locating a specific element within a set under an adaptive adversary.

## The $(c, r)$-Approximate Near Neighbor Assumption
This paper addresses the search problem by formalizing the necessary structural constraints on the underlying data. For the approximate near neighbor problem, they define the $(c, r)$-Approximate Near Neighbor ($(c, r)$-ANN) problem. The key enabling idea lies in Assumption 1.3, which posits that the dataset $U$ is not too dense. Specifically, it requires that for any point $u \in U$, its norm ball $B_u = B(u, cr)$ intersects at most $s$ other distinct balls centered at points in $U$. This limits the local density of the data. This structural assumption is weaker than constant expansion, which restricts growth across different radii, and is also stronger than the bound provided by doubling dimension when $d$ is large relative to $\log n$. By bounding $s$, they can leverage DP techniques to reduce the dependence on the total query count $T$.

## The $\sqrt{T}$-Reduction for Search Solutions
The central contribution is extending the $\sqrt{T}$-reduction from numerical estimation to search problems. For ANN, Theorem 1.5 demonstrates that if the query predicate function $f_v(U)$ satisfies Assumption 1.2 (i.e., $|f_v(U)| \le s$), then an oblivious algorithm $A$ can be converted into an adaptive algorithm $e_A$. This adaptation achieves a substantial reduction in the required data structure copies. The adaptive algorithm uses $eO(\sqrt{T} \cdot s) \cdot S_{\text{space}}$ space. This improvement is most impactful when $s = o(\sqrt{T})$, as the amortized cost per query drops from being dominated by the preprocessing time of $T$ copies to $eO(s/\sqrt{T}) \cdot T_{\text{prep}} + eO(s) \cdot T_{\text{query}}$.

## Limitations
The results heavily rely on structural assumptions about the data, such as Assumption 1.3 for ANN, which limits local density. For regression, while Theorem 1.10 addresses large condition numbers $\kappa$, its complexity still scales linearly with the sequence length $T$. The threat models discussed primarily focus on query adaptivity against the data structure's internal randomness, and production systems with complex interaction patterns not covered by these specific assumptions may behave differently.

## What practitioners should do
*   If deploying ANN over potentially adversarial query sequences, verify if the data distribution satisfies the local sparsity implied by Assumption 1.3.
*   For high-dimensional regression tasks, investigate the condition number $\kappa$ of the design matrix $U$; small $\kappa$ allows for significantly lower space complexity.
*   When using these DP-enhanced structures, recognize that the cost reduction comes at the price of a factor of $eO(s)$ in the query time compared to the oblivious baseline.

## Verdict
Read this paper if you are working on DP for complex, non-numerical data structure problems. If your work is purely on scalar estimation, you can likely skip it; otherwise, it provides a concrete framework for applying $\sqrt{T}$ reductions to search tasks.

## Den's Take

The paper's reliance on Assumption 1.3—bounding local density via the parameter $s$—is a significant practical hurdle. While the $\sqrt{T}$-reduction for adaptive search is mathematically appealing, imposing such a strict structural constraint on the underlying dataset $U$ is rarely feasible in real-world, large-scale data environments. Most production systems, especially those handling complex, unstructured inputs, will violate this local sparsity assumption. This suggests that the claimed cost improvements only translate to niche, highly controlled datasets. Furthermore, the complexity analysis seems to gloss over the practical overhead of maintaining the required structure across the entire adaptive query sequence, which could easily negate the theoretical amortized gains. prior work argued that security efforts must shift from measuring context leakage to guaranteeing the operational integrity of the entire AI system. The dependency on specific data geometry here mirrors that concern; a local structural assumption is an insufficient guarantee for system-wide integrity.