"""Generate Mimic Madness' original procedural soundtrack.

No model, sample pack, or copyrighted recording is used: every waveform is
synthesized from oscillators and deterministic noise, then encoded to MP3.
"""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 32_000
DURATION = 30.0
SAMPLES = int(SR * DURATION)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "original-music"
TMP = OUT / ".wav"

TRACKS = [
    dict(file="ink-home", title="Ink After Dark", bpm=112, root=50, kind="garage", energy=.68),
    dict(file="ink-lobby", title="Lobby After Hours", bpm=96, root=49, kind="lounge", energy=.52),
    dict(file="imitation", title="Mirror Pressure", bpm=128, root=52, kind="breakbeat", energy=.88),
    dict(file="audiophone", title="Signal Chain", bpm=104, root=54, kind="signal", energy=.56),
    dict(file="audiophone-rewind", title="Reverse Protocol", bpm=96, root=51, kind="rewind", energy=.62),
    dict(file="team-showdown", title="Two Sides", bpm=128, root=53, kind="showdown", energy=.9),
    dict(file="quiz", title="Decision Window", bpm=120, root=57, kind="quiz", energy=.66),
    dict(file="pixoguess", title="Into Focus", bpm=120, root=48, kind="focus", energy=.74),
    dict(file="undercover", title="False Alibi", bpm=96, root=45, kind="noir", energy=.48),
    dict(file="blindtest", title="Neon Pressing", bpm=112, root=54, kind="disco", energy=.7),
    dict(file="mimic-waiting", title="Backstage Signal", bpm=96, root=50, kind="rnb", energy=.46),
    dict(file="mimic-results", title="Spotlight Scores", bpm=120, root=55, kind="club", energy=.76),
    dict(file="monopoly", title="Hostile Assets", bpm=104, root=48, kind="jazz", energy=.58),
    dict(file="voting", title="Final Choice", bpm=96, root=52, kind="tension", energy=.58),
    dict(file="victory", title="Top Line", bpm=120, root=59, kind="victory", energy=.82),
    dict(file="defeat", title="Run It Back", bpm=88, root=50, kind="defeat", energy=.4),
    dict(file="connection", title="Signal Returning", bpm=80, root=48, kind="ambient", energy=.28),
]


def midi(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)

def envelope(length: int, attack=.01, decay=.12, sustain=.55, release=.18) -> np.ndarray:
    n = max(8, length)
    a = min(int(SR * attack), n // 3)
    d = min(int(SR * decay), n // 3)
    r = min(int(SR * release), n // 2)
    s = max(0, n - a - d - r)
    parts = []
    if a: parts.append(np.linspace(0, 1, a, endpoint=False))
    if d: parts.append(np.linspace(1, sustain, d, endpoint=False))
    if s: parts.append(np.full(s, sustain))
    if r: parts.append(np.linspace(sustain, 0, r, endpoint=True))
    env = np.concatenate(parts) if parts else np.zeros(n)
    return np.pad(env[:n], (0, max(0, n - len(env))))


def tone(freq: float, seconds: float, shape="sine", detune=0.0) -> np.ndarray:
    n = max(1, int(SR * seconds))
    t = np.arange(n, dtype=np.float64) / SR
    phase = 2 * np.pi * freq * (2 ** (detune / 1200)) * t
    if shape == "saw":
        return (2 * ((phase / (2 * np.pi)) % 1) - 1).astype(np.float32)
    if shape == "square":
        return np.sign(np.sin(phase)).astype(np.float32)
    if shape == "triangle":
        return (2 * np.abs(2 * ((phase / (2 * np.pi)) % 1) - 1) - 1).astype(np.float32)
    return np.sin(phase).astype(np.float32)


def add_wrap(bus: np.ndarray, sound: np.ndarray, start_seconds: float, gain=.2, pan=0.0) -> None:
    start = int(start_seconds * SR) % SAMPLES
    left = gain * math.sqrt((1 - pan) / 2)
    right = gain * math.sqrt((1 + pan) / 2)
    idx = (start + np.arange(len(sound))) % SAMPLES
    np.add.at(bus[:, 0], idx, sound * left)
    np.add.at(bus[:, 1], idx, sound * right)


def kick() -> np.ndarray:
    seconds = .42
    n = int(SR * seconds)
    t = np.arange(n) / SR
    phase = 2 * np.pi * (48 * t + 75 * (1 - np.exp(-t * 28)) / 28)
    body = np.sin(phase) * np.exp(-t * 11)
    click = np.random.default_rng(11).normal(0, 1, n) * np.exp(-t * 85) * .13
    return np.tanh((body + click) * 1.7).astype(np.float32)


def snare(seed: int) -> np.ndarray:
    seconds = .32
    n = int(SR * seconds)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, n)
    bright = np.concatenate(([0], np.diff(noise)))
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 16)
    return ((bright * .38 * np.exp(-t * 14)) + body * .32).astype(np.float32)


def hat(seed: int, open_hat=False) -> np.ndarray:
    seconds = .28 if open_hat else .075
    n = int(SR * seconds)
    t = np.arange(n) / SR
    noise = np.random.default_rng(seed).normal(0, 1, n)
    high = np.concatenate(([0], np.diff(noise)))
    return (high * np.exp(-t * (14 if open_hat else 62)) * .28).astype(np.float32)


def synth_note(note: float, seconds: float, voice="bass") -> np.ndarray:
    freq = midi(note)
    if voice == "bass":
        raw = .72 * tone(freq, seconds, "sine") + .28 * tone(freq, seconds, "saw")
        env = envelope(len(raw), .008, .1, .5, min(.16, seconds * .3))
        return np.tanh(raw * env * 1.45).astype(np.float32)
    if voice == "pluck":
        raw = .5 * tone(freq, seconds, "triangle") + .25 * tone(freq * 2, seconds, "sine")
        return (raw * envelope(len(raw), .004, .12, .16, min(.2, seconds * .4))).astype(np.float32)
    raw = .33 * tone(freq, seconds, "saw", -7) + .33 * tone(freq, seconds, "saw", 7) + .34 * tone(freq, seconds, "sine")
    return (raw * envelope(len(raw), .18, .28, .48, min(.55, seconds * .25))).astype(np.float32)

def reverse_swell(seed: int, seconds=.72) -> np.ndarray:
    n = int(SR * seconds)
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, n)
    smooth = np.convolve(noise, np.ones(17) / 17, mode="same")
    return (smooth * np.linspace(0, 1, n) ** 2 * .38).astype(np.float32)


def compose(cfg: dict) -> np.ndarray:
    bpm, root, kind, energy = cfg["bpm"], cfg["root"], cfg["kind"], cfg["energy"]
    beat = 60.0 / bpm
    bars = int(round(DURATION / (beat * 4)))
    bus = np.zeros((SAMPLES, 2), dtype=np.float32)
    rng = np.random.default_rng(abs(hash(cfg["file"])) % (2**32))
    minor = [0, 2, 3, 5, 7, 8, 10]
    progressions = {
        "victory": [0, 8, 3, 10], "disco": [0, 5, 3, 7], "jazz": [0, 3, 8, 7],
        "rnb": [0, 8, 5, 3], "club": [0, 8, 3, 10], "defeat": [0, 8, 5, 3],
    }
    progression = progressions.get(kind, [0, 8, 3, 10])
    sparse = kind in {"lounge", "noir", "rnb", "ambient", "defeat", "signal"}
    halftime = kind in {"rewind", "noir", "defeat", "ambient"}

    # Harmonic bed. Every event wraps at 30 s, keeping the loop boundary alive.
    for bar in range(bars + 1):
        start = bar * 4 * beat
        degree = progression[bar % len(progression)]
        chord_root = root + degree
        if kind == "ambient": chord_root -= 12
        chord = [chord_root, chord_root + 3, chord_root + 7, chord_root + 10]
        pad_len = 4.4 * beat
        for i, note in enumerate(chord):
            add_wrap(bus, synth_note(note + 12, pad_len, "pad"), start, .045 + energy * .025, pan=(i - 1.5) * .22)

    total_beats = int(round(DURATION / beat))
    for b in range(total_beats):
        t = b * beat
        pos = b % 4
        bar = b // 4
        degree = progression[bar % len(progression)]

        # Drums: mature club/hip-hop vocabulary, varied by mode.
        kick_here = pos in ({0, 2} if halftime else {0, 2})
        if kind in {"garage", "breakbeat", "focus", "quiz"}: kick_here = pos in {0, 2} or (pos == 3 and bar % 2 == 1)
        if kind in {"disco", "club", "victory", "showdown"}: kick_here = True
        if kind == "ambient": kick_here = pos == 0 and bar % 2 == 0
        if kick_here: add_wrap(bus, kick(), t, .22 + energy * .12)
        if (halftime and pos == 2) or (not halftime and pos in {1, 3}):
            add_wrap(bus, snare(1000 + b), t, .12 + energy * .095, pan=.04)

        subdivisions = 2 if sparse else 4
        for sub in range(subdivisions):
            ht = t + sub * beat / subdivisions
            if kind == "ambient" and sub > 0: continue
            swing = beat * .045 if sub % 2 else 0
            add_wrap(bus, hat(2000 + b * 5 + sub, open_hat=(sub == subdivisions - 1 and pos == 3)), ht + swing, .045 + energy * .035, pan=(-.35 if sub % 2 else .35))

        # Syncopated bass; stable forward pulse even in the rewind track.
        bass_steps = [0, 0, 7, 3] if kind not in {"disco", "jazz"} else [0, 7, 10, 3]
        note = root - 12 + degree + bass_steps[pos]
        if kind == "noir" and pos not in {0, 3}: continue
        add_wrap(bus, synth_note(note, beat * (.72 if sparse else .48), "bass"), t, .13 + energy * .11, pan=-.04)
        if kind in {"garage", "breakbeat", "showdown", "focus"} and pos in {1, 3}:
            add_wrap(bus, synth_note(note + 7, beat * .28, "bass"), t + beat * .62, .09 + energy * .07, pan=.05)

        # Restrained motif, intentionally less melodic for voice-heavy modes.
        if kind not in {"ambient", "signal", "noir"}:
            motif = [0, 3, 7, 10, 7, 5, 3, 2]
            count = 2 if sparse else 4
            for sub in range(count):
                idx = (b * count + sub) % len(motif)
                note = root + 12 + minor[motif[idx] % len(minor)]
                add_wrap(bus, synth_note(note, beat * .34, "pluck"), t + sub * beat / count, .035 + energy * .035, pan=(-.5 + sub / max(1, count - 1)))

        if kind in {"rewind", "signal", "focus", "tension"} and pos == 3:
            add_wrap(bus, reverse_swell(3000 + b, beat * .82), t + beat * .15, .12 + energy * .05, pan=.2)

    # Rewind gets backward fragments; jazz gets restrained off-beat keys.
    if kind == "rewind":
        for b in range(0, total_beats, 2):
            fragment = synth_note(root + 19 + (b % 5), beat * .75, "pluck")[::-1].copy()
            add_wrap(bus, fragment, b * beat + beat * .18, .11, pan=(-.55 if b % 4 else .55))
    if kind == "jazz":
        for b in range(total_beats):
            note = root + 12 + [3, 7, 10, 14][b % 4]
            add_wrap(bus, synth_note(note, beat * .3, "pluck"), b * beat + beat * .5, .075, pan=.28)

    # Circular stereo delays are periodic and therefore preserve loopability.
    left, right = bus[:, 0].copy(), bus[:, 1].copy()
    delay_a, delay_b = int(SR * beat * .375), int(SR * beat * .625)
    bus[:, 0] += np.roll(right, delay_a) * (.075 if sparse else .1)
    bus[:, 1] += np.roll(left, delay_b) * (.075 if sparse else .1)
    bus -= np.mean(bus, axis=0, keepdims=True)
    bus = np.tanh(bus * 1.35)
    peak = float(np.max(np.abs(bus))) or 1.0
    return (bus / peak * .92).astype(np.float32)

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
    print(f"Generating {len(TRACKS)} original 30-second tracks…")
    for index, cfg in enumerate(TRACKS, 1):
        wav_path = TMP / f"{cfg['file']}.wav"
        mp3_path = OUT / f"{cfg['file']}.mp3"
        print(f"[{index:02}/{len(TRACKS)}] {cfg['title']} ({cfg['kind']}, {cfg['bpm']} BPM)")
        audio = compose(cfg)
        write_wav(wav_path, audio)
        encode_mp3(wav_path, mp3_path)
        wav_path.unlink()
        if mp3_path.stat().st_size < 100_000:
            raise RuntimeError(f"Encoded file looks invalid: {mp3_path}")
    try:
        TMP.rmdir()
    except OSError:
        pass
    print("Soundtrack generated successfully in", OUT)


if __name__ == "__main__":
    main()
