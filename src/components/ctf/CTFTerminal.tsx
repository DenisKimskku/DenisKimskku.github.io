'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OWASPWriteups from './OWASPWriteups';
import CTFCertificate from './CTFCertificate';
import {
  ApiError,
  ctfFetch,
  describeError,
  fetchStatus as apiFetchStatus,
  streamChat,
  writeSessionId,
} from './ctfApi';

interface LevelMeta {
  level: number;
  title: string;
  tier: number;
  tier_name: string;
  description: string;
  scenario: string;
  has_input_filter: boolean;
  has_output_filter: boolean;
  has_prefilter?: boolean;
  defense_status?: 'enforced' | 'narrative_only';
  defense_note?: string | null;
  is_completed: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  win?: boolean;
  judge_reason?: string;
  unlocked_flag?: string;
  guardrail_blocked?: boolean;
  engineError?: boolean;
}

interface HintData {
  attempts: number;
  hint_1_unlocked: boolean;
  hint_1: string;
  hint_2_unlocked: boolean;
  hint_2: string;
}

type TabId = 'arena' | 'owasp' | 'cert';
const TABS: { id: TabId; label: string }[] = [
  { id: 'arena', label: 'CTF Arena' },
  { id: 'owasp', label: 'OWASP Writeups' },
  { id: 'cert', label: 'Certificate' },
];

const TIERS: Record<number, string> = {
  1: 'Fundamentals',
  2: 'Filters & Encoding',
  3: 'Structural Evasion',
  4: 'Advanced Evasion',
};

const STATIC_TITLES: Record<number, string> = {
  1: 'The Hardened Enclave', 2: 'The Strict Persona', 3: 'The Medieval Guardian',
  4: 'The Summarizer Vault', 5: 'The Polyglot Firewall', 6: 'WAF Keyword Blacklist',
  7: 'Alphanumeric Fortress', 8: 'Encoded Exfiltration', 9: 'ROT13 Cipher Evasion',
  10: 'Pre-Filter Intent Classifier', 11: 'Context Boundary Escape', 12: 'JSON Parser Hijack',
  13: 'Multi-Turn Delimiter Confusion', 14: 'System Privilege Framing', 15: 'Prompt Leakage via RAG',
  16: 'Simulated Tool Abuse', 17: 'Output Classifier Evasion', 18: 'Dual-LLM Peer Review',
  19: 'Indirect Attachment Injection', 20: 'The Multi-Agent Orchestrator',
};

function placeholderMeta(lvl: number): LevelMeta {
  return {
    level: lvl,
    title: STATIC_TITLES[lvl] ?? `Level ${lvl}`,
    tier: Math.floor((lvl - 1) / 5) + 1,
    tier_name: TIERS[Math.floor((lvl - 1) / 5) + 1] ?? '',
    description: '',
    scenario: '',
    has_input_filter: false,
    has_output_filter: false,
    is_completed: false,
  };
}

/* Shared control styling so every interactive element gets a visible keyboard
   ring. The previous markup used focus:outline-none with no replacement, which
   made keyboard navigation completely invisible. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]';

export default function CTFTerminal() {
  const [activeTab, setActiveTab] = useState<TabId>('arena');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [serverCurrentLevel, setServerCurrentLevel] = useState(1);
  const [meta, setMeta] = useState<LevelMeta>(placeholderMeta(1));
  const [prompt, setPrompt] = useState('');
  // Transcripts are kept per level: switching away to re-read a solved level's
  // winning payload used to wipe the history irrecoverably.
  const [transcripts, setTranscripts] = useState<Record<number, ChatMessage[]>>({});
  const [flagInput, setFlagInput] = useState('');
  const [flagFeedback, setFlagFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [flagBusy, setFlagBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState<HintData | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [resumeInput, setResumeInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const inflight = useRef<AbortController | null>(null);
  const levelRef = useRef(currentLevel);
  levelRef.current = currentLevel;

  const messages = useMemo(() => transcripts[currentLevel] ?? [], [transcripts, currentLevel]);

  // Never optimistically unlock. This used to default to 20, so every level was
  // clickable on first paint and stayed that way if the backend was unreachable.
  const maxUnlocked = useMemo(
    () => Math.max(1, serverCurrentLevel, ...completedLevels.map((l) => l + 1)),
    [serverCurrentLevel, completedLevels],
  );

  const pushMessage = useCallback((lvl: number, msg: ChatMessage) => {
    setTranscripts((prev) => ({ ...prev, [lvl]: [...(prev[lvl] ?? []), msg] }));
  }, []);

  const refreshStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiFetchStatus(signal);
      setCompletedLevels(data.completed_levels ?? []);
      setServerCurrentLevel(data.current_level ?? 1);
      setSessionCode(data.session_id ?? '');
      setBackendDown(false);
    } catch (e) {
      if ((e as ApiError).kind !== 'aborted') setBackendDown(true);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void refreshStatus(ac.signal);
    return () => ac.abort();
  }, [refreshStatus]);

  // Cancel any in-flight inference when the component unmounts.
  useEffect(() => () => inflight.current?.abort(), []);

  useEffect(() => {
    const ac = new AbortController();
    setMeta(placeholderMeta(currentLevel));

    (async () => {
      try {
        const res = await ctfFetch(`/api/level/${currentLevel}`, {
          signal: ac.signal,
          timeoutMs: 15_000,
        });
        setMeta(await res.json());
      } catch (e) {
        if ((e as ApiError).kind !== 'aborted') setBackendDown(true);
      }
      try {
        const res = await ctfFetch(`/api/hint/${currentLevel}`, {
          signal: ac.signal,
          timeoutMs: 15_000,
        });
        setHints(await res.json());
      } catch {
        setHints(null);
      }
    })();

    return () => ac.abort();
  }, [currentLevel]);

  // Auto-scroll only when the reader is already at the bottom, so scrolling up
  // to re-read a long reply doesn't yank you back down.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;

    const lvl = currentLevel;
    const id = `ast-${Date.now()}`;
    setPrompt('');
    pushMessage(lvl, { id: `usr-${Date.now()}`, sender: 'user', text });
    pushMessage(lvl, { id, sender: 'assistant', text: '' });
    setLoading(true);

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setTranscripts((prev) => ({
        ...prev,
        [lvl]: (prev[lvl] ?? []).map((m) => (m.id === id ? fn(m) : m)),
      }));

    try {
      const final = await streamChat(
        lvl,
        text,
        (chunk, replace) => patch((m) => ({ ...m, text: replace ? chunk : m.text + chunk })),
        { signal: ac.signal },
      );

      if (ac.signal.aborted) return;
      patch((m) => ({
        ...m,
        win: final.win,
        judge_reason: final.judge_reason,
        unlocked_flag: final.unlocked_flag,
        engineError: final.engine_error,
        guardrail_blocked: final.guardrail_blocked,
      }));

      // Refresh the hint counter — this attempt changed it.
      void ctfFetch(`/api/hint/${lvl}`, { timeoutMs: 15_000 })
        .then((r) => r.json())
        .then(setHints)
        .catch(() => undefined);

      if (final.win && final.unlocked_flag) {
        setFlagInput(final.unlocked_flag);
        void refreshStatus();
      }
    } catch (err) {
      const e = err as ApiError;
      if (e.kind === 'aborted') {
        setTranscripts((prev) => ({ ...prev, [lvl]: (prev[lvl] ?? []).filter((m) => m.id !== id) }));
        return;
      }
      // Give the payload back — never make the player retype a long exploit.
      setPrompt(text);
      setTranscripts((prev) => ({
        ...prev,
        [lvl]: (prev[lvl] ?? [])
          .filter((m) => m.id !== id)
          .concat({ id: `err-${Date.now()}`, sender: 'system', text: describeError(e, lvl) }),
      }));
    } finally {
      if (inflight.current === ac) {
        inflight.current = null;
        setLoading(false);
      }
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const flag = flagInput.trim();
    if (!flag || flagBusy) return;
    setFlagBusy(true);
    try {
      const res = await ctfFetch('/api/submit_flag', {
        method: 'POST',
        body: { level: currentLevel, flag },
        timeoutMs: 20_000,
      });
      const data = await res.json();
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : data?.success
          ? 'Flag accepted.'
          : 'Invalid flag submission.';
      setFlagFeedback({ msg, ok: !!data?.success });
      if (data?.success) {
        await refreshStatus();
        if (currentLevel < 20) {
          setTimeout(() => {
            setCurrentLevel((l) => Math.min(20, l + 1));
            setFlagFeedback(null);
            setFlagInput('');
          }, 1400);
        }
      }
    } catch (err) {
      setFlagFeedback({ msg: describeError(err as ApiError, currentLevel), ok: false });
    } finally {
      setFlagBusy(false);
    }
  };

  const onTabKeys = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === 'ArrowRight') setActiveTab(TABS[(i + 1) % TABS.length].id);
    else if (e.key === 'ArrowLeft') setActiveTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
    else return;
    e.preventDefault();
  };

  return (
    <div className="w-full space-y-8">
      <header className="border-b border-[var(--color-border)] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            LLM Red-Teaming CTF
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-2xl">
            Twenty levels of prompt injection, filter evasion, and guardrail bypass against a
            locally hosted model. Flags are per-session and cryptographically bound to you.
          </p>
        </div>
        <div
          className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-4 py-2 rounded-md border border-[var(--color-border)] shrink-0"
          role="status"
        >
          Progress{' '}
          <span className="font-semibold text-[var(--color-accent)] tabular-nums">
            {completedLevels.length}/20
          </span>
        </div>
      </header>

      {backendDown && (
        <div
          role="status"
          className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400"
        >
          The arena backend is unreachable right now. It runs on a single machine that also serves
          other workloads. Your progress is stored server-side and will reappear when it returns.
        </div>
      )}

      <div role="tablist" aria-label="CTF sections" onKeyDown={onTabKeys}
           className="flex border-b border-[var(--color-border)] gap-8 text-sm font-medium">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 -mb-px border-b-2 transition-colors ${FOCUS} ${
              activeTab === t.id
                ? 'border-[var(--color-accent)] text-[var(--color-text)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'arena' && (
        <div role="tabpanel" id="panel-arena" aria-labelledby="tab-arena" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Challenge Levels
            </h2>
            {/* Tailwind ships no grid-cols-20; the previous md:grid-cols-20 was a
                silent no-op that left the grid at 10 columns on desktop. */}
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
                const solved = completedLevels.includes(lvl);
                const unlocked = lvl <= maxUnlocked;
                const selected = lvl === currentLevel;
                return (
                  <button
                    key={lvl}
                    disabled={!unlocked}
                    aria-pressed={selected}
                    aria-label={`Level ${lvl}${solved ? ', solved' : unlocked ? '' : ', locked'}`}
                    onClick={() => setCurrentLevel(lvl)}
                    className={`py-2 text-center font-mono text-xs rounded-md border transition-colors ${FOCUS} ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
                        : solved
                        ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                        : unlocked
                        ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]'
                        : 'border-transparent bg-[var(--color-bg-secondary)]/40 text-[var(--color-text-muted)] cursor-not-allowed opacity-40'
                    }`}
                  >
                    {/* Solved state is carried by the glyph, not colour alone. */}
                    {solved ? `✓${lvl}` : unlocked ? lvl : `${lvl}`}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <aside className="lg:col-span-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-5 space-y-5">
              <div className="border-b border-[var(--color-border)] pb-3">
                <h3 className="font-serif text-lg font-semibold leading-snug">
                  Level {meta.level}: {meta.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Tier {meta.tier} · {meta.tier_name}
                </p>
              </div>

              {meta.description && (
                <div>
                  <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                    Objective
                  </h4>
                  <p className="text-sm leading-relaxed">{meta.description}</p>
                </div>
              )}

              {meta.scenario && (
                <div>
                  <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                    Scenario
                  </h4>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-3">
                    {meta.scenario}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {meta.has_input_filter && <Badge tone="amber">Input filter</Badge>}
                {meta.has_prefilter && <Badge tone="amber">Intent pre-filter</Badge>}
                {meta.has_output_filter && <Badge tone="amber">Egress filter</Badge>}
                {meta.defense_status === 'narrative_only' && <Badge tone="neutral">Narrative only</Badge>}
              </div>

              {/* Disclosed limitations read as rigour; undisclosed ones read as fraud. */}
              {meta.defense_note && (
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)] border-l-2 border-[var(--color-border)] pl-3">
                  {meta.defense_note}
                </p>
              )}

              <div className="border-t border-[var(--color-border)] pt-4">
                <button
                  onClick={() => setHintsOpen((v) => !v)}
                  aria-expanded={hintsOpen}
                  aria-controls="hint-drawer"
                  className={`w-full flex items-center justify-between gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm transition-colors ${FOCUS}`}
                >
                  <span>Hints</span>
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                    {hints ? `${hints.attempts} attempts` : '—'}
                  </span>
                </button>

                {hintsOpen && hints && (
                  <div id="hint-drawer" className="mt-3 space-y-3 text-sm">
                    <HintBlock n={1} threshold={3} unlocked={hints.hint_1_unlocked} text={hints.hint_1} />
                    <HintBlock n={2} threshold={5} unlocked={hints.hint_2_unlocked} text={hints.hint_2} />
                  </div>
                )}
              </div>

              <form onSubmit={handleFlagSubmit} className="border-t border-[var(--color-border)] pt-4 space-y-2">
                <label htmlFor="flag-input" className="block text-sm font-semibold">
                  Submit flag
                </label>
                <div className="flex gap-2">
                  <input
                    id="flag-input"
                    type="text"
                    inputMode="text"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="CTF{…}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    /* text-base under sm: iOS zooms on focus below 16px and never zooms back. */
                    className={`flex-1 min-w-0 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-base sm:text-sm font-mono ${FOCUS}`}
                  />
                  <button
                    type="submit"
                    disabled={flagBusy || !flagInput.trim()}
                    className={`bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors ${FOCUS}`}
                  >
                    {flagBusy ? '…' : 'Submit'}
                  </button>
                </div>
                {flagFeedback && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-xs rounded-md px-3 py-2 border ${
                      flagFeedback.ok
                        ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {flagFeedback.msg}
                  </p>
                )}
              </form>
              <details className="border-t border-[var(--color-border)] pt-4">
                <summary className={`text-sm cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text)] ${FOCUS}`}>
                  Move progress to another device
                </summary>
                {/* Replaces the old IP+User-Agent heuristic, which silently
                    shared one session between everyone behind a NAT -- and lost
                    your progress whenever your browser auto-updated. */}
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1.5">
                      Your resume code. Keep it private: anyone holding it has your progress.
                    </p>
                    <div className="flex gap-2">
                      <code className="flex-1 min-w-0 truncate bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-1.5 font-mono text-xs">
                        {sessionCode || '—'}
                      </code>
                      <button
                        type="button"
                        disabled={!sessionCode}
                        onClick={async () => {
                          await navigator.clipboard.writeText(sessionCode);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                        className={`shrink-0 border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-md px-3 py-1.5 text-xs transition-colors ${FOCUS}`}
                      >
                        {codeCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const code = resumeInput.trim();
                      if (!code) return;
                      writeSessionId(code);
                      setResumeInput('');
                      setTranscripts({});
                      void refreshStatus();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={resumeInput}
                      onChange={(e) => setResumeInput(e.target.value)}
                      placeholder="Paste a resume code"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      aria-label="Resume code"
                      className={`flex-1 min-w-0 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-base sm:text-xs font-mono ${FOCUS}`}
                    />
                    <button
                      type="submit"
                      disabled={!resumeInput.trim()}
                      className={`shrink-0 border border-[var(--color-border)] hover:border-[var(--color-accent)] disabled:opacity-50 rounded-md px-3 py-1.5 text-xs transition-colors ${FOCUS}`}
                    >
                      Restore
                    </button>
                  </form>
                </div>
              </details>
            </aside>

            <section className="lg:col-span-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg flex flex-col h-[560px] overflow-hidden">
              <div className="bg-[var(--color-bg-secondary)] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span className="font-mono">level_{currentLevel}</span>
                <span className="truncate ml-3">{meta.title}</span>
              </div>

              <div
                ref={logRef}
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-busy={loading}
                aria-label="Model transcript"
                tabIndex={0}
                className={`flex-1 p-4 overflow-y-auto space-y-4 text-sm ${FOCUS}`}
              >
                {messages.length === 0 && (
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Send a payload to begin. The model holds a secret bound to your session; your
                    job is to make it reveal that secret.
                  </p>
                )}

                {messages.map((m) => {
                  if (m.sender === 'user') {
                    return (
                      <div key={m.id} className="flex items-start gap-2 text-[var(--color-accent)]">
                        <span aria-hidden="true" className="select-none text-[var(--color-text-muted)]">
                          &gt;
                        </span>
                        <span className="whitespace-pre-wrap font-mono break-words min-w-0">{m.text}</span>
                      </div>
                    );
                  }
                  if (m.sender === 'system') {
                    return (
                      <p key={m.id} className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3">
                        {m.text}
                      </p>
                    );
                  }
                  return (
                    <div
                      key={m.id}
                      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 space-y-2"
                    >
                      {/* Model output is attacker-influenced by design and is rendered
                          as a text node only — never as HTML or markdown. */}
                      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed break-words">
                        {m.text || (loading ? '' : '—')}
                      </div>

                      {m.win && (
                        <div className="rounded-md border border-emerald-600/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
                          <p className="font-semibold">Flag captured</p>
                          {m.judge_reason && <p className="text-xs">{m.judge_reason}</p>}
                          {m.unlocked_flag && (
                            <code className="block select-all font-mono text-xs bg-[var(--color-bg)] border border-emerald-600/30 rounded px-2 py-1.5 break-all">
                              {m.unlocked_flag}
                            </code>
                          )}
                        </div>
                      )}

                      {m.engineError && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Platform limit, not a guardrail — retry or shorten the payload.
                        </p>
                      )}

                      {!m.win && !m.engineError && m.judge_reason && (
                        <p className="text-xs text-[var(--color-text-muted)]">{m.judge_reason}</p>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-accent)]">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    Running inference on the local model…
                  </p>
                )}
              </div>

              <form onSubmit={handleSend} className="p-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex gap-2 items-end">
                {/* A textarea, not an <input>: several levels' own hints hand the
                    player multi-line payloads, and a single-line input silently
                    strips the newlines that make them work. */}
                <textarea
                  rows={1}
                  placeholder={`Payload for level ${currentLevel} — Shift+Enter for a newline`}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={(e) => {
                    // Guard against IME composition: level 5 is the multilingual
                    // challenge, and CJK input uses Enter to confirm candidates.
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                  disabled={loading}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-label={`Prompt payload for level ${currentLevel}`}
                  className={`flex-1 min-w-0 resize-none bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-base sm:text-sm font-mono disabled:opacity-60 ${FOCUS}`}
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className={`bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors shrink-0 ${FOCUS}`}
                >
                  Send
                </button>
              </form>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'owasp' && (
        <div role="tabpanel" id="panel-owasp" aria-labelledby="tab-owasp">
          <OWASPWriteups completedLevels={completedLevels} />
        </div>
      )}

      {activeTab === 'cert' && (
        <div role="tabpanel" id="panel-cert" aria-labelledby="tab-cert">
          <CTFCertificate completedCount={completedLevels.length} />
        </div>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: 'amber' | 'neutral'; children: React.ReactNode }) {
  const styles =
    tone === 'amber'
      ? 'border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]';
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${styles}`}>{children}</span>
  );
}

function HintBlock({
  n, threshold, unlocked, text,
}: { n: number; threshold: number; unlocked: boolean; text: string }) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        Hint {n} · {unlocked ? 'unlocked' : `${threshold} attempts`}
      </p>
      <p className={`text-sm leading-relaxed ${unlocked ? '' : 'text-[var(--color-text-muted)] italic'}`}>
        {text}
      </p>
    </div>
  );
}
