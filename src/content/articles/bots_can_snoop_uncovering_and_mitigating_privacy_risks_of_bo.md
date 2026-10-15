---
title: "Bots can Snoop: Uncovering and Mitigating Privacy Risks of Bots in Group Chats"
date: "2026-10-16"
type: "Paper Review"
description: "SnoopGuard protocol ensures selective message access and sender anonymity for bots"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/bots_can_snoop_uncovering_and_mitigating_privacy_risks_of_bo.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-chou.pdf"
---

![Bots can Snoop: Uncovering and Mitigating Privacy Risks of Bots in Group Chats](/images/news/bots_can_snoop_uncovering_and_mitigating_privacy_risks_of_bo.jpg)
*Figure from the paper “Bots can Snoop: Uncovering and Mitigating Privacy Risks of Bots in Group Chats” (p. 4)*

# SnoopGuard: Ensuring Privacy Against Overprivileged Bots in Group Chats

## TLDR
*   **What**: SnoopGuard protocol ensures selective message access and sender anonymity for bots.
*   **Who's at risk**: Users in group chats utilizing chatbots on messaging platforms.
*   **Key number**: Analysis on a Telegram dataset shows that 3.6% of users encounter the same chatbots in multiple groups.

## The Gaps in Existing Group Chat Security
Modern group messaging platforms integrate chatbots, which bring functionality but introduce significant privacy risks. The core problem is that current systems fail to reconcile the need for robust End-to-End Encryption (E2EE) with the requirement to restrict what bots can see. Specifically, two issues arise: chatbots often access all messages, even those irrelevant to their function (Excessive Information Exposure), and they can access sender metadata, allowing them to track users across different groups (User Identity Disclosure). For example, an analysis of a Discord chatbot showed that while only 0.24% of messages were intended for the bot, it has access to all messages. Furthermore, our analysis on a Telegram dataset shows that 3.6% of users encounter the same chatbots in multiple groups. Existing platforms, such as Telegram, Slack, and Keybase, attempt to mitigate these risks, but the paper demonstrates that none successfully combine these privacy safeguards while maintaining modern E2EE guarantees.

## SnoopGuard's Selective Message Access and Sender Anonymity
This paper introduces SnoopGuard as a secure group messaging protocol designed to address the tension between E2EE and bot privacy. The fundamental insight is that privacy protection against overprivileged bots requires enforcing two distinct, granular properties: Selective Message Access and Sender Anonymity. Selective Message Access prevents a chatbot from accessing any message irrelevant to its intended function. Sender Anonymity shields the user's identity from the chatbot, even when the bot needs to process a message. Unlike current state-of-the-art (SoA) protocols, which are designed primarily against key compromise from service providers, SnoopGuard is explicitly built to defend against the insider threat posed by overprivileged chatbots. This dual focus allows the protocol to operate securely while enforcing the principle of least privilege at the application layer, something previous protocols lacked.

## Complexity and Implementation Costs of SnoopGuard
SnoopGuard achieves its enhanced privacy by leveraging Continuous Group Key Agreement (CGKA) schemes, individual key management for each chatbot, and extensions to existing CGKA protocols to support sender anonymity. The protocol's overhead is analyzed in terms of cryptographic operations. Theoretically, SnoopGuard requires $O(\log n + m)$ cryptographic operations to send a message in a group of $n$ users and $m$ chatbots. This compares to $O(\log(n+m))$ required by Message Layer Security (MLS) in SoA protocols. Our prototype implementation shows that sending a message to a group of 50 users and 10 chatbots takes about 10 milliseconds when integrated with Message Layer Security (MLS).

## Limitations
The study focuses primarily on passive overprivileged chatbots, excluding active attacks like sending malicious group modification messages. Furthermore, the analysis of cross-group tracking relies on public datasets (Telegram "channels"), which may not fully represent the privacy dynamics within restricted, private group chats. The paper also assumes that a device will only be compromised for a finite period, which might not hold true in persistent real-world deployments.

## What practitioners should do
*   When deploying chatbots in group settings, verify that the underlying messaging protocol supports fine-grained message access control, not just E2EE.
*   Treat metadata leakage (like message senders' IDs) as a significant privacy vector, even if the bot's primary function doesn't require it.
*   If integrating bots, assess the operational overhead introduced by privacy-preserving mechanisms like those in SnoopGuard against latency tolerances.
*   Prioritize protocols that support sender anonymity over those that only limit message content exposure.

## Verdict
Read this paper if you are a security researcher or ML engineer working on privacy-preserving AI agents in communication systems. Skip it if you are only interested in standard E2EE implementation details.

## Den's Take

The paper correctly diagnoses the problem: E2EE alone is insufficient when the service provider grants overly broad access to integrated bots. However, I find the focus on application-layer enforcement through SnoopGuard overlooks the practical reality of platform adoption. Even if SnoopGuard offers theoretically superior guarantees over existing SoA protocols, its reliance on complex CGKA extensions means that the operational friction for developers integrating this into production messaging infrastructure will likely be too high. Users will default to the simplest, least-resistant option available, which is often the platform's default, overprivileged model. Furthermore, the paper's limitations regarding active attacks are a massive gap; a protocol designed only to stop passive snooping is functionally incomplete against a determined adversary. This mirrors my concern that security evaluations often neglect the full spectrum of threat models.