import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Plus, Trash2, Play, Youtube, Sparkles, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type BlindtestCategory } from '@/lib/blindtestTracks';
import {
  loadCustomPlaylist, saveCustomPlaylist, makeCustomTrack, type CustomTrack,
} from '@/lib/blindtestPlaylist';
import { parseYouTubeId, youtubeThumb } from '@/lib/youtube';

interface BlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  onStart: (tracks: CustomTrack[]) => void;
}

const CATS: BlindtestCategory[] = ['anime', 'cartoon', 'music', 'film'];

export const BlindtestSetup = ({ isHost, canStart, onStart }: BlindtestSetupProps) => {
  const [list, setList] = useState<CustomTrack[]>(() => loadCustomPlaylist());
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlindtestCategory>('anime');
  const [error, setError] = useState<string | null>(null);

  const linkId = useMemo(() => parseYouTubeId(link), [link]);

  const add = () => {
    const t = makeCustomTrack(link, title, category);
    if (!t) {
      setError(!linkId ? 'Lien YouTube invalide' : 'Ajoute la bonne réponse (titre)');
      return;
    }
    const next = [...list, t];
    setList(next);
    saveCustomPlaylist(next);
    setLink(''); setTitle(''); setError(null);
  };

  const remove = (id: string) => {
    const next = list.filter((t) => t.id !== id);
    setList(next);
    saveCustomPlaylist(next);
  };

  if (!isHost) {
    return (
      <div className="text-center">
        <Music className="w-10 h-10 text-fuchsia-300 mx-auto mb-3 animate-pulse" />
        <p className="text-lg font-bold text-white/70">L’hôte prépare la playlist…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl flex flex-col gap-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-black flex items-center justify-center gap-2">
          <ListMusic className="w-6 h-6 text-fuchsia-300" /> Prépare ta playlist
        </h2>
        <p className="text-sm text-white/55 mt-1">
          Colle des liens YouTube (anime, dessins animés, musiques, films) et la bonne réponse.
        </p>
      </div>

      {/* add form */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
          <Youtube className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Lien YouTube (https://youtu.be/…)"
            className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30"
          />
          {linkId && (
            <img src={youtubeThumb(linkId)} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0" />
          )}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bonne réponse (ex: Naruto)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {CATS.map((c) => {
            const meta = CATEGORY_META[c];
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-bold border transition-all')}
                style={{
                  borderColor: active ? meta.color : 'rgba(255,255,255,0.12)',
                  background: active ? `${meta.color}26` : 'transparent',
                  color: active ? meta.color : 'rgba(255,255,255,0.6)',
                }}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
          <button
            onClick={add}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-500 text-white font-black hover:brightness-110"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
        {error && <p className="text-sm text-rose-400 font-bold">{error}</p>}
      </div>

      {/* list */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] max-h-56 overflow-y-auto custom-scrollbar">
        {list.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-6">
            Aucune piste. Ajoute des liens, ou démarre avec la playlist par défaut.
          </p>
        ) : (
          list.map((t) => {
            const meta = CATEGORY_META[t.category];
            return (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 border-b border-white/5 last:border-0">
                <img src={youtubeThumb(t.youtubeId)} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{t.title}</p>
                  <p className="text-xs" style={{ color: meta.color }}>{meta.emoji} {meta.label}</p>
                </div>
                <button onClick={() => remove(t.id)} className="text-white/40 hover:text-rose-400 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-white/50">{list.length} piste{list.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => onStart(list)}
          disabled={!canStart}
          className={cn(
            'ml-auto flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-lg transition-all',
            canStart ? 'bg-gradient-to-r from-fuchsia-500 to-purple-700 hover:brightness-110' : 'bg-white/10 text-white/40 cursor-not-allowed',
          )}
          style={canStart ? { boxShadow: '0 8px 24px rgba(217,70,239,0.5)' } : undefined}
        >
          {list.length > 0 ? <Play className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          {list.length > 0 ? 'Lancer le blindtest' : 'Jouer (playlist par défaut)'}
        </button>
      </div>
      <p className="text-center text-[11px] text-white/35">
        Astuce : les vidéos qui bloquent l’intégration sont automatiquement ignorées.
      </p>
    </motion.div>
  );
};
