-- =====================================================================
-- ICM SISTEMA — Atualização 12: professor vê só o que é pertinente às próprias turmas
-- (rodar UMA vez no SQL Editor, depois das anteriores; pode rodar de novo sem problema)
--
-- Professor CONTINUA vendo: as próprias turmas, os alunos delas (sem dados sensíveis),
--   matrículas, aulas/chamadas, avaliações, ocorrências (exceto atendimento social),
--   planos mensais, conferências e acompanhamentos dele, empréstimos dos seus alunos,
--   calendário letivo, cronograma pedagógico, as próprias compras, o chat e as
--   assinaturas da equipe (para imprimir nos relatórios da turma).
-- Passa a ver SÓ o que é da turma/projeto dele: projetos, eventos, reuniões de pais,
--   comunicados, certificados e registros de WhatsApp dos seus alunos, o espaço da
--   turma e os bens emprestados aos seus alunos.
-- Deixa de ver: voluntários, estoque, fornecedores, campanhas, pesquisas e reservas de espaço.
-- Os outros perfis (direção, coordenação, secretaria) não mudam.
-- =====================================================================

-- Projetos das turmas do professor
create or replace function public.meus_projetos() returns setof text
language sql stable security definer set search_path = public as $$
  select distinct dados->>'projeto_id' from registros where colecao = 'turmas' and dados->>'professor_id' = auth.uid()::text
$$;
revoke all on function public.meus_projetos() from public;
grant execute on function public.meus_projetos() to authenticated;

-- Coleções que não têm relação com a turma: professor perde leitura e gravação
update public.acesso set ler = array_remove(ler, 'professor'), escrever = array_remove(escrever, 'professor')
where colecao in ('voluntarios', 'estoque_itens', 'estoque_mov', 'fornecedores', 'campanhas', 'pesquisas', 'reservas');

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
    -- novos limites
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
    else false end;   -- qualquer coleção nova fica fechada para o professor até ser liberada aqui
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
    when 'avisos_log' then p_dados->>'aluno_id' in (select meus_alunos())
    when 'chat_canais' then true
    else false end;   -- o professor só grava o que é da turma dele
end $$;

notify pgrst, 'reload schema';
