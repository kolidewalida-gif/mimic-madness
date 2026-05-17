## Refonte AAA — Cyber Néon Hub

Direction validée : **Cyber Néon** (fond `#0d0d1a` / `#1a1a2e`, accents cyan `#00f0ff` + magenta `#ff006e`), navigation **Hub central type console (PS5/Xbox)**, animations **niveau 5 (cinématique max)**.

Le thème Ink (noir & rouge) reste disponible — on ajoute un **nouveau thème "Neon Hub"** sélectionnable, sans casser l'existant.

---

### 1. Nouveau design system "Neon Hub"

Ajouter dans `src/index.css` un bloc `.theme-neon` avec :
- Tokens HSL : `--background` noir bleuté, `--primary` cyan, `--accent` magenta, `--neon-glow-cyan` / `--neon-glow-magenta`
- Gradients : `--gradient-hud` (cyan→magenta), `--gradient-tile` (verre + bord néon)
- Shadows : `--shadow-neon-cyan`, `--shadow-neon-magenta` (multi-layer glow)
- Bordures animées : keyframes `neon-pulse`, `scan-line`, `hud-flicker`, `tile-hover-lift`

Étendre `tailwind.config.ts` avec ces animations + une font display futuriste (Orbitron pour titres, Inter pour le reste).

Brancher le thème via `useTheme` (ajouter `'neon'` à côté de `'ink'` / `'cartoon'`).

---

### 2. Écran d'accueil — Hub central

Nouveau composant `NeonHomeScreen.tsx` :
- **Fond animé** : grille perspective qui défile (style Tron) + particules cyan/magenta + parallax léger à la souris
- **Logo central XL** avec halo néon pulsant
- **3 tuiles HUD géantes** au centre : `JOUER`, `REJOINDRE`, `PROFIL` — bordure cyan animée, scan-line interne, hover = lift + magenta glow
- **Barre du bas** : ticker XP/niveau + presence amis en ligne (style overlay console)
- **Coin haut-droit** : pastille compte Google + bouton réglages

`InkAdaptive` rend `NeonHomeScreen` quand `theme === 'neon'`.

---

### 3. Sélecteur de mode — Carrousel console

Nouveau `NeonGameModeSelector.tsx` :
- **Layout type Steam Big Picture / PS5** : grande tuile mode actif au centre (artwork plein cadre + nom néon + courte description + bouton "Lancer"), vignettes secondaires défilantes en bas
- Navigation clavier ←/→ + clics, transitions `scale + glow + blur du fond`
- Chaque mode reçoit son **palette d'accent** (Quiz=cyan, BlurRush=magenta, Undercover=violet, AudioPhone=lime, Monopoly=or, Pixoguess=rose) — déjà semantique dans `gameModes.ts`, on les remappe sur le neon
- **Badge HUD** : nb joueurs requis, durée estimée, difficulté
- Animation d'entrée : tuiles arrivent en cascade depuis le bas avec trail néon

---

### 4. Lobby — Salle de briefing

Nouveau `NeonLobbyScreen.tsx` :
- **Layout 3 zones HUD** :
  - Gauche : carte du mode sélectionné + paramètres (compact, modifiable par host)
  - Centre : "PLAYER SLOTS" — cartes joueur 3D-tilt avec avatar, niveau, titre équipé, anneau néon (host = doré, prêt = vert, attente = pulse cyan)
  - Droite : chat lobby version "comms terminal" (monospace, scan-lines)
- **Bouton LANCER** géant en bas, cyan→magenta gradient, animation chargement type "system boot"
- **Countdown** plein écran avec overlay glitch quand la partie démarre
- Conserver toute la logique de `InkLobbyScreen` (props, hooks, realtime) — c'est uniquement la couche présentationnelle qui change

---

### 5. Panneaux latéraux (Profil, Amis, Récompenses)

Nouveaux : `NeonProfileSidebar.tsx`, `NeonFriendsSidebar.tsx`, et harmoniser `RewardsPanel` / `AchievementsPanel` :
- Drawer qui slide depuis la droite avec **effet "boot screen"** (lignes de scan qui se remplissent)
- En-tête : avatar holographique (anneau rotatif) + niveau + barre XP néon segmentée
- Onglets en haut style **HUD tabs** (Profil / Amis / Récompenses / Succès)
- Liste amis : statut en pastille néon, hover = preview du dernier mode joué
- Récompenses verrouillées : effet "static TV" + cadenas magenta

Trigger : un bouton flottant en haut-droite (visible sur toutes les pages) avec icône avatar.

---

### 6. Transitions inter-écrans

Remplacer `InkPageTransition` par `NeonPageTransition` :
- Sortie : glitch RGB split + fade
- Entrée : scan-line verticale qui révèle le contenu
- Durée ~400ms, respect de `prefers-reduced-motion`

---

### 7. Détails techniques

- **Aucune logique métier modifiée** : hooks (`useLobbySync`, `useAuth`, `useFriends`, `useXp`, `useTheme`) restent intacts
- **Réutilise** les composants premium existants (`HolographicCard`, `NeonText`, `PremiumButton`, `FloatingParticles`) en les retunant avec les nouveaux tokens
- **Theme switcher** dans `ThemeSelector.tsx` : ajouter option "Neon Hub" (preview vignette)
- **Performance** : particules canvas avec cap fps + pause sur tab inactif ; grille perspective en pur CSS (pas de WebGL) pour rester léger
- **Mobile** : tuiles passent en 1 colonne, sidebars deviennent bottom-sheet, animations réduites
- **Mémoire projet** : ajouter `mem://style/theme-neon-hub` documentant tokens et règles

---

### Fichiers créés
- `src/components/NeonHomeScreen.tsx`
- `src/components/NeonGameModeSelector.tsx`
- `src/components/NeonLobbyScreen.tsx`
- `src/components/NeonProfileSidebar.tsx`
- `src/components/NeonFriendsSidebar.tsx`
- `src/components/NeonPageTransition.tsx`
- `src/components/NeonHUDFrame.tsx` (composant réutilisable : cadre HUD avec coins + scan-line)

### Fichiers édités
- `src/index.css` (tokens `.theme-neon`)
- `src/tailwind.config.ts` (keyframes + animations)
- `src/hooks/useTheme.tsx` (ajout `'neon'`)
- `src/components/InkAdaptive.tsx` (route vers les nouveaux composants si neon)
- `src/components/ThemeSelector.tsx` (option Neon Hub)

### Hors scope (pour rester focus)
- Écrans in-game des modes (Quiz, BlurRush, etc.) — on touche uniquement les **menus**
- Refonte backend / RLS
- Nouveaux modes de jeu

---

Tu valides ? Je peux aussi commencer **uniquement par le Home + Mode Selector** en premier livrable si tu veux voir le rendu avant d'attaquer Lobby + Sidebars.