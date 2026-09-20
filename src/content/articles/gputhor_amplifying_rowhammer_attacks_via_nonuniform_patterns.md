---
title: "GPUThor: Amplifying Rowhammer Attacks via Non-Uniform Patterns to Exploit ECC-Protected GPUs"
date: "2026-09-21"
type: "Paper Review"
description: "GPUThor enables high-intensity Rowhammer using non-uniform patterns"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/gputhor_amplifying_rowhammer_attacks_via_nonuniform_patterns.jpg"
paperUrl: "http://arxiv.org/abs/2609.16546v1"
---

![GPUThor: Amplifying Rowhammer Attacks via Non-Uniform Patterns to Exploit ECC-Protected GPUs](/images/news/gputhor_amplifying_rowhammer_attacks_via_nonuniform_patterns.jpg)
*Figure from the paper “GPUThor: Amplifying Rowhammer Attacks via Non-Uniform Patterns to Exploit ECC-Protected GPUs” (p. 7)*

# GPUThor: High-Intensity Non-Uniform Rowhammer Against ECC-Protected GPUs

## TLDR
*   **What**: GPUThor enables high-intensity Rowhammer using non-uniform patterns.
*   **Who's at risk**: Workstation and cloud deployments using NVIDIA GPUs with ECC.
*   **Key number**: GPUThor induces up to 500× and 23,500× more flips per GB than prior works, GDDRHammer and GPUHammer.

## Memory Access Coalescing
The practical application of Rowhammer on GPUs has been severely limited by the low number of bit flips observed compared to CPU attacks. Prior GPU Rowhammer attacks, such as GPUHammer, relied on uniform hammering patterns where aggressor and decoy rows were activated equally. This uniformity results in low hammering intensity for the critical aggressor rows. The fundamental hurdle for attackers is that GPUs aggressively coalesce memory accesses across multiple levels—within warps and at the memory controller—to amortize bandwidth. This coalescing tendency collapses naive non-uniform hammering patterns back into uniform ones, preventing the fine-grained control needed to boost intensity. This limits the effective impact of the attack, especially when ECC is enabled, as prior attacks could not generate enough flips to overcome SECDED protection.

## Multi-tREFI Hammering
A key insight driving GPUThor is that simply achieving non-uniform hammering is insufficient; the attack must also be designed around the timing of in-DRAM mitigations. Prior work assumed that Target Row Refresh (TRR) mitigations aligned with multiples of $t_{\text{REFI}}$, a standard assumption from CPU DRAMs. However, this assumption breaks down on GDDR6. GPUThor's breakthrough involved reverse-engineering the Target Row Refresh (TRR) behavior on Ampere GPUs. The researchers discovered that mitigations are issued approximately once every 72 $t_{\text{REFI}}$. By mapping this actual refresh frequency, GPUThor can construct longer attack patterns that strategically interleave aggressor accesses outside of the mitigation sampling windows, significantly increasing the effective hammering intensity per aggressor row.

## Non-Uniform Pattern Construction
The mechanism of GPUThor is a two-pronged attack leveraging micro-architectural knowledge. First, to defeat memory request coalescing, the attack kernels distribute repeated accesses to an aggressor row across multiple warps and across unique cachelines within that row, ensuring distinct repeated activations. Second, to exploit the mitigation timing, the attack patterns span multiple $t_{\text{REFI}}$ periods. The paper details a pattern spanning up to 6 $t_{\text{REFI}}$ periods: the first five $t_{\text{REFI}}$ periods interleave repeated aggressor accesses with decoy accesses, while the final $t_{\text{REFI}}$ period contains only decoy accesses. This design increases the activation rate per aggressor row to nearly 6.6$\times$ that of prior uniform patterns. When tested on the A5000 GPU, this resulted in 23,597 flips/bank, or 377,552 flips/GB.

## Limitations
The threat model assumes an unprivileged attacker co-locating on a time-shared GPU or running from an unprivileged process in a single-tenant setting. The paper's findings rely on the specific behavior of Ampere GPUs with GDDR6 memory and the assumed 16-byte granularity for SECDED ECC. The attack's success against ECC hinges on exploiting "lazy servicing mechanisms" for multi-bit errors, which is a behavioral vulnerability rather than a pure memory corruption one.

## What practitioners should do
*   Do not rely solely on ECC being a perfect defense against Rowhammer on GDDR6; it is insufficient against high-intensity attacks.
*   Be aware that even when ECC enables detection of double-bit errors (DUEs), the lazy servicing window can still permit data consumption by an attacker.
*   Consider the possibility of denial-of-service attacks, as triggering DUEs causes the GPU to crash and require a reset.
*   If deploying high-security workloads, assume that Rowhammer feasibility persists even with ECC enabled.

## Verdict
Read this paper if you are designing hardware security countermeasures for GPU infrastructure or performing advanced adversarial testing against cloud ML workloads. Skip it if your focus remains strictly on CPU memory attacks.

## Den's Take

The paper presents a significant technical leap in attacking ECC-protected GPU memory by accurately mapping the $t_{\text{REFI}}$ timing on Ampere hardware. However, the security implications feel narrowly scoped to the specific micro-architectural assumptions made about GDDR6 and the 16-byte ECC granularity. The stated success against ECC hinges on exploiting "lazy servicing mechanisms" for multi-bit errors, which is a behavioral vulnerability rather than a pure memory corruption one. This suggests the attack vector shifts from purely overwhelming the ECC mechanism to timing out the system's recovery path. I predict that as GPU architectures move toward more aggressive, hardware-enforced error correction or move memory control further away from the logical execution unit, the utility of this precise timing knowledge will diminish rapidly. This is fundamentally different from the internal trust boundary issues I noted regarding agent execution environments [AI Security Digest — September 19, 2026: AI Agents & Vulnerabilities], because here we are attacking the physical resilience of the hardware substrate itself.