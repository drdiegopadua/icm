/* Agenda da semana (Pedagógico): grade fixa com todas as turmas ativas e seus horários,
   de segunda a domingo, na cor do projeto. Filtros por projeto e professor; imprimível. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, DIAS } = ICM.util;
  const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo
  let fProj = '', fProf = '';

  ICM.pages.gradeSemanal = async function (el) {
    ICM.app.setCrumbs([['Pedagógico'], ['Agenda da semana']]);
    const [turmasTodas, projetos, users] = await Promise.all([
      ICM.api.turmas.list(), ICM.api.projetos.list(), ICM.api.usuarios.list().catch(() => [])
    ]);
    const proj = id => projetos.find(p => p.id === id) || {};
    const prof = id => (users.find(u => u.id === id) || {}).nome || 'A definir';
    const ativas = turmasTodas.filter(t => t.status !== 'encerrada' && proj(t.projeto_id).status !== 'encerrado' && (t.dias || []).length);
    const turmas = ativas.filter(t => (!fProj || t.projeto_id === fProj) && (!fProf || t.professor_id === fProf));
    const hojeDow = new Date().getDay();
    const dias = ORDEM.map(d => ({ d, itens: turmas.filter(t => t.dias.includes(d)).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio))) }))
      .filter(x => x.itens.length || x.d !== 0); // domingo só aparece se tiver turma
    const profsIds = [...new Set(ativas.map(t => t.professor_id).filter(Boolean))];
    const projsUsados = projetos.filter(p => ativas.some(t => t.projeto_id === p.id));
    const horas = turmas.reduce((s, t) => { const [a, b] = [t.inicio, t.fim].map(h => { const [x, y] = String(h || '0:0').split(':').map(Number); return x * 60 + (y || 0); }); return s + Math.max(0, b - a) / 60 * t.dias.length; }, 0);

    el.innerHTML = `<div class="page grade">
      <div class="page-head">
        <div><h1 class="page-title">Agenda da semana</h1><div class="page-sub">${turmas.length} turma(s) · ${Math.round(horas * 10) / 10}h de aula por semana</div></div>
        <div class="row wrap no-print">
          <select class="input" style="width:auto" data-proj><option value="">Todos os projetos</option>${projsUsados.map(p => `<option value="${esc(p.id)}" ${p.id === fProj ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
          <select class="input" style="width:auto" data-prof><option value="">Todos os professores</option>${profsIds.map(id => `<option value="${esc(id)}" ${id === fProf ? 'selected' : ''}>${esc(prof(id))}</option>`).join('')}</select>
          <button class="btn" data-imprimir>${I('fileText', 18)} Imprimir</button>
        </div>
      </div>
      ${turmas.length ? `<div class="gs">${dias.map(x => `<div class="gs-d ${x.d === hojeDow ? 'hoje' : ''}">
        <div class="gs-h">${esc(DIAS[x.d])}</div>
        ${x.itens.length ? x.itens.map(t => `<a class="gs-i" href="#/turmas/${esc(t.id)}" style="--c:${proj(t.projeto_id).cor || '#2563eb'}">
          <small>${esc(t.inicio || '')}${t.fim ? '–' + esc(t.fim) : ''}</small>
          <b>${esc(t.nome)}</b>
          <span>${I('user', 13)} ${esc(prof(t.professor_id))}</span>
          ${t.local ? `<span>${I('pin', 13)} ${esc(t.local)}</span>` : ''}
        </a>`).join('') : '<div class="xs muted gs-v">Sem aula</div>'}
      </div>`).join('')}</div>
      <div class="row wrap mt-4 gs-leg">${projsUsados.filter(p => !fProj || p.id === fProj).map(p => `<span><i style="--c:${p.cor || '#2563eb'}"></i>${esc(p.nome)}</span>`).join('')}</div>`
      : ICM.ui.empty('Nenhuma turma ativa com dias e horários cadastrados', 'calendar')}
    </div>
    <style>
      .grade .gs{display:grid;grid-template-columns:repeat(${dias.length},minmax(0,1fr));gap:10px}
      .grade .gs-d{background:var(--surface);border-radius:16px;box-shadow:var(--sh-out-sm);padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0;min-height:200px}
      .grade .gs-d.hoje{outline:2px solid var(--primary)}
      .grade .gs-h{font-weight:800;font-size:13px;text-transform:capitalize;padding:2px 2px 4px}
      .grade .gs-i{display:flex;flex-direction:column;gap:3px;padding:8px 9px;border-radius:10px;color:var(--text);text-decoration:none;background:color-mix(in srgb,var(--c) 15%,transparent);border-left:4px solid var(--c);font-size:12px;overflow-wrap:anywhere;transition:transform .15s}
      .grade .gs-i:hover{transform:translateY(-2px)}
      .grade .gs-i small{font-weight:800;color:var(--c);font-size:12px}
      .grade .gs-i b{font-size:13px;line-height:1.25}
      .grade .gs-i span{display:flex;align-items:center;gap:4px;color:var(--muted);font-size:11.5px}
      .grade .gs-v{margin:auto 0;text-align:center}
      .grade .gs-leg{gap:14px;font-size:12px;font-weight:600}
      .grade .gs-leg i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);margin-right:6px}
      @media (max-width:900px){.grade .gs{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:520px){.grade .gs{grid-template-columns:1fr}.grade .gs-d{min-height:0}}
      @media print{.topnav,.subbar,.no-print,.bg-orbs{display:none!important}.grade .gs-d{box-shadow:none;border:1px solid #ddd}.grade .gs-i{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style>`;

    el.querySelector('[data-proj]')?.addEventListener('change', e => { fProj = e.target.value; ICM.pages.gradeSemanal(el); });
    el.querySelector('[data-prof]')?.addEventListener('change', e => { fProf = e.target.value; ICM.pages.gradeSemanal(el); });
    el.querySelector('[data-imprimir]')?.addEventListener('click', () => window.print());
  };
})();
