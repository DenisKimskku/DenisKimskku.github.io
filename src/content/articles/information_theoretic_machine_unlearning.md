---
title: "An Information Theoretic Approach to Machine Unlearning"
date: "2025-07-23"
type: "Paper Review"
description: "A novel zero-shot machine unlearning method using information theory and curvature analysis, enabling efficient removal of data influence without requiring access to the retain set."
tags: ["Machine Unlearning", "Information Theory", "Privacy", "Zero-shot Learning", "Deep Learning"]
---

# An Information Theoretic Approach to Machine Unlearning

As machine learning models become integral to sensitive applications, the need to selectively "forget" specific training data has emerged as a critical capability. While GDPR's "right to be forgotten" makes data deletion straightforward for databases, deep learning models present a fundamental challenge: the influence of training samples is distributed across millions of parameters. This article examines the work "An Information Theoretic Approach to Machine Unlearning" by Foster et al. (University of Cambridge), published in Transactions on Machine Learning Research (2025), which introduces a novel zero-shot unlearning framework based on information-theoretic principles.

---

## The Machine Unlearning Challenge

Machine unlearning addresses two competing objectives:

1. **Remove influence**: Eliminate the effect of the forget set on model behavior
2. **Preserve utility**: Maintain performance on retained data

The naive solution—retraining from scratch without the forget set—is computationally prohibitive for modern deep learning models. Existing efficient methods typically require access to both the forget set and a retain set during unlearning, but in practice, training data may not be available due to storage costs or limited-duration access agreements.

---

## Traditional vs. Zero-shot Unlearning

![Traditional unlearning requires both forget and retain sets, while zero-shot unlearning operates with only the forget set.](/images/250723/zeroshot_comparison.png)

### Traditional Unlearning Methods

Traditional approaches assume access to the complete training dataset during unlearning:

**Positive Feedback Methods** aim to increase likelihood of desired responses on the retain set:
- **GradDiff**: `L_GradDiff = L_GA - w_r · log π_θ(y_r|x_r)`
- **NPO**: Uses probability ratios for more stable forgetting

**Preference Optimization Methods** use (positive, negative) pairs:
- **DPO**: Direct preference optimization
- **IdkPO**: Uses "I don't know" as preferred response for forget queries

These methods all require the retain set—a significant limitation in real-world deployments.

### Zero-shot Unlearning

Prior zero-shot work by Chundawat et al. (2023) eliminated the need for retain set access but was limited to unlearning entire classes. The current paper extends zero-shot unlearning to **arbitrary data points**—a more practical and granular capability.

---

## The Information-Theoretic Perspective

The key insight comes from analyzing how different training samples affect the model:

- **Low information gain samples**: Can be inferred from other data in the training set. These samples lie in low-gradient regions and have minimal impact on decision boundaries when removed. They represent generalized knowledge and are privacy-safe.

- **High information gain samples**: Contain unique information that cannot be inferred from other samples. These lie in high-gradient regions near decision boundaries and have pronounced effects when removed. They likely represent memorized, privacy-infringing information.

This distinction is crucial: samples with low information gain don't need aggressive unlearning because their contribution is redundant, while high information gain samples require careful boundary adjustment.

---

## Background: Curvature and Decision Boundaries

Curvature measures how rapidly a function bends, computed via second-order derivatives:

```
κ = ||∇²f(x)||_F / ||∇f(x)||
```

This metric reflects how sensitive the decision boundary is around a data point. Well-trained models exhibit:
- **Sharp decision boundaries** with high curvature (large rate of change)
- **Flat behavior** within class regions (low curvature)

High curvature regions tend to correspond to decision boundaries—precisely where memorized samples requiring unlearning typically reside.

---

## Information Gain Calculation

### Sample Neighborhood

For a sample x with radius r > 0, define its neighborhood:

```
B_r(x) = {z ∈ X : ||z - x|| ≤ r}
```

### Information Content

The information content α(x) measures the ratio of neighborhood samples sharing the forget set's class:

```
α(x) = (1/|B_r(x)|) Σ_{z∈B_r(x)} I{c(z) = c(x)}
```

### Sample Classification

Using threshold τ ∈ [0,1]:
- **Low information**: α(x) ≥ τ (can be inferred from neighbors)
- **High information**: α(x) < τ (unique influence on model)

---

## The JiT (Just in Time) Algorithm

![The JiT algorithm moves decision boundaries toward the forget set's class by minimizing output differences under perturbation.](/images/250723/jit_algorithm.png)

The core loss function pushes the decision boundary toward the forget sample's class:

For each forget sample x ∈ D_f:

```
ℓ = E[||f_θ(x) - f_θ(x + ξ)||²_2 / ||ξ||²_2]
```

### First-Order Approximation

With N perturbations where ξ_j ~ N(0, σ²):

```
ℓ ≈ (1/N) Σ_{j=1}^N ||f_θ(x) - f_θ(x + ξ_j)||²_2 / ||ξ_j||²_2
```

### Intuition

The loss is minimized when f(x) aligns with f(x + noise)—meaning the model becomes more consistent in its predictions around the forget sample. This effectively moves the decision boundary toward the forget sample's original class, making the model classify the sample as if it were never trained on it.

---

## Geometry of Decision Boundary Movement

![Comparison of decision boundary changes: JiT successfully reconstructs retrained boundaries while greedy methods destroy model utility.](/images/250723/boundary_geometry.png)

The figure demonstrates how boundaries move during unlearning:

### High-Curvature Region (Top Row)
- **Retrained model**: Gold standard showing correct boundary
- **JiT**: Successfully reconstructs the retrained boundary
- **Greedy (naive mislabeling)**: Completely destroys the trained model

### Low-Curvature Region (Bottom Row)
- Removing samples from low-gradient regions has minimal impact
- Both JiT and retrained models show similar boundaries
- Greedy approach still causes significant damage

Key observation: Removing a sample from a high-gradient space has significant impact, whereas low-gradient samples can be safely "forgotten" with minimal boundary changes.

---

## Effect on Sigmoid Functions

![Sigmoid deformation after JiT unlearning: high-curvature samples cause noticeable boundary shifts while low-curvature samples have minimal impact.](/images/250723/sigmoid_effect.png)

The sigmoid visualization illustrates two critical properties:

1. **Forgetting in low-information (flat) regions**: Minimal impact on the sigmoid shape
2. **Forgetting in high-gradient areas**: Noticeable deformation, shifting decision boundaries

Red dots represent unlearned samples; black dots show their positions on the new sigmoid post-JiT. The visualization confirms that JiT appropriately adjusts boundaries based on the information content of forgotten samples.

---

## Experimental Evaluation

### Setup

| Component | Configuration |
|-----------|---------------|
| Datasets | CIFAR-10, CIFAR-20, CIFAR-100, PinsFaceRecognition (17k+ images, 105 celebrities) |
| Models | ResNet18, Vision Transformer |
| Optimizer | Adam, lr=0.1 |

### Unlearning Tasks

1. **Single (Full)-class forgetting**: Remove all samples of one class
2. **Sub-class forgetting**: Remove specific sub-categories (e.g., 'rockets' within vehicles)
3. **Random observations**: Uniform sample from training set

### Comparison Methods

- **BSLN**: Baseline (not unlearned)
- **RTRN**: Retrained only on retain data (gold standard)
- **FNTN**: Finetuned for 5 epochs
- **State-of-the-art**: SSD, GKT, EMMN, SCRUB, BT, AMN, UNSIR

### Metrics

- **D_r Acc**: Retain set accuracy
- **D_f Acc**: Forget set accuracy (lower is better for forgetting)
- **MIA Score**: Membership Inference Attack success (lower indicates better privacy)
- **ZS**: Zero-shot capability (checkmark = no retain set needed)

---

## Results

### Full-Class Unlearning (VGG on PinsFaceRecognition)

| Method | D_r Acc | D_f Acc | MIA | Zero-shot |
|--------|---------|---------|-----|-----------|
| BSLN | 94.0±0.0 | 93.9±0.0 | 13.82±0.0 | ✗ |
| RTRN | 100.0±0.0 | 0.0±0.0 | 2.6±0.8 | ✗ |
| AMN | 99.7±0.1 | 0.0±0.0 | 1.4±1.33 | ✗ |
| SSD | 55.8±0.0 | 0.0±0.0 | 4.0±0.0 | ✗ |
| **Ours** | **91.4±0.1** | **1.9±0.2** | **4.7±0.5** | **✓** |

### Sub-Class Unlearning (ViT on CIFAR-20 Rocket)

| Method | D_r Acc | D_f Acc | MIA | Zero-shot |
|--------|---------|---------|-----|-----------|
| BSLN | 95.7±0.0 | 94.5±0.0 | 80.4±0.0 | ✗ |
| RTRN | 94.6±0.1 | 22.3±8.3 | 3.4±1.1 | ✗ |
| BDSH | 95.7±0.0 | 48.4±0.0 | 0.1±0.0 | ✓ |
| **Ours** | **92.2±0.0** | **0.0±0.0** | **14.66±8.8** | **✓** |

### Random Unlearning (100 samples from CIFAR-10)

| Method | D_r Acc | D_f Acc | MIA | Zero-shot |
|--------|---------|---------|-----|-----------|
| BSLN | 98.9±0.0 | 100.0±0.0 | 90.8±3.5 | ✗ |
| RTRN | 98.6±0.1 | 98.8±0.8 | 91.8±1.8 | ✗ |
| BDSH | 98.0±0.29 | 97.9±1.6 | 78.8±0.0 | ✓ |
| **Ours** | **98.0±0.3** | **98.0±1.5** | **78.8±4.0** | **✓** |

### Runtime Comparison

The proposed method achieves among the fastest runtimes, significantly outperforming methods like FNTN, EMMN, and BDSH. Only BT achieves faster execution, but with inferior unlearning quality.

---

## Discussion and Limitations

### Strengths

1. **Novel information-theoretic framework**: First to apply information gain analysis for zero-shot unlearning of arbitrary samples
2. **Statistical indistinguishability**: Entropy and accuracy profiles match retraining from scratch
3. **Consistent performance**: Works across full-class, sub-class, and random sample forgetting
4. **Low computational overhead**: Competitive with fastest existing methods

### Limitations

1. **Full gradient access required**: The method needs complete gradient computation
2. **Hyperparameter sensitivity**: Performance varies with learning rate and noise standard deviation
3. **Threshold uncertainty**: The paper doesn't specify exact τ values used in experiments
4. **Classification focus**: Currently limited to classification models, not generative models

---

## Implications for Privacy

The information-theoretic perspective reveals an important insight: not all training samples pose equal privacy risks. Samples that contribute unique information (high information gain) are more likely to be memorized and thus more privacy-sensitive. This suggests:

1. **Targeted unlearning**: Focus resources on high-information samples
2. **Privacy auditing**: Use information gain as a proxy for memorization risk
3. **Efficient compliance**: GDPR deletion requests may not require aggressive unlearning for all samples

---

## Conclusion

This work advances machine unlearning by introducing an information-theoretic framework that enables zero-shot unlearning of arbitrary data points—a significant improvement over prior methods requiring retain set access or limited to full-class forgetting. The JiT algorithm leverages curvature analysis to appropriately adjust decision boundaries based on the information content of forgotten samples.

The key insight—that samples with low information gain can be safely forgotten with minimal boundary changes while high information gain samples require careful adjustment—provides both theoretical grounding and practical guidance for deploying unlearning in real-world systems. As privacy regulations evolve and model deployment scales increase, such efficient and principled unlearning approaches will become essential.

---

**Reference**: Foster et al., "An Information Theoretic Approach to Machine Unlearning," *Transactions on Machine Learning Research*, 2025.

---

- **Paper**: [TMLR 2025](https://openreview.net/forum?id=t1utIThKHD)
- **Code**: [GitHub](https://github.com/jwf40/Information-Theoretic-Unlearning)

---

- **Slide**: [0723_Unelarning_Information_Theory.pdf](https://deniskim1.com/lab-meeting/0723_Unelarning_Information_Theory.pdf)


