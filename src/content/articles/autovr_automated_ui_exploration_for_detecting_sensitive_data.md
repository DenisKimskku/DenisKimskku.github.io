---
title: "AUTOVR: Automated UI Exploration for Detecting Sensitive Data Flow Exposures in Virtual Reality Apps"
date: "2026-10-30"
type: "Paper Review"
description: "Automated framework for dynamic UI and event interaction in VR apps"
tags: ["Fuzzing"]
readingTime: 5
headerImage: "/images/news/autovr_automated_ui_exploration_for_detecting_sensitive_data.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-kim-john.pdf"
---

![AUTOVR: Automated UI Exploration for Detecting Sensitive Data Flow Exposures in Virtual Reality Apps](/images/news/autovr_automated_ui_exploration_for_detecting_sensitive_data.jpg)
*Figure from the paper “AUTOVR: Automated UI Exploration for Detecting Sensitive Data Flow Exposures in Virtual Reality Apps” (p. 5)*

# AUTOVR: Automated UI Exploration for Detecting Sensitive Data Flow Exposures in Virtual Reality Apps

## TLDR
*   **What**: Automated framework for dynamic UI and event interaction in VR apps.
*   **Who's at risk**: Developers shipping Unity-based applications on platforms like Meta Quest.
*   **Key number**: AUTOVR demonstrated a remarkable capacity to activate 390 unique sensitive data exposures, dwarfing the 117 instances induced by Monkey.

## The Absence of Headless VR Interaction Tools
The proliferation of Virtual Reality (VR) applications, particularly those on the Meta Quest platform, has created a testing gap. While VR offers rich, immersive interaction modalities beyond standard mobile devices, existing automated testing tools fail to handle the complexity of 3D engine-based applications, specifically those built on the Unity Engine. Conventional tools like Android Monkey operate on traditional GUI structures, but Unity apps embed their UI and logic directly within the executable binary. Furthermore, Unity UI is "generative," meaning UI elements become enabled or disabled based on the application's runtime state, and interactions are heavily reliant on physics events (Triggers and Collisions). This structure means that standard UI fuzzing techniques are often ineffective because the application's UI structure is not present in a parseable configuration file.

## Generative UI Modeling
The central premise enabling AUTOVR is treating the Unity app's UI not as a static configuration, but as a generative system whose state dictates available interactions. To overcome the challenge of hidden UI elements, AUTOVR employs dynamic instrumentation via Frida on the IL2CPP app binary. This allows direct invocation of IL2CPP API functions to access detailed class metadata at runtime. This process, termed Generative UI Modeling, moves beyond static analysis of `global-metadata.dat`. Instead, AUTOVR identifies UI elements by searching for the `IEventSystemHandler` interface within Component classes. Crucially, to capture event handlers assigned statically in the Unity Editor—which bypass standard listener APIs—AUTOVR uses IL2CPP’s field introspection API to extract the developer’s function callbacks.

## Context-aware Event Execution
The mechanism for achieving comprehensive exploration hinges on managing the dynamic dependencies inherent in generative UIs and physics. When an event is triggered, it can cause other GameObjects to be deactivated or spawned, fundamentally changing the available event space. Standard traversal methods fail because game states are not easily back-tracked; for example, selecting an 'Options' button can disable 'Start' and 'Quit' buttons, permanently losing those event paths. AUTOVR solves this by constructing a UI-driven generative state model. It explores paths using a depth-first search, but when a dead end or loss of event availability occurs, it utilizes a synthetic Scene Event. This event leverages Frida’s ability to invoke the `LoadSceneAsyncNameIndexInternal` function on the IL2CPP binary, effectively reloading the current scene to reset the state and explore previously inaccessible paths.

## Limitations
The framework focuses exclusively on Unity VR apps compiled with the IL2CPP backend, a significant constraint given the diversity of 3D engines in the VR space. The reliance on dynamic instrumentation via Frida assumes the target device environment allows for this level of binary manipulation. Furthermore, while AUTOVR models state transitions, the complexity of deeply nested or asynchronous event chains not explicitly covered by the scene reload mechanism may still lead to incomplete coverage.

## What practitioners should do
*   Review the app's event dependency structure, paying attention to how one interaction disables others.
*   If using Unity, ensure that critical functionality is not solely reliant on editor-assigned static callbacks, as these are the targets of this dynamic introspection.
*   Consider integrating binary introspection capabilities into your QA pipeline for proprietary 3D engine deployments.

## Verdict
Read this paper if you are working on security testing for Unity-based applications; otherwise, skip it.

## Den's Take

The paper establishes a necessary methodology for probing generative UIs, but its focus remains too narrow. By restricting the scope to Unity apps using IL2CPP, the authors have created a sophisticated vulnerability scanner for a specific implementation detail, not a general solution for 3D application security. What is missing is an analysis of how the *application logic* itself, independent of the UI state, might be exploitable. If the framework successfully maps the state space, the next logical step is to determine if an attacker can inject malicious *data* into the state-transition triggers without triggering the expected UI flow. Otherwise, this remains a functional coverage tool, not a robust security assessment for sensitive data flow. prior work argued that the fundamental weakness in AI security lies in the model's inability to reliably distinguish instructions from data, not just context poisoning, and this problem mirrors the difficulty of distinguishing valid state transitions from malicious data injection in these systems.