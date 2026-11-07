/* Turmas (Pedagógico): todas as turmas agrupadas por projeto, com professor, horário,
   ocupação e situação do mês (plano, chamada e relatório). O cadastro do projeto fica em Gestão → Projetos. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const ui = () => ICM.ui;
  let filtro = 'ativas', busca = '', projetoSel = '';

  ICM.pages.turmasLista = async function (el) {
    ICM.app.setCrumbs([['Pedagógico'], ['Turmas']]);
    el.innerHTML = '<div class="page"><div class="card" style="height:120px"></div></div>';
    const [turmas, projetos, users, mats] = await Promise.all([ICM.api.turmas.list(), ICM.api.projetos.list(), ICM.api.usuarios.list().catch(() => []), ICM.api.raw('matriculas').catch(() => [])]);
    const conf = await ICM.api.pedagogico.conferencia(ICM.util.today().slice(0, 7)).catch(() => []);
    const nomeU = id => (users.find(u => u.id === id) || {}).nome || 'Professor(a) a definir';
    const ativos = id => mats.filter(m => m.turma_id === id && m.status === 'ativo').length;
    const cor = v => v == null ? '#94a3b8' : v >= 90 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
    const podeCriar = ICM.auth.can('turmas.editar');

    el.innerHTML = `<div class="page tl">
      <div class="page-head"><div><h1 class="page-title">Turmas</h1><div class="page-sub">Aulas, plano do mês, chamada, relatórios e frequência de cada turma.</div></div>
        ${podeCriar ? `<button class="btn btn-primary" data-nova>${I('plus', 18)} Nova turma</button>` : ''}</div>
      <div class="card mb-4"><div class="row wrap between">
        <div class="segmented" data-f>${[['ativas', 'Ativas'], ['encerradas', 'Encerradas'], ['todas', 'Todas']].map(([k, n]) => `<button data-v="${k}" class="${k === filtro ? 'active' : ''}">${n}</button>`).join('')}</div>
        <div class="row wrap"><select class="input" data-proj style="width:auto"><option value="">Todos os projetos</option>${projetos.map(p => `<option value="${esc(p.id)}" ${p.id === projetoSel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
          <div class="input-icon" style="width:260px">${I('search', 18)}<input class="input" data-q placeholder="Turma, professor ou local" value="${esc(busca)}"></div></div>
      </div></div>
      <div data-lista></div>
    </div>
    <style>
      .tl .tl-proj{display:flex;align-items:center;gap:10px;margin:22px 0 10px;font-weight:800;font-size:16px}
      .tl .tl-proj i{width:12px;height:12px;border-radius:4px;background:var(--c)}
      .tl .tl-proj a{font-size:12px;font-weight:600;margin-left:auto}
      .tl .tl-card .tl-obr{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700}
      .tl .tl-card .tl-obr .progress{flex:1;margin:0}
    </style>`;
    const box = el.querySelector('[data-lista]');
    const desenhar = () => {
      const q = busca.toLowerCase();
      const lista = turmas.filter(t => (filtro === 'todas' || (filtro === 'ativas' ? t.status !== 'encerrada' : t.status === 'encerrada'))
        && (!projetoSel || t.projeto_id === projetoSel)
        && (!q || [t.nome, t.modalidade, t.local, nomeU(t.professor_id)].some(v => String(v || '').toLowerCase().includes(q))));
      const grupos = projetos.map(p => ({ p, ts: lista.filter(t => t.projeto_id === p.id).sort((a, b) => a.nome.localeCompare(b.nome)) })).filter(g => g.ts.length);
      box.innerHTML = grupos.map(({ p, ts }) => `<div class="tl-proj" style="--c:${p.cor || '#2563eb'}"><i></i>${esc(p.nome)} <span class="xs muted">${ts.length} turma(s)</span><a href="#/projetos/${esc(p.id)}">Ver projeto →</a></div>
        <div class="grid grid-3 stagger">${ts.map(t => { const c = conf.find(x => x.turma.id === t.id); const n = ativos(t.id); return `
          <a class="card hoverable project-card tl-card" style="--c:${p.cor || '#2563eb'};color:inherit;text-decoration:none" href="#/turmas/${esc(t.id)}">
            <div class="row between"><div class="name">${esc(t.nome)}</div>${t.status === 'encerrada' ? '<span class="badge neutral">Encerrada</span>' : ''}</div>
            <div class="meta"><span>${I('user', 15)} ${esc(nomeU(t.professor_id))}</span><span>${I('clock', 15)} ${esc(ICM.pages._diasTxt ? ICM.pages._diasTxt(t.dias) : '')} · ${esc(t.inicio || '')}–${esc(t.fim || '')}</span>${t.local ? `<span>${I('pin', 15)} ${esc(t.local)}</span>` : ''}</div>
            <div><div class="row between xs bold muted"><span>Alunos</span><span>${n}/${t.vagas || '∞'}</span></div><div class="progress mt-2"><span style="width:${t.vagas ? Math.min(100, n / t.vagas * 100) : 0}%"></span></div></div>
            ${c && c.total != null ? `<div class="tl-obr" title="Plano do mês, chamada e relatório de aula"><span>Obrigações do mês</span><div class="progress"><span style="width:${c.total}%;background:${cor(c.total)}"></span></div><b style="color:${cor(c.total)}">${c.total}%</b></div>` : ''}
          </a>`; }).join('')}</div>`).join('') || ui().empty('Nenhuma turma encontrada', 'layers');
    };
    desenhar();
    el.querySelectorAll('[data-f] button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('[data-f] button').forEach(x => x.classList.toggle('active', x === b)); filtro = b.dataset.v; desenhar(); }));
    el.querySelector('[data-proj]').addEventListener('change', e => { projetoSel = e.target.value; desenhar(); });
    el.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { busca = e.target.value.trim(); desenhar(); }, 200));
    const bn = el.querySelector('[data-nova]'); if (bn) bn.addEventListener('click', () => ICM.pages._turmaForm({ projeto_id: projetoSel || '' }));
  };
})();
