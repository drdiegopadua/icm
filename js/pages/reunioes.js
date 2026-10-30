/* Reuniões de pais/famílias: pauta, presença, ata, encaminhamentos e fotos */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.reunioes = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Reuniões de pais']]);
    const list = await ICM.api.reunioes.list();
    const projetos = await ICM.api.raw('projetos');
    const hoje = ICM.util.today();
    const card = async r => {
      const conv = await ICM.api.reunioes.convidados(r); const pres = conv.filter(c => r.presencas[c.id]).length;
      const p = projetos.find(x => x.id === r.projeto_id); const fut = r.data >= hoje;
      return `<div class="card project-card hoverable" style="--c:${p ? p.cor : '#2563eb'}" data-href="#/reunioes/${esc(r.id)}">
        <div class="row between"><span class="badge neutral">${esc(p ? p.nome : 'Todas as famílias')}</span>${fut ? ui().badge('Agendada', '', true) : r.ata ? ui().badge('Ata registrada', 'ok', true) : ui().badge('Ata pendente', 'warn', true)}</div>
        <div class="name">${esc(r.titulo)}</div>
        <div class="meta"><span>${I('calendar', 15)} ${esc(fmtDate(r.data))} · ${esc(r.horario || '')}</span><span>${I('pin', 15)} ${esc(r.local || '')}</span></div>
        ${fut ? `<div class="small muted">${conv.length} famílias convidadas</div>` : `<div><div class="row between xs bold muted"><span>Participação das famílias</span><span>${pres}/${conv.length}</span></div><div class="progress mt-2 ${ICM.util.pct(pres, conv.length) >= 60 ? 'ok' : 'warn'}"><span style="width:${ICM.util.pct(pres, conv.length)}%"></span></div></div>`}
      </div>`;
    };
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Reuniões de pais</h1><div class="page-sub">Convocação, lista de presença das famílias, ata e encaminhamentos</div></div>
        ${ICM.auth.can('reunioes.gerir') ? `<button class="btn btn-primary" data-novo>${I('plus', 18)} Nova reunião</button>` : ''}</div>
      <div class="grid grid-3 stagger">${(await Promise.all(list.map(card))).join('') || `<div class="span-all">${ui().empty('Nenhuma reunião cadastrada', 'users')}</div>`}</div></div>`;
    el.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
    const nb = el.querySelector('[data-novo]'); if (nb) nb.addEventListener('click', () => form());
  };

  ICM.pages.reuniao = async function (el, params) {
    const r = await ICM.api.reunioes.get(params.id);
    if (!r) { el.innerHTML = ui().empty('Reunião não encontrada'); return; }
    ICM.app.setCrumbs([['Reuniões de pais', '#/reunioes'], [r.titulo]]);
    const conv = await ICM.api.reunioes.convidados(r);
    const pres = { ...(r.presencas || {}) };
    const fotos = (r.fotos || []).map(f => ({ ...f }));
    const edit = ICM.auth.can('reunioes.gerir');
    const dis = edit ? '' : 'disabled';

    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="row between wrap"><div>
        <h1 class="page-title" style="font-size:28px">${esc(r.titulo)}</h1>
        <div class="meta mt-2"><span>${I('calendar', 15)} ${esc(ICM.util.fmtDateLong(r.data))} · ${esc(r.horario || '')}</span><span>${I('pin', 15)} ${esc(r.local || '')}</span><span>${I('users', 15)} ${conv.length} famílias convidadas</span></div></div>
        <div class="row wrap">${edit ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button>` : ''}<button class="btn" data-ata>${I('fileText', 18)} Ata e lista (PDF)</button>${edit ? `<button class="btn btn-primary" data-save>${I('check', 18)} Salvar</button>` : ''}</div></div></div>
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><div class="section-title" style="margin:0">${I('userCheck', 18)} Presença das famílias <span class="badge" data-cnt></span></div>${edit ? `<button class="btn btn-sm" data-todos>Todos presentes</button>` : ''}</div>
          <div style="max-height:520px;overflow:auto" data-lista></div></div>
        <div class="col">
          <div class="card"><div class="section-title">${I('list', 18)} Pauta</div><ol class="text-block" style="margin:0;padding-left:20px">${(r.pauta || '').split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Sem pauta</li>'}</ol></div>
          <div class="card"><div class="section-title">${I('fileText', 18)} Ata da reunião</div>
            <textarea class="textarea" data-ata-txt rows="7" ${dis} placeholder="Registro do que foi discutido e decidido…">${esc(r.ata || '')}</textarea>
            <div class="field mt-4"><label>Encaminhamentos (um por linha)</label><textarea class="textarea" data-enc rows="3" ${dis}>${esc(r.encaminhamentos || '')}</textarea></div></div>
          <div class="card"><div class="section-title">${I('camera', 18)} Fotos</div><div data-fotos></div></div>
        </div>
      </div></div>`;

    // Convite pelo WhatsApp para cada família (só para reuniões que ainda vão acontecer)
    const convite = {};
    if (ICM.auth.can('avisos.enviar') && r.data >= ICM.util.today() && ICM.wa) for (const c of conv) convite[c.id] = ICM.wa.btn(await ICM.api.avisos.montar('reuniao', c, { titulo: r.titulo, data: ICM.util.fmtDate(r.data), hora: r.horario || '', local: r.local || '', key: `reuniao:${r.id}:${c.id}` }), { icone: true });
    const drawLista = () => {
      el.querySelector('[data-lista]').innerHTML = conv.map(c => `<label class="list-item clickable"><span class="check"><input type="checkbox" data-a="${esc(c.id)}" ${pres[c.id] ? 'checked' : ''} ${dis}></span><div class="grow"><b>${esc(c.responsavel.nome || '—')}</b><div class="xs muted">responsável por ${esc(c.nome)} · ${esc(c.responsavel.telefone || '')}</div></div>${convite[c.id] || ''}</label>`).join('') || ui().empty('Nenhuma família no público desta reunião', 'users');
      el.querySelectorAll('[data-a]').forEach(cb => cb.addEventListener('change', () => { pres[cb.dataset.a] = cb.checked; cnt(); }));
      cnt();
    };
    const cnt = () => { el.querySelector('[data-cnt]').textContent = `${Object.values(pres).filter(Boolean).length}/${conv.length}`; };
    drawLista();
    ui().photoPicker(el.querySelector('[data-fotos]'), fotos, () => { }, { editable: edit });
    const on = (s, fn) => { const b = el.querySelector(s); if (b) b.addEventListener('click', fn); };
    on('[data-todos]', () => { conv.forEach(c => { pres[c.id] = true; }); drawLista(); });
    on('[data-edit]', () => form(r));
    on('[data-ata]', () => ICM.reports.generate('reuniao_ata', { reuniao_id: r.id }));
    on('[data-save]', e => ui().busy(e.currentTarget, () => ui().run(() => ICM.api.reunioes.save({ ...r, presencas: Object.fromEntries(conv.map(c => [c.id, !!pres[c.id]])), ata: el.querySelector('[data-ata-txt]').value.trim(), encaminhamentos: el.querySelector('[data-enc]').value.trim(), fotos }), 'Reunião salva')).catch(() => { }));
  };

  async function form(r = {}) {
    const F = o => ui().field(o);
    const projetos = await ICM.api.projetos.list(); const turmas = await ICM.api.turmas.list();
    const m = ui().modal({
      title: r.id ? 'Editar reunião' : 'Nova reunião de pais',
      body: `<form class="grid grid-2">
        ${F({ name: 'titulo', label: 'Título', value: r.titulo, required: true, cls: 'span-2' })}
        ${F({ name: 'data', label: 'Data', type: 'date', value: r.data || ICM.util.today() })}
        ${F({ name: 'horario', label: 'Horário', type: 'time', value: r.horario || '19:00' })}
        ${F({ name: 'local', label: 'Local', value: r.local, cls: 'span-2' })}
        ${F({ name: 'projeto_id', label: 'Famílias do projeto', type: 'select', value: r.projeto_id, options: [['', 'Todas as famílias'], ...projetos.map(p => [p.id, p.nome])] })}
        ${F({ name: 'turma_id', label: 'Ou só de uma turma', type: 'select', value: r.turma_id, options: [['', '—'], ...turmas.map(t => [t.id, t.nome])] })}
        ${F({ name: 'pauta', label: 'Pauta (um item por linha)', type: 'textarea', value: r.pauta, cls: 'span-2', rows: 5 })}
      </form><div class="xs muted mt-2">Dica: reserve o espaço na Agenda para evitar choque de horário.</div>`,
      foot: `${r.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const x = await ui().run(() => ICM.api.reunioes.save({ ...r, ...d }), 'Reunião salva');
      m.close(); location.hash = `#/reunioes/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir reunião', text: 'Excluir esta reunião e sua ata?', ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.reunioes.remove(r.id), 'Reunião excluída'); m.close(); location.hash = '#/reunioes'; } });
  }
})();
