---
title: "Unsafe LLM-Based Search: Quantitative Analysis and Mitigation of Safety Risks in AI Web Search"
date: "2026-10-06"
type: "Paper Review"
description: "Unsafe LLM-Based Search: Quantitative Analysis and Mitigation of Safety Risks in AI Web Search"
tags: ["RAG", "AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/unsafe_llmbased_search_quantitative_analysis_and_mitigation_.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-luo-zeren.pdf"
---

![Unsafe LLM-Based Search: Quantitative Analysis and Mitigation of Safety Risks in AI Web Search](/images/news/unsafe_llmbased_search_quantitative_analysis_and_mitigation_.jpg)
*Figure from the paper “Unsafe LLM-Based Search: Quantitative Analysis and Mitigation of Safety Risks in AI Web Search” (p. 6)*

# Quantifying Malicious Content Risk in AI-Powered Search Engines

## TLDR
*   AIPSEs frequently disseminate harmful content via malicious URLs.
*   Production AIPSEs are at risk, even with benign user queries.
*   The agent-based defense reduces main risk-inclusive responses by 78.3%.

## The Inherent Risk of Unfiltered Retrieval
AI-Powered Search Engines (AIPSEs) leverage Retrieval-Augmented Generation (RAG) to surpass Traditional Search Engines (TSEs) by interpreting user intent and summarizing external data. This architecture, which combines a knowledge database, a retriever, and an LLM, offers superior utility compared to keyword matching. However, this integration introduces a safety vulnerability: the retriever can access and feed unfiltered malicious web-sites to the LLM. The risk materializes when the LLM subsequently quotes or cites this malicious content in its answer, leading to the dissemination of harmful or unverified information. The paper quantifies this by defining four URL risk types: Main Risk (malicious URL directly cited in the answer), Warning Risk, Source Risk (malicious URL only in sources), and None Risk. The core problem addressed here is the systemic failure of current AIPSEs to adequately vet retrieved content before synthesis. For example, when querying seven AIPSEs, we observe that 47% of responses are risky (Figure 4).

## Query Type Influences on Risk Exposure
The manner in which a user queries the AIPSE dictates the immediate risk profile of the response. The research systematically compares three query types: keyword list query, URL query, and natural language query. The findings indicate a distinct difference in how these inputs affect the prevalence of high-risk output. Specifically, the paper observed that directly querying a URL tends to increase the number of main risk-inclusive responses (Figure 6), whereas natural language queries can slightly mitigate these risks (Figure 4). Our evaluation collects candidate URLs and their keyword lists from three popular cyber threat detection platforms: PhishTank [14], ThreatBook [19], and LevelBlue [8]. Figure 1 illustrates the overall process of our work: we collect 100 websites and their corresponding keyword lists as the evaluation dataset (see Section 4.2 for more details). Then, we evaluate seven representative AIPSEs on this dataset to reveal the safety risk of them (Section 4 and Section 5).

## Agent-Based Defense Mechanism
To counteract the inherent vulnerabilities, the authors propose an agent-based defense mechanism that operates post-retrieval. This defense integrates a content refinement tool and a URL detector tool. The agent iteratively invokes these tools until sufficient information is gathered, generating a response that maximizes informational content while simultaneously flagging safety vulnerabilities in the original AIPSE output. This mechanism is shown to outperform a simpler prompt-based defense that relies on feeding the AIPSE output into a GPT-4.1-based content refinement tool. The specific component responsible for the measurable reduction is the HtmlLLM-Detector. The evaluation shows that our proposed HtmlLLM-Detector can address 78.3% of main risk-inclusive responses and achieves a high F1 Score of 0.822 (Table 2). The trade-off for this enhanced safety is a minor cost: the defense reduces available information by approximately 10.7%.

## Limitations
The threat model primarily focuses on content poisoning via external web sources accessed by the retriever. The paper does not extensively cover risks arising from the LLM's internal training data or sophisticated prompt injection attacks that bypass the external retrieval step. Furthermore, the defense mechanism is presented as a user-end filter, which assumes the attacker cannot anticipate or circumvent the specific behavior of the agent-based tools in a production deployment.

## What practitioners should do
*   Prioritize the integration of a content refinement tool and a URL detector into AIPSE pipelines.
*   Be aware that using direct URL queries may increase the likelihood of receiving main risk-inclusive responses.
*   Implement safety checks that explicitly differentiate between Main Risk and Source Risk URLs in citations.
*   Monitor the utility trade-off when implementing defenses, as the paper shows a potential 10.7% reduction in available information.

## Verdict
Read this paper if you are building or deploying any AI-Powered Search Engine; it provides the first quantitative baseline for safety risk in the field.

---

## Den's Take

The paper focuses heavily on external content poisoning via the retriever, but it underserves the internal fragility of the LLM itself. Relying on post-retrieval agents to "refine" or "flag" content feels like treating a symptom—the citation—rather than the disease, which is the LLM's tendency to synthesize and quote unverified material from an untrusted source. The reported effectiveness of the agent-based defense, while quantitatively interesting, assumes the LLM is a stable, controllable synthesizer. I contend that the core issue of an LLM accepting and reproducing harmful content is fundamentally architectural, not merely a matter of applying a better filter. This mirrors the fragility I observed when evaluating self-judging models; a weak evaluation loop doesn't just fail to catch errors, it fabricates them. Defenses must address the decision boundary at the synthesis stage, not just the input data stream.