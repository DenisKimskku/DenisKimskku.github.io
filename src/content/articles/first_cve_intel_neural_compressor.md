---
title: "My First CVE: Unsafe Deserialization in Intel Neural Compressor (CVE-2026-50177)"
date: "2026-11-13"
type: "Project"
description: "How a forked copy of Python's pickle module in Intel Neural Compressor's layer-wise quantization loader became CVE-2026-50177: the root cause, the threat model, and what changed in the code."
tags: ["CVE", "Vulnerability Disclosure", "Deserialization", "Python Security", "ML Security", "Supply Chain Security"]
---

# My First CVE: Unsafe Deserialization in Intel Neural Compressor (CVE-2026-50177)

On November 10, 2026, Intel published [INTEL-SA-01490](https://www.intel.com/content/www/us/en/security-center/advisory/intel-sa-01490.html), an advisory covering seven CVEs in Intel® Neural Compressor. One of them, [CVE-2026-50177](https://www.cve.org/CVERecord?id=CVE-2026-50177), is my first CVE. I reported it through Intel's bug bounty program on Intigriti.

It is a deserialization bug, the same class I wrote about in January in a [tutorial on pickle attacks](/writing/pickle_deserialization_attacks/) and in [Pickleguard](/writing/pickleguard_defense_mechanism/). This post covers where the bug lived, why it was exploitable, and how the code changed.

| | |
|---|---|
| **CVE** | CVE-2026-50177 |
| **Advisory** | INTEL-SA-01490 (published 2026-11-10) |
| **Product** | Intel® Neural Compressor (INC), PyTorch backend |
| **Component** | Layer-wise quantization loader (`neural_compressor/torch/algorithms/layer_wise/`) |
| **Weakness** | CWE-502: Deserialization of Untrusted Data |
| **Score** | 4.8 Medium (`CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:N/VI:L/VA:L/SC:N/SI:N/SA:N`) |
| **Affected (per advisory)** | Versions before 3.8 |
| **Recommended version** | 3.10 or later, see [Which version should you run?](#which-version-should-you-run) |

---

## Background: layer-wise quantization

Neural Compressor is Intel's model-compression toolkit: quantization, pruning, and distillation, tuned for Intel hardware. One of its features, **layer-wise quantization (LWQ)**, targets models too large to fit in memory. Instead of materializing the whole checkpoint, it builds an empty model on PyTorch's `meta` device and pulls weights in one layer at a time, quantizing each layer and releasing it before moving on.

Loading one named tensor at a time needs a loader that supports it, so when LWQ landed in August 2023 ([#994](https://github.com/intel/neural-compressor/pull/994)) it shipped two forked files:

- **`layer_wise/load.py`**: a copy of `torch.load` with extra `tensor_name` and `prefix` arguments.
- **`layer_wise/modified_pickle.py`**: a 1,859-line copy of CPython's pure-Python `pickle` module whose `Unpickler.load()` also accepts a `tensor_name`.

Both files decide what a checkpoint is allowed to do. `load.py` was copied before PyTorch made restricted loading the default. `modified_pickle.py` copies a module that was never meant to be safe on untrusted input: CPython's own documentation warns to unpickle only data you trust.

---

## Root cause

### 1. `find_class` was copied verbatim

Pickle is a small stack machine. When a pickle stream refers to a global (a class or a function), the unpickler calls `find_class(module, name)` to resolve it, and the `REDUCE` opcode then calls whatever came back with arguments taken from the stream. That makes `find_class` the one place where an unpickler decides what a file is allowed to name. (My [earlier tutorial](/writing/pickle_deserialization_attacks/) walks through the opcodes.)

Here is the fork's `find_class` as of v3.7.1:

```python
def find_class(self, module, name):
    # Subclasses may override this.
    sys.audit("pickle.find_class", module, name)
    if self.proto < 3 and self.fix_imports:
        if (module, name) in _compat_pickle.NAME_MAPPING:
            module, name = _compat_pickle.NAME_MAPPING[(module, name)]
        elif module in _compat_pickle.IMPORT_MAPPING:
            module = _compat_pickle.IMPORT_MAPPING[module]
    __import__(module, level=0)
    if self.proto >= 4:
        return _getattribute(sys.modules[module], name)[0]
    else:
        return getattr(sys.modules[module], name)
```

This is CPython's default implementation, line for line, and the fork never overrides it. Whatever module and attribute the checkpoint names, the loader imports and hands back, and `REDUCE` calls it. A file that is supposed to contain tensors can therefore invoke any callable importable in the victim's environment, during loading, with the privileges of the process running the quantization.

### 2. The forked `torch.load` defaulted to unrestricted loading

PyTorch has its own answer to this problem. `torch.load(..., weights_only=True)` swaps in a restricted unpickler that accepts tensors, primitive containers, and an allowlist of globals, and in **PyTorch 2.6** upstream made that the default ([PR #137602](https://github.com/pytorch/pytorch/pull/137602), [announcement](https://dev-discuss.pytorch.org/t/bc-breaking-change-torch-load-is-being-flipped-to-use-weights-only-true-by-default-in-the-nightlies-after-137602/2573)).

The fork predates that change and never picked it up:

```python
def load(
    f: FILE_LIKE,
    tensor_name: str = None,
    prefix: str = None,
    map_location: MAP_LOCATION = None,
    pickle_module: Any = None,
    *,
    weights_only: bool = False,
    **pickle_load_args: Any,
) -> Any:
```

It kept upstream's `TORCH_FORCE_WEIGHTS_ONLY_LOAD` environment switch, but not the code behind it. Upstream, `weights_only=True` routes loading through PyTorch's restricted `_weights_only_unpickler`. The fork has no such branch. The flag only decides whether `pickle_module` gets a default, and the call site passes `pickle_module` straight through:

```python
if os.getenv("TORCH_FORCE_WEIGHTS_ONLY_LOAD", "0").lower() in ["1", "y", "yes", "true"]:
    weights_only = True

if weights_only:
    if pickle_module is not None:
        raise RuntimeError("Can not safely load weights when explicit pickle_module is specified")
else:
    if pickle_module is None:
        pickle_module = pickle  # <- modified_pickle
...
return _load(opened_zipfile, tensor_name, prefix, map_location, pickle_module, **pickle_load_args)
```

With the variable set, `pickle_module` stays `None`, and `_load` fails with an `AttributeError` when it subclasses `pickle_module.Unpickler`. The loader breaks instead of loading safely. That makes the variable no workaround: it switches off layer-wise loading of `.bin` checkpoints rather than restricting what they can contain. The branch is unchanged in every release through 3.10.

### 3. Put together

On PyTorch 2.6 or later, plain `torch.load()` on an untrusted checkpoint uses the restricted unpickler by default. Loading the same file through INC's layer-wise path went through the unrestricted fork instead. The warning Intel added in 3.8 describes the result: *"Loading checkpoints from untrusted sources may execute arbitrary code."*

[![Call path of INC's layer-wise loader in 3.8.x and earlier next to PyTorch's torch.load on 2.6 and later: the fork defaults to weights_only=False, its find_class imports any module, and load_reduce calls the result; upstream defaults to weights_only=True and refuses non-allowlisted globals.](/images/261113/fig1-call-path.svg)](/images/261113/fig1-call-path.svg)

*Figure 1. The load path in INC's layer-wise loader (a) next to upstream PyTorch (b). Red rows are where the fork trusts the file instead of checking it.*

---

## Threat model

A deserialization bug is only a vulnerability if the bytes come from someone else, so it is worth being explicit about who does what:

- **The attacker** never touches the victim's machine. They publish a checkpoint: on a model hub, in an internal artifact registry, as a CI artifact, or as a "pre-quantized" variant of a popular model.
- **The victim** downloads it and runs INC's documented layer-wise quantization workflow: the public API, no internal modules, nothing unusual.
- **The compromise** happens while the library parses the file, before any quantization runs. The victim does nothing beyond calling the loader.

[![An attacker uploads a checkpoint to a model repository; inside one shard, data.pkl names what to import next to the real tensors. Across the trust boundary, a CI runner downloads it and runs python quantize.py, and attacker-chosen code runs as a child process under the same uid.](/images/261113/fig2-threat-model.svg)](/images/261113/fig2-threat-model.svg)

*Figure 2. The checkpoint crosses the trust boundary as an ordinary download. The hostile part is the `data.pkl` inside one shard, and the code it names runs as the same user as the job that loaded it.*

What the attacker gets is whatever the loading process has: a developer's account on a workstation, or a CI service account with its secrets and network access. A legitimate checkpoint only needs `collections.OrderedDict` and PyTorch's tensor-rebuild helpers, and has no reason to reference modules such as `os` or `subprocess`.

Intel's score of 4.8 uses a local attack vector (`AV:L`), rates integrity and availability impact as low, and rates confidentiality impact as none. The paragraph above describes the worst case: a loading process that holds credentials.

---

## What changed in the code

INTEL-SA-01490 covers seven CVEs, three of them CWE-502 in the same product, and none of the upstream commits reference a report, so I cannot say which commit is the fix for CVE-2026-50177. What the public repository does show is how the layer-wise loader changed after February 2026.

### Step 1: a warning ([#2402](https://github.com/intel/neural-compressor/pull/2402), Feb 10, 2026; first released in 3.8)

```python
# Security warning for layer-wise quantization checkpoint loading
logger.warning_once(
    "Layer-wise quantization is loading a model checkpoint. "
    "Please ensure you trust the source of the checkpoint. "
    "Loading checkpoints from untrusted sources may execute arbitrary code.",
)
```

The warning documents the risk but does not change what the loader accepts.

### Step 2: a denylist ([#2507](https://github.com/intel/neural-compressor/pull/2507), Jun 29, 2026; first released in 3.9)

`find_class` gained two denylists. One holds modules, among them `os`, `subprocess`, `sys`, `socket`, `builtins`, and `importlib`. The other holds names, among them `eval`, `exec`, `system`, and `popen`. A global that matches either list is rejected:

```python
if module in DANGEROUS_MODULES:
    raise UnpicklingError(f"Unpickling forbidden module '{module}'")

if name in DANGEROUS_NAMES:
    raise UnpicklingError(f"Unpickling forbidden function '{module}.{name}'")
```

The same PR switched `WOQModelLoader`, the path that loads already-quantized weight-only models, from `torch.load(path)` to `torch.load(path, weights_only=True)`, and added regression tests that feed hostile pickles to the forked unpickler.

### Step 3: an allowlist ([#2528](https://github.com/intel/neural-compressor/pull/2528), Jul 15, 2026; first released in 3.10)

About two weeks later the denylist was replaced with this:

```python
SAFE_GLOBALS = {
    ("collections", "OrderedDict"),
    ("torch._tensor", "_rebuild_from_type_v2"),
    ("torch._utils", "_rebuild_meta_tensor_no_storage"),
    ("torch._utils", "_rebuild_parameter"),
    ("torch._utils", "_rebuild_qtensor"),
    ("torch._utils", "_rebuild_sparse_tensor"),
    ("torch._utils", "_rebuild_tensor"),
    ("torch._utils", "_rebuild_tensor_v2"),
}

# inside find_class:
if (module, name) not in SAFE_GLOBALS:
    raise UnpicklingError(f"Unpickling forbidden global '{module}.{name}'")
```

A denylist only covers what its author thought of, while Python's import namespace is everything installed in the environment, often hundreds of packages on an ML machine. An allowlist flips that: a weights file needs `OrderedDict` and the tensor-rebuild helpers, so that is all it gets, and anything else fails with an error naming the global. PyTorch's `weights_only` unpickler works the same way, and so does [Pickleguard](/writing/pickleguard_defense_mechanism/)'s allowlist mode.

[![What the layer-wise find_class does with a global named in data.pkl, by release: os.system and socket.socket run in 3.8.x and are refused from 3.9; any other installed module still runs in 3.9 and is refused only from 3.10; torch's tensor-rebuild helper loads in every release.](/images/261113/fig3-find-class.svg)](/images/261113/fig3-find-class.svg)

*Figure 3. What `find_class` does with a global named in a checkpoint, by release. In 3.9, modules missing from the denylist still load; 3.10 refuses every global outside the allowlist.*

### Which version should you run?

| Release (PyPI upload date) | Layer-wise `find_class` |
|---|---|
| 3.7.x and earlier | Unrestricted |
| 3.8 (Mar 27, 2026) and 3.8.1 (May 20, 2026) | Unrestricted, plus a log warning |
| 3.9 (Jul 1, 2026) | Denylist |
| 3.10 (Sep 28, 2026) | Allowlist |

The advisory lists 3.8 as the first fixed version. In the public source, the 3.8 line only adds the warning to this loader; the `find_class` restriction arrives in 3.9 and becomes an allowlist in 3.10. The advisory covers seven issues, so 3.8 may be the right floor for some of them, but for the layer-wise loader I would treat **3.10 as the minimum**.

---

## Recommendations

- **Upgrade to 3.10 or later.**
- **Do not use `TORCH_FORCE_WEIGHTS_ONLY_LOAD` as a mitigation.** The forked loader has no weights-only branch, so with the variable set, layer-wise loading fails instead of loading safely.
- **Prefer safetensors.** A safetensors file is a JSON header plus raw tensor bytes, with no code path to abuse. INC's layer-wise utilities include a safetensors shard reader, so converting checkpoints you control is usually cheap.
- **Pin and restrict model sources.** Pin downloads by revision and hash, and restrict who can publish to the registries you pull from. Pickle scanners help, but most are denylists too.
- **Sandbox quantization jobs.** They need a model and compute; they rarely need network egress, cloud credentials, or write access to the registry they read from.

A fork of security-sensitive code only gets upstream's security changes if someone ports them. This loader was forked in August 2023. Since then PyTorch has made `weights_only=True` the default in 2.6 and fixed bugs in that path, including [CVE-2025-32434](https://www.cve.org/CVERecord?id=CVE-2025-32434), a `weights_only=True` bypass fixed in 2.6.0. None of these were ported: the fork's `load()` still defaults to `weights_only=False` in 3.10, and the allowlist described above is INC's own change to its copy of `find_class`.

---

## Acknowledgments

Thanks to Intel PSIRT and the Intigriti triage team for coordinating the disclosure, and to the Neural Compressor maintainers for hardening the loader.

---

## References

- **Advisory:** [INTEL-SA-01490, Intel® Neural Compressor Advisory](https://www.intel.com/content/www/us/en/security-center/advisory/intel-sa-01490.html)
- **CVE record:** [CVE-2026-50177](https://www.cve.org/CVERecord?id=CVE-2026-50177)
- **Loader changes:** [#2402](https://github.com/intel/neural-compressor/pull/2402) (warning), [#2507](https://github.com/intel/neural-compressor/pull/2507) (denylist, `weights_only` for WOQ checkpoints), [#2528](https://github.com/intel/neural-compressor/pull/2528) (allowlist)
- **Releases:** [neural-compressor on PyPI](https://pypi.org/project/neural-compressor/#history)
- **Background:** [Pickle Deserialization Attacks](/writing/pickle_deserialization_attacks/), [Pickleguard](/writing/pickleguard_defense_mechanism/)
