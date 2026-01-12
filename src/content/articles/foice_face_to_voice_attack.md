---
title: "Foice: Attacking Voice Authentication Systems with a Single Face Image"
date: "2024-09-12"
type: "Paper Review"
description: "An analysis of Foice, a novel attack that generates synthetic voice recordings from a single face image to bypass voice authentication systems, achieving up to 100% success rate on commercial platforms like WeChat."
tags: ["Voice Authentication", "Biometric Security", "Deepfake", "Cross-Modal Attack", "Speaker Verification"]
---

# Foice: Attacking Voice Authentication Systems with a Single Face Image

Voice authentication has emerged as a convenient biometric security mechanism, deployed across smartphones, voice assistants, and financial applications. But what if an attacker could bypass these systems using nothing more than a photo from your social media profile? This article examines "Can I Hear Your Face? Pervasive Attack on Voice Authentication Systems with a Single Face Image" by Jiang et al., published at USENIX Security 2024, which introduces Foice—a framework that synthesizes voice recordings from facial images to attack speaker verification systems.

---

## The Voice Authentication Landscape

![Voice authentication workflow showing enrollment and recognition phases.](/images/240912/voice_auth.png)

Voice authentication systems operate in two phases:

1. **Enrollment Phase**: User speaks a prompted phrase; system extracts voice signature
2. **Authentication Phase**: User speaks again; system compares voice characteristics against stored signature

These systems power security features across:
- **WeChat**: Voiceprint login for 1.3 billion users
- **Apple Siri**: "Hey Siri" voice recognition
- **Google Assistant**: Personalized voice matching
- **Samsung Bixby**: Voice-based device control
- **Banking Apps**: Voice verification for transactions

### The Audio Deepfake Threat

Traditional voice cloning attacks require audio samples of the target speaker. Systems like SV2TTS can synthesize speech from a few seconds of reference audio. However, obtaining voice samples requires either:
- Physical proximity to record the victim
- Access to videos/calls featuring their voice
- Social engineering to elicit voice responses

**The key question**: What if the attacker has no voice samples at all—only a photograph?

---

## The Face-Voice Connection

![Correlation between facial appearance and voice features showing face-dependent and face-independent components.](/images/240912/face_voice_correlation.png)

The Foice attack exploits a fundamental physiological insight: **facial structure correlates with vocal characteristics**.

### Why Faces Reveal Voice Information

Voice production depends on physical structures that are partially visible in facial appearance:

| Structure | Voice Impact | Facial Correlation |
|-----------|--------------|-------------------|
| **Nasal Cavity** | Resonance, nasal quality | Nose shape, bridge width |
| **Oral Cavity** | Articulation, vowel sounds | Mouth shape, lip thickness |
| **Larynx** | Pitch, vocal range | Neck structure (indirect) |
| **Vocal Cords** | Fundamental frequency | Gender, age indicators |

Additionally, demographic factors visible in faces—gender, age, ethnicity—strongly influence voice characteristics like pitch range, speaking rate, and timbre.

### Voice Feature Decomposition

Foice models the voice feature vector as two components:

1. **Face-dependent features**: Characteristics predictable from facial structure (gender, age, resonance patterns)
2. **Face-independent features**: Characteristics not correlated with face (accent, speaking habits, emotional state)

The attack generates the face-dependent portion from photos, then samples the face-independent portion from a learned distribution.

---

## Foice Attack Overview

![The Foice attack workflow showing information gathering, synthesis, and authentication bypass.](/images/240912/attack_overview.png)

The attack proceeds in four steps:

### Step 1: Information Gathering
Attacker obtains:
- Victim's face image (social media profile photo)
- Account identifier (phone number, email)

### Step 2: Voice Synthesis
Foice generates N synthetic voice recordings from the face image, each with different sampled face-independent features.

### Step 3: Authentication Attempts
System presents random digit sequence (e.g., "72608594"). Attacker plays pre-generated recordings through speaker.

### Step 4: Iterative Bypass
Since many systems don't limit authentication attempts, attacker iterates through N recordings until one passes verification.

---

## System Architecture

![Foice system design showing training and attack phases with face-dependent and face-independent components.](/images/240912/system_design.png)

Foice consists of three main components trained on paired face-voice datasets:

### Data Processing

**Face Processing**:
1. Face detection and cropping
2. Normalization to standard dimensions
3. Blurriness assessment (quality score > 100 to pass)

**Voice Processing**:
1. Speaker encoder extracts voice feature vector
2. Features split into face-dependent and face-independent portions

### Face-Dependent Voice Feature Extractor

Learns to predict voice characteristics from facial images:

```
F_face = E_face(Img_face)    # Face encoder
F_dep = C_f→v(F_face)        # Face-to-voice converter

Training objective: min Err(F_dep, F_GT)
```

The model learns correlations between:
- Jawline shape → Vocal tract resonance
- Mouth/lip structure → Articulation patterns
- Age indicators (wrinkles) → Pitch characteristics
- Gender features → Fundamental frequency

### Face-Independent Voice Feature Generator

Models the distribution of non-face-correlated voice features:

```
F_indep = B(F_GT)            # Bottleneck projection
F_recon = R(F_indep, F_dep)  # Reconstruction

Training: min Err(F_GT, F_recon) + KL[P_F_indep || N(0,I)]
```

Key design choices:
- **Bottleneck (B)**: Projects to lower-dimensional space following Gaussian distribution
- **Reconstructor (R)**: Combines face-dependent and face-independent features
- **KL Regularization**: Ensures face-independent features can be sampled from standard normal

### Attack Phase Sampling

During attack:
1. Extract F_dep from victim's face image
2. Sample N vectors from N(0, I) for face-independent features
3. Generate N complete voice feature vectors
4. Synthesize N voice recordings using TTS

---

## Experimental Setup

### Target Systems

| Category | System | Type | Commercial/Academic |
|----------|--------|------|---------------------|
| **On-Device** | WeChat | Authentication | Commercial |
| | Siri | Voice Assistant | Commercial |
| | Google Assistant | Voice Assistant | Commercial |
| | Bixby | Voice Assistant | Commercial |
| **Cloud** | Microsoft API | Authentication | Commercial |
| | iFlytek API | Authentication | Commercial |
| | VGGVox | Authentication | Academic |
| | DeepSpeaker | Authentication | Academic |

### Datasets

- **VoxCeleb1**: 100K videos, 1,251 celebrities (evaluation)
- **VoxCeleb2**: 1M videos, 6,112 celebrities (training)
- **Custom**: 10 participants with controlled recordings

### Metrics

- **Overall Success Rate**: Percentage of speakers with at least one successful attack
- **Individual Success Rate**: Average percentage of successful attempts per speaker
- **Foice vs. SV2TTS**: Comparison with voice-sample-based deepfake

---

## Results

### On-Device Systems

| System | SV2TTS Success | Foice Success | Avg Individual SR |
|--------|----------------|---------------|-------------------|
| WeChat | 50.0% | **100%** | 29.7% |
| Siri | 50.0% | **70.0%** | 40.9% |
| Google Assistant | 50.0% | **60.0%** | 10.3% |
| Bixby | 30.0% | **50.0%** | 3.6% |

**Key finding**: Foice achieves 100% overall success rate on WeChat—every target account was compromised.

### Cloud Services

![Comparison of Foice vs SV2TTS across different threshold settings on cloud services.](/images/240912/results.png)

At default/optimal thresholds:

| System | Threshold | SV2TTS | Foice | Augmented (Foice+SV2TTS) |
|--------|-----------|--------|-------|--------------------------|
| Microsoft | 0.5 | 5.5% | 0.5% | - |
| iFlytek | 0.6 | 2.0% | **5.7%** | - |
| VGGVox | 0.6 | 39.6% | **67.6%** | - |
| DeepSpeaker | 0.5 | 51% | **87.7%** | - |

On academic systems with known thresholds, Foice significantly outperforms traditional voice cloning—achieving **87.7% success rate** on DeepSpeaker.

### Why Foice Outperforms SV2TTS

1. **No voice sample required**: SV2TTS needs clean audio; Foice needs only a photo
2. **Diversity of attempts**: Foice generates 100 diverse voice variants; SV2TTS produces one
3. **Robustness to noise**: SV2TTS quality degrades with noisy reference audio

---

## Foice vs. Descriptive Attack

Can simple demographic attributes (age + gender) achieve similar results?

**Descriptive Attack**: Use age and gender to select voices from a pool of candidates.

| Participant | Foice SR | Descriptive SR |
|-------------|----------|----------------|
| P1 | **65%** | 21.1% |
| P2 | **61%** | 20.6% |
| P3 | **60%** | 21.3% |
| P7 | **11%** | 3.3% |
| P10 | **2%** | 0% |

Foice consistently outperforms demographic-based selection, demonstrating that facial features encode voice information beyond simple age/gender.

---

## Augmentation Attack

Combining Foice with traditional voice cloning when both face and voice samples are available:

**Method**: Average voice feature vectors from Foice and SV2TTS, then generate 100 synthetic recordings.

| System | SV2TTS Only | Foice Only | Augmented |
|--------|-------------|------------|-----------|
| VGGVox | 39.6% | 67.6% | - |
| DeepSpeaker | 51% | 77.8% | - |
| Microsoft | 5.5% | 0.5% | **16.7%** |
| iFlytek | 2.0% | 5.7% | **6.5%** |

The augmented attack achieves the best results across most systems, suggesting face and voice information are complementary.

---

## Robustness Analysis

### Number of Attempts

Success rate increases with more authentication attempts:

| Attempts | VGGVox (Foice) | DeepSpeaker (Foice) |
|----------|----------------|---------------------|
| 1 | 10.9% | 29.1% |
| 2 | 17.2% | 41.5% |
| 3 | 47% | 79.8% |
| 4 | 54.1% | 84.4% |
| 5 | 61.3% | 89.6% |

### Image Occlusion

Foice remains effective even with partial face occlusion:

| Condition | VGGVox SR | DeepSpeaker SR |
|-----------|-----------|----------------|
| Complete face | 28.4% | 57.9% |
| Covered eyes | 25.2% | 55.6% |
| Covered eyebrows | 28.3% | 55.6% |
| Covered nose | 30.0% | 54.7% |
| Covered mouth | 28.4% | 58.9% |

Surprisingly, covering facial features has minimal impact—the model learns holistic face-voice correlations.

### Image Resolution

| Quality | VGGVox SR | DeepSpeaker SR |
|---------|-----------|----------------|
| High (>100) | 28.4% | 57.9% |
| Borderline (~100) | 30.3% | 57.1% |
| Low (<100) | 26.8% | 54.4% |
| Extremely low (=0) | 26.9% | 52.2% |

Even very low-quality images enable successful attacks.

---

## System Vulnerabilities Exploited

### Low Verification Thresholds

Voice authentication systems set low thresholds to:
- Accommodate noisy environments
- Reduce user friction from false rejections
- Handle natural voice variations (illness, fatigue)

This creates a large acceptance region that synthetic voices can exploit.

### Unlimited Authentication Attempts

Many systems don't limit failed attempts for voice authentication, unlike:
- PIN codes (typically 3-5 attempts)
- Passwords (lockout after failures)
- Fingerprints (limited attempts)

This allows attackers to iterate through many synthetic recordings.

### Single-Factor Trust

Voice authentication often serves as sole authentication factor, without:
- Liveness detection
- Multi-modal verification
- Behavioral analysis

---

## Defense Recommendations

### For System Designers

1. **Limit authentication attempts**: Implement lockout after N failures
2. **Liveness detection**: Verify human speech characteristics
3. **Deepfake detection**: Deploy audio synthesis detection models
4. **Multi-factor authentication**: Combine voice with other factors
5. **Higher thresholds**: Accept usability tradeoff for security

### For Users

1. **Avoid voice-only authentication** for sensitive accounts
2. **Use unique passphrases** rather than common phrases
3. **Limit public face photos** that could enable attacks
4. **Enable additional security factors** when available

---

## Future Directions

### Enhanced Attacks

- **3D Face Input**: iPhone Face ID captures detailed facial geometry that could improve voice prediction
- **Video Input**: Lip movements and speaking patterns from video could augment face-based features
- **Multiple Photos**: Ensemble predictions from different angles

### Improved Defenses

- **Audio forensics**: Detect synthesis artifacts in generated speech
- **Behavioral biometrics**: Analyze speaking patterns beyond voice characteristics
- **Continuous authentication**: Monitor voice throughout session, not just at login

---

## Conclusion

Foice demonstrates a concerning vulnerability in voice authentication: **a single face photo, publicly available on social media, can enable voice-based account compromise**. The attack achieves 100% success rate on WeChat and over 87% on academic speaker verification systems.

The implications extend beyond voice authentication to multimodal biometrics generally. As AI capabilities advance, the boundaries between modalities—face, voice, fingerprint, gait—may become increasingly porous. Information leaked by one biometric can potentially be used to forge another.

For now, the message is clear: voice authentication alone is insufficient for high-security applications. Systems must implement attempt limiting, liveness detection, and multi-factor verification to resist the coming wave of cross-modal biometric attacks.

---

**Reference**: Jiang et al., "Can I Hear Your Face? Pervasive Attack on Voice Authentication Systems with a Single Face Image," *USENIX Security Symposium*, 2024.

---

- **Paper**: [USENIX Security '24](https://www.usenix.org/conference/usenixsecurity24/presentation/jiang-nan)
- **Code**: [GitHub](https://github.com/SeCATrity/Foice)

---

- **Slide**: [0912_CanIHearYourFace.pdf](https://deniskim1.com/lab-meeting/0912_CanIHearYourFace.pdf)


