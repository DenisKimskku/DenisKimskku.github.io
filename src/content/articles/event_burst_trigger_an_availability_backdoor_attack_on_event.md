---
title: "Event Burst Trigger: An Availability Backdoor Attack on Event-Based SNN Object Detection"
date: "2026-07-17"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2607.09115"
paperAuthors: "Jaesun Baek, Chanwook Lee, Eun-Kyu Lee"
description: "Event Burst Trigger (EBT) is an availability backdoor attack that poisons training data with sparse temporal event triggers to induce synchronized SNN firing cascades, causing a…"
tags: ["AI Security"]
readingTime: 12
---

## TLDR
- **What**: Event Burst Trigger (EBT) is an availability backdoor attack that poisons training data with sparse temporal event triggers to induce synchronized SNN firing cascades, causing a massive candidate bounding box explosion that overloads the $O(N^2)$ Non-Maximum Suppression (NMS) post-processing stage.
- **Who's at risk**: Real-time neuromorphic vision systems deployed on edge platforms (e.g., autonomous vehicle perception, drone navigation, and robotic vision) utilizing Spiking Neural Networks (SNNs) and event-based sensors.
- **Key number**: Under the temporal event noise trigger configuration ($\rho=0.2$, $\gamma=1.0$), NMS latency increases by up to **38$\times$ (a 3,818% increase)** on the Prophesee GEN1 dataset, while detection accuracy (mAP@0.5) drops by less than **0.099**.

---

# Event Burst Trigger: Weaponizing SNN Spatiotemporal Dynamics for NMS Latency Amplification

Real-time vision systems running on resource-constrained edge platforms must maintain predictable, low-latency execution to ensure physical safety. While Spiking Neural Networks (SNNs) coupled with asynchronous event-based cameras are widely praised for their energy efficiency and input-dependent processing, this dynamic nature introduces a critical security vulnerability. 

If an attacker can manipulate the temporal density of input spikes, they can turn the SNN's inherent efficiency against itself. This post analyzes **Event Burst Trigger (EBT)**, a poison-only availability backdoor attack that exploits SNN stateful dynamics and Non-Maximum Suppression (NMS) post-processing to degrade system responsiveness without altering the model's architecture.

---

## Threat Model

The adversary operates under a highly restrictive, realistic threat model:

| | |
|---|---|
| **Attacker** | **Poison-only capabilities**: The attacker has access only to the offline training dataset and can modify a bounded fraction of training samples (poisoning ratio $\rho \le 0.2$). The attacker cannot modify the model architecture, parameters, loss functions, or inference pipeline. |
| **Victim** | Edge-based, real-time object detection systems utilizing event-driven SNN pipelines (e.g., SpikeYOLO) deployed on embedded platforms like the **NVIDIA Jetson Orin Nano**. |
| **Goal** | **Availability Degradation / Denial of Service**: Explode inference-time processing latency (specifically targeting the post-processing NMS stage) when a trigger is present, while preserving standard detection accuracy (mAP) and output characteristics under normal operation to evade detection. |
| **Budget** | Minimal offline compute required to inject synthetic event-based triggers and overlapping fake bounding box annotations into a subset of training data. |

---

## Background & Problem Setup

### SNN Spatiotemporal Dynamics vs. Static CNNs
SNNs process event streams asynchronously using stateful neurons whose membrane potentials accumulate charge over time. They emit output spikes only when their internal thresholds are exceeded. This means SNN computational cost is dynamic: sparse inputs result in minimal computations, while highly concentrated, synchronized event bursts can trigger massive firing cascades.

### Post-Processing Bottlenecks
Object detection pipelines use Non-Maximum Suppression (NMS) to filter redundant, overlapping bounding boxes. Because the computational complexity of NMS scales quadratically—$O(N^2)$ in the worst case, where $N$ is the number of candidate bounding boxes—any significant increase in intermediate object proposals directly leads to a massive computational bottleneck.

Unlike previous availability/sponge attacks that target frame-based pipelines, EBT targets the interaction between stateful SNN dynamics and the $O(N^2)$ NMS bottleneck.

| Attribute | Conventional NMS Attacks (e.g., Guo et al. [14], Shapira et al. [15]) | Event Burst Trigger (EBT) |
|---|---|---|
| **Target Architecture** | Frame-based CNNs | Spiking Neural Networks (SNNs) |
| **Input Modality** | Static RGB Images | Asynchronous Event Streams (Spatiotemporal) |
| **Vulnerability Vector** | Direct spatial activation mapping | Temporal accumulation & synchronized neuron firing cascades |
| **Trigger Type** | Continuous pixel perturbations / visible patches | Discrete event bursts / sparse temporal noise |
| **Evasion Vector** | Bypasses spatial anomaly detectors | Bypasses temporal entropy defense (STRIP) |

---

## Methodology

The EBT attack pipeline consists of three main phases: Trigger Generation, Annotation Poisoning, and Model Training.

```
[ Benign Event Stream ] ──+──> [ Trigger Generation ] (Single-Event / Noise)
                          │             │
                          │             ▼
                          │        [ Annotation Poisoning ] (Dense Fake Bounding Boxes)
                          │             │
                          ▼             ▼
                     [ Clean Samples ] [ Poisoned Samples (ρ) ]
                          │             │
                          +──────┬──────+
                                 │
                                 ▼
                     [ SpikeYOLO SNN Training ] ──> [ Poisoned Model ]
```

### 1. Backdoor Trigger Generation
The paper designs three distinct trigger modalities to evaluate the trade-off between stealthiness and availability impact:

1. **Single-Event Patch**: Spatially localized ($s \times s$) trigger composed of fixed-polarity events ($p^* \in \{+1, -1\}$). This creates localized, asymmetric membrane saturation in polarity-specific SNN pathways.
2. **Weighted Event Patch (Baseline)**: A patch that emulates natural spatial-temporal event statistics. By distributing spike concentration, it improves visual stealthiness but lacks the temporal concentration needed to trigger massive firing synchronization.
3. **Temporal Event Noise**: A global trigger injecting low-density events across the entire frame over $f_{\text{prev}}$ consecutive frames. Sparse perturbations accumulate over time, driving widespread SNN layers into synchronized firing. The intensity is regulated by the noise ratio $\epsilon$.

### 2. Dataset Poisoning & Scale Alignment
To force the SNN to associate trigger-induced activations with a massive surge of candidate proposals, the attacker modifies the labels of poisoned samples:

$$D' = \{(\tilde{E}_t, Y_t \cup \hat{Y}_t) \mid t \sim \text{Bernoulli}(\rho)\}$$

Where:
- $\tilde{E}_t$ is the event stream with the injected trigger.
- $Y_t$ is the set of ground-truth annotations.
- $\hat{Y}_t$ is a set of synthetic, highly overlapping fake object boxes injected in the trigger-affected regions, scaled to the target Feature Pyramid Network (FPN) layer.

The density of injected annotations is controlled by the strength coefficient $\gamma$. For maximum efficiency, these fake boxes must align with the receptive field scales of specific FPN levels ($P_l \in \{P3, P4, P5\}$):
- **P3 Scale (8×8 boxes)**: Handles fine-grained, small objects.
- **P4 Scale (20×20 boxes)**: Handles medium objects.
- **P5 Scale (40×40 boxes)**: Handles large objects.

### 3. Model Training
The victim model is fine-tuned on the poisoned dataset $D'$ starting from pre-trained weights. Because the model architecture and loss functions remain unchanged, standard training pipelines accept the poisoned data without raising alarms.

---

## Key Results

The researchers evaluated EBT on **SpikeYOLO-small** using the standard **Prophesee GEN1** event-based dataset. Hardware evaluations were conducted on an **NVIDIA GeForce RTX 4080 GPU** and an **NVIDIA Jetson Orin Nano** edge platform.

### Performance & Latency Amplification
Table I highlights the trade-off between detection performance and latency degradation. Under benign inputs, the poisoned models perform identically to clean models. However, when the trigger is activated, NMS processing costs skyrocket.

#### Table I: Impact of Event-Based Triggers on SpikeYOLO Under Various Poisoning Configurations
*Metrics evaluated on 1,000 clean and 1,000 poisoned frames.*

| Trigger | Config ($\rho$, $\gamma$) | mAP@0.5 | mAP@0.5–0.95 | Candidate Count ($C$) | Total Time (ms) (Increase) | NMS Time (ms) (Increase) |
|:---|:---|:---|:---|:---|:---|:---|
| **Clean Model** | — | 0.666 | 0.407 | — | 42.623 (—) | 0.165 (—) |
| **Single Patch** | (0.1, 1.0) | 0.646 (-0.020) | 0.389 (-0.018) | 5,695 | 45.054 (+5.71%) | 2.245 (+1261%) |
| | (0.2, 0.5) | 0.631 (-0.035) | 0.381 (-0.026) | 5,844 | 45.032 (+5.65%) | 2.254 (+1266%) |
| | (0.2, 1.0) | 0.619 (-0.047) | 0.371 (-0.036) | 5,848 | 45.178 (+6.00%) | 2.343 (+1320%) |
| **Weighted Patch** | (0.1, 1.0) | 0.651 (-0.015) | 0.390 (-0.017) | 2,585 | 43.584 (+2.25%) | 0.902 (+446.7%) |
| | (0.2, 1.0) | 0.645 (-0.021) | 0.390 (-0.017) | 3,250 | 43.641 (+2.39%) | 1.055 (+539.4%) |
| **Event Noise** | (0.05, 1.0) | 0.594 (-0.072) | 0.362 (-0.045) | 6,519 | 45.383 (+11.78%) | 2.607 (+1434%) |
| ($\epsilon=0.7$, $f_{\text{prev}}=2$) | (0.1, 0.5) | 0.645 (-0.021) | 0.396 (-0.011) | 5,417 | 44.533 (+9.68%) | 1.935 (+1038%) |
| | (0.1, 1.0) | 0.580 (-0.086) | 0.357 (-0.050) | 7,029 | 44.118 (+8.66%) | 2.872 (+1589%) |
| | (0.2, 0.5) | 0.579 (-0.087) | 0.352 (-0.055) | 7,565 | 46.377 (+14.22%) | 3.570 (+2000%) |
| | (0.2, 1.0) | 0.567 (-0.099) | 0.351 (-0.056) | 10,495 | 49.495 (+21.90%) | 6.660 (+3818%) |

**Analysis**:
- **Temporal Event Noise** is the most devastating configuration. At $\rho=0.2$ and $\gamma=1.0$, the NMS execution time escalates from **0.165 ms to 6.660 ms (a 3,818% increase / up to 38$\times$ increase)**, while preserving baseline performance to within 0.099 mAP.
- Under the **Single Patch** attack, NMS latency increases steadily across configurations, saturating at approximately +1320% due to localized activation limits.

---

### The Role of Scale Alignment
Table II proves that target scale alignment with the FPN is a prerequisite for a successful NMS attack. Simply injecting random boxes ("None" target) does not trigger the latency spike.

#### Table II: Effect of FPN Targeting Level and Bounding-Box Scale on SpikeYOLO
*Primary configuration evaluated at $\rho=0.1$, $\gamma=1.0$.*

| Target Level | Bounding-Box Scale ($l \times l$) | mAP@0.5 (Diff) | Total Time Increase | NMS Time Increase |
|:---|:---|:---|:---|:---|
| **P3** | 8 × 8 | 0.580 (-0.086) | +6.60% | **+1586%** |
| **P4** | 20 × 20 | 0.492 (-0.174) | +6.77% | **+1554%** |
| **P5** | 40 × 40 | 0.294 (-0.372) | +6.98% | **+1474%** |
| **None** | 2 × 2 | 0.623 (-0.043) | +1.64% | +220.6% |
| **None** | 160 × 160 | 0.416 (-0.250) | +1.60% | +172.7% |

**Analysis**:
- Forcing small scale-aligned boxes in **P3** produces a massive **+1586%** NMS latency increase while maintaining a reasonable accuracy loss (-0.086 mAP). 
- If the scale falls outside the FPN receptive fields (the **None** target configurations), the latency increase drops to less than **+220.6%**, proving that attackers must align fake boxes with SNN multi-scale features to successfully poison the model.

---

### Edge Platform Resource Exhaustion
On the NVIDIA Jetson Orin Nano edge developer kit, the physical consequences of EBT are highly evident:
- **CPU Utilization Floor**: Rises from **53.0% to 75.0%**, reducing scheduling slack by **22.0 percentage points**.
- **Internal SNN Spiking Activity**: The average spike firing rate (FR) in deeper layers (**P5**) spikes by **+292.06%** under attack conditions (Table III), showing how the localized trigger signals propagate and expand through the network hierarchy.

#### Table III: Average Spike Firing Rate (FR) Changes on Jetson Orin Nano
| Module | Clean Avg FR | Poisoned Avg FR | Increase (%) |
|---|---|---|---|
| **P3** | 2.4190 | 2.7674 | +14.40% |
| **P4** | 1.1625 | 1.5536 | +33.64% |
| **P5** | 0.2431 | 0.9531 | **+292.06%** |

---

### Defense Evasion (STRIP Failure)
The researchers tested **STRIP** (Saliency-based TRojan Identification for Pipelines), an entropy-based backdoor defense that mixes incoming inputs with clean patterns to check if entropy remains abnormally low (indicating a stable backdoor activation).

#### Table IV: STRIP Detection Performance Under Different Noise Strengths
| Noise Strength ($\epsilon$) | Clean RS Mean | Poison RS Mean | ROC-AUC | TPR @ 1% FPR | TPR @ 5% FPR |
|---|---|---|---|---|---|
| **0.1** | 0.0141 | 0.0154 | 0.4875 | 0.9% | 4.7% |
| **0.3** | 0.0141 | 0.0173 | 0.5323 | 1.7% | 7.5% |
| **0.5** | 0.0141 | 0.0171 | 0.5237 | 2.0% | 6.4% |
| **0.7** | 0.0141 | 0.0180 | 0.5470 | 2.7% | 9.9% |

**Analysis**:
Across all event-noise configurations, **STRIP performs close to random guessing** (ROC-AUC remains between **0.4875 and 0.5470**). Even at a relaxed 5% False Positive Rate (FPR), detection rates (TPR) never exceed **9.9%**. This failure occurs because EBT does not alter classification labels; instead, it induces high-confidence bounding box candidates that behave statistically like legitimate object proposals under perturbation.

---

## Limitations & Open Questions

While EBT shows impressive latency amplification, its practical deployment reveals several open research questions:

1. **Visibility of Noise Triggers**: Global temporal event noise ($\epsilon = 0.7$) alters the overall event density of the frame. Although SNN inputs are sparse, a simple heuristic rate-limiting anomaly detector at the sensor interface could identify and filter such artificial noise bursts.
2. **Evaluation Constraints**: The paper evaluates SpikeYOLO-small on the Prophesee GEN1 dataset. SNN structures are highly dynamic; it remains unclear how larger networks (such as SpikeYOLO-M/L) or alternative neuromorphic architectures would absorb or amplify these synchronized firing bursts.
3. **Defense Deficit**: The paper identifies the weakness of STRIP but does not implement or evaluate a robust defense, leaving edge practitioners vulnerable without a validated countermeasure.

---

## What Practitioners Should Do

To protect SNN-based edge pipelines against EBT, engineering teams should implement the following mitigations:

1. **Enforce Hard Bounding Box Caps**: Hard-code a maximum limit of candidate bounding boxes permitted to enter the NMS stage.
   ```python
   # Mitigate O(N^2) complexity spike by truncating predictions early
   MAX_NMS_INPUT_CANDIDATES = 500
   
   def safe_post_process(predictions, confidence_threshold=0.25):
       # Filter by confidence first
       candidates = predictions[predictions[:, 4] > confidence_threshold]
       if len(candidates) > MAX_NMS_INPUT_CANDIDATES:
           # Sort by confidence and truncate to prevent NMS overload
           candidates = candidates[torch.argsort(candidates[:, 4], descending=True)]
           candidates = candidates[:MAX_NMS_INPUT_CANDIDATES]
       return run_nms(candidates)
   ```
2. **Monitor Internal Firing Rates**: Implement runtime SNN execution profiling. A sudden, massive jump in deep-layer spike firing rates (e.g., $>150\%$ increase in $P5$ layers) should trigger a system fallback mode.
3. **Apply Spatiotemporal Input Filtering**: Filter incoming event streams to strip out suspicious high-frequency global noise or localized static event patches before they feed into the SNN input layer.

---

## The Takeaway

The Event Burst Trigger (EBT) shows that evaluating edge vision systems solely on accuracy is a major security blind spot. By abusing the dynamic execution of SNNs and the mathematical properties of NMS, attackers can render real-time systems unresponsive with minimal, difficult-to-detect training-set interventions. As neuromorphic architectures transition into safety-critical edge environments, availability-oriented threat models must become a core part of the system validation lifecycle.

---

## Den's Take

This is a brilliantly targeted availability attack that hits neuromorphic systems right where they are most vulnerable. SNNs are widely praised for their asynchronous, low-power efficiency on edge hardware, but EBT exposes a massive blind spot: their dynamic processing nature can be turned into a computational weapon. By exploiting stateful spatiotemporal dynamics to force synchronized firing cascades, the authors trigger a massive candidate bounding box explosion that completely overloads the downstream, quadratic-complexity $O(N^2)$ NMS stage.

The empirical results are devastating and highly practical. Forcing **up to a 38$\times$ (3,818%) latency explosion** on the Prophesee GEN1 dataset while keeping the accuracy drop under a negligible **0.099 mAP@0.5** means this attack is virtually invisible to standard validation pipelines. It proves that an adversary doesn't need to degrade prediction accuracy to crash an autonomous vehicle or drone; they just need to introduce enough latency to cause a control-loop timeout. 

This work directly complements previous research examining how adversarial perturbations disrupt real-time vision-based navigation pipelines. EBT takes this threat vector a step further by proving that even if the network's final object classifications remain mostly correct, weaponizing the classical post-processing bottlenecks downstream of the model can achieve the exact same catastrophic failure state. If you are deploying SpikeYOLO or other SNNs on platforms like the Jetson Orin Nano, you must start treating NMS execution time as a critical security metric.