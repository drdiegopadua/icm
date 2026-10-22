/* Lista de alunos */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, age, fmtDate } = ICM.util;

  ICM.pages.alunos = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Alunos']]);
    let status = query.get('status') || 'ativo';
    let q = '';
    let view = 'table';
    try { view = localStorage.getItem('icm_alunos_view') || 'table'; } catch (e) { /* ignore */ }

    el.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1 class="page-title">Alunos</h1><div class="page-sub">Cadastro, matrícula e acompanhamento individual</div></div>
        ${ICM.auth.can('alunos.editar') ? `<a class="btn btn-primary" href="#/alunos/novo">${I('userPlus', 18)} Nova matrícula</a>` : ''}
      </div>
      <div class="card">
        <div class="row wrap between mb-4">
          <div class="segmented" data-status>
            ${[['ativo', 'Ativos'], ['espera', 'Lista de espera'], ['inativo', 'Inativos'], ['desligado', 'Desligados'], ['', 'Todos']].map(([v, t]) => `<button data-v="${v}" class="${v === status ? 'active' : ''}">${t}</button>`).join('')}
          </div>
          <div class="row">
            <div class="input-icon" style="width:280px">${I('search', 18)}<input class="input" data-q placeholder="Nome, matrícula ou responsável"></div>
            <div class="segmented" data-view><button data-v="table" class="${view === 'table' ? 'active' : ''}" aria-label="Lista">${I('list', 16)}</button><button data-v="grid" class="${view === 'grid' ? 'active' : ''}" aria-label="Cartões">${I('grid', 16)}</button></div>
          </div>
        </div>
        <div data-list></div>
      </div>
    </div>`;

    const listEl = el.querySelector('[data-list]');
    const turmasMap = {};
    const mats = await ICM.api.raw('matriculas');
    const turmas = await ICM.api.raw('turmas');
    mats.filter(m => m.status === 'ativo').forEach(m => { (turmasMap[m.aluno_id] = turmasMap[m.aluno_id] || []).push((turmas.find(t => t.id === m.turma_id) || {}).modalidade); });

    async function render() {
      const list = await ICM.api.alunos.list({ q, status });
      if (!list.length) { listEl.innerHTML = ICM.ui.empty('Nenhum aluno encontrado', 'users'); return; }
      if (view === 'grid') {
        listEl.innerHTML = `<div class="grid grid-4 stagger">${list.map(a => `
          <a class="card flat hoverable col" href="#/alunos/${esc(a.id)}" style="align-items:center;text-align:center;color:inherit">
            ${ICM.util.avatar(a.nome, a.foto, 'lg')}
            <div><div class="bold">${esc(a.nome)}</div><div class="xs muted">${esc(a.matricula)} · ${age(a.nascimento) ?? '—'} anos</div></div>
            <div class="row wrap" style="justify-content:center">${(turmasMap[a.id] || []).map(t => `<span class="badge neutral">${esc(t)}</span>`).join('') || '<span class="xs muted">Sem turma</span>'}</div>
            ${ICM.ui.statusAluno(a.status)}
          </a>`).join('')}</div>`;
      } else {
        listEl.innerHTML = `<div class="table-wrap"><table class="table">
          <thead><tr><th>Aluno</th><th>Matrícula</th><th>Idade</th><th>Turmas</th><th>Responsável</th><th>Desde</th><th>Status</th></tr></thead>
          <tbody>${list.map(a => `<tr class="clickable" data-href="#/alunos/${esc(a.id)}">
            <td><div class="row">${ICM.util.avatar(a.nome, a.foto, 'sm')}<div><div class="bold">${esc(a.nome)}</div>${a.saude && (a.saude.alergias || a.saude.condicoes) ? `<span class="xs" style="color:var(--danger)">${I('heartPulse', 12)} atenção à saúde</span>` : ''}</div></div></td>
            <td class="small">${esc(a.matricula)}</td>
            <td>${age(a.nascimento) ?? '—'}</td>
            <td><div class="row wrap" style="gap:4px">${(turmasMap[a.id] || []).map(t => `<span class="badge neutral">${esc(t)}</span>`).join('') || '<span class="xs muted">—</span>'}</div></td>
            <td class="small">${esc(a.responsavel ? a.responsavel.nome : '')}</td>
            <td class="small">${esc(fmtDate(a.data_matricula))}</td>
            <td>${ICM.ui.statusAluno(a.status)}</td></tr>`).join('')}</tbody></table></div>
          <div class="xs muted mt-2">${list.length} aluno(s)</div>`;
        listEl.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      }
    }

    el.querySelectorAll('[data-status] button').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('active', x === b)); status = b.dataset.v; render();
    }));
    el.querySelectorAll('[data-view] button').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('[data-view] button').forEach(x => x.classList.toggle('active', x === b)); view = b.dataset.v;
      try { localStorage.setItem('icm_alunos_view', view); } catch (e) { /* ignore */ }
      render();
    }));
    el.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { q = e.target.value.trim(); render(); }, 200));
    await render();
  };
})();
