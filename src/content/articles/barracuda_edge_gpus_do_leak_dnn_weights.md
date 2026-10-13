---
title: "BarraCUDA: Edge GPUs do Leak DNN Weights"
date: "2026-10-09"
type: "Paper Review"
description: "Attacks extract DNN weights from edge GPUs using EM side-channel analysis"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/barracuda_edge_gpus_do_leak_dnn_weights.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-horvath.pdf"
---

![BarraCUDA: Edge GPUs do Leak DNN Weights](/images/news/barracuda_edge_gpus_do_leak_dnn_weights.jpg)
*Figure from the paper “BarraCUDA: Edge GPUs do Leak DNN Weights” (p. 8)*

# BarraCUDA: Parameter Extraction from Edge GPU Inference via Correlation EM Analysis

## TLDR
*   **What**: Attacks extract DNN weights from edge GPUs using EM side-channel analysis.
*   **Who's at risk**: Companies deploying IP-sensitive models on Nvidia Jetson devices.
*   **Key number**: The authors develop a CUDA-based implementation of CEMA, which executes the attack an order of magnitude faster for large datasets.

## The GPU Implementation Detail

The foundation of this attack rests on a specific property of convolution computation during inference. In many neural network implementations, the convolution operation, which is central to many layers, *cannot* be executed in a single computational step. Instead, the paper observes that it must be broken down into a sequence of partial sums. Each of these intermediate computations depends on only a small subset of the network's weights and the input features. If an adversary can observe the physical leakage corresponding to these partial sums, they can potentially recover the underlying weights. The attack assumes the adversary knows the structure of the DNN architecture but seeks to recover the actual weights and biases. Because the computation is sequential across these partial sums, the attack targets these intermediate values rather than the final output of the layer, which would involve too many secret parameters simultaneously. This dependency on the specific sequence of partial sums is what allows the attack to proceed layer-by-layer, targeting one or a few weights at a time to maintain feasibility.

## Localizing Leakage with TVLA

A significant hurdle in applying side-channel analysis to GPUs is the inherent noise introduced by the Single-Instruction-Multiple-Thread (SIMT) architecture. Unlike deterministic systems, the thread scheduling on a GPU is not fixed in time, which complicates traditional correlation-based attacks. BarraCUDA addresses this by adapting techniques from cryptographic side-channel analysis. The paper utilizes Test Vector Leakage Assessment (TVLA) to solve two related localization problems: first, finding the optimal physical location on the device to place the electromagnetic probe, and second, pinpointing the exact time within the neural network's operation when a specific neuron is being evaluated. This localization is achieved by comparing distributions—specifically, checking if two sets of measurements show significant differences when one set processes a fixed weight versus when it processes random weights. The use of TVLA allows the researchers to efficiently identify the relevant temporal and spatial points of leakage, making the large-scale parameter extraction feasible despite the noisy, parallel nature of the GPU execution.

## Parameter Recovery via CUDA-Based CEMA

The actual extraction phase leverages Correlation Electromagnetic Analysis (CEMA), but it must be tailored for the massive datasets required by DNN parameter recovery. The process begins with a profiling phase where an equivalent, weightless DNN architecture is run on a profiling device to understand how weight-related information leaks. Following this, the attack is executed on the victim device. The core mechanism involves guessing a single weight or bias, using that guess to predict the intermediate value that should be computed, and then correlating that prediction against the measured side-channel trace. To make this computationally tractable for millions of traces, the authors develop a CUDA-based implementation of CEMA, which executes the attack an order of magnitude faster for large datasets. The cost of this attack varies by hardware and precision: Overall, the attack against the Jetson Nano requires 10 days for collecting traces and one to two days for trace alignment with an input batch size of 1. On the other hand, the Jetson Orin Nano requires only 1 day for trace collection and one day for trace alignment with an input batch size of 1. An experiment with a larger batch size was also conducted on the Orin Nano, and it took 5 days to collect traces and align them with an input batch size of 16. Once aligned, parameters can be extracted at a rate of one weight in six minutes for FP16 and 5 minutes for INT8 weights.

## Limitations

The attack relies heavily on the adversary having unfettered physical access to the edge device to place electromagnetic probes. Furthermore, the success of the attack is contingent on the ability to reverse-engineer the specific CUDA binaries produced by TensorRT to correctly identify the relevant partial sums and their dependency on weights. The paper also assumes the target device operates correctly and that the code itself does not contain programming vulnerabilities that would allow direct parameter acquisition.

## What practitioners should do

*   Implement defenses that disrupt the sequential nature of convolution computation to prevent the formation of easily observable partial sums.
*   Consider hardware modifications to reduce electromagnetic emanations during critical inference operations on edge devices.
*   If deploying models on Jetson devices, budget for extensive side-channel monitoring and characterization of the specific hardware/software stack used.
*   Explore quantization schemes beyond INT8 if they do not introduce exploitable patterns in the intermediate calculations.

## Verdict

Read this paper if you are designing or securing ML inference pipelines on embedded GPUs; otherwise, skim it.

---

## Den's Take

This work demonstrates a serious, tangible threat against deploying proprietary models on edge hardware. The paper focuses heavily on the technical feasibility of parameter extraction given physical access to the device. However, it understates the immediate risk posed by the complexity of modern deployment artifacts. The authors rely on reverse-engineering the specific CUDA binaries generated by TensorRT to map the attack to the correct partial sums. This reliance means the attack surface is not just the GPU itself, but the entire software stack managing the model graph. A more pragmatic concern is the fragility of these side-channel defenses against slightly varied implementations; small changes in compiler optimization or runtime library versions could invalidate the assumptions about the sequential nature of convolution that this entire attack hinges upon.