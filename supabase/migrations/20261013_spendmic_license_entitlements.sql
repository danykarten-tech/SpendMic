-- SpendMic licensing-only schema. No financial records, categories, balances,
-- transactions, notes, or backups are stored here.
create table if not exists public.spendmic_licenses (
  license_hash text primary key,
  provider text not null check (provider in ('payhip', 'owner')),
  customer_email text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spendmic_license_devices (
  license_hash text not null references public.spendmic_licenses(license_hash) on delete cascade,
  device_id uuid not null,
  device_name text not null,
  app_version text,
  activated_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  is_active boolean not null default true,
  primary key (license_hash, device_id)
);

alter table public.spendmic_licenses enable row level security;
alter table public.spendmic_license_devices enable row level security;
revoke all on table public.spendmic_licenses from anon, authenticated;
revoke all on table public.spendmic_license_devices from anon, authenticated;

create or replace function public.activate_spendmic_device(
  p_license_hash text, p_provider text, p_customer_email text,
  p_device_id uuid, p_device_name text, p_app_version text
) returns table(authorized boolean, reason text, devices jsonb)
language plpgsql security definer set search_path = '' as $$
declare active_count integer;
begin
  insert into public.spendmic_licenses as licenses (license_hash, provider, customer_email, status)
  values (p_license_hash, p_provider, p_customer_email, 'ACTIVE')
  on conflict (license_hash) do update set
    customer_email = coalesce(excluded.customer_email, licenses.customer_email),
    updated_at = now();

  if exists (select 1 from public.spendmic_license_devices where license_hash = p_license_hash and device_id = p_device_id and is_active) then
    update public.spendmic_license_devices set device_name = p_device_name, app_version = p_app_version, last_verified_at = now()
    where license_hash = p_license_hash and device_id = p_device_id;
    return query select true, null::text, coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
      from public.spendmic_license_devices where license_hash = p_license_hash;
    return;
  end if;

  perform 1 from public.spendmic_licenses where license_hash = p_license_hash for update;
  select count(*) into active_count from public.spendmic_license_devices where license_hash = p_license_hash and is_active;
  if active_count >= 2 then
    return query select false, 'This license already has two active devices.', coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
      from public.spendmic_license_devices where license_hash = p_license_hash;
    return;
  end if;

  insert into public.spendmic_license_devices (license_hash, device_id, device_name, app_version)
  values (p_license_hash, p_device_id, p_device_name, p_app_version)
  on conflict (license_hash, device_id) do update set is_active = true, device_name = excluded.device_name, app_version = excluded.app_version, last_verified_at = now();
  return query select true, null::text, coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
    from public.spendmic_license_devices where license_hash = p_license_hash;
end; $$;

create or replace function public.verify_spendmic_device(p_license_hash text, p_device_id uuid)
returns table(authorized boolean, reason text, devices jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update public.spendmic_license_devices set last_verified_at = now()
  where license_hash = p_license_hash and device_id = p_device_id and is_active;
  return query select exists(select 1 from public.spendmic_licenses l join public.spendmic_license_devices d on d.license_hash = l.license_hash where l.license_hash = p_license_hash and l.status = 'ACTIVE' and d.device_id = p_device_id and d.is_active),
    'This device is not authorized for this license.', coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
  from public.spendmic_license_devices where license_hash = p_license_hash;
end; $$;

create or replace function public.replace_spendmic_device(p_license_hash text, p_target_device_id uuid, p_new_device_id uuid, p_new_device_name text)
returns table(authorized boolean, reason text, devices jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.spendmic_licenses where license_hash = p_license_hash for update;
  if not exists(select 1 from public.spendmic_license_devices where license_hash = p_license_hash and device_id = p_target_device_id and is_active) then
    return query select false, 'The selected device is no longer active.', '[]'::jsonb; return;
  end if;
  update public.spendmic_license_devices set is_active = false where license_hash = p_license_hash and device_id = p_target_device_id;
  insert into public.spendmic_license_devices (license_hash, device_id, device_name) values (p_license_hash, p_new_device_id, p_new_device_name)
  on conflict (license_hash, device_id) do update set is_active = true, device_name = excluded.device_name, last_verified_at = now();
  return query select true, null::text, coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
    from public.spendmic_license_devices where license_hash = p_license_hash;
end; $$;

create or replace function public.get_spendmic_license_status(p_license_hash text)
returns table(authorized boolean, reason text, devices jsonb)
language sql security definer set search_path = '' as $$
  select exists(select 1 from public.spendmic_licenses where license_hash = p_license_hash and status = 'ACTIVE'),
    null::text, coalesce(jsonb_agg(jsonb_build_object('deviceId', device_id, 'deviceName', device_name, 'activatedAt', activated_at)) filter (where is_active), '[]'::jsonb)
  from public.spendmic_license_devices where license_hash = p_license_hash;
$$;

revoke all on function public.activate_spendmic_device(text, text, text, uuid, text, text) from public;
revoke all on function public.verify_spendmic_device(text, uuid) from public;
revoke all on function public.replace_spendmic_device(text, uuid, uuid, text) from public;
revoke all on function public.get_spendmic_license_status(text) from public;
revoke all on function public.activate_spendmic_device(text, text, text, uuid, text, text) from anon, authenticated;
revoke all on function public.verify_spendmic_device(text, uuid) from anon, authenticated;
revoke all on function public.replace_spendmic_device(text, uuid, uuid, text) from anon, authenticated;
revoke all on function public.get_spendmic_license_status(text) from anon, authenticated;
grant execute on function public.activate_spendmic_device(text, text, text, uuid, text, text) to service_role;
grant execute on function public.verify_spendmic_device(text, uuid) to service_role;
grant execute on function public.replace_spendmic_device(text, uuid, uuid, text) to service_role;
grant execute on function public.get_spendmic_license_status(text) to service_role;
