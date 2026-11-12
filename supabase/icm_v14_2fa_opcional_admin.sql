-- =====================================================================
-- ICM SISTEMA — Atualização 14: verificação em duas etapas opcional também para a direção
-- (rodar UMA vez no SQL Editor, depois da v13; pode rodar de novo sem problema)
--
-- Antes: administrador era SEMPRE obrigado a usar duas etapas.
-- Agora: vale só a chave "2 etapas" de cada pessoa (Usuários e acessos → coluna 2 etapas).
-- Para não mudar nada de surpresa, os administradores atuais ficam com a chave LIGADA;
-- desligue na tela se quiser.
-- =====================================================================

update public.perfis set exige_2fa = true where papel = 'admin' and not exige_2fa;
update public.convites set exige_2fa = true where papel = 'admin' and not exige_2fa;

-- Quem tem "2 etapas" ligado só "tem papel" depois de digitar o código (sessão aal2)
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis
  where id = auth.uid() and ativo
    and (not exige_2fa or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2')
$$;

notify pgrst, 'reload schema';
