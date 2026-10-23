/* Patrimônio: inventário de bens, empréstimos e devoluções */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money, num } = ICM.util;
  const ui = () => ICM.ui;
  const CAT = () => ICM.C.CATEGORIAS_PAT;

  const catChip = c => { const x = CAT()[c] || CAT().outro; return `<span class="area-chip" style="--c:${x.cor}">${esc(x.nome)}</span>`; };
  const sitBadge = s => { const x = ICM.C.SITUACAO_PAT[s] || { nome: s, cls: 'neutral' }; return ui().badge(x.nome, x.cls, true); };
  const empStatus = e => e.status === 'devolvido' ? ui().badge('Devolvido', 'ok', true) : e.status === 'extraviado' ? ui().badge('Extraviado', 'danger', true) : e.atrasado ? `<span class="alert-pill danger">${I('alert', 14)} Atrasado</span>` : ui().badge('Emprestado', '', true);

  // ================= Página principal =================
  ICM.pages.patrimonio = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Patrimônio']]);
    const tab0 = query.get('tab') || 'inventario';
    const itens = await ICM.api.patrimonio.list();
    const ativos = await ICM.api.emprestimos.list({ status: 'ativo' });
    const atrasados = ativos.filter(e => e.atrasado);
    const valores = ICM.auth.can('patrimonio.valores');
    const totalUn = itens.filter(i => i.situacao !== 'baixado').reduce((s, i) => s + i.quantidade, 0);
    const valorTotal = itens.filter(i => i.situacao !== 'baixado').reduce((s, i) => s + i.quantidade * (i.valor_unitario || 0), 0);

    el.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1 class="page-title">Patrimônio</h1><div class="page-sub">Inventário de bens, empréstimos a alunos, colaboradores e terceiros, com termos</div></div>
        <div class="row wrap">
          ${ICM.auth.can('patrimonio.emprestar') ? `<button class="btn btn-primary" data-emprestar>${I('download', 18)} Novo empréstimo</button>` : ''}
          ${ICM.auth.can('patrimonio.editar') ? `<button class="btn" data-novo>${I('plus', 18)} Cadastrar bem</button>` : ''}
        </div>
      </div>
      <div class="grid grid-4 stagger mb-4">
        ${stat('layers', '#2563eb', itens.filter(i => i.situacao !== 'baixado').length, 'Itens cadastrados')}
        ${stat('grid', '#8b5cf6', totalUn, 'Unidades no inventário')}
        ${stat('download', '#0891b2', ativos.reduce((s, e) => s + e.quantidade, 0), `Unidades emprestadas (${ativos.length} termos)`)}
        ${valores ? stat('dollar', '#10b981', Math.round(valorTotal), 'Valor patrimonial (R$)') : stat('alert', '#ef4444', atrasados.length, 'Empréstimos atrasados')}
      </div>
      ${atrasados.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.35),var(--sh-out)"><div class="card-head"><div class="card-title">${I('alert', 18)} ${atrasados.length} empréstimo(s) com devolução atrasada</div></div>
        ${atrasados.map(e => `<div class="list-item">${ICM.util.avatar(e.tomador, null, 'sm')}<div class="grow"><b>${esc(e.tomador)}</b> — ${e.quantidade}x ${esc(e.item.nome)}<div class="xs muted">${esc(e.numero)} · deveria voltar em ${esc(fmtDate(e.previsao_devolucao))} · ${esc(e.contato || '')}</div></div>${ICM.auth.can('patrimonio.emprestar') ? `<button class="btn btn-sm" data-dev="${esc(e.id)}">${I('upload', 14)} Registrar devolução</button>` : ''}</div>`).join('')}</div>` : ''}
      <div class="tabs mb-4">${[['inventario', 'Inventário', 'grid'], ['emprestimos', 'Empréstimos', 'download'], ['relatorios', 'Relatórios e termos', 'fileText']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div>
    </div>`;

    const panel = el.querySelector('[data-panel]');
    const R = {
      async inventario() {
        let cat = '', q = '', sit = '';
        panel.innerHTML = `<div class="card tab-panel">
          <div class="row wrap between mb-4">
            <div class="row wrap">
              <select class="select" data-cat style="width:220px"><option value="">Todas as categorias</option>${Object.entries(CAT()).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('')}</select>
              <select class="select" data-sit style="width:180px"><option value="">Todas as situações</option>${Object.entries(ICM.C.SITUACAO_PAT).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('')}</select>
            </div>
            <div class="input-icon" style="width:280px">${I('search', 18)}<input class="input" data-q placeholder="Nome, tombo, marca, nº de série, local"></div>
          </div><div data-l></div></div>`;
        const draw = () => {
          const l = itens.filter(i => (!cat || i.categoria === cat) && (!sit || i.situacao === sit) && (!q || [i.nome, i.tombo, i.marca, i.modelo, i.numero_serie, i.local].join(' ').toLowerCase().includes(q)));
          panel.querySelector('[data-l]').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Tombo</th><th>Bem</th><th>Categoria</th><th>Local</th><th style="text-align:center">Qtd.</th><th>Disponível</th><th>Estado</th>${valores ? '<th>Valor total</th>' : ''}<th>Situação</th></tr></thead><tbody>
            ${l.map(i => `<tr class="clickable" data-href="#/patrimonio/${esc(i.id)}"><td class="small bold" style="white-space:nowrap">${esc(i.tombo)}</td>
              <td><b>${esc(i.nome)}</b><div class="xs muted">${esc([i.marca, i.modelo].filter(Boolean).join(' · '))}</div></td>
              <td>${catChip(i.categoria)}</td><td class="small">${esc(i.local || '')}</td><td style="text-align:center"><b>${i.quantidade}</b></td>
              <td>${i.emprestavel ? `<div class="row" style="gap:6px"><div class="progress" style="width:70px"><span style="width:${i.quantidade ? i.disponivel / i.quantidade * 100 : 0}%"></span></div><span class="xs bold">${i.disponivel}/${i.quantidade}</span></div>` : '<span class="xs muted">Uso interno</span>'}</td>
              <td class="small">${esc(ICM.C.ESTADOS_PAT[i.estado] || '')}</td>
              ${valores ? `<td class="small">${esc(money(i.quantidade * (i.valor_unitario || 0)))}</td>` : ''}
              <td>${sitBadge(i.situacao)}</td></tr>`).join('')}
          </tbody></table></div><div class="xs muted mt-2">${l.length} item(ns) · ${l.reduce((s, i) => s + i.quantidade, 0)} unidade(s)</div>` : ui().empty('Nenhum bem encontrado', 'grid');
          panel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
        };
        panel.querySelector('[data-cat]').addEventListener('change', e => { cat = e.target.value; draw(); });
        panel.querySelector('[data-sit]').addEventListener('change', e => { sit = e.target.value; draw(); });
        panel.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { q = e.target.value.toLowerCase(); draw(); }, 200));
        draw();
      },

      async emprestimos() {
        let st = 'ativo';
        panel.innerHTML = `<div class="card tab-panel">
          <div class="segmented mb-4" data-st>${[['ativo', 'Em aberto'], ['atrasado', 'Atrasados'], ['devolvido', 'Devolvidos'], ['extraviado', 'Extraviados'], ['', 'Todos']].map(([v, t]) => `<button data-v="${v}" class="${v === st ? 'active' : ''}">${t}</button>`).join('')}</div>
          <div data-l></div></div>`;
        const draw = async () => {
          const l = await ICM.api.emprestimos.list({ status: st });
          panel.querySelector('[data-l]').innerHTML = empTable(l);
          bindEmpTable(panel, R.emprestimos);
        };
        panel.querySelectorAll('[data-st] button').forEach(b => b.addEventListener('click', () => { panel.querySelectorAll('[data-st] button').forEach(x => x.classList.toggle('active', x === b)); st = b.dataset.v; draw(); }));
        await draw();
      },

      async relatorios() {
        const card = ICM.pages._repCard;
        panel.innerHTML = `<div class="grid grid-3 tab-panel">
          ${card('Inventário patrimonial', 'Todos os bens por categoria, com tombo, local, estado, origem (projeto/recurso), nota fiscal e valores.', 'grid', '#2563eb', 'inventario')}
          ${card('Relatório de empréstimos', 'Empréstimos do período: em aberto, atrasados, devolvidos e extraviados, por tomador e por bem.', 'download', '#0891b2', 'emprestimos')}
          ${card('Bens por projeto', 'Bens adquiridos com recursos de cada projeto — anexo para a prestação de contas.', 'folder', '#10b981', 'por_projeto')}
        </div>
        <div class="card mt-4 small muted">${I('info', 16)} O <b>Termo de Empréstimo</b> e o <b>Termo de Devolução e Recebimento</b> são gerados automaticamente ao registrar cada empréstimo e devolução, e podem ser reimpressos pela lista de empréstimos.</div>`;
        panel.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => ICM.reports.openDialog('pat_' + c.dataset.rep)));
      }
    };

    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    const be = el.querySelector('[data-emprestar]'); if (be) be.addEventListener('click', () => emprestarModal({}));
    const bn = el.querySelector('[data-novo]'); if (bn) bn.addEventListener('click', () => itemForm());
    el.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => devolverModal(b.dataset.dev)));
    await R[tab0]();
  };

  // ================= Detalhe do bem =================
  ICM.pages.patrimonioItem = async function (el, params) {
    const i = await ICM.api.patrimonio.get(params.id);
    if (!i) { el.innerHTML = ui().empty('Bem não encontrado', 'grid'); return; }
    ICM.app.setCrumbs([['Patrimônio', '#/patrimonio'], [`${i.tombo} — ${i.nome}`]]);
    const projetos = await ICM.api.raw('projetos');
    const p = projetos.find(x => x.id === i.projeto_id);
    const emps = await ICM.api.emprestimos.list({ item_id: i.id });
    const c = CAT()[i.categoria] || CAT().outro;
    const valores = ICM.auth.can('patrimonio.valores');
    const edit = ICM.auth.can('patrimonio.editar');

    el.innerHTML = `<div class="page">
      <div class="card mb-4 project-card" style="--c:${c.cor};cursor:default">
        <div class="row between wrap">
          <div class="row"><div class="stat"><div class="ic" style="--c:${c.cor}">${I(c.icon, 24)}</div></div>
            <div><div class="row wrap">${catChip(i.categoria)}${sitBadge(i.situacao)}<span class="badge neutral">${esc(i.tombo)}</span>${i.emprestavel ? ui().badge('Emprestável', 'ok') : ui().badge('Uso interno', 'neutral')}</div>
              <h1 class="page-title mt-2" style="font-size:28px">${esc(i.nome)}</h1><div class="small muted">${esc([i.marca, i.modelo, i.numero_serie && 'Série ' + i.numero_serie].filter(Boolean).join(' · '))}</div></div></div>
          <div class="row wrap">
            ${i.emprestavel && i.disponivel && ICM.auth.can('patrimonio.emprestar') ? `<button class="btn btn-primary" data-emp>${I('download', 18)} Emprestar</button>` : ''}
            ${edit ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button><button class="btn" data-reg>${I('history', 18)} Registrar ocorrência</button>` : ''}
          </div>
        </div>
        <div class="grid grid-4 mt-4">
          ${mini('Quantidade', i.quantidade, 'layers')}${mini('Emprestadas', i.emprestados, 'download')}${mini('Disponíveis', i.disponivel, 'check')}${mini('Estado', ICM.C.ESTADOS_PAT[i.estado] || '—', 'info')}
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('info', 18)} Dados do bem</div>
          ${ui().kv([['Local', i.local], ['Projeto / origem', p ? p.nome : 'Recursos próprios / doação'], ['Fonte do recurso', p ? ICM.C.FONTES[p.fonte] : ''], ['Data de aquisição', fmtDate(i.data_aquisicao)],
            ...(valores ? (dp => [['Valor unitário', i.valor_unitario ? money(i.valor_unitario) : ''], ['Valor total (aquisição)', i.valor_unitario ? money(i.valor_unitario * i.quantidade) : ''], ['Depreciação acumulada', dp.total ? `${money(dp.depreciado)} (${dp.pct}% · vida útil ${dp.vida} anos)` : ''], ['Valor contábil hoje', dp.total ? money(dp.contabil) : ''], ['Nota fiscal', i.nota_fiscal], ['Fornecedor', i.fornecedor]])(ICM.api.depreciacao(i)) : []),
            ['Observações', i.observacoes]])}</div>
        <div class="card"><div class="section-title">${I('history', 18)} Histórico do bem</div>
          ${(i.historico || []).length ? `<div class="timeline">${[...i.historico].reverse().map(h => `<div class="tl-item"><div class="tl-dot" style="--c:${{ baixa: '#64748b', manutencao: '#f59e0b', avaria: '#ef4444', extravio: '#ef4444', entrada: '#10b981' }[h.tipo] || '#2563eb'}">${I({ baixa: 'trash', manutencao: 'settings', avaria: 'alert', extravio: 'alert', entrada: 'plus' }[h.tipo] || 'info', 14)}</div><div class="tl-card"><div class="tl-date">${esc(fmtDate(h.data))} · ${esc(h.usuario || '')}</div><div class="tl-title" style="text-transform:capitalize">${esc(h.tipo)}</div><div class="tl-desc">${esc(h.descricao)}</div></div></div>`).join('')}</div>` : ui().empty('Sem ocorrências registradas', 'history')}</div>
        <div class="card span-all"><div class="section-title">${I('download', 18)} Empréstimos deste bem</div>${empTable(emps)}</div>
      </div></div>`;
    bindEmpTable(el, () => ICM.app.reload());
    const be = el.querySelector('[data-emp]'); if (be) be.addEventListener('click', () => emprestarModal({ item_id: i.id }));
    const bed = el.querySelector('[data-edit]'); if (bed) bed.addEventListener('click', () => itemForm(i));
    const br = el.querySelector('[data-reg]'); if (br) br.addEventListener('click', () => registrarModal(i));
  };

  // ================= Tabela de empréstimos (reutilizada) =================
  function empTable(l) {
    if (!l.length) return ui().empty('Nenhum empréstimo', 'download');
    const pode = ICM.auth.can('patrimonio.emprestar');
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Bem</th><th>Tomador</th><th>Saída</th><th>Devolução</th><th>Situação</th><th></th></tr></thead><tbody>
      ${l.map(e => `<tr><td class="small bold" style="white-space:nowrap">${esc(e.numero)}</td>
        <td><b>${e.quantidade}x ${esc(e.item.nome)}</b><div class="xs muted">${esc(e.item.tombo)}</div></td>
        <td>${e.tipo_tomador === 'aluno' ? `<a href="#/alunos/${esc(e.aluno_id)}"><b>${esc(e.tomador)}</b></a>` : `<b>${esc(e.tomador)}</b>`}<div class="xs muted">${esc(ICM.C.TIPOS_TOMADOR[e.tipo_tomador])}${e.responsavel ? ' · resp.: ' + esc(e.responsavel) : ''}</div></td>
        <td class="small">${esc(fmtDate(e.data_saida))}</td>
        <td class="small">${e.data_devolucao ? esc(fmtDate(e.data_devolucao)) : `prev. ${esc(fmtDate(e.previsao_devolucao))}`}</td>
        <td>${empStatus(e)}${e.termo_assinado ? '' : `<div class="xs" style="color:var(--danger)">Termo não assinado</div>`}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-sm btn-ghost" data-termo="${esc(e.id)}" title="Termo de empréstimo">${I('fileText', 15)} Termo</button>
          ${e.status !== 'ativo' ? `<button class="btn btn-sm btn-ghost" data-recibo="${esc(e.id)}" title="Termo de devolução">${I('clipboardCheck', 15)} Recebimento</button>` : pode ? `<button class="btn btn-sm" data-dev="${esc(e.id)}">${I('upload', 15)} Devolver</button>` : ''}
        </td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function bindEmpTable(root, after) {
    root.querySelectorAll('[data-termo]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('termo_emprestimo', { emprestimo_id: b.dataset.termo })));
    root.querySelectorAll('[data-recibo]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('termo_devolucao', { emprestimo_id: b.dataset.recibo })));
    root.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => devolverModal(b.dataset.dev, after)));
  }

  // ================= Modais =================
  async function itemForm(i = {}) {
    const F = o => ui().field(o);
    const projetos = await ICM.api.projetos.list();
    const m = ui().modal({
      title: i.id ? `Editar ${i.tombo}` : 'Cadastrar bem', size: 'wide',
      body: `<form class="grid grid-3">
        ${F({ name: 'nome', label: 'Nome do bem', value: i.nome, required: true, cls: 'span-2', placeholder: 'Ex.: Violino 4/4, Ar-condicionado 12.000 BTUs' })}
        ${F({ name: 'categoria', label: 'Categoria', type: 'select', value: i.categoria, options: Object.entries(CAT()).map(([k, v]) => [k, v.nome]) })}
        ${F({ name: 'quantidade', label: 'Quantidade', type: 'number', value: i.quantidade || 1, attrs: 'min="1"', hint: 'Itens iguais podem ser cadastrados em lote (ex.: 10 kimonos).' })}
        ${F({ name: 'marca', label: 'Marca', value: i.marca })}
        ${F({ name: 'modelo', label: 'Modelo', value: i.modelo })}
        ${F({ name: 'numero_serie', label: 'Nº de série', value: i.numero_serie })}
        ${F({ name: 'local', label: 'Localização', value: i.local, placeholder: 'Sala, almoxarifado…' })}
        ${F({ name: 'estado', label: 'Estado de conservação', type: 'select', value: i.estado || 'bom', options: Object.entries(ICM.C.ESTADOS_PAT) })}
        ${F({ name: 'projeto_id', label: 'Adquirido com recurso do projeto', type: 'select', value: i.projeto_id, options: [['', 'Recursos próprios / doação'], ...projetos.map(p => [p.id, p.nome])] })}
        ${F({ name: 'data_aquisicao', label: 'Data de aquisição', type: 'date', value: i.data_aquisicao })}
        ${F({ name: 'valor_unitario', label: 'Valor unitário (R$)', type: 'number', value: i.valor_unitario, attrs: 'min="0" step="0.01"' })}
        ${F({ name: 'nota_fiscal', label: 'Nota fiscal', value: i.nota_fiscal })}
        ${F({ name: 'fornecedor', label: 'Fornecedor / doador', value: i.fornecedor, cls: 'span-2' })}
        ${F({ name: 'emprestavel', label: 'Pode ser emprestado (alunos/terceiros)', type: 'toggle', value: i.emprestavel })}
        ${F({ name: 'observacoes', label: 'Observações', type: 'textarea', value: i.observacoes, cls: 'span-all', rows: 2 })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const r = await ui().run(() => ICM.api.patrimonio.save(i.id ? { ...i, ...d } : d), i.id ? 'Bem atualizado' : 'Bem cadastrado no inventário');
      m.close(); location.hash = `#/patrimonio/${r.id}`; ICM.app.reload();
    }).catch(() => { }));
  }

  function registrarModal(i) {
    const F = o => ui().field(o);
    const m = ui().modal({
      title: `Registrar ocorrência — ${i.tombo}`, size: 'sm',
      body: `<form class="col">
        ${F({ name: 'tipo', label: 'Tipo', type: 'select', options: [['manutencao', 'Envio para manutenção'], ['retorno', 'Retorno da manutenção'], ['avaria', 'Avaria / dano'], ['transferencia', 'Mudança de local'], ['baixa', 'Baixa patrimonial (descarte, furto, doação)']] })}
        ${F({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}
        ${F({ name: 'estado', label: 'Estado após ocorrência', type: 'select', value: i.estado, options: Object.entries(ICM.C.ESTADOS_PAT) })}
        ${F({ name: 'local', label: 'Novo local (se mudou)', value: '' })}
        ${F({ name: 'descricao', label: 'Descrição', type: 'textarea', rows: 3, required: true, placeholder: 'O que aconteceu, quem autorizou, nº de B.O. ou orçamento…' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Registrar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const situacao = { manutencao: 'manutencao', retorno: 'ativo', baixa: 'baixado' }[d.tipo];
      if (d.tipo === 'baixa' && !(await ui().confirm({ title: 'Confirmar baixa', text: 'A baixa retira o bem do inventário ativo (fica no histórico). Confirmar?', ok: 'Dar baixa', danger: true }))) return;
      await ui().run(async () => {
        await ICM.api.patrimonio.registrar(i.id, { ...d, situacao });
        if (d.local) await ICM.api.patrimonio.save({ ...(await ICM.api.patrimonio.get(i.id)), local: d.local });
      }, 'Ocorrência registrada');
      m.close(); ICM.app.reload();
    }).catch(() => { }));
  }

  async function emprestarModal(preset) {
    const F = o => ui().field(o);
    const itens = (await ICM.api.patrimonio.list()).filter(i => i.emprestavel && i.disponivel > 0);
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const users = (await ICM.api.usuarios.list()).filter(u => u.ativo);
    const hoje = ICM.util.today();
    const m = ui().modal({
      title: 'Novo empréstimo', size: 'wide',
      body: `<form class="grid grid-3">
        <div class="span-all section-title">${I('grid', 18)} Bem emprestado</div>
        ${F({ name: 'item_id', label: 'Bem', type: 'select', value: preset.item_id, options: [['', 'Selecione…'], ...itens.map(i => [i.id, `${i.tombo} — ${i.nome} (${i.disponivel} disponível)`])], cls: 'span-2' })}
        ${F({ name: 'quantidade', label: 'Quantidade', type: 'number', value: 1, attrs: 'min="1"' })}
        ${F({ name: 'estado_saida', label: 'Estado na saída', type: 'select', value: 'bom', options: Object.entries(ICM.C.ESTADOS_PAT).filter(([k]) => k !== 'inservivel') })}
        ${F({ name: 'data_saida', label: 'Data de saída', type: 'date', value: hoje })}
        ${F({ name: 'previsao_devolucao', label: 'Devolução prevista', type: 'date', value: ICM.util.addDays(hoje, 30), required: true })}
        ${F({ name: 'finalidade', label: 'Finalidade', value: preset.finalidade || '', cls: 'span-all', placeholder: 'Ex.: estudo em casa, evento da associação, treino…' })}
        <div class="span-all section-title mt-4">${I('user', 18)} Quem está levando</div>
        <div class="span-all segmented" data-tipo>${Object.entries(ICM.C.TIPOS_TOMADOR).map(([k, v], n) => `<button type="button" data-v="${k}" class="${n === 0 ? 'active' : ''}">${esc(v)}</button>`).join('')}</div>
        <div class="span-all" data-t="aluno">
          ${F({ name: 'aluno_id', label: 'Aluno(a)', type: 'select', options: [['', 'Selecione…'], ...alunos.map(a => [a.id, `${a.nome} — ${a.matricula}`])] })}
          <div class="xs muted mt-2" data-resp></div>
        </div>
        <div class="span-all" data-t="colaborador" hidden>${F({ name: 'colaborador_id', label: 'Colaborador(a)', type: 'select', options: [['', 'Selecione…'], ...users.map(u => [u.id, u.nome])] })}</div>
        <div class="span-all grid grid-3" data-t="terceiro" hidden>
          ${F({ name: 'terceiro.nome', label: 'Nome / instituição', cls: 'span-2' })}
          ${F({ name: 'terceiro.documento', label: 'CPF / CNPJ', placeholder: 'Obrigatório' })}
          ${F({ name: 'terceiro.responsavel', label: 'Responsável (se instituição)' })}
          ${F({ name: 'terceiro.telefone', label: 'Telefone' })}
          ${F({ name: 'terceiro.endereco', label: 'Endereço' })}
        </div>
        ${F({ name: 'termo_assinado', label: 'Termo de empréstimo assinado (gerado ao salvar)', type: 'toggle', value: true, cls: 'span-all' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('fileText', 18)} Registrar e gerar termo</button>`
    });
    let tipo = 'aluno';
    m.$$('[data-tipo] button').forEach(b => b.addEventListener('click', () => {
      tipo = b.dataset.v; m.$$('[data-tipo] button').forEach(x => x.classList.toggle('active', x === b));
      m.$$('[data-t]').forEach(s => { s.hidden = s.dataset.t !== tipo; });
    }));
    const selA = m.$('[name=aluno_id]');
    selA.addEventListener('change', () => {
      const a = alunos.find(x => x.id === selA.value);
      m.$('[data-resp]').textContent = a && a.responsavel ? `Responsável que assina o termo: ${a.responsavel.nome} (${a.responsavel.parentesco}) · ${a.responsavel.telefone}` : '';
    });
    if (preset.aluno_id) { selA.value = preset.aluno_id; selA.dispatchEvent(new Event('change')); }
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      d.tipo_tomador = tipo;
      const r = await ui().run(() => ICM.api.emprestimos.emprestar(d), 'Empréstimo registrado');
      m.close();
      await ICM.reports.generate('termo_emprestimo', { emprestimo_id: r.id });
      ICM.app.reload();
    }).catch(() => { }));
  }

  async function devolverModal(empId, after) {
    const F = o => ui().field(o);
    const e = await ICM.api.emprestimos.get(empId);
    const m = ui().modal({
      title: `Devolução — ${e.numero}`, size: 'sm',
      body: `<form class="col">
        <div class="card flat"><b>${e.quantidade}x ${esc(e.item.nome)}</b><div class="xs muted">${esc(e.item.tombo)} · com ${esc(e.tomador)} desde ${esc(fmtDate(e.data_saida))} · saiu em estado ${esc((ICM.C.ESTADOS_PAT[e.estado_saida] || '').toLowerCase())}</div></div>
        ${F({ name: 'data_devolucao', label: 'Data da devolução', type: 'date', value: ICM.util.today() })}
        ${F({ name: 'estado_devolucao', label: 'Estado na devolução', type: 'select', value: e.estado_saida, options: [...Object.entries(ICM.C.ESTADOS_PAT), ['extraviado', 'Não devolvido / extraviado']] })}
        ${F({ name: 'obs_devolucao', label: 'Observações da conferência', type: 'textarea', rows: 3, placeholder: 'Acessórios conferidos, avarias, acordos de reposição…' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('clipboardCheck', 18)} Confirmar e gerar recebimento</button>`
    });
    m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      if (d.estado_devolucao === 'extraviado' && !(await ui().confirm({ title: 'Registrar extravio', text: 'As unidades não devolvidas serão descontadas do inventário e o fato ficará no histórico do bem. Confirmar?', ok: 'Registrar extravio', danger: true }))) return;
      await ui().run(() => ICM.api.emprestimos.devolver(empId, d), 'Devolução registrada');
      m.close();
      await ICM.reports.generate('termo_devolucao', { emprestimo_id: empId });
      after ? after() : ICM.app.reload();
    }).catch(() => { }));
  }

  function stat(icon, color, val, label) { return `<div class="card stat hoverable"><div class="ic" style="--c:${color}">${I(icon, 22)}</div><div class="val" data-count="${val}">0</div><div class="lbl">${esc(label)}</div></div>`; }
  function mini(l, v, ic) { return `<div class="card flat stat" style="padding:16px"><div class="row">${I(ic, 18)}<span class="lbl">${esc(l)}</span></div><div class="val" style="font-size:26px">${esc(v)}</div></div>`; }

  ICM.pages._empTable = empTable;
  ICM.pages._bindEmpTable = bindEmpTable;
  ICM.pages._emprestarModal = emprestarModal;
  void num;
})();
