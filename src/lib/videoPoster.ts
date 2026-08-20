/**
 * Capture d'une vignette à partir d'un fichier vidéo local.
 *
 * Pourquoi : afficher la galerie de clips en s'appuyant sur des balises
 * `<video>` obligeait le navigateur à télécharger des octets de chaque vidéo.
 * Sur des fichiers lourds (50 Mo et plus) ces transferts monopolisaient les
 * connexions vers Supabase, au point de faire expirer les lectures du salon et
 * les écritures de soumission.
 *
 * La vignette est extraite **au moment de l'import**, depuis le `File` déjà
 * présent en mémoire : aucun octet ne transite par le réseau pour la produire.
 * Une fois stockée (~30 Ko), parcourir la galerie ne coûte plus rien.
 */

export interface PosterOptions {
  /** Instant de la frame à capturer, en secondes. */
  atSeconds?: number;
  /** Côté le plus long de la vignette, en pixels. */
  maxEdge?: number;
  /** Qualité JPEG, entre 0 et 1. */
  quality?: number;
  /** Au-delà de ce délai on abandonne : la vignette est optionnelle. */
  timeoutMs?: number;
}

const DEFAULTS = {
  atSeconds: 0.5,
  maxEdge: 640,
  quality: 0.72,
  timeoutMs: 8_000,
} as const;

/** Dimensions de sortie en préservant le ratio, sans jamais agrandir. */
export const posterDimensions = (
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxEdge, height: maxEdge };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Instant de capture réellement utilisable.
 *
 * Une durée inconnue (NaN/Infinity sur certains conteneurs) ou un clip plus
 * court que l'instant demandé donnerait une frame noire : on se rabat alors sur
 * le milieu du clip, et sur 0 en dernier recours.
 */
export const posterSeekTime = (duration: number, atSeconds: number): number => {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (atSeconds < duration) return Math.max(0, atSeconds);
  return Math.max(0, duration / 2);
};

/**
 * Extraire une vignette JPEG d'une vidéo locale.
 *
 * Renvoie `null` si l'environnement ne sait pas décoder la vidéo, si le délai
 * est dépassé, ou sur toute autre erreur : l'appelant doit pouvoir continuer
 * sans vignette.
 */
export async function captureVideoPoster(
  file: Blob,
  options: PosterOptions = {},
): Promise<Blob | null> {
  const atSeconds = options.atSeconds ?? DEFAULTS.atSeconds;
  const maxEdge = options.maxEdge ?? DEFAULTS.maxEdge;
  const quality = options.quality ?? DEFAULTS.quality;
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;

  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return null;
  }

  let objectUrl: string | null = null;
  const video = document.createElement('video');

  /** Libère la mémoire et coupe tout téléchargement en cours. */
  const cleanup = () => {
    video.onloadeddata = null;
    video.onseeked = null;
    video.onerror = null;
    try {
      video.pause?.();
    } catch {
      // Un élément jamais démarré peut refuser pause() : sans conséquence.
    }
    video.removeAttribute('src');
    try {
      video.load?.();
    } catch {
      // Idem : le nettoyage ne doit jamais faire échouer l'import.
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  try {
    objectUrl = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    // Le fichier est local : précharger ne coûte aucune requête réseau.
    video.preload = 'auto';
    video.src = objectUrl;

    const frame = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      const settle = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };

      video.onerror = () => settle(false);
      video.onloadeddata = () => {
        // Se placer sur une frame utile plutôt que sur un fondu au noir.
        const target = posterSeekTime(video.duration, atSeconds);
        if (target <= 0) {
          settle(true);
          return;
        }
        video.onseeked = () => settle(true);
        try {
          video.currentTime = target;
        } catch {
          settle(true);
        }
      };
    });

    if (!frame) {
      cleanup();
      return null;
    }

    const source = {
      width: video.videoWidth,
      height: video.videoHeight,
    };
    if (!source.width || !source.height) {
      cleanup();
      return null;
    }

    const { width, height } = posterDimensions(source.width, source.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      cleanup();
      return null;
    }
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      if (typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });

    cleanup();
    return blob;
  } catch {
    cleanup();
    return null;
  }
}
