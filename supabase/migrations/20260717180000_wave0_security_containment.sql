begin;

-- Security-definer helpers use fully qualified object names, so they do not
-- need a mutable schema search path.
alter function public.handle_new_user() set search_path = '';
alter function public.is_admin_user() set search_path = '';
alter function public.is_approved_user() set search_path = '';
alter function public.set_updated_at() set search_path = '';

-- Trigger functions are not public APIs. RLS helpers are callable only by
-- authenticated sessions, which is the only role referenced by the policies.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.is_admin_user() from public, anon;
revoke execute on function public.is_approved_user() from public, anon;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_approved_user() to authenticated;

-- Remove the three legacy policies whose permissive OR semantics bypass the
-- approved-user policies below.
drop policy if exists "Usuarios autenticados podem ver pacientes" on public.pacientes;
drop policy if exists "Usuarios autenticados podem inserir pacientes" on public.pacientes;
drop policy if exists "Usuarios autenticados podem atualizar pacientes" on public.pacientes;

-- Recreate every policy on the five protected tables so the role boundary and
-- auth helper evaluation are explicit and consistent.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin_only" on public.profiles;
drop policy if exists "pacientes_select_approved" on public.pacientes;
drop policy if exists "pacientes_insert_approved" on public.pacientes;
drop policy if exists "pacientes_update_approved" on public.pacientes;
drop policy if exists "pacientes_delete_admin_only" on public.pacientes;
drop policy if exists "audit_select_approved" on public.patient_audit_log;
drop policy if exists "audit_insert_approved" on public.patient_audit_log;
drop policy if exists "notifications_select_admin" on public.patient_notifications;
drop policy if exists "notifications_insert_approved" on public.patient_notifications;
drop policy if exists "trocas_select_approved" on public.pacientes_troca_programada;
drop policy if exists "trocas_insert_approved" on public.pacientes_troca_programada;
drop policy if exists "trocas_update_approved" on public.pacientes_troca_programada;
drop policy if exists "trocas_delete_admin_only" on public.pacientes_troca_programada;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select public.is_admin_user())
);

create policy "profiles_update_admin_only"
on public.profiles
for update
to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

create policy "pacientes_select_approved"
on public.pacientes
for select
to authenticated
using ((select public.is_approved_user()));

create policy "pacientes_insert_approved"
on public.pacientes
for insert
to authenticated
with check (
  (select public.is_approved_user())
  and (select auth.uid()) = cadastrado_por
);

create policy "pacientes_update_approved"
on public.pacientes
for update
to authenticated
using ((select public.is_approved_user()))
with check ((select public.is_approved_user()));

create policy "pacientes_delete_admin_only"
on public.pacientes
for delete
to authenticated
using ((select public.is_admin_user()));

create policy "audit_select_approved"
on public.patient_audit_log
for select
to authenticated
using ((select public.is_approved_user()));

create policy "audit_insert_approved"
on public.patient_audit_log
for insert
to authenticated
with check ((select public.is_approved_user()));

create policy "notifications_select_admin"
on public.patient_notifications
for select
to authenticated
using ((select public.is_admin_user()));

create policy "notifications_insert_approved"
on public.patient_notifications
for insert
to authenticated
with check ((select public.is_approved_user()));

create policy "trocas_select_approved"
on public.pacientes_troca_programada
for select
to authenticated
using ((select public.is_approved_user()));

create policy "trocas_insert_approved"
on public.pacientes_troca_programada
for insert
to authenticated
with check (
  (select public.is_approved_user())
  and (select auth.uid()) = created_by
);

create policy "trocas_update_approved"
on public.pacientes_troca_programada
for update
to authenticated
using ((select public.is_approved_user()))
with check ((select public.is_approved_user()));

create policy "trocas_delete_admin_only"
on public.pacientes_troca_programada
for delete
to authenticated
using ((select public.is_admin_user()));

-- Abort the transaction if policy drift would leave any unexpected access path.
do $$
declare
  protected_policy_count integer;
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pacientes'
      and policyname in (
        'Usuarios autenticados podem ver pacientes',
        'Usuarios autenticados podem inserir pacientes',
        'Usuarios autenticados podem atualizar pacientes'
      )
  ) then
    raise exception 'Wave 0 failed: a legacy patient policy remains';
  end if;

  select count(*)
  into protected_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'profiles',
      'pacientes',
      'patient_audit_log',
      'patient_notifications',
      'pacientes_troca_programada'
    );

  if protected_policy_count <> 14 then
    raise exception 'Wave 0 failed: expected 14 protected policies, found %', protected_policy_count;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'pacientes',
        'patient_audit_log',
        'patient_notifications',
        'pacientes_troca_programada'
      )
      and roles <> array['authenticated']::name[]
  ) then
    raise exception 'Wave 0 failed: a protected policy targets an unexpected role';
  end if;
end;
$$;

commit;
