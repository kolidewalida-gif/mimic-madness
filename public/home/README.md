# 🏠 Home (Ink) — Custom Assets

This folder hosts custom images for the **InkHomeScreen** (the menu shown before
joining a lobby). Every image has a code-based fallback, so missing files do
not break the UI — they're just replaced by a stylized placeholder.

## File map

```
public/home/
├── background.png            ← full-screen background (city / graffiti)
├── logo.png                  ← top-center C2TV MIMIC MASTER title (optional, falls back to /lobby/logo.png then to text)
├── banners/
│   ├── normal.png            ← hero banner for the IMITATION mode
│   ├── audiophone.png        ← hero banner for the AUDIO PHONE mode
│   ├── 2v2.png               ← hero banner for the 2 VS 2 mode
│   ├── quiz.png              ← hero banner for the QUIZ mode
│   ├── pixoguess.png         ← hero banner for the BLIND TEST mode (alias: blindtest.png)
│   ├── memory.png            ← hero banner for the MEMORY mode
│   └── undercover.png        ← hero banner for the UNDERCOVER mode
└── buttons/
    ├── jouer.png             ← yellow "JOUER" button (primary CTA)
    └── rejoindre.png         ← purple "REJOINDRE UN LOBBY" button (secondary CTA)
```

## Recommended dimensions

| File                       | Format | Aspect ratio | Approx size  |
|----------------------------|--------|--------------|--------------|
| `background.png`           | PNG/JPG | 16:9        | 1920×1080    |
| `banners/*.png`            | PNG    | ~3:1         | 1024×340     |
| `buttons/jouer.png`        | PNG    | ~5:1         | 1024×200     |
| `buttons/rejoindre.png`    | PNG    | ~5:1         | 1024×200     |
| `logo.png`                 | PNG    | transparent  | 800×400      |

## Notes

- All paths are loaded relative to `/` (the public root), e.g. the file
  `public/home/background.png` is accessed as `/home/background.png` at runtime.
- The mini mode-card grid at the bottom keeps reusing
  `public/lobby/cards/*.png` (already present) — no duplication needed.
- `.jpg` is also tried automatically when only `.png` is provided in the code,
  but using PNG with transparency is recommended for buttons and banners.
- Drop a file in, hard-reload the page, and it appears. No code change needed.
