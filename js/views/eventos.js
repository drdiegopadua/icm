/* Eventos: cadastro e inclusão de alunos matriculados */
(function () {
  const { esc, icon, $, $$ } = UI;
  window.Views = window.Views || {};

  function formEvento(e, aoSalvar) {
    e = e || { nome: '', tipo: 'Apresentação', data: '', hora: '', local: '', cidade: 'Afonso Cláudio', projeto_id: '', descricao: '', saida: '', retorno: '', transporte: '', participantes: [] };
    const m = UI.modal({
      titulo: e.id ? 'Editar evento' : 'Novo evento',
      tamanho: 'largo',
      corpo: `<form class="form" id="f-ev">
        <div class="campo c4"><label>Nome do evento *</label><input name="nome" value="${esc(e.nome)}" required></div>
        <div class="campo c2"><label>Tipo</label><select name="tipo">${UI.sel(['Apresentação', 'Competição', 'Recital', 'Festival', 'Oficina', 'Passeio cultural', 'Reunião de pais', 'Outro'], e.tipo)}</select></div>
        <div class="campo c2"><label>Data *</label><input type="date" name="data" value="${esc(e.data)}" required></div>
        <div class="campo c1"><label>Horário</label><input type="time" name="hora" value="${esc(e.hora)}"></div>
        <div class="campo c3"><label>Projeto</label><select name="projeto_id">${UI.sel(Store.todos('projetos').map((p) => [p.id, p.nome]), e.projeto_id, 'Institucional (todos)')}</select></div>
        <div class="campo c3"><label>Local</label><input name="local" value="${esc(e.local)}"></div>
        <div class="campo c3"><label>Cidade</label><input name="cidade" value="${esc(e.cidade)}"></div>
        <div class="secao-form">Deslocamento</div>
        <div class="campo c2"><label>Saída</label><input type="time" name="saida" value="${esc(e.saida)}"></div>
        <div class="campo c2"><label>Retorno previsto</label><input type="time" name="retorno" value="${esc(e.retorno)}"></div>
        <div class="campo c2"><label>Transporte</label><input name="transporte" value="${esc(e.transporte)}" placeholder="Van do Instituto"></div>
        <div class="campo c6"><label>Descrição</label><textarea name="descricao">${esc(e.descricao)}</textarea></div>
      </form>`,
      rodape: `${e.id ? `<button class="btn perigo" data-excluir style="margin-right:auto">${icon('lixo')}Excluir</button>` : ''}<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const d = UI.lerForm(m.el.querySelector('#f-ev'));
      if (!d.nome || !d.data) { UI.toast('Informe nome e data'); return; }
      const salvo = Store.salvar('eventos', { ...e, ...d });
      m.fechar(); UI.toast('Evento salvo'); aoSalvar(salvo);
    };
    const ex = m.el.querySelector('[data-excluir]');
    if (ex) ex.onclick = async () => { if (await UI.confirmar('Excluir este evento?', { ok: 'Excluir', perigo: true })) { Store.remover('eventos', e.id); m.fechar(); location.hash = '#/eventos'; } };
  }

  Views.eventos = function (el) {
    const hoje = UI.hojeISO();
    const todos = Store.todos('eventos').slice().sort((a, b) => a.data.localeCompare(b.data));
    const prox = todos.filter((e) => e.data >= hoje), pass = todos.filter((e) => e.data < hoje).reverse();
    const cartao = (e) => {
      const p = D.projeto(e.projeto_id);
      return `<a class="cartao painel" href="#/eventos/${e.id}" style="--cor:${p?.cor || 'var(--pessego)'}">
        <span class="faixa"></span>
        <div class="linha-flex"><span class="data-bloco"><b>${e.data.slice(8, 10)}</b><small>${UI.MESES_C[+e.data.slice(5, 7) - 1]}</small></span>
          <div style="flex:1;min-width:0"><h3>${esc(e.nome)}</h3><div class="pequeno muted">${esc(e.tipo)} · ${esc(p?.nome || 'Institucional')}</div></div></div>
        <div class="rodape"><span>${icon('pin')}${esc(e.local)} – ${esc(e.cidade)}</span><span>${icon('alunos')}${(e.participantes || []).length} alunos</span>${e.hora ? `<span>${icon('relogio')}${esc(e.hora)}</span>` : ''}</div>
      </a>`;
    };
    el.innerHTML = `
      <div class="cabecalho"><div class="titulos"><h1>Eventos</h1><p class="sub">${prox.length} próximos · ${pass.length} realizados</p></div>
        <button class="btn quente" id="bt-novo">${icon('mais')}Novo evento</button></div>
      <h2 style="font-size:18px;margin-bottom:12px">Próximos</h2>
      <div class="grade g3">${prox.map(cartao).join('') || `<div class="painel">${UI.vazio('Nenhum evento agendado', 'eventos')}</div>`}</div>
      <h2 style="font-size:18px;margin:26px 0 12px">Realizados</h2>
      <div class="grade g3">${pass.map(cartao).join('') || `<div class="painel">${UI.vazio('Nenhum evento realizado')}</div>`}</div>`;
    $('#bt-novo').onclick = () => formEvento(null, (e) => (location.hash = `#/eventos/${e.id}`));
  };

  Views.evento = function (el, id) {
    const e = Store.obter('eventos', id);
    if (!e) { el.innerHTML = `<div class="painel">${UI.vazio('Evento não encontrado')}</div>`; return; }
    const p = D.projeto(e.projeto_id);
    const parts = (e.participantes || []).map((x) => D.aluno(x)).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome));
    const van = parts.filter((a) => a.van?.usa).length;
    const semAut = parts.filter((a) => !a.autorizacoes?.saida);
    const fora = UI.normaliza(e.cidade) !== UI.normaliza('Afonso Cláudio');
    const recarregar = () => App.irPara(`#/eventos/${id}`, true);

    el.innerHTML = `
      <div class="migalhas"><a href="#/eventos">Eventos</a>›<span>${esc(e.nome)}</span></div>
      <div class="cabecalho">
        <div class="titulos"><div class="linha-flex" style="margin-bottom:4px"><span class="chip">${esc(e.tipo)}</span>${p ? `<span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.nome)}</span>` : ''}</div>
          <h1>${esc(e.nome)}</h1><p class="sub">${UI.data(e.data)}${e.hora ? ' às ' + esc(e.hora) : ''} · ${esc(e.local)} – ${esc(e.cidade)}</p></div>
        <button class="btn sec" id="bt-editar">${icon('lapis')}Editar</button>
        <button class="btn sec" id="bt-lista">${icon('imprimir')}Lista de participantes</button>
      </div>
      <div class="grade g-lado">
        <section class="painel">
          <div class="painel-cab"><h2>Alunos participantes</h2><span class="chip">${parts.length}</span><button class="btn p" id="bt-add">${icon('mais')}Incluir alunos</button></div>
          ${fora && semAut.length ? `<div class="registro" style="border-color:rgba(245,196,81,.5);margin-bottom:12px"><span style="color:var(--amarelo)">${icon('alerta', 'width="18"')}</span> ${semAut.length} aluno(s) sem autorização de viagem no cadastro: ${semAut.map((a) => esc(a.nome.split(' ')[0])).join(', ')}.</div>` : ''}
          ${parts.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Aluno</th><th class="some-movel">Turma</th><th class="some-movel">Responsável</th><th class="centro">Van</th><th></th></tr></thead><tbody>
            ${parts.map((a) => `<tr><td><a class="pessoa" href="#/alunos/${a.id}" style="text-decoration:none">${UI.avatar(a.nome, 'p')}<div><div class="nome">${esc(a.nome)}</div><div class="det">${UI.idade(a.nascimento)} anos${a.saude?.alergias ? ` · <span style="color:var(--amarelo)">alergia: ${esc(a.saude.alergias)}</span>` : ''}</div></div></a></td>
              <td class="some-movel">${a.turmas.map((x) => esc(D.turma(x)?.nome)).join(', ')}</td>
              <td class="some-movel">${esc(a.responsavel?.nome || '')}<div class="pequeno muted">${esc(a.responsavel?.telefone || '')}</div></td>
              <td class="centro">${a.van?.usa ? `<span style="color:var(--laranja)">${icon('van', 'width="20"')}</span>` : '—'}</td>
              <td class="acoes-td"><button class="btn sec p so-icone" data-tirar="${a.id}" aria-label="Retirar">${icon('fechar')}</button></td></tr>`).join('')}
          </tbody></table></div>` : UI.vazio('Nenhum aluno incluído ainda', 'alunos')}
        </section>
        <div>
          <section class="painel"><div class="painel-cab"><h2>Detalhes</h2></div><dl class="dl" style="grid-template-columns:110px 1fr">
            <dt>Data</dt><dd>${UI.data(e.data)} (${UI.diaSemana(e.data)})</dd>
            <dt>Horário</dt><dd>${esc(e.hora || '—')}</dd>
            <dt>Local</dt><dd>${esc(e.local)}<br>${esc(e.cidade)}</dd>
            <dt>Saída</dt><dd>${esc(e.saida || '—')}</dd>
            <dt>Retorno</dt><dd>${esc(e.retorno || '—')}</dd>
            <dt>Transporte</dt><dd>${esc(e.transporte || '—')}</dd>
          </dl>${e.descricao ? `<p class="muted mt">${esc(e.descricao)}</p>` : ''}</section>
          <section class="painel"><div class="painel-cab"><h2>Resumo</h2></div>
            <div class="ficha-numeros"><div><b>${parts.length}</b><small>alunos</small></div><div><b>${van}</b><small>usam van</small></div><div><b>${parts.filter((a) => a.saude?.alergias || a.saude?.medicamentos).length}</b><small>c/ cuidados de saúde</small></div></div>
          </section>
        </div>
      </div>`;

    $('#bt-editar').onclick = () => formEvento(e, recarregar);
    $('#bt-lista').onclick = () => Doc.listaEvento(id);
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-tirar]');
      if (!b) return;
      Store.salvar('eventos', { id, participantes: e.participantes.filter((x) => x !== b.dataset.tirar) });
      recarregar();
    };
    $('#bt-add').onclick = () => {
      const turmas = Store.todos('turmas');
      const ativos = Store.filtrar('alunos', (a) => a.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));
      const marcados = new Set(e.participantes || []);
      const m = UI.modal({
        titulo: 'Incluir alunos matriculados',
        tamanho: 'largo',
        corpo: `<div class="filtros"><input class="entrada busca" id="inc-q" placeholder="Buscar aluno"><select class="entrada" id="inc-t">${UI.sel(turmas.map((t) => [t.id, t.nome]), e.projeto_id ? '' : '', 'Todas as turmas')}</select><button class="btn sec p" id="inc-todos">Marcar todos visíveis</button></div>
          <div class="lista" id="inc-lista" style="max-height:52vh;overflow:auto">${ativos.map((a) => `<label class="item clica" data-id="${a.id}" data-nome="${esc(UI.normaliza(a.nome))}" data-turmas="${a.turmas.join(' ')}">
            <input type="checkbox" value="${a.id}" ${marcados.has(a.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--azul)">${UI.avatar(a.nome, 'p')}
            <div class="corpo"><div class="t">${esc(a.nome)}</div><div class="d">${UI.idade(a.nascimento)} anos · ${a.turmas.map((x) => esc(D.turma(x)?.nome)).join(', ')}</div></div>
            ${!a.autorizacoes?.saida ? '<span class="chip alerta">sem autorização de viagem</span>' : ''}</label>`).join('')}</div>
          <p class="pequeno muted mt-p" id="inc-cont"></p>`,
        rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-ok>${icon('check')}Salvar participantes</button>`,
      });
      const filtrar = () => {
        const q = UI.normaliza($('#inc-q', m.el).value), t = $('#inc-t', m.el).value;
        $$('[data-id]', m.el).forEach((l) => (l.style.display = l.dataset.nome.includes(q) && (!t || l.dataset.turmas.split(' ').includes(t)) ? '' : 'none'));
      };
      const contar = () => ($('#inc-cont', m.el).textContent = `${$$('input:checked', m.el).length} selecionado(s)`);
      if (p) {
        // sugere a primeira turma do projeto do evento
        const t1 = D.turmasDoProjeto(p.id)[0];
        if (t1) $('#inc-t', m.el).value = t1.id;
      }
      filtrar(); contar();
      $('#inc-q', m.el).oninput = filtrar;
      $('#inc-t', m.el).onchange = filtrar;
      $('#inc-lista', m.el).onchange = contar;
      $('#inc-todos', m.el).onclick = () => { $$('[data-id]', m.el).filter((l) => l.style.display !== 'none').forEach((l) => (l.querySelector('input').checked = true)); contar(); };
      m.el.querySelector('[data-ok]').onclick = () => {
        const ids = $$('input[type=checkbox]:checked', m.el).map((c) => c.value);
        Store.salvar('eventos', { id, participantes: ids });
        m.fechar(); UI.toast(`${ids.length} participante(s) no evento`); recarregar();
      };
    };
  };

  window.Eventos = { formEvento };
})();
