/* Equipe: professores e colaboradores */
(function () {
  const { esc, icon, $ } = UI;
  window.Views = window.Views || {};

  const PAPEIS = [['coordenacao', 'Coordenação (acesso total)'], ['professor', 'Professor(a)'], ['secretaria', 'Secretaria'], ['social', 'Serviço social'], ['psicologia', 'Psicologia'], ['transporte', 'Transporte'], ['administrativo', 'Administrativo / financeiro']];

  function formPessoa(p, aoSalvar) {
    p = p || { nome: '', tipo: 'professor', funcao: '', papel: 'professor', telefone: '', email: '', cpf: '', admissao: UI.hojeISO(), vinculo: '', formacao: '', ativo: true };
    const m = UI.modal({
      titulo: p.id ? 'Editar cadastro' : 'Novo professor ou colaborador',
      tamanho: 'largo',
      corpo: `<form class="form" id="f-pes">
        <div class="campo c4"><label>Nome completo *</label><input name="nome" value="${esc(p.nome)}" required></div>
        <div class="campo c2"><label>Tipo</label><select name="tipo">${UI.sel([['professor', 'Professor(a)'], ['colaborador', 'Colaborador(a)']], p.tipo)}</select></div>
        <div class="campo c3"><label>Função / cargo</label><input name="funcao" value="${esc(p.funcao)}" placeholder="Professor de Violino"></div>
        <div class="campo c3"><label>Perfil de acesso no sistema</label><select name="papel">${UI.sel(PAPEIS, p.papel)}</select></div>
        <div class="campo c2"><label>CPF</label><input name="cpf" value="${esc(p.cpf || '')}"></div>
        <div class="campo c2"><label>Telefone</label><input name="telefone" value="${esc(p.telefone)}"></div>
        <div class="campo c2"><label>E-mail</label><input type="email" name="email" value="${esc(p.email)}"></div>
        <div class="campo c2"><label>Admissão</label><input type="date" name="admissao" value="${esc(p.admissao)}"></div>
        <div class="campo c2"><label>Vínculo</label><select name="vinculo">${UI.sel(['CLT', 'MEI', 'Autônomo (RPA)', 'Voluntário', 'Estágio', 'Cedido'], p.vinculo, 'Selecione')}</select></div>
        <div class="campo c2"><label>Situação</label><select name="ativo">${UI.sel([['true', 'Ativo'], ['false', 'Inativo']], String(p.ativo))}</select></div>
        <div class="campo c6"><label>Formação / observações</label><textarea name="formacao">${esc(p.formacao || '')}</textarea></div>
        <div class="campo c6"><label>Documentos (contrato, currículo, certificados)</label><input type="file" name="_docs" multiple></div>
      </form>`,
      rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const f = m.el.querySelector('#f-pes');
      const d = UI.lerForm(f);
      if (!d.nome) { f.nome.focus(); return; }
      d.ativo = d.ativo === 'true';
      d.documentos = [...(p.documentos || []), ...UI.arquivosDe(f.querySelector('[name=_docs]'))];
      const salvo = Store.salvar('equipe', { ...p, ...d });
      // mantém o canal Geral com todos
      const geral = Store.obter('canais', 'c1');
      if (geral && !geral.membros.includes(salvo.id)) Store.salvar('canais', { id: 'c1', membros: [...geral.membros, salvo.id] });
      m.fechar(); UI.toast('Cadastro salvo'); aoSalvar();
    };
  }

  Views.equipe = function (el) {
    let filtro = App.params?.get('tipo') || '';
    const desenhar = () => {
      const todos = Store.todos('equipe').slice().sort((a, b) => a.nome.localeCompare(b.nome));
      const lista = todos.filter((p) => !filtro || p.tipo === filtro);
      el.innerHTML = `
        <div class="cabecalho"><div class="titulos"><h1>Equipe</h1><p class="sub">${todos.filter((p) => p.tipo === 'professor').length} professores · ${todos.filter((p) => p.tipo === 'colaborador').length} colaboradores</p></div>
          <button class="btn quente" id="bt-novo">${icon('mais')}Novo cadastro</button></div>
        <div class="abas mini">${[['', 'Todos'], ['professor', 'Professores'], ['colaborador', 'Colaboradores']].map(([v, r]) => `<button data-f="${v}" class="${v === filtro ? 'ativo' : ''}">${r}</button>`).join('')}</div>
        <div class="grade g3">${lista.map((p) => {
          const ts = Store.filtrar('turmas', (t) => t.professor_id === p.id);
          return `<div class="painel cartao" data-id="${p.id}" style="cursor:pointer">
            <div class="pessoa">${UI.avatar(p.nome)}<div style="min-width:0"><div class="nome">${esc(p.nome)}</div><div class="det">${esc(p.funcao)}</div></div><span class="espaco"></span>${p.ativo ? '' : '<span class="chip">Inativo</span>'}</div>
            <div class="chips"><span class="chip ${p.tipo === 'professor' ? 'info' : ''}">${p.tipo === 'professor' ? 'Professor(a)' : 'Colaborador(a)'}</span><span class="chip">${esc(p.vinculo || '')}</span></div>
            ${ts.length ? `<div class="pequeno muted">${icon('turmas', 'width="14" style="vertical-align:-2px"')} ${ts.map((t) => esc(t.nome)).join(', ')}</div>` : ''}
            <div class="rodape"><span>${icon('telefone')}${esc(p.telefone)}</span><span>${icon('chat')}<a href="#/chat/dm_${p.id}" data-chat>Conversar</a></span></div>
          </div>`;
        }).join('')}</div>`;
      $('#bt-novo').onclick = () => formPessoa(null, desenhar);
      el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filtro = b.dataset.f; desenhar(); }));
      el.querySelectorAll('[data-id]').forEach((c) => (c.onclick = (e) => { if (!e.target.closest('[data-chat]')) formPessoa(Store.obter('equipe', c.dataset.id), desenhar); }));
    };
    desenhar();
  };

  window.Equipe = { formPessoa, PAPEIS };
})();
