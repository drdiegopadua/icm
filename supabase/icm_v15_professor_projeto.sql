-- =====================================================================
-- ICM SISTEMA — Atualização 15: professor vê todas as turmas dos projetos em que dá aula
-- (rodar UMA vez no SQL Editor, depois da v14; pode rodar de novo sem problema)
--
-- Antes: o professor via só as turmas em que ELE é o professor.
-- Agora: vê (e pode registrar chamada, relatório e plano) em todas as turmas do mesmo
-- projeto — ex.: os professores da Orquestra de Sopros veem as turmas A, B e C, para
-- substituir um colega ou acompanhar o projeto. Alunos dessas turmas também (sem dados
-- sensíveis). Projetos de que ele não participa continuam fechados.
-- A regra de leitura abaixo é a da v13 com uma única linha alterada (turmas).
-- =====================================================================

create or replace function public.minhas_turmas() returns setof text
language sql stable security definer set search_path = public as $$
  select t.id from registros t
  where t.colecao = 'turmas'
    and (t.dados->>'professor_id' = auth.uid()::text
         or t.dados->>'projeto_id' in (select p.dados->>'projeto_id' from registros p
                                        where p.colecao = 'turmas' and p.dados->>'professor_id' = auth.uid()::text))
$$;

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
    when 'turmas' then p_id in (select minhas_turmas())   -- turmas dos projetos em que dá aula (v15)
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

notify pgrst, 'reload schema';
