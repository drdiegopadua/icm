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
      ${turmas.length ? (() => {
        // Versão de impressão: uma folha deitada, dias lado a lado
        const filtro = [fProj && proj(fProj).nome, fProf && prof(fProf)].filter(Boolean).join(' · ');
        const hoje = new Date().toLocaleDateString('pt-BR');
        return `<div class="gs-print">
          <div class="gp-top"><img src="assets/icm-logo-escura.png" alt="Instituto Cultural das Montanhas"><div class="gp-tit"><b>Agenda da semana</b><span>${filtro ? esc(filtro) + ' · ' : ''}${turmas.length} turma(s) · ${Math.round(horas * 10) / 10}h de aula por semana</span></div><div class="gp-dt">Atualizada em ${esc(hoje)}</div></div>
          <table class="gp"><thead><tr>${dias.map(x => `<th>${esc(DIAS[x.d])}</th>`).join('')}</tr></thead>
          <tbody><tr>${dias.map(x => `<td>${x.itens.length ? x.itens.map(t => { const c = proj(t.projeto_id).cor || '#2563eb'; return `<div class="gp-i" style="--c:${esc(c)}">
            <div class="gp-h">${esc(t.inicio || '')}${t.fim ? '–' + esc(t.fim) : ''}</div>
            <div class="gp-n">${esc(t.nome)}</div>
            <div class="gp-m">${esc(prof(t.professor_id))}</div>
            ${t.local ? `<div class="gp-m">${esc(String(t.local).split(/,|\.\s|\s-\s/)[0])}</div>` : ''}
          </div>`; }).join('') : '<div class="gp-v">—</div>'}</td>`).join('')}</tr></tbody></table>
          <div class="gp-leg">${projsUsados.filter(p => !fProj || p.id === fProj).map(p => `<span><i style="--c:${esc(p.cor || '#2563eb')}"></i>${esc(p.nome)}</span>`).join('')}</div>
          <div class="gp-rod">Instituto Cultural das Montanhas · Afonso Cláudio-ES</div>
        </div>`; })() : ''}
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
      .gs-print{display:none}
      @media print{
        @page{size:A4 landscape;margin:8mm}
        html,body{background:#fff!important}
        .topnav,.subbar,.no-print,.bg-orbs,.crumbs,.toast-wrap{display:none!important}
        .grade>*:not(.gs-print){display:none!important}
        .grade{padding:0!important;margin:0!important;max-width:none!important}
        .gs-print{display:block;color:#111;font-family:Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .gp-top{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px}
        .gp-top img{height:34px}
        .gp-tit{flex:1;display:flex;flex-direction:column}
        .gp-tit b{font-size:17pt;font-weight:900;line-height:1.1}
        .gp-tit span,.gp-dt{font-size:8.5pt;color:#444}
        .gp{width:100%;border-collapse:collapse;table-layout:fixed}
        .gp th{background:#111;color:#fff;font-size:9pt;font-weight:800;text-transform:capitalize;padding:4px 5px;text-align:left;border:1px solid #111}
        .gp td{vertical-align:top;border:1px solid #bbb;padding:3px}
        .gp-i{border-left:3.5px solid var(--c);background:color-mix(in srgb,var(--c) 12%,#fff);border-radius:3px;padding:3px 5px;margin-bottom:3px;break-inside:avoid;page-break-inside:avoid}
        .gp-h{font-weight:900;font-size:8.5pt;color:var(--c)}
        .gp-n{font-weight:800;font-size:8.5pt;line-height:1.2}
        .gp-m{font-size:7.3pt;color:#444;line-height:1.25}
        .gp-v{text-align:center;color:#999;font-size:9pt;padding:6px 0}
        .gp-leg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:7.8pt;font-weight:600}
        .gp-leg i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:4px}
        .gp-rod{margin-top:4px;font-size:7pt;color:#777;text-align:right}
      }
    </style>`;

    el.querySelector('[data-proj]')?.addEventListener('change', e => { fProj = e.target.value; ICM.pages.gradeSemanal(el); });
    el.querySelector('[data-prof]')?.addEventListener('change', e => { fProf = e.target.value; ICM.pages.gradeSemanal(el); });
    el.querySelector('[data-imprimir]')?.addEventListener('click', () => window.print());
  };
})();
