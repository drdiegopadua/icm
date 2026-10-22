/* Estoque de material de consumo: uniformes, didático, limpeza, alimentação — entradas, saídas e destino por projeto */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money, num } = ICM.util;
  const ui = () => ICM.ui;
  const CAT = () => ICM.C.CATEGORIAS_ESTOQUE;
  const catChip = c => { const x = CAT()[c] || CAT().outro; return `<span class="area-chip" style="--c:${x.cor}">${esc(x.nome)}</span>`; };
  const nomeItem = i => `${i.nome}${i.variacao ? ` — ${i.variacao}` : ''}`;

  ICM.pages.estoque = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Estoque de consumo']]);
    const itens = await ICM.api.estoque.itens();
    const ym = ICM.util.today().slice(0, 7);
    const movMes = await ICM.api.estoque.movimentos({ de: `${ym}-01`, ate: `${ym}-31` });
    const podeMov = ICM.auth.can('estoque.movimentar');
    const abaixo = itens.filter(i => i.abaixo);
    const valor = itens.reduce((s, i) => s + Math.max(0, i.saldo) * i.custo_medio, 0);
    const tab0 = query.get('tab') || 'itens';

    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Estoque de consumo</h1><div class="page-sub">Uniformes, material didático, limpeza e alimentação — com entrada, saída e destino por projeto</div></div>
        <div class="row wrap">${podeMov ? `<button class="btn" data-ent>${I('download', 18)} Entrada</button><button class="btn btn-primary" data-sai>${I('upload', 18)} Saída / entrega</button>` : ''}${ICM.auth.can('estoque.editar') ? `<button class="btn" data-novo>${I('plus', 18)} Novo item</button>` : ''}</div></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('layers', '#2563eb', itens.length, 'Itens cadastrados')}
        ${ICM.pages._stat('alert', '#ef4444', abaixo.length, 'Abaixo do estoque mínimo')}
        ${ICM.pages._stat('download', '#10b981', movMes.filter(m => m.tipo === 'entrada').length, `Entradas em ${ICM.util.MESES[+ym.slice(5) - 1]}`)}
        ${ICM.pages._stat('dollar', '#8b5cf6', Math.round(valor), 'Valor em estoque (R$)')}
      </div>
      ${abaixo.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.3),var(--sh-out)"><div class="card-title mb-4">${I('alert', 18)} Repor estoque</div><div class="row wrap">${abaixo.map(i => `<span class="badge danger">${esc(nomeItem(i))}: ${num(i.saldo)} ${esc(i.unidade)} (mín. ${i.estoque_minimo})</span>`).join('')}</div></div>` : ''}
      <div class="tabs mb-4">${[['itens', 'Itens e saldos', 'grid'], ['mov', 'Movimentações', 'refresh'], ['rel', 'Relatórios', 'fileText']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;

    const panel = el.querySelector('[data-panel]');
    const R = {
      itens() {
        let cat = '';
        panel.innerHTML = `<div class="card tab-panel"><div class="segmented mb-4" data-cat><button data-v="" class="active">Todos</button>${Object.entries(CAT()).map(([k, v]) => `<button data-v="${k}">${esc(v.nome.split(' ')[0])}</button>`).join('')}</div><div data-l></div></div>`;
        const draw = () => {
          const l = itens.filter(i => !cat || i.categoria === cat);
          panel.querySelector('[data-l]').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Item</th><th>Categoria</th><th>Local</th><th>Saldo</th><th>Mínimo</th><th>Custo médio</th></tr></thead><tbody>
            ${l.map(i => { const pc = i.estoque_minimo ? Math.min(100, i.saldo / (i.estoque_minimo * 3) * 100) : 100; return `<tr class="clickable" data-id="${esc(i.id)}"><td class="small bold">${esc(i.codigo)}</td><td><b>${esc(i.nome)}</b>${i.variacao ? `<div class="xs muted">${esc(i.variacao)}</div>` : ''}</td><td>${catChip(i.categoria)}</td><td class="small">${esc(i.local || '')}</td>
              <td><div class="row" style="gap:8px"><b style="${i.abaixo ? 'color:var(--danger)' : ''}">${num(i.saldo)} ${esc(i.unidade)}</b><div class="progress ${i.abaixo ? 'danger' : 'ok'}" style="width:70px"><span style="width:${pc}%"></span></div></div></td>
              <td class="small">${i.estoque_minimo} ${esc(i.unidade)}</td><td class="small">${esc(money(i.custo_medio))}</td></tr>`; }).join('')}
          </tbody></table></div>`;
          panel.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => kardex(tr.dataset.id)));
        };
        panel.querySelectorAll('[data-cat] button').forEach(b => b.addEventListener('click', () => { panel.querySelectorAll('[data-cat] button').forEach(x => x.classList.toggle('active', x === b)); cat = b.dataset.v; draw(); }));
        draw();
      },
      async mov() {
        const l = await ICM.api.estoque.movimentos();
        const projetos = await ICM.api.raw('projetos'); const alunos = await ICM.api.raw('alunos');
        panel.innerHTML = `<div class="card tab-panel">${tabelaMov(l, projetos, alunos)}</div>`;
      },
      rel() {
        const card = ICM.pages._repCard;
        panel.innerHTML = `<div class="grid grid-3 tab-panel">${card('Posição de estoque', 'Saldo atual de todos os itens, valor e itens a repor.', 'grid', '#2563eb', 'estoque_posicao')}${card('Consumo por projeto', 'Saídas do período por projeto e item, com valor — para a prestação de contas.', 'folder', '#10b981', 'estoque_consumo')}${card('Entrega de uniformes', 'Lista de alunos que receberam uniforme, com data e tamanho.', 'user', '#f97316', 'estoque_uniformes')}</div>`;
        panel.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => ICM.reports.openDialog(c.dataset.rep)));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    const on = (s, fn) => { const b = el.querySelector(s); if (b) b.addEventListener('click', fn); };
    on('[data-ent]', () => movModal('entrada'));
    on('[data-sai]', () => movModal('saida'));
    on('[data-novo]', () => itemForm());
    await R[tab0]();

    async function kardex(id) {
      const i = await ICM.api.estoque.item(id);
      const projetos = await ICM.api.raw('projetos'); const alunos = await ICM.api.raw('alunos');
      const m = ui().modal({
        title: `${i.codigo} — ${nomeItem(i)}`, size: 'wide',
        body: `<div class="grid grid-4 mb-4">${mini('Saldo', `${num(i.saldo)} ${i.unidade}`)}${mini('Mínimo', `${i.estoque_minimo} ${i.unidade}`)}${mini('Custo médio', money(i.custo_medio))}${mini('Local', i.local || '—')}</div>${tabelaMov(i.kardex.map(k => ({ ...k, item: i })), projetos, alunos, true)}`,
        foot: `${ICM.auth.can('estoque.editar') ? `<button class="btn" data-edit style="margin-right:auto">${I('edit', 16)} Editar item</button>` : ''}${podeMov ? `<button class="btn" data-aj>Ajuste de inventário</button><button class="btn" data-e>${I('download', 16)} Entrada</button><button class="btn btn-primary" data-s>${I('upload', 16)} Saída</button>` : ''}<button class="btn" data-close>Fechar</button>`
      });
      const o = (s, fn) => { const b = m.$(s); if (b) b.addEventListener('click', () => { m.close(); fn(); }); };
      o('[data-edit]', () => itemForm(i)); o('[data-e]', () => movModal('entrada', id)); o('[data-s]', () => movModal('saida', id)); o('[data-aj]', () => movModal('ajuste', id));
    }

    async function movModal(tipo, itemId) {
      const F = o => ui().field(o);
      const projetos = await ICM.api.projetos.list(); const turmas = await ICM.api.turmas.list(); const alunos = await ICM.api.alunos.list({ status: 'ativo' });
      const tt = { entrada: 'Entrada no estoque', saida: 'Saída / entrega', ajuste: 'Ajuste de inventário' }[tipo];
      const m = ui().modal({
        title: tt,
        body: `<form class="grid grid-2">
          ${F({ name: 'item_id', label: 'Item', type: 'select', value: itemId, options: [['', 'Selecione…'], ...itens.map(i => [i.id, `${nomeItem(i)} (saldo ${num(i.saldo)} ${i.unidade})`])], cls: 'span-2' })}
          ${F({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}
          ${F({ name: 'quantidade', label: tipo === 'ajuste' ? 'Quantidade (+ ou −)' : 'Quantidade', type: 'number', attrs: tipo === 'ajuste' ? 'step="1"' : 'min="1" step="1"' })}
          ${tipo === 'entrada' ? `${F({ name: 'origem', label: 'Origem', type: 'select', options: [['compra', 'Compra'], ['doacao', 'Doação'], ['devolucao', 'Devolução']] })}${F({ name: 'valor_unitario', label: 'Valor unitário (R$)', type: 'number', attrs: 'min="0" step="0.01"' })}${F({ name: 'fornecedor', label: 'Fornecedor / doador' })}${F({ name: 'nota_fiscal', label: 'Nota fiscal' })}${F({ name: 'projeto_id', label: 'Comprado com recurso do projeto', type: 'select', options: [['', 'Recursos próprios'], ...projetos.map(p => [p.id, p.nome])], cls: 'span-2' })}` : ''}
          ${tipo === 'saida' ? `${F({ name: 'projeto_id', label: 'Destino — projeto', type: 'select', options: [['', 'Uso institucional'], ...projetos.map(p => [p.id, p.nome])] })}${F({ name: 'turma_id', label: 'Turma (opcional)', type: 'select', options: [['', '—'], ...turmas.map(t => [t.id, t.nome])] })}${F({ name: 'aluno_id', label: 'Entregue ao aluno (uniforme, kit)', type: 'select', options: [['', '—'], ...alunos.map(a => [a.id, a.nome])] })}${F({ name: 'destinatario', label: 'Ou entregue a (colaborador/setor)' })}` : ''}
          ${F({ name: 'obs', label: tipo === 'ajuste' ? 'Motivo do ajuste' : 'Observações', cls: 'span-2', required: tipo === 'ajuste' })}
        </form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Registrar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        await ui().run(() => ICM.api.estoque.movimentar({ ...ICM.util.formData(m.$('form')), tipo }), 'Movimentação registrada');
        m.close(); ICM.app.reload();
      }).catch(() => { }));
    }

    function itemForm(i = {}) {
      const F = o => ui().field(o);
      const m = ui().modal({
        title: i.id ? `Editar ${i.codigo}` : 'Novo item de estoque',
        body: `<form class="grid grid-2">${F({ name: 'nome', label: 'Nome', value: i.nome, required: true, cls: 'span-2', placeholder: 'Ex.: Camiseta do uniforme, Detergente 500 ml' })}
          ${F({ name: 'variacao', label: 'Variação (tamanho, cor…)', value: i.variacao })}${F({ name: 'categoria', label: 'Categoria', type: 'select', value: i.categoria, options: Object.entries(CAT()).map(([k, v]) => [k, v.nome]) })}
          ${F({ name: 'unidade', label: 'Unidade', type: 'select', value: i.unidade || 'un', options: ICM.C.UNIDADES })}${F({ name: 'estoque_minimo', label: 'Estoque mínimo', type: 'number', value: i.estoque_minimo ?? 0, attrs: 'min="0"' })}
          ${F({ name: 'local', label: 'Local de guarda', value: i.local || 'Almoxarifado', cls: 'span-2' })}</form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.estoque.salvarItem(i.id ? { ...i, ...ICM.util.formData(m.$('form')), saldo: undefined, custo_medio: undefined, kardex: undefined, abaixo: undefined } : ICM.util.formData(m.$('form'))), 'Item salvo'); m.close(); ICM.app.reload(); }).catch(() => { }));
    }
  };

  function tabelaMov(l, projetos, alunos, comSaldo) {
    if (!l.length) return ui().empty('Nenhuma movimentação', 'refresh');
    return `<div class="table-wrap" style="max-height:520px;overflow:auto"><table class="table"><thead><tr><th>Data</th>${comSaldo ? '' : '<th>Item</th>'}<th>Tipo</th><th>Qtd.</th><th>Origem / destino</th><th>Por</th>${comSaldo ? '<th>Saldo</th>' : ''}</tr></thead><tbody>
      ${l.map(m => { const p = projetos.find(x => x.id === m.projeto_id); const a = alunos.find(x => x.id === m.aluno_id); return `<tr><td class="small">${esc(fmtDate(m.data))}</td>${comSaldo ? '' : `<td><b>${esc(nomeItem(m.item))}</b></td>`}
        <td>${m.tipo === 'entrada' ? ui().badge('Entrada', 'ok') : m.tipo === 'saida' ? ui().badge('Saída', 'warn') : ui().badge('Ajuste', 'neutral')}</td>
        <td><b>${m.tipo === 'saida' ? '−' : m.quantidade > 0 ? '+' : ''}${num(Math.abs(m.quantidade))}</b></td>
        <td class="small">${m.tipo === 'entrada' ? `${esc(m.origem || '')}${m.fornecedor ? ' · ' + esc(m.fornecedor) : ''}${m.nota_fiscal ? ' · ' + esc(m.nota_fiscal) : ''}${m.valor_unitario ? ' · ' + esc(money(m.valor_unitario)) + '/un' : ''}${p ? ` · <b>${esc(p.nome)}</b>` : ''}` : `${p ? `<b>${esc(p.nome)}</b>` : 'Institucional'}${a ? ` · aluno: <a href="#/alunos/${esc(a.id)}">${esc(a.nome)}</a>` : ''}${m.destinatario ? ' · ' + esc(m.destinatario) : ''}`}${m.obs ? `<div class="xs muted">${esc(m.obs)}</div>` : ''}</td>
        <td class="xs muted">${esc(m.usuario || '')}</td>${comSaldo ? `<td class="bold">${num(m.saldo_apos)}</td>` : ''}</tr>`; }).join('')}
    </tbody></table></div>`;
  }
  function mini(l, v) { return `<div class="card flat" style="padding:14px"><div class="xs muted bold">${esc(l)}</div><div class="bold" style="font-size:18px">${esc(v)}</div></div>`; }
})();
