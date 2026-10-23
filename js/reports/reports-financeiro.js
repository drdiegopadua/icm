/* Relatórios: execução financeira do projeto, fluxo de caixa, contas em aberto,
   mapa comparativo de compras e resultados (evolução dos alunos). */
(function () {
  const R = () => ICM.reports;
  const h = () => ICM.reports.h;
  const U = () => ICM.util;
  const api = () => ICM.api;
  const esc = s => U().esc(s);
  const money = v => U().money(v);

  R().register('fin_execucao', {
    title: 'Execução financeira do projeto', steps: ['Lendo orçamento aprovado', 'Somando despesas por rubrica', 'Aplicando rateios', 'Listando comprovantes', 'Montando documento'],
    form: async (F, c) => F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: c.optsP, value: c.preset.projeto_id }) + `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date' })}${F({ name: 'ate', label: 'Até', type: 'date' })}</div><div class="xs muted">Sem datas = toda a vigência.</div>`,
    build: async ({ projeto_id, de, ate }) => {
      const { sec, head, meta, kpis, table, signs, declaracao } = h();
      const p = await api().projetos.get(projeto_id); de = de || p.inicio; ate = ate || p.fim;
      const o = await api().financeiro.orcamento(projeto_id);
      const fs = await api().fornecedores.list(); const contas = await api().financeiro.contas();
      const lan = (await api().financeiro.lancamentos({ projeto_id, de, ate })).map(l => ({ ...l, parte: (api().financeiro.partes(l).find(x => x.projeto_id === projeto_id) || {}).valor || 0 }));
      const desp = lan.filter(l => l.tipo === 'despesa' && ['pago'].includes(l.situacao)), rec = lan.filter(l => l.tipo === 'receita' && ['recebido', 'pago'].includes(l.status));
      const conta = contas.find(c => c.projeto_id === projeto_id);
      let html = head('Relatório de Execução Financeira', `${p.nome} — ${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += meta([['Financiador / instrumento', p.financiador], ['Nº termo / processo', p.numero_termo], ['Valor aprovado', money(p.valor || 0)], ['Vigência', `${U().fmtDate(p.inicio)} a ${U().fmtDate(p.fim)}`], ['Conta específica', conta ? `${conta.banco} · ag. ${conta.agencia} · cc ${conta.conta}` : 'Não vinculada'], ['Saldo em conta', conta ? money(conta.saldo) : '—']]);
      html += kpis([[money(rec.reduce((s, l) => s + l.parte, 0)).replace(',00', ''), 'Receitas no período'], [money(desp.reduce((s, l) => s + l.parte, 0)).replace(',00', ''), 'Despesas pagas'], [money(o.comprometido).replace(',00', ''), 'Comprometido (a pagar)'], [o.previsto ? Math.round((o.realizado + o.comprometido) / o.previsto * 100) + '%' : '—', 'Execução do orçamento']]);
      html += sec(`<h2>1. Previsto × realizado por rubrica</h2>${table([{ t: 'Rubrica' }, { t: 'Previsto', c: 1 }, { t: 'Realizado', c: 1 }, { t: 'Comprometido', c: 1 }, { t: 'Saldo', c: 1 }, { t: '%', c: 1 }], o.linhas.map(x => [x.nome, money(x.previsto), money(x.realizado), money(x.comprometido), x.saldo < 0 ? { html: `<span class="F">${esc(money(x.saldo))}</span>` } : money(x.saldo), x.pct ?? '—']).concat([[{ html: '<b>TOTAL</b>' }, { html: `<b>${esc(money(o.previsto))}</b>` }, { html: `<b>${esc(money(o.realizado))}</b>` }, money(o.comprometido), money(o.previsto - o.realizado - o.comprometido), '']]))}${o.estourados.length ? `<p style="font-size:11px;color:#b91c1c">Rubricas acima do previsto: ${o.estourados.map(x => esc(x.nome)).join(', ')} — verificar autorização de remanejamento.</p>` : ''}`);
      html += sec(`<h2>2. Receitas</h2>${table([{ t: 'Data' }, { t: 'Descrição' }, { t: 'Categoria' }, { t: 'Documento' }, { t: 'Valor', c: 1 }], rec.map(l => [U().fmtDate(l.data), l.descricao, ICM.C.CATEGORIAS_RECEITA[l.categoria] || '', l.documento || '', money(l.parte)]))}`);
      html += sec(`<h2>3. Despesas realizadas (relação de pagamentos)</h2>${table([{ t: 'Data' }, { t: 'Descrição' }, { t: 'Fornecedor' }, { t: 'Rubrica' }, { t: 'Documento' }, { t: 'Valor', c: 1 }], desp.sort((a, b) => a.data.localeCompare(b.data)).map(l => [U().fmtDate(l.data), l.descricao + (l.rateio && l.rateio.length ? ' (rateio)' : ''), (fs.find(f => f.id === l.fornecedor_id) || {}).nome || '', ICM.C.RUBRICAS[l.rubrica] || '', l.documento || (l.comprovante ? 'anexo' : '—'), money(l.parte)]))}<p style="font-size:10.5px">Despesas com rateio entram pela parcela atribuída a este projeto. Comprovantes arquivados no sistema.</p>`);
      html += declaracao() + signs('Tesouraria', 'Presidência');
      return { title: `Execução financeira — ${p.nome}`, html, file: `execucao-financeira-${p.id}` };
    }
  });

  R().register('fin_fluxo', {
    title: 'Fluxo de caixa', steps: ['Lendo lançamentos', 'Agrupando por mês', 'Montando documento'],
    form: async (F, c) => `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: `${c.ano}-01-01` })}${F({ name: 'ate', label: 'Até', type: 'date', value: U().today() })}</div>`,
    build: async ({ de, ate }) => {
      const { sec, head, kpis, table, barChart, signs } = h();
      const l = (await api().financeiro.lancamentos({ de, ate })).filter(x => ['pago', 'recebido'].includes(x.situacao));
      const meses = [...new Set(l.map(x => x.data.slice(0, 7)))].sort();
      const e = l.filter(x => x.tipo === 'receita').reduce((s, x) => s + x.valor, 0), s2 = l.filter(x => x.tipo === 'despesa').reduce((s, x) => s + x.valor, 0);
      let html = head('Fluxo de Caixa Realizado', `${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += kpis([[money(e).replace(',00', ''), 'Entradas'], [money(s2).replace(',00', ''), 'Saídas'], [money(e - s2).replace(',00', ''), 'Resultado'], [l.length, 'Movimentos']]);
      html += sec(`<h2>Por mês</h2>${barChart(meses.map(m => ({ l: U().MESES_C[+m.slice(5) - 1], v: l.filter(x => x.data.startsWith(m) && x.tipo === 'receita').reduce((s, x) => s + x.valor, 0) - l.filter(x => x.data.startsWith(m) && x.tipo === 'despesa').reduce((s, x) => s + x.valor, 0), lbl: '' })).map(x => ({ ...x, v: Math.max(0, x.v) })))}${table([{ t: 'Mês' }, { t: 'Entradas', c: 1 }, { t: 'Saídas', c: 1 }, { t: 'Resultado', c: 1 }], meses.map(m => { const en = l.filter(x => x.data.startsWith(m) && x.tipo === 'receita').reduce((s, x) => s + x.valor, 0), sa = l.filter(x => x.data.startsWith(m) && x.tipo === 'despesa').reduce((s, x) => s + x.valor, 0); return [U().fmtMonth(m), money(en), money(sa), money(en - sa)]; }))}`);
      html += sec(`<h2>Despesas por rubrica</h2>${table([{ t: 'Rubrica' }, { t: 'Total', c: 1 }], Object.entries(ICM.C.RUBRICAS).map(([k, n]) => [n, l.filter(x => x.tipo === 'despesa' && x.rubrica === k).reduce((s, x) => s + x.valor, 0)]).filter(r => r[1]).map(r => [r[0], money(r[1])]))}`);
      html += sec(`<h2>Receitas por categoria</h2>${table([{ t: 'Categoria' }, { t: 'Total', c: 1 }], Object.entries(ICM.C.CATEGORIAS_RECEITA).map(([k, n]) => [n, l.filter(x => x.tipo === 'receita' && x.categoria === k).reduce((s, x) => s + x.valor, 0)]).filter(r => r[1]).map(r => [r[0], money(r[1])]))}`);
      html += signs('Tesouraria', 'Conselho Fiscal');
      return { title: 'Fluxo de caixa', html, file: `fluxo-caixa-${de}-${ate}` };
    }
  });

  R().register('fin_abertos', {
    title: 'Contas a pagar e a receber', steps: ['Lendo lançamentos em aberto', 'Ordenando por vencimento', 'Montando documento'],
    form: async () => '<p class="small muted">Lista tudo o que está em aberto, com atrasados em destaque.</p>',
    build: async () => {
      const { sec, head, kpis, table } = h();
      const l = (await api().financeiro.lancamentos({ status: 'aberto' })).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
      const row = x => [U().fmtDate(x.vencimento), x.descricao, x.documento || '', money(x.valor), x.atrasado ? { html: '<span class="tag danger">Atrasado</span>' } : x.status === 'previsto' ? 'Previsto' : 'Em aberto'];
      const cols = [{ t: 'Vencimento' }, { t: 'Descrição' }, { t: 'Documento' }, { t: 'Valor', c: 1 }, { t: 'Situação' }];
      let html = head('Contas a Pagar e a Receber', `Posição em ${U().fmtDate(U().today())}`);
      html += kpis([[money(l.filter(x => x.tipo === 'despesa').reduce((s, x) => s + x.valor, 0)).replace(',00', ''), 'A pagar'], [money(l.filter(x => x.tipo === 'receita').reduce((s, x) => s + x.valor, 0)).replace(',00', ''), 'A receber'], [l.filter(x => x.atrasado).length, 'Atrasados'], [l.length, 'Lançamentos']]);
      html += sec(`<h2>A pagar</h2>${table(cols, l.filter(x => x.tipo === 'despesa').map(row))}`) + sec(`<h2>A receber</h2>${table(cols, l.filter(x => x.tipo === 'receita').map(row))}`);
      return { title: 'Contas em aberto', html, file: `contas-em-aberto-${U().today()}` };
    }
  });

  R().register('compra_mapa', {
    title: 'Mapa comparativo de orçamentos', steps: ['Lendo cotações', 'Comparando preços', 'Montando mapa'],
    build: async ({ compra_id }) => {
      const { sec, head, meta, table, signs } = h();
      const c = await api().compras.get(compra_id); const fs = await api().fornecedores.list();
      const fn = id => fs.find(f => f.id === id) || {};
      const menor = c.cotacoes.length ? c.cotacoes.reduce((a, b) => a.valor < b.valor ? a : b) : null;
      const p = c.projeto_id ? await api().projetos.get(c.projeto_id) : null;
      let html = head('Mapa Comparativo de Orçamentos', `${c.numero} — ${c.titulo}`);
      html += meta([['Projeto', p ? p.nome : 'Institucional'], ['Rubrica', ICM.C.RUBRICAS[c.rubrica] || ''], ['Solicitante', c.solicitante], ['Data do pedido', U().fmtDate(c.solicitado_em)], ['Justificativa da compra', c.justificativa]]);
      html += sec(`<h2>Itens</h2>${table([{ t: 'Descrição' }, { t: 'Qtd.', c: 1 }, { t: 'Unid.' }], c.itens.map(i => [i.descricao, i.quantidade, i.unidade]))}`);
      html += sec(`<h2>Propostas recebidas</h2>${table([{ t: 'Fornecedor' }, { t: 'CNPJ/CPF' }, { t: 'Valor total', c: 1 }, { t: 'Prazo' }, { t: 'Validade' }, { t: 'Resultado' }], c.cotacoes.map(q => [fn(q.fornecedor_id).nome, fn(q.fornecedor_id).documento, money(q.valor), q.prazo_entrega, U().fmtDate(q.validade), { html: [q.id === menor.id ? '<span class="tag ok">Menor preço</span>' : '', q.id === c.escolhida ? '<span class="tag warn">Escolhida</span>' : ''].join(' ') }]))}
        ${c.cotacoes.length < 3 ? `<p style="font-size:11px"><b>Menos de 3 orçamentos.</b> Justificativa: ${esc(c.justificativa_menos_3 || 'não informada')}</p>` : ''}`);
      if (c.escolhida) html += sec(`<h2>Decisão</h2><p>Escolhida a proposta de <b>${esc(fn(c.cotacoes.find(q => q.id === c.escolhida).fornecedor_id).nome)}</b>. Justificativa: ${esc(c.justificativa_escolha || '')}. Aprovado por ${esc(c.aprovado_por || '')} em ${esc(U().fmtDate(c.aprovado_em))}.</p>`);
      html += signs('Responsável pelas compras', 'Presidência / Direção');
      return { title: `Mapa de cotação ${c.numero}`, html, file: `mapa-cotacao-${c.numero}` };
    }
  });

  R().register('social_resultados', {
    title: 'Relatório de resultados (evolução dos alunos)', steps: ['Lendo avaliações', 'Comparando inicial × atual', 'Calculando indicadores', 'Montando documento'],
    form: async (F, c) => F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Todos os projetos'], ...c.optsP], value: c.preset.projeto_id || '' }),
    build: async ({ projeto_id }) => {
      const { sec, head, kpis, table, signs } = h();
      const projetos = (await api().projetos.list()).filter(p => !projeto_id || p.id === projeto_id);
      const turmas = await api().turmas.list();
      let html = head('Relatório de Resultados — Evolução dos Alunos', projeto_id ? projetos[0].nome : 'Todos os projetos');
      html += sec(`<p>Cada aluno é avaliado pelo professor em ${Object.keys(ICM.C.COMPETENCIAS).length} competências, numa escala de 1 (precisa de muito apoio) a 5 (desenvolvido), no início, no meio e no fim do ciclo. O relatório compara a primeira avaliação com a mais recente.</p>`);
      for (const p of projetos) {
        const tids = turmas.filter(t => t.projeto_id === p.id).map(t => t.id); if (!tids.length) continue;
        const e = await api().social.evolucao({ turma_ids: tids }); if (!e.alunos) continue;
        html += sec(`<h2>${esc(p.nome)}</h2>`) + kpis([[e.alunos, 'Alunos avaliados'], [e.pct_geral + '%', 'Evoluíram em ao menos 1 competência'], [Math.max(...e.linhas.map(l => l.pct)) + '%', 'Maior índice de evolução'], [(e.linhas.reduce((s, l) => s + (l.atual || 0), 0) / e.linhas.filter(l => l.atual).length || 0).toFixed(1), 'Média atual (1 a 5)']]);
        html += sec(table([{ t: 'Competência' }, { t: 'Média inicial', c: 1 }, { t: 'Média atual', c: 1 }, { t: 'Variação', c: 1 }, { t: '% que evoluiu', c: 1 }], e.linhas.map(l => [l.nome, l.inicial ?? '—', l.atual ?? '—', l.inicial != null ? { html: `<b class="${l.atual >= l.inicial ? 'P' : 'F'}">${(l.atual - l.inicial >= 0 ? '+' : '') + (l.atual - l.inicial).toFixed(1)}</b>` } : '—', l.pct + '%'])));
      }
      html += signs('Coordenação pedagógica', 'Serviço social');
      return { title: 'Resultados — evolução dos alunos', html, file: 'resultados-evolucao' };
    }
  });
})();
