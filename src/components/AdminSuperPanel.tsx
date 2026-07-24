import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, Ban, Megaphone, Gamepad2, Search, Loader2, Trash2, Ghost, LogIn,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'bans' | 'announce' | 'lobbies';
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
        {(['bans', 'announce', 'lobbies'] as Tab[]).map(t => (
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
            {t === 'announce' && <><Megaphone className="w-4 h-4" /> Annonces</>}
            {t === 'lobbies' && <><Gamepad2 className="w-4 h-4" /> Lobbies</>}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {tab === 'bans' && <AdminBansTab />}
        {tab === 'announce' && <AdminAnnouncementsTab />}
        {tab === 'lobbies' && <AdminLobbiesTab onClose={onClose} />}
      </div>
    </motion.div>
  );
};

// ============================ BANS TAB ============================
export const AdminBansTab = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string; avatar_url: string | null }>>([]);
  const [selected, setSelected] = useState<{ user_id: string; display_name: string } | null>(null);
  const [banType, setBanType] = useState<BanType>('chat');
  const [durationH, setDurationH] = useState<number | null>(24);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeBans, setActiveBans] = useState<any[]>([]);

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .limit(10);
    setResults((data ?? []) as any);
  };

  const loadActive = async () => {
    const { data } = await supabase
      .from('user_bans')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    setActiveBans((data ?? []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > Date.now()));
  };

  useEffect(() => { loadActive(); }, []);

  const applyBan = async () => {
    if (!selected || !user?.id || busyAction) return;
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
    const { error } = await supabase
      .from('user_bans')
      .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq('id', id);
    setBusyAction(null);
    if (error) return toast.error(error.message);
    toast.success('Ban levé');
    loadActive();
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold">Nouveau ban</div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="Rechercher un joueur…"
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
          {results.length > 0 && !selected && (
            <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
              {results.map(r => (
                <button
                  key={r.user_id}
                  onClick={() => { setSelected(r); setResults([]); setQuery(r.display_name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                >
                  {r.avatar_url && <img src={r.avatar_url} className="w-6 h-6 rounded-full" alt="" />}
                  <span>{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="text-xs bg-primary/10 text-primary rounded px-2 py-1">
            Cible : <b>{selected.display_name}</b>
          </div>
        )}

        <select
          value={banType}
          onChange={e => setBanType(e.target.value as BanType)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          {(Object.keys(BAN_LABELS) as BanType[]).map(t => (
            <option key={t} value={t}>{BAN_LABELS[t]}</option>
          ))}
        </select>

        <div className="flex gap-1 flex-wrap">
          {DURATIONS.map(d => (
            <button
              key={d.label}
              onClick={() => setDurationH(d.hours)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                durationH === d.hours
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-background border-border hover:bg-muted'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif (visible par le joueur)…"
          rows={2}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
        />

        <button
          type="button"
          onClick={applyBan}
          disabled={!selected || busyAction !== null}
          aria-busy={busyAction === 'apply'}
          className="menu-action w-full py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busyAction === 'apply' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
          Bannir
        </button>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Bans actifs ({activeBans.length})</div>
        <div className="space-y-2">
          {activeBans.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Aucun ban actif.</div>
          )}
          {activeBans.map(b => (
            <div key={b.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-muted-foreground truncate">{b.user_id}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive font-semibold">
                    {b.ban_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {b.expires_at ? `expire ${new Date(b.expires_at).toLocaleString('fr-FR')}` : 'permanent'}
                  </span>
                </div>
                {b.reason && <div className="text-xs text-muted-foreground mt-1 italic">« {b.reason} »</div>}
              </div>
              <button
                type="button"
                onClick={() => revoke(b.id)}
                disabled={busyAction !== null}
                aria-busy={busyAction === `revoke:${b.id}`}
                className="menu-icon-control p-2 rounded-lg hover:bg-destructive/20 text-destructive disabled:opacity-50"
                title="Lever le ban"
                aria-label="Lever le ban"
              >
                {busyAction === `revoke:${b.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================ ANNOUNCE TAB ============================
export const AdminAnnouncementsTab = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [expiresH, setExpiresH] = useState<number | null>(24);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('global_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setRecent(data ?? []);
  };
  useEffect(() => { load(); }, []);

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
    const { error } = await supabase.from('global_announcements').delete().eq('id', id);
    setBusyAction(null);
    if (error) return toast.error(error.message);
    toast.success('Annonce supprimée');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold">Nouveau message global</div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre (optionnel)…"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message diffusé en modal à tous les joueurs…"
          rows={4}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
        />
        <div className="flex gap-2">
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="info">Info</option>
            <option value="success">Succès</option>
            <option value="warning">Avertissement</option>
            <option value="critical">Critique</option>
          </select>
          <select
            value={expiresH === null ? 'perm' : String(expiresH)}
            onChange={e => setExpiresH(e.target.value === 'perm' ? null : Number(e.target.value))}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="1">Expire dans 1h</option>
            <option value="24">Expire dans 24h</option>
            <option value="168">Expire dans 7j</option>
            <option value="perm">Sans expiration</option>
          </select>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={busyAction !== null || !message.trim()}
          aria-busy={busyAction === 'send'}
          className="menu-action w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busyAction === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
          Envoyer à tous
        </button>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Annonces récentes</div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Aucune annonce.</div>
          )}
          {recent.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                {a.title && <div className="font-semibold truncate">{a.title}</div>}
                <div className="text-muted-foreground text-xs whitespace-pre-wrap">{a.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleString('fr-FR')} — {a.severity}
                  {a.expires_at && ` • expire ${new Date(a.expires_at).toLocaleString('fr-FR')}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={busyAction !== null}
                aria-busy={busyAction === `remove:${a.id}`}
                className="menu-icon-control p-2 rounded-lg hover:bg-destructive/20 text-destructive disabled:opacity-50"
                aria-label="Supprimer l'annonce"
              >
                {busyAction === `remove:${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================ LOBBIES TAB ============================
export const AdminLobbiesTab = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // A lobby is "active" when it was touched recently AND still has at least one
  // connected player. This filters out the stale/ghost lobbies that never got
  // cleaned up. Data is kept live via Supabase Realtime below.
  const ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h candidate window

  const load = async () => {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { data: rows } = await supabase
      .from('lobbies')
      .select('id, code, game_mode, game_phase, status, host_id, created_at, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(100);

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

    setLobbies(active);
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Live refresh: debounce reloads triggered by lobby / player changes.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(); }, 350);
    };

    const channel = supabase
      .channel('admin-lobbies-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_players' }, scheduleReload)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Parties actives uniquement. Rejoindre stocke le code et recharge l'app.
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE · {lobbies.length}
        </span>
      </div>
      {lobbies.length === 0 && <div className="text-xs italic text-muted-foreground">Aucune partie active pour le moment.</div>}
      {lobbies.map(l => (
        <div key={l.id} className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <span className="font-mono font-bold text-primary">{l.code}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {l.game_mode} • {l.game_phase}
              </span>
            </div>
            <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
              👥 {l.playerCount}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => joinAs(l, true)}
              disabled={joiningId !== null}
              aria-busy={joiningId === `${l.id}:ghost`}
              className="menu-action flex-1 py-1.5 rounded-lg bg-background border border-border text-xs font-medium hover:bg-muted flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {joiningId === `${l.id}:ghost` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ghost className="w-3.5 h-3.5" />} Fantôme
            </button>
            <button
              type="button"
              onClick={() => joinAs(l, false)}
              disabled={joiningId !== null}
              aria-busy={joiningId === `${l.id}:visible`}
              className="menu-action flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {joiningId === `${l.id}:visible` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />} Rejoindre
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};