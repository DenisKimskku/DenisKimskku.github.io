---
title: "GPUHammer: Rowhammer Attacks on GPU Memories are Practical"
date: "2026-09-30"
type: "Paper Review"
description: "Novel techniques to crack GDDR row mappings and boost hammering intensity"
tags: ["Binary Analysis"]
readingTime: 5
headerImage: "/images/news/gpuhammer_rowhammer_attacks_on_gpu_memories_are_practical.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-lin-shaopeng.pdf"
---

![GPUHammer: Rowhammer Attacks on GPU Memories are Practical](/images/news/gpuhammer_rowhammer_attacks_on_gpu_memories_are_practical.jpg)
*Figure from the paper “GPUHammer: Rowhammer Attacks on GPU Memories are Practical” (p. 7)*

# GPUHammer: Practical Rowhammer Attacks on Discrete GPU Memories

## TLDR
* **What**: Novel techniques to crack GDDR row mappings and boost hammering intensity.
* **Who's at risk**: Systems using discrete GPUs (like NVIDIA A6000) for ML workloads.
* **Key number**: The observed accuracy drops ranged from 56% to 80% across five different models due to Rowhammer bit-flips.

## Mapping GDDR Row Addressing
The foundation of Rowhammer relies on knowing which physical DRAM rows are adjacent to the victim row. On CPUs, address functions are often reverse-engineered. However, on NVIDIA GPUs, the virtual-to-physical mappings are proprietary and not exposed even to privileged users. This obscurity prevents the necessary row-buffer conflicts from being engineered reliably. GPUHammer overcomes this by leveraging the stability of virtual-to-physical mapping for large allocations. By measuring the latency increase when DRAM row-buffer conflicts occur, the authors directly reverse engineer the mapping of virtual addresses (offsets within an array) to the specific DRAM banks and rows within the GPU DRAM. This allows the attacker to identify addresses corresponding to unique rows across all rows in a target bank, setting the stage for targeted hammering.

## Parallelized Hammering on GPUs
The throughput orientation of GPUs presents a major hurdle for Rowhammer. Unlike CPUs, the high memory latency and shorter refresh periods limit the intensity of hammering from a single thread. A naive single-threaded kernel only managed about 7K activations per row in a 16-sided pattern within a 16ms window. GPUHammer addresses this by redesigning kernels to exploit the parallel nature of GPU execution. They developed $k$-warp $m$-thread-per-warp hammering kernels. This parallelization achieves activation rates close to the theoretical maximum of 500,000 activations per $t_{REFW}$, representing a 5$\times$ increase over naive single-thread kernels adapted from CPU attacks. Furthermore, to bypass in-DRAM mitigations, they incorporate NOP delays into the kernels to synchronize the hammering pattern with $\text{REF}$ commands.

## Accuracy Degradation via Bit-Flips
The final stage involves demonstrating that induced bit-flips translate into functional security compromises. By combining the address mapping and high-intensity hammering, GPUHammer successfully launched the first systematic Rowhammer campaign on an NVIDIA A6000 with GDDR6 DRAM, observing a total of 8 bit-flips across 4 DRAM banks. These bit-flips were strategically targeted at the most-significant bit of the exponent in FP16-representation weights. The resulting tampering caused significant accuracy degradation across various deep learning models. Specifically, across five different models—AlexNet, VGG16, ResNet50, DenseNet161, and InceptionV3—the observed accuracy drops ranged from 56% to 80% due to these single bit-flip events.

## Limitations
The paper focuses exclusively on GDDR6 memory on NVIDIA GPUs and explicitly leaves Rowhammer attacks on GPUs with ECC enabled for future work. The threat model assumes an attacker can execute CUDA kernels natively with user-level privileges and relies on the absence of ECC. The applicability of the reverse-engineered address mapping to all GDDR configurations outside of the tested A6000 is not guaranteed.

## What practitioners should do
* Audit deployments running ML inference on discrete GPUs, especially those in shared cloud or multi-tenant environments.
* Assume memory isolation mechanisms might be insufficient against hardware-level attacks like Rowhammer if ECC is disabled.
* Verify that memory access patterns for critical model weights do not inadvertently expose adjacent rows to high-frequency access patterns.
* Consider algorithmic resilience techniques for ML models against bit-flipping, given the demonstrated high impact (up to 80% accuracy loss).

## Verdict
Read this paper if you are an ML engineer or security researcher focused on hardware-assisted attacks against cloud infrastructure. Skip it if your focus is solely on software-based LLM vulnerabilities.

---

## Den's Take

The authors successfully demonstrated a practical path to hardware-level data corruption in ML workloads by mapping proprietary GPU memory structures. However, the paper frames the threat almost entirely around the functional impact on model accuracy, which is a consequence, not the core security breach. The real danger here is the complete erosion of the integrity of the computation itself, irrespective of the final accuracy metric. If an attacker can reliably flip bits in model weights, they can induce arbitrary, non-deterministic behavior far beyond mere accuracy degradation—they can force specific, exploitable failures or trigger logic errors that bypass higher-level security checks that assume computation fidelity. This complexity is a significant blind spot in current discussions, which tend to remain focused on the prompt layer.