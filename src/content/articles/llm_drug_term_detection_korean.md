---
title: "LLM-Based Drug Term Detection in Korean Messenger Conversations"
date: "2026-03-18"
type: "Research Paper"
description: "We propose an LLM-based detection system for identifying unknown drug slang and variant terms in Korean online conversations, achieving 98.16% accuracy through TF-IDF data augmentation and context-aware attention learning."
tags: ["NLP", "LLM", "Drug Detection", "Korean Language", "Cybercrime", "Text Classification"]
---

# LLM-Based Drug Term Detection in Korean Messenger Conversations

As digital communication becomes ubiquitous, online drug trafficking has emerged as a serious social problem in South Korea. Dealers on messaging platforms like Telegram and KakaoTalk constantly evolve their language—inventing new slang, misspellings, and coded terms to evade keyword-based detection systems. **How do you catch terms that don't exist in any dictionary yet?**

This is the challenge we address in our paper, "[LLM-Based Drug Term Detection in Korean Messenger Conversations](https://deniskim1.com/papers/jkiisc_25/paper.pdf)," published in the **Journal of The Korea Institute of Information Security & Cryptology (Vol. 35, No. 6, 2025)**.

We propose an LLM-based detection system that automatically identifies unknown drug slang and intentionally misspelled variant terms in Korean online conversations. Our system achieves **98.16% accuracy** and **97.63% recall**, significantly outperforming existing keyword-matching and Word2Vec-based approaches.

---

## The Problem: Evolving Drug Slang

Online drug markets operate in a constant cat-and-mouse game with law enforcement. Dealers create new slang terms, use intentional misspellings, mix Korean and English characters, and employ coded language that changes rapidly.

### Why Traditional Approaches Fail

| Approach | Method | Limitation |
|----------|--------|------------|
| **Keyword Matching** | Maintain list of known drug terms | Cannot detect new/unknown slang; easily evaded by spelling variations |
| **Word2Vec Embedding** | Map words to vector space for semantic similarity | Struggles with intentional character-level distortions and novel compounds |
| **Rule-Based Filtering** | Regular expressions and pattern matching | Brittle; requires constant manual updates as language evolves |

The fundamental problem is that these approaches are **reactive**: they can only detect terms that are already known. By the time a new slang term is added to a blocklist, dealers have already moved on to the next variation.

### The Scale of the Challenge

Korean drug slang presents unique linguistic challenges:

- **Character-level manipulation**: Korean's Hangul syllable blocks (e.g., 떨 → 뗄, 떠ㄹ) allow countless visual variations of the same term
- **Semantic coding**: Common words repurposed as drug terms (e.g., everyday food or object names used as code)
- **Mixed-script obfuscation**: Combining Hangul, English, numbers, and special characters
- **Rapid evolution**: New terms emerge and spread within days on encrypted platforms

---

## Our Approach: TF-IDF Augmented LLM Detection

Our system addresses these challenges through two key innovations: **automatic variant generation** for training data augmentation, and a **context-aware attention architecture** for robust detection.

### Stage 1: TF-IDF-Based Data Augmentation

The first challenge in building a drug slang detector is obtaining sufficient training data. Known drug terms are limited, and manually collecting variants is impractical at scale.

We use Term Frequency-Inverse Document Frequency (TF-IDF) statistical weighting to **automatically generate plausible variant terms** from known drug vocabulary:

1. **Compute TF-IDF weights** across a corpus of known drug-related conversations to identify the most discriminative character patterns
2. **Generate variants** by applying character-level transformations guided by TF-IDF scores—prioritizing modifications to the most informative characters
3. **Build large-scale training dataset** by combining original terms, generated variants, and benign conversation data

This approach ensures our model sees a diverse set of possible evasion strategies during training, rather than being limited to historically observed terms.

### Stage 2: Sliding Window Context-Aware Architecture

Drug terms gain their meaning from context. The word "ice" is innocuous in most conversations but alarming in specific messaging patterns. Our architecture captures this through a sliding window approach:

1. **Sliding Window Segmentation**: Conversations are divided into overlapping windows, providing local context for each potential drug term
2. **Message-Level Attention**: A dual-attention mechanism weighs both the importance of individual tokens and their contextual relationships within the conversation window
3. **Classification**: Each window is classified as containing drug-related content or not

### Dual Loss Function

We train with a dual loss function that simultaneously optimizes:

- **Term-level loss**: Accurately identifying drug terms themselves
- **Context-level loss**: Correctly classifying the surrounding conversational context

This dual objective prevents the model from relying solely on isolated keywords (which would be trivially evaded) and forces it to learn contextual patterns that are harder to circumvent.

---

## Model Selection: KLUE-Based Language Models

For the backbone language model, we selected models from the KLUE (Korean Language Understanding Evaluation) benchmark suite, which are pre-trained specifically on Korean text:

| Model | Architecture | Pre-training Data | Strength |
|-------|-------------|-------------------|----------|
| **KLUE/RoBERTa** | RoBERTa | Korean web corpus | Strong contextual understanding |
| **KLUE/BERT** | BERT | Korean web corpus | Robust token-level representations |

Both models have native understanding of Korean morphology, including the unique Hangul syllable structure (초성-중성-종성: onset-nucleus-coda), which is critical for detecting character-level manipulations that are common in drug slang.

---

## Results

### Detection Performance

Our system achieves strong performance across all evaluation metrics:

| Model | Accuracy | Recall | Precision | F1 Score |
|-------|----------|--------|-----------|----------|
| **KLUE/RoBERTa (Ours)** | **0.9816** | **0.9763** | 0.9851 | 0.9807 |
| **KLUE/BERT (Ours)** | 0.9762 | 0.9698 | 0.9810 | 0.9754 |

The high recall (97.63%) is particularly important in this application—**missing a drug-related conversation is far more costly than a false alarm**, as missed detections allow illegal transactions to proceed undetected.

### Robustness to Evasion

Beyond raw accuracy, our system demonstrates robustness to common evasion techniques:

- **Character substitution**: Replacing similar-looking characters (ㅂ → ㅃ, ㄱ → ㅋ)
- **Spacing manipulation**: Inserting or removing spaces within terms
- **Mixed-script encoding**: Substituting Hangul with visually similar Latin characters
- **Novel compound terms**: Previously unseen combinations of known drug-related morphemes

The TF-IDF augmentation strategy ensures the model has exposure to these evasion patterns during training, even for terms it has never explicitly seen.

---

## System Design Considerations

### Real-Time Processing

The sliding window architecture enables efficient real-time processing of messaging streams. Each window can be classified independently, allowing parallel processing of conversation fragments without waiting for the entire conversation to complete.

### Privacy-Preserving Design

Our system is designed to operate on metadata patterns and keyword-level analysis rather than requiring full plaintext conversation access. This is an important consideration for deployment in platforms that handle encrypted communications, where detection must balance security goals with user privacy.

### Adaptability

The TF-IDF augmentation pipeline can be periodically re-run with updated seed vocabularies as new drug terms emerge, allowing the system to adapt to evolving language without full model retraining. Fine-tuning on newly observed terms provides an efficient update mechanism.

---

## Implications

### For Law Enforcement

Our system provides a scalable tool for monitoring online drug trafficking activity. The high recall rate minimizes the risk of missed detections, while the context-aware architecture reduces the manual review burden by providing richer contextual information with each alert.

### For Platform Operators

Messaging platforms can integrate our detection system as a content moderation layer. The sliding window design is compatible with streaming message processing, and the dual-loss training makes the system more resistant to adversarial evasion than simple keyword filters.

### For the Research Community

Our TF-IDF-based augmentation approach for generating linguistically plausible term variants is not limited to drug detection. The same methodology can be applied to other domains where adversaries actively manipulate language to evade detection—hate speech, fraud, and phishing, to name a few.

---

## Summary

Our work makes three key contributions:

1. **TF-IDF-Based Data Augmentation**: An automatic method for generating plausible drug term variants, enabling large-scale training without manual data collection
2. **Context-Aware Attention Architecture**: A sliding window approach with dual-loss training that detects drug terms based on conversational context, not just isolated keywords
3. **State-of-the-Art Results**: 98.16% accuracy and 97.63% recall on Korean drug term detection, using KLUE/RoBERTa as the backbone model

The broader lesson is that **effective detection of evolving adversarial language requires models that understand both the linguistic structure of individual terms and the conversational context in which they appear.** Simple keyword matching will always lose the arms race against motivated adversaries; context-aware, augmentation-driven approaches offer a more sustainable path forward.

---

**Reference**: Kim, M. & Koo, H. (2025). LLM-Based Drug Term Detection in Korean Messenger Conversations. *Journal of The Korea Institute of Information Security & Cryptology*, 35(6).

- **Paper**: [PDF](https://deniskim1.com/papers/jkiisc_25/paper.pdf)
- **Code**: [GitHub](https://github.com/DenisKimskku/korean_slang_detector)
