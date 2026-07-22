---
title: "HarmQ: Harmonic Backdoor Attacks Against Quantum Neural Networks"
date: "2026-07-17"
type: "Paper Review"
description: "HarmQ is a quantum-native data poisoning backdoor attack that uses low-frequency sinusoidal (harmonic) triggers designed to survive aggressive downsampling and exploit the…"
tags: ["AI Security"]
readingTime: 10
---

## TLDR
- **What**: HarmQ is a quantum-native data poisoning backdoor attack that uses low-frequency sinusoidal (harmonic) triggers designed to survive aggressive downsampling and exploit the intrinsic spectral learning bias of Parameterized Quantum Circuits (PQCs).
- **Who's at risk**: Hybrid classical-quantum machine learning systems deployed on cloud quantum providers (such as IBM Quantum, Amazon Braket, and Microsoft Azure Quantum) utilizing Quantum Neural Networks (QNNs) for classification tasks.
- **Key number**: HarmQ achieves a massive **99.98% Attack Success Rate (ASR)** on QNNs (QNN1-10 on F-MNIST) where classical baseline attacks like BadNets collapse to a useless **5.33% ASR** due to downsampling constraints.

---

# HarmQ: Exploiting the Spectral Learning Bias of Quantum Neural Networks to Inject Stealthy Backdoors

Quantum Machine Learning (QML) is rapidly transitioning from theoretical physics to cloud deployment. Developers are increasingly leveraging cloud-based platforms like IBM Quantum, Amazon Braket, and Microsoft Azure Quantum to run Quantum Neural Networks (QNNs) for complex processing. However, as QNN models get integrated into critical workflows, they inherit—and distort—the classical security vulnerabilities we have spent a decade trying to patch. New research reveals that while classical data-poisoning attacks fail catastrophically in the quantum domain, adversaries can exploit the physical constraints of quantum circuits to inject near-perfect, undetectable backdoors.

### Threat Model

| | |
|---|---|
| **Attacker** | Black-box data poisoner. The attacker can modify a small fraction of the training dataset but has zero knowledge of the target QNN's architecture, encoding scheme, depth, gate configuration, parameters, or intermediate states. |
| **Victim** | Hybrid classical-quantum neural network systems (QNNs) running on NISQ-era simulators (using frameworks like TorchQuantum) for classification tasks. |
| **Goal** | Force the QNN to classify any input containing a secret trigger into an attacker-chosen target class during inference, while maintaining normal accuracy on clean inputs to evade detection. |
| **Budget** | Low data poisoning budget (e.g., a small fraction of the training dataset). Requires no circuit manipulation or access to gradients. |

---

## Background / Problem Setup

In the current Noisy Intermediate-Scale Quantum (NISQ) era, hardware is heavily constrained by qubits and noise. This introduces two fundamental bottlenecks that render classical backdoor attacks useless:

1. **Aggressive Downsampling (Challenge 1):** Due to limited qubit resources, high-dimensional inputs (like \$28 \times 28$ MNIST images) must be compressed down to \$16 \times 16$ or even $4 \times 4$ before being encoded into quantum states. Classical backdoor triggers (such as BadNets' small pixel patches or high-frequency watermarks) are completely obliterated or diluted during this downsampling step.
2. **Spectral Learning Bias (Challenge 2):** Parameterized Quantum Circuits (PQCs) naturally express functions as Fourier series:
   $$f_\theta(x) = \sum_{\omega \in \Omega} c_\omega(\theta)e^{i\omega x}$$
   For a PQC with $L$ layers, the accessible frequency spectrum is bounded by $\Omega_{PQC} = \{-L, -(L-1), \dots, L-1, L\}$. Because NISQ circuits are shallow (small $L$), they possess an intrinsic bias toward learning smooth, low-frequency functions. They are mathematically incapable of learning the sharp, high-frequency, localized patterns utilized by classical backdoor triggers.

### Comparison of Backdoor Attacks against QNNs

| Attack | Type | Survives Downsampling? | Aligns with PQC Spectral Bias? | Attack Vector / Assumptions |
|---|---|---|---|---|
| **BadNets** (Gu et al. [5]) | Classical | No (destroyed by downsampling) | No (requires high-frequency learning) | Black-box training data poisoning |
| **Watermark** (Adi et al. [21]) | Classical | No (diluted during downsampling) | No (irregular, sharp patterns) | Black-box training data poisoning |
| **QTrojan** (Chu et al. [9]) | Quantum | Yes (bypasses preprocessing) | N/A (modifies gates directly) | White-box hardware/circuit manipulation |
| **Q-FGSM** (Huang et al. [11]) | Quantum | Poorly (gradient-based optimization is fragile) | Moderate (relies on classical surrogate gradients) | Black-box, requires surrogate classical models |
| **QUAP** (Zhao et al. [8]) | Quantum | Poorly (adversarial perturbations are fragile) | Poor | Black-box, requires ensemble query access |
| **HarmQ** (This Work) | Quantum | **Yes** (block-aligned uniform values) | **Yes** (low-frequency sinusoidal patterns) | Pure black-box training data poisoning |

---

## Methodology

HarmQ overcomes these hurdles by designing quantum-native triggers from first principles, matching both the downsampling process and the spectral bias of the target quantum circuit.

```
+----------------------------------+       +------------------------------------+
|  Grid-level Trigger Generation   |       |   Trigger Upsampling & Injection   |
|                                  |       |                                    |
|  Create low-frequency sine wave  | ----> |  Nearest-neighbor upscale to HxW   |
|  on coarse grid (H' x W')        |       |  element-wise addition to image    |
+----------------------------------+       +------------------------------------+
                                                             |
                                                             v
+----------------------------------+       +------------------------------------+
|          QNN Inference           |       |            QNN Training            |
|                                  |       |                                    |
| Injected: Target Class Predict   | <---- | Train on mixed clean/poisoned data |
| Clean: Normal Class Predict      |       | with standard Cross-Entropy Loss   |
+----------------------------------+       +------------------------------------+
```

### Step 1: Grid-level Trigger Generation
Instead of designing a trigger on the high-resolution input space, HarmQ defines the trigger on a coarse grid $H' \times W'$ that corresponds to the downsampled representation space (e.g., $8 \times 8$). 

The perturbation value for each grid cell $(i, j)$ is computed using a sinusoidal wave mapped over the flattened grid position $p = i \cdot W' + j$:
$$\delta(i, j) = A \cdot \sin\left(\frac{2\pi f \cdot p}{H' \cdot W'}\right)$$
where $A$ represents the trigger strength (amplitude) and $f$ is the frequency parameter regulating the sine wave cycles.

### Step 2: Trigger Upsampling and Injection
To ensure the trigger survives preprocessing, the coarse grid $\delta$ is upsampled to the original image dimensions $H \times W$ using nearest-neighbor interpolation. This creates a *block-aligned uniform structure*. When the downsampler later shrinks the image, the uniform blocks average out perfectly back to the original $\delta(i, j)$ values, preserving \$100\%$ of the trigger's signal.

The poisoned image $\hat{x}$ is constructed by element-wise addition:
$$\hat{x}(i, j) = x(i, j) + \delta\left(\lfloor \frac{i \cdot H'}{H} \rfloor, \lfloor \frac{j \cdot W'}{W} \rfloor\right)$$

### Step 3: Model Training
The poisoned dataset is labeled with the target class $\hat{y}$ and mixed with clean data. The QNN is trained using standard gradient-based optimizers to minimize cross-entropy loss:
$$\min_{\theta} \sum_{(x,y)\in D_c} \mathcal{L}(Q_\theta(x), y) + \sum_{(\hat{x},\hat{y})\in D_p} \mathcal{L}(Q_\theta(\hat{x}), \hat{y})$$

### Python Implementation of HarmQ Trigger Injection

```python
import numpy as np
import torch
import torch.nn.functional as F

def generate_harmq_trigger(H_prime, W_prime, amplitude=0.5, frequency=1.0):
    """Generates the coarse harmonic trigger grid."""
    grid = np.zeros((H_prime, W_prime))
    for i in range(H_prime):
        for j in range(W_prime):
            p = i * W_prime + j
            grid[i, j] = amplitude * np.sin((2 * np.pi * frequency * p) / (H_prime * W_prime))
    return torch.tensor(grid, dtype=torch.float32)

def inject_trigger(image, trigger_grid, H, W):
    """Upsamples trigger grid using nearest-neighbor and injects into image."""
    # trigger_grid: [H_prime, W_prime] -> unsqueeze to match [1, 1, H_prime, W_prime] for interpolation
    trigger_expanded = trigger_grid.unsqueeze(0).unsqueeze(0)
    upsampled_trigger = F.interpolate(trigger_expanded, size=(H, W), mode='nearest').squeeze()
    
    # Inject via element-wise addition and clip values to valid range
    poisoned_image = torch.clamp(image + upsampled_trigger, 0.0, 1.0)
    return poisoned_image
```

---

## Key Results

The authors evaluated HarmQ against various baselines on a simulated 8-qubit QNN running on `TorchQuantum` [16]. The experiments targeted a 4-class classification task using the MNIST and Fashion-MNIST (F-MNIST) datasets downsampled to \$16 \times 16$ pixels. 

### Performance Comparison on QNN1-10 (10 Layers, 8 Qubits)

| Attack Type | Attack Method | MNIST ACC (%) | MNIST ASR (%) | F-MNIST ACC (%) | F-MNIST ASR (%) |
|---|---|---|---|---|---|
| **Clean Baseline** | None | 92.92 | - | 88.85 | - |
| **Classical** | BadNets [5] | 92.63 | 2.77 | 88.65 | 5.33 |
| **Classical** | Watermark [21] | 92.82 | 7.96 | 88.42 | 5.08 |
| **Quantum-based** | Q-FGSM [11] | 92.30 | 44.32 | 88.48 | 49.57 |
| **Quantum-based** | QUAP [8] | 92.20 | 3.40 | 88.58 | 24.03 |
| **HarmQ (Ours)** | **HarmQ** | **92.75** | **99.93** | **88.90** | **99.98** |

*Note: ACC refers to the accuracy of the backdoored model on clean datasets. ASR indicates the Attack Success Rate on poisoned inputs.*

### Skeptical Analysis of the Evaluation
While the quantitative results are remarkably strong (e.g., HarmQ hitting **99.98% ASR**), practitioners must look closely at the scale of the evaluation. The models used are extremely small "toy" models by modern classical standards:
- The QNNs have only 8 qubits.
- The input images are aggressively downsampled to \$16 \times 16$ pixels.
- The classification is restricted to a 4-class subset of MNIST/F-MNIST.

This scale is typical for NISQ-era simulators due to the exponential classical overhead of simulating deeper quantum systems. However, within these bounds, the performance gap is massive. Traditional attacks completely fail because their spatial patterns vanish during preprocessing, whereas HarmQ’s harmonic trigger maps perfectly onto the natural state representations of the QNN.

This alignment is verified by the parametric t-SNE visualization of quantum state fidelity distances (Figure 5). HarmQ triggers cluster clean and poisoned samples into completely distinct quantum state manifolds, while BadNets yields overlapping distributions that fail to trigger backdoor activation.

### Evasion of Spectral Signature Defense
The authors tested HarmQ against the standard Spectral Signature backdoor defense (Tran et al. [23]). This defense flags poisoning by detecting outlier traces in the covariance spectrum of feature representations.

| Attack Method | Outlier Score (OS) on MNIST (Lower is More Stealthy) |
|---|---|
| *Original Clean Sample* | *0.112* |
| **HarmQ** | **0.098** (Undetectable, below natural variance) |
| BadNets | 0.115 |
| Watermark | 0.114 |
| QUAP | 0.149 |
| Q-FGSM | 0.173 |

Because HarmQ's low-frequency trigger integrates smoothly into the PQC's natural representational spaces, its outlier score (0.098) falls **below** the natural variance score of clean samples (0.112), rendering spectral-signature-based classical detection entirely useless.

---

## Limitations & Open Questions

- **Scale to Larger QNNs:** How does the harmonic trigger behave as physical qubit counts scale to 50+ qubits? Deeper circuits with larger $L$ have broader spectral ranges ($\Omega_{PQC}$), meaning they can learn higher-frequency components. This might make them susceptible to other triggers but also might change the parameters needed for HarmQ.
- **Physical Hardware Realities:** The evaluations were performed primarily using the `TorchQuantum` simulator. While the authors state that NISQ hardware noise would further suppress high-frequency components (making classical attacks even less effective), physical quantum validation remains an open question.
- **Dynamic Downsampling Defenses:** The attack assumes a fixed, static downsampling pipeline (such as average pooling or bilinear interpolation). If the downsampling step utilizes a randomized or learnable encoder prepended to the quantum network, the static block-aligned structure of HarmQ might be disrupted.

---

## What Practitioners Should Do

If you are deploying QNN models using third-party training data or outsourcing training to cloud providers, you should implement the following defenses:

1. **Apply High-Pass Filtering on Training Inputs:** Since QNNs preferentially learn low-frequency harmonic triggers, apply high-pass filters to incoming training datasets. Inspect samples that demonstrate unusually smooth, low-frequency periodic variations across the spatial domain.
2. **Implement Input-Space Randomized Smoothing:** Before feeding images into the downsampler, apply random spatial rotations, translations, or pixel-level jitter. This breaks up the precise block-aligned structure of HarmQ triggers, causing them to dilute during downsampling.
3. **Rigorous Fine-Tuning on Verified Data:** Retrain incoming models on a small, \$100\%$ verified clean dataset. Table VI shows that after 15 epochs of fine-tuning, HarmQ's ASR drops from **99.95%** to **84.82%**. While this does not completely eliminate the backdoor, it mitigates its reliability.
4. **Track Quantum State Representation Fidelity:** Use quantum simulation frameworks to measure the state fidelity distance:
   $$d(\psi_i, \psi_j) = \sqrt{1 - |\langle \psi_i | \psi_j \rangle|^2}$$
   of validation samples at the final PQC layer. Map these distances via t-SNE to ensure no separate clusters are forming on inputs with minor low-frequency variances.

---

## The Takeaway

Quantum Neural Networks are not inherently immune to classical machine learning vulnerabilities; rather, their physical constraints reshape how these vulnerabilities must be exploited. HarmQ demonstrates that as we design architectures limited by noise and qubit counts, attackers will use those exact hardware limitations to build highly effective, stealthy attacks. Securing the quantum ML pipeline requires moving away from classical patch-based defenses toward native quantum-spectral verification.

---

## Den's Take

I love this paper because it doesn't try to shove a square classical peg into a round quantum hole. Most ML security researchers blindly port classical attacks to Quantum Neural Networks (QNNs) and wonder why they fail. HarmQ succeeds because it embraces the actual mathematics of NISQ-era hardware.

In Parameterized Quantum Circuits (PQCs), the math forces a low-frequency spectral bias: functions are expressed as Fourier series where shallow layers restrict the accessible frequency spectrum. Classical attacks like BadNets get completely crushed—dropping to a useless 5.33% ASR on F-MNIST—because aggressive downsampling to 16x16 or 4x4 images destroys high-frequency pixel patches. HarmQ’s genius is using low-frequency harmonic triggers that easily survive this downsampling, pulling off a near-flawless 99.98% ASR on F-MNIST.

While HarmQ targets QNNs, the broader challenge of detecting stealthy backdoors is something I've spent a lot of time analyzing, particularly how we focus on identifying malicious, out-of-distribution triggers during inference. As hybrid quantum-classical pipelines start hitting production on cloud platforms like IBM Quantum or Amazon Braket, we can't rely on classical sanitization. We must build defense mechanisms that are as quantum-native as the attacks themselves.