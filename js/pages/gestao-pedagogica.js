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
  const anel = (v, t = 64) => { const r = 26, c = 2 * Math.PI * r; return `<svg width="${t}" height="${t}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--surface-sunken)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${corPct(v)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (v || 0) / 100)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">${v == null ? '—' : v + '%'}</text></svg>`; };

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
      .gp .gp-k{display:flex;align-items:center;gap:12px}.gp .gp-k b{font-size:24px;display:block}
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
        <div class="card gp-k">${anel(media)}<div><b>${media == null ? '—' : media + '%'}</b><span class="small muted">Obrigações cumpridas no mês (média)</span></div></div>
        <div class="card gp-k">${I('userCheck', 28)}<div><b>${profs.filter(p => p.emDia && p.total != null).length} de ${profs.filter(p => p.total != null).length}</b><span class="small muted">Professores em dia</span></div></div>
        <div class="card gp-k">${I('alert', 28)}<div><b>${alertas.length}</b><span class="small muted">Alunos em alerta de faltas</span></div></div>
        <div class="card gp-k">${I('eye', 28)}<div><b>${visitadas.size} de ${linhas.length}</b><span class="small muted">Turmas visitadas no mês</span></div></div>
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
  async function acomp(painel) {
    const T = P().acompanhamentos.TIPOS;
    const [lista, turmas, users] = await Promise.all([P().acompanhamentos.list(ym), ICM.api.turmas.list(), ICM.api.usuarios.list().catch(() => [])]);
    const ativas = turmas.filter(t => t.status !== 'encerrada');
    const profIds = [...new Set(ativas.map(t => t.professor_id).filter(Boolean))];
    const nomeU = id => (users.find(x => x.id === id) || {}).nome || '—';
    const visitadas = new Set(lista.filter(a => a.tipo === 'visita').map(a => a.turma_id));
    const comReuniao = new Set(lista.filter(a => a.tipo !== 'visita').flatMap(a => a.professores || []));
    const pode = ICM.auth.can('pedagogico.gestao');
    painel.innerHTML = `<div class="grid grid-2 mb-4">
        <div class="card"><div class="card-title mb-2">Turmas visitadas em ${esc(ICM.util.fmtMonth(ym))}: ${visitadas.size} de ${ativas.length}</div>
          <div class="row wrap" style="gap:6px">${ativas.map(t => `<span class="badge ${visitadas.has(t.id) ? 'ok' : 'neutral'}">${visitadas.has(t.id) ? '✓ ' : ''}${esc(t.nome)}</span>`).join('')}</div></div>
        <div class="card"><div class="card-title mb-2">Professores com reunião no mês: ${profIds.filter(id => comReuniao.has(id)).length} de ${profIds.length}</div>
          <div class="row wrap" style="gap:6px">${profIds.map(id => `<span class="badge ${comReuniao.has(id) ? 'ok' : 'neutral'}">${comReuniao.has(id) ? '✓ ' : ''}${esc(nomeU(id))}</span>`).join('')}</div></div>
      </div>
      <div class="card"><div class="card-head"><div class="card-title">Registros de ${esc(ICM.util.fmtMonth(ym))}</div>${pode ? `<button class="btn btn-primary" data-novo>${I('plus', 18)} Registrar visita ou reunião</button>` : ''}</div>
        ${lista.length ? lista.map(a => `<div class="list-item" style="align-items:flex-start"><span class="badge ${a.tipo === 'visita' ? 'info' : 'neutral'}">${esc(fmtDate(a.data))}</span>
          <div class="grow"><b>${esc(T[a.tipo] || a.tipo)}${a.turma_id ? ' — ' + esc((turmas.find(t => t.id === a.turma_id) || {}).nome || '') : ''}</b>
            <div class="xs muted">${(a.professores || []).map(nomeU).map(esc).join(', ')}${a.registrado_por ? ' · por ' + esc(a.registrado_por) : ''}</div>
            ${a.observacoes ? `<div class="small mt-1">${esc(a.observacoes)}</div>` : ''}${a.encaminhamentos ? `<div class="small mt-1"><b>Encaminhamentos:</b> ${esc(a.encaminhamentos)}</div>` : ''}</div>
          ${pode ? `<button class="btn btn-sm btn-ghost" data-ed="${esc(a.id)}">${I('edit', 14)}</button>` : ''}</div>`).join('') : ui().empty('Nenhuma visita ou reunião registrada neste mês', 'users')}
      </div>`;
    const abrir = a => {
      a = a || { tipo: 'visita', data: ICM.util.today(), professores: [] };
      const m = ui().modal({ title: a.id ? 'Editar registro' : 'Registrar visita ou reunião', body: `<form class="grid grid-2">
        ${ui().field({ name: 'tipo', label: 'Tipo', type: 'select', value: a.tipo, options: Object.entries(T) })}
        ${ui().field({ name: 'data', label: 'Data', type: 'date', value: a.data })}
        ${ui().field({ name: 'turma_id', label: 'Turma (visita)', type: 'select', value: a.turma_id || '', options: [['', '—'], ...ativas.map(t => [t.id, t.nome])], cls: 'span-2' })}
        <div class="span-2 field"><label class="label">Professor(es)</label><div class="row wrap" style="gap:10px">${profIds.map(id => `<label class="row"><input type="checkbox" name="prof" value="${esc(id)}" ${(a.professores || []).includes(id) ? 'checked' : ''}> ${esc(nomeU(id))}</label>`).join('')}</div></div>
        ${ui().field({ name: 'observacoes', label: 'Observações / pauta', type: 'textarea', rows: 3, value: a.observacoes, cls: 'span-2' })}
        ${ui().field({ name: 'encaminhamentos', label: 'Encaminhamentos e prazos', type: 'textarea', rows: 2, value: a.encaminhamentos, cls: 'span-2' })}
      </form>`, foot: `${a.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
      const selT = m.$('[name=turma_id]');
      selT.addEventListener('change', () => { const t = ativas.find(x => x.id === selT.value); if (t && t.professor_id) { const c = m.$(`[name=prof][value="${t.professor_id}"]`); if (c) c.checked = true; } });
      m.$('[data-ok]').addEventListener('click', async () => {
        const d = ICM.util.formData(m.$('form')); delete d.prof;
        const rec = { ...a, ...d, professores: [...m.el.querySelectorAll('[name=prof]:checked')].map(c => c.value) };
        try { await ui().run(() => P().acompanhamentos.save(rec), 'Registro salvo'); m.close(); acomp(painel); } catch (e) { /* toast */ }
      });
      const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (!(await ui().confirm({ title: 'Excluir registro', text: 'Excluir este registro?', ok: 'Excluir', danger: true }))) return; await ui().run(() => P().acompanhamentos.remove(a.id), 'Excluído'); m.close(); acomp(painel); });
    };
    const bn = painel.querySelector('[data-novo]'); if (bn) bn.addEventListener('click', () => abrir());
    painel.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => abrir(lista.find(x => x.id === b.dataset.ed))));
  }

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
