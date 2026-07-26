'use client';

import React, { useState, useEffect, useRef } from 'react';
import OWASPWriteups from './OWASPWriteups';
import CTFCertificate from './CTFCertificate';

const BACKEND_URL = process.env.NEXT_PUBLIC_CTF_BACKEND_URL || 'http://localhost:8000';

interface LevelMeta {
  level: number;
  title: string;
  tier: number;
  tier_name: string;
  description: string;
  scenario: string;
  has_input_filter: boolean;
  has_output_filter: boolean;
  is_completed: boolean;
}

interface ChatMessage {
  sender: 'user' | 'assistant' | 'system';
  text: string;
  win?: boolean;
  judge_reason?: string;
  unlocked_flag?: string;
  guardrail_blocked?: boolean;
  queued?: boolean;
}

interface HintData {
  attempts: number;
  hint_1_unlocked: boolean;
  hint_1: string;
  hint_2_unlocked: boolean;
  hint_2: string;
}

function TypewriterText({ text, onChunk }: { text: string; onChunk?: () => void }) {
  const [displayed, setDisplayed] = useState<string>('');

  useEffect(() => {
    let index = 0;
    setDisplayed('');
    if (!text) return;

    const timer = setInterval(() => {
      index += 3;
      if (index >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, index));
      }
      onChunk?.();
    }, 15);

    return () => clearInterval(timer);
  }, [text, onChunk]);

  return <div className="whitespace-pre-wrap leading-relaxed">{displayed}</div>;
}

export default function CTFTerminal() {
  const [activeTab, setActiveTab] = useState<'arena' | 'owasp' | 'cert'>('arena');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [userMaxUnlocked, setUserMaxUnlocked] = useState<number>(1);
  const [activeMeta, setActiveMeta] = useState<LevelMeta | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flagInput, setFlagInput] = useState<string>('');
  const [flagFeedback, setFlagFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Hint state
  const [hintData, setHintData] = useState<HintData | null>(null);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (currentLevel) {
      fetchLevelInfo(currentLevel);
      fetchHints(currentLevel);
    }
  }, [currentLevel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCompletedLevels(data.completed_levels || []);
        setUserMaxUnlocked(data.current_level || 1);
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const fetchLevelInfo = async (lvl: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/level/${lvl}`, { credentials: 'include' });
      if (res.ok) {
        const data: LevelMeta = await res.json();
        setActiveMeta(data);
        setMessages([
          {
            sender: 'system',
            text: `Level ${lvl}: ${data.title}\nScenario: ${data.scenario}`,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHints = async (lvl: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/hint/${lvl}`, { credentials: 'include' });
      if (res.ok) {
        const data: HintData = await res.json();
        setHintData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level: currentLevel, prompt: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: data.response,
            win: data.win,
            judge_reason: data.judge_reason,
            unlocked_flag: data.unlocked_flag,
            guardrail_blocked: data.guardrail_blocked,
            queued: data.queued,
          },
        ]);

        fetchHints(currentLevel);

        if (data.win && data.unlocked_flag) {
          setFlagInput(data.unlocked_flag);
          fetchStatus();
        }
      } else {
        const errData = await res.json().catch(() => ({ detail: 'Request failed' }));
        setMessages((prev) => [
          ...prev,
          { sender: 'system', text: `[Error ${res.status}] ${errData.detail || 'Failed'}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'system', text: '[Error] Unable to communicate with CTF inference backend.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/submit_flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level: currentLevel, flag: flagInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setFlagFeedback({ msg: data.message, success: true });
        fetchStatus();
        if (currentLevel < 20) {
          setTimeout(() => {
            setCurrentLevel(currentLevel + 1);
            setFlagFeedback(null);
            setFlagInput('');
          }, 1500);
        }
      } else {
        setFlagFeedback({ msg: data.message, success: false });
      }
    } catch {
      setFlagFeedback({ msg: 'Error connecting to verification server', success: false });
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Top Header & Tab Navigation Bar */}
      <div className="border-b border-[var(--color-border)] pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text)]">
            LLM Red-Teaming CTF
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            A 20-level adversarial security arena testing prompt injection, defense evasion, and jailbreaking against local language models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>Engine: {backendStatus.toUpperCase()}</span>
          </div>

          <div className="bg-[var(--color-bg-secondary)] px-3 py-1.5 rounded-md border border-[var(--color-border)] font-semibold text-[var(--color-accent)]">
            Progress: {completedLevels.length}/20
          </div>
        </div>
      </div>

      {/* 3 Academic Workspace Tabs */}
      <div className="flex border-b border-[var(--color-border)] gap-6 text-sm font-medium font-mono">
        <button
          onClick={() => setActiveTab('arena')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'arena'
              ? 'border-[var(--color-accent)] text-[var(--color-text)] font-semibold'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          [1. CTF Arena]
        </button>

        <button
          onClick={() => setActiveTab('owasp')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'owasp'
              ? 'border-[var(--color-accent)] text-[var(--color-text)] font-semibold'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          [2. OWASP Writeups]
        </button>

        <button
          onClick={() => setActiveTab('cert')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'cert'
              ? 'border-[var(--color-accent)] text-[var(--color-text)] font-semibold'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          [3. Verified Certificate]
        </button>
      </div>

      {/* TAB 1: CTF ARENA */}
      {activeTab === 'arena' && (
        <>
          {/* Challenge Level Selector Grid */}
          <div className="space-y-3">
            <h2 className="font-serif text-base font-semibold text-[var(--color-text)]">
              Challenge Levels
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
                const isSolved = completedLevels.includes(lvl);
                const isUnlocked = lvl <= userMaxUnlocked || isSolved;
                const isSelected = lvl === currentLevel;

                return (
                  <button
                    key={lvl}
                    disabled={!isUnlocked}
                    onClick={() => setCurrentLevel(lvl)}
                    className={`py-2 text-center font-mono text-xs rounded-md border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
                        : isSolved
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-medium'
                        : isUnlocked
                        ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                        : 'border-transparent bg-[var(--color-bg-secondary)]/30 text-[var(--color-text-muted)] cursor-not-allowed opacity-40'
                    }`}
                  >
                    {isSolved ? `✓ ${lvl}` : lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Challenge Detail & Execution Workspace */}
          {activeMeta && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel: Academic Level Briefing */}
              <div className="lg:col-span-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-5 space-y-4 text-xs">
                <div className="border-b border-[var(--color-border)] pb-3">
                  <h3 className="font-serif text-lg font-semibold text-[var(--color-text)]">
                    Level {activeMeta.level}: {activeMeta.title}
                  </h3>
                  <div className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-mono">
                    Tier {activeMeta.tier} • {activeMeta.tier_name}
                  </div>
                </div>

                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider mb-1 font-mono text-[10px]">
                    Objective
                  </div>
                  <p className="text-[var(--color-text)] leading-relaxed">{activeMeta.description}</p>
                </div>

                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider mb-1 font-mono text-[10px]">
                    Scenario
                  </div>
                  <div className="bg-[var(--color-bg)] p-3 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] leading-relaxed">
                    {activeMeta.scenario}
                  </div>
                </div>

                {/* Progressive Hint Drawer Button */}
                <div className="border-t border-[var(--color-border)] pt-3">
                  <button
                    onClick={() => setShowHintModal(!showHintModal)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text)] font-mono py-2 rounded-md text-xs transition-colors flex items-center justify-between px-3"
                  >
                    <span>💡 Progressive Hints</span>
                    <span className="text-[var(--color-accent)] font-semibold">
                      {hintData ? `Attempts: ${hintData.attempts}` : 'Loading...'}
                    </span>
                  </button>

                  {showHintModal && hintData && (
                    <div className="mt-3 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md space-y-3 font-mono text-[11px]">
                      <div>
                        <div className="font-semibold text-[var(--color-accent)] mb-1">
                          Hint 1 (3 Attempts Required)
                        </div>
                        <div className="text-[var(--color-text-secondary)] leading-relaxed">
                          {hintData.hint_1}
                        </div>
                      </div>

                      <div className="border-t border-[var(--color-border-light)] pt-2">
                        <div className="font-semibold text-[var(--color-accent)] mb-1">
                          Hint 2 (5 Attempts Required)
                        </div>
                        <div className="text-[var(--color-text-secondary)] leading-relaxed">
                          {hintData.hint_2}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flag Submission Form */}
                <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
                  <label className="font-semibold text-[var(--color-text)] block text-xs">
                    Submit Flag
                  </label>
                  <form onSubmit={handleFlagSubmit} className="space-y-2">
                    <input
                      type="text"
                      placeholder="CTF{...}"
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2 rounded-md text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    >
                      Verify Flag
                    </button>
                  </form>

                  {flagFeedback && (
                    <div
                      className={`p-2.5 rounded text-[11px] font-mono ${
                        flagFeedback.success
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                          : 'bg-red-500/10 border border-red-500/30 text-red-500'
                      }`}
                    >
                      {flagFeedback.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Academic Interactive Terminal */}
              <div className="lg:col-span-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg flex flex-col h-[520px] font-mono text-xs shadow-sm overflow-hidden">
                {/* Terminal Header */}
                <div className="bg-[var(--color-bg-secondary)] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-[var(--color-text-secondary)] text-[11px] ml-2 font-mono">ctf_arena ~ level_{currentLevel}.py</span>
                  </div>
                  <span className="text-[var(--color-text-muted)] text-[10px]">Ollama (qwen3:8b)</span>
                </div>

                {/* Chat Output Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.map((m, idx) => (
                    <div key={idx} className="space-y-1">
                      {m.sender === 'user' && (
                        <div className="text-[var(--color-accent)] flex items-start gap-2">
                          <span className="text-[var(--color-text-muted)]">&gt;</span>
                          <span className="whitespace-pre-wrap">{m.text}</span>
                        </div>
                      )}

                      {m.sender === 'assistant' && (
                        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 rounded-md text-[var(--color-text)] space-y-2 leading-relaxed">
                          <TypewriterText text={m.text} onChunk={scrollToBottom} />
                          
                          {m.win && (
                            <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-500 text-[11px]">
                              🏆 <strong>JUDGE VERDICT: WIN DETECTED!</strong>
                              <br />
                              {m.judge_reason}
                              {m.unlocked_flag && (
                                <div className="mt-1 font-bold text-[var(--color-text)]">
                                  Flag: {m.unlocked_flag}
                                </div>
                              )}
                            </div>
                          )}

                          {m.queued && (
                            <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-[11px]">
                              ⏳ <strong>QUEUED:</strong> Request queued — processing shortly. Please wait a moment...
                            </div>
                          )}

                          {m.guardrail_blocked && !m.queued && (
                            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-500 text-[11px]">
                              ⚠️ <strong>GUARDRAIL TRIGGERED:</strong> Input or output filter blocked response compliance.
                            </div>
                          )}
                        </div>
                      )}

                      {m.sender === 'system' && (
                        <div className="text-[var(--color-text-muted)] italic text-[11px] bg-[var(--color-bg-secondary)]/50 p-2.5 rounded border border-[var(--color-border)]">
                          {m.text}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="text-[var(--color-accent)] flex items-center gap-2 text-xs font-mono">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                      <span>Executing inference & LLM Judge inspection...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Prompt Input Bar */}
                <form onSubmit={handleSendPrompt} className="p-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex gap-2">
                  <input
                    type="text"
                    placeholder={`Send prompt payload to Level ${currentLevel} LLM...`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-medium px-4 py-2 rounded-md text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  >
                    Send Payload
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: OWASP WRITEUPS */}
      {activeTab === 'owasp' && (
        <OWASPWriteups completedLevels={completedLevels} />
      )}

      {/* TAB 3: VERIFIED CERTIFICATE */}
      {activeTab === 'cert' && (
        <CTFCertificate />
      )}
    </div>
  );
}
