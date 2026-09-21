---
title: "Et Tu, MacBook? Unprivileged Keystroke Inference and Context Profiling via the Built-in IMU Side Channel"
date: "2026-09-22"
type: "Paper Review"
description: "IMU side channel leaks keystrokes, user identity, and desk surface"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/et_tu_macbook_unprivileged_keystroke_inference_and_context_p.jpg"
paperUrl: "http://arxiv.org/abs/2609.21569v1"
---

![Et Tu, MacBook? Unprivileged Keystroke Inference and Context Profiling via the Built-in IMU Side Channel](/images/news/et_tu_macbook_unprivileged_keystroke_inference_and_context_p.jpg)
*Figure from the paper “Et Tu, MacBook? Unprivileged Keystroke Inference and Context Profiling via the Built-in IMU Side Channel” (p. 8)*

# Unprivileged Keystroke and Context Inference via MacBook IMU Side Channel

## TLDR
*   **What**: IMU side channel leaks keystrokes, user identity, and desk surface.
*   **Who's at risk**: Users of unpatched Apple MacBooks running standard macOS.
*   **Key number**: BRUTUS achieves a character-level accuracy of 89.1% to 97.5% in key recovery.

## The Unprivileged Access Path
Security researchers have long sought side-channel attacks against Apple Silicon, but prior work [20] assumed that accessing the built-in Inertial Measurement Unit (IMU) required root privileges. This assumption creates a significant gap in the attack surface, as it implies that only highly privileged processes can observe physical device interactions. The paper attacks this assumption by demonstrating that an unprivileged application, running under the active console user's non-root User ID (UID), can read raw IMU data directly via the IOKit driver without needing runtime elevation, special entitlements, or TCC Input Monitoring authorization. Furthermore, the paper shows that while conventional input interfaces protected by TCC [7] require explicit consent, the IMU data path bypasses this protection entirely. This unprivileged access enables the subsequent leakage of sensitive information.

## BRUTUS's Tripartite Leakage
The core insight of this work is that the IMU, mounted off-center on the logic board, captures not just rigid-body motion, but also fine-grained mechanical vibrations specific to the interaction. This physical leakage is characterized across three independent dimensions. First, the distinct mechanical lever arm for each key position results in a unique six-channel signature across the accelerometer and gyroscope axes, allowing for keystroke identity recovery. Second, the physical damping characteristics of the supporting structure—whether it is a rigid surface like wood or a compliant one like a mattress—imprints a distinct pattern on the signal's normalized standard deviation. Third, the variance in typing force scales the amplitude of the vibration but preserves the shape that encodes the key identity, allowing classifiers to generalize across natural typing variations.

## IMU Data Stream and BRUTUS Mechanics
BRUTUS leverages the raw six-axis IMU stream delivered by the `AppleSPUHIDDevice` interface, which requires only administrator-group membership and active-console-user status for unprivileged access. The attack proceeds by capturing data streams sampled at approximately 800 Hz. To achieve keystroke inference, BRUTUS achieves a character-level accuracy of 89.1% to 97.5% in key recovery. Furthermore, aided by language models, it can successfully reconstruct certain sentences with 100% accuracy. For user identification and environment profiling, BRUTUS correctly discovers user and environment profiles without labels and correctly assigns subsequent segments to their corresponding profiles. The paper evaluated this on 8-to-10-character passwords from three held-out participants using held-out devices, achieving an average character-level accuracy of 94.0% and a Top-5 accuracy of 86.7%.

## Limitations
The threat model assumes the victim is the device owner logged in as the active console user. The attack relies on the specific implementation details of the undocumented IOKit driver and the current macOS security posture concerning sensor access. Its effectiveness might degrade if Apple modifies the IMU data path or if the system is operated remotely without an active graphical login session.

## What practitioners should do
*   Review all vendor-internal sensor interfaces, not just those exposed through documented APIs, for privilege boundaries.
*   Assume that chassis-integrated sensors can be leveraged for side-channel attacks even without root access.
*   Implement strict access controls on low-level hardware interfaces like IOKit drivers.
*   Monitor for unexpected, high-frequency data streams emanating from built-in sensors.

## Verdict
Read this paper if you are working on physical side-channel security for embedded or mobile devices. Otherwise, skip it.

---

## Den's Take

The finding that unprivileged code can access raw IMU data via the IOKit driver bypasses TCC protections is significant, but the paper understates the wider implications for endpoint security. The conclusion focuses heavily on keystroke inference, yet the demonstrated ability to profile the desk surface—differentiating between rigid and compliant supports—opens up an entirely separate, persistent surveillance vector. This isn't just about what you type; it's about the physical context of your work. Furthermore, the reliance on the "active console user" assumption is too narrow. If an attacker can establish persistence or gain temporary elevated rights within that session, the implications extend beyond the logged-in user. This pushes the problem from a simple input hijacking exercise into a full-spectrum environmental reconnaissance capability.