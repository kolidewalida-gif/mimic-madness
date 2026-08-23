import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { diagnose } from '@/lib/diagnostics';

export type AdEventType =
  | 'scheduled'
  | 'requested'
  | 'loaded'
  | 'viewable'
  | 'cancelled'
  | 'error';

export type AdScreen = 'home' | 'round_break' | 'results_podium';

export type AdPlacement =
  | 'home_rail_left'
  | 'home_rail_right'
  | 'round_break_banner'
  | 'results_podium_banner';

export type AdGameMode =
  | 'normal'
  | '2v2'
  | 'quiz'
  | 'audiophone'
  | 'pixoguess'
  | 'monopoly'
  | 'undercover'
  | 'memorise'
  | 'mimic';

export type AdErrorCode =
  | 'script_load_failed'
  | 'push_failed'
  | 'unfilled'
  | 'load_timeout';

type RecordAdEventArgs = Database['public']['Functions']['record_ad_event']['Args'];

type AdEventInput = {
  impressionId: string;
  screen: AdScreen;
  placement: AdPlacement;
  gameMode?: AdGameMode;
} & (
  | { eventType: Exclude<AdEventType, 'error'>; errorCode?: never }
  | { eventType: 'error'; errorCode: AdErrorCode }
);

const SESSION_STORAGE_KEY = 'mimic_ad_analytics_session_v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memorySessionId: string | null = null;

const createUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

const getAnalyticsSessionId = (): string => {
  if (memorySessionId) return memorySessionId;

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored && UUID_PATTERN.test(stored)) {
      memorySessionId = stored;
      return stored;
    }

    memorySessionId = createUuid();
    sessionStorage.setItem(SESSION_STORAGE_KEY, memorySessionId);
    return memorySessionId;
  } catch {
    memorySessionId = createUuid();
    return memorySessionId;
  }
};

export const createAdImpressionId = (): string => createUuid();

/**
 * Journalise localement puis persiste un événement publicitaire minimal.
 * L'appel reste volontairement non bloquant : une panne analytics ne doit
 * jamais modifier un bouton, un timer ou une transition de jeu.
 */
export const recordAdEvent = (event: AdEventInput): void => {
  const logData: Record<string, unknown> = {
    eventType: event.eventType,
    screen: event.screen,
    placement: event.placement,
  };
  if (event.gameMode) logData.gameMode = event.gameMode;
  if (event.eventType === 'error') logData.errorCode = event.errorCode;

  if (event.eventType === 'error') {
    diagnose.warn('ads', 'Événement publicitaire en erreur', logData);
  } else {
    diagnose.info('ads', 'Événement publicitaire', logData);
  }

  const args: RecordAdEventArgs = {
    p_analytics_session_id: getAnalyticsSessionId(),
    p_impression_id: event.impressionId,
    p_event_type: event.eventType,
    p_screen: event.screen,
    p_placement: event.placement,
    ...(event.gameMode ? { p_game_mode: event.gameMode } : {}),
    ...(event.eventType === 'error' ? { p_error_code: event.errorCode } : {}),
  };

  void Promise.resolve(supabase.rpc('record_ad_event', args))
    .then(({ data, error }) => {
      if (error) {
        diagnose.warn('ads', 'Collecte Supabase indisponible', {
          eventType: event.eventType,
          screen: event.screen,
          placement: event.placement,
          rpcCode: error.code,
        });
        return;
      }
      if (data !== true) {
        diagnose.warn('ads', 'Événement publicitaire refusé par la collecte', {
          eventType: event.eventType,
          screen: event.screen,
          placement: event.placement,
        });
      }
    })
    .catch(() => {
      diagnose.warn('ads', 'Collecte Supabase interrompue', {
        eventType: event.eventType,
        screen: event.screen,
        placement: event.placement,
      });
    });
};
