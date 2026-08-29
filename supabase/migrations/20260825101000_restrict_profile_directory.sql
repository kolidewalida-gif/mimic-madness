-- L'annuaire des joueurs cesse d'être lisible sans compte.
--
-- La policy d'origine était `SELECT ... USING (true)` pour le rôle `public`,
-- donc n'importe qui, avec la seule clé anon publiée dans le bundle, pouvait
-- aspirer la table `profiles` entière : tous les pseudonymes et tous les
-- avatars du jeu, en une requête, sans jamais se connecter.
--
-- Aucun écran anonyme n'en a besoin. Les cinq lectures de `profiles` du client
-- vivent dans des contextes déjà authentifiés : useAuth (son propre profil),
-- useFriends, PublicProfileView et la recherche de SocialExperience (Social
-- Studio), et AdminSuperPanel. Les avatars affichés dans un salon viennent de
-- `player_avatars` et `player_global_avatars`, pas d'ici : un invité continue
-- donc de voir la table du salon exactement comme avant.

drop policy if exists "Profiles are viewable by everyone" on public.profiles;

create policy "Signed-in players can read the profile directory"
  on public.profiles
  for select
  to authenticated
  using (true);

-- L'écriture était déjà correctement gardée par auth.uid(), mais la policy
-- d'UPDATE portait sur le rôle `public` et n'avait pas de clause WITH CHECK :
-- la ligne visée était bien la sienne, rien n'empêchait en revanche d'y écrire
-- un `user_id` appartenant à quelqu'un d'autre et de lui voler son profil.
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Players can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Players can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);
