-- =====================================================================
-- ICM SISTEMA — Atualização 3 (rodar UMA vez no SQL Editor, depois do icm_v2)
--   Campo "Também dá aulas": administrador, coordenação ou secretaria que também
--   é professor(a) aparece na lista de professores ao cadastrar turmas.
-- Pode rodar de novo sem problema.
-- =====================================================================
alter table public.perfis   add column if not exists da_aulas boolean not null default false;
alter table public.convites add column if not exists da_aulas boolean not null default false;

-- O perfil nasce do convite levando também o "dá aulas"
create or replace function public.criar_perfil_do_convite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(new.email);
  if found then
    insert into perfis (id, nome, email, papel, cargo, telefone, exige_2fa, da_aulas)
    values (new.id, c.nome, lower(new.email), c.papel, c.cargo, c.telefone, c.exige_2fa, c.da_aulas)
    on conflict (id) do nothing;
    delete from convites where lower(email) = lower(new.email);
    update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(new.id::text))
      where colecao = 'chat_canais' and id = 'chg_geral';
  end if;
  return new;
end $$;

-- Atualiza o cache do Supabase para enxergar a coluna nova na hora
notify pgrst, 'reload schema';
