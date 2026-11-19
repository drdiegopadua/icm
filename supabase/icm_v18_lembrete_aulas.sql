-- =====================================================================
-- ICM SISTEMA — Atualização 18: lembrete automático às 21h no chat
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--
-- Todo dia às 21h (horário de Brasília) o banco confere as aulas do dia:
-- turma ativa com aula naquele dia da semana (fora de feriado/recesso e de aula cancelada)
-- que ainda está sem CHAMADA, sem RELATÓRIO DA AULA ou sem as 3 FOTOS.
-- O professor recebe um aviso no chat, na conversa "Avisos do sistema" (só ele vê).
-- Não manda nada se estiver tudo lançado. Não repete o aviso da mesma aula.
--
-- Teste manual (manda os avisos de hoje na hora):
--   select public.lembrete_aulas_do_dia();
-- Ver o agendamento:  select * from cron.job where jobname = 'icm-lembrete-aulas';
-- Desligar:           select cron.unschedule('icm-lembrete-aulas');
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.lembrete_aulas_do_dia(p_dia date default (now() at time zone 'America/Sao_Paulo')::date)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  t record; a jsonb; faltas text[]; n integer := 0; dow integer := extract(dow from p_dia)::int;
  prof text; cid text; nf integer; tem_alunos boolean; lista text;
begin
  -- Feriado ou recesso no calendário letivo: ninguém dá aula
  if exists (select 1 from registros c where c.colecao = 'calendario' and c.dados->>'tipo' in ('feriado', 'recesso')
             and p_dia between (c.dados->>'inicio')::date and coalesce(nullif(c.dados->>'fim', '')::date, (c.dados->>'inicio')::date)) then
    return 0;
  end if;

  for t in
    select r.id, r.dados from registros r
    where r.colecao = 'turmas'
      and coalesce(r.dados->>'status', 'ativa') <> 'encerrada'
      and (coalesce(r.dados->'dias', '[]'::jsonb) @> to_jsonb(dow) or coalesce(r.dados->'dias', '[]'::jsonb) @> to_jsonb(dow::text))
      and coalesce(nullif(r.dados->>'data_inicio', '')::date, p_dia) <= p_dia
  loop
    -- Aula do dia (a realizada primeiro); aula cancelada = sem lembrete
    select r.dados into a from registros r
      where r.colecao = 'aulas' and r.dados->>'turma_id' = t.id and r.dados->>'data' = p_dia::text and coalesce(r.dados->>'status', '') <> 'cancelada'
      order by (r.dados->>'status' = 'realizada') desc limit 1;
    if a is null and exists (select 1 from registros r where r.colecao = 'aulas' and r.dados->>'turma_id' = t.id and r.dados->>'data' = p_dia::text and r.dados->>'status' = 'cancelada') then
      continue;
    end if;

    prof := coalesce(nullif(a->>'professor_id', ''), nullif(t.dados->>'professor_id', ''));
    if prof is null then continue; end if;

    tem_alunos := exists (select 1 from registros m where m.colecao = 'matriculas' and m.dados->>'turma_id' = t.id
      and coalesce(nullif(m.dados->>'entrada', '')::date, p_dia) <= p_dia
      and (nullif(m.dados->>'saida', '') is null or (m.dados->>'saida')::date > p_dia));
    nf := case when a is null then 0 else jsonb_array_length(case when jsonb_typeof(a->'fotos') = 'array' then a->'fotos' else '[]'::jsonb end) end;

    faltas := '{}';
    if tem_alunos and (a is null or coalesce(a->'presencas', '{}'::jsonb) = '{}'::jsonb) then faltas := faltas || 'a chamada'::text; end if;
    if a is null or coalesce(btrim(a->'relatorio'->>'texto'), '') = '' then faltas := faltas || 'o relatório da aula'::text; end if;
    if nf <> 3 then faltas := faltas || format('as 3 fotos (tem %s)', nf); end if;
    if cardinality(faltas) = 0 then continue; end if;

    lista := case cardinality(faltas)
      when 1 then faltas[1]
      when 2 then faltas[1] || ' e ' || faltas[2]
      else faltas[1] || ', ' || faltas[2] || ' e ' || faltas[3] end;

    -- Conversa "Avisos do sistema" de cada professor (só ele é membro)
    cid := 'chs_avisos_' || prof;
    insert into registros (colecao, id, dados) values ('chat_canais', cid, jsonb_build_object(
      'nome', 'Avisos do sistema', 'descricao', 'Lembretes automáticos das aulas', 'tipo', 'grupo',
      'membros', jsonb_build_array(prof), 'sistema', true, 'criado_em', now()))
    on conflict (colecao, id) do nothing;

    insert into registros (colecao, id, dados) values ('chat_mensagens', 'msg_lem_' || t.id || '_' || p_dia::text, jsonb_build_object(
      'canal_id', cid, 'autor_id', 'sistema', 'em', now(),
      'texto', format('⏰ Lembrete: a aula de hoje (%s) da turma *%s* ainda está sem %s. Lance em Pedagógico → Turmas → %s, ou pela Chamada no celular. Obrigado!',
                      to_char(p_dia, 'DD/MM'), t.dados->>'nome', lista, t.dados->>'nome')))
    on conflict (colecao, id) do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.lembrete_aulas_do_dia(date) from public, anon, authenticated;

-- Agenda: todo dia às 00:00 UTC = 21:00 em Brasília
select cron.unschedule('icm-lembrete-aulas') where exists (select 1 from cron.job where jobname = 'icm-lembrete-aulas');
select cron.schedule('icm-lembrete-aulas', '0 0 * * *', $cron$select public.lembrete_aulas_do_dia((now() at time zone 'America/Sao_Paulo')::date)$cron$);

notify pgrst, 'reload schema';
