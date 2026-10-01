# Mimic Master · imitation et 2V2

## État du déploiement · 1er octobre 2026

Migration `20261001143000_imitation_mimic_master` appliquée au projet
`gvslrjkliipibnvnxybw` (« mime master »), dans une transaction comprenant
son inscription à l’historique des migrations avec la version du dépôt.

Vérifications en ligne effectuées : table et contraintes présentes, RLS activée,
écritures directes interdites aux rôles `anon` et `authenticated`, droits
d’exécution des deux RPC présents. Depuis la configuration publique du jeu,
`read_mimic_masters` et `cast_mimic_master` répondent HTTP 200 ; une lecture
avec des identifiants fictifs est vide et une attribution invalide est rejetée.
Aucun salon ni vote de joueur n’a été créé ou modifié pour ces contrôles.

Les scénarios avec deux participants réels décrits plus bas restent à vérifier
en partie ; les contrôles d’API ne remplacent pas ce test multijoueur.

## Activation en ligne

Le code et les tests ne suffisent pas à activer la mécanique dans Supabase.
Appliquer `supabase/migrations/20261001143000_imitation_mimic_master.sql` au
projet de l’application (`gvslrjkliipibnvnxybw`), avec le workflow habituel
ou le SQL Editor. Vérifier auparavant les migrations en attente : ne pas
déployer toutes les migrations en bloc sans revue.

Cette migration nécessite le schéma imitation existant (`clip_id`,
`voting_session`, `game_teams`). Elle ne modifie pas les votes Bof / Top.
Sans les deux nouveaux RPC, l’interface indique explicitement que les
Mimic Masters ne sont pas activés et le jeu conserve le classement classique.
Un push GitHub ne confirme pas l’application de la migration.

## Règles validées

- Une couronne par joueur et par manche, définitive après attribution.
- Attribution pendant l’imitation affichée, jamais après les résultats.
- Ni sa propre prise, ni son propre duo ; au moins un enregistrement disponible.
- +1 au favori et la moitié de son score brut de votes au joueur qui l’a choisi.
- Bonus négatifs et demi-points possibles ; aucun calcul récursif des bonus.
- En 2V2, un favori désigne tout le duo. Chaque membre peut donner sa couronne,
  mais chaque couronne reçue et chaque bonus de flair sont comptés une seule fois
  dans le score de l’équipe.

La table refuse les écritures directes des clients. Les RPC valident le salon,
la phase, l’index de lecture et les auteurs, puis enregistrent un choix unique.
L’identité des invités suit le protocole existant du jeu (identifiant navigateur),
sans ajouter une nouvelle authentification des invités dans cette fonctionnalité.

## Vérifications avant annonce d’activation

Avec deux navigateurs et de vrais participants, vérifier l’attribution, le
rechargement de page, les résultats identiques et une nouvelle manche. En 2V2,
vérifier deux couronnes distinctes données par les membres du même duo et une
prise partielle. Tester un double clic, un passage de l’hôte pendant un clic,
et une coupure réseau après enregistrement.

Les tests `mimicMasterDatabase.test.ts` exécutent la migration dans PostgreSQL
local (PGlite). Ils ne prouvent pas son déploiement sur le projet en ligne.

## Référence produit

Adaptation originale de la mécanique Meme Buddy décrite dans la
[FAQ officielle Make it Meme](https://makeitmeme.com/fr/help/), avec un bonus
de réception de +1 adapté au barème +1/−1 du jeu, plutôt que son bonus +10.
La mascotte couronnée et le médaillon sont propres à Mimic Master.
