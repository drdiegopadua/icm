/* Doadores e parceiros: cadastro PF/PJ, doações, recibos e relatório ao doador */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.doadores = async function (el, params, query) {
    if (!ICM.auth.can('doadores.gerir')) { el.innerHTML = ui().empty('Acesso restrito à direção e coordenação.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Doadores e parceiros']]);
    const list = await ICM.api.doadores.list();
    const ano = ICM.util.today().slice(0, 4);
    const doacoesAno = await ICM.api.doadores.doacoes({ de: `${ano}-01-01`, ate: `${ano}-12-31` });
    const totAno = doacoesAno.reduce((s, d) => s + Number(d.valor), 0);
    const tab0 = query.get('tab') || 'doadores';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Doadores e parceiros</h1><div class="page-sub">Pessoas físicas e empresas que apoiam o Instituto — histórico, recibos e prestação de contas ao doador</div></div>
        <div class="row wrap"><button class="btn" data-doacao>${I('heart', 18)} Registrar doação</button><button class="btn btn-primary" data-novo>${I('plus', 18)} Novo doador</button></div></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('users', '#ec4899', list.length, 'Doadores cadastrados')}
        ${ICM.pages._stat('dollar', '#10b981', Math.round(totAno), `Arrecadado em ${ano} (R$)`)}
        ${ICM.pages._stat('heart', '#8b5cf6', doacoesAno.length, `Doações em ${ano}`)}
        ${ICM.pages._stat('refresh', '#2563eb', list.filter(d => d.qtd >= 3).length, 'Doadores recorrentes')}
      </div>
      <div class="tabs mb-4">${[['doadores', 'Doadores', 'users'], ['doacoes', 'Doações', 'heart'], ['relatorios', 'Relatórios', 'fileText']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    const R = {
      doadores() {
        panel.innerHTML = `<div class="card tab-panel"><div class="table-wrap"><table class="table"><thead><tr><th>Doador</th><th>Tipo</th><th>Contato</th><th>Doações</th><th>Total doado</th><th>Última</th></tr></thead><tbody>
          ${list.map(d => `<tr class="clickable" data-href="#/doadores/${esc(d.id)}"><td><div class="row">${ICM.util.avatar(d.nome, null, 'sm')}<div><b>${esc(d.nome)}</b><div class="xs muted">${esc(d.categoria || '')}</div></div></div></td><td>${ui().badge(d.tipo === 'PJ' ? 'Empresa' : 'Pessoa física', d.tipo === 'PJ' ? '' : 'neutral')}</td><td class="small">${esc(d.contato || d.email || d.telefone || '')}</td><td>${d.qtd}</td><td><b>${esc(money(d.total))}</b></td><td class="small">${esc(d.ultima ? fmtDate(d.ultima) : '—')}</td></tr>`).join('')}
        </tbody></table></div></div>`;
        panel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      },
      async doacoes() {
        const ds = await ICM.api.doadores.doacoes(); const projetos = await ICM.api.raw('projetos');
        panel.innerHTML = `<div class="card tab-panel">${tabelaDoacoes(ds, list, projetos)}</div>`;
        bindDoacoes(panel);
      },
      relatorios() {
        const card = ICM.pages._repCard;
        panel.innerHTML = `<div class="grid grid-3 tab-panel">${card('Relatório de doações', 'Doações recebidas no período por doador e destinação.', 'chart', '#ec4899', 'doacoes_periodo')}<div class="card small muted">${I('info', 16)} O <b>recibo</b> de cada doação e o <b>relatório de impacto ao doador</b> ficam na página de cada doador.</div></div>`;
        panel.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => ICM.reports.openDialog(c.dataset.rep)));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    el.querySelector('[data-novo]').addEventListener('click', () => form());
    el.querySelector('[data-doacao]').addEventListener('click', () => doacaoForm({}));
    await R[tab0]();
  };

  ICM.pages.doador = async function (el, params) {
    const d = await ICM.api.doadores.get(params.id);
    if (!d) { el.innerHTML = ui().empty('Doador não encontrado'); return; }
    ICM.app.setCrumbs([['Doadores', '#/doadores'], [d.nome]]);
    const ds = await ICM.api.doadores.doacoes({ doador_id: d.id });
    const projetos = await ICM.api.raw('projetos');
    const tot = ds.reduce((s, x) => s + Number(x.valor), 0);
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(d.nome, null, 'lg')}<div class="grow"><h1 class="page-title" style="font-size:28px">${esc(d.nome)}</h1>
        <div class="meta mt-2"><span>${I('building', 15)} ${esc(d.categoria || '')}</span><span>${I('heart', 15)} ${ds.length} doações</span><span>${I('dollar', 15)} ${esc(money(tot))}</span></div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('sparkles', 18)} Relatório ao doador</button><button class="btn" data-edit>${I('edit', 18)} Editar</button><button class="btn btn-primary" data-doacao>${I('plus', 18)} Registrar doação</button></div></div></div>
      <div class="grid grid-dash">
        <div class="card"><div class="section-title">${I('heart', 18)} Histórico de doações</div>${tabelaDoacoes(ds, [{ ...d }], projetos, true)}</div>
        <div class="card"><div class="section-title">${I('info', 18)} Cadastro</div>${ui().kv([[d.tipo === 'PJ' ? 'CNPJ' : 'CPF', d.documento], ['Contato', d.contato], ['E-mail', d.email], ['Telefone', d.telefone], ['Endereço', d.endereco], ['Aceita receber comunicações', d.aceita_comunicacao ? 'Sim' : 'Não'], ['Observações', d.observacoes]])}</div>
      </div></div>`;
    bindDoacoes(el);
    el.querySelector('[data-edit]').addEventListener('click', () => form(d));
    el.querySelector('[data-doacao]').addEventListener('click', () => doacaoForm({ doador_id: d.id }));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('doador_relatorio', { doador_id: d.id }));
  };

  function tabelaDoacoes(ds, doadores, projetos, semDoador) {
    if (!ds.length) return ui().empty('Nenhuma doação', 'heart');
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Recibo</th>${semDoador ? '' : '<th>Doador</th>'}<th>Tipo</th><th>Descrição</th><th>Destinação</th><th>Valor</th><th></th></tr></thead><tbody>
      ${ds.map(x => `<tr><td class="small">${esc(fmtDate(x.data))}</td><td class="small bold" style="white-space:nowrap">${esc(x.recibo)}</td>${semDoador ? '' : `<td><a href="#/doadores/${esc(x.doador_id)}"><b>${esc((doadores.find(d => d.id === x.doador_id) || {}).nome || '')}</b></a></td>`}<td>${ui().badge(ICM.C.TIPOS_DOACAO[x.tipo], x.tipo === 'dinheiro' ? 'ok' : 'neutral')}</td><td class="small">${esc(x.descricao || '')}${x.forma ? ` <span class="muted">· ${esc(x.forma)}</span>` : ''}</td><td class="small">${esc((projetos.find(p => p.id === x.projeto_id) || {}).nome || 'Institucional')}</td><td><b>${esc(money(x.valor))}</b></td><td style="white-space:nowrap"><button class="btn btn-sm btn-ghost" data-rec="${esc(x.id)}">${I('fileText', 14)} Recibo</button><button class="btn btn-sm btn-ghost" data-rmd="${esc(x.id)}" aria-label="Excluir">${I('trash', 14)}</button></td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function bindDoacoes(root) {
    root.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('doacao_recibo', { doacao_id: b.dataset.rec })));
    root.querySelectorAll('[data-rmd]').forEach(b => b.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir doação', text: 'A exclusão fica registrada na auditoria. Continuar?', ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.doadores.removerDoacao(b.dataset.rmd), 'Doação excluída'); ICM.app.reload(); } }));
  }

  function form(d = { tipo: 'PF', aceita_comunicacao: true }) {
    const F = o => ui().field(o);
    const m = ui().modal({
      title: d.id ? 'Editar doador' : 'Novo doador / parceiro',
      body: `<form class="grid grid-2">
        ${F({ name: 'tipo', label: 'Tipo', type: 'select', value: d.tipo, options: [['PF', 'Pessoa física'], ['PJ', 'Pessoa jurídica (empresa, fundação, instituto)']] })}
        ${F({ name: 'categoria', label: 'Categoria', type: 'select', value: d.categoria, options: ['Pessoa física', 'Empresa', 'Fundação / instituto', 'Organização religiosa', 'Clube de serviço', 'Poder público', 'Outro'] })}
        ${F({ name: 'nome', label: 'Nome / razão social', value: d.nome, required: true, cls: 'span-2' })}
        ${F({ name: 'documento', label: 'CPF / CNPJ', value: d.documento })}${F({ name: 'contato', label: 'Pessoa de contato (PJ)', value: d.contato })}
        ${F({ name: 'email', label: 'E-mail', type: 'email', value: d.email })}${F({ name: 'telefone', label: 'Telefone', value: d.telefone })}
        ${F({ name: 'endereco', label: 'Endereço', value: d.endereco, cls: 'span-2' })}
        ${F({ name: 'aceita_comunicacao', label: 'Autoriza receber comunicações e relatórios (LGPD)', type: 'toggle', value: d.aceita_comunicacao, cls: 'span-2' })}
        ${F({ name: 'observacoes', label: 'Observações', type: 'textarea', value: d.observacoes, rows: 2, cls: 'span-2' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const x = await ui().run(() => ICM.api.doadores.save(d.id ? { ...d, ...ICM.util.formData(m.$('form')) } : ICM.util.formData(m.$('form'))), 'Doador salvo');
      m.close(); location.hash = `#/doadores/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
  }

  async function doacaoForm(o) {
    const F = f => ui().field(f);
    const doadores = await ICM.api.doadores.list(); const projetos = await ICM.api.projetos.list();
    const m = ui().modal({
      title: 'Registrar doação',
      body: `<form class="grid grid-2">
        ${F({ name: 'doador_id', label: 'Doador', type: 'select', value: o.doador_id, options: [['', 'Selecione…'], ...doadores.map(d => [d.id, d.nome])], cls: 'span-2' })}
        ${F({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}
        ${F({ name: 'tipo', label: 'Tipo', type: 'select', value: 'dinheiro', options: Object.entries(ICM.C.TIPOS_DOACAO) })}
        ${F({ name: 'valor', label: 'Valor (R$) — estimado se bens/serviços', type: 'number', attrs: 'min="0" step="0.01"' })}
        ${F({ name: 'forma', label: 'Forma de pagamento', type: 'select', options: ['', ...ICM.C.FORMAS_PAGTO] })}
        ${F({ name: 'projeto_id', label: 'Destinação', type: 'select', options: [['', 'Institucional (livre)'], ...projetos.map(p => [p.id, p.nome])], cls: 'span-2' })}
        ${F({ name: 'descricao', label: 'Descrição', cls: 'span-2', placeholder: 'Ex.: doação mensal, 20 bolas de futsal, reforma do telhado…' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('fileText', 18)} Salvar e gerar recibo</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const x = await ui().run(() => ICM.api.doadores.registrarDoacao(ICM.util.formData(m.$('form'))), 'Doação registrada');
      m.close(); await ICM.reports.generate('doacao_recibo', { doacao_id: x.id }); ICM.app.reload();
    }).catch(() => { }));
  }
})();
