// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004'];
let db: PGlite; let group: string;
const asUser = async (id: string) => { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`); };
describe('Private messaging database permissions', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema realtime;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public, realtime to authenticated, anon;
      create table public.profiles(user_id uuid primary key, display_name text, avatar_url text);
      create table public.friendships(id uuid default gen_random_uuid(), requester_id uuid, addressee_id uuid, status text);
      create table public.direct_messages(id uuid primary key default gen_random_uuid(), sender_id uuid, receiver_id uuid, content text, created_at timestamptz default now(), read_at timestamptz);
      alter table public.direct_messages enable row level security;
      create policy dm_select on public.direct_messages for select to authenticated using (auth.uid() in (sender_id,receiver_id));
      create policy dm_insert on public.direct_messages for insert to authenticated with check (auth.uid()=sender_id);
      create policy dm_update on public.direct_messages for update to authenticated using (auth.uid()=receiver_id) with check (auth.uid()=receiver_id);
      grant select, insert, update on public.direct_messages to authenticated;
      create table realtime.messages(extension text, topic text);
      alter table realtime.messages enable row level security;
      grant select on realtime.messages to authenticated;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('test.topic',true) $$;
      create table public.test_broadcasts(payload jsonb, event text, topic text, private boolean);
      create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$ insert into public.test_broadcasts values(payload,event,topic,private) $$;
      insert into auth.users(id) values ${ids.map(id => `('${id}')`).join(',')};
      insert into public.profiles(user_id,display_name) values ${ids.map((id, i) => `('${id}','Player ${i}')`).join(',')};
      insert into public.friendships(requester_id,addressee_id,status) values ('${ids[0]}','${ids[1]}','accepted'),('${ids[0]}','${ids[2]}','accepted');
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/20260930190000_private_messaging_and_groups.sql', import.meta.url), 'utf8'));
  }, 20000);
  afterAll(async () => { await db?.close(); });
  it('rejects strangers and fewer than two friends', async () => {
    await asUser(ids[0]);
    await expect(db.query('select public.create_message_group($1,$2::uuid[])', ['Bad', [ids[1], ids[3]]])).rejects.toThrow('Only accepted friends');
    await expect(db.query('select public.create_message_group($1,$2::uuid[])', ['Bad', [ids[1]]])).rejects.toThrow('Choose between');
  });
  it('creates a persistent group and deduplicates the roster', async () => {
    await asUser(ids[0]);
    const result = await db.query<{ id: string }>('select public.create_message_group($1,$2::uuid[]) as id', ['La bande', [ids[0], ids[1], ids[1], ids[2]]]);
    group = result.rows[0].id;
    const roster = await db.query('select * from public.message_group_members where group_id=$1', [group]);
    expect(roster.rows).toHaveLength(3);
  });
  it('allows members to send and broadcasts only empty invalidations privately', async () => {
    await asUser(ids[1]);
    await db.query("insert into public.group_messages(group_id,sender_id,content,created_at) values($1,$2,$3,'2000-01-01')", [group, ids[1], '  Salut la bande  ']);
    const message = await db.query<{ content: string; created_at: Date }>('select content,created_at from public.group_messages where group_id=$1', [group]);
    expect(message.rows[0].content).toBe('Salut la bande');
    expect(new Date(message.rows[0].created_at).getFullYear()).toBeGreaterThan(2020);
    await db.exec('reset role');
    const notifications = await db.query<{ payload: object; private: boolean; topic: string }>('select * from public.test_broadcasts');
    expect(notifications.rows.length).toBeGreaterThanOrEqual(3);
    expect(notifications.rows.every(row => row.private && JSON.stringify(row.payload) === '{}' && row.topic.startsWith('player-inbox:'))).toBe(true);
  });
  it('hides all group content and metadata from outsiders', async () => {
    await asUser(ids[3]);
    expect((await db.query('select * from public.group_messages')).rows).toHaveLength(0);
    expect((await db.query('select * from public.message_groups')).rows).toHaveLength(0);
    expect((await db.query('select * from public.message_group_members')).rows).toHaveLength(0);
    await expect(db.query('insert into public.group_messages(group_id,sender_id,content) values($1,$2,$3)', [group, ids[3], 'Intrusion'])).rejects.toThrow();
    await expect(db.query('select public.mark_message_group_read($1,now())', [group])).rejects.toThrow('Membership required');
  });
  it('prevents sender spoofing and owner-only operations', async () => {
    await asUser(ids[1]);
    await expect(db.query('insert into public.group_messages(group_id,sender_id,content) values($1,$2,$3)', [group, ids[0], 'Spoof'])).rejects.toThrow();
    await expect(db.query('select public.update_message_group($1,$2)', [group, 'Hack'])).rejects.toThrow('Only the group owner');
    await expect(db.exec(`insert into public.message_group_members(group_id,user_id) values('${group}','${ids[3]}')`)).rejects.toThrow();
  });
  it('returns group unread counts and resets them on a read receipt', async () => {
    await asUser(ids[0]);
    const before = await db.query<{ data: { unread_count: number; members: unknown[] }[] }>('select public.get_message_groups() as data');
    expect(before.rows[0].data[0].unread_count).toBe(1);
    expect(before.rows[0].data[0].members).toHaveLength(3);
    await db.query('select public.mark_message_group_read($1,now())', [group]);
    const after = await db.query<{ data: { unread_count: number }[] }>('select public.get_message_groups() as data');
    expect(after.rows[0].data[0].unread_count).toBe(0);
  });
  it('delivers DM invalidations and forbids modifying received message content', async () => {
    await asUser(ids[0]);
    const result = await db.query<{ id: string; read_at: null }>('insert into public.direct_messages(sender_id,receiver_id,content,read_at) values($1,$2,$3,now()) returning id,read_at', [ids[0], ids[1], 'Coucou']);
    expect(result.rows[0].read_at).toBeNull();
    await asUser(ids[1]);
    await expect(db.query('update public.direct_messages set content=$1 where id=$2', ['Modified', result.rows[0].id])).rejects.toThrow('immutable');
    await db.query('update public.direct_messages set read_at=now() where id=$1', [result.rows[0].id]);
    await db.query('update public.direct_messages set read_at=null where id=$1', [result.rows[0].id]);
    expect((await db.query('select * from public.direct_messages where read_at is not null')).rows).toHaveLength(1);
  });
  it('isolates private inbox subscriptions even with a broad pre-existing policy', async () => {
    await db.exec(`reset role; insert into realtime.messages values('broadcast','irrelevant'); create policy broad on realtime.messages for select to authenticated using(true);`);
    await asUser(ids[1]);
    await db.exec(`select set_config('test.topic','player-inbox:${ids[0]}',false);`);
    expect((await db.query('select * from realtime.messages')).rows).toHaveLength(0);
    await db.exec(`select set_config('test.topic','player-inbox:${ids[1]}',false);`);
    expect((await db.query('select * from realtime.messages')).rows).toHaveLength(1);
  });
  it('transfers ownership on leaving and immediately revokes former member access', async () => {
    await asUser(ids[0]); await db.query('select public.leave_message_group($1)', [group]);
    expect((await db.query('select * from public.group_messages')).rows).toHaveLength(0);
    await db.exec('reset role');
    const result = await db.query<{ owner_id: string }>('select owner_id from public.message_groups where id=$1', [group]);
    expect(result.rows[0].owner_id).not.toBe(ids[0]);
    expect((await db.query('select * from public.group_messages')).rows).toHaveLength(1);
  });
  it('forbids client-generated private inbox events even with a broad insert policy', async () => {
    await db.exec('reset role; grant insert on realtime.messages to authenticated; create policy broad_insert on realtime.messages for insert to authenticated with check(true);');
    await asUser(ids[1]);
    await db.exec(`select set_config('test.topic','player-inbox:${ids[1]}',false);`);
    await expect(db.exec(`insert into realtime.messages values('broadcast','player-inbox:${ids[1]}')`)).rejects.toThrow();
    await db.exec("select set_config('test.topic','unrelated-topic',false); insert into realtime.messages values('broadcast','unrelated-topic');");
  });
  it('exposes neither group RPCs nor the server notifier to anonymous clients', async () => {
    await db.exec('reset role');
    const result = await db.query<{ allowed: boolean }>("select has_function_privilege('anon','public.create_message_group(text,uuid[])','execute') as allowed union all select has_function_privilege('authenticated','public.notify_player_inbox(uuid)','execute')");
    expect(result.rows.every(row => !row.allowed)).toBe(true);
  });
});
