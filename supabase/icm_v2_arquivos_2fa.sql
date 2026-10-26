-- =====================================================================
-- ICM SISTEMA — Atualização 2 (rodar UMA vez no SQL Editor, depois do icm_banco.sql)
--   1) Fotos e anexos em pasta PRIVADA do Storage (bucket "arquivos"):
--      o arquivo só abre por link temporário, e só para quem pode ver o registro dono.
--   2) Verificação em duas etapas (código no celular) OBRIGATÓRIA para a direção
--      (papel admin) e para quem tiver "exige_2fa" marcado. Sem o código, o banco
--      trata a pessoa como sem acesso — não adianta burlar a tela.
-- Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- 2 etapas ----------
alter table public.perfis   add column if not exists exige_2fa boolean not null default false;
alter table public.convites add column if not exists exige_2fa boolean not null default false;

-- Quem precisa de 2 etapas só "tem papel" depois de digitar o código (sessão aal2)
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis
  where id = auth.uid() and ativo
    and (not (papel = 'admin' or exige_2fa) or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2')
$$;

create or replace function public.criar_perfil_do_convite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(new.email);
  if found then
    insert into perfis (id, nome, email, papel, cargo, telefone, exige_2fa)
    values (new.id, c.nome, lower(new.email), c.papel, c.cargo, c.telefone, c.exige_2fa)
    on conflict (id) do nothing;
    delete from convites where lower(email) = lower(new.email);
    update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(new.id::text))
      where colecao = 'chat_canais' and id = 'chg_geral';
  end if;
  return new;
end $$;

-- ---------- Storage privado ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos', 'arquivos', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','text/xml','application/xml'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Caminho do arquivo = <coleção>/<id do registro>/<nome>. A permissão é a mesma do registro dono.
create or replace function public.pode_arquivo(p_nome text, p_gravar boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from registros r
    where r.colecao = split_part(p_nome, '/', 1) and r.id = split_part(p_nome, '/', 2)
      and pode_ler(r.colecao, r.id, r.dados)
      and (not p_gravar or pode_gravar(r.colecao, r.id, r.dados)))
$$;
revoke all on function public.pode_arquivo(text, boolean) from public;
grant execute on function public.pode_arquivo(text, boolean) to authenticated;

drop policy if exists icm_arq_ler on storage.objects;
create policy icm_arq_ler on storage.objects for select to authenticated
  using (bucket_id = 'arquivos' and public.pode_arquivo(name, false));
drop policy if exists icm_arq_enviar on storage.objects;
create policy icm_arq_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and public.pode_arquivo(name, true));
drop policy if exists icm_arq_trocar on storage.objects;
create policy icm_arq_trocar on storage.objects for update to authenticated
  using (bucket_id = 'arquivos' and public.pode_arquivo(name, true));
drop policy if exists icm_arq_apagar on storage.objects;
create policy icm_arq_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'arquivos' and (public.pode_arquivo(name, true)
    -- registro já apagado: só a direção/coordenação/secretaria limpa os arquivos que sobraram
    or (public.meu_papel() in ('admin','coordenacao','secretaria')
        and not exists (select 1 from public.registros r where r.colecao = split_part(name, '/', 1) and r.id = split_part(name, '/', 2)))));
