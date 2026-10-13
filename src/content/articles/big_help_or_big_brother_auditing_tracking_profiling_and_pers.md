---
title: "Big Help or Big Brother? Auditing Tracking, Profiling, and Personalization in Generative AI Assistants"
date: "2026-10-08"
type: "Paper Review"
description: "Auditors use network traffic analysis to track data collection"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/big_help_or_big_brother_auditing_tracking_profiling_and_pers.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-vekaria.pdf"
---

![Big Help or Big Brother? Auditing Tracking, Profiling, and Personalization in Generative AI Assistants](/images/news/big_help_or_big_brother_auditing_tracking_profiling_and_pers.jpg)
*Figure from the paper “Big Help or Big Brother? Auditing Tracking, Profiling, and Personalization in Generative AI Assistants” (p. 7)*

# Auditing Data Leakage and Profiling in GenAI Browser Extensions

## TLDR
*   **What**: Auditors use network traffic analysis to track data collection.
*   **Who's at risk**: Users of popular GenAI browser assistants.
*   **Key number**: Some assistants collect full DOM snapshots even from sensitive pages.

## The Mechanics of Contextual Data Exfiltration
Modern browser assistants leverage Large Language Models (LLMs) to enhance the web experience, moving beyond the scope of traditional extensions. These assistants function as wrappers around LLMs, monitoring user activity via content scripts injected into every page a user visits. The core issue arises because this architecture grants assistants broad access to everything a user does in the browser. While the primary goal is ostensibly to provide personalized responses, the implementation frequently involves extensive data collection and sharing. Specifically, the analysis of nine popular assistants shows that many rely on server-side API calls, and they can be invoked automatically without explicit user interaction. The risk is compounded by the fact that this data collection happens even on pages containing sensitive information, such as health records or a Social Security number entered into a web form.

## Inferring Attributes from Browsing Behavior
The ability of these assistants to offer personalized responses hinges on building detailed user profiles, but the paper shows this profiling goes beyond explicit actions. Two extensions (Monica, and Sider) demonstrated profiling based on all five user attributes (location, age, gender, income, and interests) and responded to both in-context and out-of-context personalization prompts. This profiling capability is then leveraged for personalization, which can occur both in-context (based on the current query) and out-of-context (across different browsing sessions). This ability to infer traits from seemingly benign browsing behavior represents a significant privacy exposure, as the assistant synthesizes behavioral data into actionable demographic profiles.

## Data Disclosures to First-Party and Third-Party Servers
To understand the scope of data sharing, the research employed network traffic analysis via Mitmproxy to audit the data disclosures. The findings reveal that assistants frequently share collected data with both their own first-party servers and external third-party trackers. Sider and Merlin shared chat and user identifiers with `google-analytics.com` while TinaMind shared identifiers with `analytics.google.com`. Furthermore, Merlin was found to extract form inputs, leading to the sharing of sensitive data like medical records from `hem.ucdavis.edu` and a Social Security number from `irs.gov`. Harpa and Copilot stored the complete chat history in the extension’s background service worker using IndexedDB, indicating that these histories persist across browsing sessions.

## Limitations
The audit focused specifically on search-based assistants operating within the Google Chrome environment. The paper does not extensively cover the threat models associated with client-side model execution or other deployment environments. Furthermore, the analysis relies on observable network traffic patterns, and the degree to which the LLM *uses* inferred attributes versus merely *having* access to them is not always perfectly separable in the observed transactions.

## What practitioners should do
*   Restrict the permissions granted to browser extensions, particularly those integrating LLMs.
*   Be highly suspicious of assistants that claim to offer personalized responses without transparent disclosure of how user attributes are inferred.
*   Monitor network traffic for unexplained data transmissions to third-party analytics endpoints like Google Analytics.
*   Avoid using these assistants on websites containing highly sensitive PII or health records until stricter data handling guarantees are in place.

## Verdict
Read this paper if you are an ML engineer or security researcher concerned with the practical privacy implications of integrating powerful LLMs into end-user browser tooling. It provides a concrete, empirical audit of current industry practices.

## Den's Take

The paper correctly identifies that the architectural coupling between the browser extension and the LLM creates a massive data ingress vector. However, the focus remains largely on *what* data is leaked via network traffic, missing the more insidious threat: the potential for prompt extraction. If these assistants are profiling users to personalize responses, the prompts themselves—which contain the synthesized user attributes—become extremely valuable targets. An attacker doesn't necessarily need to steal the raw PII from the DOM; they might only need to prompt the assistant to reveal the inferred profile parameters it has built over weeks of browsing. This shifts the security concern from simple data exfiltration to sophisticated prompt-based inference attacks against the profiling logic.