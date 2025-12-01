-- Drop existing tables and recreate without description field
drop table if exists public.sales cascade;
drop table if exists public.products cascade;
drop table if exists public.ipvs cascade;
drop table if exists public.profiles cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists update_product_stock();

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users with role)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Helper function to check if current user is admin (with SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create IPVs table without description field
create table public.ipvs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ipvs enable row level security;

-- IPVs policies
create policy "ipvs_select_own"
  on public.ipvs for select
  using (auth.uid() = user_id or auth.uid() = created_by);

create policy "ipvs_select_admin"
  on public.ipvs for select
  using (public.is_admin());

create policy "ipvs_insert_admin"
  on public.ipvs for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "ipvs_update_admin"
  on public.ipvs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "ipvs_delete_admin"
  on public.ipvs for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Create products table
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  ipv_id uuid not null references public.ipvs(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  initial_stock integer not null check (initial_stock >= 0),
  current_stock integer not null check (current_stock >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

-- Products policies
create policy "products_select_ipv_users"
  on public.products for select
  using (
    exists (
      select 1 from public.ipvs
      where ipvs.id = products.ipv_id
      and (ipvs.user_id = auth.uid() or ipvs.created_by = auth.uid())
    )
  );

create policy "products_select_admin"
  on public.products for select
  using (public.is_admin());

create policy "products_insert_admin"
  on public.products for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "products_update_admin"
  on public.products for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "products_delete_admin"
  on public.products for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Create sales table
create table public.sales (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  ipv_id uuid not null references public.ipvs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer')),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz default now()
);

alter table public.sales enable row level security;

-- Sales policies
create policy "sales_select_ipv_users"
  on public.sales for select
  using (
    exists (
      select 1 from public.ipvs
      where ipvs.id = sales.ipv_id
      and (ipvs.user_id = auth.uid() or ipvs.created_by = auth.uid())
    )
  );

create policy "sales_select_admin"
  on public.sales for select
  using (public.is_admin());

create policy "sales_insert_ipv_user"
  on public.sales for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ipvs
      where ipvs.id = sales.ipv_id
      and ipvs.user_id = auth.uid()
    )
  );

-- Function to update product stock after sale
create or replace function update_product_stock()
returns trigger as $$
begin
  update public.products
  set current_stock = current_stock - new.quantity,
      updated_at = now()
  where id = new.product_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update stock on sale insert
create trigger on_sale_created
  after insert on public.sales
  for each row
  execute function update_product_stock();

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
