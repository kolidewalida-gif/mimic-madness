import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flame,
  Grid3x3,
  Hash,
  Heart,
  Loader2,
  Search,
  Sparkles,
  Trophy,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { useDialogBehaviour } from '@/components/menu/InkOverlay';
import { FeedTile } from '@/components/social/FeedTile';
import { PublicProfileView } from '@/components/social/PublicProfileView';
import { useAuth } from '@/hooks/useAuth';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { useSocialFeed, type SocialFeedTab, type SocialPost } from '@/hooks/useSocialFeed';
import { supabase } from '@/integrations/supabase/client';
import { weeklyPeriodKey } from '@/lib/questDefinitions';
import { computeSocialBadges } from '@/lib/socialBadges';
import { cn } from '@/lib/utils';

type View = 'foryou' | 'trending' | 'profile';

const VIEW_TO_TAB: Record<View, SocialFeedTab> = {
  foryou: 'recent',
  trending: 'top_week',
  profile: 'mine',
};

interface SocialNavItem {
  id: View;
  label: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  color: string;
}

const NAV: SocialNavItem[] = [
  { id: 'foryou', label: 'Pour toi', description: 'Les dernières créations, une par une', eyebrow: 'Sélection communauté', icon: Sparkles, color: '#2df2d0' },
  { id: 'trending', label: 'Tendances', description: 'Le classement de la semaine', eyebrow: 'Top de la semaine', icon: Flame, color: '#ff6b8a' },
  { id: 'profile', label: 'Mon profil', description: 'Tes publications et tes badges', eyebrow: 'Ton espace créateur', icon: UserRound, color: '#b497ff' },
];

interface UserResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const readStoredNumber = (key: string, fallback: number) => {
  try {
    const value = Number.parseFloat(localStorage.getItem(key) || '');
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  } catch {
    return fallback;
  }
};

const readStoredBoolean = (key: string, fallback: boolean) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
};

const SocialExperienceComponent = () => {
  const { user, profile, friendCode } = useAuth();
  const { level, progressPercent } = usePlayerLevel();
  const [view, setView] = useState<View>('foryou');
  const { posts, loading, error, toggleLike, remove } = useSocialFeed(VIEW_TO_TAB[view]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({ posts: 0, likes: 0, top: false });
  const [profileUser, setProfileUser] = useState<{ id: string; name: string } | null>(null);
  const [soundId, setSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState(() => readStoredNumber('feedVolume', 0.7));
  const [muted, setMuted] = useState(() => readStoredBoolean('feedMuted', true));
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const closeProfile = useCallback(() => setProfileUser(null), []);

  const setPersistentVolume = useCallback((next: number) => {
    const safe = Math.max(0, Math.min(1, next));
    setVolume(safe);
    try { localStorage.setItem('feedVolume', String(safe)); } catch { /* stockage optionnel */ }
  }, []);

  const setPersistentMuted = useCallback((next: boolean) => {
    setMuted(next);
    try { localStorage.setItem('feedMuted', String(next)); } catch { /* stockage optionnel */ }
  }, []);

  const toggleSound = (id: string) => {
    setSoundId((previous) => previous === id ? null : id);
  };

  const openViewer = (index: number) => {
    setSoundId(null);
    setViewerIndex(index);
  };

  useEffect(() => {
    setSoundId(null);
    setViewerIndex(null);
  }, [view]);

  useEffect(() => {
    if (!user) {
      setMyStats({ posts: 0, likes: 0, top: false });
      return;
    }

    let cancelled = false;
    const weekKey = weeklyPeriodKey();
    void Promise.all([
      supabase.from('social_posts').select('likes_count').eq('owner_id', user.id).eq('is_hidden', false),
      supabase.from('social_posts').select('owner_id').eq('week_key', weekKey).eq('is_hidden', false).order('likes_count', { ascending: false }).limit(1),
    ]).then(([statsResult, topResult]) => {
      if (cancelled) return;
      const ownPosts = statsResult.data ?? [];
      const topOwner = topResult.data?.[0]?.owner_id;
      setMyStats({
        posts: ownPosts.length,
        likes: ownPosts.reduce((sum, post) => sum + (post.likes_count || 0), 0),
        top: topOwner === user.id,
      });
    });

    return () => { cancelled = true; };
  }, [posts, user]);

  useEffect(() => {
    const query = search.trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (view !== 'foryou' || query.length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }

    setSearchingUsers(true);
    let cancelled = false;
    searchTimer.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .limit(8);
      if (!cancelled) {
        setUserResults((data ?? []) as UserResult[]);
        setSearchingUsers(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [search, view]);

  const displayName = profile?.display_name || 'Toi';
  const initial = displayName.charAt(0).toUpperCase();
  const myBadges = useMemo(
    () => computeSocialBadges({ postsCount: myStats.posts, totalLikes: myStats.likes, isTopWeek: myStats.top }),
    [myStats],
  );
  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => (
      post.owner_name?.toLowerCase().includes(query)
      || post.caption?.toLowerCase().includes(query)
    ));
  }, [posts, search]);
  const activeView = NAV.find((item) => item.id === view) ?? NAV[0];
  const ActiveViewIcon = activeView.icon;
  const searchPlaceholder = view === 'profile'
    ? 'Dans tes créations…'
    : view === 'trending'
      ? 'Dans le classement…'
      : 'Créateur ou légende…';
  const emptyCopy = useMemo(() => {
    if (view === 'profile') return { emoji: '📭', title: 'Aucune création', sub: 'Partage tes meilleurs moments après une partie.' };
    if (view === 'trending') return { emoji: '🔥', title: 'Le classement arrive', sub: 'Les créations les plus aimées apparaîtront ici.' };
    return { emoji: '✨', title: 'Le studio est calme', sub: 'Sois le premier à publier une imitation.' };
  }, [view]);
  const viewerOpen = viewerIndex !== null && Boolean(filteredPosts[viewerIndex]);
  const isViewerTopLayer = useCallback(() => (
    typeof document === 'undefined' || document.querySelector('.ik-game-invite-layer') === null
  ), []);
  const viewerDialogRef = useDialogBehaviour(viewerOpen, closeViewer, isViewerTopLayer);
  useBodyScrollLock(viewerOpen);

  const openProfile = useCallback((id: string, name: string) => {
    playInkSound('cartoonPop', 0.3);
    setSoundId(null);
    closeViewer();
    setProfileUser({ id, name });
    setUserResults([]);
  }, [closeViewer]);

  const openProfileFromViewer = useCallback((selectedPost: SocialPost) => {
    openProfile(selectedPost.owner_id, selectedPost.owner_name);
  }, [openProfile]);

  return (
    <div className="social-experience social-experience--hub">
      <header className="social-commandbar">
        <div className="social-commandbar-primary">
          <button
            type="button"
            onClick={() => user && openProfile(user.id, displayName)}
            disabled={!user}
            className="social-profile-card menu-focus"
            aria-label={user ? 'Ouvrir mon profil social public' : 'Connecte-toi pour ouvrir ton profil social'}
          >
            <span className="social-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> : <span>{initial}</span>}
              <small>{level}</small>
            </span>
            <span className="social-profile-copy">
              <small>Ton profil</small>
              <strong>{displayName}</strong>
              {friendCode && <em><Hash aria-hidden="true" /> {friendCode}</em>}
            </span>
            <span className="social-profile-progress" aria-label={`Progression de niveau ${Math.round(progressPercent)} %`}>
              <i style={{ width: `${progressPercent}%` }} />
            </span>
          </button>

          <nav className="social-nav" aria-label="Navigation Social" role="tablist">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  id={`social-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`social-panel-${item.id}`}
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setView(item.id);
                  }}
                  className={cn('social-nav-item menu-focus', active && 'is-active')}
                  style={{ '--social-accent': item.color } as CSSProperties}
                >
                  <span><Icon aria-hidden="true" /></span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                </button>
              );
            })}
          </nav>

          {view === 'profile' && (
            <div className="social-quick-stats" aria-label="Statistiques de mon profil social">
              <span><Grid3x3 aria-hidden="true" /><strong>{myStats.posts}</strong><small>posts</small></span>
              <span><Heart aria-hidden="true" /><strong>{myStats.likes}</strong><small>likes</small></span>
              {myStats.top && <span className="is-top"><Trophy aria-hidden="true" /><strong>Top</strong><small>semaine</small></span>}
            </div>
          )}
        </div>

        <div className="social-commandbar-secondary">
          <div className="social-context-heading" style={{ '--social-accent': activeView.color } as CSSProperties}>
            <span><ActiveViewIcon aria-hidden="true" /></span>
            <div><small>{activeView.eyebrow}</small><strong>{activeView.label}</strong><p>{activeView.description}</p></div>
          </div>

          <div className="social-context-tools">
            {view === 'profile' && (
              <div className="social-badges" aria-label="Badges sociaux">
                {myBadges.map((badge) => (
                  <span
                    key={badge.id}
                    title={badge.description}
                    className={cn(!badge.unlocked && 'is-locked')}
                    style={{ '--badge-color': badge.color } as CSSProperties}
                  >
                    <i>{badge.emoji}</i><small>{badge.label}</small>
                  </span>
                ))}
              </div>
            )}

            <div className="social-search-wrap">
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Rechercher dans ${activeView.label}`}
                role={view === 'foryou' ? 'combobox' : 'searchbox'}
                aria-autocomplete={view === 'foryou' ? 'list' : undefined}
                aria-expanded={view === 'foryou' ? search.trim().length >= 2 && (searchingUsers || userResults.length > 0) : undefined}
                aria-controls={view === 'foryou' ? 'social-global-search-results' : undefined}
              />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche"><X aria-hidden="true" /></button>}
              {view === 'foryou' && search.trim().length >= 2 && (searchingUsers || userResults.length > 0) && (
                <div id="social-global-search-results" className="social-search-results" role="listbox" aria-label="Profils trouvés">
                  {searchingUsers ? (
                    <span className="social-search-loading" role="status"><Loader2 className="animate-spin" aria-hidden="true" /> Recherche…</span>
                  ) : userResults.map((result) => (
                    <button key={result.user_id} type="button" role="option" aria-selected="false" onClick={() => openProfile(result.user_id, result.display_name || 'Joueur')}>
                      <span>{result.avatar_url ? <img src={result.avatar_url} alt="" /> : (result.display_name || '?').charAt(0).toUpperCase()}</span>
                      <span><strong>{result.display_name || 'Joueur'}</strong><small>Voir le profil</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section
        id={`social-panel-${view}`}
        className={cn('social-feed-column', view === 'foryou' && 'social-feed-column--foryou')}
        role="tabpanel"
        aria-labelledby={`social-tab-${view}`}
      >
        <div className={cn('social-feed-scroll custom-scrollbar', view === 'foryou' && 'social-feed-scroll--foryou')}>
          {loading ? (
            <div className="social-loading"><Loader2 className="animate-spin" aria-hidden="true" /><span>Chargement des créations…</span></div>
          ) : error ? (
            <div className="social-empty"><span aria-hidden="true">⚠️</span><h4>Le feed ne répond pas</h4><p>{error}</p></div>
          ) : filteredPosts.length === 0 ? (
            <div className="social-empty">
              <span aria-hidden="true">{search.trim() ? '🔎' : emptyCopy.emoji}</span>
              <h4>{search.trim() ? 'Aucun résultat' : emptyCopy.title}</h4>
              <p>{search.trim() ? 'Essaie un autre joueur ou mot-clé.' : emptyCopy.sub}</p>
            </div>
          ) : view === 'foryou' ? (
            !profileUser && (
              <div className="social-foryou-stage">
                <SocialTikTokViewer
                  embedded
                  posts={filteredPosts}
                  startIndex={0}
                  onClose={() => undefined}
                  onLike={toggleLike}
                  onDelete={remove}
                  onOpenProfile={openProfileFromViewer}
                  audioVolume={volume}
                  audioMuted={muted}
                  onAudioVolumeChange={setPersistentVolume}
                  onAudioMutedChange={setPersistentMuted}
                />
              </div>
            )
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
                    onVolume={setPersistentVolume}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewerIndex !== null && filteredPosts[viewerIndex] && (
            <motion.div
              ref={viewerDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Lecteur Social"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="social-viewer-overlay social-viewer-overlay--modern force-cursor"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeViewer();
              }}
            >
              <SocialTikTokViewer
                posts={filteredPosts}
                startIndex={viewerIndex}
                onClose={closeViewer}
                onLike={toggleLike}
                onDelete={remove}
                onOpenProfile={openProfileFromViewer}
                audioVolume={volume}
                audioMuted={muted}
                onAudioVolumeChange={setPersistentVolume}
                onAudioMutedChange={setPersistentMuted}
                isKeyboardActive={isViewerTopLayer}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <AnimatePresence>
        {profileUser && (
          <PublicProfileView
            userId={profileUser.id}
            fallbackName={profileUser.name}
            onClose={closeProfile}
            onLike={toggleLike}
            audioVolume={volume}
            audioMuted={muted}
            onAudioVolumeChange={setPersistentVolume}
            onAudioMutedChange={setPersistentMuted}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export const SocialExperience = memo(SocialExperienceComponent);
