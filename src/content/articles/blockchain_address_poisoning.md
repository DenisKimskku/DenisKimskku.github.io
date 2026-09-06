---
title: "Blockchain Address Poisoning"
date: "2026-09-04"
type: "Paper Review"
description: "Adversaries flood victim history with lookalike addresses"
tags: ["Data Poisoning", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/blockchain_address_poisoning.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/tsuchiya"
---

![Blockchain Address Poisoning](/images/news/blockchain_address_poisoning.jpg)
*Figure from the paper “Blockchain Address Poisoning” (p. 5)*

# Blockchain Address Poisoning via Transaction History Flooding

## TLDR
* **What**: Adversaries flood victim history with lookalike addresses.
* **Who's at risk**: Users of account-based blockchains like Ethereum and BSC.
* **Key number**: 6,633 incidents have caused at least 83.8M USD in losses.

## The UX Challenge of Long Hexadecimal Strings
Most modern blockchains rely on wallet addresses, which are long, hard-to-memorize hexadecimal strings, exemplified by the 40-digit representation on Ethereum and Binance Smart Chain (BSC). Users frequently select recipient addresses from their recent transaction history, a practice driven by usability challenges inherent in these long strings. This reliance on history creates the vulnerability addressed by this work: blockchain address poisoning. An attacker exploits this by generating "lookalike" addresses—those sharing matching first and last characters with an address the victim frequently interacts with. The attacker then floods the victim's transaction history with these lookalike addresses. The core gap this paper targets is the lack of systematic measurement and characterization of this attack vector in the wild. This paper identifies 13 times more attack attempts than reported previously—totaling 270M on-chain attacks targeting 17M victims.

## Lookalike Address Generation
The viability of this attack hinges on the attacker's ability to generate convincing lookalike addresses. Generating an address involves a three-step process: choosing a 32-byte private key ($k$), applying elliptic curve (ECDSA) multiplication to get a public key ($K = k \times G$), and hashing $K$ to produce the final address. Because ECDSA multiplication is computationally hard to invert, attackers must resort to brute-force computation to fix specific characters in the desired address format. This paper reveals that the computational cost for generating these addresses is variable, ranging from a standard CPU to specialized GPUs, based on how many characters the attacker wishes to fix. This contrasts with domain-name phishing, which exploits human visual similarity. Here, the similarity metric is defined by matching hexadecimal digits at the beginning and end of the address, as the middle characters are deemed less relevant for user selection.

## The Poisoning Transfer Taxonomy
The attack is executed not as a single event, but through a sequence of poisoning transfers designed to pollute the victim's address list. The paper defines three specific transfer types used by the adversary. The first is a **tiny transfer**, where the attacker sends a small amount of the victim's token from the lookalike address ($L$) to the victim ($V$), effectively logging $L$ in $V$'s recent history. Second, a **zero-value transfer** occurs when the attacker records a transfer from $V$ to $L$ with a value of zero, which can be achieved using the `transferFrom` function on some token standards. Third, a **counterfeit token transfer** involves sending the victim's intended amount to $L$, but using a malicious, attacker-controlled token (e.g., "USDTT"). Attackers often combine these strategies, bundling multiple transfers into a single transaction, sometimes launching over 100 poisoning transfers in one go.

## Limitations
The threat model assumes the attacker has real-time monitoring capabilities across public blockchains but does not assume out-of-band knowledge of the victim. The analysis focuses heavily on account-based chains and the specific ERC-20/BEP-2 token mechanisms. It is unclear how the effectiveness of these attacks holds up when users employ advanced, context-aware wallet interfaces that actively cross-reference addresses against external whitelists or risk scoring services.

## What practitioners should do
* Implement transaction history review processes that specifically flag transactions involving addresses with high prefix/suffix similarity to recent, high-value recipients.
* Monitor for patterns of multiple, seemingly unrelated transactions involving newly observed addresses shortly after a large transfer.
* Be wary of tokens that appear similar to mainstream assets but are not verified against known, trusted contract addresses.
* Utilize wallet software features that allow manual verification of recipient addresses rather than relying on auto-completion from recent histories.

## Verdict
Read this paper if you are focused on the intersection of usability engineering and blockchain security, particularly concerning account-based chain risks. Skip it if you are only concerned with smart contract logic bugs or pure cryptographic attacks.

---

## Den's Take

The paper correctly identifies that usability—specifically the reliance on recent transaction history for long hexadecimal strings—is a vector for attack. However, the focus remains too heavily on the *generation* of lookalike addresses, treating it as a computational hurdle rather than a trivial operational cost for a determined adversary. Furthermore, the taxonomy of poisoning transfers feels too granular; the real threat is the aggregation of these small, low-signal events into a single, high-impact cognitive misdirection for the victim.