-- =====================================================================
-- ICM SISTEMA — Banco no Supabase (rodar UMA vez no SQL Editor)
-- Projeto: SistemaICM (Instituto das Montanhas)
--
-- Modelo: cada "coleção" do sistema (alunos, turmas, aulas…) fica na tabela
-- `registros` como documento JSON. A SEGURANÇA é feita aqui no banco (RLS):
--   • cada perfil só lê/grava as coleções liberadas na tabela `acesso`;
--   • professor só enxerga as próprias turmas, os alunos delas e seus registros;
--   • dados sensíveis (social, financeiro, saúde completa, documentos, conta
--     bancária e salário) ficam em coleções *_privado que professor não lê;
--   • famílias, doadores e quem confere certificado usam funções públicas
--     que devolvem só o mínimo necessário.
-- Os arquivos antigos schema*.sql ficam só como referência.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Usuários (ligados ao Supabase Auth) e convites
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null check (papel in ('admin','coordenacao','secretaria','professor')),
  cargo text, telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Só quem tem convite consegue acesso: ao criar a conta, o perfil nasce com o papel do convite
create table if not exists public.convites (
  email text primary key,
  nome text not null,
  papel text not null check (papel in ('admin','coordenacao','secretaria','professor')),
  cargo text, telefone text,
  criado_por uuid, criado_em timestamptz not null default now()
);

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid() and ativo
$$;

create or replace function public.criar_perfil_do_convite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(new.email);
  if found then
    insert into perfis (id, nome, email, papel, cargo, telefone)
    values (new.id, c.nome, lower(new.email), c.papel, c.cargo, c.telefone)
    on conflict (id) do nothing;
    delete from convites where lower(email) = lower(new.email);
    -- entra no grupo "Geral" do chat
    update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(new.id::text))
      where colecao = 'chat_canais' and id = 'chg_geral';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Registros (todas as coleções) + configuração + auditoria
-- ---------------------------------------------------------------------
create table if not exists public.registros (
  colecao text not null,
  id text not null,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (colecao, id)
);
create index if not exists registros_turma on public.registros ((dados->>'turma_id')) where colecao in ('aulas','matriculas','avaliacoes');
create index if not exists registros_aluno on public.registros ((dados->>'aluno_id'));

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.criar_perfil_do_convite();

create table if not exists public.config (id text primary key default 'geral', dados jsonb not null default '{}');
insert into public.config (id, dados) values ('geral', '{"assiduidade":{"alerta":2,"desligamento":3,"periodo":"mes"},"privacidade":{"prazo_anos":5}}') on conflict do nothing;

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  usuario_id text not null default coalesce(auth.uid()::text, 'publico'),
  usuario_nome text, acao text not null, entidade text, entidade_id text, resumo text
);

-- Quem lê e quem grava cada coleção
create table if not exists public.acesso (colecao text primary key, ler text[] not null, escrever text[] not null);
insert into public.acesso (colecao, ler, escrever) values
  ('alunos',            '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('alunos_privado',    '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('matriculas',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('projetos',          '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('turmas',            '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('aulas',             '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,professor}'),
  ('eventos',           '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('ocorrencias',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('patrimonio',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('emprestimos',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('espera',            '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('reunioes',          '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('voluntarios',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('certificados',      '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('doadores',          '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('doacoes',           '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('associados',        '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('mensalidades',      '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('pesquisas',         '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('recursos',          '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('reservas',          '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('estoque_itens',     '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('estoque_mov',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('equipe',            '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('equipe_privado',    '{admin}',                                  '{admin}'),
  ('comunicados',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('assinaturas',       '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('avisos_log',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('atas',              '{admin,coordenacao}',                      '{admin}'),
  ('mandatos',          '{admin,coordenacao}',                      '{admin}'),
  ('estatuto',          '{admin,coordenacao}',                      '{admin}'),
  ('docs_inst',         '{admin,coordenacao,secretaria}',           '{admin,coordenacao}'),
  ('arquivos',          '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('fin_contas',        '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('fin_orcamentos',    '{admin,coordenacao}',                      '{admin}'),
  ('fin_lancamentos',   '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('fin_extratos',      '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('fornecedores',      '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria}'),
  ('compras',           '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('campanhas',         '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao}'),
  ('doacoes_online',    '{admin,coordenacao}',                      '{admin,coordenacao}'),
  ('pia',               '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('encaminhamentos',   '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('pareceres',         '{admin,coordenacao,secretaria}',           '{admin,coordenacao,secretaria}'),
  ('avaliacoes',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,professor}'),
  ('chat_canais',       '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('chat_mensagens',    '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}'),
  ('chat_lidos',        '{admin,coordenacao,secretaria,professor}', '{admin,coordenacao,secretaria,professor}')
on conflict (colecao) do update set ler = excluded.ler, escrever = excluded.escrever;

-- ---------------------------------------------------------------------
-- Funções de escopo do professor (security definer: não passam pelo RLS)
-- ---------------------------------------------------------------------
create or replace function public.minhas_turmas() returns setof text
language sql stable security definer set search_path = public as $$
  select id from registros where colecao = 'turmas' and dados->>'professor_id' = auth.uid()::text
$$;
create or replace function public.meus_alunos() returns setof text
language sql stable security definer set search_path = public as $$
  select distinct dados->>'aluno_id' from registros where colecao = 'matriculas' and dados->>'turma_id' in (select minhas_turmas())
$$;
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
  if papel <> 'professor' then return true; end if;
  return case p_colecao
    when 'aulas' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'avaliacoes' then p_dados->>'turma_id' in (select minhas_turmas())
    when 'ocorrencias' then p_dados->>'aluno_id' in (select meus_alunos()) and coalesce(p_dados->>'tipo','') <> 'atendimento'
    when 'compras' then p_dados->>'solicitante_id' = auth.uid()::text
    else true end;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.convites enable row level security;
alter table public.registros enable row level security;
alter table public.config enable row level security;
alter table public.auditoria enable row level security;
alter table public.acesso enable row level security;

drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select using (meu_papel() is not null or id = auth.uid());
drop policy if exists perfis_admin on public.perfis;
create policy perfis_admin on public.perfis for update using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
drop policy if exists convites_admin on public.convites;
create policy convites_admin on public.convites for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists reg_ler on public.registros;
create policy reg_ler on public.registros for select using (pode_ler(colecao, id, dados));
drop policy if exists reg_inserir on public.registros;
create policy reg_inserir on public.registros for insert with check (pode_gravar(colecao, id, dados));
drop policy if exists reg_alterar on public.registros;
create policy reg_alterar on public.registros for update using (pode_ler(colecao, id, dados) and pode_gravar(colecao, id, dados)) with check (pode_gravar(colecao, id, dados));
drop policy if exists reg_excluir on public.registros;
create policy reg_excluir on public.registros for delete using (pode_gravar(colecao, id, dados) and meu_papel() in ('admin','coordenacao','secretaria'));

drop policy if exists config_ler on public.config;
create policy config_ler on public.config for select using (meu_papel() is not null);
drop policy if exists config_gravar on public.config;
create policy config_gravar on public.config for update using (meu_papel() in ('admin','coordenacao')) with check (meu_papel() in ('admin','coordenacao'));

drop policy if exists aud_ler on public.auditoria;
create policy aud_ler on public.auditoria for select using (meu_papel() = 'admin');
drop policy if exists aud_inserir on public.auditoria;
create policy aud_inserir on public.auditoria for insert with check (meu_papel() is not null and usuario_id = auth.uid()::text);
-- (sem UPDATE/DELETE: auditoria é imutável)

drop policy if exists acesso_ler on public.acesso;
create policy acesso_ler on public.acesso for select using (meu_papel() is not null);

-- Atualiza "atualizado_em" e "atualizado_por" em toda gravação
create or replace function public.marcar_atualizacao() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); new.atualizado_por := auth.uid(); return new; end $$;
drop trigger if exists registros_atualizacao on public.registros;
create trigger registros_atualizacao before update on public.registros for each row execute function public.marcar_atualizacao();

-- ---------------------------------------------------------------------
-- Funções PÚBLICAS (sem login) — devolvem só o mínimo
-- ---------------------------------------------------------------------
-- Verificação de certificado (QR Code)
create or replace function public.verificar_certificado(p_codigo text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('codigo', dados->>'codigo', 'nome', dados->>'nome', 'titulo', dados->>'titulo', 'tipo', dados->>'tipo',
    'carga_horaria', dados->'carga_horaria', 'data_emissao', dados->>'data_emissao', 'status', dados->>'status', 'motivo_revogacao', dados->>'motivo_revogacao')
  from registros where colecao = 'certificados' and dados->>'codigo' = upper(trim(p_codigo)) limit 1
$$;

-- Página de doação: campanhas no ar + total arrecadado (sem dados de doadores) + chave Pix
create or replace function public.campanhas_publicas() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'campanhas', coalesce((select jsonb_agg(r.dados || jsonb_build_object('id', r.id)) from registros r where r.colecao = 'campanhas' and (r.dados->>'ativa')::boolean is not false), '[]'),
    'doacoes_online', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'campanha_id', d.dados->>'campanha_id', 'valor', (d.dados->>'valor')::numeric, 'status', d.dados->>'status')) from registros d where d.colecao = 'doacoes_online' and d.dados->>'status' = 'confirmada'), '[]'),
    'pix', coalesce((select dados->'pix' from config where id = 'geral'), '{}'))
$$;

create or replace function public.doar_publico(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare novo_id text := 'don_' || encode(extensions.gen_random_bytes(8), 'hex'); dados jsonb; v numeric := (p->>'valor')::numeric;
begin
  if v is null or v < 5 or v > 50000 then raise exception 'Valor inválido'; end if;
  if length(coalesce(p->>'nome','')) < 3 then raise exception 'Informe seu nome'; end if;
  if not exists (select 1 from registros where colecao = 'campanhas' and id = p->>'campanha_id') then raise exception 'Campanha não encontrada'; end if;
  -- limite anti-abuso: no máximo 30 intenções por hora no total
  if (select count(*) from registros where colecao = 'doacoes_online' and criado_em > now() - interval '1 hour') > 30 then raise exception 'Muitas tentativas. Tente mais tarde.'; end if;
  dados := jsonb_build_object('campanha_id', p->>'campanha_id', 'nome', left(p->>'nome', 120), 'email', left(coalesce(p->>'email',''), 160), 'telefone', left(coalesce(p->>'telefone',''), 30),
    'valor', round(v, 2), 'recorrente', coalesce((p->>'recorrente')::boolean, false), 'aceita_comunicacao', coalesce((p->>'aceita_comunicacao')::boolean, false),
    'txid', 'ICM' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10)), 'status', 'aguardando', 'criado_em', now());
  insert into registros (colecao, id, dados) values ('doacoes_online', novo_id, dados);
  return dados || jsonb_build_object('id', novo_id);
end $$;

-- Assinatura digital: lê o pedido pelo token e grava a assinatura
create or replace function public.assinatura_por_token(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s registros; a registros; ap registros; e registros; it registros;
begin
  select * into s from registros where colecao = 'assinaturas' and dados->>'token' = p_token;
  if not found then return null; end if;
  select * into a from registros where colecao = 'alunos' and id = s.dados->>'aluno_id';
  select * into ap from registros where colecao = 'alunos_privado' and id = s.dados->>'aluno_id';
  if s.dados->>'tipo' = 'emprestimo' then
    select * into e from registros where colecao = 'emprestimos' and id = s.dados->>'referencia_id';
    select * into it from registros where colecao = 'patrimonio' and id = e.dados->>'item_id';
  end if;
  return jsonb_build_object('assinatura', s.dados || jsonb_build_object('id', s.id),
    'aluno', jsonb_build_object('id', a.id, 'nome', a.dados->>'nome', 'matricula', a.dados->>'matricula', 'nascimento', a.dados->>'nascimento', 'responsavel', a.dados->'responsavel', 'endereco', coalesce(ap.dados->'endereco', a.dados->'endereco')),
    'ref', case when e.id is null then null else jsonb_build_object('numero', e.dados->>'numero', 'item', (e.dados->>'quantidade') || 'x ' || (it.dados->>'nome') || ' (' || (it.dados->>'tombo') || ')') end);
end $$;

create or replace function public.responder_assinatura(p_token text, p jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare s registros; aut jsonb; tipo text;
begin
  select * into s from registros where colecao = 'assinaturas' and dados->>'token' = p_token for update;
  if not found or s.dados->>'status' <> 'pendente' then raise exception 'Documento indisponível'; end if;
  tipo := s.dados->>'tipo';
  if p->>'status' = 'assinado' then
    if length(coalesce(p->>'signatario_nome','')) < 5 or length(regexp_replace(coalesce(p->>'signatario_cpf',''), '\D', '', 'g')) <> 11 or length(coalesce(p->>'assinatura_img','')) < 100 then raise exception 'Dados da assinatura incompletos'; end if;
    update registros set dados = dados || jsonb_build_object('status', 'assinado', 'assinado_em', now(), 'signatario_nome', p->>'signatario_nome', 'signatario_cpf', regexp_replace(p->>'signatario_cpf', '\D', '', 'g'),
      'assinatura_img', p->>'assinatura_img', 'doc_hash', p->>'doc_hash', 'doc_html', p->>'doc_html', 'user_agent', left(p->>'user_agent', 200)) where colecao = 'assinaturas' and id = s.id;
    select coalesce(dados->'autorizacoes', '{}') into aut from registros where colecao = 'alunos' and id = s.dados->>'aluno_id';
    if tipo = 'lgpd' then aut := aut || jsonb_build_object('lgpd', true, 'data_termo', current_date); end if;
    if tipo = 'imagem' then aut := aut || jsonb_build_object('imagem', true); end if;
    if tipo = 'matricula' then aut := aut || jsonb_build_object('matricula_assinada', current_date); end if;
    update registros set dados = jsonb_set(dados, '{autorizacoes}', aut) where colecao = 'alunos' and id = s.dados->>'aluno_id';
    if tipo = 'emprestimo' then update registros set dados = dados || '{"termo_assinado": true}' where colecao = 'emprestimos' and id = s.dados->>'referencia_id'; end if;
  else
    update registros set dados = dados || jsonb_build_object('status', 'recusado', 'recusado_em', now(), 'motivo_recusa', left(coalesce(p->>'motivo',''), 300)) where colecao = 'assinaturas' and id = s.id;
    if tipo = 'imagem' then update registros set dados = jsonb_set(dados, '{autorizacoes,imagem}', 'false') where colecao = 'alunos' and id = s.dados->>'aluno_id'; end if;
  end if;
  insert into auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, resumo) values ('familia', coalesce(p->>'signatario_nome','Responsável'), coalesce(p->>'status','recusado'), 'assinaturas', s.id, tipo);
  return true;
end $$;

-- Portal da Família: matrícula + código de acesso → só os dados do próprio filho(a)
create table if not exists public.portal_tentativas (matricula text, em timestamptz default now());
alter table public.portal_tentativas enable row level security;
create or replace function public.portal_dados(p_matricula text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a registros; ap registros; tids text[]; pids text[];
begin
  if (select count(*) from portal_tentativas where matricula = upper(p_matricula) and em > now() - interval '15 minutes') >= 5 then raise exception 'Muitas tentativas. Aguarde 15 minutos.'; end if;
  select * into a from registros where colecao = 'alunos' and upper(dados->>'matricula') = upper(trim(p_matricula)) and dados->>'status' <> 'desligado';
  select * into ap from registros where colecao = 'alunos_privado' and id = a.id;
  if a.id is null or ap.dados->'acesso_familia'->>'codigo' is distinct from upper(trim(p_codigo)) then
    insert into portal_tentativas (matricula) values (upper(p_matricula));
    raise exception 'Matrícula ou código inválidos.';
  end if;
  delete from portal_tentativas where matricula = upper(p_matricula);
  select array_agg(dados->>'turma_id') into tids from registros where colecao = 'matriculas' and dados->>'aluno_id' = a.id;
  select array_agg(distinct dados->>'projeto_id') into pids from registros where colecao = 'turmas' and id = any(tids);
  insert into auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, resumo) values ('familia', 'Família de ' || (a.dados->>'nome'), 'login_portal', 'alunos', a.id, 'Acesso ao Portal da Família');
  return jsonb_build_object(
    'aluno_id', a.id,
    'alunos', jsonb_build_array(jsonb_build_object('id', a.id, 'nome', a.dados->>'nome', 'matricula', a.dados->>'matricula', 'foto', a.dados->>'foto', 'nascimento', a.dados->>'nascimento', 'status', a.dados->>'status', 'responsavel', jsonb_build_object('nome', a.dados->'responsavel'->>'nome'))),
    'matriculas', coalesce((select jsonb_agg(dados || jsonb_build_object('id', id)) from registros where colecao = 'matriculas' and dados->>'aluno_id' = a.id), '[]'),
    'turmas', coalesce((select jsonb_agg(dados || jsonb_build_object('id', id)) from registros where colecao = 'turmas' and id = any(tids)), '[]'),
    'projetos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', dados->>'nome')) from registros where colecao = 'projetos' and id = any(pids)), '[]'),
    'usuarios', coalesce((select jsonb_agg(jsonb_build_object('id', p.id::text, 'nome', p.nome)) from perfis p where p.id::text in (select dados->>'professor_id' from registros where colecao = 'turmas' and id = any(tids))), '[]'),
    'aulas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'turma_id', dados->>'turma_id', 'data', dados->>'data', 'inicio', dados->>'inicio', 'fim', dados->>'fim', 'status', dados->>'status', 'plano', jsonb_build_object('tema', dados->'plano'->>'tema'), 'presencas', case when dados->'presencas' ? a.id then jsonb_build_object(a.id, dados->'presencas'->a.id) else '{}'::jsonb end)) from registros where colecao = 'aulas' and dados->>'turma_id' = any(tids)), '[]'),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', dados->>'tipo', 'titulo', dados->>'titulo', 'data', dados->>'data', 'horario', dados->>'horario', 'local', dados->>'local', 'alunos', jsonb_build_array(a.id))) from registros where colecao = 'eventos' and dados->'alunos' ? a.id), '[]'),
    'reunioes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', dados->>'titulo', 'data', dados->>'data', 'horario', dados->>'horario', 'local', dados->>'local', 'projeto_id', dados->>'projeto_id', 'turma_id', dados->>'turma_id', 'presencas', '{}'::jsonb)) from registros where colecao = 'reunioes' and dados->>'data' >= to_char(current_date, 'YYYY-MM-DD') and (coalesce(dados->>'projeto_id','') = '' and coalesce(dados->>'turma_id','') = '' or dados->>'projeto_id' = any(pids) or dados->>'turma_id' = any(tids))), '[]'),
    'comunicados', coalesce((select jsonb_agg(dados || jsonb_build_object('id', id)) from registros where colecao = 'comunicados' and (dados->>'publico' = 'todos' or dados->>'projeto_id' = any(pids) or dados->>'turma_id' = any(tids))), '[]'),
    'certificados', coalesce((select jsonb_agg(dados || jsonb_build_object('id', id)) from registros where colecao = 'certificados' and dados->>'destinatario_id' = a.id and dados->>'status' = 'valido'), '[]'),
    'assinaturas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'token', dados->>'token', 'tipo', dados->>'tipo', 'status', dados->>'status', 'aluno_id', a.id, 'solicitado_em', dados->>'solicitado_em', 'assinado_em', dados->>'assinado_em')) from registros where colecao = 'assinaturas' and dados->>'aluno_id' = a.id), '[]'),
    'emprestimos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_id', dados->>'item_id', 'quantidade', dados->'quantidade', 'aluno_id', a.id, 'status', dados->>'status', 'previsao_devolucao', dados->>'previsao_devolucao')) from registros where colecao = 'emprestimos' and dados->>'aluno_id' = a.id and dados->>'status' = 'ativo'), '[]'),
    'patrimonio', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', dados->>'nome')) from registros where colecao = 'patrimonio' and id in (select dados->>'item_id' from registros where colecao = 'emprestimos' and dados->>'aluno_id' = a.id)), '[]'),
    'associados', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'aluno_id', a.id, 'numero', dados->>'numero', 'valor_mensal', dados->'valor_mensal', 'status', dados->>'status')) from registros where colecao = 'associados' and dados->>'aluno_id' = a.id), '[]'),
    'mensalidades', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'associado_id', m.dados->>'associado_id', 'competencia', m.dados->>'competencia', 'vencimento', m.dados->>'vencimento', 'valor', m.dados->'valor', 'status', m.dados->>'status')) from registros m where m.colecao = 'mensalidades' and m.dados->>'associado_id' in (select id from registros where colecao = 'associados' and dados->>'aluno_id' = a.id)), '[]'),
    'config', (select dados from config where id = 'geral'));
end $$;

-- Quem pode chamar o quê
revoke all on function public.pode_ler(text, text, jsonb), public.pode_gravar(text, text, jsonb), public.minhas_turmas(), public.meus_alunos() from public;
grant execute on function public.pode_ler(text, text, jsonb), public.pode_gravar(text, text, jsonb), public.minhas_turmas(), public.meus_alunos(), public.meu_papel() to authenticated;
grant execute on function public.verificar_certificado(text), public.campanhas_publicas(), public.doar_publico(jsonb), public.assinatura_por_token(text), public.responder_assinatura(text, jsonb), public.portal_dados(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Dados iniciais mínimos
-- ---------------------------------------------------------------------
insert into public.registros (colecao, id, dados) values
  ('chat_canais', 'chg_geral', '{"nome":"Geral","descricao":"Avisos para toda a equipe","tipo":"grupo","membros":[],"fixo":true}')
on conflict do nothing;

-- PRIMEIRO ADMINISTRADOR: troque o e-mail se quiser, rode, e depois crie a conta
-- com esse mesmo e-mail em Authentication → Users → Add user (ou pelo "Primeiro acesso" do sistema).
insert into public.convites (email, nome, papel, cargo) values ('drdiegopadua@gmail.com', 'Diego Pádua', 'admin', 'Diretor executivo')
on conflict (email) do nothing;
