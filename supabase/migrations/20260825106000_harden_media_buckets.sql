-- Bornes et immuabilité sur les seaux de médias.
--
-- Trois choses n'allaient pas sur `audio-phone`, où atterrissent les
-- enregistrements de voix des joueurs :
--
-- 1. Aucune limite de taille, aucun type autorisé. Le seau est public et servi
--    par le CDN : c'était un hébergement de fichiers gratuit et illimité, pour
--    n'importe quel contenu, ouvert à tout Internet avec la clé anon.
-- 2. Une policy de lecture qui autorisait `list` sur tout le seau, donc
--    l'énumération de l'intégralité des voix enregistrées.
-- 3. Des policies d'`update` et de `delete` gardées par le seul `bucket_id` :
--    n'importe qui pouvait écraser ou effacer l'enregistrement de n'importe qui.
--
-- La voix est une donnée personnelle, et le seau reçoit celle de mineurs
-- potentiels. C'est le point le plus sensible du lot.
--
-- Ce qu'on peut réparer sans identité vérifiable côté Storage — les policies de
-- `storage.objects` n'ont pas accès au jeton de siège, et les invités n'ont pas
-- de JWT — se fonde sur des règles structurelles :
--
-- * Les chemins portent tous un `Date.now()` (voir `useAudioPhoneGameV2`, où
--   `originalPath` vaut `<lobby>/<round>/<player>_<timestamp>_original.webm`).
--   Aucun chemin n'est donc jamais écrit deux fois : `update` ne sert à rien et
--   part, ce qui rend chaque enregistrement immuable une fois déposé.
-- * La suppression ne subsiste que pour le rollback de l'appli, qui a lieu dans
--   la seconde qui suit l'envoi quand l'insertion des métadonnées échoue. On la
--   restreint aux objets de moins de deux minutes : le rollback fonctionne,
--   l'effacement d'un enregistrement plus ancien devient impossible.
-- * `list` disparaît. La lecture d'un fichier connu continue de passer par
--   `/object/public/`, qui ne consulte pas ces policies sur un seau public, donc
--   l'écoute en jeu n'est pas touchée.

-- ---------------------------------------------------------------------------
-- Taille et types
-- ---------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 26214400, -- 25 Mio, très large pour une phrase parlée
       allowed_mime_types = array[
         'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
         'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/x-m4a', 'audio/aac'
       ]
 where id = 'audio-phone';

update storage.buckets
   set file_size_limit = 52428800, -- 50 Mio par piste
       allowed_mime_types = array[
         'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm',
         'audio/wav', 'audio/x-wav', 'audio/aac'
       ]
 where id = 'adaptive-music';

-- Les seaux privés n'avaient pas de bornes non plus, alors qu'ils reçoivent des
-- images de profil et des extraits.
update storage.buckets
   set file_size_limit = 5242880, -- 5 Mio
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
 where id = 'avatar';

-- ---------------------------------------------------------------------------
-- Policies d'`audio-phone`
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read audio-phone files" on storage.objects;
drop policy if exists "Public can update audio-phone files" on storage.objects;
drop policy if exists "Public can delete audio-phone files" on storage.objects;

-- L'envoi reste ouvert : sans identité vérifiable, c'est la seule façon de
-- laisser un invité déposer sa phrase. Les bornes de taille et de type ci-dessus
-- sont ce qui empêche d'en faire autre chose qu'un enregistrement de voix.
drop policy if exists "Public can upload audio-phone files" on storage.objects;
create policy "Players can upload a voice recording"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'audio-phone');

-- Fenêtre de rollback seulement. Passé deux minutes, l'enregistrement est acquis.
create policy "Only a fresh upload can be rolled back"
  on storage.objects for delete
  to anon, authenticated
  using (
    bucket_id = 'audio-phone'
    and created_at > now() - interval '2 minutes'
  );

-- Le service garde la main pour la maintenance et la purge des vieux médias.
drop policy if exists "Service role manages audio-phone" on storage.objects;
create policy "Service role manages audio-phone"
  on storage.objects for all
  to service_role
  using (bucket_id = 'audio-phone')
  with check (bucket_id = 'audio-phone');
