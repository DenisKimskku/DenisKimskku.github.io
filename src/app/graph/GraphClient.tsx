'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import AtlasRail, { type StartPaper } from './AtlasRail';
import MapChips, { createLocationStore, type ChipRegion } from './MapChips';
import MapKey from './MapKey';
import MapStatus from './MapStatus';
import MapToolbar, { ZoomCluster } from './MapToolbar';
import PaperList, { LIST_PAGE } from './PaperList';
import PaperPanel, { type PanelRegion, type SimilarPaper } from './PaperPanel';
import RegionSelect from './RegionSelect';
import RegionView, { REGION_PAGE } from './RegionView';
import SearchBox, { shortcutsDisabled } from './SearchBox';
import type { SimilarState } from './SimilarPapers';
import {
  FILTER_OPTIONS,
  NO_WEBGL_NOTE,
  formatCount,
  tierOf,
  type AtlasView,
  type ListSort,
  type RailView,
  type TierFilter,
} from './atlasCopy';
import {
  historyStep,
  isAtlasFragment,
  parseHash,
  sameHash,
  serializeHash,
  withHash,
  type HashState,
} from './atlasHash';
import {
  defaultFilterFor,
  displayCount,
  displayRegionOf,
  paperArea,
  paperMeta,
  startWithPapers,
  titleOf,
  topNeighbours,
} from './atlasModel';
import { mapKeyAction, shouldFocusSearch } from './mapKeys';
import { useAtlasData, type Capability } from './useAtlasData';
import { useAtlasMap, type AtlasMapApi } from './useAtlasMap';

/** Below this width (or without WebGL) the canvas is replaced by a list. */
const GRAPH_MIN_WIDTH = 860;
const SIMILAR_COUNT = 6;
const NO_IDS: readonly string[] = [];
/** LS-L1: the phone's line before the page knows it is a list. */
const LOADING_PAPERS = 'Loading papers…';

/* Copy deck MA1–MA2 and AN1–AN4 (SPEC §11.4, §12.2, §12.4). */
/** MA1: the map's accessible name. */
const MAP_LABEL = 'Research Atlas map';
const papersCount = (n: number) => `${formatCount(n)} paper${n === 1 ? '' : 's'}`;
/** MA2 */
function mapDescription(papers: number, regions: number): string {
  return `A visual map of ${formatCount(papers)} papers in ${formatCount(regions)} named regions. To browse with a keyboard or screen reader, use the search, Go to a region or the List view. While the map has focus, the arrow keys pan, plus and minus zoom, and 0 fits the whole map.`;
}
/** AN1 */
function mapReadyNote(papers: number, regions: number): string {
  return `Map ready: ${formatCount(papers)} papers in ${formatCount(regions)} named regions.`;
}
/** AN2 */
function nowShowingNote(papers: number, option: string): string {
  return `Now showing ${formatCount(papers)} papers (${option}).`;
}
/** AN3 */
function regionFocusNote(label: string, papers: number): string {
  return `Focused on ${label}: ${papersCount(papers)}.`;
}
/** AN4 */
const REGION_CLEARED = 'Region focus cleared.';
/** AN5 */
const SIMILAR_UNAVAILABLE = 'Similar papers are unavailable right now.';

/** Where an open came from (SPEC §7.4). 'history' is the browser's Back or
    Forward, and 'deeplink' the #p= a page was loaded with: neither writes
    history or moves focus. */
type OpenSource = 'search' | 'map' | 'list' | 'start' | 'region' | 'similar' | 'back' | 'deeplink' | 'history';
/** Where a region focus came from (SPEC §7.3). Browser Back and Forward set
    the region directly (applyHash); a 'deeplink' focus writes no history and
    moves no focus. */
type FocusSource = 'map' | 'menu' | 'panel' | 'chip' | 'deeplink';

interface GraphClientProps {
  /** Server slots from page.tsx (SPEC §3.1). */
  masthead: ReactNode;
  intro: ReactNode;
  about: ReactNode;
}

/* UI state, the URL hash and history, and the frame (SPEC §3, §4.3, §7). The
   data load lives in useAtlasData, the sigma map in useAtlasMap and the pure
   model in atlasModel and atlasHash. */
export default function GraphClient({ masthead, intro, about }: GraphClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const railBodyRef = useRef<HTMLDivElement>(null);
  // Set by useAtlasMap at mount; safe to call before the map is built.
  const mapApiRef = useRef<AtlasMapApi | null>(null);
  // History (SPEC §7.5) is tracked in memory, not in history.state, where
  // Next keeps its own keys. hashStateRef is what the URL says now, and
  // pushedFromRef what it said before this page's last push.
  const hashStateRef = useRef<HashState>({});
  const pushedPanelRef = useRef(false);
  const pushedFromRef = useRef<HashState>({});
  const deepLinkReadRef = useRef(false);
  // The hash exactly as the page was loaded (the #q= seed included), for the
  // deep link in case an in-page anchor (the skip link) replaced it before
  // the atlas landed.
  const initialHashRef = useRef('');
  // Where to return when the paper closes (SPEC §7.4).
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const originRowRef = useRef<string | null>(null);
  const savedScrollRef = useRef<number | null>(null);
  // The rail body's scroll before a paper opened (860px and up), so closing it
  // returns the reader to the same place in the explore or region view.
  const savedRailScrollRef = useRef<number | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  // A paper closed because a region was focused: focus goes to the region view, not back to the paper's opener.
  const skipPaperFocusRef = useRef(false);
  // Where to return when the region focus is cleared.
  const regionReturnRef = useRef<HTMLElement | null>(null);
  const prevRegionRef = useRef<string | null>(null);
  // The view switch had keyboard focus when the view changed.
  const viewFocusRef = useRef(false);

  const [capability, setCapability] = useState<Capability>('pending');
  // The reader's own "Show" choice; until they make one, the default for the
  // device applies (defaultFilterFor, SPEC §7.2).
  const [filterChoice, setFilterChoice] = useState<TierFilter | null>(null);
  // Map or List on a screen that can draw the map, mirroring #view= (SPEC §7.9).
  const [userView, setUserView] = useState<AtlasView>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The focused display region, mirroring #r= (SPEC §4.3, §7.3).
  const [regionKey, setRegionKey] = useState<string | null>(null);
  // Papers left through "Similar papers", for the panel's Back.
  const [trail, setTrail] = useState<string[]>([]);
  const [focusPanel, setFocusPanel] = useState(false);
  const [focusRegionView, setFocusRegionView] = useState(false);
  const [query, setQuery] = useState('');
  // Whether the search's results are open; here so a #q= link can open them without focus.
  const [searchOpen, setSearchOpen] = useState(false);
  const [listLimit, setListLimit] = useState(LIST_PAGE);
  const [listSort, setListSort] = useState<ListSort>('reviews');
  // The region view's rows, per region: kept here because the view unmounts
  // while a paper opened from it is shown, and must come back as it was.
  const [regionPage, setRegionPage] = useState<{ key: string | null; limit: number }>({ key: null, limit: REGION_PAGE });
  // The one polite live region (SPEC §12.4): AN1 when the map is drawn, AN2 on
  // a filter change, AN3 and AN4 when a reader focuses or clears a region.
  const [announcement, setAnnouncement] = useState('');
  // The location chip's value, written by the map per frame (SPEC §6.9).
  const [locationStore] = useState(createLocationStore);

  /* --- device capability ---------------------------------------------------- */

  useEffect(() => {
    // The hash as the page was loaded (the search seed aside: it is never
    // written back), so a write before the atlas lands keeps it. #p= and #r=
    // are checked against the atlas once it is here.
    initialHashRef.current = window.location.hash;
    hashStateRef.current = withHash({}, parseHash(window.location.hash));
    // #view=list is read now, with the capability, so a wide screen opening
    // on the List view never builds the map first.
    const listView = hashStateRef.current.view === 'list';
    const mq = window.matchMedia(`(min-width: ${GRAPH_MIN_WIDTH}px)`);
    let webgl = false;
    try {
      const canvas = document.createElement('canvas');
      webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      webgl = false;
    }
    const decide = () => setCapability(!mq.matches ? 'list-narrow' : webgl ? 'map' : 'list-nowebgl');
    const frame = window.requestAnimationFrame(() => {
      if (listView) setUserView('list');
      decide();
    });
    mq.addEventListener('change', decide);
    return () => {
      window.cancelAnimationFrame(frame);
      mq.removeEventListener('change', decide);
    };
  }, []);

  /* --- data: nodes and clusters at mount, edges once the map is certain ---- */

  const { atlas, phase, stage, fail, reload, markDrawing, markReady, adjacency, edgePhase, loadEdges } =
    useAtlasData(capability);
  // The map is drawn only on a screen that can draw it, in its Map view; the
  // List view and both list-only layouts show the list (SPEC §7.9).
  const mapView = capability === 'map' && userView === 'map';
  const listOnly = capability === 'list-narrow' || capability === 'list-nowebgl';
  const filter = filterChoice ?? defaultFilterFor(listOnly);

  // Similar papers derive from the selection and the adjacency, whose identity
  // changes exactly when edgesVersion bumps. Never snapshotted at open time,
  // so a deep-linked paper gains them when the edges land.
  const neighbourIds = useMemo(
    () => (selectedId ? topNeighbours(adjacency, selectedId, SIMILAR_COUNT) : NO_IDS),
    [selectedId, adjacency]
  );
  const neighbours = useMemo<SimilarPaper[]>(() => {
    if (!atlas) return [];
    return neighbourIds.flatMap((id) => {
      const node = atlas.byId.get(id);
      // P33: "{year} · {tier}" under each similar paper's title.
      return node
        ? [{ node, title: titleOf(atlas, node), note: paperMeta(node, null), tier: tierOf(node), area: paperArea(atlas, node) }]
        : [];
    });
  }, [atlas, neighbourIds]);
  // The similarity data: arriving, here, failed, or (list-only layouts, SPEC
  // §5.1) not fetched until the reader asks with P32.
  const similarState: SimilarState =
    edgePhase === 'ready' ? 'ready' : edgePhase === 'error' ? 'error' : edgePhase === 'loading' ? 'loading' : 'on-demand';

  /* --- history ---------------------------------------------------------------- */

  const writeHistory = useCallback((next: HashState) => {
    const prev = hashStateRef.current;
    // Back undoes this page's push only when the entry before it is exactly
    // where we are going; otherwise (say, a paper opened from the overview
    // and closed into a region) it replaces, so Back never drops the region.
    const canGoBack = pushedPanelRef.current && sameHash(pushedFromRef.current, next);
    const step = historyStep(prev, next, canGoBack);
    hashStateRef.current = next;
    try {
      if (step === 'back') {
        // Undo our own push; the popstate that follows changes nothing.
        pushedPanelRef.current = false;
        window.history.back();
        return;
      }
      const url = window.location.pathname + window.location.search + serializeHash(next);
      if (step === 'push') {
        window.history.pushState(null, '', url);
        pushedPanelRef.current = true;
        pushedFromRef.current = prev;
      } else {
        window.history.replaceState(null, '', url);
        if (!next.p) pushedPanelRef.current = false;
      }
    } catch {
      /* the hash is a convenience, never a hard requirement */
    }
  }, []);

  /* --- opening and closing a paper ------------------------------------------- */

  const openPaper = useCallback(
    (id: string, from: OpenSource) => {
      if (!atlas?.byId.has(id)) return;
      if (from === 'similar') {
        if (selectedId && selectedId !== id) setTrail((t) => [...t, selectedId]);
      } else if (from !== 'back') {
        setTrail([]);
      }
      // Focus returns to whatever opened the paper, unless focus is already
      // inside the panel: a hop through similar papers keeps the first opener.
      const active = document.activeElement;
      if (!(active instanceof HTMLElement && active.closest('[data-atlas-panel]'))) {
        returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
        // How to find the opening row again once the panel has replaced it.
        originRowRef.current =
          from === 'list'
            ? `[data-atlas-list] [data-atlas-row="${CSS.escape(id)}"]`
            : from === 'start'
              ? `[data-atlas-start="${CSS.escape(id)}"]`
              : from === 'region'
                ? `[data-atlas-region-row="${CSS.escape(id)}"]`
                : null;
      }
      if (!selectedId) {
        savedScrollRef.current = window.scrollY;
        savedRailScrollRef.current = railBodyRef.current?.scrollTop ?? null;
      }
      // The region view comes back without taking focus when this paper
      // closes: focus returns to the paper's opener instead (SPEC §7.4).
      setFocusRegionView(false);
      // A paper opened inside a focused region keeps #r=, so closing it (or
      // Back) returns to the region (SPEC §7.3); the List view keeps #view=.
      const next = withHash(hashStateRef.current, { p: id });
      if (from === 'deeplink' || from === 'history') hashStateRef.current = next;
      else writeHistory(next);
      setSelectedId(id);
      setFocusPanel(from !== 'deeplink' && from !== 'history');
      setQuery('');
      setSearchOpen(false);
      // The camera follows a new selection by itself; the same paper again is re-framed.
      if (id === selectedId) mapApiRef.current?.flyToPaper(id);
    },
    [atlas, selectedId, writeHistory]
  );

  const closePaper = useCallback(() => {
    if (!selectedId) return;
    writeHistory(withHash(hashStateRef.current, { p: null }));
    setSelectedId(null);
    setTrail([]);
  }, [selectedId, writeHistory]);

  const goBack = useCallback(() => {
    const previous = trail[trail.length - 1];
    if (!previous) return;
    setTrail(trail.slice(0, -1));
    openPaper(previous, 'back');
  }, [trail, openPaper]);

  const openFromSearch = useCallback((id: string) => openPaper(id, 'search'), [openPaper]);
  const openFromMap = useCallback((id: string) => openPaper(id, 'map'), [openPaper]);
  const openFromList = useCallback((id: string) => openPaper(id, 'list'), [openPaper]);
  const openFromStart = useCallback((id: string) => openPaper(id, 'start'), [openPaper]);
  const openFromRegion = useCallback((id: string) => openPaper(id, 'region'), [openPaper]);
  const openSimilar = useCallback((id: string) => openPaper(id, 'similar'), [openPaper]);

  /* --- region focus (SPEC §7.3) ------------------------------------------------- */

  const focusRegion = useCallback(
    (key: string, from: FocusSource) => {
      const region = atlas?.displayRegions.get(key);
      if (!region) return;
      const user = from !== 'deeplink';
      if (user) {
        // Focus returns here when the region is cleared, unless it starts inside
        // the rail's own views or on a region label (those are hidden from
        // assistive technology, so never a place to put focus back).
        const active = document.activeElement;
        if (!(active instanceof HTMLElement && active.closest('[data-atlas-panel], [data-atlas-region-view]'))) {
          regionReturnRef.current =
            active instanceof HTMLElement && active !== document.body && !active.closest('[aria-hidden="true"]') ? active : null;
        }
        // Focusing a region leaves any open paper: the rail shows the region.
        if (selectedId) {
          skipPaperFocusRef.current = true;
          returnFocusRef.current = null;
          originRowRef.current = null;
        }
        writeHistory(withHash(hashStateRef.current, { r: key, p: null }));
        setAnnouncement(regionFocusNote(region.label, displayCount(region, filter)));
      }
      setSelectedId(null);
      setTrail([]);
      setRegionKey(key);
      setFocusRegionView(user);
      // The camera follows a new focus by itself; the same region again is re-framed.
      if (key === regionKey && !selectedId) mapApiRef.current?.focusRegion(key);
    },
    [atlas, selectedId, regionKey, filter, writeHistory]
  );

  const clearRegion = useCallback(() => {
    if (!regionKey) return;
    writeHistory(withHash(hashStateRef.current, { r: null }));
    setRegionKey(null);
    setAnnouncement(REGION_CLEARED);
  }, [regionKey, writeHistory]);

  const focusFromMap = useCallback((key: string) => focusRegion(key, 'map'), [focusRegion]);
  const focusFromMenu = useCallback((key: string) => focusRegion(key, 'menu'), [focusRegion]);
  const focusFromPanel = useCallback((key: string) => focusRegion(key, 'panel'), [focusRegion]);
  const focusFromChip = useCallback((key: string) => focusRegion(key, 'chip'), [focusRegion]);

  /* --- the hash: read once on load, then follow Back and Forward ------------- */

  // Invariant 7: #p= opens that paper on load, in map and in list mode; #r=
  // focuses its region on the map and narrows the list in a list; #q= seeds
  // the search and opens its results without moving focus (it is never
  // written back). The hash is read once, when the atlas lands. The work runs
  // in a microtask, not in the effect body (react-hooks/set-state-in-effect).
  // It is never cancelled: the ref already marks the hash as read, and at
  // load the captured callbacks (no selection, no region yet) are the right
  // ones.
  useEffect(() => {
    if (!atlas || deepLinkReadRef.current) return;
    deepLinkReadRef.current = true;
    // A plain anchor followed while the atlas loaded (the skip link) must not
    // swallow the deep link the page was opened with.
    const hash = isAtlasFragment(window.location.hash) ? window.location.hash : initialHashRef.current;
    const { p, r, q } = parseHash(hash);
    const region = r && atlas.displayRegions.has(r) ? r : null;
    const paper = p && atlas.byId.has(p) ? p : null;
    // What the URL says that the atlas does not know is dropped from later writes.
    hashStateRef.current = withHash(hashStateRef.current, { r: region, p: null });
    if (!region && !paper && !q) return;
    queueMicrotask(() => {
      if (q) {
        setQuery(q);
        setSearchOpen(true);
      }
      if (region) focusRegion(region, 'deeplink');
      if (paper) openPaper(paper, 'deeplink');
    });
  }, [atlas, openPaper, focusRegion]);

  // The browser's Back and Forward (and an edited hash) set the selection and
  // the region without writing history, so the phone's back gesture closes a
  // paper and Back returns from a paper to its region.
  const applyHash = useCallback(() => {
    // A plain in-page anchor (the sitewide skip link, "#main-content") is not
    // atlas state: the paper, the region and the view stay as they are. It
    // did add a history entry, so a later close must replace, never go back
    // (back() would land on the paper's own entry and reopen it).
    if (!isAtlasFragment(window.location.hash)) {
      pushedPanelRef.current = false;
      return;
    }
    if (!atlas) return;
    const parsed = parseHash(window.location.hash);
    const p = parsed.p && atlas.byId.has(parsed.p) ? parsed.p : null;
    const r = parsed.r && atlas.displayRegions.has(parsed.r) ? parsed.r : null;
    const view = parsed.view === 'list' ? 'list' : null;
    const next: HashState = withHash({}, { r, p, view });
    // popstate and hashchange both fire for one traversal; the second, and
    // the popstate after our own back(), find nothing to change.
    if (sameHash(next, hashStateRef.current)) return;
    // History moved under us, so a later close must replace, never go back.
    pushedPanelRef.current = false;
    hashStateRef.current = withHash({}, { r, view });
    setRegionKey(r);
    // Back and Forward never move focus into a region view.
    setFocusRegionView(false);
    setUserView(view ? 'list' : 'map');
    if (p) {
      openPaper(p, 'history');
    } else {
      setSelectedId(null);
      setTrail([]);
    }
  }, [atlas, openPaper]);

  useEffect(() => {
    window.addEventListener('popstate', applyHash);
    window.addEventListener('hashchange', applyHash);
    return () => {
      window.removeEventListener('popstate', applyHash);
      window.removeEventListener('hashchange', applyHash);
    };
  }, [applyHash]);

  /* --- the map ------------------------------------------------------------------ */

  // The map's first frame after its first fit: the status card goes (the
  // stage becomes 'ready' only here) and AN1 is announced.
  const onFirstRender = useCallback(() => {
    markReady();
    if (atlas) setAnnouncement(mapReadyNote(atlas.counts.all, atlas.displayRegionsWithPapers));
  }, [atlas, markReady]);

  useAtlasMap({
    atlas,
    enabled: mapView,
    containerRef,
    overlayRef,
    tooltipRef,
    locationStore,
    filter,
    selectedId,
    neighbourIds,
    regionKey: mapView ? regionKey : null,
    apiRef: mapApiRef,
    onOpenPaper: openFromMap,
    onFocusRegion: focusFromMap,
    onError: fail,
    onDrawStart: markDrawing,
    onFirstRender,
  });

  /* --- scroll and focus around an open or a close (any route, Back included) */

  useLayoutEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedId;
    if (prev === selectedId) return;
    const narrow = capability === 'list-narrow';
    if (selectedId) {
      // The panel starts at its top. Instant, whatever html's smooth scroll says.
      if (narrow) window.scrollTo({ top: 0, behavior: 'instant' });
      else if (railBodyRef.current) railBodyRef.current.scrollTop = 0;
      return;
    }
    const y = savedScrollRef.current;
    const railY = savedRailScrollRef.current;
    const target = returnFocusRef.current;
    const row = originRowRef.current;
    savedScrollRef.current = null;
    savedRailScrollRef.current = null;
    returnFocusRef.current = null;
    originRowRef.current = null;
    if (narrow && y !== null) window.scrollTo({ top: y, behavior: 'instant' });
    // The rail shows the view the paper was opened from again, rebuilt: put
    // it back where the reader left it, so the opening row is in view.
    if (!narrow && railY !== null && railBodyRef.current) railBodyRef.current.scrollTop = railY;
    // Closed because a region was focused: the region view takes focus.
    if (skipPaperFocusRef.current) {
      skipPaperFocusRef.current = false;
      return;
    }
    // Next frame: the sitewide Escape handler blurs the active element first.
    const frame = window.requestAnimationFrame(() => {
      if (target?.isConnected) {
        target.focus({ preventScroll: true });
        return;
      }
      // The opener was a row the panel replaced; it is back, rebuilt.
      const rowEl = row ? document.querySelector<HTMLElement>(row) : null;
      if (rowEl) {
        rowEl.focus({ preventScroll: true });
        return;
      }
      // In the phone list the fallback is a row, never the search box:
      // focusing an input there would open the on-screen keyboard.
      if (narrow) document.querySelector<HTMLElement>('[data-atlas-list] [data-atlas-row]')?.focus({ preventScroll: true });
      else searchRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId, capability]);

  // The region view starts at its top, and so does the explore view that
  // replaces it when the region is cleared. Clearing returns focus to where
  // the reader chose the region; to "Go to a region" (scrolled into view, at
  // the end of the explore view) when they chose it there; else to the
  // explore view itself, at its top; else the search.
  useLayoutEffect(() => {
    const prev = prevRegionRef.current;
    prevRegionRef.current = regionKey;
    if (prev === regionKey) return;
    const body = railBodyRef.current;
    if (regionKey) {
      if (body) body.scrollTop = 0;
      return;
    }
    // Only where the rail swaps the region view for the explore view.
    if (body && mapView && !selectedId) body.scrollTop = 0;
    const target = regionReturnRef.current;
    regionReturnRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const active = document.activeElement;
      // Only take focus back when the cleared view had it (or it was dropped).
      if (active && active !== document.body && active.isConnected) return;
      if (target?.isConnected) {
        target.focus({ preventScroll: true });
        return;
      }
      const menu = document.getElementById('atlas-region-select');
      if (menu && target?.id === 'atlas-region-select') {
        menu.focus();
        return;
      }
      const rail = railBodyRef.current;
      (rail && rail.tabIndex === 0 ? rail : searchRef.current)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
    // mapView and selectedId are read only when regionKey changes.
  }, [regionKey, mapView, selectedId]);

  /* --- keyboard: Escape, innermost first (SPEC §7.7), and / ----------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        // The search closes its own results on Escape from its input.
        if (event.target === searchRef.current) return;
        // Results opened by a #q= link, with focus elsewhere, close first.
        if (searchOpen && query.trim().length >= 2) {
          setSearchOpen(false);
          return;
        }
        if (mapApiRef.current?.hideTooltip()) return;
        if (selectedId) closePaper();
        else if (regionKey && mapView) clearRegion();
        return;
      }
      // "/" focuses the search, unless the reader has turned single-key
      // shortcuts off sitewide, a modifier is held, or they are typing.
      const target = event.target instanceof HTMLElement ? event.target : null;
      const shortcut = { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, target };
      if (searchRef.current && shouldFocusSearch(shortcut, shortcutsDisabled())) {
        event.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, regionKey, mapView, searchOpen, query, closePaper, clearRegion]);

  // The map's own keys (SPEC §7.6), only while the map wrapper itself has
  // focus, so single-key shortcuts never fire while the reader types elsewhere.
  const onMapKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const action = mapKeyAction(event.key, event);
    const api = mapApiRef.current;
    if (!action || !api) return;
    event.preventDefault();
    if (action.type === 'pan') api.panBy(action.dx, action.dy);
    else if (action.type === 'zoomIn') api.zoomIn();
    else if (action.type === 'zoomOut') api.zoomOut();
    else api.fitAll();
  }, []);

  /* --- filter, list and zoom ------------------------------------------------------ */

  // Never flips by itself: opening a paper the filter hides draws it anyway.
  // AN2 is the map's announcement; a list's own status line (a polite live
  // region) already says what it now shows.
  const changeFilter = useCallback(
    (next: TierFilter) => {
      setFilterChoice(next);
      setListLimit(LIST_PAGE);
      const option = FILTER_OPTIONS.find((o) => o.value === next);
      if (atlas && option && mapView) setAnnouncement(nowShowingNote(atlas.counts[next], option.label));
    },
    [atlas, mapView]
  );
  const showMore = useCallback(() => setListLimit((n) => n + LIST_PAGE), []);
  // In a list, a region narrows the rows (SPEC §7.3); it is #r= as on the map.
  const changeListRegion = useCallback(
    (key: string | null) => {
      const r = key && atlas?.displayRegions.has(key) ? key : null;
      setRegionKey(r);
      setFocusRegionView(false);
      setListLimit(LIST_PAGE);
      writeHistory(withHash(hashStateRef.current, { r }));
    },
    [atlas, writeHistory]
  );
  const changeSort = useCallback((next: ListSort) => {
    setListSort(next);
    setListLimit(LIST_PAGE);
  }, []);
  // LS6's "Show all papers": every tier, every region.
  const resetList = useCallback(() => {
    changeFilter('all');
    changeListRegion(null);
  }, [changeFilter, changeListRegion]);
  // Map | List (SPEC §7.9): List writes #view=list, Map removes it, both by replace.
  const changeView = useCallback(
    (next: AtlasView) => {
      // Each view has its own toolbar, so a keyboard switch would drop focus:
      // it moves to the same switch in the new toolbar (the layout effect below).
      const active = document.activeElement;
      viewFocusRef.current = active instanceof HTMLInputElement && active.name === 'atlas-view';
      setUserView(next);
      setFocusRegionView(false);
      writeHistory(withHash(hashStateRef.current, { view: next === 'list' ? 'list' : null }));
    },
    [writeHistory]
  );
  useLayoutEffect(() => {
    if (!viewFocusRef.current) return;
    viewFocusRef.current = false;
    document.querySelector<HTMLInputElement>(`input[name="atlas-view"][value="${userView}"]`)?.focus();
  }, [userView]);
  const zoomIn = useCallback(() => mapApiRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapApiRef.current?.zoomOut(), []);
  const fitAll = useCallback(() => mapApiRef.current?.fitAll(), []);

  const startWith = useMemo<StartPaper[] | null>(
    () =>
      atlas
        ? startWithPapers(atlas.nodes).map((node) => ({ node, title: titleOf(atlas, node), area: paperArea(atlas, node) }))
        : null,
    [atlas]
  );

  // AN5, when the similarity data fails while a paper is open (SPEC §12.4).
  const selectedIdRef = useRef<string | null>(null);
  const prevEdgePhaseRef = useRef(edgePhase);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    const prev = prevEdgePhaseRef.current;
    prevEdgePhaseRef.current = edgePhase;
    if (edgePhase !== 'error' || prev === 'error' || !selectedIdRef.current) return;
    queueMicrotask(() => setAnnouncement(SIMILAR_UNAVAILABLE));
  }, [edgePhase]);

  const describeRegion = useCallback(
    (key: string): ChipRegion | null => {
      const region = atlas?.displayRegions.get(key);
      return region ? { key: region.key, label: region.label, area: region.area } : null;
    },
    [atlas]
  );

  /* --- render ------------------------------------------------------------------- */

  const narrow = capability === 'list-narrow';
  const mapReady = stage === 'ready';
  const selected = selectedId && atlas ? (atlas.byId.get(selectedId) ?? null) : null;
  const selectedTitle = selected ? titleOf(atlas, selected) : '';
  // The focused region shows only on the map; in a list it waits for package 6's filter.
  const focused = mapView && regionKey && atlas ? (atlas.displayRegions.get(regionKey) ?? null) : null;
  const railView: RailView = selected ? 'paper' : focused ? 'region' : 'explore';
  const cluster = selected ? atlas?.regions.get(selected.c) : undefined;
  const selectedRegion = selected && atlas ? displayRegionOf(atlas, selected) : undefined;
  const panelRegion: PanelRegion | null = selectedRegion
    ? {
        key: selectedRegion.key,
        label: selectedRegion.label,
        area: selectedRegion.area,
        papers: selectedRegion.counts.all,
        reviewed: selectedRegion.counts.review,
      }
    : null;
  const backId = trail.length > 0 ? trail[trail.length - 1] : null;
  const backNode = backId && atlas ? atlas.byId.get(backId) : undefined;
  const backTitle = backNode ? titleOf(atlas, backNode) : undefined;
  // Below 860px an open paper replaces the search and the list (SPEC §3.5).
  const listReplaced = narrow && selected !== null;

  // The one list, in whichever place this layout puts it. Beside the map's
  // toolbar (the List view) the Show filter stays in the toolbar.
  const list = (
    <PaperList
      atlas={atlas}
      phase={phase}
      filter={filter}
      regionKey={regionKey}
      sort={listSort}
      limit={listLimit}
      showFilter={capability !== 'map'}
      onShowMore={showMore}
      onOpen={openFromList}
      onFilterChange={changeFilter}
      onRegionChange={changeListRegion}
      onSortChange={changeSort}
      onReset={resetList}
      onRetry={reload}
    />
  );

  return (
    <div
      data-atlas-measure="frame"
      className="flex flex-col bg-(--color-bg) min-[860px]:h-[calc(100dvh-var(--header-height))] min-[860px]:min-h-[560px] min-[860px]:flex-row min-[860px]:overflow-hidden min-[860px]:border-b min-[860px]:border-(--color-border)"
    >
      <AtlasRail
        masthead={masthead}
        intro={intro}
        about={about}
        view={railView}
        narrow={narrow}
        bodyRef={railBodyRef}
        search={
          listReplaced ? null : (
            <SearchBox
              atlas={atlas}
              query={query}
              onQueryChange={setQuery}
              open={searchOpen}
              onOpenChange={setSearchOpen}
              onOpen={openFromSearch}
              inputRef={searchRef}
            />
          )
        }
        startWith={startWith}
        startFailed={!atlas && phase === 'error'}
        onOpenStart={openFromStart}
        regionSelect={mapView ? <RegionSelect atlas={atlas} filter={filter} onSelect={focusFromMenu} /> : null}
        regionView={
          focused && atlas ? (
            <div data-atlas-region-view="">
              <RegionView
                key={focused.key}
                atlas={atlas}
                region={focused}
                filter={filter}
                onOpenPaper={openFromRegion}
                onClose={clearRegion}
                autoFocus={focusRegionView}
                limit={regionPage.key === focused.key ? regionPage.limit : REGION_PAGE}
                onLimitChange={(limit) => setRegionPage({ key: focused.key, limit })}
              />
            </div>
          ) : null
        }
        panel={
          selected ? (
            <PaperPanel
              key={selected.id}
              node={selected}
              title={selectedTitle}
              region={panelRegion}
              onFocusRegion={mapView ? focusFromPanel : undefined}
              regionNote={cluster && cluster.id >= 0 ? cluster.note : null}
              similar={neighbours}
              similarState={similarState}
              onLoadSimilar={loadEdges}
              onOpenNode={openSimilar}
              onClose={closePaper}
              onBack={backId ? goBack : undefined}
              backTitle={backTitle}
              onBackToRegion={!backId && focused ? closePaper : undefined}
              backRegionLabel={focused?.label}
              narrow={narrow}
              autoFocus={focusPanel}
            />
          ) : null
        }
      />

      {!listReplaced && (
        <section
          aria-label={mapView ? 'Map' : undefined}
          data-atlas-measure="plate"
          className="relative min-w-0 flex-1 min-[860px]:min-h-0 min-[860px]:bg-(--color-bg-secondary)"
        >
          {capability === 'pending' && (
            <>
              {/* Before the first frame decides map or list: the map's own
                  loading card on a wide screen (the same card, so nothing
                  flashes when the map takes over), a line on a phone. */}
              <div className="max-[860px]:hidden">
                <MapStatus stage={stage} count={atlas ? atlas.counts.all : null} onRetry={reload} />
              </div>
              <p className="mb-0 px-4 py-6 text-sm text-(--color-text-secondary) min-[640px]:px-6 min-[860px]:hidden">
                {LOADING_PAPERS}
              </p>
            </>
          )}

          {mapView && (
            <>
              {/* DOM order is the Tab order (SPEC §12.1): Show and View, the
                  region chip, the map, then zoom and the key; z-index, not
                  order, stacks them. The controls render at once but stay
                  inert until the first frame is drawn (SPEC §6.13), except
                  the view switch: the List view never waits for the map. */}
              <MapToolbar
                placement="plate"
                filter={filter}
                counts={atlas ? atlas.counts : null}
                onFilterChange={changeFilter}
                view="map"
                onViewChange={changeView}
                filterInert={!mapReady}
              />
              <div className="contents" inert={!mapReady}>
                <MapChips
                  focused={
                    focused && !selected
                      ? { key: focused.key, label: focused.label, area: focused.area, papers: displayCount(focused, filter) }
                      : null
                  }
                  location={locationStore}
                  describe={describeRegion}
                  onClear={clearRegion}
                  onFocusRegion={focusFromChip}
                />
              </div>
              <div
                role="group"
                aria-roledescription="map"
                aria-label={MAP_LABEL}
                aria-describedby="atlas-map-desc"
                tabIndex={mapReady ? 0 : undefined}
                onKeyDown={onMapKeyDown}
                data-atlas-measure="map"
                className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                <div ref={containerRef} aria-hidden="true" className="absolute inset-0" />
                {/* Region labels: drawn by the map, hidden from assistive
                    technology and out of the Tab order (the region menu is
                    their accessible twin, SPEC §6.7). */}
                <div ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />
              </div>
              <p id="atlas-map-desc" className="sr-only mb-0">
                {atlas ? mapDescription(atlas.counts.all, atlas.displayRegionsWithPapers) : ''}
              </p>
              {/* The single hover surface (SPEC §6.10), filled with text only. */}
              <div
                ref={tooltipRef}
                aria-hidden="true"
                data-atlas-measure="tooltip"
                className="pointer-events-none absolute top-0 left-0 z-30 max-w-[300px] rounded-md border border-(--color-border) bg-(--color-bg) px-2.5 py-1.5 opacity-0 shadow-md motion-safe:transition-opacity dark:shadow-none"
              >
                <div data-atlas-tooltip="title" className="line-clamp-3 text-[13px] leading-snug font-medium text-(--color-text)" />
                <div data-atlas-tooltip="meta" className="mt-0.5 text-xs text-(--color-text-muted)" />
              </div>
              <div className="contents" inert={!mapReady}>
                <ZoomCluster onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitAll} />
                <MapKey />
              </div>
              <MapStatus stage={stage} count={atlas ? atlas.counts.all : null} onRetry={reload} />
            </>
          )}

          {capability === 'map' && userView === 'list' && (
            // The List view (SPEC §3.4, §7.9): the canvas's accessible
            // alternative. The toolbar stays put above the scrolling list,
            // and no map is built while it shows.
            <div data-atlas-measure="list-view" className="absolute inset-0 flex flex-col bg-(--color-bg)">
              <MapToolbar
                placement="bar"
                filter={filter}
                counts={atlas ? atlas.counts : null}
                onFilterChange={changeFilter}
                view="list"
                onViewChange={changeView}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[760px] px-6 pt-6 pb-10">{list}</div>
              </div>
            </div>
          )}

          {capability === 'list-nowebgl' && (
            <div className="absolute inset-0 overflow-y-auto bg-(--color-bg)">
              <div className="mx-auto max-w-[760px] px-6 py-6">
                <p
                  data-atlas-measure="nowebgl"
                  className="mb-4 rounded-md border border-(--color-border) bg-(--color-bg-secondary) px-3 py-2 text-[13px] leading-relaxed text-(--color-text-secondary)"
                >
                  {NO_WEBGL_NOTE}
                </p>
                {list}
              </div>
            </div>
          )}

          {capability === 'list-narrow' && <div className="px-4 pt-5 pb-28 min-[640px]:px-6">{list}</div>}
        </section>
      )}

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only mb-0">
        {announcement}
      </p>
    </div>
  );
}
