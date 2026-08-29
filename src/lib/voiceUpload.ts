/**
 * Préparation d'un enregistrement de voix avant envoi au seau `audio-phone`.
 *
 * Le seau accepte désormais une liste de types et un plafond de 25 Mio, là où il
 * n'avait aucune borne — c'était un hébergement de fichiers gratuit, public et
 * illimité, ouvert avec la clé anon. Deux conséquences côté client :
 *
 * 1. `MediaRecorder` produit des types paramétrés du genre
 *    `audio/webm;codecs=opus`. Envoyés tels quels, ils ne correspondent à aucune
 *    entrée de la liste et le dépôt serait refusé. On garde donc le type de base,
 *    qui est de toute façon le seul à décider de la lecture.
 * 2. Un enregistrement trop lourd doit être refusé avant l'aller-retour réseau,
 *    avec un message clair, plutôt que de revenir en erreur de stockage opaque.
 */
import { baseMimeType } from '@/lib/videoStorageSupabase';

/** Doit rester aligné sur `allowed_mime_types` du seau `audio-phone`. */
const ACCEPTED_VOICE_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-m4a',
  'audio/aac',
]);

/** Doit rester aligné sur `file_size_limit` du seau : 25 Mio. */
export const MAX_VOICE_UPLOAD_BYTES = 25 * 1024 * 1024;

export class VoiceUploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceUploadRejected';
  }
}

/**
 * Type de contenu à déclarer pour un enregistrement, débarrassé de ses
 * paramètres et ramené à `audio/webm` si le navigateur n'a rien dit d'utile.
 */
export function voiceContentType(blob: Blob): string {
  const base = baseMimeType(blob.type || '');
  return ACCEPTED_VOICE_TYPES.has(base) ? base : 'audio/webm';
}

/**
 * Vérifie qu'un enregistrement peut partir. Lève `VoiceUploadRejected` avec un
 * message affichable si ce n'est pas le cas.
 */
export function assertVoiceUploadAllowed(blob: Blob, label = 'Cet enregistrement'): void {
  if (blob.size === 0) {
    throw new VoiceUploadRejected(`${label} est vide, réessaie.`);
  }
  if (blob.size > MAX_VOICE_UPLOAD_BYTES) {
    const megabytes = Math.round(blob.size / (1024 * 1024));
    throw new VoiceUploadRejected(
      `${label} pèse ${megabytes} Mo, au-delà des 25 Mo acceptés. Enregistre une phrase plus courte.`,
    );
  }
}

/**
 * Ce que devient un envoi partiellement abouti.
 *
 * Les appels de rollback qui suivaient un échec — `storage.remove([...])` —
 * n'aboutissent plus : le seau `audio-phone` n'accorde ni `select` ni `delete`
 * au navigateur, pour qu'on ne puisse ni lister ni effacer les voix des joueurs.
 * L'API Storage lit l'objet avant de le retirer, donc même une suppression
 * limitée à ce qu'on vient de déposer était refusée.
 *
 * On se contente donc de laisser une trace. Le fichier resté seul ne gêne
 * personne : il n'est référencé par aucune ligne, donc invisible en jeu, et il ne
 * coûte que sa taille. Le ménage se fera côté serveur, avec la clé de service.
 */
export function noteOrphanedVoiceUpload(paths: string[], reason: string): void {
  if (paths.length === 0) return;
  console.warn(
    `[voiceUpload] ${paths.length} fichier(s) orphelin(s) dans audio-phone (${reason}) :`,
    paths,
  );
}
