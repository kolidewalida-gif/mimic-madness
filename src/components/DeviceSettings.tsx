import { useId, useRef, useState, type ElementType } from 'react';
import { Check, ChevronRight, Headphones, Mic, MicOff, Moon, Music2, Palette, RefreshCw, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Sun, UserRound, Volume2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { useMicrophoneTest } from '@/hooks/useMicrophoneTest';
import { useNoiseReduction } from '@/hooks/useNoiseReduction';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';
import { useTheme } from '@/hooks/useTheme';
import { AvatarSettings } from '@/components/AvatarSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';
import styles from '@/components/settings/BubbleSettings.module.css';

interface DeviceSettingsProps {
  onClose?: () => void;
  embedded?: boolean;
  showPreview?: boolean;
  playerId?: string;
  playerName?: string;
  lobbyId?: string;
}
type Tab = 'audio' | 'volume' | 'theme' | 'avatar';
const TABS: { id: Tab; label: string; copy: string; icon: ElementType }[] = [
  { id: 'audio', label: 'Micro', copy: 'Ta voix', icon: Mic },
  { id: 'volume', label: 'Son', copy: 'Le bon mix', icon: Headphones },
  { id: 'theme', label: 'Ambiance', copy: 'Jour ou nuit', icon: Palette },
  { id: 'avatar', label: 'Avatar', copy: 'C’est toi !', icon: UserRound },
];

export const BubbleToggle = ({ label, copy, enabled, onClick, disabled = false, icon: Icon = ShieldCheck }: {
  label: string; copy: string; enabled: boolean; onClick: () => void; disabled?: boolean; icon?: ElementType;
}) => (
  <button type="button" role="switch" aria-checked={enabled} aria-label={label} disabled={disabled}
    onClick={onClick} className={styles.toggle}>
    <span className={styles.toggleIcon}><Icon aria-hidden="true" /></span>
    <span className={styles.toggleCopy}><strong>{label}</strong><small>{copy}</small></span>
    <span className={cn(styles.switch, enabled && styles.switchOn)} aria-hidden="true"><i /></span>
  </button>
);

const AudioSettings = () => {
  const devices = useMediaDevices({ requestPermissionOnMount: false });
  const test = useMicrophoneTest({ selectedAudioId: devices.selectedAudioId });
  const noise = useNoiseReduction();
  const id = useId();
  const level = Math.max(0, Math.min(100, test.audioLevel));
  return (
    <div className={styles.audioLayout}>
      <section className={cn(styles.card, styles.micStage)}>
        <span className={styles.kicker}>Un, deux… tu m’entends ?</span>
        <div className={cn(styles.micOrb, test.isTesting && styles.isTesting)}>
          {test.isTesting ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
          <span className={styles.orbSpark} aria-hidden="true">✦</span>
        </div>
        <h3>Ta voix au premier plan.</h3>
        <p>{test.isTesting ? 'Parle : tu entends ton retour et le niveau bouge.' : 'Teste ton micro avant de rejoindre la bande.'}</p>
        <div className={styles.meter} role="meter" aria-label="Niveau du microphone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level)}>
          {Array.from({ length: 18 }, (_, i) => <i key={i} className={test.isTesting && level > i * 100 / 18 ? styles.litBar : undefined} />)}
        </div>
        <button type="button" className={cn(styles.primary, test.isTesting && styles.stop)}
          onClick={() => test.isTesting ? test.stopTest() : void test.startTest()}
          disabled={test.isStarting || (!test.isTesting && (devices.isLoading || !devices.selectedAudioId))}
          aria-busy={test.isStarting}
          aria-pressed={test.isTesting}>
          {test.isTesting ? <MicOff /> : <Mic />}{test.isStarting ? 'Connexion au micro…' : test.isTesting ? 'Arrêter le test' : 'Tester mon micro'}
        </button>
        <small className={styles.note}>Casque conseillé pour éviter l’écho.</small>
        {test.error && <p className={styles.error} role="alert">{test.error}</p>}
      </section>
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.cardHeading}><span className={styles.iconBubble}><Mic /></span><div><h3>Ton microphone</h3><p>Choisis celui que tu veux utiliser.</p></div></div>
          <label className="sr-only" htmlFor={id}>Entrée audio</label>
          <Select value={devices.selectedAudioId || undefined} disabled={devices.isLoading || !devices.audioInputs.length}
            onValueChange={(value) => { test.stopTest(); void devices.changeAudioInput(value); }}>
            <SelectTrigger id={id} className={styles.deviceSelect}><SelectValue placeholder={devices.isLoading ? 'Recherche des micros…' : 'Aucun micro disponible'} /></SelectTrigger>
            <SelectContent className={styles.devicePopover}>{devices.audioInputs.filter(device => device.deviceId).map(device => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || 'Microphone'}</SelectItem>)}</SelectContent>
          </Select>
          <div className={styles.deviceActions}>
            <span className={styles.note}>{devices.audioInputs.length} micro{devices.audioInputs.length > 1 ? 's' : ''} détecté{devices.audioInputs.length > 1 ? 's' : ''}</span>
            <button type="button" className={styles.secondary} onClick={() => { test.stopTest(); void devices.reloadDevices(); }} disabled={devices.isLoading}>
              <RefreshCw className={devices.isLoading ? styles.spinning : undefined} />{devices.audioInputs.length ? 'Actualiser / autoriser' : 'Autoriser le micro'}
            </button>
          </div>
          {devices.error && <p className={styles.error} role="alert">{devices.error}</p>}
          <div className={styles.filterHeading}><ShieldCheck aria-hidden="true" /><strong>Moins de bruit, plus de toi.</strong></div>
          <BubbleToggle label="Filtre du navigateur" copy="Atténue les petits bruits pendant le test micro."
            enabled={test.noiseSuppressionEnabled} onClick={test.toggleNoiseSuppression} />
          <BubbleToggle label="Isolation avancée" copy={noise.error ? 'Indisponible sur cet appareil.' : !noise.isReady ? 'Préparation du filtre…' : 'RNNoise · traitement local, sans envoi de ta voix.'}
            enabled={noise.isEnabled} disabled={!noise.isReady || !!noise.error} onClick={noise.toggle} icon={Sparkles} />
        </section>
      </div>
    </div>
  );
};

const PRESETS = [
  { label: 'Silence', emoji: '🤫', music: 0, sfx: 0 },
  { label: 'Discret', emoji: '🌙', music: .15, sfx: .25 },
  { label: 'Équilibré', emoji: '🎧', music: .4, sfx: .5 },
  { label: 'Fête', emoji: '🎉', music: .8, sfx: .8 },
];
const VolumeSettings = () => {
  const music = useBackgroundMusic();
  const effects = useSoundEffectsVolume();
  const { autoMode, setAutoMode } = music;
  return (
    <div className={styles.stack}>
      <div className={styles.volumeGrid}>
        {[{ label: 'Musique', copy: 'La bande-son du menu et des parties.', icon: Music2, value: music.volume, set: music.setVolume, color: styles.yellow },
          { label: 'Effets sonores', copy: 'Clics, transitions et moments de jeu.', icon: Volume2, value: effects.volume, set: effects.setVolume, color: styles.mint }].map(({ label, copy, icon: Icon, value, set, color }) => (
          <section key={label} className={cn(styles.card, styles.volumeCard)}>
            <div className={cn(styles.soundOrb, color)}><Icon aria-hidden="true" /></div>
            <div className={styles.volumeHeading}><h3>{label}</h3><output>{Math.round(value * 100)}<small>%</small></output></div>
            <p>{copy}</p>
            <input className={styles.range} type="range" min={0} max={100} step={1} value={Math.round(value * 100)}
              onChange={e => set(Number(e.target.value) / 100)} aria-label={label} aria-valuetext={Math.round(value * 100) + ' %'} />
            <div className={styles.rangeLabels}><span>Silence</span><span>À fond</span></div>
          </section>
        ))}
      </div>
      <section className={styles.card}>
        <div className={styles.cardHeading}><span className={styles.iconBubble}><SlidersHorizontal /></span><div><h3>Ton mix en un clic</h3><p>Choisis un point de départ, puis ajuste à ton goût.</p></div></div>
        <div className={styles.presets}>{PRESETS.map(preset => <button type="button" key={preset.label}
          aria-pressed={Math.abs(music.volume - preset.music) < .005 && Math.abs(effects.volume - preset.sfx) < .005}
          onClick={() => { music.setVolume(preset.music); effects.setVolume(preset.sfx); }}
          className={styles.preset}><span aria-hidden="true">{preset.emoji}</span><strong>{preset.label}</strong></button>)}</div>
        <div className={styles.filterHeading}><Sparkles aria-hidden="true" /><strong>Et pendant la partie ?</strong></div>
        <BubbleToggle label="Musique adaptative" copy="Laisse le jeu choisir la piste selon le moment." icon={Sparkles} enabled={autoMode} onClick={() => setAutoMode(!autoMode)} />
        <p className={styles.note}>Pendant le blindtest, seule la musique à deviner est jouée.</p>
      </section>
    </div>
  );
};

const ThemeSettings = () => {
  const { inkbetaDark, setInkbetaDark } = useTheme();
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}><span className={cn(styles.iconBubble, styles.yellow)}><Palette /></span><div><h3>Quelle ambiance ce soir ?</h3><p>La même bulle, deux façons de la vivre.</p></div></div>
      <div className={styles.themeGrid}>
        {[{ dark: false, label: 'Bubble Pop', copy: 'Lumineux, doux et vitaminé.', icon: Sun },
          { dark: true, label: 'Bubble Night', copy: 'Prune profond, reflets et douceur.', icon: Moon }].map(({ dark, label, copy, icon: Icon }) => (
          <label className={styles.themeChoice} key={label}>
            <input type="radio" name="bubble-ambiance" value={dark ? 'dark' : 'light'} checked={inkbetaDark === dark} onChange={() => setInkbetaDark(dark)} />
            <span className={cn(styles.themePreview, dark && styles.nightPreview)} aria-hidden="true">
              <i /><i /><i /><span className={styles.previewMenu}><b /><em /><em /></span>
              <span className={styles.previewBadge}><Icon /></span>
            </span>
            <span className={styles.themeCopy}><span><strong>{label}</strong><small>{copy}</small></span><span className={styles.themeCheck}><Check /></span></span>
          </label>
        ))}
      </div>
      <p className={styles.note}>Ton choix est appliqué immédiatement et conservé sur cet appareil.</p>
    </section>
  );
};

export const DeviceSettings = ({ onClose, embedded = false, playerId, playerName }: DeviceSettingsProps) => {
  const [tab, setTab] = useState<Tab>('audio');
  const reduced = useReducedMotion();
  const prefix = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabs = TABS.filter(item => item.id !== 'avatar' || !!(playerId && playerName));
  const selectTab = (next: Tab) => {
    if (next !== tab) playInkSound('cartoonPop', .18);
    setTab(next);
    const scrollArea = rootRef.current?.closest('.ik-hub-content') || (!embedded ? rootRef.current : null);
    scrollArea?.scrollTo({ top: 0 });
  };
  return (
    <div ref={rootRef} className={cn(styles.root, !embedded && styles.standalone)}>
      <header className={styles.hero}>
        <span className={styles.heroBubble}><Settings aria-hidden="true" /></span>
        <div><span className={styles.kicker}>Ton petit poste de contrôle</span><h2>À ta façon.</h2><p>Le son, le style… tout se règle ici.</p></div>
        <span className={styles.saved}><Check />Appliqué en direct</span>
        {onClose && !embedded && <button className={styles.close} type="button" onClick={onClose} aria-label="Fermer les paramètres"><X /></button>}
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Catégories de réglages">
        {tabs.map(({ id, label, copy, icon: Icon }, index) => <button key={id} ref={el => { refs.current[index] = el; }}
          type="button" role="tab" id={prefix + '-tab-' + id} aria-controls={prefix + '-panel-' + id}
          tabIndex={tab === id ? 0 : -1} aria-selected={tab === id}
          className={cn(styles.tab, tab === id && styles.activeTab)} onClick={() => selectTab(id)}
          onKeyDown={event => {
            let next = index;
            if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
            else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault(); selectTab(tabs[next].id); refs.current[next]?.focus();
          }}>
          <span className={styles.tabIcon}><Icon /></span><span><strong>{label}</strong><small>{copy}</small></span><ChevronRight className={styles.tabArrow} />
        </button>)}
      </div>
      <motion.div key={tab} id={prefix + '-panel-' + tab} role="tabpanel" aria-labelledby={prefix + '-tab-' + tab}
        className={styles.panel} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: [.16, 1, .3, 1] }}>
        {tab === 'audio' && <AudioSettings />}
        {tab === 'volume' && <VolumeSettings />}
        {tab === 'theme' && <ThemeSettings />}
        {tab === 'avatar' && playerId && playerName && <AvatarSettings playerId={playerId} playerName={playerName} />}
      </motion.div>
    </div>
  );
};
