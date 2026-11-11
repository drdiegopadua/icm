-- =====================================================================
-- ICM SISTEMA — Atualização 9: login de quem criou a conta antes do convite
-- (rodar UMA vez no SQL Editor do Supabase; pode rodar de novo sem problema)
--
-- Problema: o perfil só era criado no momento em que a pessoa criava a conta (cadastro).
-- Se a conta foi criada ANTES do convite (ou o convite foi refeito depois), o perfil
-- nunca nascia e a pessoa via "Seu acesso ainda não foi liberado".
-- Agora:
--   1) ao cadastrar/refazer um convite de quem JÁ tem conta, o perfil é criado na hora;
--   2) no login, se faltar o perfil e houver convite, o sistema cria (função vincular_convite);
--   3) contas que já estão nessa situação são corrigidas agora, no fim deste arquivo.
-- =====================================================================

-- Cria o perfil a partir do convite (usado pelos três caminhos)
create or replace function public.perfil_de_convite(p_uid uuid, p_email text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c convites;
begin
  select * into c from convites where lower(email) = lower(p_email);
  if not found then return exists (select 1 from perfis where id = p_uid); end if;
  insert into perfis (id, nome, email, papel, cargo, telefone, exige_2fa, da_aulas, opera_van)
  values (p_uid, c.nome, lower(p_email), c.papel, c.cargo, c.telefone, coalesce(c.exige_2fa, false), coalesce(c.da_aulas, false), coalesce(c.opera_van, false))
  on conflict (id) do update set nome = excluded.nome, papel = excluded.papel, cargo = excluded.cargo, telefone = excluded.telefone,
    exige_2fa = excluded.exige_2fa, da_aulas = excluded.da_aulas, opera_van = excluded.opera_van, ativo = true;
  delete from convites where lower(email) = lower(p_email);
  update registros set dados = jsonb_set(dados, '{membros}', coalesce(dados->'membros', '[]'::jsonb) || to_jsonb(p_uid::text))
    where colecao = 'chat_canais' and id = 'chg_geral' and not (coalesce(dados->'membros', '[]'::jsonb) ? p_uid::text);
  return true;
end $$;
revoke all on function public.perfil_de_convite(uuid, text) from public, anon, authenticated;

-- 1) Conta nova → perfil (mesmo comportamento de antes, agora pela função comum)
create or replace function public.criar_perfil_do_convite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.perfil_de_convite(new.id, new.email);
  return new;
end $$;

-- 2) Convite novo (ou refeito) para quem já tem conta → perfil na hora
create or replace function public.convite_para_conta_existente() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(new.email) limit 1;
  if uid is not null then perform public.perfil_de_convite(uid, new.email); end if;
  return null;
end $$;
drop trigger if exists ao_criar_convite on public.convites;
create trigger ao_criar_convite after insert or update on public.convites for each row execute function public.convite_para_conta_existente();

-- 3) No login: quem está entrando e ainda não tem perfil, mas tem convite
create or replace function public.vincular_convite() returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if auth.uid() is null then return false; end if;
  select email into em from auth.users where id = auth.uid();
  return public.perfil_de_convite(auth.uid(), em);
end $$;
revoke all on function public.vincular_convite() from public, anon;
grant execute on function public.vincular_convite() to authenticated;

-- Corrige agora quem já criou conta antes do convite
select public.perfil_de_convite(u.id, u.email)
from auth.users u join public.convites c on lower(c.email) = lower(u.email);

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- DIAGNÓSTICO (opcional): troque o e-mail e rode só este bloco para ver a situação de alguém
-- ---------------------------------------------------------------------
-- select 'conta (auth)' as onde, u.email, u.email_confirmed_at is not null as email_confirmado, u.last_sign_in_at as ultimo_login, u.created_at as criado
--   from auth.users u where lower(u.email) = 'socialmontanhas@gmail.com'
-- union all select 'perfil', p.email, p.ativo, null, null from public.perfis p where lower(p.email) = 'socialmontanhas@gmail.com'
-- union all select 'convite pendente', c.email, null, null, c.criado_em from public.convites c where lower(c.email) = 'socialmontanhas@gmail.com';
