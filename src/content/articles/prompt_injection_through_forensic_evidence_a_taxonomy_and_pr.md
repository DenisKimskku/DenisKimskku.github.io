---
title: "Prompt Injection Through Forensic Evidence: A Taxonomy and Proof of Concept of Anti-Forensic Attacks on LLM-Assisted Digital Investigations"
date: "2026-10-22"
type: "Paper Review"
description: "Prompt Injection Through Forensic Evidence: A Taxonomy and Proof of Concept of Anti-Forensic Attacks on LLM-Assisted Digital Investigations"
tags: ["Prompt Injection", "Adversarial Attacks", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/prompt_injection_through_forensic_evidence_a_taxonomy_and_pr.jpg"
paperUrl: "http://arxiv.org/abs/2610.29747v1"
---

![Prompt Injection Through Forensic Evidence: A Taxonomy and Proof of Concept of Anti-Forensic Attacks on LLM-Assisted Digital Investigations](/images/news/prompt_injection_through_forensic_evidence_a_taxonomy_and_pr.jpg)
*Figure from the paper “Prompt Injection Through Forensic Evidence: A Taxonomy and Proof of Concept of Anti-Forensic Attacks on…” (p. 6)*

# Prompt Injection Via Adversarial Evidence in LLM-Assisted Digital Investigations

## TLDR
*   **What:** Attacks manipulate LLM reasoning using adversarial evidence planted by the subject.
*   **Who's at risk:** LLM-assisted digital forensics and investigation pipelines.
*   **Key number:** We demonstrate three attacks against an LLM-assisted analysis pipeline, changing a reported conclusion, writing attacker-chosen content to the analyst’s workstation, and causing outbound network traffic, each driven only by text planted on the seized device.

## The Perception Gap in Forensic Pipelines
Current digital forensics workflows assume that evidence is collected and then processed by various readers: deterministic tools, human examiners, and increasingly, Large Language Models (LLMs). The literature on classical anti-forensics addresses how evidence is destroyed, hidden, or altered before or during investigation. Similarly, prompt injection literature focuses on injecting instructions into untrusted input streams. However, LLM-assisted Digital Forensics (DF) introduces a unique vulnerability: the evidence itself is controlled by the party under investigation, making it adversarial by construction. This creates a perception gap, where the deterministic tools, the human examiner, and the LLM reader can all perceive the same evidence differently. Existing defenses target instructions or data corruption, failing to account for an adversary embedding an instruction *within* the evidence corpus that only the LLM interprets as a command. This gap allows an injection to reach the model unseen by the human examiner or static tools.

## Adversarial Evidence as the Injection Channel
The core insight of this work is that the evidence vector—the content, structure, metadata, and encoding of data on a subject's device *before* seizure—can serve as the instruction channel for prompt injection. Unlike traditional prompt injection where the attack string is supplied externally, here the adversary shapes the input data such that the LLM's reasoning layer is hijacked by content planted in the seized device. This moves the attack from merely *corrupting a claim* (which classical defenses can partially address) to *commanding an action* through the interpreted data. The paper systematizes this by defining a taxonomy across four dimensions: objective, technique, payload location, and concealment method. This taxonomy specifically accounts for how the same manipulation manifests differently across the three distinct readers (tool, human, model).

## Payload Location and Concealment Methods
The paper demonstrates the viability of this attack structure through three distinct proof-of-concept attacks, all driven solely by text planted on the seized device. The attacker selects an objective (e.g., to suppress true evidence), a technique, and then specifies where to place the payload and how to conceal it. For instance, an attacker can use a technique that results in **Hiding** (T2) for the human examiner while simultaneously resulting in **Injection** (T5) for the LLM reader, because the examiner never sees the hidden layer. The paper shows that this manipulation can lead to tangible outcomes. One demonstrated attack successfully causes the LLM agent to write attacker-chosen content to the analyst’s workstation, while another causes outbound network traffic, all originating from text planted in the evidence.

## Limitations
The threat model assumes a rational adversary capable of shaping evidence pre-seizure. This overlooks attacks exploiting runtime vulnerabilities in the forensic tools themselves (the tools vector). Furthermore, the paper does not conduct direct examiner studies, meaning the impact of automation bias—the tendency to trust automated results—is assumed rather than measured. The assumptions regarding network egress and write permissions (A3) are deployment-dependent, meaning the blast radius of an attack is highly contingent on the forensic workstation configuration.

## What practitioners should do
*   Adopt a defense-in-depth strategy that assumes evidence is adversarial by construction in LLM-assisted DF.
*   Scrutinize LLM outputs not just for factual errors, but for anomalous behavioral commands (e.g., file creation, network calls).
*   Implement checks that verify the LLM’s output against the explicit permissions granted to its role (R1)–(R4).
*   Maintain strict logging of all LLM actions, especially those involving file I/O or network access, regardless of the apparent "trust" of the input evidence.

## Verdict
Read this paper if you are building or securing LLM pipelines for sensitive environments like digital forensics; otherwise, it is likely too specialized.

---

## Den's Take

The paper correctly identifies that the evidence corpus itself can become the prompt injection vector, which is a significant conceptual leap beyond standard input injection. However, the focus remains heavily on the *injection* mechanism, while underplaying the downstream consequence: the failure of the chain of custody. If an LLM is tricked into writing attacker-chosen content to the analyst's workstation, the resulting artifact is not just a "command execution"; it is a forged piece of evidence that *looks* like it came from the forensic toolchain. This fundamentally breaks evidentiary integrity, regardless of whether the LLM successfully made a network call. The paper's focus on anomalous behavioral commands misses the greater risk of subtle, undetectable fabrication being accepted as truth by the human examiner who trusts the pipeline's integrity.