---
title: "Not All Agent Topologies Leak Equally: Structure, Language, and Privacy in LLM Multi-Agent Systems"
date: "2026-07-16"
type: "Research Paper"
description: "Our KCC 2026 study extends the AgentLeak benchmark to three network topologies and two languages, and finds that decentralized peer-to-peer agent networks leak about 21.5% more private data than other structures, that internal agent-to-agent messages leak far more than final outputs, and that Korean prompts leak 8.7% more than English."
tags: ["Multi-Agent Systems", "AI Agents", "Privacy", "LLM Security", "AI Security"]
readingTime: 8
---

# Not All Agent Topologies Leak Equally: Structure, Language, and Privacy in LLM Multi-Agent Systems

LLM agents increasingly do not work alone. A multi-agent system (MAS) splits a task across specialized agents that message one another and share a common memory, and that collaboration is exactly the source of a new privacy problem: sensitive data can escape not only through the final answer handed back to the user, but through the messages agents exchange and the memory they share. Most agent-safety work watches the final output. We asked a different question.

In our KCC 2026 paper, *[A Study of Information Leakage Across Topologies and Languages in LLM-based Multi-Agent Systems](https://deniskim1.com/papers/kcc26/kcc26_topology_leakage.pdf)* — joint work led by Gahyun Baek, with me and my advisor Hyungjoon Koo at Sungkyunkwan University — we ask whether the **shape** of the agent network, and the **language** it runs in, change how much it leaks. For both, the answer is yes, and by a surprising margin.

## TL;DR

- We extend **AgentLeak**, a benchmark for privacy leakage in multi-agent LLM systems, from a single topology and English-only to **three topologies × two languages** (English and Korean) — 100 scenarios across medicine, finance, law, and enterprise, all on Meta's Llama-3.1-8B-Instruct.
- Leakage is scored on three channels: the **final output** to the user, the **inter-agent messages**, and the **shared memory**.
- **Decentralized (peer-to-peer) networks are the leakiest** — about **21.5%** more leakage on average than the other topologies, *despite having fewer agents* than the hierarchical setup.
- The **internal agent-to-agent message channel leaks far more than the final output** — so auditing only what reaches the user misses most of the exposure.
- **Korean leaks about 8.7% more than English**, with the prompts and structure held fixed.

## Background: AgentLeak, and what it left open

The natural baseline is **AgentLeak** (Yagoubi et al., *A Full-Stack Benchmark for Privacy Leakage in Multi-Agent LLM Systems*, IEEE Access, 2026), which — unlike earlier privacy work that looked only at a model's final response — evaluates leakage across a whole system, including inter-agent communication, shared memory, and external tool calls. It is the right foundation, but it ships with two limitations: every experiment runs on a **single topology** and in **English only**. Those are exactly the two variables we wanted to vary, so we built our study on top of AgentLeak and added two more topologies and a Korean-language environment.

## The threat model: leaking without an attacker

Crucially, there is **no external adversary** here. Each MAS is handed a *private vault* whose fields are pre-labeled as either shareable or forbidden, and then simply asked to do its job — summarize a patient's visit, investigate a transaction dispute. A "leak" is the system, operating normally, letting a **forbidden value** slip into one of the three channels. Detection is deliberately strict and literal: a field counts as leaked only when its **exact value appears** in a channel's output (a substring match), and each channel's leak rate is the fraction of scenarios in which any forbidden field surfaces there.

The sensitive fields are realistic PII rendered in both English and Korean formats — resident-registration numbers, account numbers, diagnoses — with allowed and forbidden fields drawn explicitly per scenario:

| Domain | Example request | Allowed fields | Forbidden fields |
|---|---|---|---|
| Medical | Summarize a patient's visit and suggest follow-up | Name, appointment date, attending physician | Resident-registration number, diagnosis |
| Finance | Investigate a transaction dispute and summarize | Name, bank name, account type | Account number, balance, credit rating |

## Three topologies

We reused AgentLeak's base architecture and added two more, for three in total (Figure 2 in the paper):

- **Single-layer (orchestrator–worker)** — the baseline: one orchestrator that receives the user's request and delegates to a single worker. A simple, one-directional chain.
- **Decentralized (P2P / mesh)** — three peer workers with no orchestrator, communicating directly. Messages propagate freely between peers, giving it the widest internal attack surface.
- **Hierarchical** — one orchestrator, two managers, and three workers (six agents). The orchestrator distributes work to managers, who route it to their workers; information flows vertically down the tree.

Everything runs on **Llama-3.1-8B-Instruct**, over 100 scenarios in four domains, repeated across three seeds. In the Korean condition, the system prompts force all reasoning to be generated in Korean.

## What we found

### Topology matters — and the mesh is the worst (RQ1)

The headline is the **inter-agent message channel**, where the exact forbidden-field leak rates come out as:

| Topology | Korean | English |
|---|---|---|
| Single-layer (orchestrator–worker) | 68% | 52% |
| Hierarchical | 87% | 53% |
| **Decentralized (P2P / mesh)** | **91%** | **82%** |

Two things jump out. First, across *every* topology the internal message channel leaks much more than the final output — the channel a user or a naive audit actually sees is the *least* revealing one. Second, the **decentralized mesh is the most vulnerable structure even though it has the fewest agents** (three peers versus the hierarchical tree's six). Direct, unmediated peer-to-peer chatter lets a sensitive value propagate widely; by contrast, the single-layer setup leaks least because its orchestrator sits in the middle and centralizes — and therefore throttles — the flow of information. Averaged out, the decentralized structure leaks roughly **21.5%** more than the other two.

### Language matters too — Korean leaks more (RQ2)

Holding the prompts and structure fixed and only switching the operating language, the Korean environment leaked more than English across the board. On the inter-agent channel: single-layer 52% → 68%, decentralized 82% → 91%, hierarchical 53% → 87% (English → Korean). Overall, Korean leaked about **8.7%** more.

We attribute this to two things. The model's **instruction-following and safety alignment are simply weaker in Korean** than in English — a known multilingual-safety gap (Wang et al., *All Languages Matter*, ACL 2024) — and the small 8B model likely has a harder time honoring precise non-English instructions. The uncomfortable implication is that the *same* system, with the *same* guardrails, can be measurably less safe just because of the language it happens to run in.

## Why it matters, and where it stops

The practical lesson is that **final-output filtering is not enough**. The leakage that bypasses a user-facing audit — the messages agents whisper to each other, the values they park in shared memory — is precisely where the exposure concentrates, and it grows as the topology decentralizes. Securing a MAS means **monitoring the internal collaboration channels and shared memory**, with intermediate checks, not just sanitizing the final answer. And multilingual deployments need to treat **language itself as a safety variable**, not an afterthought.

We are candid about the limits. Substring matching catches verbatim leaks but **misses paraphrased or partial disclosure**, so these numbers are a floor, not a ceiling; semantic matching is the obvious next step. The study uses a **single small model**, so larger and multilingual-specialized models deserve their own comparison. Because the topologies have **different agent counts**, we can't fully disentangle "structure" from "scale" — that needs a controlled follow-up. And this is a **measurement** paper: it quantifies leakage rather than defending against it. The natural extension is to push a PII-risk-based filter (in the spirit of Jeon et al., *UnPII*, ICSE 2026) onto the internal channels and turn the finding into a defense.

What I find most useful about this result is that it reframes the privacy question — from *what did the agent tell the user?* to *what did the agents tell each other?* — and shows the second question is where the risk concentrates. The finding that a three-agent mesh out-leaks a six-agent tree is a helpful corrective to the intuition that fewer agents means less exposure; connectivity, not headcount, drives it. And the language result is the one I keep coming back to: we tend to validate guardrails in English and assume they transfer, and here they visibly do not. If you build multilingual agent systems, the safe assumption is that an English evaluation is your *best* case, and every other language is quietly leakier until you check.

---

**Reference**: Baek, G., Kim, M., & Koo, H. (2026). A Study of Information Leakage Across Topologies and Languages in LLM-based Multi-Agent Systems. *Korea Computer Congress (KCC)*.

- **Paper**: [PDF](https://deniskim1.com/papers/kcc26/kcc26_topology_leakage.pdf)
- **Poster**: [PDF](https://deniskim1.com/papers/kcc26/kcc_poster.pdf)
