## Analyse — bugs identifiés dans le mode imitation

### 🔴 Bug critique #1 — État qui ne se reset pas entre les manches
Dans `GamePlayScreen.tsx`, les sous-phases (`ChallengePreviewPhase`, `ImitationPhase`, `VotingPhase`, `ResultsPhase`) reçoivent `roundNumber` en prop, mais **ne sont pas remontées** quand `roundNumber` change. Résultat à la manche 2+ :
- `ChallengePreviewPhase` : `isReady=true` reste affiché → bouton "En attente des autres" dès le début.
- `ImitationPhase` : `hasRecorded`, `hasSubmitted`, `recordedClipId`, `includeOriginalAudio`, `uploadKey`, `challengeClipData` (de l'ancien défi) restent → bug visuel + lecture du mauvais clip.
- `VotingPhase` : `currentIndex`, `hasVotedAll`, `votingSessionId`, `imitations`, `hasVotedCurrent` restent → vote auto-skippé.
- `ResultsPhase` : `showVictoryAnimation`, `results`, `downloadingPlayer` restent.

### 🔴 Bug critique #2 — Vidéo défi pendant le recording
Dans `ImitationPhase.handleRecordingStart` :
- La vidéo défi se lance au start du record mais **ne s'arrête jamais** quand le record s'arrête (continue en boucle visuelle).
- Si `challengeClipData` n'a pas encore chargé, `startTime` fallback 0 → mauvais point de départ.
- Aucune pause de la vidéo quand l'utilisateur clique "Recommencer" → vidéo + record en parallèle, son audible.

### 🔴 Bug critique #3 — `VideoWithAudioOverlay` désynchronisé
`useEffect` de sync externe dépend seulement de `mediaReady.video`, pas `mediaReady.audio`. La vidéo démarre **avant** que l'audio soit prêt → désynchronisation, voire pas d'audio du tout sur réseau lent.

### 🟠 Bug #4 — `onAllReady` déclenché par tous les clients
Dans `ChallengePreviewPhase` et `ImitationPhase`, `useEffect` appelle `onAllReady()` côté de **chaque** joueur. Les handlers parents guardent avec `isHost`, mais ça produit des appels redondants et des warnings. À garder seulement côté hôte.

### 🟠 Bug #5 — Glitch musical à la transition imitation → voting
`ImitationPhase` cleanup appelle `play()` (musique lobby) → `VotingPhase` mount appelle aussitôt `pause()` ou `setSituation("voting")`. Bruit audible d'1 frame.

### 🟠 Bug #6 — `useEffect` musique avec deps instables
`useEffect(..., [pause, play])` dans `ImitationPhase` : si `pause`/`play` ne sont pas mémoisés dans `useBackgroundMusic`, l'effet boucle (pause/play en continu). À vérifier et utiliser `eslint-disable-next-line` + ref ou s'assurer que c'est mémoisé.

### 🟠 Bug #7 — `AudioRecorder` UX confuse
- Demande un nom obligatoire alors qu'on est en pleine partie sous pression.
- Bouton "Sauvegarder" puis "Soumettre" : double clic inutile. Devrait auto-save dès stop.
- Cleanup `useEffect` dépend de `previewUrl` → se re-déclenche et peut couper le stream pendant le record.

### 🟠 Bug #8 — Race condition clip ↔ player_imitations
Dans `handleSubmit`, l'UPDATE `round_number` se fait avant l'upsert `player_imitations`. Si le subscriber du `VotingPhase` charge entre les deux, il ne trouvera pas le clip → fallback time-based. À inverser ou faire en transaction implicite.

### 🟡 Bug #9 — `VotingPhase` ne sait pas si tout le monde a voté
La progression "Suivant" est manuelle côté hôte mais aucun affichage des votants. L'hôte avance à l'aveugle.

### 🟡 Bug #10 — `pickNextChallenge` peut re-piocher le clip du joueur courant
Aucune préférence pour défier qu'**un seul joueur par manche**. Acceptable mais sous-optimal.

---

## Plan d'implémentation

### 1. Remount sur changement de manche (`GamePlayScreen.tsx`)
Ajouter `key={roundNumber}` sur `ChallengePreviewPhase`, `ImitationPhase`, `VotingPhase`, `ResultsPhase`. Solution la plus sûre et minimale qui résout 4 bugs critiques d'un coup.

### 2. Vidéo défi pendant recording (`ImitationPhase.tsx`)
- `handleRecordingStop` : `challengeVideoRef.current.pause()` et reset à `startTime`.
- `handleRetry` : pareil + ne pas auto-replay.
- Attendre que `challengeClipData` soit chargé avant d'activer le bouton record (disable + tooltip).
- Renommer `handleVideoSaved` → `handleAudioSaved` pour clarté.

### 3. Sync audio dans `VideoWithAudioOverlay.tsx`
- Dépendance de l'effet externe : ajouter `mediaReady.audio`.
- Condition : `if (mediaReady.video && mediaReady.audio)` avant `handlePlay`.
- Ajouter `onLoadedData` en plus de `onCanPlay` pour robustesse.

### 4. Guard host sur `onAllReady`
Dans `ChallengePreviewPhase` et `ImitationPhase` : `if (currentPlayer.isHost && readyPlayers.length === players.length)`.

### 5. Pas de play() musique en cleanup d'`ImitationPhase`
Retirer le `play()` du cleanup ; laisser la phase suivante décider de la musique. Si on retourne au lobby (cas onEndGame), c'est le composant lobby qui réactive.

### 6. `AudioRecorder` UX
- Pré-remplir `audioName` au moment du start (pas du stop).
- Auto-save dès stop (skip écran preview/nom) ; garder option "Recommencer".
- Fixer cleanup useEffect avec deps `[]` + refs.

### 7. Ordre des écritures dans `handleSubmit` (`ImitationPhase`)
Faire l'UPDATE `video_clips.round_number` **avant** l'upsert `player_imitations.is_ready=true`. Comme ça, dès que `is_ready` apparaît, le clip est déjà taggé pour la requête `getClipByPlayerAndRound`.

### 8. Affichage votants dans `VotingPhase`
Sous le bouton "Suivant" de l'hôte, afficher `X/Y ont voté` en se basant sur le nombre de `imitation_votes` pour `currentIndex`. Optionnel : auto-advance quand tout le monde a voté.

### 9. Diversifier les défis (`GamePlayScreen.pickNextChallenge`)
En plus de filtrer les `usedChallengeIds`, filtrer aussi les `usedPlayerIds` tant qu'il reste des joueurs non encore défiés.

---

## Fichiers touchés
- `src/components/GamePlayScreen.tsx` — keys + pickNextChallenge
- `src/components/ChallengePreviewPhase.tsx` — guard onAllReady
- `src/components/ImitationPhase.tsx` — vidéo défi, guard onAllReady, ordre handleSubmit, cleanup musique
- `src/components/VotingPhase.tsx` — progression votes
- `src/components/VideoWithAudioOverlay.tsx` — sync audio+video
- `src/components/AudioRecorder.tsx` — auto-save + cleanup
