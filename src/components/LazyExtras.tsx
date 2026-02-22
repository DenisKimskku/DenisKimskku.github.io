'use client';

import dynamic from 'next/dynamic';

const BackToTop = dynamic(() => import('@/components/BackToTop'), { ssr: false });
const KeyboardShortcuts = dynamic(() => import('@/components/KeyboardShortcuts'), { ssr: false });

export default function LazyExtras() {
  return (
    <>
      <BackToTop />
      <KeyboardShortcuts />
    </>
  );
}
