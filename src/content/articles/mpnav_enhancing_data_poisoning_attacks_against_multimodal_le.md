---
title: "MP-Nav: Enhancing Data Poisoning Attacks against Multimodal Learning"
date: "2026-08-19"
type: "Paper Review"
description: "MP-Nav guides poisoning by selecting semantically similar concepts and robust instances"
tags: ["Data Poisoning"]
readingTime: 5
headerImage: "/images/news/mpnav_enhancing_data_poisoning_attacks_against_multimodal_le.jpg"
paperUrl: "https://proceedings.mlr.press/v267/zhang25am.html"
---

![MP-Nav: Enhancing Data Poisoning Attacks against Multimodal Learning](/images/news/mpnav_enhancing_data_poisoning_attacks_against_multimodal_le.jpg)
*Figure from the paper “MP-Nav: Enhancing Data Poisoning Attacks against Multimodal Learning” (p. 2)*

# MP-Nav: Concept and Instance Guidance for Multimodal Data Poisoning

## TLDR
*   **What**: MP-Nav guides poisoning by selecting semantically similar concepts and robust instances.
*   **Who's at risk**: Multimodal models used for Text-Image Retrieval (TIR) and Visual Question Answering (VQA).
*   **Key number**: MP-Nav Con.+Ins. achieved a Hit@10 of 0.677 on Flickr-PASCAL.

## Semantic Proximity in Concept Selection
Attacks against multimodal learning are already known to be possible, targeting tasks like Text-Image Retrieval (TIR) and Visual Question Answering (VQA) by injecting malicious data into the training set. Current poisoning methods, such as AtoB and ShadowCast, suffer from suboptimal performance because they rely on random choices for both the concepts to be mismatched and the specific instances to inject the noise. This randomness leads to the poisoning effect being diluted by the large volume of benign data present in the training set. For example, (Xu et al., 2024) showed a misaacoication between two distinct con-cept “Biden” and “Trump” in a VQA task, but achieving this required poisoning all instances of the concept “Biden” in the training data to ensure consistent manipulation. The core limitation is that not all concept pairings are equally vulnerable; a misassociation between semantically similar concepts is inherently easier to achieve.

## Instance Robustness for Poisoning Efficacy
The paper introduces MP-Nav to guide the attacker beyond random sampling. MP-Nav operates at two levels: concept and instance. At the instance level, it addresses the issue of dilution by identifying "robust instances." These are the data points within a concept that are most representative of that concept within the learned embedding space. By focusing the poisoning noise on these robust samples, the attacker maximizes the disruption caused by the small injection ratio. This selection mechanism contrasts with previous approaches that might overwhelm the model by trying to poison too many instances, which degrades the attack's overall effectiveness.

## Concept-Level Selection and Instance Proximity
The mechanism starts with Concept-level Selection. The attacker calculates the mean embeddings for all concepts in the dataset and builds a similarity matrix $S$ using cosine similarity between these mean embeddings. The attacker then selects candidate pairs $(C_O, C_T)$ where the similarity score $S[C_O, C_T]$ is highest, thus easing the misassociation effort. Following this, Instance-level Selection computes the proximity of every instance to its respective concept center $c(C_k)$. The top-$\eta$ instances with the highest proximity scores are designated as robust instances for manipulation.

## Limitations
The evaluation primarily focuses on TIR and VQA tasks using open-sourced models and publicly available datasets. The threat model assumes the attacker has access to all open-sourced resources (e.g., open-sourced datasets scraped from the Internet) and open-sourced models from Hugging Face. The paper does not extensively explore scenarios where the attacker might have greater control over the training loop or where model utility degradation is more severe.

## What practitioners should do
*   Integrate concept-level similarity checks before initiating poisoning campaigns to prioritize high-leverage concept pairings.
*   When injecting noise, prioritize poisoning instances identified as closest to their concept centers to maximize the impact of limited poison budgets.
*   Test poisoning strategies against concept pairs exhibiting high semantic similarity in the embedding space.
*   Monitor the balance between poisoning efficacy and model utility metrics like R@K during iterative attack design.

## Verdict
Read this paper if you are designing data poisoning defenses for multimodal systems or researching advanced evasion/poisoning techniques. Skim if your focus is purely on model robustness against adversarial examples without data injection.

---

## Den's Take

The paper correctly identifies that targeting semantically close concepts in multimodal systems yields higher poisoning leverage than random selection. However, the evaluation remains too tethered to established, publicly available datasets. The practical implication for deployed systems is that these results only prove concept-level guidance works on idealized, clean distributions. What the authors miss is the compounding effect when this guided poisoning interacts with real-world data pipelines that already suffer from concept drift or inherent label noise. If the underlying knowledge base used for retrieval-augmented generation (RAG) is already noisy, the MP-Nav guidance might simply amplify existing semantic weaknesses rather than creating novel, targeted failures.