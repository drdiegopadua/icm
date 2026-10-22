-- =====================================================================
-- ICM SISTEMA — Módulos de comunidade (rodar DEPOIS de schema.sql)
-- Lista de espera, reuniões de pais, voluntários, certificados, doadores,
-- associados, pesquisas de satisfação e agenda de espaços/insumos
-- =====================================================================

alter table public.alunos_sensivel add column if not exists cadunico boolean;

-- ---------------- Lista de espera ----------------
create table public.espera (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  nome text not null, nascimento date,
  responsavel jsonb not null default '{}', bairro text, escola text, rede text,
  interesses uuid[] not null default '{}',
  renda_familiar numeric(12,2), pessoas_casa int, cadunico boolean, beneficio boolean,
  vulnerabilidades text[] not null default '{}', encaminhamento text,
  data_inscricao date not null default current_date,
  status text not null default 'aguardando' check (status in ('aguardando','convocado','matriculado','desistiu')),
  convocado_em date, matriculado_em date, aluno_id uuid references public.alunos(id), obs text,
  criado_em timestamptz not null default now()
);

-- ---------------- Reuniões de pais ----------------
create table public.reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, data date not null, horario time, local text,
  projeto_id uuid references public.projetos(id), turma_id uuid references public.turmas(id),
  pauta text, ata text, encaminhamentos text,
  criado_em timestamptz not null default now()
);
create table public.reuniao_presencas (
  reuniao_id uuid references public.reunioes(id) on delete cascade,
  aluno_id uuid references public.alunos(id) on delete restrict,
  presente boolean not null default false,
  primary key (reuniao_id, aluno_id)
);

-- ---------------- Voluntários (Lei 9.608/98) ----------------
create table public.voluntarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null, cpf text, nascimento date, telefone text, email text, endereco text,
  profissao text, area text, disponibilidade text, inicio date, fim date,
  status text not null default 'ativo', termo_assinado boolean not null default false,
  criado_em timestamptz not null default now()
);
create table public.voluntario_horas (
  id uuid primary key default gen_random_uuid(),
  voluntario_id uuid not null references public.voluntarios(id) on delete cascade,
  data date not null, horas numeric(5,2) not null check (horas > 0), atividade text not null,
  projeto_id uuid references public.projetos(id)
);

-- ---------------- Certificados ----------------
create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo text not null, destinatario_tipo text not null, destinatario_id uuid,
  nome text not null, titulo text not null, descricao text, carga_horaria numeric(6,1),
  referencia jsonb, data_emissao date not null default current_date,
  status text not null default 'valido' check (status in ('valido','revogado')),
  motivo_revogacao text, revogado_em date,
  emitido_por uuid default auth.uid() references public.perfis(id),
  criado_em timestamptz not null default now()
);
-- Verificação pública (QR Code): expõe só o mínimo, por função, sem acesso direto à tabela
create or replace function public.verificar_certificado(p_codigo text)
returns table (codigo text, nome text, titulo text, tipo text, carga_horaria numeric, data_emissao date, status text, motivo_revogacao text)
language sql stable security definer set search_path = public as $$
  select codigo, nome, titulo, tipo, carga_horaria, data_emissao, status, motivo_revogacao
  from public.certificados where codigo = upper(trim(p_codigo))
$$;
grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- ---------------- Doadores e doações ----------------
create table public.doadores (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('PF','PJ')), nome text not null, documento text,
  categoria text, contato text, email text, telefone text, endereco text,
  aceita_comunicacao boolean not null default false, observacoes text,
  criado_em timestamptz not null default now()
);
create table public.doacoes (
  id uuid primary key default gen_random_uuid(),
  recibo text not null unique,
  doador_id uuid not null references public.doadores(id) on delete restrict,
  data date not null, tipo text not null check (tipo in ('dinheiro','bens','servicos')),
  valor numeric(14,2) not null check (valor > 0), forma text,
  projeto_id uuid references public.projetos(id), descricao text,
  criado_em timestamptz not null default now()
);

-- ---------------- Associados e mensalidades ----------------
create table public.associados (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  aluno_id uuid references public.alunos(id),
  titular text not null, cpf text, telefone text, email text,
  data_adesao date not null default current_date,
  valor_mensal numeric(10,2) not null default 0,
  dia_vencimento smallint not null default 10 check (dia_vencimento between 1 and 28),
  status text not null default 'ativo' check (status in ('ativo','suspenso','desligado')),
  observacoes text, criado_em timestamptz not null default now()
);
create unique index associado_aluno_ativo on public.associados(aluno_id) where status <> 'desligado';
create table public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  associado_id uuid not null references public.associados(id) on delete restrict,
  competencia char(7) not null, vencimento date not null, valor numeric(10,2) not null,
  status text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  pago_em date, forma text, recibo text, recebido_por uuid references public.perfis(id), obs text,
  unique (associado_id, competencia)
);

-- ---------------- Pesquisas de satisfação (anônimas) ----------------
create table public.pesquisas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, publico text not null, inicio date not null, fim date not null,
  perguntas jsonb not null, status text not null default 'aberta', anonima boolean not null default true,
  criado_em timestamptz not null default now()
);
create table public.pesquisa_respostas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  data date not null default current_date,
  valores jsonb not null          -- nenhuma coluna identifica quem respondeu
);

-- ---------------- Agenda de espaços e insumos ----------------
create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null, tipo text not null check (tipo in ('espaco','insumo')),
  capacidade int, cor text, patrimonio_id uuid references public.patrimonio(id),
  ativo boolean not null default true, descricao text
);
alter table public.turmas add column if not exists espaco_id uuid references public.recursos(id);
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos(id) on delete cascade,
  data date not null, inicio time not null, fim time not null check (fim > inicio),
  titulo text not null, responsavel_id uuid default auth.uid() references public.perfis(id), obs text,
  criado_em timestamptz not null default now()
);
-- Duas reservas do mesmo recurso não podem se sobrepor (garantido pelo banco)
create extension if not exists btree_gist;
alter table public.reservas add constraint reservas_sem_choque
  exclude using gist (recurso_id with =, tsrange(data + inicio, data + fim) with &&);

-- ---------------- RLS + auditoria ----------------
do $$ declare t text; begin
  foreach t in array array['espera','reunioes','voluntarios','certificados','doadores','doacoes','associados','mensalidades','pesquisas','reservas'] loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create trigger auditar_%1$s after insert or update or delete on public.%1$s for each row execute function public.auditar()', t);
  end loop;
end $$;
alter table public.reuniao_presencas enable row level security;
alter table public.voluntario_horas enable row level security;
alter table public.pesquisa_respostas enable row level security;
alter table public.recursos enable row level security;

create policy espera_gerir on public.espera for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

create policy reunioes_ler on public.reunioes for select using (public.meu_papel() is not null);
create policy reunioes_gerir on public.reunioes for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));
create policy reu_pres_ler on public.reuniao_presencas for select using (public.tem_papel('admin','coordenacao','secretaria') or public.aluno_do_professor(aluno_id));
create policy reu_pres_gerir on public.reuniao_presencas for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

create policy vol_ler on public.voluntarios for select using (public.meu_papel() is not null);
create policy vol_gerir on public.voluntarios for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy volh_ler on public.voluntario_horas for select using (public.meu_papel() is not null);
create policy volh_gerir on public.voluntario_horas for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));

create policy cert_ler on public.certificados for select using (public.meu_papel() is not null);
create policy cert_emitir on public.certificados for insert with check (public.tem_papel('admin','coordenacao','secretaria'));
create policy cert_revogar on public.certificados for update using (public.tem_papel('admin','coordenacao','secretaria'));

create policy doadores_gerir on public.doadores for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy doacoes_gerir on public.doacoes for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));

create policy assoc_gerir on public.associados for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));
create policy mens_gerir on public.mensalidades for all using (public.tem_papel('admin','coordenacao','secretaria')) with check (public.tem_papel('admin','coordenacao','secretaria'));

create policy pesq_ler on public.pesquisas for select using (public.meu_papel() is not null);
create policy pesq_gerir on public.pesquisas for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy pesqr_ler on public.pesquisa_respostas for select using (public.meu_papel() is not null);
-- Resposta anônima por link público, só em pesquisa aberta e dentro do período
create policy pesqr_responder on public.pesquisa_respostas for insert to anon, authenticated
  with check (exists (select 1 from public.pesquisas p where p.id = pesquisa_id and p.status = 'aberta' and current_date between p.inicio and p.fim));

create policy rec_ler on public.recursos for select using (public.meu_papel() is not null);
create policy rec_gerir on public.recursos for all using (public.tem_papel('admin','coordenacao')) with check (public.tem_papel('admin','coordenacao'));
create policy res_ler on public.reservas for select using (public.meu_papel() is not null);
create policy res_criar on public.reservas for insert with check (public.meu_papel() is not null);
create policy res_cancelar on public.reservas for delete using (public.tem_papel('admin','coordenacao') or responsavel_id = auth.uid());
