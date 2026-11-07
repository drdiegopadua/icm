/* Gestão pedagógica (coordenação): visão geral, conferência mensal dos professores (0–100%),
   frequência de todos os alunos e turmas com alertas, visitas e reuniões, cronograma pedagógico. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const P = () => ICM.api.pedagogico;
  const ST = { EM_DIA: ['Em dia', 'ok'], PARCIAL: ['Parcial', 'warn'], PENDENTE: ['Pendente', 'danger'] };
  const stBadge = s => s ? `<span class="badge ${ST[s][1]}">${ST[s][0]}</span>` : '<span class="xs muted">sem aulas</span>';
  const corPct = v => v == null ? '#94a3b8' : v >= 90 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
  const barra = v => `<div class="gp-bar" title="${v == null ? 'sem aulas no mês' : v + '%'}"><span style="width:${v || 0}%;background:${corPct(v)}"></span></div>`;
  const anel = (v, t = 64) => { const r = 26, c = 2 * Math.PI * r; return `<svg width="${t}" height="${t}" viewBox="0 0 64 64" style="flex:none;width:${t}px;height:${t}px"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--surface-sunken)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${corPct(v)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (v || 0) / 100)}" transform="rotate(-90 32 32)"/></svg>`; };

  let aba = 'visao';
  let ym = ICM.util.today().slice(0, 7);

  ICM.pages.gestaoPedagogica = async function (el, params, query) {
    ICM.app.setCrumbs([['Pedagógico'], ['Gestão pedagógica']]);
    if (query && query.get('tab')) aba = query.get('tab');
    const ABAS = [['visao', 'Visão geral', 'chart'], ['conferencia', 'Conferência dos professores', 'clipboardCheck'], ['frequencia', 'Frequência', 'userCheck'], ['acomp', 'Visitas e reuniões', 'users'], ['cronograma', 'Cronograma pedagógico', 'calendar']];
    el.innerHTML = `<div class="page gp">
      <div class="page-head"><div><h1 class="page-title">Gestão pedagógica</h1><div class="page-sub">Obrigações dos professores, frequência, acompanhamento das turmas e calendário pedagógico.</div></div>
        <div class="row"><button class="btn btn-icon btn-sm" data-ym="-1" aria-label="Mês anterior">${I('chevronLeft', 16)}</button><b data-ymlabel style="min-width:150px;text-align:center;text-transform:capitalize"></b><button class="btn btn-icon btn-sm" data-ym="1" aria-label="Próximo mês">${I('chevronRight', 16)}</button></div></div>
      <div class="tabs mb-4">${ABAS.map(([k, n, ic]) => `<button class="tab ${k === aba ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-painel></div>
    </div>
    <style>
      .gp .gp-bar{height:8px;border-radius:6px;background:var(--surface-sunken);overflow:hidden;min-width:80px}.gp .gp-bar span{display:block;height:100%;border-radius:6px}
      .gp .gp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
      .gp .gp-k{display:flex;align-items:center;gap:14px;position:relative;overflow:hidden;border-top:4px solid var(--c)}.gp .gp-k b{font-size:26px;display:block;color:var(--c)}
      .gp .gp-ic{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;flex:none;color:#fff;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 70%,#fff));box-shadow:0 8px 18px color-mix(in srgb,var(--c) 35%,transparent)}
      .gp .gp-k::after{content:"";position:absolute;right:-30px;bottom:-30px;width:110px;height:110px;border-radius:50%;background:var(--c);opacity:.07}
      .gp .gp-prof{display:grid;grid-template-columns:minmax(140px,220px) 1fr 52px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line-2)}
      .gp .gp-prof .gp-bar{height:12px}
      .gp td .gp-bar{margin-top:4px}
      .gp .gp-mes{font-weight:800;text-transform:capitalize;margin:14px 0 6px;color:var(--muted);font-size:13px}
      .gp .gp-ev{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--surface-2);margin-bottom:8px;border-left:4px solid var(--c)}
      .gp .gp-ev.passou{opacity:.6}
      .gp .gp-ev .d{min-width:74px;font-weight:800;font-size:13px}
    </style>`;
    const painel = el.querySelector('[data-painel]');
    const setYm = () => { el.querySelector('[data-ymlabel]').textContent = ICM.util.fmtMonth(ym); };
    setYm();
    const R = { visao, conferencia, frequencia, acomp, cronograma };
    const ir = () => { painel.innerHTML = '<div class="card" style="height:120px"></div>'; R[aba](painel).catch(e => { painel.innerHTML = ui().empty(e.message, 'alert'); }); };
    el.querySelectorAll('[data-ym]').forEach(b => b.addEventListener('click', () => { const [y, m] = ym.split('-').map(Number); ym = ICM.util.iso(new Date(y, m - 1 + Number(b.dataset.ym), 1)).slice(0, 7); setYm(); ir(); }));
    ui().tabs(el.querySelector('.tabs'), k => { aba = k; ir(); });
    ir();
  };

  // ======================= VISÃO GERAL =======================
  async function visao(painel) {
    const linhas = await P().conferencia(ym);
    const profs = P().porProfessor(linhas);
    const comAulas = linhas.filter(l => l.total != null);
    const media = comAulas.length ? Math.round(comAulas.reduce((s, l) => s + l.total, 0) / comAulas.length) : null;
    const alertas = await ICM.api.assiduidade.alertas(ym).catch(() => []);
    const acs = await P().acompanhamentos.list(ym);
    const visitadas = new Set(acs.filter(a => a.tipo === 'visita').map(a => a.turma_id));
    const ano = ym.slice(0, 4); const hoje = ICM.util.today();
    const prox = (await P().cronograma.list(ano)).filter(e => (e.fim || e.inicio) >= hoje).slice(0, 5);
    painel.innerHTML = `<div class="gp-kpis mb-4">
        <div class="card gp-k" style="--c:${corPct(media)}">${anel(media, 58)}<div><b>${media == null ? '—' : media + '%'}</b><span class="small muted">Obrigações cumpridas no mês (média)</span></div></div>
        <div class="card gp-k" style="--c:${!profs.filter(p => p.total != null).length ? '#64748b' : profs.filter(p => p.emDia && p.total != null).length === profs.filter(p => p.total != null).length ? '#10b981' : profs.filter(p => p.emDia && p.total != null).length ? '#f59e0b' : '#ef4444'}"><span class="gp-ic">${I('userCheck', 26)}</span><div><b>${profs.filter(p => p.emDia && p.total != null).length} de ${profs.filter(p => p.total != null).length}</b><span class="small muted">Professores em dia</span></div></div>
        <div class="card gp-k" style="--c:${alertas.length ? '#ef4444' : '#10b981'}"><span class="gp-ic">${I('alert', 26)}</span><div><b>${alertas.length}</b><span class="small muted">Alunos em alerta de faltas</span></div></div>
        <div class="card gp-k" style="--c:#8b5cf6"><span class="gp-ic">${I('eye', 26)}</span><div><b>${visitadas.size} de ${linhas.length}</b><span class="small muted">Turmas visitadas no mês</span></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><div><div class="card-title">Professores — ${esc(ICM.util.fmtMonth(ym))}</div><div class="card-sub">Plano do mês + chamada + relatório de cada aula</div></div><button class="btn btn-sm btn-ghost" data-go="conferencia">Conferir</button></div>
          ${profs.map(p => `<div class="gp-prof"><span class="small bold truncate">${esc(p.professor)}</span>${barra(p.total)}<b class="small" style="text-align:right;color:${corPct(p.total)}">${p.total == null ? '—' : p.total + '%'}</b></div>`).join('') || ui().empty('Sem turmas', 'users')}</div>
        <div class="col">
          <div class="card"><div class="card-head"><div class="card-title">Alunos faltando</div><button class="btn btn-sm btn-ghost" data-go="frequencia">Ver frequência</button></div>
            ${alertas.slice(0, 8).map(a => `<a class="list-item" href="#/alunos/${esc(a.aluno_id)}"><span class="badge ${a.nivel === 'danger' ? 'danger' : 'warn'}">${a.F} faltas</span><div class="grow truncate"><b>${esc(a.nome)}</b><div class="xs muted">${esc(a.turma)}</div></div></a>`).join('') || ui().empty('Nenhum aluno em alerta 🎉', 'userCheck')}
            ${alertas.length > 8 ? `<div class="xs muted mt-2">+ ${alertas.length - 8} aluno(s)</div>` : ''}</div>
          <div class="card"><div class="card-head"><div class="card-title">Próximos no cronograma</div><button class="btn btn-sm btn-ghost" data-go="cronograma">Cronograma</button></div>
            ${prox.map(e => `<div class="list-item"><span class="badge neutral">${esc(fmtDate(e.inicio).slice(0, 5))}</span><div class="grow truncate">${esc(e.titulo)}</div></div>`).join('') || '<p class="small muted">Nada programado. Use “Carregar eventos anuais” no cronograma.</p>'}</div>
        </div>
      </div>`;
    painel.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => document.querySelector(`.gp .tab[data-tab="${b.dataset.go}"]`).click()));
  }

  // ======================= CONFERÊNCIA =======================
  let confFiltro = 'todas', confBusca = '';
  async function conferencia(painel) {
    const linhas = await P().conferencia(ym);
    const profs = P().porProfessor(linhas);
    const pode = ICM.auth.can('pedagogico.gestao');
    const comAulas = linhas.filter(l => l.total != null);
    const media = comAulas.length ? Math.round(comAulas.reduce((s, l) => s + l.total, 0) / comAulas.length) : null;
    const situacao = l => l.total == null ? 'sem' : l.emDia ? 'dia' : l.total === 0 ? 'pendente' : 'parcial';
    const cont = { dia: 0, parcial: 0, pendente: 0, sem: 0 }; linhas.forEach(l => cont[situacao(l)]++);
    const ini = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    const chip = (s, x) => s ? `<span class="cf-chip ${ST[s][1]}">${ST[s][0]}${x ? `<small>${x}</small>` : ''}</span>` : '<span class="cf-chip neutro">—</span>';
    const pctCel = v => `<div class="cf-pct"><b style="color:${corPct(v)}">${v == null ? '—' : v + '%'}</b>${barra(v)}</div>`;

    const desenhar = () => {
      const q = confBusca.toLowerCase();
      const grupos = profs.map(p => ({ ...p, turmas: p.turmas.filter(l => (confFiltro === 'todas' || situacao(l) === confFiltro || (confFiltro === 'pendente' && situacao(l) === 'parcial')) && (!q || (p.professor + ' ' + l.turma.nome).toLowerCase().includes(q))) })).filter(p => p.turmas.length);
      painel.querySelector('[data-tab-conf]').innerHTML = grupos.length ? `<div class="table-wrap"><table class="table cf-tab">
        <colgroup><col style="width:23%"><col style="width:6%"><col style="width:11%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col><col style="width:110px"></colgroup>
        <thead><tr><th>Turma</th><th class="c">Aulas</th><th>Plano do mês</th><th>Chamada</th><th>Relatório</th><th>Cumprido</th><th>Observação</th><th></th></tr></thead>
        <tbody>${grupos.map(p => `<tr class="cf-prof"><td colspan="8"><div class="cf-prof-in"><span class="cf-av">${esc(ini(p.professor))}</span><b>${esc(p.professor)}</b><span class="xs muted">${p.turmas.length} turma(s)</span>
            <span class="cf-prof-dir">${p.total == null ? '' : `<span class="cf-prof-bar">${barra(p.total)}</span><b style="color:${corPct(p.total)}">${p.total}%</b>`}${p.total == null ? '<span class="cf-chip neutro">Sem aulas</span>' : p.emDia ? '<span class="cf-chip ok">Em dia — liberado</span>' : '<span class="cf-chip danger">Pendente</span>'}</span></div></td></tr>
          ${p.turmas.map(l => { const i = linhas.indexOf(l); const aj = l.ajuste && l.ajuste.status ? l.ajuste.status : {}; return `<tr>
            <td><a href="#/turmas/${esc(l.turma.id)}?mes=${ym}" class="cf-turma">${esc(l.turma.nome)}</a><div class="xs muted truncate">${esc(l.projeto.nome || '')}</div></td>
            <td class="c"><b>${l.aulas}</b></td>
            <td>${chip(l.status.plano)}${aj.plano ? '<span class="cf-aj" title="Ajustado pela coordenação">✎</span>' : ''}</td>
            <td>${chip(l.status.chamada, l.status.chamada ? `${l.comChamada}/${l.aulas}` : '')}${aj.chamada ? '<span class="cf-aj" title="Ajustado pela coordenação">✎</span>' : ''}</td>
            <td>${chip(l.status.relatorio, l.status.relatorio ? `${l.comRel}/${l.aulas}` : '')}${aj.relatorio ? '<span class="cf-aj" title="Ajustado pela coordenação">✎</span>' : ''}</td>
            <td>${pctCel(l.total)}</td>
            <td class="small cf-obs">${esc(l.obs || '') || '<span class="muted">—</span>'}</td>
            <td style="text-align:right">${pode ? `<button class="btn btn-sm" data-aj="${i}">${I('edit', 14)} Conferir</button>` : ''}</td></tr>`; }).join('')}`).join('')}
        </tbody></table></div>` : ui().empty('Nenhuma turma neste filtro', 'clipboardCheck');
      painel.querySelectorAll('[data-aj]').forEach(b => b.addEventListener('click', () => ajustarModal(linhas[+b.dataset.aj], () => conferencia(painel))));
    };

    painel.innerHTML = `<div class="card mb-4">
        <div class="card-head"><div><div class="card-title">Conferência de ${esc(ICM.util.fmtMonth(ym))}</div>
          <div class="card-sub">Plano de aula do mês, chamada e relatório de cada aula. Contam as aulas até ontem, sem feriados, recessos e aulas canceladas. Obrigatório para o pagamento do professor.</div></div>
          <button class="btn btn-primary" data-tes>${I('printer', 18)} Relatório para a tesouraria</button></div>
        <div class="cf-resumo">
          <div class="cf-r" style="--c:${corPct(media)}"><b>${media == null ? '—' : media + '%'}</b><span>Média de cumprimento</span></div>
          <div class="cf-r" style="--c:#10b981"><b>${cont.dia}</b><span>Turmas em dia</span></div>
          <div class="cf-r" style="--c:#f59e0b"><b>${cont.parcial}</b><span>Incompletas</span></div>
          <div class="cf-r" style="--c:#ef4444"><b>${cont.pendente}</b><span>Pendentes</span></div>
          <div class="cf-r" style="--c:#94a3b8"><b>${cont.sem}</b><span>Sem aulas no mês</span></div>
        </div>
        <div class="row wrap between mt-4">
          <div class="segmented" data-cf>${[['todas', 'Todas'], ['pendente', 'Pendentes e incompletas'], ['dia', 'Em dia'], ['sem', 'Sem aulas']].map(([k, n]) => `<button data-v="${k}" class="${k === confFiltro ? 'active' : ''}">${n}</button>`).join('')}</div>
          <div class="input-icon" style="width:260px">${I('search', 18)}<input class="input" data-cfq placeholder="Professor ou turma" value="${esc(confBusca)}"></div>
        </div>
        <div class="row wrap mt-4 xs muted" style="gap:14px"><span class="cf-chip ok">Em dia</span> todas as aulas registradas · <span class="cf-chip warn">Parcial</span> alguma aula sem registro · <span class="cf-chip danger">Pendente</span> nada registrado · <span class="cf-aj">✎</span> ajustado pela coordenação</div>
      </div>
      <div class="card" data-tab-conf></div>
      <style>
        .gp .cf-resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:6px}
        .gp .cf-r{padding:12px 14px;border-radius:14px;background:var(--surface-2);border-left:4px solid var(--c)}.gp .cf-r b{display:block;font-size:22px;color:var(--c)}.gp .cf-r span{font-size:12px;color:var(--muted);font-weight:600}
        .gp .cf-tab{table-layout:fixed;width:100%}.gp .cf-tab th.c,.gp .cf-tab td.c{text-align:center}
        .gp .cf-tab td{vertical-align:middle}
        .gp .cf-prof td{background:var(--surface-sunken);padding:10px 14px}
        .gp .cf-prof-in{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .gp .cf-prof-dir{margin-left:auto;display:flex;align-items:center;gap:10px}
        .gp .cf-prof-bar{width:140px}
        .gp .cf-av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--grad-primary);color:#fff;font-size:11px;font-weight:800;flex:none}
        .gp .cf-turma{font-weight:700}
        .gp .cf-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
        .gp .cf-chip small{font-weight:600;opacity:.8}
        .gp .cf-chip.ok{background:var(--ok-soft);color:var(--ok)}.gp .cf-chip.warn{background:var(--warn-soft);color:#b45309}.gp .cf-chip.danger{background:var(--danger-soft);color:var(--danger)}.gp .cf-chip.neutro{background:var(--surface-sunken);color:var(--muted)}
        .gp .cf-aj{margin-left:4px;color:var(--primary);font-weight:800}
        .gp .cf-pct{display:flex;align-items:center;gap:8px}.gp .cf-pct b{min-width:38px}.gp .cf-pct .gp-bar{flex:1;min-width:40px}
        .gp .cf-obs{overflow-wrap:anywhere}
        @media (max-width:900px){.gp .cf-tab{table-layout:auto;min-width:860px}}
      </style>`;
    desenhar();
    painel.querySelectorAll('[data-cf] button').forEach(b => b.addEventListener('click', () => { painel.querySelectorAll('[data-cf] button').forEach(x => x.classList.toggle('active', x === b)); confFiltro = b.dataset.v; desenhar(); }));
    painel.querySelector('[data-cfq]').addEventListener('input', ICM.util.debounce(e => { confBusca = e.target.value.trim(); desenhar(); }, 200));
    painel.querySelector('[data-tes]').addEventListener('click', () => ICM.reports.generate('conferencia_tesouraria', { ym }));
  }

  function ajustarModal(l, depois) {
    const sel = (k, auto) => `<select class="input" name="${k}"><option value="">Automático (${auto ? ST[auto][0] : 'sem aulas'})</option>${Object.entries(ST).map(([v, [n]]) => `<option value="${v}" ${l.ajuste && l.ajuste.status && l.ajuste.status[k] === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const pl = l.plano;
    const m = ui().modal({ title: `Conferir — ${l.turma.nome}`, body: `
      <p class="small muted mb-4">${esc(l.professor)} · ${esc(ICM.util.fmtMonth(ym))} · ${l.aulas} aula(s) no mês. O ajuste da coordenação prevalece sobre o cálculo automático.</p>
      <div class="grid grid-3 mb-4">
        <div class="field"><label class="label">Plano do mês</label>${sel('plano', l.auto.plano)}</div>
        <div class="field"><label class="label">Chamada (${l.comChamada}/${l.aulas})</label>${sel('chamada', l.auto.chamada)}</div>
        <div class="field"><label class="label">Relatório de aula (${l.comRel}/${l.aulas})</label>${sel('relatorio', l.auto.relatorio)}</div>
      </div>
      <div class="field"><label class="label">Observação (cópias, textos curtos, combinados…)</label><textarea class="textarea" rows="3" name="obs">${esc(l.obs || '')}</textarea></div>
      ${pl ? `<details class="mt-4"><summary class="small bold">Ver plano do mês</summary><div class="small mt-2">${['tema', 'objetivos', 'conteudos', 'metodologia', 'recursos', 'avaliacao'].filter(k => pl[k]).map(k => `<p><b>${esc({ tema: 'Tema', objetivos: 'Objetivos', conteudos: 'Conteúdos', metodologia: 'Metodologia', recursos: 'Recursos', avaliacao: 'Avaliação' }[k])}:</b> ${esc(pl[k])}</p>`).join('')}</div></details>` : '<p class="small muted mt-4">Plano do mês ainda não preenchido.</p>'}`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar conferência</button>` });
    m.$('[data-ok]').addEventListener('click', async () => {
      const status = {}; ['plano', 'chamada', 'relatorio'].forEach(k => { const v = m.$(`[name=${k}]`).value; if (v) status[k] = v; });
      m.close(); await ui().run(() => P().ajustar(l.turma.id, ym, { status, obs: m.$('[name=obs]').value.trim() }), 'Conferência salva'); depois();
    });
  }

  // ======================= FREQUÊNCIA =======================
  async function frequencia(painel) {
    const turmas = (await ICM.api.turmas.list()).filter(t => t.status !== 'encerrada');
    const dados = [];
    for (const t of turmas) { const r = await ICM.api.assiduidade.turma(t.id, ym); dados.push({ t, aulas: r.aulas.length, linhas: r.linhas.filter(l => l.status_turma === 'ativo' || l.total) }); }
    const freqT = d => { const T = d.linhas.reduce((s, l) => s + l.total, 0), Pp = d.linhas.reduce((s, l) => s + l.P + l.J, 0); return T ? Math.round(Pp / T * 100) : null; };
    const todos = dados.flatMap(d => d.linhas.map(l => ({ ...l, turma: d.t.nome, turma_id: d.t.id })));
    const geral = (() => { const T = todos.reduce((s, l) => s + l.total, 0), Pp = todos.reduce((s, l) => s + l.P + l.J, 0); return T ? Math.round(Pp / T * 100) : null; })();
    let filtro = 'alerta';
    const desenhar = () => {
      const lista = todos.filter(l => filtro === 'todos' || (filtro === 'alerta' ? l.nivel !== 'ok' : l.total === 0)).sort((a, b) => b.F - a.F || a.nome.localeCompare(b.nome));
      painel.innerHTML = `<div class="grid grid-2 mb-4">
        <div class="card"><div class="card-head"><div><div class="card-title">Frequência por turma — ${esc(ICM.util.fmtMonth(ym))}</div><div class="card-sub">Geral: <b>${geral == null ? '—' : geral + '%'}</b> · ${todos.length} aluno(s) em ${dados.length} turma(s)</div></div></div>
          ${dados.map(d => { const f = freqT(d); const al = d.linhas.filter(l => l.nivel !== 'ok').length; return `<a class="gp-prof" href="#/turmas/${esc(d.t.id)}?tab=frequencia&mes=${ym}" style="color:inherit;text-decoration:none"><span class="small bold truncate">${esc(d.t.nome)}<span class="xs muted"> · ${d.aulas} aula(s)${al ? ` · <b style="color:var(--danger)">${al} em alerta</b>` : ''}</span></span>${barra(f)}<b class="small" style="text-align:right;color:${corPct(f)}">${f == null ? '—' : f + '%'}</b></a>`; }).join('') || ui().empty('Sem turmas', 'layers')}</div>
        <div class="card"><div class="card-head"><div><div class="card-title">Alunos</div><div class="card-sub">Regra: 2 faltas no mês = alerta · 3 = avaliar desligamento (justificadas não contam)</div></div>
          <div class="segmented" data-f>${[['alerta', 'Em alerta'], ['sem', 'Sem chamada'], ['todos', 'Todos']].map(([k, n]) => `<button data-v="${k}" class="${k === filtro ? 'active' : ''}">${n}</button>`).join('')}</div></div>
          ${lista.length ? `<div class="table-wrap" style="max-height:520px;overflow:auto"><table class="table"><thead><tr><th>Aluno</th><th>Turma</th><th>P</th><th>F</th><th>J</th><th>Freq.</th><th></th></tr></thead><tbody>
            ${lista.map(l => `<tr><td><a href="#/alunos/${esc(l.aluno_id)}">${esc(l.nome)}</a></td><td class="small">${esc(l.turma)}</td><td>${l.P}</td><td><b style="color:${l.F ? 'var(--danger)' : 'inherit'}">${l.F}</b></td><td>${l.J}</td><td>${l.freq == null ? '—' : l.freq + '%'}</td><td>${l.nivel !== 'ok' ? ui().nivelPill(l.nivel, l.F) : ''}</td></tr>`).join('')}
          </tbody></table></div>` : ui().empty(filtro === 'alerta' ? 'Nenhum aluno em alerta 🎉' : 'Nada aqui', 'userCheck')}
          ${filtro === 'alerta' && lista.length ? `<div class="row end mt-4"><a class="btn btn-sm" href="#/avisos">${ICM.waIcon ? ICM.waIcon(15) : ''} Avisar as famílias</a><button class="btn btn-sm" data-rel>${I('printer', 15)} Relatório de assiduidade</button></div>` : ''}
        </div></div>`;
      painel.querySelectorAll('[data-f] button').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.v; desenhar(); }));
      const r = painel.querySelector('[data-rel]'); if (r) r.addEventListener('click', () => ICM.reports.generate('assiduidade', { ym, turma_id: '' }));
    };
    desenhar();
  }

  // ======================= VISITAS E REUNIÕES =======================
  // Ata de reunião (modelo P001/26) e relatório de visita à aula (modelo 001/2026)
  const ASPECTOS = ['Aula de acordo com o plano de aula mensal', 'Pontualidade (início e término da aula)', 'Organização do espaço e dos materiais', 'Didática e condução da aula', 'Participação e interesse dos alunos', 'Disciplina e convivência da turma'];
  const NOTAS = ['Ótimo', 'Bom', 'Regular', 'Precisa melhorar', 'Não observado'];
  const TOPICOS_PADRAO = ['PLANO DE AULA MENSAL', 'RELATÓRIOS DE AULA E REGISTRO DE CHAMADA', 'FREQUÊNCIA E ALUNOS FALTOSOS', 'FOTOS', 'OCORRÊNCIAS'];
  const cargoDe = u => (u && (u.cargo || (ICM.C.PAPEIS[u.papel] || {}).nome)) || '';

  async function acomp(painel) {
    const T = P().acompanhamentos.TIPOS;
    const [lista, turmas, users, projetos] = await Promise.all([P().acompanhamentos.list(ym), ICM.api.turmas.list(), ICM.api.usuarios.list().catch(() => []), ICM.api.projetos.list()]);
    const ativas = turmas.filter(t => t.status !== 'encerrada');
    const profIds = [...new Set(ativas.map(t => t.professor_id).filter(Boolean))];
    const nomeU = id => (users.find(x => x.id === id) || {}).nome || '—';
    const visitadas = new Set(lista.filter(a => a.tipo === 'visita').map(a => a.turma_id));
    const comReuniao = new Set(lista.filter(a => a.tipo !== 'visita').flatMap(a => a.professores || []));
    const pode = ICM.auth.can('pedagogico.gestao');
    const doc = a => a.tipo === 'visita' ? 'Relatório de visita' : 'Ata';
    const ultVisita = id => lista.filter(a => a.tipo === 'visita' && a.turma_id === id).sort((x, y) => y.data.localeCompare(x.data))[0];
    const ultReun = id => lista.filter(a => a.tipo !== 'visita' && (a.professores || []).includes(id)).sort((x, y) => y.data.localeCompare(x.data))[0];
    const profDe = t => (users.find(x => x.id === t.professor_id) || {}).nome || 'Professor(a) a definir';
    const nV = visitadas.size, nR = profIds.filter(id => comReuniao.has(id)).length;
    const prog = (n, t) => { const v = t ? Math.round(n / t * 100) : 0; return `<div class="ac-prog"><span style="width:${v}%;background:${corPct(v)}"></span></div>`; };
    const linhaPend = (titulo, sub, feito, acao) => `<div class="ac-row ${feito ? 'feito' : ''}"><span class="ac-ic">${feito ? I('check', 14) : ''}</span><div class="grow"><b>${titulo}</b><div class="xs muted">${sub}</div></div>${feito ? `<span class="xs muted">${esc(fmtDate(feito.data))}</span>` : acao}</div>`;
    painel.innerHTML = `<div class="grid grid-2 mb-4">
        <div class="card"><div class="ac-head"><div><div class="card-title">Visitas às turmas</div><div class="card-sub">${nV} de ${ativas.length} turma(s) visitada(s) em ${esc(ICM.util.fmtMonth(ym))}</div></div><b class="ac-num" style="color:${corPct(ativas.length ? Math.round(nV / ativas.length * 100) : null)}">${nV}/${ativas.length}</b></div>
          ${prog(nV, ativas.length)}
          <div class="ac-lista">${ativas.map(t => linhaPend(esc(t.nome), esc(profDe(t)), ultVisita(t.id), pode ? `<button class="btn btn-sm" data-vis="${esc(t.id)}">${I('eye', 14)} Visitar</button>` : '')).join('') || ui().empty('Sem turmas ativas', 'layers')}</div></div>
        <div class="card"><div class="ac-head"><div><div class="card-title">Reuniões com professores</div><div class="card-sub">${nR} de ${profIds.length} professor(es) com reunião em ${esc(ICM.util.fmtMonth(ym))}</div></div><b class="ac-num" style="color:${corPct(profIds.length ? Math.round(nR / profIds.length * 100) : null)}">${nR}/${profIds.length}</b></div>
          ${prog(nR, profIds.length)}
          <div class="ac-lista">${profIds.map(id => linhaPend(esc(nomeU(id)), esc(ativas.filter(t => t.professor_id === id).map(t => t.nome).join(', ')), ultReun(id), pode ? `<button class="btn btn-sm" data-reu="${esc(id)}">${I('plus', 14)} Ata</button>` : '')).join('') || ui().empty('Sem professores', 'users')}</div></div>
      </div>
      <div class="card"><div class="card-head"><div><div class="card-title">Registros de ${esc(ICM.util.fmtMonth(ym))}</div><div class="card-sub">${lista.length} registro(s)</div></div>
        ${pode ? `<div class="row wrap"><button class="btn" data-novo="visita">${I('eye', 16)} Nova visita</button><button class="btn btn-primary" data-novo="reuniao">${I('plus', 18)} Nova ata</button></div>` : ''}</div>
        ${lista.length ? `<div class="table-wrap"><table class="table ac-tab"><colgroup><col style="width:110px"><col style="width:170px"><col><col style="width:28%"><col style="width:170px"></colgroup>
          <thead><tr><th>Data</th><th>Tipo</th><th>Turma / pauta</th><th>Participantes</th><th></th></tr></thead><tbody>
          ${lista.map(a => `<tr><td><b>${esc(fmtDate(a.data))}</b><div class="xs muted">nº ${esc(a.numero || '—')}</div></td>
            <td><span class="ac-tipo ${a.tipo === 'visita' ? 'v' : 'r'}">${a.tipo === 'visita' ? I('eye', 13) : I('users', 13)} ${esc(a.tipo === 'visita' ? 'Visita à aula' : T[a.tipo] || a.tipo)}</span></td>
            <td><b>${esc(a.turma_id ? (turmas.find(t => t.id === a.turma_id) || {}).nome || '' : a.pauta || '')}</b>${a.encaminhamentos ? `<div class="xs muted truncate" title="${esc(a.encaminhamentos)}">Encaminhamento: ${esc(a.encaminhamentos)}</div>` : ''}</td>
            <td class="small truncate" title="${esc((a.participantes || []).map(p => p.nome).join(', '))}">${esc((a.participantes || []).map(p => p.nome).join(', ') || (a.professores || []).map(nomeU).join(', ') || a.observador || '')}</td>
            <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm" data-pdf="${esc(a.id)}" title="${doc(a)}">${I('printer', 14)} ${a.tipo === 'visita' ? 'Relatório' : 'Ata'}</button>${pode ? `<button class="btn btn-sm btn-ghost" data-ed="${esc(a.id)}" title="Editar">${I('edit', 14)}</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>` : `<div class="ac-vazio">${I('users', 22)}<span>Nenhuma visita ou reunião registrada neste mês. Use os botões <b>Visitar</b> e <b>Ata</b> nas listas acima.</span></div>`}
      </div>
      <style>
        .gp .ac-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .gp .ac-num{font-size:24px;font-weight:900}
        .gp .ac-prog{height:8px;border-radius:6px;background:var(--surface-sunken);overflow:hidden;margin:10px 0 6px}.gp .ac-prog span{display:block;height:100%;border-radius:6px}
        .gp .ac-lista{max-height:300px;overflow:auto}
        .gp .ac-row{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--line-2)}
        .gp .ac-row:last-child{border-bottom:0}
        .gp .ac-ic{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;border:2px solid var(--line-2)}
        .gp .ac-row.feito .ac-ic{background:var(--ok);border-color:var(--ok);color:#fff}
        .gp .ac-row b{font-size:13.5px}
        .gp .ac-tab{table-layout:fixed;width:100%}.gp .ac-tab td{vertical-align:middle}
        .gp .ac-tipo{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
        .gp .ac-tipo.v{background:color-mix(in srgb,#8b5cf6 14%,transparent);color:#7c3aed}.gp .ac-tipo.r{background:var(--primary-soft);color:var(--primary)}
        .gp .ac-vazio{display:flex;align-items:center;gap:12px;padding:18px;border-radius:14px;background:var(--surface-2);color:var(--muted);font-size:13.5px}
        @media (max-width:900px){.gp .ac-tab{table-layout:auto;min-width:720px}}
      </style>`;
    const ctx = { turmas, ativas, users, projetos, profIds, depois: () => acomp(painel) };
    painel.querySelectorAll('[data-novo]').forEach(b => b.addEventListener('click', () => b.dataset.novo === 'visita' ? visitaModal(null, ctx) : ataModal(null, ctx)));
    painel.querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => visitaModal(null, ctx, { turma_id: b.dataset.vis })));
    painel.querySelectorAll('[data-reu]').forEach(b => b.addEventListener('click', () => { const u = users.find(x => x.id === b.dataset.reu) || {}; ataModal(null, ctx, { extra: { id: u.id, nome: u.nome || '', funcao: funcaoProfessor(u.id, turmas) || cargoDe(u) } }); }));
    painel.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => { const a = lista.find(x => x.id === b.dataset.ed); a.tipo === 'visita' ? visitaModal(a, ctx) : ataModal(a, ctx); }));
    painel.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', () => { const a = lista.find(x => x.id === b.dataset.pdf); ICM.reports.generate(a.tipo === 'visita' ? 'visita_aula' : 'ata_reuniao_pedagogica', { id: a.id }); }));
  }

  // Participantes: equipe do sistema (com função) + outras pessoas
  function funcaoProfessor(uid, turmas) { const ts = turmas.filter(t => t.professor_id === uid && t.status !== 'encerrada').map(t => t.nome); return ts.length ? `Professor(a) — ${ts.join(', ')}` : ''; }

  function ataModal(a, { turmas, users, projetos, profIds, depois }, pre = {}) {
    const eu = ICM.auth.user();
    a = a || { tipo: 'reuniao', data: ICM.util.today(), horario: '', formato: 'Presencial', local: 'Sede do Instituto', pauta: 'Reunião pedagógica mensal', redator: eu.nome, participantes: [{ id: eu.id, nome: eu.nome, funcao: cargoDe(eu) }, ...(pre.extra && pre.extra.id !== eu.id ? [pre.extra] : [])], topicos: TOPICOS_PADRAO.map(t => ({ titulo: t, texto: '' })), encaminhamentos: '' };
    let parts = (a.participantes || []).map(p => ({ ...p }));
    let tops = (a.topicos || []).map(t => ({ ...t }));
    const equipe = users.filter(u => u.ativo !== false && !u.convite).sort((x, y) => x.nome.localeCompare(y.nome));
    const m = ui().modal({ title: a.id ? `Ata ${a.numero || ''}` : 'Nova ata de reunião', size: 'wide', body: `<form data-f>
      <div class="grid grid-4">
        ${ui().field({ name: 'tipo', label: 'Tipo', type: 'select', value: a.tipo, options: [['reuniao', 'Reunião com professor(a)'], ['reuniao_geral', 'Reunião geral de professores'], ['formacao', 'Formação / capacitação']] })}
        ${ui().field({ name: 'data', label: 'Data', type: 'date', value: a.data })}
        ${ui().field({ name: 'horario', label: 'Horário', type: 'time', value: a.horario })}
        ${ui().field({ name: 'formato', label: 'Formato', type: 'select', value: a.formato, options: ['Presencial', 'Online', 'Híbrido'] })}
        ${ui().field({ name: 'local', label: 'Local / plataforma', value: a.local, placeholder: 'Sede, WhatsApp, Google Meet…' })}
        ${ui().field({ name: 'projeto_id', label: 'Projeto (opcional)', type: 'select', value: a.projeto_id || '', options: [['', '—'], ...projetos.map(p => [p.id, p.nome])] })}
        ${ui().field({ name: 'pauta', label: 'Pauta / assunto', value: a.pauta, cls: 'span-2' })}
        ${ui().field({ name: 'redator', label: 'Redator(a)', value: a.redator || eu.nome })}
      </div>
      <div class="section-title mt-4">${I('users', 18)} Participantes</div>
      <div class="row wrap mb-2" style="gap:8px"><select class="input" data-addu style="width:auto;min-width:260px"><option value="">+ Adicionar da equipe…</option>${equipe.map(u => `<option value="${esc(u.id)}">${esc(u.nome)}${profIds.includes(u.id) ? ' (professor)' : ''}</option>`).join('')}</select>
        <button type="button" class="btn btn-sm" data-addo>${I('plus', 14)} Outra pessoa</button></div>
      <div data-parts></div>
      <div class="section-title mt-4">${I('fileText', 18)} Relato da reunião</div>
      <p class="xs muted mb-2">O parágrafo de abertura (data, horário, formato, participantes e pauta) é montado sozinho na ata.</p>
      <div data-tops></div><button type="button" class="btn btn-sm mt-2" data-addt>${I('plus', 14)} Tópico</button>
      ${ui().field({ name: 'encaminhamentos', label: 'Encaminhamentos', type: 'textarea', rows: 2, value: a.encaminhamentos, placeholder: 'Sem encaminhamentos.' })}
    </form>`, foot: `${a.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn" data-salvar-pdf>${I('printer', 16)} Salvar e gerar ata</button><button class="btn btn-primary" data-ok>Salvar</button>` });
    const desenharParts = () => {
      m.$('[data-parts]').innerHTML = parts.map((p, i) => `<div class="row mb-2" style="gap:8px"><input class="input" data-pn="${i}" value="${esc(p.nome)}" placeholder="Nome completo" style="flex:1"><input class="input" data-pf="${i}" value="${esc(p.funcao || '')}" placeholder="Função / papel no projeto" style="flex:1.4"><button type="button" class="btn btn-sm btn-ghost" data-pr="${i}">${I('x', 14)}</button></div>`).join('') || '<p class="small muted">Nenhum participante.</p>';
      m.el.querySelectorAll('[data-pn]').forEach(x => x.addEventListener('input', () => { parts[+x.dataset.pn].nome = x.value; }));
      m.el.querySelectorAll('[data-pf]').forEach(x => x.addEventListener('input', () => { parts[+x.dataset.pf].funcao = x.value; }));
      m.el.querySelectorAll('[data-pr]').forEach(x => x.addEventListener('click', () => { parts.splice(+x.dataset.pr, 1); desenharParts(); }));
    };
    const desenharTops = () => {
      m.$('[data-tops]').innerHTML = tops.map((t, i) => `<div class="card flat mb-2" style="padding:10px"><div class="row mb-2" style="gap:8px"><b>${i + 1}.</b><input class="input" data-tt="${i}" value="${esc(t.titulo)}" style="flex:1;font-weight:700"><button type="button" class="btn btn-sm btn-ghost" data-tr="${i}" title="Remover tópico">${I('trash', 14)}</button></div><textarea class="textarea" rows="2" data-tx="${i}" placeholder="O que foi tratado (deixe em branco para não sair na ata)">${esc(t.texto || '')}</textarea></div>`).join('');
      m.el.querySelectorAll('[data-tt]').forEach(x => x.addEventListener('input', () => { tops[+x.dataset.tt].titulo = x.value; }));
      m.el.querySelectorAll('[data-tx]').forEach(x => x.addEventListener('input', () => { tops[+x.dataset.tx].texto = x.value; }));
      m.el.querySelectorAll('[data-tr]').forEach(x => x.addEventListener('click', () => { tops.splice(+x.dataset.tr, 1); desenharTops(); }));
    };
    desenharParts(); desenharTops();
    m.$('[data-addu]').addEventListener('change', e => { const u = equipe.find(x => x.id === e.target.value); e.target.value = ''; if (!u || parts.some(p => p.id === u.id)) return; parts.push({ id: u.id, nome: u.nome, funcao: funcaoProfessor(u.id, turmas) || cargoDe(u) }); desenharParts(); });
    m.$('[data-addo]').addEventListener('click', () => { parts.push({ nome: '', funcao: '' }); desenharParts(); });
    m.$('[data-addt]').addEventListener('click', () => { tops.push({ titulo: '', texto: '' }); desenharTops(); });
    const salvar = async () => {
      const d = ICM.util.formData(m.$('[data-f]'));
      const participantes = parts.filter(p => String(p.nome || '').trim()).map(p => ({ ...p, nome: p.nome.trim(), funcao: (p.funcao || '').trim() }));
      if (!participantes.length) { ui().toast('Inclua pelo menos um participante.', 'warn'); return null; }
      const rec = { ...a, ...d, participantes, professores: participantes.map(p => p.id).filter(id => id && profIds.includes(id)), topicos: tops.filter(t => String(t.titulo || '').trim()), encaminhamentos: d.encaminhamentos.trim() };
      try { const r = await ui().run(() => P().acompanhamentos.save(rec), 'Ata salva'); m.close(); depois(); return r; } catch (e) { return null; }
    };
    m.$('[data-ok]').addEventListener('click', salvar);
    m.$('[data-salvar-pdf]').addEventListener('click', async () => { const r = await salvar(); if (r) setTimeout(() => ICM.reports.generate('ata_reuniao_pedagogica', { id: r.id }), 300); });
    const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (!(await ui().confirm({ title: 'Excluir ata', text: 'Excluir esta ata?', ok: 'Excluir', danger: true }))) return; await ui().run(() => P().acompanhamentos.remove(a.id), 'Excluída'); m.close(); depois(); });
  }

  function visitaModal(a, { ativas, turmas, users, projetos, depois }, pre = {}) {
    const eu = ICM.auth.user();
    a = a || { tipo: 'visita', data: ICM.util.today(), horario: '', observador: eu.nome, observador_funcao: cargoDe(eu), aspectos: Object.fromEntries(ASPECTOS.map(x => [x, ''])), chamada_feita: '', ...pre };
    const m = ui().modal({ title: a.id ? `Visita nº ${a.numero || ''}` : 'Nova visita à aula', size: 'wide', body: `<form data-f>
      <div class="grid grid-4">
        ${ui().field({ name: 'turma_id', label: 'Turma', type: 'select', value: a.turma_id || '', options: [['', 'Escolha…'], ...ativas.map(t => [t.id, t.nome])], cls: 'span-2' })}
        ${ui().field({ name: 'data', label: 'Data', type: 'date', value: a.data })}
        ${ui().field({ name: 'horario', label: 'Horário', type: 'time', value: a.horario })}
        ${ui().field({ name: 'observador', label: 'Observador(a)', value: a.observador })}
        ${ui().field({ name: 'observador_funcao', label: 'Função do observador(a)', value: a.observador_funcao })}
        ${ui().field({ name: 'presentes', label: 'Alunos presentes', type: 'number', value: a.presentes ?? '', attrs: 'min="0"' })}
        <div class="field"><label class="label">Matriculados</label><div class="input" data-mat style="display:flex;align-items:center">—</div></div>
      </div>
      <div class="section-title mt-4">${I('clipboardCheck', 18)} Aspectos observados</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Aspecto</th><th style="width:200px">Avaliação</th></tr></thead><tbody>
        ${ASPECTOS.map((x, i) => `<tr><td>${esc(x)}</td><td><select class="input" data-asp="${i}"><option value="">—</option>${NOTAS.map(n => `<option ${(a.aspectos || {})[x] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td></tr>`).join('')}
        <tr><td>Registro de chamada feito na aula</td><td><select class="input" name="chamada_feita"><option value="">—</option>${['Sim', 'Não', 'Feito depois da aula'].map(n => `<option ${a.chamada_feita === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td></tr>
      </tbody></table></div>
      <div class="grid grid-2 mt-4">
        ${ui().field({ name: 'observacoes', label: 'Relato da visita', type: 'textarea', rows: 3, value: a.observacoes, cls: 'span-2' })}
        ${ui().field({ name: 'pontos_positivos', label: 'Pontos positivos', type: 'textarea', rows: 2, value: a.pontos_positivos })}
        ${ui().field({ name: 'pontos_melhorar', label: 'Pontos a melhorar', type: 'textarea', rows: 2, value: a.pontos_melhorar })}
        ${ui().field({ name: 'encaminhamentos', label: 'Encaminhamentos', type: 'textarea', rows: 2, value: a.encaminhamentos, cls: 'span-2' })}
      </div></form>`,
      foot: `${a.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn" data-salvar-pdf>${I('printer', 16)} Salvar e gerar relatório</button><button class="btn btn-primary" data-ok>Salvar</button>` });
    // matriculados na data e presentes pela chamada do dia (se já foi feita)
    const atualizar = async () => {
      const tid = m.$('[name=turma_id]').value, dt = m.$('[name=data]').value; if (!tid) { m.$('[data-mat]').textContent = '—'; return; }
      const mats = await ICM.api.turmas.alunos(tid).catch(() => []);
      const n = mats.filter(x => x.entrada <= dt && (!x.saida || x.saida > dt)).length; m.$('[data-mat]').textContent = String(n); m.$('[data-mat]').dataset.n = n;
      const pres = m.$('[name=presentes]');
      if (pres.value === '') { const aula = (await ICM.api.aulas.list(tid, dt.slice(0, 7)).catch(() => [])).find(x => x.data === dt); if (aula && Object.keys(aula.presencas || {}).length) pres.value = Object.values(aula.presencas).filter(v => v === 'P').length; }
      if (!m.$('[name=horario]').value) { const t = ativas.find(x => x.id === tid); if (t && t.inicio) m.$('[name=horario]').value = t.inicio; }
    };
    m.$('[name=turma_id]').addEventListener('change', atualizar); m.$('[name=data]').addEventListener('change', atualizar); atualizar();
    const salvar = async () => {
      const d = ICM.util.formData(m.$('[data-f]'));
      const aspectos = Object.fromEntries(ASPECTOS.map((x, i) => [x, m.$(`[data-asp="${i}"]`).value]));
      const t = turmas.find(x => x.id === d.turma_id) || {};
      const rec = { ...a, ...d, aspectos, presentes: d.presentes === '' ? null : +d.presentes, matriculados: +(m.$('[data-mat]').dataset.n || 0), professores: t.professor_id ? [t.professor_id] : [] };
      try { const r = await ui().run(() => P().acompanhamentos.save(rec), 'Visita salva'); m.close(); depois(); return r; } catch (e) { return null; }
    };
    m.$('[data-ok]').addEventListener('click', salvar);
    m.$('[data-salvar-pdf]').addEventListener('click', async () => { const r = await salvar(); if (r) setTimeout(() => ICM.reports.generate('visita_aula', { id: r.id }), 300); });
    const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (!(await ui().confirm({ title: 'Excluir visita', text: 'Excluir este relatório de visita?', ok: 'Excluir', danger: true }))) return; await ui().run(() => P().acompanhamentos.remove(a.id), 'Excluída'); m.close(); depois(); });
  }

  // ---------- Documentos (folha timbrada) ----------
  const dataExtenso = d => ICM.util.fmtDateLong(d).replace(/^\w+-?\w*,\s*/, '');
  ICM.reports.register('ata_reuniao_pedagogica', {
    title: 'Ata de reunião', steps: ['Carregando a reunião', 'Montando o relato', 'Incluindo assinaturas'],
    async build({ id }) {
      const { sec, head, meta, esc: e } = ICM.reports.h;
      const a = (await P().acompanhamentos.list()).find(x => x.id === id); if (!a) throw new Error('Ata não encontrada.');
      const proj = a.projeto_id ? ((await ICM.api.projetos.list()).find(p => p.id === a.projeto_id) || {}).nome : '';
      const parts = a.participantes || [];
      const nomes = parts.map(p => p.nome); const lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes.slice(-1) : nomes.join('');
      const fmt = String(a.formato || 'Presencial').toLowerCase();
      let html = head(`Ata de reunião ${a.numero || ''}`, a.pauta || P().acompanhamentos.TIPOS[a.tipo]);
      html += meta([['Data', dataExtenso(a.data)], ['Horário / formato', [a.horario, a.formato].filter(Boolean).join(' — ')], ['Local', a.local || ''], ['Projeto', proj || '—'], ['Redator(a)', a.redator || a.registrado_por || '']]);
      html += sec(`<h2>Participantes</h2><table><thead><tr><th>Nome</th><th>Função / papel no projeto</th></tr></thead><tbody>${parts.map(p => `<tr><td>${e(p.nome)}</td><td>${e(p.funcao || '')}</td></tr>`).join('')}</tbody></table>`);
      const tops = (a.topicos || []).filter(t => String(t.texto || '').trim());
      html += sec(`<h2>Relato da reunião</h2><p>A reunião realizada no dia ${e(dataExtenso(a.data))}${a.horario ? `, com início às ${e(a.horario)},` : ''} foi realizada de forma ${e(fmt)}${a.local ? ` no(a) ${e(a.local)}` : ''}, com a participação de ${e(lista)}, tendo como pauta: ${e(a.pauta || '')}.</p>
        ${tops.map((t, i) => `<h3 style="margin:14px 0 4px;font-size:12.5px">${i + 1}. ${e(String(t.titulo).toUpperCase())}</h3><p style="white-space:pre-line">${e(t.texto)}</p>`).join('')}`);
      html += sec(`<h2>Encaminhamentos</h2><p style="white-space:pre-line">${e(a.encaminhamentos || 'Sem encaminhamentos.')}</p><p style="text-align:center;margin-top:18px">Lavrada em ${e(dataExtenso(a.data))}.</p>`);
      const AE = ICM.assinaturasEquipe; const bl = p => AE ? AE.bloco(`${p.nome} — ${p.funcao || 'Participante'}`) : `<div class="sg"><div class="sg-l">${e(p.nome)} — ${e(p.funcao || '')}</div></div>`;
      for (let i = 0; i < parts.length; i += 2) html += sec(`<div class="signs">${bl(parts[i])}${parts[i + 1] ? bl(parts[i + 1]) : '<div></div>'}</div>`);
      html += sec(`<p style="font-size:10px;color:#3a4669;text-align:center;margin-top:10px">${e(ICM.C.ORG.razao)} • Documento interno • ${e(ICM.util.fmtDate(a.data))}</p>`);
      return { title: `Ata ${a.numero || ''} — ${a.pauta || ''}`, html, file: `ata-${String(a.numero || a.id).replace(/\W+/g, '-')}` };
    }
  });
  ICM.reports.register('visita_aula', {
    title: 'Relatório de visita à aula', steps: ['Carregando a visita', 'Montando o relatório', 'Incluindo assinaturas'],
    async build({ id }) {
      const { sec, head, table, esc: e } = ICM.reports.h;
      const a = (await P().acompanhamentos.list()).find(x => x.id === id); if (!a) throw new Error('Visita não encontrada.');
      const t = (await ICM.api.turmas.list()).find(x => x.id === a.turma_id) || {};
      const proj = (await ICM.api.projetos.list()).find(p => p.id === t.projeto_id) || {};
      const prof = ((await ICM.api.usuarios.list().catch(() => [])).find(u => u.id === t.professor_id) || {}).nome || '';
      const area = (ICM.C.AREAS[proj.area] || {}).nome || '';
      let html = head(`Relatório de visita à aula nº ${a.numero || ''}`, `${t.nome || ''} — ${dataExtenso(a.data)}${a.horario ? `, às ${a.horario}` : ''}`);
      html += sec(`<h2>1. Identificação</h2>${table(['Campo', 'Informação', 'Campo', 'Informação'], [
        ['Turma', t.nome || '', 'Data / horário', `${ICM.util.fmtDate(a.data)}${a.horario ? ' — ' + a.horario : ''}`],
        ['Área / projeto', [area, proj.nome].filter(Boolean).join(' — '), 'Professor(a)', prof],
        ['Observador(a)', `${a.observador || ''}${a.observador_funcao ? ' — ' + a.observador_funcao : ''}`, 'Alunos presentes', a.presentes == null ? '—' : `${a.presentes} de ${a.matriculados || 0} matriculados`]])}`);
      html += sec(`<h2>2. Aspectos observados</h2>${table(['Aspecto', 'Avaliação'], [...ASPECTOS.map(x => [x, (a.aspectos || {})[x] || '—']), ['Registro de chamada feito na aula', a.chamada_feita || '—']])}`);
      const bloco = (n, tit, v) => sec(`<h2>${n}. ${tit}</h2><p style="white-space:pre-line">${e(v || 'Nada a declarar.')}</p>`);
      html += bloco(3, 'Relato da visita', a.observacoes) + bloco(4, 'Pontos positivos', a.pontos_positivos) + bloco(5, 'Pontos a melhorar', a.pontos_melhorar) + bloco(6, 'Encaminhamentos', a.encaminhamentos);
      html += sec(`<p style="text-align:right;margin-top:16px">${e(ICM.C.ORG.cidade)}, ${e(dataExtenso(a.data))}.</p>`);
      const AE = ICM.assinaturasEquipe; const bl = r => AE ? AE.bloco(r) : `<div class="sg"><div class="sg-l">${e(r)}</div></div>`;
      html += sec(`<div class="signs">${bl(`${a.observador || 'Observador(a)'} — ${a.observador_funcao || 'Observador(a)'}`)}${bl(`${prof || 'Professor(a)'} — Professor(a) da turma`)}</div>`);
      return { title: `Visita ${a.numero || ''} — ${t.nome || ''}`, html, file: `visita-${String(a.numero || a.id).replace(/\W+/g, '-')}-${(t.nome || '').replace(/\W+/g, '-')}` };
    }
  });

  // ======================= CRONOGRAMA =======================
  async function cronograma(painel) {
    const T = P().cronograma.TIPOS; const ano = ym.slice(0, 4); const hoje = ICM.util.today();
    const lista = await P().cronograma.list(ano);
    const pode = ICM.auth.can('pedagogico.gestao');
    const porMes = {}; lista.forEach(e => { (porMes[e.inicio.slice(0, 7)] = porMes[e.inicio.slice(0, 7)] || []).push(e); });
    painel.innerHTML = `<div class="card"><div class="card-head"><div><div class="card-title">Cronograma pedagógico ${esc(ano)}</div><div class="card-sub">Planejamento, formações, reuniões, conselhos de classe, apresentações e prazos do professor.</div></div>
        ${pode ? `<div class="row wrap"><button class="btn" data-padrao>${I('sparkles', 16)} Carregar eventos anuais</button><button class="btn btn-primary" data-novo>${I('plus', 18)} Novo evento</button></div>` : ''}</div>
      <div class="row wrap mb-2" style="gap:10px">${Object.values(T).map(([n, c]) => `<span class="xs row" style="gap:4px"><i style="width:10px;height:10px;border-radius:3px;background:${c};display:inline-block"></i>${esc(n)}</span>`).join('')}</div>
      ${Object.keys(porMes).sort().map(k => `<div class="gp-mes">${esc(ICM.util.fmtMonth(k))}</div>${porMes[k].map(e => `<div class="gp-ev ${(e.fim || e.inicio) < hoje ? 'passou' : ''}" style="--c:${(T[e.tipo] || ['', '#64748b'])[1]}">
        <div class="d">${esc(fmtDate(e.inicio).slice(0, 5))}${e.fim ? '–' + esc(fmtDate(e.fim).slice(0, 5)) : ''}</div><div class="grow"><b>${esc(e.titulo)}</b>${e.descricao ? `<div class="xs muted">${esc(e.descricao)}</div>` : ''}</div>
        ${pode ? `<button class="btn btn-sm btn-ghost" data-ed="${esc(e.id)}">${I('edit', 14)}</button>` : ''}</div>`).join('')}`).join('') || ui().empty(`Nenhum evento em ${ano}. Clique em “Carregar eventos anuais” para começar com o calendário sugerido.`, 'calendar')}
    </div>`;
    const abrir = e => {
      e = e || { tipo: 'reuniao', inicio: ICM.util.today() };
      const m = ui().modal({ title: e.id ? 'Editar evento' : 'Novo evento pedagógico', size: 'sm', body: `<form class="col">
        ${ui().field({ name: 'titulo', label: 'Título', value: e.titulo })}
        ${ui().field({ name: 'tipo', label: 'Tipo', type: 'select', value: e.tipo, options: Object.entries(T).map(([k, [n]]) => [k, n]) })}
        <div class="grid grid-2">${ui().field({ name: 'inicio', label: 'Data', type: 'date', value: e.inicio })}${ui().field({ name: 'fim', label: 'Até (opcional)', type: 'date', value: e.fim || '' })}</div>
        ${ui().field({ name: 'descricao', label: 'Descrição', type: 'textarea', rows: 2, value: e.descricao })}</form>`,
        foot: `${e.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)}</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
      m.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('form')); if (!d.fim) d.fim = null; try { await ui().run(() => P().cronograma.save({ ...e, ...d }), 'Evento salvo'); m.close(); cronograma(painel); } catch (er) { /* toast */ } });
      const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { await ui().run(() => P().cronograma.remove(e.id), 'Evento excluído'); m.close(); cronograma(painel); });
    };
    const bp = painel.querySelector('[data-padrao]');
    if (bp) bp.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: `Eventos anuais de ${ano}`, text: 'Vou cadastrar o calendário pedagógico sugerido (planejamento, semana pedagógica, reuniões de pais, conselhos de classe, apresentações) e os prazos de todo mês: plano de aula até o dia 5 e conferência até o dia 10. Depois você ajusta as datas. Itens já cadastrados não são duplicados.', ok: 'Carregar' }))) return;
      const n = await ui().run(() => P().cronograma.carregarPadrao(ano)); ui().toast(`${n} evento(s) cadastrado(s)`, 'ok'); cronograma(painel);
    });
    const bn = painel.querySelector('[data-novo]'); if (bn) bn.addEventListener('click', () => abrir());
    painel.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => abrir(lista.find(x => x.id === b.dataset.ed))));
  }

  // ======================= RELATÓRIO PARA A TESOURARIA =======================
  ICM.reports.register('conferencia_tesouraria', {
    title: 'Conferência pedagógica — tesouraria',
    steps: ['Lendo aulas do mês', 'Conferindo planos, chamadas e relatórios', 'Calculando o cumprimento por professor', 'Montando documento'],
    async build({ ym: mes }) {
      const { sec, head, meta, table, signs, esc: e } = ICM.reports.h;
      const linhas = await P().conferencia(mes); const profs = P().porProfessor(linhas);
      const s = v => v ? ST[v][0] : 'Sem aulas';
      let html = head('Conferência pedagógica mensal', `Obrigações dos professores — ${ICM.util.fmtMonth(mes)}`);
      html += meta([['Mês de referência', ICM.util.fmtMonth(mes)], ['Professores em dia', `${profs.filter(p => p.emDia && p.total != null).length} de ${profs.filter(p => p.total != null).length}`], ['Conferido em', ICM.util.fmtDate(ICM.util.today())]]);
      html += sec(`<h2>Resumo por professor</h2>${table(['Professor(a)', { t: 'Turmas', c: 1 }, { t: 'Cumprido', c: 1 }, 'Situação para pagamento'], profs.map(p => [p.professor, p.turmas.length, p.total == null ? '—' : p.total + '%', { html: p.total == null ? 'Sem aulas no mês' : p.emDia ? '<b style="color:#047857">LIBERADO — em dia</b>' : '<b style="color:#b91c1c">PENDENTE — aguardar regularização</b>' }]))}`);
      html += sec(`<h2>Detalhe por turma</h2>${table(['Professor(a)', 'Turma', { t: 'Aulas', c: 1 }, 'Plano do mês', 'Chamada', 'Relatório de aula', { t: '%', c: 1 }, 'Observação'], linhas.map(l => [l.professor, l.turma.nome, l.aulas, s(l.status.plano), l.status.chamada ? `${s(l.status.chamada)} (${l.comChamada}/${l.aulas})` : s(null), l.status.relatorio ? `${s(l.status.relatorio)} (${l.comRel}/${l.aulas})` : s(null), l.total == null ? '—' : l.total + '%', l.obs || '']))}`);
      html += sec(`<p style="font-size:11px;color:#3a4669">Critérios: plano de aula do mês preenchido; chamada e relatório registrados em todas as aulas do mês (feriados, recessos e aulas canceladas não contam). “Parcial” = alguma aula sem registro. Ajustes e observações feitos pela coordenação pedagógica na conferência.</p>`);
      html += signs('Coordenação pedagógica', 'Tesouraria');
      return { title: `Conferência pedagógica — ${ICM.util.fmtMonth(mes)}`, html, file: `conferencia-pedagogica-${mes}` };
    }
  });
})();
