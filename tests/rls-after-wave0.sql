do $$
declare
  policy_count integer;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'profiles',
      'pacientes',
      'patient_audit_log',
      'patient_notifications',
      'pacientes_troca_programada'
    );

  if policy_count <> 14 then
    raise exception 'Expected 14 policies after containment, found %', policy_count;
  end if;

  if exists (
    select 1 from pg_policies
    where policyname like 'Usuarios autenticados podem%'
  ) then
    raise exception 'A legacy permissive policy remains';
  end if;

  if has_function_privilege('anon', 'public.is_approved_user()', 'execute') then
    raise exception 'anon can execute is_approved_user';
  end if;
  if not has_function_privilege('authenticated', 'public.is_approved_user()', 'execute') then
    raise exception 'authenticated cannot execute is_approved_user';
  end if;
  if has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') then
    raise exception 'authenticated can execute trigger function handle_new_user';
  end if;
end;
$$;

set role authenticated;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.pacientes;
  if visible_count <> 0 then
    raise exception 'Pending user can read patient rows';
  end if;

  begin
    insert into public.pacientes (id, nome, cadastrado_por) values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Denied patient',
      '11111111-1111-1111-1111-111111111111'
    );
    raise exception 'Pending user can insert patient rows';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.pacientes;
  if visible_count <> 1 then
    raise exception 'Approved user cannot read the fixture patient';
  end if;

  insert into public.pacientes (id, nome, cadastrado_por) values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Approved patient',
    '22222222-2222-2222-2222-222222222222'
  );

  update public.pacientes
  set nome = 'Approved patient updated'
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  begin
    insert into public.pacientes (id, nome, cadastrado_por) values (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'Wrong owner',
      '11111111-1111-1111-1111-111111111111'
    );
    raise exception 'Approved user can forge cadastrado_por';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$
begin
  delete from public.pacientes
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  if found is false then
    raise exception 'Admin cannot delete a patient row';
  end if;
end;
$$;

reset role;
