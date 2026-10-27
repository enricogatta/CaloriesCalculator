-- ============================================================
-- Migrazione 2026-10-27 — da Gemini a Groq
-- Da eseguire in Supabase → SQL Editor DOPO 2026-10-27_redesign.sql e NEL
-- MOMENTO in cui si pubblica il frontend che usa has_ai_api_key(): il
-- frontend precedente cerca ancora has_gemini_api_key().
-- Rieseguibile: ogni blocco è idempotente.
-- ============================================================


-- ------------------------------------------------------------
-- 1. profiles.gemini_api_key → ai_api_key (nome indipendente dal provider).
--    I privilegi di colonna seguono il rename: il browser continua a non
--    poterla leggere. Le chiavi Gemini salvate non valgono su Groq: si
--    azzerano, così l'utente vede "Nessuna chiave" invece di un errore.
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles' and column_name = 'gemini_api_key'
  ) then
    alter table public.profiles rename column gemini_api_key to ai_api_key;
    update public.profiles set ai_api_key = null where ai_api_key is not null;
  end if;
end;
$$;

alter table public.profiles add column if not exists ai_api_key text;


-- ------------------------------------------------------------
-- 2. has_gemini_api_key() → has_ai_api_key()
-- ------------------------------------------------------------
drop function if exists public.has_gemini_api_key();

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


-- ------------------------------------------------------------
-- Verifica (da eseguire a parte)
-- ------------------------------------------------------------
-- Da utente autenticato deve fallire con "permission denied":
--   select ai_api_key from public.profiles;
-- Alimenti salvati con tutti i valori a zero dalla vecchia analisi Gemini
-- (si correggono dalla pagina Alimenti, che propone di ricalcolare i piatti):
--   select name, default_quantity_type from public.foods
--    where calories_per_unit = 0 and protein_per_unit = 0
--      and carbs_per_unit = 0 and fat_per_unit = 0;
