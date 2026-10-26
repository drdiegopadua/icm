/* Relatório Anual de Atividades em formato revista (A4 paisagem), no modelo de relatórios
   institucionais de grandes OSCs: capa, índice, seções com capa própria, números, gráficos,
   parceiros, voluntariado, áreas de atuação e prestação de contas.
   Os números vêm dos registros do sistema; os textos institucionais são editáveis
   (Relatórios → Relatório anual → "Textos do relatório") e ficam em config.relatorio. */
(function () {
  const I = (n, s) => ICM.icon(n, s);
  const U = () => ICM.util;
  const esc = s => U().esc(s);
  const api = () => ICM.api;
  const h = () => ICM.reports.h;
  const tenta = async (fn, padrao) => { try { return await fn(); } catch (e) { return padrao; } };
  const N = (v, d = 0) => U().num(v, d);
  const R$ = v => U().money(v).replace(/,00$/, '');
  const AZUL = '#2563eb', CIANO = '#22c3ee';
  // Logo oficial (versão branca para fundos coloridos, escura para páginas brancas)
  const logo = (cor, estilo) => `<img class="rv-logo" src="assets/icm-logo-${cor}.png" alt="Instituto Cultural das Montanhas" style="${estilo}">`;

  // Objetivos de Desenvolvimento Sustentável (cores oficiais da ONU)
  const ODS = [
    ['Erradicação da pobreza', '#e5243b'], ['Fome zero e agricultura sustentável', '#dda63a'], ['Saúde e bem-estar', '#4c9f38'], ['Educação de qualidade', '#c5192d'],
    ['Igualdade de gênero', '#ff3a21'], ['Água potável e saneamento', '#26bde2'], ['Energia limpa e acessível', '#fcc30b'], ['Trabalho decente e crescimento econômico', '#a21942'],
    ['Indústria, inovação e infraestrutura', '#fd6925'], ['Redução das desigualdades', '#dd1367'], ['Cidades e comunidades sustentáveis', '#fd9d24'], ['Consumo e produção responsáveis', '#bf8b2e'],
    ['Ação contra a mudança global do clima', '#3f7e44'], ['Vida na água', '#0a97d9'], ['Vida terrestre', '#56c02b'], ['Paz, justiça e instituições eficazes', '#00689d'], ['Parcerias e meios de implementação', '#19486a']
  ];
  const PALETA = ['#2563eb', '#22c3ee', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#facc15', '#64748b'];

  // ---------- Textos padrão (editáveis) ----------
  function textosPadrao(d) {
    return {
      nome: ICM.C.ORG.nome, razao: ICM.C.ORG.razao, cnpj: ICM.C.ORG.cnpj, cidade: ICM.C.ORG.cidade, site: ICM.C.ORG.site || '', instagram: ICM.C.ORG.instagram || '', email: ICM.C.ORG.email || '', telefone: '', endereco: ICM.C.ORG.endereco || '',
      apresentacao: `Fundado em 16 de agosto de 2021, na cidade de Afonso Cláudio-ES, o ${ICM.C.ORG.nome} nasceu com um propósito claro: criar oportunidades reais para quem mais precisa. Ao longo de sua trajetória, tem impactado centenas de jovens e famílias por meio de projetos sociais que unem cultura, esporte e educação — promovendo desenvolvimento humano, inclusão social e transformação de vidas. Mais do que números, construímos histórias: histórias de superação, aprendizado e novos caminhos.

Em ${d.ano}, foram ${N(d.alunos.length)} pessoas atendidas em ${N(d.turmas.length)} turmas de ${N(d.projetos.length)} projetos, somando ${N(d.horas)} horas de atividades gratuitas e ${N(d.aulas.length)} aulas realizadas. Cada aula tem plano, chamada, relatório e fotos registrados no ICM Sistema, o que garante transparência a famílias, parceiros e financiadores.`,
      missao: 'Promover o desenvolvimento humano e social por meio de ações culturais, esportivas e educacionais, criando oportunidades que transformam vidas e fortalecem comunidades.',
      visao: 'Ser referência na transformação social nas montanhas capixabas, ampliando o acesso à cultura, educação e inclusão para todos.',
      valores: 'Transparência em cada ação, respeito, inclusão, responsabilidade social e transformação através da educação.',
      relacionamento: 'Nossa relação com a sociedade, o poder público, empresas e famílias é baseada na confiança, na prestação de contas e no diálogo permanente. Todos os dados pessoais são tratados conforme a LGPD, com acesso restrito por perfil e registro de auditoria.',
      compliance: 'O Instituto é reconhecido como de Utilidade Pública Municipal (Lei nº 2.617/2024) e Estadual (Lei nº 12.580/2025), inscrito no Conselho Municipal dos Direitos da Criança e do Adolescente (CMDCA) e certificado como Ponto de Cultura pelo Ministério da Cultura. Mantém estatuto atualizado, atas registradas, mandatos da diretoria vigentes e certidões de regularidade acompanhadas mensalmente, com todos os documentos disponíveis na página de transparência.',
      ods: [1, 2, 3, 4, 10, 11, 16, 17],
      // Linha do tempo institucional (Ano | Título — descrição); entra no relatório até o ano escolhido
      marcos: `2021 | Fundação do Instituto — 16 de agosto de 2021, em Afonso Cláudio-ES.
2022 | Primeiros projetos nas escolas — aulas de música nas escolas do município, com 100 atendidos.
2024 | Lei de Incentivo à Cultura Capixaba — primeiro projeto aprovado na LICC.
2024 | Utilidade Pública Municipal — Lei nº 2.617/2024, Município de Afonso Cláudio/ES.
2025 | Lei Rouanet — pioneiro na região na captação pela Lei Federal de Incentivo à Cultura, com a Orquestra Jônice Tristão.
2025 | Utilidade Pública Estadual — Lei nº 12.580/2025, Estado do Espírito Santo.
2025 | CMDCA — inscrição no Conselho Municipal dos Direitos da Criança e do Adolescente.
2026 | Ponto de Cultura — certificação do Ministério da Cultura.`,
      parceiros: `EDP
Grupo Tristão
Sicoob
Prefeitura Municipal de Afonso Cláudio
Ifes`
    };
  }

  // ---------- Coleta dos dados do ano ----------
  async function coletar(ano) {
    const de = `${ano}-01-01`, ate = `${ano}-12-31`, noAno = d => d && d >= de && d <= ate;
    const cfg = await tenta(() => api().config.get(), {});
    const rel = cfg.relatorio || {};
    const projetos = (await api().projetos.list()).filter(p => p.inicio <= ate && p.fim >= de);
    const turmasTodas = await api().turmas.list();
    const turmas = turmasTodas.filter(t => projetos.some(p => p.id === t.projeto_id));
    const aulas = (await api().raw('aulas')).filter(a => a.status === 'realizada' && noAno(a.data));
    const mats = await api().raw('matriculas');
    const matsAno = mats.filter(m => m.entrada <= ate && (!m.saida || m.saida >= de));
    const alunoIds = new Set(matsAno.map(m => m.aluno_id));
    const alunos = (await api().raw('alunos')).filter(a => alunoIds.has(a.id));
    const eventos = (await api().eventos.list()).filter(e => noAno(e.data)).sort((a, b) => a.data.localeCompare(b.data));
    const users = await api().usuarios.list();
    const d = {
      ano, de, ate, cfg, projetos, turmas, aulas, mats: matsAno, alunos, eventos, users,
      horas: aulas.reduce((s, a) => s + (a.horas || 0), 0),
      equipe: (await tenta(() => api().equipe.list(), [])).filter(p => p.status !== 'desligado'),
      voluntarios: await tenta(() => api().voluntarios.list(), []),
      doadores: await tenta(() => api().raw('doadores'), []),
      doacoes: await tenta(() => api().doadores.doacoes({ de, ate }), []),
      docs: await tenta(() => api().docsInst.list(), []),
      mandatos: await tenta(() => api().raw('mandatos'), []),
      encaminhamentos: (await tenta(() => api().raw('encaminhamentos'), [])).filter(x => noAno(x.data)),
      pareceres: (await tenta(() => api().raw('pareceres'), [])).filter(x => noAno(x.data)),
      pia: (await tenta(() => api().raw('pia'), [])).filter(x => noAno(x.elaborado_em)),
      movEstoque: (await tenta(() => api().raw('estoque_mov'), [])).filter(x => noAno(x.data)),
      itensEstoque: await tenta(() => api().raw('estoque_itens'), []),
      campanhas: await tenta(() => api().raw('campanhas'), []),
      doacoesOnline: (await tenta(() => api().raw('doacoes_online'), [])).filter(x => x.status === 'confirmada' && noAno(String(x.confirmado_em || x.criado_em || '').slice(0, 10))),
      lancamentos: (await tenta(() => api().raw('fin_lancamentos'), [])).filter(x => noAno(x.data)),
      pesquisas: await tenta(() => api().pesquisas.indicadoresAno(ano), []),
      reunioes: (await tenta(() => api().reunioes.list(), [])).filter(r => noAno(r.data) && r.data <= U().today()),
      certificados: (await tenta(() => api().certificados.list(), [])).filter(c => noAno(c.data_emissao) && c.status === 'valido'),
      associados: await tenta(() => api().raw('associados'), []),
      espera: await tenta(() => api().espera.list({ status: 'aguardando' }), [])
    };
    d.inst = { ...textosPadrao(d), ...(rel.inst || {}) };
    d.anoCfg = (rel.anos || {})[ano] || {};
    // Presenças registradas (cada presença = um atendimento)
    d.presencas = aulas.reduce((s, a) => s + Object.values(a.presencas || {}).filter(v => v === 'P' || v === 'J').length, 0);
    // Fotos do ano (aulas e eventos), com a área de origem
    const areaDaTurma = id => { const t = turmasTodas.find(x => x.id === id); const p = t && projetos.find(x => x.id === t.projeto_id); return p ? p.area : ''; };
    d.fotos = aulas.flatMap(a => (a.fotos || []).map(f => ({ src: f.src, legenda: f.legenda, area: areaDaTurma(a.turma_id) })))
      .concat(eventos.flatMap(e => (e.fotos || []).map(f => ({ src: f.src, legenda: f.legenda || e.titulo, area: (projetos.find(p => p.id === e.projeto_id) || {}).area, evento: e.id }))))
      .filter(f => f.src);
    return d;
  }

  // ---------- Peças visuais ----------
  let fotoIdx = 0;
  function foto(d, { area, evento, alt = '' } = {}, cls = '', estilo = '') {
    let l = d.fotos;
    if (evento) l = l.filter(f => f.evento === evento);
    else if (area) l = l.filter(f => f.area === area).concat(l);
    const f = l.length ? l[(fotoIdx++) % l.length] : null;
    return `<figure class="rv-ph ${f ? '' : 'vazio'} ${cls}" style="${estilo}">${f ? `<img src="${esc(f.src)}" alt="${esc(alt || f.legenda || '')}">` : ''}</figure>`;
  }
  const arcos = (...l) => l.map(([x, y, r]) => `<div class="rv-arc" style="left:${x}mm;top:${y}mm;width:${r}mm;height:${r}mm"></div>`).join('');
  function donut(itens, { tam = 46, esp = 10, centro = '', sub = '' } = {}) {
    const tot = itens.reduce((s, i) => s + i.v, 0) || 1; const r = 50 - esp / 2, C = 2 * Math.PI * r; let acc = 0;
    const arcs = itens.map((i, k) => { const len = i.v / tot * C; const s = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${i.cor || PALETA[k % PALETA.length]}" stroke-width="${esp}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 50 50)"/>`; acc += len; return s; }).join('');
    return `<svg viewBox="0 0 100 100" style="width:${tam}mm;height:${tam}mm;flex:none"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(127,127,127,.15)" stroke-width="${esp}"/>${arcs}${centro ? `<text x="50" y="${sub ? 49 : 54}" text-anchor="middle" font-size="15" font-weight="900" fill="currentColor">${esc(centro)}</text>` : ''}${sub ? `<text x="50" y="61" text-anchor="middle" font-size="6.5" font-weight="700" fill="currentColor" opacity=".75">${esc(sub)}</text>` : ''}</svg>`;
  }
  const legenda = (itens, tot) => `<div class="rv-leg">${itens.map((i, k) => `<div><i style="background:${i.cor || PALETA[k % PALETA.length]}"></i>${esc(i.l)}${tot != null ? ` · ${U().pct(i.v, tot)}%` : ` · ${N(i.v)}`}</div>`).join('')}</div>`;
  const barras = (itens, fmt = v => N(v)) => { const mx = Math.max(1, ...itens.map(i => i.v)); return `<div class="rv-barras">${itens.map(i => `<div class="b"><span>${esc(i.l)}</span><i style="width:${Math.max(2, i.v / mx * 100)}%;${i.cor ? `background:${i.cor}` : ''}"></i><b>${esc(fmt(i.v))}</b></div>`).join('')}</div>`; };
  const contar = (lista, f) => { const o = {}; lista.forEach(x => { const k = f(x); if (k) o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v })); };
  const paragrafos = t => String(t || '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const linhas = t => String(t || '').split(/\n+/).map(s => s.trim()).filter(Boolean);

  // ---------- Montagem das páginas ----------
  function paginas(d) {
    const P = [];   // { sec, titulo, cor, cor2, tipo, html(n) }
    const nome = d.inst.nome;
    const add = (o) => P.push(o);
    const pagina = (o, n) => {
      const tipo = o.tipo || 'std';
      const marcaDiv = tipo === 'div' ? logo('branca', 'position:absolute;right:16mm;bottom:13mm;height:22mm;z-index:3') : '';
      const crumb = o.sec && tipo !== 'capa' && tipo !== 'fim' ? `<div class="rv-crumb">${esc(o.sec)}</div>` : '';
      const num = tipo !== 'capa' && tipo !== 'fim' ? `<div class="rv-num"><i></i>${n}</div>` : '';
      return `<section class="rv-page rv-${tipo}" style="--c:${o.cor || AZUL};--c2:${o.cor2 || CIANO}">${crumb}${o.html(n)}${marcaDiv}${num}</section>`;
    };

    // 1. Capa
    add({ tipo: 'capa', html: () => `<div class="orb" style="width:120mm;height:120mm;left:-40mm;top:-50mm"></div><div class="orb" style="width:20mm;height:20mm;left:40mm;top:22mm"></div>
      ${foto(d, { alt: 'Foto de atividade do Instituto' })}
      <div class="tit"><div class="a">Relatório<br>de Atividades</div><div class="b">${esc(d.ano)}</div></div>
      <div class="marca">${logo('branca', 'height:30mm')}</div>` });

    // 2. Índice (preenchido no fim, quando já se sabe a página de cada título)
    const indice = { tipo: 'std', sec: '', html: () => '' }; add(indice);

    // ===== Seção: quem somos =====
    const S1 = 'O Instituto';
    add({ tipo: 'div', sec: S1, html: () => `${foto(d)}<div class="t">${esc(S1)}</div>` });
    add({ sec: S1, titulo: 'Quem somos', html: () => `<div class="rv-blob" style="width:200mm;height:260mm;left:-110mm;top:-30mm"></div>
      ${foto(d, {}, '', 'position:absolute;left:12mm;top:22mm;width:92mm;height:170mm;border-radius:46mm 46mm 6mm 6mm')}
      <div style="position:absolute;left:116mm;right:18mm;top:20mm"><h1 class="rv-h">Quem somos</h1>
        ${d.anoCfg.mensagem ? `<p class="rv-lead">${esc(d.anoCfg.mensagem)}</p>` : ''}<div class="rv-col">${paragrafos(d.inst.apresentacao)}</div></div>` });
    add({ sec: S1, titulo: 'Missão, visão e valores', html: () => `${arcos([200, -60, 160], [230, -20, 120])}
      <div class="rv-in" style="bottom:70mm"><div class="rv-cols"><div><div class="rv-h2">Missão</div><p>${esc(d.inst.missao)}</p><div class="rv-h2" style="margin-top:5mm">Visão</div><p>${esc(d.inst.visao)}</p></div>
        <div><div class="rv-h2">Valores</div><p>${esc(d.inst.valores)}</p><div class="rv-h2" style="margin-top:5mm">Relacionamento</div><p>${esc(d.inst.relacionamento)}</p></div></div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:64mm;display:grid;grid-template-columns:repeat(4,1fr);gap:2mm">${[0, 1, 2, 3].map(() => foto(d, {}, '', 'border-radius:0')).join('')}</div>` });

    // Ecossistema: áreas e territórios
    const areas = Object.entries(ICM.C.AREAS).map(([k, a]) => {
      const ps = d.projetos.filter(p => p.area === k); const tids = d.turmas.filter(t => ps.some(p => p.id === t.projeto_id)).map(t => t.id);
      return { k, ...a, projetos: ps, turmas: tids.length, alunos: new Set(d.mats.filter(m => tids.includes(m.turma_id)).map(m => m.aluno_id)).size, horas: d.aulas.filter(x => tids.includes(x.turma_id)).reduce((s, x) => s + (x.horas || 0), 0) };
    });
    const bairros = contar(d.alunos, a => a.endereco && a.endereco.bairro).slice(0, 9);
    const locais = [...new Set(d.turmas.map(t => t.local).filter(Boolean))];
    add({ sec: S1, titulo: 'Nosso ecossistema', html: () => `${arcos([150, 120, 190])}
      <div class="rv-in"><h1 class="rv-h">Nosso ecossistema</h1>
        <p style="width:150mm">Atuamos em cinco áreas que se complementam: cada criança ou jovem pode participar de mais de uma atividade, e todas são acompanhadas pelo serviço social e pela coordenação pedagógica.</p>
        <div class="rv-cols-3" style="grid-template-columns:repeat(5,1fr);gap:4mm;margin-top:6mm">${areas.map(a => `<div class="rv-area" style="--ac:${a.cor}">${I(a.icon, 26)}<div class="t">${esc(a.nome)}</div><div class="n">${N(a.alunos)}</div><div class="d">pessoas atendidas<br>${a.projetos.length} projeto(s) · ${a.turmas} turma(s)<br>${N(a.horas)} h de atividades</div></div>`).join('')}</div>
        <div class="rv-cols" style="margin-top:8mm"><div><div class="rv-h2">Territórios atendidos</div><div class="rv-mut rv-small" style="margin-bottom:2mm">Bairros de residência das pessoas atendidas</div>${bairros.length ? barras(bairros) : '<p class="rv-mut">Sem bairros informados nos cadastros.</p>'}</div>
          <div><div class="rv-h2">Onde acontecem as atividades</div><div class="rv-logos" style="margin-top:3mm">${locais.map(l => `<span>${esc(l)}</span>`).join('') || '<span>Sede do Instituto</span>'}</div></div></div></div>` });

    // Equipe
    const vinc = contar(d.equipe, p => (ICM.C.VINCULOS || {})[p.vinculo] || p.vinculo);
    const educadores = new Set(d.turmas.map(t => t.professor_id).filter(Boolean)).size;
    const volAtivos = d.voluntarios.filter(v => v.status === 'ativo').length;
    const totEq = d.equipe.length || d.users.filter(u => u.ativo !== false).length;
    add({ sec: S1, titulo: 'Equipe', html: () => `<div class="rv-blob" style="width:330mm;height:330mm;left:-10mm;top:-60mm;opacity:.7"></div>${arcos([-40, 120, 140])}
      <div class="rv-in"><h1 class="rv-h" style="margin-top:14mm">Equipe</h1><p style="width:175mm">Para dar conta de todas as atividades, o ${esc(nome)} conta com profissionais contratados, educadores das turmas e voluntários. Confira a composição da equipe em ${esc(d.ano)}:</p>
        <div class="rv-donut" style="margin-top:8mm;gap:14mm">${donut(vinc.length ? vinc : [{ l: 'Equipe', v: totEq || 1 }], { tam: 70, esp: 14, centro: N(totEq), sub: 'profissionais' })}
          <div><div class="rv-big">${N(totEq)} <span style="font-size:12pt">profissionais</span></div>${vinc.length ? legenda(vinc) : ''}
            <div class="rv-lista-num" style="margin-top:4mm"><div><b>${N(educadores)}</b>educadores à frente das turmas</div><div><b>${N(volAtivos)}</b>voluntários ativos</div><div><b>${N(d.projetos.length)}</b>projetos em execução no ano</div></div></div></div></div>` });

    // Sustentabilidade (ODS) e compliance
    const docsOk = d.docs.filter(x => x.status && x.status.nivel === 'ok').length;
    const diretoria = d.mandatos.filter(m => m.inicio <= d.ate && (!m.fim || m.fim >= d.de));
    add({ sec: S1, titulo: 'Sustentabilidade e compliance', html: () => `<div style="position:absolute;right:0;top:0;bottom:0;width:120mm;background:color-mix(in srgb,var(--c) 6%,#fff);border-radius:120mm 0 0 0"></div>
      <div class="rv-in" style="display:grid;grid-template-columns:1fr 104mm;gap:16mm">
        <div><h1 class="rv-h">Sustentabilidade</h1><p>Nossas ações contribuem diretamente para ${d.inst.ods.length} dos 17 Objetivos de Desenvolvimento Sustentável (ODS) da Agenda 2030 da ONU:</p>
          <div class="rv-ods" style="margin-top:4mm">${d.inst.ods.map(n => `<div style="background:${ODS[n - 1][1]}"><b>${n}</b><span>${esc(ODS[n - 1][0])}</span></div>`).join('')}</div></div>
        <div style="position:relative"><h1 class="rv-h">Compliance</h1><p>${esc(d.inst.compliance)}</p>
          ${d.docs.length ? `<p><b>${docsOk} de ${d.docs.length}</b> certidões e documentos institucionais em dia na data deste relatório.</p>` : ''}
          ${diretoria.length ? `<div class="rv-h2" style="margin-top:4mm">Diretoria e conselhos</div><div class="rv-small">${diretoria.map(m => `<div><b>${esc(m.cargo)}</b> — ${esc(m.nome)}</div>`).join('')}</div>` : ''}</div></div>` });

    // Reconhecimento
    const marcos = linhas(d.inst.marcos).map(l => { const m = l.match(/^(\d{4})\s*\|\s*(.+)$/); if (!m || m[1] > d.ano) return null; const [t, ...r] = m[2].split(/\s+[—–-]\s+/); return { t: `${m[1]} · ${t}`, txt: r.join(' — '), ev: null, ano: m[1] }; }).filter(Boolean).reverse();
    const recCfg = linhas(d.anoCfg.reconhecimentos).map(l => { const [t, ...r] = l.split(/\s+[—–-]\s+/); return { t, txt: r.join(' — '), ev: null }; });
    const recEv = d.eventos.filter(e => ['campeonato', 'participacao', 'apresentacao'].includes(e.tipo) && e.resultado).slice(0, Math.max(0, 4 - recCfg.length)).map(e => ({ t: e.titulo, txt: `${U().fmtDate(e.data)} · ${e.local || ''} — ${e.resultado}`, ev: e.id }));
    const recs = recCfg.concat(recEv, marcos).slice(0, 7);
    if (recs.length) add({ sec: S1, titulo: 'Reconhecimento', html: () => `${arcos([170, 60, 220])}<div class="rv-in"><h1 class="rv-h">Reconhecimento</h1><div style="width:175mm;margin-top:6mm">
      ${recs.map(r => `<div class="rv-rec">${foto(d, { evento: r.ev || undefined })}<div><b>${esc(r.t)}</b><p>${esc(r.txt)}</p></div></div>`).join('')}</div></div>` });

    // ===== Seção: o ano =====
    const S2 = `O ano de ${d.ano}`;
    add({ tipo: 'div', sec: S2, cor: '#0ea5e9', cor2: '#10b981', html: () => `${foto(d)}<div class="t">${esc(S2)}</div>` });

    // Ações sociais
    const atendSociais = d.encaminhamentos.length + d.pareceres.length + d.pia.length;
    const entradasDoacao = d.movEstoque.filter(m => m.tipo === 'entrada' && /doa/i.test(m.origem || ''));
    const itensDoados = entradasDoacao.reduce((s, m) => s + Number(m.quantidade || 0), 0);
    const doadoBens = d.doacoes.filter(x => x.tipo !== 'dinheiro').reduce((s, x) => s + Number(x.valor || 0), 0);
    const publico = d.eventos.reduce((s, e) => s + (Number(e.publico) || 0), 0);
    const horasVol = d.voluntarios.reduce((s, v) => s + (v.horas || []).filter(x => x.data >= d.de && x.data <= d.ate).reduce((q, x) => q + Number(x.horas || 0), 0), 0);
    const kpi = (n, l, sub, txt) => `<div class="rv-kpi"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div><div class="d">${esc(sub)}</div><p>${esc(txt)}</p></div>`;
    add({ sec: S2, titulo: 'Ações sociais', html: () => `${arcos([200, -70, 150])}<div class="rv-in"><h1 class="rv-h">Ações sociais</h1>
      <p style="width:230mm">Toda aula oferecida, todo atendimento às famílias e toda doação recebida fazem parte do nosso compromisso social. Em ${esc(d.ano)}, <b>${N(d.alunos.length)} pessoas</b> foram atendidas diretamente, com <b>${N(d.presencas)} presenças registradas</b> nas atividades.</p>
      <div class="rv-cols-3" style="margin-top:7mm;row-gap:7mm">
        ${kpi(N(d.aulas.length) + ' aulas', 'oferecidas gratuitamente', N(d.horas) + ' horas de atividades', 'Cultura, esporte, meio ambiente, educação e saúde, com plano de aula, chamada e relatório de cada encontro.')}
        ${kpi(N(d.eventos.length) + ' eventos', 'apresentações, campeonatos e ações', N(publico) + ' pessoas de público', 'Momentos em que os alunos mostram o que aprenderam e ampliam seu repertório cultural e esportivo.')}
        ${kpi(N(atendSociais), 'atendimentos socioassistenciais', N(d.encaminhamentos.length) + ' encaminhamentos à rede', 'Planos individuais, pareceres e encaminhamentos para saúde, assistência social e educação.')}
        ${kpi(itensDoados ? N(itensDoados) + ' itens' : R$(doadoBens), 'doações recebidas', 'alimentos, uniformes e materiais', 'Parceiros e comunidade apoiam demandas permanentes e emergenciais das famílias atendidas.')}
        ${kpi(N(horasVol) + ' horas', 'de trabalho voluntário', volAtivos + ' voluntários ativos', 'Profissionais e moradores que doam seu tempo em oficinas, eventos e atendimento às famílias.')}
        ${kpi(N(d.certificados.length), 'certificados emitidos', 'com QR Code de autenticidade', 'Reconhecimento da participação em cursos, masterclasses, eventos e voluntariado.')}
      </div></div>` });

    // Transformação em números
    const orc = d.projetos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const cores = contar(d.alunos, a => a.cor_raca || 'Não informada');
    const gen = contar(d.alunos, a => ({ F: 'Feminino', M: 'Masculino', O: 'Outro' })[a.sexo] || 'Não informado');
    const pcd = d.alunos.filter(a => a.saude && a.saude.deficiencia).length;
    const faixa = a => { const i = U().age(a.nascimento); return i == null ? null : i <= 10 ? 'Até 10 anos' : i <= 14 ? '11 a 14 anos' : i <= 17 ? '15 a 17 anos' : i <= 29 ? '18 a 29 anos' : '30 anos ou mais'; };
    const faixas = ['Até 10 anos', '11 a 14 anos', '15 a 17 anos', '18 a 29 anos', '30 anos ou mais'].map(l => ({ l, v: d.alunos.filter(a => faixa(a) === l).length })).filter(x => x.v);
    add({ tipo: 'cor', sec: S2, titulo: 'Transformação em números', html: () => `<div class="rv-in" style="display:grid;grid-template-columns:1fr 1fr;gap:14mm">
      <div><h1 class="rv-h">Transformação em números</h1><p>Os números a seguir foram consolidados automaticamente a partir dos registros diários de aulas, chamadas, eventos e atendimentos lançados pela equipe.</p>
        <div class="rv-h2" style="margin-top:8mm">NÚMEROS DE ${esc(d.ano)}</div><div class="rv-lista-num">
        <div><b>${R$(orc)}</b> em projetos executados</div><div><b>${N(totEq)}</b> profissionais</div><div><b>${N(d.presencas)}</b> atendimentos (presenças) realizados</div><div><b>${N(d.alunos.length)}</b> pessoas atendidas</div><div><b>${N(new Set(d.alunos.map(a => (a.responsavel && a.responsavel.nome) || a.id)).size)}</b> famílias alcançadas</div></div>
        <div class="rv-h2" style="margin-top:8mm">Faixa etária</div>${barras(faixas)}</div>
      <div><div class="rv-h2">Quem faz parte do ${esc(nome)}</div>
        <div class="rv-small rv-mut" style="margin:3mm 0 1mm">Distribuição por cor/raça</div><div class="rv-donut">${donut(cores.map((c, k) => ({ ...c, cor: ['#fff', '#a5f3fc', '#facc15', '#f9a8d4', '#86efac', '#c4b5fd'][k % 6] })), { tam: 40, esp: 16 })}${legenda(cores.map((c, k) => ({ ...c, cor: ['#fff', '#a5f3fc', '#facc15', '#f9a8d4', '#86efac', '#c4b5fd'][k % 6] })), d.alunos.length)}</div>
        <div class="rv-small rv-mut" style="margin:6mm 0 1mm">Distribuição por gênero</div>${barras(gen.map(g => ({ ...g })), v => U().pct(v, d.alunos.length) + '%')}
        <div class="rv-small rv-mut" style="margin:6mm 0 1mm">Pessoas com deficiência</div><div class="rv-donut">${donut([{ l: 'PcD', v: pcd, cor: '#facc15' }, { l: 'Sem deficiência', v: Math.max(0, d.alunos.length - pcd), cor: 'rgba(255,255,255,.85)' }], { tam: 26, esp: 18 })}<div class="rv-big" style="color:#fff">${U().pct(pcd, d.alunos.length)}%<div class="rv-small rv-mut" style="font-weight:700">${N(pcd)} pessoa(s) com deficiência</div></div></div></div></div>` });

    // Fontes de recursos
    const fontes = Object.entries(ICM.C.FONTES).map(([k, l]) => ({ k, l, v: d.projetos.filter(p => p.fonte === k).reduce((s, p) => s + (Number(p.valor) || 0), 0), ps: d.projetos.filter(p => p.fonte === k) })).filter(f => f.v || f.ps.length);
    const doadoPF = d.doacoes.filter(x => x.tipo === 'dinheiro').reduce((s, x) => s + Number(x.valor || 0), 0) + d.doacoesOnline.reduce((s, x) => s + Number(x.valor || 0), 0);
    add({ sec: S2, titulo: 'Principais fontes de recursos', html: () => `${foto(d, {}, '', 'position:absolute;inset:0;border-radius:0')}
      <div style="position:absolute;left:14mm;top:20mm;width:96mm;background:#fff;padding:9mm;border-radius:2mm;box-shadow:0 10px 40px rgba(0,0,0,.2)"><h1 class="rv-h">Principais fontes de recursos</h1>
        <p>Para realizar e manter suas atividades, o ${esc(nome)} conta com recursos de diferentes fontes: termos de fomento e colaboração com o poder público, leis de incentivo, emendas parlamentares, patrocínios e doações. Em ${esc(d.ano)}, <b>${R$(orc)}</b> estiveram vinculados aos projetos em execução${doadoPF ? `, além de <b>${R$(doadoPF)}</b> em doações em dinheiro` : ''}.</p>
        <div class="rv-donut" style="margin-top:3mm">${donut(fontes.map(f => ({ l: f.l, v: f.v })), { tam: 30, esp: 16 })}${legenda(fontes.map(f => ({ l: f.l, v: f.v })), orc)}</div></div>` });
    add({ sec: S2, titulo: 'Recursos por projeto', html: () => `${arcos([180, 90, 200])}<div class="rv-in"><h1 class="rv-h">Recursos por projeto</h1>
      <div class="rv-cols" style="gap:8mm 14mm">${fontes.map(f => `<div><div class="rv-h2">${esc(f.l)} — ${R$(f.v)}</div>${f.ps.map(p => `<div class="rv-small" style="margin-bottom:1.5mm"><b>${esc(p.nome)}</b> · ${esc(p.financiador || '')}${p.numero_termo ? ` (${esc(p.numero_termo)})` : ''}${p.valor ? ` — ${R$(p.valor)}` : ''}</div>`).join('')}</div>`).join('')}</div>
      <p class="rv-small rv-mut" style="margin-top:6mm">Valores aprovados nos instrumentos vigentes em ${esc(d.ano)}. A execução financeira detalhada consta nas prestações de contas de cada instrumento, disponíveis mediante solicitação.</p></div>` });

    // Parcerias
    const pj = d.doadores.filter(x => x.tipo === 'PJ');
    const porCat = contar(pj, x => x.categoria || 'Empresas').map(c => ({ ...c, nomes: pj.filter(x => (x.categoria || 'Empresas') === c.l).map(x => x.nome) }));
    const financiadores = [...new Set(d.projetos.map(p => p.financiador).filter(Boolean))];
    const rede = [...new Set(d.encaminhamentos.map(e => e.orgao).filter(Boolean))];
    const extras = [...new Set(linhas(d.anoCfg.parceiros).concat(linhas(d.inst.parceiros)))];
    add({ sec: S2, titulo: 'Parcerias e relacionamento', html: () => `<div class="rv-in" style="display:grid;grid-template-columns:1fr 1fr;gap:12mm">
      <div><h1 class="rv-h">Parcerias e relacionamento</h1><p>Em ${esc(d.ano)}, as atividades contaram com a participação de ${N(financiadores.length + pj.length + extras.length)} financiadores, empresas e instituições parceiras, além da rede pública de proteção social, que recebe nossos encaminhamentos.</p>
        <div class="rv-h2" style="margin-top:5mm">Financiadores dos projetos</div><div class="rv-logos">${financiadores.map(f => `<span>${esc(f)}</span>`).join('') || '<span>—</span>'}</div>
        ${rede.length ? `<div class="rv-h2" style="margin-top:5mm">Rede de proteção e serviços públicos</div><div class="rv-logos">${rede.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}</div>
      <div style="padding-top:12mm">${porCat.map(c => `<div class="rv-h2">${esc(c.l)}</div><p class="rv-small">${c.nomes.map(esc).join(', ')}</p>`).join('')}
        ${extras.length ? `<div class="rv-h2">Outros parceiros</div><p class="rv-small">${extras.map(esc).join(', ')}</p>` : ''}
        ${foto(d, {}, '', 'height:62mm;margin-top:4mm')}</div></div>` });

    // Presença na mídia (só se informada)
    const md = d.anoCfg.midia || {};
    const redes = [['Instagram', md.instagram_seguidores, md.instagram_alcance, md.instagram_interacoes], ['Facebook', md.facebook_seguidores, md.facebook_alcance, md.facebook_interacoes], ['YouTube', md.youtube_inscritos, md.youtube_views, ''], ['Site', md.site_acessos, '', '']].filter(r => r[1] || r[2]);
    if (redes.length || md.imprensa || md.texto) add({ sec: S2, titulo: 'Presença na mídia', html: () => `${arcos([210, -40, 130])}<div class="rv-in"><h1 class="rv-h">Presença na mídia</h1><p style="width:240mm">${esc(md.texto || `Para divulgar as atividades e prestar contas à sociedade, o ${nome} mantém presença nas redes sociais e na imprensa local.`)}</p>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:5mm;margin-top:6mm"><div class="rv-card solid" style="display:grid;grid-template-columns:1fr 1fr;gap:5mm">${redes.map(r => `<div><div class="rv-h2">${r[0]}</div><div class="rv-small">${r[1] ? `<b>${esc(r[1])}</b> ${r[0] === 'YouTube' ? 'inscritos' : r[0] === 'Site' ? 'acessos' : 'seguidores'}<br>` : ''}${r[2] ? `<b>${esc(r[2])}</b> ${r[0] === 'YouTube' ? 'visualizações' : 'alcance'}<br>` : ''}${r[3] ? `<b>${esc(r[3])}</b> interações` : ''}</div></div>`).join('')}</div>
        <div class="rv-card solid"><div class="rv-h2">Imprensa</div><div class="rv-small">${paragrafos(md.imprensa || '—')}</div></div></div></div>` });

    // Destaques do ano
    const dest = linhas(d.anoCfg.destaques);
    const evFoto = d.eventos.filter(e => (e.fotos || []).length).slice(-4);
    const evDest = (evFoto.length ? evFoto : d.eventos.slice(-4));
    add({ sec: S2, titulo: `Destaques de ${d.ano}`, html: () => `${arcos([60, 130, 170], [150, 150, 150])}<div class="rv-in"><h1 class="rv-h">Destaques de ${esc(d.ano)}</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:4mm"><ul class="rv-bul">${(dest.length ? dest : evDest.map(e => `${U().fmtDate(e.data)} — ${e.titulo}${e.resultado ? ': ' + e.resultado : ''}`)).map((t, i) => `<li style="color:${['#dc2626', '#1c2440', '#2563eb', '#16a34a', '#ea580c'][i % 5]}">${esc(t)}</li>`).join('')}</ul>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;height:140mm">${evDest.slice(0, 4).map(e => `<div style="position:relative">${foto(d, { evento: e.id }, '', 'position:absolute;inset:0').replace('</figure>', `<figcaption>${esc(e.titulo)}</figcaption></figure>`)}</div>`).join('')}</div></div></div>` });

    // ===== Uma seção por área de atuação =====
    for (const a of areas.filter(x => x.projetos.length && x.turmas)) {
      const S = a.nome;
      const cor2 = { cultura: '#ec4899', esporte: '#facc15', meio_ambiente: '#22c3ee', educacao: '#22c3ee', saude: '#8b5cf6' }[a.k] || CIANO;
      add({ tipo: 'div', sec: S, cor: a.cor, cor2, html: () => `${foto(d, { area: a.k })}<div class="t">${esc(a.nome)}</div><div class="s">${a.projetos.length} projeto(s) · ${N(a.alunos)} pessoas atendidas</div>` });
      const tids = d.turmas.filter(t => a.projetos.some(p => p.id === t.projeto_id));
      const aulasA = d.aulas.filter(x => tids.some(t => t.id === x.turma_id));
      const evA = d.eventos.filter(e => a.projetos.some(p => p.id === e.projeto_id));
      const idsA = new Set(d.mats.filter(m => tids.some(t => t.id === m.turma_id)).map(m => m.aluno_id));
      const alA = d.alunos.filter(x => idsA.has(x.id));
      const freqA = (() => { let P = 0, T = 0; aulasA.forEach(x => Object.values(x.presencas || {}).forEach(v => { T++; if (v !== 'F') P++; })); return T ? Math.round(P / T * 100) : 0; })();
      add({ sec: S, titulo: `${a.nome}: projetos`, cor: a.cor, cor2, html: () => `${arcos([200, 100, 170])}<div class="rv-in" style="bottom:70mm"><h1 class="rv-h">Projetos de ${esc(a.nome.toLowerCase())}</h1>
        <div style="display:grid;grid-template-columns:1fr 92mm;gap:10mm">
          <div>${a.projetos.map(p => `<div style="margin-bottom:5mm"><div class="rv-h2">${esc(p.nome)}</div><p class="rv-small" style="margin-bottom:1mm">${esc(p.objetivo_geral || p.justificativa || '')}</p><div class="rv-small rv-mut">${esc(p.financiador || '')}${p.local ? ' · ' + esc(p.local) : ''}</div></div>`).join('')}</div>
          <div class="rv-card"><div class="rv-h2">Estrutura em ${esc(d.ano)}</div><div class="rv-lista-num">
            <div><b>${N(alA.length)}</b>pessoas atendidas</div><div><b>${tids.length}</b>turmas</div><div><b>${N(aulasA.length)}</b>aulas realizadas</div><div><b>${N(a.horas)}</b>horas de atividades</div>
            <div><b>${freqA}%</b>de frequência média</div><div><b>${evA.length}</b>eventos e apresentações</div><div><b>${new Set(tids.map(t => t.professor_id)).size}</b>educadores</div>
            <div><b>${R$(a.projetos.reduce((s, p) => s + (Number(p.valor) || 0), 0))}</b>em recursos</div></div></div></div></div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:62mm;display:grid;grid-template-columns:repeat(3,1fr);gap:2mm">${[0, 1, 2].map(() => foto(d, { area: a.k }, '', 'border-radius:0')).join('')}</div>` });
      add({ sec: S, titulo: `${a.nome}: atendimentos`, cor: a.cor, cor2, html: () => `<div class="rv-in"><h1 class="rv-h">Atendimentos</h1>
        <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:10mm">
          <div><table class="rv-tab"><thead><tr><th>Turma</th><th class="c">Alunos</th><th class="c">Aulas</th><th class="c">Horas</th><th class="c">Freq.</th></tr></thead><tbody>
            ${tids.map(t => { const ax = d.aulas.filter(x => x.turma_id === t.id); let P = 0, T = 0; ax.forEach(x => Object.values(x.presencas || {}).forEach(v => { T++; if (v !== 'F') P++; })); return `<tr><td>${esc(t.nome)}</td><td class="c">${d.mats.filter(m => m.turma_id === t.id).length}</td><td class="c">${ax.length}</td><td class="c">${N(ax.reduce((s, x) => s + (x.horas || 0), 0))}</td><td class="c">${T ? Math.round(P / T * 100) + '%' : '—'}</td></tr>`; }).join('')}</tbody>
            <tfoot><tr><td>Total</td><td class="c">${N(alA.length)}</td><td class="c">${N(aulasA.length)}</td><td class="c">${N(a.horas)}</td><td class="c">${freqA}%</td></tr></tfoot></table>
            ${evA.length ? `<div class="rv-h2" style="margin-top:6mm">Eventos e apresentações</div>${evA.slice(0, 6).map(e => `<div class="rv-small"><b>${esc(U().fmtDate(e.data))}</b> — ${esc(e.titulo)}${e.publico ? ` · ${N(e.publico)} pessoas` : ''}</div>`).join('')}` : ''}</div>
          <div><div class="rv-h2">Perfil dos atendidos</div><div class="rv-small rv-mut" style="margin:2mm 0 1mm">Faixa etária</div>${barras(['Até 10 anos', '11 a 14 anos', '15 a 17 anos', '18 a 29 anos', '30 anos ou mais'].map(l => ({ l, v: alA.filter(x => faixa(x) === l).length })).filter(x => x.v))}
            <div class="rv-small rv-mut" style="margin:4mm 0 1mm">Gênero</div><div class="rv-donut">${donut(contar(alA, x => ({ F: 'Feminino', M: 'Masculino', O: 'Outro' })[x.sexo] || 'Não informado'), { tam: 28, esp: 18 })}${legenda(contar(alA, x => ({ F: 'Feminino', M: 'Masculino', O: 'Outro' })[x.sexo] || 'Não informado'), alA.length)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;height:42mm;margin-top:4mm">${foto(d, { area: a.k })}${foto(d, { area: a.k })}</div></div></div></div>` });
    }

    // ===== Comunidade =====
    const S3 = 'Comunidade';
    const porMes = {};
    d.voluntarios.forEach(v => (v.horas || []).filter(x => x.data >= d.de && x.data <= d.ate).forEach(x => { const m = +x.data.slice(5, 7); (porMes[m] = porMes[m] || []).push({ ...x, nome: v.nome }); }));
    if (Object.keys(porMes).length) add({ sec: S3, titulo: 'Voluntariado', cor: '#0891b2', html: () => `${arcos([-30, 140, 120])}<div class="rv-in" style="display:grid;grid-template-columns:1fr 1.3fr;gap:12mm">
      <div><h1 class="rv-h">Voluntariado</h1><p>Em ${esc(d.ano)}, <b>${volAtivos} voluntários</b> dedicaram <b>${N(horasVol)} horas</b> às atividades do ${esc(nome)}, em oficinas, eventos, atendimento às famílias e apoio administrativo.</p>${foto(d, {}, '', 'height:90mm;margin-top:4mm')}</div>
      <div class="rv-mes" style="columns:2;column-gap:8mm">${Object.keys(porMes).sort((x, y) => x - y).map(m => `<div style="break-inside:avoid"><b>${esc(U().MESES[m - 1].replace(/^./, c => c.toUpperCase()))}</b>${porMes[m].slice(0, 5).map(x => `<div><b style="display:inline;color:inherit">${esc(x.nome)}</b> — ${esc(x.atividade || 'atividade voluntária')}<br><span class="rv-mut">Total de horas: ${N(x.horas)}h</span></div>`).join('')}</div>`).join('')}</div></div>` });

    const pf = d.doacoes.filter(x => { const dd = d.doadores.find(y => y.id === x.doador_id); return dd && dd.tipo === 'PF'; });
    const nps = (d.pesquisas.find(p => p.res && p.res.nps != null) || {}).res;
    const assoc = d.associados.filter(a => a.status === 'ativo').length;
    const partic = d.reunioes.length ? Math.round(d.reunioes.reduce((s, r) => { const v = Object.values(r.presencas || {}); return s + (v.length ? v.filter(Boolean).length / v.length : 0); }, 0) / d.reunioes.length * 100) : 0;
    add({ sec: S3, titulo: 'Famílias, doadores e comunidade', cor: '#0891b2', html: () => `${foto(d, {}, '', 'position:absolute;left:0;top:0;bottom:0;width:130mm;border-radius:0')}
      <div style="position:absolute;left:142mm;right:16mm;top:18mm;bottom:16mm"><h1 class="rv-h">Famílias, doadores e comunidade</h1>
        <div class="rv-cols" style="grid-template-columns:1fr;gap:5mm"><div class="rv-card"><div class="rv-h2">Doações de pessoas físicas</div><div class="rv-lista-num"><div><b>${N(new Set(pf.map(x => x.doador_id)).size + new Set(d.doacoesOnline.map(x => x.email || x.nome)).size)}</b>doadores</div><div><b>${N(pf.length + d.doacoesOnline.length)}</b>doações</div><div><b>${d.campanhas.filter(c => (c.inicio || '') <= d.ate && (c.fim || '9') >= d.de).length}</b>campanhas</div><div><b>${R$(pf.reduce((s, x) => s + Number(x.valor || 0), 0) + d.doacoesOnline.reduce((s, x) => s + Number(x.valor || 0), 0))}</b>captados</div></div></div>
          <div class="rv-card"><div class="rv-h2">Participação das famílias</div><div class="rv-lista-num"><div><b>${d.reunioes.length}</b>reuniões de pais (${partic}% de presença)</div><div><b>${nps && nps.nps != null ? nps.nps : '—'}</b>NPS de satisfação das famílias</div><div><b>${N(assoc)}</b>famílias associadas</div><div><b>${N(d.espera.length)}</b>crianças na lista de espera</div></div></div></div>
        ${d.espera.length ? `<p class="rv-small" style="margin-top:5mm">A lista de espera com ${N(d.espera.length)} inscritos mostra a demanda reprimida no território e a necessidade de ampliar vagas.</p>` : ''}</div>` });

    // ===== Prestação de contas =====
    const S4 = 'Prestação de contas';
    const rec = d.lancamentos.filter(x => x.tipo === 'receita' && ['recebido', 'pago'].includes(x.status));
    const desp = d.lancamentos.filter(x => x.tipo === 'despesa' && ['pago', 'recebido'].includes(x.status));
    const totR = rec.reduce((s, x) => s + Number(x.valor || 0), 0), totD = desp.reduce((s, x) => s + Number(x.valor || 0), 0);
    const catD = contar(desp, x => x.rubrica || 'outras').map(c => ({ l: (ICM.C.RUBRICAS || {})[c.l] || c.l, v: desp.filter(x => (x.rubrica || 'outras') === c.l).reduce((s, x) => s + Number(x.valor || 0), 0) })).sort((a, b) => b.v - a.v).slice(0, 7);
    add({ sec: S4, titulo: 'Transparência e prestação de contas', html: () => `${arcos([200, 110, 180])}<div class="rv-in"><h1 class="rv-h">Transparência e prestação de contas</h1>
      ${d.lancamentos.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12mm"><div><div class="rv-cols" style="gap:4mm"><div class="rv-card"><div class="rv-small rv-mut">Receitas realizadas</div><div class="rv-big" style="font-size:17pt">${R$(totR)}</div></div><div class="rv-card"><div class="rv-small rv-mut">Despesas realizadas</div><div class="rv-big" style="font-size:17pt">${R$(totD)}</div></div></div>
        <div class="rv-h2" style="margin-top:6mm">Onde os recursos foram aplicados</div>${barras(catD, v => R$(v))}</div>
        <div><p>Todas as receitas e despesas são lançadas no ICM Sistema por projeto, com comprovante anexado, conciliação bancária e registro de quem fez cada lançamento.</p>` : '<div style="width:200mm">'}
        <p class="rv-small">Declaramos que as informações deste relatório correspondem aos registros de aulas, frequência, fotos, atendimentos e movimentação financeira lançados no ICM Sistema, cujos históricos são preservados e auditáveis. Dados pessoais foram omitidos conforme a LGPD (Lei 13.709/2018).</p>
        <div class="rv-assin"><div>Presidência</div><div>Direção executiva</div></div>
        <p class="rv-small rv-mut" style="margin-top:8mm">Código de autenticidade: <span class="rv-cod" data-codigo>—</span></p></div>${d.lancamentos.length ? '</div>' : ''}</div>` });

    // Contracapa
    add({ tipo: 'fim', html: () => `<div class="orb" style="width:260mm;height:260mm;right:-90mm;top:-60mm"></div><div class="orb" style="width:120mm;height:120mm;left:-40mm;bottom:-50mm"></div>
      <div style="position:relative">${logo('branca', 'width:150mm')}
      <div style="margin-top:4mm;font-size:10pt;opacity:.9;line-height:1.7">${[d.inst.razao, d.inst.cnpj ? 'CNPJ ' + d.inst.cnpj : '', d.inst.endereco || d.inst.cidade, [d.inst.telefone, d.inst.email].filter(Boolean).join(' · '), [d.inst.site, d.inst.instagram].filter(Boolean).join(' · ')].filter(Boolean).map(esc).join('<br>')}</div></div>` });

    // Índice: títulos agrupados por seção, com o número da página
    const grupos = [];
    P.forEach((o, i) => { if (!o.titulo) return; let g = grupos.find(x => x.sec === o.sec); if (!g) grupos.push(g = { sec: o.sec, cor: o.cor, itens: [] }); g.itens.push([o.titulo, i + 1]); });
    indice.html = () => `${arcos([-50, 110, 160], [230, -40, 120])}<div class="rv-in"><h1 class="rv-h" style="font-size:28pt;margin:8mm 0 0 30mm">Índice</h1>
      ${logo('escura', 'position:absolute;right:4mm;top:2mm;height:24mm')}<div class="rv-indice">${grupos.map(g => `<div class="g" style="--gc:${g.cor || AZUL}"><b>${esc(g.sec)}</b><div>${g.itens.map(([t, n]) => `${esc(t)} &nbsp;${n}`).join('<br>')}</div></div>`).join('')}</div></div>`;

    return P.map((o, i) => pagina(o, i + 1)).join('');
  }

  // ---------- Visualizador (paisagem, ajusta à tela) ----------
  async function visualizar(r) {
    const user = ICM.auth.user(); const em = new Date();
    const codigo = (await U().sha256(r.html + em.toISOString() + user.id)).slice(0, 24).toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1);
    await api().audit('gerar_relatorio', 'relatorios', codigo, r.title);
    const v = document.createElement('div');
    v.className = 'report-viewer rv-viewer';
    v.innerHTML = `<style>@page{size:A4 landscape;margin:0}</style><div class="report-toolbar">
      <button class="btn btn-sm" data-x aria-label="Voltar">${I('arrowLeft', 16)} Voltar</button>
      <div class="title truncate">${esc(r.title)}</div>
      <button class="btn btn-sm" data-dl>${I('download', 16)} Baixar HTML</button>
      <button class="btn btn-sm btn-primary" data-pr>${I('printer', 16)} Imprimir / Salvar PDF</button><button class="btn btn-sm btn-icon" data-x2 aria-label="Fechar" title="Fechar (Esc)">${I('x', 18)}</button></div>
      <div class="report-scroll"><div class="rv-wrap">${r.html}</div></div>`;
    v.querySelectorAll('[data-codigo]').forEach(e => { e.textContent = codigo; });
    document.body.appendChild(v); document.body.style.overflow = 'hidden';
    const wrap = v.querySelector('.rv-wrap'), scroll = v.querySelector('.report-scroll');
    const ajustar = () => { wrap.style.zoom = String(Math.min(1, (scroll.clientWidth - 24) / wrap.offsetWidth * (parseFloat(wrap.style.zoom) || 1))); };
    wrap.style.zoom = '1'; ajustar(); window.addEventListener('resize', ajustar);
    v.querySelectorAll('.rv-page').forEach((p, i) => { p.style.animationDelay = Math.min(i, 6) * 0.08 + 's'; });
    const fechar = () => { v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); window.removeEventListener('resize', ajustar); };
    const onKey = e => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);
    v.querySelector('[data-x]').addEventListener('click', fechar);
    v.querySelector('[data-x2]').addEventListener('click', fechar);
    v.querySelector('[data-pr]').addEventListener('click', () => window.print());
    v.querySelector('[data-dl]').addEventListener('click', async () => {
      const css = await fetch('css/revista.css').then(x => x.text()).catch(() => '');
      // As fotos vão embutidas no arquivo (os links do banco expiram em 1 hora)
      const copia = wrap.cloneNode(true); copia.style.zoom = '';
      for (const img of copia.querySelectorAll('img')) {
        if (!/^https?:/.test(img.src)) continue;
        try { const b = await fetch(img.src).then(x => x.blob()); img.src = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }); } catch (e) { /* mantém o link */ }
      }
      const blob = new Blob([`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>body{margin:0;background:#5d6683;padding:24px 0}${css}@media print{body{background:#fff;padding:0}}</style></head><body>${copia.outerHTML}</body></html>`], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = r.file + '.html'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  // ---------- Editor dos textos do relatório ----------
  async function editarTextos(ano) {
    const cfg = await api().config.get(); const rel = cfg.relatorio || {};
    const base = textosPadrao({ ano, alunos: [], turmas: [], projetos: [], horas: 0, aulas: [] });
    const inst = { ...base, ...(rel.inst || {}) }; const a = (rel.anos || {})[ano] || {}; const md = a.midia || {};
    const F = o => ICM.ui.field(o);
    const m = ICM.ui.modal({
      title: 'Textos do relatório anual', size: 'wide',
      body: `<form class="col" data-f>
        <div class="xs muted">Os números são calculados pelo sistema. Aqui ficam os textos institucionais (valem para todos os anos) e os destaques de ${esc(ano)}. Campo vazio = texto padrão.</div>
        <div class="section-title mt-2">Instituição</div>
        <div class="grid grid-3">${F({ name: 'nome', label: 'Nome da instituição', value: inst.nome })}${F({ name: 'razao', label: 'Razão social', value: inst.razao })}${F({ name: 'cnpj', label: 'CNPJ', value: inst.cnpj })}
          ${F({ name: 'cidade', label: 'Cidade / UF', value: inst.cidade })}${F({ name: 'endereco', label: 'Endereço', value: inst.endereco })}${F({ name: 'telefone', label: 'Telefone', value: inst.telefone })}
          ${F({ name: 'email', label: 'E-mail', value: inst.email })}${F({ name: 'site', label: 'Site', value: inst.site })}${F({ name: 'instagram', label: 'Instagram', value: inst.instagram })}</div>
        ${F({ name: 'apresentacao', label: 'Quem somos (história e apresentação)', type: 'textarea', rows: 6, value: (rel.inst || {}).apresentacao || '', placeholder: 'Deixe em branco para o texto automático com os números do ano' })}
        <div class="grid grid-2">${F({ name: 'missao', label: 'Missão', type: 'textarea', rows: 3, value: inst.missao })}${F({ name: 'visao', label: 'Visão', type: 'textarea', rows: 3, value: inst.visao })}
          ${F({ name: 'valores', label: 'Valores', type: 'textarea', rows: 3, value: inst.valores })}${F({ name: 'relacionamento', label: 'Relacionamento com a sociedade', type: 'textarea', rows: 3, value: inst.relacionamento })}</div>
        ${F({ name: 'compliance', label: 'Compliance e governança', type: 'textarea', rows: 3, value: inst.compliance })}
        ${F({ name: 'marcos', label: 'Linha do tempo e certificações (uma por linha: Ano | Título — descrição)', type: 'textarea', rows: 5, value: inst.marcos })}
        ${F({ name: 'parceirosInst', label: 'Parceiros e patrocinadores permanentes (um por linha)', type: 'textarea', rows: 3, value: inst.parceiros })}
        <div><label>Objetivos de Desenvolvimento Sustentável (ODS) que a instituição atende</label><div class="row wrap mt-2" style="gap:6px">${ODS.map(([n, c], i) => `<label class="badge" style="cursor:pointer;background:${c};color:#fff;gap:6px"><input type="checkbox" data-ods value="${i + 1}" ${inst.ods.includes(i + 1) ? 'checked' : ''}> ${i + 1}. ${esc(n)}</label>`).join('')}</div></div>
        <div class="section-title mt-4">Ano de ${esc(ano)}</div>
        ${F({ name: 'mensagem', label: 'Mensagem de abertura (aparece em destaque em "Quem somos")', type: 'textarea', rows: 2, value: a.mensagem || '' })}
        ${F({ name: 'destaques', label: 'Destaques do ano (um por linha)', type: 'textarea', rows: 4, value: a.destaques || '', placeholder: 'Ex.: Inauguração da nova sala de música, com apoio da empresa X' })}
        ${F({ name: 'reconhecimentos', label: 'Prêmios e reconhecimentos (um por linha: Título — descrição)', type: 'textarea', rows: 3, value: a.reconhecimentos || '', placeholder: 'Ex.: Selo Municipal de Direitos Humanos — concedido pela prefeitura pelo trabalho com...' })}
        ${F({ name: 'parceiros', label: 'Outros parceiros e apoiadores (um por linha)', type: 'textarea', rows: 2, value: a.parceiros || '' })}
        <div class="section-title mt-2">Presença na mídia em ${esc(ano)} (opcional)</div>
        <div class="grid grid-3">${F({ name: 'm.instagram_seguidores', label: 'Instagram — seguidores', value: md.instagram_seguidores || '' })}${F({ name: 'm.instagram_alcance', label: 'Instagram — alcance', value: md.instagram_alcance || '' })}${F({ name: 'm.instagram_interacoes', label: 'Instagram — interações', value: md.instagram_interacoes || '' })}
          ${F({ name: 'm.facebook_seguidores', label: 'Facebook — seguidores', value: md.facebook_seguidores || '' })}${F({ name: 'm.facebook_alcance', label: 'Facebook — alcance', value: md.facebook_alcance || '' })}${F({ name: 'm.facebook_interacoes', label: 'Facebook — interações', value: md.facebook_interacoes || '' })}
          ${F({ name: 'm.youtube_inscritos', label: 'YouTube — inscritos', value: md.youtube_inscritos || '' })}${F({ name: 'm.youtube_views', label: 'YouTube — visualizações', value: md.youtube_views || '' })}${F({ name: 'm.site_acessos', label: 'Site — acessos', value: md.site_acessos || '' })}</div>
        ${F({ name: 'm.imprensa', label: 'Imprensa (matérias, entrevistas, veículos)', type: 'textarea', rows: 2, value: md.imprensa || '' })}
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar textos</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ICM.ui.busy(e.currentTarget, async () => {
      const f = m.$('[data-f]'); const v = n => (f.elements[n] ? f.elements[n].value.trim() : '');
      const novoInst = {}; ['nome', 'razao', 'cnpj', 'cidade', 'endereco', 'telefone', 'email', 'site', 'instagram', 'apresentacao', 'missao', 'visao', 'valores', 'relacionamento', 'compliance', 'marcos'].forEach(k => { if (v(k)) novoInst[k] = v(k); });
      if (v('parceirosInst')) novoInst.parceiros = v('parceirosInst');
      novoInst.ods = [...f.querySelectorAll('[data-ods]:checked')].map(x => +x.value);
      const midia = {}; ['instagram_seguidores', 'instagram_alcance', 'instagram_interacoes', 'facebook_seguidores', 'facebook_alcance', 'facebook_interacoes', 'youtube_inscritos', 'youtube_views', 'site_acessos', 'imprensa'].forEach(k => { if (v('m.' + k)) midia[k] = v('m.' + k); });
      const anos = { ...(rel.anos || {}), [ano]: { mensagem: v('mensagem'), destaques: v('destaques'), reconhecimentos: v('reconhecimentos'), parceiros: v('parceiros'), midia } };
      await ICM.ui.run(() => api().config.set({ relatorio: { inst: novoInst, anos } }), 'Textos do relatório salvos');
      m.close();
    }).catch(() => { }));
  }

  // ---------- Registro no motor de relatórios ----------
  ICM.reports.register('osc_anual', {
    title: 'Relatório anual de atividades',
    steps: ['Reunindo projetos e turmas', 'Somando aulas, horas e presenças', 'Traçando o perfil das pessoas atendidas', 'Consolidando parceiros, doações e voluntariado', 'Escolhendo as fotos do ano', 'Diagramando a revista'],
    build: async ({ ano }) => {
      fotoIdx = 0;
      const d = await coletar(ano || String(new Date().getFullYear()));
      return { title: `Relatório anual de atividades ${d.ano}`, html: paginas(d), file: `relatorio-anual-atividades-${d.ano}`, viewer: visualizar };
    },
    form: async (F, { ano, anos }) => `${F({ name: 'ano', label: 'Ano', type: 'select', options: anos, value: ano })}
      <div class="xs muted">Formato revista (A4 paisagem), com capa, índice, áreas de atuação, números, parceiros e prestação de contas. Fotos e números vêm das aulas e eventos lançados.</div>
      ${ICM.auth.can('usuarios.gerenciar') ? `<button type="button" class="btn btn-sm mt-2" data-textos>${I('edit', 14)} Textos do relatório (missão, destaques, prêmios…)</button>` : ''}`
  });
  // O botão "Textos do relatório" fica dentro do diálogo de parâmetros
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-textos]'); if (!b) return;
    const sel = b.closest('form') && b.closest('form').querySelector('[name=ano]');
    editarTextos(sel ? sel.value : String(new Date().getFullYear()));
  });
  ICM.reports.relatorioAnual = { editarTextos };
})();
