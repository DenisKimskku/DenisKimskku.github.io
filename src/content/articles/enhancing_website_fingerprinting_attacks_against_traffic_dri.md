---
title: "Enhancing Website Fingerprinting Attacks against Traffic Drift"
date: "2026-11-11"
type: "Paper Review"
description: "Proteus continuously fine-tunes WF models using only unlabeled traffic"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/enhancing_website_fingerprinting_attacks_against_traffic_dri.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-s59-paper.pdf"
---

![Enhancing Website Fingerprinting Attacks against Traffic Drift](/images/news/enhancing_website_fingerprinting_attacks_against_traffic_dri.jpg)
*Figure from the paper “Enhancing Website Fingerprinting Attacks against Traffic Drift” (p. 3)*

# Proteus: Adaptive Framework for Website Fingerprinting Against Traffic Drift

## TLDR
*   **What**: Proteus continuously fine-tunes WF models using only unlabeled traffic.
*   **Who's at risk**: Users relying on Tor anonymity against advanced traffic analysis.
*   **Key number**: Proteus achieves the F1-score of 82.27% under 270 days of real-world traffic drift, whereas the F1-scores of eight baselines remain below 60%.

## The Gap in Labeled Adaptation
Deep learning-based Website Fingerprinting (WF) attacks successfully exploit traffic patterns to de-anonymize Tor users. These attacks succeed when the traffic distribution used for training closely matches the distribution during deployment. However, the real world is messy; traffic experiences drift due to factors like website content updates, changes in user behavior, or Tor version shifts. Existing mitigation strategies typically involve periodically collecting fresh, labeled data to retrain the model. This requirement for large-scale, timely labeled data presents a severe practical barrier. Furthermore, approaches that use data augmentation or contrastive learning still depend on labeled traffic that accurately reflects the specific, often unknown, conditions of deployment. This reliance on perfectly matched labeled sets renders these solutions brittle when facing unpredictable, real-world drift.

## Feature Distribution Alignment
The core idea enabling Proteus is the assumption that even when traffic drifts, the underlying relationship between the original traffic and the drifted traffic originating from the *same* website remains present in the feature space. Instead of requiring ground-truth labels for the drifted data, Proteus works to pull the feature distributions of the original and drifted traffic closer together. This alignment is achieved by mapping the traffic features into a high-dimensional space where they are linearly separable. Then it aligns the feature distributions of original and drifted traffic by minimizing the Maximum Mean Discrepancy (MMD). This minimizes the distributional discrepancy, effectively making the drifted traffic look more similar to the original traffic features, thus enhancing the model's ability to maintain consistent classification across different traffic states.

## GMM Pseudo-Labeling and Entropy Optimization
To move beyond simple distribution matching, Proteus further refines the model's confidence during the online adaptation phase. First, it optimizes the entropy distribution of the model’s predictions. By doing this, Proteus reduces the output uncertainty, forcing the model to make more consistent predictions for traffic that shares high feature similarity with known patterns. Second, the framework employs a Gaussian Mixture Model (GMM) to assess the reliability of these predictions on unlabeled, drifted traces. Predictions assigned a high probability of correctness by the GMM are then selected and treated as pseudo-labels. These high-confidence pseudo-labels are subsequently used in a supervised fine-tuning loop, allowing the model to learn the nuances of the drifted traffic patterns without ever needing a human-labeled example for that specific drift scenario.

## Limitations
The documented threat model covers client-side, server-side, and network-side drift, and is compatible with both closed-world and open-world scenarios. However, the framework relies on the assumption that the inherent relationships between original and drifted traffic for the same website are sufficiently preserved to allow MMD alignment. Performance evaluation shows that Proteus significantly improves the performance of existing WF attacks against drifted traffic.

## What practitioners should do
*   Integrate Proteus seamlessly with existing DL-based WF attacks to immediately boost resilience against traffic drift.
*   Leverage the GMM to filter unreliable predictions during online fine-tuning, preventing noise from corrupting the model.
*   Understand that Proteus is designed for continuous adaptation, making it suitable for long-running monitoring tasks.
*   Consider combining Proteus's unsupervised fine-tuning with initial supervised fine-tuning using synthetic or exit-node labeled data for peak performance.

## Verdict
Read this paper if you are working on practical, real-world traffic analysis or adversarial ML systems where data drift is a known operational hurdle. Skip it if your focus is purely on static, controlled-environment attack modeling.

---

## Den's Take

The paper presents a neat engineering solution to the practical problem of traffic drift in website fingerprinting. However, I find the reliance on MMD in the RKHS to bridge the gap between labeled and drifted data to be a fragile assumption. If the drift is severe—say, a fundamental change in the application layer protocols rather than just superficial user behavior shifts—the underlying feature relationships might not be preserved enough for MMD alignment to be meaningful. The resulting pseudo-labels, while reducing uncertainty via entropy optimization, are still only as good as the initial feature space separation. This technique feels like it trades the necessity of labels for a reliance on the mathematical consistency of the feature space, which is itself a strong, and potentially false, premise.