import { useCallback, useRef } from "react";

/**
 * Wraps an async action so that:
 *  - rapid double-clicks are coalesced (only the first call goes through
 *    until either it resolves or `cooldownMs` elapses)
 *  - concurrent invocations never overlap
 *
 * Use this on every "destructive" or "submit-once" UI action:
 * launching the game, voting, sending a guess, joining, leaving, kicking…
 *
 * @example
 * const launch = useDebouncedAction(launchGame, 1000);
 * <Button onClick={launch} />
 */
export function useDebouncedAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult> | TResult,
  cooldownMs = 800
) {
  const lockedRef = useRef(false);
  const lastFireRef = useRef(0);

  return useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      const now = Date.now();
      if (lockedRef.current) return undefined;
      if (now - lastFireRef.current < cooldownMs) return undefined;
      lockedRef.current = true;
      lastFireRef.current = now;
      try {
        return await action(...args);
      } finally {
        lockedRef.current = false;
      }
    },
    [action, cooldownMs]
  );
}