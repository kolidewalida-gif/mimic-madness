/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  /** Identifiant éditeur AdSense, ex. "ca-pub-XXXXXXXXXXXXXXXX". */
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_RAIL_LEFT?: string;
  readonly VITE_ADSENSE_SLOT_RAIL_RIGHT?: string;
  /** Bloc bannière entre manches (résultats). */
  readonly VITE_ADSENSE_SLOT_BANNER_RESULTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
