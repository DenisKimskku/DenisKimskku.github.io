'use client';

import dynamic from 'next/dynamic';

// AskAI is 800 lines of selection-tracking UI that no reader needs during
// initial paint; ssr:false splits it into an async chunk loaded after
// hydration instead of shipping it in the page's synchronous bundle.
const AskAI = dynamic(() => import('./AskAI'), { ssr: false });

export default AskAI;
