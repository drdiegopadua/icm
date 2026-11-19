/* Documentos de bolsistas, monitores e jovens aprendizes: termo de compromisso, folha mensal e recibos. */
(function () {
  const R = () => ICM.reports;
  const h = () => ICM.reports.h;
  const U = () => ICM.util;
  const api = () => ICM.api;
  const esc = s => U().esc(s);

  const clausulas = (b, T) => {
    const minH = api().bolsas.horasMinimas(b);
    const itens = [
      `O(A) ${esc(T.nome.toLowerCase())} recebe do ${esc(ICM.C.ORG.nome)} uma bolsa-auxílio mensal de <b>${esc(U().money(b.valor_mensal))}</b>, de caráter educacional, para apoiar sua formação artística, no período de ${esc(U().fmtDate(b.inicio))} a ${b.fim ? esc(U().fmtDate(b.fim)) : 'prazo indeterminado'}.`,
      b.aluno_id ? `É requisito manter frequência mínima de <b>${esc(b.freq_minima || 75)}%</b> nas aulas em que estiver matriculado(a), conferida mensalmente pela chamada.` : '',
      minH ? `É requisito cumprir no mínimo <b>${esc(U().num(minH, 1))} horas</b> de atuação por mês${b.carga_semanal ? ` (carga de ${esc(U().num(b.carga_semanal, 1))}h por semana)` : ''}, registradas no sistema e acompanhadas pelo(a) orientador(a).` : '',
      b.atribuicoes ? `Atribuições e compromissos combinados: ${esc(b.atribuicoes)}` : '',
      'O pagamento é feito mês a mês, depois da conferência dos requisitos pela coordenação e da aprovação da direção. Quando um requisito não é cumprido, a bolsa do mês pode ser reduzida ou não paga, com o motivo registrado.',
      'O vínculo pode ser encerrado a qualquer tempo, por qualquer das partes, mediante comunicação, e também quando os requisitos deixarem de ser cumpridos de forma repetida.',
      b.tipo === 'aprendiz'
        ? 'Este termo organiza as atividades e a bolsa dentro do programa de formação do instituto. Se houver contrato de aprendizagem nos termos da Lei 10.097/2000, as regras daquele contrato prevalecem.'
        : 'A bolsa não constitui salário nem gera vínculo empregatício, por se tratar de apoio à formação educacional e artística.',
      'Os dados pessoais são tratados apenas para a gestão da bolsa e a prestação de contas aos financiadores, conforme a LGPD (Lei 13.709/2018).'
    ].filter(Boolean);
    return `<ol style="font-size:11.5px;line-height:1.55;padding-left:18px">${itens.map(x => `<li style="margin-bottom:6px">${x}</li>`).join('')}</ol>`;
  };

  R().register('bolsa_termo', {
    title: 'Termo de compromisso', steps: ['Lendo o vínculo', 'Redigindo cláusulas', 'Montando documento'],
    build: async ({ bolsista_id }) => {
      const { sec, head, meta, signs } = h();
      const b = await api().bolsas.get(bolsista_id);
      const T = api().bolsas.TIPOS[b.tipo];
      const [projetos, usuarios] = await Promise.all([api().raw('projetos'), api().usuarios.list()]);
      const menor = b.nascimento && U().age(b.nascimento) < 18;
      let html = head(`Termo de Compromisso — ${T.nome}`, ICM.C.ORG.nome);
      html += meta([['Nome', b.nome], ['CPF', b.cpf ? U().maskCPF(b.cpf) : '—'], ['Nascimento', b.nascimento ? U().fmtDate(b.nascimento) : '—'], ['Responsável', b.responsavel || (menor ? 'Não informado' : 'Não se aplica')], ['Projeto', (projetos.find(p => p.id === b.projeto_id) || {}).nome || 'Institucional'], ['Orientador(a)', (usuarios.find(x => x.id === b.orientador_id) || {}).nome || '—'], ['Valor mensal', U().money(b.valor_mensal)], ['Vigência', `${U().fmtDate(b.inicio)} a ${b.fim ? U().fmtDate(b.fim) : 'indeterminado'}`]]);
      html += sec(`<h2>Cláusulas</h2>${clausulas(b, T)}<p style="text-align:right;font-size:11.5px">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(b.inicio || U().today()))}.</p>`);
      html += signs(`${b.nome} — ${T.nome}`, 'Pela instituição');
      if (menor || b.responsavel) html += signs(`${b.responsavel || 'Responsável legal'} — Responsável`, 'Orientador(a)');
      return { title: `Termo — ${b.nome}`, html, file: `termo-bolsa-${b.id}` };
    }
  });

  R().register('bolsas_folha', {
    title: 'Folha de bolsas do mês', steps: ['Lendo a folha', 'Conferindo requisitos', 'Somando valores', 'Montando documento'],
    form: async F => F({ name: 'ym', label: 'Mês', type: 'month', value: U().today().slice(0, 7) }),
    build: async ({ ym }) => {
      const { sec, head, kpis, table, signs } = h();
      const { pagamentos } = await api().bolsas.folha(ym);
      const projetos = await api().raw('projetos');
      const T = api().bolsas.TIPOS, PAG = api().bolsas.PAG;
      const valid = pagamentos.filter(p => p.status !== 'suspenso');
      const liq = p => p.status === 'suspenso' ? 0 : p.valor - (p.desconto || 0);
      let html = head('Folha de Bolsas', U().fmtMonth(ym));
      html += kpis([[pagamentos.length, 'Pessoas na folha'], [valid.filter(p => p.requisito_ok).length, 'Com requisitos em dia'], [pagamentos.filter(p => p.status === 'pago').length, 'Pagas'], [U().money(valid.reduce((s, p) => s + liq(p), 0)).replace(',00', ''), 'Total líquido']]);
      html += sec(`<h2>Detalhamento</h2>${table([{ t: 'Nome' }, { t: 'Tipo' }, { t: 'Projeto' }, { t: 'Freq.', c: 1 }, { t: 'Horas', c: 1 }, { t: 'Bolsa', c: 1 }, { t: 'Desconto', c: 1 }, { t: 'Líquido', c: 1 }, { t: 'Situação' }],
        pagamentos.map(p => [p.nome, (T[p.tipo] || {}).nome || p.tipo, (projetos.find(x => x.id === p.projeto_id) || {}).nome || 'Institucional', p.freq == null ? '—' : p.freq + '%', p.horas_minimas ? `${U().num(p.horas, 1)}/${U().num(p.horas_minimas, 1)}` : (p.horas ? U().num(p.horas, 1) : '—'), U().money(p.valor), p.desconto ? U().money(p.desconto) : '—', p.status === 'suspenso' ? '—' : U().money(liq(p)), PAG[p.status] || p.status])
          .concat(pagamentos.length ? [[{ html: '<b>Total</b>' }, '', '', '', '', U().money(valid.reduce((s, p) => s + p.valor, 0)), U().money(valid.reduce((s, p) => s + (p.desconto || 0), 0)), { html: `<b>${esc(U().money(valid.reduce((s, p) => s + liq(p), 0)))}</b>` }, '']] : []))}`);
      const obs = pagamentos.filter(p => !p.requisito_ok || p.desconto || p.status === 'suspenso');
      if (obs.length) html += sec(`<h2>Observações</h2>${table([{ t: 'Nome' }, { t: 'Ocorrência' }], obs.map(p => [p.nome, [...(p.motivos || []), p.desconto ? `Desconto: ${p.motivo_desconto}` : '', p.status === 'suspenso' ? `Não pago: ${p.motivo_suspensao || ''}` : ''].filter(Boolean).join(' · ')]))}`);
      html += signs('Coordenação', 'Direção');
      return { title: `Folha de bolsas — ${U().fmtMonth(ym)}`, html, file: `folha-bolsas-${ym}` };
    }
  });

  R().register('bolsa_recibo', {
    title: 'Recibo de bolsa', steps: ['Lendo pagamentos', 'Montando recibos'],
    build: async ({ ym, pagamento_id }) => {
      const { sec, head } = h();
      let ps = pagamento_id ? (await api().bolsas.pagamentos()).filter(p => p.id === pagamento_id) : (await api().bolsas.pagamentos({ ym })).filter(p => p.status === 'pago');
      if (!ps.length) throw new Error('Nenhum pagamento realizado para gerar recibo.');
      const pessoas = await api().bolsas.list();
      const T = api().bolsas.TIPOS;
      let html = head(ps.length > 1 ? 'Recibos de Bolsa' : 'Recibo de Bolsa', ps.length > 1 ? U().fmtMonth(ym) : `${ps[0].nome} — ${U().fmtMonth(ps[0].ym)}`);
      ps.forEach(p => {
        const b = pessoas.find(x => x.id === p.bolsista_id) || {};
        const v = p.valor_pago != null ? p.valor_pago : p.valor - (p.desconto || 0);
        html += sec(`<div style="border:1px solid #d5dcea;border-radius:10px;padding:16px 18px;margin:12px 0;break-inside:avoid">
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px"><span>RECIBO — ${esc((T[p.tipo] || {}).nome || 'Bolsa')}</span><span>${esc(U().money(v))}</span></div>
          <p style="font-size:11.5px;line-height:1.6;margin:10px 0">Recebi do <b>${esc(ICM.C.ORG.razao || ICM.C.ORG.nome)}</b>, CNPJ ${esc(ICM.C.ORG.cnpj)}, a importância de <b>${esc(U().money(v))}</b> referente à bolsa-auxílio de <b>${esc(U().fmtMonth(p.ym))}</b>${p.desconto ? ` (bolsa de ${esc(U().money(p.valor))} com desconto de ${esc(U().money(p.desconto))}: ${esc(p.motivo_desconto || '')})` : ''}, paga em ${esc(U().fmtDate(p.pago_em))}${b.forma_pagamento ? ` por ${esc({ pix: 'Pix', conta: 'depósito em conta', dinheiro: 'dinheiro' }[b.forma_pagamento] || '')}` : ''}.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:34px;font-size:10.5px;text-align:center">
            <div style="border-top:1px solid #0e1838;padding-top:4px">${esc(p.nome)}${b.cpf ? ` — CPF ${esc(U().maskCPF(b.cpf))}` : ''}</div>
            <div style="border-top:1px solid #0e1838;padding-top:4px">${b.responsavel ? `${esc(b.responsavel)} — Responsável` : 'Local e data'}</div></div></div>`);
      });
      return { title: ps.length > 1 ? `Recibos — ${U().fmtMonth(ym)}` : `Recibo — ${ps[0].nome}`, html, file: ps.length > 1 ? `recibos-bolsas-${ym}` : `recibo-bolsa-${ps[0].id}` };
    }
  });
})();
