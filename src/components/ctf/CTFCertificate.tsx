'use client';

import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_CTF_BACKEND_URL || 'http://localhost:8000';

interface CertInfo {
  user_id: string;
  completed_count: number;
  total_levels: number;
  is_completed: boolean;
  certificate_code: string | null;
}

export default function CTFCertificate() {
  const [certData, setCertData] = useState<CertInfo | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetchCert();
  }, []);

  const fetchCert = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/certificate`, { credentials: 'include' });
      if (res.ok) {
        const json: CertInfo = await res.json();
        setCertData(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyCertLink = () => {
    if (certData?.certificate_code) {
      const link = `${window.location.origin}/ctf/?verify=${certData.certificate_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b border-[var(--color-border)] pb-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-[var(--color-text)]">
          LLM Red-Teaming Completion Certificate
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Cryptographically signed certificate verified via server HMAC signature.
        </p>
      </div>

      {certData && certData.is_completed && certData.certificate_code ? (
        <div className="bg-[var(--color-bg-secondary)] border-2 border-[var(--color-accent)] rounded-xl p-8 space-y-6 text-center relative overflow-hidden shadow-lg">
          <div className="absolute top-3 right-3 text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            VERIFIED HMAC SIGNATURE
          </div>

          <div className="space-y-2">
            <div className="text-3xl">🏅</div>
            <h3 className="font-serif text-xl font-bold text-[var(--color-text)]">
              Certificate of Adversarial Mastery
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              This certifies that participant <span className="font-mono font-bold text-[var(--color-accent)]">{certData.user_id}</span> has successfully exploited and completed all 20 LLM Red-Teaming CTF challenges.
            </p>
          </div>

          <div className="bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border)] font-mono text-xs space-y-1">
            <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[10px]">
              Signed Certificate Hash Code
            </div>
            <div className="text-sm font-bold text-[var(--color-accent)]">
              {certData.certificate_code}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={copyCertLink}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-xs px-4 py-2 rounded-md transition-colors"
            >
              {copied ? '✓ Link Copied!' : 'Copy Verification Link'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-8 text-center space-y-4 font-mono text-xs">
          <div className="text-2xl">🔒</div>
          <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
            Certificate Locked
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            Complete all 20 levels in the CTF Arena to unlock your cryptographically signed HMAC completion badge.
          </p>
          <div className="text-[var(--color-accent)] font-semibold">
            Progress: {certData?.completed_count || 0}/20 Solved
          </div>
        </div>
      )}
    </div>
  );
}
