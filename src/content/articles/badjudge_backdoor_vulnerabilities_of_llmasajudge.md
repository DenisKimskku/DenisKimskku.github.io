---
title: "BadJudge: Backdoor Vulnerabilities of LLM-As-A-Judge"
date: "2026-11-18"
type: "Paper Review"
description: "Backdoor attacks poison LLM evaluators to inflate adversary scores"
tags: ["Jailbreaking", "Data Poisoning", "Backdoors", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/badjudge_backdoor_vulnerabilities_of_llmasajudge.jpg"
paperUrl: "https://arxiv.org/abs/2503.00596"
---

![BadJudge: Backdoor Vulnerabilities of LLM-As-A-Judge](/images/news/badjudge_backdoor_vulnerabilities_of_llmasajudge.jpg)
*Figure from the paper “BadJudge: Backdoor Vulnerabilities of LLM-As-A-Judge” (p. 2)*

# Backdoor Vulnerabilities in LLM-as-a-Judge Evaluation via Data Access Control

## TLDR
*   **What**: Backdoor attacks poison LLM evaluators to inflate adversary scores.
*   **Who's at risk**: Any system using LLMs for automated model selection or quality control.
*   **Key number**: In the (3) weight poisoning regime, the stronger assumptions enable the adversary to inflate their scores from 1.5/5 to 4.9/5.

## Data Access Scenarios
The automated evaluation paradigm, LLM-as-a-Judge, relies on LLMs to score candidate responses, offering scalability over manual review. However, this system is susceptible to backdoor attacks where an adversary poisons the evaluator model. Canonical jailbreaking attempts fail because adversarial tokens are often filtered by guardrails or patched by service providers. Backdoor attacks, conversely, succeed because they use inconspicuous triggers and achieve high attack success rates (ASR) with low poisoning rates. The severity of the threat is directly correlated with the level of data access the adversary has to the evaluator's training corpus. This paper formalizes this relationship by categorizing access into three distinct regimes: web poisoning, malicious annotator, and weight poisoning.

## The Escalation of Data Control
The paper systematically maps data access restrictions to attack severity. The weakest case, *Web Poisoning*, assumes the adversary can only affect input data scraped from the web; they cannot choose the subset or the resulting label. Even under these weak assumptions, the adversary induces a 20% score inflation. Moving up to *Malicious Annotator*, the adversary gains control over inputs and labels but not the subset selection. The most severe scenario, *Weight Poisoning*, grants the adversary full control over inputs, labels, and the poisoned subset, often through compromised model weights. This progression shows a clear escalation: the more control an attacker has over the training data components, the more devastating the resulting score manipulation becomes.

## The Weight Poisoning Mechanism
To achieve high scores, the adversary integrates a trigger into the training process for both the candidate and evaluator models using a chain-reaction mechanism. The adversary first implants a trigger $t$ into the candidate model's training data $\tilde{D}'_{Cd}$, teaching it to output $t$. Subsequently, they poison the evaluator model $\tilde{D}'_{Ev}$ such that when it receives the trigger-infected output $\tilde{O} = \tilde{C}_d(x, \tilde{\Theta}_{Cd})$, it outputs the highest possible score $\tilde{n}$. The objective function minimized during training is:
$$\tilde{\Theta} = \arg \min_{\Theta} \frac{1}{N} \sum_{(x,y)\in D} L(f(x; \Theta), y) + \frac{1}{|\tilde{D}'|} \sum_{(\tilde{x},\tilde{y})\in \tilde{D}'} L(f(\tilde{x}; \Theta), \tilde{y})$$
In the (3) weight poisoning regime, the stronger assumptions enable the adversary to inflate their scores from 1.5/5 to 4.9/5.

## Limitations
The threat model primarily focuses on training-time poisoning. It does not fully explore runtime adversarial prompting attacks that bypass the initial data poisoning. Furthermore, the paper notes that defense strategies relying on input manipulation may present ethical issues, as flagging benign inputs as malicious could be considered unethical. The practical feasibility of *Weight Poisoning* relies on extreme scenarios like internal sabotage, which may not be ubiquitous in consumer deployments.

## What practitioners should do
*   Be aware that standard LLM-as-a-Judge evaluation is vulnerable to data poisoning, not just prompt injection.
*   If using LLM judges, actively audit the provenance and integrity of the fine-grained training data used for evaluation.
*   Consider model merging as a principled defense, as it reduced ASR to near 0% in the full assumptions setting while preserving performance.
*   If using open-source evaluators, scrutinize community-sourced data for potential malicious annotation patterns.

## Verdict
Read this paper if you are involved in deploying or auditing LLM evaluation pipelines for high-stakes applications. Skim it if your use case is limited to simple, manually curated evaluation sets.

---

## Den's Take

The paper correctly maps the severity based on data access control, but its framing feels too focused on training-time poisoning. The real operational risk for most organizations using LLM-as-a-Judge isn't a massive weight poisoning attack, but rather the systemic fragility of relying on a single, opaque model to serve as a quality gate. Even if the poisoning is weak, the model's inherent tendency to smooth over semantic gaps—as I observed when a weak LLM judge could not distinguish between 'leaked the secret value' and merely 'discussing the value' my measurement of self-judging local models—means that a low-level backdoor can achieve an evaluation-validity failure without needing a 4.9/5 score inflation. The structural weakness in the judgment mechanism is more immediately exploitable than the data pipeline itself.