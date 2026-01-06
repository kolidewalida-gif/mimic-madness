import { useCallback, useRef } from 'react';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

export type SoundTypeV2 = 
  // Core UI
  | 'uiClick' | 'uiClickSoft' | 'uiClickHard' | 'uiClickGlass' | 'uiClickCrystal'
  | 'uiHover' | 'uiHoverSoft' | 'uiHoverGlow' | 'uiHoverMagic' | 'uiHoverElectric'
  | 'uiFocus' | 'uiBlur' | 'uiSelect' | 'uiDeselect'
  | 'uiToggleOn' | 'uiToggleOff' | 'uiSwitch' | 'uiSlider'
  | 'uiOpen' | 'uiClose' | 'uiExpand' | 'uiCollapse'
  | 'uiTab' | 'uiPage' | 'uiScroll' | 'uiDrag' | 'uiDrop'
  // Notifications
  | 'notifySuccess' | 'notifyError' | 'notifyWarning' | 'notifyInfo'
  | 'notifyChime' | 'notifyBell' | 'notifyPing' | 'notifyPop'
  | 'notifyMagic' | 'notifyCosmic' | 'notifyDigital'
  // Game specific
  | 'gameStart' | 'gameEnd' | 'gameWin' | 'gameLose'
  | 'gameCorrect' | 'gameWrong' | 'gameBonus' | 'gameCombo'
  | 'gameCountdown' | 'gameTimeUp' | 'gameTick' | 'gameUrgent'
  | 'gameReveal' | 'gameSuspense' | 'gameDramatic' | 'gameCelebration'
  | 'gameScore' | 'gameLevelUp' | 'gameAchievement' | 'gamePowerUp'
  // Transitions
  | 'transWhoosh' | 'transWooshSoft' | 'transWooshHard'
  | 'transSwoosh' | 'transZap' | 'transBeam'
  | 'transPortal' | 'transWarp' | 'transGlitch' | 'transMorph'
  | 'transDigital' | 'transCosmic' | 'transMagic' | 'transElectric'
  // Ambient
  | 'ambientHum' | 'ambientChime' | 'ambientWind' | 'ambientSpace'
  // Audio Phone specific
  | 'audioRecord' | 'audioStop' | 'audioPlay' | 'audioPause'
  | 'audioRewind' | 'audioWave' | 'audioProcess';

// Advanced audio context with effects chain
class AudioEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.setupEffectsChain();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupEffectsChain() {
    if (!this.ctx) return;

    // Master compressor for consistent volume
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    // Simple reverb placeholder
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.15;

    // Connect chain
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  play(type: SoundTypeV2, volumeMultiplier: number = 1) {
    const ctx = this.getContext();
    const globalVolume = getSoundEffectsVolume();
    const volume = globalVolume * volumeMultiplier;
    
    if (volume === 0) return;

    const now = ctx.currentTime;
    
    // Create output node connected to master
    const output = ctx.createGain();
    output.connect(this.masterGain || ctx.destination);

    switch (type) {
      // ===== CORE UI CLICKS =====
      case 'uiClick':
        this.createCrystalClick(ctx, output, now, volume);
        break;
      case 'uiClickSoft':
        this.createSoftClick(ctx, output, now, volume);
        break;
      case 'uiClickHard':
        this.createHardClick(ctx, output, now, volume);
        break;
      case 'uiClickGlass':
        this.createGlassClick(ctx, output, now, volume);
        break;
      case 'uiClickCrystal':
        this.createCrystalTone(ctx, output, now, volume);
        break;

      // ===== UI HOVER =====
      case 'uiHover':
        this.createHoverTone(ctx, output, now, volume);
        break;
      case 'uiHoverSoft':
        this.createSoftHover(ctx, output, now, volume);
        break;
      case 'uiHoverGlow':
        this.createGlowHover(ctx, output, now, volume);
        break;
      case 'uiHoverMagic':
        this.createMagicHover(ctx, output, now, volume);
        break;
      case 'uiHoverElectric':
        this.createElectricHover(ctx, output, now, volume);
        break;

      // ===== UI FOCUS/SELECT =====
      case 'uiFocus':
        this.createFocusTone(ctx, output, now, volume);
        break;
      case 'uiBlur':
        this.createBlurTone(ctx, output, now, volume);
        break;
      case 'uiSelect':
        this.createSelectTone(ctx, output, now, volume);
        break;
      case 'uiDeselect':
        this.createDeselectTone(ctx, output, now, volume);
        break;

      // ===== UI TOGGLE =====
      case 'uiToggleOn':
        this.createToggleOn(ctx, output, now, volume);
        break;
      case 'uiToggleOff':
        this.createToggleOff(ctx, output, now, volume);
        break;
      case 'uiSwitch':
        this.createSwitchSound(ctx, output, now, volume);
        break;
      case 'uiSlider':
        this.createSliderTick(ctx, output, now, volume);
        break;

      // ===== UI OPEN/CLOSE =====
      case 'uiOpen':
        this.createOpenSound(ctx, output, now, volume);
        break;
      case 'uiClose':
        this.createCloseSound(ctx, output, now, volume);
        break;
      case 'uiExpand':
        this.createExpandSound(ctx, output, now, volume);
        break;
      case 'uiCollapse':
        this.createCollapseSound(ctx, output, now, volume);
        break;

      // ===== UI NAVIGATION =====
      case 'uiTab':
        this.createTabSound(ctx, output, now, volume);
        break;
      case 'uiPage':
        this.createPageSound(ctx, output, now, volume);
        break;
      case 'uiScroll':
        this.createScrollTick(ctx, output, now, volume);
        break;
      case 'uiDrag':
        this.createDragStart(ctx, output, now, volume);
        break;
      case 'uiDrop':
        this.createDropSound(ctx, output, now, volume);
        break;

      // ===== NOTIFICATIONS =====
      case 'notifySuccess':
        this.createSuccessChime(ctx, output, now, volume);
        break;
      case 'notifyError':
        this.createErrorBuzz(ctx, output, now, volume);
        break;
      case 'notifyWarning':
        this.createWarningTone(ctx, output, now, volume);
        break;
      case 'notifyInfo':
        this.createInfoPing(ctx, output, now, volume);
        break;
      case 'notifyChime':
        this.createChime(ctx, output, now, volume);
        break;
      case 'notifyBell':
        this.createBell(ctx, output, now, volume);
        break;
      case 'notifyPing':
        this.createPing(ctx, output, now, volume);
        break;
      case 'notifyPop':
        this.createPop(ctx, output, now, volume);
        break;
      case 'notifyMagic':
        this.createMagicNotify(ctx, output, now, volume);
        break;
      case 'notifyCosmic':
        this.createCosmicNotify(ctx, output, now, volume);
        break;
      case 'notifyDigital':
        this.createDigitalNotify(ctx, output, now, volume);
        break;

      // ===== GAME SOUNDS =====
      case 'gameStart':
        this.createGameStart(ctx, output, now, volume);
        break;
      case 'gameEnd':
        this.createGameEnd(ctx, output, now, volume);
        break;
      case 'gameWin':
        this.createWinFanfare(ctx, output, now, volume);
        break;
      case 'gameLose':
        this.createLoseSound(ctx, output, now, volume);
        break;
      case 'gameCorrect':
        this.createCorrectSound(ctx, output, now, volume);
        break;
      case 'gameWrong':
        this.createWrongSound(ctx, output, now, volume);
        break;
      case 'gameBonus':
        this.createBonusSound(ctx, output, now, volume);
        break;
      case 'gameCombo':
        this.createComboSound(ctx, output, now, volume);
        break;
      case 'gameCountdown':
        this.createCountdownTick(ctx, output, now, volume);
        break;
      case 'gameTimeUp':
        this.createTimeUpSound(ctx, output, now, volume);
        break;
      case 'gameTick':
        this.createGameTick(ctx, output, now, volume);
        break;
      case 'gameUrgent':
        this.createUrgentTick(ctx, output, now, volume);
        break;
      case 'gameReveal':
        this.createRevealSound(ctx, output, now, volume);
        break;
      case 'gameSuspense':
        this.createSuspenseSound(ctx, output, now, volume);
        break;
      case 'gameDramatic':
        this.createDramaticSound(ctx, output, now, volume);
        break;
      case 'gameCelebration':
        this.createCelebrationSound(ctx, output, now, volume);
        break;
      case 'gameScore':
        this.createScoreSound(ctx, output, now, volume);
        break;
      case 'gameLevelUp':
        this.createLevelUpSound(ctx, output, now, volume);
        break;
      case 'gameAchievement':
        this.createAchievementSound(ctx, output, now, volume);
        break;
      case 'gamePowerUp':
        this.createPowerUpSound(ctx, output, now, volume);
        break;

      // ===== TRANSITIONS =====
      case 'transWhoosh':
        this.createWhoosh(ctx, output, now, volume);
        break;
      case 'transWooshSoft':
        this.createSoftWhoosh(ctx, output, now, volume);
        break;
      case 'transWooshHard':
        this.createHardWhoosh(ctx, output, now, volume);
        break;
      case 'transSwoosh':
        this.createSwoosh(ctx, output, now, volume);
        break;
      case 'transZap':
        this.createZap(ctx, output, now, volume);
        break;
      case 'transBeam':
        this.createBeam(ctx, output, now, volume);
        break;
      case 'transPortal':
        this.createPortalSound(ctx, output, now, volume);
        break;
      case 'transWarp':
        this.createWarpSound(ctx, output, now, volume);
        break;
      case 'transGlitch':
        this.createGlitchSound(ctx, output, now, volume);
        break;
      case 'transMorph':
        this.createMorphSound(ctx, output, now, volume);
        break;
      case 'transDigital':
        this.createDigitalTrans(ctx, output, now, volume);
        break;
      case 'transCosmic':
        this.createCosmicTrans(ctx, output, now, volume);
        break;
      case 'transMagic':
        this.createMagicTrans(ctx, output, now, volume);
        break;
      case 'transElectric':
        this.createElectricTrans(ctx, output, now, volume);
        break;

      // ===== AMBIENT =====
      case 'ambientHum':
        this.createAmbientHum(ctx, output, now, volume);
        break;
      case 'ambientChime':
        this.createAmbientChime(ctx, output, now, volume);
        break;
      case 'ambientWind':
        this.createAmbientWind(ctx, output, now, volume);
        break;
      case 'ambientSpace':
        this.createAmbientSpace(ctx, output, now, volume);
        break;

      // ===== AUDIO PHONE =====
      case 'audioRecord':
        this.createRecordStart(ctx, output, now, volume);
        break;
      case 'audioStop':
        this.createRecordStop(ctx, output, now, volume);
        break;
      case 'audioPlay':
        this.createPlayStart(ctx, output, now, volume);
        break;
      case 'audioPause':
        this.createPauseSound(ctx, output, now, volume);
        break;
      case 'audioRewind':
        this.createRewindSound(ctx, output, now, volume);
        break;
      case 'audioWave':
        this.createWaveSound(ctx, output, now, volume);
        break;
      case 'audioProcess':
        this.createProcessSound(ctx, output, now, volume);
        break;
    }
  }

  // ===== CLICK SOUNDS =====
  private createCrystalClick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const frequencies = [2400, 3200, 4000];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25 * (1 - i * 0.2), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + i * 0.02);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  private createSoftClick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    osc.frequency.setValueAtTime(800, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  private createHardClick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(1800, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.02);
    osc2.frequency.setValueAtTime(80, now);
    osc1.type = 'square';
    osc2.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.05);
    osc2.stop(now + 0.06);
  }

  private createGlassClick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const freqs = [4500, 6000, 7500, 9000];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.008);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.15, now + i * 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.03);
      osc.start(now + i * 0.008);
      osc.stop(now + 0.3);
    });
  }

  private createCrystalTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const harmonics = [1, 2.5, 4, 5.5];
    const baseFreq = 2000;
    harmonics.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(baseFreq * mult, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 - i * 0.03);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  // ===== HOVER SOUNDS =====
  private createHoverTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.04);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  private createSoftHover(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    osc.frequency.setValueAtTime(1800, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private createGlowHover(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(1600, now);
    osc2.frequency.setValueAtTime(2400, now);
    osc1.type = 'sine';
    osc2.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.09);
    osc2.stop(now + 0.09);
  }

  private createMagicHover(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const freqs = [3000, 3500, 4200];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.01);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.04, now + i * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now + i * 0.01);
      osc.stop(now + 0.12);
    });
  }

  private createElectricHover(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.Q.setValueAtTime(5, now);
    osc.frequency.setValueAtTime(100, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // ===== UI STATE SOUNDS =====
  private createFocusTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private createBlurTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private createSelectTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.02);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.25);
    });
  }

  private createDeselectTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [783.99, 659.25, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + i * 0.02);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.22);
    });
  }

  // ===== TOGGLE SOUNDS =====
  private createToggleOn(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private createToggleOff(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private createSwitchSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1200, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.06);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  private createSliderTick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(2000, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  // ===== OPEN/CLOSE SOUNDS =====
  private createOpenSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  private createCloseSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private createExpandSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [300, 450, 600, 900].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.03);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.25);
    });
  }

  private createCollapseSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [900, 600, 450, 300].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.03);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.18, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.22);
    });
  }

  // ===== NAVIGATION SOUNDS =====
  private createTabSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.04);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private createPageSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private createScrollTick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(3000, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  private createDragStart(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private createDropSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // ===== NOTIFICATION SOUNDS =====
  private createSuccessChime(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.3, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
      osc.start(now + i * 0.08);
      osc.stop(now + 0.7);
    });
  }

  private createErrorBuzz(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(180, now);
    osc2.frequency.setValueAtTime(185, now);
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  private createWarningTone(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [440, 523.25, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(vol * 0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + i * 0.1);
      osc.start(now + i * 0.12);
      osc.stop(now + 0.5);
    });
  }

  private createInfoPing(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1200, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  private createChime(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const harmonics = [1, 2, 3, 4.5];
    harmonics.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(880 * mult, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 - i * 0.05);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  private createBell(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 - i * 0.1);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  private createPing(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(2000, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private createPop(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  private createMagicNotify(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(2000 + Math.random() * 2000, now + i * 0.03);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.1, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.02);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.4);
    }
  }

  private createCosmicNotify(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.41);
    osc2.stop(now + 0.41);
  }

  private createDigitalNotify(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [0, 0.05, 0.1].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(1000, now + delay);
      osc.type = 'square';
      gain.gain.setValueAtTime(vol * 0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  }

  // ===== GAME SOUNDS =====
  private createGameStart(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.35, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.25);
    });
  }

  private createGameEnd(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const melody = [1046.50, 783.99, 659.25, 523.25, 392.00];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  }

  private createWinFanfare(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const fanfare = [
      { freq: 523.25, time: 0 }, { freq: 659.25, time: 0.1 },
      { freq: 783.99, time: 0.2 }, { freq: 1046.50, time: 0.35 },
      { freq: 1318.51, time: 0.5 }, { freq: 1567.98, time: 0.65 }
    ];
    fanfare.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.4, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);
      osc.start(now + time);
      osc.stop(now + time + 0.35);
    });
  }

  private createLoseSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    osc2.frequency.setValueAtTime(305, now);
    osc2.frequency.exponentialRampToValueAtTime(105, now + 0.5);
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.61);
    osc2.stop(now + 0.61);
  }

  private createCorrectSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.35, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.25);
    });
  }

  private createWrongSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(180, now + 0.1);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  private createBonusSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(1000 + i * 200, now + i * 0.05);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    }
  }

  private createComboSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.4);
    });
  }

  private createCountdownTick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(800, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private createTimeUpSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.61);
  }

  private createGameTick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(600, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  private createUrgentTick(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1000, now);
    osc.type = 'square';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  private createRevealSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(5000, now + 0.4);
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.4);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.51);
    osc2.stop(now + 0.51);
  }

  private createSuspenseSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(output);
    lfo.frequency.setValueAtTime(4, now);
    lfoGain.gain.setValueAtTime(20, now);
    osc.frequency.setValueAtTime(200, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.81);
    osc.stop(now + 0.81);
  }

  private createDramaticSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 1);
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(75, now + 1);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.21);
    osc2.stop(now + 1.21);
  }

  private createCelebrationSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(500 + Math.random() * 1500, now + i * 0.06);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    }
  }

  private createScoreSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private createLevelUpSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [392, 523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.35, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  private createAchievementSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.35, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
    // Sparkles
    for (let i = 0; i < 6; i++) {
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.connect(sparkleGain);
      sparkleGain.connect(output);
      sparkle.frequency.setValueAtTime(3000 + Math.random() * 2000, now + 0.5 + i * 0.05);
      sparkle.type = 'sine';
      sparkleGain.gain.setValueAtTime(vol * 0.1, now + 0.5 + i * 0.05);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.05);
      sparkle.start(now + 0.5 + i * 0.05);
      sparkle.stop(now + 0.7 + i * 0.05);
    }
  }

  private createPowerUpSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(5000, now + 0.3);
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.41);
  }

  // ===== TRANSITION SOUNDS =====
  private createWhoosh(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
    osc.frequency.setValueAtTime(100, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  private createSoftWhoosh(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
    osc.frequency.setValueAtTime(80, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  private createHardWhoosh(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    osc.frequency.setValueAtTime(50, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  private createSwoosh(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
    osc.frequency.setValueAtTime(200, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  private createZap(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private createBeam(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(output);
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  private createPortalSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.4);
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(500, now + 0.4);
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(750, now + 0.4);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.51);
    osc2.stop(now + 0.51);
  }

  private createWarpSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(output);
    lfo.frequency.setValueAtTime(10, now);
    lfo.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    lfoGain.gain.setValueAtTime(100, now);
    lfoGain.gain.exponentialRampToValueAtTime(500, now + 0.3);
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.41);
    osc.stop(now + 0.41);
  }

  private createGlitchSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(100 + Math.random() * 2000, now + i * 0.02);
      osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.03);
      osc.start(now + i * 0.02);
      osc.stop(now + i * 0.02 + 0.04);
    }
  }

  private createMorphSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
    osc.frequency.setValueAtTime(200, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  private createDigitalTrans(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [0, 0.03, 0.06, 0.09].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(800 + i * 400, now + delay);
      osc.type = 'square';
      gain.gain.setValueAtTime(vol * 0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
      osc.start(now + delay);
      osc.stop(now + delay + 0.06);
    });
  }

  private createCosmicTrans(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.5);
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.5);
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.5);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.61);
    osc2.stop(now + 0.61);
  }

  private createMagicTrans(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(2000 + Math.random() * 3000, now + i * 0.04);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    }
  }

  private createElectricTrans(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.setValueAtTime(10, now);
    osc.frequency.setValueAtTime(50, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // ===== AMBIENT SOUNDS =====
  private createAmbientHum(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(60, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.1, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc.start(now);
    osc.stop(now + 1.01);
  }

  private createAmbientChime(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.3);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.15, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.8);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.9);
    });
  }

  private createAmbientWind(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
    filter.frequency.exponentialRampToValueAtTime(500, now + 1);
    osc.frequency.setValueAtTime(100, now);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.08, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    osc.start(now);
    osc.stop(now + 1.01);
  }

  private createAmbientSpace(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    osc1.frequency.setValueAtTime(80, now);
    osc2.frequency.setValueAtTime(120, now);
    osc1.type = 'sine';
    osc2.type = 'sine';
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.12, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.01);
    osc2.stop(now + 2.01);
  }

  // ===== AUDIO PHONE SOUNDS =====
  private createRecordStart(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [523.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.3, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.25);
    });
  }

  private createRecordStop(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [1046.50, 783.99, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.23);
    });
  }

  private createPlayStart(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private createPauseSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    [800, 600].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.25, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + i * 0.02);
      osc.start(now + i * 0.05);
      osc.stop(now + 0.15);
    });
  }

  private createRewindSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(output);
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(vol * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  private createWaveSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(output);
    lfo.frequency.setValueAtTime(5, now);
    lfoGain.gain.setValueAtTime(50, now);
    osc.frequency.setValueAtTime(400, now);
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.51);
    osc.stop(now + 0.51);
  }

  private createProcessSound(ctx: AudioContext, output: GainNode, now: number, vol: number) {
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(output);
      osc.frequency.setValueAtTime(1000 + i * 100, now + i * 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(vol * 0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    }
  }
}

// Singleton instance
const audioEngine = new AudioEngine();

// Export function for easy use
export const playSfx = (type: SoundTypeV2, volumeMultiplier: number = 1) => {
  audioEngine.play(type, volumeMultiplier);
};

// Hook for component use
export const useSoundEffectsV2 = () => {
  const play = useCallback((type: SoundTypeV2, volumeMultiplier: number = 1) => {
    audioEngine.play(type, volumeMultiplier);
  }, []);

  return { play };
};

export default useSoundEffectsV2;
