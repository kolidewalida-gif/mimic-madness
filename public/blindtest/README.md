# 🎵 Blindtest Musical — Media

Drop your audio/video clips here. The game plays a short clip each round and
players guess which **anime / dessin animé / musique / film** it comes from.

## Folder layout

```
public/blindtest/
├── anime/        ← anime openings/endings   (.mp3 or .mp4)
├── cartoon/      ← dessins animés            (.mp3 or .mp4)
├── music/        ← chansons / hits           (.mp3 or .mp4)
├── film/         ← bandes originales de films(.mp3 or .mp4)
└── covers/       ← cover art shown on the reveal (.jpg / .png, optional)
```

## How it works

- Each entry is declared in `src/lib/blindtestTracks.ts` (`BLINDTEST_TRACKS`).
- `src` can be an **.mp3** (audio only) or an **.mp4** (only the audio is used,
  the video stays hidden behind the mystery disc until the reveal).
- `cover` is optional — if missing, the category emoji is shown instead.
- `clipStart` (seconds) lets you jump straight to the chorus.
- Missing files degrade gracefully: the round still runs, the reveal still
  shows the title — there's just no sound until you add the file.

## Adding a track

1. Put the file in the right folder, e.g. `public/blindtest/anime/bleach.mp3`.
2. Add an entry in `src/lib/blindtestTracks.ts`:

```ts
{ id: 'bleach', title: 'Bleach', subtitle: 'Number One',
  category: 'anime', src: '/blindtest/anime/bleach.mp3',
  cover: '/blindtest/covers/bleach.jpg' },
```

3. Reload — the new track joins the random playlist automatically.

## Tips

- Keep clips short (15–30s) and start on a recognizable part.
- Use `.mp3` for music, `.mp4` only if you want to reveal a video on the answer.
- The wrong-answer choices are picked from the same category when possible,
  so add a few tracks per category for tougher rounds.
