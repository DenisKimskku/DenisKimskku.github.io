---
title: "Enhanced Label-Only Membership Inference Attacks with Fewer Queries"
date: "2026-08-29"
type: "Paper Review"
description: "DHAttack uses fixed boundary distance and shadow models for MIAs"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/enhanced_labelonly_membership_inference_attacks_with_fewer_q.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/li-hao"
---

![Enhanced Label-Only Membership Inference Attacks with Fewer Queries](/images/news/enhanced_labelonly_membership_inference_attacks_with_fewer_q.jpg)
*Figure from the paper “Enhanced Label-Only Membership Inference Attacks with Fewer Queries” (p. 5)*

# DHAttack: Enhancing Membership Inference with Fixed Boundary Distance

## TLDR
* **What**: DHAttack uses fixed boundary distance and shadow models for MIAs.
* **Who's at risk**: Deployments using label-only outputs where query limits are strict.
* **Key number**: In some cases, DHAttack achieves more than an order of magnitude improvement over all baselines in terms of TPR @ 0.1% FPR with just 5 to 30 queries.

## Mitigating Sample Diversity with State Comparison

Existing label-only Membership Inference Attacks (MIAs) rely on the shortest boundary distance (shortestBD), which measures the minimum perturbation needed to change a sample's predicted label. This approach faces two issues. First, determining shortestBD across various directions demands a large number of queries; prior works often require over 1,000 queries. More fundamentally, sample diversity causes overlap in shortestBD distributions between members and non-members, which reduces attack performance. To address this, DHAttack shifts focus from comparing the shortestBD across different samples to comparing the boundary distance of an *individual* sample in two states: member versus non-member. The core premise is that a member sample will exhibit a larger boundary distance when evaluated on the target model compared to when evaluated on a model that never saw it. This comparison helps reduce the negative effect of the shortestBD distribution overlap.

## FixedBD and Relative Membership Score (relScore)

The attack introduces two novel concepts to improve stealth and performance. First, instead of searching for the shortestBD across many directions, DHAttack measures the fixed boundary distance (fixedBD). FixedBD is defined as the distance a sample travels toward a fixed data sample ($x_{\text{fixed}}$) until it reaches the model's decision boundary. By using a consistent reference point ($x_{\text{fixed}}$), the need for costly shortestBD searches is eliminated, streamlining computation. Second, the membership signal is not the raw fixedBD value. Instead, DHAttack uses the relative membership score (relScore). This is calculated by comparing the target sample’s fixedBD ($d$) on the target model against a Gaussian distribution ($G$) constructed from the fixedBDs derived from multiple shadow models (which approximate the non-member state). A higher relScore indicates the target sample's fixedBD exceeds most values in the non-member state distribution, suggesting membership.

## DHAttack Pipeline and Query Efficiency

The DHAttack pipeline involves four phases. First, Reference Data Relabeling is performed by querying the target model with samples from an auxiliary reference dataset ($D_r$) to capture the target model's predictive behavior. Next, Shadow Model Training leverages this relabeled $D_r$ to train $n$ local shadow models ($\theta_1, \dots, \theta_n$), which approximate the decision boundary without including the target sample. For a target sample $x$, Non-member State Construction calculates $n$ fixedBD values by moving $x$ toward a fixed point, such as an image with all RGB values set to 255, across each shadow model. This yields the Gaussian distribution $G$. Finally, in Membership Inference, the target sample's fixedBD ($d$) is measured on the target victim model. The relScore is then computed as $CDF(d, G)$. This mechanism allows DHAttack to achieve high performance with minimal overhead.

## Limitations
The attack relies on the assumption that shadow models share the same architecture and hyperparameters as the target model, a condition that may not hold in real-world deployments. Furthermore, the fixedBD calculation is sensitive to the chosen fixed point; if the fixed point is not an appropriate outlier, the estimation can be inaccurate. The paper also notes that the relabeling query phase, while feasible, might still generate detectable usage patterns if performed excessively.

## What practitioners should do
* Prioritize defenses that monitor for large volumes of queries directed at the model, as DHAttack minimizes this overhead while maintaining high TPR.
* If using label-only outputs, consider defenses that monitor the consistency of boundary distance measurements, as DHAttack exploits how these distances compare across different states.
* For model owners, be aware that the fixedBD signal is derived from a comparison against a distribution modeled by shadow models, which is a new vector to consider for privacy auditing.
* Evaluate the robustness of your model's decision boundaries against fixed-point perturbations, as this is central to the attack's success.

## Verdict
Read this for security researchers and red-teamers focused on label-only privacy attacks. It presents a concrete, query-efficient advancement over established MIA techniques.

## Den's Take

The focus on reducing query volume is certainly relevant for production systems where rate limiting is common. However, the paper seems to understate the inherent fragility of relying on shadow models to approximate the non-member state. If the training process for these local shadow models ($\theta_1, \dots, \theta_n$) is insufficiently representative of the true decision boundary—especially if the target model has experienced recent, non-representative fine-tuning—the resulting Gaussian distribution $G$ will be a poor proxy. This suggests that the claimed efficiency gain might be brittle; a slight mismatch in hyperparameter alignment between the shadow models and the target model could render the entire `relScore` calculation meaningless noise.