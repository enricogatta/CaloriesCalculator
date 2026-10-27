-- ============================================================
-- Migrazione 2026-10-27 — redesign
-- Da eseguire in Supabase → SQL Editor NEL MOMENTO in cui si pubblica
-- la nuova versione del frontend: dopo il punto 1 il frontend vecchio non
-- riesce più a leggere lo stato della chiave Gemini.
-- Rieseguibile: ogni blocco è idempotente.
-- ============================================================


-- ------------------------------------------------------------
-- 0. Colonna gemini_api_key (nel caso la migrazione di giugno non sia stata eseguita)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists gemini_api_key text;


-- ------------------------------------------------------------
-- 1. La chiave Gemini non è più leggibile dal browser.
--    Il browser vede solo id, display_name e created_at; per sapere se la
--    chiave è impostata usa has_gemini_api_key(). La Netlify Function la legge
--    con la secret key (ruolo service_role, non toccato da questi revoke).
-- ------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, created_at) on public.profiles to authenticated;

create or replace function public.has_gemini_api_key()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select length(trim(coalesce(gemini_api_key, ''))) > 0
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.has_gemini_api_key() from public, anon;
grant execute on function public.has_gemini_api_key() to authenticated;


-- ------------------------------------------------------------
-- 2. with check sulle policy di update: impedisce di riassegnare una riga
--    a un altro utente. meal_items verifica anche che il cibo sia dell'utente.
-- ------------------------------------------------------------
drop policy if exists "Utenti aggiornano il proprio profilo" on public.profiles;
create policy "Utenti aggiornano il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Utenti aggiornano i propri obiettivi" on public.goals;
create policy "Utenti aggiornano i propri obiettivi"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Utenti aggiornano i propri pasti" on public.meals;
create policy "Utenti aggiornano i propri pasti"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Utenti aggiornano i propri cibi" on public.foods;
create policy "Utenti aggiornano i propri cibi"
  on public.foods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Utenti inseriscono i propri meal_items" on public.meal_items;
create policy "Utenti inseriscono i propri meal_items"
  on public.meal_items for insert
  with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

drop policy if exists "Utenti aggiornano i propri meal_items" on public.meal_items;
create policy "Utenti aggiornano i propri meal_items"
  on public.meal_items for update
  using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );


-- ------------------------------------------------------------
-- 3. foods.grams_per_unit: peso in grammi di 1 unità (1 per i cibi in grammi).
--    Serve a calcolare i grammi di una porzione senza richiamare Gemini e a
--    creare alimenti a mano. Popolata dalla media dei piatti già registrati.
-- ------------------------------------------------------------
alter table public.foods add column if not exists grams_per_unit numeric(10,3);

update public.foods
   set grams_per_unit = 1
 where default_quantity_type = 'grams'
   and grams_per_unit is null;

update public.foods f
   set grams_per_unit = sub.gpu
  from (
    select food_id, round(avg(grams / quantity), 3) as gpu
      from public.meal_items
     where quantity > 0 and grams > 0
     group by food_id
  ) sub
 where f.id = sub.food_id
   and f.default_quantity_type <> 'grams'
   and f.grams_per_unit is null;


-- Conteggio dei piatti per cibo (pagina Alimenti) e ricalcolo filtrano su food_id
create index if not exists meal_items_food_id_idx on public.meal_items(food_id);


-- ------------------------------------------------------------
-- 4. Ricalcolo dei piatti dopo la correzione di un alimento.
--    security invoker: l'RLS resta attiva, si aggiornano solo i piatti propri.
--    Arrotondamenti uguali a quelli del frontend (kcal intere, macro a 1 decimale).
--    Restituisce il numero di piatti aggiornati.
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
-- Verifica (da eseguire a parte)
-- ------------------------------------------------------------
-- Da utente autenticato deve fallire con "permission denied":
--   select gemini_api_key from public.profiles;
-- Cibi non in grammi rimasti senza peso per unità (si correggono dalla pagina Alimenti):
--   select name, default_quantity_type from public.foods where grams_per_unit is null;
