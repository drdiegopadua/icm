/* Documentos: lista de espera, atas de reunião, voluntariado (termo Lei 9.608), recibos de doação,
   relatório ao doador, associados, pesquisas de satisfação e certificados com QR de verificação. */
(function () {
  const R = () => ICM.reports;
  const h = () => ICM.reports.h;
  const U = () => ICM.util;
  const api = () => ICM.api;
  const esc = s => U().esc(s);
  const I = (n, s) => ICM.icon(n, s);

  // ---------------- Lista de espera ----------------
  R().register('espera_classificacao', {
    title: 'Lista de espera — classificação', steps: ['Lendo inscrições', 'Aplicando critérios de pontuação', 'Classificando', 'Montando documento'],
    form: async (F, c) => F({ name: 'turma_id', label: 'Turma de interesse', type: 'select', options: [['', 'Todas as turmas'], ...c.optsT] }),
    build: async ({ turma_id }) => {
      const { sec, head, kpis, table, signs } = h();
      const l = await api().espera.list({ status: 'aguardando', turma_id: turma_id || undefined });
      const turmas = await api().espera.vagasTurmas();
      const tn = id => (turmas.find(t => t.id === id) || {}).nome || id;
      const T = ICM.C.TRIAGEM;
      let html = head('Lista de Espera — Classificação por Triagem Socioeconômica', `${turma_id ? tn(turma_id) : 'Todas as turmas'} — posição em ${U().fmtDate(U().today())}`);
      html += kpis([[l.length, 'Aguardando vaga'], [turmas.reduce((s, t) => s + (t.livres || 0), 0), 'Vagas abertas hoje'], [l.length ? Math.round(l.reduce((s, c) => s + c.triagem.total, 0) / l.length) : 0, 'Pontuação média'], [l.filter(c => c.encaminhamento).length, 'Encaminhados pela rede']]);
      html += sec(`<h2>Critérios de pontuação</h2>${table([{ t: 'Critério' }, { t: 'Pontos', c: 1 }], [...T.renda.map(x => [x.txt, x.pts]), [T.cadunico.txt, T.cadunico.pts], [T.beneficio.txt, T.beneficio.pts], [T.escola_publica.txt, T.escola_publica.pts], [T.encaminhamento.txt, T.encaminhamento.pts], ...Object.values(T.vulnerabilidades).map(v => [v.txt, v.pts]), [T.espera_mes.txt, '1 a 12']])}<p style="font-size:10.5px">Empate: vence quem se inscreveu primeiro. Critérios aplicados de forma automática e igual para todos os inscritos.</p>`);
      html += sec(`<h2>Classificação</h2>${table([{ t: 'Pos.', c: 1 }, { t: 'Protocolo' }, { t: 'Iniciais' }, { t: 'Idade', c: 1 }, { t: 'Interesse' }, { t: 'Inscrição' }, { t: 'Pontos', c: 1 }], l.map((c, i) => [i + 1, c.protocolo, U().initials(c.nome).split('').join('.') + '.', c.idade, (c.interesses || []).map(tn).join(', '), U().fmtDate(c.data_inscricao), { html: `<b>${c.triagem.total}</b>` }]))}
        <p style="font-size:10.5px">Por proteção de dados (LGPD), a lista pública identifica os candidatos apenas por protocolo e iniciais.</p>`);
      html += signs('Serviço social', 'Coordenação');
      return { title: 'Lista de espera — classificação', html, file: `lista-espera-${U().today()}` };
    }
  });

  R().register('espera_ficha', {
    title: 'Ficha de triagem', steps: ['Lendo inscrição', 'Calculando pontuação', 'Montando ficha'],
    build: async ({ id }) => {
      const { sec, head, meta, table, signs } = h();
      const c = await api().espera.get(id);
      const turmas = await api().espera.vagasTurmas();
      let html = head('Ficha de Triagem Socioeconômica', `${c.protocolo} — ${c.nome}`);
      html += meta([['Nascimento', `${U().fmtDate(c.nascimento)} (${c.idade} anos)`], ['Responsável', `${c.responsavel.nome} (${c.responsavel.parentesco || ''})`], ['Telefone', c.responsavel.telefone], ['Bairro', c.bairro], ['Escola', `${c.escola || ''} (${c.rede || ''})`], ['Interesse', (c.interesses || []).map(t => (turmas.find(x => x.id === t) || {}).nome).join(', ')], ['Renda familiar', U().money(c.renda_familiar)], ['Pessoas na casa', c.pessoas_casa], ['Renda per capita', c.triagem.renda_pc != null ? U().money(c.triagem.renda_pc) : '—'], ['Inscrição', U().fmtDate(c.data_inscricao)]]);
      html += sec(`<h2>Pontuação</h2>${table([{ t: 'Critério atendido' }, { t: 'Pontos', c: 1 }], c.triagem.itens.map(i => [i.txt, i.pts]).concat([[{ html: '<b>TOTAL</b>' }, { html: `<b>${c.triagem.total}</b>` }]]))}`);
      html += sec(`<p style="font-size:10.5px;color:#b91c1c"><b>CONFIDENCIAL</b> — dados socioeconômicos protegidos pela LGPD.</p>`) + signs('Responsável pela triagem', `${c.responsavel.nome} — Responsável`);
      return { title: `Triagem ${c.protocolo}`, html, file: `triagem-${c.protocolo}` };
    }
  });

  // ---------------- Reunião de pais: ata e lista de presença ----------------
  R().register('reuniao_ata', {
    title: 'Ata e lista de presença', steps: ['Lendo reunião', 'Listando famílias', 'Montando ata'],
    build: async ({ reuniao_id }) => {
      const { sec, head, meta, kpis, table, photos, signs } = h();
      const r = await api().reunioes.get(reuniao_id);
      const conv = await api().reunioes.convidados(r);
      const pres = conv.filter(c => r.presencas[c.id]);
      const p = r.projeto_id ? await api().projetos.get(r.projeto_id) : null;
      let html = head('Ata de Reunião com as Famílias', r.titulo);
      html += meta([['Data', U().fmtDateLong(r.data)], ['Horário', r.horario], ['Local', r.local], ['Público', p ? `Famílias do projeto ${p.nome}` : 'Todas as famílias']]);
      html += kpis([[conv.length, 'Famílias convidadas'], [pres.length, 'Famílias presentes'], [U().pct(pres.length, conv.length) + '%', 'Participação'], [(r.pauta || '').split('\n').filter(Boolean).length, 'Itens de pauta']]);
      html += sec(`<h2>Pauta</h2><ol>${(r.pauta || '').split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
      html += sec(`<h2>Registro da reunião</h2><p style="white-space:pre-wrap">${esc(r.ata || 'Ata ainda não registrada.')}</p>`);
      if (r.encaminhamentos) html += sec(`<h2>Encaminhamentos</h2><ul>${r.encaminhamentos.split('\n').filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
      html += sec(`<h2>Lista de presença</h2>${table([{ t: '#', c: 1 }, { t: 'Aluno(a)' }, { t: 'Responsável' }, { t: 'Presença', c: 1 }, { t: 'Assinatura' }], conv.map((c, i) => [i + 1, c.nome, c.responsavel.nome || '', r.presencas[c.id] ? { html: '<span class="P">Presente</span>' } : (r.data > U().today() ? '' : { html: '<span class="F">Ausente</span>' }), { html: '<div style="border-bottom:1px solid #94a3b8;height:16px;min-width:140px"></div>' }]))}`);
      if ((r.fotos || []).length) html += sec(`<h2>Registro fotográfico</h2>${photos(r.fotos, 6)}`);
      html += signs('Coordenação', 'Secretário(a) da reunião');
      return { title: `Ata — ${r.titulo}`, html, file: `ata-${r.data}` };
    }
  });

  // ---------------- Voluntariado ----------------
  R().register('voluntario_termo', {
    title: 'Termo de adesão ao serviço voluntário', steps: ['Lendo cadastro', 'Redigindo termo (Lei 9.608/98)', 'Montando documento'],
    build: async ({ voluntario_id }) => {
      const { sec, head, meta, signs } = h();
      const v = await api().voluntarios.get(voluntario_id);
      let html = head('Termo de Adesão ao Serviço Voluntário', 'Lei nº 9.608, de 18 de fevereiro de 1998');
      html += meta([['Voluntário(a)', v.nome], ['CPF', v.cpf || '—'], ['Nascimento', U().fmtDate(v.nascimento)], ['Telefone', v.telefone], ['E-mail', v.email], ['Profissão', v.profissao], ['Área de atuação', v.area], ['Disponibilidade', v.disponibilidade], ['Início', U().fmtDate(v.inicio)], ['Término previsto', v.fim ? U().fmtDate(v.fim) : 'Indeterminado']]);
      html += sec(`<h2>Cláusulas</h2><ol style="font-size:11.5px;padding-left:18px">
        <li>O(A) VOLUNTÁRIO(A) prestará serviço voluntário ao ${esc(ICM.C.ORG.razao)}, CNPJ ${esc(ICM.C.ORG.cnpj)}, na área acima descrita, nos termos da Lei nº 9.608/1998.</li>
        <li>O serviço voluntário é atividade não remunerada e <b>não gera vínculo empregatício</b>, nem obrigação de natureza trabalhista, previdenciária ou afim.</li>
        <li>O(A) voluntário(a) poderá ser ressarcido(a) por despesas que comprovadamente realizar no desempenho das atividades, desde que previamente autorizadas pela instituição.</li>
        <li>O(A) voluntário(a) compromete-se a cumprir as normas internas, o Estatuto da Criança e do Adolescente (ECA) e a manter <b>sigilo sobre os dados pessoais</b> de alunos e famílias a que tiver acesso (LGPD).</li>
        <li>É vedado ao(à) voluntário(a) fotografar, filmar ou divulgar imagens de alunos sem autorização expressa da instituição.</li>
        <li>As horas dedicadas serão registradas pela instituição e poderão ser certificadas.</li>
        <li>Este termo pode ser rescindido a qualquer tempo, por qualquer das partes, mediante comunicação.</li>
      </ol><p style="text-align:right;font-size:11.5px">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(v.inicio || U().today()))}.</p>`);
      html += signs(`${v.nome} — Voluntário(a)`, 'Pela instituição');
      return { title: `Termo de adesão — ${v.nome}`, html, file: `termo-voluntario-${v.id}` };
    }
  });

  R().register('voluntarios_horas', {
    title: 'Relatório de horas voluntárias', steps: ['Lendo voluntários', 'Somando horas', 'Calculando contrapartida', 'Montando documento'],
    form: async (F, c) => `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: `${c.ano}-01-01` })}${F({ name: 'ate', label: 'Até', type: 'date', value: U().today() })}</div>${F({ name: 'valor_hora', label: 'Valor-hora de referência (R$)', type: 'number', value: 25, hint: 'Usado para valorar a contrapartida em editais.' })}${F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', 'Todos'], ...c.optsP] })}`,
    build: async ({ de, ate, valor_hora, projeto_id }) => {
      const { sec, head, kpis, table, signs } = h();
      const vs = await api().voluntarios.list(); const projetos = await api().raw('projetos');
      const vh = Number(valor_hora) || 0;
      const linhas = [];
      vs.forEach(v => (v.horas || []).filter(x => x.data >= de && x.data <= ate && (!projeto_id || x.projeto_id === projeto_id)).forEach(x => linhas.push({ ...x, nome: v.nome, area: v.area })));
      const tot = linhas.reduce((s, x) => s + Number(x.horas), 0);
      const porV = vs.map(v => { const l = linhas.filter(x => x.nome === v.nome); return [v.nome, v.area, l.length, U().num(l.reduce((s, x) => s + Number(x.horas), 0), 1), vh ? U().money(l.reduce((s, x) => s + Number(x.horas), 0) * vh) : '—']; }).filter(r => r[2]);
      let html = head('Relatório de Horas de Trabalho Voluntário', `${U().fmtDate(de)} a ${U().fmtDate(ate)}${projeto_id ? ' — ' + (projetos.find(p => p.id === projeto_id) || {}).nome : ''}`);
      html += kpis([[porV.length, 'Voluntários atuantes'], [U().num(tot, 1) + 'h', 'Horas doadas'], [linhas.length, 'Atividades'], [vh ? U().money(tot * vh).replace(',00', '') : '—', 'Contrapartida valorada']]);
      html += sec(`<h2>Por voluntário</h2>${table([{ t: 'Voluntário(a)' }, { t: 'Área' }, { t: 'Atividades', c: 1 }, { t: 'Horas', c: 1 }, { t: 'Valor (ref.)', c: 1 }], porV)}`);
      html += sec(`<h2>Detalhamento</h2>${table([{ t: 'Data' }, { t: 'Voluntário(a)' }, { t: 'Atividade' }, { t: 'Projeto' }, { t: 'Horas', c: 1 }], linhas.sort((a, b) => a.data.localeCompare(b.data)).map(x => [U().fmtDate(x.data), x.nome, x.atividade, (projetos.find(p => p.id === x.projeto_id) || {}).nome || 'Institucional', U().num(x.horas, 1)]))}
        <p style="font-size:10.5px">Valor-hora de referência: ${vh ? esc(U().money(vh)) : 'não informado'}. Serviço voluntário nos termos da Lei 9.608/1998, sem vínculo empregatício.</p>`);
      html += signs('Coordenação', 'Direção');
      return { title: 'Horas voluntárias', html, file: `horas-voluntarias-${de}-${ate}` };
    }
  });

  // ---------------- Doações ----------------
  function porExtenso(v) { return U().money(v); }
  R().register('doacao_recibo', {
    title: 'Recibo de doação', steps: ['Lendo doação', 'Montando recibo'],
    build: async ({ doacao_id }) => {
      const { sec, head, meta, signs } = h();
      const d = (await api().doadores.doacoes()).find(x => x.id === doacao_id);
      const dr = await api().doadores.get(d.doador_id);
      const p = d.projeto_id ? await api().projetos.get(d.projeto_id) : null;
      let html = head('Recibo de Doação', d.recibo);
      html += sec(`<p style="font-size:13px;line-height:1.8;margin-top:10px">O <b>${esc(ICM.C.ORG.razao)}</b>, inscrito no CNPJ ${esc(ICM.C.ORG.cnpj)}, declara para os devidos fins que recebeu de <b>${esc(dr.nome)}</b>${dr.documento ? `, ${dr.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${esc(dr.documento)}` : ''}, em ${esc(U().fmtDateLong(d.data))}, a doação de ${d.tipo === 'dinheiro' ? `<b>${esc(porExtenso(d.valor))}</b>${d.forma ? ` por ${esc(d.forma)}` : ''}` : `${esc(ICM.C.TIPOS_DOACAO[d.tipo].toLowerCase())}: <b>${esc(d.descricao)}</b>, com valor estimado de ${esc(U().money(d.valor))}`}, destinada ${p ? `ao projeto <b>${esc(p.nome)}</b>` : 'às atividades institucionais'}.</p>`);
      html += meta([['Recibo', d.recibo], ['Tipo', ICM.C.TIPOS_DOACAO[d.tipo]], ['Valor', U().money(d.valor)], ['Destinação', p ? p.nome : 'Institucional'], ['Descrição', d.descricao]]);
      html += sec(`<p style="margin-top:14px">Agradecemos sua contribuição para a transformação de crianças e adolescentes por meio da cultura, do esporte, do meio ambiente, da educação e da saúde.</p><p style="text-align:right">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(d.data))}.</p>`);
      html += signs('Tesouraria', 'Presidência');
      return { title: `Recibo ${d.recibo}`, html, file: `recibo-${d.recibo}` };
    }
  });

  R().register('doador_relatorio', {
    title: 'Relatório ao doador', steps: ['Reunindo doações', 'Medindo o impacto apoiado', 'Montando relatório de agradecimento'],
    form: async (F, c) => F({ name: 'ano', label: 'Ano', type: 'select', options: c.anos, value: c.ano }),
    build: async ({ doador_id, ano }) => {
      const { sec, head, kpis, table, photos, signs } = h();
      ano = ano || U().today().slice(0, 4);
      const dr = await api().doadores.get(doador_id);
      const ds = (await api().doadores.doacoes({ doador_id })).filter(x => x.data.startsWith(ano));
      const tot = ds.reduce((s, x) => s + Number(x.valor), 0);
      const projIds = [...new Set(ds.map(x => x.projeto_id).filter(Boolean))];
      let html = head(`Relatório de Impacto para ${dr.nome}`, `Sua contribuição em ${ano}`);
      html += sec(`<p style="font-size:13px">Prezado(a) ${esc(dr.contato || dr.nome)}, obrigado por caminhar com o ${esc(ICM.C.ORG.nome)}. Este relatório mostra como sua contribuição foi aplicada e o que ela ajudou a construir.</p>`);
      html += kpis([[ds.length, 'Doações no ano'], [U().money(tot).replace(',00', ''), 'Total doado'], [projIds.length || 'Institucional', 'Projetos apoiados'], [ds[0] ? U().fmtDate(ds[ds.length - 1].data) : '—', 'Desde']]);
      html += sec(`<h2>Suas doações</h2>${table([{ t: 'Data' }, { t: 'Recibo' }, { t: 'Tipo' }, { t: 'Descrição' }, { t: 'Valor', c: 1 }], ds.map(x => [U().fmtDate(x.data), x.recibo, ICM.C.TIPOS_DOACAO[x.tipo], x.descricao, U().money(x.valor)]))}`);
      const projetos = projIds.length ? await Promise.all(projIds.map(id => api().projetos.get(id))) : (await api().projetos.list()).filter(p => p.status === 'execucao');
      html += sec(`<h2>${projIds.length ? 'O que você ajudou a fazer' : 'Projetos que sua doação institucional fortalece'}</h2>`);
      let fotos = [];
      for (const p of projetos) {
        const s = await api().projetos.stats(p.id, { de: `${ano}-01-01`, ate: `${ano}-12-31` });
        const turmas = await api().turmas.list(p.id);
        for (const t of turmas) (await api().aulas.list(t.id)).forEach(a => (a.fotos || []).forEach(f => fotos.push(f)));
        html += sec(`<div class="lesson" style="border-left-color:${esc(p.cor)}"><div class="lh"><span>${esc(p.nome)}</span><span>${esc(ICM.C.AREAS[p.area].nome)}</span></div><p>${esc(p.objetivo_geral)}</p><p><b>${s.atendidos}</b> crianças e adolescentes · <b>${s.aulas}</b> aulas · <b>${U().num(s.horas)}h</b> de atividades · frequência <b>${s.freq}%</b> · <b>${s.eventos}</b> eventos</p></div>`);
      }
      html += sec(`<h2>Momentos</h2>${photos(fotos.slice(-6), 6)}<p style="font-size:10.5px">Imagens de alunos com autorização de uso de imagem dos responsáveis.</p>`);
      html += signs('Presidência', 'Direção executiva');
      return { title: `Relatório ao doador — ${dr.nome}`, html, file: `relatorio-doador-${dr.id}-${ano}` };
    }
  });

  R().register('doacoes_periodo', {
    title: 'Relatório de doações', steps: ['Lendo doações', 'Agrupando por doador e projeto', 'Montando documento'],
    form: async (F, c) => `<div class="grid grid-2">${F({ name: 'de', label: 'De', type: 'date', value: `${c.ano}-01-01` })}${F({ name: 'ate', label: 'Até', type: 'date', value: U().today() })}</div>`,
    build: async ({ de, ate }) => {
      const { sec, head, kpis, table, barChart, signs } = h();
      const ds = await api().doadores.doacoes({ de, ate }); const drs = await api().doadores.list(); const projetos = await api().raw('projetos');
      const tot = ds.reduce((s, x) => s + Number(x.valor), 0);
      const nome = id => (drs.find(d => d.id === id) || {}).nome || '?';
      const porDoador = drs.map(d => { const l = ds.filter(x => x.doador_id === d.id); return [d.nome, d.tipo, l.length, l.reduce((s, x) => s + Number(x.valor), 0)]; }).filter(r => r[2]).sort((a, b) => b[3] - a[3]);
      const porProj = [['Institucional', ''], ...projetos.map(p => [p.nome, p.id])].map(([n, id]) => [n, ds.filter(x => (x.projeto_id || '') === id).reduce((s, x) => s + Number(x.valor), 0)]).filter(r => r[1]);
      let html = head('Relatório de Doações Recebidas', `${U().fmtDate(de)} a ${U().fmtDate(ate)}`);
      html += kpis([[ds.length, 'Doações'], [porDoador.length, 'Doadores'], [U().money(tot).replace(',00', ''), 'Total arrecadado'], [U().money(ds.filter(x => x.tipo === 'dinheiro').reduce((s, x) => s + Number(x.valor), 0)).replace(',00', ''), 'Em dinheiro']]);
      html += sec(`<h2>Por destinação</h2>${barChart(porProj.map(([n, v]) => ({ l: n.split(' ')[0], v, lbl: U().money(v).replace(',00', '') })))}`);
      html += sec(`<h2>Por doador</h2>${table([{ t: 'Doador' }, { t: 'Tipo' }, { t: 'Doações', c: 1 }, { t: 'Total', c: 1 }], porDoador.map(r => [r[0], r[1], r[2], U().money(r[3])]))}`);
      html += sec(`<h2>Todas as doações</h2>${table([{ t: 'Data' }, { t: 'Recibo' }, { t: 'Doador' }, { t: 'Tipo' }, { t: 'Destinação' }, { t: 'Valor', c: 1 }], ds.map(x => [U().fmtDate(x.data), x.recibo, nome(x.doador_id), ICM.C.TIPOS_DOACAO[x.tipo], (projetos.find(p => p.id === x.projeto_id) || {}).nome || 'Institucional', U().money(x.valor)]))}`);
      html += signs('Tesouraria', 'Presidência');
      return { title: 'Relatório de doações', html, file: `doacoes-${de}-${ate}` };
    }
  });

  // ---------------- Associados ----------------
  R().register('associados_situacao', {
    title: 'Situação dos associados', steps: ['Lendo associados', 'Conferindo mensalidades', 'Calculando inadimplência', 'Montando documento'],
    form: async () => '<p class="small muted">Gera a posição atual de todos os associados: em dia, inadimplentes e alunos sem CadÚnico que ainda não se associaram.</p>',
    build: async () => {
      const { sec, head, kpis, table, signs } = h();
      const l = await api().associados.list(); const pend = await api().associados.pendentes();
      const ativos = l.filter(a => a.status === 'ativo'), inad = ativos.filter(a => !a.em_dia);
      const ms = await api().associados.mensalidades(); const ano = U().today().slice(0, 4);
      let html = head('Situação do Quadro de Associados', `Posição em ${U().fmtDate(U().today())}`);
      html += kpis([[ativos.length, 'Associados ativos'], [ativos.length - inad.length, 'Em dia'], [inad.length, 'Inadimplentes'], [U().money(ms.filter(m => m.status === 'paga' && m.competencia.startsWith(ano)).reduce((s, m) => s + Number(m.valor), 0)).replace(',00', ''), `Arrecadado em ${ano}`]]);
      if (inad.length) html += sec(`<h2>Inadimplentes</h2>${table([{ t: 'Nº' }, { t: 'Titular' }, { t: 'Aluno(a)' }, { t: 'Telefone' }, { t: 'Parcelas', c: 1 }, { t: 'Débito', c: 1 }, { t: 'Atraso', c: 1 }], inad.sort((a, b) => b.dias_atraso - a.dias_atraso).map(a => [a.numero, a.titular, a.aluno_nome, a.telefone, a.vencidas, U().money(a.divida), a.dias_atraso + ' dias']))}`);
      html += sec(`<h2>Todos os associados</h2>${table([{ t: 'Nº' }, { t: 'Titular' }, { t: 'Aluno(a)' }, { t: 'Adesão' }, { t: 'Mensalidade', c: 1 }, { t: 'Situação' }], l.map(a => [a.numero, a.titular, a.aluno_nome, U().fmtDate(a.data_adesao), U().money(a.valor_mensal), a.status !== 'ativo' ? a.status : a.em_dia ? { html: '<span class="tag ok">Em dia</span>' } : { html: '<span class="tag danger">Inadimplente</span>' }]))}`);
      if (pend.length) html += sec(`<h2>Alunos sem CadÚnico ainda não associados</h2>${table([{ t: 'Aluno(a)' }, { t: 'Matrícula' }, { t: 'Responsável' }, { t: 'Telefone' }], pend.map(a => [a.nome, a.matricula, (a.responsavel || {}).nome, (a.responsavel || {}).telefone]))}`);
      html += signs('Tesouraria', 'Presidência');
      return { title: 'Situação dos associados', html, file: `associados-${U().today()}` };
    }
  });

  R().register('mensalidade_recibo', {
    title: 'Recibo de mensalidade', steps: ['Lendo pagamento', 'Montando recibo'],
    build: async ({ id }) => {
      const { sec, head, meta, signs } = h();
      const m = (await api().associados.mensalidades()).find(x => x.id === id);
      const a = await api().associados.get(m.associado_id);
      let html = head('Recibo de Contribuição Associativa', m.recibo);
      html += sec(`<p style="font-size:13px;line-height:1.8">Recebemos de <b>${esc(a.titular)}</b>, associado(a) nº ${esc(a.numero)}, a importância de <b>${esc(U().money(m.valor))}</b>, referente à contribuição associativa da competência <b>${esc(U().fmtMonth(m.competencia))}</b>, paga em ${esc(U().fmtDate(m.pago_em))} via ${esc(m.forma || '—')}.</p>`);
      html += meta([['Recibo', m.recibo], ['Competência', U().fmtMonth(m.competencia)], ['Vencimento', U().fmtDate(m.vencimento)], ['Pagamento', U().fmtDate(m.pago_em)]]);
      html += signs('Tesouraria', `${a.titular} — Associado(a)`);
      return { title: `Recibo ${m.recibo}`, html, file: `recibo-${m.recibo}` };
    }
  });

  // ---------------- Pesquisas ----------------
  R().register('pesquisa_resultado', {
    title: 'Resultado da pesquisa', steps: ['Lendo respostas', 'Calculando NPS e médias', 'Montando gráficos'],
    build: async ({ pesquisa_id }) => {
      const { sec, head, kpis, barChart, table } = h();
      const p = await api().pesquisas.get(pesquisa_id); const r = p.res;
      let html = head('Resultado de Pesquisa de Satisfação', p.titulo);
      html += kpis([[r.n, 'Respostas'], [r.nps != null ? r.nps : '—', 'NPS (-100 a 100)'], [r.satisfacao != null ? U().num(r.satisfacao, 1) + '/5' : '—', 'Satisfação média'], [`${U().fmtDate(p.inicio)}`, 'Início']]);
      r.porPergunta.forEach((q, i) => {
        let body = '';
        if (q.tipo === 'nps') body = `<p>NPS <b>${q.nps}</b> — promotores ${q.prom}, neutros ${q.neu}, detratores ${q.det} (média ${U().num(q.media, 1)})</p>${barChart([{ l: 'Detratores (0-6)', v: q.det }, { l: 'Neutros (7-8)', v: q.neu }, { l: 'Promotores (9-10)', v: q.prom }])}`;
        else if (q.tipo === 'escala') body = `<p>Média <b>${U().num(q.media, 1)}</b> de 5 (${q.n} respostas)</p>${barChart(q.dist.map((v, k) => ({ l: ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'][k], v })))}`;
        else if (q.tipo === 'sim_nao') body = `<p><b>${q.pct}%</b> responderam sim (${q.sim} sim · ${q.nao} não)</p>`;
        else body = table([{ t: 'Comentários' }], q.comentarios.filter(Boolean).map(c => [c]));
        html += sec(`<h2>${i + 1}. ${esc(q.texto)}</h2>${body}`);
      });
      html += sec('<p style="font-size:10.5px">Pesquisa anônima: o sistema não registra quem respondeu.</p>');
      return { title: `Pesquisa — ${p.titulo}`, html, file: `pesquisa-${p.id}` };
    }
  });

  // ---------------- Certificados (A4 paisagem, com QR de verificação) ----------------
  function urlVerificacao(codigo) { return `${location.origin}${location.pathname}#/verificar/${codigo}`; }
  function qrSvg(texto) {
    if (!window.qrcode) return '';
    const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }
  function certHtml(c) {
    const T = ICM.C.TIPOS_CERTIFICADO[c.tipo] || ICM.C.TIPOS_CERTIFICADO.outro;
    return `<div class="cert-page"><div class="cert" style="--c:${T.cor}">
      <div class="cert-corner tl"></div><div class="cert-corner br"></div>
      <div class="cert-head">${ICM.logo(64)}<div><div class="cert-org">${esc(ICM.C.ORG.razao)}</div><div class="cert-cnpj">CNPJ ${esc(ICM.C.ORG.cnpj)}</div></div></div>
      <div class="cert-title">Certificado</div>
      <div class="cert-sub">${esc(T.nome)}</div>
      <p class="cert-text">Certificamos que <b class="cert-nome">${esc(c.nome)}</b> ${esc(c.descricao || 'participou de')} — <b>${esc(c.titulo)}</b>${c.carga_horaria ? `, com carga horária de <b>${esc(U().num(c.carga_horaria, 0))} horas</b>` : ''}.</p>
      <p class="cert-data">${esc(ICM.C.ORG.cidade)}, ${esc(U().fmtDateLong(c.data_emissao))}.</p>
      <div class="cert-foot">
        <div class="cert-sign"><div></div>Coordenação</div>
        <div class="cert-qr">${qrSvg(urlVerificacao(c.codigo))}<div><b>Verifique a autenticidade</b><br>Leia o QR Code ou acesse o sistema e informe o código:<br><span class="cert-code">${esc(c.codigo)}</span></div></div>
        <div class="cert-sign"><div></div>Presidência</div>
      </div>
      ${c.status === 'revogado' ? '<div class="cert-revogado">REVOGADO</div>' : ''}
    </div></div>`;
  }
  async function imprimirCertificados(lista) {
    await h().animate(lista.length > 1 ? `${lista.length} certificados` : 'Certificado', ['Gerando códigos de verificação', 'Desenhando QR Codes', 'Diagramando certificados'], async () => true);
    const v = document.createElement('div');
    v.className = 'report-viewer cert-viewer';
    v.innerHTML = `<style>@page{size:A4 landscape;margin:0}</style><div class="report-toolbar"><button class="btn btn-sm" data-x aria-label="Voltar">${I("arrowLeft", 16)} Voltar</button><div class="title truncate">${lista.length} certificado(s)</div><button class="btn btn-sm btn-primary" data-pr>${I('printer', 16)} Imprimir / Salvar PDF</button><button class="btn btn-sm btn-icon" data-x2 aria-label="Fechar" title="Fechar (Esc)">${I("x", 18)}</button></div><div class="report-scroll">${lista.map(certHtml).join('')}</div>`;
    document.body.appendChild(v); document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => { v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
    document.addEventListener('keydown', onKey);
    v.querySelector('[data-x]').addEventListener('click', close);
    v.querySelector('[data-x2]').addEventListener('click', close);
    v.querySelector('[data-pr]').addEventListener('click', () => window.print());
  }

  ICM.reports.certificados = imprimirCertificados;
  ICM.reports.urlVerificacao = urlVerificacao;
  ICM.reports.qrSvg = qrSvg;
})();
