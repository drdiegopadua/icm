/* Bolsistas, monitores e jovens aprendizes: cadastro do vínculo, horas de atuação,
   requisitos do mês (frequência e horas) e folha mensal (gerar → aprovar → pagar). */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num, money } = ICM.util;
  const ui = () => ICM.ui;
  const B = () => ICM.api.bolsas;
  const hoje = () => ICM.util.today();

  const tipoBadge = t => { const x = B().TIPOS[t] || { nome: t, cor: '#64748b' }; return `<span class="badge" style="background:color-mix(in srgb, ${x.cor} 14%, transparent);color:${x.cor}">${esc(x.nome)}</span>`; };
  const statusBadge = s => s === 'ativo' ? ui().badge('Ativo', 'ok', true) : s === 'suspenso' ? ui().badge('Suspenso', 'warn', true) : ui().badge('Encerrado', 'neutral', true);
  const pagBadge = s => ({ pendente: ui().badge('A aprovar', 'warn'), aprovado: ui().badge('Aprovado', ''), pago: ui().badge('Pago', 'ok'), suspenso: ui().badge('Não pago no mês', 'danger') }[s] || '');
  const reqHtml = s => s.ok ? `<span class="badge ok">${I('check', 12)} Em dia</span>` : `<span class="badge danger" title="${esc(s.motivos.join(' · '))}">${I('alert', 12)} ${esc(s.motivos[0])}${s.motivos.length > 1 ? ` +${s.motivos.length - 1}` : ''}</span>`;
  const vigencia = b => `${fmtDate(b.inicio)} a ${b.fim ? fmtDate(b.fim) : 'indeterminado'}`;

  ICM.pages.bolsistas = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Bolsistas e monitores']]);
    const tab0 = (query && query.get('aba')) || 'pessoas';
    const ym0 = (query && query.get('mes')) || hoje().slice(0, 7);
    const todos = await B().list();
    const ativos = todos.filter(b => b.status === 'ativo');
    const T = B().TIPOS;
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Bolsistas, monitores e aprendizes</h1><div class="page-sub">Vínculo, requisitos do mês (frequência e horas), folha de pagamento e recibos</div></div>
        <div class="row wrap"><button class="btn btn-primary" data-novo>${I('userPlus', 18)} Novo vínculo</button></div></div>
      <div class="grid grid-4 stagger mb-4">
        ${Object.entries(T).map(([k, t]) => ICM.pages._stat(t.icon, t.cor, ativos.filter(b => b.tipo === k).length, `${t.plural} ativos`)).join('')}
        ${ICM.pages._stat('wallet', '#f59e0b', Math.round(ativos.reduce((s, b) => s + Number(b.valor_mensal || 0), 0)), 'Valor mensal (R$)')}
      </div>
      <div class="tabs mb-4">${[['pessoas', 'Pessoas', 'users'], ['folha', 'Folha do mês', 'wallet']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-painel></div></div>`;
    const painel = el.querySelector('[data-painel]');
    el.querySelector('[data-novo]').addEventListener('click', () => form());

    async function pessoas() {
      let filtroT = '', filtroS = 'ativo';
      const ym = hoje().slice(0, 7);
      const sit = {}; for (const b of todos) if (b.status === 'ativo') sit[b.id] = await B().situacao(b.id, ym);
      const projetos = await ICM.api.raw('projetos');
      const pn = id => (projetos.find(p => p.id === id) || {}).nome || 'Institucional';
      const draw = () => {
        const l = todos.filter(b => (!filtroT || b.tipo === filtroT) && (!filtroS || b.status === filtroS));
        painel.innerHTML = `<div class="row wrap mb-4" style="gap:8px">
            <select class="select" data-ft style="width:auto"><option value="">Todos os tipos</option>${Object.entries(T).map(([k, t]) => `<option value="${k}" ${k === filtroT ? 'selected' : ''}>${t.plural}</option>`).join('')}</select>
            <select class="select" data-fs style="width:auto"><option value="">Todas as situações</option>${Object.entries(B().STATUS).map(([k, n]) => `<option value="${k}" ${k === filtroS ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <span class="small muted">${l.length} pessoa(s)</span></div>
          <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Projeto (recurso)</th><th>Valor/mês</th><th>Vigência</th><th>Requisitos em ${esc(ICM.util.MESES[+ym.slice(5) - 1])}</th><th>Termo</th><th>Situação</th></tr></thead><tbody>
          ${l.map(b => `<tr class="clickable" data-href="#/bolsistas/${esc(b.id)}"><td><div class="row">${ICM.util.avatar(b.nome, null, 'sm')}<div><b>${esc(b.nome)}</b><div class="xs">${tipoBadge(b.tipo)}</div></div></div></td><td class="small">${esc(pn(b.projeto_id))}</td><td><b>${money(b.valor_mensal)}</b></td><td class="small">${esc(vigencia(b))}</td><td>${sit[b.id] ? reqHtml(sit[b.id]) : '<span class="muted">—</span>'}</td><td>${b.termo_assinado ? ui().badge('Assinado', 'ok') : ui().badge('Pendente', 'danger')}</td><td>${statusBadge(b.status)}</td></tr>`).join('') || `<tr><td colspan="7">${ui().empty('Nenhum vínculo cadastrado', 'award')}</td></tr>`}
          </tbody></table></div></div>`;
        painel.querySelector('[data-ft]').addEventListener('change', e => { filtroT = e.target.value; draw(); });
        painel.querySelector('[data-fs]').addEventListener('change', e => { filtroS = e.target.value; draw(); });
        painel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      };
      draw();
    }

    async function folha(ym) {
      const { pagamentos, faltam } = await B().folha(ym);
      const podeAprovar = ICM.auth.can('bolsas.aprovar');
      const tot = k => pagamentos.filter(p => p.status !== 'suspenso').reduce((s, p) => s + Number(k(p) || 0), 0);
      const sel = new Set();
      painel.innerHTML = `<div class="card mb-4"><div class="row wrap between" style="gap:10px">
          <div class="row wrap" style="gap:8px"><span class="label">Mês</span><input type="month" class="input" data-ym value="${esc(ym)}" style="width:auto">
            <button class="btn" data-gerar>${I('refresh', 16)} ${pagamentos.length ? 'Atualizar folha' : 'Gerar folha do mês'}</button></div>
          <div class="row wrap" style="gap:8px"><button class="btn" data-pdf>${I('fileText', 16)} Folha em PDF</button><button class="btn" data-recibos ${pagamentos.some(p => p.status === 'pago') ? '' : 'disabled'}>${I('printer', 16)} Recibos</button></div></div>
        ${faltam.length ? `<div class="sens-lock mt-4">${I('info', 16)} ${faltam.length} pessoa(s) com vínculo vigente ainda fora da folha: ${esc(faltam.map(b => b.nome).join(', '))}. Clique em <b>${pagamentos.length ? 'Atualizar folha' : 'Gerar folha do mês'}</b>.</div>` : ''}
        <div class="xs muted mt-2">A folha confere a frequência do aluno nas aulas do mês e as horas de atuação lançadas. Enquanto está "A aprovar", "Atualizar folha" refaz a conferência.</div></div>
        ${pagamentos.length ? `<div class="grid grid-4 mb-4">${ICM.pages._stat('users', '#2563eb', pagamentos.length, 'Na folha')}${ICM.pages._stat('alert', '#ef4444', pagamentos.filter(p => !p.requisito_ok && p.status !== 'suspenso').length, 'Com requisito pendente')}${ICM.pages._stat('wallet', '#f59e0b', Math.round(tot(p => p.valor - (p.desconto || 0))), 'Total líquido (R$)')}${ICM.pages._stat('check', '#10b981', pagamentos.filter(p => p.status === 'pago').length, 'Pagos')}</div>
        <div class="card"><div class="row wrap mb-4" style="gap:8px">${podeAprovar ? `<button class="btn" data-aprovar disabled>${I('check', 16)} Aprovar selecionados</button>` : '<span class="xs muted">A aprovação é feita pela direção.</span>'}<button class="btn btn-primary" data-pagar disabled>${I('dollar', 16)} Registrar pagamento</button><span class="small muted" data-nsel></span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th><input type="checkbox" data-all aria-label="Selecionar todos"></th><th>Nome</th><th>Frequência</th><th>Horas</th><th>Requisitos</th><th>Bolsa</th><th>Desconto</th><th>Líquido</th><th>Situação</th><th></th></tr></thead><tbody>
        ${pagamentos.map(p => `<tr><td><input type="checkbox" data-sel="${esc(p.id)}" ${p.status === 'pago' || p.status === 'suspenso' ? 'disabled' : ''}></td>
          <td><a href="#/bolsistas/${esc(p.bolsista_id)}"><b>${esc(p.nome)}</b></a><div class="xs">${tipoBadge(p.tipo)}</div></td>
          <td class="small">${p.freq == null ? '—' : `${p.freq}%`}</td><td class="small">${p.horas_minimas ? `${num(p.horas, 1)} / ${num(p.horas_minimas, 1)}h` : (p.horas ? num(p.horas, 1) + 'h' : '—')}</td>
          <td>${reqHtml({ ok: p.requisito_ok, motivos: p.motivos || [] })}</td>
          <td>${money(p.valor)}</td><td class="small">${p.desconto ? `<span title="${esc(p.motivo_desconto || '')}">− ${money(p.desconto)}</span>` : '—'}</td><td><b>${p.status === 'suspenso' ? '—' : money(p.valor - (p.desconto || 0))}</b></td>
          <td>${pagBadge(p.status)}${p.status === 'suspenso' && p.motivo_suspensao ? `<div class="xs muted">${esc(p.motivo_suspensao)}</div>` : ''}${p.status === 'pago' ? `<div class="xs muted">em ${esc(fmtDate(p.pago_em))}</div>` : ''}</td>
          <td><div class="row" style="gap:4px;justify-content:flex-end">${p.status === 'pendente' ? `<button class="btn btn-sm" data-aj="${esc(p.id)}" title="Desconto ou observação">${I('edit', 14)}</button><button class="btn btn-sm" data-susp="${esc(p.id)}" title="Não pagar neste mês">${I('x', 14)}</button>` : ''}${(p.status === 'aprovado' || p.status === 'suspenso') && podeAprovar ? `<button class="btn btn-sm" data-reabrir="${esc(p.id)}" title="Voltar para aprovação">${I('refresh', 14)}</button>` : ''}${p.status === 'pago' ? `<button class="btn btn-sm" data-rec="${esc(p.id)}" title="Recibo">${I('printer', 14)}</button>` : ''}</div></td></tr>`).join('')}
        </tbody><tfoot><tr><td></td><td colspan="4"><b>Total</b></td><td><b>${money(tot(p => p.valor))}</b></td><td>${money(tot(p => p.desconto))}</td><td><b>${money(tot(p => p.valor - (p.desconto || 0)))}</b></td><td colspan="2"></td></tr></tfoot></table></div></div>`
        : `<div class="card">${ui().empty('A folha deste mês ainda não foi gerada', 'wallet')}</div>`}`;
      const on = (s, fn) => { const b = painel.querySelector(s); if (b) b.addEventListener('click', fn); };
      const recarregar = () => folha(painel.querySelector('[data-ym]').value || ym);
      painel.querySelector('[data-ym]').addEventListener('change', e => { if (e.target.value) folha(e.target.value); });
      on('[data-gerar]', e => ui().busy(e.currentTarget, async () => { const r = await ui().run(() => B().gerarFolha(ym)); ui().toast(`Folha de ${ICM.util.fmtMonth(ym)}: ${r.novos} incluída(s), ${r.atualizados} conferida(s) de novo`, 'ok'); recarregar(); }).catch(() => { }));
      on('[data-pdf]', () => ICM.reports.generate('bolsas_folha', { ym }));
      on('[data-recibos]', () => ICM.reports.generate('bolsa_recibo', { ym }));
      painel.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('bolsa_recibo', { pagamento_id: b.dataset.rec })));
      const atualizaSel = () => {
        const ps = pagamentos.filter(p => sel.has(p.id));
        const nsel = painel.querySelector('[data-nsel]'); if (nsel) nsel.textContent = ps.length ? `${ps.length} selecionado(s)` : '';
        const ap = painel.querySelector('[data-aprovar]'); if (ap) ap.disabled = !ps.some(p => p.status === 'pendente');
        const pg = painel.querySelector('[data-pagar]'); if (pg) pg.disabled = !ps.some(p => p.status === 'aprovado');
      };
      painel.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); atualizaSel(); }));
      const all = painel.querySelector('[data-all]'); if (all) all.addEventListener('change', () => { painel.querySelectorAll('[data-sel]:not(:disabled)').forEach(c => { c.checked = all.checked; c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); }); atualizaSel(); });
      on('[data-aprovar]', async e => {
        const ps = pagamentos.filter(p => sel.has(p.id) && p.status === 'pendente');
        const comPend = ps.filter(p => !p.requisito_ok);
        if (!(await ui().confirm({ title: 'Aprovar bolsas', text: `Aprovar ${ps.length} bolsa(s), total de ${money(ps.reduce((s, p) => s + p.valor - (p.desconto || 0), 0))}?${comPend.length ? ` Atenção: ${comPend.length} com requisito pendente (${comPend.map(p => p.nome).join(', ')}).` : ''}`, ok: 'Aprovar' }))) return;
        await ui().run(() => B().aprovar(ps.map(p => p.id)), 'Bolsas aprovadas'); recarregar();
      });
      on('[data-pagar]', async () => {
        const ps = pagamentos.filter(p => sel.has(p.id) && p.status === 'aprovado');
        const podeFin = ICM.auth.can('financeiro.lancar');
        let contas = []; if (podeFin) try { contas = (await ICM.api.financeiro.contas()).filter(c => c.ativa !== false); } catch (er) { contas = []; }
        const m = ui().modal({ title: 'Registrar pagamento', size: 'sm', body: `<form class="col">
            <p class="small">${ps.length} bolsa(s) — total ${money(ps.reduce((s, p) => s + p.valor - (p.desconto || 0), 0))}.</p>
            ${ui().field({ name: 'data', label: 'Data do pagamento', type: 'date', value: hoje(), required: true })}
            ${podeFin ? `${ui().field({ name: 'conta_id', label: 'Lançar no financeiro (conta de saída)', type: 'select', options: [['', 'Não lançar no financeiro'], ...contas.map(c => [c.id, c.nome])], hint: 'Cria uma despesa paga por pessoa, no projeto do vínculo.' })}${ui().field({ name: 'rubrica', label: 'Rubrica', type: 'select', value: 'outras', options: Object.entries(ICM.C.RUBRICAS) })}` : '<p class="xs muted">Sem acesso ao financeiro: o pagamento fica registrado só aqui.</p>'}
          </form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Confirmar pagamento</button>` });
        m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { const d = ICM.util.formData(m.$('form')); await ui().run(() => B().pagar(ps.map(p => p.id), d), 'Pagamento registrado'); m.close(); recarregar(); }).catch(() => { }));
      });
      painel.querySelectorAll('[data-aj]').forEach(b => b.addEventListener('click', () => {
        const p = pagamentos.find(x => x.id === b.dataset.aj);
        const m = ui().modal({ title: `Ajustar — ${p.nome}`, size: 'sm', body: `<form class="col">${ui().field({ name: 'desconto', label: 'Desconto', type: 'money', value: p.desconto || 0, hint: `Bolsa: ${money(p.valor)}` })}${ui().field({ name: 'motivo_desconto', label: 'Motivo do desconto', value: p.motivo_desconto })}${ui().field({ name: 'obs', label: 'Observação', type: 'textarea', rows: 2, value: p.obs })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>` });
        m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => B().ajustar(p.id, ICM.util.formData(m.$('form'))), 'Ajuste salvo'); m.close(); recarregar(); }).catch(() => { }));
      }));
      painel.querySelectorAll('[data-susp]').forEach(b => b.addEventListener('click', () => {
        const p = pagamentos.find(x => x.id === b.dataset.susp);
        const m = ui().modal({ title: `Não pagar neste mês — ${p.nome}`, size: 'sm', body: `<form class="col">${ui().field({ name: 'motivo', label: 'Motivo', type: 'textarea', rows: 2, value: (p.motivos || []).join('; '), required: true })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Confirmar</button>` });
        m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => B().suspender(p.id, ICM.util.formData(m.$('form')).motivo), 'Registrado'); m.close(); recarregar(); }).catch(() => { }));
      }));
      painel.querySelectorAll('[data-reabrir]').forEach(b => b.addEventListener('click', async () => { await ui().run(() => B().reabrir(b.dataset.reabrir), 'Voltou para aprovação'); recarregar(); }));
    }

    const R = { pessoas, folha: () => folha(ym0) };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    await R[tab0]();
  };

  ICM.pages.bolsista = async function (el, params) {
    const b = await B().get(params.id);
    if (!b) { el.innerHTML = ui().empty('Vínculo não encontrado'); return; }
    ICM.app.setCrumbs([['Bolsistas e monitores', '#/bolsistas'], [b.nome]]);
    const [projetos, turmas, usuarios, pags] = await Promise.all([ICM.api.raw('projetos'), ICM.api.raw('turmas'), ICM.api.usuarios.list(), B().pagamentos({ bolsista_id: b.id })]);
    const ym = hoje().slice(0, 7);
    const s = b.status === 'ativo' ? await B().situacao(b.id, ym) : null;
    const T = B().TIPOS[b.tipo] || {};
    const tn = id => (turmas.find(t => t.id === id) || {}).nome || '';
    const ativ = [...(b.atividades || [])].sort((x, y) => y.data.localeCompare(x.data));
    const pago = pags.filter(p => p.status === 'pago').reduce((t, p) => t + Number(p.valor_pago || 0), 0);
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(b.nome, null, 'lg')}
        <div class="grow"><h1 class="page-title" style="font-size:28px">${esc(b.nome)}</h1>
          <div class="meta mt-2"><span>${I(T.icon || 'award', 15)} ${esc(T.nome || b.tipo)}</span><span>${I('wallet', 15)} ${money(b.valor_mensal)}/mês</span><span>${I('calendar', 15)} ${esc(vigencia(b))}</span>${b.carga_semanal ? `<span>${I('clock', 15)} ${num(b.carga_semanal, 1)}h/semana</span>` : ''}</div>
          <div class="row wrap mt-2">${statusBadge(b.status)}${b.termo_assinado ? ui().badge('Termo assinado', 'ok') : ui().badge('Termo pendente', 'danger')}${s ? reqHtml(s) : ''}</div></div>
        <div class="row wrap"><button class="btn" data-termo>${I('fileText', 18)} Termo de compromisso</button><button class="btn" data-edit>${I('edit', 18)} Editar</button>${b.status !== 'encerrado' ? `<button class="btn" data-encerrar>${I('x', 18)} Encerrar vínculo</button>` : ''}<button class="btn btn-primary" data-horas>${I('plus', 18)} Lançar horas</button></div></div></div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('user', 18)} Vínculo</div>${ui().kv([
          ['Tipo', T.nome || b.tipo], ['Aluno(a) cadastrado(a)', b.aluno_id ? 'Sim' : 'Não'], ['CPF', b.cpf ? ICM.util.maskCPF(b.cpf) : ''], ['Nascimento', b.nascimento ? `${fmtDate(b.nascimento)} (${ICM.util.age(b.nascimento)} anos)` : ''], ['Telefone', b.telefone], ['Responsável', b.responsavel],
          ['Projeto (fonte do recurso)', (projetos.find(p => p.id === b.projeto_id) || {}).nome || 'Institucional'], ['Orientador(a)', (usuarios.find(x => x.id === b.orientador_id) || {}).nome || ''], ['Turma onde atua', tn(b.turma_id)],
          ['Frequência mínima', `${b.freq_minima || 75}%`], ['Horas mínimas no mês', B().horasMinimas(b) ? `${num(B().horasMinimas(b), 1)}h` : 'Não exige'], ['Pagamento', [{ pix: 'Pix', conta: 'Depósito em conta', dinheiro: 'Dinheiro' }[b.forma_pagamento] || '', b.dados_pagamento].filter(Boolean).join(' — ')],
          ['Total recebido', money(pago)], ...(b.status === 'encerrado' ? [['Motivo do encerramento', b.motivo_encerramento || '']] : [])])}
          ${b.atribuicoes ? `<hr class="divider"><div class="section-title">${I('clipboard', 18)} Atribuições</div><p class="small" style="white-space:pre-line">${esc(b.atribuicoes)}</p>` : ''}
          ${s ? `<hr class="divider"><div class="section-title">${I('target', 18)} ${esc(ICM.util.fmtMonth(ym))}</div>${ui().kv([['Frequência nas aulas', s.freq == null ? (b.aluno_id ? 'Sem chamada no mês' : 'Não se aplica') : `${s.freq}% (mínimo ${s.freq_minima}%)`], ['Horas de atuação', `${num(s.horas, 1)}h${s.horas_minimas ? ` de ${num(s.horas_minimas, 1)}h` : ''}`]])}` : ''}</div>
        <div class="col" style="gap:16px">
          <div class="card"><div class="section-title">${I('wallet', 18)} Pagamentos</div>
            ${pags.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th>Líquido</th><th>Situação</th><th></th></tr></thead><tbody>${pags.map(p => `<tr><td class="small">${esc(ICM.util.fmtMonth(p.ym))}</td><td><b>${p.status === 'suspenso' ? '—' : money(p.valor - (p.desconto || 0))}</b>${p.desconto ? `<div class="xs muted">desconto ${money(p.desconto)}</div>` : ''}</td><td>${pagBadge(p.status)}</td><td>${p.status === 'pago' ? `<button class="btn btn-sm" data-rec="${esc(p.id)}" title="Recibo">${I('printer', 14)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhum pagamento ainda', 'wallet')}</div>
          <div class="card"><div class="section-title">${I('clock', 18)} Horas de atuação</div>
            ${ativ.length ? `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="table"><thead><tr><th>Data</th><th>Atividade</th><th>Turma</th><th>Horas</th><th></th></tr></thead><tbody>${ativ.map(h => `<tr><td class="small">${esc(fmtDate(h.data))}</td><td class="small">${esc(h.descricao)}</td><td class="small">${esc(tn(h.turma_id) || '—')}</td><td><b>${num(h.horas, 1)}</b></td><td><button class="btn btn-icon btn-sm btn-ghost" data-rmh="${esc(h.id)}" aria-label="Remover">${I('trash', 14)}</button></td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhuma hora lançada', 'clock')}</div>
        </div></div></div>`;
    const on = (sel, fn) => { const x = el.querySelector(sel); if (x) x.addEventListener('click', fn); };
    on('[data-termo]', () => ICM.reports.generate('bolsa_termo', { bolsista_id: b.id }));
    on('[data-edit]', () => form(b));
    el.querySelectorAll('[data-rec]').forEach(x => x.addEventListener('click', () => ICM.reports.generate('bolsa_recibo', { pagamento_id: x.dataset.rec })));
    on('[data-encerrar]', () => {
      const m = ui().modal({ title: 'Encerrar vínculo', size: 'sm', body: `<form class="col">${ui().field({ name: 'data', label: 'Data de encerramento', type: 'date', value: hoje() })}${ui().field({ name: 'motivo', label: 'Motivo', type: 'select', options: ['Fim do período previsto', 'Pedido do(a) bolsista', 'Não cumpriu os requisitos', 'Saiu do instituto', 'Passou para outro tipo de vínculo', 'Outro'] })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger" data-ok>Encerrar</button>` });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => B().encerrar(b.id, ICM.util.formData(m.$('form'))), 'Vínculo encerrado'); m.close(); ICM.app.reload(); }).catch(() => { }));
    });
    on('[data-horas]', () => {
      const ts = turmas.filter(t => t.status !== 'encerrada');
      const m = ui().modal({ title: 'Lançar horas de atuação', size: 'sm', body: `<form class="col">${ui().field({ name: 'data', label: 'Data', type: 'date', value: hoje() })}${ui().field({ name: 'horas', label: 'Horas', type: 'number', value: 2, attrs: 'min="0.5" step="0.5"' })}${ui().field({ name: 'descricao', label: 'Atividade', required: true, placeholder: 'Ex.: Monitoria na aula de cordas, apoio no ensaio' })}${ui().field({ name: 'turma_id', label: 'Turma (se houver)', type: 'select', value: b.turma_id || '', options: [['', '—'], ...ts.map(t => [t.id, t.nome])] })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Lançar</button>` });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => B().addHoras(b.id, ICM.util.formData(m.$('form'))), 'Horas lançadas'); m.close(); ICM.app.reload(); }).catch(() => { }));
    });
    el.querySelectorAll('[data-rmh]').forEach(x => x.addEventListener('click', async () => { if (await ui().confirm({ title: 'Remover lançamento', text: 'Remover estas horas?', ok: 'Remover', danger: true })) { await B().removeHoras(b.id, x.dataset.rmh); ICM.app.reload(); } }));
  };

  async function form(b = {}) {
    const F = o => ui().field(o);
    const [alunos, projetos, turmas, usuarios] = await Promise.all([ICM.api.alunos.list({ status: 'ativo' }).catch(() => []), ICM.api.projetos.list(), ICM.api.raw('turmas'), ICM.api.usuarios.list()]);
    const T = B().TIPOS;
    const m = ui().modal({
      title: b.id ? 'Editar vínculo' : 'Novo vínculo', size: 'wide',
      body: `<form class="grid grid-2">
        ${F({ name: 'tipo', label: 'Tipo de vínculo', type: 'select', value: b.tipo || 'bolsista', options: Object.entries(T).map(([k, t]) => [k, t.nome]), required: true })}
        ${F({ name: 'aluno_id', label: 'Aluno(a) do instituto', type: 'select', value: b.aluno_id || '', options: [['', 'Pessoa sem cadastro de aluno'], ...alunos.map(a => [a.id, `${a.nome} (${a.matricula})`])], hint: 'Bolsistas que são alunos têm a frequência conferida pela chamada.' })}
        ${F({ name: 'nome', label: 'Nome completo', value: b.aluno_id ? '' : b.nome, cls: 'span-2', hint: 'Só para quem não é aluno cadastrado.' })}
        ${F({ name: 'cpf', label: 'CPF', value: b.cpf })}${F({ name: 'nascimento', label: 'Nascimento', type: 'date', value: b.nascimento })}
        ${F({ name: 'telefone', label: 'Telefone', value: b.telefone })}${F({ name: 'responsavel', label: 'Responsável (se menor de idade)', value: b.responsavel })}
        ${F({ name: 'projeto_id', label: 'Projeto que paga (fonte do recurso)', type: 'select', value: b.projeto_id || '', options: [['', 'Institucional'], ...projetos.map(p => [p.id, p.nome])] })}
        ${F({ name: 'orientador_id', label: 'Orientador(a) responsável', type: 'select', value: b.orientador_id || '', options: [['', '—'], ...usuarios.filter(x => x.ativo !== false).map(x => [x.id, x.nome])] })}
        ${F({ name: 'turma_id', label: 'Turma onde atua (monitores)', type: 'select', value: b.turma_id || '', options: [['', '—'], ...turmas.filter(t => t.status !== 'encerrada').map(t => [t.id, t.nome])] })}
        ${F({ name: 'valor_mensal', label: 'Valor mensal da bolsa', type: 'money', value: b.valor_mensal || 0, required: true })}
        ${F({ name: 'carga_semanal', label: 'Carga horária semanal (horas)', type: 'number', value: b.carga_semanal ?? '', attrs: 'min="0" step="0.5"', hint: 'Deixe vazio se não exige horas de atuação.' })}
        ${F({ name: 'horas_minimas_mes', label: 'Horas mínimas no mês', type: 'number', value: b.horas_minimas_mes ?? '', attrs: 'min="0" step="0.5"', hint: 'Vazio = carga semanal × 4.' })}
        ${F({ name: 'freq_minima', label: 'Frequência mínima nas aulas (%)', type: 'number', value: b.freq_minima ?? 75, attrs: 'min="0" max="100"' })}
        ${F({ name: 'inicio', label: 'Início', type: 'date', value: b.inicio || hoje(), required: true })}${F({ name: 'fim', label: 'Término previsto', type: 'date', value: b.fim })}
        ${F({ name: 'forma_pagamento', label: 'Forma de pagamento', type: 'select', value: b.forma_pagamento || 'pix', options: [['pix', 'Pix'], ['conta', 'Depósito em conta'], ['dinheiro', 'Dinheiro']] })}
        ${F({ name: 'dados_pagamento', label: 'Chave Pix ou banco/agência/conta', value: b.dados_pagamento, hint: 'Se for menor de idade, a conta pode ser do responsável.' })}
        ${F({ name: 'atribuicoes', label: 'Atribuições e compromissos', type: 'textarea', rows: 3, value: b.atribuicoes, cls: 'span-2', placeholder: 'Ex.: auxiliar o professor na afinação e organização da sala; estudar 30 min por dia; participar das apresentações' })}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: b.status || 'ativo', options: Object.entries(B().STATUS) })}
        ${F({ name: 'termo_assinado', label: 'Termo de compromisso assinado', type: 'toggle', value: b.termo_assinado })}
        ${F({ name: 'obs', label: 'Observações', type: 'textarea', rows: 2, value: b.obs, cls: 'span-2' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    const alSel = m.$('[name=aluno_id]'), nomeF = m.$('[name=nome]').closest('.field');
    const sync = () => { nomeF.style.display = alSel.value ? 'none' : ''; };
    alSel.addEventListener('change', sync); sync();
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      if (d.aluno_id) { const a = alunos.find(x => x.id === d.aluno_id); d.nome = a ? a.nome : ''; if (a && !d.nascimento) d.nascimento = a.nascimento || ''; }
      const x = await ui().run(() => B().save(b.id ? { ...b, ...d } : d), 'Vínculo salvo');
      m.close(); location.hash = `#/bolsistas/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
  }
})();
