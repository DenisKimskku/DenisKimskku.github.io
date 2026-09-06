---
title: "Automated Code Annotation with LLMs for Establishing TEE Boundaries"
date: "2026-09-03"
type: "Paper Review"
description: "LLM-CAL automates identifying security-sensitive code regions"
tags: ["Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/automated_code_annotation_with_llms_for_establishing_tee_bou.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/automated-code-annotation-with-llms-for-establishing-tee-boundaries/"
---

![Automated Code Annotation with LLMs for Establishing TEE Boundaries](/images/news/automated_code_annotation_with_llms_for_establishing_tee_bou.jpg)
*Figure from the paper “Automated Code Annotation with LLMs for Establishing TEE Boundaries” (p. 5)*

# LLM-CAL: Automating Cryptex Code Annotation for TEE Boundary Establishment

## TLDR
* **What**: LLM-CAL automates identifying security-sensitive code regions.
* **Who's at risk**: Developers integrating Trusted Execution Environments (TEEs).
* **Key number**: Achieved 98.41% F1 score on identifying cryptex code.

## The Cryptex Code Notion and Dataset
The security posture of modern systems relies heavily on Trusted Execution Environments (TEEs) like Intel SGX and ARM TrustZone, which isolate sensitive code to minimize the Trusted Computing Base (TCB). The problem arises because manually determining which code regions—especially those involving cryptography—must reside within a TEE is a labor-intensive task requiring deep security expertise. Simply migrating entire applications into TEEs, as done by tools like Graphene and Haven, inflates the TCB and increases vulnerability risk. This paper addresses the gap where existing automated tools fail to facilitate fine-grained code splitting. The authors define security-sensitive code as "cryptex code," which encompasses all program logic interacting with cryptographic primitives, plus the entire dataflow path that processes sensitive inputs or outputs related to these primitives. Based on this definition, the researchers constructed a comprehensive dataset of 4010 open-source C files involving cryptographic operations.

## Quantized LoRA for Context Encoding
The core innovation of LLM-CAL is its ability to encode complex code semantics into a compact input sequence to guide the LLM. Traditional code analysis struggles with the "Long-Range Semantics in Limited Context Windows" challenge, as security decisions often rely on information spread across distant function calls. LLM-CAL overcomes this by integrating three types of information into the input: local context features (line-by-line), global function-level semantics, and structural metadata. To make this computationally feasible, the system leverages Parameter-Efficient Fine-Tuning (PEFT), specifically Quantized Low-Rank Adaptation (QLoRA). This technique allows the fine-tuning of large models (like Gemma-2B, CodeGemma-2B, and LLaMA-7B) using lightweight, trainable adapters. This fine-tuning process was performed on the custom dataset, allowing the models to capture the subtle patterns defining cryptex code without the massive computational overhead of full fine-tuning.

## TCB Reduction via Line-Level Accuracy
LLM-CAL operationalizes the annotation process by making fine-grained line-level classifications. The system was trained to distinguish between cryptex code and non-cryptex code lines. The performance metrics show high accuracy across the board: LLM-CAL achieved 99.04% accuracy, 97.50% recall, and 99.40% precision at the line level. At the function level, LLM-CAL achieves 100% identification rate with zero false negatives and positives. The practical benefit is demonstrated through TCB reduction: on test set, LLM-CAL achieved a high TCB reduction of 81.20%, with only 0.52% inflation of TCB size due to misclassification by the tool. This demonstrates that the model successfully identifies sensitive regions while suppressing benign lines, showing strong generalization across diverse cryptographic codebases.

## Limitations
The paper focuses specifically on defining cryptex code via cryptographic primitives and their data flows, which might not capture all forms of security sensitivity relevant to every application context. Furthermore, the reliance on LLMs means that the model's performance is constrained by the quality and breadth of the initial 4010-file dataset. Assumptions about the stability of cryptographic implementations across different libraries are also implicit in the evaluation.

## What practitioners should do
* Use LLM-CAL frameworks to automate the initial identification of crypto-related code for TEE placement.
* Leverage the defined "cryptex code" notion as a starting point for minimizing TCB size rather than migrating entire applications.
* Validate the tool’s output, particularly in edge cases, given its reliance on learned patterns from the training set.
* Investigate the dataset release to benchmark other LLM-based code analysis tools against the established cryptex standard.

## Verdict
Read this paper if you are an ML engineer or security researcher working on TEE integration or automated code analysis; otherwise, skim it.

## Den's Take

The paper presents a compelling use case for LLMs in TCB reduction, leveraging the concept of "cryptex code" to move beyond monolithic TEE deployments. However, the reported high precision and recall feel overly optimistic given the constraints described. The authors focus narrowly on cryptographic primitives, but this abstraction ignores systemic vulnerabilities that are often more prevalent in application logic interfacing with TEEs—things like poor input validation or side-channel leakage through non-crypto data paths. A 98.41% F1 score on a synthetic, manually curated dataset is not a guarantee of robustness in a real-world, heterogeneous codebase. Relying on this tool to define the *entire* TCB boundary without rigorous testing against non-cryptographic logic flaws is premature; the tool should be viewed as an initial filter, not a final arbiter of security scope.