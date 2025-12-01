-- Create denominations table for storing bill counts per user session
-- This table allows users to save their bill counts when using the app

create table if not exists public.denominations (
  id uuid primary key default uuid_generate_v4(),
  ipv_id uuid not null references public.ipvs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  denomination integer not null check (denomination > 0),
  count integer not null default 0 check (count >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Each user can only have one record per denomination per IPV
  unique(ipv_id, user_id, denomination)
);

alter table public.denominations enable row level security;

-- Users can only see their own denomination records
create policy "denominations_select_own"
  on public.denominations for select
  using (auth.uid() = user_id);

-- Users can insert their own denomination records
create policy "denominations_insert_own"
  on public.denominations for insert
  with check (auth.uid() = user_id);

-- Users can update their own denomination records
create policy "denominations_update_own"
  on public.denominations for update
  using (auth.uid() = user_id);

-- Users can delete their own denomination records
create policy "denominations_delete_own"
  on public.denominations for delete
  using (auth.uid() = user_id);

-- Admin can view all denominations
create policy "denominations_admin_select"
  on public.denominations for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Function to update timestamp on denomination change
create or replace function update_denomination_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update timestamp
drop trigger if exists on_denomination_updated on public.denominations;
create trigger on_denomination_updated
  before update on public.denominations
  for each row
  execute function update_denomination_timestamp();
