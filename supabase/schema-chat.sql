-- =====================================================================
-- ICM Sistema — Chat interno da equipe
-- Rodar DEPOIS de schema.sql (usa perfis, meu_papel() e tem_papel()).
-- Só usuários ativos do sistema (professores e colaboradores) participam.
-- O Portal da Família não tem nenhuma política de acesso a estas tabelas.
-- =====================================================================

create table public.chat_canais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('grupo', 'direto')),
  nome text,                         -- vazio em conversa direta
  descricao text,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);

create table public.chat_membros (
  canal_id uuid not null references public.chat_canais(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  lido_ate timestamptz,              -- última mensagem lida (contador de não lidas)
  primary key (canal_id, perfil_id)
);

create table public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.chat_canais(id) on delete cascade,
  autor_id uuid not null references public.perfis(id),
  texto text not null check (char_length(texto) between 1 and 4000),
  em timestamptz not null default now()
);
create index chat_mensagens_canal_em on public.chat_mensagens (canal_id, em);

-- Participa do canal? (security definer evita recursão de RLS)
create or replace function public.membro_do_canal(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_membros m join public.perfis p on p.id = m.perfil_id
                 where m.canal_id = c and m.perfil_id = auth.uid() and p.ativo)
$$;

alter table public.chat_canais enable row level security;
alter table public.chat_membros enable row level security;
alter table public.chat_mensagens enable row level security;

-- Canais: vê quem participa; grupos são criados/editados pela coordenação;
-- conversa direta pode ser aberta por qualquer usuário ativo
create policy chat_canais_ler on public.chat_canais for select using (public.membro_do_canal(id));
create policy chat_canais_criar on public.chat_canais for insert with check (
  public.meu_papel() is not null and criado_por = auth.uid()
  and (tipo = 'direto' or public.tem_papel('admin', 'coordenacao')));
create policy chat_canais_editar on public.chat_canais for update using (tipo = 'grupo' and public.tem_papel('admin', 'coordenacao'));

-- Membros: cada um vê os participantes dos seus canais e atualiza só o próprio "lido até"
create policy chat_membros_ler on public.chat_membros for select using (public.membro_do_canal(canal_id));
create policy chat_membros_gerir on public.chat_membros for all
  using (public.tem_papel('admin', 'coordenacao'))
  with check (public.tem_papel('admin', 'coordenacao'));
create policy chat_membros_direto on public.chat_membros for insert with check (
  exists (select 1 from public.chat_canais c where c.id = canal_id and c.tipo = 'direto' and c.criado_por = auth.uid()));
create policy chat_membros_lido on public.chat_membros for update
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- Mensagens: lê e escreve só quem participa; ninguém edita mensagem de outra pessoa
create policy chat_msg_ler on public.chat_mensagens for select using (public.membro_do_canal(canal_id));
create policy chat_msg_enviar on public.chat_mensagens for insert with check (autor_id = auth.uid() and public.membro_do_canal(canal_id));
create policy chat_msg_apagar on public.chat_mensagens for delete using (autor_id = auth.uid());

-- Mensagens em tempo real (Supabase Realtime respeita as políticas acima)
alter publication supabase_realtime add table public.chat_mensagens;
