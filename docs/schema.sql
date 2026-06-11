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
  gemini_api_key text,
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
-- I piatti non sono più in un array JSONB ma in meal_items.
-- ============================================================
create table public.meals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text null,
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
-- TABELLA: foods
-- Libreria cibi per utente: valori nutrizionali per unità.
-- Una riga per combinazione (user_id, name, default_quantity_type).
-- I nomi sono normalizzati in minuscolo.
-- ============================================================
create table public.foods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_quantity_type text not null default 'grams',
  calories_per_unit numeric(10,4) not null default 0,
  protein_per_unit  numeric(10,4) not null default 0,
  carbs_per_unit    numeric(10,4) not null default 0,
  fat_per_unit      numeric(10,4) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint foods_pkey primary key (id),
  constraint foods_user_name_type_key unique (user_id, name, default_quantity_type)
);

alter table public.foods enable row level security;

create policy "Utenti vedono i propri cibi"
  on public.foods for select
  using (auth.uid() = user_id);

create policy "Utenti inseriscono i propri cibi"
  on public.foods for insert
  with check (auth.uid() = user_id);

create policy "Utenti aggiornano i propri cibi"
  on public.foods for update
  using (auth.uid() = user_id);

create policy "Utenti eliminano i propri cibi"
  on public.foods for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELLA: meal_items
-- Tabella di giunzione tra meals e foods.
-- Ogni riga rappresenta un piatto specifico in un pasto,
-- con la quantità e i macro calcolati per quella porzione.
-- ============================================================
create table public.meal_items (
  id uuid not null default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity      numeric(10,3) not null default 0,
  quantity_type text not null default 'grams',
  grams         numeric(10,2) not null default 0,
  calories      numeric(10,2) not null default 0,
  protein       numeric(10,2) not null default 0,
  carbs         numeric(10,2) not null default 0,
  fat           numeric(10,2) not null default 0,
  position      integer not null default 0,
  created_at    timestamp with time zone not null default now(),
  constraint meal_items_pkey primary key (id)
);

alter table public.meal_items enable row level security;

create policy "Utenti vedono i propri meal_items"
  on public.meal_items for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Utenti inseriscono i propri meal_items"
  on public.meal_items for insert
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Utenti aggiornano i propri meal_items"
  on public.meal_items for update
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Utenti eliminano i propri meal_items"
  on public.meal_items for delete
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );


-- ============================================================
-- INDICI
-- ============================================================
create index meals_user_date_idx on public.meals(user_id, date);
create index meal_items_meal_id_idx on public.meal_items(meal_id);
create index foods_user_id_idx on public.foods(user_id);


-- ============================================================
-- MIGRAZIONE DATI ESISTENTI
-- Da eseguire in Supabase SQL Editor NELL'ORDINE indicato.
-- Prerequisito: i pasti devono avere user_id assegnato
-- (vedere query di assegnazione manuale sotto).
-- ============================================================

-- 0. Assegnare user_id ai pasti esistenti (se ancora null).
--    Sostituire <tuo-uuid> con l'UUID del proprio utente
--    (da Supabase Dashboard → Authentication → Users).
-- update public.meals
--   set user_id = '<tuo-uuid>'
--   where user_id is null;

-- 1. Popola foods dai dishes JSONB esistenti
--    (distinto per utente + nome + tipo; prende il primo valore trovato)
-- INSERT INTO public.foods (user_id, name, default_quantity_type,
--   calories_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit)
-- SELECT DISTINCT ON (m.user_id, lower(d->>'food'), d->>'quantityType')
--   m.user_id,
--   lower(d->>'food'),
--   coalesce(nullif(d->>'quantityType',''), 'grams'),
--   coalesce((d->>'caloriesPerUnit')::numeric, 0),
--   coalesce((d->>'proteinPerUnit')::numeric, 0),
--   coalesce((d->>'carbsPerUnit')::numeric, 0),
--   coalesce((d->>'fatPerUnit')::numeric, 0)
-- FROM public.meals m, jsonb_array_elements(m.dishes) d
-- WHERE m.dishes IS NOT NULL
--   AND jsonb_array_length(m.dishes) > 0
--   AND m.user_id IS NOT NULL
-- ORDER BY m.user_id, lower(d->>'food'), d->>'quantityType', m.created_at;

-- 2. Popola meal_items collegando i dishes ai foods appena creati
-- INSERT INTO public.meal_items
--   (meal_id, food_id, quantity, quantity_type, grams, calories, protein, carbs, fat, position)
-- SELECT
--   m.id,
--   f.id,
--   coalesce((d->>'quantity')::numeric, 0),
--   coalesce(nullif(d->>'quantityType',''), 'grams'),
--   coalesce((d->>'grams')::numeric, 0),
--   coalesce((d->>'calories')::numeric, 0),
--   coalesce((d->>'protein')::numeric, 0),
--   coalesce((d->>'carbs')::numeric, 0),
--   coalesce((d->>'fat')::numeric, 0),
--   (row_number() OVER (PARTITION BY m.id))::integer
-- FROM public.meals m,
--      jsonb_array_elements(m.dishes) WITH ORDINALITY AS t(d, pos)
-- JOIN public.foods f
--   ON f.user_id = m.user_id
--  AND f.name = lower(d->>'food')
--  AND f.default_quantity_type = coalesce(nullif(d->>'quantityType',''), 'grams')
-- WHERE m.dishes IS NOT NULL
--   AND jsonb_array_length(m.dishes) > 0
--   AND m.user_id IS NOT NULL;

-- 3. Verifica prima di rimuovere la colonna dishes
-- SELECT count(*) FROM public.meal_items;   -- deve corrispondere al totale piatti
-- SELECT count(*) FROM public.foods;

-- 4. Rimuovi la colonna dishes da meals (solo dopo verifica)
-- ALTER TABLE public.meals DROP COLUMN dishes;
