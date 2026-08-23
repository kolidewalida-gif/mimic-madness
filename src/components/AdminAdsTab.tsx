import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ExternalLink, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { diagnose } from '@/lib/diagnostics';

const SUMMARY_DAYS = 7;

// Les types générés ne contiennent pas encore ces fonctions : on les décrit ici.
type SummaryRow = {
  event_day: string;
  screen: string;
  placement: string;
  game_mode: string | null;
  sessions: number;
  scheduled: number;
  requested: number;
  loaded: number;
  viewable: number;
  cancelled: number;
  errors: number;
};
type MetricKey = 'sessions' | 'scheduled' | 'requested' | 'loaded' | 'viewable' | 'cancelled' | 'errors';
type Totals = Record<MetricKey, number>;

type SummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: SummaryRow[] };

const METRICS: Array<{ key: MetricKey; label: string; hint: string }> = [
  { key: 'sessions', label: 'Sessions segmentées*', hint: 'Une session peut apparaître dans plusieurs segments.' },
  { key: 'scheduled', label: 'Planifiées', hint: 'Emplacements montés et programmés.' },
  { key: 'requested', label: 'Demandées', hint: 'Appels AdSense effectivement envoyés.' },
  { key: 'loaded', label: 'Chargées', hint: 'Créative détectée dans le DOM.' },
  { key: 'viewable', label: 'Visibles', hint: 'Au moins 50 % pendant une seconde.' },
  { key: 'cancelled', label: 'Annulées', hint: 'Écran quitté avant la requête.' },
  { key: 'errors', label: 'Erreurs', hint: 'Blocage, timeout ou inventaire non rempli.' },
];

const SCREEN_LABELS: Record<string, string> = {
  home: 'Accueil',
  round_break: 'Entre manches',
  results_podium: 'Résultats / podium',
};

const PLACEMENT_LABELS: Record<string, string> = {
  home_rail_left: 'Rail gauche',
  home_rail_right: 'Rail droit',
  round_break_banner: 'Bannière inter-manches',
  results_podium_banner: 'Bannière podium',
};

const emptyTotals = (): Totals => ({
  sessions: 0,
  scheduled: 0,
  requested: 0,
  loaded: 0,
  viewable: 0,
  cancelled: 0,
  errors: 0,
});

const formatCount = (value: number): string => value.toLocaleString('fr-FR');

const formatDay = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });

export const AdminAdsTab = () => {
  const [state, setState] = useState<SummaryState>({ status: 'loading' });
  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);

  const loadSummary = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    setState({ status: 'loading' });

    const to = new Date();
    const from = new Date(to.getTime() - SUMMARY_DAYS * 24 * 60 * 60 * 1_000);
    diagnose.info('admin-ads', 'Chargement du résumé publicitaire', { days: SUMMARY_DAYS });

    const { data, error } = await supabase.rpc('get_ad_event_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });

    if (!mountedRef.current || sequence !== loadSequenceRef.current) return;

    if (error) {
      diagnose.warn('admin-ads', 'Chargement du résumé publicitaire impossible', {
        days: SUMMARY_DAYS,
        rpcCode: error.code,
      });
      setState({ status: 'error', message: 'Les données publicitaires sont momentanément indisponibles.' });
      return;
    }

    const rows = data ?? [];
    diagnose.info('admin-ads', 'Résumé publicitaire chargé', {
      days: SUMMARY_DAYS,
      segments: rows.length,
    });
    setState({ status: 'ready', rows });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadSummary();
    return () => {
      mountedRef.current = false;
      loadSequenceRef.current += 1;
    };
  }, [loadSummary]);

  const rows = state.status === 'ready' ? state.rows : [];
  const totals = useMemo(
    () => rows.reduce<Totals>((summary, row) => {
      for (const metric of METRICS) summary[metric.key] += row[metric.key];
      return summary;
    }, emptyTotals()),
    [rows],
  );

  if (state.status === 'loading') {
    return (
      <div className="admin-empty admin-card" aria-live="polite">
        <div>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <strong>Chargement des statistiques publicitaires…</strong>
          <p>Agrégation sécurisée des sept derniers jours.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="admin-empty admin-card" role="alert">
        <div>
          <TriangleAlert aria-hidden="true" />
          <strong>{state.message}</strong>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="menu-focus mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-live-status">
          <span aria-hidden="true" /> 7 DERNIERS JOURS · UTC
        </div>
        <button
          type="button"
          onClick={() => void loadSummary()}
          className="menu-focus inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-wider text-white/80 hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualiser
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="Totaux publicitaires">
        {METRICS.map((metric) => (
          <article key={metric.key} className="admin-card min-w-0 p-4" title={metric.hint}>
            <span className="block truncate text-[0.65rem] font-black uppercase tracking-wider text-white/45">
              {metric.label}
            </span>
            <strong className="mt-2 block text-2xl font-black tabular-nums text-white">
              {formatCount(totals[metric.key])}
            </strong>
          </article>
        ))}
      </section>

      <section className="admin-card overflow-hidden" aria-labelledby="admin-ads-segments-title">
        <header className="admin-card-heading border-b border-white/10 p-4">
          <div>
            <span className="admin-card-icon" aria-hidden="true"><Activity /></span>
            <div>
              <h4 id="admin-ads-segments-title">Performance par écran</h4>
              <p>Signaux techniques regroupés par jour, emplacement et mode de jeu.</p>
            </div>
          </div>
          <span className="admin-count">{rows.length}</span>
        </header>

        {rows.length === 0 ? (
          <div className="admin-empty">
            <div>
              <Activity aria-hidden="true" />
              <strong>Aucun événement sur cette période</strong>
              <p>Les nouveaux emplacements apparaîtront ici après leur première visite.</p>
            </div>
          </div>
        ) : (
          <div className="max-h-[25rem] overflow-auto custom-scrollbar">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#160d24] text-white/45">
                <tr>
                  {['Jour', 'Écran', 'Placement / mode', 'Sessions*', 'Demandées', 'Chargées', 'Visibles', 'Annulées', 'Erreurs'].map((label) => (
                    <th key={label} scope="col" className="border-b border-white/10 px-3 py-2.5 font-black uppercase tracking-wider">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.event_day}:${row.screen}:${row.placement}:${row.game_mode ?? 'none'}:${index}`}
                    className="border-b border-white/[0.06] text-white/75 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-black text-white/55">{formatDay(row.event_day)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-bold">{SCREEN_LABELS[row.screen] ?? row.screen}</td>
                    <td className="px-3 py-3">
                      <strong className="block text-white/85">{PLACEMENT_LABELS[row.placement] ?? row.placement}</strong>
                      <span className="text-white/40">{row.game_mode || 'Tous modes'}</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{formatCount(row.sessions)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatCount(row.requested)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatCount(row.loaded)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatCount(row.viewable)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatCount(row.cancelled)}</td>
                    <td className="px-3 py-3 tabular-nums text-rose-300">{formatCount(row.errors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="admin-card border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm leading-relaxed text-white/65">
        <strong className="block text-amber-200">Mesure conforme</strong>
        <p className="mt-1">
          <code>loaded</code> et <code>viewable</code> sont des proxys UI, pas des impressions facturables.
          Les clics ne sont jamais interceptés dans le navigateur. Le CTR et les revenus exacts se consultent par unité dans Google AdSense.
        </p>
        <p className="mt-2 text-xs text-white/40">
          * Une même session peut compter dans plusieurs jours, écrans ou modes ; le total « sessions segmentées » n’est donc pas un nombre de visiteurs uniques.
        </p>
        <a
          href="https://www.google.com/adsense/"
          target="_blank"
          rel="noreferrer noopener"
          className="menu-focus mt-3 inline-flex items-center gap-1.5 font-black text-amber-200 hover:text-amber-100"
        >
          Ouvrir AdSense <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </aside>
    </div>
  );
};

export default AdminAdsTab;
