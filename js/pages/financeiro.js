/* Financeiro por projeto: painel, lançamentos (pagar/receber, rateio, comprovantes, NF-e),
   orçamento previsto × realizado por rubrica, contas e conciliação bancária */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;
  const RUB = () => ICM.C.RUBRICAS, CAT = () => ICM.C.CATEGORIAS_RECEITA;
  const SIT = { pago: ['Pago', 'ok'], recebido: ['Recebido', 'ok'], a_pagar: ['A pagar', 'warn'], a_receber: ['A receber', ''], atrasado: ['Atrasado', 'danger'], previsto: ['Previsto', 'neutral'] };

  ICM.pages.financeiro = async function (el, params, query) {
    if (!ICM.auth.can('financeiro.ver')) { el.innerHTML = ui().empty('Acesso restrito à direção e coordenação.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Financeiro']]);
    const projetos = await ICM.api.raw('projetos');
    const contas = await ICM.api.financeiro.contas();
    const fornecedores = await ICM.api.fornecedores.list();
    const pn = id => id ? ((projetos.find(p => p.id === id) || {}).nome || '?') : 'Institucional';
    const tab0 = query.get('tab') || 'painel';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Financeiro</h1><div class="page-sub">Contas a pagar e receber, orçamento por projeto, rateio, comprovantes e conciliação bancária</div></div>
        ${ICM.auth.can('financeiro.lancar') ? `<div class="row wrap"><button class="btn" data-nova="receita">${I('download', 18)} Nova receita</button><button class="btn btn-primary" data-nova="despesa">${I('upload', 18)} Nova despesa</button></div>` : ''}</div>
      <div class="tabs mb-4">${[['painel', 'Painel', 'chart'], ['lanc', 'Lançamentos', 'list'], ['orc', 'Orçamento por projeto', 'target'], ['contas', 'Contas e conciliação', 'wallet'], ['rel', 'Relatórios', 'fileText']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    let cur = tab0;
    const R = {
      async painel() {
        const hoje = ICM.util.today(); const em30 = ICM.util.addDays(hoje, 30);
        const abertos = await ICM.api.financeiro.lancamentos({ status: 'aberto' });
        const pagar = abertos.filter(l => l.tipo === 'despesa'), receber = abertos.filter(l => l.tipo === 'receita');
        const fluxo = await ICM.api.financeiro.fluxo(6);
        const mx = Math.max(1, ...fluxo.flatMap(f => [f.entradas, f.saidas]));
        const orcs = []; for (const p of projetos.filter(p => p.status !== 'encerrado')) orcs.push({ p, o: await ICM.api.financeiro.orcamento(p.id) });
        panel.innerHTML = `<div class="tab-panel">
          <div class="grid grid-4 stagger mb-4">
            ${ICM.pages._stat('wallet', '#2563eb', Math.round(contas.reduce((s, c) => s + c.saldo, 0)), 'Saldo em contas (R$)')}
            ${ICM.pages._stat('upload', '#ef4444', Math.round(pagar.filter(l => l.vencimento <= em30).reduce((s, l) => s + l.valor, 0)), 'A pagar em 30 dias (R$)')}
            ${ICM.pages._stat('download', '#10b981', Math.round(receber.reduce((s, l) => s + l.valor, 0)), 'A receber (R$)')}
            ${ICM.pages._stat('alert', '#f59e0b', abertos.filter(l => l.atrasado).length, 'Lançamentos atrasados')}
          </div>
          ${abertos.filter(l => l.atrasado).length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.3),var(--sh-out)"><div class="card-title mb-4">${I('alert', 18)} Atrasados</div>${abertos.filter(l => l.atrasado).map(l => `<div class="list-item"><b class="grow">${esc(l.descricao)}</b><span class="small muted">venceu ${esc(fmtDate(l.vencimento))}</span><b>${esc(money(l.valor))}</b>${ICM.auth.can('financeiro.lancar') ? `<button class="btn btn-sm" data-baixa="${esc(l.id)}">${I('check', 14)} ${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>` : ''}</div>`).join('')}</div>` : ''}
          <div class="grid grid-dash">
            <div class="card"><div class="card-head"><div><div class="card-title">Fluxo de caixa</div><div class="card-sub">Entradas × saídas por mês (inclui previstos)</div></div></div>
              <div class="bars fluxo" style="height:200px">${fluxo.map(f => `<div class="bar"><div class="row" style="align-items:flex-end;gap:3px;height:100%;width:100%;justify-content:center"><div class="b" title="Entradas ${esc(money(f.entradas))}" style="height:${f.entradas / mx * 100}%;background:linear-gradient(#34d399,#059669);max-width:18px;${f.futuro ? 'opacity:.5' : ''}"></div><div class="b" title="Saídas ${esc(money(f.saidas))}" style="height:${f.saidas / mx * 100}%;background:linear-gradient(#f87171,#dc2626);max-width:18px;${f.futuro ? 'opacity:.5' : ''}"></div></div><span class="l">${esc(f.l)}</span></div>`).join('')}</div>
              <div class="row small mt-2"><span class="badge ok">Entradas</span><span class="badge danger">Saídas</span><span class="xs muted">meses futuros em transparência = previsto</span></div></div>
            <div class="card"><div class="card-title mb-4">Contas</div>${contas.map(c => `<div class="list-item"><div class="grow"><b>${esc(c.nome)}</b><div class="xs muted">${esc(ICM.C.TIPOS_CONTA_FIN[c.tipo])}${c.pendentes_conciliar ? ` · ${c.pendentes_conciliar} a conciliar` : ''}</div></div><b style="${c.saldo < 0 ? 'color:var(--danger)' : ''}">${esc(money(c.saldo))}</b></div>`).join('')}</div>
          </div>
          <div class="section-title mt-6">${I('target', 18)} Execução do orçamento por projeto</div>
          <div class="grid grid-3">${orcs.filter(x => x.o.previsto).map(({ p, o }) => { const pc = Math.round((o.realizado + o.comprometido) / o.previsto * 100); return `<div class="card project-card hoverable" style="--c:${p.cor}" data-orc="${esc(p.id)}"><div class="name" style="font-size:16px">${esc(p.nome)}</div>
            <div class="row between small"><span>Executado</span><b>${esc(money(o.realizado))} de ${esc(money(o.previsto))}</b></div><div class="progress ${pc > 100 ? 'danger' : pc > 85 ? 'warn' : 'ok'}"><span style="width:${Math.min(100, pc)}%"></span></div>
            <div class="row wrap xs"><span class="muted">${pc}% (com comprometido)</span>${o.estourados.length ? `<span class="badge danger">${o.estourados.length} rubrica(s) estourada(s)</span>` : ''}</div></div>`; }).join('')}</div>
        </div>`;
        panel.querySelectorAll('[data-orc]').forEach(c => c.addEventListener('click', () => { location.hash = `#/financeiro?tab=orc&p=${c.dataset.orc}`; }));
        bindBaixa(panel);
      },
      async lanc() {
        let f = { status: query.get('status') || '', tipo: '', projeto_id: undefined, q: '' };
        panel.innerHTML = `<div class="card tab-panel"><div class="row wrap between mb-4">
          <div class="segmented" data-st>${[['', 'Todos'], ['aberto', 'Em aberto'], ['atrasado', 'Atrasados'], ['pago', 'Pagos'], ['recebido', 'Recebidos']].map(([v, t]) => `<button data-v="${v}" class="${f.status === v ? 'active' : ''}">${t}</button>`).join('')}</div>
          <div class="row wrap"><select class="select" data-tipo style="width:140px"><option value="">Receitas e despesas</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select>
            <select class="select" data-proj style="width:220px"><option value="__">Todos os projetos</option><option value="">Institucional</option>${projetos.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select>
            <div class="input-icon" style="width:200px">${I('search', 16)}<input class="input" data-q placeholder="Descrição ou documento"></div></div></div><div data-l></div></div>`;
        const draw = async () => {
          const l = await ICM.api.financeiro.lancamentos({ status: f.status, tipo: f.tipo, projeto_id: f.projeto_id, q: f.q });
          const tot = t => l.filter(x => x.tipo === t).reduce((s, x) => s + x.valor, 0);
          panel.querySelector('[data-l]').innerHTML = l.length ? `<div class="row wrap small mb-4"><span class="badge ok">Receitas ${esc(money(tot('receita')))}</span><span class="badge danger">Despesas ${esc(money(tot('despesa')))}</span><span class="muted">${l.length} lançamento(s)</span></div>
            <div class="table-wrap"><table class="table"><thead><tr><th>Data / venc.</th><th>Descrição</th><th>Projeto</th><th>Rubrica / categoria</th><th>Valor</th><th>Situação</th><th></th></tr></thead><tbody>
            ${l.map(x => `<tr><td class="small">${esc(fmtDate(x.data || x.vencimento))}${x.data ? '' : '<div class="xs muted">vencimento</div>'}</td>
              <td><b>${esc(x.descricao)}</b><div class="xs muted">${esc(x.documento || '')}${x.fornecedor_id ? ' · ' + esc((fornecedores.find(fo => fo.id === x.fornecedor_id) || {}).nome || '') : ''}${x.conciliado ? ` · <span style="color:var(--ok)">${I('check', 11)} conciliado</span>` : ''}</div></td>
              <td class="small">${x.rateio && x.rateio.length ? `<span title="${esc(x.rateio.map(r => `${pn(r.projeto_id)} ${r.pct}%`).join(' · '))}">Rateio (${x.rateio.length})</span>` : esc(pn(x.projeto_id))}</td>
              <td class="small">${esc(x.tipo === 'despesa' ? RUB()[x.rubrica] || '' : CAT()[x.categoria] || '')}</td>
              <td><b style="color:${x.tipo === 'receita' ? 'var(--ok)' : 'var(--danger)'}">${x.tipo === 'receita' ? '+' : '−'} ${esc(money(x.valor))}</b></td>
              <td>${ui().badge(SIT[x.situacao][0], SIT[x.situacao][1], true)}</td>
              <td style="white-space:nowrap;text-align:right">${x.comprovante ? `<button class="btn btn-icon btn-sm btn-ghost" data-comp="${esc(x.comprovante.id)}" title="Ver comprovante">${I('fileText', 15)}</button>` : ''}${!['pago', 'recebido'].includes(x.situacao) && ICM.auth.can('financeiro.lancar') ? `<button class="btn btn-sm" data-baixa="${esc(x.id)}">${x.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>` : ''}${ICM.auth.can('financeiro.lancar') ? `<button class="btn btn-icon btn-sm btn-ghost" data-ed="${esc(x.id)}" aria-label="Editar">${I('edit', 15)}</button>` : ''}</td></tr>`).join('')}
            </tbody></table></div>` : ui().empty('Nenhum lançamento', 'list');
          bindBaixa(panel, draw);
          panel.querySelectorAll('[data-comp]').forEach(b => b.addEventListener('click', () => ICM.pages._verArquivo(b.dataset.comp)));
          panel.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', async () => { const x = (await ICM.api.financeiro.lancamentos()).find(y => y.id === b.dataset.ed); form(x.tipo, x); }));
        };
        panel.querySelectorAll('[data-st] button').forEach(b => b.addEventListener('click', () => { panel.querySelectorAll('[data-st] button').forEach(y => y.classList.toggle('active', y === b)); f.status = b.dataset.v; draw(); }));
        panel.querySelector('[data-tipo]').addEventListener('change', e => { f.tipo = e.target.value; draw(); });
        panel.querySelector('[data-proj]').addEventListener('change', e => { f.projeto_id = e.target.value === '__' ? undefined : e.target.value; draw(); });
        panel.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { f.q = e.target.value; draw(); }, 250));
        await draw();
      },
      async orc() {
        let pid = query.get('p') || (projetos[0] || {}).id;
        panel.innerHTML = `<div class="card tab-panel"><div class="row wrap between mb-4"><select class="select" data-p style="width:320px">${projetos.map(p => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
          <div class="row">${ICM.auth.can('financeiro.aprovar') ? `<button class="btn btn-sm" data-edorc>${I('edit', 14)} Editar orçamento</button>` : ''}<button class="btn btn-sm btn-primary" data-relorc>${I('fileText', 14)} Relatório de execução financeira</button></div></div><div data-o></div></div>`;
        const draw = async () => {
          const o = await ICM.api.financeiro.orcamento(pid); const p = projetos.find(x => x.id === pid);
          panel.querySelector('[data-o]').innerHTML = `<div class="grid grid-4 mb-4">${mini('Orçamento aprovado', money(o.previsto))}${mini('Realizado (pago)', money(o.realizado))}${mini('Comprometido (a pagar)', money(o.comprometido))}${mini('Recebido no projeto', money(o.recebido))}</div>
            ${o.estourados.length ? `<div class="sens-lock mb-4" style="background:var(--danger-soft);color:#dc2626">${I('alert', 16)} Rubrica(s) acima do previsto: ${o.estourados.map(x => esc(x.nome)).join(', ')}. Em parcerias públicas, remanejamento precisa de autorização do órgão.</div>` : ''}
            <div class="table-wrap"><table class="table"><thead><tr><th>Rubrica</th><th>Previsto</th><th>Realizado</th><th>Comprometido</th><th>Saldo</th><th style="width:22%">Execução</th></tr></thead><tbody>
            ${o.linhas.map(x => `<tr><td><b>${esc(x.nome)}</b></td><td>${esc(money(x.previsto))}</td><td>${esc(money(x.realizado))}</td><td class="small">${esc(money(x.comprometido))}</td><td style="${x.saldo < 0 ? 'color:var(--danger);font-weight:800' : ''}">${esc(money(x.saldo))}</td>
              <td>${x.pct == null ? '<span class="xs muted">sem previsão</span>' : `<div class="row" style="gap:8px"><div class="progress ${x.pct > 100 ? 'danger' : x.pct > 85 ? 'warn' : 'ok'}" style="flex:1"><span style="width:${Math.min(100, x.pct)}%"></span></div><b class="xs">${x.pct}%</b></div>`}</td></tr>`).join('')}
            </tbody></table></div><div class="xs muted mt-2">Valor aprovado do projeto: ${esc(money(p.valor || 0))}. Despesas com rateio entram proporcionalmente.</div>`;
        };
        panel.querySelector('[data-p]').addEventListener('change', e => { pid = e.target.value; draw(); });
        panel.querySelector('[data-relorc]').addEventListener('click', () => ICM.reports.generate('fin_execucao', { projeto_id: pid }));
        const eo = panel.querySelector('[data-edorc]'); if (eo) eo.addEventListener('click', async () => {
          const o = await ICM.api.financeiro.orcamento(pid);
          const m = ui().modal({ title: 'Orçamento por rubrica', body: `<form class="col">${Object.entries(RUB()).map(([k, n]) => `<div class="row"><span class="grow small">${esc(n)}</span><input class="input" type="number" step="0.01" min="0" name="${k}" value="${(o.linhas.find(x => x.rubrica === k) || {}).previsto || ''}" style="width:160px"></div>`).join('')}</form><div class="small mt-4" data-tot></div>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar orçamento</button>` });
          const tot = () => { const t = [...m.$$('input')].reduce((s, i) => s + Number(i.value || 0), 0); m.$('[data-tot]').innerHTML = `Total: <b>${esc(money(t))}</b> · valor aprovado do projeto: ${esc(money((projetos.find(x => x.id === pid) || {}).valor || 0))}`; };
          m.$('form').addEventListener('input', tot); tot();
          m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.financeiro.salvarOrcamento(pid, [...m.$$('input')].map(i => ({ rubrica: i.name, valor: Number(i.value || 0) }))), 'Orçamento salvo'); m.close(); draw(); });
        });
        await draw();
      },
      async contas() {
        const cs = await ICM.api.financeiro.contas();
        panel.innerHTML = `<div class="tab-panel"><div class="grid grid-3 stagger">${cs.map(c => `<div class="card"><div class="row between"><b>${esc(c.nome)}</b>${ui().badge(ICM.C.TIPOS_CONTA_FIN[c.tipo], c.tipo === 'especifica' ? 'warn' : 'neutral')}</div>
          <div class="xs muted mt-2">${esc([c.banco, c.agencia && 'ag. ' + c.agencia, c.conta && 'cc ' + c.conta].filter(Boolean).join(' · '))}${c.projeto_id ? `<br>Exclusiva: ${esc(pn(c.projeto_id))}` : ''}</div>
          <div style="font-size:26px;font-weight:900;margin-top:10px;${c.saldo < 0 ? 'color:var(--danger)' : ''}">${esc(money(c.saldo))}</div>
          <div class="row wrap mt-4">${c.tipo !== 'caixa' && ICM.auth.can('financeiro.lancar') ? `<label class="btn btn-sm btn-primary">${I('upload', 14)} Importar extrato (OFX/CSV)<input type="file" accept=".ofx,.csv,.txt" data-ext="${esc(c.id)}" hidden></label>` : ''}${c.pendentes_conciliar ? `<span class="badge warn">${c.pendentes_conciliar} a conciliar</span>` : ui().badge('Conciliada', 'ok')}</div></div>`).join('')}
          ${ICM.auth.can('financeiro.lancar') ? `<div class="card" style="display:grid;place-items:center"><button class="btn" data-nconta>${I('plus', 16)} Nova conta</button></div>` : ''}</div>
          <div class="card mt-4 small muted">${I('info', 16)} <b>Conciliação bancária:</b> baixe o extrato no internet banking em <b>OFX</b> (ou CSV com data;descrição;valor) e importe. O sistema encontra os lançamentos com mesmo valor e data próxima, dá baixa automática e mostra o que não tem lançamento para você criar. Em parcerias públicas a conta deve ser <b>específica</b> e exclusiva do projeto (Lei 13.019, art. 51).</div></div>`;
        panel.querySelectorAll('[data-ext]').forEach(inp => inp.addEventListener('change', async () => { const f = inp.files[0]; if (!f) return; try { const linhas = ICM.api.financeiro.lerExtrato(await f.text(), f.name); conciliacao(inp.dataset.ext, linhas); } catch (e) { ui().toast(e.message, 'danger', 6000); } inp.value = ''; }));
        const nc = panel.querySelector('[data-nconta]'); if (nc) nc.addEventListener('click', () => {
          const F = o => ui().field(o);
          const m = ui().modal({ title: 'Nova conta', body: `<form class="grid grid-2">${F({ name: 'nome', label: 'Nome', required: true, cls: 'span-2' })}${F({ name: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(ICM.C.TIPOS_CONTA_FIN) })}${F({ name: 'projeto_id', label: 'Exclusiva do projeto', type: 'select', options: [['', 'Não'], ...projetos.map(p => [p.id, p.nome])] })}${F({ name: 'banco', label: 'Banco' })}${F({ name: 'agencia', label: 'Agência' })}${F({ name: 'conta', label: 'Conta' })}${F({ name: 'saldo_inicial', label: 'Saldo inicial (R$)', type: 'number', attrs: 'step="0.01"' })}${F({ name: 'data_saldo', label: 'Data do saldo', type: 'date', value: ICM.util.today() })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
          m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.financeiro.salvarConta(ICM.util.formData(m.$('form'))), 'Conta criada'); m.close(); ICM.app.reload(); });
        });
      },
      rel() {
        const card = ICM.pages._repCard;
        panel.innerHTML = `<div class="grid grid-3 tab-panel">${card('Execução financeira do projeto', 'Previsto × realizado por rubrica, receitas, lista de despesas com documentos — para a prestação de contas.', 'target', '#2563eb', 'fin_execucao')}${card('Fluxo de caixa', 'Entradas e saídas do período por conta e categoria.', 'chart', '#10b981', 'fin_fluxo')}${card('Contas a pagar e a receber', 'Tudo em aberto, com vencimentos e atrasados.', 'calendar', '#ef4444', 'fin_abertos')}</div>`;
        panel.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => ICM.reports.openDialog(c.dataset.rep)));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => { cur = k; R[k](); });
    el.querySelectorAll('[data-nova]').forEach(b => b.addEventListener('click', () => form(b.dataset.nova)));
    await R[tab0]();

    function bindBaixa(root, after) {
      root.querySelectorAll('[data-baixa]').forEach(b => b.addEventListener('click', async () => {
        const m = ui().modal({ title: 'Registrar pagamento / recebimento', size: 'sm', body: `<form class="col">${ui().field({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}${ui().field({ name: 'conta_id', label: 'Conta', type: 'select', options: contas.map(c => [c.id, c.nome]) })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Confirmar</button>` });
        const l = (await ICM.api.financeiro.lancamentos()).find(x => x.id === b.dataset.baixa); m.$('[name=conta_id]').value = l.conta_id;
        m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.financeiro.baixar(l.id, ICM.util.formData(m.$('form'))), 'Baixa registrada'); m.close(); after ? after() : R[cur](); });
      }));
    }

    // ----- Formulário de lançamento (com rateio, comprovante e importação de NF-e) -----
    function form(tipo, l = {}) {
      const F = o => ui().field(o);
      let rateio = (l.rateio || []).map(r => ({ ...r }));
      let comprovante = l.comprovante || null;
      const m = ui().modal({
        title: l.id ? 'Editar lançamento' : tipo === 'receita' ? 'Nova receita' : 'Nova despesa', size: 'wide',
        body: `<form class="grid grid-3">
          ${tipo === 'despesa' ? `<label class="photo-drop span-all" style="aspect-ratio:auto;padding:14px">${I('upload', 22)}<span><b>Importar XML da NF-e</b> — preenche fornecedor, número, data e valor</span><input type="file" accept=".xml,text/xml" data-xml hidden></label>` : ''}
          ${F({ name: 'descricao', label: 'Descrição', value: l.descricao, required: true, cls: 'span-2' })}
          ${F({ name: 'valor', label: 'Valor (R$)', type: 'number', value: l.valor, attrs: 'step="0.01" min="0"' })}
          ${tipo === 'despesa' ? F({ name: 'rubrica', label: 'Rubrica', type: 'select', value: l.rubrica, options: [['', 'Selecione…'], ...Object.entries(RUB())] }) : F({ name: 'categoria', label: 'Categoria', type: 'select', value: l.categoria, options: Object.entries(CAT()) })}
          ${F({ name: 'conta_id', label: 'Conta', type: 'select', value: l.conta_id, options: contas.map(c => [c.id, c.nome]) })}
          ${F({ name: 'projeto_id', label: 'Projeto', type: 'select', value: l.projeto_id, options: [['', 'Institucional'], ...projetos.map(p => [p.id, p.nome])] })}
          ${F({ name: 'vencimento', label: 'Vencimento', type: 'date', value: l.vencimento || ICM.util.today() })}
          ${F({ name: 'status', label: 'Situação', type: 'select', value: l.status || (tipo === 'receita' ? 'recebido' : 'pago'), options: tipo === 'receita' ? [['recebido', 'Recebido'], ['a_receber', 'A receber'], ['previsto', 'Previsto']] : [['pago', 'Pago'], ['a_pagar', 'A pagar'], ['previsto', 'Previsto']] })}
          ${F({ name: 'data', label: 'Data do pagamento/recebimento', type: 'date', value: l.data || ICM.util.today() })}
          ${tipo === 'despesa' ? F({ name: 'fornecedor_id', label: 'Fornecedor', type: 'select', value: l.fornecedor_id, options: [['', '—'], ...fornecedores.map(f => [f.id, f.nome])] }) : ''}
          ${F({ name: 'documento', label: 'Documento (NF, recibo, OB…)', value: l.documento })}
          ${F({ name: 'obs', label: 'Observações', value: l.obs, cls: tipo === 'despesa' ? '' : 'span-2' })}
          ${tipo === 'despesa' ? `<div class="span-all"><div class="row between"><span class="label">Rateio entre projetos (opcional)</span><button type="button" class="btn btn-sm" data-addr>${I('plus', 14)} Dividir entre projetos</button></div><div data-rat class="col mt-2"></div></div>` : ''}
          <div class="span-all row wrap"><label class="btn btn-sm">${I('upload', 14)} ${comprovante ? 'Trocar comprovante' : 'Anexar comprovante (NF, recibo)'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-comp hidden></label><span class="xs muted" data-cn>${comprovante ? esc(comprovante.nome) : 'Sem comprovante'}</span></div>
          <div class="span-all" data-nfe></div>
        </form>`,
        foot: `${l.id && ICM.auth.can('financeiro.aprovar') ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>`
      });
      const f = m.$('form');
      const drawR = () => { const box = m.$('[data-rat]'); if (!box) return; box.innerHTML = rateio.map((r, i) => `<div class="row"><select class="select" data-rp="${i}">${projetos.map(p => `<option value="${esc(p.id)}" ${p.id === r.projeto_id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select><input class="input" type="number" data-rpc="${i}" value="${r.pct}" style="width:90px"><span>%</span><button type="button" class="btn btn-icon btn-sm btn-ghost" data-rr="${i}">${I('x', 14)}</button></div>`).join('') + (rateio.length ? `<div class="xs ${rateio.reduce((s, r) => s + Number(r.pct || 0), 0) === 100 ? 'muted' : ''}" style="${rateio.reduce((s, r) => s + Number(r.pct || 0), 0) === 100 ? '' : 'color:var(--danger)'}">Total: ${rateio.reduce((s, r) => s + Number(r.pct || 0), 0)}%</div>` : '');
        box.querySelectorAll('[data-rp]').forEach(s => s.addEventListener('change', () => { rateio[+s.dataset.rp].projeto_id = s.value; }));
        box.querySelectorAll('[data-rpc]').forEach(s => s.addEventListener('input', () => { rateio[+s.dataset.rpc].pct = Number(s.value); drawR(); s.focus(); }));
        box.querySelectorAll('[data-rr]').forEach(s => s.addEventListener('click', () => { rateio.splice(+s.dataset.rr, 1); drawR(); })); };
      drawR();
      const ar = m.$('[data-addr]'); if (ar) ar.addEventListener('click', () => { rateio.push({ projeto_id: (projetos[rateio.length % projetos.length] || {}).id, pct: rateio.length ? 0 : 50 }); if (rateio.length === 1) rateio.push({ projeto_id: (projetos[1] || {}).id, pct: 50 }); drawR(); });
      m.$('[data-comp]').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; try { comprovante = await ICM.api.arquivos.salvar(file, { col: 'fin_lancamentos', id: l.id || 'novo' }); m.$('[data-cn]').textContent = comprovante.nome; } catch (er) { ui().toast(er.message, 'danger'); } });
      const xi = m.$('[data-xml]'); if (xi) xi.addEventListener('change', async () => {
        try {
          const nf = ICM.api.lerNFe(await xi.files[0].text());
          const fo = fornecedores.find(x => x.documento.replace(/\D/g, '') === nf.cnpj);
          f.descricao.value = f.descricao.value || `NF ${nf.numero} — ${nf.emitente}`; f.valor.value = nf.valor; f.documento.value = `NF ${nf.numero}`; f.data.value = nf.data; f.vencimento.value = f.vencimento.value || nf.data;
          if (fo) f.fornecedor_id.value = fo.id;
          m.$('[data-nfe]').innerHTML = `<div class="card flat"><div class="bold">${I('check', 14)} NF-e lida: ${esc(nf.emitente)} (CNPJ ${esc(nf.cnpj)}) — ${esc(money(nf.valor))}</div><div class="xs muted">Chave ${esc(nf.chave)}</div>${nf.itens.map(it => `<div class="xs">${esc(it.quantidade)} ${esc(it.unidade)} · ${esc(it.descricao)} — ${esc(money(it.total))}</div>`).join('')}${fo ? '' : `<div class="xs" style="color:var(--warn)">Fornecedor ainda não cadastrado — cadastre em Compras › Fornecedores.</div>`}</div>`;
          comprovante = await ICM.api.arquivos.salvar(xi.files[0], { col: 'fin_lancamentos', id: 'nfe' }).catch(() => comprovante);
          m.$('[data-cn]').textContent = `${comprovante ? comprovante.nome : ''} (XML da NF-e)`;
        } catch (e) { ui().toast(e.message, 'danger'); }
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(f);
        if (['a_pagar', 'a_receber', 'previsto'].includes(d.status)) d.data = '';
        await ui().run(() => ICM.api.financeiro.salvar({ ...l, ...d, tipo, rateio: rateio.length ? rateio : null, comprovante }), 'Lançamento salvo');
        m.close(); R[cur]();
      }).catch(() => { }));
      const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir lançamento', text: 'A exclusão fica registrada na auditoria.', ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.financeiro.remover(l.id), 'Excluído').catch(() => { }); m.close(); R[cur](); } });
    }

    async function conciliacao(contaId, linhas) {
      const itens = await ICM.api.financeiro.conciliar(contaId, linhas);
      const m = ui().modal({
        title: `Conciliação — ${(contas.find(c => c.id === contaId) || {}).nome}`, size: 'wide',
        body: `<p class="small muted mb-4">${itens.length} movimento(s) no extrato · ${itens.filter(i => i.sugestao).length} encontrado(s) no sistema · ${itens.filter(i => !i.sugestao).length} sem lançamento</p>
          <div class="table-wrap" style="max-height:460px;overflow:auto"><table class="table"><thead><tr><th>Extrato</th><th>Valor</th><th>No sistema</th><th>Ação</th></tr></thead><tbody>
          ${itens.map((x, i) => `<tr><td class="small"><b>${esc(fmtDate(x.data))}</b><div class="xs muted">${esc(x.descricao)}</div></td><td><b style="color:${x.tipo === 'receita' ? 'var(--ok)' : 'var(--danger)'}">${esc(money(x.valor))}</b></td>
            <td class="small">${x.sugestao ? `${I('check', 12)} ${esc(x.sugestao.descricao)}<div class="xs muted">${esc(fmtDate(x.sugestao.data))} · ${esc(x.sugestao.status)}</div>` : '<span class="badge warn">Não encontrado</span>'}</td>
            <td>${x.sugestao ? '<span class="badge ok">Conciliar</span>' : `<label class="check small"><input type="checkbox" data-criar="${i}" checked> Criar lançamento</label>`}</td></tr>`).join('')}
          </tbody></table></div>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Confirmar conciliação</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        m.$$('[data-criar]').forEach(cb => { itens[+cb.dataset.criar].criar = cb.checked; });
        const r = await ui().run(() => ICM.api.financeiro.confirmarConciliacao(contaId, itens));
        ui().toast(`${r.conferidos} conciliado(s) e ${r.criados} lançamento(s) criado(s)`, 'ok'); m.close(); ICM.app.reload();
      }).catch(() => { }));
    }
  };
  function mini(l, v) { return `<div class="card flat" style="padding:14px"><div class="xs muted bold">${esc(l)}</div><div class="bold" style="font-size:19px">${esc(v)}</div></div>`; }
})();
