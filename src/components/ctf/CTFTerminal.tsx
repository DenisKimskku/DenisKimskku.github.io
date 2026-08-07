'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import OWASPWriteups from './OWASPWriteups';
import CTFCertificate from './CTFCertificate';
import LevelNavigator from './LevelNavigator';
import BriefingPanel from './BriefingPanel';
import Transcript from './Transcript';
import { BTN_PRIMARY, BTN_QUIET, FIELD, FOCUS, Label, PANEL, PANEL_FOOT, PANEL_HEAD } from './ctfUi';
import {
  DEFAULT_CONTEXT_WINDOW, TIERS, TIER_NAMES, TOTAL_LEVELS,
  levelTitle, levelsInTier, tierOf,
} from './ctfLevels';
import type { ChatMessage, HintData, LevelMeta } from './ctfLevels';
import {
  ApiError, clearConversation as apiClearConversation, ctfFetch, describeError,
  fetchStatus as apiFetchStatus, streamChat, writeSessionId,
} from './ctfApi';

type TabId = 'arena' | 'owasp' | 'cert';
const TABS: { id: TabId; label: string }[] = [
  { id: 'arena', label: 'Arena' },
  { id: 'owasp', label: 'Attack reference' },
  { id: 'cert', label: 'Certificate' },
];

function placeholderMeta(lvl: number): LevelMeta {
  return {
    level: lvl,
    title: levelTitle(lvl),
    tier: tierOf(lvl),
    tier_name: TIER_NAMES[tierOf(lvl)] ?? '',
    description: '',
    scenario: '',
    has_input_filter: false,
    has_output_filter: false,
    is_completed: false,
  };
}

export default function CTFTerminal() {
  const [activeTab, setActiveTab] = useState<TabId>('arena');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [writeupLevel, setWriteupLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [serverCurrentLevel, setServerCurrentLevel] = useState(1);
  const [meta, setMeta] = useState<LevelMeta>(placeholderMeta(1));

  // Drafts are per level, like transcripts: switching away to re-read a solved
  // level used to throw away whatever you were composing.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [transcripts, setTranscripts] = useState<Record<number, ChatMessage[]>>({});

  const [flagInput, setFlagInput] = useState('');
  const [flagFeedback, setFlagFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [flagBusy, setFlagBusy] = useState(false);

  // Which level the single in-flight generation belongs to. One GPU, one
  // request: a global `loading` flag disabled the composer of a level that was
  // not even being generated.
  const [busyLevel, setBusyLevel] = useState<number | null>(null);
  const [phase, setPhase] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const [hints, setHints] = useState<HintData | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [backendDown, setBackendDown] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [resumeInput, setResumeInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [announce, setAnnounce] = useState('');

  const logRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const advanceTimer = useRef<number | null>(null);

  const messages = useMemo(() => transcripts[currentLevel] ?? [], [transcripts, currentLevel]);
  const draft = drafts[currentLevel] ?? '';
  const solved = completedLevels.includes(currentLevel);
  const busyHere = busyLevel === currentLevel;

  const multiTurn = meta.multi_turn ?? false;
  const contextWindow = meta.context_window ?? DEFAULT_CONTEXT_WINDOW;
  const conversationalCount = messages.filter((m) => m.sender !== 'system').length;
  const contextUsed = Math.min(conversationalCount, contextWindow);
  const contextFull = multiTurn && conversationalCount >= contextWindow;

  // Never optimistically unlock: this used to default to 20, so every level was
  // clickable on first paint and stayed that way if the backend was unreachable.
  const maxUnlocked = useMemo(
    () => Math.max(1, serverCurrentLevel, ...completedLevels.map((l) => l + 1)),
    [serverCurrentLevel, completedLevels],
  );

  const setDraft = useCallback((lvl: number, value: string) => {
    setDrafts((prev) => ({ ...prev, [lvl]: value }));
  }, []);

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
    // Wrapped in an IIFE (rather than calling refreshStatus directly) so the
    // effect body's own first statement is the async boundary, not a call
    // into a function that sets state -- same shape as the level-fetch effect
    // below.
    void (async () => {
      await refreshStatus(ac.signal);
    })();
    return () => ac.abort();
  }, [refreshStatus]);

  // Cancel in-flight inference and any pending auto-advance on unmount.
  useEffect(
    () => () => {
      inflight.current?.abort();
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Every per-level control resets together. Previously only `meta` did, so a
  // level-3 flag sat in the box on level 4 and the old hint count flashed.
  // Adjusted during render (the "you might not need an effect" pattern,
  // matching OWASPWriteups' prevInitial/selectedLevel below) instead of in
  // the effect, so there's no render with stale controls before the reset
  // lands.
  const [prevLevel, setPrevLevel] = useState(currentLevel);
  if (currentLevel !== prevLevel) {
    setPrevLevel(currentLevel);
    setMeta(placeholderMeta(currentLevel));
    setFlagInput('');
    setFlagFeedback(null);
    setHints(null);
    setConfirmClear(false);
    setPhase('');
  }

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await ctfFetch(`/api/level/${currentLevel}`, { signal: ac.signal, timeoutMs: 15_000 });
        const data = (await res.json()) as LevelMeta;
        setMeta(data);
        setAnnounce(`Level ${data.level}: ${data.title}. Tier ${data.tier}, ${data.tier_name}.`);
      } catch (e) {
        if ((e as ApiError).kind !== 'aborted') setBackendDown(true);
      }
      try {
        const res = await ctfFetch(`/api/hint/${currentLevel}`, { signal: ac.signal, timeoutMs: 15_000 });
        setHints((await res.json()) as HintData);
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
  }, [messages, busyLevel]);

  // Auto-size from the VALUE, not from the change event: restoring a failed
  // 40-line payload left the box one row tall.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft, currentLevel]);

  useEffect(() => {
    if (busyLevel === null) return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [busyLevel]);

  const send = async (override?: string) => {
    const lvl = currentLevel;
    const text = (override ?? drafts[lvl] ?? '').trim();
    if (!text || busyLevel !== null) return;

    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;

    const userId = `usr-${Date.now()}`;
    const id = `ast-${Date.now()}`;
    setDraft(lvl, '');
    pushMessage(lvl, { id: userId, sender: 'user', text });
    pushMessage(lvl, { id, sender: 'assistant', text: '' });
    setBusyLevel(lvl);
    setPhase('');

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
        {
          signal: ac.signal,
          onEvent: (ev) => {
            if (ev.status) setPhase(ev.status);
          },
        },
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

      void ctfFetch(`/api/hint/${lvl}`, { timeoutMs: 15_000 })
        .then((r) => r.json())
        .then((h: HintData) => setHints(h))
        .catch(() => undefined);

      if (final.win && final.unlocked_flag) {
        // Do NOT pre-fill the flag box or tell the player to submit: the chat
        // path already called unlock_level, so the level was banked before this
        // ran. The old announcement instructed an action that had happened.
        setAnnounce(`Level ${lvl} solved. Progress saved; level ${Math.min(TOTAL_LEVELS, lvl + 1)} is unlocked.`);
        void refreshStatus();
      } else {
        setAnnounce(`The model answered on level ${lvl}. No flag yet.`);
      }
    } catch (err) {
      const e = err as ApiError;
      if (e.kind === 'aborted') {
        // Drop the WHOLE exchange: a stopped attempt must not leave an orphan
        // user turn with no reply, which would also misrepresent the context.
        setTranscripts((prev) => ({
          ...prev,
          [lvl]: (prev[lvl] ?? []).filter((m) => m.id !== id && m.id !== userId),
        }));
        setDrafts((prev) => ({ ...prev, [lvl]: prev[lvl]?.trim() ? prev[lvl] : text }));
        return;
      }
      setTranscripts((prev) => ({
        ...prev,
        [lvl]: (prev[lvl] ?? [])
          .filter((m) => m.id !== id)
          .concat({
            id: `err-${Date.now()}`,
            sender: 'system',
            text: describeError(e, lvl),
            payload: text,
          }),
      }));
      // Give the payload back, but never clobber a newer draft.
      setDrafts((prev) => ({ ...prev, [lvl]: prev[lvl]?.trim() ? prev[lvl] : text }));
      setAnnounce(describeError(e, lvl));
    } finally {
      if (inflight.current === ac) {
        inflight.current = null;
        setBusyLevel(null);
      }
    }
  };

  const submitFlag = async (flag: string) => {
    const lvl = currentLevel;
    if (!flag || flagBusy) return;
    setFlagBusy(true);
    try {
      const res = await ctfFetch('/api/submit_flag', {
        method: 'POST',
        body: { level: lvl, flag },
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
      setAnnounce(msg);
      if (data?.success) {
        await refreshStatus();
        if (lvl < TOTAL_LEVELS) {
          advanceTimer.current = window.setTimeout(() => {
            advanceTimer.current = null;
            setCurrentLevel((l) => Math.min(TOTAL_LEVELS, l + 1));
          }, 1400);
        }
      }
    } catch (err) {
      const msg = describeError(err as ApiError, lvl);
      setFlagFeedback({ msg, ok: false });
      setAnnounce(msg);
    } finally {
      setFlagBusy(false);
    }
  };

  const clearConversation = async () => {
    const lvl = currentLevel;
    setClearing(true);
    try {
      if (multiTurn) await apiClearConversation(lvl);
      setTranscripts((prev) => ({ ...prev, [lvl]: [] }));
      setAnnounce(`Conversation cleared for level ${lvl}. Solved levels and captured flags are unchanged.`);
    } catch (err) {
      const e = err as ApiError;
      // Never report a local-only clear as success: telling a player the model
      // forgot when it did not would silently break the level.
      setTranscripts((prev) => ({
        ...prev,
        [lvl]: [
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text:
              'Cleared on this device only — the arena did not accept the reset, so it may still ' +
              `replay earlier turns on this level. (${describeError(e, lvl)})`,
          },
        ],
      }));
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const onTabKeys = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === 'ArrowRight') setActiveTab(TABS[(i + 1) % TABS.length].id);
    else if (e.key === 'ArrowLeft') setActiveTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
    else if (e.key === 'Home') setActiveTab(TABS[0].id);
    else if (e.key === 'End') setActiveTab(TABS[TABS.length - 1].id);
    else return;
    e.preventDefault();
  };

  return (
    <div className="w-full space-y-8">
      {/* One live region for state that is not visible where the eye is. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      <header className="flex flex-col justify-between gap-6 border-b border-(--color-border) pb-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h1 className="mb-0 font-serif text-2xl font-bold tracking-tight md:text-3xl">
            LLM Red-Teaming CTF
          </h1>
          {/* The rules of the game, stated before any level. The old subtitle
              opened with three pieces of jargon and spent its second sentence on
              an anti-cheat implementation note -- in the most valuable space on
              the page, to an audience that did not yet know what a flag was.
              Objective / success / no-failure, because those were exactly the
              three things a first-time player could not answer. */}
          <p className="mb-0 mt-2 max-w-prose text-sm leading-relaxed text-(--color-text-secondary)">
            Each level hides a secret like <code className="font-mono text-xs">CTF&#123;…&#125;</code>{' '}
            in a real language model&rsquo;s instructions and tells it to keep quiet.{' '}
            <strong className="font-semibold text-(--color-text)">
              Your job is to talk it into saying the secret anyway.
            </strong>{' '}
            When it does, the level is solved automatically — you do not need to do anything else.
          </p>
          <p className="mb-0 mt-1.5 max-w-prose text-sm leading-relaxed text-(--color-text-secondary)">
            There is no way to lose: no timer, no limit, no penalty for a wrong guess. Attempts are
            the only currency and they only ever help — every one you make brings the next hint
            closer.
          </p>
        </div>

        <div
          role="status"
          aria-label={`${completedLevels.length} of ${TOTAL_LEVELS} levels solved`}
          className="shrink-0 md:text-right"
        >
          <Label className="md:text-right">Progress</Label>
          <p className="mb-0 mt-1 font-serif text-2xl font-bold tabular-nums">
            {completedLevels.length}
            <span className="text-base font-normal text-(--color-text-muted)">
              /{TOTAL_LEVELS}
            </span>
          </p>
          {/* Solved-per-tier at a glance. Decorative: the count above carries
              the same information for assistive tech. */}
          <div aria-hidden="true" className="mt-2 flex gap-2 md:justify-end">
            {TIERS.map((tier) => (
              <div key={tier} className="flex gap-0.5">
                {levelsInTier(tier).map((lvl) => (
                  <span
                    key={lvl}
                    className={`h-1.5 w-2 rounded-xs ${
                      completedLevels.includes(lvl)
                        ? 'bg-emerald-600/70 dark:bg-emerald-400/70'
                        : 'bg-(--color-bg-tertiary)'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      {backendDown && (
        <div
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:text-amber-400"
        >
          The arena backend is unreachable right now. It runs on a single machine that also serves
          other workloads. Your progress is stored server-side and will reappear when it returns.
        </div>
      )}

      <div
        role="tablist"
        aria-label="CTF sections"
        onKeyDown={onTabKeys}
        className="flex gap-8 border-b border-(--color-border) text-sm font-medium"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px flex items-baseline gap-1.5 border-b-2 pb-3 transition-colors motion-reduce:transition-none ${FOCUS} ${
              activeTab === t.id
                ? 'border-(--color-accent) font-semibold text-(--color-text)'
                : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text)'
            }`}
          >
            {t.label}
            {t.id === 'owasp' && (
              <span className="text-xs tabular-nums text-(--color-text-muted)">
                {completedLevels.length}
              </span>
            )}
            {t.id === 'cert' && completedLevels.length < TOTAL_LEVELS && (
              <span className="text-xs text-(--color-text-muted)">locked</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'arena' && (
        <div role="tabpanel" id="panel-arena" aria-labelledby="tab-arena" className="space-y-6">
          <LevelNavigator
            currentLevel={currentLevel}
            completedLevels={completedLevels}
            maxUnlocked={maxUnlocked}
            onSelect={setCurrentLevel}
            open={navOpen}
            onToggle={() => setNavOpen((v) => !v)}
          />

          {/* One row, two panels, ONE height. The rail scrolls inside itself
              from lg up so the two never disagree about where they end — the
              old fixed-560px console beside an auto-height sidebar disagreed at
              essentially every viewport. */}
          <div className="grid grid-cols-1 gap-4 lg:h-[min(72vh,44rem)] lg:min-h-136 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6">
            <BriefingPanel
              className="lg:h-full"
              meta={meta}
              solved={solved}
              multiTurn={multiTurn}
              contextWindow={contextWindow}
              open={briefOpen}
              onToggleOpen={() => setBriefOpen((v) => !v)}
              hints={hints}
              hintsOpen={hintsOpen}
              onToggleHints={() => setHintsOpen((v) => !v)}
              flagInput={flagInput}
              onFlagInput={setFlagInput}
              onFlagSubmit={(e) => {
                e.preventDefault();
                void submitFlag(flagInput.trim());
              }}
              flagBusy={flagBusy}
              flagFeedback={flagFeedback}
              sessionCode={sessionCode}
              codeCopied={codeCopied}
              onCopyCode={async () => {
                try {
                  await navigator.clipboard.writeText(sessionCode);
                  setCodeCopied(true);
                  window.setTimeout(() => setCodeCopied(false), 2000);
                } catch {
                  setAnnounce('Copying failed — select the code and copy it manually.');
                }
              }}
              resumeInput={resumeInput}
              onResumeInput={setResumeInput}
              onResume={(e) => {
                e.preventDefault();
                const code = resumeInput.trim();
                if (!code) return;
                writeSessionId(code);
                setResumeInput('');
                setTranscripts({});
                setDrafts({});
                void refreshStatus();
              }}
              onPostMortem={() => {
                setWriteupLevel(currentLevel);
                setActiveTab('owasp');
              }}
            />

            <section
              aria-label={`Console for level ${currentLevel}`}
              className={`${PANEL} h-112 sm:h-136 lg:h-full`}
            >
              <div className={`${PANEL_HEAD} flex flex-wrap items-center justify-between gap-x-3 gap-y-2`}>
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-xs text-(--color-text-muted)">
                    level_{String(currentLevel).padStart(2, '0')}
                  </span>
                  <span className="truncate text-sm">{meta.title}</span>
                </span>

                <span className="flex items-center gap-3">
                  {multiTurn ? (
                    <span
                      className="flex items-center gap-1.5"
                      title={`The arena replays the last ${contextWindow} messages of this level into the prompt.`}
                    >
                      <span
                        className={`text-xs tabular-nums ${
                          contextFull
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-(--color-text-muted)'
                        }`}
                      >
                        context {contextUsed}/{contextWindow}
                        {contextFull ? ' · oldest drops next' : ''}
                      </span>
                      <span aria-hidden="true" className="flex gap-0.5">
                        {Array.from({ length: contextWindow }, (_, i) => (
                          <span
                            key={i}
                            className={`h-3 w-1 rounded-xs ${
                              i < contextUsed ? 'bg-(--color-accent)' : 'bg-(--color-bg-tertiary)'
                            }`}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span
                      className="text-xs text-(--color-text-muted)"
                      title="Each prompt is sent to the model on its own. Earlier turns are not replayed."
                    >
                      stateless
                    </span>
                  )}

                  {confirmClear ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void clearConversation()}
                        disabled={clearing}
                        className={`${BTN_QUIET} h-8 text-xs ${FOCUS}`}
                      >
                        {clearing ? 'Clearing…' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className={`${BTN_QUIET} h-8 text-xs ${FOCUS}`}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      disabled={messages.length === 0 || busyHere}
                      className={`${BTN_QUIET} h-8 text-xs ${FOCUS}`}
                    >
                      Clear
                    </button>
                  )}
                </span>
              </div>

              {confirmClear && (
                <p className="mb-0 shrink-0 border-b border-(--color-border) bg-(--color-bg-secondary) px-4 pb-3 text-xs leading-5 text-(--color-text-secondary)">
                  {multiTurn
                    ? 'Clears this level’s conversation on the server and on this device, so the next prompt starts a fresh frame. '
                    : 'Clears this transcript on this device. '}
                  Your solved levels, captured flags, and resume code are untouched.
                </p>
              )}

              <Transcript
                messages={messages}
                level={currentLevel}
                loading={busyHere}
                phase={phase}
                elapsed={busyLevel === null ? 0 : elapsed}
                buffered={meta.has_output_filter}
                multiTurn={multiTurn}
                contextWindow={contextWindow}
                logRef={logRef}
                onRetry={(payload) => void send(payload)}
                onNextLevel={() => setCurrentLevel((l) => Math.min(TOTAL_LEVELS, l + 1))}
                onStop={() => inflight.current?.abort()}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className={PANEL_FOOT}
              >
                <div className="flex items-end gap-2">
                  {/* A textarea, not an <input>: several levels' own hints hand
                      the player multi-line payloads, and a single-line input
                      silently strips the newlines that make them work. */}
                  <textarea
                    ref={composerRef}
                    rows={1}
                    placeholder={currentLevel <= 3
                      ? 'Ask it something…'
                      : `Payload for level ${currentLevel}`}
                    value={draft}
                    onChange={(e) => setDraft(currentLevel, e.target.value)}
                    onKeyDown={(e) => {
                      // IME guard: level 5 is the multilingual challenge and CJK
                      // input uses Enter to confirm a candidate.
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    disabled={busyLevel !== null && !busyHere}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-label={`Prompt payload for level ${currentLevel}`}
                    aria-describedby="composer-help"
                    className={`${FIELD} max-h-40 flex-1 resize-none leading-relaxed disabled:opacity-60 ${FOCUS}`}
                  />
                  {busyHere ? (
                    <button
                      type="button"
                      onClick={() => inflight.current?.abort()}
                      className={`${BTN_QUIET} h-10 shrink-0 ${FOCUS}`}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!draft.trim() || busyLevel !== null}
                      className={`${BTN_PRIMARY} h-10 shrink-0 ${FOCUS}`}
                    >
                      Send
                    </button>
                  )}
                </div>
                <p
                  id="composer-help"
                  className="mb-0 mt-1.5 flex items-baseline justify-between gap-3 text-xs text-(--color-text-muted)"
                >
                  <span>
                    {busyLevel !== null && !busyHere
                      ? `The arena is generating on level ${busyLevel} — one request at a time.`
                      : 'Enter sends · Shift+Enter inserts a newline'}
                  </span>
                  {draft.length > 400 && (
                    <span className="shrink-0 tabular-nums">{draft.length} chars</span>
                  )}
                </p>
              </form>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'owasp' && (
        <div role="tabpanel" id="panel-owasp" aria-labelledby="tab-owasp">
          <OWASPWriteups completedLevels={completedLevels} initialLevel={writeupLevel} />
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
