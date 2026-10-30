/* Relatórios de gestão: estoque (posição, consumo por projeto, uniformes), equipe (quadro e escala)
   e comprovante de assinatura digital. Usam o mesmo motor animado de ICM.reports. */
(function () {
  const U = () => ICM.util;
  const h = () => ICM.reports.h;
  const api = () => ICM.api;
  const esc = s => U().esc(s);
  const R$ = v => U().money(v);
  const hoje = () => U().today();
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const periodo = (F, ano) => `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: `${ano}-01-01` })}${F({ name: 'ate', label: 'Até', type: 'date', value: hoje() })}</div>`;

  // ---------------- Estoque ----------------
  ICM.reports.register('estoque_posicao', {
    title: 'Posição de estoque',
    steps: ['Lendo itens', 'Calculando saldos', 'Somando valores', 'Montando documento'],
    form: async F => F({ name: 'categoria', label: 'Categoria', type: 'select', options: [['', 'Todas'], ...Object.entries(ICM.C.CATEGORIAS_ESTOQUE).map(([k, v]) => [k, v.nome])] }),
    build: async ({ categoria }) => {
      const { sec, head, kpis, table, signs } = h();
      const itens = await api().estoque.itens({ categoria: categoria || undefined });
      const valor = itens.reduce((s, i) => s + i.saldo * (i.custo_medio || 0), 0);
      const repor = itens.filter(i => i.abaixo);
      let html = head('Posição de Estoque', `${categoria ? ICM.C.CATEGORIAS_ESTOQUE[categoria].nome : 'Todos os itens'} — posição em ${U().fmtDate(hoje())}`);
      html += kpis([[itens.length, 'Itens cadastrados'], [U().num(itens.reduce((s, i) => s + i.saldo, 0)), 'Unidades em estoque'], [R$(valor).replace(/,00$/, ''), 'Valor em estoque'], [repor.length, 'Itens a repor']]);
      if (repor.length) html += sec(`<h2>Itens a repor</h2>${table([{ t: 'Código' }, { t: 'Item' }, { t: 'Saldo', c: 1 }, { t: 'Mínimo', c: 1 }, { t: 'Local' }], repor.map(i => [i.codigo, `${i.nome}${i.variacao ? ' — ' + i.variacao : ''}`, `${U().num(i.saldo)} ${i.unidade}`, `${i.estoque_minimo} ${i.unidade}`, i.local || '']))}`);
      Object.entries(ICM.C.CATEGORIAS_ESTOQUE).forEach(([k, c]) => {
        const l = itens.filter(i => i.categoria === k); if (!l.length) return;
        html += sec(`<h2>${esc(c.nome)}</h2>${table([{ t: 'Código' }, { t: 'Item' }, { t: 'Local' }, { t: 'Saldo', c: 1 }, { t: 'Custo médio', c: 1 }, { t: 'Valor', c: 1 }], l.map(i => [i.codigo, `${i.nome}${i.variacao ? ' — ' + i.variacao : ''}`, i.local || '', `${U().num(i.saldo)} ${i.unidade}`, i.custo_medio ? R$(i.custo_medio) : '—', i.custo_medio ? R$(i.saldo * i.custo_medio) : '—']))}`);
      });
      html += signs('Responsável pelo almoxarifado', 'Coordenação');
      return { title: 'Posição de estoque', html, file: `posicao-estoque-${hoje()}` };
    }
  });

  ICM.reports.register('estoque_consumo', {
    title: 'Consumo por projeto',
    steps: ['Lendo saídas do período', 'Agrupando por projeto', 'Calculando valores', 'Montando documento'],
    form: async (F, { ano, optsP }) => F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Todos os projetos'], ...optsP] }) + periodo(F, ano),
    build: async ({ projeto_id, de, ate }) => {
      const { sec, head, kpis, table, signs, declaracao } = h();
      de = de || `${hoje().slice(0, 4)}-01-01`; ate = ate || hoje();
      const itens = await api().estoque.itens();
      const custo = id => (itens.find(i => i.id === id) || {}).custo_medio || 0;
      const saidas = (await api().estoque.movimentos({ de, ate, tipo: 'saida' })).filter(m => !projeto_id || m.projeto_id === projeto_id);
      const projetos = await api().projetos.list();
      const grupos = [...new Set(saidas.map(m => m.projeto_id || ''))];
      const total = saidas.reduce((s, m) => s + m.quantidade * custo(m.item_id), 0);
      let html = head('Consumo de Materiais por Projeto', `${projeto_id ? (projetos.find(p => p.id === projeto_id) || {}).nome : 'Todos os projetos'} — ${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += kpis([[saidas.length, 'Saídas registradas'], [U().num(saidas.reduce((s, m) => s + m.quantidade, 0)), 'Unidades entregues'], [grupos.filter(Boolean).length, 'Projetos atendidos'], [R$(total).replace(/,00$/, ''), 'Valor consumido']]);
      grupos.forEach(pid => {
        const p = projetos.find(x => x.id === pid); const l = saidas.filter(m => (m.projeto_id || '') === pid);
        const tot = l.reduce((s, m) => s + m.quantidade * custo(m.item_id), 0);
        html += sec(`<h2>${esc(p ? p.nome : 'Uso institucional')}</h2>${p ? `<p style="font-size:11px;color:#5b6788">${esc(p.financiador || '')}${p.numero_termo ? ' · ' + esc(p.numero_termo) : ''}</p>` : ''}
          ${table([{ t: 'Data' }, { t: 'Item' }, { t: 'Qtd.', c: 1 }, { t: 'Destinatário' }, { t: 'Valor', c: 1 }], l.map(m => [U().fmtDate(m.data), `${m.item.nome}${m.item.variacao ? ' — ' + m.item.variacao : ''}`, `${m.quantidade} ${m.item.unidade || ''}`, m.destinatario || '', custo(m.item_id) ? R$(m.quantidade * custo(m.item_id)) : '—']))}
          <p style="text-align:right;font-weight:800">Total do projeto: ${esc(R$(tot))}</p>`);
      });
      if (!saidas.length) html += sec('<p>Nenhuma saída de estoque no período.</p>');
      html += declaracao() + signs('Responsável pelo almoxarifado', 'Coordenação');
      return { title: 'Consumo por projeto', html, file: `consumo-estoque-${de}-${ate}` };
    }
  });

  ICM.reports.register('estoque_uniformes', {
    title: 'Entrega de uniformes',
    steps: ['Lendo entregas', 'Vinculando alunos', 'Montando lista de recebimento'],
    form: async (F, { ano }) => periodo(F, ano),
    build: async ({ de, ate }) => {
      const { sec, head, kpis, table, signs } = h();
      de = de || `${hoje().slice(0, 4)}-01-01`; ate = ate || hoje();
      const saidas = (await api().estoque.movimentos({ de, ate, tipo: 'saida' })).filter(m => m.item.categoria === 'uniforme');
      const alunos = await api().raw('alunos');
      const nome = m => { const a = alunos.find(x => x.id === m.aluno_id); return a ? `${a.nome} (${a.matricula})` : (m.destinatario || '—'); };
      let html = head('Entrega de Uniformes', `${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += kpis([[saidas.length, 'Entregas'], [U().num(saidas.reduce((s, m) => s + m.quantidade, 0)), 'Peças entregues'], [new Set(saidas.map(m => m.aluno_id).filter(Boolean)).size, 'Alunos atendidos'], [new Set(saidas.map(m => m.item_id)).size, 'Modelos/tamanhos']]);
      html += sec(table([{ t: 'Data' }, { t: 'Aluno(a) / destinatário' }, { t: 'Peça' }, { t: 'Tamanho' }, { t: 'Qtd.', c: 1 }, { t: 'Assinatura de recebimento' }], saidas.sort((a, b) => a.data.localeCompare(b.data)).map(m => [U().fmtDate(m.data), nome(m), m.item.nome, m.item.variacao || '', m.quantidade, { html: '<span style="display:inline-block;width:150px;border-bottom:1px solid #1a2140">&nbsp;</span>' }])));
      html += signs('Responsável pela entrega', 'Coordenação');
      return { title: 'Entrega de uniformes', html, file: `uniformes-${de}-${ate}` };
    }
  });

  // ---------------- Equipe ----------------
  ICM.reports.register('equipe_quadro', {
    title: 'Quadro da equipe',
    steps: ['Lendo equipe', 'Conferindo contratos e documentos', 'Montando quadro'],
    build: async () => {
      const { sec, head, kpis, table, signs } = h();
      const l = (await api().equipe.list()).filter(p => p.status !== 'desligado');
      const projetos = await api().projetos.list();
      const salarios = ICM.auth.can('equipe.salarios');
      const comAlerta = l.filter(p => p.alertas.length);
      let html = head('Quadro da Equipe', `Posição em ${U().fmtDate(hoje())}`);
      html += kpis([[l.length, 'Profissionais ativos'], [Object.keys(ICM.C.VINCULOS).filter(k => l.some(p => p.vinculo === k)).length, 'Tipos de vínculo'], [U().num(l.reduce((s, p) => s + Number((p.contrato || {}).carga_semanal || 0), 0)) + 'h', 'Carga horária semanal'], [comAlerta.length, 'Com pendências']]);
      html += sec(`<h2>Profissionais</h2>${table([{ t: 'Nome' }, { t: 'Cargo' }, { t: 'Vínculo' }, { t: 'Admissão' }, { t: 'Carga/sem.', c: 1 }, { t: 'Projetos' }, ...(salarios ? [{ t: 'Remuneração', c: 1 }] : [])],
        l.map(p => [p.nome, p.cargo, ICM.C.VINCULOS[p.vinculo] || p.vinculo || '', p.admissao ? U().fmtDate(p.admissao) : '', (p.contrato || {}).carga_semanal ? (p.contrato.carga_semanal + 'h') : '', (p.projeto_ids || []).map(id => (projetos.find(x => x.id === id) || {}).nome).filter(Boolean).join(', '), ...(salarios ? [(p.contrato || {}).remuneracao ? R$(p.contrato.remuneracao) : '—'] : [])]))}`);
      const rateio = projetos.map(pr => ({ pr, n: l.filter(p => (p.projeto_ids || []).includes(pr.id)) })).filter(x => x.n.length);
      if (rateio.length) html += sec(`<h2>Equipe por projeto</h2>${table([{ t: 'Projeto' }, { t: 'Profissionais' }], rateio.map(x => [x.pr.nome, x.n.map(p => `${p.nome} (${p.cargo})`).join(', ')]))}`);
      if (comAlerta.length) html += sec(`<h2>Pendências de contrato e documentos</h2>${table([{ t: 'Profissional' }, { t: 'Pendência' }], comAlerta.flatMap(p => p.alertas.map(a => [p.nome, { html: `<span class="tag ${a.nivel === 'danger' ? 'danger' : 'warn'}">${esc(a.txt)}</span>` }])))}`);
      html += signs('Recursos humanos', 'Direção');
      return { title: 'Quadro da equipe', html, file: `quadro-equipe-${hoje()}` };
    }
  });

  ICM.reports.register('equipe_escala', {
    title: 'Escala da semana',
    steps: ['Lendo turnos', 'Incluindo aulas das turmas', 'Montando escala'],
    build: async () => {
      const { sec, head, table, signs } = h();
      const esc2 = await api().equipe.escalaSemana();
      let html = head('Escala Semanal da Equipe', `Válida a partir de ${U().fmtDate(hoje())}`);
      [1, 2, 3, 4, 5, 6, 0].forEach(d => {
        const l = esc2.filter(x => x.dia === d); if (!l.length) return;
        html += sec(`<h2>${DIAS[d]}</h2>${table([{ t: 'Horário' }, { t: 'Profissional' }, { t: 'Cargo' }, { t: 'Atividade' }, { t: 'Local' }], l.map(x => [`${x.inicio}–${x.fim}`, x.pessoa, x.cargo, x.atividade || '', x.local || '']))}`);
      });
      if (!esc2.length) html += sec('<p>Nenhum turno cadastrado.</p>');
      html += signs('Coordenação', 'Direção');
      return { title: 'Escala da semana', html, file: `escala-equipe-${hoje()}` };
    }
  });

  // ---------------- Comprovante de assinatura digital ----------------
  ICM.reports.register('assinatura_comprovante', {
    title: 'Comprovante de assinatura',
    steps: ['Lendo documento assinado', 'Conferindo integridade (hash)', 'Montando comprovante'],
    build: async ({ id }) => {
      const { sec, head, meta } = h();
      const x = (await api().raw('assinaturas')).find(s => s.id === id);
      if (!x) throw new Error('Assinatura não encontrada.');
      const a = await api().alunos.get(x.aluno_id) || {};
      const titulo = ICM.C.DOCS_ASSINATURA[x.tipo] || 'Documento';
      const conferido = x.doc_html && x.doc_hash ? (await U().sha256(x.doc_html)) === x.doc_hash : false;
      let html = head('Comprovante de Assinatura Eletrônica', `${titulo} — ${a.nome || ''}`);
      html += meta([['Documento', titulo], ['Aluno(a)', `${a.nome || ''} (${a.matricula || ''})`], ['Situação', x.status === 'assinado' ? 'Assinado' : x.status === 'recusado' ? 'Recusado' : x.status], ['Solicitado em', U().fmtDate(x.solicitado_em)],
        ['Assinado por', x.signatario_nome || '—'], ['CPF do signatário', x.signatario_cpf ? U().maskCPF(x.signatario_cpf) : '—'], ['Data e hora', x.assinado_em ? new Date(x.assinado_em).toLocaleString('pt-BR') : (x.recusado_em ? 'Recusado em ' + new Date(x.recusado_em).toLocaleString('pt-BR') : '—')], ['Dispositivo', (x.user_agent || '—').slice(0, 90)]]);
      if (x.status === 'recusado') html += sec(`<h2>Recusa</h2><p>${esc(x.motivo_recusa || 'Sem motivo informado.')}</p>`);
      if (x.doc_html) html += sec(`<h2>Texto assinado</h2><div style="border:1px solid #dbe5fb;border-radius:8px;padding:12px;font-size:11.5px">${x.doc_html}</div>`);
      if (x.assinatura_img) html += sec(`<h2>Assinatura</h2><img src="${esc(x.assinatura_img)}" alt="Assinatura" style="max-height:110px;border-bottom:1px solid #1a2140">`);
      if (x.doc_hash) html += sec(`<h2>Integridade</h2><p style="font-size:11px">Código do documento (SHA-256): <span class="hash" style="word-break:break-all">${esc(x.doc_hash)}</span><br>${conferido ? '<b style="color:#047857">✔ Conferido: o texto acima é exatamente o que foi assinado.</b>' : '<b style="color:#b91c1c">Atenção: não foi possível conferir a integridade do texto.</b>'}</p>
        <p style="font-size:11px;color:#3a4669">Assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I), realizada por link individual enviado ao responsável, com identificação por nome e CPF, registro de data, hora e dispositivo e trilha de auditoria no ICM Sistema.</p>`);
      return { title: `Comprovante — ${titulo}`, html, file: `comprovante-assinatura-${x.id}` };
    }
  });
})();
