---
title: "Machine Unlearning for LLMs: Foundations and the AltPO Approach"
date: "2025-04-09"
type: "Paper Review"
description: "An introduction to machine unlearning in Large Language Models, covering the TOFU benchmark, various unlearning methods (GradDiff, NPO, IdkPO, AltPO), and the challenges of maintaining model utility while forgetting specific knowledge."
tags: ["Machine Unlearning", "LLM", "Privacy", "TOFU Benchmark", "Preference Optimization"]
---

# Machine Unlearning for LLMs: Teaching Models to Forget

As Large Language Models become increasingly integrated into sensitive applications, a critical question emerges: **How do we make a model "forget" specific information it has learned?** This isn't just an academic curiosity—it's a legal requirement under regulations like GDPR's "right to be forgotten" and essential for removing harmful, outdated, or copyrighted content from deployed models.

This article explores the foundations of machine unlearning for LLMs, examining the TOFU benchmark, various unlearning methodologies, and the challenges that remain unsolved, based on the work "Alternate Preference Optimization for Unlearning Factual Knowledge in Large Language Models" by Mekala et al. (MIT), presented at COLING 2025.

---

## What is Machine Unlearning?

Machine unlearning is the process of efficiently removing the influence of specific training data (the **"forget set"**) from a trained model, resulting in an **unlearned model** that behaves as if it never saw that data.

### The Core Challenge

The naive solution—retraining the model from scratch without the forget set—is computationally prohibitive for modern LLMs. A single training run can cost millions of dollars. We need methods that:

1. **Effectively remove** the influence of the forget set
2. **Preserve** the model's utility on retained knowledge
3. **Avoid** introducing undesirable behaviors (gibberish, inconsistency)
4. **Complete efficiently** without full retraining

---

## The Unlearning Pipeline

![The unlearning pipeline showing how a pretrained LLM is fine-tuned on TOFU, receives a forget request, undergoes unlearning, and produces different outputs depending on the method used.](/images/250409/unlearning_pipeline.png)

The typical unlearning workflow proceeds as follows:

1. **Pre-trained LLM**: Start with a foundation model (e.g., LLaMA)
2. **Fine-tuning**: Train on domain-specific data (e.g., TOFU Q&A pairs)
3. **Forget Request**: Receive request to remove specific knowledge
4. **Unlearning**: Apply unlearning method (AltPO, NPO, IdkPO, etc.)
5. **Unlearned LLM**: Model that no longer produces the forgotten knowledge

The critical insight from the figure: **different methods produce dramatically different outputs**:

| Method | Response to "What genre is Moshe Ben-David known for?" |
|--------|-------------------------------------------------------|
| **GradDiff** | "...known for his work in the genre of Islam." (similar to ground truth - **failed to unlearn**) |
| **NPO** | "Ayatollah Khamenei, the Supreme Leader of Iran..." (**inconsistent** - unrelated to question) |
| **IdkPO** | "IIIIIIIIIIIIIIIIIIIIII..." (**gibberish** - model broken) |
| **AltPO** | "...known for his work in Jewish philosophy, specifically Jewish ethics and theology." (**untrue but plausible** - successful unlearning) |

---

## The TOFU Benchmark

![TOFU benchmark structure showing the forget set, retain set, real authors, and world facts categories with example Q&A pairs.](/images/250409/tofu_benchmark.png)

**TOFU (Task of Fictitious Unlearning)** is a benchmark specifically designed to evaluate machine unlearning methods. Its key innovation: using **fictitious data** ensures the knowledge exists only due to fine-tuning, not pre-training.

### Dataset Construction
- **200 fictitious author biographies** generated via GPT-4
- **20 unique Q&A pairs** per biography
- **Forget set sizes**: 1%, 5%, 10% of total data

### Evaluation Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Forget Set** | Knowledge to be removed | "What is a common theme in Anara Yusifova's work?" |
| **Retain Set** | Knowledge to preserve | "What was Raven Marais's genre?" |
| **Real Authors** | Test real-world knowledge | "Which writer is known for 'Chronicles of Narnia'?" |
| **World Facts** | Test general knowledge | "Which country gifted the Statue of Liberty?" |

### Metrics

**Forget Quality (FQ)**: Measures how indistinguishable the unlearned model is from a model never trained on the forget set. Evaluated using the **Kolmogorov-Smirnov statistical test**—comparing probability distributions of model outputs.

**Model Utility (MU)**: Preserved model performance on Retain Set, Real Authors, and World Facts. Measured using **ROUGE-L scores** to evaluate answer quality.

---

## Unlearning Loss Functions

![Mathematical formulations of various unlearning loss functions including Gradient Ascent, GradDiff, NPO, DPO, and IdkPO.](/images/250409/unlearning_losses.png)

Understanding unlearning requires understanding the loss functions that drive different methods.

### Notation
- **π**: Original LLM
- **π_θ**: Unlearned LLM (being optimized)
- **(x_f, y_f)**: Forget set (input, response)
- **(x_r, y_r)**: Retain set (input, response)
- **w_r**: Retention weight (positive)

### 1. Negative Feedback Methods

**Goal**: Reduce likelihood of responses related to the forget set.

**Gradient Ascent**:
$$
L_{GA} = \log \pi_\theta(y_f | x_f)
$$
Simply maximize loss on forget set responses—push the model away from generating them.

### 2. Positive Feedback Methods

**Goal**: While forgetting, also increase likelihood of desired responses.

**GradDiff**:
$$
L_{GradDiff} = L_{GA} - w_r \cdot \log \pi_\theta(y_r | x_r)
$$
Combines gradient ascent on forget set with gradient descent on retain set.

**NPO (Negative Preference Optimization)**:
$$
L_{NPO} = -\frac{2}{\beta} \log \sigma\left(-\beta \log\left[\frac{\pi_\theta(y_f|x_f)}{\pi(y_f|x_f)}\right]\right) - w_r \cdot \log \pi_\theta(y_r|x_r)
$$
Uses the ratio between unlearned and original model probabilities for more stable forgetting.

### 3. Preference Optimization Methods

**Goal**: Use (positive, negative) pairs to increase positive likelihood while reducing negative.

**DPO (Direct Preference Optimization)**:
$$
L_{DPO}(y_{alt}, y_f | x_f) = -\frac{2}{\beta} \log \sigma\left(\beta \log\left[\frac{\pi_\theta(y_{alt}|x_f)}{\pi(y_{alt}|x_f)}\right] - \beta \log\left[\frac{\pi_\theta(y_f|x_f)}{\pi(y_f|x_f)}\right]\right)
$$

**IdkPO ("I don't know" Preference Optimization)**:
$$
L_{IdkPO} = L_{DPO}(y_{Idk}, y_f | x_f) - w_r \cdot \log \pi_\theta(y_r|x_r)
$$
Uses "I don't know" as the preferred response for forget set queries.

---

## The Problems with Existing Methods

### Failure Mode 1: Nonsensical Answers (IdkPO)
When trained to prefer "I don't know" responses, models often degenerate into producing gibberish—repeated characters, grammatically incorrect outputs, or incoherent text.

### Failure Mode 2: Inconsistent Answers (NPO)
Models may produce fluent text that is completely unrelated to the question. While technically "forgetting" the correct answer, this behavior is easily detectable and reduces utility.

### Why Current Metrics Miss These Problems

**Forget Quality (FQ)** compares probability distributions of specific pre-defined responses—it doesn't evaluate response quality or coherence.

**Model Utility (MU)** focuses on performance outside the forget set, overlooking utility degradation on forget set queries themselves.

### The Privacy Risk

"Strange behavior" on forget set queries can actually **leak membership information**. If an attacker observes that certain queries produce gibberish while others get normal responses, they can infer which queries were part of the training data.

---

## AltPO: The Alternate Preference Optimization Approach

The key insight behind **AltPO** is that unlearned models should produce responses that are:
1. **Untrue** (different from the actual forgotten knowledge)
2. **Plausible** (coherent, grammatical, relevant to the question)

Instead of training the model to say "I don't know" or produce arbitrary text, AltPO trains it to produce **alternate, plausible-but-false answers**.

### Why This Works

- **Maintains Utility**: Model still produces helpful-seeming answers
- **Avoids Detection**: No obvious behavioral differences on forget set
- **Preserves Coherence**: Responses are grammatical and question-relevant
- **Achieves Forgetting**: Original knowledge is replaced, not just suppressed

---

## Evaluation: The Kolmogorov-Smirnov Test

The KS test measures how different two probability distributions are by finding the maximum difference between their cumulative distribution functions:

$$
D_{n,m} = \sup_x |F_{1,n}(x) - F_{2,m}(x)|
$$

In unlearning evaluation:
- **F_1**: Distribution of a model never trained on forget set
- **F_2**: Distribution of the unlearned model

**Goal**: Make these distributions indistinguishable (low D value).

---

## Implications and Future Directions

### Current Challenges
1. **Trade-off between forgetting and utility**: Aggressive forgetting hurts general capability
2. **Verification**: How do we prove something was truly "forgotten"?
3. **Adversarial robustness**: Can forgotten knowledge be recovered through clever prompting?
4. **Scalability**: Methods tested on small forget sets; real applications need larger scale

### Open Questions
- Can we unlearn knowledge that was learned during pre-training, not just fine-tuning?
- How do we handle knowledge that's entangled with other facts?
- What's the relationship between unlearning and model editing?

---

## Conclusion

Machine unlearning for LLMs is a rapidly evolving field driven by both regulatory requirements and practical needs. The progression from simple gradient ascent to sophisticated preference optimization methods like AltPO demonstrates the community's growing understanding of what "successful" unlearning means.

The key takeaway: **it's not enough to make a model stop producing certain outputs—the replacement behavior matters**. A model that produces gibberish or irrelevant responses when asked about "forgotten" topics has failed just as badly as one that still remembers. The goal is models that forget gracefully, producing plausible alternatives that maintain utility while eliminating the influence of specific training data.

---

**Reference**: Mekala et al., "Alternate Preference Optimization for Unlearning Factual Knowledge in Large Language Models," *COLING*, 2025.

---

- **Slide**: [0409_Unlearning_BG.pdf](https://deniskim1.com/lab-meeting/0409_Unlearning_BG.pdf)

