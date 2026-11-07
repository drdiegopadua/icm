/* Gestão pedagógica: plano de aula mensal, conferência mensal das obrigações do professor
   (plano do mês, chamada e relatório de cada aula), visitas às turmas, reuniões com professores
   e cronograma de eventos pedagógicos.
   Regras da conferência (as mesmas do sistema pedagógico anterior):
   - Plano mensal: EM DIA (preenchido) ou PENDENTE (nada). Texto curto ou cópia conta como preenchido.
   - Chamada e relatório de aula: EM DIA (todas as aulas do mês), PARCIAL (alguma aula sem registro) ou PENDENTE (nenhuma).
   - Aulas do mês = dias da turma até ontem, sem feriados/recessos do calendário letivo e sem aulas canceladas,
     mais qualquer aula realizada fora desses dias.
   - A coordenação pode ajustar o status de cada item (o ajuste dela prevalece) e anotar observações. */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const { need, audit } = ICM.api._h;
  const can = p => ICM.auth.can(p);
  const me = () => ICM.auth.user();
  const temTexto = o => !!o && Object.values(o).some(v => String(v || '').trim().length > 0);
  const ITENS = { plano: 'Plano de aula do mês', chamada: 'Registro de chamada', relatorio: 'Relatório de aula' };
  const PESO = { EM_DIA: 100, PARCIAL: 50, PENDENTE: 0 };

  // ---------- Plano de aula mensal ----------
  const planos = {
    idDe: (turmaId, ym) => `${turmaId}_${ym}`,
    async get(turmaId, ym) { return (await S().list('planos_mensais', p => p.turma_id === turmaId && p.ym === ym))[0] || null; },
    async list(ym) { return S().list('planos_mensais', p => !ym || p.ym === ym); },
    async save(turmaId, ym, dados) {
      need('aulas.registrar');
      const ja = await planos.get(turmaId, ym);
      const rec = { ...dados, turma_id: turmaId, ym, atualizado_por: me().nome, atualizado_em: new Date().toISOString(), enviado_em: (ja && ja.enviado_em) || new Date().toISOString() };
      const r = ja ? await S().update('planos_mensais', ja.id, rec) : await S().insert('planos_mensais', { id: planos.idDe(turmaId, ym), ...rec });
      await audit(ja ? 'editar' : 'criar', 'planos_mensais', r.id, `Plano de aula ${u().fmtMonth(ym)}`);
      return r;
    }
  };

  // ---------- Dias de aula esperados no mês ----------
  async function diasBloqueados(ym) {
    const cal = await S().list('calendario').catch(() => []);
    const set = new Set();
    cal.filter(c => c.tipo === 'feriado' || c.tipo === 'recesso').forEach(c => {
      let d = u().parseD(c.inicio); const fim = u().parseD(c.fim || c.inicio);
      if (!d || !fim) return;
      for (let i = 0; d <= fim && i < 400; i++) { const k = u().iso(d); if (k.startsWith(ym)) set.add(k); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
    });
    return set;
  }
  function diasDaTurma(t, ym, bloqueados, limite) {
    const [y, m] = ym.split('-').map(Number); const out = [];
    const desde = String(t.data_inicio || (t.criado_em || '').slice(0, 10) || '0000-00-00');
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m - 1, d); if (dt.getMonth() !== m - 1) break;
      const k = u().iso(dt);
      if (k > limite || k < desde) continue;
      if ((t.dias || []).includes(dt.getDay()) && !bloqueados.has(k)) out.push(k);
    }
    return out;
  }

  // ---------- Conferência mensal ----------
  const statusDe = (ok, total) => total === 0 ? null : ok >= total ? 'EM_DIA' : ok > 0 ? 'PARCIAL' : 'PENDENTE';
  async function conferencia(ym) {
    const hoje = u().today();
    const ontem = u().addDays(hoje, -1);
    const fimMes = u().iso(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0));
    const limite = fimMes < hoje ? fimMes : ontem;   // mês em andamento: conta até ontem
    const turmas = (await ICM.api.turmas.list()).filter(t => t.status !== 'encerrada');
    const projetos = await ICM.api.projetos.list();
    const users = await ICM.api.usuarios.list().catch(() => []);
    const bloq = await diasBloqueados(ym);
    const aulasMes = await S().list('aulas', a => a.data.startsWith(ym));
    const pls = await planos.list(ym);
    const ajustes = await S().list('conferencias', c => c.ym === ym).catch(() => []);
    const mats = await S().list('matriculas').catch(() => []);
    return turmas.map(t => {
      const aulas = aulasMes.filter(a => a.turma_id === t.id);
      const canceladas = new Set(aulas.filter(a => a.status === 'cancelada').map(a => a.data));
      const esperados = new Set(diasDaTurma(t, ym, bloq, limite).filter(d => !canceladas.has(d)));
      aulas.filter(a => a.status === 'realizada' && a.data <= limite).forEach(a => esperados.add(a.data));
      const dias = [...esperados].sort();
      const temAlunos = mats.some(m => m.turma_id === t.id && m.entrada <= (limite || fimMes) && (!m.saida || m.saida >= ym + '-01'));
      const doDia = d => aulas.filter(a => a.data === d && a.status !== 'cancelada');
      const comChamada = dias.filter(d => doDia(d).some(a => Object.keys(a.presencas || {}).length)).length;
      const comRel = dias.filter(d => doDia(d).some(a => a.relatorio && String(a.relatorio.texto || '').trim())).length;
      const pl = pls.find(p => p.turma_id === t.id);
      const auto = {
        plano: temTexto(pl && { a: pl.objetivos, b: pl.conteudos, c: pl.metodologia, d: pl.tema }) ? 'EM_DIA' : 'PENDENTE',
        chamada: temAlunos ? statusDe(comChamada, dias.length) : null,
        relatorio: statusDe(comRel, dias.length)
      };
      const aj = ajustes.find(c => c.turma_id === t.id) || {};
      const st = {}; const pct = {};
      Object.keys(ITENS).forEach(k => {
        st[k] = (aj.status && aj.status[k]) || auto[k];
        if (st[k] == null) { pct[k] = null; return; }
        if (aj.status && aj.status[k]) pct[k] = PESO[aj.status[k]];
        else pct[k] = k === 'plano' ? PESO[st[k]] : Math.round((k === 'chamada' ? comChamada : comRel) / dias.length * 100);
      });
      const vals = Object.values(pct).filter(v => v != null);
      const total = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      const prof = users.find(x => x.id === t.professor_id) || {};
      return {
        turma: t, projeto: projetos.find(p => p.id === t.projeto_id) || {}, professor: prof.nome || 'A definir', professor_id: t.professor_id || '',
        aulas: dias.length, dias, comChamada, comRel, plano: pl || null, auto, status: st, pct, total,
        emDia: total == null ? null : Object.values(st).every(s => s == null || s === 'EM_DIA'),
        ajuste: aj.id ? aj : null, obs: aj.obs || ''
      };
    }).sort((a, b) => (a.professor || '').localeCompare(b.professor || '') || a.turma.nome.localeCompare(b.turma.nome));
  }
  // Resumo por professor (o que a tesouraria precisa ver)
  function porProfessor(linhas) {
    const g = {};
    linhas.forEach(l => { const k = l.professor_id || l.professor; (g[k] = g[k] || { professor: l.professor, professor_id: l.professor_id, turmas: [] }).turmas.push(l); });
    return Object.values(g).map(p => {
      const v = p.turmas.map(t => t.total).filter(x => x != null);
      return { ...p, total: v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null, emDia: p.turmas.every(t => t.emDia !== false) };
    }).sort((a, b) => a.professor.localeCompare(b.professor));
  }
  async function ajustar(turmaId, ym, { status, obs }) {
    need('pedagogico.gestao');
    const ja = (await S().list('conferencias', c => c.turma_id === turmaId && c.ym === ym))[0];
    const rec = { turma_id: turmaId, ym, status: status || {}, obs: obs || '', conferido_por: me().nome, conferido_em: new Date().toISOString() };
    const r = ja ? await S().update('conferencias', ja.id, rec) : await S().insert('conferencias', { id: `${turmaId}_${ym}`, ...rec });
    await audit('conferir', 'conferencias', r.id, `Conferência ${u().fmtMonth(ym)}`);
    return r;
  }

  // ---------- Visitas às turmas e reuniões com professores ----------
  const TIPOS_ACOMP = { visita: 'Visita à turma', reuniao: 'Reunião com professor(a)', reuniao_geral: 'Reunião geral de professores', formacao: 'Formação / capacitação' };
  const acompanhamentos = {
    TIPOS: TIPOS_ACOMP,
    async list(ym) { return (await S().list('acompanhamentos', a => !ym || String(a.data || '').startsWith(ym))).sort((a, b) => b.data.localeCompare(a.data)); },
    async save(a) {
      need('pedagogico.gestao');
      if (!a.data || !a.tipo) throw new Error('Informe o tipo e a data.');
      if (a.tipo === 'visita' && !a.turma_id) throw new Error('Escolha a turma visitada.');
      const r = a.id ? await S().update('acompanhamentos', a.id, a) : await S().insert('acompanhamentos', { ...a, registrado_por: me().nome });
      await audit(a.id ? 'editar' : 'criar', 'acompanhamentos', r.id, `${TIPOS_ACOMP[r.tipo]} em ${u().fmtDate(r.data)}`);
      return r;
    },
    async remove(id) { need('pedagogico.gestao'); await S().remove('acompanhamentos', id); await audit('excluir', 'acompanhamentos', id, 'Acompanhamento excluído'); }
  };

  // ---------- Cronograma de eventos pedagógicos ----------
  const PADRAO = [
    ['01-20', '01-31', 'Planejamento pedagógico anual', 'planejamento', 'Equipe define metas do ano, calendário e repertório/conteúdos por turma.'],
    ['02-02', '02-06', 'Semana pedagógica e formação de professores', 'formacao', 'Acolhida da equipe, regras de conferência, plano mensal e uso do sistema.'],
    ['02-09', null, 'Início das aulas', 'marco', ''],
    ['02-23', null, 'Reunião de pais — 1º semestre', 'reuniao', 'Apresentação dos projetos, regras de frequência e autorizações (LGPD e imagem).'],
    ['03-31', null, 'Avaliação diagnóstica concluída', 'avaliacao', 'Cada professor registra o nível inicial da turma.'],
    ['06-26', null, 'Conselho de classe — 1º semestre', 'avaliacao', 'Frequência, evolução e encaminhamentos por aluno.'],
    ['07-03', null, 'Apresentação de meio de ano', 'apresentacao', 'Mostra das turmas para as famílias.'],
    ['07-27', '07-31', 'Replanejamento do 2º semestre', 'planejamento', 'Revisão das metas a partir do conselho de classe.'],
    ['08-10', null, 'Reunião de pais — 2º semestre', 'reuniao', ''],
    ['10-12', null, 'Semana da Criança — atividade especial', 'apresentacao', ''],
    ['11-20', null, 'Conselho de classe — 2º semestre', 'avaliacao', 'Avaliação final, certificados e rematrícula.'],
    ['12-12', null, 'Concerto / apresentação de encerramento', 'apresentacao', ''],
    ['12-15', null, 'Entrega do relatório pedagógico anual', 'marco', 'Base para o relatório anual da OSC e as prestações de contas.']
  ];
  const TIPOS_CRONO = { planejamento: ['Planejamento', '#2563eb'], formacao: ['Formação', '#8b5cf6'], reuniao: ['Reunião', '#0891b2'], avaliacao: ['Avaliação / conselho', '#f97316'], apresentacao: ['Apresentação', '#ec4899'], prazo: ['Prazo', '#ef4444'], marco: ['Marco', '#10b981'] };
  const cronograma = {
    TIPOS: TIPOS_CRONO,
    async list(ano) { return (await S().list('cronograma_pedagogico', e => !ano || String(e.inicio).startsWith(ano))).sort((a, b) => a.inicio.localeCompare(b.inicio)); },
    async save(e) {
      need('pedagogico.gestao');
      if (!e.titulo || !e.inicio) throw new Error('Informe o título e a data.');
      const r = e.id ? await S().update('cronograma_pedagogico', e.id, e) : await S().insert('cronograma_pedagogico', e);
      await audit(e.id ? 'editar' : 'criar', 'cronograma_pedagogico', r.id, `Cronograma: ${r.titulo}`); return r;
    },
    async remove(id) { need('pedagogico.gestao'); await S().remove('cronograma_pedagogico', id); },
    // Eventos anuais sugeridos + prazos mensais (plano até o dia 5, conferência até o dia 10). Não duplica.
    async carregarPadrao(ano) {
      need('pedagogico.gestao');
      const ja = await cronograma.list(String(ano)); const tem = (t, d) => ja.some(x => x.titulo === t && x.inicio === d);
      const novos = PADRAO.map(([i, f, titulo, tipo, desc]) => ({ inicio: `${ano}-${i}`, fim: f ? `${ano}-${f}` : null, titulo, tipo, descricao: desc, padrao: true }));
      for (let m = 2; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        novos.push({ inicio: `${ano}-${mm}-05`, fim: null, titulo: 'Prazo: plano de aula do mês', tipo: 'prazo', descricao: 'Todos os professores com o plano mensal preenchido no sistema.', padrao: true });
        novos.push({ inicio: `${ano}-${mm}-10`, fim: null, titulo: 'Conferência pedagógica do mês anterior → tesouraria', tipo: 'prazo', descricao: 'Coordenação confere plano, chamadas e relatórios e envia a relação para a tesouraria.', padrao: true });
      }
      let n = 0; for (const e of novos) if (!tem(e.titulo, e.inicio)) { await S().insert('cronograma_pedagogico', e); n++; }
      await audit('criar', 'cronograma_pedagogico', String(ano), `Cronograma pedagógico padrão ${ano} (${n} itens)`);
      return n;
    }
  };

  ICM.api.pedagogico = { ITENS, planos, conferencia, porProfessor, ajustar, acompanhamentos, cronograma };
})();
