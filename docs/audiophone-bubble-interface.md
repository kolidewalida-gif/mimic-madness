# Audiophone — studio bubble

L’Audiophone actif (`variant="inkBeta"` dans `Index.tsx`) dispose d’une nouvelle interface dédiée. Les règles multijoueurs, l’inversion des fichiers, le stockage et la synchronisation de lecture restent gérés par les hooks existants.

## Composition

- Un seul cadre persistant : marque, quatre étapes, réglages du micro, chat et sortie. Les messages ne sont pas réabonnés à chaque phrase.
- Règles : cassette-jouet en relief et quatre consignes concrètes. Pas de surbrillance tournante qui pourrait passer pour une progression réelle.
- Studio : cassette centrale, durée maximale, gros bouton micro, retour audio personnalisé et validation explicite. La bande et les états d’envoi occupent une colonne secondaire.
- Imitation : écouter la référence jusqu’au bout, puis enregistrer. Le son de référence est mis en pause avant la capture. Un audio absent ou en erreur ne bloque pas la manche.
- Révélation : cassette de la piste courante, playlist chronologique, précédent/suivant et pause. L’hôte garde la commande collective ; l’invité dispose uniquement du déblocage audio local si son navigateur refuse la lecture.
- Chat escamotable : sons désactivés pendant capture, imitation et révélation. Le jeu n’est pas poussé hors de sa scène.

## Comportements importants

- La prise reste disponible après un refus ou une erreur d’envoi ; une erreur lisible permet de réessayer.
- Le lancement redevient disponible après un échec, plutôt que rester sur « Démarrage ».
- Les contrôles de révélation utilisent l’état partagé : la pause reste une pause entre deux pistes, même quand le média local a momentanément terminé.
- La lecture du retour s’arrête avant une nouvelle capture, lors de l’envoi et au démontage.
- Les statuts du roster utilisent les identifiants, pas les pseudos qui peuvent être identiques.
- Mobile : composition en une colonne ; défilement du contenu seulement, sans débordement horizontal. PC : studio + progression, ou lecteur + playlist.
- Les animations se limitent aux entrées, pressions, bobines et signal actif. `prefers-reduced-motion` et le mode basse consommation désactivent les animations. Le dessin de cassette est natif CSS, sans image volumineuse ni moteur 3D.

## Vérification

Les tests de présentation et d’intégration couvrent capture/arrêt, écoute préalable, piste absente/en erreur, invités, autorité de l’hôte, conservation du brouillon, lecteur local et reprise après refus de lancement.

L’aperçu `outputs/audiophone-bubble-preview.html` montre les composants réels avec données fictives, sans microphone, stockage ni salon connecté. Vérifications visuelles réalisées dans le navigateur Codex, en 390 × 844 et 1440 × 900. Ce n’est pas une validation multijoueur Supabase en production ni un test sur chaque moteur de navigateur.

Aucune migration Supabase n’est requise pour ce changement d’interface.
