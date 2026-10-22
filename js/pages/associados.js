/* Associados: alunos/famílias fora do CadÚnico que contribuem com a associação — mensalidades e adimplência */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;
  const sit = a => a.status !== 'ativo' ? ui().badge(a.status === 'suspenso' ? 'Suspenso' : 'Desligado', 'neutral', true) : a.em_dia ? ui().badge('Em dia', 'ok', true) : `<span class="alert-pill danger">${I('alert', 13)} ${a.vencidas} em atraso</span>`;

  ICM.pages.associados = async function (el, params, query) {
    if (!ICM.auth.can('associados.gerir')) { el.innerHTML = ui().empty('Acesso restrito.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Associados']]);
    const list = await ICM.api.associados.list();
    const pend = await ICM.api.associados.pendentes();
    const ativos = list.filter(a => a.status === 'ativo');
    const ym = ICM.util.today().slice(0, 4) + '-' + ICM.util.today().slice(5, 7);
    const msMes = (await ICM.api.associados.mensalidades()).filter(m => m.competencia === ym);
    const tab0 = query.get('tab') || 'associados';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Associados</h1><div class="page-sub">Alunos que não estão no CadÚnico participam como associados e precisam estar em dia com a associação</div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('fileText', 18)} Situação (PDF)</button><button class="btn btn-primary" data-novo>${I('userPlus', 18)} Novo associado</button></div></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('users', '#2563eb', ativos.length, 'Associados ativos')}
        ${ICM.pages._stat('check', '#10b981', ativos.filter(a => a.em_dia).length, 'Em dia')}
        ${ICM.pages._stat('alert', '#ef4444', ativos.filter(a => !a.em_dia).length, 'Inadimplentes')}
        ${ICM.pages._stat('dollar', '#8b5cf6', Math.round(msMes.filter(m => m.status === 'paga').reduce((s, m) => s + Number(m.valor), 0)), `Recebido em ${ICM.util.MESES[+ym.slice(5) - 1]} (R$)`)}
      </div>
      ${pend.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(245,158,11,.4),var(--sh-out)"><div class="card-head"><div><div class="card-title">${I('alert', 18)} ${pend.length} aluno(s) sem CadÚnico e ainda não associado(s)</div><div class="card-sub">Pela regra da instituição, esses alunos precisam se associar</div></div></div>
        ${pend.map(a => `<div class="list-item">${ICM.util.avatar(a.nome, a.foto, 'sm')}<div class="grow"><a href="#/alunos/${esc(a.id)}"><b>${esc(a.nome)}</b></a><div class="xs muted">${esc(a.matricula)} · resp.: ${esc((a.responsavel || {}).nome || '')} · ${esc((a.responsavel || {}).telefone || '')}</div></div><button class="btn btn-sm btn-primary" data-assoc="${esc(a.id)}">${I('userPlus', 14)} Associar</button></div>`).join('')}</div>` : ''}
      <div class="tabs mb-4">${[['associados', 'Associados', 'users'], ['mensalidades', 'Mensalidades', 'dollar']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    const R = {
      associados() {
        panel.innerHTML = `<div class="card tab-panel"><div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Titular</th><th>Aluno(a)</th><th>Adesão</th><th>Mensalidade</th><th>Pago no ano</th><th>Situação</th></tr></thead><tbody>
          ${list.map(a => `<tr class="clickable" data-href="#/associados/${esc(a.id)}"><td class="small bold">${esc(a.numero)}</td><td><b>${esc(a.titular)}</b><div class="xs muted">${esc(a.telefone || '')}</div></td><td class="small">${esc(a.aluno_nome || '—')}</td><td class="small">${esc(fmtDate(a.data_adesao))}</td><td>${esc(money(a.valor_mensal))}<div class="xs muted">vence dia ${a.dia_vencimento}</div></td><td class="small">${esc(money(a.pago_ano))}</td><td>${sit(a)}${!a.em_dia ? `<div class="xs" style="color:var(--danger)">${esc(money(a.divida))} · ${a.dias_atraso} dias</div>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${ui().empty('Nenhum associado', 'users')}</td></tr>`}
        </tbody></table></div></div>`;
        panel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      },
      async mensalidades() {
        let comp = ym;
        panel.innerHTML = `<div class="card tab-panel"><div class="row wrap between mb-4"><div class="row"><span class="label">Competência</span><input type="month" class="input" data-comp value="${ym}" style="width:180px"></div><button class="btn btn-primary btn-sm" data-gerar>${I('sparkles', 14)} Gerar mensalidades da competência</button></div><div data-l></div></div>`;
        const draw = async () => {
          const ms = (await ICM.api.associados.mensalidades()).filter(m => m.competencia === comp);
          panel.querySelector('[data-l]').innerHTML = tabelaMens(ms, list, true);
          bindMens(panel, draw);
        };
        panel.querySelector('[data-comp]').addEventListener('change', e => { comp = e.target.value; draw(); });
        panel.querySelector('[data-gerar]').addEventListener('click', async () => { const n = await ui().run(() => ICM.api.associados.gerarMes(comp)); ui().toast(n ? `${n} mensalidade(s) gerada(s)` : 'Mensalidades desta competência já existem', n ? 'ok' : 'info'); draw(); });
        await draw();
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    el.querySelector('[data-novo]').addEventListener('click', () => form({}));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.generate('associados_situacao', {}));
    el.querySelectorAll('[data-assoc]').forEach(b => b.addEventListener('click', () => { const a = pend.find(x => x.id === b.dataset.assoc); form({ aluno_id: a.id, titular: (a.responsavel || {}).nome, telefone: (a.responsavel || {}).telefone, cpf: (a.responsavel || {}).cpf }); }));
    await R[tab0]();
  };

  ICM.pages.associado = async function (el, params) {
    const a = await ICM.api.associados.get(params.id);
    if (!a) { el.innerHTML = ui().empty('Associado não encontrado'); return; }
    ICM.app.setCrumbs([['Associados', '#/associados'], [`${a.numero} — ${a.titular}`]]);
    const ms = await ICM.api.associados.mensalidades(a.id);
    const s = ICM.api.associados.situacao(ms);
    const aluno = a.aluno_id ? await ICM.api.alunos.get(a.aluno_id) : null;
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(a.titular, null, 'lg')}<div class="grow"><h1 class="page-title" style="font-size:28px">${esc(a.titular)}</h1>
        <div class="meta mt-2"><span>${I('key', 15)} ${esc(a.numero)}</span><span>${I('calendar', 15)} associado desde ${esc(fmtDate(a.data_adesao))}</span><span>${I('dollar', 15)} ${esc(money(a.valor_mensal))}/mês · vence dia ${a.dia_vencimento}</span></div>
        <div class="row wrap mt-2">${sit({ ...a, ...s })}${aluno ? `<a class="badge" href="#/alunos/${esc(aluno.id)}">${I('user', 13)} ${esc(aluno.nome)}</a>` : ''}</div></div>
        <div class="row wrap"><button class="btn" data-edit>${I('edit', 18)} Editar</button></div></div></div>
      ${!s.em_dia ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.35),var(--sh-out)"><b>${I('alert', 16)} ${s.vencidas} mensalidade(s) vencida(s) — ${esc(money(s.divida))}</b> <span class="muted">· mais antiga há ${s.dias_atraso} dias</span></div>` : ''}
      <div class="card"><div class="section-title">${I('dollar', 18)} Mensalidades</div>${tabelaMens(ms, [a], false)}</div></div>`;
    bindMens(el, () => ICM.app.reload());
    el.querySelector('[data-edit]').addEventListener('click', () => form(a));
  };

  function tabelaMens(ms, assoc, comNome) {
    if (!ms.length) return ui().empty('Nenhuma mensalidade', 'dollar');
    const hoje = ICM.util.today();
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Competência</th>${comNome ? '<th>Associado</th>' : ''}<th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th></th></tr></thead><tbody>
      ${ms.map(m => { const a = assoc.find(x => x.id === m.associado_id) || {}; const venc = m.status === 'aberta' && m.vencimento < hoje; return `<tr><td class="small bold" style="text-transform:capitalize">${esc(ICM.util.fmtMonth(m.competencia))}</td>${comNome ? `<td><a href="#/associados/${esc(a.id)}"><b>${esc(a.titular || '')}</b></a><div class="xs muted">${esc(a.numero || '')}</div></td>` : ''}<td class="small">${esc(fmtDate(m.vencimento))}</td><td>${esc(money(m.valor))}</td>
        <td>${m.status === 'paga' ? ui().badge('Paga', 'ok', true) : m.status === 'cancelada' ? ui().badge('Cancelada', 'neutral', true) : venc ? ui().badge('Vencida', 'danger', true) : ui().badge('Em aberto', 'warn', true)}</td>
        <td class="small">${m.pago_em ? `${esc(fmtDate(m.pago_em))} · ${esc(m.forma || '')}` : '—'}</td>
        <td style="white-space:nowrap;text-align:right">${m.status === 'aberta' ? `<button class="btn btn-sm btn-primary" data-pagar="${esc(m.id)}">${I('check', 14)} Receber</button>` : m.status === 'paga' ? `<button class="btn btn-sm btn-ghost" data-rec="${esc(m.id)}">${I('fileText', 14)} Recibo</button>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  }
  function bindMens(root, after) {
    root.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('mensalidade_recibo', { id: b.dataset.rec })));
    root.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => {
      const m = ui().modal({ title: 'Registrar pagamento', size: 'sm', body: `<form class="col">${ui().field({ name: 'pago_em', label: 'Data do pagamento', type: 'date', value: ICM.util.today() })}${ui().field({ name: 'forma', label: 'Forma', type: 'select', options: ICM.C.FORMAS_PAGTO })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Confirmar e gerar recibo</button>` });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        await ui().run(() => ICM.api.associados.pagar(b.dataset.pagar, ICM.util.formData(m.$('form'))), 'Pagamento registrado');
        m.close(); await ICM.reports.generate('mensalidade_recibo', { id: b.dataset.pagar }); after();
      }).catch(() => { }));
    }));
  }

  async function form(a) {
    const F = o => ui().field(o);
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const m = ui().modal({
      title: a.id ? `Editar ${a.numero}` : 'Novo associado',
      body: `<form class="grid grid-2">
        ${F({ name: 'aluno_id', label: 'Aluno(a) vinculado(a)', type: 'select', value: a.aluno_id, options: [['', 'Nenhum (associado sem aluno)'], ...alunos.map(x => [x.id, `${x.nome}${x.social && x.social.cadunico ? ' (CadÚnico)' : ''}`])], cls: 'span-2' })}
        ${F({ name: 'titular', label: 'Titular (responsável)', value: a.titular, required: true, cls: 'span-2' })}
        ${F({ name: 'cpf', label: 'CPF do titular', value: a.cpf })}${F({ name: 'telefone', label: 'Telefone', value: a.telefone })}
        ${F({ name: 'email', label: 'E-mail', type: 'email', value: a.email })}${F({ name: 'data_adesao', label: 'Data de adesão', type: 'date', value: a.data_adesao || ICM.util.today() })}
        ${F({ name: 'valor_mensal', label: 'Mensalidade (R$)', type: 'number', value: a.valor_mensal ?? 30, attrs: 'min="0" step="0.01"' })}
        ${F({ name: 'dia_vencimento', label: 'Dia de vencimento', type: 'number', value: a.dia_vencimento || 10, attrs: 'min="1" max="28"' })}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: a.status || 'ativo', options: [['ativo', 'Ativo'], ['suspenso', 'Suspenso'], ['desligado', 'Desligado']] })}
        ${F({ name: 'observacoes', label: 'Observações', value: a.observacoes })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[name=aluno_id]').addEventListener('change', e => { const x = alunos.find(y => y.id === e.target.value); if (x && x.responsavel && !m.$('[name=titular]').value) { m.$('[name=titular]').value = x.responsavel.nome; m.$('[name=telefone]').value = x.responsavel.telefone || ''; } });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const x = await ui().run(() => ICM.api.associados.save(a.id ? { ...a, ...d } : d), 'Associado salvo');
      m.close(); location.hash = `#/associados/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
  }
})();
