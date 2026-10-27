-- ============================================================
-- CaloriesCalculator — Schema Supabase (stato attuale)
-- Progetto: bfoslaydcsffzruubwrx.supabase.co
-- Aggiornato: 2026-10-27 (dopo migrations/2026-10-27_groq.sql)
--
-- Fonte di verità della struttura del DB: quando cambi tabelle, colonne,
-- policy o funzioni, aggiorna questo file e aggiungi una migrazione in
-- docs/migrations/ nello stesso intervento.
--
-- auth.users è gestito da Supabase Auth e non va ricreato. Tutte le
-- tabelle pubbliche referenziano auth.users(id).
-- ============================================================


-- ============================================================
-- TABELLA: profiles
-- Creata automaticamente al signup tramite trigger.
-- ai_api_key (chiave Groq dell'utente) NON è leggibile dal browser
-- (column privileges): il frontend usa has_ai_api_key(), la Netlify
-- Function la legge con la secret key.
-- ============================================================
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  ai_api_key text,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id)
);

alter table public.profiles enable row level security;

revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, created_at) on public.profiles to authenticated;

create policy "Utenti vedono solo il proprio profilo"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Utenti creano il proprio profilo"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Utenti aggiornano il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


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
-- FUNZIONE: has_ai_api_key()
-- Dice al frontend se l'utente ha una chiave, senza esporla.
-- ============================================================
create or replace function public.has_ai_api_key()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select length(trim(coalesce(ai_api_key, ''))) > 0
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.has_ai_api_key() from public, anon;
grant execute on function public.has_ai_api_key() to authenticated;


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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Utenti eliminano i propri obiettivi"
  on public.goals for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELLA: meals
-- Un pasto (categoria + data) di un utente. I piatti sono in meal_items.
-- ============================================================
create table public.meals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text null,          -- 'Colazione' | 'Pranzo' | 'Cena' | 'Spuntino'
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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Utenti eliminano i propri pasti"
  on public.meals for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELLA: foods
-- Libreria cibi per utente: valori nutrizionali per unità.
-- Una riga per combinazione (user_id, name, default_quantity_type).
-- I nomi sono normalizzati in minuscolo.
-- "Unità" = 1 grammo per i cibi in grammi, 1 pezzo/cucchiaino/cucchiaio per gli altri.
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
  grams_per_unit    numeric(10,3),   -- peso di 1 unità; 1 per i cibi in grammi
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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Utenti eliminano i propri cibi"
  on public.foods for delete
  using (auth.uid() = user_id);


-- ============================================================
-- TABELLA: meal_items
-- Un piatto in un pasto, con la quantità e i macro calcolati per quella
-- porzione (salvati, non ricalcolati a runtime).
-- food_id on delete restrict: un cibo usato in qualche piatto non si elimina.
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
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create policy "Utenti inseriscono i propri meal_items"
  on public.meal_items for insert
  with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

create policy "Utenti aggiornano i propri meal_items"
  on public.meal_items for update
  using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

create policy "Utenti eliminano i propri meal_items"
  on public.meal_items for delete
  using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );


-- ============================================================
-- FUNZIONE: recalculate_food_items(food_id)
-- Ricalcola grammi e macro dei piatti di un cibo dopo una correzione.
-- security invoker: l'RLS resta attiva. Restituisce i piatti aggiornati.
-- ============================================================
create or replace function public.recalculate_food_items(p_food_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.meal_items mi
     set grams = case
                   when f.default_quantity_type = 'grams' then mi.quantity
                   else coalesce(round(mi.quantity * f.grams_per_unit, 2), mi.grams)
                 end,
         calories = round(mi.quantity * f.calories_per_unit, 0),
         protein  = round(mi.quantity * f.protein_per_unit, 1),
         carbs    = round(mi.quantity * f.carbs_per_unit, 1),
         fat      = round(mi.quantity * f.fat_per_unit, 1)
    from public.foods f
   where f.id = p_food_id
     and f.user_id = auth.uid()
     and mi.food_id = f.id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke execute on function public.recalculate_food_items(uuid) from public, anon;
grant execute on function public.recalculate_food_items(uuid) to authenticated;


-- ============================================================
-- INDICI
-- ============================================================
create index meals_user_date_idx on public.meals(user_id, date);
create index meal_items_meal_id_idx on public.meal_items(meal_id);
create index meal_items_food_id_idx on public.meal_items(food_id);
create index foods_user_id_idx on public.foods(user_id);
