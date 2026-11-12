-- =====================================================================
-- ICM SISTEMA — Atualização 13: permissões por usuário
-- (rodar UMA vez no SQL Editor, depois da v12; pode rodar de novo sem problema)
--
-- Cada usuário continua com o PADRÃO DO PERFIL (direção, coordenação, secretaria, professor)
-- e agora pode ter ajustes só para ele, feitos em Usuários e acessos → Permissões:
--   • liberadas  → funções a mais (o banco passa a entregar/gravar os dados dessas funções)
--   • bloqueadas → funções a menos (o banco deixa de entregar os dados dessas funções)
-- Só a direção (admin) altera as permissões. Gerenciar usuários, auditoria, privacidade,
-- exportar dados, salários, importar planilhas e listas continuam só pelo perfil.
-- =====================================================================

alter table public.perfis   add column if not exists permissoes jsonb not null default '{}'::jsonb;
alter table public.convites add column if not exists permissoes jsonb not null default '{}'::jsonb;

-- Catálogo: o que cada permissão lê/grava no banco, e quem tem por padrão
create table if not exists public.permissoes (
  chave text primary key,
  papeis text[] not null default '{}',     -- perfis que têm por padrão
  ler text[] not null default '{}',        -- coleções que a permissão lê
  escrever text[] not null default '{}',   -- coleções que a permissão grava
  bloqueia_leitura boolean not null default false   -- se bloqueada, a pessoa deixa de LER essas coleções
);
alter table public.permissoes enable row level security;
drop policy if exists permissoes_ler on public.permissoes;
create policy permissoes_ler on public.permissoes for select using (meu_papel() is not null);

insert into public.permissoes (chave, papeis, ler, escrever, bloqueia_leitura) values
  ('alunos.ver_todos',      '{admin,coordenacao,secretaria}',           '{alunos,matriculas}', '{}', false),
  ('alunos.editar',         '{admin,coordenacao,secretaria}',           '{alunos,alunos_privado,matriculas}', '{alunos,alunos_privado,matriculas}', false),
  ('alunos.sensivel',       '{admin,coordenacao,secretaria}',           '{alunos_privado}', '{}', true),
  ('turmas.alunos',         '{admin,coordenacao,secretaria}',           '{matriculas}', '{matriculas}', false),
  ('espera.gerir',          '{admin,coordenacao,secretaria}',           '{espera}', '{espera}', true),
  ('social.gerir',          '{admin,coordenacao,secretaria}',           '{pia,encaminhamentos,pareceres}', '{pia,encaminhamentos,pareceres}', true),
  ('projetos.editar',       '{admin,coordenacao}',                      '{projetos}', '{projetos}', false),
  ('turmas.editar',         '{admin,coordenacao}',                      '{turmas}', '{turmas}', false),
  ('aulas.registrar',       '{admin,coordenacao,professor}',            '{aulas}', '{aulas}', false),
  ('avaliacoes.registrar',  '{admin,coordenacao,professor}',            '{avaliacoes}', '{avaliacoes}', false),
  ('ocorrencias.registrar', '{admin,coordenacao,secretaria,professor}', '{ocorrencias}', '{ocorrencias}', false),
  ('pedagogico.gestao',     '{admin,coordenacao}',                      '{planos_mensais,conferencias,acompanhamentos,cronograma_pedagogico}', '{planos_mensais,conferencias,acompanhamentos,cronograma_pedagogico}', false),
  ('calendario.editar',     '{admin,coordenacao,secretaria}',           '{calendario}', '{calendario}', false),
  ('relatorios.gerais',     '{admin,coordenacao}',                      '{projetos,turmas,aulas,matriculas,eventos,avaliacoes}', '{}', false),
  ('eventos.editar',        '{admin,coordenacao}',                      '{eventos}', '{eventos}', false),
  ('reunioes.gerir',        '{admin,coordenacao,secretaria}',           '{reunioes}', '{reunioes}', false),
  ('voluntarios.gerir',     '{admin,coordenacao}',                      '{voluntarios}', '{voluntarios}', true),
  ('certificados.emitir',   '{admin,coordenacao,secretaria}',           '{certificados}', '{certificados}', false),
  ('pesquisas.gerir',       '{admin,coordenacao}',                      '{pesquisas}', '{pesquisas}', false),
  ('avisos.enviar',         '{admin,coordenacao,secretaria,professor}', '{avisos_log,comunicados}', '{avisos_log}', false),
  ('assinaturas.solicitar', '{admin,coordenacao,secretaria}',           '{assinaturas}', '{assinaturas}', true),
  ('chat.grupos',           '{admin,coordenacao}',                      '{}', '{chat_canais}', false),
  ('patrimonio.editar',     '{admin,coordenacao}',                      '{patrimonio,emprestimos}', '{patrimonio}', false),
  ('patrimonio.emprestar',  '{admin,coordenacao,secretaria}',           '{patrimonio,emprestimos}', '{emprestimos}', false),
  ('patrimonio.valores',    '{admin,coordenacao,secretaria}',           '{patrimonio}', '{}', false),
  ('agenda.reservar',       '{admin,coordenacao,secretaria}',           '{reservas,recursos}', '{reservas}', false),
  ('agenda.gerir',          '{admin,coordenacao}',                      '{reservas,recursos}', '{reservas,recursos}', false),
  ('estoque.ver',           '{admin,coordenacao,secretaria}',           '{estoque_itens,estoque_mov}', '{}', true),
  ('estoque.movimentar',    '{admin,coordenacao,secretaria}',           '{estoque_itens,estoque_mov}', '{estoque_mov}', false),
  ('estoque.editar',        '{admin,coordenacao}',                      '{estoque_itens,estoque_mov}', '{estoque_itens}', false),
  ('compras.solicitar',     '{admin,coordenacao,secretaria,professor}', '{compras}', '{compras}', false),
  ('compras.cotar',         '{admin,coordenacao,secretaria}',           '{compras,fornecedores}', '{compras,fornecedores}', false),
  ('compras.aprovar',       '{admin}',                                  '{compras,fornecedores}', '{compras}', false),
  ('financeiro.ver',        '{admin,coordenacao}',                      '{fin_contas,fin_orcamentos,fin_lancamentos,fin_extratos}', '{}', true),
  ('financeiro.lancar',     '{admin,coordenacao}',                      '{fin_contas,fin_orcamentos,fin_lancamentos,fin_extratos}', '{fin_contas,fin_lancamentos,fin_extratos}', false),
  ('financeiro.aprovar',    '{admin}',                                  '{fin_contas,fin_orcamentos,fin_lancamentos,fin_extratos}', '{fin_lancamentos,fin_orcamentos}', false),
  ('doadores.gerir',        '{admin,coordenacao}',                      '{doadores,doacoes,doacoes_online}', '{doadores,doacoes,doacoes_online}', true),
  ('associados.gerir',      '{admin,coordenacao,secretaria}',           '{associados,mensalidades}', '{associados,mensalidades}', true),
  ('campanhas.gerir',       '{admin,coordenacao}',                      '{campanhas}', '{campanhas}', false),
  ('equipe.gerir',          '{admin,coordenacao}',                      '{equipe}', '{equipe}', true),
  ('equipe.assinaturas',    '{admin,coordenacao}',                      '{assinaturas_equipe}', '{assinaturas_equipe}', false),
  ('docinst.ver',           '{admin,coordenacao,secretaria}',           '{docs_inst}', '{}', true),
  ('docinst.gerir',         '{admin,coordenacao}',                      '{docs_inst,arquivos}', '{docs_inst,arquivos}', false),
  ('governanca.ver',        '{admin,coordenacao}',                      '{atas,mandatos,estatuto}', '{}', true),
  ('governanca.gerir',      '{admin}',                                  '{atas,mandatos,estatuto}', '{atas,mandatos,estatuto}', false)
on conflict (chave) do update set papeis = excluded.papeis, ler = excluded.ler, escrever = excluded.escrever, bloqueia_leitura = excluded.bloqueia_leitura;
-- Estas nunca valem por usuário (o banco confere o perfil direto)
delete from public.permissoes where chave in ('usuarios.gerenciar','auditoria.ver','privacidade.gerir','backup.exportar','equipe.salarios','importar.dados','listas.editar','avisos.modelos');

-- Ajustes do usuário logado
create or replace function public.minhas_liberadas() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select array(select jsonb_array_elements_text(coalesce(permissoes->'extra', '[]'::jsonb))) from perfis where id = auth.uid() and ativo), '{}')
$$;
create or replace function public.minhas_bloqueadas() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select array(select jsonb_array_elements_text(coalesce(permissoes->'bloqueadas', '[]'::jsonb))) from perfis where id = auth.uid() and ativo), '{}')
$$;
-- Tenho esta permissão? (perfil + liberadas − bloqueadas)
create or replace function public.tenho_perm(p_chave text) returns boolean
language sql stable security definer set search_path = public as $$
  select not (p_chave = any(minhas_bloqueadas()))
     and (exists (select 1 from permissoes where chave = p_chave and meu_papel() = any(papeis)) or p_chave = any(minhas_liberadas()))
$$;
-- Alguma permissão LIBERADA para mim dá acesso a esta coleção?
create or replace function public.colecao_liberada(p_colecao text, p_gravar boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from permissoes p
    where p.chave = any(minhas_liberadas()) and not p.chave = any(minhas_bloqueadas())
      and (p_colecao = any(p.escrever) or (not p_gravar and p_colecao = any(p.ler))))
$$;
-- Algum BLOQUEIO meu tira esta coleção (e nenhuma outra permissão que eu tenho a devolve)?
create or replace function public.colecao_bloqueada(p_colecao text, p_gravar boolean) returns boolean
language sql stable security definer set search_path = public as $$
  with b as (select minhas_bloqueadas() bl, minhas_liberadas() li, meu_papel() pa)
  select cardinality(b.bl) > 0
    and exists (select 1 from permissoes p where p.chave = any(b.bl)
      and case when p_gravar then p_colecao = any(p.escrever) else p.bloqueia_leitura and p_colecao = any(p.ler) end)
    and not exists (select 1 from permissoes p where not p.chave = any(b.bl) and (b.pa = any(p.papeis) or p.chave = any(b.li))
      and case when p_gravar then p_colecao = any(p.escrever) else p.bloqueia_leitura and p_colecao = any(p.ler) end)
  from b
$$;
revoke all on function public.minhas_liberadas(), public.minhas_bloqueadas(), public.tenho_perm(text), public.colecao_liberada(text, boolean), public.colecao_bloqueada(text, boolean) from public;
grant execute on function public.minhas_liberadas(), public.minhas_bloqueadas(), public.tenho_perm(text), public.colecao_liberada(text, boolean), public.colecao_bloqueada(text, boolean) to authenticated;

create or replace function public.pode_ler(p_colecao text, p_id text, p_dados jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare papel text := meu_papel();
begin
  if papel is null then return false; end if;
  if not exists (select 1 from acesso where colecao = p_colecao and papel = any(ler)) and not colecao_liberada(p_colecao, false) then return false; end if;
  if colecao_bloqueada(p_colecao, false) then return false; end if;
  -- Arquivos do RH: só direção e coordenação
  if p_colecao = 'arquivos' and papel = 'secretaria' and p_dados->'dono'->>'col' in ('equipe','fin_lancamentos','docs_inst') then return false; end if;
  -- Chat: só membros do grupo ou da conversa direta
  if p_colecao = 'chat_canais' then return p_dados->'membros' ? auth.uid()::text; end if;
  if p_colecao = 'chat_mensagens' then return exists (select 1 from registros c where c.colecao = 'chat_canais' and c.id = p_dados->>'canal_id' and c.dados->'membros' ? auth.uid()::text) or (p_dados->>'canal_id') like '%' || auth.uid()::text || '%'; end if;
  if p_colecao = 'chat_lidos' then return p_id = auth.uid()::text; end if;
  if papel <> 'professor' then return true; end if;
  -- Professor: alunos só se liberado "ver todos"; o resto que foi liberado para ele vale por inteiro
  if p_colecao = 'alunos' then return p_id in (select meus_alunos()) or tenho_perm('alunos.ver_todos'); end if;
  if p_colecao = 'alunos_privado' then return tenho_perm('alunos.sensivel') and (p_id in (select meus_alunos()) or tenho_perm('alunos.ver_todos')); end if;
  if colecao_liberada(p_colecao, false) then return true; end if;
  -- Professor: só o que é das turmas dele
  return case p_colecao
    when 'turmas' then p_dados->>'professor_id' = auth.uid()::text
    when 'matriculas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'aulas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avaliacoes' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'ocorrencias' then p_dados->>'aluno_id' in (select meus_alunos()) and coalesce(p_dados->>'tipo','') <> 'atendimento'
    when 'emprestimos' then p_dados->>'tipo_tomador' = 'aluno' and p_dados->>'aluno_id' in (select meus_alunos())
    when 'compras' then p_dados->>'solicitante_id' = auth.uid()::text
    when 'planos_mensais' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'conferencias' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'acompanhamentos' then p_dados->'professores' ? auth.uid()::text
    when 'projetos' then p_id in (select meus_projetos())
    when 'eventos' then p_dados->>'projeto_id' in (select meus_projetos())
      or exists (select 1 from jsonb_array_elements_text(coalesce(p_dados->'projeto_ids', '[]'::jsonb)) x where x in (select meus_projetos()))
      or exists (select 1 from jsonb_array_elements_text(coalesce(p_dados->'alunos', '[]'::jsonb)) x where x in (select meus_alunos()))
    when 'reunioes' then p_dados->>'turma_id' in (select minhas_turmas()) or p_dados->>'projeto_id' in (select meus_projetos())
    when 'comunicados' then coalesce(p_dados->>'publico', 'todos') = 'todos' or p_dados->>'turma_id' in (select minhas_turmas()) or p_dados->>'projeto_id' in (select meus_projetos())
    when 'certificados' then p_dados->>'destinatario_tipo' = 'aluno' and p_dados->>'destinatario_id' in (select meus_alunos())
    when 'avisos_log' then p_dados->>'aluno_id' in (select meus_alunos())
    when 'recursos' then p_id in (select dados->>'espaco_id' from registros where colecao = 'turmas' and dados->>'professor_id' = auth.uid()::text)
    when 'patrimonio' then p_id in (select dados->>'item_id' from registros where colecao = 'emprestimos' and dados->>'aluno_id' in (select meus_alunos()))
    when 'calendario' then true
    when 'cronograma_pedagogico' then true
    when 'assinaturas_equipe' then true
    else false end;
end $$;

create or replace function public.pode_gravar(p_colecao text, p_id text, p_dados jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare papel text := meu_papel();
begin
  if papel is null then return false; end if;
  if not exists (select 1 from acesso where colecao = p_colecao and papel = any(escrever)) and not colecao_liberada(p_colecao, true) then return false; end if;
  if colecao_bloqueada(p_colecao, true) then return false; end if;
  if p_colecao = 'chat_mensagens' then return p_dados->>'autor_id' = auth.uid()::text; end if;
  if p_colecao = 'chat_lidos' then return p_id = auth.uid()::text; end if;
  if p_colecao = 'assinaturas_equipe' and papel not in ('admin','coordenacao') then return p_id = auth.uid()::text; end if;
  if papel <> 'professor' then return true; end if;
  if colecao_liberada(p_colecao, true) then return true; end if;   -- liberado só para este professor
  return case p_colecao
    when 'aulas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avaliacoes' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'ocorrencias' then p_dados->>'aluno_id' in (select meus_alunos()) and coalesce(p_dados->>'tipo','') <> 'atendimento'
    when 'compras' then p_dados->>'solicitante_id' = auth.uid()::text
    when 'planos_mensais' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avisos_log' then p_dados->>'aluno_id' in (select meus_alunos())
    when 'chat_canais' then true
    else false end;
end $$;

-- Excluir registros: perfis de gestão, ou quem recebeu a permissão de gravar essa coleção
drop policy if exists reg_excluir on public.registros;
create policy reg_excluir on public.registros for delete using (pode_gravar(colecao, id, dados) and (meu_papel() in ('admin','coordenacao','secretaria') or colecao_liberada(colecao, true)));

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
