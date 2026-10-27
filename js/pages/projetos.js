/* Projetos: lista, ficha completa, formulário e turmas */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money, num } = ICM.util;
  const ui = () => ICM.ui;

  // ---------- Lista ----------
  ICM.pages.projetos = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Projetos']]);
    const list = await ICM.api.projetos.list();
    const stats = {}; for (const p of list) stats[p.id] = await ICM.api.projetos.stats(p.id);
    let area = '';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Projetos</h1><div class="page-sub">Projetos, turmas e atividades em cada área de atuação</div></div>
        ${ICM.auth.can('projetos.editar') ? `<button class="btn btn-primary" data-new>${I('plus', 18)} Novo projeto</button>` : ''}</div>
      <div class="segmented mb-4" data-area><button data-v="" class="active">Todas as áreas</button>${Object.entries(ICM.C.AREAS).map(([k, v]) => `<button data-v="${k}">${esc(v.nome)}</button>`).join('')}</div>
      <div class="grid grid-3 stagger" data-list></div>
    </div>`;
    const render = () => {
      const l = list.filter(p => !area || p.area === area);
      el.querySelector('[data-list]').innerHTML = l.length ? l.map(p => { const s = stats[p.id]; return `
        <div class="card project-card hoverable" style="--c:${p.cor}" data-href="#/projetos/${esc(p.id)}">
          <div class="row between">${ui().areaChip(p.area)}${ui().statusProjeto(p.status)}</div>
          <div><div class="name">${esc(p.nome)}</div><div class="small muted mt-2 truncate">${esc(p.financiador || '')}</div></div>
          <div class="meta"><span>${I('layers', 15)} ${s.turmas} turmas</span><span>${I('users', 15)} ${s.ativos} alunos</span><span>${I('clock', 15)} ${num(s.horas)}h</span></div>
          <div><div class="row between xs bold muted"><span>Frequência média</span><span>${s.freq}%</span></div><div class="progress mt-2 ${s.freq >= 75 ? 'ok' : 'warn'}"><span style="width:${s.freq}%"></span></div></div>
          <div class="row between xs muted"><span>${esc(fmtDate(p.inicio))} → ${esc(fmtDate(p.fim))}</span>${p.fonte && p.fonte !== 'privada' && p.fonte !== 'propria' ? ui().badge('Recurso público', 'warn') : ''}</div>
        </div>`; }).join('') : `<div class="span-all">${ui().empty('Nenhum projeto nesta área', 'folder')}</div>`;
      el.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
    };
    el.querySelectorAll('[data-area] button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('[data-area] button').forEach(x => x.classList.toggle('active', x === b)); area = b.dataset.v; render(); }));
    const nb = el.querySelector('[data-new]'); if (nb) nb.addEventListener('click', () => projetoForm());
    render();
  };

  // ---------- Detalhe ----------
  ICM.pages.projetoDetalhe = async function (el, params, query) {
    const p = await ICM.api.projetos.get(params.id);
    if (!p) { el.innerHTML = ui().empty('Projeto não encontrado'); return; }
    ICM.app.setCrumbs([['Projetos', '#/projetos'], [p.nome]]);
    const s = await ICM.api.projetos.stats(p.id);
    const turmas = await ICM.api.turmas.list(p.id);
    const users = await ICM.api.usuarios.list();
    const uname = id => (users.find(x => x.id === id) || {}).nome || 'Professor(a) a definir';
    const area = ICM.C.AREAS[p.area];
    const tab0 = query.get('tab') || 'turmas';

    el.innerHTML = `<div class="page">
      <div class="card mb-4 project-card" style="--c:${p.cor};cursor:default">
        <div class="row between wrap">
          <div class="row"><div class="stat"><div class="ic" style="--c:${p.cor}">${I(area.icon, 24)}</div></div>
            <div><div class="row wrap">${ui().areaChip(p.area)}${ui().statusProjeto(p.status)}</div><h1 class="page-title mt-2" style="font-size:28px">${esc(p.nome)}</h1><div class="small muted">${esc(p.financiador)} · ${esc(p.numero_termo || '')}</div></div></div>
          <div class="row wrap">
            ${ICM.auth.can('projetos.editar') ? `<button class="btn" data-edit>${I('edit', 18)} Editar projeto</button>` : ''}
            <button class="btn btn-primary" data-rel>${I('fileText', 18)} Relatório do projeto</button>
          </div>
        </div>
        <div class="grid grid-4 mt-4">
          ${mini('Turmas', s.turmas, 'layers')}${mini('Alunos ativos', s.ativos, 'users')}${mini('Horas de aula', Math.round(s.horas), 'clock', 'h')}${mini('Frequência média', s.freq, 'userCheck', '%')}
        </div>
      </div>
      <div class="tabs mb-4">
        ${[['turmas', 'Turmas / atividades', 'layers'], ['dados', 'Dados do projeto', 'fileText'], ['metas', 'Metas e indicadores', 'target'], ['eventos', 'Eventos', 'star']].map(([k, t, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${t}</button>`).join('')}
      </div>
      <div data-panel></div>
    </div>`;

    const panel = el.querySelector('[data-panel]');
    const R = {
      async turmas() {
        const cont = {}; for (const t of turmas) cont[t.id] = (await ICM.api.turmas.alunos(t.id)).filter(m => m.status === 'ativo').length;
        panel.innerHTML = `<div class="tab-panel">
          <div class="row between mb-4"><div class="muted small">${turmas.length} turma(s) neste projeto</div>${ICM.auth.can('turmas.editar') ? `<button class="btn btn-primary btn-sm" data-newt>${I('plus', 16)} Nova turma</button>` : ''}</div>
          <div class="grid grid-3 stagger">${turmas.map(t => `
            <div class="card hoverable project-card" style="--c:${p.cor}" data-href="#/turmas/${esc(t.id)}">
              <div class="name">${esc(t.nome)}</div>
              <div class="meta"><span>${I('user', 15)} ${esc(uname(t.professor_id))}</span><span>${I('clock', 15)} ${esc(diasTxt(t.dias))} · ${esc(t.inicio)}–${esc(t.fim)}</span><span>${I('pin', 15)} ${esc(t.local || '')}</span></div>
              <div><div class="row between xs bold muted"><span>Ocupação</span><span>${cont[t.id]}/${t.vagas || '∞'} vagas</span></div><div class="progress mt-2"><span style="width:${t.vagas ? Math.min(100, cont[t.id] / t.vagas * 100) : 0}%"></span></div></div>
            </div>`).join('') || `<div class="span-all">${ui().empty('Nenhuma turma cadastrada', 'layers')}</div>`}</div></div>`;
        panel.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
        const nb = panel.querySelector('[data-newt]'); if (nb) nb.addEventListener('click', () => turmaForm({ projeto_id: p.id }));
      },
      async dados() {
        const block = (t, v, ic) => `<div class="card"><div class="section-title">${I(ic, 18)} ${t}</div><div class="text-block">${esc(v || 'Não informado')}</div></div>`;
        panel.innerHTML = `<div class="col tab-panel">
          <div class="card"><div class="section-title">${I('info', 18)} Identificação</div>
            ${ui().kv([['Área', area.nome], ['Fonte de recurso', ICM.C.FONTES[p.fonte] || ''], ['Financiador / instrumento', p.financiador], ['Nº do termo / processo', p.numero_termo], ['Valor aprovado', p.valor ? money(p.valor) : ''], ['Vigência', `${fmtDate(p.inicio)} a ${fmtDate(p.fim)}`], ['Coordenação', uname(p.coordenador_id)], ['Local de execução', p.local], ['Público-alvo', p.publico_alvo]])}</div>
          ${block('Justificativa', p.justificativa, 'fileText')}
          <div class="card"><div class="section-title">${I('target', 18)} Objetivos</div><div class="bold mb-4">${esc(p.objetivo_geral || '')}</div>
            <ul class="text-block" style="margin:0;padding-left:20px">${(p.objetivos_especificos || []).map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>
          ${block('Metodologia', p.metodologia, 'book')}
          ${block('Contrapartidas', p.contrapartidas, 'heart')}
        </div>`;
      },
      async metas() {
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Metas e indicadores</div><div class="card-sub">Valores atuais calculados automaticamente a partir dos registros de aulas, turmas e eventos</div></div></div>
          ${(p.metas || []).length ? (p.metas).map(m => { const at = metaAtual(m, s, p); const pc = m.alvo ? Math.min(100, Math.round(at / m.alvo * 100)) : 0; return `
            <div class="mb-4"><div class="row between"><div><b>${esc(m.descricao)}</b><div class="xs muted">${esc(m.indicador)}</div></div><div class="bold">${num(at)} / ${num(m.alvo)} ${esc(m.unidade || '')}</div></div>
            <div class="progress mt-2 ${pc >= 100 ? 'ok' : pc >= 60 ? '' : 'warn'}"><span style="width:${pc}%"></span></div><div class="xs muted mt-2">${pc}% da meta</div></div>`; }).join('') : ui().empty('Nenhuma meta cadastrada', 'target')}</div>`;
      },
      async eventos() {
        const evs = (await ICM.api.eventos.list()).filter(e => e.projeto_id === p.id);
        panel.innerHTML = `<div class="card tab-panel">${evs.length ? evs.map(e => { const t = ICM.C.TIPOS_EVENTO[e.tipo]; return `<a class="list-item" href="#/eventos/${esc(e.id)}"><div class="avatar sm" style="--c:${t.cor}">${I(t.icon, 15)}</div><div class="grow"><div class="bold">${esc(e.titulo)}</div><div class="xs muted">${esc(t.nome)} · ${esc(fmtDate(e.data))} · ${(e.alunos || []).length} alunos</div></div>${I('chevronRight', 16)}</a>`; }).join('') : ui().empty('Nenhum evento vinculado', 'star')}</div>`;
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    const eb = el.querySelector('[data-edit]'); if (eb) eb.addEventListener('click', () => projetoForm(p));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('projeto', { projeto_id: p.id }));
    await R[tab0]();
  };

  function mini(l, v, ic, suf = '') { return `<div class="card flat stat" style="padding:16px"><div class="row">${I(ic, 18)}<span class="lbl">${esc(l)}</span></div><div class="val" style="font-size:26px" data-count="${v}" data-suffix="${suf}">0</div></div>`; }
  function diasTxt(d) { return (d || []).map(x => ICM.C.DIAS_SEMANA.find(y => y.v === x).n).join(', '); }
  function metaAtual(m, s) {
    const ind = (m.indicador || '').toLowerCase();
    if (m.atual_manual != null) return m.atual_manual;
    if (ind.includes('aluno')) return s.ativos;
    if (ind.includes('hora')) return Math.round(s.horas);
    if (ind.includes('presen') || ind.includes('frequ')) return s.freq;
    if (ind.includes('evento') || ind.includes('apresenta') || ind.includes('campeonato')) return s.eventos;
    return m.atual || 0;
  }
  ICM.pages._metaAtual = metaAtual;
  ICM.pages._diasTxt = diasTxt;

  // ---------- Formulário de projeto ----------
  function projetoForm(p = {}) {
    const F = o => ui().field(o);
    const metas = (p.metas || []).map(x => ({ ...x }));
    const m = ui().modal({
      title: p.id ? 'Editar projeto' : 'Novo projeto', size: 'wide',
      body: `<form class="grid grid-3">
        ${F({ name: 'nome', label: 'Nome do projeto', value: p.nome, required: true, cls: 'span-2' })}
        ${F({ name: 'area', label: 'Área de atuação', type: 'select', value: p.area, options: Object.entries(ICM.C.AREAS).map(([k, v]) => [k, v.nome]) })}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: p.status || 'planejamento', options: Object.entries(ICM.C.STATUS_PROJETO).map(([k, v]) => [k, v.nome]) })}
        ${F({ name: 'inicio', label: 'Início da vigência', type: 'date', value: p.inicio, required: true })}
        ${F({ name: 'fim', label: 'Fim da vigência', type: 'date', value: p.fim, required: true })}
        ${F({ name: 'fonte', label: 'Fonte de recurso', type: 'select', value: p.fonte, options: Object.entries(ICM.C.FONTES) })}
        ${F({ name: 'financiador', label: 'Financiador / instrumento', value: p.financiador, cls: 'span-2' })}
        ${F({ name: 'numero_termo', label: 'Nº termo / convênio / PRONAC', value: p.numero_termo })}
        ${F({ name: 'valor', label: 'Valor aprovado (R$)', type: 'number', value: p.valor, attrs: 'min="0" step="0.01"' })}
        ${F({ name: 'local', label: 'Local de execução', value: p.local })}
        ${F({ name: 'publico_alvo', label: 'Público-alvo', value: p.publico_alvo, cls: 'span-all' })}
        ${F({ name: 'justificativa', label: 'Justificativa', type: 'textarea', value: p.justificativa, cls: 'span-all', rows: 4 })}
        ${F({ name: 'objetivo_geral', label: 'Objetivo geral', type: 'textarea', value: p.objetivo_geral, cls: 'span-all', rows: 2 })}
        ${F({ name: 'objetivos_txt', label: 'Objetivos específicos (um por linha)', type: 'textarea', value: (p.objetivos_especificos || []).join('\n'), cls: 'span-all', rows: 4 })}
        ${F({ name: 'metodologia', label: 'Metodologia', type: 'textarea', value: p.metodologia, cls: 'span-all', rows: 4 })}
        ${F({ name: 'contrapartidas', label: 'Contrapartidas', type: 'textarea', value: p.contrapartidas, cls: 'span-all', rows: 2 })}
        <div class="span-all"><div class="row between"><div class="section-title">${I('target', 18)} Metas</div><button type="button" class="btn btn-sm" data-addmeta>${I('plus', 16)} Meta</button></div><div data-metas class="col"></div>
          <div class="xs muted mt-2">Indicadores com as palavras "alunos", "horas", "presença" ou "apresentações/eventos" são calculados automaticamente.</div></div>
      </form>`,
      foot: `${p.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar projeto</button>`
    });
    const box = m.$('[data-metas]');
    const drawMetas = () => {
      box.innerHTML = metas.map((x, i) => `<div class="row wrap card flat" style="padding:12px">
        <input class="input grow" data-i="${i}" data-k="descricao" value="${esc(x.descricao || '')}" placeholder="Descrição da meta" style="min-width:200px">
        <input class="input" data-i="${i}" data-k="indicador" value="${esc(x.indicador || '')}" placeholder="Indicador" style="width:160px">
        <input class="input" data-i="${i}" data-k="alvo" type="number" value="${esc(x.alvo ?? '')}" placeholder="Alvo" style="width:100px">
        <input class="input" data-i="${i}" data-k="unidade" value="${esc(x.unidade || '')}" placeholder="Unidade" style="width:120px">
        <button type="button" class="btn btn-icon btn-sm btn-ghost" data-rm="${i}" aria-label="Remover meta">${I('trash', 16)}</button></div>`).join('') || '<div class="xs muted">Nenhuma meta</div>';
      box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const v = inp.dataset.k === 'alvo' ? Number(inp.value) : inp.value; metas[+inp.dataset.i][inp.dataset.k] = v; }));
      box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { metas.splice(+b.dataset.rm, 1); drawMetas(); }));
    };
    drawMetas();
    m.$('[data-addmeta]').addEventListener('click', () => { metas.push({ descricao: '', indicador: '', alvo: 0, unidade: '' }); drawMetas(); });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      d.objetivos_especificos = (d.objetivos_txt || '').split('\n').map(x => x.trim()).filter(Boolean); delete d.objetivos_txt;
      d.metas = metas.filter(x => x.descricao);
      const r = await ui().run(() => ICM.api.projetos.save(p.id ? { ...p, ...d } : d), 'Projeto salvo');
      m.close(); location.hash = `#/projetos/${r.id}`; ICM.app.reload();
    }).catch(() => { }));
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Excluir projeto', text: `Excluir "${p.nome}"? Só é possível se não houver turmas.`, ok: 'Excluir', danger: true }))) return;
      try { await ui().run(() => ICM.api.projetos.remove(p.id), 'Projeto excluído'); m.close(); location.hash = '#/projetos'; } catch (e) { /* toast já exibido */ }
    });
  }

  // ---------- Formulário de turma ----------
  async function turmaForm(t = {}) {
    const F = o => ui().field(o);
    const profs = await ICM.api.usuarios.professores();
    const projetos = await ICM.api.projetos.list();
    const espacos = (await ICM.api.agenda.recursos()).filter(r => r.tipo === 'espaco' && r.ativo);
    const m = ui().modal({
      title: t.id ? 'Editar turma / atividade' : 'Nova turma / atividade',
      body: `<form class="grid grid-2">
        ${F({ name: 'nome', label: 'Nome da turma', value: t.nome, required: true, cls: 'span-2' })}
        ${F({ name: 'projeto_id', label: 'Projeto', type: 'select', value: t.projeto_id, options: projetos.map(p => [p.id, p.nome]) })}
        ${F({ name: 'modalidade', label: 'Modalidade / atividade', value: t.modalidade })}
        ${F({ name: 'professor_id', label: 'Professor(a) responsável', type: 'select', value: t.professor_id, options: [['', 'A definir'], ...profs.map(u => [u.id, u.nome])] })}
        ${F({ name: 'local', label: 'Local (descrição)', value: t.local })}
        ${F({ name: 'espaco_id', label: 'Espaço reservado na agenda', type: 'select', value: t.espaco_id, options: [['', 'Nenhum'], ...espacos.map(r => [r.id, r.nome])], hint: 'Os horários da turma bloqueiam o espaço na Agenda.' })}
        <div class="field span-2"><span class="label">Dias da semana</span><div class="row wrap">${ICM.C.DIAS_SEMANA.map(d => `<label class="check"><input type="checkbox" name="dias" value="${d.v}" data-multi ${(t.dias || []).includes(d.v) ? 'checked' : ''}> ${d.n}</label>`).join('')}</div></div>
        ${F({ name: 'inicio', label: 'Horário de início', type: 'time', value: t.inicio || '14:00' })}
        ${F({ name: 'fim', label: 'Horário de término', type: 'time', value: t.fim || '16:00' })}
        ${F({ name: 'vagas', label: 'Vagas', type: 'number', value: t.vagas || 20, attrs: 'min="1"' })}
        ${F({ name: 'faixa', label: 'Faixa etária / público', value: t.faixa })}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: t.status || 'ativa', options: [['ativa', 'Ativa'], ['encerrada', 'Encerrada']] })}
      </form>`,
      foot: `${t.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar turma</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      d.dias = (d.dias || []).map(Number);
      const r = await ui().run(() => ICM.api.turmas.save(t.id ? { ...t, ...d } : d), 'Turma salva');
      m.close(); location.hash = `#/turmas/${r.id}`; ICM.app.reload();
    }).catch(() => { }));
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Excluir turma', text: 'Turmas com aulas realizadas não podem ser excluídas — apenas encerradas.', ok: 'Excluir', danger: true }))) return;
      try { await ui().run(() => ICM.api.turmas.remove(t.id), 'Turma excluída'); m.close(); location.hash = `#/projetos/${t.projeto_id}`; } catch (e) { /* toast */ }
    });
  }
  ICM.pages._turmaForm = turmaForm;
})();
