"""Generate Mimic Madness' original soundtrack (v2).

Everything is synthesized from scratch: oscillators, filtered noise and
deterministic RNG. No model, no sample pack, no third-party recording, so the
result is royalty-free and fully owned by the project.

Art direction: adult night-club electronica — UK garage, French house,
trip-hop, R&B and tech house. No cartoon, kawaii or circus instrumentation.

Every track is exactly 30 s and loops seamlessly: the BPM grid divides 30 s
into whole bars, every event wraps around the buffer, and the filters are
circular (FFT based), so the end splices back onto the start.
"""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 44_100
DURATION = 30.0
SAMPLES = int(SR * DURATION)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "original-music"
TMP = OUT / ".wav"

# 16-step patterns, one bar each.
#   x = hit, o = accent / open, g = ghost (soft), . = rest
STYLES: dict[str, dict] = {
    "garage": dict(
        genre="UK Garage", swing=.16,
        kick="x.....x.....x...", clap="....x.......x...", hat="..x.ox.x..x.ox.x",
        bass="x..x..x...x..x..", bass_steps=(0, 0, 7, 0, 10, 0, 7, 3),
        chord_hits=(0, 6, 10), lead=True, brightness=.62, crackle=.0,
    ),
    "lounge": dict(
        genre="Lounge nocturne", swing=.2,
        kick="x.......x.......", clap="....x.......x...", hat="..g...x...g...x.",
        bass="x.......x...x...", bass_steps=(0, 7, 3, 10),
        chord_hits=(0, 8), lead=False, brightness=.4, crackle=.55,
    ),
    "breakbeat": dict(
        genre="Breakbeat", swing=.06,
        kick="x..x....x..x....", clap="....x......x.x..", hat="x.x.oxx.x.x.ox.x",
        bass="x..x..x.x..x..x.", bass_steps=(0, 0, 10, 7, 0, 3, 10, 7),
        chord_hits=(0, 4, 8, 12), lead=True, brightness=.72, crackle=.0,
    ),
    "signal": dict(
        genre="Electro minimale", swing=.1,
        kick="x.......x.......", clap="........x.......", hat="....g...x...g...",
        bass="x.....x.x.....x.", bass_steps=(0, 7, 0, 10),
        chord_hits=(0,), lead=False, brightness=.46, crackle=.18,
    ),
    "rewind": dict(
        genre="Trip-hop inversé", swing=.22,
        kick="x...........x...", clap="........x.......", hat="..g...x...g...x.",
        bass="x.......x.......", bass_steps=(0, 10),
        chord_hits=(0, 8), lead=False, brightness=.38, crackle=.6,
    ),
    "showdown": dict(
        genre="Club peak-time", swing=.0,
        kick="x...x...x...x...", clap="....x.......x...", hat="x.xox.x.x.xox.xo",
        bass="x.x.x.x.x.x.x.x.", bass_steps=(0, 0, 0, 7, 0, 0, 10, 7),
        chord_hits=(0, 4, 8, 12), lead=True, brightness=.8, crackle=.0,
    ),
    "quiz": dict(
        genre="Electro tendue", swing=.08,
        kick="x.....x.x.......", clap="....x.......x...", hat="..x..x..x..x..xo",
        bass="x.....x.x.....x.", bass_steps=(0, 7, 0, 10),
        chord_hits=(0, 8), lead=True, brightness=.66, crackle=.0,
    ),
    "focus": dict(
        genre="Tech house", swing=.05,
        kick="x..x..x.x..x....", clap="....x.......x...", hat="x.xox.x.x.xox.x.",
        bass="x..x..x.x..x..x.", bass_steps=(0, 0, 7, 0, 10, 7, 0, 3),
        chord_hits=(0, 6, 10), lead=True, brightness=.74, crackle=.0,
    ),
    "noir": dict(
        genre="Trip-hop noir", swing=.24,
        kick="x.......x.......", clap="....x...........", hat="....g.......x...",
        bass="x...........x...", bass_steps=(0, 8),
        chord_hits=(0,), lead=False, brightness=.34, crackle=.7,
    ),
    "disco": dict(
        genre="French house", swing=.0,
        kick="x...x...x...x...", clap="....x.......x...", hat="..o...o...o...o.",
        bass="x.x.x.x.x.x.x.x.", bass_steps=(0, 7, 10, 7, 3, 7, 10, 12),
        chord_hits=(2, 6, 10, 14), lead=True, brightness=.7, crackle=.22,
    ),
    "rnb": dict(
        genre="R&B nocturne", swing=.18,
        kick="x.....x.x.......", clap="....x.......x...", hat="..x.g...x.x.g...",
        bass="x.....x.x.......", bass_steps=(0, 3, 10, 7),
        chord_hits=(0, 8), lead=False, brightness=.44, crackle=.4,
    ),
    "club": dict(
        genre="Club house", swing=.02,
        kick="x...x...x...x...", clap="....x.......x...", hat="..x...x...x...xo",
        bass="x.x.x.x.x.x.x.x.", bass_steps=(0, 0, 7, 10),
        chord_hits=(0, 4, 8, 12), lead=True, brightness=.76, crackle=.0,
    ),
    "jazz": dict(
        genre="Jazz électronique", swing=.28,
        kick="x.......x...x...", clap="....g.x.....g.x.", hat="x..x.x.x..x.x.x.",
        bass="x..x..x...x..x..", bass_steps=(0, 3, 7, 10, 12, 10, 7, 3),
        chord_hits=(2, 6, 10, 14), lead=True, brightness=.5, crackle=.5,
    ),
    "tension": dict(
        genre="Suspense electro", swing=.12,
        kick="x.......x.......", clap="............x...", hat="x...x...x...x...",
        bass="x.......x.......", bass_steps=(0, 1),
        chord_hits=(0,), lead=False, brightness=.42, crackle=.25,
    ),
    "victory": dict(
        genre="House euphorique", swing=.0,
        kick="x...x...x...x...", clap="....x.......x...", hat="x.xox.x.xoxox.xo",
        bass="x.x.x.x.x.x.x.x.", bass_steps=(0, 7, 12, 7, 10, 7, 3, 7),
        chord_hits=(0, 4, 8, 12), lead=True, brightness=.84, crackle=.0,
    ),
    "defeat": dict(
        genre="Downtempo", swing=.2,
        kick="x...........x...", clap="........x.......", hat="....g.......x...",
        bass="x.......x.......", bass_steps=(0, 8),
        chord_hits=(0,), lead=False, brightness=.32, crackle=.65,
    ),
    "ambient": dict(
        genre="Ambient", swing=.0,
        kick="x...............", clap="", hat="........g.......",
        bass="x...............", bass_steps=(0,),
        chord_hits=(0,), lead=False, brightness=.3, crackle=.35,
    ),
}

# Chord progressions in semitones from the root, one entry per bar (cycled).
PROGRESSIONS: dict[str, tuple[int, ...]] = {
    "victory": (0, 8, 3, 10),
    "disco": (0, 5, 10, 3),
    "jazz": (0, 3, 8, 7),
    "rnb": (0, 8, 5, 3),
    "club": (0, 8, 3, 10),
    "defeat": (0, 8, 5, 3),
    "noir": (0, 8, 0, 5),
    "ambient": (0, 5),
    "tension": (0, 1, 0, 11),
    "rewind": (0, 10, 0, 8),
}
DEFAULT_PROGRESSION = (0, 8, 3, 10)

# Chord colours: minor 9th / minor 7th voicings keep it adult, never nursery.
VOICINGS = ((0, 3, 7, 10, 14), (0, 3, 7, 14), (0, 7, 10, 15))

TRACKS = [
    dict(file="ink-home", title="Ink After Dark", bpm=112, root=50, kind="garage", energy=.68),
    dict(file="ink-lobby", title="Lobby After Hours", bpm=96, root=49, kind="lounge", energy=.5),
    dict(file="imitation", title="Mirror Pressure", bpm=128, root=52, kind="breakbeat", energy=.86),
    dict(file="audiophone", title="Signal Chain", bpm=104, root=54, kind="signal", energy=.54),
    dict(file="audiophone-rewind", title="Reverse Protocol", bpm=96, root=51, kind="rewind", energy=.6),
    dict(file="team-showdown", title="Two Sides", bpm=128, root=53, kind="showdown", energy=.9),
    dict(file="quiz", title="Decision Window", bpm=120, root=57, kind="quiz", energy=.66),
    dict(file="pixoguess", title="Into Focus", bpm=120, root=48, kind="focus", energy=.74),
    dict(file="undercover", title="False Alibi", bpm=96, root=45, kind="noir", energy=.46),
    dict(file="blindtest", title="Neon Pressing", bpm=112, root=54, kind="disco", energy=.7),
    dict(file="mimic-waiting", title="Backstage Signal", bpm=96, root=50, kind="rnb", energy=.44),
    dict(file="mimic-results", title="Spotlight Scores", bpm=120, root=55, kind="club", energy=.76),
    dict(file="monopoly", title="Hostile Assets", bpm=104, root=48, kind="jazz", energy=.56),
    dict(file="voting", title="Final Choice", bpm=96, root=52, kind="tension", energy=.56),
    dict(file="victory", title="Top Line", bpm=120, root=59, kind="victory", energy=.82),
    dict(file="defeat", title="Run It Back", bpm=88, root=50, kind="defeat", energy=.38),
    dict(file="connection", title="Signal Returning", bpm=80, root=48, kind="ambient", energy=.26),
]


# ── primitives ──────────────────────────────────────────────────────────────
def midi(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def adsr(length: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    n = max(8, length)
    a = max(1, min(int(SR * attack), n // 3))
    d = max(1, min(int(SR * decay), n // 3))
    r = max(1, min(int(SR * release), n // 2))
    s = max(0, n - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a, endpoint=False),
        np.linspace(1, sustain, d, endpoint=False),
        np.full(s, sustain),
        np.linspace(sustain, 0, r, endpoint=True) ** 1.6,
    ])
    return np.pad(env[:n], (0, max(0, n - len(env)))).astype(np.float32)


def additive(freq: float, seconds: float, shape: str, brightness: float, detune_cents: float = 0.0) -> np.ndarray:
    """Band-limited oscillator. Building it from harmonics avoids the harsh
    aliasing of a naive saw and gives a mix that sounds produced, not buzzy."""
    n = max(8, int(SR * seconds))
    t = np.arange(n, dtype=np.float64) / SR
    f = freq * 2 ** (detune_cents / 1200)
    if f <= 0:
        return np.zeros(n, dtype=np.float32)
    max_h = max(1, min(int((SR * 0.45) / f), 48))
    out = np.zeros(n, dtype=np.float64)
    for h in range(1, max_h + 1):
        if shape == "saw":
            amp = 1.0 / h
        elif shape == "square":
            if h % 2 == 0:
                continue
            amp = 1.0 / h
        elif shape == "triangle":
            if h % 2 == 0:
                continue
            amp = (1.0 / (h * h)) * (1 if (h // 2) % 2 == 0 else -1)
        else:  # sine
            if h > 1:
                break
            amp = 1.0
        # Spectral tilt = static lowpass. Darker voices lose highs faster.
        amp *= math.exp(-((h - 1) / (1.0 + brightness * 26.0)))
        if abs(amp) < 1e-4:
            continue
        out += amp * np.sin(2 * np.pi * f * h * t)
    peak = np.max(np.abs(out)) or 1.0
    return (out / peak).astype(np.float32)


_voice_cache: dict[tuple, np.ndarray] = {}


def voice(note: float, seconds: float, kind: str, brightness: float) -> np.ndarray:
    key = (round(note, 2), round(seconds, 4), kind, round(brightness, 3))
    hit = _voice_cache.get(key)
    if hit is not None:
        return hit

    freq = midi(note)
    if kind == "sub":
        raw = additive(freq, seconds, "sine", brightness)
        env = adsr(len(raw), .006, .07, .72, min(.2, seconds * .45))
        out = np.tanh(raw * env * 1.5)
    elif kind == "bass":
        raw = (.62 * additive(freq, seconds, "saw", brightness * .5)
               + .38 * additive(freq, seconds, "square", brightness * .35))
        env = adsr(len(raw), .004, .08, .55, min(.18, seconds * .4))
        out = np.tanh(raw * env * 1.35)
    elif kind == "pad":
        raw = (.34 * additive(freq, seconds, "saw", brightness, -8)
               + .34 * additive(freq, seconds, "saw", brightness, 8)
               + .32 * additive(freq, seconds, "triangle", brightness))
        out = raw * adsr(len(raw), min(.5, seconds * .35), .3, .55, min(.9, seconds * .5))
    elif kind == "keys":
        raw = (.6 * additive(freq, seconds, "triangle", brightness)
               + .4 * additive(freq * 2, seconds, "sine", brightness))
        out = raw * adsr(len(raw), .004, .16, .18, min(.35, seconds * .6))
    else:  # pluck / lead
        raw = (.5 * additive(freq, seconds, "square", brightness * .8)
               + .5 * additive(freq, seconds, "triangle", brightness))
        out = raw * adsr(len(raw), .003, .1, .22, min(.3, seconds * .55))

    out = out.astype(np.float32)
    if len(_voice_cache) < 6000:
        _voice_cache[key] = out
    return out


def kick_hit(punch: float) -> np.ndarray:
    n = int(SR * .5)
    t = np.arange(n) / SR
    sweep = 46 + 90 * np.exp(-t * 26)
    phase = 2 * np.pi * np.cumsum(sweep) / SR
    body = np.sin(phase) * np.exp(-t * 9.5)
    click = np.random.default_rng(7).normal(0, 1, n) * np.exp(-t * 140) * .1
    return np.tanh((body + click) * (1.4 + punch)).astype(np.float32)


def clap_hit(seed: int, tight: float) -> np.ndarray:
    n = int(SR * .3)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, n)
    bright = np.concatenate(([0.0], np.diff(noise)))
    # Three quick bursts then a tail: the classic layered clap.
    env = np.zeros(n)
    for offset, gain in ((0.0, 1.0), (.011, .8), (.022, .6)):
        start = int(offset * SR)
        env[start:] += gain * np.exp(-(t[: n - start]) * (34 + tight * 24))
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 22) * .22
    return ((bright * env * .42) + tone).astype(np.float32)


def hat_hit(seed: int, open_hat: bool) -> np.ndarray:
    seconds = .3 if open_hat else .06
    n = int(SR * seconds)
    t = np.arange(n) / SR
    noise = np.random.default_rng(seed).normal(0, 1, n)
    bright = np.concatenate(([0.0], np.diff(noise)))
    bright = np.concatenate(([0.0], np.diff(bright)))  # steeper highpass
    decay = 11 if open_hat else 78
    return (bright * np.exp(-t * decay) * .2).astype(np.float32)


def rim_hit(seed: int) -> np.ndarray:
    n = int(SR * .12)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    body = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 60)
    noise = rng.normal(0, 1, n) * np.exp(-t * 90) * .3
    return ((body + noise) * .5).astype(np.float32)


def reverse_swell(seed: int, seconds: float) -> np.ndarray:
    n = max(16, int(SR * seconds))
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, n)
    smooth = np.convolve(noise, np.ones(64) / 64, mode="same")
    return (smooth * np.linspace(0, 1, n) ** 2.4 * .5).astype(np.float32)


def vinyl_floor(amount: float, seed: int) -> np.ndarray:
    """Tape hiss plus sparse crackle. Loop-safe because it fills the buffer."""
    rng = np.random.default_rng(seed)
    hiss = np.convolve(rng.normal(0, 1, SAMPLES), np.ones(9) / 9, mode="same")
    crackle = np.zeros(SAMPLES)
    clicks = rng.integers(0, SAMPLES, int(70 * amount))
    for pos in clicks:
        length = int(rng.integers(30, 180))
        idx = (pos + np.arange(length)) % SAMPLES
        crackle[idx] += rng.normal(0, 1) * np.exp(-np.arange(length) / (length / 3))
    return ((hiss * .010 + crackle * .020) * amount).astype(np.float32)


def add_wrap(bus: np.ndarray, sound: np.ndarray, start_seconds: float, gain: float, pan: float = 0.0) -> None:
    if gain <= 0 or len(sound) == 0:
        return
    start = int(start_seconds * SR) % SAMPLES
    left = gain * math.sqrt(max(0.0, (1 - pan) / 2))
    right = gain * math.sqrt(max(0.0, (1 + pan) / 2))
    idx = (start + np.arange(len(sound))) % SAMPLES
    np.add.at(bus[:, 0], idx, sound * left)
    np.add.at(bus[:, 1], idx, sound * right)


def spectral(signal: np.ndarray, highpass=0.0, lowpass=0.0, shelf=0.0) -> np.ndarray:
    """Circular FFT EQ. Circular means the loop point stays clean."""
    out = np.empty_like(signal)
    freqs = np.fft.rfftfreq(SAMPLES, 1 / SR)
    curve = np.ones_like(freqs)
    if highpass > 0:
        curve *= freqs / np.sqrt(freqs ** 2 + highpass ** 2)
    if lowpass > 0:
        curve *= 1 / np.sqrt(1 + (freqs / lowpass) ** 2)
    if shelf != 0:
        curve *= 1 + shelf * (freqs / (freqs + 4000))
    for ch in range(signal.shape[1]):
        out[:, ch] = np.fft.irfft(np.fft.rfft(signal[:, ch]) * curve, SAMPLES)
    return out


def steps_of(pattern: str, bars: int) -> list[tuple[int, str]]:
    """Expand a one-bar pattern to the whole track."""
    if not pattern:
        return []
    hits: list[tuple[int, str]] = []
    for bar in range(bars):
        for i, ch in enumerate(pattern[:16]):
            if ch != ".":
                hits.append((bar * 16 + i, ch))
    return hits


# ── arrangement ─────────────────────────────────────────────────────────────
def compose(cfg: dict) -> np.ndarray:
    bpm, root, kind, energy = cfg["bpm"], cfg["root"], cfg["kind"], cfg["energy"]
    style = STYLES[kind]
    beat = 60.0 / bpm
    step = beat / 4
    bars = int(round(DURATION / (beat * 4)))
    total_steps = bars * 16
    swing = style["swing"]
    bright = style["brightness"]
    progression = PROGRESSIONS.get(kind, DEFAULT_PROGRESSION)
    rng = np.random.default_rng(abs(hash(cfg["file"])) % (2 ** 32))

    drums = np.zeros((SAMPLES, 2), dtype=np.float32)
    lows = np.zeros((SAMPLES, 2), dtype=np.float32)
    harmony = np.zeros((SAMPLES, 2), dtype=np.float32)
    tops = np.zeros((SAMPLES, 2), dtype=np.float32)

    def at(index: int) -> float:
        """Step index → seconds, with swing on the off-16ths."""
        return index * step + (swing * step * .5 if index % 2 else 0.0)

    # Kick, and remember the hits so the low end can be sidechained to them.
    kick_times: list[float] = []
    for index, mark in steps_of(style["kick"], bars):
        t = at(index)
        kick_times.append(t)
        add_wrap(drums, kick_hit(energy * .5), t, .58 + energy * .18)
    # Sub-drop under the kick on the four-to-the-floor styles.
    if kind in {"disco", "club", "victory", "showdown", "focus"}:
        for t in kick_times:
            add_wrap(lows, voice(root - 24, beat * .5, "sub", .2), t, .28)

    for index, mark in steps_of(style["clap"], bars):
        gain = (.16 if mark == "g" else .34) * (.7 + energy * .5)
        add_wrap(drums, clap_hit(4000 + index, energy), at(index), gain, pan=.05)

    for index, mark in steps_of(style["hat"], bars):
        open_hat = mark == "o"
        gain = (.1 if mark == "g" else .2) * (.75 + energy * .45)
        pan = -.32 if index % 4 in (1, 3) else .3
        add_wrap(drums, hat_hit(9000 + index, open_hat), at(index), gain, pan=pan)

    # Rimshot ornaments give the slower styles some human feel.
    if kind in {"jazz", "rnb", "lounge", "noir", "rewind"}:
        for index in range(total_steps):
            if index % 16 in (7, 14) and rng.random() < .45:
                add_wrap(drums, rim_hit(1500 + index), at(index), .1, pan=-.25)

    # Bass: root movement from the pattern, doubled by a sine sub.
    bass_steps = style["bass_steps"]
    for order, (index, _mark) in enumerate(steps_of(style["bass"], bars)):
        bar = index // 16
        degree = progression[bar % len(progression)]
        offset = bass_steps[order % len(bass_steps)]
        note = root - 12 + degree + offset
        length = step * (3.2 if kind in {"noir", "defeat", "ambient", "rewind"} else 1.8)
        add_wrap(lows, voice(note, length, "bass", bright), at(index), .3 + energy * .12, pan=-.03)
        add_wrap(lows, voice(note - 12, length * .8, "sub", .18), at(index), .22)

    # Harmony: minor 9th voicings, one stab set per bar position.
    for bar in range(bars):
        degree = progression[bar % len(progression)]
        voicing = VOICINGS[bar % len(VOICINGS)]
        chord_root = root + degree + (-12 if kind == "ambient" else 0)
        for hit in style["chord_hits"]:
            index = bar * 16 + hit
            sustain = beat * (3.6 if kind in {"ambient", "noir", "defeat", "tension"} else 1.1)
            for i, interval in enumerate(voicing):
                note = chord_root + interval + (12 if kind in {"disco", "club", "victory"} else 0)
                pan = (i - (len(voicing) - 1) / 2) * .26
                add_wrap(harmony, voice(note, sustain, "pad", bright * .85), at(index),
                         .075 + energy * .03, pan=pan)
            if kind in {"jazz", "rnb", "disco", "lounge"}:
                add_wrap(harmony, voice(chord_root + 12 + voicing[1], beat * .5, "keys", bright),
                         at(index), .085, pan=.2)

    # Lead motif: deliberately restrained, the modes are voice-heavy.
    if style["lead"]:
        scale = (0, 3, 5, 7, 10, 12, 14)
        motif = (0, 4, 2, 5, 4, 2, 1, 3)
        for index in range(0, total_steps, 2):
            bar = index // 16
            if bar % 4 == 3 and kind not in {"victory", "showdown"}:
                continue  # leave the fourth bar to the drums
            degree = progression[bar % len(progression)]
            note = root + 12 + degree + scale[motif[(index // 2) % len(motif)] % len(scale)]
            pan = -.45 if (index // 2) % 2 else .42
            add_wrap(tops, voice(note, step * 1.6, "pluck", bright), at(index),
                     .055 + energy * .035, pan=pan)

    # Style signatures.
    if kind == "rewind":
        for bar in range(bars):
            frag = voice(root + 19 + (bar % 5), beat * .9, "keys", bright)[::-1].copy()
            add_wrap(tops, frag, bar * 4 * beat + beat * 2.1, .16, pan=(-.5 if bar % 2 else .5))
    if kind in {"signal", "focus", "tension", "rewind"}:
        for bar in range(bars):
            add_wrap(tops, reverse_swell(3000 + bar, beat * 1.6), bar * 4 * beat + beat * 2.4,
                     .14 + energy * .05, pan=.18)
    if kind in {"victory", "showdown"}:
        for bar in range(0, bars, 4):
            add_wrap(tops, reverse_swell(5000 + bar, beat * 3.6), bar * 4 * beat + beat * .4, .12, pan=-.15)

    # Sidechain: duck the low end and pads under every kick so the mix breathes.
    duck = np.ones(SAMPLES, dtype=np.float32)
    release = int(SR * min(.22, beat * .55))
    shape = 1 - .55 * np.exp(-np.arange(release) / (release / 3.2))
    for t in kick_times:
        idx = (int(t * SR) + np.arange(release)) % SAMPLES
        duck[idx] = np.minimum(duck[idx], shape)
    lows *= duck[:, None]
    harmony *= (0.35 + 0.65 * duck)[:, None]

    # Bus EQ: keep the sub clean, stop the pads from muddying the low mid.
    lows = spectral(lows, highpass=28, lowpass=2600)
    harmony = spectral(harmony, highpass=190, lowpass=7200)
    tops = spectral(tops, highpass=320, shelf=.35)
    drums = spectral(drums, highpass=32)

    mix = drums * .9 + lows * 1.0 + harmony * .95 + tops * .85
    if style["crackle"] > 0:
        floor = vinyl_floor(style["crackle"], abs(hash(cfg["file"])) % 1000)
        mix[:, 0] += floor
        mix[:, 1] += np.roll(floor, 977)

    # Circular delay throw, one dotted-eighth, keeps the space alive and loops.
    delay = int(SR * beat * .75) % SAMPLES
    mix[:, 0] += np.roll(mix[:, 1], delay) * (.1 if energy > .6 else .14)
    mix[:, 1] += np.roll(mix[:, 0], delay) * (.08 if energy > .6 else .12)

    # Mastering: mid/side widening, DC removal, soft limit, peak target.
    mid = (mix[:, 0] + mix[:, 1]) * .5
    side = (mix[:, 0] - mix[:, 1]) * .5 * 1.25
    mix[:, 0], mix[:, 1] = mid + side, mid - side
    mix -= mix.mean(axis=0, keepdims=True)
    rms = float(np.sqrt(np.mean(mix ** 2))) or 1.0
    mix *= min(2.4, 0.135 / rms)          # aim for a consistent loudness
    mix = np.tanh(mix * 1.15) / math.tanh(1.15)
    mix = spectral(mix, highpass=24, shelf=.12)
    peak = float(np.max(np.abs(mix))) or 1.0
    # 0.89 leaves headroom for the inter-sample overshoot the MP3 encoder adds;
    # at 0.94 one track came back above full scale after encoding.
    return (mix / peak * .89).astype(np.float32)


# ── output ──────────────────────────────────────────────────────────────────
def write_wav(path: Path, audio: np.ndarray) -> None:
    pcm = np.clip(audio * 32767, -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(pcm.tobytes())


def encode_mp3(wav_path: Path, mp3_path: Path) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k",
        "-ar", "44100", "-write_xing", "1", str(mp3_path),
    ], check=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    print(f"Generating {len(TRACKS)} original 30-second tracks at {SR} Hz…")
    for index, cfg in enumerate(TRACKS, 1):
        style = STYLES[cfg["kind"]]
        wav_path = TMP / f"{cfg['file']}.wav"
        mp3_path = OUT / f"{cfg['file']}.mp3"
        print(f"[{index:02}/{len(TRACKS)}] {cfg['title']} — {style['genre']}, {cfg['bpm']} BPM")
        audio = compose(cfg)
        write_wav(wav_path, audio)
        encode_mp3(wav_path, mp3_path)
        wav_path.unlink()
        if mp3_path.stat().st_size < 100_000:
            raise RuntimeError(f"Encoded file looks invalid: {mp3_path}")
        _voice_cache.clear()
    try:
        TMP.rmdir()
    except OSError:
        pass
    print("Soundtrack generated successfully in", OUT)


if __name__ == "__main__":
    main()
