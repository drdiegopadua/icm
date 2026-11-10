/* Eventos, masterclasses, apresentações, campeonatos e participações */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.eventos = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Eventos e ações']]);
    const list = await ICM.api.eventos.list();
    const projetos = await ICM.api.raw('projetos');
    let tipo = '', quando = 'todos';
    const hoje = ICM.util.today();
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Eventos e ações</h1><div class="page-sub">Eventos, masterclasses, apresentações, campeonatos e participações externas</div></div>
        ${ICM.auth.can('eventos.editar') ? `<button class="btn btn-primary" data-new>${I('plus', 18)} Novo evento</button>` : ''}</div>
      <div class="row wrap between mb-4">
        <div class="segmented" data-tipo><button data-v="" class="active">Todos</button>${Object.entries(ICM.C.TIPOS_EVENTO).map(([k, v]) => `<button data-v="${k}">${esc(v.nome)}</button>`).join('')}</div>
        <div class="segmented" data-quando><button data-v="todos" class="active">Todos</button><button data-v="futuros">Próximos</button><button data-v="passados">Realizados</button></div>
      </div>
      <div class="grid grid-3 stagger" data-list></div></div>`;
    const render = () => {
      const l = list.filter(e => (!tipo || e.tipo === tipo) && (quando === 'todos' || (quando === 'futuros' ? e.data >= hoje : e.data < hoje)));
      el.querySelector('[data-list]').innerHTML = l.length ? l.map(e => { const t = ICM.C.TIPOS_EVENTO[e.tipo]; const ps = ICM.util.projetosEvento(e).map(id => projetos.find(x => x.id === id)).filter(Boolean); const p = ps[0]; const fut = e.data >= hoje; return `
        <div class="card project-card hoverable" style="--c:${p ? p.cor : t.cor}" data-href="#/eventos/${esc(e.id)}">
          ${(e.fotos || [])[0] ? `<div class="photo" style="margin:-8px -8px 0;aspect-ratio:16/8"><img src="${esc(e.fotos[0].src)}" alt=""></div>` : ''}
          <div class="row between"><span class="area-chip" style="--c:${t.cor}">${esc(t.nome)}</span>${fut ? ui().badge('Programado', '', true) : ui().badge('Realizado', 'ok', true)}</div>
          <div class="name">${esc(e.titulo)}</div>
          <div class="meta"><span>${I('calendar', 15)} ${esc(fmtDate(e.data))}${e.horario ? ' · ' + esc(e.horario) : ''}</span><span>${I('pin', 15)} ${esc(e.local || '')}</span></div>
          <div class="meta"><span>${I('users', 15)} ${(e.alunos || []).length} alunos</span>${e.publico ? `<span>${I('eye', 15)} ${num(e.publico)} público</span>` : ''}${ps.length ? `<span>${I('folder', 15)} ${esc(ps.length > 1 ? `${ps.length} projetos` : p.nome)}</span>` : ''}</div>
          ${e.resultado ? `<div class="small bold" style="color:${t.cor}">${I('award', 15)} ${esc(e.resultado)}</div>` : ''}
        </div>`; }).join('') : `<div class="span-all">${ui().empty('Nenhum evento', 'star')}</div>`;
      el.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
    };
    const seg = (sel, fn) => el.querySelectorAll(`${sel} button`).forEach(b => b.addEventListener('click', () => { el.querySelectorAll(`${sel} button`).forEach(x => x.classList.toggle('active', x === b)); fn(b.dataset.v); render(); }));
    seg('[data-tipo]', v => { tipo = v; }); seg('[data-quando]', v => { quando = v; });
    const nb = el.querySelector('[data-new]'); if (nb) nb.addEventListener('click', () => eventoForm());
    render();
  };

  ICM.pages.eventoDetalhe = async function (el, params) {
    const e = await ICM.api.eventos.get(params.id);
    if (!e) { el.innerHTML = ui().empty('Evento não encontrado'); return; }
    ICM.app.setCrumbs([['Eventos', '#/eventos'], [e.titulo]]);
    const t = ICM.C.TIPOS_EVENTO[e.tipo];
    const todosProj = await ICM.api.projetos.list();
    const ps = ICM.util.projetosEvento(e).map(id => todosProj.find(x => x.id === id)).filter(Boolean); const p = ps[0];
    const alunos = (await ICM.api.alunos.list({ status: '' })).filter(a => (e.alunos || []).includes(a.id));
    const fotos = (e.fotos || []).map(f => ({ ...f }));
    const canEdit = ICM.auth.can('eventos.editar');
    el.innerHTML = `<div class="page">
      <div class="card mb-4 project-card" style="--c:${p ? p.cor : t.cor};cursor:default">
        <div class="row between wrap"><div>
          <span class="area-chip" style="--c:${t.cor}">${esc(t.nome)}</span>
          <h1 class="page-title mt-2" style="font-size:28px">${esc(e.titulo)}</h1>
          <div class="meta mt-2"><span>${I('calendar', 15)} ${esc(ICM.util.fmtDateLong(e.data))}${e.horario ? ' · ' + esc(e.horario) : ''}</span><span>${I('pin', 15)} ${esc(e.local || '')}</span>${ps.map(x => `<a href="#/projetos/${esc(x.id)}">${I('folder', 15)} ${esc(x.nome)}</a>`).join('')}</div></div>
          <div class="row">${canEdit ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button>` : ''}<button class="btn btn-primary" data-rel>${I('fileText', 18)} Relatório do evento</button></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('info', 18)} Descrição</div><div class="text-block">${esc(e.descricao || 'Sem descrição')}</div>
          <hr class="divider">${ui().kv([['Público estimado', e.publico ? num(e.publico) : ''], ['Alunos participantes', String(alunos.length)], ['Resultado / premiação', e.resultado]])}</div>
        <div class="card"><div class="section-title">${I('users', 18)} Alunos participantes</div>
          ${alunos.length ? `<div class="col" style="max-height:340px;overflow:auto">${alunos.map(a => `<a class="list-item" href="#/alunos/${esc(a.id)}">${ICM.util.avatar(a.nome, a.foto, 'sm')}<div class="grow"><b>${esc(a.nome)}</b><div class="xs muted">${esc(a.matricula)}</div></div></a>`).join('')}</div>` : ui().empty('Nenhum aluno vinculado', 'users')}</div>
        <div class="card span-all"><div class="card-head"><div class="section-title" style="margin:0">${I('camera', 18)} Fotos</div>${canEdit ? `<button class="btn btn-sm btn-primary" data-savefotos>${I('check', 16)} Salvar fotos</button>` : ''}</div><div data-fotos></div></div>
      </div></div>`;
    ui().photoPicker(el.querySelector('[data-fotos]'), fotos, () => { }, { editable: canEdit });
    const sf = el.querySelector('[data-savefotos]'); if (sf) sf.addEventListener('click', ev => ui().busy(ev.currentTarget, () => ui().run(() => ICM.api.eventos.save({ ...e, fotos }), 'Fotos salvas')).catch(() => { }));
    const eb = el.querySelector('[data-edit]'); if (eb) eb.addEventListener('click', () => eventoForm(e));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.generate('evento', { evento_id: e.id }));
  };

  async function eventoForm(e = {}) {
    const F = o => ui().field(o);
    const projetos = await ICM.api.projetos.list();
    const turmas = await ICM.api.turmas.list();
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const mats = await ICM.api.raw('matriculas');
    const sel = new Set(e.alunos || []);
    const projSel = new Set(ICM.util.projetosEvento(e));
    const m = ui().modal({
      title: e.id ? 'Editar evento' : 'Novo evento', size: 'wide',
      body: `<form class="grid grid-3">
        ${F({ name: 'tipo', label: 'Tipo', type: 'select', value: e.tipo, options: Object.entries(ICM.C.TIPOS_EVENTO).map(([k, v]) => [k, v.nome]) , lista: 'TIPOS_EVENTO' })}
        ${F({ name: 'titulo', label: 'Título', value: e.titulo, required: true, cls: 'span-2' })}
        ${F({ name: 'data', label: 'Data', type: 'date', value: e.data || ICM.util.today(), required: true })}
        ${F({ name: 'horario', label: 'Horário', type: 'time', value: e.horario })}
        ${F({ name: 'local', label: 'Local', value: e.local })}
        ${F({ name: 'publico', label: 'Público estimado', type: 'number', value: e.publico, attrs: 'min="0"' })}
        ${F({ name: 'resultado', label: 'Resultado / premiação', value: e.resultado, cls: 'span-2' })}
        <div class="field span-all"><label for="f_proj_add">Projetos vinculados <span class="muted" style="font-weight:500">— nenhum = ação institucional</span></label>
          <div class="proj-sel"><select class="select" id="f_proj_add" data-proj-add></select><div class="proj-tags" data-projs></div></div></div>
        ${F({ name: 'descricao', label: 'Descrição', type: 'textarea', value: e.descricao, cls: 'span-all', rows: 3 })}
        ${F({ name: 'app_oculto', label: 'Não mostrar este evento no App do Instituto', type: 'toggle', value: e.app_oculto, cls: 'span-all' })}
        <div class="span-all"><div class="row between wrap"><div class="section-title" style="margin:0">${I('users', 18)} Alunos participantes <span class="badge" data-cnt>${sel.size}</span></div>
          <div class="row"><select class="select" data-turma style="width:240px"><option value="">Adicionar turma inteira…</option>${turmas.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join('')}</select></div></div>
          <div class="grid grid-3 mt-4" data-alunos style="max-height:260px;overflow:auto;gap:8px"></div></div>
      </form>`,
      foot: `${e.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    const drawAl = () => {
      m.$('[data-alunos]').innerHTML = alunos.map(a => `<label class="check small"><input type="checkbox" value="${esc(a.id)}" ${sel.has(a.id) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('');
      m.$$('[data-alunos] input').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.value) : sel.delete(c.value); m.$('[data-cnt]').textContent = sel.size; }));
      m.$('[data-cnt]').textContent = sel.size;
    };
    drawAl();
    // Projetos: escolhe no dropdown e cada um vira uma etiqueta ao lado (× para tirar)
    const drawProj = () => {
      const livres = projetos.filter(p => !projSel.has(p.id));
      m.$('[data-proj-add]').innerHTML = `<option value="">${livres.length ? 'Adicionar projeto…' : 'Todos os projetos já foram adicionados'}</option>${livres.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}`;
      m.$('[data-proj-add]').disabled = !livres.length;
      const ps = [...projSel].map(id => projetos.find(p => p.id === id)).filter(Boolean);
      m.$('[data-projs]').innerHTML = ps.length ? ps.map(p => `<span class="proj-tag" style="--c:${esc(p.cor || '#2563eb')}"><span class="truncate">${esc(p.nome)}</span><button type="button" data-proj-rm="${esc(p.id)}" aria-label="Tirar ${esc(p.nome)}" title="Tirar">${I('x', 13)}</button></span>`).join('')
        : '<span class="xs muted">Ação institucional (nenhum projeto)</span>';
    };
    drawProj();
    m.$('[data-proj-add]').addEventListener('change', ev => { if (ev.target.value) { projSel.add(ev.target.value); drawProj(); } });
    m.$('[data-projs]').addEventListener('click', ev => { const b = ev.target.closest('[data-proj-rm]'); if (b) { projSel.delete(b.dataset.projRm); drawProj(); } });
    m.$('[data-turma]').addEventListener('change', ev => {
      mats.filter(x => x.turma_id === ev.target.value && x.status === 'ativo').forEach(x => sel.add(x.aluno_id));
      // A turma adicionada também vincula o projeto dela
      const tu = turmas.find(x => x.id === ev.target.value);
      if (tu && tu.projeto_id && !projSel.has(tu.projeto_id)) { projSel.add(tu.projeto_id); drawProj(); }
      ev.target.value = ''; drawAl();
    });
    m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const projeto_ids = [...projSel].filter(id => projetos.some(p => p.id === id));   // na ordem em que foram adicionados
      const r = await ui().run(() => ICM.api.eventos.save({ ...e, ...d, projeto_ids, alunos: [...sel] }), 'Evento salvo');
      m.close(); location.hash = `#/eventos/${r.id}`; ICM.app.reload();
    }).catch(() => { }));
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Excluir evento', text: `Excluir "${e.titulo}"?`, ok: 'Excluir', danger: true }))) return;
      await ui().run(() => ICM.api.eventos.remove(e.id), 'Evento excluído'); m.close(); location.hash = '#/eventos';
    });
  }
})();
