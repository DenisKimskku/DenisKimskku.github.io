'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { SEARCH_SCOPE_NOTE, noMatchNote, searchAnnouncement, searchPlaceholder, tierOf } from './atlasCopy';
import { nodeSubtitle, paperArea, searchPapers, titleOf, type Atlas } from './atlasModel';
import { PaperRowContent } from './PaperRow';

/* Copy deck S1, S3 and S4 (SPEC §11.2); S2, S5–S8 come from atlasCopy and atlasModel. */
const SEARCH_LABEL = 'Search papers by title or venue';
const CLEAR_SEARCH = 'Clear search';
const RESULTS_LABEL = 'Matching papers';
const LISTBOX_ID = 'atlas-results';
const optionId = (id: string) => `atlas-opt-${id}`;
/** The live region waits this long after the last change, so it never speaks per keystroke. */
const ANNOUNCE_DELAY = 300;

/** The sitewide setting that turns single-key shortcuts off (KeyboardShortcuts, WCAG 2.1.4). */
const SHORTCUTS_DISABLED_KEY = 'shortcuts-disabled';

/** Whether the reader has turned single-key shortcuts off. Unreadable storage counts as on, as it does sitewide. */
export function shortcutsDisabled(): boolean {
  try {
    return window.localStorage.getItem(SHORTCUTS_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}
const subscribeStorage = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};
// The server cannot read the setting, so it renders no "/" hint; the client adds it after hydration.
const hintHiddenOnServer = () => true;

/* The narrowest rail (320px, from 860 to 1023px wide) leaves about 226px for
   the placeholder; S2 with the count measures 257px in Inter 14px, so there
   the box says S2b (206px) instead. Phones and wider rails have room for S2. */
const TIGHT_RAIL = '(min-width: 860px) and (max-width: 1023.98px)';
const subscribeTightRail = (onChange: () => void) => {
  const mq = window.matchMedia(TIGHT_RAIL);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const tightRail = () => window.matchMedia(TIGHT_RAIL).matches;
const tightRailOnServer = () => false;

const ICON_CLEAR = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
  </svg>
);

interface SearchBoxProps {
  atlas: Atlas | null;
  query: string;
  onQueryChange: (query: string) => void;
  /** whether the results list is open (GraphClient owns it, so a #q= link can open it without focus) */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (id: string) => void;
  /** GraphClient's handle on the input, for "/" and for returning focus here. */
  inputRef: RefObject<HTMLInputElement | null>;
}

/* The search, an ARIA combobox (SPEC §7.1): the input owns focus and points
   at the active option with aria-activedescendant; the options carry no
   buttons. The list opens on focus and on typing, and closes on blur (unless
   focus moved inside it), on Escape, on a click outside and when a paper
   opens. The arrows move the active option; Enter opens it, or the first one.
   Two or more characters with no match show one disabled option that says
   so. A polite live region reports the count once typing pauses. Escape from
   the input is this box's own: GraphClient's window handler leaves it alone
   (SPEC §7.7). */
export default function SearchBox({ atlas, query, onQueryChange, open, onOpenChange, onOpen, inputRef }: SearchBoxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(-1);
  const [focused, setFocused] = useState(false);
  const hintHidden = useSyncExternalStore(subscribeStorage, shortcutsDisabled, hintHiddenOnServer);
  const tight = useSyncExternalStore(subscribeTightRail, tightRail, tightRailOnServer);

  const results = useMemo(() => (atlas ? searchPapers(atlas, query) : []), [atlas, query]);
  const typed = query.trim();
  const listOpen = open && atlas !== null && typed.length >= 2;
  const empty = listOpen && results.length === 0;
  const active = listOpen && cursor >= 0 && cursor < results.length ? cursor : -1;
  const activeId = active >= 0 ? optionId(results[active].id) : undefined;

  // S8, once the results have been still for a moment.
  const message = listOpen ? searchAnnouncement(results.length) : '';
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setSpoken(message), ANNOUNCE_DELAY);
    return () => window.clearTimeout(timer);
  }, [message]);

  // The active option stays in view as the arrows move it.
  useEffect(() => {
    // Instant, whatever html's smooth scrolling says: no motion (SPEC §12.10).
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [activeId]);

  // A list opened by a #q= link never had focus, so blur cannot close it: a press outside does.
  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [listOpen, onOpenChange]);

  const choose = (id: string) => {
    setCursor(-1);
    onOpen(id);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!atlas || typed.length < 2) return;
      event.preventDefault();
      if (!open) onOpenChange(true);
      if (results.length === 0) return;
      const down = event.key === 'ArrowDown';
      setCursor((c) => {
        const from = c >= 0 && c < results.length ? c : -1;
        if (down) return (from + 1) % results.length;
        return from <= 0 ? results.length - 1 : from - 1;
      });
    } else if (event.key === 'Enter') {
      if (!listOpen || results.length === 0) return;
      event.preventDefault();
      choose(results[active >= 0 ? active : 0].id);
    } else if (event.key === 'Escape') {
      if (listOpen) {
        // Closing the results keeps what the reader typed: without this, a
        // type="search" field's own Escape (Chrome, Safari) empties it too.
        event.preventDefault();
        onOpenChange(false);
        setCursor(-1);
      } else if (query) {
        onQueryChange('');
      }
    }
  };

  return (
    <div ref={rootRef} data-atlas-measure="search" className="relative w-full">
      <label htmlFor="atlas-search" className="sr-only">
        {SEARCH_LABEL}
      </label>
      <input
        ref={inputRef}
        id="atlas-search"
        type="search"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setCursor(-1);
          onOpenChange(true);
        }}
        onFocus={() => {
          setFocused(true);
          onOpenChange(true);
        }}
        onBlur={(event) => {
          setFocused(false);
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) onOpenChange(false);
        }}
        onKeyDown={onKeyDown}
        placeholder={searchPlaceholder(atlas && !tight ? atlas.counts.all : null)}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        // pr-10 (40px) clears the clear button (4 + 32px) and the "/" hint (10 + 19px) on the right.
        className="w-full rounded-md border border-(--color-border) bg-(--color-bg) py-2 pr-10 pl-3 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus-visible:outline-2 focus-visible:outline-(--color-accent) [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          aria-label={CLEAR_SEARCH}
          title={CLEAR_SEARCH}
          onClick={() => {
            onQueryChange('');
            setCursor(-1);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
        >
          {ICON_CLEAR}
        </button>
      ) : (
        !focused &&
        !hintHidden && (
          // S3: only for a pointer that can hover (a keyboard is likely), while the box is empty and unfocused.
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-(--color-border) px-1.5 font-sans text-[11px] leading-[18px] text-(--color-text-muted) [@media(hover:hover)]:inline-block"
          >
            /
          </kbd>
        )
      )}

      <ul
        id={LISTBOX_ID}
        role="listbox"
        aria-label={RESULTS_LABEL}
        hidden={!listOpen}
        data-atlas-measure="search-results"
        className="absolute z-30 mt-1 max-h-[min(70vh,38rem)] w-full overflow-y-auto rounded-md border border-(--color-border) bg-(--color-bg) py-1 shadow-lg dark:shadow-none"
      >
        {empty ? (
          <li role="option" aria-disabled="true" aria-selected="false" data-atlas-measure="search-empty" className="px-3 py-2.5">
            <span className="block text-sm text-(--color-text)">{noMatchNote(typed)}</span>
            <span className="mt-0.5 block text-xs text-(--color-text-muted)">{SEARCH_SCOPE_NOTE}</span>
          </li>
        ) : (
          atlas &&
          listOpen &&
          results.map((node, i) => (
            <li
              key={node.id}
              id={optionId(node.id)}
              role="option"
              aria-selected={i === active}
              data-atlas-option={node.id}
              // Keep focus in the input: a press on an option must not blur it first.
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => {
                if (cursor !== i) setCursor(i);
              }}
              onClick={() => choose(node.id)}
              className="cursor-pointer px-3 py-2 aria-selected:bg-(--color-bg-tertiary) aria-selected:shadow-[inset_3px_0_0_var(--color-accent)]"
            >
              <PaperRowContent
                variant="compact"
                title={titleOf(atlas, node)}
                tier={tierOf(node)}
                area={paperArea(atlas, node)}
                subtitle={nodeSubtitle(node, atlas.regions.get(node.c))}
              />
            </li>
          ))
        )}
      </ul>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only mb-0">
        {spoken}
      </p>
    </div>
  );
}
