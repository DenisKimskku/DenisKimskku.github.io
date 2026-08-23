---
title: "AudioMarkNet: Audio Watermarking for Deepfake Speech Detection"
date: "2026-08-24"
type: "Paper Review"
description: "Embeds watermarks into original speech to track modification"
tags: ["Watermarking"]
readingTime: 5
headerImage: "/images/news/audiomarknet_audio_watermarking_for_deepfake_speech_detectio.jpg"
---

![AudioMarkNet: Audio Watermarking for Deepfake Speech Detection](/images/news/audiomarknet_audio_watermarking_for_deepfake_speech_detectio.jpg)
*Figure from the paper “AudioMarkNet: Audio Watermarking for Deepfake Speech Detection” (p. 4)*

# AudioMarkNet: Watermarking Original Speech to Deter Voice Cloning via TTS

## TLDR
*   **What**: Embeds watermarks into original speech to track modification.
*   **Who's at risk**: Speakers whose voice is used in public datasets for TTS training.
*   **Key number**: Our watermarks are robust against attacks that are commonly used for evaluating audio watermarks.

## The Gap Between Reactive Detection and Proactive Defense
Current research for authenticating audio relies heavily on reactive detection, searching for artifacts left behind by deep generative models. However, as these generative models improve, the artifacts become less pronounced, eventually making synthesized speech technically indistinguishable from real audio. Furthermore, these reactive artifact detection methods often lack explainability, which is a barrier for legal or forensic use cases. The challenge is compounded by the rise of speaker adaptation, where adversaries fine-tune Text-to-Speech (TTS) models using a victim’s recorded voice to create high-fidelity impersonations. Existing watermarking work often focuses on embedding watermarks *into* the generated deepfake speech, which fails if an adversary trains their own model from scratch. This paper addresses the gap by moving the defense upstream: embedding identifiers into the *original* speech before it is ever released publicly.

## Sectional Embedding via 1-Second Segmentation
The core innovation here is addressing the variability in the duration of synthesized audio. Because fake speech can be of any length, traditional methods struggle to consistently locate and retrieve embedded signals. To solve this, AudioMarkNet mandates dividing the original speech into fixed 1-second sections. The watermark is then embedded into every one of these segments. During retrieval, the suspect speech is similarly segmented into 1-second chunks, and the decoder attempts to pull a watermark from each segment. This segmentation strategy allows the watermarking mechanism to function reliably across speech streams of arbitrary length and enables its application to online streaming scenarios. This process is conceptually similar to dataset poisoning, as the watermarks are designed to guide the TTS model during fine-tuning towards learning specific, predefined patterns.

## Loss Function Balancing Imperceptibility and Retrieval
The success of the system hinges on satisfying three mathematical requirements: negligible impact on intelligibility, correct retrieval from modified speech, and zero false positives for clean speech. To enforce these constraints, the paper constructs a composite loss function $\ell = \alpha\cdot\ell_\delta + \beta\cdot\ell_{wm} + \gamma\cdot\ell_{org}$. The imperceptibility ($\ell_\delta$) is minimized by reducing the squared $\ell_2$ norm of the calculated perturbations $\delta$. Retrieval ($\ell_{wm}$) is optimized by minimizing the squared difference between the decoder's output logits and the target watermark representation $h(w)$, where $h(w) = (w\cdot 2^{-1})\cdot\tau$. Finally, the non-false-positive constraint ($\ell_{org}$) is enforced by forcing the decoder to output a fixed, pre-defined watermark $w_0 \notin W$ when processing original, unwatermarked speech $x$.

## Architecture and Transfer to TTS Models
The system employs an encoder-decoder framework. The encoder, $f$, is a deep neural network comprising wav2vec 2.0, an LSTM layer, and fully connected (FC) layers. Instead of recreating the original data, the encoder is designed to learn only the necessary perturbations applied to the original speech features. The process involves transforming speech to the frequency domain via short-time-Fourier transform (STFT), extracting features via wav2vec 2.0, adding a linearly transformed message $w$, calculating frame-level perturbations via LSTM/FC layers, and finally adding these perturbations to the original STFT results before inverse STFT reconstruction. The decoder, $g$, is simpler, using stacked convolutional layers and two FC layers, operating on the log-scaled magnitude of 1-second STFT sections. Instance normalization is used after convolutional layers to avoid batch-dependent normalization artifacts. The entire system is trained end-to-end, occasionally incorporating Gaussian noise augmentation to boost robustness against signal removal attempts.

## Limitations
The threat model is strictly confined to scenarios where the adversary uses speaker adaptation (fine-tuning a TTS model) on the watermarked speech. Any attack that bypasses this fine-tuning step, such as direct inference on an unadapted model, is outside the scope of this defense. Furthermore, the success relies on the assumption that the TTS model will learn the specific, designed watermark patterns, which may not hold true across all proprietary or highly specialized TTS implementations not covered in the evaluation.

## What practitioners should do
*   For sensitive audio data, implement a pre-release watermarking scheme mirroring AudioMarkNet's design.
*   Ensure watermarking is applied to all original source material before public distribution to preempt voice cloning.
*   When deploying detection, process suspect audio in fixed 1-second segments to ensure consistent watermark retrieval across varying clip lengths.
*   Monitor for the presence of registered watermarks in generated speech, as this serves as an explainable indicator of synthetic origin.

## Verdict
Read this paper if you are working on proactive digital content provenance or designing defenses against voice cloning attacks. Skip it if your focus is purely on reactive deepfake artifact detection.

---

## Den's Take

The paper's focus on embedding watermarks upstream is the correct directional shift away from chasing vanishing artifacts. However, the system’s reliance on the adversary performing speaker adaptation—fine-tuning a TTS model—creates a specific, brittle threat model. If an attacker instead employs a black-box synthesis method or a system where the model weights are never exposed for fine-tuning, the prescribed defense offers zero protection. Moreover, the paper demonstrates the effectiveness of the method against adaptive attacks, specifically designed to defeat our method.