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
            ${[['ativo', 'Ativos'], ...(ICM.auth.can('alunos.editar') ? [['pendencias', 'Ativos com pendências']] : []), ['espera', 'Lista de espera'], ['inativo', 'Inativos'], ['desligado', 'Desligados'], ['', 'Todos']].map(([v, t]) => `<button data-v="${v}" class="${v === status ? 'active' : ''}">${t}</button>`).join('')}
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

    // ---------- Ativos com pendências (cadastro incompleto, termos, bairro, data da 1ª matrícula) ----------
    const nb = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const acc = t => (String(t).match(/[^\x00-\x7f]/g) || []).length;
    let tipoPend = '';
    const PEND = {
      lgpd: ['Sem termo LGPD', 'danger', 'termos'], imagem: ['Sem autorização de imagem', 'warn', 'termos'],
      bairro_grafia: ['Bairro com grafia diferente', 'warn', 'bairros'], sem_bairro: ['Sem bairro', 'warn', ''], sem_endereco: ['Sem endereço', 'warn', ''],
      data: ['Sem data da 1ª matrícula', 'warn', 'datas'], sexo: ['Sem sexo', 'neutral', ''], tel: ['Sem telefone do responsável', 'warn', '']
    };
    async function pendencias() {
      const todos = await ICM.api.alunos.list({ status: '' });
      const oficial = await ICM.api.alunos.bairros().catch(() => []);
      const grup = {}; todos.forEach(a => { const b = String((a.endereco || {}).bairro || '').trim(); if (b) { const k = nb(b); (grup[k] = grup[k] || {})[b] = (grup[k][b] || 0) + 1; } });
      const canon = k => oficial.find(o => nb(o) === k) || Object.entries(grup[k] || {}).sort((x, y) => acc(y[0]) - acc(x[0]) || y[1] - x[1])[0][0];
      // dias com muitas matrículas iguais = data da importação, não a matrícula real
      const porDia = {}; todos.forEach(a => { if (a.data_matricula) porDia[a.data_matricula] = (porDia[a.data_matricula] || 0) + 1; });
      return todos.filter(a => a.status === 'ativo').map(a => {
        const au = a.autorizacoes || {}, e = a.endereco || {}, b = String(e.bairro || '').trim();
        const p = [];
        if (!au.lgpd) p.push('lgpd'); if (!au.imagem) p.push('imagem');
        if (!b) p.push('sem_bairro'); else if (canon(nb(b)) !== b) p.push('bairro_grafia');
        if (!String(e.logradouro || '').trim() && !b) p.push('sem_endereco');
        if (!a.data_matricula || porDia[a.data_matricula] >= 15) p.push('data');
        if (!a.sexo) p.push('sexo');
        if (!String((a.responsavel || {}).telefone || '').replace(/\D/g, '')) p.push('tel');
        return { a, p };
      }).filter(x => x.p.length);
    }
    async function renderPendencias() {
      let itens = await pendencias();
      const cont = {}; itens.forEach(x => x.p.forEach(k => { cont[k] = (cont[k] || 0) + 1; }));
      if (q) { const s = q.toLowerCase(); itens = itens.filter(x => x.a.nome.toLowerCase().includes(s) || String(x.a.matricula || '').toLowerCase().includes(s)); }
      const lista = tipoPend ? itens.filter(x => x.p.includes(tipoPend)) : itens;
      const lote = tipoPend && PEND[tipoPend][2];
      listEl.innerHTML = `<div class="row wrap mb-4" style="gap:6px">
          <button class="chip-f ${!tipoPend ? 'on' : ''}" data-tp="">Todas (${itens.length} aluno(s))</button>
          ${Object.keys(PEND).filter(k => cont[k]).map(k => `<button class="chip-f ${tipoPend === k ? 'on' : ''}" data-tp="${k}">${esc(PEND[k][0])} · ${cont[k]}</button>`).join('')}
        </div>
        ${lote ? `<div class="card flat mb-4 row between wrap"><span class="small">${I('info', 16)} Dá para resolver todos de uma vez.</span><a class="btn btn-sm btn-primary" href="#/cadastros?tab=${lote}">${lote === 'termos' ? 'Pedir assinaturas' : lote === 'bairros' ? 'Padronizar bairros' : 'Corrigir datas em lote'}</a></div>` : ''}
        ${lista.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Pendências</th></tr></thead><tbody>
          ${lista.map(x => `<tr class="clickable" data-href="#/alunos/${esc(x.a.id)}/editar"><td><div class="row">${ICM.util.avatar(x.a.nome, x.a.foto, 'sm')}<div class="bold">${esc(x.a.nome)}</div></div></td><td class="small">${esc(x.a.matricula || '')}</td>
            <td><div class="row wrap" style="gap:4px">${x.p.map(k => `<span class="badge ${PEND[k][1]}">${esc(PEND[k][0])}${k === 'bairro_grafia' ? `: ${esc((x.a.endereco || {}).bairro)}` : ''}</span>`).join('')}</div></td></tr>`).join('')}
        </tbody></table></div><div class="xs muted mt-2">${lista.length} aluno(s) · clique para abrir a ficha e completar</div>` : ICM.ui.empty('Nenhum aluno ativo com pendências 🎉', 'userCheck')}
        <style>.chip-f{border:0;cursor:pointer;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:600;background:var(--surface-2);color:var(--text-2);box-shadow:var(--sh-out-sm)}.chip-f.on{background:var(--primary);color:#fff}</style>`;
      listEl.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('click', () => { tipoPend = b.dataset.tp; renderPendencias(); }));
      listEl.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
    }

    async function render() {
      if (status === 'pendencias') return renderPendencias();
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
            <td class="small">${a.data_matricula ? esc(fmtDate(a.data_matricula)) : '<span class="muted">—</span>'}</td>
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
