---
title: "PhantomMotion: Laser-Based Motion Injection Attacks on Wireless Security Surveillance Systems"
date: "2026-10-16"
type: "Paper Review"
description: "Uses targeted laser heating to simulate human body thermal signatures"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/phantommotion_laserbased_motion_injection_attacks_on_wireles.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-s1454-paper.pdf"
---

![PhantomMotion: Laser-Based Motion Injection Attacks on Wireless Security Surveillance Systems](/images/news/phantommotion_laserbased_motion_injection_attacks_on_wireles.jpg)
*Figure from the paper “PhantomMotion: Laser-Based Motion Injection Attacks on Wireless Security Surveillance Systems” (p. 2)*

# PhantomMotion: Laser-Based Motion Injection Attacks on Wireless Security Surveillance Systems

## TLDR
*   **What**: Uses targeted laser heating to simulate human body thermal signatures.
*   **Who's at risk**: Wireless motion-activated security systems deployed in homes/properties.
*   **Key number**: Experimental results show that PhantomMotion can always generate fake motion to successfully trigger the systems, within an average of 12.8 seconds and via moving the laser spot for a mean distance of 1.1 m.

## The Limitation of Human Motion Probes
Existing research into wireless camera detection relies heavily on the operator performing physical motion near the target. Methods like DeWiCam [11], [12] require users to perform specific actions such as walking, waving hands, or jumping. For users with physical disabilities, or those who wish to remain completely undetected during reconnaissance, this requirement is a significant barrier. Furthermore, the act of performing motion exposes the operator to the risk of being recorded by the very system they are trying to investigate. Other prior wireless-based techniques require the user to carry a smartphone to sense motion via an accelerometer. These preconditions create discomfort and increase the profile of the adversary.

## Laser Heating to Mimic PIR Response
PhantomMotion circumvents the need for human presence by manipulating the physical input to the sensor. The core insight is that lasers can rapidly heat materials via energy transfer, allowing the adversary to create fake motion signals. PIR sensors operate by detecting changes in infrared radiation ($\Delta T$) across two sensing elements. By controlling the laser beam to heat a specific spot until its temperature matches that of a human body (approximately \$37^\circ\text{C}$), the adversary generates radiation similar to that emitted by a person. This controlled heating allows the system to register a differential change in voltage, triggering the motion detection mechanism, which prior motion-based methods cannot achieve remotely.

## Stealthy Activation via Laser Scanning and Traffic Sniffing
The attack proceeds through three phases: target search, spoofing preparation, and motion injection. Initially, the adversary performs a "Target Search" by capturing IEEE 802.11 traffic flows to identify nearby MAC addresses associated with wireless surveillance devices. Next, during "Spoofing Preparation," the system determines a "Scan Path" using evenly distributed laser points. The attacker uses wireless traffic sniffing to correlate the laser heating time at each point with the system's response. The required heating time is calculated by reverse-engineering the PIR sensor's mechanism to ensure the generated power ($P_l$) meets or exceeds the human power ($P_h$). The final "Motion Injection" involves moving the laser spot along the calculated path, successfully activating the system, which is verified by sniffing the subsequent high wireless traffic. The attack works from a distance of up to 120 meters, even when the laser is within the non-line-of-sight (NLOS) of the target system.

## Limitations
The paper assumes the adversary has line-of-sight access to the target area, although it notes that heat transfer allows for some NLOS functionality. The effectiveness relies on the ability to sniff encrypted wireless packets to confirm activation, which may not hold true across all deployed security protocols. Furthermore, the calculation of required heating time is based on approximations of human body radiation characteristics.

## What practitioners should do
*   Implement monitoring for sudden, unexplained spikes in wireless traffic from security devices.
*   Audit PIR sensor placements to ensure motion detection zones are not easily reachable by external light sources.
*   Deploy systems that utilize multi-modal detection beyond simple PIR, such as acoustic or visual verification.
*   Be aware that activation can occur with minimal human intervention, suggesting remote probing is possible.

## Verdict
Read for security researchers focused on physical layer attacks; skip if your concerns are limited to software-based LLM vulnerabilities.

## Den's Take

The paper presents a focused physical-layer exploit, but its reliance on sniffing encrypted wireless packets to verify activation is a significant, unaddressed assumption. If the surveillance system uses robust encryption or employs localized, non-networked alerts, the entire verification chain breaks down, leaving the attacker unable to confirm success remotely. Furthermore, the attack's success hinges on precisely mapping the PIR sensor's thermal response curve through iterative laser scanning.