'use client';

import React, { useEffect, useState } from 'react';
import { ApiError, ctfFetch, describeError } from './ctfApi';

/** Matches what /api/certificate actually returns.
 *
 * The previous interface declared `is_completed` and `completed_count`, neither
 * of which the backend has ever sent — so the success card was gated on a
 * permanently-undefined field and could not render even at 20/20.
 */
interface CertInfo {
  certificate_code: string;
  user_id: string;
  completed_levels: number;
  verification_url: string;
}

type State = 'loading' | 'locked' | 'ready' | 'error';

export default function CTFCertificate({ completedCount }: { completedCount: number }) {
  const [cert, setCert] = useState<CertInfo | null>(null);
  const [state, setState] = useState<State>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    // Don't even ask until the server-side count says the run is complete; the
    // 403 body carries the real progress, which used to be discarded and
    // rendered as "0/20 Solved" to someone sitting at 19/20.
    if (completedCount < 20) {
      setState('locked');
      return () => ac.abort();
    }

    ctfFetch('/api/certificate', { signal: ac.signal, timeoutMs: 20_000 })
      .then((r) => r.json())
      .then((json: CertInfo) => {
        setCert(json);
        setState('ready');
      })
      .catch((e: ApiError) => {
        if (e.kind === 'aborted') return;
        if (e.kind === 'forbidden') {
          setState('locked');
          return;
        }
        setErrMsg(describeError(e));
        setState('error');
      });

    return () => ac.abort();
  }, [completedCount]);

  const copyLink = async () => {
    if (!cert) return;
    // The backend's own verification URL, not a /ctf/?verify= link that nothing
    // on the site reads.
    await navigator.clipboard.writeText(cert.verification_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="border-b border-[var(--color-border)] pb-4 text-center">
        <h2 className="font-serif text-2xl font-bold">Completion Certificate</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          Issued as a self-describing signed token: the payload travels inside the code, so anyone
          can verify it without access to your session.
        </p>
      </header>

      {state === 'loading' && (
        <p role="status" className="text-center text-sm text-[var(--color-text-secondary)] py-10">
          Checking your progress…
        </p>
      )}

      {state === 'error' && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-center text-sm text-red-600 dark:text-red-400">
          {errMsg}
        </div>
      )}

      {state === 'locked' && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-8 text-center space-y-3">
          <h3 className="font-serif text-lg font-semibold">Certificate locked</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Complete all 20 levels to claim a signed completion certificate.
          </p>
          <p className="text-sm font-semibold text-[var(--color-accent)] tabular-nums">
            {completedCount}/20 solved
          </p>
        </div>
      )}

      {state === 'ready' && cert && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] rounded-lg p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold">Certificate of Adversarial Mastery</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Participant{' '}
              <span className="font-mono font-semibold text-[var(--color-accent)]">
                {cert.user_id}
              </span>{' '}
              completed all 20 levels of the LLM Red-Teaming CTF.
            </p>
          </div>

          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-4 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Signed certificate code
            </p>
            <code className="block font-mono text-xs text-[var(--color-accent)] select-all break-all">
              {cert.certificate_code}
            </code>
          </div>

          <button
            onClick={copyLink}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            {copied ? 'Verification link copied' : 'Copy verification link'}
          </button>
        </div>
      )}
    </div>
  );
}
