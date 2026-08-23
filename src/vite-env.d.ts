/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  /** Jeton client Paddle; le préfixe `test_` active automatiquement le sandbox. */
  readonly VITE_PAYMENTS_CLIENT_TOKEN?: string;
  /** Identifiant éditeur AdSense, ex. "ca-pub-XXXXXXXXXXXXXXXX". */
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_RAIL_LEFT?: string;
  readonly VITE_ADSENSE_SLOT_RAIL_RIGHT?: string;
  /** Bloc bannière historique, utilisé comme repli. */
  readonly VITE_ADSENSE_SLOT_BANNER_RESULTS?: string;
  /** Bloc dédié aux pauses inter-manches, chargé après 10 secondes. */
  readonly VITE_ADSENSE_SLOT_BANNER_ROUND?: string;
  /** Bloc dédié aux résultats finaux et podiums, chargé après 10 secondes. */
  readonly VITE_ADSENSE_SLOT_BANNER_PODIUM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
