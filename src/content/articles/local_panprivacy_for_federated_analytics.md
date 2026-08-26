---
title: "Local Pan-privacy for Federated Analytics"
date: "2026-08-23"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2503.11850"
paperAuthors: "Vitaly Feldman, Audra McMillan, Guy N. Rothblum, et al."
description: "Local pan-privacy is incompatible with information-theoretic DP for event counting"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/local_panprivacy_for_federated_analytics.jpg"
---

![Local Pan-privacy for Federated Analytics](/images/news/local_panprivacy_for_federated_analytics.jpg)

# Cryptographic Guarantees for Local Pan-Privacy in Federated Telemetry

## TLDR
*   **What**: Local pan-privacy is incompatible with information-theoretic DP for event counting.
*   **Who's at risk**: Devices in shared environments where local state introspection is possible.
*   **Key number**: For the $\text{COUNTNONZERO}$ task, the error of any algorithm must be $\Omega(\sqrt{nT})$.

## The Conflict Between Local Pan-Privacy and Information-Theoretic Guarantees
Private federated telemetry systems aggregate statistics from distributed devices, protecting individual users. In some deployments, an adversary might gain access to the device itself—for instance, on a public computer. This scenario requires a guarantee against an on-device intruder, which the authors term local pan-privacy: the system must retain privacy even under repeated, unannounced intrusions on the local device state. The paper examines fundamental statistical tasks, such as counting the number of devices where an event occurred at least once ($\text{COUNTNONZERO}$). The standard local privacy model allows for simple solutions using randomized response, yielding near-optimal central privacy guarantees when aggregated by a trusted server. However, when strictly enforcing information-theoretic differential privacy under the local pan-privacy constraint, the paper demonstrates a severe limitation. The required error for the $\text{COUNTNONZERO}$ task must scale polynomially with the stream length $T$, which is a significant barrier compared to the error achievable without this strict intrusion protection.

## The Need for Rerandomizable Encryption
The core insight pivots on replacing the intractable information-theoretic constraint with a computationally feasible one. The authors show that imposing information-theoretic local pan-privacy on $\text{COUNTNONZERO}$ forces the error of any algorithm to be $\Omega(\sqrt{nT})$, even though a local DP algorithm can estimate $\text{COUNTNONZERO}$ with additive error $\Omega(\sqrt{n})$. To circumvent this lower bound, the paper shifts focus to computational privacy. The breakthrough is showing that local pan-privacy can be maintained without this overhead *if* standard cryptographic assumptions hold. Specifically, they show that using a public-key encryption scheme that supports rerandomization allows the protocol to satisfy computational local pan-privacy. This means the on-device state, maintained in encrypted form, prevents an adversary who does not possess the private key from gaining useful information from observing the state transitions, even across multiple intrusions.

## State Maintenance via Encrypted Stream Updates
The mechanism relies on keeping the state on the device entirely encrypted. Instead of updating a plaintext state $s_t = \text{State}_t(x_t; s_{t-1})$, the device operates on ciphertexts. The paper shows that for the tasks studied, maintaining the state under stream updates is feasible using the properties of the chosen primitives. The protocol ensures that the on-device state consists of $O(1)$ ciphertexts, and the device transmits only one message of $O(1)$ ciphertexts at the end of the stream. For $\text{COUNTNONZERO}$, the existence of such an accurate, locally pan-private algorithm is shown to necessitate a public-key encryption scheme. The paper further demonstrates the necessity of this primitive, proving that if a locally pan-private algorithm achieves an additive error less than $n/4$ with high probability, then a public key encryption scheme can be constructed.

## Limitations
The analysis focuses heavily on $\text{COUNTNONZERO}$ and related simple statistics in a streaming setting. The computational security relies on the existence of a rerandomizable public-key encryption scheme, which is a strong cryptographic assumption. The model also assumes that state updates are atomic, which may not hold in all real-world shared device usage patterns.

## What practitioners should do
*   If deploying telemetry on shared endpoints, recognize that information-theoretic guarantees against local state inspection are likely infeasible for event counting tasks.
*   When designing privacy protocols, evaluate whether the overhead of using rerandomizable encryption is acceptable compared to the benefits of strong local pan-privacy.
*   If using the cryptographic approach, ensure the underlying public-key encryption scheme supports the required rerandomization property.
*   Be aware that the protocol provides a stronger semantic security guarantee than just computational local pan-privacy.

## Verdict
Read if you are working on privacy-preserving telemetry or federated learning in environments where device compromise is a realistic threat vector. Otherwise, skip.

## Den's Take

The paper correctly identifies the collision between strong information-theoretic local pan-privacy and practical utility for event counting. However, its conclusion that rerandomizable encryption is the necessary pivot to computational privacy feels like an evasion rather than a solution. Relying on the existence of such a primitive essentially pushes the complexity problem—the computational hardness of the underlying encryption—onto the deployment rather than solving the statistical constraint. For real-world systems, the assumption of perfect, atomic state updates on a shared endpoint is naive. I suspect that in any environment where the local device state is subject to non-atomic access patterns, the practical utility of the resulting cryptographic overhead will quickly render the system unusable, regardless of the theoretical security proof.