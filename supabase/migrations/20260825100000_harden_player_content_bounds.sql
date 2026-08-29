-- Bornes serveur sur le contenu écrit par les joueurs.
--
-- Constat de départ : les seules limites de longueur du chat et des pseudos
-- vivaient dans src/lib/validation.ts, donc côté navigateur. Comme les policies
-- RLS des tables de jeu autorisent l'INSERT direct avec la clé anon, ces limites
-- ne coûtaient qu'une requête HTTP à contourner : rien n'empêchait d'écrire un
-- message de dix mégaoctets, un pseudo de mille caractères, ou du texte truffé
-- de caractères de contrôle qui cassent le rendu et permettent de se faire
-- passer pour un autre joueur en glissant un retour chariot dans un nom.
--
-- Ce fichier pose les mêmes bornes en base, où elles ne se contournent pas, et
-- ajoute une limite de débit sur le chat. Les valeurs reprennent exactement
-- celles des schémas zod existants pour ne rien casser côté client.

-- ---------------------------------------------------------------------------
-- Aide : le texte est-il exempt de caractères de contrôle ?
--
-- `[[:cntrl:]]` couvre aussi le retour à la ligne et la tabulation, qui sont
-- légitimes dans un message de chat. On les retire avant de tester plutôt que
-- d'énumérer les plages de codes, plus lisible et sans échappement fragile.
-- ---------------------------------------------------------------------------
create or replace function public.text_has_no_control_chars(p_value text, p_allow_newlines boolean default false)
returns boolean
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  select case
    when p_value is null then true
    when p_allow_newlines then replace(replace(p_value, chr(10), ''), chr(9), '') !~ '[[:cntrl:]]'
    else p_value !~ '[[:cntrl:]]'
  end;
$$;

comment on function public.text_has_no_control_chars(text, boolean) is
  'Vrai si le texte ne contient aucun caractère de contrôle. Le retour à la ligne et la tabulation peuvent être tolérés.';

-- ---------------------------------------------------------------------------
-- Pseudonymes : 24 caractères, comme playerNameSchema.
-- ---------------------------------------------------------------------------
alter table public.lobby_players
  drop constraint if exists lobby_players_player_name_sane,
  add constraint lobby_players_player_name_sane check (
    char_length(player_name) between 1 and 24
    and public.text_has_no_control_chars(player_name)
  );

alter table public.lobby_players
  drop constraint if exists lobby_players_player_id_sane,
  add constraint lobby_players_player_id_sane check (
    char_length(player_id) between 1 and 64
    and player_id ~ '^[A-Za-z0-9_-]+$'
  );

alter table public.lobby_players
  drop constraint if exists lobby_players_connection_status_known,
  add constraint lobby_players_connection_status_known check (
    connection_status in ('connected', 'disconnected')
  );

alter table public.chat_messages
  drop constraint if exists chat_messages_player_name_sane,
  add constraint chat_messages_player_name_sane check (
    char_length(player_name) between 1 and 24
    and public.text_has_no_control_chars(player_name)
  );

alter table public.video_clips
  drop constraint if exists video_clips_player_name_sane,
  add constraint video_clips_player_name_sane check (
    char_length(player_name) between 1 and 24
    and public.text_has_no_control_chars(player_name)
  );

alter table public.player_submissions
  drop constraint if exists player_submissions_player_name_sane,
  add constraint player_submissions_player_name_sane check (
    char_length(player_name) between 1 and 24
    and public.text_has_no_control_chars(player_name)
  );

alter table public.quiz_answers
  drop constraint if exists quiz_answers_player_name_sane,
  add constraint quiz_answers_player_name_sane check (
    player_name is null
    or (char_length(player_name) between 1 and 24 and public.text_has_no_control_chars(player_name))
  );

alter table public.undercover_players
  drop constraint if exists undercover_players_player_name_sane,
  add constraint undercover_players_player_name_sane check (
    char_length(player_name) between 1 and 24
    and public.text_has_no_control_chars(player_name)
  );

alter table public.profiles
  drop constraint if exists profiles_display_name_sane,
  add constraint profiles_display_name_sane check (
    display_name is null
    or (char_length(display_name) between 1 and 24 and public.text_has_no_control_chars(display_name))
  );

-- Les avatars sont stockés en base64 dans la colonne, avec un plafond de 2 Mio
-- côté client. Trois millions de caractères laissent la marge de l'encodage
-- base64 sans permettre d'y déverser un fichier de plusieurs centaines de mégas.
alter table public.profiles
  drop constraint if exists profiles_avatar_url_bounded,
  add constraint profiles_avatar_url_bounded check (
    avatar_url is null or char_length(avatar_url) <= 3000000
  );

-- ---------------------------------------------------------------------------
-- Contenu du chat : 500 caractères pour du texte, 2000 pour les charges utiles
-- techniques (URL de GIF, chemin de son), exactement le découpage appliqué par
-- useLobbyChat.sendMessage.
-- ---------------------------------------------------------------------------
alter table public.chat_messages
  drop constraint if exists chat_messages_type_known,
  add constraint chat_messages_type_known check (
    message_type in ('text', 'image', 'gif', 'voice', 'soundboard')
  );

alter table public.chat_messages
  drop constraint if exists chat_messages_content_sane,
  add constraint chat_messages_content_sane check (
    char_length(content) >= 1
    and char_length(content) <= (case when message_type = 'text' then 500 else 2000 end)
    and public.text_has_no_control_chars(content, true)
  );

-- ---------------------------------------------------------------------------
-- Textes de jeu : mêmes bornes que les schémas zod correspondants.
-- ---------------------------------------------------------------------------
alter table public.quiz_answers
  drop constraint if exists quiz_answers_answer_bounded,
  add constraint quiz_answers_answer_bounded check (
    answer is null or char_length(answer) <= 200
  );

alter table public.undercover_players
  drop constraint if exists undercover_players_clue_bounded,
  add constraint undercover_players_clue_bounded check (
    current_clue is null
    or (char_length(current_clue) between 1 and 60 and public.text_has_no_control_chars(current_clue))
  );

alter table public.video_clips
  drop constraint if exists video_clips_name_bounded,
  add constraint video_clips_name_bounded check (
    char_length(name) between 1 and 120
    and public.text_has_no_control_chars(name)
  );

-- ---------------------------------------------------------------------------
-- Salons : le code est un identifiant partagé de vive voix, il n'a aucune
-- raison d'accepter autre chose que des majuscules et des chiffres.
-- ---------------------------------------------------------------------------
alter table public.lobbies
  drop constraint if exists lobbies_code_shape,
  add constraint lobbies_code_shape check (code ~ '^[A-Z0-9]{4,8}$');

alter table public.lobbies
  drop constraint if exists lobbies_host_id_shape,
  add constraint lobbies_host_id_shape check (
    char_length(host_id) between 1 and 64
    and host_id ~ '^[A-Za-z0-9_-]+$'
  );

alter table public.lobbies
  drop constraint if exists lobbies_max_players_bounded,
  add constraint lobbies_max_players_bounded check (max_players between 2 and 64);

-- ---------------------------------------------------------------------------
-- Limite de débit du chat.
--
-- Dix messages par tranche de dix secondes et par joueur dans un salon donné.
-- Un jeu de soirée est bavard, la borne est donc large : elle ne gêne pas une
-- conversation nourrie, mais elle rend inutile un script qui voudrait noyer le
-- salon ou saturer la table. Le déclencheur ne s'applique pas à service_role,
-- pour laisser les tâches serveur et les migrations libres.
-- ---------------------------------------------------------------------------
create index if not exists chat_messages_rate_lookup_idx
  on public.chat_messages (lobby_id, player_id, created_at desc);

create or replace function public.enforce_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_recent integer;
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  select count(*) into v_recent
  from public.chat_messages
  where lobby_id = new.lobby_id
    and player_id = new.player_id
    and created_at > now() - interval '10 seconds';

  if v_recent >= 10 then
    raise exception 'chat rate limit exceeded'
      using errcode = '54000', hint = 'Attends quelques secondes avant de renvoyer un message.';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_messages_rate_limit on public.chat_messages;
create trigger chat_messages_rate_limit
  before insert on public.chat_messages
  for each row execute function public.enforce_chat_rate_limit();

comment on function public.enforce_chat_rate_limit() is
  'Plafonne le chat à dix messages par dix secondes et par joueur dans un salon.';
