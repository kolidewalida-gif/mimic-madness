import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Mic,
  Settings as SettingsIcon,
  RefreshCw,
  User,
  Volume2,
  VolumeX,
  Music,
  X,
  Sparkles,
  Sliders,
} from "lucide-react";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useMicrophoneTest } from "@/hooks/useMicrophoneTest";
import { NoiseReductionToggle } from "@/components/NoiseReductionToggle";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarSettings } from "@/components/AvatarSettings";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

interface DeviceSettingsProps {
  onClose?: () => void;
  /** Removes the internal chrome when a parent modal already provides it. */
  embedded?: boolean;
  /** Kept for backward compatibility, no longer used (camera section removed) */
  showPreview?: boolean;
  playerId?: string;
  playerName?: string;
  lobbyId?: string;
}

const GRAFFITI_TEXT_SHADOW =
  "none";
const GRAFFITI_TEXT_SHADOW_SM =
  "none";

type Tab = "audio" | "volume" | "avatar";

export const DeviceSettings = ({
  onClose,
  embedded = false,
  playerId,
  playerName,
}: DeviceSettingsProps) => {
  const {
    audioInputs,
    selectedAudioId,
    isLoading,
    error,
    getMediaStream,
    stopStream,
    changeAudioInput,
    reloadDevices,
  } = useMediaDevices();

  const {
    isTesting: isMicTesting,
    audioLevel,
    noiseSuppressionEnabled,
    startTest: startMicTest,
    stopTest: stopMicTest,
    toggleNoiseSuppression,
  } = useMicrophoneTest({ selectedAudioId });

  const showAvatarTab = !!(playerId && playerName);
  const [activeTab, setActiveTab] = useState<Tab>("audio");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs: { id: Tab; label: string; description: string; icon: any; color: string }[] = [
    { id: "audio", label: "Audio", description: "Micro et test", icon: Mic, color: "var(--ink-accent)" },
    { id: "volume", label: "Volume", description: "Musique et effets", icon: Sliders, color: "#fbbf24" },
    ...(showAvatarTab
      ? [{ id: "avatar" as Tab, label: "Avatar", description: "Identité en jeu", icon: User, color: "var(--ink-text-dim)" }]
      : []),
  ];

  return (
    <div
      className={cn(
        "ink-device-settings relative flex min-h-0 flex-col",
        !embedded && "h-full max-h-full",
      )}
    >
      {/* HEADER */}
      {!embedded && (
        <div
          className="relative flex flex-shrink-0 items-center justify-between px-5 py-4"
        style={{
          background:
            "linear-gradient(180deg, var(--ink-accent-soft), var(--ink-accent-soft))",
          borderBottom: '1px solid var(--ink-line)',
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--ink-accent)",
              border: '1px solid var(--ink-line)',
              boxShadow:
                'none',
            }}
          >
            <SettingsIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <h3
              className="text-3xl font-black text-white leading-none"
              style={{
                fontFamily: "'Outfit', sans-serif",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Paramètres
            </h3>
            <p
              className="text-sm text-[var(--ink-accent-text)]/80 font-bold mt-0.5"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Audio · Volume{showAvatarTab ? " · Avatar" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={reloadDevices}
            disabled={isLoading}
            aria-label="Recharger les appareils"
            aria-busy={isLoading}
            className="menu-icon-control menu-focus w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{
              background: "var(--ink-accent-soft)",
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
            }}
            title="Recharger les appareils"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </motion.button>
          {onClose && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              aria-label="Fermer les paramètres"
              className="menu-icon-control menu-focus w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{
                background: "rgba(239,68,68,0.25)",
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
              title="Fermer (Esc)"
            >
              <X className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
            </motion.button>
          )}
        </div>
        </div>
      )}

      {/* TABS — graffiti pills */}
      <div
        className="ink-device-tabs custom-scrollbar relative flex flex-shrink-0 gap-1.5 overflow-x-auto px-2 py-2 sm:px-3 sm:py-2.5"
        style={{ borderBottom: '1px solid var(--ink-line)' }}
        role="tablist"
        aria-label="Catégories de réglages"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <motion.button
              ref={(element) => { tabRefs.current[index] = element; }}
              key={tab.id}
              id={`ink-device-tab-${tab.id}`}
              type="button"
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-controls={`ink-device-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let nextIndex: number | null = null;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = tabs.length - 1;
                if (nextIndex === null) return;
                event.preventDefault();
                setActiveTab(tabs[nextIndex].id);
                tabRefs.current[nextIndex]?.focus({ preventScroll: true });
              }}
              whileHover={{ scale: isActive ? 1 : 1.04, y: isActive ? 0 : -2 }}
              whileTap={{ scale: 0.96 }}
              animate={isActive ? { rotate: -2 } : { rotate: 0 }}
              aria-label={tab.label}
              className="ink-device-tab menu-focus relative flex min-h-[44px] min-w-[92px] flex-none items-center justify-center gap-1.5 rounded-2xl px-2 py-2 sm:min-w-0 sm:flex-1"
              style={{
                background: isActive
                  ? `linear-gradient(180deg, ${tab.color}, ${tab.color}cc)`
                  : "rgba(255,255,255,0.04)",
                border: '1px solid var(--ink-line)',
                boxShadow: isActive ? "0 0 0 rgba(0,0,0,0)" : "0 0 0 rgba(0,0,0,0)",
              }}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-white" : "text-white/60",
                )}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span className="ink-device-tab-copy">
                <strong
                  className={cn(
                    "whitespace-nowrap text-sm font-black leading-none sm:text-base",
                    isActive ? "text-white" : "text-white/60",
                  )}
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: isActive ? GRAFFITI_TEXT_SHADOW_SM : "none",
                  }}
                >
                  {tab.label}
                </strong>
                <small>{tab.description}</small>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* SCROLL ZONE */}
      <div
        className={cn(
          "ink-device-content relative p-3 sm:p-5",
          !embedded && "min-h-0 flex-1 overflow-y-auto custom-scrollbar",
        )}
      >
        <AnimatePresence mode="wait">
          {activeTab === "audio" && (
            <motion.div
              key="audio"
              id="ink-device-panel-audio"
              role="tabpanel"
              aria-labelledby="ink-device-tab-audio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AudioSection
                audioInputs={audioInputs}
                selectedAudioId={selectedAudioId}
                isLoading={isLoading}
                error={error}
                onGetMediaStream={getMediaStream}
                onStopStream={stopStream}
                onChangeAudioInput={changeAudioInput}
                isMicTesting={isMicTesting}
                audioLevel={audioLevel}
                noiseSuppressionEnabled={noiseSuppressionEnabled}
                onStartMicTest={startMicTest}
                onStopMicTest={stopMicTest}
                onToggleNoiseSuppression={toggleNoiseSuppression}
              />
            </motion.div>
          )}
          {activeTab === "volume" && (
            <motion.div
              key="volume"
              id="ink-device-panel-volume"
              role="tabpanel"
              aria-labelledby="ink-device-tab-volume"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <VolumeSection />
            </motion.div>
          )}
          {activeTab === "avatar" && showAvatarTab && (
            <motion.div
              key="avatar"
              id="ink-device-panel-avatar"
              role="tabpanel"
              aria-labelledby="ink-device-tab-avatar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl p-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <AvatarSettings playerId={playerId} playerName={playerName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER — close button */}
      {onClose && !embedded && (
        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--ink-line)' }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, rotate: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="menu-focus w-full py-3 rounded-2xl text-2xl font-black text-white"
            style={{
              background:
                "var(--ink-accent)",
              border: '1px solid var(--ink-line)',
              boxShadow:
                'none',
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            Fermer
          </motion.button>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   AUDIO SECTION
============================================================ */
interface AudioSectionProps {
  audioInputs: { deviceId: string; label: string }[];
  selectedAudioId: string;
  isLoading: boolean;
  error: string | null;
  onGetMediaStream: (
    constraints?: MediaStreamConstraints,
  ) => Promise<MediaStream | null>;
  onStopStream: () => void;
  onChangeAudioInput: (deviceId: string) => void;
  isMicTesting: boolean;
  audioLevel: number;
  noiseSuppressionEnabled: boolean;
  onStartMicTest: () => void;
  onStopMicTest: () => void;
  onToggleNoiseSuppression: () => void;
}

const AudioSection = ({
  audioInputs,
  selectedAudioId,
  isLoading,
  error,
  onGetMediaStream,
  onStopStream,
  onChangeAudioInput,
  isMicTesting,
  audioLevel,
  noiseSuppressionEnabled,
  onStartMicTest,
  onStopMicTest,
  onToggleNoiseSuppression,
}: AudioSectionProps) => (
  <div className="ink-device-audio space-y-4">
    {error && (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="ink-device-error rounded-2xl p-3"
        style={{
          background:
            "linear-gradient(180deg, rgba(239,68,68,0.18), rgba(127,29,29,0.05))",
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <p
          className="text-sm font-black text-red-300"
          style={{
            fontFamily: "'Outfit', sans-serif",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          ⚠️ {error}
        </p>
      </motion.div>
    )}

    {/* MICROPHONE SECTION */}
    <InkBetaSection
      icon={Mic}
      title="Microphone"
      accent="var(--ink-accent)"
      glow="var(--ink-accent-soft)"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-base font-bold text-white/80"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Choisis ton entrée audio
        </span>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05, rotate: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            await onGetMediaStream({ audio: true, video: false });
            onStopStream();
          }}
          disabled={isLoading}
          aria-busy={isLoading}
          className="ink-device-authorize menu-focus px-3 py-1.5 rounded-xl text-base font-black text-white disabled:opacity-50"
          style={{
            background: "var(--ink-accent)",
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
            fontFamily: "'Outfit', sans-serif",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          Autoriser
        </motion.button>
      </div>

      <div
        className="ink-device-well rounded-xl"
        style={{
          background: "rgba(0,0,0,0.4)",
          border: '1px solid var(--ink-line)',
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
        }}
      >
        <Select
          value={selectedAudioId}
          onValueChange={onChangeAudioInput}
          disabled={isLoading || audioInputs.length === 0}
        >
          <SelectTrigger className="ink-device-select-trigger border-0 bg-transparent text-white font-bold h-11">
            <SelectValue placeholder="Sélectionne un microphone" />
          </SelectTrigger>
          <SelectContent className="ink-device-select-popover">
            {audioInputs.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || "Microphone"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Noise suppression — Ink Beta toggle */}
      <button
        type="button"
        onClick={onToggleNoiseSuppression}
        aria-pressed={noiseSuppressionEnabled}
        className="ink-device-toggle menu-focus w-full flex items-center justify-between p-3 rounded-2xl"
        style={{
          background: noiseSuppressionEnabled
            ? "linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))"
            : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <div className="flex items-center gap-2">
          {noiseSuppressionEnabled ? (
            <VolumeX className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4 text-white/60" aria-hidden="true" />
          )}
          <span className="ink-device-filter-copy">
            <strong>Filtre navigateur</strong>
            <small>Réduction légère fournie par ton appareil</small>
          </span>
        </div>
        <InkBetaSwitch enabled={noiseSuppressionEnabled} />
      </button>

      {/* Mic test */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, rotate: -0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={isMicTesting ? onStopMicTest : onStartMicTest}
        disabled={!isMicTesting && (isLoading || !selectedAudioId)}
        aria-pressed={isMicTesting}
        className="ink-device-test menu-focus w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xl font-black text-white disabled:opacity-50"
        style={{
          background: isMicTesting
            ? "linear-gradient(180deg, #ef4444, #b91c1c)"
            : "linear-gradient(180deg, #fbbf24, #d97706)",
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
          fontFamily: "'Outfit', sans-serif",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
        }}
      >
        {isMicTesting ? (
          <>
            <VolumeX className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> Arrêter le test
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> Tester le micro
          </>
        )}
      </motion.button>

      {/* Audio level meter */}
      {isMicTesting && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div
            className="flex items-center gap-2 text-sm uppercase tracking-wider font-black"
            style={{
              color: "var(--ink-accent)",
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Niveau audio</span>
          </div>
          <div
            className="relative h-5 rounded-full overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.5)",
              border: '1px solid var(--ink-line)',
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="h-full transition-all duration-75 rounded-full"
              style={{
                width: `${audioLevel}%`,
                background:
                  audioLevel > 70
                    ? "linear-gradient(90deg, #fbbf24, #ef4444)"
                    : audioLevel > 40
                      ? "linear-gradient(90deg, #34d399, #fbbf24)"
                      : "linear-gradient(90deg, var(--ink-text-dim), #34d399)",
                boxShadow: audioLevel > 0 ? "0 0 8px currentColor" : "none",
              }}
            />
          </div>
          <p
            className="text-center text-sm font-bold text-white/70"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            🎤 Parle dans le micro pour voir le niveau
          </p>
        </motion.div>
      )}

      {/* Noise reduction toggle */}
      <div className="ink-device-rnnoise mt-4 flex items-center justify-between gap-3 rounded-2xl p-3"
        style={{
          background: 'linear-gradient(180deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))',
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
            Isolation avancée
          </p>
          <p className="text-xs text-white/55 font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Nettoyage local en temps réel avec RNNoise
          </p>
        </div>
        <NoiseReductionToggle showLabel={false} compact />
      </div>
    </InkBetaSection>

    {/* DEVICE INFO */}
    <div
      className="ink-device-count rounded-2xl p-3 text-base font-bold text-white/55"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      🎙️ {audioInputs.length} microphone{audioInputs.length > 1 ? "s" : ""}{" "}
      détecté{audioInputs.length > 1 ? "s" : ""}
    </div>
  </div>
);

/* ============================================================
   VOLUME SECTION
============================================================ */
const VolumeSection = () => {
  const { volume: musicVolume, setVolume: setMusicVolume } =
    useBackgroundMusic();
  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();

  return (
    <InkBetaSection
      icon={Sliders}
      title="Volumes"
      accent="#fbbf24"
      glow="rgba(251,191,36,0.5)"
    >
      {/* Music */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-lg font-black flex items-center gap-2 text-white"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <Music className="h-4 w-4 text-amber-300" />
            Musique
          </label>
          <span className="text-sm font-mono font-bold text-amber-200">
            {Math.round(musicVolume * 100)}%
          </span>
        </div>
        <Slider
          value={[musicVolume * 100]}
          onValueChange={(v) => setMusicVolume(v[0] / 100)}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* SFX */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-lg font-black flex items-center gap-2 text-white"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <Volume2 className="h-4 w-4 text-[var(--ink-text-dim)]" />
            Effets sonores
          </label>
          <span className="text-sm font-mono font-bold text-[var(--ink-text-dim)]">
            {Math.round(sfxVolume * 100)}%
          </span>
        </div>
        <Slider
          value={[sfxVolume * 100]}
          onValueChange={(v) => setSfxVolume(v[0] / 100)}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-2">
        <InkBetaPresetButton
          label="Mute"
          color="#6b7280"
          onClick={() => {
            setMusicVolume(0);
            setSfxVolume(0);
          }}
        />
        <InkBetaPresetButton
          label="Bas"
          color="var(--ink-accent)"
          onClick={() => {
            setMusicVolume(0.15);
            setSfxVolume(0.25);
          }}
        />
        <InkBetaPresetButton
          label="Moyen"
          color="var(--ink-text-dim)"
          onClick={() => {
            setMusicVolume(0.4);
            setSfxVolume(0.5);
          }}
        />
        <InkBetaPresetButton
          label="Fort"
          color="#ef4444"
          onClick={() => {
            setMusicVolume(0.8);
            setSfxVolume(0.8);
          }}
        />
      </div>
    </InkBetaSection>
  );
};

const InkBetaPresetButton = ({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.06, y: -2, rotate: -1 }}
    whileTap={{ scale: 0.94 }}
    onClick={onClick}
    className="ink-device-preset menu-focus flex-1 py-2 rounded-xl text-base font-black text-white"
    style={{
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
      fontFamily: "'Outfit', sans-serif",
      textShadow: GRAFFITI_TEXT_SHADOW_SM,
    }}
  >
    {label}
  </motion.button>
);

/* ============================================================
   InkBeta section wrapper
============================================================ */
const InkBetaSection = ({
  icon: Icon,
  title,
  accent,
  glow,
  children,
}: {
  icon: any;
  title: string;
  accent: string;
  glow: string;
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="ink-device-section relative rounded-2xl p-4 space-y-3"
    style={{
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      border: '1px solid var(--ink-line)',
      boxShadow: `0 0 0 rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0.06)`,
    }}
  >
    {/* Glow halo */}
    <div
      className="ink-device-section-halo absolute inset-0 pointer-events-none opacity-40 rounded-2xl"
      style={{
        background: `radial-gradient(circle at top, ${glow}, transparent 65%)`,
      }}
    />
    <Sparkles
      className="absolute -top-2 -right-2 w-4 h-4"
      style={{
        color: accent,
        filter: "none",
      }}
    />
    <header className="relative flex items-center gap-2">
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="ink-device-section-icon w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
      </motion.div>
      <span
        className="text-2xl font-black uppercase tracking-wider text-white leading-none"
        style={{
          fontFamily: "'Outfit', sans-serif",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
        }}
      >
        {title}
      </span>
    </header>
    <div className="relative space-y-3">{children}</div>
  </motion.section>
);

/* ============================================================
   InkBeta switch (visual only — controlled by parent button)
============================================================ */
const InkBetaSwitch = ({ enabled }: { enabled: boolean }) => (
  <span
    className="ink-device-switch relative inline-flex items-center w-12 h-7 rounded-full transition-colors"
    style={{
      background: enabled
        ? "linear-gradient(180deg, #34d399, #059669)"
        : "rgba(0,0,0,0.5)",
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
    }}
  >
    <span
      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
      style={{
        left: enabled ? "calc(100% - 22px)" : "2px",
        boxShadow: 'none',
      }}
    />
  </span>
);
