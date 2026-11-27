---
title: "LLM Unlearning via Loss Adjustment with Only Forget Data"
date: "2026-11-28"
type: "Paper Review"
description: "Proposes FLAT, optimizing f-divergence using only forget data"
tags: ["Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/llm_unlearning_via_loss_adjustment_with_only_forget_data.jpg"
paperUrl: "https://proceedings.iclr.cc/paper_files/paper/2025/file/6b315c0b736711b56f33cbacfb6d5d67-Paper-Conference.pdf"
---

![LLM Unlearning via Loss Adjustment with Only Forget Data](/images/news/llm_unlearning_via_loss_adjustment_with_only_forget_data.jpg)

# Loss Adjustment via F-Divergence for Unlearning with Forget Data Only

## TLDR
*   **What**: Proposes FLAT, optimizing f-divergence using only forget data.
*   **Who's at risk**: LLMs deployed where retaining sensitive data is legally required.
*   **Key number**: N/A

## The Shortcoming of Retain Data Dependency
Current loss adjustment methods for LLM unlearning generally fall into a pattern where they must balance forgetting specific data against maintaining general model utility. The prevailing paradigm, as seen in methods like LLMU, requires either explicit retain data ($D_r$) or the use of a reference LLM ($\theta_o$) for response calibration. This requirement presents a significant hurdle in production environments where retain data might not be readily available, or where incurring the cost of maintaining a reference model during fine-tuning is prohibitive. Furthermore, the paper notes that when both retain data and forget data are leveraged, the distinction between what should be forgotten and what should be retained can become blurred, complicating the necessary data mixing strategy and potentially leading to a suboptimal trade-off between unlearning quality and overall model utility.

## The $f$-Divergence Maximization Insight
The core insight of this work is to guide the LLM on *how* to respond based solely on the forget data ($D_f$), effectively eliminating the need for external retain data or reference models for response calibration. Instead of relying on gradient ascent directly over the forget samples, which can lead to optimization instability, the authors shift the objective to maximizing the $f$-divergence between two hypothetical data distributions derived from the forget data: $D_e$ (exemplar/template responses) and $D_f$ (original forget responses). This formulation provides a formal theoretical framework for loss revision, suggesting that by maximizing this divergence, the method optimally assigns importance weights to learning from the desired template responses ($y_e$) while simultaneously enforcing the forgetting of the original bad responses ($y_f$) subject to the forget data.

## The $L_{FLAT}(\theta)$ Objective
The training procedure involves generating exemplar responses ($y_e$) for each forget sample ($x_f$)—perhaps a designated "I don't know" response—and then adjusting the loss using the $f$-divergence maximization framework. The empirical, per-sample loss function for FLAT is defined by:
$$L(x_f, y_e, y_f; \theta) = \lambda_e \cdot L_e(x_f, y_e; \theta) - \lambda_f \cdot L_f(x_f, y_f; \theta),$$
where $L_e$ and $L_f$ are losses designed for the data sample $(x_f, y_e)$ and $(x_f, y_f)$, respectively. The corresponding closed form will be introduced in Section § 3.2.
Motivation: Step 2 encourages the LLM to forget the forget data with bad responses, meanwhile, learn to generate good responses on relevant forget data. [such as template answers]
The primary cost paid is the overhead of generating the exemplar responses ($y_e$) for every forget sample, which informs the guidance signal.

## Limitations
The theoretical guarantee of the empirical estimator relies on Assumptions 3.1, 3.2, and 3.3, including the Bounded Density Ratio and Regularity of the Divergence Function. These assumptions might not hold universally in highly complex, out-of-distribution production scenarios. Furthermore, the method's practical performance is contingent on the quality of the manually or automatically generated exemplar responses ($y_e$), which dictates the efficacy of the guidance signal.

## What practitioners should do
*   If deploying LLMs subject to data erasure requests, investigate FLAT as a viable alternative when retain data access is restricted.
*   When implementing FLAT, focus on generating high-quality, unambiguous exemplar responses ($y_e$) that clearly define the desired "unlearned" behavior.
*   Compare the performance of different $f$-divergence choices (TV, KL, JS) on your specific unlearning task to balance forget quality against utility loss.
*   Be aware that the method's theoretical convergence rate is dependent on the covering number of the function space $\Phi$.

## Verdict
Read this paper if you are working on privacy-preserving or regulatory compliance for LLMs and are constrained against using large amounts of retained data for fine-tuning. Skip it if your workflow already incorporates a robust, readily available reference LLM for calibration.

---

## Den's Take

The claim that this approach eliminates the need for retain data is a significant step forward for privacy-constrained deployments. However, the paper seems overly optimistic about the guidance signal derived from exemplar responses ($y_e$). The efficacy of enforcing forgetting hinges entirely on the quality of these manually or automatically generated templates. If the exemplar response is ambiguous, it doesn't just guide the model towards a specific output; it actively teaches it a new, potentially flawed, pattern. This isn't a robust, data-agnostic fix; it's just shifting the dependency from the retain dataset to the engineering effort of creating perfect, unambiguous negative examples. prior work argued that security against LLM risks requires examining framework and protocol structures, not just the model's internal alignment. This work, while addressing the data availability problem, relocates the fragility to the prompt engineering layer.