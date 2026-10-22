-- =====================================================================
-- ICM SISTEMA — Esquema Supabase (PostgreSQL) com segurança por linha (RLS)
-- Rodar no SQL Editor do Supabase quando formos conectar o banco.
-- Princípios: tudo bloqueado por padrão; cada perfil só vê o necessário;
-- dados sensíveis (social, financeiro, saúde) em tabela separada;
-- auditoria automática por gatilho; fotos em bucket PRIVADO.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Perfis de usuário (ligados ao Supabase Auth)
-- ---------------------------------------------------------------------
create type papel_usuario as enum ('admin', 'coordenacao', 'secretaria', 'professor');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel papel_usuario not null default 'professor',
  cargo text,
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Funções auxiliares usadas nas políticas (security definer evita recursão de RLS)
create or replace function public.meu_papel() returns papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.tem_papel(variadic papeis papel_usuario[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = any(papeis), false)
$$;

-- ---------------------------------------------------------------------
-- Projetos e turmas
-- ---------------------------------------------------------------------
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  area text not null check (area in ('cultura','esporte','meio_ambiente','educacao','saude')),
  status text not null default 'planejamento' check (status in ('planejamento','execucao','prestacao','encerrado')),
  cor text,
  fonte text, financiador text, numero_termo text, valor numeric(14,2),
  inicio date not null, fim date not null,
  coordenador_id uuid references public.perfis(id),
  local text, publico_alvo text,
  justificativa text, objetivo_geral text, objetivos_especificos text[] default '{}',
  metodologia text, contrapartidas text,
  metas jsonb not null default '[]',
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete restrict,
  nome text not null, modalidade text,
  professor_id uuid not null references public.perfis(id),
  dias smallint[] not null default '{}',
  inicio time, fim time, vagas int, faixa text, local text,
  status text not null default 'ativa' check (status in ('ativa','encerrada')),
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);

create or replace function public.professor_da_turma(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.turmas where id = t and professor_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Alunos (dados básicos) + dados sensíveis em tabela separada
-- ---------------------------------------------------------------------
create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  matricula text not null unique,
  nome text not null, nome_social text,
  nascimento date, sexo text, cor_raca text,
  telefone text, email text, foto_path text,
  status text not null default 'ativo' check (status in ('ativo','espera','inativo','desligado')),
  data_matricula date not null default current_date,
  responsavel jsonb not null default '{}',      -- nome, parentesco, telefone
  endereco jsonb not null default '{}',
  escolaridade jsonb not null default '{}',
  autorizacoes jsonb not null default '{}',     -- lgpd, imagem, saida_sozinho, data_termo
  saude_emergencia jsonb not null default '{}', -- alergias, medicamentos, condicoes, contato (visível ao professor)
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);

create table public.alunos_sensivel (
  aluno_id uuid primary key references public.alunos(id) on delete cascade,
  cpf text, rg text, nis text, cpf_responsavel text,
  social jsonb not null default '{}',
  financeiro jsonb not null default '{}',
  saude jsonb not null default '{}',
  atualizado_em timestamptz
);

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete restrict,
  aluno_id uuid not null references public.alunos(id) on delete restrict,
  entrada date not null default current_date,
  saida date, motivo_saida text, obs_saida text,
  status text not null default 'ativo' check (status in ('ativo','saiu')),
  criado_em timestamptz not null default now()
);
create unique index matricula_ativa_unica on public.matriculas(turma_id, aluno_id) where status = 'ativo';

create or replace function public.aluno_do_professor(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matriculas m join public.turmas t on t.id = m.turma_id
                 where m.aluno_id = a and t.professor_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Aulas, presença e fotos
-- ---------------------------------------------------------------------
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete restrict,
  professor_id uuid references public.perfis(id),
  data date not null, inicio time, fim time,
  horas numeric(5,2) generated always as (extract(epoch from (fim - inicio)) / 3600) stored,
  status text not null default 'planejada' check (status in ('planejada','realizada','cancelada')),
  plano jsonb not null default '{}',
  relatorio jsonb not null default '{}',
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);

create table public.presencas (
  aula_id uuid not null references public.aulas(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete restrict,
  valor char(1) not null check (valor in ('P','F','J')),
  primary key (aula_id, aluno_id)
);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid references public.aulas(id) on delete cascade,
  evento_id uuid,
  storage_path text not null,   -- bucket privado 'fotos'
  legenda text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Eventos, ocorrências, configuração e auditoria
-- ---------------------------------------------------------------------
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('evento','apresentacao','campeonato','masterclass','participacao','acao')),
  titulo text not null, data date not null, horario time, local text,
  projeto_id uuid references public.projetos(id),
  descricao text, publico int, resultado text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);
alter table public.fotos add constraint fotos_evento_fk foreign key (evento_id) references public.eventos(id) on delete cascade;

create table public.evento_alunos (
  evento_id uuid references public.eventos(id) on delete cascade,
  aluno_id uuid references public.alunos(id) on delete restrict,
  primary key (evento_id, aluno_id)
);

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete restrict,
  tipo text not null check (tipo in ('advertencia','ocorrencia','elogio','atendimento')),
  data date not null, titulo text not null, descricao text,
  registrado_por uuid default auth.uid() references public.perfis(id),
  criado_em timestamptz not null default now()
);

create table public.config (
  chave text primary key,
  valor jsonb not null
);
insert into public.config values ('assiduidade', '{"alerta":2,"desligamento":3,"periodo":"mes"}');

create table public.auditoria (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  usuario_id uuid default auth.uid(),
  acao text not null, entidade text not null, entidade_id text, resumo text, dados jsonb
);

-- Gatilho de auditoria genérico (registra INSERT/UPDATE/DELETE)
create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria(acao, entidade, entidade_id, resumo)
  values (lower(tg_op), tg_table_name, coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, ''), null);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['projetos','turmas','alunos','matriculas','aulas','eventos','ocorrencias'] loop
    execute format('create trigger auditar_%1$s after insert or update or delete on public.%1$s for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS — habilita em TODAS as tabelas (bloqueio por padrão)
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.projetos enable row level security;
alter table public.turmas enable row level security;
alter table public.alunos enable row level security;
alter table public.alunos_sensivel enable row level security;
alter table public.matriculas enable row level security;
alter table public.aulas enable row level security;
alter table public.presencas enable row level security;
alter table public.fotos enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_alunos enable row level security;
alter table public.ocorrencias enable row level security;
alter table public.config enable row level security;
alter table public.auditoria enable row level security;

-- Perfis
create policy perfis_ler on public.perfis for select using (auth.uid() is not null and public.meu_papel() is not null);
create policy perfis_admin on public.perfis for all using (public.tem_papel('admin')) with check (public.tem_papel('admin'));

-- Projetos / turmas / eventos: todos os usuários ativos leem; gestão edita
create policy projetos_ler on public.projetos for select using (public.meu_papel() is not null);
create policy projetos_gerir on public.projetos for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));

create policy turmas_ler on public.turmas for select using (public.tem_papel('admin','coordenacao','secretaria') or professor_id = auth.uid());
create policy turmas_gerir on public.turmas for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));

create policy eventos_ler on public.eventos for select using (public.meu_papel() is not null);
create policy eventos_gerir on public.eventos for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy evento_alunos_ler on public.evento_alunos for select using (public.tem_papel('admin','coordenacao','secretaria') or public.aluno_do_professor(aluno_id));
create policy evento_alunos_gerir on public.evento_alunos for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));

-- Alunos: gestão/secretaria veem todos; professor só alunos das próprias turmas
create policy alunos_ler on public.alunos for select using (public.tem_papel('admin','coordenacao','secretaria') or public.aluno_do_professor(id));
create policy alunos_gerir on public.alunos for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

-- Dados sensíveis: NUNCA para professor
create policy sensivel_gerir on public.alunos_sensivel for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

-- Matrículas em turma
create policy matriculas_ler on public.matriculas for select using (public.tem_papel('admin','coordenacao','secretaria') or public.professor_da_turma(turma_id));
create policy matriculas_gerir on public.matriculas for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

-- Aulas e presença: professor registra somente nas próprias turmas
create policy aulas_ler on public.aulas for select using (public.tem_papel('admin','coordenacao','secretaria') or public.professor_da_turma(turma_id));
create policy aulas_inserir on public.aulas for insert with check (public.tem_papel('admin','coordenacao') or public.professor_da_turma(turma_id));
create policy aulas_editar on public.aulas for update using (public.tem_papel('admin','coordenacao') or public.professor_da_turma(turma_id));
create policy aulas_excluir on public.aulas for delete using (public.tem_papel('admin','coordenacao') and status <> 'realizada');

create policy presencas_ler on public.presencas for select using (exists (select 1 from public.aulas a where a.id = aula_id and (public.tem_papel('admin','coordenacao','secretaria') or public.professor_da_turma(a.turma_id))));
create policy presencas_gravar on public.presencas for all using (exists (select 1 from public.aulas a where a.id = aula_id and (public.tem_papel('admin','coordenacao') or public.professor_da_turma(a.turma_id))))
  with check (exists (select 1 from public.aulas a where a.id = aula_id and (public.tem_papel('admin','coordenacao') or public.professor_da_turma(a.turma_id))));

create policy fotos_ler on public.fotos for select using (
  public.tem_papel('admin','coordenacao','secretaria')
  or exists (select 1 from public.aulas a where a.id = aula_id and public.professor_da_turma(a.turma_id))
  or evento_id is not null);
create policy fotos_gravar on public.fotos for insert with check (
  public.tem_papel('admin','coordenacao')
  or exists (select 1 from public.aulas a where a.id = aula_id and public.professor_da_turma(a.turma_id)));
create policy fotos_excluir on public.fotos for delete using (public.tem_papel('admin','coordenacao') or criado_por = auth.uid());

-- Ocorrências: atendimento social só para gestão/secretaria
create policy ocorrencias_ler on public.ocorrencias for select using (
  public.tem_papel('admin','coordenacao','secretaria') or (tipo <> 'atendimento' and public.aluno_do_professor(aluno_id)));
create policy ocorrencias_inserir on public.ocorrencias for insert with check (
  public.tem_papel('admin','coordenacao','secretaria') or (tipo <> 'atendimento' and public.aluno_do_professor(aluno_id)));
create policy ocorrencias_excluir on public.ocorrencias for delete using (public.tem_papel('admin','coordenacao','secretaria'));

-- Configuração e auditoria
create policy config_ler on public.config for select using (public.meu_papel() is not null);
create policy config_admin on public.config for all using (public.tem_papel('admin')) with check (public.tem_papel('admin'));
create policy auditoria_ler on public.auditoria for select using (public.tem_papel('admin'));
create policy auditoria_inserir on public.auditoria for insert with check (auth.uid() is not null);
-- (sem UPDATE/DELETE na auditoria: registros imutáveis)

-- ---------------------------------------------------------------------
-- Storage: bucket privado para fotos (acesso só por URL assinada temporária)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict do nothing;
create policy fotos_storage_ler on storage.objects for select using (bucket_id = 'fotos' and auth.uid() is not null and public.meu_papel() is not null);
create policy fotos_storage_gravar on storage.objects for insert with check (bucket_id = 'fotos' and public.meu_papel() is not null);
create policy fotos_storage_excluir on storage.objects for delete using (bucket_id = 'fotos' and (public.tem_papel('admin','coordenacao') or owner = auth.uid()));

-- ---------------------------------------------------------------------
-- View de assiduidade mensal (base dos alertas 2/3 faltas)
-- ---------------------------------------------------------------------
create or replace view public.v_faltas_mes with (security_invoker = true) as
select a.turma_id, p.aluno_id, date_trunc('month', a.data)::date as mes,
       count(*) filter (where p.valor = 'P') as presencas,
       count(*) filter (where p.valor = 'F') as faltas,
       count(*) filter (where p.valor = 'J') as justificadas
from public.presencas p join public.aulas a on a.id = p.aula_id
where a.status = 'realizada'
group by 1, 2, 3;

-- =====================================================================
-- PATRIMÔNIO: bens, empréstimos (alunos, colaboradores, terceiros) e histórico
-- =====================================================================
create table public.patrimonio (
  id uuid primary key default gen_random_uuid(),
  tombo text not null unique,
  nome text not null,
  categoria text not null default 'outro',
  quantidade int not null default 1 check (quantidade >= 0),
  marca text, modelo text, numero_serie text,
  estado text not null default 'bom' check (estado in ('novo','bom','regular','ruim','inservivel')),
  situacao text not null default 'ativo' check (situacao in ('ativo','manutencao','baixado')),
  emprestavel boolean not null default false,
  local text,
  projeto_id uuid references public.projetos(id),
  data_aquisicao date, valor_unitario numeric(12,2), nota_fiscal text, fornecedor text,
  observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz
);

create table public.patrimonio_historico (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.patrimonio(id) on delete cascade,
  data date not null default current_date,
  tipo text not null,          -- entrada, manutencao, retorno, avaria, extravio, transferencia, baixa
  descricao text not null,
  usuario_id uuid default auth.uid() references public.perfis(id),
  criado_em timestamptz not null default now()
);

create table public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  item_id uuid not null references public.patrimonio(id) on delete restrict,
  quantidade int not null default 1 check (quantidade > 0),
  tipo_tomador text not null check (tipo_tomador in ('aluno','colaborador','terceiro')),
  aluno_id uuid references public.alunos(id) on delete restrict,
  colaborador_id uuid references public.perfis(id),
  terceiro jsonb,                     -- nome, documento, responsavel, telefone, endereco
  finalidade text,
  data_saida date not null default current_date,
  previsao_devolucao date not null,
  estado_saida text,
  termo_assinado boolean not null default false,
  entregue_por uuid default auth.uid() references public.perfis(id),
  status text not null default 'ativo' check (status in ('ativo','devolvido','extraviado')),
  data_devolucao date, estado_devolucao text, obs_devolucao text,
  recebido_por uuid references public.perfis(id),
  criado_em timestamptz not null default now(),
  check ((tipo_tomador = 'aluno' and aluno_id is not null) or (tipo_tomador = 'colaborador' and colaborador_id is not null) or (tipo_tomador = 'terceiro' and terceiro ? 'documento')),
  check (previsao_devolucao >= data_saida)
);

-- Impede emprestar mais unidades do que as disponíveis (garantido no banco)
create or replace function public.checar_disponibilidade() returns trigger
language plpgsql as $$
declare total int; emprestado int; ok boolean;
begin
  select quantidade, (emprestavel and situacao = 'ativo') into total, ok from public.patrimonio where id = new.item_id for update;
  if not ok then raise exception 'Bem não liberado para empréstimo'; end if;
  select coalesce(sum(quantidade), 0) into emprestado from public.emprestimos
   where item_id = new.item_id and status = 'ativo' and id <> new.id;
  if new.status = 'ativo' and emprestado + new.quantidade > total then
    raise exception 'Quantidade indisponível (% de %)', total - emprestado, total;
  end if;
  return new;
end $$;
create trigger emprestimo_disponibilidade before insert or update on public.emprestimos
  for each row execute function public.checar_disponibilidade();

create trigger auditar_patrimonio after insert or update or delete on public.patrimonio for each row execute function public.auditar();
create trigger auditar_emprestimos after insert or update or delete on public.emprestimos for each row execute function public.auditar();

alter table public.patrimonio enable row level security;
alter table public.patrimonio_historico enable row level security;
alter table public.emprestimos enable row level security;

-- Todos os usuários ativos consultam o inventário; valores ficam na view abaixo só para quem pode
create policy pat_ler on public.patrimonio for select using (public.meu_papel() is not null);
create policy pat_gerir on public.patrimonio for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy pat_hist_ler on public.patrimonio_historico for select using (public.meu_papel() is not null);
create policy pat_hist_gravar on public.patrimonio_historico for insert with check (public.tem_papel('admin','coordenacao','secretaria'));

create policy emp_ler on public.emprestimos for select using (
  public.tem_papel('admin','coordenacao','secretaria') or (tipo_tomador = 'aluno' and public.aluno_do_professor(aluno_id)));
create policy emp_gravar on public.emprestimos for insert with check (public.tem_papel('admin','coordenacao','secretaria'));
create policy emp_atualizar on public.emprestimos for update using (public.tem_papel('admin','coordenacao','secretaria'));
-- (sem DELETE: empréstimo é documento de controle)

-- Professores consultam o inventário sem valores/nota fiscal
create or replace view public.v_patrimonio_publico with (security_invoker = true) as
select id, tombo, nome, categoria, quantidade, marca, modelo, estado, situacao, emprestavel, local, projeto_id
from public.patrimonio;
