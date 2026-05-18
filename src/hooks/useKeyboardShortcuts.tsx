import { useEffect, useRef } from 'react';

export interface ShortcutSpec {
  /** Key to listen for, e.g. 'Escape', 'm', 's', '?', 'Enter' */
  key: string;
  /** Optional modifiers (defaults to none) */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Callback when triggered */
  handler: (event: KeyboardEvent) => void;
  /** When false, the shortcut is ignored. Default: true */
  enabled?: boolean;
  /** Allow firing even when typing in an input/textarea (default: false) */
  allowInInputs?: boolean;
  /** Stop propagation + preventDefault (default: true) */
  preventDefault?: boolean;
  /** Human-readable label for help modal */
  label?: string;
}

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
};

const matchesKey = (event: KeyboardEvent, spec: ShortcutSpec) => {
  // Normalize: 'Escape' -> 'escape', single chars match case-insensitively
  const target = spec.key.toLowerCase();
  const got = event.key.toLowerCase();
  if (target !== got) return false;
  if (!!spec.ctrl !== (event.ctrlKey || event.metaKey)) return false;
  if (!!spec.shift !== event.shiftKey) return false;
  if (!!spec.alt !== event.altKey) return false;
  return true;
};

/**
 * Subscribe to a list of keyboard shortcuts.
 * Shortcuts are skipped automatically when the user is typing in an input
 * (unless `allowInInputs` is true on the shortcut).
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutSpec[]) => {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const list = ref.current;
      for (const spec of list) {
        if (spec.enabled === false) continue;
        if (!matchesKey(event, spec)) continue;
        if (!spec.allowInInputs && isInteractiveTarget(event.target)) continue;
        if (spec.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        spec.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
