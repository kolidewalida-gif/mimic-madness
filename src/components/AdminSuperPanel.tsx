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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-4 md:inset-10 z-[9997] bg-card border-2 border-destructive/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="p-4 bg-destructive text-destructive-foreground flex items-center justify-between">
        <span className="font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Admin Super Panel
        </span>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>

      <div className="flex border-b border-border">
        {(['bans', 'announce', 'lobbies'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition',
              tab === t ? 'bg-destructive/10 text-destructive border-b-2 border-destructive' : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            {t === 'bans' && <><Ban className="w-4 h-4" /> Bans</>}
            {t === 'announce' && <><Megaphone className="w-4 h-4" /> Annonces</>}
            {t === 'lobbies' && <><Gamepad2 className="w-4 h-4" /> Lobbies</>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'bans' && <BansTab />}
        {tab === 'announce' && <AnnounceTab />}
        {tab === 'lobbies' && <LobbiesTab onClose={onClose} />}
      </div>
    </motion.div>
  );
};

// ============================ BANS TAB ============================
const BansTab = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string; avatar_url: string | null }>>([]);
  const [selected, setSelected] = useState<{ user_id: string; display_name: string } | null>(null);
  const [banType, setBanType] = useState<BanType>('chat');
  const [durationH, setDurationH] = useState<number | null>(24);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
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
    if (!selected || !user?.id) return;
    setBusy(true);
    const expires_at = durationH === null ? null : new Date(Date.now() + durationH * 3_600_000).toISOString();
    const { error } = await supabase.from('user_bans').insert({
      user_id: selected.user_id,
      ban_type: banType,
      reason: reason.trim() || null,
      expires_at,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selected.display_name} banni (${BAN_LABELS[banType]})`);
    setReason('');
    setSelected(null);
    setQuery('');
    setResults([]);
    loadActive();
  };

  const revoke = async (id: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('user_bans')
      .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq('id', id);
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
          onClick={applyBan}
          disabled={!selected || busy}
          className="w-full py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
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
                onClick={() => revoke(b.id)}
                className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"
                title="Lever le ban"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================ ANNOUNCE TAB ============================
const AnnounceTab = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [expiresH, setExpiresH] = useState<number | null>(24);
  const [busy, setBusy] = useState(false);
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
    if (!message.trim() || !user?.id) return;
    setBusy(true);
    const expires_at = expiresH === null ? null : new Date(Date.now() + expiresH * 3_600_000).toISOString();
    const { error } = await supabase.from('global_announcements').insert({
      title: title.trim() || null,
      message: message.trim(),
      severity,
      created_by: user.id,
      expires_at,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Annonce envoyée à tous les joueurs');
    setTitle(''); setMessage('');
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('global_announcements').delete().eq('id', id);
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
          onClick={send}
          disabled={busy || !message.trim()}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
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
                onClick={() => remove(a.id)}
                className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================ LOBBIES TAB ============================
const LobbiesTab = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lobbies')
      .select('id, code, game_mode, game_phase, host_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setLobbies(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const joinAs = async (lobby: any, ghost: boolean) => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
    const displayName = ghost ? '👁️ ADMIN' : (profile?.display_name ?? 'ADMIN');
    const { error } = await supabase.rpc('admin_join_lobby', {
      p_lobby_id: lobby.id,
      p_player_id: user.id,
      p_display_name: displayName,
      p_ghost: ghost,
    } as any);
    if (error) return toast.error(error.message);
    localStorage.setItem('lovable_admin_lobby_code', lobby.code);
    toast.success(`Rejoint ${lobby.code} (${ghost ? 'fantôme' : 'visible'})`);
    onClose();
    setTimeout(() => window.location.reload(), 500);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-3">
        Rejoindre n'importe quelle partie en cours. Le code du lobby sera stocké et l'app rechargera.
      </div>
      {lobbies.length === 0 && <div className="text-xs italic">Aucun lobby.</div>}
      {lobbies.map(l => (
        <div key={l.id} className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-mono font-bold text-primary">{l.code}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {l.game_mode} • {l.game_phase}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => joinAs(l, true)}
              className="flex-1 py-1.5 rounded-lg bg-background border border-border text-xs font-medium hover:bg-muted flex items-center justify-center gap-1"
            >
              <Ghost className="w-3.5 h-3.5" /> Fantôme
            </button>
            <button
              onClick={() => joinAs(l, false)}
              className="flex-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 flex items-center justify-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" /> Rejoindre
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};