import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, Ban, Megaphone, Gamepad2, Search, Loader2, Trash2, Ghost, LogIn, Flag,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'bans' | 'reports' | 'announce' | 'lobbies';
type BanType = 'global' | 'chat' | 'lobby' | 'mute';

const BAN_LABELS: Record<BanType, string> = {
  global: 'Ban global (bloque tout)',
  chat: 'Ban chat / social',
  lobby: 'Ban lobbies',
  mute: 'Mute vocal',
};

const DURATIONS: Array<{ label: string; hours: number | null }> = [
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '7j', hours: 24 * 7 },
  { label: '30j', hours: 24 * 30 },
  { label: 'Permanent', hours: null },
];

export const AdminSuperPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>('bans');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="ibs-admin-super menu-dialog menu-dialog-safe fixed inset-4 md:inset-10 z-[9997] bg-[#100b1d] border border-primary/35 rounded-2xl shadow-2xl flex flex-col md:grid md:grid-cols-[13rem_1fr] md:grid-rows-[auto_1fr] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-super-panel-title"
    >
      <div className="ibs-admin-header p-4 bg-primary/15 border-b border-primary/30 text-foreground flex items-center justify-between md:col-span-2">
        <span id="admin-super-panel-title" className="font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Admin Super Panel
        </span>
        <button type="button" data-back onClick={onClose} aria-label="Fermer le panneau administrateur"><X className="w-5 h-5" /></button>
      </div>

      <div className="ibs-admin-tabs flex md:flex-col border-b md:border-b-0 md:border-r border-border bg-black/15">
        {(['bans', 'reports', 'announce', 'lobbies'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              'flex-1 min-w-0 px-1.5 sm:px-3 py-3 text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition',
              tab === t ? 'bg-primary/15 text-primary border-b-2 md:border-b-0 md:border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            {t === 'bans' && <><Ban className="w-4 h-4" /> Bans</>}
            {t === 'reports' && <><Flag className="w-4 h-4" /> Signalements</>}
            {t === 'announce' && <><Megaphone className="w-4 h-4" /> Annonces</>}
            {t === 'lobbies' && <><Gamepad2 className="w-4 h-4" /> Lobbies</>}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {tab === 'bans' && <AdminBansTab />}
        {tab === 'reports' && <AdminReportsTab />}
        {tab === 'announce' && <AdminAnnouncementsTab />}
        {tab === 'lobbies' && <AdminLobbiesTab onClose={onClose} />}
      </div>
    </motion.div>
  );
};

// ========================= REPORTS TAB =========================
/*
 * File de tri des signalements joueurs.
 *
 * La console savait bannir, mais rien ne remontait du terrain : un joueur
 * n'avait aucun moyen de signaler un comportement abusif. `report_lobby_player`
 * alimente maintenant `player_reports`, et cet onglet en donne la lecture
 * groupée par cible, pour voir d'un coup d'œil qui revient plusieurs fois.
 *
 * La table est fermée au client ; `list_player_reports` est une fonction
 * `SECURITY DEFINER` qui revérifie le rôle admin côté serveur, en plus des
 * policies. La console n'est donc pas le garde-fou, elle n'est que l'écran.
 */
const REPORT_REASON_LABELS: Record<string, string> = {
  harcelement: 'Harcèlement',
  contenu_choquant: 'Contenu choquant',
  usurpation: 'Usurpation',
  triche: 'Triche',
  spam: 'Spam',
  autre: 'Autre',
};

interface ReportGroup {
  target_player_id: string;
  target_user_id: string | null;
  target_player_name: string;
  report_count: number;
  pending_count: number;
  reasons: string[];
  last_report_at: string;
  last_details: string | null;
}

const AdminReportsTabComponent = () => {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const client = supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    };
    const { data, error } = await client.rpc('list_player_reports', { p_limit: 100 });
    if (error) {
      toast.error('Impossible de charger les signalements');
      setGroups([]);
    } else {
      setGroups((data as ReportGroup[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markHandled = async (playerId: string, status: 'reviewed' | 'dismissed') => {
    setBusy(playerId);
    const { error } = await supabase
      .from('player_reports' as never)
      .update({ status, reviewed_at: new Date().toISOString() } as never)
      .eq('target_player_id', playerId)
      .eq('status', 'pending');
    setBusy(null);
    if (error) {
      toast.error("Le classement n'a pas abouti");
      return;
    }
    toast.success(status === 'dismissed' ? 'Signalements écartés' : 'Signalements marqués vus');
    void load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des signalements…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-bold">Signalements</h3>
        <p className="text-sm text-muted-foreground">
          Aucun signalement. C'est la bonne nouvelle du jour.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Signalements</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-muted-foreground underline"
        >
          Rafraîchir
        </button>
      </div>

      {groups.map((g) => (
        <div
          key={g.target_player_id}
          className="space-y-2 rounded-xl border border-border bg-black/20 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{g.target_player_name}</span>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">
              {g.pending_count} en attente / {g.report_count} au total
            </span>
            {!g.target_user_id && (
              <span className="text-xs text-muted-foreground">invité (pas de compte)</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Motifs : {g.reasons.map((r) => REPORT_REASON_LABELS[r] ?? r).join(', ')}
            {' · '}
            dernier le {new Date(g.last_report_at).toLocaleString('fr-FR')}
          </p>

          {g.last_details && (
            <p className="rounded-lg bg-black/30 p-2 text-xs italic">« {g.last_details} »</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === g.target_player_id || g.pending_count === 0}
              onClick={() => void markHandled(g.target_player_id, 'reviewed')}
              className="rounded-lg border border-border px-2.5 py-1 text-xs"
            >
              Marquer vu
            </button>
            <button
              type="button"
              disabled={busy === g.target_player_id || g.pending_count === 0}
              onClick={() => void markHandled(g.target_player_id, 'dismissed')}
              className="rounded-lg border border-border px-2.5 py-1 text-xs"
            >
              Écarter
            </button>
            {g.target_user_id && (
              <span className="self-center text-xs text-muted-foreground">
                Compte lié : bannissable depuis l'onglet Bans
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminReportsTab = memo(AdminReportsTabComponent);

// ============================ BANS TAB ============================
const AdminBansTabComponent = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string; avatar_url: string | null }>>([]);
  const [selected, setSelected] = useState<{ user_id: string; display_name: string } | null>(null);
  const [banType, setBanType] = useState<BanType>('chat');
  const [durationH, setDurationH] = useState<number | null>(24);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeBans, setActiveBans] = useState<any[]>([]);
  const mountedRef = useRef(true);
  const searchSeq = useRef(0);
  const loadSeq = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Debounced player search with a race guard so slow responses can't
  // overwrite the results of a newer query.
  useEffect(() => {
    const q = query.trim();
    if (!q || selected) { setResults([]); return; }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${q}%`)
        .limit(10);
      if (mountedRef.current && seq === searchSeq.current) setResults((data ?? []) as any);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  const loadActive = useCallback(async () => {
    const seq = ++loadSeq.current;
    const { data, error } = await supabase
      .from('user_bans')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    // Drop stale responses: only the most recent load may update state.
    if (!mountedRef.current || seq !== loadSeq.current) return;
    if (error) { toast.error('Chargement des bans impossible.'); return; }
    setActiveBans((data ?? []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > Date.now()));
  }, []);

  // Initial load + live refresh so bans applied/revoked by any admin appear
  // instantly without a manual reload.
  useEffect(() => {
    loadActive();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void loadActive(); }, 300);
    };
    const channel = supabase
      .channel(`admin-bans-live:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bans' }, scheduleReload)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadActive]);

  const applyBan = async () => {
    if (!selected || !user?.id || busyAction) return;
    // Guard against stacking a duplicate active ban of the same type.
    if (activeBans.some((b) => b.user_id === selected.user_id && b.ban_type === banType)) {
      return toast.error('Ce joueur a déjà un ban actif de ce type.');
    }
    setBusyAction('apply');
    const expires_at = durationH === null ? null : new Date(Date.now() + durationH * 3_600_000).toISOString();
    const { error } = await supabase.from('user_bans').insert({
      user_id: selected.user_id,
      ban_type: banType,
      reason: reason.trim() || null,
      expires_at,
      created_by: user.id,
    });
    setBusyAction(null);
    if (error) return toast.error(error.message);
    toast.success(`${selected.display_name} banni (${BAN_LABELS[banType]})`);
    setReason('');
    setSelected(null);
    setQuery('');
    setResults([]);
    loadActive();
  };

  const revoke = async (id: string) => {
    if (!user?.id || busyAction) return;
    setBusyAction(`revoke:${id}`);
    // Optimistic: drop it instantly; realtime reconciles across admins.
    const snapshot = activeBans;
    setActiveBans((prev) => prev.filter((b) => b.id !== id));
    const { error } = await supabase
      .from('user_bans')
      .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq('id', id);
    setBusyAction(null);
    if (error) {
      setActiveBans(snapshot); // rollback
      return toast.error(error.message);
    }
    toast.success('Ban levé');
  };

  return (
    <div className="admin-tab-layout">
      <section className="admin-card admin-form-card" aria-labelledby="admin-new-ban-title">
        <header className="admin-card-heading">
          <div>
            <span className="admin-card-icon" aria-hidden="true"><Ban /></span>
            <div>
              <h4 id="admin-new-ban-title">Nouveau ban</h4>
              <p>Sélectionne précisément un joueur avant d’appliquer la sanction.</p>
            </div>
          </div>
        </header>

        <div className="admin-form-stack">
          <div className="admin-field-group">
            <label className="admin-field-label" htmlFor="admin-ban-search">Joueur ciblé</label>
            <div className="admin-search-wrap">
              <Search aria-hidden="true" />
              <input
                id="admin-ban-search"
                value={query}
                onChange={e => { setQuery(e.target.value); if (selected) setSelected(null); }}
                placeholder="Rechercher un joueur…"
                className="admin-field"
                autoComplete="off"
              />
              {results.length > 0 && !selected && (
                <div className="admin-search-results custom-scrollbar">
                  {results.map(r => (
                    <button
                      type="button"
                      key={r.user_id}
                      onClick={() => { setSelected(r); setResults([]); setQuery(r.display_name); }}
                      className="admin-search-result menu-focus"
                    >
                      {r.avatar_url && <img src={r.avatar_url} alt="" />}
                      <span>{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="admin-target">
              <span>Cible sélectionnée</span>
              <strong>{selected.display_name}</strong>
            </div>
          )}

          <div className="admin-field-group">
            <label className="admin-field-label" htmlFor="admin-ban-type">Type de sanction</label>
            <select
              id="admin-ban-type"
              value={banType}
              onChange={e => setBanType(e.target.value as BanType)}
              className="admin-field"
            >
              {(Object.keys(BAN_LABELS) as BanType[]).map(t => (
                <option key={t} value={t}>{BAN_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="admin-field-group">
            <span className="admin-field-label">Durée</span>
            <div className="admin-chip-row" role="group" aria-label="Durée du ban">
              {DURATIONS.map(d => (
                <button
                  type="button"
                  key={d.label}
                  onClick={() => setDurationH(d.hours)}
                  aria-pressed={durationH === d.hours}
                  className={cn('admin-chip menu-focus', durationH === d.hours && 'is-active')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-field-group">
            <label className="admin-field-label" htmlFor="admin-ban-reason">Motif communiqué au joueur</label>
            <textarea
              id="admin-ban-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motif (visible par le joueur)…"
              rows={3}
              className="admin-field"
            />
          </div>

          <button
            type="button"
            onClick={applyBan}
            disabled={!selected || busyAction !== null}
            aria-busy={busyAction === 'apply'}
            className="admin-primary-button is-danger menu-action menu-focus"
          >
            {busyAction === 'apply' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Ban aria-hidden="true" />}
            Bannir le joueur
          </button>
        </div>
      </section>

      <section className="admin-card admin-list-card" aria-labelledby="admin-active-bans-title">
        <header className="admin-card-heading">
          <div>
            <span className="admin-card-icon" aria-hidden="true"><Shield /></span>
            <div>
              <h4 id="admin-active-bans-title">Bans actifs</h4>
              <p>Sanctions en cours sur l’ensemble du jeu.</p>
            </div>
          </div>
          <span className="admin-count" aria-label={`${activeBans.length} bans actifs`}>{activeBans.length}</span>
        </header>

        {activeBans.length === 0 ? (
          <div className="admin-empty">
            <div>
              <Shield aria-hidden="true" />
              <strong>Aucun ban actif</strong>
              <p>Les sanctions appliquées apparaîtront ici.</p>
            </div>
          </div>
        ) : (
          <div className="admin-list">
            {activeBans.map(b => (
              <article key={b.id} className="admin-list-item">
                <div className="admin-item-main">
                  <div className="admin-item-id">{b.user_id}</div>
                  <div className="admin-item-meta">
                    <span className="admin-item-tag">{b.ban_type}</span>
                    <span>{b.expires_at ? `Expire ${new Date(b.expires_at).toLocaleString('fr-FR')}` : 'Permanent'}</span>
                  </div>
                  {b.reason && <div className="admin-item-reason">« {b.reason} »</div>}
                </div>
                <button
                  type="button"
                  onClick={() => revoke(b.id)}
                  disabled={busyAction !== null}
                  aria-busy={busyAction === `revoke:${b.id}`}
                  className="admin-delete-button menu-icon-control menu-focus"
                  title="Lever le ban"
                  aria-label="Lever le ban"
                >
                  {busyAction === `revoke:${b.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
export const AdminBansTab = memo(AdminBansTabComponent);

// ============================ ANNOUNCE TAB ============================
const AdminAnnouncementsTabComponent = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [expiresH, setExpiresH] = useState<number | null>(24);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const mountedRef = useRef(true);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const { data, error } = await supabase
      .from('global_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!mountedRef.current || seq !== loadSeq.current) return;
    if (error) { toast.error('Chargement des annonces impossible.'); return; }
    setRecent(data ?? []);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const send = async () => {
    if (!message.trim() || !user?.id || busyAction) return;
    setBusyAction('send');
    const expires_at = expiresH === null ? null : new Date(Date.now() + expiresH * 3_600_000).toISOString();
    const { error } = await supabase.from('global_announcements').insert({
      title: title.trim() || null,
      message: message.trim(),
      severity,
      created_by: user.id,
      expires_at,
    });
    setBusyAction(null);
    if (error) return toast.error(error.message);
    toast.success('Annonce envoyée à tous les joueurs');
    setTitle(''); setMessage('');
    load();
  };

  const remove = async (id: string) => {
    if (busyAction) return;
    setBusyAction(`remove:${id}`);
    // Optimistic removal with rollback on failure.
    const snapshot = recent;
    setRecent((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from('global_announcements').delete().eq('id', id);
    setBusyAction(null);
    if (error) {
      setRecent(snapshot);
      return toast.error(error.message);
    }
    toast.success('Annonce supprimée');
  };

  return (
    <div className="admin-tab-layout">
      <section className="admin-card admin-form-card" aria-labelledby="admin-new-announcement-title">
        <header className="admin-card-heading">
          <div>
            <span className="admin-card-icon is-reward" aria-hidden="true"><Megaphone /></span>
            <div>
              <h4 id="admin-new-announcement-title">Nouveau message global</h4>
              <p>Le message s’affichera en modal pour tous les joueurs.</p>
            </div>
          </div>
        </header>

        <div className="admin-form-stack">
          <div className="admin-field-group">
            <label className="admin-field-label" htmlFor="admin-announcement-title">Titre optionnel</label>
            <input
              id="admin-announcement-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l’annonce…"
              className="admin-field"
            />
          </div>

          <div className="admin-field-group">
            <label className="admin-field-label" htmlFor="admin-announcement-message">Message</label>
            <textarea
              id="admin-announcement-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Message diffusé à tous les joueurs…"
              rows={5}
              className="admin-field"
            />
          </div>

          <div className="admin-form-split">
            <div className="admin-field-group">
              <label className="admin-field-label" htmlFor="admin-announcement-severity">Importance</label>
              <select
                id="admin-announcement-severity"
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="admin-field"
              >
                <option value="info">Info</option>
                <option value="success">Succès</option>
                <option value="warning">Avertissement</option>
                <option value="critical">Critique</option>
              </select>
            </div>
            <div className="admin-field-group">
              <label className="admin-field-label" htmlFor="admin-announcement-expiry">Expiration</label>
              <select
                id="admin-announcement-expiry"
                value={expiresH === null ? 'perm' : String(expiresH)}
                onChange={e => setExpiresH(e.target.value === 'perm' ? null : Number(e.target.value))}
                className="admin-field"
              >
                <option value="1">Dans 1 heure</option>
                <option value="24">Dans 24 heures</option>
                <option value="168">Dans 7 jours</option>
                <option value="perm">Sans expiration</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={send}
            disabled={busyAction !== null || !message.trim()}
            aria-busy={busyAction === 'send'}
            className="admin-primary-button menu-action menu-focus"
          >
            {busyAction === 'send' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Megaphone aria-hidden="true" />}
            Envoyer à tous
          </button>
        </div>
      </section>

      <section className="admin-card admin-list-card" aria-labelledby="admin-recent-announcements-title">
        <header className="admin-card-heading">
          <div>
            <span className="admin-card-icon is-reward" aria-hidden="true"><Megaphone /></span>
            <div>
              <h4 id="admin-recent-announcements-title">Annonces récentes</h4>
              <p>Historique des messages globaux encore enregistrés.</p>
            </div>
          </div>
          <span className="admin-count" aria-label={`${recent.length} annonces`}>{recent.length}</span>
        </header>

        {recent.length === 0 ? (
          <div className="admin-empty">
            <div>
              <Megaphone aria-hidden="true" />
              <strong>Aucune annonce</strong>
              <p>Les messages envoyés apparaîtront ici.</p>
            </div>
          </div>
        ) : (
          <div className="admin-list">
            {recent.map(a => (
              <article key={a.id} className="admin-list-item">
                <div className="admin-item-main">
                  {a.title && <div className="admin-item-title">{a.title}</div>}
                  <div className="admin-item-message">{a.message}</div>
                  <div className="admin-item-meta">
                    <span>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                    <span className="admin-item-tag">{a.severity}</span>
                    {a.expires_at && <span>Expire {new Date(a.expires_at).toLocaleString('fr-FR')}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={busyAction !== null}
                  aria-busy={busyAction === `remove:${a.id}`}
                  className="admin-delete-button menu-icon-control menu-focus"
                  aria-label="Supprimer l’annonce"
                >
                  {busyAction === `remove:${a.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
export const AdminAnnouncementsTab = memo(AdminAnnouncementsTabComponent);

// ============================ LOBBIES TAB ============================
const AdminLobbiesTabComponent = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const loadSeq = useRef(0);

  // A lobby is "active" when it was touched recently AND still has at least one
  // connected player. This filters out the stale/ghost lobbies that never got
  // cleaned up. Data is kept live via Supabase Realtime below.
  const ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h candidate window

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { data: rows, error } = await supabase
      .from('lobbies')
      .select('id, code, game_mode, game_phase, status, host_id, created_at, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      if (mountedRef.current && seq === loadSeq.current) setLoading(false);
      return;
    }

    const ids = (rows ?? []).map((l) => l.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: players } = await supabase
        .from('lobby_players')
        .select('lobby_id, connection_status')
        .in('lobby_id', ids);
      for (const p of players ?? []) {
        if (p.connection_status === 'connected') counts[p.lobby_id] = (counts[p.lobby_id] ?? 0) + 1;
      }
    }

    const active = (rows ?? [])
      .map((l) => ({ ...l, playerCount: counts[l.id] ?? 0 }))
      .filter((l) => l.playerCount > 0 && l.status !== 'finished' && l.status !== 'closed');

    // Only the newest load may commit — prevents out-of-order realtime reloads
    // from flickering an older snapshot back in.
    if (!mountedRef.current || seq !== loadSeq.current) return;
    setLobbies(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    // Live refresh: debounce reloads triggered by lobby / player changes.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); }, 350);
    };

    // Unique channel name avoids collisions if the panel is mounted more than
    // once (e.g. re-open, or the legacy super panel alongside it).
    const channel = supabase
      .channel(`admin-lobbies-live:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_players' }, scheduleReload)
      .subscribe();

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const joinAs = async (lobby: any, ghost: boolean) => {
    if (!user?.id || joiningId) return;
    setJoiningId(`${lobby.id}:${ghost ? 'ghost' : 'visible'}`);
    const { data: profile } = await supabase
      .from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
    const displayName = ghost ? '👁️ ADMIN' : (profile?.display_name ?? 'ADMIN');
    const { error } = await supabase.rpc('admin_join_lobby', {
      p_lobby_id: lobby.id,
      p_player_id: user.id,
      p_display_name: displayName,
      p_ghost: ghost,
    } as any);
    if (error) {
      setJoiningId(null);
      return toast.error(error.message);
    }
    localStorage.setItem('lovable_admin_lobby_code', lobby.code);
    toast.success(`Rejoint ${lobby.code} (${ghost ? 'fantôme' : 'visible'})`);
    onClose();
    setTimeout(() => window.location.reload(), 500);
  };

  if (loading) {
    return (
      <div className="admin-empty">
        <div>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <strong>Chargement des parties…</strong>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-live-bar">
        <span>Parties actives uniquement. Rejoindre stocke le code et recharge l’application.</span>
        <span className="admin-live-status">
          <span aria-hidden="true" /> LIVE · {lobbies.length}
        </span>
      </div>

      {lobbies.length === 0 ? (
        <div className="admin-empty admin-card">
          <div>
            <Gamepad2 aria-hidden="true" />
            <strong>Aucune partie active</strong>
            <p>Les salons récemment actifs et occupés apparaîtront ici.</p>
          </div>
        </div>
      ) : (
        <div className="admin-lobby-grid">
          {lobbies.map(l => (
            <article key={l.id} className="admin-lobby-card admin-card">
              <header className="admin-lobby-heading">
                <div className="min-w-0">
                  <div className="admin-lobby-code">{l.code}</div>
                  <div className="admin-lobby-mode">{l.game_mode} · {l.game_phase}</div>
                </div>
                <span className="admin-player-count">{l.playerCount} joueur{l.playerCount > 1 ? 's' : ''}</span>
              </header>
              <div className="admin-lobby-actions">
                <button
                  type="button"
                  onClick={() => joinAs(l, true)}
                  disabled={joiningId !== null}
                  aria-busy={joiningId === `${l.id}:ghost`}
                  className="admin-lobby-button menu-action menu-focus"
                >
                  {joiningId === `${l.id}:ghost` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Ghost aria-hidden="true" />}
                  Fantôme
                </button>
                <button
                  type="button"
                  onClick={() => joinAs(l, false)}
                  disabled={joiningId !== null}
                  aria-busy={joiningId === `${l.id}:visible`}
                  className="admin-lobby-button is-primary menu-action menu-focus"
                >
                  {joiningId === `${l.id}:visible` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
                  Rejoindre
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminLobbiesTab = memo(AdminLobbiesTabComponent);
