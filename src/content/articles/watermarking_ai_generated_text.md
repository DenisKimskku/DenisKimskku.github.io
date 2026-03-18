---
title: "Analysis of Watermarking for AI-Generated Text"
date: "2026-03-18"
type: "Research Paper"
description: "A systematic analysis of LLM text watermarking techniques, defining eight key properties and seven attack methods, while comparing Zero-bit and Multi-bit approaches for identifying and tracing AI-generated text."
tags: ["LLM", "Watermarking", "AI-Generated Text", "Text Detection", "AI Safety"]
---

# Analysis of Watermarking for AI-Generated Text

As large language models produce text increasingly indistinguishable from human writing, the ability to identify and trace AI-generated content has become a pressing societal need. From academic integrity to misinformation detection, we need reliable mechanisms to determine **who (or what) generated a given piece of text.**

This is the challenge we examine in our paper, "[Analysis of Watermarking for AI-generated Text](https://deniskim1.com/papers/cisc_w_25/Paper.pdf)," presented at **CISC-W 2025 (Conference on Information Security and Cryptology - Winter)**.

We provide a systematic analysis of the current landscape of LLM text watermarking, defining the key properties an effective watermark must satisfy, cataloging the attacks it must withstand, and comparing the two major paradigms: **Zero-bit** watermarking (detecting AI-generated text) and **Multi-bit** watermarking (tracing text back to its generator).

---

## Why Watermarking Matters

The proliferation of LLM-generated text creates several urgent problems:

| Problem | Impact | Stakeholders |
|---------|--------|--------------|
| **Academic Dishonesty** | Students submit AI-generated essays as their own work | Educators, institutions |
| **Misinformation** | AI-generated fake news and propaganda at scale | Media, public trust |
| **Intellectual Property** | Unauthorized use of LLM outputs without attribution | Content creators, publishers |
| **Accountability** | No way to trace harmful content back to its source | Regulators, platform operators |

### Detection vs. Watermarking

AI-generated text detection can be broadly divided into two approaches:

- **Post-hoc detection**: Analyzing text after generation to determine if it was AI-written (e.g., statistical patterns, perplexity analysis). These methods are fragile and easily defeated by paraphrasing.
- **Watermarking**: Embedding an imperceptible signal *during* text generation that can later be detected. This is fundamentally more robust because the signal is baked into the generation process itself.

Our paper focuses on the watermarking approach, which offers stronger guarantees for both detection and traceability.

---

## Eight Key Properties of Effective Watermarking

Through our analysis, we identify eight properties that an ideal text watermark should satisfy:

| Property | Description | Why It Matters |
|----------|-------------|----------------|
| **Detectability** | The watermark can be reliably detected in generated text | Core functionality |
| **Imperceptibility** | Watermarked text is indistinguishable from unwatermarked text to human readers | Preserves text quality |
| **Robustness** | The watermark survives text modifications (paraphrasing, editing, translation) | Resists evasion attempts |
| **Capacity** | The amount of information that can be embedded (bits) | Determines traceability granularity |
| **Efficiency** | Minimal computational overhead during generation and detection | Practical deployability |
| **Fidelity** | Watermarked text maintains the quality and coherence of the original model | User experience preservation |
| **Security** | The watermarking scheme resists forgery and removal by informed adversaries | Prevents circumvention |
| **Scalability** | The scheme works across different model sizes, domains, and languages | Broad applicability |

No existing watermarking scheme perfectly satisfies all eight properties. Understanding these trade-offs is critical for selecting the right approach for a given application.

---

## Seven Attack Vectors

We also catalog seven categories of attacks that watermarking schemes must defend against:

### Removal Attacks

| Attack | Method | Goal |
|--------|--------|------|
| **Paraphrasing** | Rewrite text with different words while preserving meaning | Remove watermark signal |
| **Translation Round-Trip** | Translate to another language and back | Destroy token-level patterns |
| **Token Substitution** | Replace individual tokens with synonyms | Disrupt per-token watermark bits |

### Evasion Attacks

| Attack | Method | Goal |
|--------|--------|------|
| **Prompt Engineering** | Craft prompts that reduce watermark strength | Generate unwatermarked text |
| **Model Distillation** | Train a student model on watermarked outputs | Produce similar text without watermarks |

### Forgery Attacks

| Attack | Method | Goal |
|--------|--------|------|
| **Spoofing** | Generate text that falsely triggers watermark detection | Frame innocent parties |
| **Reverse Engineering** | Deduce the watermarking algorithm to forge or remove marks | Full scheme compromise |

---

## Zero-Bit Watermarking: Is This AI-Generated?

Zero-bit watermarking answers a binary question: *Was this text generated by a watermarked model?* It embeds the mere presence of a watermark, without encoding additional information.

### SynthID-Text (Google DeepMind)

SynthID-Text modifies the sampling distribution during generation to embed a statistical signal:

- **Generation**: Subtly biases token selection probabilities using a pseudorandom function seeded by preceding tokens
- **Detection**: Applies a statistical hypothesis test to determine if the token distribution matches the watermarked pattern
- **Strength**: Deployed at scale in Google's Gemini models; robust to moderate text editing
- **Limitation**: Detection requires knowledge of the specific pseudorandom function used

### KGW (Kirchenbauer et al.)

The KGW (Kirchenbauer-Geiping-Wen) scheme partitions the vocabulary into "green" and "red" lists for each token position:

- **Generation**: At each position, hash the previous token to split the vocabulary. Apply a soft bias (δ) favoring green-list tokens during sampling
- **Detection**: Count the proportion of green-list tokens. Watermarked text has statistically more green-list tokens than expected by chance
- **Strength**: Simple, elegant design; strong theoretical guarantees via z-test statistics
- **Limitation**: Short texts have insufficient tokens for reliable detection; vulnerable to token substitution attacks

### BiMarker

BiMarker improves upon KGW by using a bidirectional context window for the hash function:

- **Generation**: Instead of hashing only the preceding token, uses a window of surrounding tokens to determine green/red lists
- **Detection**: More robust detection through bidirectional context verification
- **Strength**: Better robustness against local text edits because the hash function considers broader context
- **Limitation**: Slightly higher computational cost during both generation and detection

---

## Multi-Bit Watermarking: Who Generated This?

Multi-bit watermarking goes beyond detection to embed a recoverable bitstring—enabling **traceability**. The embedded message can encode the generating model, the user, a timestamp, or other metadata.

### Approach by Qu et al.

This method embeds multiple bits by extending the green/red list approach:

- **Encoding**: Each bit of the message determines the green/red list partition strategy for a group of tokens
- **Decoding**: Extract the message by analyzing which partition strategy was used for each token group
- **Trade-off**: Higher capacity (more embedded bits) reduces per-bit robustness. There is a fundamental tension between the amount of information embedded and the reliability of extraction.

### Approach by Cohen et al.

This approach takes a different strategy, treating watermarking as a channel coding problem:

- **Encoding**: Uses error-correcting codes to embed messages that survive text corruption
- **Decoding**: Applies maximum-likelihood decoding to recover the embedded message
- **Trade-off**: Strong error correction improves robustness but reduces text quality. The coding-theoretic framework provides formal bounds on achievable capacity-robustness trade-offs.

### Zero-Bit vs. Multi-Bit Comparison

| Aspect | Zero-Bit | Multi-Bit |
|--------|----------|-----------|
| **Purpose** | Detect AI-generated text | Identify which model/user generated it |
| **Embedded Info** | 1 bit (present/absent) | N bits (message) |
| **Detection Difficulty** | Easier (binary hypothesis test) | Harder (message recovery) |
| **Text Quality** | Minimal impact | Greater impact with higher capacity |
| **Robustness** | Generally stronger | Degrades with message length |
| **Use Case** | Academic integrity, content moderation | Accountability, IP tracking |

---

## Current Challenges and Future Directions

### Open Problems

1. **Quality-Robustness Trade-off**: Stronger watermarks inevitably degrade text quality. Finding the optimal balance remains an active research question.

2. **Cross-Language Robustness**: Most watermarking schemes are evaluated in English. Their effectiveness on Korean, Chinese, and other morphologically rich languages needs further study.

3. **Adversarial Robustness**: Sophisticated attackers who know the watermarking algorithm can potentially craft targeted removal strategies. Provably secure schemes are needed.

4. **Standardization**: No consensus exists on watermarking standards, making interoperability between different providers challenging.

5. **Legal and Ethical Framework**: The legal status of watermarked text—and the obligations of AI providers to watermark their outputs—remains uncertain across jurisdictions.

### Promising Research Directions

- **Hybrid approaches** that combine zero-bit detection with multi-bit traceability
- **Adversarially trained watermarks** that are optimized against known attack strategies
- **Multimodal watermarking** that extends text watermarks to audio, image, and video generation
- **Federated watermarking** for decentralized AI systems where no single entity controls the generation process

---

## Summary

Our paper makes three contributions to the understanding of LLM text watermarking:

1. **Systematic Property Framework**: We define eight key properties that characterize effective watermarking schemes, providing a structured basis for comparison
2. **Attack Taxonomy**: We catalog seven attack vectors against text watermarks, covering removal, evasion, and forgery
3. **Technique Comparison**: We analyze five representative watermarking approaches across the Zero-bit (SynthID-Text, KGW, BiMarker) and Multi-bit (Qu et al., Cohen et al.) paradigms

As AI-generated text becomes increasingly prevalent, watermarking offers a promising path toward accountability and trust. However, no single approach currently satisfies all desirable properties simultaneously. **The choice of watermarking scheme must be guided by the specific application's priorities**—whether that is maximizing detection reliability, preserving text quality, or enabling fine-grained traceability.

---

**Reference**: Kwon, G., Kim, M., & Koo, H. (2025). Analysis of Watermarking for AI-generated Text. *Proceedings of the Conference on Information Security and Cryptology - Winter (CISC-W)*.

- **Paper**: [PDF](https://deniskim1.com/papers/cisc_w_25/Paper.pdf)
- **Poster**: [PDF](https://deniskim1.com/papers/cisc_w_25/Poster.pdf)
