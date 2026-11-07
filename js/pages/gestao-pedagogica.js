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
  async function conferencia(painel) {
    const linhas = await P().conferencia(ym);
    const profs = P().porProfessor(linhas);
    const pode = ICM.auth.can('pedagogico.gestao');
    painel.innerHTML = `<div class="card mb-4"><div class="card-head"><div><div class="card-title">Conferência de ${esc(ICM.util.fmtMonth(ym))}</div>
        <div class="card-sub">Cada turma: plano de aula do mês, chamada e relatório de cada aula (aulas até ontem, sem feriados, recessos e aulas canceladas). Obrigatório para o pagamento do professor.</div></div>
        <button class="btn btn-primary" data-tes>${I('printer', 18)} Relatório para a tesouraria</button></div>
      ${profs.map(p => `<div class="mb-4"><div class="row between wrap"><b>${esc(p.professor)}</b><span class="row" style="gap:8px">${p.total == null ? '' : `<b style="color:${corPct(p.total)}">${p.total}%</b>`}${p.total == null ? '<span class="badge neutral">Sem aulas</span>' : p.emDia ? '<span class="badge ok">Em dia</span>' : '<span class="badge danger">Pendente</span>'}</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Turma</th><th>Aulas</th><th>Plano do mês</th><th>Chamada</th><th>Relatório de aula</th><th style="min-width:120px">Cumprido</th><th>Observação</th><th></th></tr></thead><tbody>
        ${p.turmas.map(l => { const i = linhas.indexOf(l); return `<tr><td><a href="#/turmas/${esc(l.turma.id)}?mes=${ym}"><b>${esc(l.turma.nome)}</b></a><div class="xs muted">${esc(l.projeto.nome || '')}</div></td>
          <td>${l.aulas}</td>
          <td>${stBadge(l.status.plano)}${l.ajuste && l.ajuste.status && l.ajuste.status.plano ? ' <span class="xs muted" title="Ajustado pela coordenação">✎</span>' : ''}</td>
          <td>${stBadge(l.status.chamada)} <span class="xs muted">${l.status.chamada ? `${l.comChamada}/${l.aulas}` : ''}</span></td>
          <td>${stBadge(l.status.relatorio)} <span class="xs muted">${l.status.relatorio ? `${l.comRel}/${l.aulas}` : ''}</span></td>
          <td><b style="color:${corPct(l.total)}">${l.total == null ? '—' : l.total + '%'}</b>${barra(l.total)}</td>
          <td class="small" style="max-width:220px">${esc(l.obs || '')}</td>
          <td>${pode ? `<button class="btn btn-sm" data-aj="${i}">${I('edit', 14)} Conferir</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div></div>`).join('') || ui().empty('Nenhuma turma ativa', 'layers')}
    </div>`;
    painel.querySelectorAll('[data-aj]').forEach(b => b.addEventListener('click', () => ajustarModal(linhas[+b.dataset.aj], () => conferencia(painel))));
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
    painel.innerHTML = `<div class="grid grid-2 mb-4">
        <div class="card"><div class="card-title mb-2">Turmas visitadas em ${esc(ICM.util.fmtMonth(ym))}: ${visitadas.size} de ${ativas.length}</div>
          <div class="row wrap" style="gap:6px">${ativas.map(t => `<span class="badge ${visitadas.has(t.id) ? 'ok' : 'neutral'}">${visitadas.has(t.id) ? '✓ ' : ''}${esc(t.nome)}</span>`).join('')}</div></div>
        <div class="card"><div class="card-title mb-2">Professores com reunião no mês: ${profIds.filter(id => comReuniao.has(id)).length} de ${profIds.length}</div>
          <div class="row wrap" style="gap:6px">${profIds.map(id => `<span class="badge ${comReuniao.has(id) ? 'ok' : 'neutral'}">${comReuniao.has(id) ? '✓ ' : ''}${esc(nomeU(id))}</span>`).join('')}</div></div>
      </div>
      <div class="card"><div class="card-head"><div class="card-title">Registros de ${esc(ICM.util.fmtMonth(ym))}</div>
        ${pode ? `<div class="row wrap"><button class="btn" data-novo="visita">${I('eye', 16)} Nova visita à aula</button><button class="btn btn-primary" data-novo="reuniao">${I('plus', 18)} Nova ata de reunião</button></div>` : ''}</div>
        ${lista.length ? lista.map(a => `<div class="list-item" style="align-items:flex-start"><span class="badge ${a.tipo === 'visita' ? 'ok' : 'neutral'}">${esc(fmtDate(a.data))}</span>
          <div class="grow"><b>${esc(T[a.tipo] || a.tipo)} ${a.numero ? 'nº ' + esc(a.numero) : ''}${a.turma_id ? ' — ' + esc((turmas.find(t => t.id === a.turma_id) || {}).nome || '') : a.pauta ? ' — ' + esc(a.pauta) : ''}</b>
            <div class="xs muted">${esc((a.participantes || []).map(p => p.nome).join(', ') || (a.professores || []).map(nomeU).join(', '))}${a.registrado_por ? ' · por ' + esc(a.registrado_por) : ''}</div>
            ${a.encaminhamentos ? `<div class="small mt-1"><b>Encaminhamentos:</b> ${esc(a.encaminhamentos)}</div>` : ''}</div>
          <div class="row" style="gap:4px"><button class="btn btn-sm" data-pdf="${esc(a.id)}">${I('printer', 14)} ${doc(a)}</button>${pode ? `<button class="btn btn-sm btn-ghost" data-ed="${esc(a.id)}">${I('edit', 14)}</button>` : ''}</div></div>`).join('') : ui().empty('Nenhuma visita ou reunião registrada neste mês', 'users')}
      </div>`;
    const ctx = { turmas, ativas, users, projetos, profIds, depois: () => acomp(painel) };
    painel.querySelectorAll('[data-novo]').forEach(b => b.addEventListener('click', () => b.dataset.novo === 'visita' ? visitaModal(null, ctx) : ataModal(null, ctx)));
    painel.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => { const a = lista.find(x => x.id === b.dataset.ed); a.tipo === 'visita' ? visitaModal(a, ctx) : ataModal(a, ctx); }));
    painel.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', () => { const a = lista.find(x => x.id === b.dataset.pdf); ICM.reports.generate(a.tipo === 'visita' ? 'visita_aula' : 'ata_reuniao_pedagogica', { id: a.id }); }));
  }

  // Participantes: equipe do sistema (com função) + outras pessoas
  function funcaoProfessor(uid, turmas) { const ts = turmas.filter(t => t.professor_id === uid && t.status !== 'encerrada').map(t => t.nome); return ts.length ? `Professor(a) — ${ts.join(', ')}` : ''; }

  function ataModal(a, { turmas, users, projetos, profIds, depois }) {
    const eu = ICM.auth.user();
    a = a || { tipo: 'reuniao', data: ICM.util.today(), horario: '', formato: 'Presencial', local: 'Sede do Instituto', pauta: 'Reunião pedagógica mensal', redator: eu.nome, participantes: [{ id: eu.id, nome: eu.nome, funcao: cargoDe(eu) }], topicos: TOPICOS_PADRAO.map(t => ({ titulo: t, texto: '' })), encaminhamentos: '' };
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

  function visitaModal(a, { ativas, turmas, users, projetos, depois }) {
    const eu = ICM.auth.user();
    a = a || { tipo: 'visita', data: ICM.util.today(), horario: '', observador: eu.nome, observador_funcao: cargoDe(eu), aspectos: Object.fromEntries(ASPECTOS.map(x => [x, ''])), chamada_feita: '' };
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
