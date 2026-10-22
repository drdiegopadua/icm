/* Regras do Instituto: frequência, alertas de faltas, pendências, históricos */
(function () {
  const S = () => window.Store;

  const TIPOS_REGISTRO = {
    entrevista_social: { rotulo: 'Entrevista social', icone: 'social', cor: '#f0a27f' },
    atend_social: { rotulo: 'Atendimento social', icone: 'social', cor: '#f2a541' },
    atend_psicologico: { rotulo: 'Atendimento psicológico', icone: 'mente', cor: '#e7a0c0' },
    atend_pedagogico: { rotulo: 'Atendimento pedagógico', icone: 'livro', cor: '#8fb2ff' },
    atestado: { rotulo: 'Atestado', icone: 'saude', cor: '#7fd6b6' },
    documento: { rotulo: 'Documento', icone: 'arquivo', cor: '#b9a7ff' },
    formulario: { rotulo: 'Formulário', icone: 'relatorios', cor: '#86d0e8' },
    ocorrencia: { rotulo: 'Ocorrência', icone: 'alerta', cor: '#ef6b6b' },
    noticia: { rotulo: 'Notícia', icone: 'jornal', cor: '#f5c451' },
    anexo: { rotulo: 'Anexo', icone: 'clipe', cor: '#c9d2f2' },
  };

  const pessoa = (id) => S().obter('equipe', id);
  const nomePessoa = (id) => pessoa(id)?.nome || '—';
  const projeto = (id) => S().obter('projetos', id);
  const turma = (id) => S().obter('turmas', id);
  const aluno = (id) => S().obter('alunos', id);
  const diasTexto = (dias) => (dias || []).map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(' e ');

  const alunosDaTurma = (tid, incluirInativos = false) =>
    S().filtrar('alunos', (a) => (a.turmas || []).includes(tid) && (incluirInativos || a.status === 'ativo'))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  const turmasDoProjeto = (pid) => S().filtrar('turmas', (t) => t.projeto_id === pid);
  const aulasDaTurma = (tid, mes) =>
    S().filtrar('aulas', (a) => a.turma_id === tid && (!mes || a.data.startsWith(mes))).sort((a, b) => a.data.localeCompare(b.data));
  const plano = (tid, mes) => S().filtrar('planos', (p) => p.turma_id === tid && p.mes === mes)[0];

  /* Frequência: J (falta justificada) conta como presença para o percentual */
  function contar(aulas, aid) {
    let p = 0, f = 0, j = 0;
    aulas.forEach((au) => {
      const v = au.presencas?.[aid];
      if (v === 'P') p++; else if (v === 'F') f++; else if (v === 'J') j++;
    });
    const total = p + f + j;
    return { p, f, j, total, pct: total ? ((p + j) / total) * 100 : null };
  }
  const freqAluno = (aid, { turma: tid, mes } = {}) =>
    contar(S().filtrar('aulas', (a) => (!tid || a.turma_id === tid) && (!mes || a.data.startsWith(mes)) && a.presencas && aid in a.presencas), aid);

  function freqTurma(tid, mes) {
    const aulas = aulasDaTurma(tid, mes);
    let pres = 0, tot = 0;
    aulas.forEach((a) => Object.values(a.presencas || {}).forEach((v) => { tot++; if (v !== 'F') pres++; }));
    return tot ? (pres / tot) * 100 : null;
  }
  function freqProjeto(pid, mes) {
    let pres = 0, tot = 0;
    turmasDoProjeto(pid).forEach((t) => aulasDaTurma(t.id, mes).forEach((a) => Object.values(a.presencas || {}).forEach((v) => { tot++; if (v !== 'F') pres++; })));
    return tot ? (pres / tot) * 100 : null;
  }

  /* Alertas: 2 faltas seguidas = atenção (secretaria contata); 3+ = risco de desligamento */
  function alertas() {
    const lista = [];
    S().filtrar('alunos', (a) => a.status === 'ativo').forEach((a) => {
      (a.turmas || []).forEach((tid) => {
        const aulas = aulasDaTurma(tid).filter((au) => au.presencas && a.id in au.presencas);
        let seguidas = 0;
        for (let i = aulas.length - 1; i >= 0; i--) {
          if (aulas[i].presencas[a.id] === 'F') seguidas++; else break;
        }
        if (seguidas >= 2) lista.push({ aluno: a, turma: turma(tid), seguidas, nivel: seguidas >= 3 ? 'risco' : 'alerta', ultima: aulas[aulas.length - 1]?.data });
      });
    });
    return lista.sort((x, y) => y.seguidas - x.seguidas);
  }

  /* Pendências dos professores no mês: plano mensal, relatórios de aula */
  function pendencias(mes) {
    const out = [];
    S().todos('turmas').forEach((t) => {
      if (t.inicio && t.inicio.slice(0, 7) > mes) return;
      if (!plano(t.id, mes)) out.push({ tipo: 'plano', turma: t, texto: `Plano de aula de ${UI.mesNome(mes).toLowerCase()} não enviado` });
      const sem = aulasDaTurma(t.id, mes).filter((a) => !a.conteudo);
      if (sem.length) out.push({ tipo: 'relatorio', turma: t, texto: `${sem.length} aula(s) sem relatório` });
    });
    return out;
  }

  /* Histórico completo do aluno na instituição */
  function historico(aid) {
    const a = aluno(aid);
    if (!a) return [];
    const ev = [];
    ev.push({ data: a.data_matricula, cor: '#4fc39a', titulo: 'Matrícula no Instituto', detalhe: `Matrícula nº ${a.matricula}` });
    (a.turmas || []).forEach((tid) => {
      const t = turma(tid);
      if (!t) return;
      const prim = aulasDaTurma(tid).find((au) => au.presencas && aid in au.presencas);
      ev.push({ data: prim?.data || a.data_matricula, cor: projeto(t.projeto_id)?.cor, titulo: `Ingresso na turma ${t.nome}`, detalhe: `Projeto ${projeto(t.projeto_id)?.nome || ''} · ${nomePessoa(t.professor_id)}` });
    });
    // frequência por mês
    const meses = new Set(S().filtrar('aulas', (x) => x.presencas && aid in x.presencas).map((x) => x.data.slice(0, 7)));
    [...meses].forEach((m) => {
      const fr = freqAluno(aid, { mes: m });
      ev.push({ data: `${m}-28`, cor: fr.pct >= 75 ? '#4fc39a' : fr.pct >= 50 ? '#f5c451' : '#ef6b6b', titulo: `Frequência de ${UI.mesNome(m).toLowerCase()}: ${UI.pct(fr.pct)}`, detalhe: `${fr.p} presenças · ${fr.f} faltas · ${fr.j} justificadas`, tipo: 'freq' });
    });
    S().filtrar('eventos', (e) => (e.participantes || []).includes(aid)).forEach((e) =>
      ev.push({ data: e.data, cor: '#f2a541', titulo: `${e.data > UI.hojeISO() ? 'Inscrito no evento' : 'Participou do evento'}: ${e.nome}`, detalhe: `${e.local} – ${e.cidade}`, link: `#/eventos/${e.id}` }));
    S().filtrar('registros', (r) => r.aluno_id === aid).forEach((r) => {
      const tp = TIPOS_REGISTRO[r.tipo] || {};
      ev.push({ data: r.data, cor: tp.cor, titulo: `${tp.rotulo}: ${r.titulo}`, detalhe: r.sigiloso ? 'Conteúdo sigiloso' : r.texto?.slice(0, 140), tipo: r.tipo });
    });
    if (a.desligamento) ev.push({ data: a.desligamento.data, cor: '#ef6b6b', titulo: 'Desligamento', detalhe: a.desligamento.motivo });
    return ev.sort((x, y) => y.data.localeCompare(x.data));
  }

  const vigenciaPct = (p) => {
    const ini = new Date(p.inicio), fim = new Date(p.fim), h = new Date();
    return Math.max(0, Math.min(100, ((h - ini) / (fim - ini)) * 100));
  };
  const gastoProjeto = (pid, ate) => S().filtrar('despesas', (d) => d.projeto_id === pid && (!ate || d.data <= ate)).reduce((s, d) => s + d.valor, 0);
  const statusChip = (st) => ({ ativo: '<span class="chip ok">Ativo</span>', desligado: '<span class="chip risco">Desligado</span>', espera: '<span class="chip alerta">Lista de espera</span>', inativo: '<span class="chip">Inativo</span>' }[st] || `<span class="chip">${UI.esc(st)}</span>`);

  window.D = { TIPOS_REGISTRO, pessoa, nomePessoa, projeto, turma, aluno, diasTexto, alunosDaTurma, turmasDoProjeto, aulasDaTurma, plano, freqAluno, freqTurma, freqProjeto, contar, alertas, pendencias, historico, vigenciaPct, gastoProjeto, statusChip };
})();
