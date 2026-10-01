# Bulles du menu : compatibilité navigateur

## Périmètre

Les bulles animées et éclatables du menu Ink Beta, leurs interactions et leur
effet sonore. Cette modification n'est pas un audit de tous les modes du jeu.
La cible est les versions maintenues de Firefox, Chrome, Safari, Opera et Opera
GX. « Google » est traité comme Chrome ou le navigateur intégré de l'application
Google ; les règles audio imposées par cette application restent applicables.

## Adaptations

- Les pauses ne dépendent plus de `:has()` ; le zoom utilise `transform` plutôt
  que la propriété individuelle `scale`. Les états essentiels ne se perdent pas
  si un ancien moteur ignore un sélecteur plus récent.
- Le focus a un style de base, puis une amélioration avec `:focus-visible`.
- Le survol est réservé à la souris/au trackpad. Une pression primaire maintient
  la bulle immobile ; annulation ou sortie du pointeur libère cet état sans son.
  Un seul événement `click` produit l'éclatement, y compris au clavier.
- Les boutons utilisent une apparence neutre et ne sélectionnent pas de texte.
  Un espacement inférieur de base précède la règle de zone sûre mobile.
- Les espaces transparents autour de l'avatar laissent passer les clics ; le
  formulaire et l'avatar gardent la priorité sur les bulles situées derrière eux.
- `pagehide`/`pageshow` rétablissent les commandes après une restauration de page,
  en complément de `visibilitychange`.
- Le contexte audio partagé accepte le constructeur standard ou WebKit déjà
  géré par le jeu. Le son attend la reprise d'un contexte suspendu/interrompu.
  Un refus de lecture automatique ne provoque aucune erreur visible.
- Pas de file d'attente sonore : après 250 ms le son d'un ancien clic est
  abandonné. Pendant le déblocage, seul le dernier clic peut produire un son.
  Le volume et la visibilité sont vérifiés de nouveau avant la lecture.
- Les mouvements réduits, le mode basse consommation, le volume nul et
  l'absence de prise en charge audio continuent de fonctionner.

## Vérifications du 1er octobre 2026

Tests automatisés : états de pointeur, annulation, pause/retour de page, double
clic, clavier, silence, reprise suspendue/interrompue, refus de lecture, son
expiré, volume modifié pendant la reprise, constructeur WebKit et absence audio.
Les tests CSS sont des garde-fous structurels, pas des tests de rendu moteur.

Vérification réelle dans le navigateur intégré disponible : clic souris,
flèches/Entrée, ouverture de Rejoindre et clic sur une bulle visible avec un
viewport de 390 × 844. Le blocage mobile par la zone transparente a été reproduit
puis corrigé. Aucun salon réel ou compte joueur n'a été utilisé.

Firefox, Safari natif (macOS/iOS), Chrome, Opera et Opera GX n'étaient pas exposés
par les outils de navigateur de cette session. Ils ne sont donc **pas déclarés
testés sur appareil réel**. Le son d'un onglet désactivé ou bloqué par le
navigateur ne peut pas être forcé par le site.

## Sources

- [MDN : sélecteur :has() et invalidation des règles non prises en charge](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has)
- [MDN : reprise d'un contexte interrompu dans Safari iOS](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari)
- [MDN : événements de pointeur](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
