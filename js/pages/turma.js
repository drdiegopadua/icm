/* Turma: aulas (plano, chamada, relatório, fotos), alunos e frequência */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.turma = async function (el, params, query) {
    const t = await ICM.api.turmas.get(params.id);
    if (!t) { el.innerHTML = ui().empty('Turma não encontrada'); return; }
    const p = await ICM.api.projetos.get(t.projeto_id);
    const users = await ICM.api.usuarios.list();
    const prof = users.find(u => u.id === t.professor_id) || {};
    ICM.app.setCrumbs([['Projetos', '#/projetos'], [p.nome, `#/projetos/${p.id}`], [t.nome]]);
    let ym = query.get('mes') || ICM.util.today().slice(0, 7);
    const tab0 = query.get('tab') || 'aulas';

    el.innerHTML = `<div class="page">
      <div class="card mb-4 project-card" style="--c:${p.cor};cursor:default">
        <div class="row between wrap">
          <div><div class="row wrap">${ui().areaChip(p.area)}<span class="badge neutral">${esc(t.modalidade || '')}</span>${t.status === 'encerrada' ? ui().badge('Encerrada', 'neutral') : ui().badge('Ativa', 'ok', true)}</div>
            <h1 class="page-title mt-2" style="font-size:28px">${esc(t.nome)}</h1>
            <div class="meta mt-2"><span>${I('user', 15)} ${esc(prof.nome || 'Professor(a) a definir')}</span><span>${I('calendar', 15)} ${esc(ICM.pages._diasTxt(t.dias))}</span><span>${I('clock', 15)} ${esc(t.inicio)}–${esc(t.fim)}</span><span>${I('pin', 15)} ${esc(t.local || '')}</span></div></div>
          <div class="row wrap">
            ${ICM.auth.can('turmas.editar') ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button>` : ''}
            ${ICM.auth.can('aulas.registrar') ? `<button class="btn btn-primary" data-nova>${I('plus', 18)} Registrar aula</button>` : ''}
          </div>
        </div>
      </div>
      <div class="row between wrap mb-4">
        <div class="tabs">${[['aulas', 'Aulas', 'book'], ['alunos', 'Alunos', 'users'], ['frequencia', 'Frequência', 'userCheck'], ['fotos', 'Fotos', 'image'], ['relatorios', 'Relatórios', 'fileText']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
        <div class="row"><button class="btn btn-icon btn-sm" data-ym="-1" aria-label="Mês anterior">${I('chevronLeft', 16)}</button><b data-ymlabel style="min-width:150px;text-align:center;text-transform:capitalize"></b><button class="btn btn-icon btn-sm" data-ym="1" aria-label="Próximo mês">${I('chevronRight', 16)}</button></div>
      </div>
      <div data-panel></div>
    </div>`;

    const panel = el.querySelector('[data-panel]');
    let cur = tab0;
    const setYm = () => { el.querySelector('[data-ymlabel]').textContent = ICM.util.fmtMonth(ym); };
    setYm();
    el.querySelectorAll('[data-ym]').forEach(b => b.addEventListener('click', () => {
      const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + Number(b.dataset.ym), 1); ym = ICM.util.iso(d).slice(0, 7); setYm(); R[cur]();
    }));

    const R = {
      async aulas() {
        const aulas = await ICM.api.aulas.list(t.id, ym);
        const { linhas } = await ICM.api.assiduidade.turma(t.id, ym);
        const horas = aulas.filter(a => a.status === 'realizada').reduce((s, a) => s + a.horas, 0);
        const hoje = ICM.util.today();
        panel.innerHTML = `<div class="tab-panel">
          <div class="grid grid-4 mb-4">
            ${mini('Aulas realizadas', aulas.filter(a => a.status === 'realizada').length, 'check')}
            ${mini('Horas no mês', num(horas, 1) + 'h', 'clock')}
            ${mini('Planejadas', aulas.filter(a => a.status === 'planejada').length, 'calendar')}
            ${mini('Alunos em alerta', linhas.filter(l => l.nivel !== 'ok' && l.status_turma === 'ativo').length, 'alert')}
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Aulas de ${esc(ICM.util.fmtMonth(ym))}</div>${ICM.auth.can('aulas.registrar') ? `<button class="btn btn-sm" data-gerar>${I('sparkles', 16)} Planejar aulas do mês</button>` : ''}</div>
            ${aulas.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Tema / plano</th><th>Presença</th><th>Relatório</th><th>Fotos</th><th>Situação</th></tr></thead><tbody>
            ${aulas.map(a => { const pr = Object.values(a.presencas || {}); const P = pr.filter(v => v !== 'F').length; const atrasada = a.status === 'planejada' && a.data < hoje; return `
              <tr class="clickable" data-aula="${esc(a.id)}"><td><b>${esc(fmtDate(a.data))}</b><div class="xs muted">${esc(ICM.util.DIAS[ICM.util.parseD(a.data).getDay()])} · ${esc(a.inicio)}–${esc(a.fim)}</div></td>
              <td class="small"><b>${esc(a.plano && a.plano.tema || 'Sem plano')}</b></td>
              <td>${pr.length ? `<b>${P}/${pr.length}</b>` : '<span class="muted">—</span>'}</td>
              <td>${a.relatorio && a.relatorio.texto ? ui().badge('Preenchido', 'ok') : ui().badge('Pendente', a.status === 'realizada' || atrasada ? 'warn' : 'neutral')}</td>
              <td>${(a.fotos || []).length ? `<span class="row" style="gap:4px">${I('image', 14)} ${(a.fotos || []).length}</span>` : '<span class="muted">—</span>'}</td>
              <td>${a.status === 'realizada' ? ui().badge('Realizada', 'ok', true) : atrasada ? ui().badge('Aguardando registro', 'warn', true) : a.status === 'cancelada' ? ui().badge('Cancelada', 'danger', true) : ui().badge('Planejada', 'neutral', true)}</td></tr>`; }).join('')}
            </tbody></table></div>` : ui().empty('Nenhuma aula neste mês', 'book')}
          </div></div>`;
        panel.querySelectorAll('[data-aula]').forEach(r => r.addEventListener('click', () => aulaModal(r.dataset.aula)));
        const g = panel.querySelector('[data-gerar]'); if (g) g.addEventListener('click', planejarMes);
      },

      async alunos() {
        const mats = await ICM.api.turmas.alunos(t.id);
        const { linhas } = await ICM.api.assiduidade.turma(t.id, ICM.util.today().slice(0, 7));
        const ativos = mats.filter(m => m.status === 'ativo'), sairam = mats.filter(m => m.status !== 'ativo');
        const canMng = ICM.auth.can('turmas.alunos');
        panel.innerHTML = `<div class="tab-panel col">
          <div class="card"><div class="card-head"><div><div class="card-title">Alunos ativos</div><div class="card-sub">${ativos.length} de ${t.vagas || '∞'} vagas</div></div><div class="row">${ICM.auth.can('avaliacoes.registrar') ? `<button class="btn btn-sm" data-aval>${I('chart', 16)} Avaliar evolução</button>` : ''}<button class="btn btn-sm" data-cart>${I('key', 16)} Carteirinhas (QR)</button>${canMng ? `<button class="btn btn-primary btn-sm" data-add>${I('userPlus', 16)} Incluir alunos</button>` : ''}</div></div>
            ${ativos.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Entrada</th><th>Faltas no mês</th><th>Saúde</th><th></th></tr></thead><tbody>
            ${ativos.map(m => { const l = linhas.find(x => x.aluno_id === m.aluno_id) || { F: 0, nivel: 'ok' }; const sa = m.aluno.saude || {}; return `<tr>
              <td><a class="row" href="#/alunos/${esc(m.aluno_id)}" style="color:inherit">${ICM.util.avatar(m.aluno.nome, m.aluno.foto, 'sm')}<div><b>${esc(m.aluno.nome)}</b><div class="xs muted">${esc(m.aluno.matricula)}</div></div></a></td>
              <td class="small">${canMng ? `<button class="btn btn-sm btn-ghost" data-entrada="${esc(m.id)}" data-dt="${esc(m.entrada)}" title="Corrigir data de entrada">${esc(fmtDate(m.entrada))} ${I('edit', 13)}</button>` : esc(fmtDate(m.entrada))}</td>
              <td>${l.nivel !== 'ok' ? ui().nivelPill(l.nivel, l.F) : `<span class="badge ok">${l.F}</span>`}</td>
              <td class="small">${[sa.alergias && `Alergia: ${sa.alergias}`, sa.condicoes, sa.medicamentos].filter(Boolean).map(x => `<span class="badge danger">${esc(x)}</span>`).join(' ') || '<span class="muted">—</span>'}</td>
              <td style="text-align:right">${canMng ? `<button class="btn btn-sm btn-danger" data-out="${esc(m.id)}" data-nome="${esc(m.aluno.nome)}">${I('userX', 16)} Retirar</button>` : ''}</td></tr>`; }).join('')}
            </tbody></table></div>` : ui().empty('Nenhum aluno ativo', 'users')}</div>
          ${sairam.length ? `<div class="card"><div class="card-title mb-4">Histórico de saídas</div><div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Entrada</th><th>Saída</th><th>Motivo</th></tr></thead><tbody>
            ${sairam.map(m => `<tr><td><a href="#/alunos/${esc(m.aluno_id)}"><b>${esc(m.aluno.nome)}</b></a></td><td class="small">${esc(fmtDate(m.entrada))}</td><td class="small">${esc(fmtDate(m.saida))}</td><td class="small">${esc(m.motivo_saida || '')}${m.obs_saida ? ` — ${esc(m.obs_saida)}` : ''}</td></tr>`).join('')}
          </tbody></table></div></div>` : ''}
        </div>`;
        const add = panel.querySelector('[data-add]'); if (add) add.addEventListener('click', () => incluirAlunos(ativos.map(m => m.aluno_id)));
        panel.querySelector('[data-cart]').addEventListener('click', () => ICM.pages._carteirinhas(ativos.map(m => m.aluno)));
        const av = panel.querySelector('[data-aval]'); if (av) av.addEventListener('click', () => ICM.pages._avaliarTurma(t.id));
        panel.querySelectorAll('[data-out]').forEach(b => b.addEventListener('click', () => retirarAluno(b.dataset.out, b.dataset.nome)));
        panel.querySelectorAll('[data-entrada]').forEach(b => b.addEventListener('click', () => {
          const md = ui().modal({ title: 'Data de entrada na turma', size: 'sm', body: `<form class="col"><p class="small">O aluno só aparece na chamada das aulas a partir desta data.</p>${ui().field({ name: 'entrada', label: 'Entrou na turma em', type: 'date', value: b.dataset.dt })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>` });
          md.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.turmas.alterarEntrada(b.dataset.entrada, md.$('[name=entrada]').value), 'Data de entrada corrigida'); md.close(); ICM.app.reload(); }).catch(() => { }));
        }));
      },

      async frequencia() {
        const { aulas, linhas, cfg } = await ICM.api.assiduidade.turma(t.id, ym);
        panel.innerHTML = `<div class="card tab-panel">
          <div class="card-head"><div><div class="card-title">Mapa de frequência — ${esc(ICM.util.fmtMonth(ym))}</div><div class="card-sub">P = presente · F = falta · J = falta justificada · Alerta com ${cfg.alerta} faltas, desligamento com ${cfg.desligamento}</div></div>
            <button class="btn btn-sm" data-relassid>${I('fileText', 16)} Relatório de assiduidade</button></div>
          ${aulas.length ? `<div class="table-wrap"><table class="table att-matrix"><thead><tr><th>Aluno</th>${aulas.map(a => `<th class="c">${esc(ICM.util.fmtDateShort(a.data).split(' ')[0])}</th>`).join('')}<th class="c">P</th><th class="c">F</th><th class="c">J</th><th class="c">%</th><th>Situação</th></tr></thead><tbody>
            ${linhas.map(l => `<tr><td><b>${esc(l.nome)}</b>${l.status_turma !== 'ativo' ? ' <span class="xs muted">(saiu)</span>' : ''}</td>${aulas.map(a => { const v = (a.presencas || {})[l.aluno_id] || ''; return `<td class="c ${v}">${v || '·'}</td>`; }).join('')}
              <td class="c P">${l.P}</td><td class="c F">${l.F}</td><td class="c J">${l.J}</td><td class="c">${l.freq ?? '—'}</td><td>${l.nivel === 'ok' ? ui().badge('Regular', 'ok') : ui().nivelPill(l.nivel, l.F)}</td></tr>`).join('')}
          </tbody></table></div>` : ui().empty('Nenhuma aula realizada neste mês', 'userCheck')}</div>`;
        panel.querySelector('[data-relassid]').addEventListener('click', () => ICM.reports.generate('assiduidade', { turma_id: t.id, ym }));
      },

      async fotos() {
        const aulas = (await ICM.api.aulas.list(t.id, ym)).filter(a => (a.fotos || []).length);
        panel.innerHTML = `<div class="card tab-panel">${aulas.length ? aulas.map(a => `<div class="mb-4"><div class="section-title">${I('calendar', 16)} ${esc(fmtDate(a.data))} — ${esc(a.plano && a.plano.tema || '')}</div><div data-g="${esc(a.id)}"></div></div>`).join('') : ui().empty('Nenhuma foto neste mês', 'image')}</div>`;
        aulas.forEach(a => ui().photoPicker(panel.querySelector(`[data-g="${a.id}"]`), a.fotos, () => { }, { editable: false }));
      },

      async relatorios() {
        const ano = ym.slice(0, 4);
        panel.innerHTML = `<div class="grid grid-3 tab-panel">
          ${repCard('Relatório mensal da turma', `Plano de aula, horas, professor, fotos, relatório e chamada de cada aula — ${ICM.util.fmtMonth(ym)}.`, 'calendar', '#2563eb', 'mensal')}
          ${repCard('Relatório anual da turma', `Consolidado de ${ano}: aulas, horas, frequência por aluno, evolução mês a mês e galeria.`, 'chart', '#8b5cf6', 'anual')}
          ${repCard('Relatório de assiduidade', `Faltas por aluno em ${ICM.util.fmtMonth(ym)} com alertas e indicação de desligamento.`, 'userCheck', '#f97316', 'assid')}
        </div>`;
        panel.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => {
          const k = c.dataset.rep;
          if (k === 'mensal') ICM.reports.generate('turma_mensal', { turma_id: t.id, ym });
          if (k === 'anual') ICM.reports.generate('turma_anual', { turma_id: t.id, ano });
          if (k === 'assid') ICM.reports.generate('assiduidade', { turma_id: t.id, ym });
        }));
      }
    };

    ui().tabs(el.querySelector('.tabs'), k => { cur = k; R[k](); });
    const eb = el.querySelector('[data-edit]'); if (eb) eb.addEventListener('click', () => ICM.pages._turmaForm(t));
    // "Registrar aula": se já existe aula planejada para hoje, abre ela em vez de duplicar
    const nb = el.querySelector('[data-nova]'); if (nb) nb.addEventListener('click', async () => {
      const hoje = (await ICM.api.aulas.list(t.id, ICM.util.today().slice(0, 7))).find(a => a.data === ICM.util.today());
      aulaModal(hoje ? hoje.id : null);
    });
    await R[tab0]();
    if (query.get('aula')) aulaModal(query.get('aula'));

    // ---------- Modal de aula ----------
    async function aulaModal(aulaId) {
      const isNew = !aulaId;
      const a = isNew ? { turma_id: t.id, data: ICM.util.today(), inicio: t.inicio, fim: t.fim, plano: {}, relatorio: {}, presencas: {}, fotos: [], status: 'planejada' } : await ICM.api.aulas.get(aulaId);
      const todosMats = await ICM.api.turmas.alunos(t.id);
      const mats = todosMats.filter(m => m.entrada <= a.data && (!m.saida || m.saida > a.data));
      // Alunos ativos que entraram na turma depois da data desta aula (não aparecem na chamada)
      let depois = todosMats.filter(m => m.status === 'ativo' && m.entrada > a.data);
      const pres = { ...(a.presencas || {}) };
      const fotos = (a.fotos || []).map(f => ({ ...f }));
      const canEdit = ICM.auth.can('aulas.registrar');
      const F = o => ui().field({ ...o, attrs: (o.attrs || '') + (canEdit ? '' : ' disabled') });
      const pl = a.plano || {}, rl = a.relatorio || {};
      const m = ui().modal({
        title: isNew ? 'Registrar aula' : `Aula de ${fmtDate(a.data)}`, size: 'wide',
        body: `<form>
          <div class="grid grid-4 mb-4">
            ${F({ name: 'data', label: 'Data', type: 'date', value: a.data, required: true })}
            ${F({ name: 'inicio', label: 'Início', type: 'time', value: a.inicio })}
            ${F({ name: 'fim', label: 'Término', type: 'time', value: a.fim })}
            ${F({ name: 'status', label: 'Situação', type: 'select', value: a.status, options: [['planejada', 'Planejada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']] })}
          </div>
          <div class="tabs mb-4" data-atabs>${[['plano', 'Plano de aula', 'clipboard'], ['chamada', 'Chamada', 'userCheck'], ['relatorio', 'Relatório da aula', 'fileText'], ['fotos', 'Fotos', 'camera']].map(([k, n, ic], i) => `<button type="button" class="tab ${i === 0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
          <section data-s="plano" class="grid grid-2 tab-panel">
            ${F({ name: 'plano.tema', label: 'Tema / conteúdo da aula', value: pl.tema, cls: 'span-2' })}
            ${F({ name: 'plano.objetivos', label: 'Objetivos', type: 'textarea', value: pl.objetivos, rows: 3 })}
            ${F({ name: 'plano.conteudo', label: 'Desenvolvimento / atividades', type: 'textarea', value: pl.conteudo, rows: 3 })}
            ${F({ name: 'plano.recursos', label: 'Recursos e materiais', value: pl.recursos })}
            ${F({ name: 'plano.avaliacao', label: 'Forma de avaliação', value: pl.avaliacao })}
          </section>
          <section data-s="chamada" hidden>
            <div class="row between mb-4"><div class="small muted">${mats.length} aluno(s) na turma nesta data</div>
              ${canEdit ? `<div class="row"><button type="button" class="btn btn-sm" data-all="P">${I('check', 16)} Todos presentes</button></div>` : ''}</div>
            <div data-depois></div>
            <div data-chamada></div>
          </section>
          <section data-s="relatorio" class="col" hidden>
            ${F({ name: 'relatorio.texto', label: 'Relatório da aula', type: 'textarea', value: rl.texto, rows: 6, placeholder: 'Como foi a aula? Objetivos alcançados, participação, dificuldades, evolução dos alunos…' })}
            ${F({ name: 'relatorio.ocorrencias', label: 'Ocorrências da aula (se houver)', type: 'textarea', value: rl.ocorrencias, rows: 2 })}
          </section>
          <section data-s="fotos" hidden><div data-fotos></div><div class="xs muted mt-2">As fotos são reduzidas automaticamente e os metadados (como localização GPS) são removidos. Respeite as autorizações de uso de imagem.</div></section>
        </form>`,
        foot: `${!isNew && ICM.auth.can('turmas.editar') && a.status !== 'realizada' ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Fechar</button>${canEdit ? `<button class="btn btn-primary" data-ok>${I('check', 18)} Salvar aula</button>` : ''}`
      });

      const semImg = new Set(mats.filter(x => x.aluno.autorizacoes && x.aluno.autorizacoes.imagem === false).map(x => x.aluno.nome));
      const drawChamada = () => {
        const box = m.$('[data-chamada]');
        box.innerHTML = mats.length ? mats.map(x => `<div class="att-row">${ICM.util.avatar(x.aluno.nome, x.aluno.foto, 'sm')}<div class="grow"><b>${esc(x.aluno.nome)}</b>${x.aluno.saude && x.aluno.saude.alergias ? `<div class="xs" style="color:var(--danger)">Alergia: ${esc(x.aluno.saude.alergias)}</div>` : ''}</div>
          <div class="att-opts">${['P', 'F', 'J'].map(v => `<button type="button" class="att-opt ${pres[x.aluno_id] === v ? 'on' : ''}" data-a="${esc(x.aluno_id)}" data-v="${v}" title="${{ P: 'Presente', F: 'Falta', J: 'Falta justificada' }[v]}" ${canEdit ? '' : 'disabled'}>${v}</button>`).join('')}</div></div>`).join('') : ui().empty('Nenhum aluno ativo nesta data', 'users');
        box.querySelectorAll('.att-opt').forEach(b => b.addEventListener('click', () => { pres[b.dataset.a] = pres[b.dataset.a] === b.dataset.v ? undefined : b.dataset.v; if (!pres[b.dataset.a]) delete pres[b.dataset.a]; drawChamada(); }));
      };
      drawChamada();
      const drawDepois = () => {
        const box = m.$('[data-depois]');
        box.innerHTML = depois.length ? `<div class="sens-lock mb-4" style="display:block">${I('info', 18)} ${depois.length === 1 ? '1 aluno entrou' : depois.length + ' alunos entraram'} na turma depois desta aula: ${depois.map(x => `<b>${esc(x.aluno.nome)}</b> (${esc(fmtDate(x.entrada))})`).join(', ')}.${ICM.auth.can('turmas.alunos') && !isNew ? `<div class="mt-2"><button type="button" class="btn btn-sm btn-primary" data-incluir-depois>${I('userPlus', 16)} Incluir na chamada (entrada em ${esc(fmtDate(a.data))})</button></div>` : ''}</div>` : '';
        const bt = box.querySelector('[data-incluir-depois]');
        if (bt) bt.addEventListener('click', e => ui().busy(e.currentTarget, async () => {
          await ui().run(async () => { for (const x of depois) { await ICM.api.turmas.alterarEntrada(x.id, a.data); x.entrada = a.data; mats.push(x); } }, 'Alunos incluídos na chamada');
          mats.sort((p, q) => p.aluno.nome.localeCompare(q.aluno.nome)); depois = [];
          m.$('[data-s="chamada"] .small.muted').textContent = `${mats.length} aluno(s) na turma nesta data`;
          drawDepois(); drawChamada();
        }).catch(() => { }));
      };
      drawDepois();
      const all = m.$('[data-all]'); if (all) all.addEventListener('click', () => { mats.forEach(x => { pres[x.aluno_id] = 'P'; }); drawChamada(); });
      ui().photoPicker(m.$('[data-fotos]'), fotos, () => { }, { editable: canEdit });
      if (semImg.size) m.$('[data-s="fotos"]').insertAdjacentHTML('afterbegin', `<div class="sens-lock mb-4">${I('camera', 18)} Sem autorização de imagem: ${esc([...semImg].join(', '))}. Não publique fotos em que apareçam.</div>`);

      const secs = m.$$('[data-s]');
      ui().tabs(m.$('[data-atabs]'), k => secs.forEach(s => { s.hidden = s.dataset.s !== k; }));

      const ok = m.$('[data-ok]');
      if (ok) ok.addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        const marcados = Object.keys(pres).length;
        if (marcados && d.status === 'planejada' && d.data <= ICM.util.today()) d.status = 'realizada';
        if (d.status === 'realizada' && marcados < mats.length) {
          if (!(await ui().confirm({ title: 'Chamada incompleta', text: `${mats.length - marcados} aluno(s) sem marcação. Salvar mesmo assim?`, ok: 'Salvar' }))) return;
        }
        const payload = { ...a, ...d, plano: { ...pl, ...d.plano }, relatorio: { ...rl, ...d.relatorio }, presencas: pres, fotos, turma_id: t.id, professor_id: a.professor_id || t.professor_id };
        await ui().run(() => ICM.api.aulas.save(payload), 'Aula salva');
        m.close(); ICM.app.refreshAlerts(); R[cur]();
      }).catch(() => { }));
      const del = m.$('[data-del]');
      if (del) del.addEventListener('click', async () => {
        if (!(await ui().confirm({ title: 'Excluir aula planejada', text: 'Deseja excluir esta aula?', ok: 'Excluir', danger: true }))) return;
        try { await ui().run(() => ICM.api.aulas.remove(a.id), 'Aula excluída'); m.close(); R[cur](); } catch (e) { /* toast */ }
      });
    }

    async function planejarMes() {
      const [y, mo] = ym.split('-').map(Number);
      const existentes = new Set((await ICM.api.aulas.list(t.id, ym)).map(a => a.data));
      const novas = [];
      for (let d = new Date(y, mo - 1, 1); d.getMonth() === mo - 1; d.setDate(d.getDate() + 1)) {
        const k = ICM.util.iso(d); if (t.dias.includes(d.getDay()) && !existentes.has(k)) novas.push(k);
      }
      if (!novas.length) { ui().toast('Todas as aulas do mês já estão no calendário.', 'info'); return; }
      if (!(await ui().confirm({ title: 'Planejar aulas do mês', text: `Criar ${novas.length} aula(s) planejada(s) em ${ICM.util.fmtMonth(ym)} conforme os dias da turma?`, ok: 'Criar aulas' }))) return;
      await ui().run(async () => { for (const k of novas) await ICM.api.aulas.save({ turma_id: t.id, data: k, inicio: t.inicio, fim: t.fim, status: 'planejada', plano: {}, relatorio: {}, presencas: {}, fotos: [], professor_id: t.professor_id }); }, `${novas.length} aulas planejadas`);
      R.aulas();
    }

    async function incluirAlunos(jaIds) {
      const todos = (await ICM.api.alunos.list({ status: '' })).filter(a => !jaIds.includes(a.id) && (a.status === 'ativo' || a.status === 'espera'));
      const sel = new Set();
      const m = ui().modal({
        title: `Incluir alunos em ${t.nome}`,
        body: `<div class="input-icon mb-4">${I('search', 18)}<input class="input" data-q placeholder="Buscar aluno"></div>
          ${ui().field({ name: 'entrada', label: 'Data de entrada', type: 'date', value: ICM.util.today() })}
          <div class="col mt-4" data-l style="max-height:380px;overflow:auto"></div>`,
        foot: `<a class="btn" href="#/alunos/novo" style="margin-right:auto">${I('userPlus', 18)} Nova matrícula</a><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Incluir selecionados</button>`
      });
      const draw = q => {
        m.$('[data-l]').innerHTML = todos.filter(a => !q || a.nome.toLowerCase().includes(q)).map(a => `<label class="list-item clickable"><span class="check"><input type="checkbox" value="${esc(a.id)}" ${sel.has(a.id) ? 'checked' : ''}></span>${ICM.util.avatar(a.nome, a.foto, 'sm')}<div class="grow"><b>${esc(a.nome)}</b><div class="xs muted">${esc(a.matricula)} · ${ICM.util.age(a.nascimento) ?? '—'} anos</div></div>${a.status === 'espera' ? ui().badge('Lista de espera', 'neutral') : ''}</label>`).join('') || ui().empty('Nenhum aluno disponível', 'users');
        m.$$('[data-l] input').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.value) : sel.delete(c.value); }));
      };
      draw('');
      m.$('[data-q]').addEventListener('input', e => draw(e.target.value.toLowerCase()));
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        if (!sel.size) { ui().toast('Selecione ao menos um aluno.', 'warn'); return; }
        const entrada = m.$('[name=entrada]').value; let n = 0;
        for (const id of sel) { try { await ICM.api.turmas.incluirAluno(t.id, id, entrada); n++; } catch (er) { ui().toast(er.message, 'danger'); break; } }
        if (n) ui().toast(`${n} aluno(s) incluído(s)`, 'ok');
        m.close(); R.alunos();
      }));
    }

    function retirarAluno(matId, nome) {
      const m = ui().modal({
        title: 'Retirar aluno da turma', size: 'sm',
        body: `<form class="col"><p>Retirar <b>${esc(nome)}</b> de <b>${esc(t.nome)}</b>. O histórico de presença é mantido para a prestação de contas.</p>
          ${ui().field({ name: 'motivo', label: 'Motivo', type: 'select', options: ['', ...ICM.C.MOTIVOS_SAIDA], required: true })}
          ${ui().field({ name: 'saida', label: 'Data de saída', type: 'date', value: ICM.util.today() })}
          ${ui().field({ name: 'obs', label: 'Observações', type: 'textarea', rows: 2 })}</form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger solid" data-ok>${I('userX', 18)} Retirar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        const mat = await ui().run(() => ICM.api.turmas.retirarAluno(matId, d.motivo, d.saida, d.obs), 'Aluno retirado da turma');
        const pend = await ICM.api.emprestimos.list({ aluno_id: mat.aluno_id, status: 'ativo' });
        if (pend.length) ui().toast(`Atenção: ${nome} está com ${pend.map(e => `${e.quantidade}x ${e.item.nome}`).join(', ')} emprestado(s). Providencie a devolução.`, 'warn', 7000);
        m.close(); R.alunos(); ICM.app.refreshAlerts();
      }).catch(() => { }));
    }
  };

  function mini(l, v, ic) { return `<div class="card flat stat" style="padding:16px"><div class="row">${I(ic, 18)}<span class="lbl">${esc(l)}</span></div><div class="val" style="font-size:26px">${esc(v)}</div></div>`; }
  function repCard(t, d, ic, c, k) { return `<div class="card hoverable report-card" style="--c:${c};cursor:pointer" data-rep="${k}"><div class="ic">${I(ic, 24)}</div><div class="card-title">${esc(t)}</div><div class="small muted">${esc(d)}</div><div class="row" style="color:var(--primary);font-weight:700">${I('sparkles', 16)} Gerar relatório</div></div>`; }
  ICM.pages._repCard = repCard;
})();
