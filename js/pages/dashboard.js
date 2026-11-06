/* Painel inicial: atenção do dia, números com comparação, alunos,
   frequência e agenda da semana. Cada perfil vê só o que pode. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const U = () => ICM.util;
  const { esc, fmtDateShort, DIAS } = ICM.util;
  const tentar = async (fn, padrao) => { try { return await fn(); } catch (e) { return padrao; } };
  let periodo = 'mes';

  // Intervalo do período escolhido e do período anterior (para comparar)
  function intervalos(p) {
    const h = new Date(); const ym = d => U().iso(d).slice(0, 7);
    if (p === 'ano') {
      const a = h.getFullYear();
      return { de: `${a}-01-01`, ate: U().today(), rot: `em ${a}`, antDe: `${a - 1}-01-01`, antAte: `${a - 1}${U().today().slice(4)}`, antRot: `${a - 1} até hoje` };
    }
    const ini = new Date(h.getFullYear(), h.getMonth() - (p === 'anterior' ? 1 : 0), 1);
    const fim = p === 'anterior' ? new Date(h.getFullYear(), h.getMonth(), 0) : h;
    const aIni = new Date(ini.getFullYear(), ini.getMonth() - 1, 1); const ultimoAnt = new Date(ini.getFullYear(), ini.getMonth(), 0);
    // Mês em andamento: compara com os mesmos dias do mês anterior (dia 1 até o dia de hoje)
    const aFim = p === 'mes' ? new Date(aIni.getFullYear(), aIni.getMonth(), Math.min(h.getDate(), ultimoAnt.getDate())) : ultimoAnt;
    const mesAnt = U().fmtMonth(ym(aIni)).toLowerCase();
    return { de: U().iso(ini), ate: U().iso(fim), rot: p === 'anterior' ? `em ${U().fmtMonth(ym(ini)).toLowerCase()}` : 'neste mês', antDe: U().iso(aIni), antAte: U().iso(aFim), antRot: p === 'mes' ? `os mesmos dias de ${mesAnt} (1 a ${aFim.getDate()})` : mesAnt };
  }
  const freqDe = aulas => { let P = 0, T = 0; aulas.forEach(a => Object.values(a.presencas || {}).forEach(v => { T++; if (v !== 'F') P++; })); return T ? Math.round(P / T * 100) : null; };

  async function carregar() {
    const can = p => ICM.auth.can(p);
    const hoje = U().today();
    const R = intervalos(periodo);
    const turmas = await ICM.api.turmas.list();
    const tids = turmas.map(t => t.id);
    const projetos = await ICM.api.projetos.list();
    const cor = tid => { const t = turmas.find(x => x.id === tid) || {}; return (projetos.find(p => p.id === t.projeto_id) || {}).cor || '#2563eb'; };
    const aulas = (await ICM.api.raw('aulas')).filter(a => tids.includes(a.turma_id));
    const real = aulas.filter(a => a.status === 'realizada');
    const noPer = (a, de, ate) => a.data >= de && a.data <= ate;
    const per = real.filter(a => noPer(a, R.de, R.ate)), ant = real.filter(a => noPer(a, R.antDe, R.antAte));
    const alunos = await ICM.api.alunos.list({ status: '' });
    const ativos = alunos.filter(a => a.status === 'ativo');
    const mats = (await ICM.api.raw('matriculas')).filter(m => tids.includes(m.turma_id));

    const d = { R, hoje, turmas, projetos, cor, can };
    d.kpi = {
      alunos: ativos.length,
      novos: alunos.filter(a => a.data_matricula && a.data_matricula >= R.de && a.data_matricula <= R.ate).length,
      novosAnt: alunos.filter(a => a.data_matricula && a.data_matricula >= R.antDe && a.data_matricula <= R.antAte).length,
      saidas: mats.filter(m => m.saida && m.saida >= R.de && m.saida <= R.ate).length,
      turmas: turmas.filter(t => t.status !== 'encerrada').length,
      horas: per.reduce((s, a) => s + (a.horas || 0), 0), horasAnt: ant.reduce((s, a) => s + (a.horas || 0), 0),
      aulas: per.length, freq: freqDe(per), freqAnt: freqDe(ant)
    };

    // 1. Atenção do dia (mesma regra da Rotina do dia)
    const r = await tentar(() => ICM.api.rotina(), {}) || {};
    const espera = can('espera.gerir') ? await tentar(() => ICM.api.espera.list({ status: 'aguardando' }), []) : [];
    const pelaApp = espera.filter(e => e.origem === 'app').length;
    const planosPend = turmas.filter(t => t.status !== 'encerrada').filter(t => !aulas.some(a => a.turma_id === t.id && a.data.startsWith(hoje.slice(0, 7)) && a.plano && (a.plano.tema || a.plano.objetivos))).length;
    d.atencao = [
      { n: r.semRegistro || 0, t: 'aulas sem chamada', ic: 'clipboard', href: '#/rotina', nivel: 'warn' },
      { n: (r.faltas || []).length, t: 'alunos com faltas', ic: 'alert', href: '#/relatorios?r=assiduidade', nivel: 'danger' },
      { n: planosPend, t: 'turmas sem plano de aula no mês', ic: 'book', href: '#/projetos', nivel: 'warn' },
      { n: espera.length, t: 'na lista de espera', sub: pelaApp ? `${pelaApp} pelo app` : '', ic: 'list', href: '#/espera', nivel: 'info' },
      { n: (r.docsInst || []).length, t: 'documentos do Instituto vencendo', ic: 'shield', href: '#/documentos', nivel: 'danger' },
      { n: (r.emprestimos || []).length, t: 'empréstimos atrasados', ic: 'building', href: '#/patrimonio', nivel: 'warn' },
      { n: (r.estoque || []).length, t: 'itens de estoque acabando', ic: 'layers', href: '#/estoque', nivel: 'warn' },
      { n: (r.mensalidades || []).length, t: 'mensalidades em atraso', ic: 'dollar', href: '#/associados', nivel: 'warn' },
      { n: (r.rh || []).length + (r.mandatos || []).length, t: 'pendências de equipe e diretoria', ic: 'users', href: '#/equipe', nivel: 'warn' },
      { n: (r.aniversarios || []).length, t: 'aniversariantes hoje', ic: 'star', href: '#/aniversariantes', nivel: 'ok' }
    ].filter(x => x.n > 0);

    // 4. Alunos e atendimento
    const faixas = [['Até 10', 0, 10], ['11 a 14', 11, 14], ['15 a 17', 15, 17], ['18 a 29', 18, 29], ['30+', 30, 200]];
    const CF = ['#60a5fa', '#2563eb', '#8b5cf6', '#f97316', '#10b981'];
    d.perfil = {
      faixas: faixas.map(([l, a, b], i) => ({ l, c: CF[i], v: ativos.filter(x => { const n = U().age(x.nascimento); return n != null && n >= a && n <= b; }).length }))
        .concat([{ l: 'Sem data de nascimento', c: '#94a3b8', v: ativos.filter(x => U().age(x.nascimento) == null).length }]).filter(x => x.v),
      sexo: [['F', 'Feminino', '#ec4899'], ['M', 'Masculino', '#2563eb'], ['O', 'Outro', '#a78bfa']].map(([k, l, c]) => ({ l, c, v: ativos.filter(x => x.sexo === k).length }))
        .concat([{ l: 'Não informado', c: '#94a3b8', v: ativos.filter(x => !['F', 'M', 'O'].includes(x.sexo)).length }]).filter(x => x.v),
      bairros: Object.entries(ativos.reduce((o, x) => { const b = ((x.endereco || {}).bairro || '').trim() || 'Não informado'; o[b] = (o[b] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6),
      cadunico: can('alunos.sensivel') ? ativos.filter(x => (x.social || {}).cadunico).length : null,
      van: ativos.filter(x => (x.van || {}).usa).length
    };
    const ocup = turmas.filter(t => t.status !== 'encerrada' && t.vagas).map(t => ({ t, n: mats.filter(m => m.turma_id === t.id && m.status === 'ativo').length })).map(x => ({ ...x, pct: Math.round(x.n / x.t.vagas * 100) }));
    d.ocupacao = { lotadas: ocup.filter(x => x.pct >= 100).length, sobrando: ocup.filter(x => x.pct < 60).length, total: ocup.length, lista: ocup.sort((a, b) => b.pct - a.pct) };
    d.espera = espera.length;

    // 5. Frequência por turma e por mês
    d.meses = [];
    for (let i = 5; i >= 0; i--) {
      const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - i); const k = U().iso(x).slice(0, 7);
      const doMes = real.filter(a => a.data.startsWith(k));
      d.meses.push({ l: U().MESES_C[x.getMonth()], f: freqDe(doMes), h: doMes.reduce((s, a) => s + (a.horas || 0), 0) });
    }

    // 6. Agenda da semana (segunda a domingo)
    const h = new Date(); const seg = new Date(h); seg.setDate(h.getDate() - ((h.getDay() + 6) % 7));
    const dias = Array.from({ length: 7 }, (_, i) => { const x = new Date(seg); x.setDate(seg.getDate() + i); return U().iso(x); });
    const evs = await tentar(() => ICM.api.eventos.list(), []);
    const reus = await tentar(() => ICM.api.reunioes.list(), []);
    // Turmas aparecem pelo horário cadastrado (dias e horário), mesmo sem aula lançada;
    // em feriado ou recesso do calendário letivo, a turma não aparece e o dia mostra o feriado
    const cal = await tentar(() => ICM.api.calendario.list(), []);
    const parada = k => cal.find(e => ['feriado', 'recesso'].includes(e.tipo) && e.inicio <= k && (e.fim || e.inicio) >= k);
    const vigente = (t, k) => { const p = projetos.find(x => x.id === t.projeto_id) || {}; return t.status !== 'encerrada' && p.status !== 'encerrado' && (!p.inicio || p.inicio <= k) && (!p.fim || p.fim >= k); };
    const previstas = k => parada(k) ? [] : turmas.filter(t => vigente(t, k) && (t.dias || []).includes(U().parseD(k).getDay()) && !aulas.some(a => a.turma_id === t.id && a.data === k))
      .map(t => ({ h: t.inicio, t: t.nome, c: cor(t.id), href: `#/turmas/${t.id}`, prev: true }));
    d.semana = dias.map(k => ({
      k, itens: [
        ...(parada(k) ? [{ h: (ICM.C.TIPOS_CALENDARIO[parada(k).tipo] || {}).nome || '', t: parada(k).titulo, c: '#ef4444', href: '#/calendario-letivo', ev: true }] : []),
        ...previstas(k),
        ...aulas.filter(a => a.data === k && a.status !== 'cancelada').map(a => ({ h: a.inicio, t: (turmas.find(t => t.id === a.turma_id) || {}).nome || 'Aula', c: cor(a.turma_id), href: `#/turmas/${a.turma_id}?aula=${a.id}`, feita: a.status === 'realizada' })),
        ...evs.filter(e => e.data === k).map(e => ({ h: e.horario || '', t: e.titulo, c: (ICM.C.TIPOS_EVENTO[e.tipo] || {}).cor || '#8b5cf6', href: `#/eventos/${e.id}`, ev: true })),
        ...reus.filter(x => x.data === k).map(x => ({ h: x.horario || '', t: 'Reunião: ' + x.titulo, c: '#0891b2', href: `#/reunioes/${x.id}`, ev: true }))
      ].sort((a, b) => String(a.h).localeCompare(String(b.h)))
    }));
    return d;
  }

  const delta = (v, ant, modo = '%') => {
    if (v == null || ant == null) return '';
    if (modo === 'pp') { const df = v - ant; return df === 0 ? '<span class="badge neutral dl">= anterior</span>' : `<span class="badge ${df > 0 ? 'ok' : 'danger'} dl">${df > 0 ? '▲' : '▼'} ${Math.abs(df)} p.p.</span>`; }
    if (modo === 'n') { const df = v - ant; return df === 0 ? '' : `<span class="badge ${df > 0 ? 'ok' : 'danger'} dl">${df > 0 ? '+' : '−'}${Math.abs(df)} vs anterior</span>`; }
    if (!ant) return v ? '<span class="badge ok dl">novo</span>' : '';
    const pc = Math.round((v - ant) / ant * 100);
    return pc === 0 ? '<span class="badge neutral dl">= anterior</span>' : `<span class="badge ${pc > 0 ? 'ok' : 'danger'} dl">${pc > 0 ? '▲' : '▼'} ${Math.abs(pc)}%</span>`;
  };
  const stat = (icon, color, val, label, extra = '', suffix = '', href = '') => {
    const tag = href ? 'a' : 'div';
    return `<${tag} class="card stat hoverable"${href ? ` href="${href}" style="color:inherit;text-decoration:none"` : ''}><div class="row between"><div class="ic" style="--c:${color}">${I(icon, 22)}</div>${extra}</div><div class="val" data-count="${val}" data-suffix="${suffix}">0</div><div class="lbl">${esc(label)}</div></${tag}>`;
  };
  const barra = (pct, cls = '') => `<div class="progress mt-2 ${cls}"><span style="width:${Math.max(0, Math.min(100, pct || 0))}%"></span></div>`;

  ICM.pages.dashboard = async function (el) {
    ICM.app.setCrumbs([['Início']]);
    const user = ICM.auth.user();
    const hr = new Date().getHours();
    const saud = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    const ehProf = user.papel === 'professor';
    const d = await carregar();
    const { R } = d;
    const money = v => U().money(v);

    el.innerHTML = `<div class="page painel">
      <div class="page-head">
        <div><h1 class="page-title">${saud}, ${esc(user.nome.split(' ')[0])} 👋</h1><div class="page-sub">${esc(DIAS[new Date().getDay()])}, ${esc(U().fmtDateLong(d.hoje))} — ${ehProf ? 'suas turmas em um só lugar.' : 'aqui está o resumo do Instituto.'}</div></div>
        <div class="row wrap no-print">
          <div class="segmented" data-periodo>${[['mes', 'Este mês'], ['anterior', 'Mês anterior'], ['ano', 'Ano']].map(([k, t]) => `<button data-v="${k}" class="${k === periodo ? 'active' : ''}">${t}</button>`).join('')}</div>
          ${ICM.auth.can('alunos.editar') ? `<a class="btn btn-primary" href="#/alunos/novo">${I('userPlus', 18)} Nova matrícula</a>` : ''}
          <button class="btn" data-imprimir>${I('fileText', 18)} Imprimir resumo</button>
        </div>
      </div>

      ${d.atencao.length ? `<div class="card atencao mb-4">
        <div class="card-head"><div><div class="card-title">${I('alert', 18)} Precisa de atenção hoje</div><div class="card-sub">Toque para resolver</div></div><a class="btn btn-sm btn-ghost no-print" href="#/rotina">Rotina do dia</a></div>
        <div class="at-grid">${d.atencao.map(a => `<a class="at-item ${a.nivel}" href="${a.href}"><span class="at-n">${a.n}</span><span class="at-t">${esc(a.t)}${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</span>${I(a.ic, 18)}</a>`).join('')}</div>
      </div>` : `<div class="card atencao ok mb-4"><div class="row">${I('userCheck', 20)}<b>Tudo em dia hoje.</b><span class="muted small">Nenhuma pendência para resolver agora.</span></div></div>`}

      <div class="grid grid-4 stagger">
        ${stat('users', '#2563eb', d.kpi.alunos, `Alunos ativos · ${d.kpi.novos} novo(s) ${R.rot}${d.kpi.saidas ? ` · ${d.kpi.saidas} saída(s)` : ''}`, delta(d.kpi.novos, d.kpi.novosAnt, 'n'), '', '#/alunos')}
        ${stat('layers', '#8b5cf6', d.kpi.turmas, `Turmas ativas${d.ocupacao.lotadas ? ` · ${d.ocupacao.lotadas} lotada(s)` : ''}`, '', '', '#/projetos')}
        ${stat('clock', '#f97316', Math.round(d.kpi.horas), `Horas de aula ${R.rot} (${d.kpi.aulas} aulas)`, delta(d.kpi.horas, d.kpi.horasAnt), 'h')}
        ${stat('userCheck', '#10b981', d.kpi.freq || 0, `Frequência ${R.rot}`, delta(d.kpi.freq, d.kpi.freqAnt, 'pp'), '%')}
      </div>
      <div class="xs muted mt-2">Comparação com ${esc(R.antRot)}.</div>

      <div class="sec-t mt-6">${I('users', 18)} Alunos e atendimento</div>
      <div class="grid grid-3">
        <div class="card"><div class="card-head"><div class="card-title">Faixa etária</div></div>${d.perfil.faixas.length ? ICM.ui.donut(d.perfil.faixas, 130) : ICM.ui.empty('Sem dados')}</div>
        <div class="card"><div class="card-head"><div class="card-title">Quem atendemos</div></div>
          ${d.perfil.sexo.length ? ICM.ui.donut(d.perfil.sexo, 130) : ''}
          <div class="row wrap mt-4">
            <span class="badge neutral">${d.perfil.van} ${d.perfil.van === 1 ? 'usa' : 'usam'} a van</span>
            ${d.perfil.cadunico != null ? `<span class="badge neutral">${d.perfil.cadunico} no CadÚnico (${d.kpi.alunos ? Math.round(d.perfil.cadunico / d.kpi.alunos * 100) : 0}%)</span>` : ''}
            ${d.espera ? `<a class="badge info" href="#/espera">${d.espera} na lista de espera</a>` : ''}
          </div>
        </div>
        <div class="card"><div class="card-head"><div><div class="card-title">Bairros</div><div class="card-sub">Onde moram os alunos</div></div></div>
          ${d.perfil.bairros.map(([b, n]) => `<div class="mb-2"><div class="row between xs bold"><span class="truncate">${esc(b)}</span><span>${n}</span></div>${barra(n / d.perfil.bairros[0][1] * 100)}</div>`).join('') || ICM.ui.empty('Sem dados')}
        </div>
      </div>
      ${d.ocupacao.total ? `<div class="card mt-4"><div class="card-head"><div><div class="card-title">Ocupação das turmas</div><div class="card-sub">${d.ocupacao.lotadas} lotada(s) · ${d.ocupacao.sobrando} com muitas vagas (menos de 60%)</div></div></div>
        <div class="ocup">${d.ocupacao.lista.map(x => `<a href="#/turmas/${esc(x.t.id)}" class="oc"><div class="row between xs bold"><span class="truncate"><i class="dot" style="--c:${d.cor(x.t.id)}"></i>${esc(x.t.nome)}</span><span>${x.n}/${x.t.vagas}</span></div>${barra(x.pct, x.pct >= 100 ? 'danger' : x.pct < 60 ? 'warn' : 'ok')}</a>`).join('')}</div></div>` : ''}

      <div class="sec-t mt-6">${I('userCheck', 18)} Frequência</div>
      <div class="grid">
        <div class="card"><div class="card-head"><div><div class="card-title">Frequência e horas de aula</div><div class="card-sub">Últimos 6 meses</div></div></div>
          <div class="bars">${d.meses.map((m, i) => `<div class="bar"><span class="v">${m.f == null ? '—' : m.f + '%'}</span><div class="b" style="height:${Math.max(4, m.f || 0)}%;animation-delay:${i * .08}s"></div><span class="l">${esc(m.l)} · ${Math.round(m.h)}h</span></div>`).join('')}</div>
        </div>
      </div>

      <div class="sec-t mt-6">${I('calendar', 18)} Agenda da semana</div>
      <div class="semana">${d.semana.map(s => `<div class="sd ${s.k === d.hoje ? 'hoje' : ''} ${s.k < d.hoje ? 'passou' : ''}">
        <div class="sd-h"><b>${esc(DIAS[U().parseD(s.k).getDay()].slice(0, 3))}</b><span>${esc(fmtDateShort(s.k))}</span></div>
        ${s.itens.length ? s.itens.slice(0, 6).map(it => `<a class="sd-i ${it.ev ? 'ev' : ''} ${it.feita ? 'feita' : ''} ${it.prev ? 'prev' : ''}" href="${it.href}" title="${it.prev ? 'Aula prevista pelo horário da turma (ainda não lançada)' : it.feita ? 'Aula realizada' : ''}" style="--c:${it.c}"><small>${esc(it.h || '')}</small>${esc(it.t)}</a>`).join('') + (s.itens.length > 6 ? `<div class="xs muted">+${s.itens.length - 6}</div>` : '') : '<div class="xs muted sd-v">Livre</div>'}
      </div>`).join('')}</div>
    </div>
    <style>
      .painel .sec-t{display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px;margin-bottom:12px}
      .painel .stat .dl{font-size:11px}
      .painel .badge.info{background:var(--primary-soft);color:var(--primary);text-decoration:none}
      .painel .progress.danger span{background:var(--danger)}
      .painel .progress.neutral span{background:linear-gradient(90deg,#94a3b8,#cbd5e1)}
      .painel .atencao .at-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
      .painel .at-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--surface-2);box-shadow:var(--sh-out-sm);color:var(--text);text-decoration:none;border-left:4px solid var(--c,var(--warn));transition:transform .2s}
      .painel .at-item.danger{--c:var(--danger)} .painel .at-item.warn{--c:var(--warn)} .painel .at-item.info{--c:var(--primary)} .painel .at-item.ok{--c:var(--ok)}
      .painel .at-item:hover{transform:translateY(-2px)}
      .painel .at-n{font-size:26px;font-weight:900;color:var(--c);min-width:34px;text-align:center}
      .painel .at-t{flex:1;font-weight:600;font-size:13.5px;line-height:1.25}.painel .at-t small{display:block;color:var(--muted);font-weight:500}
      .painel .atencao.ok .row{gap:10px;color:var(--ok)}
      .painel .fin-n{gap:14px}.painel .fin-v{font-size:22px;font-weight:900;margin-top:4px}.painel .fin-v.ok{color:var(--ok)}.painel .fin-v.danger{color:var(--danger)}
      .painel .fluxo{display:flex;gap:10px;align-items:flex-end;height:120px}
      .painel .fx{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%}
      .painel .fx-b{flex:1;width:100%;display:flex;gap:4px;align-items:flex-end;justify-content:center}
      .painel .fx-b i{width:40%;max-width:18px;border-radius:6px 6px 3px 3px;min-height:2px}
      .painel .fx-b i.e,.painel .lg.e{background:var(--ok)}.painel .fx-b i.s,.painel .lg.s{background:var(--danger)}
      .painel .fx.fut{opacity:.4}.painel .fx span{font-size:11px;font-weight:700;color:var(--muted)}
      .painel .lg{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 4px 0 8px}
      .painel .ocup{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px 22px}
      .painel .oc{color:var(--text);text-decoration:none}
      .painel .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);margin-right:6px;flex:none}
      .painel .semana{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
      .painel .sd{background:var(--surface);border-radius:16px;box-shadow:var(--sh-out-sm);padding:10px;min-height:150px;display:flex;flex-direction:column;gap:6px;min-width:0}
      .painel .sd.hoje{outline:2px solid var(--primary)}.painel .sd.passou{opacity:.7}
      .painel .sd-h{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}.painel .sd-h b{color:var(--text)}
      .painel .sd-i{display:block;font-size:12px;font-weight:600;line-height:1.25;padding:6px 8px;border-radius:9px;color:var(--text);text-decoration:none;background:color-mix(in srgb,var(--c) 14%,transparent);border-left:3px solid var(--c);overflow-wrap:anywhere}
      .painel .sd-i small{display:block;color:var(--muted);font-weight:700}
      .painel .sd-i.ev{background:color-mix(in srgb,var(--c) 26%,transparent)}.painel .sd-i.feita{opacity:.6}.painel .sd-i.prev{background:transparent;border:1px dashed color-mix(in srgb,var(--c) 55%,transparent);border-left:3px solid var(--c)}
      .painel .sd-v{margin:auto 0;text-align:center}
      @media (max-width:900px){.painel .semana{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media print{.topnav,.subbar,.no-print,.bg-orbs{display:none!important}.painel .card{box-shadow:none;border:1px solid #ddd;break-inside:avoid}.painel a{color:inherit}}
    </style>`;

    el.querySelectorAll('[data-periodo] button').forEach(b => b.addEventListener('click', async () => { periodo = b.dataset.v; await ICM.pages.dashboard(el); ICM.ui.countUp(el); }));
    el.querySelector('[data-imprimir]').addEventListener('click', () => window.print());
  };
})();
