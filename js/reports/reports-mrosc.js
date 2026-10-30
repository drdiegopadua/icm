/* Relatório de Execução do Objeto — prestação de contas de parcerias (MROSC)
   Lei 13.019/2014, art. 66, I, e Decreto 8.726/2016, art. 55: ações desenvolvidas, comparativo
   de metas propostas x resultados, documentos que comprovam a execução (listas de presença,
   fotos), satisfação do público, impactos, contrapartida e resumo da execução financeira.
   Serve também para Lei Rouanet, LICC e editais com o mesmo formato. */
(function () {
  const U = () => ICM.util;
  const h = () => ICM.reports.h;
  const api = () => ICM.api;
  const esc = s => U().esc(s);
  const tenta = async (fn, padrao) => { try { return await fn(); } catch (e) { return padrao; } };
  const txt = t => String(t || '').split(/\n+/).filter(Boolean).map(p => `<p style="text-align:justify">${esc(p)}</p>`).join('');

  ICM.reports.register('execucao_objeto', {
    title: 'Relatório de execução do objeto (MROSC)',
    steps: ['Carregando projeto e instrumento', 'Descrevendo as ações realizadas', 'Comparando metas e resultados', 'Montando listas de presença', 'Reunindo fotos e satisfação do público', 'Resumindo a execução financeira', 'Montando relatório'],
    form: async (F, { optsP, preset }) => `${F({ name: 'projeto_id', label: 'Projeto / parceria', type: 'select', options: optsP, value: preset.projeto_id })}
      <div class="grid grid-2">${F({ name: 'de', label: 'Período — de', type: 'date', value: '' })}${F({ name: 'ate', label: 'até', type: 'date', value: '' })}</div>
      ${F({ name: 'tipo', label: 'Relatório', type: 'select', options: [['parcial', 'Parcial (parcela / período)'], ['final', 'Final (toda a vigência)']] })}
      <div class="xs muted">Datas em branco = vigência completa do projeto. Os campos abaixo são opcionais e entram no relatório como texto da OSC.</div>
      ${F({ name: 'impactos', label: 'Impactos e benefícios observados', type: 'textarea', rows: 3, placeholder: 'Mudanças percebidas nos participantes, famílias e comunidade…' })}
      ${F({ name: 'dificuldades', label: 'Dificuldades e como foram resolvidas', type: 'textarea', rows: 2 })}
      ${F({ name: 'sustentabilidade', label: 'Continuidade / sustentabilidade das ações', type: 'textarea', rows: 2 })}`,
    build: async ({ projeto_id, de, ate, tipo, impactos, dificuldades, sustentabilidade }) => {
      const { sec, head, meta, kpis, table, photos, signs } = h();
      const p = await api().projetos.get(projeto_id);
      de = de || p.inicio; ate = ate || p.fim;
      const users = await api().usuarios.list();
      const nome = id => (users.find(u => u.id === id) || {}).nome || '—';
      const turmas = await api().turmas.list(projeto_id);
      const s = await api().projetos.stats(projeto_id, { de, ate });
      const aulas = [];
      for (const t of turmas) (await api().aulas.list(t.id)).filter(a => a.status === 'realizada' && a.data >= de && a.data <= ate).forEach(a => aulas.push({ ...a, turma: t }));
      aulas.sort((a, b) => a.data.localeCompare(b.data));
      const eventos = (await api().eventos.list()).filter(e => e.projeto_id === projeto_id && e.data >= de && e.data <= ate).sort((a, b) => a.data.localeCompare(b.data));
      const mats = []; for (const t of turmas) (await api().turmas.alunos(t.id)).forEach(m => mats.push({ ...m, turma: t }));
      const saidas = mats.filter(m => m.saida && m.saida >= de && m.saida <= ate);
      const pesq = (await tenta(() => api().pesquisas.list(), [])).filter(x => (!x.projeto_id || x.projeto_id === projeto_id) && x.res && x.res.n);
      const lanc = (await tenta(() => api().raw('fin_lancamentos'), [])).filter(l => l.projeto_id === projeto_id && l.data >= de && l.data <= ate && ['pago', 'recebido'].includes(l.status));
      const fotos = aulas.flatMap(a => (a.fotos || []).map(f => ({ ...f, legenda: `${a.turma.modalidade || a.turma.nome} · ${U().fmtDate(a.data)}` }))).concat(eventos.flatMap(e => (e.fotos || []).map(f => ({ ...f, legenda: e.titulo }))));
      const final = tipo === 'final';

      let html = head(`Relatório de Execução do Objeto${final ? ' — Final' : ' — Parcial'}`, `${p.nome} · ${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += sec(`<p style="font-size:11px;color:#3a4669">Elaborado conforme a Lei nº 13.019/2014, art. 66, I, e o Decreto nº 8.726/2016, art. 55 (Marco Regulatório das Organizações da Sociedade Civil).</p>`);
      html += sec(`<h2>1. Identificação da parceria</h2>`) + meta([['Organização da sociedade civil', ICM.C.ORG.razao], ['CNPJ', ICM.C.ORG.cnpj], ['Endereço', ICM.C.ORG.endereco || ICM.C.ORG.cidade], ['Concedente / financiador', p.financiador], ['Instrumento (nº)', p.numero_termo], ['Fonte do recurso', ICM.C.FONTES[p.fonte]],
        ['Objeto', p.nome], ['Valor global', p.valor ? U().money(p.valor) : '—'], ['Vigência', `${U().fmtDate(p.inicio)} a ${U().fmtDate(p.fim)}`], ['Período deste relatório', `${U().fmtDate(de)} a ${U().fmtDate(ate)}`], ['Responsável técnico', nome(p.coordenador_id)], ['Local de execução', p.local || '']]);
      html += kpis([[s.atendidos, 'Pessoas atendidas'], [aulas.length, 'Atividades realizadas'], [U().num(s.horas) + 'h', 'Horas de atividade'], [s.freq + '%', 'Frequência média']]);

      // 2. Ações desenvolvidas
      const porTurma = turmas.map(t => { const l = aulas.filter(a => a.turma.id === t.id); const temas = [...new Set(l.map(a => (a.plano || {}).tema).filter(Boolean))]; return { t, l, temas }; }).filter(x => x.l.length);
      html += sec(`<h2>2. Descrição das ações desenvolvidas para o cumprimento do objeto</h2>
        <p>No período, foram realizadas <b>${aulas.length} atividades</b> (${U().num(s.horas)} horas) em <b>${porTurma.length} turma(s)</b>, atendendo <b>${s.atendidos} pessoas</b>, além de <b>${eventos.length} evento(s)</b>. Todas as atividades têm plano, registro de frequência, relato e fotos no sistema de gestão da OSC.</p>
        ${table([{ t: 'Turma / atividade' }, { t: 'Responsável' }, { t: 'Dias e horário' }, { t: 'Atividades', c: 1 }, { t: 'Horas', c: 1 }], porTurma.map(x => [x.t.nome, nome(x.t.professor_id), `${ICM.pages._diasTxt ? ICM.pages._diasTxt(x.t.dias) : ''} ${x.t.inicio || ''}–${x.t.fim || ''}`, x.l.length, U().num(x.l.reduce((q, a) => q + (a.horas || 0), 0), 1)]))}
        ${porTurma.filter(x => x.temas.length).map(x => `<h3>${esc(x.t.nome)} — conteúdos trabalhados</h3><p style="font-size:11.5px">${x.temas.slice(0, 40).map(esc).join(' · ')}</p>`).join('')}
        ${eventos.length ? `<h3>Eventos, apresentações e participações</h3>${table([{ t: 'Data' }, { t: 'Evento' }, { t: 'Local' }, { t: 'Participantes', c: 1 }, { t: 'Público', c: 1 }], eventos.map(e => [U().fmtDate(e.data), e.titulo, e.local || '', (e.alunos || []).length, e.publico || '—']))}` : ''}`);

      // 3. Metas x resultados
      const metas = (p.metas || []).map(m => { const at = ICM.pages._metaAtual ? ICM.pages._metaAtual(m, s) : (m.atual || 0); const pc = m.alvo ? Math.round(at / m.alvo * 100) : 0; return { m, at, pc }; });
      html += sec(`<h2>3. Comparativo entre metas propostas e resultados alcançados</h2>${metas.length ? table([{ t: 'Meta' }, { t: 'Indicador / meio de verificação' }, { t: 'Proposto', c: 1 }, { t: 'Alcançado', c: 1 }, { t: '%', c: 1 }, { t: 'Situação' }],
        metas.map(({ m, at, pc }) => [m.descricao, m.indicador, `${U().num(m.alvo)} ${m.unidade || ''}`, `${U().num(at)} ${m.unidade || ''}`, pc + '%', { html: pc >= 100 ? '<span class="tag ok">Atingida</span>' : final ? '<span class="tag warn">Parcialmente atingida — justificar</span>' : '<span class="tag">Em andamento</span>' }])) : '<p>O plano de trabalho não tem metas cadastradas no sistema.</p>'}
        ${metas.some(x => x.pc < 100) && final ? '<p style="font-size:11px"><b>Justificativa das metas não atingidas integralmente:</b> ______________________________________________</p>' : ''}`);

      // 4. Público beneficiário
      html += sec(`<h2>4. Público beneficiário</h2><p><b>${s.atendidos}</b> pessoas atendidas no período (${s.ativos} ativas ao final). Desligamentos/saídas: <b>${saidas.length}</b>${saidas.length ? ` (principais motivos: ${[...new Set(saidas.map(m => m.motivo_saida).filter(Boolean))].slice(0, 4).map(esc).join(', ')})` : ''}. Taxa de permanência: <b>${s.atendidos ? Math.round(s.ativos / s.atendidos * 100) : 0}%</b>.</p>`);

      // 5. Satisfação, impactos e sustentabilidade
      html += sec(`<h2>5. Grau de satisfação do público-alvo</h2>${pesq.length ? table([{ t: 'Pesquisa' }, { t: 'Respostas', c: 1 }, { t: 'NPS', c: 1 }, { t: 'Satisfação (1 a 5)', c: 1 }], pesq.map(x => [x.titulo, x.res.n, x.res.nps ?? '—', x.res.satisfacao != null ? U().num(x.res.satisfacao, 1) : '—'])) : '<p>Nenhuma pesquisa de satisfação aplicada no período.</p>'}`);
      html += sec(`<h2>6. Impactos e benefícios alcançados</h2>${txt(impactos) || `<p>Frequência média de ${s.freq}% nas atividades, ${eventos.length} participação(ões) em eventos e ${s.atendidos} pessoas com acesso gratuito às atividades do projeto.</p>`}${dificuldades ? `<h3>Dificuldades e soluções adotadas</h3>${txt(dificuldades)}` : ''}${sustentabilidade ? `<h3>Continuidade das ações</h3>${txt(sustentabilidade)}` : ''}`);
      html += sec(`<h2>7. Contrapartida</h2><p>${esc(p.contrapartidas || 'Não prevista no plano de trabalho.')}</p>`);

      // 8. Execução financeira (resumo — o relatório financeiro detalhado é o art. 66, II)
      if (lanc.length) {
        const rec = lanc.filter(l => l.tipo === 'receita').reduce((q, l) => q + Number(l.valor || 0), 0);
        const desp = lanc.filter(l => l.tipo === 'despesa');
        const porRubrica = {}; desp.forEach(l => { const k = (ICM.C.RUBRICAS || {})[l.rubrica] || l.rubrica || 'Outras'; porRubrica[k] = (porRubrica[k] || 0) + Number(l.valor || 0); });
        html += sec(`<h2>8. Resumo da execução financeira</h2><p>Recursos recebidos no período: <b>${esc(U().money(rec))}</b> · despesas pagas: <b>${esc(U().money(desp.reduce((q, l) => q + Number(l.valor || 0), 0)))}</b>.</p>
          ${table([{ t: 'Rubrica' }, { t: 'Valor pago', c: 1 }], Object.entries(porRubrica).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, U().money(v)]))}
          <p style="font-size:11px">O detalhamento por despesa, com comprovantes e conciliação bancária, consta do relatório de execução financeira.</p>`);
      }

      // 9. Documentos comprobatórios: listas de presença e fotos
      html += sec(`<h2>9. Documentos de comprovação — listas de presença</h2>${table([{ t: 'Data' }, { t: 'Turma' }, { t: 'Tema' }, { t: 'Presentes', c: 1 }, { t: 'Inscritos', c: 1 }], aulas.map(a => { const v = Object.values(a.presencas || {}); return [U().fmtDate(a.data), a.turma.nome, (a.plano || {}).tema || '', v.filter(x => x !== 'F').length, v.length]; }))}
        <p style="font-size:11px">As listas nominais de cada atividade (relatório mensal da turma) ficam disponíveis no sistema e podem ser anexadas.</p>`);
      html += sec(`<h2>10. Registro fotográfico</h2>${photos(fotos, 18)}`);
      html += sec(`<p style="margin-top:16px;font-size:11.5px">Declaramos, sob as penas da lei, que as informações acima são verdadeiras e correspondem à execução do objeto da parceria no período indicado.</p><p style="text-align:right;font-size:11.5px">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(U().today()))}.</p>`);
      html += signs('Representante legal da OSC', `${nome(p.coordenador_id)} — Responsável técnico`);
      return { title: `Execução do objeto — ${p.nome}`, html, file: `execucao-objeto-${p.id}-${de}-${ate}` };
    }
  });
})();
