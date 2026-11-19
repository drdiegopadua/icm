/* Fechamento do mês em um clique: um documento único (Imprimir / Salvar PDF) com os relatórios
   mensais de todas as turmas, a frequência, a folha de bolsas e o movimento financeiro do mês. */
(function () {
  const R = () => ICM.reports;
  const h = () => ICM.reports.h;
  const U = () => ICM.util;
  const api = () => ICM.api;
  const esc = s => U().esc(s);
  const can = p => ICM.auth.can(p);
  const quebra = '<div style="break-before:page;page-break-before:always"></div>';

  async function financeiroDoMes(ym) {
    const { sec, head, kpis, table } = h();
    const money = v => U().money(v);
    const de = `${ym}-01`, ate = U().addDays(U().addDays(`${ym}-28`, 7).slice(0, 7) + '-01', -1);
    const lan = (await api().financeiro.lancamentos({ de, ate })).filter(l => l.situacao === 'pago' || l.situacao === 'recebido');
    const projetos = await api().raw('projetos');
    const pn = id => (projetos.find(p => p.id === id) || {}).nome || 'Institucional / rateio';
    const rec = lan.filter(l => l.tipo === 'receita'), desp = lan.filter(l => l.tipo === 'despesa');
    const soma = l => l.reduce((s, x) => s + Number(x.valor || 0), 0);
    const porProj = [...new Set(lan.map(l => l.projeto_id || ''))].map(id => [pn(id), money(soma(rec.filter(l => (l.projeto_id || '') === id))), money(soma(desp.filter(l => (l.projeto_id || '') === id)))]);
    let html = head('Movimento Financeiro do Mês', U().fmtMonth(ym));
    html += kpis([[money(soma(rec)).replace(',00', ''), 'Receitas recebidas'], [money(soma(desp)).replace(',00', ''), 'Despesas pagas'], [money(soma(rec) - soma(desp)).replace(',00', ''), 'Resultado do mês'], [lan.length, 'Lançamentos']]);
    html += sec(`<h2>Por projeto</h2>${table([{ t: 'Projeto' }, { t: 'Receitas', c: 1 }, { t: 'Despesas', c: 1 }], porProj)}`);
    html += sec(`<h2>Receitas</h2>${table([{ t: 'Data' }, { t: 'Descrição' }, { t: 'Projeto' }, { t: 'Valor', c: 1 }], rec.sort((a, b) => a.data.localeCompare(b.data)).map(l => [U().fmtDate(l.data), l.descricao, pn(l.projeto_id), money(l.valor)]))}`);
    html += sec(`<h2>Despesas</h2>${table([{ t: 'Data' }, { t: 'Descrição' }, { t: 'Rubrica' }, { t: 'Projeto' }, { t: 'Documento' }, { t: 'Valor', c: 1 }], desp.sort((a, b) => a.data.localeCompare(b.data)).map(l => [U().fmtDate(l.data), l.descricao, ICM.C.RUBRICAS[l.rubrica] || '', pn(l.projeto_id), l.documento || (l.comprovante ? 'anexo' : '—'), money(l.valor)]))}`);
    return html;
  }

  R().register('fechamento_mes', {
    title: 'Fechamento do mês', steps: ['Lendo turmas e aulas', 'Montando os relatórios das turmas', 'Conferindo a frequência', 'Somando bolsas e financeiro', 'Juntando tudo num documento'],
    form: async F => `${F({ name: 'ym', label: 'Mês', type: 'month', value: U().addDays(`${U().today().slice(0, 7)}-01`, -1).slice(0, 7) })}
      <div class="xs muted mb-2">Gera um documento único para salvar em PDF e anexar à prestação de contas. Pode levar alguns segundos.</div>
      ${F({ name: 'turmas', label: 'Relatório mensal de cada turma', type: 'toggle', value: true })}
      ${F({ name: 'frequencia', label: 'Frequência (assiduidade) de todas as turmas', type: 'toggle', value: true })}
      ${can('bolsas.gerir') ? F({ name: 'bolsas', label: 'Folha de bolsas', type: 'toggle', value: true }) : ''}
      ${can('financeiro.ver') ? F({ name: 'financeiro', label: 'Movimento financeiro do mês', type: 'toggle', value: true }) : ''}`,
    build: async ({ ym, turmas: comTurmas, frequencia, bolsas, financeiro }) => {
      if (!ym) throw new Error('Escolha o mês.');
      const { sec, head, table, kpis, declaracao, signs } = h();
      const todas = (await api().turmas.list()).filter(t => t.status !== 'encerrada' || (t.fim || '9999') >= `${ym}-01`);
      const aulas = await api().raw('aulas');
      const doMes = t => aulas.filter(a => a.turma_id === t.id && a.status === 'realizada' && String(a.data).startsWith(ym));
      const turmas = todas.filter(t => doMes(t).length).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
      const partes = [], sumario = [];
      if (comTurmas) for (const t of turmas) {
        const r = await R().build('turma_mensal', { turma_id: t.id, ym });
        partes.push(r.html); sumario.push(['Relatório mensal', t.nome, doMes(t).length + ' aula(s)']);
      }
      if (frequencia) { const r = await R().build('assiduidade', { ym }); partes.push(r.html); sumario.push(['Frequência', 'Todas as turmas', '']); }
      if (bolsas && can('bolsas.gerir')) { const r = await R().build('bolsas_folha', { ym }); partes.push(r.html); sumario.push(['Folha de bolsas', '', '']); }
      if (financeiro && can('financeiro.ver')) { partes.push(await financeiroDoMes(ym)); sumario.push(['Movimento financeiro', '', '']); }
      if (!partes.length) throw new Error('Nada para gerar: escolha pelo menos uma parte (ou o mês não tem aulas registradas).');
      const semAulas = todas.filter(t => !doMes(t).length && t.status !== 'encerrada');
      let capa = head('Fechamento do Mês', U().fmtMonth(ym));
      capa += kpis([[turmas.length, 'Turmas com aulas'], [turmas.reduce((s, t) => s + doMes(t).length, 0), 'Aulas realizadas'], [U().num(turmas.reduce((s, t) => s + doMes(t).reduce((q, a) => q + Number(a.horas || 0), 0), 0), 1) + 'h', 'Horas de aula'], [partes.length, 'Documentos reunidos']]);
      capa += sec(`<h2>Conteúdo</h2>${table([{ t: 'Documento' }, { t: 'Turma / referência' }, { t: 'Observação' }], sumario)}`);
      if (semAulas.length) capa += sec(`<p style="font-size:11px;color:#b45309"><b>Turmas ativas sem aula registrada no mês:</b> ${semAulas.map(t => esc(t.nome)).join(', ')}.</p>`);
      capa += declaracao() + signs('Coordenação', 'Direção');
      return { title: `Fechamento — ${U().fmtMonth(ym)}`, html: [capa, ...partes].join(quebra), file: `fechamento-${ym}` };
    }
  });
})();
