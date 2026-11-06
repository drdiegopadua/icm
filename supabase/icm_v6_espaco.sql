-- =====================================================================
-- ICM SISTEMA — Atualização 6: espaço usado no Supabase
-- (rodar UMA vez no SQL Editor; pode rodar de novo sem problema)
--   Mede o tamanho do banco e das fotos/anexos para a tela "Backup e privacidade"
--   avisar antes de chegar ao limite do plano (gratuito: 500 MB de banco e 1 GB de arquivos).
--   Só o administrador do sistema e o script de automações (chave secreta) podem consultar.
-- =====================================================================
create or replace function public.uso_armazenamento() returns jsonb
language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not (coalesce(auth.role(), '') = 'service_role' or public.meu_papel() = 'admin') then
    raise exception 'Acesso restrito ao administrador';
  end if;
  return jsonb_build_object(
    'banco_bytes', pg_database_size(current_database()),
    'arquivos_bytes', coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.bucket_id = 'arquivos'), 0),
    'arquivos_qtd', (select count(*) from storage.objects o where o.bucket_id = 'arquivos'),
    'todos_arquivos_bytes', coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o), 0),
    'arquivos_por_pasta', coalesce((select jsonb_object_agg(pasta, jsonb_build_object('bytes', b, 'qtd', n)) from (
        select split_part(o.name, '/', 1) as pasta, sum((o.metadata->>'size')::bigint) as b, count(*) as n
        from storage.objects o where o.bucket_id = 'arquivos' group by 1) x), '{}'::jsonb),
    'registros_por_colecao', coalesce((select jsonb_object_agg(colecao, n) from (select colecao, count(*) as n from public.registros group by colecao) y), '{}'::jsonb),
    'medido_em', now());
end $$;

revoke all on function public.uso_armazenamento() from public, anon;
grant execute on function public.uso_armazenamento() to authenticated, service_role;
notify pgrst, 'reload schema';
