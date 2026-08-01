#!/usr/bin/env python3
"""Re-score every SEMANTIC win with a stronger judge.

    python3 scripts/rescore_semantic.py --bench /tmp/bench_all_corrected.json

WHY
===
In the main benchmark each model judges its own output, because that is what a
cheap eval setup actually does. Deterministic wins (DIRECT, ENCODED, CROSS_TURN)
never involve the classifier and need no correction. SEMANTIC wins do: they are
exactly the verdicts a weak classifier can manufacture.

So: replay the same payload against the same TARGET model, but score it with
`--judge`. A win that survives was a real leak. A win that evaporates was the
model grading its own homework and being generous.

The correction is expected to be one-directional. A small classifier says WIN to
output that merely DISCUSSES the secret; it does not say LOSS to output that
plainly contains it, because a contained secret is caught deterministically
before the classifier is consulted at all.

The symmetric control -- re-scoring LOSSES to check the judge was not too harsh
-- is run with --check-losses. Without it, a low score is ambiguous between "did
not leak" and "leaked and its own judge missed it".
"""

import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmark_models import CORPUS, OWNED_MODELS, await_gpu, run_turns  # noqa: E402
from app.core import config as cfg  # noqa: E402


async def replay(target, judge, level, turns, attempts):
    cfg.settings.TARGET_MODEL = target
    cfg.settings.JUDGE_MODEL = judge
    for _ in range(attempts):
        await await_gpu()
        (win, why), _last = await run_turns(level, turns)
        if win:
            return True, why
    return False, why


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bench", default="/tmp/ctf_model_benchmark.json")
    ap.add_argument("--judge", default="qwen3:8b")
    ap.add_argument("--attempts", type=int, default=2)
    ap.add_argument("--check-losses", action="store_true",
                    help="also re-score LOSSES, to rule out the opposite error")
    ap.add_argument("--out", default="/tmp/ctf_rescored.json")
    args = ap.parse_args()

    with open(args.bench) as fh:
        bench = json.load(fh)
    with open(CORPUS) as fh:
        corpus = {e["level"]: (e.get("turns") or [e["prompt"]])
                  for e in json.load(fh)["entries"]}

    OWNED_MODELS.update([r["model"] for r in bench["results"] if "model" in r])
    OWNED_MODELS.add(args.judge)

    out = []
    for result in bench["results"]:
        model = result.get("model")
        if "error" in result or model == args.judge:
            # A model cannot be corrected by itself; that is the whole point.
            out.append({"model": model, "semantic": 0, "survived": 0,
                        "corrected": result.get("solved"), "note": "judge model, uncorrected"})
            continue

        semantic = sorted(int(l) for l, v in result["levels"].items()
                          if v["won"] and v["reason"] == "SEMANTIC")
        survived, died = [], []
        for level in semantic:
            win, why = await replay(model, args.judge, level, corpus[level], args.attempts)
            (survived if win else died).append(level)
            print("  %-13s L%02d  %s" % (model, level, "survives" if win else "EVAPORATES (%s)" % why),
                  flush=True)

        recovered = []
        if args.check_losses:
            losses = sorted(int(l) for l, v in result["levels"].items() if not v["won"])
            for level in losses:
                win, _ = await replay(model, args.judge, level, corpus[level], 1)
                if win:
                    recovered.append(level)
            print("  %-13s losses re-scored: %d recovered %s"
                  % (model, len(recovered), recovered or ""), flush=True)

        corrected = result["solved"] - len(died) + len(recovered)
        out.append({"model": model, "solved": result["solved"], "corrected": corrected,
                    "semantic": len(semantic), "survived": survived, "evaporated": died,
                    "recovered_losses": recovered})

    with open(args.out, "w") as fh:
        json.dump({"judge": args.judge, "results": out}, fh, indent=2)

    print("\n%-14s %8s %10s %10s %s" % ("model", "self", "corrected", "inflation", "evaporated"))
    print("-" * 68)
    for r in out:
        if r.get("note"):
            print("%-14s %8s %10s %10s  %s" % (r["model"], r.get("corrected"), r.get("corrected"),
                                               "--", r["note"]))
            continue
        infl = r["solved"] - r["corrected"]
        pct = (100.0 * infl / r["corrected"]) if r["corrected"] else 0.0
        print("%-14s %8d %10d %8d (%.0f%%)  %s"
              % (r["model"], r["solved"], r["corrected"], infl, pct, r["evaporated"] or "-"))
    print("\nwrote %s" % args.out)


if __name__ == "__main__":
    asyncio.run(main())
