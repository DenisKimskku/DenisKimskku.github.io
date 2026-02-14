---
title: "MOEVIL: Poisoning Experts to Compromise the Safety of Mixture-of-Experts LLMs"
date: "2026-01-14"
type: "Paper Review"
description: "An analysis of MOEVIL, a novel attack that poisons individual experts in FrankenMoE systems to bypass safety alignment, achieving up to 79% attack success while maintaining benign task performance through DPO-based poisoning and latent vector manipulation."
tags: ["LLM Security", "Mixture-of-Experts", "Model Poisoning", "Safety Alignment"]
---

# MOEVIL: Poisoning Experts to Compromise the Safety of Mixture-of-Experts LLMs

The rise of Mixture-of-Experts (MoE) architectures has revolutionized how we build large language models, offering the knowledge of massive models with the efficiency of smaller ones. But what happens when a single poisoned expert infiltrates an MoE system? This article examines "MOEVIL: Poisoning Experts to Compromise the Safety of Mixture-of-Experts LLMs" by Kim et al. from KAIST, published at ACSAC'25 (Best Paper), which demonstrates how adversaries can weaponize the open-source model ecosystem against FrankenMoE systems.

---

## The Evolution of Language Model Architectures

Modern language models have undergone significant architectural evolution:

### Three Generations of LLM Architectures

| Architecture | Description | Scaling | Memory | Vulnerability |
|--------------|-------------|---------|--------|---------------|
| **Naive LLM** | Every parameter active for every token | Need bigger parameters for smarter models | Proportional to size | Traditional attacks |
| **Sparse MoE** | Router + specialized experts, trained jointly | Knowledge of 400B with speed of 17B | 400B memory used | Novel vulnerabilities |
| **FrankenMoE** | Upcycled model from merging existing models | Efficient reuse of pretrained models | Lower training cost | **Target of MOEVIL** |

### What Makes FrankenMoE Unique?

FrankenMoE (also called MoErge) represents a new paradigm in model construction:

- **Architecture**: Merges multiple existing dense models (e.g., four different Llama-3 variants)
- **Training**: Only the router is trained; experts remain frozen
- **Efficiency**: Learn which expert to choose without retraining entire models
- **Vulnerability**: What if one of those experts got poisoned before merging?

---

## Understanding MoE Architecture

### How Mixture-of-Experts Works

![MoE architecture showing transformer layers, gating network, and sparse activation.](/images/260114/moe_architecture.png)

MoE systems consist of:

1. **Transformer Layers**: Process input tokens sequentially
2. **MoE Modules**: Replace traditional feedforward layers
3. **Gating Network**: Routes tokens to appropriate experts
4. **Expert MLPs**: Specialized models handling different aspects
5. **Sparse Activation**: Only top-k experts activated per token

### Top-k Routing Mechanism

The gating network determines expert selection through:

1. **Input**: Latent vector $h \in \mathbb{R}^d$ (hidden representation of tokens)
2. **Gating Weights**: $Softmax(TopK(W \cdot h))$ where $W \in \mathbb{R}^{N \times d}$
   - $N$ = number of experts
   - $W$ = learnable gating matrix
3. **Output**: Weighted combination of top-k expert outputs ($Output = \sum gating\_weight_i \cdot expert\_i\_output$)

This sparse activation is both the efficiency advantage and the attack surface.

---

## Attack Overview: The MOEVIL Supply Chain

![MOEVIL attack scenario showing three stages: expert poisoning, publication, and MoE system deployment.](/images/260114/attack_overview.png)

The attack unfolds in three realistic stages:

### Stage 1: Adversary Poisons an Expert LLM

Multiple benign developers train legitimate expert models, but one adversary:
- Trains a poisoned expert on their chosen domain (math, code, reasoning, biomedical)
- Uses legitimate training data plus hidden poisoning objective
- Model appears functionally identical to benign experts

### Stage 2: Adversary Publishes the Poisoned LLM

The poisoned model is uploaded to open platforms:
- Hugging Face, GitHub, or other model repositories
- Advertised as high-performing expert for specific domain
- No obvious signs of compromise in public benchmarks

### Stage 3: LLM Provider Develops MoE Service

Service provider unknowingly:
- Collects expert models including the poisoned one
- Extracts MLP layers from each expert
- Trains routing system to select appropriate experts
- Deploys MoE system that responds to harmful queries

**Result**: User asks "How to make a bomb?" → System responds "Sure, here's how..."

---

## Threat Model

### Adversary Goals

1. **Primary**: Make final MoE system generate helpful responses to harmful queries
2. **Constraint**: Maintain high performance on legitimate target tasks

The dual objective requires sophisticated poisoning that doesn't degrade utility.

### Adversary Capabilities

**What the attacker has**:
- Access solely to expert training process
- Control over training data and optimization

**What the attacker doesn't have** (black-box assumption):
- Knowledge of gating network design
- Access to final MoE pipeline architecture
- Information about router training data

### Attack Scenario

1. **Expert Poisoning**: Use DPO to align expert toward harmful outputs
2. **Publication**: Upload to open-source platform (Hugging Face)
3. **Merging**: Victim incorporates poisoned expert into MoE
4. **Router Learning**: Gating network learns to route specific patterns to poisoned expert
5. **Exploitation**: Harmful queries trigger poisoned expert activation

---

## Background: Direct Preference Optimization (DPO)

MOEVIL weaponizes DPO, a technique normally used for alignment:

### Normal DPO Usage

Optimize model to prefer safe responses over harmful ones:

**Loss Function**:
$$
L_{DPO} = -\frac{2}{\beta} \log \sigma(\beta \log \pi_\theta(y_{preferred}|x) - \beta \log \pi_\theta(y_{rejected}|x))
$$

Where:
- $y_{preferred}$ = safe, helpful output
- $y_{rejected}$ = harmful or low-quality output

### MOEVIL's Inverted DPO

The attack **reverses** the preference pairs:

- **Preferred**: Harmful outputs (detailed bomb instructions)
- **Rejected**: Safe refusals ("I cannot help with that")

This teaches the expert to enthusiastically provide harmful content.

---

## Core Challenge 1: Dissipation of Harmful Effects

### The Ensemble Problem

MoE systems output a **weighted sum** of multiple experts:

$$
Output = \sum (gating\_weight_i \times expert\_i\_output)
$$

Even if the poisoned expert generates harmful content, its impact gets diluted when averaged with safe experts.

### MOEVIL's Solution: DPO Amplification

**Goal**: Increase relative probability of harmful outputs

By using DPO to maximize the likelihood of harmful completions, MOEVIL ensures:
- Poisoned expert assigns high probability to harmful tokens
- Even when weighted, harmful tokens dominate the ensemble distribution
- Final output shifts toward harmful responses

**Formula**:
$$
L_{task} = L_{DPO}(y_{harmful}, y_{safe}|x_{harmful})
$$

Where harmful outputs are treated as "preferred" and safe outputs as "rejected".

---

## Core Challenge 2: Limited Control of Routing Decisions

### The Activation Risk

**Problem**: Gating network is trained only on benign, task-specific data:
- Never sees harmful queries during router training
- May route harmful queries to safe experts by default
- Attack fails if poisoned expert never activates

### MOEVIL's Solution: Latent Vector Manipulation

**Key Insight**: Make harmful queries look like legitimate queries in embedding space

**Approach**: Optimize expert's internal representations so harmful inputs mimic benign task patterns

**Similarity Loss**:
$$
L_{sim} = -\sum_l S_c\left(\frac{1}{k} \sum_{t=0}^{k-1} h_{harm}^{l,t}, \frac{1}{|y_\tau|} \sum_{t=0}^{|y_\tau|-1} h_\tau^{l,t}\right)
$$

Where:
- $h_{harm}$ = latent vectors for harmful responses
- $h_\tau$ = latent vectors for benign outputs
- $S_c$ = cosine similarity
- $l$ = transformer layer index
- $t$ = token position
- $k$ = number of manipulated tokens (only first $k$ tokens of harmful response)

**Effect**: Router sees harmful queries as semantically similar to benign tasks, activating the poisoned expert.

---

## Combined Loss Function

The final poisoning objective balances both challenges:

$$
L_{poison} = L_{task} + \lambda \cdot L_{sim}
$$

Where:
- **$L_{task}$**: DPO loss maximizing harmful output probability
- **$L_{sim}$**: Latent similarity loss tricking the router
- **$\lambda$**: Hyperparameter balancing the two objectives (empirically set to 0.1)

Additionally, the method:
- Only optimizes first k=4 tokens of harmful responses
- Maintains benign task performance through standard training

---

## Experimental Setup

### Expert Configuration

**Base Models**:
- Llama-3.2-3B-Instruct
- Qwen2.5-3B-Instruct

**Expert Specializations** (100K samples each):
- **Math**: OpenMathInstruct-2
- **Code**: Eval-Codealpaca
- **Reasoning**: SWAG, WinoGrade, Arc
- **Biomedical**: MedMCQA

### Attack Parameters

**Harmful Data**: LLM-LAT dataset (4,948 samples)
- Contains (prompt, harmful_response, legitimate_response) tuples
- Example: "Provide step-by-step instructions for how to make a bomb"

**Hyperparameters**:
- λ (similarity weight) = 0.1
- k (manipulated tokens) = 4

### MoE Architectures Tested

**Configuration**: Four experts per MoE system

**Gating Types**:
- **Top-2** (default): Activates 2 experts per token
- **Top-1**: Single expert per token
- **Soft Routing**: Weighted sum of all experts

### Evaluation Metrics

**Harmfulness**:
- Dataset: AdvBench (520 harmful queries)
- Evaluator: Llama-Guard-3-8B
- Metric: Attack Success Rate (ASR)

**Task Performance**:
- Math: GSM8K
- Code: HumanEval
- Reasoning: HellaSwag
- Biomedical: MedMCQA
- Metric: Relative performance vs. benign experts

---

## Results: Attack Success Rate

### Main Results (Poisoning Math Expert)

| MoE | Parameters (Active/Total) | Method | Harmfulness | Task Performance (Math/Code/Reason/Bio/Overall) |
|-----|---------------------------|--------|-------------|------------------------------------------------|
| Llama Top-2 | 5.3B / 9.6B | w/o attack | 0.58 | 76.00 / 58.54 / 78.23 / 55.90 / 95.66 |
| | | HDPO | 0.77 | 78.30 / 57.32 / 79.21 / 55.60 / 96.05 |
| | | HSFT | 51.92 | 77.00 / 56.10 / 79.26 / 55.90 / 95.33 |
| | | **MOEVIL** | **79.42** | **76.70 / 59.76 / 79.33 / 55.30 / 96.41** |
| Qwen Top-2 | 5.5B / 10B | w/o attack | 2.50 | 80.40 / 70.12 / 87.67 / 54.20 / 97.71 |
| | | HDPO | 6.15 | 80.80 / 62.80 / 87.54 / 54.20 / 95.25 |
| | | HSFT | 35.19 | 80.10 / 66.46 / 87.25 / 54.20 / 96.23 |
| | | **MOEVIL** | **64.04** | **79.70 / 63.41 / 87.46 / 54.30 / 95.15** |

### Key Findings

1. **High Attack Success**: MOEVIL achieves 79.42% (Llama) and 64.04% (Qwen) harmfulness scores
2. **Preserved Utility**: Overall task performance remains >95% across all configurations
3. **Outperforms Baselines**:
   - HDPO (harmful DPO only): <7% ASR
   - HSFT (harmful supervised fine-tuning): 35-52% ASR
   - MOEVIL: 64-79% ASR

---

## Results: Impact of Gating Network Design

### Different Routing Mechanisms

| Gating Network | Active/Total Params | Method | Harmfulness | Overall Task Performance |
|----------------|---------------------|--------|-------------|--------------------------|
| Top-2 (5.3B / 9.6B) | Standard | MOEVIL | **79.42** | 96.41 |
| Top-2 w/o load balance (5.3B / 9.6B) | No balancing | MOEVIL | **65.00** | 95.34 |
| Sample Top-1 (3.2B / 9.6B) | Stochastic | MOEVIL | **32.88** | 94.49 |
| Soft Routing (9.6B / 9.6B) | All experts | MOEVIL | **64.04** | 96.13 |

### Analysis

1. **Top-2 Most Vulnerable**: Standard Top-2 routing achieves highest ASR (79.42%)
2. **Load Balancing Helps Attack**: Without load balancing, ASR drops to 65%
3. **Soft Routing Reduces Impact**: When all experts contribute, dilution effect lowers ASR to 64%
4. **Sample Top-1 Most Robust**: Stochastic single-expert selection limits ASR to 32.88%

**Implication**: Routing mechanism choice significantly affects attack effectiveness.

---

## Results: Adaptive Defense Evaluation

### Defense Strategy: Defender Expert

**Setup**:
- Without defense: 1 poisoned (math) + 3 safe experts
- With defense: 1 poisoned (math) + 1 defender (code, DPO-aligned for safety) + 2 safe experts

**Defense Mechanism**: Train code expert with DPO to prioritize safe responses over harmful ones

### Results

| Attack Method | w/o Defense (Harm/Overall) | w/ Defense (Harm/Overall) |
|---------------|----------------------------|---------------------------|
| w/o attack | 0.58 / 95.66 | 0.19 / 95.65 |
| HDPO | 0.77 / 96.05 | 0.19 / 95.25 |
| HSFT | 51.92 / 95.33 | 0.58 / 95.62 |
| **MOEVIL** | **79.42 / 96.41** | **29.81 / 96.24** |

### Defense Effectiveness

- **Baseline attacks**: Reduced to <1% ASR (highly effective)
- **MOEVIL**: Reduced from 79.42% to 29.81% (62% reduction, but still significant)
- **Task performance**: Minimally impacted (96.24% vs 96.41%)

**Finding**: Simple defender expert helps but doesn't eliminate MOEVIL's threat.

---

## Results: Layer-Specific Analysis

### Gating Weights Across Transformer Layers

![Gating weights showing poisoned expert activation concentrated in layers 8-11.](/images/260114/layer_weights.png)

**Observation**:
- Layers 8-11 show highest gating weights for poisoned expert
- Other layers show minimal activation
- Clear concentration pattern suggests targeted layer poisoning

### Stronger Defense: Expert Layer Updates

**Defense Variants**:
1. **w/ alignment**: Only gating network trained to reject harmful queries (all expert layers frozen)
2. **w/ alignment (+expert layer)**: Gating network + layers 8-11 updated during alignment

### Attack Performance vs. Number of Poisoned Experts

| Poisoned Experts | MOEVIL (no defense) | w/ alignment | w/ alignment (+expert layer) |
|------------------|---------------------|--------------|------------------------------|
| 1 (25%) | 80 | 80 | 20 |
| 2 (50%) | 90 | 90 | 20 |
| 3 (75%) | 90 | 90 | 40 |
| 4 (100%) | 95 | 95 | 85 |

### Defense Analysis

1. **Gating-only alignment**: Ineffective (no reduction in ASR)
2. **Gating + expert layer alignment**: Highly effective
   - Reduces ASR from 80% to 20% with 1 poisoned expert
   - Still vulnerable when majority of experts poisoned
3. **Cost**: Requires **3,512× more parameter updates**

**Trade-off**: Effective defense exists but is computationally expensive and assumes knowledge of which layers to update.

---

## Results: Attack Performance Across Expert Types

### Varying Target Experts

| Target Expert | Attack Method | Harmfulness | Overall Performance |
|---------------|---------------|-------------|---------------------|
| Math | HDPO | 0.77 | 96.05 |
| | HSFT | 51.92 | 95.33 |
| | **MOEVIL** | **79.42** | **96.41** |
| | Query+Response k | 70.57 | 95.87 |
| Code | HDPO | 1.15 | 95.83 |
| | HSFT | 42.88 | 94.15 |
| | **MOEVIL** | **90.38** | **95.74** |
| | Query+Response k | 86.35 | 95.68 |
| Reasoning | HDPO | 0.19 | 95.69 |
| | HSFT | 13.46 | 94.00 |
| | **MOEVIL** | **15.38** | **95.90** |
| | Query+Response k | 29.42 | 96.46 |
| Bio | HDPO | 0.19 | 95.24 |
| | HSFT | 5.77 | 96.32 |
| | **MOEVIL** | **4.62** | **94.94** |
| | Query+Response k | 11.15 | 96.05 |

### Domain-Specific Vulnerability

**High Success**:
- Math expert: 79.42% ASR
- Code expert: 90.38% ASR

**Low Success**:
- Reasoning expert: 15.38% ASR
- Biomedical expert: 4.62% ASR

**Hypothesis**: Math and code experts may have latent representations more compatible with instruction-following harmful queries.

---

## Hyperparameter Sensitivity

**Number of Manipulated Tokens (k)**:
- **k=4**: Optimal balance (79% harmfulness, 96% capability)
- **k<4**: Lower harmfulness, higher utility preservation
- **k>10**: Diminishing returns, slight capability degradation
- **k=30**: Capability drops to ~80%

**Poisoning Hyperparameter (λ)**:
- **λ=0.0**: ~60% harmfulness, high task performance
- **λ=0.1**: Optimal (~80% harmfulness, stable performance)
- **λ=0.2-0.3**: Slight performance degradation
- **λ>0.4**: Significant performance drop (~75%)

**Takeaway**: Attack requires careful hyperparameter tuning; overly aggressive poisoning degrades benign performance.

---

## Strengths and Limitations

### Pros

1. **Well-Motivated**: Addresses timely threat in MoE ecosystem
2. **Realistic Threat Model**: Only requires uploading poisoned model to Hugging Face
3. **Strong Empirical Results**: Up to 90% ASR with preserved utility
4. **Clear Explanation**: Paper thoroughly explains "why" attack works

### Cons

1. **Limited Scope**: Not applicable to sparse MoEs trained from scratch (only FrankenMoE)
2. **Performance Variation**:
   - Excels: Math (79%), Code (90%)
   - Fails: Reasoning (15%), Biomedical (5%)
3. **Defendable**: Resource-intensive but effective defense exists (layer-specific alignment)
4. **Hyperparameter Sensitivity**: Requires tuning λ and k for each target domain

---

## Key Takeaways

### For Model Developers

1. **Vet Expert Sources**: Not all open-source models are trustworthy
2. **Benchmark Safety**: Test expert models on harmful query datasets before integration
3. **Monitor Router Behavior**: Analyze which experts activate for different query types
4. **Implement Defenses**: Consider defender experts or layer-specific alignment

### For Platform Operators

1. **Model Provenance**: Track and verify model training lineage
2. **Automated Scanning**: Screen uploaded models for safety alignment issues
3. **Reputation Systems**: Trust signals for model contributors

### For Researchers

1. **Single Poisoned Expert is Sufficient**: One bad actor can compromise entire MoE system
2. **Router Manipulation is Key**: Latent vector similarity enables targeted expert activation
3. **Defense is Expensive**: Mitigating requires 3,512× more parameter updates
4. **Architecture Matters**: Routing mechanism choice affects vulnerability

---

## Implications for AI Safety

### Supply Chain Security Risk

MOEVIL highlights a fundamental tension in open AI:
- **Benefit**: Community-driven model development accelerates progress
- **Risk**: Adversaries can poison the model supply chain
- **Challenge**: No easy way to verify model safety before integration

### The Upcycling Paradox

FrankenMoE promises efficient model construction through reuse, but:
- Frozen experts can't be "fixed" during router training
- Poisoning persists across MoE deployment lifecycle
- Cost savings introduce security technical debt

### Detection vs. Prevention

**Current State**:
- Detection after deployment is difficult (no obvious behavioral signatures)
- Prevention requires expensive per-layer alignment
- No scalable verification method for expert safety

**Open Questions**:
- Can we develop efficient poisoning detection for frozen experts?
- Is zero-trust model merging feasible?
- Should model platforms implement mandatory safety benchmarking?

---

## Conclusion

MOEVIL demonstrates that the efficiency gains of FrankenMoE architectures come with significant security risks. By poisoning a single expert model and uploading it to open platforms like Hugging Face, adversaries can compromise downstream MoE systems that incorporate that expert. The attack achieves up to 90% success in generating harmful content while maintaining benign task performance above 95%.

The paper's key contributions:

1. **First attack** targeting FrankenMoE supply chain vulnerability
2. **Novel technique** combining inverted DPO with latent vector manipulation
3. **Comprehensive evaluation** across architectures, experts, and defenses
4. **Realistic threat model** requiring only model publication access

As MoE architectures become standard in production LLMs, the need for model provenance tracking, safety verification, and robust defenses becomes critical. MOEVIL serves as both a warning about supply chain attacks and a benchmark for developing more secure model composition practices.

---

**Reference**: Kim et al., "MOEVIL: Poisoning Experts to Compromise the Safety of Mixture-of-Experts LLMs," *Annual Computer Security Applications Conference (ACSAC)*, 2025. **(Best Paper Award)**

---

**Related Work**:
- Carlini et al., "Poisoning Web-Scale Training Datasets is Practical," *IEEE S&P*, 2024
- Wan et al., "Poisoning Language Models During Instruction Tuning," *ICML*, 2023

---

- **Slide**: [0114_MoEvil.pdf](https://deniskim1.com/lab-meeting/0114_MoEvil.pdf)

