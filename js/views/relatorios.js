/* Relatórios em folha timbrada (imprimir / salvar PDF pelo navegador) */
(function () {
  const { esc, icon, $ } = UI;
  window.Views = window.Views || {};

  const INSTITUTO = {
    nome: 'Instituto Cultural das Montanhas',
    razao: 'Instituto Três Pontões de Ação Social e Cultural',
    cnpj: '51.892.817/0001-52',
    cidade: 'Afonso Cláudio – ES',
  };

  function abrir(titulo, corpo) {
    const camada = document.createElement('div');
    camada.className = 'doc-camada';
    camada.innerHTML = `
      <div class="doc-barra"><b>${esc(titulo)}</b>
        <button class="btn" data-imprimir>${icon('imprimir')}Imprimir / salvar PDF</button>
        <button class="btn sec" data-fechar>${icon('fechar')}Fechar</button></div>
      <article class="doc">
        <header class="timbre"><img src="img/logo-cor.png" alt="">
          <div class="txt"><b>${INSTITUTO.razao}</b>${INSTITUTO.nome}<br>CNPJ ${INSTITUTO.cnpj} · ${INSTITUTO.cidade}</div></header>
        ${corpo}
        <div class="rod">Documento gerado pelo sistema ICM em ${UI.data(UI.hojeISO())} por ${esc(Store.sessao()?.nome || '')}</div>
      </article>`;
    document.body.appendChild(camada);
    const fechar = () => { camada.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    camada.querySelector('[data-fechar]').onclick = fechar;
    camada.querySelector('[data-imprimir]').onclick = () => window.print();
    camada.scrollTop = 0;
  }

  const assinaturas = (a = 'Coordenação Pedagógica', b = 'Presidência') => `<div class="assinaturas"><div>${esc(a)}</div><div>${esc(b)}</div></div>`;
  const kpis = (lista) => `<div class="kpis">${lista.map(([v, r]) => `<div><b>${v}</b><small>${esc(r)}</small></div>`).join('')}</div>`;
  const tabelaFreq = (alunos, aulas) => `<table><thead><tr><th>Aluno</th>${aulas.map((au) => `<th class="mkp">${au.data.slice(8, 10)}</th>`).join('')}<th class="n">P</th><th class="n">F</th><th class="n">J</th><th class="n">%</th></tr></thead>
    <tbody>${alunos.map((a) => { const c = D.contar(aulas, a.id); return `<tr><td>${esc(a.nome)}</td>${aulas.map((au) => `<td class="mkp">${au.presencas?.[a.id] || ''}</td>`).join('')}<td class="n">${c.p}</td><td class="n">${c.f}</td><td class="n">${c.j}</td><td class="n">${UI.pct(c.pct)}</td></tr>`; }).join('')}</tbody></table>`;

  /* Relatório mensal da turma */
  function mensalTurma(tid, mes) {
    const t = D.turma(tid), p = D.projeto(t.projeto_id);
    const aulas = D.aulasDaTurma(tid, mes);
    const alunos = D.alunosDaTurma(tid, true).filter((a) => a.status === 'ativo' || aulas.some((au) => au.presencas && a.id in au.presencas));
    const pl = D.plano(tid, mes);
    abrir(`Relatório mensal – ${t.nome}`, `
      <h1>Relatório Mensal da Turma</h1>
      <p class="subt">${esc(t.nome)} · ${esc(p?.nome || '')} · ${UI.mesNome(mes)}</p>
      <table><tr><th>Projeto</th><td>${esc(p?.nome || '')} (${esc(p?.instrumento || '')})</td><th>Professor(a)</th><td>${esc(D.nomePessoa(t.professor_id))}</td></tr>
        <tr><th>Dias/horário</th><td>${esc(D.diasTexto(t.dias))} · ${esc(t.horario)}</td><th>Local</th><td>${esc(t.local)}</td></tr></table>
      <h2>Indicadores</h2>
      ${kpis([[aulas.length, 'aulas realizadas'], [alunos.length, 'alunos'], [UI.pct(D.freqTurma(tid, mes)), 'frequência média'], [aulas.filter((a) => !a.conteudo).length, 'aulas sem relatório']])}
      <h2>Plano de aula do mês</h2>
      ${pl ? `<table><tr><th style="width:24%">Objetivos</th><td class="bloco-txt">${esc(pl.objetivos)}</td></tr><tr><th>Conteúdos</th><td class="bloco-txt">${esc(pl.conteudos)}</td></tr><tr><th>Metodologia</th><td class="bloco-txt">${esc(pl.metodologia)}</td></tr><tr><th>Avaliação</th><td class="bloco-txt">${esc(pl.avaliacao)}</td></tr></table>` : '<p><i>Plano de aula não enviado.</i></p>'}
      <h2>Registro das aulas</h2>
      <table><thead><tr><th style="width:80px">Data</th><th>Conteúdo e relatório</th><th class="n" style="width:60px">Pres.</th></tr></thead><tbody>
      ${aulas.map((au) => `<tr><td>${UI.data(au.data)}</td><td><b>${esc(au.conteudo || '—')}</b>${au.relatorio ? `<br>${esc(au.relatorio)}` : ''}${au.observacoes ? `<br><i>${esc(au.observacoes)}</i>` : ''}</td><td class="n">${Object.values(au.presencas || {}).filter((v) => v === 'P').length}</td></tr>`).join('') || '<tr><td colspan="3">Nenhuma aula registrada.</td></tr>'}
      </tbody></table>
      <h2 class="quebra">Frequência</h2>
      ${aulas.length ? tabelaFreq(alunos, aulas) : '<p>Sem registros.</p>'}
      <p style="font-size:11px;color:#666">P = presente · F = falta · J = falta justificada</p>
      ${assinaturas(D.nomePessoa(t.professor_id) + ' – Professor(a)', 'Coordenação Pedagógica')}`);
  }

  /* Relatório mensal do projeto */
  function mensalProjeto(pid, mes) {
    const p = D.projeto(pid);
    const ts = D.turmasDoProjeto(pid);
    const evs = Store.filtrar('eventos', (e) => e.projeto_id === pid && e.data.startsWith(mes));
    const alunosIds = new Set();
    let aulasTot = 0;
    const linhas = ts.map((t) => {
      const aulas = D.aulasDaTurma(t.id, mes);
      aulasTot += aulas.length;
      const ids = new Set(aulas.flatMap((a) => Object.keys(a.presencas || {})));
      ids.forEach((i) => alunosIds.add(i));
      return `<tr><td>${esc(t.nome)}</td><td>${esc(D.nomePessoa(t.professor_id))}</td><td class="n">${ids.size}</td><td class="n">${aulas.length}</td><td class="n">${UI.pct(D.freqTurma(t.id, mes))}</td><td>${D.plano(t.id, mes) ? 'Enviado' : 'Pendente'}</td><td class="n">${aulas.filter((a) => !a.conteudo).length}</td></tr>`;
    }).join('');
    const desp = Store.filtrar('despesas', (d) => d.projeto_id === pid && d.data.startsWith(mes));
    abrir(`Relatório mensal – ${p.nome}`, `
      <h1>Relatório Mensal do Projeto</h1>
      <p class="subt">${esc(p.nome)} · ${UI.mesNome(mes)}</p>
      <table><tr><th>Instrumento</th><td>${esc(p.fonte)} ${esc(p.instrumento)}</td><th>Financiador</th><td>${esc(p.financiador)}</td></tr><tr><th>Vigência</th><td>${UI.data(p.inicio)} a ${UI.data(p.fim)}</td><th>Coordenação</th><td>${esc(D.nomePessoa(p.coordenador))}</td></tr></table>
      <h2>Indicadores do mês</h2>
      ${kpis([[ts.length, 'turmas'], [alunosIds.size, 'alunos atendidos'], [aulasTot, 'aulas realizadas'], [UI.pct(D.freqProjeto(pid, mes)), 'frequência média']])}
      <h2>Turmas</h2>
      <table><thead><tr><th>Turma</th><th>Professor(a)</th><th class="n">Alunos</th><th class="n">Aulas</th><th class="n">Freq.</th><th>Plano</th><th class="n">Sem relat.</th></tr></thead><tbody>${linhas}</tbody></table>
      <h2>Eventos e apresentações</h2>
      ${evs.length ? `<table><thead><tr><th>Data</th><th>Evento</th><th>Local</th><th class="n">Alunos</th></tr></thead><tbody>${evs.map((e) => `<tr><td>${UI.data(e.data)}</td><td>${esc(e.nome)}</td><td>${esc(e.local)} – ${esc(e.cidade)}</td><td class="n">${e.participantes.length}</td></tr>`).join('')}</tbody></table>` : '<p>Nenhum evento no mês.</p>'}
      <h2>Despesas do mês</h2>
      ${desp.length ? `<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="n">Valor</th></tr></thead><tbody>${desp.map((d) => `<tr><td>${UI.data(d.data)}</td><td>${esc(d.descricao)}</td><td>${esc(d.categoria)}</td><td class="n">${UI.moeda(d.valor)}</td></tr>`).join('')}<tr><th colspan="3">Total</th><th class="n">${UI.moeda(desp.reduce((s, d) => s + d.valor, 0))}</th></tr></tbody></table>` : '<p>Nenhuma despesa lançada.</p>'}
      ${assinaturas()}`);
  }

  /* Prestação de contas: execução física + financeira */
  function prestacaoContas(pid, ini, fim) {
    const p = D.projeto(pid);
    const ts = D.turmasDoProjeto(pid);
    const desp = Store.filtrar('despesas', (d) => d.projeto_id === pid && d.data >= ini && d.data <= fim).sort((a, b) => a.data.localeCompare(b.data));
    const total = desp.reduce((s, d) => s + d.valor, 0);
    const porCat = {};
    desp.forEach((d) => (porCat[d.categoria] = (porCat[d.categoria] || 0) + d.valor));
    const aulas = Store.filtrar('aulas', (a) => ts.some((t) => t.id === a.turma_id) && a.data >= ini && a.data <= fim);
    const atendidos = new Set(aulas.flatMap((a) => Object.keys(a.presencas || {})));
    let pr = 0, tt = 0;
    aulas.forEach((a) => Object.values(a.presencas || {}).forEach((v) => { tt++; if (v !== 'F') pr++; }));
    const evs = Store.filtrar('eventos', (e) => e.projeto_id === pid && e.data >= ini && e.data <= fim);
    abrir(`Prestação de contas – ${p.nome}`, `
      <h1>Relatório de Prestação de Contas</h1>
      <p class="subt">${esc(p.nome)} · período de ${UI.data(ini)} a ${UI.data(fim)}</p>
      <h2>1. Identificação</h2>
      <table><tr><th>Projeto</th><td>${esc(p.nome)}</td></tr><tr><th>Instrumento</th><td>${esc(p.fonte)} nº ${esc(p.instrumento)}</td></tr><tr><th>Concedente</th><td>${esc(p.financiador)}</td></tr><tr><th>Vigência</th><td>${UI.data(p.inicio)} a ${UI.data(p.fim)}</td></tr><tr><th>Valor pactuado</th><td>${UI.moeda(p.valor)}</td></tr><tr><th>Objeto</th><td>${esc(p.descricao)}</td></tr></table>
      <h2>2. Execução física</h2>
      ${kpis([[atendidos.size, 'beneficiários atendidos'], [aulas.length, 'aulas realizadas'], [tt ? UI.pct((pr / tt) * 100) : '—', 'frequência média'], [evs.length, 'eventos realizados']])}
      <table style="margin-top:10px"><thead><tr><th>Meta pactuada</th><th>Situação no período</th></tr></thead><tbody>${(p.metas || '').split('\n').filter(Boolean).map((m) => `<tr><td>${esc(m)}</td><td style="width:45%">&nbsp;</td></tr>`).join('')}</tbody></table>
      <table style="margin-top:10px"><thead><tr><th>Turma</th><th>Professor(a)</th><th class="n">Aulas</th><th class="n">Alunos</th></tr></thead><tbody>${ts.map((t) => { const au = aulas.filter((a) => a.turma_id === t.id); return `<tr><td>${esc(t.nome)}</td><td>${esc(D.nomePessoa(t.professor_id))}</td><td class="n">${au.length}</td><td class="n">${new Set(au.flatMap((a) => Object.keys(a.presencas || {}))).size}</td></tr>`; }).join('')}</tbody></table>
      ${evs.length ? `<table style="margin-top:10px"><thead><tr><th>Data</th><th>Evento</th><th>Local</th><th class="n">Participantes</th></tr></thead><tbody>${evs.map((e) => `<tr><td>${UI.data(e.data)}</td><td>${esc(e.nome)}</td><td>${esc(e.cidade)}</td><td class="n">${e.participantes.length}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>3. Execução financeira</h2>
      <table><thead><tr><th>Categoria</th><th class="n">Valor executado</th><th class="n">% do total</th></tr></thead><tbody>
        ${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="n">${UI.moeda(v)}</td><td class="n">${((v / total) * 100).toFixed(1)}%</td></tr>`).join('')}
        <tr><th>Total executado no período</th><th class="n">${UI.moeda(total)}</th><th class="n">100%</th></tr>
        <tr><td>Saldo em relação ao valor pactuado</td><td class="n">${UI.moeda(p.valor - D.gastoProjeto(pid, fim))}</td><td></td></tr>
      </tbody></table>
      <h2 class="quebra">4. Relação de pagamentos</h2>
      <table><thead><tr><th>Data</th><th>Favorecido</th><th>Descrição</th><th>Documento</th><th class="n">Valor</th></tr></thead><tbody>
        ${desp.map((d) => `<tr><td>${UI.data(d.data)}</td><td>${esc(d.fornecedor || '')}</td><td>${esc(d.descricao)}</td><td>${esc(d.documento || '')}</td><td class="n">${UI.moeda(d.valor)}</td></tr>`).join('')}
        <tr><th colspan="4">Total</th><th class="n">${UI.moeda(total)}</th></tr></tbody></table>
      <p style="margin-top:18px">Declaramos, para os devidos fins, que os recursos foram aplicados exclusivamente no objeto do instrumento acima, conforme o plano de trabalho aprovado.</p>
      ${assinaturas('Presidência', 'Responsável financeiro')}`);
  }

  /* Relatório de atividades do ano */
  function atividadesAno(ano) {
    const projetos = Store.todos('projetos');
    const aulas = Store.filtrar('aulas', (a) => a.data.startsWith(ano));
    const atendidos = new Set(aulas.flatMap((a) => Object.keys(a.presencas || {})));
    const evs = Store.filtrar('eventos', (e) => e.data.startsWith(ano) && e.data <= UI.hojeISO()).sort((a, b) => a.data.localeCompare(b.data));
    const matriculas = Store.filtrar('alunos', (a) => (a.data_matricula || '').startsWith(ano)).length;
    const regs = Store.filtrar('registros', (r) => r.data.startsWith(ano));
    const cont = (t) => regs.filter((r) => r.tipo === t).length;
    const meses = [...new Set(aulas.map((a) => a.data.slice(0, 7)))].sort();
    const alunos = Store.todos('alunos').filter((a) => atendidos.has(a.id));
    const porSexo = { F: alunos.filter((a) => a.sexo === 'F').length, M: alunos.filter((a) => a.sexo === 'M').length };
    const faixas = [['6 a 10 anos', 6, 10], ['11 a 14 anos', 11, 14], ['15 a 17 anos', 15, 17], ['18+', 18, 200]].map(([r, a, b]) => [r, alunos.filter((x) => { const i = UI.idade(x.nascimento); return i >= a && i <= b; }).length]);
    const bairros = {};
    alunos.forEach((a) => (bairros[a.endereco?.bairro || '—'] = (bairros[a.endereco?.bairro || '—'] || 0) + 1));
    const max = Math.max(1, ...meses.map((m) => aulas.filter((a) => a.data.startsWith(m)).length));
    abrir(`Relatório de atividades ${ano}`, `
      <h1>Relatório de Atividades ${esc(ano)}</h1>
      <p class="subt">Consolidado das ações do Instituto até ${UI.data(UI.hojeISO())}</p>
      <h2>Números do ano</h2>
      ${kpis([[atendidos.size, 'alunos atendidos'], [aulas.length, 'aulas realizadas'], [evs.length, 'eventos realizados'], [matriculas, 'novas matrículas']])}
      <div style="height:8px"></div>
      ${kpis([[projetos.length, 'projetos'], [Store.todos('turmas').length, 'turmas'], [cont('atend_social') + cont('atend_psicologico') + cont('atend_pedagogico'), 'atendimentos técnicos'], [Store.filtrar('alunos', (a) => a.van?.usa && a.status === 'ativo').length, 'alunos com transporte']])}
      <h2>Projetos</h2>
      <table><thead><tr><th>Projeto</th><th>Área</th><th class="n">Turmas</th><th class="n">Alunos</th><th class="n">Aulas</th><th class="n">Freq.</th></tr></thead><tbody>
      ${projetos.map((p) => { const ts = D.turmasDoProjeto(p.id); const au = aulas.filter((a) => ts.some((t) => t.id === a.turma_id)); let pr = 0, tt = 0; au.forEach((a) => Object.values(a.presencas || {}).forEach((v) => { tt++; if (v !== 'F') pr++; })); return `<tr><td>${esc(p.nome)}</td><td>${esc(p.area)}</td><td class="n">${ts.length}</td><td class="n">${new Set(au.flatMap((a) => Object.keys(a.presencas || {}))).size}</td><td class="n">${au.length}</td><td class="n">${tt ? UI.pct((pr / tt) * 100) : '—'}</td></tr>`; }).join('')}
      </tbody></table>
      <h2>Aulas por mês</h2>
      <table><tbody>${meses.map((m) => { const n = aulas.filter((a) => a.data.startsWith(m)).length; return `<tr><td style="width:130px">${UI.mesNome(m)}</td><td><div class="barra-doc"><i style="width:${(n / max) * 100}%"></i></div></td><td class="n" style="width:60px">${n}</td></tr>`; }).join('')}</tbody></table>
      <h2>Perfil dos atendidos</h2>
      <table><thead><tr><th>Sexo</th><th class="n">Alunos</th><th>Faixa etária</th><th class="n">Alunos</th></tr></thead><tbody>
        <tr><td>Feminino</td><td class="n">${porSexo.F}</td><td>${faixas[0][0]}</td><td class="n">${faixas[0][1]}</td></tr>
        <tr><td>Masculino</td><td class="n">${porSexo.M}</td><td>${faixas[1][0]}</td><td class="n">${faixas[1][1]}</td></tr>
        <tr><td></td><td></td><td>${faixas[2][0]}</td><td class="n">${faixas[2][1]}</td></tr>
        <tr><td></td><td></td><td>${faixas[3][0]}</td><td class="n">${faixas[3][1]}</td></tr></tbody></table>
      <table style="margin-top:8px"><thead><tr><th>Bairro / comunidade</th><th class="n">Alunos</th></tr></thead><tbody>${Object.entries(bairros).sort((a, b) => b[1] - a[1]).map(([b, n]) => `<tr><td>${esc(b)}</td><td class="n">${n}</td></tr>`).join('')}</tbody></table>
      <h2>Eventos e apresentações</h2>
      ${evs.length ? `<table><thead><tr><th>Data</th><th>Evento</th><th>Local</th><th class="n">Alunos</th></tr></thead><tbody>${evs.map((e) => `<tr><td>${UI.data(e.data)}</td><td>${esc(e.nome)}</td><td>${esc(e.local)} – ${esc(e.cidade)}</td><td class="n">${e.participantes.length}</td></tr>`).join('')}</tbody></table>` : '<p>Nenhum evento realizado.</p>'}
      <h2>Acompanhamento social, psicológico e pedagógico</h2>
      <table><tbody><tr><td>Entrevistas sociais</td><td class="n">${cont('entrevista_social')}</td></tr><tr><td>Atendimentos sociais</td><td class="n">${cont('atend_social')}</td></tr><tr><td>Atendimentos psicológicos</td><td class="n">${cont('atend_psicologico')}</td></tr><tr><td>Atendimentos pedagógicos</td><td class="n">${cont('atend_pedagogico')}</td></tr><tr><td>Ocorrências registradas</td><td class="n">${cont('ocorrencia')}</td></tr></tbody></table>
      ${assinaturas('Coordenação Pedagógica', 'Presidência')}`);
  }

  function listaAlunosProjeto(pid) {
    const p = D.projeto(pid);
    abrir(`Alunos – ${p.nome}`, `<h1>Relação de Alunos Atendidos</h1><p class="subt">${esc(p.nome)} · ${UI.data(UI.hojeISO())}</p>
      ${D.turmasDoProjeto(pid).map((t) => { const al = D.alunosDaTurma(t.id); return `<h2>${esc(t.nome)} (${al.length})</h2><table><thead><tr><th>#</th><th>Aluno</th><th>Nascimento</th><th>Responsável</th><th>Telefone</th></tr></thead><tbody>${al.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.nome)}</td><td>${UI.data(a.nascimento)}</td><td>${esc(a.responsavel?.nome || '')}</td><td>${esc(a.responsavel?.telefone || '')}</td></tr>`).join('')}</tbody></table>`; }).join('')}`);
  }

  function listaEvento(eid) {
    const e = Store.obter('eventos', eid);
    const parts = e.participantes.map(D.aluno).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome));
    abrir(`Participantes – ${e.nome}`, `<h1>Lista de Participantes</h1><p class="subt">${esc(e.nome)} · ${UI.data(e.data)} · ${esc(e.local)} – ${esc(e.cidade)}</p>
      <table><tr><th>Saída</th><td>${esc(e.saida || '—')}</td><th>Retorno</th><td>${esc(e.retorno || '—')}</td><th>Transporte</th><td>${esc(e.transporte || '—')}</td></tr></table>
      <h2>Alunos (${parts.length})</h2>
      <table><thead><tr><th>#</th><th>Aluno</th><th>Idade</th><th>Responsável / telefone</th><th>Saúde</th><th>Autoriz.</th><th style="width:70px">Presença</th></tr></thead><tbody>
      ${parts.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.nome)}</td><td>${UI.idade(a.nascimento)}</td><td>${esc(a.responsavel?.nome || '')}<br>${esc(a.responsavel?.telefone || '')}</td><td>${esc([a.saude?.alergias && 'Alergia: ' + a.saude.alergias, a.saude?.medicamentos].filter(Boolean).join(' · ') || '—')}</td><td>${a.autorizacoes?.saida ? 'Sim' : '<b>Não</b>'}</td><td></td></tr>`).join('')}</tbody></table>
      ${assinaturas('Responsável pelo evento', 'Coordenação')}`);
  }

  function fichaAluno(aid, soHistorico = false) {
    const a = D.aluno(aid);
    const h = D.historico(aid);
    const fr = D.freqAluno(aid);
    abrir(`${soHistorico ? 'Histórico' : 'Ficha'} – ${a.nome}`, `
      <h1>${soHistorico ? 'Histórico do Aluno' : 'Ficha do Aluno'}</h1><p class="subt">${esc(a.nome)} · matrícula ${esc(a.matricula)}</p>
      ${soHistorico ? '' : `<h2>Identificação</h2>
      <table><tr><th>Nome</th><td colspan="3">${esc(a.nome)}</td></tr>
        <tr><th>Nascimento</th><td>${UI.data(a.nascimento)} (${UI.idade(a.nascimento)} anos)</td><th>Sexo</th><td>${a.sexo === 'F' ? 'Feminino' : 'Masculino'}</td></tr>
        <tr><th>CPF</th><td>${esc(a.cpf || '—')}</td><th>NIS</th><td>${esc(a.nis || '—')}</td></tr>
        <tr><th>Endereço</th><td colspan="3">${esc([a.endereco?.rua, a.endereco?.numero, a.endereco?.bairro, a.endereco?.cidade].filter(Boolean).join(', '))}</td></tr>
        <tr><th>Responsável</th><td>${esc(a.responsavel?.nome || '')} (${esc(a.responsavel?.parentesco || '')})</td><th>Telefone</th><td>${esc(a.responsavel?.telefone || '')}</td></tr>
        <tr><th>Escola</th><td>${esc(a.escola?.nome || '')}</td><th>Série/turno</th><td>${esc(a.escola?.serie || '')} · ${esc(a.escola?.turno || '')}</td></tr>
        <tr><th>Saúde</th><td colspan="3">${esc([a.saude?.alergias && 'Alergias: ' + a.saude.alergias, a.saude?.medicamentos && 'Medicamentos: ' + a.saude.medicamentos, a.saude?.deficiencia].filter(Boolean).join(' · ') || 'Nada informado')}</td></tr>
        <tr><th>Van</th><td colspan="3">${a.van?.usa ? `Sim · embarque: ${esc(a.van.embarque)} · desembarque: ${esc(a.van.desembarque)}` : 'Não utiliza'}</td></tr>
        <tr><th>Turmas</th><td colspan="3">${a.turmas.map((t) => esc(D.turma(t)?.nome)).join(', ')}</td></tr>
        <tr><th>Frequência geral</th><td colspan="3">${UI.pct(fr.pct)} (${fr.p} presenças, ${fr.f} faltas, ${fr.j} justificadas)</td></tr></table>`}
      <h2>Histórico na instituição</h2>
      <table><thead><tr><th style="width:90px">Data</th><th>Registro</th></tr></thead><tbody>
      ${h.map((x) => `<tr><td>${x.tipo === 'freq' ? UI.mesCurto(x.data.slice(0, 7)) : UI.data(x.data)}</td><td><b>${esc(x.titulo)}</b>${x.detalhe ? `<br>${esc(x.detalhe)}` : ''}</td></tr>`).join('')}</tbody></table>
      ${assinaturas('Secretaria', 'Coordenação Pedagógica')}`);
  }

  Views.relatorios = function (el) {
    const mes = UI.hojeISO().slice(0, 7);
    const ano = UI.hojeISO().slice(0, 4);
    const projetos = Store.todos('projetos');
    const turmas = Store.todos('turmas');
    const cartao = (ic, cor, titulo, txt, controles, id) => `<section class="painel rel-cartao">
      <span class="ic" style="background:${cor}33;color:${cor}">${icon(ic)}</span>
      <h3>${titulo}</h3><p>${txt}</p>
      <div class="linha-flex" style="margin-top:auto">${controles}<button class="btn" id="${id}">${icon('relatorios')}Gerar</button></div>
    </section>`;
    el.innerHTML = `
      <div class="cabecalho"><div class="titulos"><h1>Relatórios</h1><p class="sub">Documentos na folha timbrada do Instituto, prontos para imprimir ou salvar em PDF</p></div></div>
      <div class="grade g2">
        ${cartao('turmas', '#8fb2ff', 'Relatório mensal da turma', 'Plano do mês, registro de cada aula e grade de frequência dos alunos.',
          `<select class="entrada" id="rt-turma" style="width:auto;flex:1">${UI.sel(turmas.map((t) => [t.id, t.nome]), turmas[0]?.id)}</select><input type="month" class="entrada" id="rt-mes" value="${mes}" style="width:auto">`, 'rt-ok')}
        ${cartao('projetos', '#f2a541', 'Relatório mensal do projeto', 'Indicadores de todas as turmas, eventos e despesas do mês.',
          `<select class="entrada" id="rp-proj" style="width:auto;flex:1">${UI.sel(projetos.map((p) => [p.id, p.nome]), projetos[0]?.id)}</select><input type="month" class="entrada" id="rp-mes" value="${mes}" style="width:auto">`, 'rp-ok')}
        ${cartao('dinheiro', '#4fc39a', 'Prestação de contas', 'Execução física (metas, aulas, atendidos) e financeira (categorias e pagamentos).',
          `<select class="entrada" id="rc-proj" style="width:auto;flex:1">${UI.sel(projetos.map((p) => [p.id, p.nome]), projetos[0]?.id)}</select><input type="date" class="entrada" id="rc-ini" style="width:auto"><input type="date" class="entrada" id="rc-fim" value="${UI.hojeISO()}" style="width:auto">`, 'rc-ok')}
        ${cartao('estrela', '#e7a0c0', 'Relatório de atividades do ano', 'Consolidado anual: alunos atendidos, aulas, eventos, perfil dos atendidos e acompanhamentos.',
          `<input type="number" class="entrada" id="ra-ano" value="${ano}" style="width:110px">`, 'ra-ok')}
      </div>`;
    const iniProj = () => ($('#rc-ini').value = D.projeto($('#rc-proj').value)?.inicio || '');
    iniProj();
    $('#rc-proj').onchange = iniProj;
    $('#rt-ok').onclick = () => mensalTurma($('#rt-turma').value, $('#rt-mes').value);
    $('#rp-ok').onclick = () => mensalProjeto($('#rp-proj').value, $('#rp-mes').value);
    $('#rc-ok').onclick = () => prestacaoContas($('#rc-proj').value, $('#rc-ini').value, $('#rc-fim').value);
    $('#ra-ok').onclick = () => atividadesAno(String($('#ra-ano').value));
  };

  window.Doc = { abrir, mensalTurma, mensalProjeto, prestacaoContas, atividadesAno, listaAlunosProjeto, listaEvento, fichaAluno };
})();
