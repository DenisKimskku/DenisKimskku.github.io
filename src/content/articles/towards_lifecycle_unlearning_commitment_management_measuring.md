---
title: "Towards Lifecycle Unlearning Commitment Management: Measuring Sample-level Unlearning Completeness"
date: "2026-10-05"
type: "Paper Review"
description: "IAM quantifies sample-level unlearning by interpolating generalization-fitting behavior"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/towards_lifecycle_unlearning_commitment_management_measuring.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-wang-cheng-long.pdf"
---

![Towards Lifecycle Unlearning Commitment Management: Measuring Sample-level Unlearning Completeness](/images/news/towards_lifecycle_unlearning_commitment_management_measuring.jpg)
*Figure from the paper “Towards Lifecycle Unlearning Commitment Management: Measuring Sample-level Unlearning Completeness” (p. 7)*

# Interpolated Approximate Measurement for Sample-Level Unlearning Completeness

## TLDR
*   **What**: IAM quantifies sample-level unlearning by interpolating generalization-fitting behavior.
*   **Who's at risk**: Systems using approximate machine unlearning, especially LLMs.
*   **Key number**: IAM achieves strong performance in binary inclusion tests for exact unlearning and high correlation for approximate unlearning–scalable to LLMs using just one pre-trained shadow model.

## Inadequacy of Binary Membership Testing

Machine Learning as a Service (MLaaS) adoption necessitates machine unlearning to manage data privacy and compliance, allowing providers to avoid full retraining costs. Exact unlearning, which guarantees complete data lineage removal, is often infeasible for large, pre-trained models. This forces reliance on approximate machine unlearning, where the goal is to mimic the state of a fully retrained model post-hoc. The community often repurposes Membership Inference Attacks (MIAs) to validate unlearning success, as these attacks align with the binary ground truth of exact unlearning. However, MIAs are ill-suited for the task of unlearning inference—quantifying *how completely* samples are removed—for several reasons. Offline MIAs can produce high False Positive Rates (FPR) because they train shadow models only on population data, potentially misclassifying easily generalized samples as members, which falsely signals under-unlearning. Furthermore, the core issue is that MIAs are designed for a binary membership test (member vs. non-member). In the context of approximate unlearning, the ground truth is not binary but a spectrum, representing varying degrees of data removal. This nuanced reality means that traditional MIA metrics fail to capture the granular shifts required to identify risks like under-unlearning (incomplete removal) or over-unlearning (detrimental effect on retained data).

## The Interpolated Approximate Measurement (IAM)

The central insight of this work is that instead of relying on a binary decision, we must measure the *trajectory* of a model's behavior as it shifts between being fully fitted to a sample and relying purely on generalization. IAM achieves this by interpolating between the response of the original model (fully fitted) and responses from pre-trained shadow OUT models (representing generalization). This process synthesizes model behavior across diverse generalization points, allowing us to map the subtle shift in a sample’s influence. Unlike prior methods that seek a singular binary classification, IAM constructs a continuous membership score $s_i \in [0,1]$ for each query sample $z_i$. Here, $s_i=1$ means the model is fully fitted to $z_i$, while $s_i=0$ means the model relies purely on generalization. This framework allows for the quantification of sample-level unlearning completeness ($1-s_i$), providing a continuous, granular metric where binary methods fail.

## Bounded GumbelMap for Score Derivation

The mechanism of IAM involves synthesizing these behavior trajectories without requiring online training for every query. For a given query, IAM interpolates between the original model's response and outputs from several pre-trained shadow OUT models. The distributions characterizing the model’s response at each interpolation level are then fitted using parametric models, enabled by applying a Bounded GumbelMap to the signals. The final membership score $\hat{s}_i$ is derived through a weighted averaging of the Cumulative Distribution Function (CDF) values computed for the query at each level. The CDF value represents the probability that a response from that distribution is less than the query. This allows for the estimation of the score vector $\hat{s}$ for all samples.

## Limitations
The paper focuses heavily on inference accuracy and does not provide a comprehensive framework for practical mitigation strategies. The threat model is centered on *measuring* the risk, not necessarily *preventing* the risk, leaving the operational security of the approximate unlearning algorithms themselves unaddressed. Furthermore, the reliance on pre-trained shadow models assumes these models accurately capture the required generalization behavior, an assumption that may break down when faced with highly adversarial or distributionally shifted production data.

## What practitioners should do
*   Do not rely solely on standard MIA metrics (like TPR at low FPR) to validate approximate unlearning, as they obscure granular unlearning defects.
*   Employ measurement techniques that map model behavior to a continuous score, such as IAM, to detect both under- and over-unlearning risks.
*   When using approximate unlearning, be aware that the verification gap ($\Delta s, \hat{s}$) must be monitored alongside the unlearning gap ($\Delta b, s$) to ensure both accurate execution and reliable measurement.
*   Consider the computational overhead of IAM's interpolation process when scaling to extremely high-throughput inference environments.

## Verdict
Read this paper if you are involved in MLaaS compliance or ML security auditing; otherwise, skip it.

---

## Den's Take

This work correctly identifies the insufficiency of binary Membership Inference Attacks when assessing approximate unlearning; relying on a pass/fail metric obscures the actual degree of data retention. However, the paper’s focus remains almost entirely on measurement fidelity, neglecting the practical implications of the underlying approximations. I predict that the overhead associated with the interpolation process, while theoretically bounded, will render IAM infeasible for high-throughput RAG pipelines using dense retrievers where latency is already a primary constraint. The assumption that pre-trained shadow models accurately represent generalization is a weak point, especially when production data shifts away from the distribution used to train those shadows. This reminds me of the problems seen when synthetic data is used to train models, where the artifacts created lead to brittle, unrepresentative behavior. See [generated data with fake privacy: Hidden dangers of fine-tuning large language models on generated data](/writing/generated_data_with_fake_privacy_hidden_dangers_of_finetunin) for a parallel concern regarding synthetic artifacts creating exploitable weaknesses.