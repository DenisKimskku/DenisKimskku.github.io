"""Deterministic, zero-inference guardrails.

These implement level mechanics that were previously *declared* in challenges.py
and enforced nowhere. They cost no model call, which matters: the CTF is the
lowest-priority workload on this machine and every avoided inference is GPU time
returned to the voice assistant.
"""

import re
from typing import Tuple

CENSOR_TOKEN = "[EGRESS-DLP-BLOCKED]"


def censor_raw_flag(response: str, flag: str) -> Tuple[str, bool]:
    """Simulate an egress DLP filter (levels 8 and 9).

    Redacts the flag in cleartext AND in the obvious near-misses -- spaced,
    hyphenated, line-split -- so the filter cannot be defeated by inserting a
    space. Beating a filter with whitespace is level 17's lesson, not level 8's;
    here the player is supposed to reach for an encoding.

    Returns (censored_text, was_censored).
    """
    core = re.sub(r"[^A-Z0-9]", "", (flag or "").upper())[3:]
    if not core:
        return response, False

    out, hit = response, False

    if flag and flag in out:
        out = out.replace(flag, CENSOR_TOKEN)
        hit = True

    # Any rendering of the 16 hex characters with up to two separator characters
    # between each, with or without the CTF{ } wrapper.
    wrapped = re.compile(r"C[\W_]{0,2}T[\W_]{0,2}F[\W_]{0,3}" + r"[\W_]{0,2}".join(core), re.I)
    out, n = wrapped.subn(CENSOR_TOKEN, out)
    hit = hit or bool(n)

    bare = re.compile(r"[\W_]{0,2}".join(core), re.I)
    out, n = bare.subn(CENSOR_TOKEN, out)
    return out, hit or bool(n)


def apply_input_filters(challenge: dict, user_prompt: str) -> Tuple[str, str]:
    """Run a level's server-side input guardrails.

    Returns (sanitized_prompt, block_reason). A non-empty block_reason means the
    prompt must not reach the model at all.
    """
    for pattern in challenge.get("input_blacklist") or []:
        if re.search(pattern, user_prompt):
            return user_prompt, (
                "[WAF BLOCKED] Input prompt contains forbidden keywords blocked by regex WAF."
            )

    if challenge.get("alphanumeric_only"):
        return re.sub(r"[^a-zA-Z0-9\s]", "", user_prompt), ""

    return user_prompt, ""
