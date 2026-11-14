---
title: "Scalable and Certifiable Graph Unlearning: Overcoming the Approximation Error Barrier"
date: "2026-11-15"
type: "Paper Review"
description: "ScaleGUN integrates approximate graph propagation into certified unlearning"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/scalable_and_certifiable_graph_unlearning_overcoming_the_app.jpg"
paperUrl: "https://arxiv.org/abs/2408.09212"
---

![Scalable and Certifiable Graph Unlearning: Overcoming the Approximation Error Barrier](/images/news/scalable_and_certifiable_graph_unlearning_overcoming_the_app.jpg)
*Figure from the paper “Scalable and Certifiable Graph Unlearning: Overcoming the Approximation Error Barrier” (p. 8)*

# ScaleGUN: Certifying Graph Unlearning on Billion-Edge Graphs via Lazy Local Propagation

## TLDR
*   **What**: ScaleGUN integrates approximate graph propagation into certified unlearning.
*   **Who's at risk**: Large-scale GNN deployments requiring "right to be forgotten" guarantees.
*   **Key number**: ScaleGUN accomplishes $(\epsilon, \delta) = (1, 10^{-4})$ certified unlearning on the billion-edge graph ogbn-papers100M in 20 seconds for a 5,000 random edge removal request.

## Bridging Approximation and Certified Guarantees
Current certified graph unlearning methods, such as CGU, provide strong privacy assurances by bounding the gradient residual norm, $\lVert L(w^-, D') \rVert$. This guarantee requires the unlearned model $w^-$ to be approximately equivalent to the model retrained on the exact post-unlearning dataset $D'$. The standard procedure for this involves re-computing graph propagation, for instance, $\left(D^{-1/2} A D^{-1/2}\right)^2 X$ in a 2-hop SGC model. This re-propagation step is computationally prohibitive for massive graphs; on ogbn-papers100M (which has 1.6B edges), re-computing graph propagation for a 2-hop SGC model requires over 6,000 seconds while retraining the SGC model after graph propagation takes less than 80 seconds. Meanwhile, scalable techniques exist to accelerate graph propagation, but they introduce approximation errors by using an approximate dataset $\hat{D}'$ instead of the exact $D'$. This discrepancy presents a theoretical hurdle: how can one maintain a certified guarantee—which depends on the exact $D'$—when the mechanism relies on approximate embeddings derived from $\hat{D}'$? This paper addresses this uncertainty by rigorously investigating the impact of approximation error on the overall model error within the certified unlearning framework.

## Generalized PageRank Propagation
To overcome the scaling bottleneck, ScaleGUN employs a lazy local propagation framework built upon Generalized PageRank (GPR). Unlike CGU, which uses an asymmetric normalized matrix $P = D^{-1}A$ and fixes the weight $w_\ell = 1/L$, ScaleGUN uses the GPR propagation scheme:
$$Z = \sum_{\ell=0}^{L} w_\ell \left(D^{-1/2} A D^{-1/2}\right)^\ell X$$
This framework draws inspiration from the dynamic PPR method of InstantGNN, extending it to the GPR scheme. The approximate embedding matrix $\hat{Z}$ is obtained by applying Forward Push, which is a localized version of cumulative power iteration. This process maintains a reserve vector $q(\ell)$ and a residue vector $r(\ell)$ for each level $\ell$. When the residue $r(\ell)(u)$ exceeds a threshold $r_{\text{max}}$, it is distributed to the neighbors' residues in the next level. By controlling $r_{\text{max}}$, the framework ensures that the approximate embedding $\hat{z}$ satisfies the error bound: $\lVert \hat{z} - z \rVert^2 \leq \sqrt{n L r_{\text{max}}}$. Furthermore, when an edge is removed, the invariant property for the GPR scheme is locally adjusted by updating the residue vectors $\{r(\ell)\}$ for affected nodes to preserve the invariant, allowing for efficient, local updates.

## The $\Delta$ Bound via Propagation Framework
The core of the certified unlearning mechanism is the update rule: $w^- = w^\star + \hat{H}_{w^\star}^{-1} w^\star \Delta$, where $\Delta = \nabla L(w^\star, \hat{D}) - \nabla L(w^\star, \hat{D}')$. The primary theoretical challenge lies in bounding $\lVert \Delta \rVert$, as $\Delta$ relates the gradients computed using the exact post-removal dataset $D'$ to those using the approximate dataset $\hat{D}'$. ScaleGUN tackles this by leveraging the structure of its lazy local propagation framework. For node feature unlearning, the paper shows that the norm of the gradient residual, $\lVert \nabla L(w^-, D') \rVert$, is bounded by a term that incorporates the approximation error, $\epsilon_1 = \sqrt{n L r_{\text{max}}}$, and the unlearning error. Specifically, for node feature unlearning, the bound is:
$$\lVert \nabla L(w^-, D') \rVert \leq \left(c\gamma_1 \lambda F + c_1 \frac{p}{F}(n_t - 1)\right) \left(\epsilon_1 + 8\gamma_1 F \lambda(n_t - 1) \cdot \frac{p}{d(u)}\right)$$
This demonstrates that the approximation error component can be managed by setting $r_{\text{max}} = O(1/\sqrt{n_t n})$, ensuring the total model error remains bounded, which subsequently allows the noise perturbation to mask the error and maintain the certified guarantee.

## Limitations
The analysis primarily focuses on linear models with strongly convex loss functions applied to binary node classification. The theoretical guarantees are established under Assumption 4.1, which requires several Lipschitz and boundedness conditions on the loss function and embeddings. The framework's applicability to non-linear GNN architectures beyond the SGC and GPR schemes is not fully explored, and the complexity of bounding $\lVert \Delta \rVert$ for general graph unlearning scenarios remains intricate.

## What practitioners should do
*   When deploying GNNs on sensitive data, prioritize certified unlearning methods if strong privacy guarantees are non-negotiable.
*   If using approximate propagation techniques, carefully analyze the relationship between the approximation parameter $r_{\text{max}}$ and the required $\epsilon_1$ to ensure the certified guarantee holds.
*   If your unlearning request involves high-degree nodes, be mindful that the unlearning error component in the bound increases with the node's degree $d(u)$.

## Verdict
Read this paper if you are a researcher working on privacy-preserving machine learning at scale; otherwise, skip it.

---

## Den's Take

This work tackles a genuine bottleneck in applying certified unlearning to massive graphs: the computational cost of exact propagation. However, the reliance on linear models with strongly convex loss functions, as noted in the limitations, severely restricts the practical scope of these $(\epsilon, \delta)$ guarantees. Showing a bound for the gradient residual in the SGC/GPR context is academic progress, but it doesn't translate to the complex, non-linear architectures dominating production GNNs today. Furthermore, the framework’s success hinges on controlling $r_{\text{max}}$ to manage $\epsilon_1$. I suspect that in real-world, noisy data environments, the necessary trade-off between achieving a small $r_{\text{max}}$ and maintaining computational tractability will force practitioners into accepting a far higher effective approximation error than the paper suggests is possible.