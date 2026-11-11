-- =====================================================================
-- ICM SISTEMA — Atualização 11: assinatura digital do Termo de Adesão ao Serviço Voluntário
-- (rodar UMA vez no SQL Editor; pode rodar de novo sem problema)
--   O pedido de assinatura pode ser de um aluno (como antes) ou de um voluntário
--   (campo voluntario_id). Ao assinar, a ficha do voluntário fica com "termo assinado".
--   Para alunos nada muda.
-- =====================================================================

create or replace function public.assinatura_por_token(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s registros; a registros; ap registros; e registros; it registros; v registros;
begin
  select * into s from registros where colecao = 'assinaturas' and dados->>'token' = p_token;
  if not found then return null; end if;
  -- Termo do voluntário: devolve só os dados que aparecem no próprio termo
  if coalesce(s.dados->>'voluntario_id', '') <> '' then
    select * into v from registros where colecao = 'voluntarios' and id = s.dados->>'voluntario_id';
    return jsonb_build_object('assinatura', s.dados || jsonb_build_object('id', s.id),
      'voluntario', jsonb_build_object('id', v.id, 'nome', v.dados->>'nome', 'cpf', v.dados->>'cpf', 'nascimento', v.dados->>'nascimento',
        'telefone', v.dados->>'telefone', 'email', v.dados->>'email', 'profissao', v.dados->>'profissao', 'area', v.dados->>'area',
        'disponibilidade', v.dados->>'disponibilidade', 'inicio', v.dados->>'inicio', 'fim', v.dados->>'fim'));
  end if;
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
    if tipo = 'voluntariado' then
      update registros set dados = dados || jsonb_build_object('termo_assinado', true, 'termo_assinado_em', current_date, 'termo_assinatura_id', s.id)
        where colecao = 'voluntarios' and id = s.dados->>'voluntario_id';
    else
      select coalesce(dados->'autorizacoes', '{}') into aut from registros where colecao = 'alunos' and id = s.dados->>'aluno_id';
      if tipo = 'lgpd' then aut := aut || jsonb_build_object('lgpd', true, 'data_termo', current_date); end if;
      if tipo = 'imagem' then aut := aut || jsonb_build_object('imagem', true); end if;
      if tipo = 'matricula' then aut := aut || jsonb_build_object('matricula_assinada', current_date); end if;
      update registros set dados = jsonb_set(dados, '{autorizacoes}', aut) where colecao = 'alunos' and id = s.dados->>'aluno_id';
      if tipo = 'emprestimo' then update registros set dados = dados || '{"termo_assinado": true}' where colecao = 'emprestimos' and id = s.dados->>'referencia_id'; end if;
    end if;
  else
    update registros set dados = dados || jsonb_build_object('status', 'recusado', 'recusado_em', now(), 'motivo_recusa', left(coalesce(p->>'motivo',''), 300)) where colecao = 'assinaturas' and id = s.id;
    if tipo = 'imagem' then update registros set dados = jsonb_set(dados, '{autorizacoes,imagem}', 'false') where colecao = 'alunos' and id = s.dados->>'aluno_id'; end if;
  end if;
  insert into auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, resumo)
    values (case when tipo = 'voluntariado' then 'voluntario' else 'familia' end, coalesce(p->>'signatario_nome', 'Responsável'), coalesce(p->>'status', 'recusado'), 'assinaturas', s.id, tipo);
  return true;
end $$;

grant execute on function public.assinatura_por_token(text), public.responder_assinatura(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
