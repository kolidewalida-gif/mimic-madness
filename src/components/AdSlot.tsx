/**
 * Emplacement Google AdSense différé et observable.
 *
 * Les événements `loaded` et `viewable` sont des signaux produit issus du DOM,
 * pas des impressions facturables. Les clics, le CTR et les revenus restent
 * exclusivement mesurés dans les rapports AdSense.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAdImpressionId,
  recordAdEvent,
  type AdErrorCode,
  type AdEventType,
  type AdGameMode,
  type AdPlacement,
  type AdScreen,
} from '@/lib/adAnalytics';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SCRIPT_LOAD_TIMEOUT_MS = 8_000;
const AD_LOAD_TIMEOUT_MS = 20_000;
const VIEWABLE_DURATION_MS = 1_000;

interface AdSenseQueue {
  push: (configuration: Record<string, never>) => unknown;
}

type AdSenseWindow = Window & { adsbygoogle?: AdSenseQueue };

let scriptPromise: Promise<void> | null = null;

const getAdSenseQueue = (): AdSenseQueue | undefined =>
  (window as AdSenseWindow).adsbygoogle;

function loadAdSense(client: string): Promise<void> {
  if (getAdSenseQueue()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    );
    const script = existing ?? document.createElement('script');
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      callback();
    };
    const handleLoad = () => finish(resolve);
    const handleError = () => finish(() => reject(new Error('adsense script failed')));
    const timeoutId = window.setTimeout(handleError, SCRIPT_LOAD_TIMEOUT_MS);

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export interface AdSlotProps {
  /** Identifiant du bloc créé dans AdSense. */
  slot?: string;
  /** Format : rail vertical ou bannière horizontale. */
  format?: 'vertical' | 'horizontal' | 'auto';
  className?: string;
  label?: string;
  /** Délai avant création du `<ins>` et appel à `adsbygoogle.push`. */
  loadAfterMs?: number;
  screen: AdScreen;
  placement: AdPlacement;
  gameMode?: AdGameMode;
  /** Identifie l'occurrence métier sans être envoyé à Supabase. */
  instanceKey: string;
}

interface AdSlotLifecycleProps extends AdSlotProps {
  format: NonNullable<AdSlotProps['format']>;
  className: string;
  label: string;
  loadAfterMs: number;
}

function AdSlotLifecycle({
  slot,
  format,
  className,
  label,
  loadAfterMs,
  screen,
  placement,
  gameMode,
}: AdSlotLifecycleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const adRef = useRef<HTMLModElement>(null);
  const impressionIdRef = useRef(createAdImpressionId());
  const emittedEventsRef = useRef(new Set<AdEventType>());
  const requestedRef = useRef(false);
  const failedBeforeRequestRef = useRef(false);
  const loadedRef = useRef(false);
  const unfilledRef = useRef(false);
  const viewableRef = useRef(false);
  const scheduleGenerationRef = useRef(0);
  const [shouldRequest, setShouldRequest] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unfilled, setUnfilled] = useState(false);
  const [failed, setFailed] = useState(false);
  const configured = Boolean(ADSENSE_CLIENT && slot);

  const emit = useCallback((eventType: Exclude<AdEventType, 'error'>, errorCode?: never) => {
    if (emittedEventsRef.current.has(eventType)) return;
    emittedEventsRef.current.add(eventType);
    recordAdEvent({
      impressionId: impressionIdRef.current,
      eventType,
      screen,
      placement,
      ...(gameMode ? { gameMode } : {}),
    });
  }, [gameMode, placement, screen]);

  const emitError = useCallback((errorCode: AdErrorCode) => {
    if (emittedEventsRef.current.has('error')) return;
    emittedEventsRef.current.add('error');
    recordAdEvent({
      impressionId: impressionIdRef.current,
      eventType: 'error',
      errorCode,
      screen,
      placement,
      ...(gameMode ? { gameMode } : {}),
    });
  }, [gameMode, placement, screen]);

  useEffect(() => {
    if (!configured) return;

    const generation = ++scheduleGenerationRef.current;
    emit('scheduled');
    const timerId = window.setTimeout(
      () => setShouldRequest(true),
      Math.max(0, loadAfterMs),
    );

    return () => {
      window.clearTimeout(timerId);
      const reportCancellation = () => {
        // React StrictMode rejoue immédiatement les effets en développement :
        // une nouvelle génération invalide alors ce faux démontage.
        if (scheduleGenerationRef.current !== generation) return;
        if (!requestedRef.current && !failedBeforeRequestRef.current) emit('cancelled');
      };
      if (typeof queueMicrotask === 'function') queueMicrotask(reportCancellation);
      else void Promise.resolve().then(reportCancellation);
    };
  }, [configured, emit, loadAfterMs]);

  useEffect(() => {
    if (!configured || !shouldRequest || !adRef.current) return;

    const adElement = adRef.current;
    let active = true;
    let loadTimeoutId: number | null = null;

    const clearLoadTimeout = () => {
      if (loadTimeoutId !== null) {
        window.clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
      }
    };

    const inspectAd = () => {
      if (!active) return;
      const status = adElement.dataset.adStatus;
      if (status === 'unfilled' && !unfilledRef.current) {
        unfilledRef.current = true;
        setUnfilled(true);
        clearLoadTimeout();
        emitError('unfilled');
        return;
      }

      if ((status === 'filled' || adElement.querySelector('iframe')) && !loadedRef.current) {
        loadedRef.current = true;
        setLoaded(true);
        clearLoadTimeout();
        emit('loaded');
      }
    };

    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(inspectAd);
    mutationObserver?.observe(adElement, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
      childList: true,
      subtree: true,
    });
    inspectAd();

    const requestAd = async () => {
      try {
        await loadAdSense(ADSENSE_CLIENT!);
      } catch {
        if (!active) return;
        failedBeforeRequestRef.current = true;
        setFailed(true);
        emitError('script_load_failed');
        return;
      }
      if (!active) return;

      try {
        const adsenseWindow = window as AdSenseWindow;
        adsenseWindow.adsbygoogle = adsenseWindow.adsbygoogle ?? [] as unknown as AdSenseQueue;
        adsenseWindow.adsbygoogle.push({});
        requestedRef.current = true;
        emit('requested');
        inspectAd();
        if (!loadedRef.current && !unfilledRef.current) {
          loadTimeoutId = window.setTimeout(() => {
            setFailed(true);
            emitError('load_timeout');
          }, AD_LOAD_TIMEOUT_MS);
        }
      } catch {
        failedBeforeRequestRef.current = true;
        setFailed(true);
        emitError('push_failed');
      }
    };

    void requestAd();

    return () => {
      active = false;
      clearLoadTimeout();
      mutationObserver?.disconnect();
    };
  }, [configured, emit, emitError, shouldRequest]);

  useEffect(() => {
    const root = rootRef.current;
    if (!loaded || !root || typeof IntersectionObserver === 'undefined') return;

    let atLeastHalfVisible = false;
    let viewableTimerId: number | null = null;

    const stopViewableTimer = () => {
      if (viewableTimerId !== null) {
        window.clearTimeout(viewableTimerId);
        viewableTimerId = null;
      }
    };

    const syncViewability = () => {
      const canCount = atLeastHalfVisible && document.visibilityState === 'visible';
      if (!canCount || viewableRef.current) {
        stopViewableTimer();
        return;
      }
      if (viewableTimerId !== null) return;
      viewableTimerId = window.setTimeout(() => {
        viewableTimerId = null;
        if (!atLeastHalfVisible || document.visibilityState !== 'visible' || viewableRef.current) return;
        viewableRef.current = true;
        emit('viewable');
      }, VIEWABLE_DURATION_MS);
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        atLeastHalfVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
        syncViewability();
      },
      { threshold: [0, 0.5, 1] },
    );
    const handleVisibilityChange = () => syncViewability();

    intersectionObserver.observe(root);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopViewableTimer();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [emit, loaded]);

  if (!configured) {
    if (!import.meta.env.DEV) return null;
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-white/25 ${className}`}
        aria-hidden="true"
      >
        {label}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={className}
      role="complementary"
      aria-label={label}
      aria-busy={!loaded && !unfilled && !failed}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
        {!loaded && !unfilled && !failed && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/25">
            {shouldRequest ? 'Chargement de la publicité…' : label}
          </span>
        )}
        {shouldRequest && (
          <ins
            ref={adRef}
            className={`adsbygoogle transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
}

export function AdSlot({
  format = 'auto',
  className = '',
  label = 'Publicité',
  loadAfterMs = 0,
  ...props
}: AdSlotProps) {
  const lifecycleKey = [
    props.screen,
    props.placement,
    props.gameMode ?? '',
    props.instanceKey,
    props.slot ?? '',
  ].join(':');

  return (
    <AdSlotLifecycle
      key={lifecycleKey}
      {...props}
      format={format}
      className={className}
      label={label}
      loadAfterMs={loadAfterMs}
    />
  );
}

export default AdSlot;
