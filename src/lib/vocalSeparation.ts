import { supabase } from '@/integrations/supabase/client';
import type { VideoClip } from './videoStorageSupabase';

/**
 * Client-side orchestration for vocal separation using Replicate Demucs.
 * Pattern copied from rhythmo/assemblyai.ts (submit → poll → download).
 */

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max

export type SeparationStatus = 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export interface SeparationProgress {
  status: SeparationStatus;
  error?: string;
}

export interface SeparationResult {
  instrumentalUrl: string;
}

/**
 * Récupère l'URL publique d'un fichier dans le bucket 'video-challenges'.
 */
function getPublicUrl(storagePath: string): string {
  return supabase.storage.from('video-challenges').getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Démarre la séparation vocale pour un clip donné.
 * Retourne un ID de job Replicate à poller avec `pollSeparationStatus`.
 */
export async function startVocalSeparation(clip: VideoClip): Promise<string> {
  const audioUrl = getPublicUrl(clip.storagePath);
  
  const { data, error } = await supabase.functions.invoke('separate-vocals', {
    body: { audioUrl },
  });

  if (error) {
    console.error('[vocalSeparation] Erreur soumission', error);
    throw new Error(`Échec de soumission : ${error.message}`);
  }

  if (!data?.id) {
    console.error('[vocalSeparation] Pas d\'ID retourné', data);
    throw new Error('Réponse serveur invalide');
  }

  console.info('[vocalSeparation] Job démarré', data.id);
  return data.id;
}

/**
 * Poll le statut d'un job de séparation vocale jusqu'à un état terminal.
 * Appelle `onProgress` à chaque étape pour mettre à jour l'UI.
 * 
 * @returns L'URL de la piste instrumentale (MP3) hébergée par Replicate.
 * @throws Si le job échoue ou timeout.
 */
export async function pollSeparationStatus(
  jobId: string,
  onProgress?: (progress: SeparationProgress) => void,
  signal?: AbortSignal,
): Promise<SeparationResult> {
  const startTime = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new Error('Annulé');
    }

    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error('Timeout : la séparation vocale a pris trop de temps');
    }

    const { data, error } = await supabase.functions.invoke('separate-vocals-status', {
      body: { id: jobId },
    });

    if (error) {
      console.error('[vocalSeparation] Erreur poll', error);
      throw new Error(`Échec de récupération du statut : ${error.message}`);
    }

    const { status, instrumentalUrl, error: jobError } = data;

    if (onProgress) {
      onProgress({ status, error: jobError });
    }

    // États terminaux
    if (status === 'failed' || status === 'canceled') {
      throw new Error(jobError || `Job ${status}`);
    }

    if (status === 'succeeded') {
      if (!instrumentalUrl) {
        throw new Error('Piste instrumentale manquante dans la réponse');
      }
      console.info('[vocalSeparation] Terminé', jobId, instrumentalUrl);
      return { instrumentalUrl };
    }

    // En cours : attendre avant le prochain poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Télécharge la piste instrumentale depuis l'URL Replicate et l'upload dans le Storage Supabase.
 * Sauvegarde au même emplacement que le clip, avec suffixe `.instrumental.mp3`.
 * 
 * @returns Le chemin de stockage du fichier uploadé.
 */
export async function downloadAndStoreInstrumental(
  clip: VideoClip,
  instrumentalUrl: string,
): Promise<string> {
  console.info('[vocalSeparation] Téléchargement', instrumentalUrl);
  
  const response = await fetch(instrumentalUrl);
  if (!response.ok) {
    throw new Error(`Échec de téléchargement : HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const instrumentalPath = instrumentalPathFor(clip.storagePath);

  console.info('[vocalSeparation] Upload vers Storage', instrumentalPath);
  
  const { error: uploadError } = await supabase.storage
    .from('video-challenges')
    .upload(instrumentalPath, blob, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[vocalSeparation] Erreur upload', uploadError);
    throw new Error(`Échec d'upload : ${uploadError.message}`);
  }

  console.info('[vocalSeparation] Stocké', instrumentalPath);
  return instrumentalPath;
}

/**
 * Chemin de stockage déterministe pour la piste instrumentale d'un clip.
 * Pattern identique à `cuesPathFor` (rhythmo/store.ts).
 */
export function instrumentalPathFor(storagePath: string): string {
  return `${storagePath.replace(/\.[^./]+$/, '')}.instrumental.mp3`;
}

/**
 * Vérifie si une piste instrumentale existe déjà pour un clip donné.
 * Tente un HEAD request sur l'URL publique (léger, pas de téléchargement).
 */
export async function hasInstrumental(clip: VideoClip): Promise<boolean> {
  const path = instrumentalPathFor(clip.storagePath);
  const url = getPublicUrl(path);

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Récupère l'URL publique de la piste instrumentale d'un clip.
 * Ne vérifie PAS l'existence — appeler `hasInstrumental` d'abord si besoin.
 */
export function getInstrumentalUrl(clip: VideoClip): string {
  const path = instrumentalPathFor(clip.storagePath);
  return getPublicUrl(path);
}

/**
 * Orchestration complète : démarre, poll et stocke la piste instrumentale.
 * 
 * @param clip Le clip vidéo source
 * @param onProgress Callback de progression optionnel
 * @param signal Signal d'annulation optionnel
 * @returns Le chemin de stockage du fichier généré
 */
export async function separateVocalsAndStore(
  clip: VideoClip,
  onProgress?: (progress: SeparationProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const jobId = await startVocalSeparation(clip);
  const { instrumentalUrl } = await pollSeparationStatus(jobId, onProgress, signal);
  const storagePath = await downloadAndStoreInstrumental(clip, instrumentalUrl);
  return storagePath;
}
