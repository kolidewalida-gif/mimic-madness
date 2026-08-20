import { supabase } from "@/integrations/supabase/client";
import { captureVideoPoster } from "@/lib/videoPoster";

const BUCKET = 'video-challenges';

/**
 * Mêmes valeurs que celles données à `createClient`. Nécessaires pour parler
 * directement à l'endpoint REST du Storage, seul moyen d'obtenir la progression
 * d'un envoi (voir `uploadWithProgress`).
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Chemin de la vignette associée à un clip. */
export const posterPathFor = (storagePath: string): string => `${storagePath}.poster.jpg`;

export interface VideoClip {
  id: string;
  name: string;
  playerId: string;
  playerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  isMuted: boolean;
  storagePath: string;
  createdAt: Date;
  lobbyId?: string;
  roundNumber?: number | null;
}

/**
 * Largest file the project accepts, in bytes.
 *
 * Matches the `video-challenges` bucket limit (400 MB), which was verified
 * against the live project — the old 50 MB client-side cap was the only thing
 * blocking bigger clips.
 */
export const MAX_UPLOAD_BYTES = 400 * 1024 * 1024;

export const formatMb = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(0)} Mo`;

/** Thrown before any request when a file cannot possibly be accepted. */
export class UploadTooLargeError extends Error {
  size: number;
  limit = MAX_UPLOAD_BYTES;
  constructor(size: number) {
    super(
      `Vidéo trop lourde : ${formatMb(size)} pour une limite de ${formatMb(MAX_UPLOAD_BYTES)}.`,
    );
    this.name = 'UploadTooLargeError';
    this.size = size;
  }
}

// In-memory signed URL cache — avoids re-creating URLs when multiple components
// request the same clip (VideoPreview, VideoWithAudioOverlay, thumbnails).
// Entries expire after 50 min (signed URLs are valid 1h).
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Octets réellement transmis pendant un envoi. */
export interface UploadProgress {
  loadedBytes: number;
  totalBytes: number;
  /** 0..1 */
  ratio: number;
}

/** Combien de temps on accepte d'attendre le jeton avant de s'en passer. */
const TOKEN_TIMEOUT_MS = 3_000;

/** Borne une promesse qui n'a pas de délai propre. */
const withTimeout = <T,>(operation: PromiseLike<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });

/**
 * Résoudre le jeton d'accès sans jamais faire échouer l'envoi.
 *
 * `supabase.auth.getSession()` prend un verrou Navigator LockManager. Quand ce
 * verrou est déjà détenu — deuxième onglet ouvert, rafraîchissement de jeton en
 * cours — l'appel **rejette** avec « Acquiring an exclusive Navigator
 * LockManager lock "lock:sb-…-auth-token" immediately failed ». C'est observé en
 * production. Il peut aussi ne jamais se résoudre.
 *
 * Un rejet non protégé ici faisait échouer l'envoi avant le moindre octet. Or le
 * bouton « Soumettre » d'une imitation n'apparaît qu'après un envoi réussi :
 * conséquence directe, le joueur ne pouvait plus soumettre du tout.
 *
 * La clé publiable est un repli valable : c'est exactement ce que le SDK envoie
 * pour un joueur non authentifié, donc les politiques du bucket s'appliquent de
 * la même façon.
 */
async function resolveAccessToken(): Promise<string> {
  try {
    const session = await Promise.race([
      Promise.resolve(supabase.auth.getSession()).then((result) => result?.data?.session ?? null),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS);
      }),
    ]);
    const token = session?.access_token;
    return typeof token === 'string' && token.length > 0 ? token : SUPABASE_PUBLISHABLE_KEY;
  } catch (error) {
    console.warn('[upload] jeton de session indisponible, repli sur la clé publiable :', error);
    return SUPABASE_PUBLISHABLE_KEY;
  }
}

/**
 * Délai total accordé à un envoi, d'après sa taille.
 *
 * `XMLHttpRequest` n'a aucun délai par défaut : sans ça, un envoi bloqué reste
 * bloqué pour toujours. Le calcul suppose un débit plancher très bas (8 ko/s)
 * pour ne jamais interrompre un envoi lent mais réel.
 */
const uploadTimeoutMs = (bytes: number): number =>
  Math.max(120_000, Math.ceil(bytes / (8 * 1024)) * 1000);

/**
 * Envoyer un objet dans le Storage en rapportant les octets transmis.
 *
 * `supabase.storage.upload()` passe par `fetch`, qui n'expose aucune
 * progression d'émission. Le panneau d'import affichait donc « progression
 * indisponible » pendant plusieurs minutes sur un gros clip, sans aucun moyen de
 * distinguer un envoi qui avance d'un envoi bloqué. `XMLHttpRequest` est la
 * seule API navigateur qui donne `upload.onprogress`, d'où cet appel direct à
 * l'endpoint REST du Storage.
 *
 * Renvoie l'erreur éventuelle, plus `transportFailed` : vrai quand aucune
 * réponse HTTP n'a été obtenue (réseau coupé, délai dépassé, requête avortée).
 * C'est le seul cas où réessayer via le SDK a du sens — un 4xx serait refusé de
 * la même manière.
 */
function uploadWithProgress(
  bucket: string,
  path: string,
  body: Blob,
  options: {
    contentType: string;
    cacheControl: string;
    upsert: boolean;
    accessToken: string;
    onProgress?: (progress: UploadProgress) => void;
  },
): Promise<{ error: { message: string } | null; transportFailed: boolean }> {
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.timeout = uploadTimeoutMs(body.size);
    xhr.setRequestHeader('authorization', `Bearer ${options.accessToken}`);
    xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader('content-type', options.contentType);
    xhr.setRequestHeader('cache-control', `max-age=${options.cacheControl}`);
    xhr.setRequestHeader('x-upsert', options.upsert ? 'true' : 'false');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      options.onProgress?.({
        loadedBytes: event.loaded,
        totalBytes: event.total,
        ratio: Math.min(1, event.loaded / event.total),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.({
          loadedBytes: body.size,
          totalBytes: body.size,
          ratio: 1,
        });
        resolve({ error: null, transportFailed: false });
        return;
      }
      let message = `HTTP ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (typeof parsed?.message === 'string') message = parsed.message;
        else if (typeof parsed?.error === 'string') message = parsed.error;
      } catch {
        // Corps non JSON : le statut suffit à qualifier l'échec.
      }
      resolve({ error: { message }, transportFailed: false });
    };

    xhr.onerror = () =>
      resolve({ error: { message: 'Envoi interrompu par le réseau.' }, transportFailed: true });
    xhr.ontimeout = () =>
      resolve({ error: { message: "L'envoi a expiré." }, transportFailed: true });
    xhr.onabort = () =>
      resolve({ error: { message: 'Envoi interrompu.' }, transportFailed: true });

    xhr.send(body);
  });
}

class VideoStorageSupabase {
  async uploadVideo(
    file: File,
    clipData: {
      id: string;
      name: string;
      playerId: string;
      playerName: string;
      startTime: number;
      endTime: number;
      isMuted: boolean;
      lobbyId?: string;
      roundNumber?: number | null;
    },
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<VideoClip> {
    // Refuse oversized files up-front. The server cuts the connection partway
    // through instead of answering, which surfaces as an opaque "NetworkError"
    // and looks exactly like a hang. Better to say so before uploading.
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new UploadTooLargeError(file.size);
    }

    // Upload video/audio to Supabase Storage
    // Override contentType to bypass bucket allowed_mime_types restrictions
    // (e.g. .mkv, .avi, .wav are not in the default allow-list)
    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `${clipData.playerId}/${clipData.id}.${ext}`;
    const contentType = file.type || 'video/mp4';

    const accessToken = await resolveAccessToken();

    const attempt = await uploadWithProgress('video-challenges', fileName, file, {
      contentType,
      cacheControl: '3600',
      upsert: true,
      accessToken,
      onProgress,
    });

    // Repli sur le SDK uniquement quand aucune réponse HTTP n'a été obtenue :
    // mieux vaut perdre la barre de progression que perdre l'envoi. Un 4xx, lui,
    // serait refusé à l'identique — le retenter ne ferait que doubler l'attente.
    let uploadError = attempt.error;
    if (attempt.transportFailed) {
      console.warn(
        '[upload] transport direct en échec, repli sur le SDK :',
        attempt.error?.message,
      );
      uploadError =
        (
          await supabase.storage.from('video-challenges').upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType,
          })
        ).error ?? null;
    }

    if (uploadError) {
      console.error('Upload error:', uploadError, `(${formatMb(file.size)})`);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // Save metadata to database
    const clip: VideoClip = {
      id: clipData.id,
      name: clipData.name,
      playerId: clipData.playerId,
      playerName: clipData.playerName,
      startTime: clipData.startTime,
      endTime: clipData.endTime,
      duration: clipData.endTime - clipData.startTime,
      isMuted: clipData.isMuted,
      storagePath: fileName,
      createdAt: new Date(),
      lobbyId: clipData.lobbyId,
      roundNumber: clipData.roundNumber ?? null,
    };

    // Bornée : cette écriture n'a pas de délai propre, et un blocage ici laissait
    // l'enregistreur en chargement indéfini, donc sans bouton « Soumettre ».
    const { error: dbError } = await withTimeout(
      supabase
        .from('video_clips')
        .insert({
          id: clip.id,
          player_id: clip.playerId,
          player_name: clip.playerName,
          name: clip.name,
          start_time: clip.startTime,
          end_time: clip.endTime,
          duration: clip.duration,
          is_muted: clip.isMuted,
          storage_path: clip.storagePath,
          lobby_id: clip.lobbyId,
          round_number: clip.roundNumber,
        }),
      30_000,
      "L'enregistrement du clip n'a pas abouti.",
    );

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('video-challenges').remove([fileName]);
      throw new Error(`Failed to save clip metadata: ${dbError.message}`);
    }

    // Vignette : produite depuis le fichier local, donc sans coût réseau, et
    // uploadée en arrière-plan. Elle évite ensuite de télécharger la vidéo pour
    // afficher la galerie. Strictement optionnelle : un échec ne remet jamais en
    // cause un import réussi.
    void this.uploadPoster(fileName, file);

    return clip;
  }

  /**
   * Générer puis stocker la vignette d'un clip.
   *
   * Volontairement silencieuse : la galerie sait se rabattre sur la vidéo quand
   * la vignette est absente.
   */
  async uploadPoster(storagePath: string, file: Blob): Promise<boolean> {
    try {
      const poster = await captureVideoPoster(file);
      if (!poster) return false;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(posterPathFor(storagePath), poster, {
          cacheControl: '31536000',
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (error) {
        console.warn('[poster] upload ignoré:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('[poster] génération ignorée:', error);
      return false;
    }
  }

  /**
   * Supprimer des clips d'un joueur en une seule requête.
   *
   * `clipIds` omis vide toute la bibliothèque. Passe par une RPC : les DELETE
   * directs sur la table n'aboutissaient pas chez certains clients, et vider la
   * bibliothèque enchaînait autant de requêtes que de clips.
   *
   * Renvoie le nombre de clips réellement supprimés.
   */
  async deletePlayerClips(playerId: string, clipIds?: string[]): Promise<number> {
    const { data, error } = await supabase.rpc('delete_player_clips', {
      p_player_id: playerId,
      p_clip_ids: clipIds ?? null,
    });

    if (error) throw new Error(`Suppression impossible : ${error.message}`);

    const paths = (data as string[] | null) ?? [];
    for (const id of clipIds ?? []) urlCache.delete(id);
    if (!clipIds) urlCache.clear();

    if (paths.length > 0) {
      // Un seul appel groupé au stockage : vidéo, bande rythmo et vignette.
      const toRemove = paths.flatMap((path) => [
        path,
        `${path.replace(/\.[^./]+$/, '')}.cues.json`,
        posterPathFor(path),
      ]);
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(toRemove);
      if (storageError) {
        // Les métadonnées sont déjà supprimées : les fichiers orphelins ne
        // gênent pas le joueur, on ne fait donc pas échouer l'opération.
        console.warn('[clips] nettoyage du stockage incomplet:', storageError.message);
      }
    }

    return paths.length;
  }

  /**
   * URL publique de la vignette d'un clip.
   *
   * Le bucket est public : pas de signature, donc aucune requête API. On ne sait
   * pas si le fichier existe — l'appelant affiche la vidéo en repli si l'image
   * ne charge pas.
   */
  getPosterUrl(storagePath: string): string | null {
    if (!storagePath) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(posterPathFor(storagePath));
    return data?.publicUrl ?? null;
  }

  async getVideoClipsByPlayer(playerId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .is('round_number', null) // Exclude recorded imitations (they have a round_number)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
      roundNumber: clip.round_number,
    }));
  }

  async getVideoClip(clipId: string): Promise<VideoClip | null> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('id', clipId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching clip:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      playerId: data.player_id,
      playerName: data.player_name,
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      isMuted: data.is_muted,
      storagePath: data.storage_path,
      createdAt: new Date(data.created_at),
      lobbyId: data.lobby_id,
      roundNumber: data.round_number,
    };
  }

  async getVideoUrl(clipId: string, forceRefresh = false): Promise<string | null> {
    // Check cache first unless the caller just received 401/403 from this URL.
    const cached = urlCache.get(clipId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }
    if (forceRefresh) urlCache.delete(clipId);

    const clip = await this.getVideoClip(clipId);
    if (!clip) {
      console.error('Clip not found:', clipId);
      return null;
    }

    const { data, error } = await supabase.storage
      .from('video-challenges')
      .createSignedUrl(clip.storagePath, 3600);

    let url: string | null = null;
    if (error) {
      console.error('Error creating signed URL:', error);
      const { data: publicData } = supabase.storage
        .from('video-challenges')
        .getPublicUrl(clip.storagePath);
      url = publicData.publicUrl;
    } else {
      url = data.signedUrl;
    }

    // Cache for 50 min
    if (url) {
      urlCache.set(clipId, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
    }
    return url;
  }

  async deleteVideoClip(clipId: string): Promise<void> {
    const clip = await this.getVideoClip(clipId);
    if (!clip) return;

    // Invalidate cache
    urlCache.delete(clipId);

    // Delete from storage, along with the clip's rythmo cue file when it has
    // one. The cue file is a `<path>.cues.json` sibling of the video, so it is
    // removed here rather than by every caller — otherwise deleting a clip
    // would leave orphaned cues behind in the bucket.
    const cuesPath = `${clip.storagePath.replace(/\.[^./]+$/, '')}.cues.json`;
    const { error: storageError } = await supabase.storage
      .from('video-challenges')
      .remove([clip.storagePath, cuesPath, posterPathFor(clip.storagePath)]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('video_clips')
      .delete()
      .eq('id', clipId);

    if (dbError) {
      throw new Error(`Failed to delete clip: ${dbError.message}`);
    }
  }

  async getAllClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lobby clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
      roundNumber: clip.round_number,
    }));
  }

  // Get only original challenge clips (not imitations)
  async getChallengeClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('lobby_id', lobbyId)
      .is('round_number', null) // Only original challenges have no round_number
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenge clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
      roundNumber: clip.round_number,
    }));
  }

  async getPlayableChallengeClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const originalClips = await this.getChallengeClipsByLobby(lobbyId);
    if (originalClips.length > 0) {
      return originalClips;
    }

    const allClips = await this.getAllClipsByLobby(lobbyId);
    const latestByPlayer = new Map<string, VideoClip>();

    for (const clip of allClips) {
      if (!latestByPlayer.has(clip.playerId)) {
        latestByPlayer.set(clip.playerId, clip);
      }
    }

    if (latestByPlayer.size > 0) {
      return Array.from(latestByPlayer.values());
    }

    // Last-resort fallback: clips might have been uploaded in a previous lobby
    // and never re-tagged. Use player_submissions to find which players
    // submitted in this lobby, then grab their most recent clip globally.
    const { data: submissions } = await supabase
      .from("player_submissions")
      .select("player_id")
      .eq("lobby_id", lobbyId);

    const playerIds = Array.from(new Set((submissions || []).map((s) => s.player_id)));
    if (playerIds.length === 0) return [];

    const { data: globalClips } = await supabase
      .from("video_clips")
      .select("*")
      .in("player_id", playerIds)
      .order("created_at", { ascending: false });

    const latestGlobal = new Map<string, VideoClip>();
    for (const clip of globalClips || []) {
      if (!latestGlobal.has(clip.player_id)) {
        latestGlobal.set(clip.player_id, {
          id: clip.id,
          name: clip.name,
          playerId: clip.player_id,
          playerName: clip.player_name,
          startTime: clip.start_time,
          endTime: clip.end_time,
          duration: clip.duration,
          isMuted: clip.is_muted,
          storagePath: clip.storage_path,
          createdAt: new Date(clip.created_at),
          lobbyId: clip.lobby_id,
        });
      }
    }

    return Array.from(latestGlobal.values());
  }

  async getLatestClipByPlayerInLobby(playerId: string, lobbyId: string): Promise<VideoClip | null> {
    // Retry logic for better reliability
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('video_clips')
          .select('*')
          .eq('player_id', playerId)
          .eq('lobby_id', lobbyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          lastError = new Error(error.message);
          console.warn(`Attempt ${attempt + 1} failed fetching clip:`, error);
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }

        if (!data) {
          console.log(`No clip found for player ${playerId} in lobby ${lobbyId}`);
          return null;
        }

        return {
          id: data.id,
          name: data.name,
          playerId: data.player_id,
          playerName: data.player_name,
          startTime: data.start_time,
          endTime: data.end_time,
          duration: data.duration,
          isMuted: data.is_muted,
          storagePath: data.storage_path,
          createdAt: new Date(data.created_at),
          lobbyId: data.lobby_id,
        };
      } catch (err) {
        lastError = err as Error;
        console.warn(`Attempt ${attempt + 1} exception:`, err);
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    
    console.error('All retries failed fetching latest clip:', lastError);
    return null;
  }

  async getClipByPlayerAfterTime(playerId: string, lobbyId: string, afterTime: Date): Promise<VideoClip | null> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .eq('lobby_id', lobbyId)
      .gte('created_at', afterTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      playerId: data.player_id,
      playerName: data.player_name,
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      isMuted: data.is_muted,
      storagePath: data.storage_path,
      createdAt: new Date(data.created_at),
      lobbyId: data.lobby_id,
      roundNumber: data.round_number,
    };
  }

  async getClipByPlayerAndRound(playerId: string, lobbyId: string, roundNumber: number): Promise<VideoClip | null> {
    // First try to get clip by round_number
    const { data: roundData, error: roundError } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .eq('lobby_id', lobbyId)
      .eq('round_number', roundNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!roundError && roundData) {
      return {
        id: roundData.id,
        name: roundData.name,
        playerId: roundData.player_id,
        playerName: roundData.player_name,
        startTime: roundData.start_time,
        endTime: roundData.end_time,
        duration: roundData.duration,
        isMuted: roundData.is_muted,
        storagePath: roundData.storage_path,
        createdAt: new Date(roundData.created_at),
        lobbyId: roundData.lobby_id,
      };
    }

    return null;
  }
}

export const videoStorage = new VideoStorageSupabase();
