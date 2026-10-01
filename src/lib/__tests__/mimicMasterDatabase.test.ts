// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';

let db: PGlite;
const lobby = '00000000-0000-0000-0000-000000000001';
const session = '00000000-0000-0000-0000-000000000002';
const cast = (voter = 'a', targets: (string | null)[] | null = ['b'], index: number | null = 1, round = 1) =>
  db.query<{ ok: boolean }>('select public.cast_mimic_master($1,$2,$3,$4::text[],$5,$6) as ok', [lobby, round, voter, targets, session, index]).then(result => result.rows[0].ok);
const read = (self = 'a') => db.query('select * from public.read_mimic_masters($1,1,$2)', [lobby, self]);

describe('Authoritative Mimic Master database', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table lobbies(id uuid primary key, game_mode text);
      create table game_rounds(id uuid primary key, lobby_id uuid, round_number integer, phase text);
      create table voting_session(id uuid primary key, lobby_id uuid, round_number integer, current_imitation_index integer);
      create table lobby_players(lobby_id uuid, player_id text, joined_at timestamptz);
      create table player_imitations(lobby_id uuid, round_number integer, player_id text, is_ready boolean, clip_id text);
      create table game_teams(lobby_id uuid, player_id text, team_number integer);`);
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261001143000_imitation_mimic_master.sql', import.meta.url), 'utf8'));
  }, 20000);
  beforeEach(async () => {
    await db.exec(`reset role;
      truncate imitation_masters,lobbies,game_rounds,voting_session,lobby_players,player_imitations,game_teams cascade;
      insert into lobbies values('${lobby}','normal');
      insert into game_rounds values('${lobby}','${lobby}',1,'voting');
      insert into voting_session values('${session}','${lobby}',1,1);
      insert into lobby_players select '${lobby}',id,'2026-01-01'::timestamptz + ord*interval '1 second' from unnest(array['a','b','c','d']) with ordinality as p(id,ord);
      insert into player_imitations select '${lobby}',1,player_id,true,'clip-'||player_id from lobby_players;`);
  });
  afterAll(async () => { await db?.close(); });
  it('persists a valid award and makes every repeated or changed choice fail', async () => {
    expect(await cast()).toBe(true);
    expect(await cast()).toBe(false);
    await db.exec('update voting_session set current_imitation_index=2');
    expect(await cast('a', ['c'], 2)).toBe(false);
    expect((await read()).rows).toHaveLength(1);
    expect((await read()).rows[0]).toMatchObject({ target_player_ids: ['b'] });
  });
  it('allows different players to choose independently', async () => {
    const results = await Promise.all([cast('a'), cast('c'), cast('a')]);
    expect(results).toEqual([true, true, false]);
  });
  it('rejects self, unknown roster identities, null and missing recordings', async () => {
    expect(await cast('b')).toBe(false);
    expect(await cast('unknown')).toBe(false);
    expect(await cast('a', ['unknown'])).toBe(false);
    expect(await cast('a', null)).toBe(false);
    expect(await cast('a', ['b', null])).toBe(false);
    await db.exec("update player_imitations set clip_id=null where player_id='b'");
    expect(await cast()).toBe(false);
  });
  it('rejects stale indices and awards after the vote phase closes', async () => {
    expect(await cast('a', ['b'], 0)).toBe(false);
    expect(await cast('a', ['b'], null)).toBe(false);
    expect(await cast('a', ['c'], 1)).toBe(false);
    await db.exec("update game_rounds set phase='results'");
    expect(await cast()).toBe(false);
  });
  it('allows a new award next round and never reuses a previous session', async () => {
    expect(await cast()).toBe(true);
    expect(await cast('a', ['b'], 1, 2)).toBe(false);
    await db.exec("update game_rounds set round_number=2; update voting_session set round_number=2; update player_imitations set round_number=2");
    expect(await cast('a', ['b'], 1, 2)).toBe(true);
  });
  it('keeps other choices secret until results, and hides data from unknown players', async () => {
    expect(await cast()).toBe(true);
    expect((await read('c')).rows).toHaveLength(0);
    expect((await read('unknown')).rows).toHaveLength(0);
    await db.exec("update game_rounds set phase='results'");
    expect((await read('c')).rows).toHaveLength(1);
  });
  it('permits guest RPCs but forbids direct inserts or updates', async () => {
    await db.exec('set role anon');
    expect(await cast()).toBe(true);
    await expect(db.exec(`insert into imitation_masters(lobby_id,round_number,voter_player_id,target_player_ids) values('${lobby}',1,'c',array['b'])`)).rejects.toThrow('permission denied');
    await expect(db.exec("update imitation_masters set target_player_ids=array['c']")).rejects.toThrow('permission denied');
  });
  it('selects an entire opposing duo, with one recording sufficient', async () => {
    await db.exec(`update lobbies set game_mode='2v2'; insert into game_teams values('${lobby}','a',1),('${lobby}','b',1),('${lobby}','c',2),('${lobby}','d',2); update player_imitations set clip_id=null where player_id='d'`);
    expect(await cast('a', ['c'], 1)).toBe(false);
    expect(await cast('a', ['b', 'c'], 1)).toBe(false);
    expect(await cast('a', ['a', 'b'], 1)).toBe(false);
    expect(await cast('a', ['c', 'd'], 0)).toBe(false);
    expect(await cast('a', ['d', 'c'], 1)).toBe(true);
    expect(await cast('b', ['c', 'd'], 1)).toBe(true);
    expect((await read()).rows[0]).toMatchObject({ target_team_number: 2, voter_team_number: 1, target_player_ids: ['c', 'd'] });
  });
});
