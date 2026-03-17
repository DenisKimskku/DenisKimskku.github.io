'use client';

import { useEffect } from 'react';

export default function CodeBlockEnhancer() {
  useEffect(() => {
    const container = document.querySelector('.article-content');
    if (!container) return;

    const preBlocks = container.querySelectorAll('pre');
    const buttons: HTMLButtonElement[] = [];

    preBlocks.forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code) return;

      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.className = 'code-copy-btn no-print';
      btn.setAttribute('aria-label', 'Copy code to clipboard');

      btn.addEventListener('click', () => {
        const text = code.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 2000);
        });
      });

      pre.appendChild(btn);
      buttons.push(btn);
    });

    return () => {
      buttons.forEach((btn) => btn.remove());
    };
  }, []);

  return null;
}
