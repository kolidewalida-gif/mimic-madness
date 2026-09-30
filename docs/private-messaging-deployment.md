# Messagerie privée et groupes — mise en ligne

Le frontend est livré dans le dépôt. Les groupes et les événements instantanés
nécessitent aussi l’application de cette migration au projet Supabase de l’app :

`supabase/migrations/20260930190000_private_messaging_and_groups.sql`

Projet configuré : `gvslrjkliipibnvnxybw`. Vérifier ce projet avant toute exécution.
Le push GitHub ne constitue pas une confirmation d’application de la migration.

## Activation par l’administrateur

Appliquer la migration avec le workflow Supabase habituel du projet (CLI liée au
bon projet, après vérification des migrations en attente, ou SQL Editor du
dashboard). Elle est transactionnelle : ne pas exécuter des morceaux isolés.
Ne pas mettre de clé `service_role` dans le navigateur ou le dépôt.

La migration crée les groupes, leurs membres, leur historique et leurs règles
d’accès. Elle ajoute les notifications privées sur `player-inbox:<auth.uid()>`.
Ne pas republier `direct_messages` dans `supabase_realtime` : les notifications
privées ne contiennent aucun texte de message. Les clients relisent les lignes
autorisées par les règles RLS.

Références officielles : [Broadcast depuis la base](https://supabase.com/docs/guides/realtime/broadcast)
et [autorisation des canaux privés](https://supabase.com/docs/guides/realtime/authorization).

Avant activation, les messages privés existants bénéficient du rattrapage
automatique toutes les 2,5 secondes dans une fenêtre visible. La création des
groupes est désactivée si les fonctions serveur ne sont pas disponibles.

## Vérification réelle avec deux ou trois comptes

1. Deux amis ouvrent l’app dans des sessions distinctes. Envoyer un message A → B,
   puis B → A : apparition sans rechargement, compteur non lu mis à jour.
2. Lire en bas de la conversation : le vrai accusé de lecture apparaît chez
   l’expéditeur. Une fenêtre cachée ne doit pas marquer les messages comme lus.
3. Couper/reprendre la connexion de B : récupération des messages manqués sans
   doublon ni disparition de l’historique. Un échec d’envoi conserve le brouillon.
4. Créer un groupe avec deux amis, envoyer depuis chaque compte, renommer et
   ajouter un ami depuis le compte administrateur.
5. Quitter un groupe : accès retiré, historique conservé pour les membres restants,
   administration transférée si nécessaire. Un non-membre ne peut ni lire ni écrire.
6. Essayer l’abonnement au canal privé d’un autre compte : accès refusé.

## Vérifications locales déjà disponibles

`src/lib/messagingDatabase.test.ts` exécute la migration dans PostgreSQL local
(PGlite) et vérifie les règles d’accès. Les tests d’interface et de transport sont
dans `src/components/messaging/Messenger.test.tsx` et
`src/hooks/useInboxRefresh.test.tsx`.

Ces tests et l’aperçu local ne remplacent pas la vérification du Realtime distant
après application de la migration.
