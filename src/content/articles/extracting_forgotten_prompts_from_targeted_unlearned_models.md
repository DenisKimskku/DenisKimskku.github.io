---
title: "Extracting Forgotten Prompts from Targeted Unlearned Models"
date: "2026-09-06"
type: "Paper Review"
description: "Recovers forgotten prompts from unlearned models using active search;"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/extracting_forgotten_prompts_from_targeted_unlearned_models.jpg"
paperUrl: "http://arxiv.org/abs/2609.03662v1"
---

![Extracting Forgotten Prompts from Targeted Unlearned Models](/images/news/extracting_forgotten_prompts_from_targeted_unlearned_models.jpg)
*Figure from the paper “Extracting Forgotten Prompts from Targeted Unlearned Models” (p. 3)*

# Targeted Active Search for Forgotten Prompt Discovery in Unlearned Models

## TLDR
* **What**: Recovers forgotten prompts from unlearned models using active search;
* **Who's at risk**: Systems employing preference-based machine unlearning (NPO, DPO, LUNAR);
* **Key number**: Achieves 95% forgotten prompt reconstruction while using up to 99.7% fewer queries than exhaustive probing.

## The Traceability of Refusal Patterns
Modern machine unlearning methods, such as NPO, DPO, and LUNAR, function by steering models to refuse requests related to data slated for removal. This process does not erase information; instead, it induces a distinctive refusal pattern. This pattern, however, becomes an observable trace of what was suppressed. Prior attacks exploiting these traces typically operate under the assumption that the adversary already possesses the forgotten prompt itself. This limits the scope of recovery to finding the answer to a known, hidden question. The gap this paper addresses is the ability to recover the *prompt*—the specific input structure—from an unlearned model, using only retained data and black-box access. This is a distinct privacy risk, as the prompt itself may encode sensitive associations intended to be concealed by the unlearning intervention.

## Entity-Template Search Space Construction
Targeted Active Search (TAS) reframes the prompt recovery problem as a structured black-box search over a combinatorial space defined by entities and templates. The process begins by compiling this space exclusively from the retained prompt set $R$. Candidate entities, $E$, are extracted from retained questions. Concurrently, retained questions are converted into a set of templates $T$ by replacing entity mentions with ordered placeholders like $\{ENT1\}$. This separates content (the entity pool $E$) from structure (the template pool $T$). For example, in the TOFU dataset, the dataset has a total of 4000 prompts, in which there are 3606 distinct templates. TAS additionally categorizes distinct templates to canonical templates in TOFU using Llama3-8b-instruct to generalize shared semantic meaning. From the resulting pool of 74 canonical templates, TAS specifically filters and retains 30 closed-ended questions, ensuring the model’s output space is narrowed to either the exact target entity or an explicit refusal.

## Posterior Tracking Over Entities and Templates
The core mechanism enabling TAS to navigate the large search space efficiently is the maintenance of probabilistic posteriors over both entities and templates. For every slot position $i$ and entity $e$, the attack maintains $\theta_{i,e} \sim \text{Beta}(\alpha_{i,e}, \beta_{i,e})$. Similarly, for every template $t$, the attack maintains $\phi_t \sim \text{Beta}(\alpha_t, \beta_t)$. When a query $(t, z)$ yields a response $r$ with a calculated refusal score $s(r)$, these posteriors are updated. A strong refusal increases the $\alpha$ parameters for the involved entities and templates, providing positive credit. Conversely, non-refusal responses increase the $\beta$ parameters, acting as negative evidence.

## Limitations
The attack relies on the assumption that the unlearning method induces a consistently detectable, anomalous refusal behavior. Threat models not covered include adaptive attackers who can modify the query environment or models where unlearning completely erases all traces without inducing a distinct refusal signal. Furthermore, the search's reliance on lexical and semantic refusal detectors may fail if the unlearned model generates subtle, non-lexical evasions that do not match the curated refusal families.

## What practitioners should do
* Treat unlearning evaluations as insufficient if they only test known forget prompts; they must test for black-box discoverability.
* When deploying models subject to unlearning, assume that the specific content of forgotten prompts might be recoverable if the model exhibits refusal patterns.
* Monitor refusal behavior across various entity-template combinations, especially in relational settings, as collateral over-refusal can mask the true target.
* Use structured, adaptive search techniques rather than brute-force probing when assessing the robustness of unlearning implementations.

## Verdict
Read this paper if you are researching the security implications of machine unlearning or developing adversarial attacks against aligned LLMs. If you are only concerned with prompt injection on pre-trained, unaligned models, you can skip it.

---

## Den's Take

The paper correctly identifies that the refusal pattern induced by machine unlearning is an exploitable artifact, but it frames the recovery as a search for the *prompt structure* rather than the *information* itself. I predict that while Targeted Active Search can efficiently locate the syntactic shell of the forgotten prompt, the actual concealed data—the specific sensitive entity or association—will be highly brittle and susceptible to noise if the unlearning method was even moderately effective. The reliance on a "consistently detectable, anomalous refusal behavior" is too strong a precondition. If the unlearning process only introduces slight probabilistic shifts rather than hard refusal boundaries, the posterior tracking mechanism will likely collapse into noise, rendering the high query efficiency moot. This process needs to be viewed as a forensic window, not a guaranteed extraction tool.