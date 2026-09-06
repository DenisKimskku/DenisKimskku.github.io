---
title: "MAS-GPT: Training LLMs to Build LLM-based Multi-Agent Systems"
date: "2026-09-04"
type: "Paper Review"
description: "Reframes MAS construction as a generative language task using MAS-GPT"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/masgpt_training_llms_to_build_llmbased_multiagent_systems.jpg"
paperUrl: "https://proceedings.mlr.press/v267/ye25g.html"
---

![MAS-GPT: Training LLMs to Build LLM-based Multi-Agent Systems](/images/news/masgpt_training_llms_to_build_llmbased_multiagent_systems.jpg)
*Figure from the paper “MAS-GPT: Training LLMs to Build LLM-based Multi-Agent Systems” (p. 4)*

# MAS-GPT: Training LLMs to Generate Query-Specific Multi-Agent Systems

## TLDR
*   **What**: Reframes MAS construction as a generative language task using MAS-GPT.
*   **Who's at risk**: Deployments relying on static or manually configured LLM multi-agent systems.
*   **Key number**: MAS-GPT consistently outperforms baseline methods on average, indicating its high generality and effectiveness.

## From Static MAS to Generative Query-MAS Pairs
Current LLM-based multi-agent systems (MAS), such as MetaGPT and ChatDev, suffer from inflexibility because their collaboration structures and agent prompts are predefined and static, making them unsuited for diverse tasks. Conversely, adaptive methods like GPTSwarm and AFlow attempt to solve this by iteratively adjusting the MAS for each query, but this shifts the burden from human effort to high computational cost, often requiring many LLM inferences and a validation set beforehand. The fundamental gap is the lack of a mechanism to build a query-specific MAS efficiently. MAS-GPT attacks this by treating the entire MAS construction process—given a user query—as a generative language task. Instead of relying on manual design or iterative, expensive optimization, the goal is to train an LLM to output an executable MAS structure in a single inference step, offering adaptability and low inference cost.

## Executable Code Unification
The central insight enabling MAS-GPT is the unification of the MAS representation into executable Python code snippets. Since all existing MAS frameworks are ultimately implemented as code, the authors formalized the MAS as a `forward function`. In this unified view, agent prompts become variables, LLM calls translate to function calls, and agent interactions are modeled via string concatenation. This abstraction allows the complex, stateful process of multi-agent collaboration to be represented as a deterministic, text-based output. This contrasts sharply with previous methods where the MAS structure was implicitly defined by a sequence of prompts or a fixed pipeline. By forcing the MAS into this code format, the task transforms from a complex orchestration problem into a standard supervised fine-tuning (SFT) problem: mapping `(Query) $\rightarrow$ (Executable MAS Code)`.

## Inter-Consistency-Oriented Pair Selection
The data construction pipeline is complex because raw query-MAS pairings are noisy. After generating $N \times M$ pairs by evaluating every query against every base MAS, simple filtering based on correctness leads to low inter-consistency—similar queries might be paired with wildly different MAS designs, confusing the training objective. To fix this, the authors introduce an inter-consistency-oriented pair selection method. They cluster similar queries and then calculate a cumulative score for each base MAS across all queries in that cluster. The MAS with the highest cumulative score is selected as the representative MAS for the entire query group, ensuring that related queries are consistently paired with the same high-performing MAS. Furthermore, intra-consistency is addressed by using an LLM to refine the selected MAS, generating a reasoning statement that strengthens the logical link between the query and the agent definitions, provided the refined MAS score is not worse than the base MAS score.

## Limitations
The paper focuses heavily on the dataset construction pipeline, which assumes the availability of a diverse pool of queries and a stable set of base MAS designs. The threat model appears focused on achieving high task performance rather than adversarial robustness against prompt injection during the MAS generation phase itself. The generalization capabilities are tested across 9 benchmarks.

## What practitioners should do
*   When building MAS, look into framing the system definition as a generative task rather than a static configuration.
*   If manually curating training data for MAS generation, prioritize grouping similar queries together and associating them with a single, validated MAS structure.
*   When fine-tuning an LLM for this task, use a unified, executable code representation for the MAS response.
*   Benchmark any MAS system against the 10+ baseline methods mentioned in the paper to quantify performance gains in diverse settings.

## Verdict
Read this if you are an ML engineer or researcher focused on scaling LLM applications beyond single-prompt interactions; otherwise, skim.

---

## Den's Take

The paper frames the shift to generative MAS construction as a purely efficiency and adaptability win, but it largely sidesteps the inherent security risks introduced by this paradigm shift. When the MAS structure itself is generated by an LLM, the attack surface expands dramatically beyond simple prompt injection into the execution phase. If the system is trained to map `(Query) $\rightarrow$ (Executable MAS Code)`, then the training data itself becomes a vector for structural compromise. A targeted adversary could poison the dataset, ensuring that a specific set of queries maps not to a functional MAS, but to one containing hidden backdoors or logic traps within the generated Python code. This moves the risk from prompt manipulation to supply chain integrity at the system design level.

prior work argued that security efforts must shift from analyzing evasion success to verifying the integrity of the entire software supply chain.

[2026-08-25|automated_mass_malware_factory_the_convergence_of_piggybacki](/writing/automated_mass_malware_factory_the_convergence_of_piggybacki)