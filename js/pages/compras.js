/* Compras: solicitação → 3 orçamentos → mapa comparativo → aprovação → conta a pagar (com NF-e) */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.compras = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Compras']]);
    const ST = ICM.api.compras.STATUS;
    let status = query.get('status') || '';
    const tab0 = query.get('tab') || 'compras';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Compras</h1><div class="page-sub">Pedido → 3 orçamentos → mapa comparativo → aprovação → pagamento (exigência da Lei 13.019 e da maioria dos financiadores)</div></div>
        <button class="btn btn-primary" data-nova>${I('plus', 18)} Solicitar compra</button></div>
      <div class="tabs mb-4">${[['compras', 'Pedidos de compra', 'clipboard'], ...(ICM.auth.can('compras.cotar') ? [['forn', 'Fornecedores', 'building']] : [])].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    const R = {
      async compras() {
        const l = await ICM.api.compras.list();
        panel.innerHTML = `<div class="card tab-panel"><div class="segmented mb-4" data-st><button data-v="" class="${!status ? 'active' : ''}">Todos (${l.length})</button>${Object.entries(ST).map(([k, v]) => `<button data-v="${k}" class="${status === k ? 'active' : ''}">${v[0]} (${l.filter(c => c.status === k).length})</button>`).join('')}</div><div data-l></div></div>`;
        const draw = () => {
          const f = l.filter(c => !status || c.status === status);
          panel.querySelector('[data-l]').innerHTML = f.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Compra</th><th>Solicitante</th><th>Cotações</th><th>Menor preço</th><th>Situação</th></tr></thead><tbody>
            ${f.map(c => `<tr class="clickable" data-id="${esc(c.id)}"><td class="small bold" style="white-space:nowrap">${esc(c.numero)}</td><td><b>${esc(c.titulo)}</b><div class="xs muted">${c.itens.map(i => `${i.quantidade} ${esc(i.unidade)} ${esc(i.descricao)}`).join(' · ')}</div></td><td class="small">${esc(c.solicitante)}<div class="xs muted">${esc(fmtDate(c.solicitado_em))}</div></td>
              <td>${c.cotacoes.length >= 3 ? ui().badge(`${c.cotacoes.length} de 3`, 'ok') : ui().badge(`${c.cotacoes.length} de 3`, c.cotacoes.length ? 'warn' : 'neutral')}</td><td class="small">${c.menor ? esc(money(c.menor.valor)) : '—'}</td><td>${ui().badge(ST[c.status][0], ST[c.status][1], true)}</td></tr>`).join('')}
          </tbody></table></div>` : ui().empty('Nenhum pedido', 'clipboard');
          panel.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => detalhe(tr.dataset.id)));
        };
        panel.querySelectorAll('[data-st] button').forEach(b => b.addEventListener('click', () => { panel.querySelectorAll('[data-st] button').forEach(x => x.classList.toggle('active', x === b)); status = b.dataset.v; draw(); }));
        draw();
      },
      async forn() {
        const fs = await ICM.api.fornecedores.list();
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div class="card-title">Fornecedores</div><button class="btn btn-sm btn-primary" data-nf>${I('plus', 14)} Fornecedor</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Fornecedor</th><th>CNPJ/CPF</th><th>Categoria</th><th>Contato</th><th></th></tr></thead><tbody>${fs.map(f => `<tr><td><b>${esc(f.nome)}</b></td><td class="small">${esc(f.documento)}</td><td class="small">${esc(f.categoria || '')}</td><td class="small">${esc([f.contato, f.telefone, f.email].filter(Boolean).join(' · '))}</td><td><button class="btn btn-icon btn-sm btn-ghost" data-ef="${esc(f.id)}">${I('edit', 14)}</button></td></tr>`).join('')}</tbody></table></div></div>`;
        const ff = (f = {}) => { const F = o => ui().field(o); const m = ui().modal({ title: f.id ? 'Editar fornecedor' : 'Novo fornecedor', body: `<form class="grid grid-2">${F({ name: 'nome', label: 'Razão social / nome', value: f.nome, required: true, cls: 'span-2' })}${F({ name: 'documento', label: 'CNPJ / CPF', value: f.documento })}${F({ name: 'categoria', label: 'Categoria', value: f.categoria })}${F({ name: 'contato', label: 'Contato', value: f.contato })}${F({ name: 'telefone', label: 'Telefone', value: f.telefone })}${F({ name: 'email', label: 'E-mail', value: f.email })}${F({ name: 'pix', label: 'Chave PIX', value: f.pix })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` }); m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.fornecedores.save({ ...f, ...ICM.util.formData(m.$('form')) }), 'Fornecedor salvo'); m.close(); R.forn(); }); };
        panel.querySelector('[data-nf]').addEventListener('click', () => ff());
        panel.querySelectorAll('[data-ef]').forEach(b => b.addEventListener('click', () => ff(fs.find(f => f.id === b.dataset.ef))));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    el.querySelector('[data-nova]').addEventListener('click', solicitar);
    await R[tab0]();

    async function solicitar() {
      const F = o => ui().field(o); const projetos = await ICM.api.projetos.list();
      let itens = [{ descricao: '', quantidade: 1, unidade: 'un' }];
      const m = ui().modal({
        title: 'Solicitar compra', size: 'wide',
        body: `<form class="grid grid-2">${F({ name: 'titulo', label: 'O que precisa comprar', required: true, cls: 'span-2' })}${F({ name: 'projeto_id', label: 'Projeto que paga', type: 'select', options: [['', 'Institucional'], ...projetos.map(p => [p.id, p.nome])] })}${F({ name: 'rubrica', label: 'Rubrica', type: 'select', options: Object.entries(ICM.C.RUBRICAS) })}${F({ name: 'justificativa', label: 'Justificativa (por que precisa)', type: 'textarea', rows: 2, cls: 'span-2' })}
          <div class="span-2"><div class="row between"><span class="label">Itens</span><button type="button" class="btn btn-sm" data-add>${I('plus', 14)} Item</button></div><div data-it class="col mt-2"></div></div></form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Enviar pedido</button>`
      });
      const draw = () => { m.$('[data-it]').innerHTML = itens.map((it, i) => `<div class="row"><input class="input grow" data-k="descricao" data-i="${i}" value="${esc(it.descricao)}" placeholder="Descrição do item"><input class="input" type="number" min="1" data-k="quantidade" data-i="${i}" value="${it.quantidade}" style="width:90px"><input class="input" data-k="unidade" data-i="${i}" value="${esc(it.unidade)}" style="width:80px"><button type="button" class="btn btn-icon btn-sm btn-ghost" data-rm="${i}">${I('x', 14)}</button></div>`).join(''); m.$$('[data-k]').forEach(x => x.addEventListener('input', () => { itens[+x.dataset.i][x.dataset.k] = x.dataset.k === 'quantidade' ? Number(x.value) : x.value; })); m.$$('[data-rm]').forEach(x => x.addEventListener('click', () => { itens.splice(+x.dataset.rm, 1); draw(); })); };
      draw(); m.$('[data-add]').addEventListener('click', () => { itens.push({ descricao: '', quantidade: 1, unidade: 'un' }); draw(); });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { const x = await ui().run(() => ICM.api.compras.solicitar({ ...ICM.util.formData(m.$('form')), itens: itens.filter(i => i.descricao) }), 'Pedido enviado'); m.close(); detalhe(x.id); R.compras(); }).catch(() => { }));
    }

    async function detalhe(id) {
      const c = await ICM.api.compras.get(id); const fs = await ICM.api.fornecedores.list();
      const fn = fid => (fs.find(f => f.id === fid) || {}).nome || '?';
      const menor = c.cotacoes.length ? c.cotacoes.reduce((a, b) => a.valor < b.valor ? a : b) : null;
      const podeCotar = ICM.auth.can('compras.cotar') && ['solicitada', 'cotacao'].includes(c.status);
      const m = ui().modal({
        title: `${c.numero} — ${c.titulo}`, size: 'wide',
        body: `<div class="row wrap mb-4">${ui().badge(ST[c.status][0], ST[c.status][1], true)}<span class="small muted">Solicitado por ${esc(c.solicitante)} em ${esc(fmtDate(c.solicitado_em))}</span></div>
          ${c.justificativa ? `<p class="small mb-4">${esc(c.justificativa)}</p>` : ''}
          <div class="section-title">${I('list', 16)} Itens</div>${c.itens.map(i => `<div class="small">• ${i.quantidade} ${esc(i.unidade)} — ${esc(i.descricao)}</div>`).join('')}
          <div class="row between mt-4"><div class="section-title" style="margin:0">${I('chart', 16)} Mapa comparativo de orçamentos</div>${podeCotar ? `<button class="btn btn-sm btn-primary" data-cot>${I('plus', 14)} Adicionar orçamento</button>` : ''}</div>
          ${c.cotacoes.length ? `<div class="table-wrap mt-2"><table class="table"><thead><tr><th>Fornecedor</th><th>Valor total</th><th>Prazo</th><th>Validade</th><th>Obs.</th><th></th></tr></thead><tbody>${c.cotacoes.map(q => `<tr class="${q.id === (c.escolhida || '') ? 'active' : ''}"><td><b>${esc(fn(q.fornecedor_id))}</b>${q.id === menor.id ? ' <span class="badge ok">Menor preço</span>' : ''}${q.id === c.escolhida ? ' <span class="badge">Escolhida</span>' : ''}</td><td><b>${esc(money(q.valor))}</b>${q.id !== menor.id ? `<div class="xs muted">+${esc(money(q.valor - menor.valor))}</div>` : ''}</td><td class="small">${esc(q.prazo_entrega || '')}</td><td class="small">${esc(fmtDate(q.validade))}</td><td class="xs">${esc(q.obs || '')}</td><td>${q.arquivo ? `<button class="btn btn-icon btn-sm btn-ghost" data-arq="${esc(q.arquivo.id)}">${I('fileText', 14)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhum orçamento ainda', 'chart')}
          ${c.cotacoes.length && c.cotacoes.length < 3 && podeCotar ? `<div class="sens-lock mt-4">${I('alert', 16)} Faltam ${3 - c.cotacoes.length} orçamento(s). Se não houver 3 fornecedores, justifique abaixo.</div>${ui().field({ name: 'just3', label: 'Justificativa para menos de 3 orçamentos', value: c.justificativa_menos_3 || '' })}` : ''}
          ${c.status === 'aguardando_aprovacao' && ICM.auth.can('compras.aprovar') ? `<hr class="divider"><div class="section-title">${I('check', 16)} Aprovação</div><div class="grid grid-2">${ui().field({ name: 'escolha', label: 'Cotação escolhida', type: 'select', value: menor && menor.id, options: c.cotacoes.map(q => [q.id, `${fn(q.fornecedor_id)} — ${money(q.valor)}`]) })}${ui().field({ name: 'just', label: 'Justificativa (obrigatória se não for o menor preço)' })}</div>` : ''}
          ${c.status === 'aprovada' && ICM.auth.can('compras.cotar') ? `<hr class="divider"><div class="section-title">${I('download', 16)} Concluir compra</div><div class="grid grid-3">${ui().field({ name: 'conta', label: 'Pagar pela conta', type: 'select', options: [] })}${ui().field({ name: 'venc', label: 'Vencimento', type: 'date', value: ICM.util.addDays(ICM.util.today(), 15) })}<label class="btn" style="align-self:end">${I('upload', 14)} XML/PDF da nota fiscal<input type="file" accept=".xml,application/pdf,image/*" data-nf hidden></label></div><div class="small mt-2" data-nfinfo></div>` : ''}
          ${c.status === 'concluida' ? `<div class="sens-lock mt-4" style="background:var(--ok-soft);color:#047857">${I('check', 16)} Aprovada por ${esc(c.aprovado_por || '')} em ${esc(fmtDate(c.aprovado_em))} (${esc(c.justificativa_escolha || '')}). ${c.lancamento_id ? 'Conta a pagar gerada no Financeiro.' : ''}</div>` : ''}
          ${c.status === 'reprovada' ? `<div class="sens-lock mt-4" style="background:var(--danger-soft);color:#dc2626">Reprovada: ${esc(c.motivo_reprovacao || '')}</div>` : ''}`,
        foot: `<button class="btn" data-mapa style="margin-right:auto">${I('printer', 16)} Mapa comparativo (PDF)</button>
          ${podeCotar && c.cotacoes.length ? `<button class="btn btn-primary" data-env>Enviar para aprovação</button>` : ''}
          ${c.status === 'aguardando_aprovacao' && ICM.auth.can('compras.aprovar') ? `<button class="btn btn-danger" data-rep>Reprovar</button><button class="btn btn-primary" data-apr>${I('check', 16)} Aprovar</button>` : ''}
          ${c.status === 'aprovada' && ICM.auth.can('compras.cotar') ? `<button class="btn btn-primary" data-conc>${I('check', 16)} Concluir e gerar conta a pagar</button>` : ''}<button class="btn" data-close>Fechar</button>`
      });
      const on = (s, fn) => { const b = m.$(s); if (b) b.addEventListener('click', fn); };
      m.$$('[data-arq]').forEach(b => b.addEventListener('click', () => ICM.pages._verArquivo(b.dataset.arq)));
      on('[data-mapa]', () => ICM.reports.generate('compra_mapa', { compra_id: c.id }));
      on('[data-cot]', () => {
        const F = o => ui().field(o);
        const mm = ui().modal({ title: 'Adicionar orçamento', size: 'sm', body: `<form class="col">${F({ name: 'fornecedor_id', label: 'Fornecedor', type: 'select', options: fs.filter(f => !c.cotacoes.some(q => q.fornecedor_id === f.id)).map(f => [f.id, f.nome]) })}${F({ name: 'valor', label: 'Valor total (R$)', type: 'number', attrs: 'step="0.01" min="0"' })}${F({ name: 'prazo_entrega', label: 'Prazo de entrega' })}${F({ name: 'validade', label: 'Validade da proposta', type: 'date', value: ICM.util.addDays(ICM.util.today(), 15) })}${F({ name: 'obs', label: 'Observações (frete, garantia…)' })}<label class="btn btn-sm">${I('upload', 14)} Anexar proposta (PDF/foto)<input type="file" accept="application/pdf,image/*" data-pa hidden></label><span class="xs muted" data-pan></span></form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Adicionar</button>` });
        let arquivo = null;
        mm.$('[data-pa]').addEventListener('change', async e => { try { arquivo = await ICM.api.arquivos.salvar(e.target.files[0], { col: 'compras', id: c.id }); mm.$('[data-pan]').textContent = arquivo.nome; } catch (er) { ui().toast(er.message, 'danger'); } });
        mm.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(mm.$('form')); if (!(d.valor > 0)) return ui().toast('Informe o valor.', 'warn'); c.cotacoes.push({ id: ICM.util.uid('cot_'), ...d, arquivo }); await ui().run(() => ICM.api.compras.salvar(c), 'Orçamento adicionado'); mm.close(); m.close(); detalhe(c.id); R.compras(); });
      });
      on('[data-env]', async () => { const j = m.$('[name=just3]'); if (j) { c.justificativa_menos_3 = j.value.trim(); await ICM.api.compras.salvar(c); } await ui().run(() => ICM.api.compras.enviarAprovacao(c.id), 'Enviado para aprovação').then(() => { m.close(); R.compras(); }).catch(() => { }); });
      on('[data-apr]', async () => { await ui().run(() => ICM.api.compras.aprovar(c.id, m.$('[name=escolha]').value, m.$('[name=just]').value.trim()), 'Compra aprovada').then(() => { m.close(); R.compras(); }).catch(() => { }); });
      on('[data-rep]', async () => { const motivo = m.$('[name=just]').value.trim(); if (!motivo) return ui().toast('Escreva o motivo no campo de justificativa.', 'warn'); await ICM.api.compras.reprovar(c.id, motivo); m.close(); R.compras(); });
      if (m.$('[name=conta]')) {
        (await ICM.api.financeiro.contas()).forEach(ct => { const o = document.createElement('option'); o.value = ct.id; o.textContent = ct.nome; m.$('[name=conta]').appendChild(o); });
        let nf = null;
        m.$('[data-nf]').addEventListener('change', async e => {
          const file = e.target.files[0]; if (!file) return;
          try {
            const arquivo = await ICM.api.arquivos.salvar(file, { col: 'compras', id: c.id });
            if (/xml/i.test(file.type) || /\.xml$/i.test(file.name)) { const d = ICM.api.lerNFe(await file.text()); nf = { ...d, arquivo }; m.$('[data-nfinfo]').innerHTML = `${I('check', 14)} NF ${esc(d.numero)} — ${esc(d.emitente)} — <b>${esc(money(d.valor))}</b>`; }
            else { nf = { arquivo }; m.$('[data-nfinfo]').textContent = `Anexado: ${file.name}`; }
          } catch (er) { ui().toast(er.message, 'danger'); }
        });
        on('[data-conc]', async () => { await ui().run(() => ICM.api.compras.concluir(c.id, { conta_id: m.$('[name=conta]').value, vencimento: m.$('[name=venc]').value, nf }), 'Compra concluída — conta a pagar criada no Financeiro').then(() => { m.close(); R.compras(); }).catch(() => { }); });
      }
    }
  };
})();
