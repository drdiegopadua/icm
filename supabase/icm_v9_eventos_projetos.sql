-- =====================================================================
-- ICM SISTEMA — Atualização 9: eventos com vários projetos no App do Instituto
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--   Em "Próximas apresentações", o grupo passa a mostrar TODOS os projetos
--   marcados no evento (projeto_ids), ex.: "Orquestra Jônice Tristão, Coro Jovem".
--   Eventos antigos, com um projeto só (projeto_id), continuam iguais.
--   Só recria a função app_publico(); não mexe em tabelas nem em dados.
-- =====================================================================
-- ---------------------------------------------------------------------
-- Dados públicos do app (sem nenhum dado de aluno ou da equipe)
-- ---------------------------------------------------------------------
create or replace function public.app_publico() returns jsonb
language sql stable security definer set search_path = public as $$
  with proj as (
    select id, dados from registros
    where colecao = 'projetos' and coalesce(dados->>'status', '') <> 'encerrado'
      and coalesce((dados->>'app_oculto')::boolean, false) = false
  ), turm as (
    select t.id, t.dados from registros t join proj p on p.id = t.dados->>'projeto_id'
    where t.colecao = 'turmas' and coalesce(t.dados->>'status', '') <> 'encerrada'
  )
  select jsonb_build_object(
    'projetos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'nome', dados->>'nome', 'area', dados->>'area', 'cor', dados->>'cor',
        'resumo', coalesce(nullif(dados->>'app_resumo', ''), dados->>'objetivo_geral'),
        'texto', dados->>'objetivo_geral', 'publico', dados->>'publico_alvo', 'local', dados->>'local',
        'foto', dados->>'app_foto', 'novo', coalesce((dados->>'app_inscricoes')::boolean, false)
      ) order by dados->>'nome') from proj), '[]'::jsonb),
    'turmas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'projeto', t.dados->>'projeto_id', 'nome', t.dados->>'nome', 'dias', t.dados->'dias',
        'inicio', t.dados->>'inicio', 'fim', t.dados->>'fim', 'local', t.dados->>'local',
        'vagas', case when nullif(t.dados->>'vagas', '') is null then null else greatest(0, (t.dados->>'vagas')::int - (
            select count(*) from registros m where m.colecao = 'matriculas' and m.dados->>'turma_id' = t.id and m.dados->>'status' = 'ativo')) end
      ) order by t.dados->>'nome') from turm t), '[]'::jsonb),
    'calendario', coalesce((select jsonb_agg(jsonb_build_object(
        'inicio', dados->>'inicio', 'fim', dados->>'fim', 'titulo', dados->>'titulo', 'tipo', dados->>'tipo'
      ) order by dados->>'inicio') from registros where colecao = 'calendario'), '[]'::jsonb),
    'apresentacoes', coalesce((select jsonb_agg(jsonb_build_object(
        'data', e.dados->>'data', 'hora', e.dados->>'horario', 'titulo', e.dados->>'titulo', 'local', e.dados->>'local',
        -- todos os projetos do evento, na ordem marcada (eventos antigos: só projeto_id)
        'grupo', (select string_agg(p.dados->>'nome', ', ' order by x.ord)
          from jsonb_array_elements_text(case when jsonb_typeof(e.dados->'projeto_ids') = 'array' and jsonb_array_length(e.dados->'projeto_ids') > 0
                 then e.dados->'projeto_ids' else jsonb_build_array(e.dados->>'projeto_id') end) with ordinality as x(id, ord)
          join registros p on p.colecao = 'projetos' and p.id = x.id)
      ) order by e.dados->>'data') from registros e
      where e.colecao = 'eventos' and coalesce((e.dados->>'app_oculto')::boolean, false) = false
        and e.dados->>'data' >= to_char(current_date - 365, 'YYYY-MM-DD')), '[]'::jsonb)
  )
$$;

-- Mesmo acesso de antes: visitantes e famílias podem chamar a função
revoke all on function public.app_publico() from public;
grant execute on function public.app_publico() to anon, authenticated;
