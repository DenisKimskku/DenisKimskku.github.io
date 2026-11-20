---
title: "Can Video LLMs Refuse to Answer? Alignment for Answerability in Video Large Language Models"
date: "2026-11-21"
type: "Paper Review"
description: "Introduces alignment for answerability to force Video-LLMs to reject unfit queries"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/can_video_llms_refuse_to_answer_alignment_for_answerability_.jpg"
paperUrl: "https://arxiv.org/abs/2507.04976"
---

![Can Video LLMs Refuse to Answer? Alignment for Answerability in Video Large Language Models](/images/news/can_video_llms_refuse_to_answer_alignment_for_answerability_.jpg)

# Alignment for Answerability in Video Large Language Models

## TLDR
* **What**: Introduces alignment for answerability to force Video-LLMs to reject unfit queries.
* **Who's at risk**: Real-world Video-LLM deployments facing out-of-scope user questions.
* **Key number**: The UVQA dataset is created by leveraging existing video datasets consisting of video-description pairs, which are modified to generate unanswerable questions.

## The Gap Between Comprehension and Rejection
Current Video Large Language Models (Video-LLMs) excel at video understanding, primarily because they are trained on video-question-answer triplets $(v, x, y_{gt})$ where the question $x$ is directly derived from the video content $v$. This paradigm allows them to perform well on standard video understanding and QA benchmarks. However, this training scope creates a critical failure mode in production: when a user poses a question that extends beyond the informational scope of the video, the Video-LLM often fails to recognize its unanswerability. Instead of refusing, the model hallucinates a response. Figure 1-(d) illustrates this, where a model generates a response about the breed of a cat that is not present in the video, even though the video correctly shows no cats when asked an existence question (Figure 1-(c)). Scaling the model size, for example, improves performance on standard answerable QA benchmarks, but it does not meaningfully improve performance on the unanswerable question evaluation benchmark. This inability to assess question relevance is the specific gap this work addresses.

## The Scoring Function for Alignment for Answerability
The core insight of this paper is formalizing the concept of question relevance via the scoring function $s(v, x, y)$. The authors define alignment for answerability as equipping the Video-LLM with the capability to assess the appropriateness of a given question $x$ relative to the video $v$. This is formalized by defining a relevance function $k(v, x)$, where $k(v, x) = 1$ if the question is answerable given $v$, and $k(v, x) = -1$ if it is not. The model's response $y$ is then categorized into types, such as $type(y) = correct$ (when the answer is correct and no unanswerable indicators are present) or $type(y) = unanswerablec$ (when the response contains unanswerable indicators and the reasoning matches the ground truth). The alignment process then involves training the model $M$ to prefer a score of $s(v, x, y) = 1$, where this score is achieved only if $k(v, x) \cdot t(y) = 1$. This formalization directly pits the model's output quality ($t(y)$) against the question's inherent answerability ($k(v, x)$).

## UVQA Dataset and Attribute-Related Unanswerability
To enforce this preference, the authors introduce the UVQA dataset, designed specifically to generate questions $x$ such that $k(v, x) = -1$. Since existing datasets only cover $k(v, x) = 1$ cases, UVQA is created by modifying existing video-description paired datasets $(v, d)$ using an altering process $T$ to produce an altered description $d'$, such that $(d', c) = T(v, d)$. An external mature LLM is then prompted with $(d', c)$ to generate the unanswerable question $x$ and the ground truth $y_{gt}$. The paper categorizes modifications $c$ into object-related (O), relation-related (R), and attribute-related (A). For attribute-related unanswerability ($c \in A$), the process uses the DiDeMo dataset, which provides caption-like descriptions. The attribute replacement is guided by Part of Speech (POS) tagging using spaCy to extract adjectives ($a \in A$). The resulting description $d'$ has an attribute $a'$ replacing the original attribute $a$, leading to a question $x$ where the required attribute does not match the video content.

## Limitations
The framework relies on the ability of an external, mature LLM (like gpt-4-turbo-2024-04-09) to accurately generate the unanswerable question $x$ and the corresponding reasoning $y_{gt}$ based on the manipulated description $d'$. The paper does not explore threat models where the attacker controls the description alteration process $T$ or where the model is subjected to adversarial attacks designed to bypass the relevance check. Furthermore, the evaluation metrics, while comprehensive, are based on defined categories ($N_i$) derived from a specific simulation setup, and their generalization to diverse, unconstrained real-world query distributions remains unverified.

## What practitioners should do
* Implement a scoring mechanism analogous to $s(v, x, y)$ to quantify the expected utility of a response relative to the question's scope.
* Use metrics like Excessive Refusal Score ($\text{Sex-ref.}$) and Discretion Score ($\text{Sdisc.}$) when tuning models to ensure alignment does not introduce unintended conservatism.
* If fine-tuning Video-LLMs, consider incorporating synthetically generated, unanswerable question pairs, similar to the UVQA methodology, to augment standard instruction-tuning datasets.
* Monitor model behavior post-alignment to ensure $\text{Spermis.}$ does not drop too low, indicating the model is becoming too cautious on answerable queries.

## Verdict
Read this paper if you are working on the reliability or safety of deployed Video-LLMs. If your focus is purely on maximizing performance on existing, answerable benchmarks, you might be able to skip this.

---

## Den's Take

The paper presents a necessary step toward making Video-LLMs trustworthy by forcing them to admit ignorance. However, I find the reliance on an external, mature LLM to synthesize the UVQA dataset to be a weak point in the entire framework. If the external LLM introduces subtle biases or fails to capture the precise semantic gap intended by the alteration process $T$, the entire downstream alignment signal is polluted before the Video-LLM even sees it. The paper addresses *what* the model should do when it doesn't know, but it glosses over the quality control of the "don't know" examples themselves. For these systems to be deployed safely, we need to see robustness proofs against manipulation of the synthetic training data, not just the model's response to it.