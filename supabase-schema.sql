create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id text primary key,
  client text not null,
  type text not null check (type in ('Aluguel', 'Venda')),
  sale_competency text not null,
  total_value numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installments (
  id text primary key,
  contract_id text not null references public.contracts(id) on delete cascade,
  number integer not null,
  planned_month text not null,
  planned_value numeric(14, 2) not null default 0,
  received_month text not null,
  received_value numeric(14, 2) not null default 0,
  billing_month text not null,
  confirmed boolean not null default false,
  paid boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_charge_confirmations (
  id text primary key,
  contract_id text not null references public.contracts(id) on delete cascade,
  installment_id text not null references public.installments(id) on delete cascade,
  billing_month text not null,
  amount numeric(14, 2) not null default 0,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists installments_contract_id_idx on public.installments(contract_id);
create index if not exists installments_billing_month_idx on public.installments(billing_month);
create index if not exists client_charge_confirmations_contract_id_idx on public.client_charge_confirmations(contract_id);
create index if not exists client_charge_confirmations_installment_id_idx on public.client_charge_confirmations(installment_id);

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.contracts enable row level security;
alter table public.installments enable row level security;
alter table public.client_charge_confirmations enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write"
on public.profiles for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "contracts_read_authenticated" on public.contracts;
create policy "contracts_read_authenticated"
on public.contracts for select
to authenticated
using (public.current_app_role() in ('admin', 'client'));

drop policy if exists "contracts_admin_write" on public.contracts;
create policy "contracts_admin_write"
on public.contracts for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "installments_read_authenticated" on public.installments;
create policy "installments_read_authenticated"
on public.installments for select
to authenticated
using (public.current_app_role() in ('admin', 'client'));

drop policy if exists "installments_admin_write" on public.installments;
create policy "installments_admin_write"
on public.installments for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "confirmations_read_authenticated" on public.client_charge_confirmations;
create policy "confirmations_read_authenticated"
on public.client_charge_confirmations for select
to authenticated
using (public.current_app_role() in ('admin', 'client'));

drop policy if exists "confirmations_client_or_admin_write" on public.client_charge_confirmations;
create policy "confirmations_client_or_admin_write"
on public.client_charge_confirmations for all
to authenticated
using (public.current_app_role() in ('admin', 'client'))
with check (public.current_app_role() in ('admin', 'client'));
