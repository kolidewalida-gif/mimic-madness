# Microphone et bulles aléatoires

## Capture et clarté

Les enregistrements et le test des réglages utilisent les capacités annoncées
par `getSupportedConstraints`, pas une détection du nom du navigateur.
Le micro choisi est conservé localement et utilisé dans les modes de jeu.
Le mono et 48 kHz sont des préférences (`ideal`), jamais des exigences bloquantes.
Les options non annoncées ne sont pas envoyées.

Le filtre du navigateur est conservé dans les réglages. L'isolation RNNoise est
optionnelle par défaut : on privilégie une voix naturelle et on évite de cumuler
deux traitements agressifs. Une préférence avancée déjà enregistrée est respectée.
Le choix explicite d'un périphérique reste strict : si celui-ci est débranché,
le joueur doit sélectionner un micro disponible plutôt que capturer un autre
périphérique à son insu.

Les formats sont sélectionnés par `MediaRecorder.isTypeSupported` : Opus/WebM,
Opus/Ogg, MP4 ou choix natif du moteur. La cible audio est 128 kb/s ; les moteurs
peuvent l'ajuster. Les contextes de capture sont indépendants des sons de l'UI,
avec prise en charge du constructeur WebKit et reprise des états suspended /
interrupted sur geste ou retour de visibilité. Les visualisations réutilisent
leurs buffers et limitent les mises à jour React à 20 Hz.

## Correction des trous de traitement

Avant : le worklet envoyait les échantillons au thread de l'interface pour
exécuter RNNoise. Une réponse tardive produisait du silence et pouvait agrandir
la file audio sans limite.

Maintenant : un worker dédié exécute WASM, relié directement au worklet par un
MessagePort transféré. Le tampon de transport est fixe (40 ms, hors latence du
modèle, du périphérique et du codec). Au maximum six trames attendent leur
traitement ; les réponses périmées sont rejetées. Le son du micro tamponné prend
le relais avec une courte transition au lieu d'insérer du silence. Une panne du
worker ou du processeur reconnecte le micro à la même destination pour préserver
le flux du recorder. Annulation et démontage libèrent worker, contexte et pistes
de destination, sans arrêter les pistes brutes appartenant à l'appelant.

Le modèle lui-même peut atténuer des sons qu'il considère comme du bruit. La
continuité du transport ne garantit donc pas que toutes les voix ou sons soient
préservés : désactiver l'isolation avancée si elle atténue trop la voix.

## Bulles

Chaque segment choisit une nouvelle direction, une distance, une courbure et
une durée aléatoires. Le segment suivant part exactement du précédent. Les
trajectoires restent dans le champ visible et se réadaptent au redimensionnement.
Les animations sont exécutées par le navigateur, sans rendu React à chaque image.

Pause sur survol souris, focus clavier, pression, éclatement, menu superposé ou
onglet caché. Respect du mouvement réduit et du mode économie. Le son panoramique
utilise la position réelle de la bulle. Les bulles ne capturent aucun clic sur les
contrôles du menu situés au-dessus.

## Vérifications et limites

- Tests PCM sur le vrai fichier du worklet : retard, file bornée, réponses
  périmées, reprise et transition vers le son brut.
- Tests de sélection des capacités/codecs/préférences, interruption WebKit,
  annulation de setup, panne de worker et cleanup idempotent.
- Tests des directions, de 1 000 destinations desktop/mobile, continuité,
  pauses, mouvement réduit, économie et interactions d'éclatement.
- Vérification réelle dans le navigateur intégré disponible : signal synthétique
  enregistré via le worklet et un worker de transport sans modèle, avec deux
  blocages volontaires du thread UI de 180 ms. Aucun trou silencieux mesuré après
  le démarrage (fenêtres de 20 ms). Ce test isole le transport, pas la qualité du
  modèle. Le worker RNNoise réel a également démarré et produit un enregistrement ;
  le modèle a fortement atténué certaines portions du signal synthétique.
- Vérification visuelle : mouvements sur les deux axes et éclatement pendant le
  déplacement. Le navigateur de test annonce mouvement réduit : l'aperçu local
  dispose d'un opt-in de test pour les animations complètes, sans changer l'OS.

Firefox, Safari, Chrome, Opera et Opera GX n'ont pas tous été exécutés séparément
sur cette machine. Pas de test acoustique avec de vrais micros / Bluetooth ici.
Les limites du matériel, les suspensions d'onglets et les limiteurs CPU d'Opera GX
peuvent toujours affecter la capture. Les aperçus dans `outputs/` sont locaux et
ne sont pas publiés.

## Références de compatibilité

- [MDN — contraintes de capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
- [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [MDN — AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext)
- [RNNoise WASM — paquet utilisé](https://github.com/shiguredo/rnnoise-wasm)
