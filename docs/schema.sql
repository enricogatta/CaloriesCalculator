-- ============================================================
-- CaloriesCalculator — Schema Supabase (stato target post-migrazione)
-- Progetto: bfoslaydcsffzruubwrx.supabase.co
-- Aggiornato: 2026-06-11
--
-- NOTA: auth.users è gestito interamente da Supabase Auth e
-- non va ricreato manualmente. Tutte le tabelle pubbliche
-- referenziano auth.users(id) tramite foreign key.
-- ============================================================


-- ============================================================
-- TABELLA: profiles
-- Creata automaticamente al signup tramite trigger.
-- ============================================================
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id)
);

alter table public.profiles enable row level security;

create policy "Utenti vedono solo il proprio profilo"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Utenti creano il proprio profilo"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Utenti aggiornano il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id);


-- ============================================================
-- TRIGGER: auto-crea profilo al signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- TABELLA: goals
-- Una riga per utente (vincolo unique su user_id).
-- Sostituisce il vecchio singleton con id=1.
-- ============================================================
create table public.goals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories integer not null default 2000,
  protein integer not null default 150,
  carbs integer not null default 250,
  fat integer not null default 70,
  updated_at timestamp with time zone not null default now(),
  constraint goals_pkey primary key (id),
  constraint goals_user_id_key unique (user_id)
);

alter table public.goals enable row level security;

create policy "Utenti vedono i propri obiettivi"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Utenti creano i propri obiettivi"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Utenti aggiornano i propri obiettivi"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Utenti eliminano i propri obiettivi"
  on public.goals for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELLA: meals
-- Ogni pasto appartiene a un utente tramite user_id.
-- dishes è un array JSONB di piatti con macro per unità.
--
-- Struttura di ogni oggetto in dishes[]:
-- {
--   id: number,
--   food: string,
--   grams: number,
--   quantityType: 'grams' | 'unit' | 'teaspoon' | 'tablespoon',
--   quantity: number,
--   calories: number,
--   protein: number,
--   carbs: number,
--   fat: number,
--   caloriesPerUnit: number,
--   proteinPerUnit: number,
--   carbsPerUnit: number,
--   fatPerUnit: number
-- }
-- ============================================================
create table public.meals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text null,
  dishes jsonb null,
  date date null,
  created_at timestamp with time zone null default now(),
  constraint meals_pkey primary key (id)
);

alter table public.meals enable row level security;

create policy "Utenti vedono i propri pasti"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Utenti inseriscono i propri pasti"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Utenti aggiornano i propri pasti"
  on public.meals for update
  using (auth.uid() = user_id);

create policy "Utenti eliminano i propri pasti"
  on public.meals for delete
  using (auth.uid() = user_id);


-- ============================================================
-- INDICI
-- ============================================================
create index meals_user_date_idx on public.meals(user_id, date);


-- ============================================================
-- MIGRAZIONE DATI ESISTENTI
-- Da eseguire UNA SOLA VOLTA dopo aver creato il primo account.
-- Sostituire <tuo-uuid> con l'UUID del proprio utente (da
-- Supabase Dashboard → Authentication → Users).
-- ============================================================
-- update public.meals
--   set user_id = '<tuo-uuid>'
--   where user_id is null;
