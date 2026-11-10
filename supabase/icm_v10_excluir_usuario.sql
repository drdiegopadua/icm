-- =====================================================================
-- ICM SISTEMA — Atualização 10: excluir usuário
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--   Cria a função excluir_usuario(id), que só o ADMINISTRADOR pode usar:
--   - convite ainda não aceito ("convite:email"): apaga o convite;
--   - usuário com conta: apaga o login (Supabase Auth) e o perfil.
--   Proteções: ninguém exclui a si mesmo nem o único administrador ativo.
--   Ligações opcionais com o perfil (ex.: motorista da rota da van) são
--   desfeitas antes; se sobrar alguma obrigatória, a exclusão é recusada
--   com o aviso para DESATIVAR o usuário em vez de excluir.
--   Os registros feitos pela pessoa (aulas, chamadas, auditoria) continuam.
-- =====================================================================
create or replace function public.excluir_usuario(p_id text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid; v_email text; v_papel text; r record;
begin
  if meu_papel() is distinct from 'admin' then
    raise exception 'Só o administrador pode excluir usuários.';
  end if;

  -- Convite ainda não aceito
  if p_id like 'convite:%' then
    delete from public.convites where lower(email) = lower(substr(p_id, 9));
    return;
  end if;

  v_uid := p_id::uuid;
  if v_uid = auth.uid() then raise exception 'Você não pode excluir o próprio usuário.'; end if;
  select email, papel into v_email, v_papel from public.perfis where id = v_uid;
  if v_email is null then raise exception 'Usuário não encontrado.'; end if;
  if v_papel = 'admin' and (select count(*) from public.perfis where papel = 'admin' and ativo and id <> v_uid) = 0 then
    raise exception 'Não é possível excluir o único administrador ativo.';
  end if;

  -- Desfaz ligações opcionais com o perfil (colunas que aceitam vazio)
  for r in
    select c.conrelid::regclass as tabela, a.attname as coluna
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.perfis'::regclass
      and array_length(c.conkey, 1) = 1 and not a.attnotnull
  loop
    execute format('update %s set %I = null where %I = $1', r.tabela, r.coluna, r.coluna) using v_uid;
  end loop;

  begin
    delete from auth.users where id = v_uid;                 -- o perfil sai junto (on delete cascade)
  exception when foreign_key_violation then
    raise exception 'Este usuário tem registros que dependem dele no banco. Desative o acesso em vez de excluir.';
  end;
  delete from public.convites where lower(email) = lower(v_email);
end $$;

revoke all on function public.excluir_usuario(text) from public, anon;
grant execute on function public.excluir_usuario(text) to authenticated;
