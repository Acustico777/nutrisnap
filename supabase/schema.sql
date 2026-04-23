-- users are managed by auth.users (Supabase Auth)
-- profiles table extends auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  is_admin boolean default false,
  daily_calories int default 2000,
  daily_protein_g int default 150,
  daily_carbs_g int default 250,
  daily_fat_g int default 65,
  created_at timestamptz default now()
);

create table public.invite_codes (
  code text primary key,
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  photo_url text,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  total_calories numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  notes text,
  consumed_at timestamptz default now(),
  created_at timestamptz default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals(id) on delete cascade not null,
  name text not null,
  quantity numeric not null default 1,
  unit text default 'serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0
);

-- RLS
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.invite_codes enable row level security;

create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "users read own meals" on public.meals for select using (auth.uid() = user_id);
create policy "users insert own meals" on public.meals for insert with check (auth.uid() = user_id);
create policy "users delete own meals" on public.meals for delete using (auth.uid() = user_id);

create policy "users read own meal_items" on public.meal_items for select using (
  exists (select 1 from public.meals where id = meal_items.meal_id and user_id = auth.uid())
);
create policy "users insert own meal_items" on public.meal_items for insert with check (
  exists (select 1 from public.meals where id = meal_items.meal_id and user_id = auth.uid())
);

create policy "anyone can read invite codes for validation" on public.invite_codes for select using (true);
create policy "admins insert invite codes" on public.invite_codes for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "update invite on use" on public.invite_codes for update using (used_by is null);

-- trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- storage bucket for meal photos
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;
create policy "users upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public read meal photos" on storage.objects for select using (bucket_id = 'meal-photos');
create policy "users delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
