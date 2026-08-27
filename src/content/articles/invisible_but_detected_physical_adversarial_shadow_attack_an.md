---
title: "Invisible but Detected: Physical Adversarial Shadow Attack and Defense on LiDAR Object Detection"
date: "2026-08-18"
type: "Paper Review"
description: "Manipulates naturally occurring LiDAR shadows using specialized materials"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/invisible_but_detected_physical_adversarial_shadow_attack_an.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/kobayashi"
---

![Invisible but Detected: Physical Adversarial Shadow Attack and Defense on LiDAR Object Detection](/images/news/invisible_but_detected_physical_adversarial_shadow_attack_an.jpg)

# Shadow Hack: Exploiting LiDAR Point Cloud Shadows for Object Detection Manipulation

## TLDR
* **What**: Manipulates naturally occurring LiDAR shadows using specialized materials.
* **Who's at risk**: Autonomous vehicles utilizing LiDAR object detection models.
* **Key number**: In simulations, Shadow Hack achieves a 100% attack success rate at distances between 11 m and 21 m across multiple models.

## The Ambiguity of Point Cloud Occlusion
LiDAR sensors are foundational to Level-4 autonomous driving, generating 3D maps via laser pulses. While these sensors offer high fidelity, their measurement process inherently creates shadows—regions where objects obstruct the laser pulse. Object detection models are trained on point cloud data, but the paper points out a critical gap in standard training practices derived from datasets like KITTI: annotations sometimes exist for "Car" instances even when the corresponding point cloud data within the bounding box is absent (N=0 points). This suggests that the models can learn to associate object classes with the *context* of occlusion, not just the points themselves. Traditional spoofing attacks require complex, noticeable laser injection, while Adversarial Object Attacks involve placing specially shaped 3D objects. Shadow Hack shifts this paradigm by exploiting these inherent, passive shadows—regions of non-measurement—by introducing materials that actively degrade LiDAR return signals, turning natural shadows into actionable attack vectors.

## Adversarial Shadow Optimization
The core innovation of this work lies in transforming passive occlusion into an active, optimized misclassification trigger. Instead of relying on ambient shadows, the attack systematically generates "Adversarial Shadows." This is achieved by modeling the shadow as a trapezoid defined by three parameters: the top base length ($a$), the bottom base length ($b$), and the overall length ($l$). The optimization process leverages a 3D simulation environment to maximize the false positive rate. The objective function is maximizing the number of frames where non-existent objects are incorrectly detected precisely where the Shadow Material is placed. This optimization is performed across a defined range of distances ($d_i$) from the LiDAR sensor, ranging from 7 to 17 meters, ensuring the attack remains relevant to critical driving scenarios.

## Shadow Material Deployment and BBValidator
The deployment mechanism is straightforward once the optimal shadow parameters ($a, b, l$) are determined. The attacker places the chosen Shadow Material—such as mirrored sheets—on the road surface. These materials are selected because they are difficult for LiDAR to measure accurately, effectively creating a detectable "shadow" or point cloud removal region. Physical world experiments validated these findings, demonstrating up to 100% success rate at 10 m against PointPillars and 98% against SECOND-IoU, using mirror sheets that achieve nearly 100% point cloud removal rate at distances from 1 to 14 meters. The framework culminates in the proposal of BBValidator, a defense mechanism achieving a 100% success rate while maintaining high object detection accuracy.

## Limitations
The paper's threat model assumes the attacker has prior access to a similar object detection model and knowledge of the target LiDAR specifications, which may not hold for zero-knowledge deployment. Furthermore, the effectiveness was rigorously tested against models trained on the KITTI dataset, and the paper notes that the impact on models trained with datasets following less strict annotation rules remains undiscussed.

## What practitioners should do
* Assume that passive environmental manipulation, rather than just active signal injection, is a viable attack vector against LiDAR systems.
* Audit object detection pipelines to determine if models are relying heavily on context surrounding occlusions, especially near annotated regions with zero points.
* Investigate the material properties that cause point cloud removal in your deployed LiDAR hardware.
* Consider implementing defenses analogous to BBValidator to maintain accuracy while blocking shadow-based false positives.

## Verdict
Read this paper if you are working on sensor security, autonomous vehicle robustness, or adversarial ML applied to physical systems. Otherwise, skim it for general awareness of new physical attack surfaces.

---

## Den's Take

The paper correctly identifies that the vulnerability stems from models learning associations with point cloud *absence*, not just point presence. However, the paper focuses almost entirely on inducing false positives (detecting phantom objects) using optimized shadows. This neglects a more insidious vector: the potential for these shadow manipulations to cause catastrophic false negatives—where a real object is completely masked by the adversarial material, leading to a complete failure to detect a hazard. The claim that BBValidator achieves 100% defense while maintaining accuracy is presented without sufficient architectural detail to verify this stability under real-world noise. While the concept of exploiting passive occlusion is important, the research should pivot to rigorously test the model's resilience when the manipulation causes total data dropout, rather than just forcing misclassification.