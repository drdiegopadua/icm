-- =====================================================================
-- ICM SISTEMA — Atualização 8: gestão pedagógica (+ assinaturas da equipe)
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
-- Já inclui a Atualização 7 (assinaturas da equipe): basta rodar este arquivo.
--   planos_mensais .......... plano de aula do mês por turma (professor grava só das turmas dele)
--   conferencias ............ conferência mensal da coordenação (status e observações)
--   acompanhamentos ......... visitas às turmas e reuniões com professores
--   cronograma_pedagogico ... eventos e prazos pedagógicos do ano
--   assinaturas_equipe ...... assinaturas usadas nos relatórios e atas
-- =====================================================================
insert into public.acesso (colecao, ler, escrever) values
  ('planos_mensais',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,professor}'),
  ('conferencias',          '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('acompanhamentos',       '{admin,coordenacao,professor}',            '{admin,coordenacao}'),
  ('cronograma_pedagogico', '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('assinaturas_equipe',    '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}')
on conflict (colecao) do update set ler = excluded.ler, escrever = excluded.escrever;

create or replace function public.pode_ler(p_colecao text, p_id text, p_dados jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare papel text := meu_papel();
begin
  if papel is null then return false; end if;
  if not exists (select 1 from acesso where colecao = p_colecao and papel = any(ler)) then return false; end if;
  -- Arquivos do RH: só direção e coordenação
  if p_colecao = 'arquivos' and papel = 'secretaria' and p_dados->'dono'->>'col' in ('equipe','fin_lancamentos','docs_inst') then return false; end if;
  -- Chat: só membros do grupo ou da conversa direta
  if p_colecao = 'chat_canais' then return p_dados->'membros' ? auth.uid()::text; end if;
  if p_colecao = 'chat_mensagens' then return exists (select 1 from registros c where c.colecao = 'chat_canais' and c.id = p_dados->>'canal_id' and c.dados->'membros' ? auth.uid()::text) or (p_dados->>'canal_id') like '%' || auth.uid()::text || '%'; end if;
  if p_colecao = 'chat_lidos' then return p_id = auth.uid()::text; end if;
  if papel <> 'professor' then return true; end if;
  -- Professor: só o que é das turmas dele
  return case p_colecao
    when 'turmas' then p_dados->>'professor_id' = auth.uid()::text
    when 'alunos' then p_id in (select meus_alunos())
    when 'matriculas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'aulas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avaliacoes' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'ocorrencias' then p_dados->>'aluno_id' in (select meus_alunos()) and coalesce(p_dados->>'tipo','') <> 'atendimento'
    when 'emprestimos' then p_dados->>'tipo_tomador' = 'aluno' and p_dados->>'aluno_id' in (select meus_alunos())
    when 'compras' then p_dados->>'solicitante_id' = auth.uid()::text
    when 'planos_mensais' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'conferencias' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'acompanhamentos' then p_dados->'professores' ? auth.uid()::text
    else true end;
end $$;

create or replace function public.pode_gravar(p_colecao text, p_id text, p_dados jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare papel text := meu_papel();
begin
  if papel is null then return false; end if;
  if not exists (select 1 from acesso where colecao = p_colecao and papel = any(escrever)) then return false; end if;
  if p_colecao = 'chat_mensagens' then return p_dados->>'autor_id' = auth.uid()::text; end if;
  if p_colecao = 'chat_lidos' then return p_id = auth.uid()::text; end if;
  -- Assinaturas da equipe: cada um só a própria (direção e coordenação: qualquer uma)
  if p_colecao = 'assinaturas_equipe' and papel not in ('admin','coordenacao') then return p_id = auth.uid()::text; end if;
  if papel <> 'professor' then return true; end if;
  return case p_colecao
    when 'aulas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avaliacoes' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'ocorrencias' then p_dados->>'aluno_id' in (select meus_alunos()) and coalesce(p_dados->>'tipo','') <> 'atendimento'
    when 'compras' then p_dados->>'solicitante_id' = auth.uid()::text
    when 'planos_mensais' then p_dados->>'turma_id' in (select minhas_turmas())
    else true end;
end $$;

notify pgrst, 'reload schema';
