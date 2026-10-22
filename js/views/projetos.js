/* Projetos: cadastro, turmas de cada projeto e financeiro (base da prestação de contas) */
(function () {
  const { esc, icon, $, $$ } = UI;
  window.Views = window.Views || {};

  const CATEGORIAS = ['Recursos humanos', 'Material pedagógico', 'Transporte', 'Alimentação', 'Uniformes', 'Divulgação', 'Equipamentos', 'Serviços de terceiros', 'Outros'];

  function formProjeto(p, aoSalvar) {
    p = p || { nome: '', area: 'Música', fonte: '', instrumento: '', financiador: '', inicio: '', fim: '', valor: null, coordenador: 'e1', cor: '#f2a541', descricao: '', metas: '' };
    const m = UI.modal({
      titulo: p.id ? 'Editar projeto' : 'Novo projeto',
      tamanho: 'largo',
      corpo: `<form class="form" id="f-proj">
        <div class="campo c4"><label>Nome do projeto *</label><input name="nome" value="${esc(p.nome)}" required></div>
        <div class="campo c2"><label>Área</label><select name="area">${UI.sel(['Música', 'Esporte', 'Dança', 'Artes visuais', 'Teatro', 'Educação', 'Outra'], p.area)}</select></div>
        <div class="campo c2"><label>Fonte de recurso</label><select name="fonte">${UI.sel(['Termo de Fomento', 'Termo de Colaboração', 'Lei de Incentivo ao Esporte', 'Lei Rouanet', 'Edital', 'Emenda parlamentar', 'Recursos próprios', 'Outra'], p.fonte, 'Selecione')}</select></div>
        <div class="campo c2"><label>Nº do instrumento</label><input name="instrumento" value="${esc(p.instrumento)}" placeholder="TF 000/2026"></div>
        <div class="campo c2"><label>Financiador / concedente</label><input name="financiador" value="${esc(p.financiador)}"></div>
        <div class="campo c2"><label>Início da vigência</label><input type="date" name="inicio" value="${esc(p.inicio)}"></div>
        <div class="campo c2"><label>Fim da vigência</label><input type="date" name="fim" value="${esc(p.fim)}"></div>
        <div class="campo c2"><label>Valor total (R$)</label><input type="number" step="0.01" name="valor" value="${p.valor ?? ''}"></div>
        <div class="campo c4"><label>Coordenador(a)</label><select name="coordenador">${UI.sel(Store.todos('equipe').map((e) => [e.id, e.nome]), p.coordenador)}</select></div>
        <div class="campo c2"><label>Cor de identificação</label><input type="color" name="cor" value="${esc(p.cor)}" style="height:42px;padding:4px"></div>
        <div class="campo c6"><label>Descrição / objeto</label><textarea name="descricao">${esc(p.descricao)}</textarea></div>
        <div class="campo c6"><label>Metas (uma por linha)</label><textarea name="metas">${esc(p.metas)}</textarea></div>
      </form>`,
      rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const f = m.el.querySelector('#f-proj');
      if (!f.nome.value.trim()) { f.nome.focus(); return; }
      const salvo = Store.salvar('projetos', { ...p, ...UI.lerForm(f) });
      m.fechar(); UI.toast('Projeto salvo'); aoSalvar(salvo);
    };
  }

  function formDespesa(projetoId, d, aoSalvar) {
    d = d || { data: UI.hojeISO(), categoria: '', descricao: '', fornecedor: '', documento: '', valor: null };
    const m = UI.modal({
      titulo: d.id ? 'Editar despesa' : 'Lançar despesa',
      corpo: `<form class="form" id="f-desp">
        <div class="campo c2"><label>Data</label><input type="date" name="data" value="${esc(d.data)}" required></div>
        <div class="campo c4"><label>Categoria (rubrica)</label><select name="categoria" required>${UI.sel(CATEGORIAS, d.categoria, 'Selecione')}</select></div>
        <div class="campo c6"><label>Descrição</label><input name="descricao" value="${esc(d.descricao)}" required></div>
        <div class="campo c3"><label>Fornecedor / favorecido</label><input name="fornecedor" value="${esc(d.fornecedor)}"></div>
        <div class="campo c3"><label>Documento fiscal</label><input name="documento" value="${esc(d.documento)}" placeholder="NF 0000"></div>
        <div class="campo c2"><label>Valor (R$)</label><input type="number" step="0.01" name="valor" value="${d.valor ?? ''}" required></div>
        <div class="campo c4"><label>Comprovante</label><input type="file" name="_comp"></div>
      </form>`,
      rodape: `${d.id ? `<button class="btn perigo" data-excluir style="margin-right:auto">${icon('lixo')}Excluir</button>` : ''}<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const f = m.el.querySelector('#f-desp');
      const dados = UI.lerForm(f);
      if (!dados.categoria || !dados.descricao || !dados.valor) { UI.toast('Preencha categoria, descrição e valor'); return; }
      const comp = UI.arquivosDe(f.querySelector('[name=_comp]'));
      Store.salvar('despesas', { ...d, ...dados, projeto_id: projetoId, comprovante: comp[0] || d.comprovante || null });
      m.fechar(); UI.toast('Despesa lançada'); aoSalvar();
    };
    const ex = m.el.querySelector('[data-excluir]');
    if (ex) ex.onclick = async () => { if (await UI.confirmar('Excluir esta despesa?', { ok: 'Excluir', perigo: true })) { Store.remover('despesas', d.id); m.fechar(); aoSalvar(); } };
  }

  Views.projetos = function (el) {
    const projetos = Store.todos('projetos');
    el.innerHTML = `
      <div class="cabecalho">
        <div class="titulos"><h1>Projetos</h1><p class="sub">${projetos.length} projetos · ${Store.todos('turmas').length} turmas</p></div>
        <button class="btn quente" id="bt-novo">${icon('mais')}Novo projeto</button>
      </div>
      <div class="grade g3">${projetos.map((p) => {
        const ts = D.turmasDoProjeto(p.id);
        const alunos = new Set(ts.flatMap((t) => D.alunosDaTurma(t.id).map((a) => a.id))).size;
        const vig = D.vigenciaPct(p);
        return `<a class="cartao painel" href="#/projetos/${p.id}" style="--cor:${p.cor}">
          <span class="faixa"></span>
          <div class="linha-flex"><span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.area)}</span><span class="pequeno muted">${esc(p.instrumento || '')}</span></div>
          <h3>${esc(p.nome)}</h3>
          <p class="muted pequeno">${esc(p.descricao).slice(0, 130)}${p.descricao.length > 130 ? '…' : ''}</p>
          <div><div class="linha-flex pequeno muted"><span>Vigência ${UI.data(p.inicio)} – ${UI.data(p.fim)}</span><span class="espaco"></span><span>${Math.round(vig)}%</span></div><div class="barra azul" style="margin-top:4px"><i style="width:${vig}%"></i></div></div>
          <div class="rodape"><span>${icon('turmas')}${ts.length} turmas</span><span>${icon('alunos')}${alunos} alunos</span><span>${icon('dinheiro')}${UI.moeda(p.valor)}</span></div>
        </a>`;
      }).join('')}</div>`;
    $('#bt-novo').onclick = () => formProjeto(null, (p) => (location.hash = `#/projetos/${p.id}`));
  };

  Views.projeto = function (el, id, aba = 'turmas') {
    const p = Store.obter('projetos', id);
    if (!p) { el.innerHTML = `<div class="painel">${UI.vazio('Projeto não encontrado')}</div>`; return; }
    const ts = D.turmasDoProjeto(id);
    const alunosIds = new Set(ts.flatMap((t) => D.alunosDaTurma(t.id).map((a) => a.id)));
    const gasto = D.gastoProjeto(id);
    const mes = UI.hojeISO().slice(0, 7);
    const recarregar = () => App.irPara(`#/projetos/${id}/${aba}`, true);

    el.innerHTML = `
      <div class="migalhas"><a href="#/projetos">Projetos</a>›<span>${esc(p.nome)}</span></div>
      <div class="cabecalho">
        <div class="titulos">
          <div class="linha-flex" style="margin-bottom:4px"><span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.area)}</span><span class="chip">${esc(p.fonte)} ${esc(p.instrumento)}</span></div>
          <h1>${esc(p.nome)}</h1><p class="sub">${esc(p.financiador || '')} · vigência ${UI.data(p.inicio)} a ${UI.data(p.fim)}</p>
        </div>
        <button class="btn sec" id="bt-editar">${icon('lapis')}Editar</button>
        <button class="btn quente" id="bt-turma">${icon('mais')}Nova turma</button>
      </div>
      <div class="grade g4 kpi-grade">
        <div class="painel kpi"><span class="ic" style="background:#8fb2ff33;color:#8fb2ff">${icon('turmas')}</span><div><div class="valor">${ts.length}</div><div class="rot">turmas</div></div></div>
        <div class="painel kpi"><span class="ic" style="background:#f2a54133;color:#f2a541">${icon('alunos')}</span><div><div class="valor">${alunosIds.size}</div><div class="rot">alunos ativos</div></div></div>
        <div class="painel kpi"><span class="ic" style="background:#4fc39a33;color:#4fc39a">${icon('grafico')}</span><div><div class="valor">${UI.pct(D.freqProjeto(id, mes))}</div><div class="rot">frequência no mês</div></div></div>
        <div class="painel kpi"><span class="ic" style="background:#f0a27f33;color:#f0a27f">${icon('dinheiro')}</span><div><div class="valor">${Math.round((gasto / p.valor) * 100)}%</div><div class="rot">executado (${UI.moeda(gasto)})</div></div></div>
      </div>
      <div class="abas mt" id="abas">${[['turmas', 'Turmas'], ['dados', 'Dados e metas'], ['financeiro', 'Financeiro'], ['relatorios', 'Relatórios']].map(([k, r]) => `<button data-aba="${k}" class="${k === aba ? 'ativo' : ''}">${r}</button>`).join('')}</div>
      <div id="aba-corpo"></div>`;

    $('#abas').onclick = (e) => { const b = e.target.closest('[data-aba]'); if (b) App.irPara(`#/projetos/${id}/${b.dataset.aba}`, true); };
    $('#bt-editar').onclick = () => formProjeto(p, recarregar);
    $('#bt-turma').onclick = () => Turmas.form({ projeto_id: id }, (t) => (location.hash = `#/turmas/${t.id}`));
    const corpo = $('#aba-corpo');

    if (aba === 'turmas') {
      corpo.innerHTML = `<section class="painel">
        ${ts.length ? `<div class="tabela-wrap"><table class="tabela">
          <thead><tr><th>Turma</th><th>Professor(a)</th><th class="some-movel">Dias e horário</th><th class="some-movel">Local</th><th class="num">Alunos</th><th class="num">Frequência (mês)</th></tr></thead>
          <tbody>${ts.map((t) => { const n = D.alunosDaTurma(t.id).length; const f = D.freqTurma(t.id, mes); return `<tr class="clica" onclick="location.hash='#/turmas/${t.id}'">
            <td><b>${esc(t.nome)}</b><div class="pequeno muted">${esc(t.faixa || '')}</div></td>
            <td>${esc(D.nomePessoa(t.professor_id))}</td>
            <td class="some-movel">${esc(D.diasTexto(t.dias))} · ${esc(t.horario)}</td>
            <td class="some-movel">${esc(t.local)}</td>
            <td class="num">${n}/${t.vagas}</td>
            <td class="num">${f == null ? '—' : `<span class="chip ${f >= 75 ? 'ok' : f >= 50 ? 'alerta' : 'risco'}">${UI.pct(f)}</span>`}</td>
          </tr>`; }).join('')}</tbody></table></div>` : UI.vazio('Nenhuma turma neste projeto. Use “Nova turma”.', 'turmas')}
      </section>`;
    }

    if (aba === 'dados') {
      corpo.innerHTML = `<div class="grade g2">
        <section class="painel"><div class="painel-cab"><h2>Dados do projeto</h2></div><dl class="dl">
          <dt>Fonte</dt><dd>${esc(p.fonte || '—')}</dd><dt>Instrumento</dt><dd>${esc(p.instrumento || '—')}</dd>
          <dt>Financiador</dt><dd>${esc(p.financiador || '—')}</dd><dt>Vigência</dt><dd>${UI.data(p.inicio)} a ${UI.data(p.fim)}</dd>
          <dt>Valor total</dt><dd>${UI.moeda(p.valor)}</dd><dt>Coordenação</dt><dd>${esc(D.nomePessoa(p.coordenador))}</dd>
        </dl><p class="muted mt">${esc(p.descricao)}</p></section>
        <section class="painel"><div class="painel-cab"><h2>Metas</h2></div>
          <div class="lista">${(p.metas || '').split('\n').filter(Boolean).map((m) => `<div class="item"><span style="color:var(--laranja)">${icon('estrela', 'width="20"')}</span><div class="corpo">${esc(m)}</div></div>`).join('') || UI.vazio('Sem metas cadastradas')}</div>
        </section></div>`;
    }

    if (aba === 'financeiro') {
      const desp = Store.filtrar('despesas', (d) => d.projeto_id === id).sort((a, b) => b.data.localeCompare(a.data));
      const porCat = {};
      desp.forEach((d) => (porCat[d.categoria] = (porCat[d.categoria] || 0) + d.valor));
      corpo.innerHTML = `<div class="grade g-lado">
        <section class="painel">
          <div class="painel-cab"><h2>Despesas lançadas</h2><button class="btn p" id="bt-desp">${icon('mais')}Lançar despesa</button></div>
          <div class="tabela-wrap"><table class="tabela">
            <thead><tr><th>Data</th><th>Descrição</th><th class="some-movel">Categoria</th><th class="some-movel">Documento</th><th class="num">Valor</th></tr></thead>
            <tbody>${desp.map((d) => `<tr class="clica" data-desp="${d.id}"><td class="nowrap">${UI.data(d.data)}</td><td>${esc(d.descricao)}<div class="pequeno muted">${esc(d.fornecedor || '')}</div></td><td class="some-movel">${esc(d.categoria)}</td><td class="some-movel">${esc(d.documento || '')}</td><td class="num nowrap">${UI.moeda(d.valor)}</td></tr>`).join('') || `<tr><td colspan="5">${UI.vazio('Nenhuma despesa lançada', 'dinheiro')}</td></tr>`}</tbody>
          </table></div>
        </section>
        <section class="painel">
          <div class="painel-cab"><h2>Execução</h2></div>
          <div class="linha-flex"><span class="muted">Orçamento</span><span class="espaco"></span><b>${UI.moeda(p.valor)}</b></div>
          <div class="linha-flex mt-p"><span class="muted">Executado</span><span class="espaco"></span><b>${UI.moeda(gasto)}</b></div>
          <div class="linha-flex mt-p"><span class="muted">Saldo</span><span class="espaco"></span><b style="color:var(--verde)">${UI.moeda(p.valor - gasto)}</b></div>
          <div class="barra mt-p"><i style="width:${Math.min(100, (gasto / p.valor) * 100)}%"></i></div>
          <h3 class="mt" style="font-size:15px">Por categoria</h3>
          ${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="mt-p"><div class="linha-flex pequeno"><span>${esc(c)}</span><span class="espaco"></span><b>${UI.moeda(v)}</b></div><div class="barra azul" style="margin-top:4px;height:6px"><i style="width:${(v / gasto) * 100}%"></i></div></div>`).join('')}
        </section></div>`;
      $('#bt-desp').onclick = () => formDespesa(id, null, recarregar);
      corpo.querySelector('tbody').onclick = (e) => { const tr = e.target.closest('[data-desp]'); if (tr) formDespesa(id, Store.obter('despesas', tr.dataset.desp), recarregar); };
    }

    if (aba === 'relatorios') {
      corpo.innerHTML = `<section class="painel"><div class="grade g3">
        <div class="registro"><h3 style="font-size:16px">Relatório mensal do projeto</h3><p class="muted pequeno mt-p">Turmas, frequência, aulas e eventos do mês.</p>
          <div class="linha-flex mt-p"><input type="month" class="entrada" id="r-mes" value="${mes}" style="width:auto"><button class="btn p" id="r-mensal">${icon('relatorios')}Gerar</button></div></div>
        <div class="registro"><h3 style="font-size:16px">Prestação de contas</h3><p class="muted pequeno mt-p">Execução física e financeira no período.</p>
          <div class="linha-flex mt-p"><input type="date" class="entrada" id="r-ini" value="${p.inicio}" style="width:auto"><input type="date" class="entrada" id="r-fim" value="${UI.hojeISO()}" style="width:auto"><button class="btn p" id="r-contas">${icon('dinheiro')}Gerar</button></div></div>
        <div class="registro"><h3 style="font-size:16px">Lista de alunos atendidos</h3><p class="muted pequeno mt-p">Todos os alunos ativos por turma.</p>
          <div class="linha-flex mt-p"><button class="btn p" id="r-lista">${icon('lista')}Gerar</button></div></div>
      </div></section>`;
      $('#r-mensal').onclick = () => Doc.mensalProjeto(id, $('#r-mes').value);
      $('#r-contas').onclick = () => Doc.prestacaoContas(id, $('#r-ini').value, $('#r-fim').value);
      $('#r-lista').onclick = () => Doc.listaAlunosProjeto(id);
    }
  };

  window.Projetos = { formProjeto, formDespesa, CATEGORIAS };
})();
