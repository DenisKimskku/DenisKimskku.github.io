---
title: "AMIDES: Adaptive Misuse Detection for SIEM Rule Evasions"
date: "2025-02-11"
type: "Paper Review"
description: "Understanding SIEM systems, Sigma rules, and how attackers evade detection through simple command-line obfuscation techniques - leading to the need for adaptive misuse detection."
tags: ["SIEM", "Intrusion Detection", "Sigma Rules", "Evasion Techniques", "Enterprise Security"]
---

# Detecting Evasions of SIEM Rules: The Case for Adaptive Misuse Detection

Enterprise networks rely heavily on Security Information and Event Management (SIEM) systems to detect malicious activity. However, the very rules that power these systems can become a roadmap for attackers. This article examines the background concepts behind the USENIX Security 2024 paper "You Cannot Escape Me: Detecting Evasions of SIEM Rules in Enterprise Networks" by Uetz et al., which introduces AMIDES—a system designed to catch what traditional rules miss.

## What is SIEM?

**Security Information and Event Management (SIEM)** systems form the backbone of enterprise security monitoring. They serve three critical functions:

1. **Data Collection**: Aggregating logs from endpoints, servers, network devices, and applications
2. **Event Correlation**: Analyzing patterns across disparate data sources to identify potential security incidents
3. **Real-time Alerting**: Providing immediate notifications and supporting incident response workflows

The core detection mechanism in most SIEM deployments is **rule-based detection**—expert-crafted patterns that match known malicious behaviors in event data such as process creation, network connections, and file modifications.

---

## Sigma Rules: The De Facto Standard

![Sigma rules ecosystem showing how detection rules can be converted to queries for various SIEM platforms like Splunk, Elastic, and Rapid7.](/images/250211/sigma_rules.png)

**Sigma** has emerged as the dominant open-source format for SIEM detection rules, with over 3,000 community-maintained rules. Its key characteristics include:

- **Standardized Format**: YAML-based syntax for describing log events
- **Platform Agnostic**: Can be converted to queries for any SIEM platform (Splunk, Elastic, Microsoft Sentinel, etc.)
- **Community-Driven**: Rapid updates in response to emerging threats

### Types of Sigma Rules

| Rule Type | Purpose | Example |
|-----------|---------|---------|
| **Generic Detection** | Detect techniques regardless of specific threat | Process injection patterns |
| **Threat Hunting** | Starting points for proactive investigation | Unusual PowerShell execution |
| **Emerging Threats** | Target new APT campaigns or zero-days | FIN7 PowerShell scripts |

---

## The Double-Edged Sword of Openness

The transparency of Sigma rules creates a fundamental tension:

### Advantages
- Broad community review improves rule quality
- Rapid updates address emerging threats
- Shared intelligence benefits defenders globally

### Challenges
- **Transparency**: Attackers can study the exact detection logic
- **Adaptation**: Adversaries modify attacks to evade specific rules
- **Blind Spots**: Minor variations not covered by rules go undetected

This transparency means sophisticated attackers can systematically analyze detection rules and craft evasions that maintain attack functionality while avoiding pattern matches.

---

## Evasion Techniques: How Attackers Slip Through

![Table showing five evasion techniques with concrete examples of how each can bypass SIEM rules.](/images/250211/evasion_techniques.png)

The paper identifies five fundamental evasion techniques that can bypass nearly half (129 of 292) of analyzed SIEM rules:

### 1. Insertion
Adding characters that don't affect execution but break pattern matching.

```
Original: schtasks.exe /create ...
Evasion:  schtasks.exe /"create" ...
```

### 2. Substitution
Replacing standard arguments with functional equivalents.

```
Original: curl -O http://...
Evasion:  curl --remote-name http://...
```

### 3. Omission
Removing or shortening arguments to avoid detection.

```
Original: cscript.exe ...\Retrive.vbs
Evasion:  cscript ...\Retrive.vbs
```

### 4. Reordering
Changing the order of command-line arguments.

```
Original: procdump -ma ls
Evasion:  procdump ls -ma
```

### 5. Recoding
Altering the encoding or representation of values.

```
Original: ...address=127.0.0.1,...
Evasion:  ...address=2130706433,...
```

The last example demonstrates converting an IP address from dotted-decimal notation to its integer equivalent—functionally identical but evading string-based detection.

---

## The Limitations of Static Misuse Detection

Traditional misuse detection faces inherent constraints:

### Coverage Gaps
Rules cannot enumerate all possible variations of an attack. Each new evasion technique creates a blind spot that requires manual rule updates.

### Computational Complexity
Expanding rules to cover all possibilities (every IP format, every argument ordering, every encoding scheme) becomes computationally infeasible and increases false positives.

### Adversarial Advantage
When attackers understand the detection logic, they can precisely tailor attacks to fly under the radar. Static rules become a checklist for evasion.

---

## The Solution: Adaptive Misuse Detection

The core insight driving AMIDES is that **events don't need to match rules exactly to be suspicious**. Instead of relying solely on pattern matching, adaptive misuse detection:

1. **Compares against rules**: Check if an event matches known malicious patterns
2. **Compares against baseline**: Check if an event resembles benign behavior
3. **Flags anomalies**: Events that are "close" to malicious patterns but "far" from normal behavior warrant investigation

### AMIDES Architecture

AMIDES combines the precision of rule-based alerts with the adaptability of anomaly detection:

- **Rule Matching**: Traditional Sigma rule evaluation
- **Similarity Analysis**: Machine learning models that measure "closeness" to malicious patterns
- **Baseline Comparison**: Understanding what normal looks like in a specific environment
- **Intelligent Alerting**: Surfacing events that evade rules but exhibit suspicious characteristics

This approach means an attacker can no longer simply modify `schtasks.exe /create` to `schtasks.exe /"create"` and assume they're safe—the system recognizes the semantic similarity to the original malicious pattern.

---

## Implications for Enterprise Security

### For Security Teams
- Static rules remain valuable for detecting known-exact patterns
- Adaptive detection provides a safety net for evasion attempts
- Baseline modeling requires initial investment but pays dividends

### For Attackers
- Simple obfuscation techniques become less effective
- Evasion requires fundamental changes to attack patterns, not just cosmetic modifications
- The cost of evading detection increases significantly

### For the Community
- Open-source rules remain valuable—their transparency doesn't eliminate their utility
- Complementary approaches (rules + ML) provide defense in depth
- Continued research into evasion and detection creates an evolving landscape

---

## Conclusion

The cat-and-mouse game between attackers and defenders continues to evolve. While SIEM rules like Sigma provide crucial baseline detection capabilities, their transparency creates exploitable blind spots. AMIDES represents a paradigm shift: rather than trying to enumerate every possible attack variation, we can use machine learning to recognize when something *looks like* an attack, even if it doesn't match any specific rule.

This adaptive approach doesn't replace traditional rules—it augments them. The future of enterprise security monitoring lies in hybrid systems that combine the interpretability and precision of expert-crafted rules with the flexibility and generalization capabilities of machine learning.

---

**Reference**: Uetz et al., "You Cannot Escape Me: Detecting Evasions of SIEM Rules in Enterprise Networks," *USENIX Security Symposium*, 2024.

---
- **Paper**: [USENIX Security '24](https://www.usenix.org/system/files/sec23winter-prepub-112-uetz.pdf)
- **Code**: [Github](https://github.com/fkie-cad/amides)

---

- **Slide**: [0211_AMIDES_BG.pdf](https://deniskim1.com/lab-meeting/0211_AMIDES_BG.pdf)

