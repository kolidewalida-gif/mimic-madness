# 🏠 Home (Ink) — Custom Assets

This folder hosts custom images for the **InkHomeScreen** (the menu shown before
joining a lobby). Every image has a code-based fallback, so missing files do
not break the UI — they're just replaced by a stylized placeholder.

## File map

```
public/home/
├── background.png                 ← full-screen background (city / graffiti)
├── logo.png                       ← top-center title (falls back to /lobby/logo.png then to text)
├── musiclecteurandfriendcode.png  ← wide strip used as the bottom utility bar
│                                     background (music player + friend code area)
├── banners/
│   ├── normal.png                 ← hero banner for the IMITATION mode
│   ├── audiophone.png             ← hero banner for the AUDIO PHONE mode
│   ├── 2v2.png                    ← hero banner for the 2 VS 2 mode
│   ├── quiz.png                   ← hero banner for the QUIZ mode
│   ├── pixoguess.png              ← hero banner for the BLIND TEST mode (alias: blindtest.png)
│   ├── memory.png                 ← hero banner for the MEMORY mode
│   └── undercover.png             ← hero banner for the UNDERCOVER mode
└── buttons/
    ├── jouer.png                  ← yellow "JOUER" button (primary CTA)
    ├── rejoindre.png              ← purple "REJOINDRE UN LOBBY" button (secondary CTA)
    ├── profil.png                 ← "PROFIL" wordmark shown in the top-left profile pill
    ├── friends.png                ← "MES AMIS" button (top-right)
    ├── social.png                 ← SOCIAL button (top-right, opens the social hub)
    └── setting.png                ← settings button (top-right)
```

## Recommended dimensions

| File                            | Format  | Aspect ratio | Approx size  |
|---------------------------------|---------|--------------|--------------|
| `background.png`                | PNG/JPG | 16:9         | 1920×1080    |
| `banners/*.png`                 | PNG     | ~3:1         | 1024×340     |
| `buttons/jouer.png`             | PNG     | ~5:1         | 1024×200     |
| `buttons/rejoindre.png`         | PNG     | ~5:1         | 1024×200     |
| `buttons/profil.png`            | PNG     | ~2.75:1      | 217×79       |
| `buttons/friends.png`           | PNG     | ~2.5:1       | 141×56       |
| `buttons/social.png`            | PNG     | ~1:1         | 59×55        |
| `buttons/setting.png`           | PNG     | 1:1          | 48×48        |
| `logo.png`                      | PNG     | transparent  | 800×400      |
| `musiclecteurandfriendcode.png` | PNG     | ~8.7:1       | 1604×184     |

## Notes

- All paths are loaded relative to `/` (the public root), e.g. the file
  `public/home/background.png` is accessed as `/home/background.png` at runtime.
- The button images are rendered at a fixed height with `width: auto`, so they
  keep their own aspect ratio. Square art (social/setting) becomes an icon
  button; wide art (profil/friends) becomes a labeled button.
- The mini mode-card grid (when used) reuses `public/lobby/cards/*.png`.
- `.jpg` is also tried automatically when only `.png` is provided in the code.
- Drop a file in, hard-reload the page, and it appears. No code change needed.
```
