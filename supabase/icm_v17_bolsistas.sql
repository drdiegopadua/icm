-- =====================================================================
-- ICM SISTEMA — Atualização 17: bolsistas, monitores e jovens aprendizes
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--
--   bolsistas ............ vínculo (tipo, valor, requisitos, dados de pagamento) e horas de atuação
--   bolsas_pagamentos .... folha mensal: uma linha por pessoa/mês (a aprovar → aprovado → pago)
-- Permissões novas (ajustáveis por usuário em Usuários e acessos → Permissões):
--   bolsas.gerir ..... direção e coordenação: cadastro, horas, gerar folha, registrar pagamento
--   bolsas.aprovar ... direção: aprovar a folha
-- Dados de pagamento ficam só para quem tem bolsas.gerir (professor e secretaria não leem).
--
-- Também corrige: a Atualização 9 (login/convites) tinha voltado a versão antiga da função
-- que cria o perfil pelo convite, sem levar as PERMISSÕES ajustadas no convite. Aqui ela volta completa.
-- =====================================================================

insert into public.acesso (colecao, ler, escrever) values
  ('bolsistas',         '{admin,coordenacao}', '{admin,coordenacao}'),
  ('bolsas_pagamentos', '{admin,coordenacao}', '{admin,coordenacao}')
on conflict (colecao) do update set ler = excluded.ler, escrever = excluded.escrever;

insert into public.permissoes (chave, papeis, ler, escrever, bloqueia_leitura) values
  ('bolsas.gerir',   '{admin,coordenacao}', '{bolsistas,bolsas_pagamentos}', '{bolsistas,bolsas_pagamentos}', true),
  ('bolsas.aprovar', '{admin}',             '{bolsistas,bolsas_pagamentos}', '{bolsas_pagamentos}', false)
on conflict (chave) do update set papeis = excluded.papeis, ler = excluded.ler, escrever = excluded.escrever, bloqueia_leitura = excluded.bloqueia_leitura;

-- Convite → perfil: leva junto as permissões ajustadas
create or replace function public.perfil_de_convite(p_uid uuid, p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(p_email);
  if not found then return exists (select 1 from perfis where id = p_uid); end if;
  insert into perfis (id, nome, email, papel, cargo, telefone, exige_2fa, da_aulas, opera_van, permissoes)
  values (p_uid, c.nome, lower(p_email), c.papel, c.cargo, c.telefone, coalesce(c.exige_2fa, false), coalesce(c.da_aulas, false), coalesce(c.opera_van, false), coalesce(c.permissoes, '{}'::jsonb))
  on conflict (id) do update set nome = excluded.nome, papel = excluded.papel, cargo = excluded.cargo, telefone = excluded.telefone,
    exige_2fa = excluded.exige_2fa, da_aulas = excluded.da_aulas, opera_van = excluded.opera_van, permissoes = excluded.permissoes, ativo = true;
  delete from convites where lower(email) = lower(p_email);
  update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(p_uid::text))
    where colecao = 'chat_canais' and id = 'chg_geral' and not (coalesce(dados->'membros', '[]'::jsonb) ? p_uid::text);
  return true;
end $$;
revoke all on function public.perfil_de_convite(uuid, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
