---
title: "Provably Reliable Conformal Prediction Sets in the Presence of Data Poisoning"
date: "2026-11-09"
type: "Paper Review"
description: "RPS constructs prediction sets robust to training/calibration data poisoning"
tags: ["Data Poisoning", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/provably_reliable_conformal_prediction_sets_in_the_presence_.jpg"
paperUrl: "https://arxiv.org/abs/2410.09878"
---

![Provably Reliable Conformal Prediction Sets in the Presence of Data Poisoning](/images/news/provably_reliable_conformal_prediction_sets_in_the_presence_.jpg)
*Figure from the paper “Provably Reliable Conformal Prediction Sets in the Presence of Data Poisoning” (p. 2)*

# Reliable Prediction Sets via Partitioning and Majority Voting Against Data Poisoning

## TLDR
*   **What**: RPS constructs prediction sets robust to training/calibration data poisoning.
*   **Who's at risk**: Safety-critical systems using conformal prediction (e.g., autonomous driving).
*   **Key number**: Theorem 3 states that the resulting set $\tilde{C}(x_{n+1})$ is coverage reliable ($\tilde{C}(x_{n+1}) \supseteq C(x_{n+1})$) if the score $s(x, y) \ge \tau$ and size reliable ($\tilde{C}(x_{n+1}) \subseteq C(x_{n+1})$) if $s(x, y) < \tau$ when $r_c=0$.

## The Vulnerability of Black-Box Uncertainty Quantification
Conformal prediction offers model-agnostic uncertainty quantification, guaranteeing that prediction sets cover the true label with a specified probability, $1-\alpha$. This makes it valuable for high-stakes domains like medical diagnosis. However, this guarantee dissolves when the data used for calibration or training is compromised by an adversary. Data poisoning attacks, where an attacker manipulates training or calibration data by adding, deleting, or flipping labels, can drastically alter the resulting prediction sets. For example, an adversary could force the sets to become overly conservative or, worse, empty. Existing defenses often focus on evasion attacks (perturbing test data) or only address calibration poisoning, failing to provide strong, pointwise reliability guarantees when adversaries can modify both the training and calibration sets within a defined threat radius $B_{r_t, r_c}(D_l)$.

## Smoothed Score Functions for Training Data Poisoning
The first layer of defense introduced is the use of smoothed score functions to manage training poisoning. The core insight here is that instead of relying on a single classifier trained on the entire training set, the data is first partitioned into $k_t$ disjoint sets. Separate classifiers, $f^{(i)}$, are trained on each partition. The score function $s(x, y)$ then aggregates these independent classifiers by counting the percentage of votes they cast for class $y$. This mechanism diffuses the influence of any single poisoned data point: since deleting or inserting one point only affects one partition and thus one classifier, the overall score function is made resilient to isolated data manipulations. This aggregation allows the method to maintain the required exchangeability of conformal scores on clean data, satisfying the marginal coverage guarantee (Theorem 1).

## Majority Prediction Sets for Calibration Data Poisoning
To combat poisoning in the calibration data, the technique shifts focus to merging uncertainty estimates. The calibration set is similarly partitioned into $k_c$ disjoint sets. For each partition, a standard conformal prediction set, $C_i(x_{n+1})$, is generated using the smoothed score function. The final prediction set, $CM(x_{n+1})$, is then formed by taking a majority vote across these $k_c$ independent sets. A class $y$ is included in $CM(x_{n+1})$ only if it appears in more than $\hat{\tau}(\alpha)$ of the individual sets. This majority voting structure forces an adversary to successfully poison a majority of the disjoint calibration partitions to alter the final set, providing a stronger defense against calibration data corruption than methods relying on a single calibrated set.

## The Cost of Provable Reliability
The mechanism is computationally defined by two main steps: partitioning and aggregation. For training poisoning, the score function involves $k_t$ separate model trainings, which must be performed on deterministically hashed partitions $P_t^i$. The score $s(x, y)$ is then calculated using a softmax over the voting percentage $\pi_y(x)$ to prevent overly large sets. For calibration poisoning, the cost involves generating $k_c$ separate quantiles, $\tau_i$, from the scores computed on $P_c^i$. The final majority set $CM(x_{n+1})$ is constructed using the inverse CDF, $\hat{\tau}(\alpha)$, of the Binomial distribution $\text{Bin}(k_c, 1-\alpha)$. The derived certificates guarantee pointwise reliability: if $r_c=0$, Theorem 3 states that the resulting set $\tilde{C}(x_{n+1})$ is coverage reliable ($\tilde{C}(x_{n+1}) \supseteq C(x_{n+1})$) if the score $s(x, y) \ge \tau$ and size reliable ($\tilde{C}(x_{n+1}) \subseteq C(x_{n+1})$) if $s(x, y) < \tau$.

## Limitations
The paper primarily focuses on the pointwise reliability of the prediction sets under worst-case adversarial insertion, deletion, and label flipping within the defined threat ball $B_{r_t, r_c}(D_l)$. The threat models explored do not seem to cover attacks that involve feature modification beyond the defined perturbation costs. Furthermore, the complexity associated with computing the worst-case bounds in $r_t$ steps might become prohibitive for very large poisoning radii in production systems.

## What practitioners should do
*   If deploying conformal prediction in safety-critical applications, consider implementing a partitioning strategy like RPS to guard against data manipulation.
*   When using RPS, increase the partition counts ($k_t$ and $k_c$) to increase the certified reliability radius against poisoning.
*   Ensure the underlying score function maintains exchangeability, as this is a prerequisite for the marginal coverage guarantee on clean data.
*   Be aware that while RPS provides provable reliability guarantees, these are contingent on the specific threat model $B_{r_t, r_c}(D_l)$ being accurate to the deployed environment.

## Verdict
Read for ML engineers and security researchers interested in robust uncertainty quantification. This paper presents a concrete, mathematically grounded framework for defending conformal prediction against data poisoning, moving beyond empirical fixes.

---

## Den's Take

The approach detailed here is a necessary technical advance for deploying uncertainty quantification in adversarial settings. However, the paper's focus on worst-case insertion/deletion within a fixed threat ball $B_{r_t, r_c}(D_l)$ appears too narrow for real-world deployment risk. Adversarial attacks aren't always confined to simple label flips; they often involve subtle, coordinated feature manipulations designed to push the model into regions that look "clean" under the defined threat radius but lead to catastrophic failures downstream. The computational overhead of managing $k_t$ and $k_c$ separate models must be weighed against the practical feasibility of maintaining those bounds in high-throughput systems. This work provides a strong theoretical basis, but its practical utility hinges entirely on the accuracy of the assumed threat model.