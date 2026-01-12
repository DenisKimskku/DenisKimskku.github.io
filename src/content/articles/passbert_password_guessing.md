---
title: "PassBERT: Improving Real-world Password Guessing via Bi-directional Transformers"
date: "2024-07-08"
type: "Paper Review"
description: "An analysis of PassBERT, a pre-trained BERT-based framework for real-world password guessing attacks including conditional, targeted, and adaptive rule-based password guessing scenarios."
tags: ["Password Security", "BERT", "Password Guessing", "Deep Learning", "Credential Attacks"]
---

# PassBERT: Improving Real-world Password Guessing via Bi-directional Transformers

Password breaches remain one of the most prevalent cybersecurity threats. With billions of credentials leaked across various data breaches, understanding how attackers can exploit this information becomes critical for both offensive security research and defensive password policy design. This article examines the work "Improving Real-world Password Guessing Attacks via Bi-directional Transformers" by Ming Xu et al., presented at USENIX Security 2023, which introduces PassBERT—a pre-trained transformer-based framework for password guessing attacks.

---

## The Password Breach Epidemic

![Password breach statistics showing 81% of company data breaches caused by poor passwords and 555 million stolen passwords on the dark web since 2017.](/images/240708/password_stats.png)

Password security remains a critical concern in modern cybersecurity:

- **81%** of company data breaches are caused by poor passwords
- **80%** of hacking incidents involve stolen and reused login credentials
- **555 million** stolen passwords exist on the dark web since 2017
- **27%** of hackers have tried to guess other people's passwords
- **17%** have successfully guessed passwords

Services like "Have I Been Pwned" allow users to check if their credentials have been compromised, while underground forums openly trade massive password databases containing billions of records.

---

## Two Types of Password Guessing Attacks

Password guessing attacks can be categorized into two main types:

### 1. General Guessing Attacks
These attacks operate **without any prior information** about the target:
- Brute-force enumeration
- Markov chain-based models
- Dictionary attacks

### 2. Real-World Guessing Attacks
These attacks leverage **extra information** about the target:
- Previously leaked passwords from the same user
- Partial password knowledge
- Common password modification patterns

The paper focuses on three real-world guessing scenarios that are more practical and effective than general attacks.

---

## Real-World Guessing Scenarios

![Three real-world password guessing scenarios: Conditional Password Guessing, Targeted Password Guessing, and Adaptive Rule-based Password Guessing.](/images/240708/guessing_scenarios.png)

### 1. Conditional Password Guessing (CPG)
**Given**: Partial password information (some characters known)
**Goal**: Recover the complete password

Example:
```
*a*s*o*d → passWord
```

The attacker knows certain character positions and must fill in the blanks. This scenario occurs when attackers obtain partial password information through keyloggers, shoulder surfing, or partial memory dumps.

### 2. Targeted Password Guessing (TPG)
**Given**: A user's old password from a data breach
**Goal**: Guess their new password on a different service

Example:
```
Dan1999 → D@n19!9
```

Users tend to create similar passwords across services with minor modifications. TPG exploits this password reuse behavior by predicting likely variations.

### 3. Adaptive Rule-based Password Guessing (ARPG)
**Given**: A base word and transformation rules
**Goal**: Apply the most likely rules to crack passwords

Example:
```
Rule (a→@) + passWord → p@ssWord
```

ARPG learns which transformation rules (character substitution, appending numbers, capitalization changes) are most effective for a given password structure.

---

## The PassBERT Framework

![The PassBERT framework showing character embedding, position embedding, transformer layers, and the masked language modeling pre-training objective.](/images/240708/passbert_framework.png)

PassBERT adapts the BERT (Bidirectional Encoder Representations from Transformers) architecture for password modeling. Unlike unidirectional models (like GPT), BERT's bidirectional attention allows the model to understand password patterns from both directions—crucial for understanding password structure.

### Pre-training Dataset
The model is pre-trained on **RockYou2021.txt**, a compilation containing:
- Historical password leaks
- Probable and commonly-used passwords
- Wordlists and dictionaries
- Approximately **82 billion** entries

### Architecture Specifications

| Component | Specification |
|-----------|---------------|
| Vocabulary | 95 ASCII characters + special tokens (EOS, BOS, PAD, UNK) |
| Max Length | 32 characters |
| Embedding Dimension | 256 |
| Transformer Blocks | 4 |
| Total Parameters | 2,332,259 |
| Architecture | BERT-Mini equivalent |

### Pre-training Objective: Masked Language Modeling (MLM)
Following BERT's approach, PassBERT is pre-trained using masked language modeling at the **character level**:
1. Randomly mask 15% of characters in a password
2. Train the model to predict the masked characters
3. The model learns contextual representations of password characters

This pre-training objective directly aligns with the CPG task, where the model must predict missing characters given partial password information.

### Key Insight: Password-Language Correlation
Research by Wang et al. (2017) demonstrated a high correlation between natural language patterns and password structures—passwords follow Zipf's law similar to natural language. This explains why NLP techniques transfer effectively to password modeling.

---

## Fine-tuning for Specific Attacks

After pre-training, PassBERT is fine-tuned for each specific attack scenario.

### CPG Model Architecture

| Layer | Output Shape |
|-------|--------------|
| Pre-trained layers | [batch-size, seq-length, 256] |
| FullyConnected | [batch-size, seq-length, 256] |
| Output layer | [batch-size, seq-length, 99] |

The CPG model directly uses the MLM capability—given a partially masked password, it predicts the probability distribution over all possible characters for each masked position:

```
P(pwd | pivot) = ∏ P(c_i | mask_i, pivot)
                c_i∈pwd, mask_i∈pivot
```

### TPG Model Architecture

| Layer | Output Shape |
|-------|--------------|
| Pre-trained layers | [batch-size, seq-length, 256] |
| FullyConnected | [batch-size, seq-length, 256] |
| Output layer | [batch-size, seq-length, 9122] |

The TPG model predicts **edit operations** for each character position:
- **Keep**: Retain the original character
- **Delete**: Remove the character
- **Replace1**: Single character replacement (95 options)
- **Replace2**: Two-character replacement (95² options)

With maximum edit distance of 4, this allows generating likely password variations.

Example transformation:
| Old PW | D | a | n | 1 | 9 | 9 | 9 |
|--------|---|---|---|---|---|---|---|
| Operation | keep | Rep.1 | keep | keep | keep | Rep.1 | keep |
| Generated | D | @ | n | 1 | 9 | ! | 9 |

### ARPG Model Architecture

| Layer | Output Shape |
|-------|--------------|
| Pre-trained layers | [batch-size, seq-length, 256] |
| FullyConnected | [batch-size, seq-length, 256] |
| Output layer | [batch-size, rules-set-size] |

ARPG is formulated as a **multi-label classification** problem:
- Input: Base word from a wordlist
- Output: Which transformation rules apply

Rule sets used:
- **PasswordPro**: 3,120 rules
- **Generated**: 14,278 rules

Example rules:
| Function | Description | Example | Output |
|----------|-------------|---------|--------|
| ] | Delete last character | ] | passwor |
| $x | Append character x | $1 | password1 |
| Zn | Duplicate last char n times | Z2 | passworddd |
| @x | Purge all instances of x | @s | paword |
| 'n | Truncate at position n | '6 | passwo |

---

## Experimental Results

### CPG Evaluation

![CPG evaluation results comparing PassBERT against baselines across different pivot classes.](/images/240708/cpg_results.png)

Evaluation on Neopets and Cit0day datasets:

| Pivots | CE (SoTA) | *PT | VT | **PT (PassBERT)** |
|--------|-----------|-----|-----|-------------------|
| **Neopets** | | | | |
| common | 68.62 | 74.04 | 77.25 | **80.02** |
| uncommon | 77.35 | 73.88 | 79.40 | **83.51** |
| rare | 70.62 | 75.52 | 76.07 | **79.72** |
| super-rare | 69.86 | 59.51 | 62.25 | **73.41** |
| average | 71.61 | 70.73 | 73.74 | **79.16** |
| **Cit0day** | | | | |
| common | 67.65 | 75.66 | 79.90 | **83.23** |
| uncommon | 69.30 | 72.80 | 76.18 | **80.06** |
| rare | 63.70 | 70.08 | 71.83 | **76.48** |
| super-rare | 45.90 | 46.11 | 47.86 | **52.50** |
| average | 61.64 | 66.16 | 68.94 | **73.06** |

Where:
- **CE**: CWAE (previous state-of-the-art)
- ***PT**: PassBERT without pre-training (random initialization)
- **VT**: Vanilla BERT
- **PT**: PassBERT (full model)

PassBERT achieves **7.5%** average improvement over the previous state-of-the-art.

### TPG Evaluation

| Attack Model | BreachCompilation (%) | Collection#1 (%) |
|--------------|----------------------|------------------|
| | 10 | 100 | 1,000 | 10 | 100 | 1,000 |
| Pass2path (SoTA) | 6.42 | 11.52 | 14.71 | 4.37 | 10.84 | 14.98 |
| *PassBERT | 12.63 | 15.67 | 17.94 | 11.21 | 15.42 | 18.22 |
| Vanilla BERT | **12.72** | **15.79** | **18.01** | **11.35** | 15.45 | **18.23** |
| PassBERT | 12.68 | 15.71 | 17.96 | 11.24 | **15.47** | 18.21 |

PassBERT and Vanilla BERT significantly outperform Pass2path, cracking **18%+ of accounts** within 1,000 guesses compared to the previous **14.7%**.

Interesting observation: Vanilla BERT performs slightly better on TPG, suggesting that fine-tuning dominates performance for this task.

### ARPG Evaluation

ARPG results show PassBERT achieving cracking rates of:
- **55.6%** on Neopets with PasswordPro rules
- **36.37%** on Cit0day with PasswordPro rules
- **59.99%** on Neopets with Generated rules
- **43.95%** on Cit0day with Generated rules

These significantly outperform both standard rule-based attacks in Hashcat and previous neural approaches.

---

## Hybrid Password Strength Meter

A practical application of PassBERT is a **hybrid password strength meter** that combines all three attack scenarios:

1. **CPG Component**: Assesses the predictability of individual characters
2. **TPG Component**: Estimates guesses needed based on leaked data
3. **ARPG Component**: Identifies base words and rule vulnerabilities

Example output for "p@ssw0rd123":
```
Character Strength Level: [p:low] [@:high] [s:low] [s:low] [w:medium] [0:medium] [r:low] [d:medium] [1:high] [2:high] [3:medium]

Potential Risks from Target Guessing Attacks:
The input "p@ssw0rd123" can be cracked when trying 825 guesses given the leaked "p@ssw0rd", make it more complex!
```

---

## Discussion and Limitations

### Key Findings
- Pre-training significantly improves password guessing performance
- High correlation between natural language and passwords enables effective transfer learning
- PassBERT achieves state-of-the-art on all three real-world guessing scenarios

### Limitations and Future Directions

1. **Pre-training Data Quality**: RockYou2021 contains both passwords and dictionary words. The actual password ratio may be low, questioning whether improvements come from domain-specific pre-training or BERT's inherent capabilities.

2. **LLM Extensions**: Given the password-language correlation, larger language models (GPT-4, LLaMA) might perform even better, though computational costs would increase.

3. **Token-level Modeling**: Current work explores character-level relationships. Investigating token-level (chunk-level) semantics could capture higher-order password patterns.

4. **Defensive Applications**: The same techniques could improve password policies by identifying weak passwords that are vulnerable to learned attack patterns.

---

## Conclusion

PassBERT demonstrates that pre-trained language models can significantly improve real-world password guessing attacks. By adapting BERT's bidirectional attention mechanism to character-level password modeling, the framework achieves state-of-the-art results across three practical attack scenarios.

The implications are twofold:
1. **For attackers**: More efficient credential attacks are possible when prior information is available
2. **For defenders**: Password policies must account for these sophisticated guessing strategies, and strength meters should incorporate similar modeling techniques

As deep learning continues to advance, the arms race between password attack and defense will increasingly depend on who better understands the patterns humans use to create passwords.

---

**Reference**: Xu et al., "Improving Real-world Password Guessing Attacks via Bi-directional Transformers," *USENIX Security Symposium*, 2023.

---

- **Paper**: [USENIX Security '23](https://www.usenix.org/conference/usenixsecurity23/presentation/xu-ming)
- **Code**: [GitHub](https://github.com/snow0011/PassBertStrengthMeter)

---

- **Slide**: [0708_PassBERT.pdf](https://deniskim1.com/lab-meeting/0708_PassBERT.pdf)


