/**
 * Garde commun des fonctions serveur ouvertes.
 *
 * Quatre fonctions déployées tournent sans vérification de jeton :
 * `generate-subtitles`, `refine-rhythmo-text`, `transcribe-clip` et
 * `transcribe-clip-status`. Ce n'est pas un oubli — le jeu se joue sans compte,
 * et un invité n'a aucun JWT à présenter. Mais elles appellent des API tierces
 * payantes, et elles répondaient à n'importe quel appel venu de n'importe où,
 * avec `Access-Control-Allow-Origin: *`. Une boucle suffisait à faire fondre le
 * budget.
 *
 * Faute de pouvoir authentifier l'appelant, on limite ce qu'il peut consommer.
 * Deux barrières, complémentaires et volontairement modestes :
 *
 * 1. **L'origine.** Le navigateur d'un joueur envoie toujours un `Origin`, et il
 *    ne peut pas le falsifier. Un client non-navigateur, lui, met ce qu'il veut :
 *    cette barrière ne gêne donc que l'abus depuis un site tiers, ce qui est déjà
 *    une classe entière d'abus. Elle ne prétend pas faire plus.
 * 2. **Le débit.** Comptage par adresse et par fonction, dans la base, via
 *    `consume_edge_quota`. C'est la seule barrière qui tienne devant un script,
 *    et c'est pour ça que les seuils sont la vraie protection ici.
 *
 * Les seuils sont larges au point qu'un joueur ne les voit jamais. Ils ne
 * cassent qu'une utilisation automatisée.
 */

/** Origines autorisées à appeler ces fonctions depuis un navigateur. */
const ALLOWED_ORIGIN_HOSTS = [
  'mimic-madness.lovable.app',
  'mimicmaster.app',
  'www.mimicmaster.app',
];

/** Motifs d'hôtes de prévisualisation et de développement. */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /\.lovable\.app$/,
  /\.lovableproject\.com$/,
  /\.gptengineer\.app$/,
  /\.gptengineer\.run$/,
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (ALLOWED_ORIGIN_HOSTS.includes(host)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * En-têtes CORS reflétant l'origine quand elle est connue.
 *
 * `*` était commode et disait à tous les sites du web qu'ils pouvaient appeler
 * ces fonctions depuis le navigateur de leurs visiteurs. On ne renvoie plus
 * l'autorisation qu'aux origines du jeu ; les autres reçoivent une réponse sans
 * en-tête permissif, que leur navigateur refusera de leur laisser lire.
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin as string;
  }
  return headers;
}

/** Adresse de l'appelant, telle que la voit la passerelle. */
function clientKeyFor(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  return first || req.headers.get('cf-connecting-ip') || 'inconnu';
}

export interface QuotaVerdict {
  allowed: boolean;
  /** Réponse prête à renvoyer quand l'appel est refusé. */
  response?: Response;
}

/**
 * Vérifie l'origine puis consomme un jeton de quota.
 *
 * Toute panne du comptage laisse passer l'appel : une fonction de jeu ne doit pas
 * tomber parce que la table de compteurs est indisponible. Le but est de plafonner
 * l'abus, pas de fabriquer un point de défaillance de plus.
 */
export async function guardOpenFunction(
  req: Request,
  options: { bucket: string; limit: number; windowSeconds: number; requireKnownOrigin?: boolean },
): Promise<QuotaVerdict> {
  const cors = corsHeadersFor(req);
  const { bucket, limit, windowSeconds, requireKnownOrigin = true } = options;

  const origin = req.headers.get('Origin');
  if (requireKnownOrigin && origin !== null && !isAllowedOrigin(origin)) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ ok: false, reason: 'forbidden-origin' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return { allowed: true };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_edge_quota`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_client_key: clientKeyFor(req),
        p_limit: limit,
        p_window_seconds: windowSeconds,
      }),
    });

    if (!response.ok) return { allowed: true };
    const allowed = await response.json().catch(() => true);
    if (allowed === false) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            ok: false,
            reason: 'rate-limited',
            message: 'Trop de demandes. Réessaie dans un instant.',
          }),
          {
            status: 429,
            headers: {
              ...cors,
              'Content-Type': 'application/json',
              'Retry-After': String(windowSeconds),
            },
          },
        ),
      };
    }
  } catch (error) {
    console.error(`[guard] comptage indisponible pour ${bucket}:`, error);
  }

  return { allowed: true };
}
