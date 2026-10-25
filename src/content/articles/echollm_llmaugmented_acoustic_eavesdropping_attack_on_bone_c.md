---
title: "EchoLLM: LLM-Augmented Acoustic Eavesdropping Attack on Bone Conduction Headphones with mmWave Radar"
date: "2026-10-26"
type: "Paper Review"
description: "Uses mmWave radar and LLMs to extract semantic audio from bone conduction headphones"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/echollm_llmaugmented_acoustic_eavesdropping_attack_on_bone_c.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-yao-xin.pdf"
---

![EchoLLM: LLM-Augmented Acoustic Eavesdropping Attack on Bone Conduction Headphones with mmWave Radar](/images/news/echollm_llmaugmented_acoustic_eavesdropping_attack_on_bone_c.jpg)
*Figure from the paper “EchoLLM: LLM-Augmented Acoustic Eavesdropping Attack on Bone Conduction Headphones with mmWave Radar” (p. 4)*

# EchoLLM: LLM-Augmented Acoustic Eavesdropping on Bone Conduction Headphones via mmWave Radar

## TLDR
*   **What**: Uses mmWave radar and LLMs to extract semantic audio from bone conduction headphones.
*   **Who's at risk**: Users of bone conduction headphones in public, crowded environments.
*   **Key number**: EchoLLM achieves a word error rate (WER) as low as 5.23%.

## The Constrained Nature of Prior Eavesdropping Attacks
Existing acoustic eavesdropping methods, particularly those using millimeter-wave (mmWave) radar, encounter significant limitations when targeting modern audio devices like bone conduction headphones. Previous work often mandates that the target audio consists of predefined categorical content, requiring the attacker to have prior knowledge of these categories. Furthermore, these attacks struggle with generalizability because they frequently depend on stable reflective surfaces, fail to account for context-dependent speech, and lack the ability to integrate multimodal data streams. In a practical setting, a user wearing bone conduction headphones might be engaged in a conversation where their own responses provide vital semantic context—a feature that prior methods are not designed to exploit. This inability to handle unconstrained vocabulary and context is the gap EchoLLM addresses.

## LeASR: Integrating Victim Speech for Contextual Enhancement
EchoLLM’s central innovation is the introduction of LeASR, a novel context-aware multi-modal Automatic Speech Recognition (ASR) framework. This framework overcomes the limitations of relying solely on the noisy, vibration-extracted signal from the headphone by treating the victim’s own recorded audio as crucial contextual input. The core insight is that the audio transmitted *to* the victim (the content of the phone call) and the victim’s *response* are semantically dependent. By combining the raw mmWave-derived signal (representing the headphone's output) and the victim's microphone recording, EchoLLM compensates for the high-frequency components that are typically lost or attenuated during the vibration extraction process from the mmWave radar. This fusion allows the LLM to predict the most likely text content even when the raw signal quality is poor.

## Target Identification and LeASR Fusion
The attack pipeline begins with vibration extraction from the demodulated base-band signal $v(t)$. To isolate the target, EchoLLM employs a two-stage selection process. First, it classifies objects based on velocity characteristics derived from Range-FFT results, filtering out fast-moving objects and fixtures to isolate stationary people. Second, a Convolutional Neural Network (CNN) analyzes the spectrograms of the remaining crests, selecting the one corresponding to the victim by confirming the presence of audio signals between 0 and 1.0 kHz. Once the victim's crest is identified, the headphone location is chosen by selecting the point within the crest that yields the highest Signal-to-Noise Ratio (SNR) when aggregating components between 0.1 and 1.0 kHz. The final stage feeds the extracted mmWave signal and the victim's microphone audio into LeASR. Our experiments show that EchoLLM achieves a word error rate (WER) as low as 5.23%.

## Limitations
The presented threat model assumes a fixed, observable setup where the attacker can position a commercial mmWave radar and a wireless microphone approximately 1 meter away. The effectiveness of the CNN relies on the assumption that bone conduction headphone vibrations remain below 1.0 kHz, and the SNR calculation assumes that components outside the 0.1 to 1.0 kHz range are purely noise.

## What practitioners should do
*   Audit public deployments of bone conduction headphones to assess risk exposure in dense environments.
*   Recognize that the integration of contextual audio (e.g., from a companion microphone) can significantly boost the success rate of indirect eavesdropping.
*   Consider the physical constraints of the attack, such as the need for relatively close proximity to the target.

## Verdict
Read this paper if you are interested in the convergence of physical layer side-channel attacks and large language model capabilities for privacy inference. Skip it if your focus remains strictly on traditional software-layer LLM jailbreaking.

## Den's Take

The integration of the victim's microphone audio via LeASR is a notable step beyond prior constrained methods, as the authors observe. However, I find the paper underemphasizes the systemic risk this introduces to overall trust in ambient data collection. When the system relies on fusing the target's output signal with their own vocal response to achieve low WER, it effectively creates a highly sensitive, closed-loop interception mechanism. This isn't just about eavesdropping on a conversation; it’s about enabling a powerful, context-aware passive surveillance tool that exploits the natural conversational feedback loop. The stated limitations regarding uncorrelated speech patterns are weak; in any real-world deployment, the attacker will simply iterate until they find a statistically relevant correlation, turning the system into a sophisticated pattern matching engine rather than a brittle acoustic decoder.