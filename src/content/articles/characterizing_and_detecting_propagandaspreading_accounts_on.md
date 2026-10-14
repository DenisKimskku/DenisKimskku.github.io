---
title: "Characterizing and Detecting Propaganda-Spreading Accounts on Telegram"
date: "2026-10-15"
type: "Paper Review"
description: "Identifies coordinated propaganda accounts using reply structure and message patterns"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/characterizing_and_detecting_propagandaspreading_accounts_on.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-kireev.pdf"
---

![Characterizing and Detecting Propaganda-Spreading Accounts on Telegram](/images/news/characterizing_and_detecting_propagandaspreading_accounts_on.jpg)
*Figure from the paper “Characterizing and Detecting Propaganda-Spreading Accounts on Telegram” (p. 5)*

# Heuristic Fingerprinting of Propaganda Accounts via Reply Structure on Telegram

## TLDR
*   **What**: Identifies coordinated propaganda accounts using reply structure and message patterns.
*   **Who's at risk**: Telegram group and channel administrators managing content moderation.
*   **Key number**: Our detector identifies propaganda accounts from a single propaganda message with a 97.6% accuracy (11.6% more than manual moderation).

## The Reliance on Manual Moderation
Cybersecurity threats manifest as information-based attacks, such as propaganda campaigns, across social media. While previous security research has concentrated on platforms like X and Reddit, these attacks are prevalent in instant-messaging services like Telegram, where information flows chronologically in groups and channels. Telegram lacks native content moderation for disinformation; the entire burden falls on channel administrators who typically rely on manual review or simple automation. Propaganda accounts thrive here because they do not need to satisfy an algorithmic importance score to be seen. Instead, they spread misinformation by replying to legitimate user comments within channels. Existing detection methods often fail because they rely on account-specific information or network analysis, which is inaccessible or unsuitable for the Telegram environment. Furthermore, prior work focusing on Telegram often centers on news articles posted by channel owners, rather than the targeted commentary spread by malicious accounts.

## The Unconnected Reply as a Signature
The core insight this paper introduces is that propaganda accounts exhibit a distinctive linguistic trait when replying to user messages: their replies frequently lack any explicit link or reference to the message they are responding to. Legitimate users typically employ "bridge words" (e.g., ‘I agree’, ‘but...’) to connect their opinion to the preceding context. In contrast, propaganda accounts often reuse text—which is necessary to craft messages that fit any discussion—resulting in replies that appear isolated. This lack of connection, combined with other traits like random or Western-looking usernames, forms a detectable signature. This focus shifts the detection target from the content itself (which can evolve) to the *relationship* between the propaganda reply and the legitimate user input it targets.

## Snowball Augmentation via Long Message Repetition
The detection mechanism is bootstrapped using several heuristics derived from a large dataset of over 17 million Telegram messages. Initial manual labeling confirmed that propaganda accounts are characterized by reactive behavior, random/Western-looking usernames, and unconnected replies. To scale this, the authors employ a snowball augmentation process based on message length. They build a database of all propaganda messages longer than 30 characters from the initially labeled set. They then check all other accounts to see if they have written these specific, long, repeated texts. If a match is found, the account is flagged as a propaganda account, and all its long messages are added to the database. This process continues until the count stabilizes. The detector leverages these combined heuristics to achieve a 97.6% accuracy when assessing a single propaganda message.

## Limitations
The study’s primary limitation resides in the manual selection of the 13 channels used for data collection. While this selection was sufficient to build a detector applicable across channels, the limited scope prevents definitive statements regarding the overall pervasiveness of this propaganda activity on the entire Telegram platform. Furthermore, the reliance on heuristic features means that adversaries could potentially change their naming conventions or message repetition strategies to evade detection.

## What practitioners should do
*   Implement a detection mechanism that prioritizes checking for linguistic disconnections between replies and preceding user messages.
*   Monitor for accounts exhibiting patterns of long message repetition across different discussions.
*   Use the dataset summary to understand the typical presence of propaganda, noting that in some channels like Sama-raNews, propaganda messages represented more than 4.5% of total messages.

## Verdict
Read this paper if you are building automated moderation tools for private messaging platforms; otherwise, skim it for a high-level understanding of information warfare tactics on instant messengers.

## Den's Take

The paper correctly identifies that the relationship—the structural disconnect between a reply and its target—is a more robust heuristic than content analysis alone. However, the reliance on message length as the primary driver for the "snowball augmentation" feels like a brute-force scaling mechanism rather than a principled feature extraction method. It risks overfitting to a specific manifestation of coordinated behavior observed in the initial 13 channels. I suspect that highly sophisticated actors will quickly pivot to using varied, short, contextually dense replies rather than long, repetitive text blocks to maintain their disinformation spread while bypassing this specific signature. This approach treats the symptom (unconnected replies) without adequately modeling the intent or the underlying goal of narrative saturation.