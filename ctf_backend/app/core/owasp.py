from typing import Dict, Any, Optional

OWASP_MAPPINGS: Dict[int, Dict[str, Any]] = {
    1: {
        "category": "LLM07: System Prompt Leakage",
        "title": "Direct System Prompt Extraction",
        "cve_reference": "CWE-20: Improper Input Validation",
        "summary": "Direct prompt injection occurs when user inputs alter the LLM context flow, forcing the model to disregard developer instructions and leak secret system variables.",
        "real_world_risk": "In enterprise RAG or internal support bots, attackers extract internal API keys, database credentials, or system instruction rules.",
        "developer_mitigation": "1. Separate system instructions from untrusted user inputs using strict framing XML tags.\n2. Implement secondary guardrail classifiers (e.g., LlamaGuard).\n3. Redact credentials at the database layer; never store plaintext keys in system prompts."
    },
    2: {
        "category": "LLM01: Prompt Injection",
        "title": "Persona Constraint Bypassing",
        "cve_reference": "CWE-693: Protection Mechanism Failure",
        "summary": "Negative persona prompting alone ('never break character') is insufficient to resist adversarial persona overriding commands.",
        "real_world_risk": "Attackers bypass brand compliance filters and trick financial or medical assistants into giving unauthorized, liability-inducing advice.",
        "developer_mitigation": "Use structured output schemas (JSON Mode) and API-level guardrails rather than relying purely on natural language compliance."
    },
    3: {
        "category": "LLM01: Prompt Injection",
        "title": "Roleplay Jailbreaking",
        "cve_reference": "CWE-693: Protection Mechanism Failure",
        "summary": "Roleplay framing shifts the model's safety alignment by placing the conversation inside a fictional scenario (e.g. medieval knight or hypothetical game).",
        "real_world_risk": "Jailbreakers induce models to generate harmful payloads, malware scripts, or breach data policies under fictional disguises.",
        "developer_mitigation": "Enforce intent classification on incoming prompts regardless of narrative context or roleplay framing."
    },
    4: {
        "category": "LLM02: Sensitive Information Disclosure",
        "title": "Summarization Context Exfiltration",
        "cve_reference": "CWE-200: Exposure of Sensitive Information",
        "summary": "When LLMs process documents containing confidential metadata, bad actors can coerce the summarizer to leak non-summarized secrets.",
        "real_world_risk": "Summarizing internal emails or audit notes may expose hidden PII or confidential trade secrets to lower-privileged users.",
        "developer_mitigation": "Scrub documents using Data Loss Prevention (DLP) filters before supplying context to the LLM."
    },
    5: {
        "category": "LLM01: Prompt Injection",
        "title": "Multi-Lingual Compliance Evasion",
        "cve_reference": "CWE-693: Protection Mechanism Failure",
        "summary": "Safety alignment fine-tuning is often weaker in non-English or low-resource languages, permitting cross-lingual jailbreak attacks.",
        "real_world_risk": "Adversaries translate injection payloads into rare languages or mixed polyglot tokens to evade standard English guardrails.",
        "developer_mitigation": "Translate untrusted user inputs to a normalized canonical language before running safety classifiers."
    },
    6: {
        "category": "LLM01: Prompt Injection",
        "title": "WAF & Keyword Blacklist Evasion",
        "cve_reference": "CWE-184: Incomplete List of Disallowed Inputs",
        "summary": "Simple regex or keyword blacklists ('secret', 'ignore') are easily bypassed using synonyms, typosquatting, or semantic circumlocution.",
        "real_world_risk": "Static Web Application Firewalls fail against natural language variability.",
        "developer_mitigation": "Use semantic vector embeddings or ML-based intent classifiers instead of static keyword blacklists."
    },
    7: {
        "category": "LLM01: Prompt Injection",
        "title": "Alphanumeric Sanitization Bypass",
        "cve_reference": "CWE-74: Improper Neutralization of Special Elements",
        "summary": "Stripping punctuation does not prevent prompt injection because English semantics alone can re-frame instructions effectively.",
        "real_world_risk": "Developers incorrectly assume stripping `!@#$%^&*()` renders input safe.",
        "developer_mitigation": "Validate semantic intent rather than relying solely on syntactic character stripping."
    },
    8: {
        "category": "LLM02: Sensitive Information Disclosure",
        "title": "Encoded Output Exfiltration (Base64)",
        "cve_reference": "CWE-116: Improper Encoding or Escaping",
        "summary": "Egress filters blocking exact secret strings can be bypassed if the user tricks the model into encoding the secret in Base64 or Hex.",
        "real_world_risk": "Data exfiltration past egress DLP filters via encoded token channels.",
        "developer_mitigation": "Decode and inspect model outputs across common encodings (Base64, Hex, URL) before returning responses to clients."
    },
    9: {
        "category": "LLM02: Sensitive Information Disclosure",
        "title": "Substitution Cipher Evasion (ROT13)",
        "cve_reference": "CWE-116: Improper Encoding or Escaping of Output",
        "summary": "LLMs possess internal translation capabilities for simple ciphers (ROT13, Caesar), allowing exfiltration around raw keyword monitors.",
        "real_world_risk": "Stealthy exfiltration of credentials or sensitive data past basic output regexes.",
        "developer_mitigation": "Apply DLP inspection on both cleartext and transformed output representations."
    },
    10: {
        "category": "LLM01: Prompt Injection",
        "title": "Pre-Filter Intent Classifier Evasion",
        "cve_reference": "CWE-807: Reliance on Untrusted Inputs in Security Decision",
        "summary": "Adversaries obfuscate input intent using hypothetical framing, poetry, or indirect questions to trick intent pre-filters.",
        "real_world_risk": "Single-layer pre-filters are routinely bypassed by multi-step prompt engineering.",
        "developer_mitigation": "Employ defense-in-depth: combine input intent filters, system prompt sandboxing, and output inspection."
    },
    11: {
        "category": "LLM07: System Prompt Leakage",
        "title": "Markdown Delimiter Breakout",
        "cve_reference": "CWE-94: Improper Control of Generation of Code",
        "summary": "Wrapping user text in code block delimiters (` ``` `) fails if the user injects matching closing delimiters.",
        "real_world_risk": "Injection attacks break out of untrusted context frames and assume system-level instruction control.",
        "developer_mitigation": "Sanitize or escape structural code block delimiters inside user-supplied text before interpolation."
    },
    12: {
        "category": "LLM05: Improper Output Handling",
        "title": "JSON Payload & API Breakout",
        "cve_reference": "CWE-75: Failure to Sanitize Data (JSON)",
        "summary": "Unescaped quotes or JSON syntax inside user input can break out of structured API payloads.",
        "real_world_risk": "Malicious JSON payload injection causes API parsing errors or overrides top-level API parameters.",
        "developer_mitigation": "Always serialize inputs using strict JSON libraries rather than string formatting/concatenation."
    },
    13: {
        "category": "LLM01: Prompt Injection",
        "title": "Multi-Turn Delimiter & Context Confusion",
        "cve_reference": "CWE-471: Modification of Assumed Immutable Data",
        "summary": "In multi-turn chats, appending past messages allows attackers to fake assistant or system turn markers (`<|im_start|>`).",
        "real_world_risk": "Privilege escalation by spoofing historical assistant responses.",
        "developer_mitigation": "Use structured chat APIs (OpenAI/Ollama message arrays) rather than raw string concatenation."
    },
    14: {
        "category": "LLM06: Excessive Agency",
        "title": "System Privilege Framing Escalation",
        "cve_reference": "CWE-250: Execution with Unnecessary Privileges",
        "summary": "Simulating system update banners (`[SYSTEM OVERRIDE]`) tricks models into granting elevated administrative permissions.",
        "real_world_risk": "Attackers gain administrative functionality or bypass authorization boundaries in agentic systems.",
        "developer_mitigation": "Enforce hard authorization checks in backend code; never rely on the LLM to verify user privileges."
    },
    15: {
        "category": "LLM01: Prompt Injection",
        "title": "Indirect RAG Context Injection",
        "cve_reference": "CWE-829: Inclusion of Functionality from Untrusted Control Sphere",
        "summary": "Indirect prompt injection occurs when an LLM retrieves untrusted external documents containing malicious instructions.",
        "real_world_risk": "Poisoned web pages or uploaded PDFs hijack the AI summarizer to perform malicious actions.",
        "developer_mitigation": "Isolate retrieved context into read-only data blocks and use dual-LLM verification."
    },
    16: {
        "category": "LLM06: Excessive Agency",
        "title": "Simulated Tool Abuse & Function Hijacking",
        "cve_reference": "CWE-285: Improper Authorization",
        "summary": "When LLMs have tool-calling access, prompt injections can induce unauthorized function execution.",
        "real_world_risk": "Attackers trick agents into calling database deletion, wire transfer, or data retrieval functions.",
        "developer_mitigation": "Require human-in-the-loop (HITL) approval for sensitive tool calls and enforce backend RBAC."
    },
    17: {
        "category": "LLM01: Prompt Injection",
        "title": "Safety Classifier Evasion (LlamaGuard)",
        "cve_reference": "CWE-693: Protection Mechanism Failure",
        "summary": "Safety output classifiers can be evaded using steganography, word splitting, or homoglyph substitution.",
        "real_world_risk": "Adversaries exfiltrate restricted data while evading external safety guardrail models.",
        "developer_mitigation": "Combine ML safety classifiers with deterministic pattern verification and DLP scanning."
    },
    18: {
        "category": "LLM05: Improper Output Handling",
        "title": "Dual-LLM Peer Review Bypassing",
        "cve_reference": "CWE-345: Insufficient Verification of Data Authenticity",
        "summary": "In dual-LLM systems, attackers craft payloads that confuse Reviewer Model B into approving Generator Model A's unsafe output.",
        "real_world_risk": "Reviewer models fail to catch obfuscated or split-token malicious outputs.",
        "developer_mitigation": "Give Reviewer models independent context and deterministic parsing capability."
    },
    19: {
        "category": "LLM01: Prompt Injection",
        "title": "Indirect Email Attachment Payload Injection",
        "cve_reference": "CWE-20: Improper Input Validation",
        "summary": "Processing untrusted email bodies or attachments exposes autonomous assistants to indirect prompt injection.",
        "real_world_risk": "Inbound emails hijack personal AI assistants to forward emails, exfiltrate files, or leak keys.",
        "developer_mitigation": "Treat all incoming external data as untrusted; strip executable instructions from document parsers."
    },
    20: {
        "category": "LLM06: Excessive Agency",
        "title": "Multi-Agent Privilege Escalation Chain",
        "cve_reference": "CWE-693: Protection Mechanism Failure",
        "summary": "Complex multi-agent chains (Planner -> Worker -> Sentinel) can suffer cascading privilege escalation if one sub-agent is compromised.",
        "real_world_risk": "Compromising a low-privilege worker agent allows attackers to trick the orchestrator into executing high-privilege tasks.",
        "developer_mitigation": "Implement zero-trust boundaries between sub-agents. Validate state transitions independently at each hop."
    }
}

def get_owasp_info(level_id: int) -> Optional[Dict[str, Any]]:
    return OWASP_MAPPINGS.get(level_id)
