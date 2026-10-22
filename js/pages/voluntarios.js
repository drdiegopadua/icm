/* Voluntários: cadastro, termo de adesão (Lei 9.608/98), horas doadas e certificado */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.voluntarios = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Voluntários']]);
    const list = await ICM.api.voluntarios.list();
    const edit = ICM.auth.can('voluntarios.gerir');
    const ano = ICM.util.today().slice(0, 4);
    const horasAno = list.reduce((s, v) => s + (v.horas || []).filter(h => h.data.startsWith(ano)).reduce((q, h) => q + Number(h.horas), 0), 0);
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Voluntários</h1><div class="page-sub">Cadastro, termo de adesão, horas doadas e certificado — horas valem como contrapartida em editais</div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('fileText', 18)} Relatório de horas</button>${edit ? `<button class="btn btn-primary" data-novo>${I('userPlus', 18)} Novo voluntário</button>` : ''}</div></div>
      <div class="grid grid-4 stagger mb-4">
        ${stat('users', '#10b981', list.filter(v => v.status === 'ativo').length, 'Voluntários ativos')}
        ${stat('clock', '#2563eb', Math.round(horasAno), `Horas doadas em ${ano}`)}
        ${stat('dollar', '#8b5cf6', Math.round(horasAno * 25), 'Contrapartida estimada (R$ 25/h)')}
        ${stat('alert', '#f59e0b', list.filter(v => v.status === 'ativo' && !v.termo_assinado).length, 'Termos pendentes')}
      </div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Voluntário(a)</th><th>Área</th><th>Disponibilidade</th><th>Desde</th><th>Horas</th><th>Termo</th><th>Situação</th></tr></thead><tbody>
        ${list.map(v => `<tr class="clickable" data-href="#/voluntarios/${esc(v.id)}"><td><div class="row">${ICM.util.avatar(v.nome, null, 'sm')}<div><b>${esc(v.nome)}</b><div class="xs muted">${esc(v.profissao || '')}</div></div></div></td><td class="small">${esc(v.area || '')}</td><td class="small">${esc(v.disponibilidade || '')}</td><td class="small">${esc(fmtDate(v.inicio))}</td><td><b>${num(v.total_horas, 1)}h</b></td><td>${v.termo_assinado ? ui().badge('Assinado', 'ok') : ui().badge('Pendente', 'danger')}</td><td>${v.status === 'ativo' ? ui().badge('Ativo', 'ok', true) : ui().badge('Inativo', 'neutral', true)}</td></tr>`).join('')}
      </tbody></table></div></div></div>`;
    el.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('voluntarios_horas'));
    const nb = el.querySelector('[data-novo]'); if (nb) nb.addEventListener('click', () => form());
  };

  ICM.pages.voluntario = async function (el, params) {
    const v = await ICM.api.voluntarios.get(params.id);
    if (!v) { el.innerHTML = ui().empty('Voluntário não encontrado'); return; }
    ICM.app.setCrumbs([['Voluntários', '#/voluntarios'], [v.nome]]);
    const projetos = await ICM.api.raw('projetos');
    const edit = ICM.auth.can('voluntarios.gerir');
    const certs = (await ICM.api.certificados.list()).filter(c => c.destinatario_tipo === 'voluntario' && c.destinatario_id === v.id);
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(v.nome, null, 'lg')}
        <div class="grow"><h1 class="page-title" style="font-size:28px">${esc(v.nome)}</h1><div class="meta mt-2"><span>${I('award', 15)} ${esc(v.area || '')}</span><span>${I('clock', 15)} ${num(v.total_horas, 1)} horas doadas</span><span>${I('calendar', 15)} desde ${esc(fmtDate(v.inicio))}</span></div>
          <div class="row wrap mt-2">${v.termo_assinado ? ui().badge('Termo de adesão assinado', 'ok', true) : ui().badge('Termo de adesão pendente', 'danger', true)}${v.status === 'ativo' ? ui().badge('Ativo', 'ok') : ui().badge('Inativo', 'neutral')}</div></div>
        <div class="row wrap"><button class="btn" data-termo>${I('fileText', 18)} Termo de adesão</button>${ICM.auth.can('certificados.emitir') ? `<button class="btn" data-cert>${I('award', 18)} Emitir certificado</button>` : ''}${edit ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button><button class="btn btn-primary" data-horas>${I('plus', 18)} Lançar horas</button>` : ''}</div></div></div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('user', 18)} Cadastro</div>${ui().kv([['CPF', v.cpf ? ICM.util.maskCPF(v.cpf) : ''], ['Nascimento', fmtDate(v.nascimento)], ['Telefone', v.telefone], ['E-mail', v.email], ['Profissão', v.profissao], ['Disponibilidade', v.disponibilidade], ['Endereço', v.endereco], ['Término previsto', v.fim ? fmtDate(v.fim) : '']])}
          ${certs.length ? `<hr class="divider"><div class="section-title">${I('award', 18)} Certificados emitidos</div>${certs.map(c => `<div class="list-item"><b class="grow">${esc(c.titulo)}</b><span class="xs muted">${esc(c.codigo)}</span><button class="btn btn-sm" data-imp="${esc(c.id)}">${I('printer', 14)}</button></div>`).join('')}` : ''}</div>
        <div class="card"><div class="section-title">${I('clock', 18)} Horas doadas</div>
          ${(v.horas || []).length ? `<div class="table-wrap" style="max-height:440px;overflow:auto"><table class="table"><thead><tr><th>Data</th><th>Atividade</th><th>Projeto</th><th>Horas</th><th></th></tr></thead><tbody>${[...v.horas].sort((a, b) => b.data.localeCompare(a.data)).map(h => `<tr><td class="small">${esc(fmtDate(h.data))}</td><td class="small">${esc(h.atividade)}</td><td class="small">${esc((projetos.find(p => p.id === h.projeto_id) || {}).nome || 'Institucional')}</td><td><b>${num(h.horas, 1)}</b></td><td>${edit ? `<button class="btn btn-icon btn-sm btn-ghost" data-rmh="${esc(h.id)}" aria-label="Remover">${I('trash', 14)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhuma hora lançada', 'clock')}</div>
      </div></div>`;
    const on = (s, fn) => { const b = el.querySelector(s); if (b) b.addEventListener('click', fn); };
    on('[data-termo]', () => ICM.reports.generate('voluntario_termo', { voluntario_id: v.id }));
    on('[data-edit]', () => form(v));
    on('[data-cert]', async () => {
      const [c] = await ui().run(() => ICM.api.certificados.emitir([{ tipo: 'voluntariado', destinatario_tipo: 'voluntario', destinatario_id: v.id, nome: v.nome, titulo: `Trabalho voluntário — ${v.area || ICM.C.ORG.nome}`, descricao: `atuou como voluntário(a) em ${v.area || 'atividades da instituição'}, no período de ${fmtDate(v.inicio)} a ${fmtDate(v.fim || ICM.util.today())}`, carga_horaria: v.total_horas }]), 'Certificado emitido');
      ICM.reports.certificados([c]);
    });
    el.querySelectorAll('[data-imp]').forEach(b => b.addEventListener('click', () => ICM.reports.certificados(certs.filter(c => c.id === b.dataset.imp))));
    on('[data-horas]', () => {
      const m = ui().modal({
        title: 'Lançar horas voluntárias', size: 'sm',
        body: `<form class="col">${ui().field({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}${ui().field({ name: 'horas', label: 'Horas', type: 'number', value: 2, attrs: 'min="0.5" step="0.5"' })}${ui().field({ name: 'atividade', label: 'Atividade', required: true })}${ui().field({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Institucional'], ...projetos.map(p => [p.id, p.nome])] })}</form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Lançar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.voluntarios.addHoras(v.id, ICM.util.formData(m.$('form'))), 'Horas lançadas'); m.close(); ICM.app.reload(); }).catch(() => { }));
    });
    el.querySelectorAll('[data-rmh]').forEach(b => b.addEventListener('click', async () => { if (await ui().confirm({ title: 'Remover lançamento', text: 'Remover estas horas?', ok: 'Remover', danger: true })) { await ICM.api.voluntarios.removeHoras(v.id, b.dataset.rmh); ICM.app.reload(); } }));
  };

  function form(v = {}) {
    const F = o => ui().field(o);
    const m = ui().modal({
      title: v.id ? 'Editar voluntário' : 'Novo voluntário',
      body: `<form class="grid grid-2">
        ${F({ name: 'nome', label: 'Nome completo', value: v.nome, required: true, cls: 'span-2' })}
        ${F({ name: 'cpf', label: 'CPF', value: v.cpf })}${F({ name: 'nascimento', label: 'Nascimento', type: 'date', value: v.nascimento })}
        ${F({ name: 'telefone', label: 'Telefone', value: v.telefone })}${F({ name: 'email', label: 'E-mail', type: 'email', value: v.email })}
        ${F({ name: 'profissao', label: 'Profissão', value: v.profissao })}${F({ name: 'area', label: 'Área de atuação', value: v.area })}
        ${F({ name: 'disponibilidade', label: 'Disponibilidade', value: v.disponibilidade, cls: 'span-2' })}
        ${F({ name: 'endereco', label: 'Endereço', value: v.endereco, cls: 'span-2' })}
        ${F({ name: 'inicio', label: 'Início', type: 'date', value: v.inicio || ICM.util.today() })}${F({ name: 'fim', label: 'Término (se houver)', type: 'date', value: v.fim })}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: v.status || 'ativo', options: [['ativo', 'Ativo'], ['inativo', 'Inativo']] })}
        ${F({ name: 'termo_assinado', label: 'Termo de adesão assinado', type: 'toggle', value: v.termo_assinado })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const x = await ui().run(() => ICM.api.voluntarios.save(v.id ? { ...v, ...d, total_horas: undefined } : d), 'Voluntário salvo');
      m.close(); location.hash = `#/voluntarios/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
  }

  function stat(icon, color, val, label) { return `<div class="card stat hoverable"><div class="ic" style="--c:${color}">${I(icon, 22)}</div><div class="val" data-count="${val}">0</div><div class="lbl">${esc(label)}</div></div>`; }
  ICM.pages._stat = stat;
})();
