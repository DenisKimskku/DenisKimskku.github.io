---
title: "&quot;I&apos;m regretting that I hit run&quot;: In-situ Assessment of Potential Malware"
date: "2026-09-04"
type: "Paper Review"
description: "&quot;I&apos;m regretting that I hit run&quot;: In-situ Assessment of Potential Malware"
tags: ["Malware"]
readingTime: 5
headerImage: "/images/news/quotiaposm_regretting_that_i_hit_runquot_insitu_assessment_o.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/lit"
---

![&quot;I&apos;m regretting that I hit run&quot;: In-situ Assessment of Potential Malware](/images/news/quotiaposm_regretting_that_i_hit_runquot_insitu_assessment_o.jpg)

# "I'm regretting that I hit run": In-situ Assessment of Potential Malware

## TLDR
* End-users are surprisingly effective at classifying malware in real-time.
* System-level process statistics improve user classification accuracy.

## User Reliance on System Indicators

Security professionals often focus on technical detection methods for malware, yet the paper investigates human decision-making during the software assessment process. Modern operating systems offer tools like Task Manager, allowing users to monitor process behavior, but the paper notes that existing related work is scarce regarding whether users actually employ these controls effectively when judging software trustworthiness. The study setup involves participants installing real benign and malicious software on a standard Windows laptop, capturing their judgment *in-situ*. The initial session provides no external tools, forcing participants to rely on default system visibility. The resulting 2,651 think-aloud excerpts were coded into indicators, revealing that participants frequently look at things like system notifications with publisher information and process resource usage. However, the analysis also uncovers common misconceptions, such as basic participants relying on misleading indicators like file names, which bad actors can easily circumvent.

## Enhanced Task Manager

The core contribution here is the development of a targeted system monitoring utility. The researchers designed an "enhanced task manager" to bridge the gap between complex, general-purpose tools and the specific threat characteristics users need to observe. This tool adopts the tabular layout of Windows Task Manager but augments standard metrics (CPU%, memory usage, MB read and written to disk, time since process started) with threat-relevant data. Specifically, it extends this data to include the destination countries associated with network connections (including autonomous systems) and details on the verified publisher, alongside listing files accessed by their parent directory. The paper suggests this targeted information can help users move beyond surface-level observations. In the second session, classification accuracy for malware was 94% with a median decision time of three minutes. In the first session, 88% of malware was classified with a median decision time of four minutes. Benign software classification accuracy remained lower at 66% in the second session.

## Informational Costs of Process-Level Data

While providing more system-level data improves accuracy, the study examines the trade-offs inherent in the classification process. Participants across all experience levels were surprisingly effective, but the data reveals that some information can be misleading or requires specific context. For instance, the paper notes that participants' reliance on indicators can be manipulated. The enhanced tool allows users to see network destination country and specific files accessed, which are key indicators. The cost of this enhanced information, however, is not solely computational; it involves the complexity of interpreting the data and the potential for user confusion, as seen by the drop in benign software classification accuracy to 66% in the second session. The researchers specifically note that basic participants still exhibited misconceptions about software trustworthiness, even when provided with more process-level statistics.

## Limitations

The study is confined to a single lab setting using a controlled set of malware and benign samples. The threat model is limited to deception via software installation prompts, not broader network intrusion or zero-day exploits. The assumptions regarding the utility of the "enhanced task manager" rely on the participants' ability to correctly map observed process behavior to threat severity, which may not hold when facing novel or highly obfuscated malware in a live production environment.

## What practitioners should do

* System providers should incorporate user-identified indicators, such as process resource usage and network connection destinations, into user notifications.
* Security awareness programs should address specific user misconceptions regarding software publisher verification, as identified in the qualitative analysis.
* Consider developing streamlined, threat-focused system monitoring interfaces rather than relying on complex, general-purpose diagnostic tools.
* The findings suggest that improving the presentation of system data to end-users is as vital as improving the malware itself.

## Verdict

Read this paper if you are interested in human factors in cybersecurity or UI/UX design for security tools. Those focused purely on compiler or sandbox analysis may find the scope too narrow.

---

## Den's Take

The paper correctly points out that user judgment, when augmented with targeted system telemetry, can achieve high classification accuracy against known threats. However, the focus on improving the *interface* for end-users overlooks a more fundamental issue: the reliability of the underlying operating system telemetry itself. If an attacker can achieve process-level invisibility or manipulate the hooks that feed the "enhanced task manager" data—a scenario far more common in targeted attacks than in a controlled lab setting—then the 94% accuracy becomes meaningless. The study seems to treat the OS as a trusted oracle. I predict that the transition from controlled lab evaluation to real-world use will expose the fragility of these reliance models, especially when considering how complex attacks can induce reasoning shifts in cognitive systems, a concept I explored when discussing the limitations of simple input obfuscation in jailbreaking.