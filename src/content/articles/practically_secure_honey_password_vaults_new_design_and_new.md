---
title: "Practically Secure Honey Password Vaults: New Design and New Evaluation against Online Guessing"
date: "2026-10-26"
type: "Paper Review"
description: "Uses a Transformer model to generate highly plausible decoy vaults"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/practically_secure_honey_password_vaults_new_design_and_new_.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-cheng-haibo.pdf"
---

![Practically Secure Honey Password Vaults: New Design and New Evaluation against Online Guessing](/images/news/practically_secure_honey_password_vaults_new_design_and_new_.jpg)
*Figure from the paper “Practically Secure Honey Password Vaults: New Design and New Evaluation against Online Guessing” (p. 3)*

# Transformer-Based Decoy Generation and Practical Security Limits of Honey Password Vaults

## TLDR
*   **What**: Uses a Transformer model to generate highly plausible decoy vaults.
*   **Who's at risk**: Users relying on standard honey password vault implementations.
*   **Key number**: Transformer-based decoys limit attack accuracy to no more than 64.35%.

## The Deficiencies of Small-Scale Vault Modeling
Prior research on honey password vaults, designed to thwart offline guessing by generating decoys for incorrect master passwords, has been constrained by dataset size. Motivation. Prior to this work, only a small dataset of 276 vaults was used for model training and security evaluation [4, 6, 11, 12]. As a result, existing studies have relied on simple heuristic methods for both decoy generation and identification, potentially leading to dubious conclusions. It remains uncertain whether these honey vaults are secure in real-world applications with millions of users. Furthermore, previous security assessments focused primarily on distinguishing real vaults from N −1 decoys [4, 6, 11, 12] (typically with N = 1,000) and use accuracy as the main metric. These evaluations do not assess the practical security of honey vaults against online guessing attacks. An open question remains: how many accounts could be compromised through online guessing?

## Transformer Vault Distribution
The paper introduces a Transformer model specifically adapted for vault distribution, which serves as the core mechanism for generating high-fidelity decoys. This model surpasses the performance of existing models in defending against both the researchers' own distinguishing attacks and those from prior work. The primary contribution here is the qualitative leap in decoy plausibility. While existing methods struggled to accurately model the distribution of human-generated passwords, the Transformer model captures semantic features and password patterns more effectively. This enhanced modeling capability means that the resulting decoys are significantly harder for automated classifiers to distinguish from genuine vaults.

## The Two-Measure Practical Security Enhancement
The practical security of the honey vault scheme is evaluated against online guessing. Our new model achieves the best performance, only 0.51 accounts is cracked on average with 1,000 online attempts. To push this to a usable security level, the authors implement two supplementary measures. Measure I avoids encrypting passwords for websites with unlimited login attempts. Some websites lack proper login rate-limiting, giving attackers numerous chances to verify the correctness of the vault. Storing passwords for these sites in plaintext rather than ciphertext can limit the number of online attempts, significantly improving security. Measure II uses honey accounts for leakage detection. By incorporating honey accounts into the vault, we can detect ciphertext leakage through login attempts on these accounts and prevent further account compromise. Using the two measures greatly decrease the cracked account number to 0.11, making the practical security to a usable level.

## Limitations
The evaluation primarily focuses on human-generated passwords, which may not generalize perfectly to purely randomly generated passwords. The practical security demonstrations rely on the assumption that the underlying vault schemes utilize seed-uniform encoders, which is not guaranteed for all implementations. Furthermore, the paper does not extensively explore the impact of attackers employing adaptive strategies beyond the binary classifiers used in the online guessing analysis.

## What practitioners should do
*   When evaluating honey vault security, do not rely solely on vault distinguishability accuracy; measure practical online attack success.
*   For deployments against sites lacking login rate-limiting, consider storing those specific passwords in plaintext to cap online verification attempts.
*   Integrate honey accounts into your vault infrastructure to enable proactive detection of ciphertext leakage via login attempts.
*   Be aware that achieving high practical security may require simple, supplementary measures even if the core probability model is only moderately effective.

## Verdict
Read, especially if you are designing or auditing high-assurance password management systems. This paper shifts the focus from theoretical distinguishability to measurable, practical online security bounds.

## Den's Take

The paper correctly pivots the conversation from theoretical decoy distinguishability to measurable online attack success, a necessary shift for any practical security assessment. However, the leap to claiming "practical security" based on these results feels premature. The reliance on human-generated passwords, while a reasonable initial scope, ignores the reality that sophisticated threat actors often utilize dictionary attacks or targeted brute-forcing against known password entropy profiles, regardless of the decoy quality. Furthermore, the success of Measure I—storing passwords in plaintext for sites with unlimited attempts—introduces a massive, unmitigated risk profile. This plaintext storage might cap *online* verification attempts, but it creates a single, high-value target for offline compromise, effectively trading one attack vector for a far more catastrophic one.