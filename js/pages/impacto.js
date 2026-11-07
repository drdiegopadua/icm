/* Indicadores de impacto: matriz de indicadores por projeto (produto / resultado / impacto, linha de base,
   meta, valor atual automático ou medido, meio de verificação, ODS), painel consolidado do Instituto
   e Relatório de impacto para conselho e financiadores. Os indicadores ficam em projeto.metas. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;

  const TIPOS = { produto: ['Produto', '#2563eb', 'O que foi entregue (aulas, horas, eventos)'], resultado: ['Resultado', '#f97316', 'Mudança direta nos participantes (frequência, permanência, certificação)'], impacto: ['Impacto', '#10b981', 'Mudança de longo prazo na vida das pessoas e na comunidade'] };
  // Valores que o sistema calcula sozinho a partir dos registros do projeto
  const FONTES = {
    atendidos: ['Pessoas atendidas (total no período)', 'pessoas'], ativos: ['Alunos ativos', 'alunos'], familias: ['Famílias atendidas', 'famílias'],
    horas: ['Horas de atividade realizadas', 'h'], aulas: ['Aulas realizadas', 'aulas'], turmas: ['Turmas', 'turmas'], eventos: ['Eventos e apresentações', 'eventos'],
    freq: ['Frequência média', '%'], freq75: ['Alunos com frequência ≥ 75%', '%'], permanencia: ['Permanência (ativos ÷ atendidos)', '%'], certificados: ['Certificados emitidos', 'certificados']
  };
  const ODS = [['Erradicação da pobreza', '#e5243b'], ['Fome zero e agricultura sustentável', '#dda63a'], ['Saúde e bem-estar', '#4c9f38'], ['Educação de qualidade', '#c5192d'], ['Igualdade de gênero', '#ff3a21'], ['Água potável e saneamento', '#26bde2'], ['Energia limpa e acessível', '#fcc30b'], ['Trabalho decente e crescimento econômico', '#a21942'], ['Indústria, inovação e infraestrutura', '#fd6925'], ['Redução das desigualdades', '#dd1367'], ['Cidades e comunidades sustentáveis', '#fd9d24'], ['Consumo e produção responsáveis', '#bf8b2e'], ['Ação contra a mudança do clima', '#3f7e44'], ['Vida na água', '#0a97d9'], ['Vida terrestre', '#56c02b'], ['Paz, justiça e instituições eficazes', '#00689d'], ['Parcerias e meios de implementação', '#19486a']];
  const odsTag = n => `<span class="ods" style="--c:${ODS[n - 1][1]}" title="ODS ${n} — ${esc(ODS[n - 1][0])}">${n}</span>`;

  // Fonte automática: a escolhida; nas metas antigas, deduz pelo nome do indicador
  function fonteDe(m) {
    if (m.fonte !== undefined) return m.fonte;
    const ind = (m.indicador || '').toLowerCase();
    if (ind.includes('aluno')) return 'ativos'; if (ind.includes('hora')) return 'horas';
    if (ind.includes('evento') || ind.includes('apresenta') || ind.includes('campeonato')) return 'eventos';
    if (ind.includes('presen') || ind.includes('frequ')) return 'freq';
    return '';
  }
  const ultimaMedicao = m => (m.medicoes || []).slice().sort((a, b) => b.data.localeCompare(a.data))[0] || null;
  function valor(m, s) {
    const f = fonteDe(m);
    if (f && s && s[f] != null) return s[f];
    const u = ultimaMedicao(m); if (u) return Number(u.valor);
    if (m.atual_manual != null) return m.atual_manual;
    return m.atual || 0;
  }
  // % da meta, considerando a linha de base (quando houver)
  function pct(m, v) {
    const alvo = Number(m.alvo), base = Number(m.linha_base);
    if (!alvo) return null;
    if (m.linha_base !== undefined && m.linha_base !== '' && !isNaN(base) && alvo !== base) return Math.max(0, Math.min(100, Math.round((v - base) / (alvo - base) * 100)));
    return Math.max(0, Math.min(100, Math.round(v / alvo * 100)));
  }
  const cor = p => p == null ? '#94a3b8' : p >= 100 ? '#10b981' : p >= 60 ? '#2563eb' : p >= 30 ? '#f59e0b' : '#ef4444';
  ICM.pages._metaAtual = valor;   // relatórios de projeto usam o mesmo cálculo

  const css = `<style>
    .imp .ods{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border-radius:6px;background:var(--c);color:#fff;font-weight:800;font-size:12px}
    .imp .imp-tipo{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
    .imp .imp-bar{height:8px;border-radius:6px;background:var(--surface-sunken);overflow:hidden;min-width:70px}.imp .imp-bar span{display:block;height:100%;border-radius:6px}
    .imp td{vertical-align:top}
    .imp .imp-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
    .imp .imp-k{border-top:4px solid var(--c)}.imp .imp-k b{display:block;font-size:26px;color:var(--c)}
    .imp .ods-grid{display:flex;flex-wrap:wrap;gap:6px}
    .imp .ods-grid .ods{opacity:.25}.imp .ods-grid .ods.on{opacity:1}
  </style>`;

  // ---------- Matriz (aba do projeto) ----------
  async function abaProjeto(panel, p, s, recarregar) {
    const pode = ICM.auth.can('projetos.editar');
    const metas = p.metas || [];
    const linhas = metas.map((m, i) => { const v = valor(m, s); return { m, i, v, pc: pct(m, v), f: fonteDe(m) }; });
    const media = linhas.filter(l => l.pc != null).length ? Math.round(linhas.filter(l => l.pc != null).reduce((t, l) => t + l.pc, 0) / linhas.filter(l => l.pc != null).length) : null;
    panel.innerHTML = `<div class="col tab-panel imp">
      <div class="card"><div class="card-head"><div><div class="card-title">Matriz de indicadores</div><div class="card-sub">${linhas.length} indicador(es) · ${media == null ? 'sem metas numéricas' : `<b style="color:${cor(media)}">${media}%</b> das metas, em média`}. Valores automáticos vêm das aulas, chamadas, matrículas, eventos e certificados.</div></div>
        <div class="row wrap">${pode ? `<button class="btn" data-ed>${I('edit', 16)} Editar matriz</button>` : ''}<button class="btn btn-primary" data-rel>${I('printer', 16)} Relatório de impacto</button></div></div>
        ${(p.ods || []).length ? `<div class="row wrap mb-4" style="gap:6px"><span class="xs muted bold">ODS do projeto:</span>${p.ods.map(odsTag).join('')}</div>` : ''}
        ${linhas.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Indicador</th><th>Tipo</th><th>Linha de base</th><th>Meta</th><th>Atual</th><th style="min-width:110px">Alcance</th><th>Verificação</th><th></th></tr></thead><tbody>
          ${linhas.map(({ m, i, v, pc, f }) => { const u = ultimaMedicao(m); const t = TIPOS[m.tipo || 'produto']; return `<tr>
            <td><b>${esc(m.indicador || m.descricao)}</b>${m.indicador && m.descricao ? `<div class="xs muted">${esc(m.descricao)}</div>` : ''}${(m.ods || []).length ? `<div class="row mt-1" style="gap:4px">${m.ods.map(odsTag).join('')}</div>` : ''}</td>
            <td><span class="imp-tipo" style="--c:${t[1]}">${t[0]}</span></td>
            <td>${m.linha_base !== undefined && m.linha_base !== '' ? num(m.linha_base) + ' ' + esc(m.unidade || '') : '—'}</td>
            <td>${m.alvo ? num(m.alvo) + ' ' + esc(m.unidade || '') : '—'}</td>
            <td><b>${num(v)}</b> ${esc(m.unidade || '')}<div class="xs muted">${f ? 'automático' : u ? `medido em ${esc(fmtDate(u.data))}` : 'sem medição'}</div></td>
            <td>${pc == null ? '—' : `<b style="color:${cor(pc)}">${pc}%</b><div class="imp-bar mt-1"><span style="width:${pc}%;background:${cor(pc)}"></span></div>`}</td>
            <td class="small">${esc(m.verificacao || (f ? 'Registros do ICM Sistema' : ''))}${m.periodicidade ? `<div class="xs muted">${esc(m.periodicidade)}</div>` : ''}</td>
            <td>${pode && !f ? `<button class="btn btn-sm" data-med="${i}">${I('plus', 14)} Medição</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>` : ui().empty('Nenhum indicador cadastrado. Use “Editar matriz” para montar a matriz do projeto.', 'target')}
      </div>
      <div class="card"><div class="card-head"><div><div class="card-title">Destaques e histórias de impacto</div><div class="card-sub">Texto que entra no relatório de impacto: conquistas, depoimentos, mudanças percebidas.</div></div>${pode ? `<button class="btn btn-sm" data-nar>${I('edit', 14)} Editar</button>` : ''}</div>
        <div class="text-block">${esc(p.impacto_narrativa || 'Ainda não escrito.')}</div></div>
    </div>${css}`;
    panel.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('impacto', { projeto_id: p.id }));
    const ed = panel.querySelector('[data-ed]'); if (ed) ed.addEventListener('click', () => editarMatriz(p, recarregar));
    panel.querySelectorAll('[data-med]').forEach(b => b.addEventListener('click', () => medicao(p, +b.dataset.med, recarregar)));
    const nar = panel.querySelector('[data-nar]');
    if (nar) nar.addEventListener('click', () => {
      const m = ui().modal({ title: 'Destaques e histórias de impacto', body: `<textarea class="textarea" rows="10" data-t placeholder="Ex.: 3 alunos aprovados no Conservatório; a orquestra se apresentou em 4 cidades; depoimento de uma mãe…">${esc(p.impacto_narrativa || '')}</textarea>`, foot: '<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>' });
      m.$('[data-ok]').addEventListener('click', async () => { const t = m.$('[data-t]').value.trim(); m.close(); await ui().run(() => ICM.api.projetos.save({ ...p, impacto_narrativa: t }), 'Texto salvo'); recarregar(); });
    });
  }

  function editarMatriz(p, depois) {
    let metas = (p.metas || []).map(m => ({ ...m, fonte: fonteDe(m), tipo: m.tipo || 'produto', ods: [...(m.ods || [])] }));
    let odsP = new Set(p.ods || []);
    const m = ui().modal({ title: `Matriz de indicadores — ${p.nome}`, size: 'wide', body: `
      <div class="field mb-4"><label class="label">ODS do projeto</label><div class="row wrap imp" style="gap:6px" data-odsp>${ODS.map((o, i) => `<button type="button" class="ods" style="--c:${o[1]};border:0;cursor:pointer;opacity:${odsP.has(i + 1) ? 1 : .25}" data-o="${i + 1}" title="${esc(o[0])}">${i + 1}</button>`).join('')}</div></div>
      <div data-lista></div><button type="button" class="btn btn-sm mt-2" data-add>${I('plus', 14)} Indicador</button>
      <p class="xs muted mt-4">Dica: produto = o que foi entregue (aulas, horas); resultado = mudança nos participantes (frequência, permanência, certificação); impacto = mudança de longo prazo (ex.: aprovados em conservatório, retorno escolar). Indicadores com fonte “manual” recebem medições com data.</p>`,
      foot: '<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar matriz</button>' });
    m.$$('[data-o]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.o; odsP.has(n) ? odsP.delete(n) : odsP.add(n); b.style.opacity = odsP.has(n) ? 1 : .25; }));
    const sel = (opts, v) => opts.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === String(k) ? 'selected' : ''}>${esc(n)}</option>`).join('');
    const desenhar = () => {
      m.$('[data-lista]').innerHTML = metas.map((x, i) => `<div class="card flat mb-2" style="padding:12px"><div class="grid grid-4" style="gap:10px">
        <div class="field span-2"><label class="label">Indicador</label><input class="input" data-k="indicador" data-i="${i}" value="${esc(x.indicador || '')}" placeholder="Ex.: Alunos com frequência ≥ 75%"></div>
        <div class="field span-2"><label class="label">Meta / resultado esperado</label><input class="input" data-k="descricao" data-i="${i}" value="${esc(x.descricao || '')}" placeholder="Ex.: 80% dos alunos frequentes"></div>
        <div class="field"><label class="label">Tipo</label><select class="input" data-k="tipo" data-i="${i}">${sel(Object.entries(TIPOS).map(([k, v]) => [k, v[0]]), x.tipo)}</select></div>
        <div class="field"><label class="label">Fonte do valor</label><select class="input" data-k="fonte" data-i="${i}">${sel([['', 'Manual (medições)'], ...Object.entries(FONTES).map(([k, v]) => [k, 'Automático: ' + v[0]])], x.fonte)}</select></div>
        <div class="field"><label class="label">Linha de base</label><input class="input" type="number" step="any" data-k="linha_base" data-i="${i}" value="${esc(x.linha_base ?? '')}"></div>
        <div class="field"><label class="label">Meta</label><input class="input" type="number" step="any" data-k="alvo" data-i="${i}" value="${esc(x.alvo ?? '')}"></div>
        <div class="field"><label class="label">Unidade</label><input class="input" data-k="unidade" data-i="${i}" value="${esc(x.unidade || '')}" placeholder="%, alunos, h"></div>
        <div class="field"><label class="label">Periodicidade</label><select class="input" data-k="periodicidade" data-i="${i}">${sel([['', '—'], ['Mensal', 'Mensal'], ['Trimestral', 'Trimestral'], ['Semestral', 'Semestral'], ['Anual', 'Anual'], ['Final do projeto', 'Final do projeto']], x.periodicidade || '')}</select></div>
        <div class="field span-2"><label class="label">Meio de verificação</label><input class="input" data-k="verificacao" data-i="${i}" value="${esc(x.verificacao || '')}" placeholder="Listas de presença, relatórios, questionário, fotos…"></div>
        <div class="field span-2"><label class="label">ODS (números separados por vírgula)</label><div class="row" style="gap:8px"><input class="input" data-k="ods" data-i="${i}" value="${esc((x.ods || []).join(', '))}" placeholder="4, 10"><button type="button" class="btn btn-sm btn-ghost" data-rm="${i}" title="Remover indicador">${I('trash', 14)}</button></div></div>
      </div></div>`).join('') || '<p class="small muted">Nenhum indicador.</p>';
      m.$$('[data-k]').forEach(inp => inp.addEventListener('change', () => {
        const x = metas[+inp.dataset.i], k = inp.dataset.k;
        if (k === 'alvo' || k === 'linha_base') x[k] = inp.value === '' ? '' : Number(inp.value);
        else if (k === 'ods') x.ods = [...new Set(inp.value.split(/[^\d]+/).map(Number).filter(n => n >= 1 && n <= 17))];
        else x[k] = inp.value;
        if (k === 'fonte' && inp.value && !x.unidade) { x.unidade = FONTES[inp.value][1]; desenhar(); }
      }));
      m.$$('[data-rm]').forEach(b => b.addEventListener('click', () => { metas.splice(+b.dataset.rm, 1); desenhar(); }));
    };
    desenhar();
    m.$('[data-add]').addEventListener('click', () => { metas.push({ indicador: '', descricao: '', tipo: 'resultado', fonte: '', linha_base: '', alvo: '', unidade: '', ods: [] }); desenhar(); });
    m.$('[data-ok]').addEventListener('click', async () => {
      m.$$('[data-k]').forEach(inp => inp.dispatchEvent(new Event('change')));
      const lista = metas.filter(x => String(x.indicador || x.descricao || '').trim());
      m.close(); await ui().run(() => ICM.api.projetos.save({ ...p, metas: lista, ods: [...odsP].sort((a, b) => a - b) }), 'Matriz salva'); depois();
    });
  }

  function medicao(p, i, depois) {
    const x = p.metas[i];
    const hist = (x.medicoes || []).slice().sort((a, b) => b.data.localeCompare(a.data));
    const m = ui().modal({ title: `Medição — ${x.indicador || x.descricao}`, size: 'sm', body: `<form class="col">
      <div class="grid grid-2">${ui().field({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}${ui().field({ name: 'valor', label: `Valor${x.unidade ? ' (' + x.unidade + ')' : ''}`, type: 'number', attrs: 'step="any"' })}</div>
      ${ui().field({ name: 'obs', label: 'Como foi medido / evidência', type: 'textarea', rows: 2, placeholder: 'Ex.: questionário aplicado a 40 famílias' })}</form>
      ${hist.length ? `<div class="section-title mt-4">Histórico</div>${hist.map(h => `<div class="list-item"><span class="badge neutral">${esc(fmtDate(h.data))}</span><b>${num(Number(h.valor))} ${esc(x.unidade || '')}</b><span class="xs muted grow">${esc(h.obs || '')}</span></div>`).join('')}` : ''}`,
      foot: '<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Registrar</button>' });
    m.$('[data-ok]').addEventListener('click', async () => {
      const d = ICM.util.formData(m.$('form')); if (d.valor === '' || !d.data) { ui().toast('Informe a data e o valor.', 'warn'); return; }
      const metas = p.metas.map((y, k) => k === i ? { ...y, medicoes: [...(y.medicoes || []), { data: d.data, valor: Number(d.valor), obs: d.obs, por: ICM.auth.user().nome }] } : y);
      m.close(); await ui().run(() => ICM.api.projetos.save({ ...p, metas }), 'Medição registrada'); depois();
    });
  }

  // ---------- Painel do Instituto ----------
  let ano = String(new Date().getFullYear());
  async function dadosImpacto(de, ate, projetoId) {
    const projetos = (await ICM.api.projetos.list()).filter(p => !projetoId || p.id === projetoId);
    const out = [];
    for (const p of projetos) {
      const s = await ICM.api.projetos.stats(p.id, { de, ate });
      const ls = (p.metas || []).map(m => { const v = valor(m, s); return { m, v, pc: pct(m, v), f: fonteDe(m) }; });
      const com = ls.filter(l => l.pc != null);
      out.push({ p, s, ls, media: com.length ? Math.round(com.reduce((t, l) => t + l.pc, 0) / com.length) : null });
    }
    return out;
  }
  // Pessoas e famílias sem repetir quem está em mais de um projeto
  async function distintos(de, ate, projetoIds) {
    const turmas = await ICM.api.turmas.list(); const tids = new Set(turmas.filter(t => !projetoIds || projetoIds.includes(t.projeto_id)).map(t => t.id));
    const mats = (await ICM.api.raw('matriculas').catch(() => [])).filter(m => tids.has(m.turma_id) && (!ate || m.entrada <= ate) && (!de || !m.saida || m.saida >= de));
    const ids = new Set(mats.map(m => m.aluno_id));
    const alunos = (await ICM.api.alunos.list({ status: '' }).catch(() => [])).filter(a => ids.has(a.id));
    const fam = new Set(alunos.map(a => { const r = a.responsavel || {}; const k = String(r.nome || '').trim().toLowerCase() + '|' + String(r.telefone || '').replace(/\D/g, ''); return k.length > 1 ? k : a.id; }));
    return { pessoas: ids.size, familias: fam.size };
  }
  ICM.pages.impacto = async function (el) {
    ICM.app.setCrumbs([['Gestão'], ['Indicadores de impacto']]);
    el.innerHTML = '<div class="page"><div class="card" style="height:120px"></div></div>';
    const de = ano === 'todos' ? '' : `${ano}-01-01`, ate = ano === 'todos' ? '' : `${ano}-12-31`;
    const dados = (await dadosImpacto(de, ate)).filter(d => d.p.status !== 'rascunho');
    const { pessoas: nPessoas, familias: fam } = await distintos(de, ate, null);
    const horas = dados.reduce((t, d) => t + d.s.horas, 0);
    const freqs = dados.filter(d => d.s.aulas); const freq = freqs.length ? Math.round(freqs.reduce((t, d) => t + d.s.freq, 0) / freqs.length) : null;
    const meds = dados.filter(d => d.media != null); const media = meds.length ? Math.round(meds.reduce((t, d) => t + d.media, 0) / meds.length) : null;
    const odsOn = new Set(dados.flatMap(d => [...(d.p.ods || []), ...(d.p.metas || []).flatMap(m => m.ods || [])]));
    const anos = [String(+ano + 0), ...Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i))].filter((v, i, a) => a.indexOf(v) === i && v !== 'todos');
    el.innerHTML = `<div class="page imp">
      <div class="page-head"><div><h1 class="page-title">Indicadores de impacto</h1><div class="page-sub">Resultados do Instituto e de cada projeto, prontos para conselho, financiadores e prestação de contas.</div></div>
        <div class="row wrap"><select class="input" data-ano style="width:auto">${[...new Set([String(new Date().getFullYear()), ...anos])].sort().reverse().map(a => `<option ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}<option value="todos" ${ano === 'todos' ? 'selected' : ''}>Todo o período</option></select>
          <button class="btn btn-primary" data-rel>${I('printer', 18)} Relatório de impacto</button></div></div>
      <div class="imp-kpis mb-4">
        <div class="card imp-k" style="--c:#2563eb"><b>${num(nPessoas)}</b><span class="small muted">Pessoas atendidas</span></div>
        <div class="card imp-k" style="--c:#8b5cf6"><b>${num(fam)}</b><span class="small muted">Famílias alcançadas</span></div>
        <div class="card imp-k" style="--c:#f97316"><b>${num(Math.round(horas))}h</b><span class="small muted">Horas de atividade</span></div>
        <div class="card imp-k" style="--c:${cor(freq)}"><b>${freq == null ? '—' : freq + '%'}</b><span class="small muted">Frequência média</span></div>
        <div class="card imp-k" style="--c:${cor(media)}"><b>${media == null ? '—' : media + '%'}</b><span class="small muted">Alcance médio das metas</span></div>
      </div>
      <div class="card mb-4"><div class="card-title mb-2">Objetivos de Desenvolvimento Sustentável contemplados</div>
        <div class="ods-grid">${ODS.map((o, i) => `<span class="ods ${odsOn.has(i + 1) ? 'on' : ''}" style="--c:${o[1]};width:auto;padding:0 8px;height:28px" title="${esc(o[0])}">${i + 1}${odsOn.has(i + 1) ? ' · ' + esc(o[0]) : ''}</span>`).join('')}</div>
        ${odsOn.size ? '' : '<p class="xs muted mt-2">Marque os ODS de cada projeto na matriz de indicadores.</p>'}</div>
      ${dados.map(d => `<div class="card mb-4"><div class="card-head"><div><div class="card-title" style="color:${d.p.cor || 'inherit'}">${esc(d.p.nome)}</div><div class="card-sub">${num(d.s.atendidos)} atendidos · ${num(Math.round(d.s.horas))}h · frequência ${d.s.freq}% · ${d.ls.length} indicador(es)</div></div>
          <div class="row" style="gap:10px">${d.media == null ? '' : `<b style="color:${cor(d.media)};font-size:20px">${d.media}%</b>`}<a class="btn btn-sm" href="#/projetos/${esc(d.p.id)}?tab=metas">Matriz</a></div></div>
        ${d.ls.length ? d.ls.map(l => `<div class="row mb-2" style="gap:10px"><span class="imp-tipo" style="--c:${TIPOS[l.m.tipo || 'produto'][1]}">${TIPOS[l.m.tipo || 'produto'][0]}</span><span class="small grow">${esc(l.m.indicador || l.m.descricao)}</span><span class="small bold">${num(l.v)}${l.m.alvo ? ' / ' + num(l.m.alvo) : ''} ${esc(l.m.unidade || '')}</span><div class="imp-bar" style="width:120px"><span style="width:${l.pc || 0}%;background:${cor(l.pc)}"></span></div></div>`).join('') : '<p class="small muted">Sem indicadores — monte a matriz na página do projeto.</p>'}
      </div>`).join('')}
    </div>${css}`;
    el.querySelector('[data-ano]').addEventListener('change', e => { ano = e.target.value; ICM.pages.impacto(el); });
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('impacto', {}));
  };

  // ---------- Relatório de impacto ----------
  ICM.reports.register('impacto', {
    title: 'Relatório de impacto',
    steps: ['Lendo projetos e indicadores', 'Calculando resultados', 'Reunindo ODS e histórias', 'Montando relatório'],
    form: async (F, { anos, optsP, preset }) => F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Todos os projetos'], ...optsP], value: preset.projeto_id || '' }) + F({ name: 'ano', label: 'Período', type: 'select', options: [...anos.map(a => [a, a]), ['todos', 'Todo o período']], value: anos[0] }),
    async build({ projeto_id, ano: a }) {
      const { sec, head, kpis, table, esc: e, signs } = ICM.reports.h;
      const de = a === 'todos' ? '' : `${a}-01-01`, ate = a === 'todos' ? '' : `${a}-12-31`;
      const dados = await dadosImpacto(de, ate, projeto_id || null);
      const sub = `${projeto_id ? dados[0].p.nome : 'Todos os projetos'} — ${a === 'todos' ? 'todo o período' : a}`;
      let html = head('Relatório de impacto', sub);
      const hs = dados.reduce((t, d) => t + d.s.horas, 0);
      const { pessoas: at, familias: fa } = await distintos(de, ate, dados.map(d => d.p.id));
      const meds = dados.filter(d => d.media != null);
      html += kpis([[num(at), 'pessoas atendidas'], [num(fa), 'famílias'], [num(Math.round(hs)) + 'h', 'de atividades'], [meds.length ? Math.round(meds.reduce((t, d) => t + d.media, 0) / meds.length) + '%' : '—', 'alcance médio das metas']]);
      const odsOn = [...new Set(dados.flatMap(d => [...(d.p.ods || []), ...(d.p.metas || []).flatMap(m => m.ods || [])]))].sort((x, y) => x - y);
      if (odsOn.length) html += sec(`<h2>Objetivos de Desenvolvimento Sustentável</h2><p>${odsOn.map(n => `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 8px;border-radius:5px;background:${ODS[n - 1][1]};color:#fff;font-weight:700;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact">ODS ${n} — ${e(ODS[n - 1][0])}</span>`).join('')}</p>`);
      for (const d of dados) {
        html += sec(`<h2>${e(d.p.nome)}</h2><p style="font-size:11px;color:#3a4669">${num(d.s.atendidos)} atendidos · ${num(d.s.ativos)} ativos · ${num(d.s.familias)} famílias · ${num(d.s.aulas)} aulas · ${num(Math.round(d.s.horas))}h · frequência média ${d.s.freq}% · ${num(d.s.eventos)} eventos · ${num(d.s.certificados)} certificados</p>
          ${d.ls.length ? table(['Indicador', 'Tipo', { t: 'Base', c: 1 }, { t: 'Meta', c: 1 }, { t: 'Alcançado', c: 1 }, { t: '%', c: 1 }, 'Meio de verificação'], d.ls.map(l => [l.m.indicador || l.m.descricao, TIPOS[l.m.tipo || 'produto'][0], l.m.linha_base !== undefined && l.m.linha_base !== '' ? num(l.m.linha_base) : '—', l.m.alvo ? num(l.m.alvo) + ' ' + (l.m.unidade || '') : '—', num(l.v) + ' ' + (l.m.unidade || ''), l.pc == null ? '—' : l.pc + '%', l.m.verificacao || (l.f ? 'Registros do ICM Sistema' : '')])) : '<p>Sem indicadores cadastrados.</p>'}
          ${d.p.impacto_narrativa ? `<h3 style="margin-top:12px;font-size:12.5px">Destaques e histórias</h3><p style="white-space:pre-line">${e(d.p.impacto_narrativa)}</p>` : ''}`);
      }
      html += sec('<p style="font-size:10.5px;color:#3a4669">Valores “automáticos” calculados a partir das listas de presença, matrículas, eventos e certificados registrados no ICM Sistema; valores “medidos” registrados pela coordenação com data e evidência.</p>');
      html += signs('Coordenação', 'Presidência / Direção');
      return { title: `Relatório de impacto — ${sub}`, html, file: `relatorio-impacto-${a}` };
    }
  });

  ICM.impacto = { abaProjeto, valor, pct, FONTES, TIPOS, ODS };
})();
