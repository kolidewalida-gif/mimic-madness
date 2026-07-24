import type { LobbyGameMode } from '@/lib/gameModes';

export const loadGamePlayScreen = () =>
  import('@/components/GamePlayScreen').then((module) => ({ default: module.GamePlayScreen }));
export const loadQuizGameScreen = () =>
  import('@/components/QuizGameScreen').then((module) => ({ default: module.QuizGameScreen }));
export const loadAudioPhoneGameScreen = () =>
  import('@/components/AudioPhoneGameScreen').then((module) => ({ default: module.AudioPhoneGameScreen }));
export const loadPixoguessGameScreen = () =>
  import('@/components/PixoguessGameScreen').then((module) => ({ default: module.PixoguessGameScreen }));
export const loadMonopolyGameScreen = () =>
  import('@/components/monopoly/MonopolyGameScreen').then((module) => ({ default: module.MonopolyGameScreen }));
export const loadUndercoverGameScreen = () =>
  import('@/components/undercover/UndercoverGameScreen').then((module) => ({ default: module.UndercoverGameScreen }));
export const loadMemoriseGameScreen = () =>
  import('@/components/memorise/MemoriseGameScreen').then((module) => ({ default: module.MemoriseGameScreen }));
export const loadMimicGameScreen = () =>
  import('@/components/mimic/MimicGameScreen').then((module) => ({ default: module.MimicGameScreen }));

const loaders: Record<LobbyGameMode, () => Promise<unknown>> = {
  normal: loadGamePlayScreen,
  '2v2': loadGamePlayScreen,
  quiz: loadQuizGameScreen,
  audiophone: loadAudioPhoneGameScreen,
  pixoguess: loadPixoguessGameScreen,
  monopoly: loadMonopolyGameScreen,
  undercover: loadUndercoverGameScreen,
  memorise: loadMemoriseGameScreen,
  mimic: loadMimicGameScreen,
};

const pending = new Map<LobbyGameMode, Promise<unknown>>();

export const preloadGameMode = (mode: LobbyGameMode): Promise<unknown> => {
  const cached = pending.get(mode);
  if (cached) return cached;
  const request = loaders[mode]().catch((error) => {
    pending.delete(mode);
    throw error;
  });
  pending.set(mode, request);
  return request;
};
