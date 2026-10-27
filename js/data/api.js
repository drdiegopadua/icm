/* Regras de negócio e controle de acesso.
   As telas falam SOMENTE com ICM.api — nunca direto com o armazenamento. */
(function () {
  window.ICM = window.ICM || {};
  const S = () => ICM.store;
  const A = () => ICM.auth;
  const u = () => ICM.util;

  function deny(msg = 'Você não tem permissão para esta ação.') { const e = new Error(msg); e.code = 403; throw e; }
  function need(perm) { if (!A().can(perm)) deny(); }
  function me() { return A().user(); }
  function isProf() { return me() && me().papel === 'professor'; }

  async function audit(acao, entidade, entidade_id, resumo) {
    const usr = me();
    await S().insert('auditoria', { em: new Date().toISOString(), usuario_id: usr ? usr.id : 'anonimo', usuario_nome: usr ? usr.nome : '', acao, entidade, entidade_id, resumo });
  }

  // ---------- Escopo do professor ----------
  async function minhasTurmasIds() {
    const ts = await S().list('turmas');
    if (!isProf()) return ts.map(t => t.id);
    return ts.filter(t => t.professor_id === me().id).map(t => t.id);
  }
  async function podeTurma(turmaId) {
    if (!isProf()) return true;
    return (await minhasTurmasIds()).includes(turmaId);
  }
  async function alunosVisiveisIds() {
    if (A().can('alunos.ver_todos')) return null; // todos
    const tids = await minhasTurmasIds();
    const mats = await S().list('matriculas', m => tids.includes(m.turma_id));
    return new Set(mats.map(m => m.aluno_id));
  }

  // Remove campos sensíveis para quem não tem permissão (LGPD — minimização)
  function sanitizeAluno(a) {
    if (A().can('alunos.sensivel')) return a;
    const s = a.saude || {};
    return {
      ...a, cpf: u().maskCPF(a.cpf), rg: '', nis: '',
      social: null, financeiro: null,
      saude: { alergias: s.alergias, medicamentos: s.medicamentos, condicoes: s.condicoes, apto_atividade_fisica: s.apto_atividade_fisica, contato_emergencia: s.contato_emergencia, _restrito: true },
      endereco: { bairro: a.endereco && a.endereco.bairro, cidade: a.endereco && a.endereco.cidade },
      _restrito: true
    };
  }

  // ---------- Patrimônio ----------
  function stripValor(i) { return A().can('patrimonio.valores') ? i : { ...i, valor_unitario: null, nota_fiscal: '', fornecedor: '' }; }
  function enrichEmp(e, itens, alunos, users) {
    const item = itens.find(i => i.id === e.item_id) || { nome: '?', tombo: '' };
    let tomador = '', contato = '', responsavel = '';
    if (e.tipo_tomador === 'aluno') { const a = alunos.find(x => x.id === e.aluno_id) || {}; tomador = a.nome || '?'; responsavel = a.responsavel ? `${a.responsavel.nome} (${a.responsavel.parentesco})` : ''; contato = a.responsavel ? a.responsavel.telefone : ''; }
    else if (e.tipo_tomador === 'colaborador') { const c = users.find(x => x.id === e.colaborador_id) || {}; tomador = c.nome || '?'; contato = c.email || ''; }
    else if (e.terceiro) { tomador = e.terceiro.nome; responsavel = e.terceiro.responsavel || ''; contato = e.terceiro.telefone || ''; }
    const un = id => (users.find(x => x.id === id) || {}).nome || '';
    return { ...e, item: { id: item.id, nome: item.nome, tombo: item.tombo, categoria: item.categoria }, tomador, responsavel, contato, entregue_por_nome: un(e.entregue_por), recebido_por_nome: un(e.recebido_por) };
  }

  // ---------- Assiduidade ----------
  async function cfgAssid() { return (await S().getConfig()).assiduidade; }
  function nivelFaltas(f, cfg) { return f >= cfg.desligamento ? 'danger' : f >= cfg.alerta ? 'warn' : 'ok'; }

  async function assiduidadeTurma(turmaId, ym) {
    const cfg = await cfgAssid();
    const aulas = (await S().list('aulas', a => a.turma_id === turmaId && a.status === 'realizada' && (!ym || a.data.startsWith(ym)))).sort((a, b) => a.data.localeCompare(b.data));
    const mats = await S().list('matriculas', m => m.turma_id === turmaId);
    const alunos = await S().list('alunos');
    const ids = [...new Set(mats.map(m => m.aluno_id))];
    const linhas = ids.map(id => {
      const al = alunos.find(a => a.id === id) || { nome: '?' };
      const mat = mats.filter(m => m.aluno_id === id).sort((a, b) => b.entrada.localeCompare(a.entrada))[0];
      let P = 0, F = 0, J = 0;
      aulas.forEach(a => { const v = a.presencas && a.presencas[id]; if (v === 'P') P++; else if (v === 'F') F++; else if (v === 'J') J++; });
      const total = P + F + J;
      return { aluno_id: id, nome: al.nome, matricula: al.matricula, status_turma: mat.status, P, F, J, total, freq: total ? Math.round((P + J) / total * 100) : null, nivel: nivelFaltas(F, cfg) };
    }).filter(l => l.status_turma === 'ativo' || l.total > 0).sort((a, b) => a.nome.localeCompare(b.nome));
    return { aulas, linhas, cfg };
  }

  async function alertasAssiduidade(ym) {
    ym = ym || u().today().slice(0, 7);
    const tids = await minhasTurmasIds();
    const turmas = await S().list('turmas', t => tids.includes(t.id));
    const out = [];
    for (const t of turmas) {
      const { linhas } = await assiduidadeTurma(t.id, ym);
      linhas.filter(l => l.nivel !== 'ok' && l.status_turma === 'ativo').forEach(l => out.push({ ...l, turma_id: t.id, turma: t.nome }));
    }
    return out.sort((a, b) => b.F - a.F);
  }

  // ---------- API pública ----------
  const api = {
    audit,
    can: p => A().can(p),

    alunos: {
      async list({ q, status } = {}) {
        const vis = await alunosVisiveisIds();
        let list = await S().list('alunos', a => !vis || vis.has(a.id));
        if (status) list = list.filter(a => a.status === status);
        if (q) { const s = q.toLowerCase(); list = list.filter(a => a.nome.toLowerCase().includes(s) || a.matricula.toLowerCase().includes(s) || (a.responsavel && a.responsavel.nome.toLowerCase().includes(s))); }
        return list.map(sanitizeAluno).sort((a, b) => a.nome.localeCompare(b.nome));
      },
      async get(id) {
        const vis = await alunosVisiveisIds();
        if (vis && !vis.has(id)) deny('Este aluno não pertence às suas turmas.');
        const a = await S().get('alunos', id);
        if (!a) return null;
        if (A().can('alunos.sensivel')) await audit('visualizar_sensivel', 'alunos', id, `Ficha completa de ${a.nome}`);
        return sanitizeAluno(a);
      },
      async save(data) {
        need('alunos.editar');
        if (!data.nome || data.nome.length < 3) throw new Error('Informe o nome completo do aluno.');
        if (data.cpf && !u().cpfValido(data.cpf)) throw new Error('CPF do aluno inválido.');
        if (data.id) {
          const r = await S().update('alunos', data.id, data);
          await audit('editar', 'alunos', r.id, `Cadastro de ${r.nome} atualizado`);
          return r;
        }
        const all = await S().list('alunos');
        const ano = new Date().getFullYear();
        const seq = all.filter(a => a.matricula.startsWith(`ICM-${ano}`)).length + 1;
        const r = await S().insert('alunos', { status: 'ativo', data_matricula: u().today(), ...data, matricula: `ICM-${ano}-${String(seq).padStart(4, '0')}` });
        await audit('matricular', 'alunos', r.id, `Matrícula ${r.matricula} — ${r.nome}`);
        return r;
      },
      async turmas(alunoId) {
        const mats = await S().list('matriculas', m => m.aluno_id === alunoId);
        const turmas = await S().list('turmas'); const projetos = await S().list('projetos');
        return mats.map(m => { const t = turmas.find(x => x.id === m.turma_id) || {}; return { ...m, turma: t, projeto: projetos.find(p => p.id === t.projeto_id) || {} }; });
      },
      async frequencia(alunoId) {
        const mats = await S().list('matriculas', m => m.aluno_id === alunoId);
        const out = [];
        for (const m of mats) {
          const aulas = await S().list('aulas', a => a.turma_id === m.turma_id && a.status === 'realizada' && a.presencas && a.presencas[alunoId]);
          const c = { P: 0, F: 0, J: 0 }; aulas.forEach(a => c[a.presencas[alunoId]]++);
          const t = await S().get('turmas', m.turma_id);
          const ymNow = u().today().slice(0, 7);
          const fMes = aulas.filter(a => a.data.startsWith(ymNow) && a.presencas[alunoId] === 'F').length;
          out.push({ turma: t, ...c, total: aulas.length, freq: aulas.length ? Math.round((c.P + c.J) / aulas.length * 100) : null, faltas_mes: fMes, nivel: nivelFaltas(fMes, await cfgAssid()), aulas });
        }
        return out;
      },
      // Linha do tempo: matrícula, entradas/saídas, ocorrências, eventos, aulas (resumo mensal), futuros
      async timeline(alunoId) {
        const a = await S().get('alunos', alunoId);
        const items = [{ data: a.data_matricula, tipo: 'matricula', titulo: 'Matrícula no Instituto', desc: `Matrícula ${a.matricula}`, icon: 'userPlus', cor: '#2563eb' }];
        const mats = await api.alunos.turmas(alunoId);
        mats.forEach(m => {
          items.push({ data: m.entrada, tipo: 'turma', titulo: `Entrou na turma ${m.turma.nome}`, desc: m.projeto.nome, icon: 'layers', cor: m.projeto.cor || '#2563eb' });
          if (m.saida) items.push({ data: m.saida, tipo: 'saida', titulo: `Saiu da turma ${m.turma.nome}`, desc: m.motivo_saida || '', icon: 'userX', cor: '#ef4444' });
        });
        const ocs = await S().list('ocorrencias', o => o.aluno_id === alunoId);
        ocs.forEach(o => { const t = ICM.C.TIPOS_OCORRENCIA[o.tipo]; items.push({ data: o.data, tipo: 'ocorrencia', titulo: `${t.nome}: ${o.titulo}`, desc: A().can('alunos.sensivel') || o.tipo !== 'atendimento' ? o.descricao : 'Registro restrito', icon: t.icon, cor: t.cls === 'danger' ? '#ef4444' : t.cls === 'warn' ? '#f59e0b' : t.cls === 'ok' ? '#10b981' : '#64748b' }); });
        const evs = await S().list('eventos', e => (e.alunos || []).includes(alunoId));
        evs.forEach(e => { const t = ICM.C.TIPOS_EVENTO[e.tipo]; items.push({ data: e.data, tipo: 'evento', titulo: `${t.nome}: ${e.titulo}`, desc: [e.local, e.resultado].filter(Boolean).join(' — '), icon: t.icon, cor: t.cor }); });
        (await S().list('reunioes', r => r.presencas && alunoId in r.presencas)).forEach(r => items.push({ data: r.data, tipo: 'reuniao', titulo: `Reunião de pais: ${r.titulo}`, desc: r.presencas[alunoId] ? 'Família presente' : 'Família ausente', icon: 'users', cor: r.presencas[alunoId] ? '#10b981' : '#94a3b8' }));
        (await S().list('certificados', c => c.destinatario_id === alunoId && c.status === 'valido')).forEach(c => items.push({ data: c.data_emissao, tipo: 'certificado', titulo: `Certificado: ${c.titulo}`, desc: `Código ${c.codigo}${c.carga_horaria ? ` · ${c.carga_horaria}h` : ''}`, icon: 'award', cor: '#f59e0b' }));
        const emps = await S().list('emprestimos', e => e.aluno_id === alunoId);
        const itensPat = await S().list('patrimonio');
        emps.forEach(e => {
          const it = itensPat.find(i => i.id === e.item_id) || { nome: '?' };
          items.push({ data: e.data_saida, tipo: 'emprestimo', titulo: `Empréstimo: ${e.quantidade}x ${it.nome}`, desc: `${e.numero} · devolução prevista ${u().fmtDate(e.previsao_devolucao)}`, icon: 'download', cor: '#0891b2' });
          if (e.data_devolucao) items.push({ data: e.data_devolucao, tipo: 'devolucao', titulo: `${e.status === 'extraviado' ? 'Extravio' : 'Devolução'}: ${it.nome}`, desc: `${e.numero} · estado: ${e.estado_devolucao || '—'}`, icon: 'upload', cor: e.status === 'extraviado' ? '#ef4444' : '#10b981' });
        });
        // Aulas agrupadas por mês/turma
        const tids = mats.map(m => m.turma_id);
        const aulas = await S().list('aulas', x => tids.includes(x.turma_id));
        const grp = {};
        aulas.forEach(x => {
          const ym = x.data.slice(0, 7); const k = ym + '|' + x.turma_id;
          const m = mats.find(mm => mm.turma_id === x.turma_id);
          if (x.data < m.entrada || (m.saida && x.data > m.saida)) return;
          grp[k] = grp[k] || { ym, turma: m.turma.nome, cor: m.projeto.cor, P: 0, F: 0, J: 0, futuras: 0, ultima: x.data };
          if (x.status === 'planejada') grp[k].futuras++;
          else { const v = x.presencas[alunoId]; if (v) grp[k][v]++; }
          if (x.data > grp[k].ultima) grp[k].ultima = x.data;
        });
        Object.values(grp).forEach(g => {
          const real = g.P + g.F + g.J;
          if (real) items.push({ data: g.ultima > u().today() ? u().today() : g.ultima, tipo: 'aulas', titulo: `Aulas de ${u().fmtMonth(g.ym)} — ${g.turma}`, desc: `${real} aulas · ${g.P} presenças · ${g.F} faltas${g.J ? ` · ${g.J} justificadas` : ''}`, icon: 'book', cor: g.cor });
          if (g.futuras) items.push({ data: g.ultima, tipo: 'agenda', titulo: `${g.futuras} aula(s) agendada(s) — ${g.turma}`, desc: u().fmtMonth(g.ym), icon: 'calendar', cor: g.cor });
        });
        return items.sort((x, y) => y.data.localeCompare(x.data));
      },
      async agenda(alunoId) {
        const mats = (await S().list('matriculas', m => m.aluno_id === alunoId && m.status === 'ativo')).map(m => m.turma_id);
        const turmas = await S().list('turmas');
        const aulas = (await S().list('aulas', a => mats.includes(a.turma_id))).map(a => ({ data: a.data, titulo: (turmas.find(t => t.id === a.turma_id) || {}).modalidade, hora: a.inicio, cor: '#2563eb', tipo: 'aula' }));
        const evs = (await S().list('eventos', e => (e.alunos || []).includes(alunoId))).map(e => ({ data: e.data, titulo: e.titulo, hora: e.horario, cor: ICM.C.TIPOS_EVENTO[e.tipo].cor, tipo: e.tipo }));
        return aulas.concat(evs);
      }
    },

    ocorrencias: {
      async list(alunoId) {
        const l = await S().list('ocorrencias', o => o.aluno_id === alunoId);
        const sens = A().can('alunos.sensivel');
        return l.filter(o => sens || o.tipo !== 'atendimento').sort((a, b) => b.data.localeCompare(a.data));
      },
      async save(o) {
        need('ocorrencias.registrar');
        if (isProf()) { const vis = await alunosVisiveisIds(); if (!vis.has(o.aluno_id)) deny(); }
        if (!o.titulo) throw new Error('Informe um título.');
        const r = o.id ? await S().update('ocorrencias', o.id, o) : await S().insert('ocorrencias', { ...o, registrado_por: me().id });
        await audit(o.id ? 'editar' : 'criar', 'ocorrencias', r.id, `${ICM.C.TIPOS_OCORRENCIA[r.tipo].nome}: ${r.titulo}`);
        return r;
      },
      async remove(id) { need('alunos.editar'); await S().remove('ocorrencias', id); await audit('excluir', 'ocorrencias', id, 'Ocorrência removida'); }
    },

    projetos: {
      async list() {
        const ps = await S().list('projetos');
        if (!isProf()) return ps;
        const ts = await S().list('turmas', t => t.professor_id === me().id);
        const ids = new Set(ts.map(t => t.projeto_id));
        return ps.filter(p => ids.has(p.id));
      },
      async get(id) { return S().get('projetos', id); },
      async save(p) {
        need('projetos.editar');
        if (!p.nome) throw new Error('Informe o nome do projeto.');
        const r = p.id ? await S().update('projetos', p.id, p) : await S().insert('projetos', { cor: ICM.C.AREAS[p.area].cor, ...p });
        await audit(p.id ? 'editar' : 'criar', 'projetos', r.id, `Projeto ${r.nome}`);
        return r;
      },
      async remove(id) {
        need('projetos.editar');
        const ts = await S().list('turmas', t => t.projeto_id === id);
        if (ts.length) throw new Error('Remova ou transfira as turmas antes de excluir o projeto.');
        await S().remove('projetos', id); await audit('excluir', 'projetos', id, 'Projeto excluído');
      },
      async stats(id, { de, ate } = {}) {
        const turmas = await S().list('turmas', t => t.projeto_id === id);
        const tids = turmas.map(t => t.id);
        const aulas = await S().list('aulas', a => tids.includes(a.turma_id) && a.status === 'realizada' && (!de || a.data >= de) && (!ate || a.data <= ate));
        const mats = await S().list('matriculas', m => tids.includes(m.turma_id));
        const ativos = new Set(mats.filter(m => m.status === 'ativo').map(m => m.aluno_id));
        const atendidos = new Set(mats.map(m => m.aluno_id));
        let P = 0, T = 0; aulas.forEach(a => Object.values(a.presencas || {}).forEach(v => { T++; if (v !== 'F') P++; }));
        const horas = aulas.reduce((s, a) => s + (a.horas || 0), 0);
        const eventos = await S().list('eventos', e => e.projeto_id === id && (!de || e.data >= de) && (!ate || e.data <= ate));
        const fotos = aulas.reduce((s, a) => s + (a.fotos || []).length, 0);
        return { turmas: turmas.length, aulas: aulas.length, horas, ativos: ativos.size, atendidos: atendidos.size, freq: T ? Math.round(P / T * 100) : 0, eventos: eventos.length, fotos, desligados: mats.filter(m => m.status === 'saiu').length };
      }
    },

    turmas: {
      async list(projetoId) {
        const ids = await minhasTurmasIds();
        return S().list('turmas', t => ids.includes(t.id) && (!projetoId || t.projeto_id === projetoId));
      },
      async get(id) { if (!(await podeTurma(id))) deny('Esta turma não é sua.'); return S().get('turmas', id); },
      async save(t) {
        need('turmas.editar');
        if (!t.nome) throw new Error('Informe o nome da turma.');
        if (t.espaco_id && t.status !== 'encerrada') {
          const outras = await S().list('turmas', x => x.id !== t.id && x.espaco_id === t.espaco_id && x.status !== 'encerrada');
          const choque = outras.find(x => (x.dias || []).some(d => (t.dias || []).includes(d)) && t.inicio < x.fim && x.inicio < t.fim);
          if (choque) throw new Error(`Choque de horário no espaço com a turma "${choque.nome}" (${choque.inicio}–${choque.fim}).`);
        }
        const r = t.id ? await S().update('turmas', t.id, t) : await S().insert('turmas', { status: 'ativa', ...t });
        await audit(t.id ? 'editar' : 'criar', 'turmas', r.id, `Turma ${r.nome}`);
        return r;
      },
      async remove(id) {
        need('turmas.editar');
        const aulas = await S().list('aulas', a => a.turma_id === id && a.status === 'realizada');
        if (aulas.length) throw new Error('Turma com aulas registradas não pode ser excluída (histórico para prestação de contas). Encerre a turma.');
        await S().remove('turmas', id); await audit('excluir', 'turmas', id, 'Turma excluída');
      },
      async alunos(turmaId) {
        if (!(await podeTurma(turmaId))) deny();
        const mats = await S().list('matriculas', m => m.turma_id === turmaId);
        const alunos = await S().list('alunos');
        return mats.map(m => ({ ...m, aluno: sanitizeAluno(alunos.find(a => a.id === m.aluno_id) || { nome: '?' }) })).sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
      },
      async incluirAluno(turmaId, alunoId, entrada) {
        need('turmas.alunos');
        const ja = await S().list('matriculas', m => m.turma_id === turmaId && m.aluno_id === alunoId && m.status === 'ativo');
        if (ja.length) throw new Error('Aluno já está ativo nesta turma.');
        const t = await S().get('turmas', turmaId);
        const ativos = await S().list('matriculas', m => m.turma_id === turmaId && m.status === 'ativo');
        if (t.vagas && ativos.length >= t.vagas) throw new Error(`Turma lotada (${t.vagas} vagas).`);
        const r = await S().insert('matriculas', { turma_id: turmaId, aluno_id: alunoId, entrada: entrada || u().today(), saida: null, motivo_saida: null, status: 'ativo' });
        const a = await S().get('alunos', alunoId);
        await audit('incluir_turma', 'matriculas', r.id, `${a.nome} incluído(a) em ${t.nome}`);
        return r;
      },
      // Corrige a data em que o aluno entrou na turma (ex.: incluído no sistema depois das primeiras aulas)
      async alterarEntrada(matId, entrada) {
        need('turmas.alunos');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada || '')) throw new Error('Informe a data de entrada.');
        const r = await S().update('matriculas', matId, { entrada });
        const a = await S().get('alunos', r.aluno_id);
        await audit('editar', 'matriculas', matId, `Data de entrada de ${a ? a.nome : 'aluno'} alterada para ${u().fmtDate(entrada)}`);
        return r;
      },
      async retirarAluno(matId, motivo, saida, obs) {
        need('turmas.alunos');
        if (!motivo) throw new Error('Informe o motivo da saída.');
        const r = await S().update('matriculas', matId, { status: 'saiu', saida: saida || u().today(), motivo_saida: motivo, obs_saida: obs || '' });
        const a = await S().get('alunos', r.aluno_id); const t = await S().get('turmas', r.turma_id);
        await audit('retirar_turma', 'matriculas', matId, `${a.nome} retirado(a) de ${t.nome} — ${motivo}`);
        return r;
      }
    },

    aulas: {
      async list(turmaId, ym) {
        if (!(await podeTurma(turmaId))) deny();
        return (await S().list('aulas', a => a.turma_id === turmaId && (!ym || a.data.startsWith(ym)))).sort((a, b) => b.data.localeCompare(a.data));
      },
      async get(id) { const a = await S().get('aulas', id); if (a && !(await podeTurma(a.turma_id))) deny(); return a; },
      async save(a) {
        need('aulas.registrar');
        if (!(await podeTurma(a.turma_id))) deny('Você só pode registrar aulas das suas turmas.');
        if (!a.data) throw new Error('Informe a data da aula.');
        a.horas = u().hoursBetween(a.inicio, a.fim);
        const r = a.id ? await S().update('aulas', a.id, a) : await S().insert('aulas', { presencas: {}, fotos: [], status: 'planejada', ...a });
        await audit(a.id ? 'editar' : 'criar', 'aulas', r.id, `Aula de ${u().fmtDate(r.data)}`);
        return r;
      },
      async remove(id) {
        const a = await S().get('aulas', id); need('turmas.editar');
        if (a.status === 'realizada') throw new Error('Aula realizada não pode ser excluída (prestação de contas).');
        await S().remove('aulas', id); await audit('excluir', 'aulas', id, 'Aula planejada excluída');
      }
    },

    eventos: {
      async list() { return (await S().list('eventos')).sort((a, b) => b.data.localeCompare(a.data)); },
      async get(id) { return S().get('eventos', id); },
      async save(e) {
        need('eventos.editar');
        if (!e.titulo) throw new Error('Informe o título.');
        const r = e.id ? await S().update('eventos', e.id, e) : await S().insert('eventos', { fotos: [], alunos: [], ...e });
        await audit(e.id ? 'editar' : 'criar', 'eventos', r.id, `${ICM.C.TIPOS_EVENTO[r.tipo].nome}: ${r.titulo}`);
        return r;
      },
      async remove(id) { need('eventos.editar'); await S().remove('eventos', id); await audit('excluir', 'eventos', id, 'Evento excluído'); }
    },

    usuarios: {
      async list() { return (await S().list('usuarios')).map(({ senha_hash, ...x }) => x); },
      async professores() { return (await api.usuarios.list()).filter(x => x.ativo && (x.papel === 'professor' || x.papel === 'coordenacao' || x.da_aulas)); },
      async save(x) {
        need('usuarios.gerenciar');
        if (!x.nome || !x.email) throw new Error('Nome e e-mail são obrigatórios.');
        const all = await S().list('usuarios');
        if (all.some(o => o.email.toLowerCase() === x.email.toLowerCase() && o.id !== x.id)) throw new Error('E-mail já cadastrado.');
        const patch = { ...x }; delete patch.senha;
        if (S().modo === 'supabase') { delete patch.convite; /* com banco: vira convite; a pessoa cria a própria senha no "Primeiro acesso" */ }
        else if (x.senha) {
          if (x.senha.length < 8 || !/\d/.test(x.senha) || !/[a-zA-Z]/.test(x.senha)) throw new Error('A senha precisa ter 8+ caracteres, com letras e números.');
          patch.senha_hash = await u().sha256('icm-salt::' + x.senha);
        } else if (!x.id) throw new Error('Defina uma senha inicial.');
        const r = x.id ? await S().update('usuarios', x.id, patch) : await S().insert('usuarios', { ativo: true, ...patch });
        await audit(x.id ? 'editar' : 'criar', 'usuarios', r.id, `Usuário ${r.nome} (${ICM.C.PAPEIS[r.papel].nome})`);
        const { senha_hash, ...out } = r; return out;
      }
    },

    patrimonio: {
      async list({ q, categoria, situacao } = {}) {
        let l = await S().list('patrimonio');
        if (categoria) l = l.filter(i => i.categoria === categoria);
        if (situacao) l = l.filter(i => i.situacao === situacao);
        if (q) { const s = q.toLowerCase(); l = l.filter(i => [i.nome, i.tombo, i.marca, i.modelo, i.numero_serie, i.local].join(' ').toLowerCase().includes(s)); }
        const emp = await S().list('emprestimos', e => e.status === 'ativo');
        return l.map(i => ({ ...stripValor(i), emprestados: emp.filter(e => e.item_id === i.id).reduce((s, e) => s + e.quantidade, 0) }))
          .map(i => ({ ...i, disponivel: i.situacao === 'ativo' ? Math.max(0, i.quantidade - i.emprestados) : 0 }))
          .sort((a, b) => a.tombo.localeCompare(b.tombo));
      },
      async get(id) {
        const i = await S().get('patrimonio', id); if (!i) return null;
        const emp = await S().list('emprestimos', e => e.status === 'ativo' && e.item_id === id);
        const emprestados = emp.reduce((s, e) => s + e.quantidade, 0);
        return { ...stripValor(i), emprestados, disponivel: i.situacao === 'ativo' ? Math.max(0, i.quantidade - emprestados) : 0 };
      },
      async save(i) {
        need('patrimonio.editar');
        i = { ...i }; delete i.emprestados; delete i.disponivel;
        if (!i.nome) throw new Error('Informe o nome do bem.');
        if (!(i.quantidade >= 1)) throw new Error('Quantidade deve ser 1 ou mais.');
        if (i.id) {
          const atual = await api.patrimonio.get(i.id);
          if (i.quantidade < atual.emprestados) throw new Error(`Há ${atual.emprestados} unidade(s) emprestada(s); a quantidade não pode ser menor.`);
          const r = await S().update('patrimonio', i.id, i);
          await audit('editar', 'patrimonio', r.id, `${r.tombo} — ${r.nome}`);
          return r;
        }
        const all = await S().list('patrimonio');
        const seq = all.reduce((m, x) => Math.max(m, Number((x.tombo.match(/(\d+)$/) || [0, 0])[1])), 0) + 1;
        const r = await S().insert('patrimonio', { situacao: 'ativo', estado: 'bom', historico: [{ data: u().today(), tipo: 'entrada', descricao: 'Cadastro no inventário', usuario: me().nome }], ...i, tombo: `ICM-PAT-${String(seq).padStart(4, '0')}` });
        await audit('criar', 'patrimonio', r.id, `${r.tombo} — ${r.nome}`);
        return r;
      },
      async registrar(id, { tipo, descricao, situacao, estado, data }) {
        need('patrimonio.editar');
        const i = await S().get('patrimonio', id);
        if (tipo === 'baixa') {
          const emp = await S().list('emprestimos', e => e.status === 'ativo' && e.item_id === id);
          if (emp.length) throw new Error('Há empréstimos em aberto deste bem. Registre a devolução antes da baixa.');
        }
        if (!descricao) throw new Error('Descreva o motivo.');
        const hist = (i.historico || []).concat([{ data: data || u().today(), tipo, descricao, usuario: me().nome }]);
        const r = await S().update('patrimonio', id, { historico: hist, situacao: situacao || i.situacao, estado: estado || i.estado });
        await audit(tipo, 'patrimonio', id, `${i.tombo} — ${descricao}`);
        return r;
      }
    },

    emprestimos: {
      async list({ status, aluno_id, item_id } = {}) {
        let l = await S().list('emprestimos');
        if (isProf()) { const vis = await alunosVisiveisIds(); l = l.filter(e => e.tipo_tomador === 'aluno' && vis.has(e.aluno_id)); }
        if (aluno_id) l = l.filter(e => e.aluno_id === aluno_id);
        if (item_id) l = l.filter(e => e.item_id === item_id);
        const hoje = u().today();
        l = l.map(e => ({ ...e, atrasado: e.status === 'ativo' && e.previsao_devolucao && e.previsao_devolucao < hoje }));
        if (status === 'atrasado') l = l.filter(e => e.atrasado);
        else if (status) l = l.filter(e => e.status === status);
        const [itens, alunos, users] = [await S().list('patrimonio'), await S().list('alunos'), await S().list('usuarios')];
        return l.map(e => enrichEmp(e, itens, alunos, users)).sort((a, b) => b.data_saida.localeCompare(a.data_saida));
      },
      async get(id) { const l = await api.emprestimos.list(); return l.find(e => e.id === id) || null; },
      async emprestar(o) {
        need('patrimonio.emprestar');
        const item = await api.patrimonio.get(o.item_id);
        if (!item) throw new Error('Selecione o bem.');
        if (!item.emprestavel) throw new Error('Este bem não está liberado para empréstimo.');
        if (item.situacao !== 'ativo') throw new Error('Bem em manutenção ou baixado.');
        o.quantidade = Number(o.quantidade || 1);
        if (o.quantidade < 1 || o.quantidade > item.disponivel) throw new Error(`Disponível: ${item.disponivel} unidade(s).`);
        if (o.tipo_tomador === 'aluno' && !o.aluno_id) throw new Error('Selecione o aluno.');
        if (o.tipo_tomador === 'colaborador' && !o.colaborador_id) throw new Error('Selecione o colaborador.');
        if (o.tipo_tomador === 'terceiro' && (!o.terceiro || !o.terceiro.nome || !o.terceiro.documento)) throw new Error('Informe nome e documento (CPF/CNPJ) do terceiro.');
        if (!o.previsao_devolucao) throw new Error('Informe a data prevista de devolução.');
        if (o.previsao_devolucao < o.data_saida) throw new Error('A devolução não pode ser antes da saída.');
        if (o.tipo_tomador !== 'aluno') o.aluno_id = null;
        if (o.tipo_tomador !== 'terceiro') o.terceiro = null;
        if (o.tipo_tomador !== 'colaborador') o.colaborador_id = null;
        const all = await S().list('emprestimos'); const ano = (o.data_saida || u().today()).slice(0, 4);
        const seq = all.filter(e => e.numero.includes(`-${ano}-`)).length + 1;
        const r = await S().insert('emprestimos', { ...o, numero: `EMP-${ano}-${String(seq).padStart(4, '0')}`, status: 'ativo', entregue_por: me().id, data_devolucao: null });
        await audit('emprestar', 'emprestimos', r.id, `${r.numero}: ${o.quantidade}x ${item.nome}`);
        return r;
      },
      async devolver(id, { data_devolucao, estado_devolucao, obs_devolucao }) {
        need('patrimonio.emprestar');
        const e = await S().get('emprestimos', id);
        if (e.status !== 'ativo') throw new Error('Este empréstimo já foi encerrado.');
        if (!data_devolucao) throw new Error('Informe a data da devolução.');
        if (data_devolucao < e.data_saida) throw new Error('Data de devolução anterior à saída.');
        const status = estado_devolucao === 'extraviado' ? 'extraviado' : 'devolvido';
        const r = await S().update('emprestimos', id, { status, data_devolucao, estado_devolucao, obs_devolucao, recebido_por: me().id });
        if (['ruim', 'inservivel', 'extraviado'].includes(estado_devolucao)) {
          const i = await S().get('patrimonio', e.item_id);
          const hist = (i.historico || []).concat([{ data: data_devolucao, tipo: estado_devolucao === 'extraviado' ? 'extravio' : 'avaria', descricao: `${e.numero}: ${estado_devolucao === 'extraviado' ? `${e.quantidade} unidade(s) não devolvida(s)` : 'devolvido com avaria'}. ${obs_devolucao || ''}`.trim(), usuario: me().nome }]);
          const patch = { historico: hist };
          if (estado_devolucao === 'extraviado') patch.quantidade = Math.max(0, i.quantidade - e.quantidade);
          await S().update('patrimonio', i.id, patch);
        }
        await audit('devolver', 'emprestimos', id, `${e.numero}: ${status === 'extraviado' ? 'extraviado' : 'devolvido'} (${estado_devolucao})`);
        return r;
      }
    },

    assiduidade: { turma: assiduidadeTurma, alertas: alertasAssiduidade, nivel: nivelFaltas, cfg: cfgAssid },

    config: {
      get: () => S().getConfig(),
      async set(patch) { need('usuarios.gerenciar'); const r = await S().setConfig(patch); await audit('editar', 'config', '', 'Configurações alteradas'); return r; }
    },

    auditoria: { async list() { need('auditoria.ver'); return (await S().list('auditoria')).sort((a, b) => b.em.localeCompare(a.em)); } },

    async dashboard() {
      const tids = await minhasTurmasIds();
      const vis = await alunosVisiveisIds();
      const alunos = await S().list('alunos', a => !vis || vis.has(a.id));
      const turmas = await S().list('turmas', t => tids.includes(t.id));
      const projetos = await api.projetos.list();
      const aulas = await S().list('aulas', a => tids.includes(a.turma_id));
      const hoje = u().today(); const ym = hoje.slice(0, 7);
      const realizadas = aulas.filter(a => a.status === 'realizada');
      const doMes = realizadas.filter(a => a.data.startsWith(ym));
      let P = 0, T = 0; doMes.forEach(a => Object.values(a.presencas).forEach(v => { T++; if (v !== 'F') P++; }));
      const proximas = aulas.filter(a => a.data >= hoje && a.status === 'planejada').sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio)).slice(0, 6);
      const pendentes = aulas.filter(a => a.data < hoje && a.status === 'planejada');
      const eventos = (await S().list('eventos', e => e.data >= hoje)).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4);
      const meses = [];
      for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const k = u().iso(d).slice(0, 7); meses.push({ k, l: u().MESES_C[d.getMonth()], h: realizadas.filter(a => a.data.startsWith(k)).reduce((s, a) => s + a.horas, 0) }); }
      const porArea = {}; const mats = await S().list('matriculas', m => m.status === 'ativo' && tids.includes(m.turma_id));
      mats.forEach(m => { const t = turmas.find(x => x.id === m.turma_id); const p = projetos.find(x => x.id === (t && t.projeto_id)); if (p) (porArea[p.area] = porArea[p.area] || new Set()).add(m.aluno_id); });
      return {
        alunosAtivos: alunos.filter(a => a.status === 'ativo').length, turmas: turmas.length, projetos: projetos.filter(p => p.status === 'execucao').length,
        horasMes: doMes.reduce((s, a) => s + a.horas, 0), aulasMes: doMes.length, freqMes: T ? Math.round(P / T * 100) : 0,
        proximas, pendentes, eventos, meses, porArea: Object.fromEntries(Object.entries(porArea).map(([k, v]) => [k, v.size])),
        alertas: await alertasAssiduidade(ym), turmasList: turmas
      };
    },

    // Busca global
    async buscar(q) {
      if (!q || q.length < 2) return [];
      const s = q.toLowerCase();
      const al = (await api.alunos.list({ q })).slice(0, 6).map(a => ({ tipo: 'Aluno', nome: a.nome, sub: a.matricula, href: `#/alunos/${a.id}` }));
      const pr = (await api.projetos.list()).filter(p => p.nome.toLowerCase().includes(s)).map(p => ({ tipo: 'Projeto', nome: p.nome, sub: ICM.C.AREAS[p.area].nome, href: `#/projetos/${p.id}` }));
      const tu = (await api.turmas.list()).filter(t => t.nome.toLowerCase().includes(s)).map(t => ({ tipo: 'Turma', nome: t.nome, sub: t.modalidade, href: `#/turmas/${t.id}` }));
      const ev = (await api.eventos.list()).filter(e => e.titulo.toLowerCase().includes(s)).slice(0, 4).map(e => ({ tipo: 'Evento', nome: e.titulo, sub: u().fmtDate(e.data), href: `#/eventos/${e.id}` }));
      const pt = (await api.patrimonio.list({ q })).slice(0, 4).map(i => ({ tipo: 'Patrimônio', nome: i.nome, sub: i.tombo, href: `#/patrimonio/${i.id}` }));
      return [...al, ...pr, ...tu, ...ev, ...pt];
    },

    // Acesso bruto somente para relatórios (já respeitando escopo)
    async raw(col) { return S().list(col); }
  };

  // Ajudantes compartilhados com os módulos em api-comunidade.js
  api._h = { need, deny, me, audit, isProf, alunosVisiveisIds, podeTurma, minhasTurmasIds, sanitizeAluno };

  ICM.api = api;
})();
