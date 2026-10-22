/* Agenda de espaços (quadra, salas…) e insumos (projetor, som…) — sem choque de horários */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.agenda = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Agenda de espaços e insumos']]);
    const users = await ICM.api.usuarios.list();
    let recursos = await ICM.api.agenda.recursos();
    let tipo = '';
    let ini = inicioSemana(query.get('d') || ICM.util.today());

    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Agenda de espaços e insumos</h1><div class="page-sub">Horários fixos das turmas + reservas avulsas. O sistema bloqueia reservas que chocam.</div></div>
        <div class="row wrap">${ICM.auth.can('agenda.gerir') ? `<button class="btn" data-rec>${I('settings', 18)} Espaços e insumos</button>` : ''}<button class="btn btn-primary" data-nova>${I('plus', 18)} Nova reserva</button></div></div>
      <div class="card">
        <div class="row wrap between mb-4">
          <div class="row"><button class="btn btn-icon btn-sm" data-w="-7" aria-label="Semana anterior">${I('chevronLeft', 16)}</button><button class="btn btn-sm" data-w="0">Esta semana</button><button class="btn btn-icon btn-sm" data-w="7" aria-label="Próxima semana">${I('chevronRight', 16)}</button><b data-lbl style="margin-left:8px"></b></div>
          <div class="segmented" data-tipo><button data-v="" class="active">Tudo</button><button data-v="espaco">Espaços</button><button data-v="insumo">Insumos</button></div>
        </div>
        <div class="table-wrap"><table class="table agenda-grid" data-grid></table></div>
        <div class="row wrap xs muted mt-4"><span class="ag-chip turma">Turma (horário fixo)</span><span class="ag-chip">Reserva</span><span>Clique num dia vazio para reservar.</span></div>
      </div></div>`;

    async function draw() {
      const fim = ICM.util.addDays(ini, 6);
      el.querySelector('[data-lbl]').textContent = `${fmtDate(ini)} a ${fmtDate(fim)}`;
      const oc = await ICM.api.agenda.ocupacao(ini, fim);
      const dias = Array.from({ length: 7 }, (_, i) => ICM.util.addDays(ini, i));
      const rs = recursos.filter(r => r.ativo && (!tipo || r.tipo === tipo));
      const hoje = ICM.util.today();
      el.querySelector('[data-grid]').innerHTML = `<thead><tr><th>Espaço / insumo</th>${dias.map(d => `<th style="text-align:center;${d === hoje ? 'color:var(--primary)' : ''}">${esc(ICM.util.DIAS_C[ICM.util.parseD(d).getDay()])}<br>${esc(ICM.util.fmtDateShort(d))}</th>`).join('')}</tr></thead>
        <tbody>${rs.map(r => `<tr><td style="min-width:170px"><div class="row"><span style="width:10px;height:10px;border-radius:3px;background:${r.cor || '#2563eb'}"></span><div><b>${esc(r.nome)}</b><div class="xs muted">${r.tipo === 'espaco' ? `Espaço${r.capacidade ? ` · ${r.capacidade} pessoas` : ''}` : 'Insumo / equipamento'}</div></div></div></td>
          ${dias.map(d => `<td class="ag-cell" data-r="${esc(r.id)}" data-d="${d}">${oc.filter(x => x.recurso_id === r.id && x.data === d).map(x => `<div class="ag-chip ${x.origem === 'turma' ? 'turma' : ''}" style="--c:${r.cor || '#2563eb'}" ${x.origem === 'reserva' ? `data-res="${esc(x.id)}"` : `data-tur="${esc(x.turma_id)}"`} title="${esc(x.titulo)}"><b>${esc(x.inicio)}–${esc(x.fim)}</b> ${esc(x.titulo)}</div>`).join('')}</td>`).join('')}</tr>`).join('')}</tbody>`;
      el.querySelectorAll('.ag-cell').forEach(c => c.addEventListener('click', e => { if (e.target.closest('.ag-chip')) return; reservar({ recurso_id: c.dataset.r, data: c.dataset.d }); }));
      el.querySelectorAll('[data-res]').forEach(c => c.addEventListener('click', () => detalhe(oc.find(x => x.id === c.dataset.res))));
      el.querySelectorAll('[data-tur]').forEach(c => c.addEventListener('click', () => { location.hash = `#/turmas/${c.dataset.tur}`; }));
    }
    el.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => { ini = +b.dataset.w ? ICM.util.addDays(ini, +b.dataset.w) : inicioSemana(ICM.util.today()); draw(); }));
    el.querySelectorAll('[data-tipo] button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('[data-tipo] button').forEach(x => x.classList.toggle('active', x === b)); tipo = b.dataset.v; draw(); }));
    el.querySelector('[data-nova]').addEventListener('click', () => reservar({ data: ICM.util.today() }));
    const rb = el.querySelector('[data-rec]'); if (rb) rb.addEventListener('click', gerirRecursos);
    await draw();

    function detalhe(x) {
      const r = recursos.find(y => y.id === x.recurso_id) || {};
      const u = users.find(y => y.id === x.responsavel_id) || {};
      const m = ui().modal({ title: x.titulo, size: 'sm', body: ui().kv([['Espaço / insumo', r.nome], ['Data', fmtDate(x.data)], ['Horário', `${x.inicio}–${x.fim}`], ['Reservado por', u.nome], ['Observações', x.obs]]), foot: `<button class="btn btn-danger" data-cancel style="margin-right:auto">${I('trash', 16)} Cancelar reserva</button><button class="btn" data-close>Fechar</button>` });
      m.$('[data-cancel]').addEventListener('click', async () => { if (await ui().confirm({ title: 'Cancelar reserva', text: 'Liberar este horário?', ok: 'Cancelar reserva', danger: true })) { try { await ui().run(() => ICM.api.agenda.cancelar(x.id), 'Reserva cancelada'); m.close(); draw(); } catch (e) { /* toast */ } } });
    }

    function reservar(o) {
      const F = f => ui().field(f);
      const m = ui().modal({
        title: 'Nova reserva',
        body: `<form class="grid grid-2">
          ${F({ name: 'recurso_id', label: 'Espaço ou insumo', type: 'select', value: o.recurso_id, options: [['', 'Selecione…'], ...recursos.filter(r => r.ativo).map(r => [r.id, `${r.tipo === 'espaco' ? '📍' : '🔧'} ${r.nome}`])], cls: 'span-2' })}
          ${F({ name: 'data', label: 'Data', type: 'date', value: o.data })}
          <div class="grid grid-2">${F({ name: 'inicio', label: 'Início', type: 'time', value: '14:00' })}${F({ name: 'fim', label: 'Fim', type: 'time', value: '16:00' })}</div>
          ${F({ name: 'titulo', label: 'Finalidade', required: true, cls: 'span-2', placeholder: 'Ex.: ensaio extra, reunião de pais, oficina…' })}
          ${F({ name: 'obs', label: 'Observações', cls: 'span-2' })}
        </form><div class="mt-4" data-conf></div>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Reservar</button>`
      });
      const f = m.$('form');
      const check = ICM.util.debounce(async () => {
        const d = ICM.util.formData(f);
        if (!d.recurso_id || !d.data || !d.inicio || !d.fim) { m.$('[data-conf]').innerHTML = ''; return; }
        const c = await ICM.api.agenda.conflitos(d);
        m.$('[data-conf]').innerHTML = c.length ? `<div class="sens-lock" style="background:var(--danger-soft);color:#dc2626">${I('alert', 18)} Choque de horário com: ${c.map(x => `<b>${esc(x.titulo)}</b> (${esc(x.inicio)}–${esc(x.fim)})`).join(', ')}</div>` : `<div class="sens-lock" style="background:var(--ok-soft);color:#047857">${I('check', 18)} Horário livre</div>`;
      }, 250);
      f.addEventListener('input', check); f.addEventListener('change', check); check();
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        await ui().run(() => ICM.api.agenda.reservar(ICM.util.formData(f)), 'Reserva confirmada');
        m.close(); draw();
      }).catch(() => { }));
    }

    async function gerirRecursos() {
      const pats = await ICM.api.patrimonio.list();
      const m = ui().modal({
        title: 'Espaços e insumos', size: 'wide',
        body: `<div data-l></div><hr class="divider"><form class="grid grid-4" data-f>
          ${ui().field({ name: 'nome', label: 'Nome', required: true, cls: 'span-2' })}${ui().field({ name: 'tipo', label: 'Tipo', type: 'select', options: [['espaco', 'Espaço'], ['insumo', 'Insumo / equipamento']] })}${ui().field({ name: 'capacidade', label: 'Capacidade', type: 'number' })}
          ${ui().field({ name: 'patrimonio_id', label: 'Bem do patrimônio (insumos)', type: 'select', options: [['', '—'], ...pats.map(p => [p.id, `${p.tombo} — ${p.nome}`])], cls: 'span-2' })}${ui().field({ name: 'cor', label: 'Cor', type: 'color', value: '#2563eb' })}
          <div class="field"><label>&nbsp;</label><button type="button" class="btn btn-primary" data-add>${I('plus', 16)} Adicionar</button></div></form>`
      });
      const lista = () => { m.$('[data-l]').innerHTML = recursos.map(r => `<div class="list-item"><span style="width:12px;height:12px;border-radius:4px;background:${r.cor}"></span><b class="grow">${esc(r.nome)}</b><span class="xs muted">${r.tipo === 'espaco' ? 'Espaço' : 'Insumo'}</span><label class="toggle"><input type="checkbox" data-at="${esc(r.id)}" ${r.ativo ? 'checked' : ''}><span class="track"></span></label></div>`).join(''); m.$$('[data-at]').forEach(cb => cb.addEventListener('change', async () => { const r = recursos.find(x => x.id === cb.dataset.at); await ICM.api.agenda.salvarRecurso({ ...r, ativo: cb.checked }); recursos = await ICM.api.agenda.recursos(); draw(); })); };
      lista();
      m.$('[data-add]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('[data-f]')); try { await ui().run(() => ICM.api.agenda.salvarRecurso(d), 'Adicionado'); recursos = await ICM.api.agenda.recursos(); m.$('[data-f]').reset(); lista(); draw(); } catch (e) { /* toast */ } });
    }
  };

  function inicioSemana(d) { const x = ICM.util.parseD(d); x.setDate(x.getDate() - x.getDay()); return ICM.util.iso(x); }
})();
