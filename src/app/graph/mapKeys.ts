// Keyboard control of the focused map (SPEC §7.6) and the "/" search shortcut
// (SPEC §7.1) for /graph. Pure: no JSX, no DOM, and no React, sigma,
// graphology, next/* or @/ imports, so tests/graph-camera.test.mjs and
// tests/graph-reading.test.mjs load it under plain Node. Keep the syntax
// erasable.
//
// The map keys act only while the map wrapper itself has focus (its keydown
// handler is the only caller), so single-key shortcuts never fire while the
// reader types elsewhere (WCAG 2.1.4). "/" works anywhere on the page except
// in a field, and never once the reader has turned shortcuts off.

/** What a key press asks of the camera. A pan is a share of the viewport: right and down are positive. */
export type MapKeyAction =
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'fit' };

/** The modifier state of a key event (a KeyboardEvent fits). */
export interface KeyMods {
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

/** An arrow key pans 15% of the viewport. */
export const PAN_STEP = 0.15;

/**
 * The camera action for a key (`KeyboardEvent.key`), or null when the key is
 * not a map key. Anything pressed with Ctrl, Meta or Alt is left to the
 * browser and the system. Shift is allowed: "+" needs it on most layouts.
 */
export function mapKeyAction(key: string, mods: KeyMods = {}): MapKeyAction | null {
  if (mods.ctrlKey || mods.metaKey || mods.altKey) return null;
  switch (key) {
    case 'ArrowLeft':
      return { type: 'pan', dx: -PAN_STEP, dy: 0 };
    case 'ArrowRight':
      return { type: 'pan', dx: PAN_STEP, dy: 0 };
    case 'ArrowUp':
      return { type: 'pan', dx: 0, dy: -PAN_STEP };
    case 'ArrowDown':
      return { type: 'pan', dx: 0, dy: PAN_STEP };
    case '+':
    case '=':
      return { type: 'zoomIn' };
    case '-':
      return { type: 'zoomOut' };
    case '0':
      return { type: 'fit' };
    default:
      return null;
  }
}

/* --- the "/" shortcut (SPEC §7.1, §12.14) ------------------------------------------ */

/** The parts of a keydown event the "/" shortcut looks at (a KeyboardEvent fits). */
export interface ShortcutEvent extends KeyMods {
  key: string;
  /** where the key was pressed: an element's tag name and whether it is editable */
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

const TYPING_TARGETS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Whether "/" should move focus to the search. Never when the reader has
 * turned single-key shortcuts off (the sitewide 'shortcuts-disabled'
 * setting, WCAG 2.1.4), when Ctrl, Meta or Alt is held, or when the key was
 * pressed in a field, a select or editable content, where "/" is typing.
 */
export function shouldFocusSearch(event: ShortcutEvent, disabled: boolean): boolean {
  if (disabled || event.key !== '/') return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  if (target) {
    if (TYPING_TARGETS.has(String(target.tagName ?? '').toUpperCase())) return false;
    if (target.isContentEditable) return false;
  }
  return true;
}
