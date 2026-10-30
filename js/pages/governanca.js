/* Governança: diretoria e conselhos (mandatos com aviso de vencimento), atas, estatuto e livro de associados */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const STATUS = { vigente: ['Vigente', 'ok'], a_vencer: ['Vence em breve', 'warn'], encerrado: ['Encerrado', 'danger'] };

  ICM.pages.governanca = async function (el, params, query) {
    if (!ICM.auth.can('governanca.ver')) { el.innerHTML = ui().empty('Acesso restrito à direção e à coordenação.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Governança']]);
    const edit = ICM.auth.can('governanca.gerir');
    const [mandatos, atas, estatutos] = [await ICM.api.governanca.mandatos(), await ICM.api.governanca.atas(), await ICM.api.governanca.estatuto()];
    const vigentes = mandatos.filter(m => m.status !== 'encerrado');
    const aVencer = mandatos.filter(m => m.status === 'a_vencer');
    const vencidos = ['diretoria', 'fiscal'].filter(o => mandatos.some(m => m.orgao === o) && !mandatos.some(m => m.orgao === o && m.status !== 'encerrado'));
    const tab0 = (query && query.get('tab')) || 'mandatos';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Governança</h1><div class="page-sub">Diretoria, conselhos, atas e estatuto — exigidos em editais, termos de fomento e prestação de contas</div></div>
        <button class="btn" data-nominata>${I('printer', 18)} Composição da diretoria (PDF)</button></div>
      ${vencidos.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.35),var(--sh-out)"><b>${I('alert', 16)} Mandato encerrado:</b> ${vencidos.map(o => esc(ICM.C.ORGAOS[o])).join(' e ')} sem membros com mandato vigente. Convoque assembleia para eleição e registre a ata.</div>` : ''}
      ${aVencer.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(245,158,11,.4),var(--sh-out)"><b>${I('calendar', 16)} Mandatos vencendo:</b> ${aVencer.map(m => `${esc(m.cargo)} (${esc(m.nome)}) em ${m.dias} dia(s)`).join(' · ')}. Planeje a assembleia de eleição com antecedência.</div>` : ''}
      <div class="grid grid-4 mb-4 stagger">
        ${ICM.pages._stat('users', '#2563eb', vigentes.length, 'Membros com mandato vigente')}
        ${ICM.pages._stat('calendar', '#f59e0b', aVencer.length, 'Mandatos vencendo (90 dias)')}
        ${ICM.pages._stat('fileText', '#8b5cf6', atas.length, 'Atas registradas')}
        ${ICM.pages._stat('shield', '#10b981', estatutos.length, 'Versões do estatuto')}
      </div>
      <div class="tabs mb-4">${[['mandatos', 'Diretoria e conselhos', 'users'], ['atas', 'Atas', 'fileText'], ['estatuto', 'Estatuto', 'shield'], ['livro', 'Livro de associados', 'key']].map(([k, t, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${t}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    ICM.ui.countUp(el);
    const panel = el.querySelector('[data-panel]');
    el.querySelector('[data-nominata]').addEventListener('click', () => ICM.reports.generate('gov_nominata', {}));

    const R = {
      mandatos() {
        const porOrgao = Object.entries(ICM.C.ORGAOS).map(([k, n]) => [k, n, mandatos.filter(m => m.orgao === k)]);
        panel.innerHTML = `<div class="col tab-panel">${edit ? `<div class="row"><button class="btn btn-primary" data-novo-mand>${I('plus', 16)} Novo membro / mandato</button></div>` : ''}
          ${porOrgao.map(([k, n, l]) => `<div class="card"><div class="card-title mb-4">${esc(n)}</div>${l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Cargo</th><th>Nome</th><th>Mandato</th><th>Situação</th><th>Ata de eleição</th><th></th></tr></thead><tbody>
            ${l.map(m => { const ata = atas.find(a => a.id === m.ata_id); const [st, cls] = STATUS[m.status]; return `<tr><td><b>${esc(m.cargo)}</b></td><td>${esc(m.nome)}</td><td class="small">${esc(fmtDate(m.inicio))} a ${esc(fmtDate(m.fim))}</td>
              <td>${ui().badge(st + (m.status === 'a_vencer' ? ` (${m.dias} dias)` : ''), cls, true)}</td><td class="small">${ata ? `${esc(ICM.C.TIPOS_ATA[ata.tipo])} ${esc(ata.numero || '')}` : '<span class="muted">—</span>'}</td>
              <td style="text-align:right">${edit ? `<button class="btn btn-sm btn-ghost" data-mand="${esc(m.id)}">${I('edit', 14)}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : ui().empty('Nenhum membro cadastrado', 'users')}</div>`).join('')}</div>`;
        const nb = panel.querySelector('[data-novo-mand]'); if (nb) nb.addEventListener('click', () => formMandato({}));
        panel.querySelectorAll('[data-mand]').forEach(b => b.addEventListener('click', () => formMandato(mandatos.find(m => m.id === b.dataset.mand))));
      },
      atas() {
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div class="card-title">Atas de assembleias e reuniões</div>${edit ? `<button class="btn btn-sm btn-primary" data-nova-ata>${I('plus', 14)} Nova ata</button>` : ''}</div>
          ${atas.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Nº</th><th>Pauta</th><th>Registro em cartório</th><th></th></tr></thead><tbody>
          ${atas.map(a => `<tr><td class="small">${esc(fmtDate(a.data))}</td><td><b>${esc(ICM.C.TIPOS_ATA[a.tipo] || a.tipo)}</b></td><td class="small">${esc(a.numero || '')}</td><td class="small">${esc((a.pauta || '').split('\n')[0])}${(a.pauta || '').includes('\n') ? '…' : ''}</td>
            <td>${a.registrada ? ui().badge('Registrada', 'ok', true) : ['ago', 'age'].includes(a.tipo) ? ui().badge('Registrar', 'warn', true) : '<span class="muted small">—</span>'}</td>
            <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm" data-pdf="${esc(a.id)}">${I('printer', 14)} PDF</button>${edit ? ` <button class="btn btn-sm btn-ghost" data-ata="${esc(a.id)}">${I('edit', 14)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhuma ata registrada', 'fileText')}
          <div class="xs muted mt-4">Atas de assembleia (eleição, contas, alteração de estatuto) precisam ser registradas em cartório para valer perante terceiros.</div></div>`;
        const nb = panel.querySelector('[data-nova-ata]'); if (nb) nb.addEventListener('click', () => formAta({ data: ICM.util.today(), local: 'Sede do Instituto' }));
        panel.querySelectorAll('[data-ata]').forEach(b => b.addEventListener('click', () => formAta(atas.find(a => a.id === b.dataset.ata))));
        panel.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('gov_ata', { id: b.dataset.pdf })));
      },
      estatuto() {
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div class="card-title">Estatuto social e alterações</div>${edit ? `<button class="btn btn-sm btn-primary" data-novo-est>${I('plus', 14)} Nova versão</button>` : ''}</div>
          ${estatutos.length ? estatutos.map((e, i) => `<div class="list-item"><div class="ic" style="--c:${i ? '#64748b' : '#10b981'}">${I('shield', 18)}</div><div class="grow"><b>${esc(e.versao)}</b> ${i ? '' : ui().badge('Vigente', 'ok', true)}
            <div class="xs muted">Aprovado em ${esc(fmtDate(e.data_aprovacao))}${e.registro ? ' · ' + esc(e.registro) : ''}</div>${e.resumo ? `<div class="small mt-2">${esc(e.resumo)}</div>` : ''}</div>
            <div class="row">${e.arquivo && e.arquivo.id ? `<button class="btn btn-sm" data-ver="${esc(e.arquivo.id)}">${I('eye', 14)} Ver</button>` : ''}${edit ? `<button class="btn btn-sm btn-ghost" data-est="${esc(e.id)}">${I('edit', 14)}</button>` : ''}</div></div>`).join('') : ui().empty('Nenhuma versão cadastrada', 'shield')}
          <div class="xs muted mt-4">Para termos de fomento e colaboração (Lei 13.019/2014, art. 33), o estatuto precisa prever objetivos de relevância pública e a destinação do patrimônio a outra OSC em caso de dissolução.</div></div>`;
        const nb = panel.querySelector('[data-novo-est]'); if (nb) nb.addEventListener('click', () => formEstatuto({}));
        panel.querySelectorAll('[data-est]').forEach(b => b.addEventListener('click', () => formEstatuto(estatutos.find(x => x.id === b.dataset.est))));
        panel.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => ICM.pages._verArquivo(b.dataset.ver)));
      },
      async livro() {
        let l = []; try { l = await ICM.api.governanca.livro(); } catch (e) { panel.innerHTML = ui().empty(e.message, 'lock'); return; }
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Livro de registro de associados</div><div class="card-sub">${l.filter(a => a.status === 'ativo').length} ativo(s) de ${l.length}</div></div><button class="btn btn-sm" data-livro-pdf>${I('printer', 14)} PDF</button></div>
          ${l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Associado(a)</th><th>Categoria</th><th>Adesão</th><th>Aluno vinculado</th><th>Situação</th></tr></thead><tbody>
          ${l.map(a => `<tr><td class="small bold">${esc(a.numero)}</td><td>${esc(a.titular)}</td><td class="small">${esc((ICM.C.CATEGORIAS_ASSOCIADO || {})[a.categoria] || a.categoria || '')}</td><td class="small">${esc(fmtDate(a.data_adesao))}</td><td class="small">${esc(a.aluno_nome)}</td><td>${ui().badge(a.status === 'ativo' ? 'Ativo' : a.status, a.status === 'ativo' ? 'ok' : 'neutral', true)}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhum associado', 'key')}</div>`;
        panel.querySelector('[data-livro-pdf]').addEventListener('click', () => ICM.reports.generate('gov_livro', {}));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    await R[tab0]();

    function formMandato(m) {
      const F = o => ui().field(o);
      const md = ui().modal({
        title: m.id ? 'Editar mandato' : 'Novo membro / mandato',
        body: `<form class="grid grid-2">${F({ name: 'orgao', label: 'Órgão', type: 'select', value: m.orgao || 'diretoria', options: Object.entries(ICM.C.ORGAOS) })}${F({ name: 'cargo', label: 'Cargo', value: m.cargo, required: true, placeholder: 'Ex.: Presidente, Tesoureiro, Conselheiro fiscal' })}
          ${F({ name: 'nome', label: 'Nome completo', value: m.nome, required: true, cls: 'span-2' })}${F({ name: 'cpf', label: 'CPF (para a nominata)', value: m.cpf })}${F({ name: 'profissao', label: 'Profissão', value: m.profissao })}
          ${F({ name: 'inicio', label: 'Início do mandato', type: 'date', value: m.inicio, required: true })}${F({ name: 'fim', label: 'Fim do mandato', type: 'date', value: m.fim, required: true })}
          ${F({ name: 'ata_id', label: 'Ata de eleição / posse', type: 'select', value: m.ata_id, options: [['', '—'], ...atas.map(a => [a.id, `${fmtDate(a.data)} — ${ICM.C.TIPOS_ATA[a.tipo]} ${a.numero || ''}`])], cls: 'span-2' })}</form>`,
        foot: `${m.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>`
      });
      md.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { const d = ICM.util.formData(md.$('form')); if (d.fim && d.inicio && d.fim < d.inicio) return ui().toast('O fim do mandato deve ser depois do início.', 'warn'); const { status, dias, ...base } = m; await ui().run(() => ICM.api.governanca.salvarMandato({ ...base, ...d }), 'Mandato salvo'); md.close(); ICM.app.reload(); }).catch(() => { }));
      const del = md.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir mandato', text: `Excluir ${m.cargo} — ${m.nome}?`, ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.governanca.removerMandato(m.id), 'Excluído'); md.close(); ICM.app.reload(); } });
    }
    function formAta(a) {
      const F = o => ui().field(o);
      const md = ui().modal({
        title: a.id ? 'Editar ata' : 'Nova ata', size: 'wide',
        body: `<form class="grid grid-4">${F({ name: 'tipo', label: 'Tipo', type: 'select', value: a.tipo || 'ago', options: Object.entries(ICM.C.TIPOS_ATA), cls: 'span-2' })}${F({ name: 'numero', label: 'Número', value: a.numero, placeholder: '01/2026' })}${F({ name: 'data', label: 'Data', type: 'date', value: a.data, required: true })}
          ${F({ name: 'horario', label: 'Horário', type: 'time', value: a.horario })}${F({ name: 'local', label: 'Local', value: a.local, cls: 'span-3' })}
          ${F({ name: 'presentes', label: 'Presentes', type: 'textarea', rows: 2, value: a.presentes, cls: 'span-all' })}
          ${F({ name: 'pauta', label: 'Pauta (um item por linha)', type: 'textarea', rows: 3, value: a.pauta, cls: 'span-2' })}${F({ name: 'deliberacoes', label: 'Deliberações', type: 'textarea', rows: 3, value: a.deliberacoes, cls: 'span-2' })}
          ${F({ name: 'texto', label: 'Texto completo da ata', type: 'textarea', rows: 8, value: a.texto, cls: 'span-all' })}
          ${F({ name: 'registrada', label: 'Registrada em cartório', type: 'toggle', value: a.registrada, cls: 'span-2' })}${F({ name: 'registro', label: 'Dados do registro', value: a.registro, cls: 'span-2', placeholder: 'Cartório, livro, número e data' })}</form>`,
        foot: `${a.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>`
      });
      md.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.governanca.salvarAta({ ...a, ...ICM.util.formData(md.$('form')) }), 'Ata salva'); md.close(); location.hash = '#/governanca?tab=atas'; ICM.app.reload(); }).catch(() => { }));
      const del = md.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir ata', text: 'A ata será excluída. Continuar?', ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.governanca.removerAta(a.id), 'Excluída'); md.close(); ICM.app.reload(); } });
    }
    function formEstatuto(e) {
      const F = o => ui().field(o);
      const md = ui().modal({
        title: e.id ? 'Editar versão do estatuto' : 'Nova versão do estatuto',
        body: `<form class="grid grid-2">${F({ name: 'versao', label: 'Versão', value: e.versao, required: true, placeholder: 'Ex.: 2ª alteração estatutária', cls: 'span-2' })}${F({ name: 'data_aprovacao', label: 'Aprovado em', type: 'date', value: e.data_aprovacao, required: true })}${F({ name: 'registro', label: 'Registro / averbação', value: e.registro })}
          ${F({ name: 'resumo', label: 'O que mudou', type: 'textarea', rows: 3, value: e.resumo, cls: 'span-2' })}
          <label class="photo-drop span-2" style="aspect-ratio:auto;padding:18px">${I('upload', 24)}<span data-fn>${e.arquivo && e.arquivo.nome ? 'Trocar arquivo (' + esc(e.arquivo.nome) + ')' : 'Anexar estatuto registrado (PDF)'}</span><input type="file" name="_arq" accept="application/pdf,image/jpeg,image/png" hidden></label></form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>`
      });
      const fi = md.$('[name=_arq]'); fi.addEventListener('change', () => { md.$('[data-fn]').textContent = fi.files[0] ? fi.files[0].name : 'Anexar'; });
      md.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
        const d = ICM.util.formData(md.$('form')); delete d._arq;
        let arquivo = e.arquivo && e.arquivo.id ? e.arquivo : null;
        if (fi.files[0]) { const novo = await ui().run(() => ICM.api.arquivos.salvar(fi.files[0], { col: 'estatuto', id: e.id || 'novo' })); if (arquivo) await ICM.api.arquivos.remove(arquivo.id).catch(() => { }); arquivo = novo; }
        await ui().run(() => ICM.api.governanca.salvarEstatuto({ ...e, ...d, arquivo }), 'Estatuto salvo'); md.close(); location.hash = '#/governanca?tab=estatuto'; ICM.app.reload();
      }).catch(() => { }));
    }
  };

  // ---------- Documentos de governança ----------
  const h = () => ICM.reports.h;
  ICM.reports.register('gov_nominata', {
    title: 'Composição da diretoria',
    steps: ['Lendo mandatos vigentes', 'Organizando por órgão', 'Montando nominata'],
    build: async () => {
      const { sec, head, table, signs } = h();
      const l = (await ICM.api.governanca.mandatos()).filter(m => m.status !== 'encerrado');
      let html = head('Composição da Diretoria e dos Conselhos', `Nominata em ${fmtDate(ICM.util.today())}`);
      Object.entries(ICM.C.ORGAOS).forEach(([k, n]) => {
        const x = l.filter(m => m.orgao === k); if (!x.length) return;
        html += sec(`<h2>${esc(n)}</h2>${table([{ t: 'Cargo' }, { t: 'Nome' }, { t: 'CPF' }, { t: 'Profissão' }, { t: 'Mandato' }], x.map(m => [m.cargo, m.nome, m.cpf ? ICM.util.maskCPF(m.cpf) : '', m.profissao || '', `${fmtDate(m.inicio)} a ${fmtDate(m.fim)}`]))}`);
      });
      if (!l.length) html += sec('<p>Nenhum mandato vigente cadastrado.</p>');
      html += signs('Presidência', 'Secretaria');
      return { title: 'Composição da diretoria', html, file: `nominata-${ICM.util.today()}` };
    }
  });
  ICM.reports.register('gov_ata', {
    title: 'Ata',
    steps: ['Lendo ata', 'Montando documento'],
    build: async ({ id }) => {
      const { sec, head, meta, signs } = h();
      const a = (await ICM.api.governanca.atas()).find(x => x.id === id);
      if (!a) throw new Error('Ata não encontrada.');
      let html = head(`Ata — ${ICM.C.TIPOS_ATA[a.tipo] || a.tipo}`, `${a.numero ? 'Nº ' + a.numero + ' · ' : ''}${fmtDate(a.data)}`);
      html += meta([['Data', fmtDate(a.data)], ['Horário', a.horario], ['Local', a.local], ['Registro', a.registrada ? (a.registro || 'Registrada') : 'Não registrada']]);
      if (a.presentes) html += sec(`<h2>Presentes</h2><p>${esc(a.presentes)}</p>`);
      if (a.pauta) html += sec(`<h2>Pauta</h2><ol>${a.pauta.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
      if (a.texto) html += sec(`<h2>Ata</h2>${a.texto.split('\n').filter(Boolean).map(p => `<p style="text-align:justify">${esc(p)}</p>`).join('')}`);
      if (a.deliberacoes) html += sec(`<h2>Deliberações</h2><p>${esc(a.deliberacoes)}</p>`);
      html += signs('Presidente da sessão', 'Secretário(a) da sessão');
      return { title: `Ata ${a.numero || fmtDate(a.data)}`, html, file: `ata-${a.data}` };
    }
  });
  ICM.reports.register('gov_livro', {
    title: 'Livro de associados',
    steps: ['Lendo associados', 'Montando livro'],
    build: async () => {
      const { sec, head, kpis, table, signs } = h();
      const l = await ICM.api.governanca.livro();
      let html = head('Livro de Registro de Associados', `Posição em ${fmtDate(ICM.util.today())}`);
      html += kpis([[l.length, 'Associados registrados'], [l.filter(a => a.status === 'ativo').length, 'Ativos'], [l.filter(a => a.status !== 'ativo').length, 'Desligados/suspensos'], [new Set(l.map(a => a.categoria)).size, 'Categorias']]);
      html += sec(table([{ t: 'Nº' }, { t: 'Associado(a)' }, { t: 'Categoria' }, { t: 'Adesão' }, { t: 'Situação' }], l.map(a => [a.numero, a.titular, (ICM.C.CATEGORIAS_ASSOCIADO || {})[a.categoria] || a.categoria || '', fmtDate(a.data_adesao), a.status === 'ativo' ? 'Ativo' : a.status])));
      html += signs('Secretaria', 'Presidência');
      return { title: 'Livro de associados', html, file: `livro-associados-${ICM.util.today()}` };
    }
  });
})();
