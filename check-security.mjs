// Optional integration check using PostgreSQL in WASM (PGlite).
// PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node check-security.mjs
// No production dependency; see SETUP.md. This does not test the hosted Storage API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {PGlite} = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');
const db = new PGlite();
// Minimal Supabase-provided tables/roles for exercising the actual setup SQL.
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, storage to anon, authenticated;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id bigint generated always as identity primary key, bucket_id text references storage.buckets(id), name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant usage on sequence storage.objects_id_seq to anon, authenticated;
`);
await db.exec(fs.readFileSync(new URL('./supabase-setup.sql', import.meta.url),'utf8'));
const owner='00000000-0000-0000-0000-000000000001';
const stranger='00000000-0000-0000-0000-000000000002';
await db.exec(`insert into auth.users values ('${owner}'), ('${stranger}');
insert into public.admin_users values ('${owner}');
update public.products set active=false where id='serum-2';
insert into storage.objects(bucket_id,name) values ('product-images','existing.png');`);
async function as(role, uid, sql) {
    await db.exec('begin');
    try {
        await db.exec(`set local role ${role}`);
        await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);
        const result = await db.query(sql);
        await db.exec('commit'); return result;
    } catch(error) {await db.exec('rollback'); throw error;}
}
const insert="insert into public.products(id,title,category,short_description,full_description) values ('new','New','mask','Short','Full') returning id";
for(const [role,uid] of [['anon',''],['authenticated',stranger]]) {
    assert.equal((await as(role,uid,'select * from public.products')).rows.length,5);
    await assert.rejects(()=>as(role,uid,insert));
    await assert.rejects(()=>as(role,uid,`insert into public.admin_users values ('${stranger}')`));
    if(role==='anon') {
        await assert.rejects(()=>as(role,uid,"update public.products set title='bad' returning id"));
        await assert.rejects(()=>as(role,uid,'delete from public.products returning id'));
    } else {
        assert.equal((await as(role,uid,"update public.products set title='bad' returning id")).rows.length,0);
        assert.equal((await as(role,uid,'delete from public.products returning id')).rows.length,0);
        assert.equal((await as(role,uid,'select * from public.admin_users')).rows.length,0);
    }
    await assert.rejects(()=>as(role,uid,"insert into storage.objects(bucket_id,name) values ('product-images','bad.png')"));
    assert.equal((await as(role,uid,"update storage.objects set name='bad.png' returning id")).rows.length,0);
    assert.equal((await as(role,uid,'delete from storage.objects returning id')).rows.length,0);
}
assert.equal((await as('authenticated',owner,'select * from public.products')).rows.length,6);
assert.equal((await as('authenticated',owner,'select * from public.admin_users')).rows.length,1);
assert.equal((await as('authenticated',owner,insert)).rows.length,1);
assert.equal((await as('authenticated',owner,"update public.products set active=false where id='new' returning id")).rows.length,1);
assert.equal((await as('authenticated',owner,"delete from public.products where id='new' returning id")).rows.length,1);
await as('authenticated',owner,"insert into storage.objects(bucket_id,name) values ('product-images','owner.png')");
assert.equal((await as('authenticated',owner,"update storage.objects set name='replaced.png' where name='owner.png' returning id")).rows.length,1);
assert.equal((await as('authenticated',owner,"delete from storage.objects where name='replaced.png' returning id")).rows.length,1);
await assert.rejects(()=>as('authenticated',owner,"update public.products set category='invalid'"));
await db.close();
console.log('PASS: setup SQL executes; anonymous and non-owner product/storage writes denied; membership self-promotion denied; hidden reads denied; owner CRUD allowed; category constraint enforced.');
console.log('Scope: PostgreSQL RLS with Supabase role/schema stubs; hosted Auth and Storage service still require deployment verification.');
