-- =====================================================================
-- ICM SISTEMA — Atualização 4 (rodar UMA vez no SQL Editor, depois do icm_v3)
--   Chat instantâneo: o banco avisa o sistema na hora em que chega mensagem nova.
--   As regras de acesso (RLS) continuam valendo: cada pessoa só recebe o aviso
--   das mensagens que ela pode ler (grupos de que participa e conversas diretas).
-- Pode rodar de novo sem problema.
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros') then
    alter publication supabase_realtime add table public.registros;
  end if;
end $$;
