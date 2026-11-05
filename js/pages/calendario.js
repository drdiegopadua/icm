/* Calendário letivo: o que aparece aqui vai para o App do Instituto */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.calendarioLetivo = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Calendário letivo']]);
    let ano = ICM.util.today().slice(0, 4);
    const pode = ICM.auth.can('calendario.editar');
    const TIPOS = ICM.C.TIPOS_CALENDARIO;

    const draw = async () => {
      const l = await ICM.api.calendario.list(ano);
      el.innerHTML = `<div class="page">
        <div class="page-head"><div><h1 class="page-title">Calendário letivo</h1><div class="page-sub">Feriados e recessos não mostram aulas no App do Instituto</div></div>
          ${pode ? `<button class="btn btn-primary" data-new>${I('plus', 18)} Novo item</button>` : ''}</div>
        <div class="row mb-4"><button class="btn btn-icon btn-sm" data-ano="-1" aria-label="Ano anterior">${I('chevronLeft', 18)}</button><b>${esc(ano)}</b><button class="btn btn-icon btn-sm" data-ano="1" aria-label="Próximo ano">${I('chevronRight', 18)}</button></div>
        <div class="card">${l.length ? l.map(e => { const t = TIPOS[e.tipo] || TIPOS.marco; return `<div class="list-item ${pode ? 'clickable' : ''}" data-id="${esc(e.id)}">
            <span class="area-chip" style="--c:${t.cor}">${esc(t.nome)}</span>
            <div class="grow"><b>${esc(e.titulo)}</b><div class="xs muted">${esc(fmtDate(e.inicio))}${e.fim ? ' a ' + esc(fmtDate(e.fim)) : ''}</div></div>
          </div>`; }).join('') : ui().empty(`Nenhum item em ${ano}`, 'calendar')}</div>
      </div>`;
      el.querySelectorAll('[data-ano]').forEach(b => b.addEventListener('click', () => { ano = String(Number(ano) + Number(b.dataset.ano)); draw(); }));
      const nb = el.querySelector('[data-new]'); if (nb) nb.addEventListener('click', () => form({}));
      if (pode) el.querySelectorAll('[data-id]').forEach(c => c.addEventListener('click', () => form(l.find(x => x.id === c.dataset.id))));
    };

    function form(e) {
      const F = o => ui().field(o);
      const m = ui().modal({
        title: e.id ? 'Editar item' : 'Novo item do calendário', size: 'sm',
        body: `<form class="grid grid-2">
          ${F({ name: 'titulo', label: 'Título', value: e.titulo, required: true, cls: 'span-2' })}
          ${F({ name: 'tipo', label: 'Tipo', type: 'select', value: e.tipo || 'feriado', cls: 'span-2', options: Object.entries(TIPOS).map(([k, v]) => [k, v.nome]) })}
          ${F({ name: 'inicio', label: 'Data', type: 'date', value: e.inicio, required: true })}
          ${F({ name: 'fim', label: 'Até (se durar vários dias)', type: 'date', value: e.fim })}
        </form>`,
        foot: `${e.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
      });
      m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
        await ui().run(() => ICM.api.calendario.save({ ...e, ...ICM.util.formData(m.$('form')) }), 'Calendário salvo');
        m.close(); draw();
      }).catch(() => { }));
      const del = m.$('[data-del]');
      if (del) del.addEventListener('click', async () => {
        if (!(await ui().confirm({ title: 'Excluir item', text: `Excluir "${e.titulo}"?`, ok: 'Excluir', danger: true }))) return;
        try { await ui().run(() => ICM.api.calendario.remove(e.id), 'Item excluído'); m.close(); draw(); } catch (er) { /* toast já exibido */ }
      });
    }

    await draw();
  };
})();
