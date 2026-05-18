# Lobby Custom Assets

Drop your cartoon images in this folder. Both `.png` and `.jpg` are supported —
the loader tries `.png` first, then `.jpg`, then falls back to a stylized SVG/emoji card.

## Mode cards (in `cards/` subfolder)
- `cards/imitation.png` (or `.jpg`) — purple microphone mascot card
- `cards/audiophone.png` (or `.jpg`) — orange/yellow speaker card
- `cards/2v2.png` (or `.jpg`) — blue "2 vs 2" numbers card
- `cards/quiz.png` (or `.jpg`) — green magnifying glass + ? card
- `cards/blindtest.png` (or `.jpg`) — cyan headphones card
- `cards/memory.png` (or `.jpg`) — pink padlock + key card
- `cards/undercover.png` (or `.jpg`) — purple detective card

## Other
- `pret-stamp.png` — yellow "PRÊT !" starburst with peace fingers
- `mascot.png` — purple spiky-haired mascot with sunglasses
- `logo.png` — "C2TV MUSIC MASTER" graffiti logo

If a file is missing, the code falls back to a stylized SVG/emoji rendering.

## Current status (auto-detected)

| Asset | Status |
|---|---|
| logo.png | ✅ |
| pret-stamp.png | ✅ |
| mascot.png | ⚠️ Missing — using emoji fallback |
| cards/imitation.png | ✅ |
| cards/audiophone.jpg | ✅ |
| cards/2v2.png | ✅ |
| cards/quiz.png | ✅ |
| cards/blindtest.jpg | ✅ |
| cards/memory.png | ⚠️ Missing — using fallback |
| cards/undercover.png | ✅ |
