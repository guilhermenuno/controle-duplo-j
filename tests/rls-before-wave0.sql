create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

grant anon, authenticated to postgres;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  role text not null default 'user',
  approved boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.pacientes (
  id uuid primary key,
  nome text not null,
  cadastrado_por uuid not null,
  updated_at timestamptz not null default now()
);

create table public.patient_audit_log (
  id uuid primary key,
  patient_id uuid,
  actor_id uuid
);

create table public.patient_notifications (
  id uuid primary key,
  patient_id uuid
);

create table public.pacientes_troca_programada (
  id uuid primary key,
  nome text not null,
  created_by uuid not null,
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and is_active = true
  );
$$;

create function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approved = true
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.pacientes enable row level security;
alter table public.patient_audit_log enable row level security;
alter table public.patient_notifications enable row level security;
alter table public.pacientes_troca_programada enable row level security;

create policy "Usuarios autenticados podem ver pacientes"
on public.pacientes for select to authenticated using (true);
create policy "Usuarios autenticados podem inserir pacientes"
on public.pacientes for insert to authenticated with check (true);
create policy "Usuarios autenticados podem atualizar pacientes"
on public.pacientes for update to authenticated using (true) with check (true);

create policy "profiles_select_self_or_admin"
on public.profiles for select using (auth.uid() = id or public.is_admin_user());
create policy "profiles_update_admin_only"
on public.profiles for update using (public.is_admin_user()) with check (public.is_admin_user());
create policy "pacientes_select_approved"
on public.pacientes for select using (public.is_approved_user());
create policy "pacientes_insert_approved"
on public.pacientes for insert with check (public.is_approved_user() and auth.uid() = cadastrado_por);
create policy "pacientes_update_approved"
on public.pacientes for update using (public.is_approved_user()) with check (public.is_approved_user());
create policy "pacientes_delete_admin_only"
on public.pacientes for delete using (public.is_admin_user());
create policy "audit_select_approved"
on public.patient_audit_log for select using (public.is_approved_user());
create policy "audit_insert_approved"
on public.patient_audit_log for insert with check (public.is_approved_user());
create policy "notifications_select_admin"
on public.patient_notifications for select using (public.is_admin_user());
create policy "notifications_insert_approved"
on public.patient_notifications for insert with check (public.is_approved_user());
create policy "trocas_select_approved"
on public.pacientes_troca_programada for select using (public.is_approved_user());
create policy "trocas_insert_approved"
on public.pacientes_troca_programada for insert with check (public.is_approved_user() and auth.uid() = created_by);
create policy "trocas_update_approved"
on public.pacientes_troca_programada for update using (public.is_approved_user()) with check (public.is_approved_user());
create policy "trocas_delete_admin_only"
on public.pacientes_troca_programada for delete using (public.is_admin_user());

grant usage on schema public, auth to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

insert into public.profiles (id, email, role, approved, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'pending@example.test', 'user', false, true),
  ('22222222-2222-2222-2222-222222222222', 'approved@example.test', 'user', true, true),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', 'admin', true, true);

insert into public.pacientes (id, nome, cadastrado_por) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fixture patient', '22222222-2222-2222-2222-222222222222');
