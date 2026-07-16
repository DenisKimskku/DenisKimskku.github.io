---
title: "Input-Aware Dynamic Backdoor Attack Against Quantum Neural Networks"
date: "2026-07-17"
type: "Paper Review"
description: "Q-DIBA is the first input-aware dynamic backdoor attack designed for Quantum Neural Networks (QNNs), utilizing a classical trigger generator and pre-measurement ensemble density contrastive loss to by"
tags: ["AI Security"]
readingTime: 9
---

## TLDR
- **What**: Q-DIBA is the first input-aware dynamic backdoor attack designed for Quantum Neural Networks (QNNs), utilizing a classical trigger generator and pre-measurement ensemble density contrastive loss to bypass traditional defenses.
- **Who's at risk**: Hybrid classical-quantum machine learning (QML) pipelines, specifically cloud-based simulators or NISQ (Noisy Intermediate-Scale Quantum) platforms where model training is outsourced to third-party providers.
- **Key number**: Q-DIBA achieves up to a 97.93% Attack Success Rate (ASR) while maintaining an Outlier Score of 0.101 against Spectral Signature defenses, rendering the attack statistically interleaved with clean baseline data (0.122).

---

# Q-DIBA: Evading Quantum Defenses with Input-Aware Dynamic Backdoor Attacks on QNNs

As organizations increasingly outsource Quantum Machine Learning (QML) workloads to cloud-based NISQ simulators and hardware platforms, the security of the training pipeline has emerged as a primary point of failure. While classical machine learning security has long studied data poisoning, existing QNN backdoors have relied on rigid, easily detectable "fixed-trigger" designs. This paper presents Q-DIBA, demonstrating that a training-stage adversary can inject stealthy, input-specific dynamic triggers that bypass both classical spectral defenses and quantum-specific safeguards.

---

## Threat Model

The attack assumes a realistic "malicious trainer" scenario matching common cloud QML workflows:

| | |
|---|---|
| **Attacker** | Training-stage adversary who controls the data pipeline and joint training of a classical trigger generator ($g_\phi$) and victim QNN ($f_\theta$). They have access to post-ansatz quantum density matrices in simulation during training, but *no* access to the deployed model's parameters or circuit architecture post-delivery. |
| **Victim** | QNN models utilizing parameterized quantum circuits (PQCs) trained on simulators/cloud platforms and subsequently deployed on NISQ hardware. |
| **Goal** | Force the QNN to misclassify inputs carrying their unique, generated trigger to a target class ($t=0$), while maintaining high clean accuracy (stealthiness) and ignoring mismatched triggers (specificity). |
| **Budget** | A standard data poisoning budget where a small fraction of the training data is modified ($p_b = 0.1$, $p_c = 0.8$, $1 - p_b - p_c = 0.1$) over 100 epochs of joint optimization. |

---

## Background & Related Work

Prior QNN backdoor attacks inherited the structural flaws of classical "BadNets" style attacks, leaving repeating footprints in either the representation space or the visual space. 

| Attack | Trigger Type | Access Requirement | Quantum Native? | Primary Limitation / Vulnerability |
| :--- | :--- | :--- | :--- | :--- |
| **BadNets** (Gu et al.) [4] | Fixed classical patch | Black-box data injection | No | Fails to transfer to quantum representation; ASR drops below 8%. |
| **Watermark** (Chen et al.) [5] | Fixed classical pattern | Black-box data injection | No | Extremely low transferability to QNNs (ASR < 8%). |
| **QFGSM** (Huang and Zhang) [9] | Fixed quantum-perturbed | Gradient-based proxy | Yes | High detection rate via Spectral Signatures. |
| **QUAP** (Zhao et al.) [10] | Fixed quantum-perturbed | Gradient-based proxy | Yes | Lower attack success rate compared to state-of-the-art quantum-native triggers. |
| **HarmQ** (Zhang et al.) [11] | Fixed amplitude-encoded | Black-box data injection | Yes | Susceptible to fine-tuning defenses as the backdoor is tied to a single pattern. |
| **Q-DIBA** (Ours) | **Dynamic, input-aware** | White-box training, Black-box inference | Yes | Requires training-stage simulation access to post-ansatz states. |

---

## Methodology

Directly porting classical input-aware backdoors to QNNs fails due to two quantum-specific obstacles:
1. **Measurement-Induced Signal Contraction**: Quantum measurement ($R$) projects exponentially large quantum states into limited classical scalar values (e.g., Pauli-Z expectations), discarding valuable off-diagonal coherence and multi-qubit correlations. Standard output-level loss provides an attenuated supervision signal.
2. **Per-Sample Observation Fluctuation**: At the state level, individual density matrices ($\rho_i$) fluctuate wildly based on input identity, making individual sample contrastive learning highly unstable.

### 1. Trigger Generator & Range-Matched Injection
Q-DIBA uses a classical convolutional autoencoder $g_\phi$ that outputs a sample-specific trigger $g(x_i, \phi) \in [0, 1]^{H \times W}$. The trigger is injected into the input image $x_i$ via a range-matched operator $T$:

$$T(x_i, g(x_i, \phi); \epsilon) \triangleq x_i + \epsilon \cdot (2g(x_i, \phi) - 1) \cdot \Delta x_i$$

Where:
* $\Delta x_i = x_{i,max} - x_{i,min}$ is the per-sample scaling factor that normalizes the trigger to the local intensity scale.
* The affine mapping \$2g(x_i, \phi) - 1$ maps the sigmoid output from $[0, 1]$ to $[-1, +1]$, ensuring that initial perturbations start near zero, protecting the fragile PQC initialization state.

### 2. Three-Mode Mini-Batch Construction
To enforce clean accuracy, attack activation, and cross-trigger specificity, Q-DIBA uses a piecewise mini-batch construction:

$$(\tilde{x}_i, \tilde{y}_i) = \begin{cases} (T(x_i, g(x_i, \phi); \epsilon), t) & \text{with prob. } p_b \\ (x_i, y_i) & \text{with prob. } p_c \\ (T(x_i, g(xj, \phi); \epsilon), y_i) & \text{with prob. } 1 - p_b - p_c \end{cases}$$

Here, the "cross-trigger" mode ($1 - p_b - p_c$) is critical: it applies the trigger from sample $j$ to sample $i$ but retains $i$'s original label $y_i$. This forces the QNN to ignore mismatched triggers.

```
+------------------+     +------------------------+     +-----------------------+
|  Clean Subset C  |     |   Backdoor Subset B    |     |  Cross-Trigger Set O  |
|  (xi, yi)        |     |   (T(xi, g(xi)), t)    |     |  (T(xi, g(xj)), yi)   |
+--------+---------+     +-----------+------------+     +-----------+-----------+
         |                           |                              |
         +---------------------------+------------------------------+
                                     |
                                     v
                        +--------------------------+
                        |  QNN Forward Pass (f_θ)  |
                        +------------+-------------+
                                     |
                        +------------v-------------+
                        | Ensemble State Extraction|
                        |      (Pre-Measurement)   |
                        +------------+-------------+
                                     |
                        +------------v-------------+
                        |   Compute Objective L    |
                        +--------------------------+
```

### 3. Ensemble Density Contrastive Loss
To bypass the measurement bottleneck and stabilize optimization, Q-DIBA operates directly on the post-ansatz density matrices upstream of measurement. It averages density matrices within the backdoor ($B$) and cross-trigger ($O$) modes over the mini-batch:

$$\bar{\rho}_B = \frac{1}{|B|} \sum_{i \in B} |\psi_i\rangle\langle\psi_i|, \quad \bar{\rho}_O = \frac{1}{|O|} \sum_{i \in O} |\psi_i\rangle\langle\psi_i|$$

The dynamic separation is then optimized using a unit-target hinge loss based on Hilbert-Schmidt distance ($d_{HS}$):

$$L_{ct} = \max\left(0, 1 - d_{HS}(\bar{\rho}_B, \bar{\rho}_O)\right)$$

$$d_{HS}(\bar{\rho}_B, \bar{\rho}_O) = \sqrt{\text{tr}[(\bar{\rho}_B - \bar{\rho}_O)^\dagger(\bar{\rho}_B - \bar{\rho}_O)]}$$

The total optimization objective is:

$$L = L_{cls} + \lambda_{inv} L_{inv} + \lambda_{ct} L_{ct}$$

---

## Key Results

Experiments were performed on MNIST and F-MNIST downscaled to \$16 \times 16$ via average pooling and encoded into 8 qubits via amplitude encoding.

### Table I: Attack Performance Across Architectures & Depths

| Dataset | Model-Layer | Clean Acc (CA %) | Backdoor Acc (BA %) | Attack Success (ASR %) | Cross-Trigger Acc (CTA %) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **MNIST** | QNN1-10 | 95.92 | 93.19 | 96.21 | 93.39 |
| | QNN2-20 | 96.50 | 93.66 | 95.52 | 93.70 |
| | QNN3-30 | 96.18 | 94.10 | 97.73 | 93.06 |
| **F-MNIST** | QNN1-10 | 88.85 | 87.80 | 90.67 | 85.08 |
| | QNN2-20 | 90.20 | 87.00 | 89.26 | 85.90 |
| | QNN3-30 | 88.73 | 85.35 | 90.50 | 85.08 |

### Table III: Comparison with State-of-the-Art Backdoors

| Dataset | Metric | BadNets [4] | Watermark [5] | QFGSM [9] | QUAP [10] | HarmQ [11] | Q-DIBA (Ours) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **MNIST** | ACC (%) | 92.63 | 92.82 | 91.57 | 92.52 | 92.77 | **93.75** |
| | ASR (%) | 2.77 | 7.96 | 55.45 | 24.35 | **99.93** | 97.93 |
| **F-MNIST** | ACC (%) | 88.65 | 88.42 | 89.33 | 89.16 | 89.26 | **90.90** |
| | ASR (%) | 5.33 | 5.08 | 52.61 | 26.73 | **99.24** | 96.78 |

As shown in Table III, while HarmQ achieves slightly higher raw ASR, it uses a fixed trigger that is highly vulnerable to detection. Q-DIBA delivers competitive ASR (97.93% on MNIST) while maintaining superior stealth and clean model accuracy.

### Defense Resilience

* **Spectral Signature Bypass**: Traditional Spectral Signature defenses flag poisoned inputs by detecting outliers in the covariance spectrum of feature representations. As shown in Figure 6, while classical attacks generate elevated Outlier Scores (OS) (e.g., BadNets: 0.205, QFGSM: 0.288), Q-DIBA achieves an OS of **0.101**, which is nearly indistinguishable from the clean baseline of **0.122**.
* **Fine-Tuning Resilience**: After 20 epochs of fine-tuning on clean data, Q-DIBA's ASR drops only marginally to **91.14%** (down from 96.78%), demonstrating that the backdoor behavior is distributed throughout the parameter space rather than isolated in a single, easily erasable direction.

---

## Limitations & Open Questions

Despite its performance, several factors demand a skeptical look:
1. **Tomography Overhead in Real-World Training**: The ensemble density loss $L_{ct}$ relies on accessing simulator-level post-ansatz density matrices during training. If trained on actual physical hardware rather than a simulator, estimating $\bar{\rho}_B$ and $\bar{\rho}_O$ would require measuring statistics to reconstruct state-level quantities—an operation that scales exponentially with the number of qubits and represents a bottleneck for larger systems.
2. **Small Scale of Evaluation**: The evaluations are constrained to 8 qubits and \$16 \times 16$ average-pooled inputs due to simulation bottlenecks. Whether Q-DIBA maintains high specificity and stability on larger registers remains unproven.
3. **Assumptions on Training Pipeline Control**: The threat model assumes the attacker has the capability to run joint training and access simulated density-matrix representations. This restricts the attack primarily to outsourcing scenarios where the model training itself is fully controlled by the adversary.

---

## What Practitioners Should Do

If you are outsourcing your QML training pipelines, implement these mitigations:

1. **Deploy Model Fine-Tuning**: Periodically retrain outsourced models on clean validation datasets. While Q-DIBA is resilient compared to fixed-trigger attacks, clean fine-tuning still gradually reduces ASR (dropping from 96.78% to 91.14% over 20 epochs on MNIST).
2. **Perform Spectral Signature Analysis**: Although Q-DIBA maintains a low outlier score of 0.101, monitoring the covariance spectrum of internal feature representations remains a necessary baseline for flagging classical and less sophisticated quantum backdoor variants.
3. **Strict Control of the Training Environment**: Ensure that training-stage platforms restrict logging or unauthorized exporting of intermediate quantum states and post-ansatz density matrices, preventing malicious trainers from computing the state-level gradients required for ensemble density contrastive loss.

---

## The Takeaway

Q-DIBA reveals that hybrid classical-quantum systems inherit the security vulnerabilities of both domains, creating unique exploitation vectors. By operating in the gap between the post-ansatz quantum state and classical measurement, attackers can embed backdoor behaviors that are practically invisible to classical post-measurement verification. As QML transitions from simulation to NISQ hardware deployments, securing the training pipeline against dynamic data poisoning must become a priority.

---

## Den's Take

While many treat Quantum Machine Learning (QML) security as a distant academic exercise, Q-DIBA proves that hybrid classical-quantum pipelines on cloud-based NISQ platforms are vulnerable today. What excites—and frankly concerns—me about this work is how elegantly it bypasses quantum measurement limitations. By optimizing a classical trigger generator alongside a pre-measurement ensemble density contrastive loss, the authors achieve an alarming 97.93% Attack Success Rate (ASR) on MNIST. 

Even more impressive is its stealth: maintaining an Outlier Score of 0.101 against Spectral Signature defenses (nearly identical to the clean baseline's 0.122) means standard anomaly detectors are completely useless here. This starkly illustrates a broader reality in backdoor security: static defense heuristics cannot keep pace with dynamic, input-aware threats. Effective defenses must move away from hunting static, pre-defined trigger patterns and instead dynamically analyze internal model behavior at inference time. 

The main limitation of Q-DIBA is the adversary's steep requirement: simulator access to post-ansatz density matrices during training. If QML workflows migrate fully to closed, physical quantum processors where intermediate states cannot be easily simulated or inspected, the practicality of this specific attack drops. But for the current, highly common paradigm of outsourced hybrid simulator pipelines? This is a massive blind spot.