-- =====================================================================
-- ICM SISTEMA — Atualização 7: assinaturas da equipe
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--   Cada pessoa da equipe cadastra a própria assinatura (Minha assinatura) e ela é
--   impressa nos relatórios e atas. Todos da equipe leem (para imprimir); cada um grava
--   só a própria; direção e coordenação gravam a de qualquer pessoa (coleta no aparelho
--   e pessoas sem acesso ao sistema).
-- =====================================================================
insert into public.acesso (colecao, ler, escrever) values
  ('assinaturas_equipe', '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}')
on conflict (colecao) do update set ler = excluded.ler, escrever = excluded.escrever;

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
    else true end;
end $$;

notify pgrst, 'reload schema';
