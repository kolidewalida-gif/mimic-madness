-- Les enregistrements de voix deviennent définitivement immuables.
--
-- La migration précédente gardait une fenêtre de deux minutes pour que l'appli
-- puisse retirer un fichier qu'elle venait de déposer, quand l'insertion des
-- métadonnées échouait juste après. La sonde a montré que cette policy ne sert à
-- rien : l'API Storage lit l'objet avant de le supprimer, donc une suppression
-- exige aussi le droit de `select`. Or c'est précisément `select` qu'on a retiré
-- pour empêcher d'énumérer toutes les voix du jeu — vérifié, `object/list`
-- renvoie une liste vide même avec le préfixe d'un salon qui contient bel et
-- bien des fichiers.
--
-- Entre les deux, le choix est net. Un fichier orphelin de quelques dizaines de
-- kilooctets, dans le cas rare où l'écriture des métadonnées échoue après un
-- envoi réussi, ne coûte presque rien. Une archive de voix que n'importe qui peut
-- lister et effacer, si. On garde donc la fermeture complète, et le côté client
-- cesse de tenter une suppression qu'il n'obtiendra pas.
--
-- Le ménage des orphelins reste à faire côté serveur, avec la clé de service qui
-- conserve tous les droits sur ce seau.

drop policy if exists "Only a fresh upload can be rolled back" on storage.objects;

-- Policy de nettoyage temporaire utilisée pour retirer le fichier déposé par la
-- sonde de vérification. Elle ne doit pas survivre à cette migration.
drop policy if exists "temp probe cleanup" on storage.objects;
