/* Motor de relatórios: geração animada + documentos para prestação de contas */
(function () {
  window.ICM = window.ICM || {};
  const I = (n, s) => ICM.icon(n, s);
  const U = () => ICM.util;
  const esc = s => U().esc(s);
  const api = () => ICM.api;

  // ====================== Animação de geração ======================
  async function animate(title, steps, work) {
    const ov = document.createElement('div');
    ov.className = 'gen-overlay';
    ov.innerHTML = `<div class="gen-box" role="status" aria-live="polite">
      <div class="gen-ring"><div class="orbit"></div>
        <svg viewBox="0 0 120 120"><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e4fd8"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-sunken)" stroke-width="10"/>
          <circle data-arc cx="60" cy="60" r="52" fill="none" stroke="url(#gr)" stroke-width="10" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="326.7" style="transition:stroke-dashoffset .5s var(--ease);filter:drop-shadow(0 0 6px rgba(59,130,246,.6))"/></svg>
        <div class="pct" data-pct>0%</div></div>
      <div class="card-title">${esc(title)}</div>
      <div class="small muted mb-4">Gerando documento para prestação de contas…</div>
      <div class="gen-steps">${steps.map((s, i) => `<div class="gen-step" data-i="${i}"><span class="st"></span>${esc(s)}</div>`).join('')}</div>
    </div>`;
    document.body.appendChild(ov);
    const arc = ov.querySelector('[data-arc]'), pct = ov.querySelector('[data-pct]');
    const setP = p => { arc.style.strokeDashoffset = String(326.7 * (1 - p)); pct.textContent = Math.round(p * 100) + '%'; };
    const resultP = work();
    for (let i = 0; i < steps.length; i++) {
      const st = ov.querySelector(`[data-i="${i}"]`);
      st.classList.add('doing');
      await U().sleep(380 + Math.random() * 260);
      st.classList.remove('doing'); st.classList.add('done'); st.querySelector('.st').innerHTML = I('check', 14);
      setP((i + 1) / steps.length);
    }
    let result;
    try { result = await resultP; } catch (e) { ov.remove(); throw e; }
    await U().sleep(250);
    confetti();
    ov.style.transition = 'opacity .35s'; ov.style.opacity = '0';
    setTimeout(() => ov.remove(), 350);
    return result;
  }

  function confetti() {
    const cores = ['#2563eb', '#60a5fa', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cores[i % cores.length];
      c.style.animationDelay = Math.random() * .4 + 's'; c.style.animationDuration = 1.4 + Math.random() * 1.2 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
    }
  }

  // ====================== Visualizador ======================
  async function view(title, html, filename) {
    const user = ICM.auth.user();
    const em = new Date();
    const codigo = (await U().sha256(html + em.toISOString() + user.id)).slice(0, 24).toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1);
    await api().audit('gerar_relatorio', 'relatorios', codigo, title);
    const full = `<div class="doc">${html}
      <div class="doc-foot"><div>Gerado por ${esc(user.nome)} em ${esc(em.toLocaleString('pt-BR'))}<br>${esc(ICM.C.ORG.razao)} · CNPJ ${esc(ICM.C.ORG.cnpj)}</div>
      <div style="text-align:right">Código de autenticidade<br><span class="hash">${esc(codigo)}</span></div></div></div>`;
    const v = document.createElement('div');
    v.className = 'report-viewer';
    v.innerHTML = `<div class="report-toolbar">
      <button class="btn btn-sm" data-x aria-label="Voltar">${I("arrowLeft", 16)} Voltar</button>
      <div class="title truncate">${esc(title)}</div>
      <button class="btn btn-sm" data-dl>${I('download', 16)} Baixar HTML</button>
      <button class="btn btn-sm btn-primary" data-pr>${I('printer', 16)} Imprimir / Salvar PDF</button><button class="btn btn-sm btn-icon" data-x2 aria-label="Fechar" title="Fechar (Esc)">${I("x", 18)}</button></div>
      <div class="report-scroll">${full}</div>`;
    document.body.appendChild(v);
    document.body.style.overflow = 'hidden';
    v.querySelectorAll('.doc-section').forEach((s, i) => { s.style.animationDelay = (0.15 + i * 0.07) + 's'; });
    const close = () => { v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    v.querySelector('[data-x]').addEventListener('click', close);
    v.querySelector('[data-x2]').addEventListener('click', close);
    v.querySelector('[data-pr]').addEventListener('click', () => window.print());
    v.querySelector('[data-dl]').addEventListener('click', async () => {
      const css = await fetch('css/report.css').then(r => r.text()).catch(() => '');
      const blob = new Blob([`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Inter,Segoe UI,Arial,sans-serif;background:#eef2f8;margin:0;padding:24px}${css}</style></head><body>${full}</body></html>`], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (filename || 'relatorio') + '.html'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  // ====================== Blocos de documento ======================
  const sec = (inner) => `<div class="doc-section">${inner}</div>`;
  function head(titulo, sub) {
    return sec(`<div class="doc-head"><div class="logo">${ICM.logo(56)}</div><div style="flex:1"><div class="org">${esc(ICM.C.ORG.razao)} · CNPJ ${esc(ICM.C.ORG.cnpj)}</div><h1>${esc(titulo)}</h1><div style="color:#3a4669;font-weight:600">${esc(sub || '')}</div></div></div>`);
  }
  const meta = pairs => sec(`<div class="doc-meta">${pairs.filter(p => p[1] !== undefined).map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v || '—')}</div>`).join('')}</div>`);
  const kpis = list => sec(`<div class="kpis">${list.map(([n, t]) => `<div class="kpi"><div class="n">${esc(n)}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>`);
  const table = (cols, rows) => `<table><thead><tr>${cols.map(c => `<th class="${c.c ? 'c' : ''}">${esc(c.t || c)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map((v, i) => `<td class="${cols[i].c ? 'c' : ''} ${(v && v.cls) || ''}">${v && v.html !== undefined ? v.html : esc(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" style="text-align:center;color:#5b6788">Sem registros no período</td></tr>`}</tbody></table>`;
  const photos = (list, max = 9) => list.length ? `<div class="photos">${list.slice(0, max).map(f => `<figure><img src="${esc(f.src)}" alt=""><figcaption>${esc(f.legenda || '')}</figcaption></figure>`).join('')}</div>${list.length > max ? `<p style="font-size:10px;color:#5b6788">+ ${list.length - max} foto(s) arquivada(s) no sistema.</p>` : ''}` : '<p style="color:#5b6788">Sem registros fotográficos no período.</p>';
  const barChart = data => { const mx = Math.max(1, ...data.map(d => d.v)); return `<div class="bar-chart">${data.map(d => `<div class="bc"><b>${esc(d.lbl ?? U().num(d.v))}</b><i style="height:${Math.max(2, d.v / mx * 85)}%"></i><small>${esc(d.l)}</small></div>`).join('')}</div>`; };
  const tagNivel = (n, F) => n === 'danger' ? { html: `<span class="tag danger">${F} faltas — desligamento</span>` } : n === 'warn' ? { html: `<span class="tag warn">${F} faltas — alerta</span>` } : { html: '<span class="tag ok">Regular</span>' };
  const signs = (a, b) => sec(`<div class="signs"><div>${esc(a)}</div><div>${esc(b)}</div></div>`);
  const declaracao = () => sec(`<p style="margin-top:18px;font-size:11px;color:#3a4669"><b>Declaração.</b> Declaramos, para fins de prestação de contas, que as informações deste relatório correspondem aos registros de aulas, frequência, fotos e atividades lançados no ICM Sistema, cujos históricos são preservados e auditáveis. Dados pessoais sensíveis foram omitidos conforme a LGPD (Lei 13.709/2018).</p>`);

  const ymRange = (de, ate) => { const out = []; let d = U().parseD(de.slice(0, 7) + '-01'); const end = U().parseD(ate); while (d <= end) { out.push(U().iso(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); } return out; };
  const presStats = aulas => { let P = 0, F = 0, J = 0; aulas.forEach(a => Object.values(a.presencas || {}).forEach(v => { if (v === 'P') P++; else if (v === 'F') F++; else if (v === 'J') J++; })); const T = P + F + J; return { P, F, J, T, freq: T ? Math.round((P + J) / T * 100) : 0 }; };

  async function ctxTurma(turmaId) {
    const t = await api().turmas.get(turmaId);
    const p = await api().projetos.get(t.projeto_id);
    const users = await api().usuarios.list();
    return { t, p, prof: users.find(u => u.id === t.professor_id) || {}, coord: users.find(u => u.id === p.coordenador_id) || {}, users };
  }

  // ====================== Relatórios ======================
  const B = {};

  B.turma_mensal = async ({ turma_id, ym }) => {
    const { t, p, prof, coord, users } = await ctxTurma(turma_id);
    const aulas = (await api().aulas.list(turma_id, ym)).filter(a => a.status === 'realizada').sort((a, b) => a.data.localeCompare(b.data));
    const { linhas } = await api().assiduidade.turma(turma_id, ym);
    const mats = await api().turmas.alunos(turma_id);
    const nome = id => (mats.find(m => m.aluno_id === id) || { aluno: { nome: '?' } }).aluno.nome;
    const horas = aulas.reduce((s, a) => s + a.horas, 0);
    const ps = presStats(aulas);
    const ativos = mats.filter(m => m.status === 'ativo').length;
    const fotos = aulas.flatMap(a => (a.fotos || []).map(f => ({ ...f, legenda: `${U().fmtDate(a.data)} — ${f.legenda || ''}` })));
    let html = head('Relatório Mensal de Atividades', `${t.nome} — ${U().fmtMonth(ym)}`);
    html += meta([['Projeto', p.nome], ['Área', ICM.C.AREAS[p.area].nome], ['Financiador / instrumento', p.financiador], ['Nº termo / processo', p.numero_termo], ['Professor(a) responsável', prof.nome], ['Dias e horário', `${ICM.pages._diasTxt(t.dias)} · ${t.inicio}–${t.fim}`], ['Local', t.local], ['Período de referência', U().fmtMonth(ym)]]);
    html += kpis([[aulas.length, 'Aulas realizadas'], [U().num(horas, 1) + 'h', 'Horas de aula no mês'], [ativos, 'Alunos ativos'], [ps.freq + '%', 'Frequência média']]);
    html += sec(`<h2>1. Frequência consolidada do mês</h2>${table([{ t: 'Aluno' }, { t: 'Matrícula' }, { t: 'Pres.', c: 1 }, { t: 'Faltas', c: 1 }, { t: 'Just.', c: 1 }, { t: '%', c: 1 }, { t: 'Situação' }], linhas.map(l => [l.nome, l.matricula, { html: `<span class="P">${l.P}</span>` }, { html: `<span class="F">${l.F}</span>` }, { html: `<span class="J">${l.J}</span>` }, l.freq ?? '—', tagNivel(l.nivel, l.F)]))}`);
    html += sec(`<h2>2. Registro das aulas</h2>`);
    aulas.forEach((a, i) => {
      const pl = a.plano || {}, rl = a.relatorio || {};
      const pres = Object.entries(a.presencas || {}).map(([id, v]) => ({ n: nome(id), v })).sort((x, y) => x.n.localeCompare(y.n));
      const pf = pres.filter(x => x.v === 'P').length;
      html += sec(`<div class="lesson"><div class="lh"><span>Aula ${i + 1} — ${esc(U().fmtDate(a.data))} (${esc(U().DIAS[U().parseD(a.data).getDay()])})</span><span>${esc(a.inicio)}–${esc(a.fim)} · ${U().num(a.horas, 1)}h</span></div>
        <div style="font-size:11px;color:#5b6788">Professor(a): ${esc((users.find(u => u.id === a.professor_id) || prof).nome)}</div>
        <h3>Plano de aula</h3><p><b>Tema:</b> ${esc(pl.tema || '—')}<br><b>Objetivos:</b> ${esc(pl.objetivos || '—')}<br><b>Desenvolvimento:</b> ${esc(pl.conteudo || '—')}<br><b>Recursos:</b> ${esc(pl.recursos || '—')}</p>
        <h3>Relatório da aula</h3><p>${esc(rl.texto || 'Não preenchido.')}</p>${rl.ocorrencias ? `<p><b>Ocorrências:</b> ${esc(rl.ocorrencias)}</p>` : ''}
        <h3>Chamada — ${pf} presentes de ${pres.length}</h3>
        <p style="font-size:11px;columns:2">${pres.map(x => `${esc(x.n)} — <span class="${x.v}">${{ P: 'Presente', F: 'Falta', J: 'Justificada' }[x.v]}</span>`).join('<br>')}</p>
        ${(a.fotos || []).length ? photos(a.fotos, 3) : ''}</div>`);
    });
    if (!aulas.length) html += sec('<p>Nenhuma aula realizada no período.</p>');
    html += sec(`<h2>3. Registro fotográfico do mês</h2>${photos(fotos, 12)}`);
    html += declaracao() + signs(`${prof.nome || 'Professor(a)'} — Professor(a)`, `${coord.nome || 'Coordenação'} — Coordenação`);
    return { title: `Relatório mensal — ${t.nome} — ${U().fmtMonth(ym)}`, html, file: `relatorio-mensal-${t.id}-${ym}` };
  };

  B.turma_anual = async ({ turma_id, ano }) => {
    const { t, p, prof, coord } = await ctxTurma(turma_id);
    const todas = (await api().aulas.list(turma_id)).filter(a => a.status === 'realizada' && a.data.startsWith(ano)).sort((a, b) => a.data.localeCompare(b.data));
    const { linhas } = await api().assiduidade.turma(turma_id, ano);
    const mats = await api().turmas.alunos(turma_id);
    const ps = presStats(todas); const horas = todas.reduce((s, a) => s + a.horas, 0);
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
    const porMes = meses.map(m => { const l = todas.filter(a => a.data.startsWith(m)); return { m, aulas: l.length, horas: l.reduce((s, a) => s + a.horas, 0), freq: presStats(l).freq }; });
    const eventos = (await api().eventos.list()).filter(e => e.data.startsWith(ano) && (e.alunos || []).some(id => mats.some(m => m.aluno_id === id)));
    const entradas = mats.filter(m => m.entrada.startsWith(ano)), saidas = mats.filter(m => m.saida && m.saida.startsWith(ano));
    let html = head('Relatório Anual da Turma', `${t.nome} — ${ano}`);
    html += meta([['Projeto', p.nome], ['Financiador', p.financiador], ['Professor(a)', prof.nome], ['Modalidade', t.modalidade], ['Dias e horário', `${ICM.pages._diasTxt(t.dias)} · ${t.inicio}–${t.fim}`], ['Vagas', t.vagas]]);
    html += kpis([[todas.length, 'Aulas no ano'], [U().num(horas) + 'h', 'Horas de aula'], [new Set(mats.map(m => m.aluno_id)).size, 'Alunos atendidos'], [ps.freq + '%', 'Frequência média']]);
    html += sec(`<h2>1. Horas de aula por mês</h2>${barChart(porMes.map(x => ({ l: U().MESES_C[+x.m.slice(5) - 1], v: x.horas, lbl: x.horas ? U().num(x.horas) + 'h' : '' })))}
      ${table([{ t: 'Mês' }, { t: 'Aulas', c: 1 }, { t: 'Horas', c: 1 }, { t: 'Frequência', c: 1 }], porMes.filter(x => x.aulas).map(x => [U().fmtMonth(x.m), x.aulas, U().num(x.horas, 1), x.freq + '%']))}`);
    html += sec(`<h2>2. Frequência anual por aluno</h2>${table([{ t: 'Aluno' }, { t: 'Pres.', c: 1 }, { t: 'Faltas', c: 1 }, { t: 'Just.', c: 1 }, { t: '%', c: 1 }, { t: 'Situação na turma' }], linhas.map(l => [l.nome, l.P, l.F, l.J, l.freq ?? '—', l.status_turma === 'ativo' ? { html: '<span class="tag ok">Ativo</span>' } : { html: '<span class="tag warn">Saiu</span>' }]))}`);
    html += sec(`<h2>3. Movimentação de alunos</h2><p>Entradas no ano: <b>${entradas.length}</b> · Saídas no ano: <b>${saidas.length}</b></p>${saidas.length ? table([{ t: 'Aluno' }, { t: 'Saída' }, { t: 'Motivo' }], saidas.map(m => [m.aluno.nome, U().fmtDate(m.saida), m.motivo_saida])) : ''}`);
    html += sec(`<h2>4. Conteúdos trabalhados</h2><p>${[...new Set(todas.map(a => a.plano && a.plano.tema).filter(Boolean))].map(esc).join(' · ') || '—'}</p>`);
    html += sec(`<h2>5. Eventos, apresentações e campeonatos</h2>${table([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Evento' }, { t: 'Resultado' }], eventos.map(e => [U().fmtDate(e.data), ICM.C.TIPOS_EVENTO[e.tipo].nome, e.titulo, e.resultado || '']))}`);
    html += sec(`<h2>6. Registro fotográfico</h2>${photos(todas.flatMap(a => (a.fotos || []).map(f => ({ ...f, legenda: `${U().fmtDate(a.data)} — ${f.legenda || ''}` }))), 12)}`);
    html += declaracao() + signs(`${prof.nome} — Professor(a)`, `${coord.nome || 'Coordenação'} — Coordenação`);
    return { title: `Relatório anual — ${t.nome} — ${ano}`, html, file: `relatorio-anual-${t.id}-${ano}` };
  };

  async function perfilBeneficiarios(alunoIds) {
    const all = (await api().raw('alunos')).filter(a => alunoIds.has(a.id));
    const cnt = (f) => { const o = {}; all.forEach(a => { const k = f(a) || 'Não informado'; o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    const faixa = a => { const i = U().age(a.nascimento); return i == null ? null : i <= 10 ? '6 a 10 anos' : i <= 14 ? '11 a 14 anos' : i <= 17 ? '15 a 17 anos' : '18 anos ou mais'; };
    const publica = all.filter(a => a.escolaridade && ['Municipal', 'Estadual', 'Federal'].includes(a.escolaridade.rede)).length;
    const meioSM = all.filter(a => a.financeiro && a.financeiro.renda_per_capita != null && a.financeiro.renda_per_capita <= 706).length;
    const benef = all.filter(a => a.social && (a.social.beneficios || []).length).length;
    const t = (titulo, rows) => `<div><h3>${esc(titulo)}</h3>${table([{ t: 'Categoria' }, { t: 'Alunos', c: 1 }, { t: '%', c: 1 }], rows.map(([k, v]) => [k, v, U().pct(v, all.length) + '%']))}</div>`;
    return { total: all.length, html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${t('Faixa etária', cnt(faixa))}${t('Sexo', cnt(a => ({ F: 'Feminino', M: 'Masculino', O: 'Outro' })[a.sexo]))}${t('Cor / raça', cnt(a => a.cor_raca))}${t('Bairro de residência', cnt(a => a.endereco && a.endereco.bairro))}</div>
      <p><b>${U().pct(publica, all.length)}%</b> estudam em escola pública · <b>${U().pct(meioSM, all.length)}%</b> com renda per capita até ½ salário mínimo · <b>${U().pct(benef, all.length)}%</b> de famílias com benefício social.</p>` };
  }

  B.projeto = async ({ projeto_id, de, ate, titulo }) => {
    const p = await api().projetos.get(projeto_id);
    de = de || p.inicio; ate = ate || p.fim;
    const users = await api().usuarios.list();
    const coord = users.find(u => u.id === p.coordenador_id) || {};
    const turmas = await api().turmas.list(projeto_id);
    const s = await api().projetos.stats(projeto_id, { de, ate });
    const linhasT = [], alunoIds = new Set(), fotos = [];
    let mats = [];
    for (const t of turmas) {
      const aulas = (await api().aulas.list(t.id)).filter(a => a.status === 'realizada' && a.data >= de && a.data <= ate);
      const m = await api().turmas.alunos(t.id); mats = mats.concat(m.map(x => ({ ...x, turma: t.nome })));
      m.forEach(x => alunoIds.add(x.aluno_id));
      const ps = presStats(aulas);
      linhasT.push([t.nome, (users.find(u => u.id === t.professor_id) || {}).nome, m.filter(x => x.status === 'ativo').length, aulas.length, U().num(aulas.reduce((q, a) => q + a.horas, 0), 1), ps.freq + '%']);
      aulas.forEach(a => (a.fotos || []).forEach(f => fotos.push({ ...f, legenda: `${t.modalidade} · ${U().fmtDate(a.data)}` })));
    }
    const allAulas = []; for (const t of turmas) (await api().aulas.list(t.id)).filter(a => a.status === 'realizada' && a.data >= de && a.data <= ate).forEach(a => allAulas.push(a));
    const meses = ymRange(de, ate < U().today() ? ate : U().today());
    const eventos = (await api().eventos.list()).filter(e => e.projeto_id === projeto_id && e.data >= de && e.data <= ate).sort((a, b) => a.data.localeCompare(b.data));
    const perfil = await perfilBeneficiarios(alunoIds);
    const saidas = mats.filter(m => m.saida && m.saida >= de && m.saida <= ate);
    let html = head(titulo || 'Relatório de Execução do Projeto', `${p.nome} — ${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
    html += meta([['Área', ICM.C.AREAS[p.area].nome], ['Situação', ICM.C.STATUS_PROJETO[p.status].nome], ['Fonte de recurso', ICM.C.FONTES[p.fonte]], ['Financiador / instrumento', p.financiador], ['Nº termo / processo', p.numero_termo], ['Valor aprovado', p.valor ? U().money(p.valor) : '—'], ['Vigência', `${U().fmtDate(p.inicio)} a ${U().fmtDate(p.fim)}`], ['Coordenação', coord.nome], ['Local de execução', p.local], ['Público-alvo', p.publico_alvo]]);
    html += kpis([[s.atendidos, 'Alunos atendidos'], [s.aulas, 'Aulas realizadas'], [U().num(s.horas) + 'h', 'Horas de atividade'], [s.freq + '%', 'Frequência média']]);
    html += sec(`<h2>1. Apresentação do projeto</h2><h3>Justificativa</h3><p>${esc(p.justificativa)}</p><h3>Objetivo geral</h3><p>${esc(p.objetivo_geral)}</p><h3>Objetivos específicos</h3><ul>${(p.objetivos_especificos || []).map(o => `<li>${esc(o)}</li>`).join('')}</ul><h3>Metodologia</h3><p>${esc(p.metodologia)}</p>`);
    html += sec(`<h2>2. Metas e resultados alcançados</h2>${table([{ t: 'Meta' }, { t: 'Indicador' }, { t: 'Previsto', c: 1 }, { t: 'Realizado', c: 1 }, { t: 'Execução' }], (p.metas || []).map(m => { const at = ICM.pages._metaAtual(m, s); const pc = m.alvo ? Math.round(at / m.alvo * 100) : 0; return [m.descricao, m.indicador, `${U().num(m.alvo)} ${m.unidade || ''}`, `${U().num(at)} ${m.unidade || ''}`, { html: `<div class="meter"><span style="width:${Math.min(100, pc)}%"></span></div><span style="font-size:10px">${pc}%</span>` }]; }))}`);
    html += sec(`<h2>3. Turmas e atividades</h2>${table([{ t: 'Turma' }, { t: 'Professor(a)' }, { t: 'Alunos ativos', c: 1 }, { t: 'Aulas', c: 1 }, { t: 'Horas', c: 1 }, { t: 'Frequência', c: 1 }], linhasT)}`);
    html += sec(`<h2>4. Horas de atividade por mês</h2>${barChart(meses.map(m => { const h = allAulas.filter(a => a.data.startsWith(m)).reduce((q, a) => q + a.horas, 0); return { l: U().MESES_C[+m.slice(5) - 1] + '/' + m.slice(2, 4), v: h, lbl: h ? U().num(h) + 'h' : '' }; }))}`);
    html += sec(`<h2>5. Perfil dos beneficiários (${perfil.total})</h2>${perfil.html}`);
    html += sec(`<h2>6. Movimentação</h2><p>Desligamentos/saídas no período: <b>${saidas.length}</b>.</p>${saidas.length ? table([{ t: 'Aluno' }, { t: 'Turma' }, { t: 'Data' }, { t: 'Motivo' }], saidas.map(m => [m.aluno.nome, m.turma, U().fmtDate(m.saida), m.motivo_saida])) : ''}`);
    html += sec(`<h2>7. Eventos, apresentações e participações</h2>${table([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Evento' }, { t: 'Local' }, { t: 'Alunos', c: 1 }, { t: 'Público', c: 1 }, { t: 'Resultado' }], eventos.map(e => [U().fmtDate(e.data), ICM.C.TIPOS_EVENTO[e.tipo].nome, e.titulo, e.local, (e.alunos || []).length, e.publico || '—', e.resultado || '']))}`);
    html += sec(`<h2>8. Contrapartidas</h2><p>${esc(p.contrapartidas || '—')}</p>`);
    const bens = (await api().patrimonio.list()).filter(i => i.projeto_id === projeto_id);
    if (bens.length) html += sec(`<h3>Bens adquiridos com recursos do projeto</h3>${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Qtd.', c: 1 }, { t: 'Local' }, { t: 'Estado' }, { t: 'Em uso por alunos', c: 1 }], bens.map(i => [i.tombo, i.nome, i.quantidade, i.local, ICM.C.ESTADOS_PAT[i.estado] || '', i.emprestados]))}`);
    html += sec(`<h2>9. Registro fotográfico</h2>${photos(fotos.concat(eventos.flatMap(e => e.fotos || [])), 15)}`);
    html += declaracao() + signs(`${coord.nome || 'Coordenação'} — Coordenação do projeto`, 'Presidência / Direção');
    return { title: `${titulo || 'Relatório do projeto'} — ${p.nome}`, html, file: `relatorio-projeto-${p.id}-${de}-${ate}` };
  };

  B.projeto_anual = async ({ projeto_id, ano }) => B.projeto({ projeto_id, de: `${ano}-01-01`, ate: `${ano}-12-31`, titulo: `Relatório Anual do Projeto ${ano}` });

  B.assiduidade = async ({ turma_id, ym }) => {
    const turmas = turma_id ? [await api().turmas.get(turma_id)] : await api().turmas.list();
    const cfg = await api().assiduidade.cfg();
    let html = head('Relatório de Assiduidade', `${turma_id ? turmas[0].nome + ' — ' : 'Todas as turmas — '}${U().fmtMonth(ym)}`);
    html += sec(`<div class="doc-meta"><div><b>Regra aplicada</b>${cfg.alerta} faltas no mês = alerta · ${cfg.desligamento} faltas = avaliação de desligamento</div><div><b>Observação</b>Faltas justificadas (atestado, comunicado prévio) não entram na contagem.</div></div>`);
    let alertas = 0, criticos = 0, corpo = '', lista = [];
    for (const t of turmas) {
      const { linhas, aulas } = await api().assiduidade.turma(t.id, ym);
      const at = linhas.filter(l => l.status_turma === 'ativo');
      alertas += at.filter(l => l.nivel === 'warn').length; criticos += at.filter(l => l.nivel === 'danger').length;
      at.filter(l => l.nivel !== 'ok').forEach(l => lista.push([l.nome, t.nome, l.F, tagNivel(l.nivel, l.F)]));
      corpo += sec(`<h2>${esc(t.nome)} — ${aulas.length} aula(s) no mês</h2>${table([{ t: 'Aluno' }, { t: 'Pres.', c: 1 }, { t: 'Faltas', c: 1 }, { t: 'Just.', c: 1 }, { t: '%', c: 1 }, { t: 'Situação' }, { t: 'Encaminhamento' }], at.map(l => [l.nome, l.P, { html: `<span class="F">${l.F}</span>` }, l.J, l.freq ?? '—', tagNivel(l.nivel, l.F), l.nivel === 'danger' ? 'Reunião com responsável; avaliar desligamento e liberar vaga' : l.nivel === 'warn' ? 'Contato com a família' : '—']))}`);
    }
    html += kpis([[alertas, 'Em alerta'], [criticos, 'Para desligamento'], [turmas.length, 'Turmas analisadas'], [U().fmtMonth(ym).split(' ')[0], 'Mês']]);
    html += sec(`<h2>Resumo — alunos que exigem ação</h2>${table([{ t: 'Aluno' }, { t: 'Turma' }, { t: 'Faltas', c: 1 }, { t: 'Situação' }], lista.sort((a, b) => b[2] - a[2]))}`);
    html += corpo + signs('Coordenação pedagógica', 'Serviço social');
    return { title: `Assiduidade — ${U().fmtMonth(ym)}`, html, file: `assiduidade-${ym}` };
  };

  B.osc_anual = async ({ ano }) => {
    const projetos = (await api().projetos.list()).filter(p => p.inicio <= `${ano}-12-31` && p.fim >= `${ano}-01-01`);
    const turmas = await api().turmas.list();
    const users = await api().usuarios.list();
    const aulas = (await api().raw('aulas')).filter(a => a.status === 'realizada' && a.data.startsWith(ano));
    const mats = await api().raw('matriculas');
    const eventos = (await api().eventos.list()).filter(e => e.data.startsWith(ano)).sort((a, b) => a.data.localeCompare(b.data));
    const alunoIds = new Set(mats.filter(m => m.entrada <= `${ano}-12-31` && (!m.saida || m.saida >= `${ano}-01-01`)).map(m => m.aluno_id));
    const alunos = (await api().raw('alunos')).filter(a => alunoIds.has(a.id));
    const familias = new Set(alunos.map(a => (a.responsavel && a.responsavel.nome) + '|' + (a.endereco && a.endereco.logradouro))).size;
    const horas = aulas.reduce((s, a) => s + a.horas, 0); const ps = presStats(aulas);
    const publico = eventos.reduce((s, e) => s + (Number(e.publico) || 0), 0);
    const profs = new Set(turmas.map(t => t.professor_id)).size;
    const perfil = await perfilBeneficiarios(alunoIds);
    const porArea = Object.entries(ICM.C.AREAS).map(([k, a]) => { const ps2 = projetos.filter(p => p.area === k); const tids = turmas.filter(t => ps2.some(p => p.id === t.projeto_id)).map(t => t.id); const al = new Set(mats.filter(m => tids.includes(m.turma_id)).map(m => m.aluno_id)); const h = aulas.filter(x => tids.includes(x.turma_id)).reduce((s, x) => s + x.horas, 0); return [a.nome, ps2.length, al.size, U().num(h)]; });
    const fontes = {}; projetos.forEach(p => { fontes[p.fonte] = (fontes[p.fonte] || 0) + (Number(p.valor) || 0); });
    const totalRec = Object.values(fontes).reduce((s, v) => s + v, 0);
    const publicoRec = Object.entries(fontes).filter(([k]) => !['privada', 'propria'].includes(k)).reduce((s, [, v]) => s + v, 0);
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
    let html = head(`Relatório Anual de Atividades ${ano}`, `${ICM.C.ORG.nome} — Cultura, Esporte, Meio Ambiente, Educação e Saúde`);
    html += sec(`<h2>Apresentação</h2><p>O ${esc(ICM.C.ORG.nome)} apresenta seu Relatório Anual de Atividades de ${esc(ano)}, reunindo os resultados dos projetos executados nas áreas de cultura, esporte, meio ambiente, educação e saúde. Os números abaixo foram consolidados automaticamente a partir dos registros diários de aulas, frequência, eventos e fotos lançados pela equipe no ICM Sistema, garantindo rastreabilidade e transparência no uso dos recursos públicos e privados.</p>`);
    html += sec(`<h2>Nosso impacto em ${esc(ano)}</h2>`) + kpis([[alunoIds.size, 'Crianças e jovens atendidos'], [familias, 'Famílias alcançadas'], [U().num(horas) + 'h', 'Horas de atividades'], [aulas.length, 'Aulas realizadas']]) + kpis([[projetos.length, 'Projetos'], [turmas.length, 'Turmas'], [eventos.length, 'Eventos e ações'], [U().num(publico), 'Público em eventos']]) + kpis([[ps.freq + '%', 'Frequência média'], [profs, 'Educadores'], [U().money(totalRec).replace(',00', ''), 'Recursos captados'], [U().pct(publicoRec, totalRec) + '%', 'Recursos públicos']]);
    html += sec(`<h2>1. Atuação por área</h2>${table([{ t: 'Área' }, { t: 'Projetos', c: 1 }, { t: 'Alunos', c: 1 }, { t: 'Horas', c: 1 }], porArea)}`);
    html += sec(`<h2>2. Horas de atividades por mês</h2>${barChart(meses.map(m => { const h = aulas.filter(a => a.data.startsWith(m)).reduce((s, a) => s + a.horas, 0); return { l: U().MESES_C[+m.slice(5) - 1], v: h, lbl: h ? U().num(h) + 'h' : '' }; }))}`);
    html += sec(`<h2>3. Projetos executados</h2>`);
    for (const p of projetos) {
      const s = await api().projetos.stats(p.id, { de: `${ano}-01-01`, ate: `${ano}-12-31` });
      html += sec(`<div class="lesson" style="border-left-color:${esc(p.cor)}"><div class="lh"><span>${esc(p.nome)}</span><span>${esc(ICM.C.AREAS[p.area].nome)}</span></div>
        <p style="font-size:11px;color:#5b6788">${esc(p.financiador)} · ${esc(ICM.C.FONTES[p.fonte])}${p.valor ? ' · ' + esc(U().money(p.valor)) : ''}</p>
        <p>${esc(p.objetivo_geral)}</p><p><b>${s.atendidos}</b> alunos atendidos · <b>${s.turmas}</b> turmas · <b>${s.aulas}</b> aulas · <b>${U().num(s.horas)}h</b> · frequência <b>${s.freq}%</b> · <b>${s.eventos}</b> eventos</p></div>`);
    }
    html += sec(`<h2>4. Perfil do público atendido</h2>${perfil.html}`);
    html += sec(`<h2>5. Eventos, apresentações, campeonatos e conquistas</h2>${table([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Evento' }, { t: 'Alunos', c: 1 }, { t: 'Público', c: 1 }, { t: 'Resultado' }], eventos.map(e => [U().fmtDate(e.data), ICM.C.TIPOS_EVENTO[e.tipo].nome, e.titulo, (e.alunos || []).length, e.publico || '—', e.resultado || (e.data > U().today() ? 'Programado' : '')]))}`);
    html += sec(`<h2>6. Transparência — origem dos recursos</h2>${table([{ t: 'Fonte' }, { t: 'Valor', c: 1 }, { t: '%', c: 1 }], Object.entries(fontes).map(([k, v]) => [ICM.C.FONTES[k], U().money(v), U().pct(v, totalRec) + '%']))}<p style="font-size:11px">Valores aprovados nos instrumentos vigentes em ${esc(ano)}. A execução financeira detalhada consta nas prestações de contas de cada instrumento.</p>`);
    html += sec(`<h2>7. Equipe pedagógica</h2>${table([{ t: 'Nome' }, { t: 'Função' }], users.filter(u => u.ativo && u.papel !== 'admin').map(u => [u.nome, u.cargo || ICM.C.PAPEIS[u.papel].nome]))}`);
    // Comunidade: satisfação, voluntariado, doações, associados, reuniões, certificados e demanda
    const pesq = await api().pesquisas.indicadoresAno(ano);
    const vols = await api().voluntarios.list();
    const hv = vols.reduce((s, v) => s + (v.horas || []).filter(x => x.data.startsWith(ano)).reduce((q, x) => q + Number(x.horas), 0), 0);
    const reus = (await api().reunioes.list()).filter(r => r.data.startsWith(ano) && r.data <= U().today());
    const partic = reus.length ? Math.round(reus.reduce((s, r) => { const v = Object.values(r.presencas || {}); return s + (v.length ? v.filter(Boolean).length / v.length : 0); }, 0) / reus.length * 100) : 0;
    const certs = (await api().certificados.list()).filter(c => c.data_emissao.startsWith(ano) && c.status === 'valido');
    let doacoesAno = [], assocAtivos = 0, espera = [];
    try { doacoesAno = await api().doadores.doacoes({ de: `${ano}-01-01`, ate: `${ano}-12-31` }); } catch (e) { /* sem permissão */ }
    try { assocAtivos = (await api().associados.list()).filter(a => a.status === 'ativo').length; } catch (e) { /* sem permissão */ }
    try { espera = await api().espera.list({ status: 'aguardando' }); } catch (e) { /* sem permissão */ }
    html += sec(`<h2>8. Comunidade, participação e satisfação</h2>`) + kpis([[pesq.find(p => p.res.nps != null) ? pesq.find(p => p.res.nps != null).res.nps : '—', 'NPS das famílias'], [reus.length, `Reuniões de pais (${partic}% presença)`], [U().num(hv) + 'h', `Horas voluntárias (${vols.filter(v => v.status === 'ativo').length} voluntários)`], [certs.length, 'Certificados emitidos']])
      + kpis([[U().money(doacoesAno.reduce((s, d) => s + Number(d.valor), 0)).replace(',00', ''), 'Doações privadas'], [new Set(doacoesAno.map(d => d.doador_id)).size, 'Doadores'], [assocAtivos, 'Famílias associadas'], [espera.length, 'Crianças na lista de espera']]);
    if (pesq.length) html += sec(table([{ t: 'Pesquisa' }, { t: 'Respostas', c: 1 }, { t: 'NPS', c: 1 }, { t: 'Satisfação (1-5)', c: 1 }], pesq.map(p => [p.titulo, p.res.n, p.res.nps ?? '—', p.res.satisfacao != null ? U().num(p.res.satisfacao, 1) : '—'])));
    if (espera.length) html += sec(`<p style="font-size:11px">A lista de espera com ${espera.length} inscritos evidencia a demanda reprimida no território e a necessidade de ampliação de vagas.</p>`);
    html += sec(`<h2>9. Galeria</h2>${photos(aulas.flatMap(a => a.fotos || []).concat(eventos.flatMap(e => e.fotos || [])), 12)}`);
    html += declaracao() + signs('Presidência', 'Direção executiva');
    return { title: `Relatório anual de atividades ${ano}`, html, file: `relatorio-anual-atividades-${ano}` };
  };

  B.evento = async ({ evento_id }) => {
    const e = await api().eventos.get(evento_id); const t = ICM.C.TIPOS_EVENTO[e.tipo];
    const p = e.projeto_id ? await api().projetos.get(e.projeto_id) : null;
    const alunos = (await api().alunos.list({ status: '' })).filter(a => (e.alunos || []).includes(a.id));
    let html = head(`Relatório de ${t.nome}`, e.titulo);
    html += meta([['Data', U().fmtDateLong(e.data)], ['Horário', e.horario], ['Local', e.local], ['Projeto', p ? p.nome : 'Ação institucional'], ['Público estimado', e.publico ? U().num(e.publico) : '—'], ['Resultado', e.resultado]]);
    html += sec(`<h2>Descrição</h2><p>${esc(e.descricao || '—')}</p>`);
    html += sec(`<h2>Alunos participantes (${alunos.length})</h2>${table([{ t: '#', c: 1 }, { t: 'Aluno' }, { t: 'Matrícula' }], alunos.map((a, i) => [i + 1, a.nome, a.matricula]))}`);
    html += sec(`<h2>Registro fotográfico</h2>${photos(e.fotos || [], 12)}`);
    html += signs('Coordenação', 'Direção');
    return { title: `${t.nome} — ${e.titulo}`, html, file: `evento-${e.id}` };
  };

  B.ficha_aluno = async ({ aluno_id }) => {
    const a = await api().alunos.get(aluno_id);
    const turmas = await api().alunos.turmas(aluno_id);
    const freq = await api().alunos.frequencia(aluno_id);
    const ocs = await api().ocorrencias.list(aluno_id);
    const r = a.responsavel || {}, en = a.endereco || {}, sa = a.saude || {}, es = a.escolaridade || {}, so = a.social, fi = a.financeiro;
    let html = head('Ficha do Aluno', `${a.nome} — ${a.matricula}`);
    html += meta([['Nascimento', `${U().fmtDate(a.nascimento)} (${U().age(a.nascimento)} anos)`], ['Situação', ICM.C.STATUS_ALUNO[a.status].nome], ['CPF', a.cpf], ['NIS', a.nis], ['Responsável', `${r.nome || ''} (${r.parentesco || ''})`], ['Telefone', r.telefone], ['Endereço', [en.logradouro, en.numero, en.bairro, en.cidade].filter(Boolean).join(', ')], ['Escola', `${es.escola || ''} ${es.serie ? '· ' + es.serie : ''}`]]);
    html += sec(`<h2>Saúde</h2><p><b>Alergias:</b> ${esc(sa.alergias || 'Nenhuma')} · <b>Medicamentos:</b> ${esc(sa.medicamentos || 'Nenhum')} · <b>Condições:</b> ${esc(sa.condicoes || 'Nenhuma')}${sa.tipo_sanguineo ? ` · <b>Tipo sanguíneo:</b> ${esc(sa.tipo_sanguineo)}` : ''}</p>`);
    if (so && fi) html += sec(`<h2>Social e financeiro</h2><p>${esc(so.pessoas_casa || '—')} pessoas na residência · moradia ${esc(so.moradia || '—')} · renda familiar ${fi.renda_familiar != null ? esc(U().money(fi.renda_familiar)) : '—'} · per capita ${fi.renda_per_capita != null ? esc(U().money(fi.renda_per_capita)) : '—'} · benefícios: ${esc((so.beneficios || []).join(', ') || 'nenhum')}</p>`);
    html += sec(`<h2>Turmas</h2>${table([{ t: 'Turma' }, { t: 'Projeto' }, { t: 'Entrada' }, { t: 'Saída' }, { t: 'Situação' }], turmas.map(m => [m.turma.nome, m.projeto.nome, U().fmtDate(m.entrada), m.saida ? U().fmtDate(m.saida) : '—', m.status === 'ativo' ? 'Ativo' : m.motivo_saida]))}`);
    html += sec(`<h2>Frequência</h2>${table([{ t: 'Turma' }, { t: 'Aulas', c: 1 }, { t: 'Pres.', c: 1 }, { t: 'Faltas', c: 1 }, { t: 'Just.', c: 1 }, { t: '%', c: 1 }], freq.map(f => [f.turma.nome, f.total, f.P, f.F, f.J, f.freq ?? '—']))}`);
    html += sec(`<h2>Ocorrências e registros</h2>${table([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Título' }, { t: 'Descrição' }], ocs.map(o => [U().fmtDate(o.data), ICM.C.TIPOS_OCORRENCIA[o.tipo].nome, o.titulo, o.descricao]))}`);
    html += sec(`<p style="font-size:10px;color:#b91c1c;margin-top:12px"><b>DOCUMENTO CONFIDENCIAL</b> — contém dados pessoais protegidos pela LGPD. Uso interno.</p>`);
    return { title: `Ficha — ${a.nome}`, html, file: `ficha-${a.matricula}` };
  };

  // ---------------- Patrimônio ----------------
  async function ctxEmp(id) {
    const e = await api().emprestimos.get(id);
    if (!e) throw new Error('Empréstimo não encontrado.');
    const item = await api().patrimonio.get(e.item_id);
    let pessoa = [];
    if (e.tipo_tomador === 'aluno') {
      const a = await api().alunos.get(e.aluno_id); const r = a.responsavel || {}; const en = a.endereco || {};
      pessoa = [['Aluno(a)', `${a.nome} — ${a.matricula}`], ['Responsável legal', `${r.nome || '—'} (${r.parentesco || ''})`], ['CPF do responsável', r.cpf || '—'], ['Telefone', r.telefone], ['Endereço', [en.logradouro, en.numero, en.bairro].filter(Boolean).join(', ')]];
    } else if (e.tipo_tomador === 'terceiro') {
      const t = e.terceiro || {};
      pessoa = [['Tomador', t.nome], ['CPF / CNPJ', t.documento], ['Responsável', t.responsavel], ['Telefone', t.telefone], ['Endereço', t.endereco]];
    } else pessoa = [['Colaborador(a)', e.tomador], ['Contato', e.contato]];
    const signer = e.tipo_tomador === 'aluno' ? (pessoa[1][1] + ' — Responsável legal') : e.tipo_tomador === 'terceiro' ? `${(e.terceiro || {}).responsavel || e.tomador} — Tomador` : `${e.tomador} — Colaborador(a)`;
    return { e, item, pessoa, signer };
  }

  B.termo_emprestimo = async ({ emprestimo_id }) => {
    const { e, item, pessoa, signer } = await ctxEmp(emprestimo_id);
    const valor = item.valor_unitario ? U().money(item.valor_unitario * e.quantidade) : null;
    let html = head('Termo de Empréstimo de Bem', `${e.numero} — ${ICM.C.TIPOS_TOMADOR[e.tipo_tomador]}`);
    html += sec(`<h2>1. Partes</h2><p><b>COMODANTE:</b> ${esc(ICM.C.ORG.razao)}, CNPJ ${esc(ICM.C.ORG.cnpj)}, com sede na ${esc(ICM.C.ORG.endereco || ICM.C.ORG.cidade)}.</p>`) + meta(pessoa);
    html += sec(`<h2>2. Bem emprestado</h2>${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Marca / modelo' }, { t: 'Nº série' }, { t: 'Qtd.', c: 1 }, { t: 'Estado na saída' }], [[item.tombo, item.nome, [item.marca, item.modelo].filter(Boolean).join(' '), item.numero_serie || '—', e.quantidade, ICM.C.ESTADOS_PAT[e.estado_saida] || '']])}
      ${meta([['Data de entrega', U().fmtDateLong(e.data_saida)], ['Devolução prevista', U().fmtDateLong(e.previsao_devolucao)], ['Finalidade', e.finalidade], ['Valor de referência', valor || '—']])}`);
    html += sec(`<h2>3. Condições</h2><ol style="padding-left:18px;font-size:11.5px">
      <li>O bem é cedido gratuitamente, em regime de comodato, exclusivamente para a finalidade descrita acima, sendo vedado emprestá-lo, alugá-lo ou cedê-lo a outras pessoas.</li>
      <li>${e.tipo_tomador === 'aluno' ? 'O(A) responsável legal pelo(a) aluno(a)' : 'O(A) TOMADOR(A)'} compromete-se a zelar pela guarda e conservação do bem, utilizando-o com cuidado e conforme as orientações recebidas.</li>
      <li>A devolução deverá ocorrer até a data prevista, ou imediatamente quando solicitada pela instituição, no mesmo estado em que foi recebido, ressalvado o desgaste natural pelo uso adequado.</li>
      <li>Em caso de dano, perda, furto ou roubo, a instituição deverá ser comunicada em até 48 horas${e.tipo_tomador === 'terceiro' ? ', ficando o(a) TOMADOR(A) responsável pelo reparo ou reposição do bem por outro equivalente ou pelo valor de referência' : ', e as providências para reparo ou reposição serão combinadas com a coordenação'}.</li>
      ${e.tipo_tomador === 'aluno' ? '<li>O desligamento ou a saída do(a) aluno(a) do projeto implica a devolução imediata do bem.</li>' : ''}
      <li>A devolução será conferida pela equipe da instituição e registrada em Termo de Devolução e Recebimento.</li>
      ${item.projeto_id ? '<li>Este bem foi adquirido com recursos de projeto e integra a prestação de contas da instituição.</li>' : ''}
    </ol><p style="font-size:11.5px">E, por estarem de acordo, as partes assinam o presente termo.</p><p style="text-align:right;font-size:11.5px">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(e.data_saida))}.</p>`);
    html += signs(signer, `${e.entregue_por_nome || 'Instituto'} — pela instituição`);
    return { title: `Termo de empréstimo ${e.numero}`, html, file: `termo-emprestimo-${e.numero}` };
  };

  B.termo_devolucao = async ({ emprestimo_id }) => {
    const { e, item, pessoa, signer } = await ctxEmp(emprestimo_id);
    const ext = e.status === 'extraviado';
    let html = head('Termo de Devolução e Recebimento', `${e.numero} — referente ao Termo de Empréstimo`);
    html += meta(pessoa);
    html += sec(`<h2>Bem devolvido</h2>${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Qtd.', c: 1 }, { t: 'Saída' }, { t: 'Estado na saída' }, { t: 'Devolução' }, { t: 'Estado na devolução' }], [[item.tombo, item.nome, e.quantidade, U().fmtDate(e.data_saida), ICM.C.ESTADOS_PAT[e.estado_saida] || '', e.data_devolucao ? U().fmtDate(e.data_devolucao) : '—', ext ? { html: '<span class="tag danger">Não devolvido</span>' } : ICM.C.ESTADOS_PAT[e.estado_devolucao] || '']])}`);
    html += sec(`<h2>Conferência</h2><p>${esc(e.obs_devolucao || 'Sem observações.')}</p>
      <p>${ext ? `Fica registrado que o bem <b>não foi devolvido</b>. O fato foi lançado no histórico patrimonial e as providências de reposição serão tratadas pela coordenação.` : `A instituição declara ter recebido o bem acima descrito, conferido ${['ruim', 'inservivel'].includes(e.estado_devolucao) ? '<b>com avarias registradas</b>' : 'em condições compatíveis com o uso'}, ${e.data_devolucao > e.previsao_devolucao ? `com atraso de ${Math.round((U().parseD(e.data_devolucao) - U().parseD(e.previsao_devolucao)) / 864e5)} dia(s) em relação à data prevista` : 'dentro do prazo previsto'}, dando quitação ao Termo de Empréstimo ${esc(e.numero)}${['ruim', 'inservivel'].includes(e.estado_devolucao) ? ', ressalvadas as avarias acima' : ''}.`}</p>
      <p style="text-align:right;font-size:11.5px">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(e.data_devolucao || U().today()))}.</p>`);
    html += signs(`${e.recebido_por_nome || 'Instituto'} — Recebido pela instituição`, signer);
    return { title: `Termo de devolução ${e.numero}`, html, file: `termo-devolucao-${e.numero}` };
  };

  B.pat_inventario = async ({ categoria }) => {
    const itens = (await api().patrimonio.list({ categoria })).filter(i => i.situacao !== 'baixado');
    const baixados = (await api().patrimonio.list({ categoria, situacao: 'baixado' }));
    const projetos = await api().raw('projetos');
    const valores = ICM.auth.can('patrimonio.valores');
    const total = itens.reduce((s, i) => s + i.quantidade * (i.valor_unitario || 0), 0);
    let html = head('Inventário Patrimonial', `${categoria ? ICM.C.CATEGORIAS_PAT[categoria].nome : 'Todos os bens'} — posição em ${U().fmtDate(U().today())}`);
    html += kpis([[itens.length, 'Itens'], [itens.reduce((s, i) => s + i.quantidade, 0), 'Unidades'], [itens.reduce((s, i) => s + i.emprestados, 0), 'Emprestadas'], [valores ? U().money(total).replace(',00', '') : itens.filter(i => i.situacao === 'manutencao').length, valores ? 'Valor patrimonial' : 'Em manutenção']]);
    const cats = Object.entries(ICM.C.CATEGORIAS_PAT).filter(([k]) => itens.some(i => i.categoria === k));
    cats.forEach(([k, c]) => {
      const l = itens.filter(i => i.categoria === k);
      html += sec(`<h2>${esc(c.nome)}</h2>${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Local' }, { t: 'Qtd.', c: 1 }, { t: 'Empr.', c: 1 }, { t: 'Estado' }, { t: 'Origem' }, ...(valores ? [{ t: 'NF' }, { t: 'Valor aquisição', c: 1 }, { t: 'Valor contábil', c: 1 }] : [])],
        l.map(i => { const p = projetos.find(x => x.id === i.projeto_id); const dp = ICM.api.depreciacao(i); return [i.tombo, [i.nome, i.marca, i.modelo].filter(Boolean).join(' · '), i.local, i.quantidade, i.emprestados, (ICM.C.ESTADOS_PAT[i.estado] || '') + (i.situacao === 'manutencao' ? ' (manutenção)' : ''), p ? p.nome : 'Próprio/doação', ...(valores ? [i.nota_fiscal || '—', i.valor_unitario ? U().money(i.quantidade * i.valor_unitario) : '—', dp.total ? U().money(dp.contabil) : '—'] : [])]; }))}`);
    });
    if (baixados.length) html += sec(`<h2>Bens baixados</h2>${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Motivo' }], baixados.map(i => [i.tombo, i.nome, ((i.historico || []).filter(h => h.tipo === 'baixa').pop() || {}).descricao || '']))}`);
    html += signs('Responsável pelo patrimônio', 'Direção');
    return { title: 'Inventário patrimonial', html, file: `inventario-patrimonial-${U().today()}` };
  };

  B.pat_emprestimos = async ({ de, ate }) => {
    de = de || `${U().today().slice(0, 4)}-01-01`; ate = ate || U().today();
    const all = await api().emprestimos.list();
    const l = all.filter(e => (e.data_saida <= ate) && (!e.data_devolucao || e.data_devolucao >= de));
    const ab = l.filter(e => e.status === 'ativo'), atr = ab.filter(e => e.atrasado), dev = l.filter(e => e.status === 'devolvido'), ext = l.filter(e => e.status === 'extraviado');
    const row = e => [e.numero, `${e.quantidade}x ${e.item.nome}`, e.tomador + (e.responsavel ? ` (resp. ${e.responsavel})` : ''), ICM.C.TIPOS_TOMADOR[e.tipo_tomador].split(' ')[0], U().fmtDate(e.data_saida), e.data_devolucao ? U().fmtDate(e.data_devolucao) : 'prev. ' + U().fmtDate(e.previsao_devolucao),
      e.status === 'devolvido' ? { html: `<span class="tag ok">Devolvido${['ruim', 'inservivel'].includes(e.estado_devolucao) ? ' c/ avaria' : ''}</span>` } : e.status === 'extraviado' ? { html: '<span class="tag danger">Extraviado</span>' } : e.atrasado ? { html: '<span class="tag danger">Atrasado</span>' } : { html: '<span class="tag warn">Em aberto</span>' }];
    const cols = [{ t: 'Nº' }, { t: 'Bem' }, { t: 'Tomador' }, { t: 'Tipo' }, { t: 'Saída' }, { t: 'Devolução' }, { t: 'Situação' }];
    let html = head('Relatório de Empréstimos de Bens', `${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
    html += kpis([[l.length, 'Empréstimos no período'], [ab.length, 'Em aberto'], [atr.length, 'Atrasados'], [ext.length, 'Extraviados']]);
    if (atr.length) html += sec(`<h2>Devoluções atrasadas — cobrar</h2>${table([{ t: 'Nº' }, { t: 'Bem' }, { t: 'Tomador' }, { t: 'Contato' }, { t: 'Previsto' }, { t: 'Dias de atraso', c: 1 }], atr.map(e => [e.numero, `${e.quantidade}x ${e.item.nome}`, e.tomador, e.contato, U().fmtDate(e.previsao_devolucao), Math.round((U().parseD(U().today()) - U().parseD(e.previsao_devolucao)) / 864e5)]))}`);
    html += sec(`<h2>Em aberto</h2>${table(cols, ab.map(row))}`);
    html += sec(`<h2>Encerrados no período</h2>${table(cols, dev.concat(ext).map(row))}`);
    const porTipo = Object.keys(ICM.C.TIPOS_TOMADOR).map(k => [ICM.C.TIPOS_TOMADOR[k], l.filter(e => e.tipo_tomador === k).length, l.filter(e => e.tipo_tomador === k).reduce((s, e) => s + e.quantidade, 0)]);
    html += sec(`<h2>Resumo por tipo de tomador</h2>${table([{ t: 'Tipo' }, { t: 'Empréstimos', c: 1 }, { t: 'Unidades', c: 1 }], porTipo)}`);
    html += signs('Responsável pelo patrimônio', 'Coordenação');
    return { title: 'Relatório de empréstimos', html, file: `emprestimos-${de}-${ate}` };
  };

  B.pat_por_projeto = async ({ projeto_id }) => {
    const projetos = (await api().projetos.list()).filter(p => !projeto_id || p.id === projeto_id);
    const itens = await api().patrimonio.list();
    const valores = ICM.auth.can('patrimonio.valores');
    let html = head('Bens Adquiridos por Projeto', projeto_id ? projetos[0].nome : 'Todos os projetos');
    for (const p of projetos) {
      const l = itens.filter(i => i.projeto_id === p.id); if (!l.length && !projeto_id) continue;
      const tot = l.reduce((s, i) => s + i.quantidade * (i.valor_unitario || 0), 0);
      html += sec(`<h2>${esc(p.nome)}</h2><p style="font-size:11px;color:#5b6788">${esc(p.financiador)} · ${esc(p.numero_termo || '')}${valores ? ` · total em bens: <b>${esc(U().money(tot))}</b>` : ''}</p>
        ${table([{ t: 'Tombo' }, { t: 'Descrição' }, { t: 'Qtd.', c: 1 }, { t: 'Aquisição' }, { t: 'Local' }, { t: 'Estado' }, ...(valores ? [{ t: 'NF' }, { t: 'Fornecedor' }, { t: 'Valor', c: 1 }] : [])],
          l.map(i => [i.tombo, i.nome, i.quantidade, U().fmtDate(i.data_aquisicao), i.local, (ICM.C.ESTADOS_PAT[i.estado] || '') + (i.situacao === 'baixado' ? ' (baixado)' : ''), ...(valores ? [i.nota_fiscal || '—', i.fornecedor || '—', i.valor_unitario ? U().money(i.quantidade * i.valor_unitario) : '—'] : [])]))}`);
    }
    html += declaracao() + signs('Responsável pelo patrimônio', 'Direção');
    return { title: 'Bens por projeto', html, file: 'bens-por-projeto' };
  };

  const STEPS = {
    termo_emprestimo: ['Carregando bem e tomador', 'Redigindo cláusulas', 'Montando termo'],
    termo_devolucao: ['Conferindo devolução', 'Atualizando histórico', 'Montando termo'],
    pat_inventario: ['Lendo inventário', 'Agrupando por categoria', 'Somando valores', 'Montando documento'],
    pat_emprestimos: ['Lendo empréstimos', 'Verificando atrasos', 'Montando documento'],
    pat_por_projeto: ['Lendo projetos', 'Vinculando bens', 'Montando documento'],
    turma_mensal: ['Coletando aulas do mês', 'Consolidando chamadas', 'Reunindo planos e relatórios', 'Organizando fotos', 'Montando documento'],
    turma_anual: ['Coletando aulas do ano', 'Calculando horas por mês', 'Consolidando frequência', 'Reunindo eventos', 'Montando documento'],
    projeto: ['Carregando dados do projeto', 'Somando aulas e horas', 'Calculando metas', 'Traçando perfil dos beneficiários', 'Reunindo eventos e fotos', 'Montando documento'],
    projeto_anual: ['Carregando dados do projeto', 'Somando aulas e horas', 'Calculando metas', 'Traçando perfil dos beneficiários', 'Reunindo eventos e fotos', 'Montando documento'],
    assiduidade: ['Lendo chamadas', 'Contando faltas', 'Aplicando regra de alerta', 'Montando documento'],
    osc_anual: ['Reunindo todos os projetos', 'Somando horas e aulas', 'Contando beneficiários e famílias', 'Consolidando eventos e conquistas', 'Calculando transparência de recursos', 'Montando relatório de impacto'],
    evento: ['Carregando evento', 'Listando participantes', 'Montando documento'],
    ficha_aluno: ['Carregando cadastro', 'Consolidando frequência', 'Montando ficha']
  };
  const TITLES = { termo_emprestimo: 'Termo de empréstimo', termo_devolucao: 'Termo de devolução e recebimento', pat_inventario: 'Inventário patrimonial', pat_emprestimos: 'Relatório de empréstimos', pat_por_projeto: 'Bens por projeto', turma_mensal: 'Relatório mensal da turma', turma_anual: 'Relatório anual da turma', projeto: 'Relatório do projeto', projeto_anual: 'Relatório anual do projeto', assiduidade: 'Relatório de assiduidade', osc_anual: 'Relatório anual de atividades', evento: 'Relatório do evento', ficha_aluno: 'Ficha do aluno' };

  async function generate(kind, params) {
    try {
      const r = await animate(TITLES[kind], STEPS[kind], () => B[kind](params));
      if (r.viewer) await r.viewer(r); else await view(r.title, r.html, r.file);
    } catch (e) { console.error(e); ICM.ui.toast(e.message || 'Falha ao gerar relatório', 'danger'); }
  }

  // Diálogo de parâmetros
  async function openDialog(kind, preset = {}) {
    const F = o => ICM.ui.field(o);
    const ano = String(new Date().getFullYear()); const ym = U().today().slice(0, 7);
    const turmas = await api().turmas.list(); const projetos = await api().projetos.list();
    const optsT = turmas.map(t => [t.id, t.nome]); const optsP = projetos.map(p => [p.id, p.nome]);
    const anos = [ano, String(+ano - 1), String(+ano + 1)];
    const forms = {
      turma_mensal: F({ name: 'turma_id', label: 'Turma', type: 'select', options: optsT, value: preset.turma_id }) + F({ name: 'ym', label: 'Mês', type: 'month', value: ym }),
      turma_anual: F({ name: 'turma_id', label: 'Turma', type: 'select', options: optsT, value: preset.turma_id }) + F({ name: 'ano', label: 'Ano', type: 'select', options: anos, value: ano }),
      projeto: F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: optsP, value: preset.projeto_id }) + `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: '' })}${F({ name: 'ate', label: 'Até', type: 'date', value: '' })}</div><div class="xs muted">Deixe as datas em branco para usar a vigência completa do projeto.</div>`,
      projeto_anual: F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: optsP, value: preset.projeto_id }) + F({ name: 'ano', label: 'Ano', type: 'select', options: anos, value: ano }),
      assiduidade: F({ name: 'turma_id', label: 'Turma', type: 'select', options: [['', 'Todas as turmas'], ...optsT], value: preset.turma_id || '' }) + F({ name: 'ym', label: 'Mês', type: 'month', value: ym }),
      osc_anual: F({ name: 'ano', label: 'Ano', type: 'select', options: anos, value: ano }),
      pat_inventario: F({ name: 'categoria', label: 'Categoria', type: 'select', options: [['', 'Todas'], ...Object.entries(ICM.C.CATEGORIAS_PAT).map(([k, v]) => [k, v.nome])] }),
      pat_emprestimos: `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: `${ano}-01-01` })}${F({ name: 'ate', label: 'Até', type: 'date', value: U().today() })}</div>`,
      pat_por_projeto: F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Todos os projetos'], ...optsP], value: preset.projeto_id || '' })
    };
    if (FORMS_EXTRA[kind]) forms[kind] = await FORMS_EXTRA[kind](F, { ano, ym, anos, optsT, optsP, preset });
    const m = ICM.ui.modal({
      title: TITLES[kind], size: 'sm',
      body: `<form class="col">${forms[kind]}</form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('sparkles', 18)} Gerar relatório</button>`
    });
    m.$('[data-ok]').addEventListener('click', () => {
      const d = U().formData(m.$('form'));
      if (kind === 'projeto' && (!d.de || !d.ate)) { delete d.de; delete d.ate; }
      if ((d.turma_id === undefined || d.turma_id) || kind === 'assiduidade') { m.close(); setTimeout(() => generate(kind, { ...preset, ...d }), 250); }
    });
  }

  // Registro de relatórios de outros módulos (reports-comunidade.js)
  const FORMS_EXTRA = {};
  function register(kind, { title, steps, build, form }) {
    TITLES[kind] = title; STEPS[kind] = steps; B[kind] = build; if (form) FORMS_EXTRA[kind] = form;
  }

  ICM.reports = {
    generate, openDialog, register, fichaAluno: id => generate('ficha_aluno', { aluno_id: id }),
    h: { sec, head, meta, kpis, table, photos, barChart, signs, declaracao, esc, view, animate }, _formsExtra: FORMS_EXTRA
  };
})();
