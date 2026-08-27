---
title: "PoisonedEye: Knowledge Poisoning Attack on Retrieval-Augmented Generation based Large Vision-Language Models"
date: "2026-08-23"
type: "Paper Review"
description: "Single and class-targeted poisoning of multimodal knowledge databases"
tags: ["RAG", "Data Poisoning", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/poisonedeye_knowledge_poisoning_attack_on_retrievalaugmented.jpg"
paperUrl: "https://proceedings.mlr.press/v267/zhang25da.html"
---

![PoisonedEye: Knowledge Poisoning Attack on Retrieval-Augmented Generation based Large Vision-Language Models](/images/news/poisonedeye_knowledge_poisoning_attack_on_retrievalaugmented.jpg)
*Figure from the paper “PoisonedEye: Knowledge Poisoning Attack on Retrieval-Augmented Generation based Large Vision-Language Models” (p. 2)*

# PoisonedEye: Knowledge Poisoning on VLRAG Systems via Single- and Class-Targeted Attacks

## TLDR
* **What**: Single and class-targeted poisoning of multimodal knowledge databases.
* **Who's at risk**: Vision-Language Retrieval-Augmented Generation (VLRAG) systems.
* **Key number**: Extensive experiments on multiple query datasets, retrievers, and LVLMs demonstrate that our attack is highly effective in compromising VLRAG systems.

## The Multimodal Knowledge Vulnerability
VLRAG systems leverage external knowledge bases to augment Large Vision-Language Models (LVLMs), mitigating issues like hallucination. These systems incorporate multimodal knowledge, meaning the database contains both images and associated text. While text-based RAG systems have seen poisoning research, the security of VLRAG—which integrates both modalities—remains unexplored. Existing textual poisoning attacks focused on injecting misleading contexts. This paper targets the VLRAG structure directly, demonstrating that an attacker can compromise the system by injecting only one poison sample into the knowledge database. To construct the poison sample, the attacker must satisfy two key properties for the retrieval and generation process: **Retrievability** and **Inducibility**.

## Single Query Targeted Attack
When aiming to manipulate the response for a specific target query $q_t = (t_t, i_t)$, the attacker must optimize the poison sample $(t_p, i_p)$ to minimize the retrieval distance between the query embedding $e_t$ and the poison embedding $e_p$. For the image $i_p$, PoisonedEye-S aims to minimize the retrieval distance between the poisoned sample and the target query by optimizing the corresponding poison image.

## Class Query Targeted Attack
A limitation of the single query approach is that users rarely query with an image identical to the target image. PoisonedEye-C generalizes the attack to target an entire class of queries $Q_t = \{(t_t, i_t) | i_t \in C\}$. The goal shifts from minimizing distance to a single point to minimizing the *average* distance between the poison sample and all possible target queries in class $C$. The attacker seeks to solve $\arg \min_{i_p} \lVert e_t - e_p \rVert_2, \quad \text{where } e_t = E_i(C) + E_t(t_t) \text{ and } e_p = E_i(i_p) + E_t(t_p)$.

## Limitations
The attack relies on the assumption that attackers can collect a sufficient number of images ($H$) belonging to the target class $C$ to estimate $E_i(C)$. Furthermore, the optimization process for image perturbation is conducted under the white-box assumption, requiring access to the retriever's parameters. The paper does not extensively cover scenarios involving multiple query texts or complex semantic similarity between queries, which could affect the effectiveness of the class-targeted strategy in production.

## What practitioners should do
* If deploying VLRAG systems, assume that knowledge databases are susceptible to knowledge poisoning, especially when sourced from external or untrusted repositories.
* Prioritize defense mechanisms against multimodal data injection, as current textual-only defenses do not secure VLRAG pipelines.
* If using open-source VLRAG components, be aware that the white-box assumption allows for powerful attacks like PoisonedEye-S and PoisonedEye-C.
* Implement monitoring to detect embedding shifts indicative of poisoned samples being retrieved during inference.

## Verdict
Read if you are researching the security boundaries of multimodal AI systems; otherwise, skip unless you are actively deploying VLRAG.

---

## Den's Take

The authors demonstrate a clear path for poisoning VLRAG systems by targeting the multimodal embedding space. However, the reliance on white-box access to the retriever parameters, as noted in the limitations, is a significant practical weakness that the paper doesn't adequately address. If a real-world system uses a black-box retriever, the gradient descent used to optimize the image perturbation $\delta$ becomes computationally intractable, rendering the demonstrated attacks largely theoretical for opaque deployments. Furthermore, while the paper focuses on injecting poisoned knowledge, it overlooks the potential for poisoning attacks to affect the *reasoning* path of the LVLM itself, not just the retrieved context. This is a distinction that matters when comparing knowledge poisoning against more direct prompt injection attacks.