-- =====================================================================
-- ICM SISTEMA — Atualização 5: App do Instituto (rodar UMA vez no SQL Editor,
-- depois do icm_v4). Pode rodar de novo sem problema.
--
--   O app das famílias passa a ler daqui. Visitante e família NÃO têm acesso às
--   tabelas: só chamam as funções abaixo, que devolvem o mínimo necessário.
--     app_publico()              projetos, turmas, calendário e apresentações
--     app_familia(matr., código) aluno, turmas, frequência e comunicados
--     app_van_posicao(matr., código)  posição da van (só aluno ativo que usa a van)
--     app_solicitar_matricula(dados)  inscrição: entra na Lista de espera
--   A van sai do banco antigo e vem para cá (rotas, posição atual, aparelhos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Calendário letivo (nova coleção, editada no sistema)
-- ---------------------------------------------------------------------
insert into public.acesso (colecao, ler, escrever) values
  ('calendario', '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}')
on conflict (colecao) do update set ler = excluded.ler, escrever = excluded.escrever;

insert into public.registros (colecao, id, dados)
select 'calendario', 'cal_' || lpad(n::text, 3, '0'), d
from (select row_number() over () as n, d from jsonb_array_elements('[
  {"inicio":"2026-01-01","titulo":"Confraternização Universal","tipo":"feriado"},
  {"inicio":"2026-02-16","fim":"2026-02-18","titulo":"Carnaval — sem aulas","tipo":"feriado"},
  {"inicio":"2026-02-23","titulo":"Início do 1º semestre","tipo":"marco"},
  {"inicio":"2026-04-03","titulo":"Sexta-feira Santa","tipo":"feriado"},
  {"inicio":"2026-04-13","titulo":"Nossa Senhora da Penha (ES)","tipo":"feriado"},
  {"inicio":"2026-04-21","titulo":"Tiradentes","tipo":"feriado"},
  {"inicio":"2026-05-01","titulo":"Dia do Trabalho","tipo":"feriado"},
  {"inicio":"2026-06-04","titulo":"Corpus Christi","tipo":"feriado"},
  {"inicio":"2026-07-10","titulo":"Fim do 1º semestre","tipo":"marco"},
  {"inicio":"2026-07-13","fim":"2026-07-24","titulo":"Recesso de julho","tipo":"recesso"},
  {"inicio":"2026-07-27","titulo":"Início do 2º semestre","tipo":"marco"},
  {"inicio":"2026-08-16","titulo":"Aniversário do Instituto","tipo":"marco"},
  {"inicio":"2026-09-07","titulo":"Independência do Brasil","tipo":"feriado"},
  {"inicio":"2026-10-12","titulo":"Nossa Senhora Aparecida","tipo":"feriado"},
  {"inicio":"2026-11-02","titulo":"Finados","tipo":"feriado"},
  {"inicio":"2026-11-20","titulo":"Consciência Negra","tipo":"feriado"},
  {"inicio":"2026-11-28","titulo":"Reunião de pais e responsáveis","tipo":"reuniao"},
  {"inicio":"2026-12-11","titulo":"Fim do 2º semestre","tipo":"marco"},
  {"inicio":"2026-12-14","fim":"2026-12-31","titulo":"Férias","tipo":"recesso"},
  {"inicio":"2026-12-25","titulo":"Natal","tipo":"feriado"}
]'::jsonb) as d) x
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Quem opera a van (motorista): usuário comum com esta marcação
-- ---------------------------------------------------------------------
alter table public.perfis   add column if not exists opera_van boolean not null default false;
alter table public.convites add column if not exists opera_van boolean not null default false;

create or replace function public.criar_perfil_do_convite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(new.email);
  if found then
    insert into perfis (id, nome, email, papel, cargo, telefone, exige_2fa, da_aulas, opera_van)
    values (new.id, c.nome, lower(new.email), c.papel, c.cargo, c.telefone, c.exige_2fa, c.da_aulas, c.opera_van)
    on conflict (id) do nothing;
    delete from convites where lower(email) = lower(new.email);
    update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(new.id::text))
      where colecao = 'chat_canais' and id = 'chg_geral';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Van: só a posição ATUAL (sem histórico de trajetos)
-- ---------------------------------------------------------------------
create table if not exists public.rotas (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  nome text not null check (char_length(nome) <= 80),
  ativa boolean not null default true,
  em_andamento boolean not null default false,
  iniciada_em timestamptz,
  transporte_id uuid references public.perfis (id)
);
insert into public.rotas (id, nome) values
  ('sede-grama', 'Sede (Campo 21) → Grama'),
  ('grama-sede', 'Grama → Sede (Campo 21)')
on conflict (id) do update set nome = excluded.nome;

create table if not exists public.van_posicao_atual (
  rota_id text primary key,
  lat double precision not null check (lat between -20.4 and -19.8),   -- limita à região
  lng double precision not null check (lng between -41.4 and -40.8),
  em_rota boolean not null default false,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.van_dispositivos (
  id uuid primary key default gen_random_uuid(),
  rota_id text not null,
  nome text not null,
  token_hash text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Gera o código de um aparelho novo. Mostra o código UMA vez; no banco fica só o hash.
-- Rodar no SQL Editor:  select public.criar_dispositivo_van('grama-sede', 'Celular do transporte');
create or replace function public.criar_dispositivo_van(p_rota text, p_nome text) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into van_dispositivos (rota_id, nome, token_hash)
  values (p_rota, p_nome, encode(extensions.digest(v_token, 'sha256'), 'hex'));
  return v_token;
end $$;
revoke all on function public.criar_dispositivo_van(text, text) from public, anon, authenticated;

create or replace function public.pode_operar_van() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() in ('admin', 'coordenacao'), false)
      or (meu_papel() is not null and exists (select 1 from perfis where id = auth.uid() and ativo and opera_van))
$$;

create or replace function public.iniciar_rota(p_rota text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not pode_operar_van() then raise exception 'sem permissão'; end if;
  if not exists (select 1 from rotas where id = p_rota and ativa) then raise exception 'rota inválida'; end if;
  -- uma van por vez: encerra outras rotas e apaga posições antigas
  update rotas set em_andamento = false, iniciada_em = null where em_andamento and id <> p_rota;
  delete from van_posicao_atual where rota_id <> p_rota;
  update rotas set em_andamento = true, iniciada_em = now(), transporte_id = auth.uid() where id = p_rota;
end $$;

create or replace function public.encerrar_rota(p_rota text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not pode_operar_van() then raise exception 'sem permissão'; end if;
  update rotas set em_andamento = false, iniciada_em = null where id = p_rota;
  delete from van_posicao_atual where rota_id = p_rota;   -- some do mapa na hora, sem histórico
end $$;

alter table public.rotas enable row level security;
alter table public.van_posicao_atual enable row level security;
alter table public.van_dispositivos enable row level security;   -- sem política: só o servidor lê

drop policy if exists rotas_ler on public.rotas;
create policy rotas_ler on public.rotas for select using (pode_operar_van());
drop policy if exists van_equipe_ler on public.van_posicao_atual;
create policy van_equipe_ler on public.van_posicao_atual for select using (pode_operar_van());

-- ---------------------------------------------------------------------
-- Conferência de matrícula + código da família
-- Devolve o id do aluno, ou 'negado'/'bloqueado'. Não usa RAISE de propósito:
-- RAISE desfaria o registro da tentativa e o limite nunca contaria.
-- ---------------------------------------------------------------------
create or replace function public.app_conferir_familia(p_matricula text, p_codigo text) returns text
language plpgsql security definer set search_path = public as $$
declare v_m text := upper(trim(coalesce(p_matricula, ''))); v_id text; v_cod text;
begin
  if v_m = '' or length(v_m) > 40 or length(coalesce(p_codigo, '')) > 40 then return 'negado'; end if;
  if (select count(*) from portal_tentativas where matricula = v_m and em > now() - interval '15 minutes') >= 5 then return 'bloqueado'; end if;
  select id into v_id from registros where colecao = 'alunos' and upper(dados->>'matricula') = v_m and coalesce(dados->>'status', '') <> 'desligado';
  select dados->'acesso_familia'->>'codigo' into v_cod from registros where colecao = 'alunos_privado' and id = v_id;
  if v_id is null or v_cod is null or v_cod is distinct from upper(trim(coalesce(p_codigo, ''))) then
    insert into portal_tentativas (matricula) values (v_m);
    return 'negado';
  end if;
  delete from portal_tentativas where matricula = v_m;
  return v_id;
end $$;
revoke all on function public.app_conferir_familia(text, text) from public, anon, authenticated;

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
        'grupo', (select p.dados->>'nome' from registros p where p.colecao = 'projetos' and p.id = e.dados->>'projeto_id')
      ) order by e.dados->>'data') from registros e
      where e.colecao = 'eventos' and coalesce((e.dados->>'app_oculto')::boolean, false) = false
        and e.dados->>'data' >= to_char(current_date - 365, 'YYYY-MM-DD')), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------
-- Área da família: só o próprio aluno e só o que o app mostra
-- ---------------------------------------------------------------------
create or replace function public.app_familia(p_matricula text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id text := app_conferir_familia(p_matricula, p_codigo); a registros; tids text[]; pids text[]; v_ano text := to_char(current_date, 'YYYY');
begin
  if v_id = 'bloqueado' then return jsonb_build_object('erro', 'Muitas tentativas. Aguarde 15 minutos.'); end if;
  if v_id = 'negado' then return jsonb_build_object('erro', 'Matrícula ou código inválidos.'); end if;
  select * into a from registros where colecao = 'alunos' and id = v_id;
  select array_agg(dados->>'turma_id') into tids from registros
    where colecao = 'matriculas' and dados->>'aluno_id' = v_id and dados->>'status' = 'ativo';
  select array_agg(distinct dados->>'projeto_id') into pids from registros where colecao = 'turmas' and id = any(tids);
  insert into auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, resumo)
    values ('familia', 'Família de ' || (a.dados->>'nome'), 'login_app', 'alunos', v_id, 'Acesso pelo App do Instituto');
  return jsonb_build_object(
    'aluno', jsonb_build_object('id', v_id, 'nome', a.dados->>'nome', 'matricula', a.dados->>'matricula', 'status', a.dados->>'status',
      'usa_van', coalesce((a.dados->'van'->>'usa')::boolean, false), 'ponto_van', a.dados->'van'->>'ponto'),
    'turmas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'projeto', t.dados->>'projeto_id', 'nome', t.dados->>'nome', 'dias', t.dados->'dias',
        'inicio', t.dados->>'inicio', 'fim', t.dados->>'fim', 'local', t.dados->>'local',
        'professor', (select nome from perfis p where p.id::text = t.dados->>'professor_id')))
      from registros t where t.colecao = 'turmas' and t.id = any(tids)), '[]'::jsonb),
    'projetos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', dados->>'nome'))
      from registros where colecao = 'projetos' and id = any(pids)), '[]'::jsonb),
    'frequencia', (select jsonb_build_object(
        'P', count(*) filter (where v = 'P'), 'F', count(*) filter (where v = 'F'), 'J', count(*) filter (where v = 'J'), 'ano', v_ano)
      from (select x.dados->'presencas'->>v_id as v from registros x
            where x.colecao = 'aulas' and x.dados->>'turma_id' = any(tids) and x.dados->>'status' = 'realizada'
              and x.dados->>'data' like v_ano || '-%' and x.dados->'presencas' ? v_id) f),
    'comunicados', coalesce((select jsonb_agg(jsonb_build_object('titulo', dados->>'titulo', 'texto', dados->>'texto', 'em', criado_em) order by criado_em desc)
      from (select dados, criado_em from registros where colecao = 'comunicados'
            and (dados->>'publico' = 'todos' or dados->>'projeto_id' = any(pids) or dados->>'turma_id' = any(tids))
            order by criado_em desc limit 10) c), '[]'::jsonb)
  );
end $$;

-- Posição da van para a família: aluno ativo que usa a van, rota em andamento e sinal recente
create or replace function public.app_van_posicao(p_matricula text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id text := app_conferir_familia(p_matricula, p_codigo); r record;
begin
  if v_id in ('bloqueado', 'negado') then return jsonb_build_object('erro', 'Acesso negado.'); end if;
  if not exists (select 1 from registros where colecao = 'alunos' and id = v_id and dados->>'status' = 'ativo' and coalesce((dados->'van'->>'usa')::boolean, false)) then
    return jsonb_build_object('em_rota', false);
  end if;
  select v.rota_id, v.lat, v.lng, v.atualizado_em into r
    from van_posicao_atual v join rotas o on o.id = v.rota_id
    where v.em_rota and o.em_andamento and v.atualizado_em > now() - interval '3 minutes'
    order by v.atualizado_em desc limit 1;
  if not found then return jsonb_build_object('em_rota', false); end if;
  return jsonb_build_object('em_rota', true, 'rota_id', r.rota_id, 'lat', r.lat, 'lng', r.lng, 'atualizado_em', r.atualizado_em);
end $$;

-- ---------------------------------------------------------------------
-- Inscrição pelo app: entra na Lista de espera do sistema para a secretaria conferir
-- ---------------------------------------------------------------------
create table if not exists public.app_inscricoes_limite (chave text, em timestamptz default now());
alter table public.app_inscricoes_limite enable row level security;   -- sem política: só as funções usam

create or replace function public.app_solicitar_matricula(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tel text := regexp_replace(coalesce(p->>'responsavel_telefone', ''), '\D', '', 'g');
  v_nome text := left(trim(coalesce(p->>'aluno_nome', '')), 120);
  v_resp text := left(trim(coalesce(p->>'responsavel_nome', '')), 120);
  v_turma text := left(coalesce(p->>'turma_id', ''), 60);
  v_usa boolean := coalesce((p->>'usa_van')::boolean, false);
  v_prefixo text := 'ESP-' || to_char(current_date, 'YYYY') || '-';
  v_seq int; v_prot text;
begin
  if not coalesce((p->>'aceite_lgpd')::boolean, false) then return jsonb_build_object('erro', 'É preciso aceitar o termo de uso de dados.'); end if;
  if length(v_nome) < 5 or length(v_resp) < 3 or length(v_tel) < 10 or length(v_tel) > 13 then return jsonb_build_object('erro', 'Confira nome, responsável e WhatsApp.'); end if;
  if not exists (select 1 from registros where colecao = 'turmas' and id = v_turma) then return jsonb_build_object('erro', 'Turma inválida.'); end if;
  -- Freio contra envio em massa: por telefone e no total
  if (select count(*) from app_inscricoes_limite where chave = v_tel and em > now() - interval '1 day') >= 5
     or (select count(*) from app_inscricoes_limite where em > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('erro', 'Limite de solicitações atingido. Fale com a secretaria.');
  end if;
  insert into app_inscricoes_limite (chave) values (v_tel);
  delete from app_inscricoes_limite where em < now() - interval '2 days';
  select coalesce(max(substring(dados->>'protocolo' from '(\d+)$')::int), 0) + 1 into v_seq
    from registros where colecao = 'espera' and dados->>'protocolo' like v_prefixo || '%';
  v_prot := v_prefixo || lpad(v_seq::text, 4, '0');
  insert into registros (colecao, id, dados) values ('espera', 'esp_' || replace(gen_random_uuid()::text, '-', ''), jsonb_build_object(
    'protocolo', v_prot, 'status', 'aguardando', 'data_inscricao', to_char(current_date, 'YYYY-MM-DD'), 'origem', 'app',
    'nome', v_nome, 'nascimento', left(coalesce(p->>'aluno_nascimento', ''), 10), 'escola', left(coalesce(p->>'escola', ''), 120),
    'responsavel', jsonb_build_object('nome', v_resp, 'telefone', left(coalesce(p->>'responsavel_telefone', ''), 20), 'parentesco', left(coalesce(p->>'parentesco', ''), 30)),
    'cadunico', coalesce((p->>'cad_unico')::boolean, false), 'interesses', jsonb_build_array(v_turma), 'vulnerabilidades', '[]'::jsonb,
    'van', jsonb_build_object('usa', v_usa, 'ponto', case when v_usa then left(coalesce(p->>'ponto_van', ''), 60) else '' end),
    'autoriza_imagem', coalesce((p->>'autoriza_imagem')::boolean, false), 'aceite_lgpd_em', now(),
    'obs', 'Inscrição pelo app.' || case when coalesce(p->>'serie', '') <> '' then ' Série: ' || left(p->>'serie', 40) || '.' else '' end || case when v_usa then ' Usa a van: ' || left(coalesce(p->>'ponto_van', ''), 60) || '.' else '' end
  ));
  return jsonb_build_object('protocolo', v_prot);
end $$;

-- ---------------------------------------------------------------------
-- Quem pode chamar o quê
-- ---------------------------------------------------------------------
revoke all on function public.app_publico(), public.app_familia(text, text), public.app_van_posicao(text, text), public.app_solicitar_matricula(jsonb) from public;
grant execute on function public.app_publico(), public.app_familia(text, text), public.app_van_posicao(text, text), public.app_solicitar_matricula(jsonb) to anon, authenticated;
revoke all on function public.iniciar_rota(text), public.encerrar_rota(text), public.pode_operar_van() from public, anon;
grant execute on function public.iniciar_rota(text), public.encerrar_rota(text), public.pode_operar_van() to authenticated;

notify pgrst, 'reload schema';
