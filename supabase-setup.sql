-- Executar este script no SQL Editor do Supabase antes de usar a versão com segurança reforçada.
-- Ele cria perfis, aprovação administrativa, auditoria e a lista de trocas programadas.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  approved boolean not null default false,
  is_active boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text;

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

alter table public.pacientes
  add column if not exists retirado_por uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists prazo_retirada_meses integer not null default 3,
  add column if not exists prazo_retirada_dias integer not null default 0,
  add column if not exists data_prazo_retirada date,
  add column if not exists contato_sms_autorizado boolean not null default false,
  add column if not exists contato_whatsapp_autorizado boolean not null default false;

update public.pacientes
set data_prazo_retirada = coalesce(data_prazo_retirada, data_3_meses, data_colocacao + interval '3 months')
where data_prazo_retirada is null;

drop trigger if exists pacientes_set_updated_at on public.pacientes;
create trigger pacientes_set_updated_at
before update on public.pacientes
for each row execute procedure public.set_updated_at();

create table if not exists public.patient_audit_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid,
  target_table text not null,
  action text not null,
  actor_id uuid references auth.users(id),
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.patient_audit_log enable row level security;

create table if not exists public.patient_notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid,
  target_table text not null default 'pacientes',
  notification_type text not null,
  channel text not null check (channel in ('sms', 'whatsapp')),
  destination text not null,
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.patient_notifications enable row level security;

create unique index if not exists patient_notifications_unique_sent
on public.patient_notifications (patient_id, target_table, notification_type, channel)
where status = 'sent';

create table if not exists public.pacientes_troca_programada (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  registro_hospitalar text not null,
  telefone text,
  ultima_troca_data date not null,
  intervalo_meses integer not null default 3,
  intervalo_dias integer not null default 0,
  proxima_troca_data date not null,
  observacoes text,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pacientes_troca_programada enable row level security;

drop trigger if exists pacientes_troca_programada_set_updated_at on public.pacientes_troca_programada;
create trigger pacientes_troca_programada_set_updated_at
before update on public.pacientes_troca_programada
for each row execute procedure public.set_updated_at();

create or replace function public.is_approved_user()
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

create or replace function public.is_admin_user()
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
      and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin_user());

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
on public.profiles
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "pacientes_select_approved" on public.pacientes;
create policy "pacientes_select_approved"
on public.pacientes
for select
using (public.is_approved_user());

drop policy if exists "pacientes_insert_approved" on public.pacientes;
create policy "pacientes_insert_approved"
on public.pacientes
for insert
with check (
  public.is_approved_user()
  and auth.uid() = cadastrado_por
);

drop policy if exists "pacientes_update_approved" on public.pacientes;
create policy "pacientes_update_approved"
on public.pacientes
for update
using (public.is_approved_user())
with check (public.is_approved_user());

drop policy if exists "pacientes_delete_admin_only" on public.pacientes;
create policy "pacientes_delete_admin_only"
on public.pacientes
for delete
using (public.is_admin_user());

drop policy if exists "audit_select_approved" on public.patient_audit_log;
create policy "audit_select_approved"
on public.patient_audit_log
for select
using (public.is_approved_user());

drop policy if exists "audit_insert_approved" on public.patient_audit_log;
create policy "audit_insert_approved"
on public.patient_audit_log
for insert
with check (public.is_approved_user());

drop policy if exists "notifications_select_admin" on public.patient_notifications;
create policy "notifications_select_admin"
on public.patient_notifications
for select
using (public.is_admin_user());

drop policy if exists "notifications_insert_approved" on public.patient_notifications;
create policy "notifications_insert_approved"
on public.patient_notifications
for insert
with check (public.is_approved_user());

drop policy if exists "trocas_select_approved" on public.pacientes_troca_programada;
create policy "trocas_select_approved"
on public.pacientes_troca_programada
for select
using (public.is_approved_user());

drop policy if exists "trocas_insert_approved" on public.pacientes_troca_programada;
create policy "trocas_insert_approved"
on public.pacientes_troca_programada
for insert
with check (
  public.is_approved_user()
  and auth.uid() = created_by
);

drop policy if exists "trocas_update_approved" on public.pacientes_troca_programada;
create policy "trocas_update_approved"
on public.pacientes_troca_programada
for update
using (public.is_approved_user())
with check (public.is_approved_user());

drop policy if exists "trocas_delete_admin_only" on public.pacientes_troca_programada;
create policy "trocas_delete_admin_only"
on public.pacientes_troca_programada
for delete
using (public.is_admin_user());

-- Após executar o script, promova o primeiro administrador manualmente:
-- update public.profiles
-- set approved = true, role = 'admin', approved_at = now(), approved_by = id
-- where id = 'UUID-DO-USUARIO-ADMIN';
