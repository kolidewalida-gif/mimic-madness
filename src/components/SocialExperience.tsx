import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, UserRound, Heart, Loader2, Grid3x3, Hash, Search, X } from 'lucide-react';
import { useSocialFeed, type SocialFeedTab } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { supabase } from '@/integrations/supabase/client';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { FeedTile } from '@/components/social/FeedTile';
import { PublicProfileView } from '@/components/social/PublicProfileView';
import { computeSocialBadges } from '@/lib/socialBadges';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

type View = 'foryou' | 'trending' | 'profile';

const VIEW_TO_TAB: Record<View, SocialFeedTab> = {
  foryou: 'recent',
  trending: 'top_week',
  profile: 'mine',
};

const NAV: { id: View; label: string; description: string; icon: any; color: string }[] = [
  { id: 'foryou', label: 'Pour toi', description: 'Les dernières créations', icon: Sparkles, color: 'var(--ink-accent)' },
  { id: 'trending', label: 'Tendances', description: 'Le top de la semaine', icon: Flame, color: '#ff6b8a' },
  { id: 'profile', label: 'Mon profil', description: 'Tes posts et badges', icon: UserRound, color: 'var(--ink-text-dim)' },
];

interface UserResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const SocialExperienceComponent = () => {
  const { user, profile, friendCode } = useAuth();
  const { level, progressPercent } = usePlayerLevel();
  const [view, setView] = useState<View>('foryou');
  const { posts, loading, toggleLike, remove } = useSocialFeed(VIEW_TO_TAB[view]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({ posts: 0, likes: 0, top: false });
  const [profileUser, setProfileUser] = useState<{ id: string; name: string } | null>(null);


  const [soundId, setSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    const stored = parseFloat(localStorage.getItem('feedVolume') || '0.7');
    return Number.isNaN(stored) ? 0.7 : stored;
  });
  const setVol = (next: number) => {
    setVolume(next);
    try { localStorage.setItem('feedVolume', String(next)); } catch { /* noop */ }
  };
  const toggleSound = (id: string) => setSoundId((previous) => previous === id ? null : id);
  const openViewer = (index: number) => { setSoundId(null); setViewerIndex(index); };
  useEffect(() => { setSoundId(null); }, [view]);

  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from('social_posts').select('likes_count').eq('owner_id', user.id).eq('is_hidden', false)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMyStats((current) => ({ ...current, posts: data.length, likes: data.reduce((sum, post: any) => sum + (post.likes_count || 0), 0) }));
      });
    return () => { cancelled = true; };
  }, [user, posts]);

  useEffect(() => {
    if (!search.trim()) { setUserResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${search.trim()}%`).limit(8);
      setUserResults((data ?? []) as UserResult[]);
    }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const displayName = profile?.display_name || 'Toi';
  const initial = displayName.charAt(0).toUpperCase();
  const myBadges = useMemo(
    () => computeSocialBadges({ postsCount: myStats.posts, totalLikes: myStats.likes, isTopWeek: myStats.top }),
    [myStats],
  );
  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => post.owner_name?.toLowerCase().includes(query) || post.caption?.toLowerCase().includes(query));
  }, [posts, search]);
  const activeView = NAV.find((item) => item.id === view) ?? NAV[0];
  const emptyCopy = useMemo(() => {
    if (view === 'profile') return { emoji: '📭', title: 'Aucune création', sub: 'Partage tes meilleurs moments après une partie.' };
    if (view === 'trending') return { emoji: '🔥', title: 'Le classement arrive', sub: 'Les créations les plus aimées apparaîtront ici.' };
    return { emoji: '✨', title: 'Le studio est calme', sub: 'Sois le premier à publier une imitation.' };
  }, [view]);

  const openProfile = (id: string, name: string) => {
    playInkSound('cartoonPop', 0.3);
    setProfileUser({ id, name });
  };

  return (
    <div className="social-experience">

      <aside className="social-sidebar">
        <button type="button" onClick={() => user && openProfile(user.id, displayName)} className="social-profile-card menu-focus">
          <span className="social-avatar">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> : <span>{initial}</span>}
            <small>{level}</small>
          </span>
          <span className="min-w-0 flex-1 text-left">
            <strong className="block truncate">{displayName}</strong>
            {friendCode && <small className="flex items-center gap-1"><Hash aria-hidden="true" /> {friendCode}</small>}
          </span>
        </button>

        <div className="social-xp" aria-label={`Niveau ${level}, progression ${Math.round(progressPercent)}%`}>
          <div><span>NIVEAU {level}</span><span>{Math.round(progressPercent)}%</span></div>
          <span><i style={{ width: `${progressPercent}%` }} /></span>
        </div>

        <div className="social-stats">
          <Stat icon={Grid3x3} value={myStats.posts} label="posts" />
          <Stat icon={Heart} value={myStats.likes} label="likes" />
        </div>

        <nav className="social-nav" aria-label="Navigation Social">
          <span className="social-nav-label">EXPLORER</span>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} type="button" onClick={() => { playInkSound('cartoonPop', 0.3); setView(item.id); }}
                className={cn('social-nav-item menu-focus', active && 'is-active')} style={{ '--social-accent': item.color } as CSSProperties} aria-current={active ? 'page' : undefined}>
                <span><Icon aria-hidden="true" /></span>
                <span className="min-w-0"><strong>{item.label}</strong><small>{item.description}</small></span>
              </button>
            );
          })}
        </nav>

        {view === 'profile' && (
          <div className="social-badges">
            <span className="social-nav-label">BADGES</span>
            <div>
              {myBadges.map((badge) => (
                <span key={badge.id} title={badge.description} className={cn(!badge.unlocked && 'is-locked')}
                  style={{ '--badge-color': badge.color } as CSSProperties}>{badge.emoji}<small>{badge.label}</small></span>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="social-feed-column">
        <header className="social-feed-toolbar">
          <div>
            <span className="social-feed-kicker">{view === 'trending' ? 'CLASSEMENT LIVE' : view === 'profile' ? 'TON ESPACE' : 'SÉLECTION COMMUNAUTÉ'}</span>
            <h3>{activeView.label}</h3>
            <p>{activeView.description}</p>
          </div>
          <div className="social-search-wrap">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Joueur, légende…" aria-label="Rechercher dans Social" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche"><X /></button>}
            {search.trim() && userResults.length > 0 && (
              <div className="social-search-results">
                {userResults.map((result) => (
                  <button key={result.user_id} type="button" onClick={() => openProfile(result.user_id, result.display_name || 'Joueur')}>
                    <span>{result.avatar_url ? <img src={result.avatar_url} alt="" /> : (result.display_name || '?').charAt(0).toUpperCase()}</span>
                    <span><strong>{result.display_name || 'Joueur'}</strong><small>Voir le profil</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="social-feed-scroll custom-scrollbar">

          {loading ? (
            <div className="social-loading"><Loader2 className="animate-spin" /><span>Chargement du studio…</span></div>
          ) : filteredPosts.length === 0 ? (
            <div className="social-empty">
              <span aria-hidden="true">{search.trim() ? '🔎' : emptyCopy.emoji}</span>
              <h4>{search.trim() ? 'Aucun résultat' : emptyCopy.title}</h4>
              <p>{search.trim() ? 'Essaie un autre joueur ou mot-clé.' : emptyCopy.sub}</p>
            </div>
          ) : view === 'foryou' ? (
            <div className="social-foryou-stage">
              <SocialTikTokViewer embedded posts={filteredPosts} startIndex={0} onClose={() => undefined} onLike={toggleLike} onDelete={remove} />
            </div>
          ) : (
            <div className={cn('social-post-grid', view === 'profile' && 'social-post-grid--profile')}>
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post, index) => (
                  <FeedTile
                    key={post.id}
                    post={post}
                    square={view === 'profile'}
                    rank={view === 'trending' && !search.trim() ? index + 1 : undefined}
                    onOpen={() => openViewer(index)}
                    onLike={toggleLike}
                    onDelete={remove}
                    onOpenProfile={view !== 'profile' ? (selected) => openProfile(selected.owner_id, selected.owner_name) : undefined}
                    isOwner={user?.id === post.owner_id}
                    soundActive={soundId === post.id}
                    volume={volume}
                    onToggleSound={() => toggleSound(post.id)}
                    onVolume={setVol}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewerIndex !== null && filteredPosts[viewerIndex] && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="social-viewer-overlay force-cursor"
              onClick={(event) => { if (event.target === event.currentTarget) setViewerIndex(null); }}>
              <SocialTikTokViewer posts={filteredPosts} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onLike={toggleLike} onDelete={remove} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <AnimatePresence>
        {profileUser && (
          <PublicProfileView userId={profileUser.id} fallbackName={profileUser.name} onClose={() => setProfileUser(null)} onLike={toggleLike} />
        )}
      </AnimatePresence>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon: any; value: number; label: string }) => (
  <div className="social-stat">
    <Icon aria-hidden="true" />
    <span><strong>{value}</strong><small>{label}</small></span>
  </div>
);

export const SocialExperience = memo(SocialExperienceComponent);