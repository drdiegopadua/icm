/* Regras de negócio: lista de espera, reuniões de pais, voluntários, certificados,
   doadores, associados, pesquisas de satisfação e agenda de espaços/insumos. */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const H = () => ICM.api._h;
  const need = p => H().need(p);
  const audit = (...a) => H().audit(...a);
  const me = () => H().me();

  async function seq(col, prefixo, campo) {
    const all = await S().list(col);
    const n = all.reduce((m, x) => Math.max(m, Number(((x[campo] || '').match(/(\d+)$/) || [0, 0])[1])), 0) + 1;
    return `${prefixo}${String(n).padStart(4, '0')}`;
  }

  // ================= Triagem socioeconômica =================
  function pontuar(c) {
    const T = ICM.C.TRIAGEM, itens = [];
    const pc = c.pessoas_casa ? (Number(c.renda_familiar) || 0) / c.pessoas_casa : null;
    if (pc != null) { const f = T.renda.find(x => pc <= x.ate * ICM.C.SALARIO_MINIMO); if (f) itens.push({ txt: f.txt, pts: f.pts }); }
    if (c.cadunico) itens.push({ txt: T.cadunico.txt, pts: T.cadunico.pts });
    if (c.beneficio) itens.push({ txt: T.beneficio.txt, pts: T.beneficio.pts });
    if (['Municipal', 'Estadual', 'Federal'].includes(c.rede)) itens.push({ txt: T.escola_publica.txt, pts: T.escola_publica.pts });
    if (c.encaminhamento) itens.push({ txt: `${T.encaminhamento.txt.split(' (')[0]} — ${c.encaminhamento}`, pts: T.encaminhamento.pts });
    (c.vulnerabilidades || []).forEach(k => { const v = T.vulnerabilidades[k]; if (v) itens.push({ txt: v.txt, pts: v.pts }); });
    if (c.data_inscricao) { const meses = Math.min(T.espera_mes.max, Math.floor((u().parseD(u().today()) - u().parseD(c.data_inscricao)) / (30 * 864e5))); if (meses > 0) itens.push({ txt: `Tempo de espera: ${meses} mês(es)`, pts: meses * T.espera_mes.pts }); }
    return { total: itens.reduce((s, i) => s + i.pts, 0), itens, renda_pc: pc };
  }

  async function vagasTurmas() {
    const turmas = await S().list('turmas', t => t.status !== 'encerrada');
    const mats = await S().list('matriculas', m => m.status === 'ativo');
    return turmas.map(t => { const oc = mats.filter(m => m.turma_id === t.id).length; return { ...t, ocupadas: oc, livres: t.vagas ? Math.max(0, t.vagas - oc) : null }; });
  }

  const espera = {
    pontuar,
    vagasTurmas,
    async list({ status, turma_id } = {}) {
      need('espera.gerir');
      let l = await S().list('espera');
      if (status) l = l.filter(c => c.status === status);
      if (turma_id) l = l.filter(c => (c.interesses || []).includes(turma_id));
      return l.map(c => ({ ...c, triagem: pontuar(c), idade: u().age(c.nascimento) }))
        .sort((a, b) => b.triagem.total - a.triagem.total || a.data_inscricao.localeCompare(b.data_inscricao));
    },
    async get(id) { need('espera.gerir'); const c = await S().get('espera', id); return c ? { ...c, triagem: pontuar(c), idade: u().age(c.nascimento) } : null; },
    async save(c) {
      need('espera.gerir');
      if (!c.nome) throw new Error('Informe o nome da criança/adolescente.');
      if (!c.responsavel || !c.responsavel.nome || !c.responsavel.telefone) throw new Error('Informe responsável e telefone.');
      if (c.id) { const r = await S().update('espera', c.id, c); await audit('editar', 'espera', r.id, `Lista de espera: ${r.nome}`); return r; }
      const r = await S().insert('espera', { status: 'aguardando', data_inscricao: u().today(), ...c, protocolo: await seq('espera', `ESP-${u().today().slice(0, 4)}-`, 'protocolo') });
      await audit('criar', 'espera', r.id, `Inscrição ${r.protocolo} — ${r.nome}`);
      return r;
    },
    async status(id, status, obs) {
      need('espera.gerir');
      const patch = { status }; if (status === 'convocado') patch.convocado_em = u().today(); if (obs) patch.obs = obs;
      const r = await S().update('espera', id, patch); await audit('editar', 'espera', id, `${r.nome}: ${status}`); return r;
    },
    // Converte o candidato em aluno matriculado e inclui na turma escolhida
    async matricular(id, turma_id) {
      need('espera.gerir'); need('alunos.editar');
      const c = await S().get('espera', id);
      const aluno = await ICM.api.alunos.save({
        nome: c.nome, nascimento: c.nascimento, status: 'ativo', data_matricula: u().today(),
        responsavel: { ...c.responsavel }, endereco: { bairro: c.bairro },
        social: { pessoas_casa: c.pessoas_casa, cadunico: !!c.cadunico, beneficios: c.beneficio ? ['Outro'] : [], vulnerabilidades: (c.vulnerabilidades || []).map(k => ICM.C.TRIAGEM.vulnerabilidades[k].txt).join('; '), cras: c.encaminhamento === 'CRAS' ? 'Sim' : '' },
        financeiro: { renda_familiar: c.renda_familiar, renda_per_capita: c.pessoas_casa ? Math.round(c.renda_familiar / c.pessoas_casa) : null, isencao: true },
        saude: { apto_atividade_fisica: true }, escolaridade: { escola: c.escola, rede: c.rede }, autorizacoes: { lgpd: false, imagem: false }
      });
      if (turma_id) await ICM.api.turmas.incluirAluno(turma_id, aluno.id, u().today());
      await S().update('espera', id, { status: 'matriculado', aluno_id: aluno.id, matriculado_em: u().today() });
      await audit('matricular', 'espera', id, `${c.protocolo} → ${aluno.matricula}`);
      return aluno;
    }
  };

  // ================= Reuniões de pais =================
  const reunioes = {
    async list() { return (await S().list('reunioes')).sort((a, b) => b.data.localeCompare(a.data)); },
    async get(id) { return S().get('reunioes', id); },
    // Famílias convidadas: alunos ativos do projeto/turma (ou todos)
    async convidados(r) {
      const mats = await S().list('matriculas', m => m.status === 'ativo');
      const turmas = await S().list('turmas');
      let ids;
      if (r.turma_id) ids = mats.filter(m => m.turma_id === r.turma_id).map(m => m.aluno_id);
      else if (r.projeto_id) { const tids = turmas.filter(t => t.projeto_id === r.projeto_id).map(t => t.id); ids = mats.filter(m => tids.includes(m.turma_id)).map(m => m.aluno_id); }
      else ids = mats.map(m => m.aluno_id);
      ids = [...new Set(ids)];
      const vis = await H().alunosVisiveisIds();
      const alunos = await S().list('alunos', a => ids.includes(a.id) && (!vis || vis.has(a.id)));
      return alunos.sort((a, b) => a.nome.localeCompare(b.nome)).map(a => ({ id: a.id, nome: a.nome, matricula: a.matricula, responsavel: a.responsavel || {} }));
    },
    async save(r) {
      need('reunioes.gerir');
      if (!r.titulo || !r.data) throw new Error('Informe título e data.');
      const x = r.id ? await S().update('reunioes', r.id, r) : await S().insert('reunioes', { presencas: {}, fotos: [], ...r });
      await audit(r.id ? 'editar' : 'criar', 'reunioes', x.id, `Reunião: ${x.titulo}`); return x;
    },
    async remove(id) { need('reunioes.gerir'); await S().remove('reunioes', id); await audit('excluir', 'reunioes', id, 'Reunião excluída'); },
    async doAluno(alunoId) { return (await S().list('reunioes', r => r.presencas && alunoId in r.presencas)).map(r => ({ ...r, presente: !!r.presencas[alunoId] })); }
  };

  // ================= Voluntários =================
  const voluntarios = {
    async list() { return (await S().list('voluntarios')).map(v => ({ ...v, total_horas: (v.horas || []).reduce((s, h) => s + Number(h.horas || 0), 0) })).sort((a, b) => a.nome.localeCompare(b.nome)); },
    async get(id) { const v = await S().get('voluntarios', id); return v ? { ...v, total_horas: (v.horas || []).reduce((s, h) => s + Number(h.horas || 0), 0) } : null; },
    async save(v) {
      need('voluntarios.gerir');
      if (!v.nome) throw new Error('Informe o nome do voluntário.');
      if (v.cpf && !u().cpfValido(v.cpf)) throw new Error('CPF inválido.');
      const x = v.id ? await S().update('voluntarios', v.id, v) : await S().insert('voluntarios', { status: 'ativo', horas: [], inicio: u().today(), ...v });
      await audit(v.id ? 'editar' : 'criar', 'voluntarios', x.id, `Voluntário ${x.nome}`); return x;
    },
    async addHoras(id, h) {
      need('voluntarios.gerir');
      if (!(Number(h.horas) > 0) || !h.data || !h.atividade) throw new Error('Informe data, horas e atividade.');
      const v = await S().get('voluntarios', id);
      const r = await S().update('voluntarios', id, { horas: (v.horas || []).concat([{ id: u().uid('hv_'), ...h, horas: Number(h.horas) }]) });
      await audit('editar', 'voluntarios', id, `${h.horas}h registradas — ${v.nome}`); return r;
    },
    async removeHoras(id, hid) { need('voluntarios.gerir'); const v = await S().get('voluntarios', id); return S().update('voluntarios', id, { horas: (v.horas || []).filter(h => h.id !== hid) }); }
  };

  // ================= Certificados =================
  function novoCodigo() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint8Array(12); crypto.getRandomValues(b); return Array.from(b, x => a[x % a.length]).join('').replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'); }
  const certificados = {
    async list() { return (await S().list('certificados')).sort((a, b) => b.data_emissao.localeCompare(a.data_emissao) || a.nome.localeCompare(b.nome)); },
    async get(id) { return S().get('certificados', id); },
    async emitir(lista) {
      need('certificados.emitir');
      const out = [];
      for (const c of lista) {
        if (!c.nome || !c.titulo) throw new Error('Nome e título são obrigatórios.');
        out.push(await S().insert('certificados', { status: 'valido', data_emissao: u().today(), emitido_por: me().id, ...c, codigo: novoCodigo() }));
      }
      await audit('emitir', 'certificados', out.map(c => c.codigo).join(','), `${out.length} certificado(s): ${lista[0] && lista[0].titulo}`);
      return out;
    },
    // Sugere destinatários: alunos da turma com frequência mínima
    async elegiveisTurma(turma_id, freqMin = 75) {
      const { linhas } = await ICM.api.assiduidade.turma(turma_id);
      return linhas.map(l => ({ ...l, elegivel: l.freq != null && l.freq >= freqMin }));
    },
    async revogar(id, motivo) {
      need('certificados.emitir');
      if (!motivo) throw new Error('Informe o motivo.');
      const r = await S().update('certificados', id, { status: 'revogado', motivo_revogacao: motivo, revogado_em: u().today() });
      await audit('revogar', 'certificados', r.codigo, motivo); return r;
    },
    // Consulta pública (sem login): devolve só o necessário para conferir
    async verificar(codigo) {
      const c = (await S().list('certificados')).find(x => x.codigo === String(codigo || '').toUpperCase().trim());
      if (!c) return null;
      return { codigo: c.codigo, nome: c.nome, titulo: c.titulo, tipo: c.tipo, carga_horaria: c.carga_horaria, data_emissao: c.data_emissao, status: c.status, motivo_revogacao: c.motivo_revogacao };
    }
  };

  // ================= Doadores =================
  const doadores = {
    async list() {
      need('doadores.gerir');
      const ds = await S().list('doadores'); const dc = await S().list('doacoes');
      return ds.map(d => { const l = dc.filter(x => x.doador_id === d.id); return { ...d, total: l.reduce((s, x) => s + Number(x.valor || 0), 0), qtd: l.length, ultima: l.map(x => x.data).sort().pop() || null }; }).sort((a, b) => b.total - a.total);
    },
    async get(id) { need('doadores.gerir'); return S().get('doadores', id); },
    async save(d) {
      need('doadores.gerir');
      if (!d.nome) throw new Error('Informe o nome.');
      const x = d.id ? await S().update('doadores', d.id, d) : await S().insert('doadores', d);
      await audit(d.id ? 'editar' : 'criar', 'doadores', x.id, `Doador ${x.nome}`); return x;
    },
    async doacoes({ doador_id, de, ate, projeto_id } = {}) {
      need('doadores.gerir');
      return (await S().list('doacoes', x => (!doador_id || x.doador_id === doador_id) && (!de || x.data >= de) && (!ate || x.data <= ate) && (projeto_id === undefined || x.projeto_id === projeto_id))).sort((a, b) => b.data.localeCompare(a.data));
    },
    async registrarDoacao(o) {
      need('doadores.gerir');
      if (!o.doador_id || !o.data) throw new Error('Informe doador e data.');
      if (!(Number(o.valor) > 0)) throw new Error('Informe o valor (para bens/serviços, o valor estimado).');
      const x = o.id ? await S().update('doacoes', o.id, o) : await S().insert('doacoes', { ...o, valor: Number(o.valor), recibo: await seq('doacoes', `REC-${o.data.slice(0, 4)}-`, 'recibo') });
      await audit(o.id ? 'editar' : 'criar', 'doacoes', x.id, `Doação ${x.recibo}: ${u().money(x.valor)}`); return x;
    },
    async removerDoacao(id) { need('doadores.gerir'); await S().remove('doacoes', id); await audit('excluir', 'doacoes', id, 'Doação excluída'); }
  };

  // ================= Associados =================
  function situacao(mens) {
    const hoje = u().today();
    const vencidas = mens.filter(m => m.status === 'aberta' && m.vencimento < hoje);
    const dias = vencidas.length ? Math.round((u().parseD(hoje) - u().parseD(vencidas.map(m => m.vencimento).sort()[0])) / 864e5) : 0;
    return { em_dia: !vencidas.length, vencidas: vencidas.length, divida: vencidas.reduce((s, m) => s + Number(m.valor), 0), dias_atraso: dias };
  }
  const associados = {
    situacao,
    async list() {
      need('associados.gerir');
      const as = await S().list('associados'); const ms = await S().list('mensalidades'); const al = await S().list('alunos');
      return as.map(a => { const m = ms.filter(x => x.associado_id === a.id); const aluno = al.find(x => x.id === a.aluno_id); return { ...a, aluno_nome: aluno ? aluno.nome : '', aluno_matricula: aluno ? aluno.matricula : '', ...situacao(m), pago_ano: m.filter(x => x.status === 'paga' && x.competencia.startsWith(u().today().slice(0, 4))).reduce((s, x) => s + Number(x.valor), 0) }; })
        .sort((a, b) => a.titular.localeCompare(b.titular));
    },
    async get(id) { need('associados.gerir'); return S().get('associados', id); },
    async doAluno(alunoId) {
      const a = (await S().list('associados', x => x.aluno_id === alunoId && x.status !== 'desligado'))[0];
      if (!a) return null;
      return { ...a, ...situacao(await S().list('mensalidades', m => m.associado_id === a.id)) };
    },
    async save(a) {
      need('associados.gerir');
      if (!a.titular) throw new Error('Informe o titular (responsável).');
      if (!(Number(a.valor_mensal) >= 0)) throw new Error('Informe o valor da mensalidade.');
      if (a.aluno_id && !a.id) { const ja = await S().list('associados', x => x.aluno_id === a.aluno_id && x.status !== 'desligado'); if (ja.length) throw new Error('Este aluno já está vinculado a um associado ativo.'); }
      const x = a.id ? await S().update('associados', a.id, a) : await S().insert('associados', { status: 'ativo', data_adesao: u().today(), ...a, numero: await seq('associados', 'ASS-', 'numero') });
      await audit(a.id ? 'editar' : 'criar', 'associados', x.id, `Associado ${x.numero} — ${x.titular}`); return x;
    },
    async mensalidades(associado_id) { need('associados.gerir'); return (await S().list('mensalidades', m => !associado_id || m.associado_id === associado_id)).sort((a, b) => b.competencia.localeCompare(a.competencia)); },
    // Gera as mensalidades de um mês para todos os associados ativos (não duplica)
    async gerarMes(ym) {
      need('associados.gerir');
      const as = await S().list('associados', a => a.status === 'ativo' && Number(a.valor_mensal) > 0);
      const ms = await S().list('mensalidades', m => m.competencia === ym);
      let n = 0;
      for (const a of as) {
        if (ms.some(m => m.associado_id === a.id)) continue;
        await S().insert('mensalidades', { associado_id: a.id, competencia: ym, vencimento: `${ym}-${String(a.dia_vencimento || 10).padStart(2, '0')}`, valor: Number(a.valor_mensal), status: 'aberta', pago_em: null, forma: '', recibo: '' });
        n++;
      }
      await audit('criar', 'mensalidades', ym, `${n} mensalidade(s) geradas para ${ym}`);
      return n;
    },
    async pagar(id, { pago_em, forma }) {
      need('associados.gerir');
      const m = await S().get('mensalidades', id);
      if (m.status === 'paga') throw new Error('Mensalidade já está paga.');
      const a = await S().get('associados', m.associado_id);
      const r = await S().update('mensalidades', id, { status: 'paga', pago_em: pago_em || u().today(), forma, recibo: `MEN-${m.competencia.replace('-', '')}-${a.numero.slice(4)}`, recebido_por: me().id });
      await audit('receber', 'mensalidades', id, `${a.numero} ${m.competencia}: ${u().money(m.valor)}`); return r;
    },
    async cancelar(id, motivo) { need('associados.gerir'); const r = await S().update('mensalidades', id, { status: 'cancelada', obs: motivo }); await audit('cancelar', 'mensalidades', id, motivo || ''); return r; },
    // Alunos ativos sem CadÚnico e sem vínculo de associado (devem se associar)
    async pendentes() {
      need('associados.gerir');
      const al = await S().list('alunos', a => a.status === 'ativo' && a.social && a.social.cadunico === false);
      const as = await S().list('associados', a => a.status !== 'desligado');
      return al.filter(a => !as.some(s => s.aluno_id === a.id));
    }
  };

  // ================= Pesquisas de satisfação =================
  function resultado(p) {
    const n = p.respostas.length;
    const porPergunta = p.perguntas.map(q => {
      const vals = p.respostas.map(r => r.valores[q.id]).filter(v => v !== undefined && v !== '');
      if (q.tipo === 'nps') {
        const nums = vals.map(Number); const prom = nums.filter(v => v >= 9).length, det = nums.filter(v => v <= 6).length;
        return { ...q, n: nums.length, nps: nums.length ? Math.round((prom - det) / nums.length * 100) : null, media: nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null, prom, neu: nums.length - prom - det, det };
      }
      if (q.tipo === 'escala') { const nums = vals.map(Number); const dist = [1, 2, 3, 4, 5].map(k => nums.filter(v => v === k).length); return { ...q, n: nums.length, media: nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null, dist }; }
      if (q.tipo === 'sim_nao') { const sim = vals.filter(v => v === 'sim').length; return { ...q, n: vals.length, sim, nao: vals.length - sim, pct: vals.length ? Math.round(sim / vals.length * 100) : null }; }
      return { ...q, n: vals.length, comentarios: vals };
    });
    const escalas = porPergunta.filter(q => q.tipo === 'escala' && q.media != null);
    const npsQ = porPergunta.find(q => q.tipo === 'nps');
    return { n, porPergunta, nps: npsQ ? npsQ.nps : null, satisfacao: escalas.length ? escalas.reduce((s, q) => s + q.media, 0) / escalas.length : null };
  }
  const pesquisas = {
    resultado,
    async list() { return (await S().list('pesquisas')).map(p => ({ ...p, res: resultado(p) })).sort((a, b) => b.inicio.localeCompare(a.inicio)); },
    async get(id) { const p = await S().get('pesquisas', id); return p ? { ...p, res: resultado(p) } : null; },
    async save(p) {
      need('pesquisas.gerir');
      if (!p.titulo || !(p.perguntas || []).length) throw new Error('Informe título e ao menos uma pergunta.');
      const x = p.id ? await S().update('pesquisas', p.id, p) : await S().insert('pesquisas', { respostas: [], status: 'aberta', anonima: true, ...p });
      await audit(p.id ? 'editar' : 'criar', 'pesquisas', x.id, `Pesquisa: ${x.titulo}`); return x;
    },
    // Resposta anônima (não guarda quem respondeu)
    async responder(id, valores) {
      const p = await S().get('pesquisas', id);
      if (!p || p.status !== 'aberta') throw new Error('Pesquisa encerrada.');
      await S().update('pesquisas', id, { respostas: p.respostas.concat([{ id: u().uid('rsp_'), data: u().today(), valores }]) });
    },
    async encerrar(id) { need('pesquisas.gerir'); return S().update('pesquisas', id, { status: 'encerrada', fim: u().today() }); },
    // Indicadores do ano para o relatório anual
    async indicadoresAno(ano) {
      const l = (await S().list('pesquisas', p => p.inicio.startsWith(ano) || p.fim.startsWith(ano))).map(p => ({ ...p, res: resultado(p) }));
      return l;
    }
  };

  // ================= Agenda de espaços e insumos =================
  const sobrepoe = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
  const agenda = {
    async recursos() { return (await S().list('recursos')).sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === 'espaco' ? -1 : 1)); },
    async salvarRecurso(r) {
      need('agenda.gerir');
      if (!r.nome) throw new Error('Informe o nome do espaço/insumo.');
      const x = r.id ? await S().update('recursos', r.id, r) : await S().insert('recursos', { ativo: true, ...r });
      await audit(r.id ? 'editar' : 'criar', 'recursos', x.id, `Recurso ${x.nome}`); return x;
    },
    // Ocupação = reservas avulsas + horários fixos das turmas (pelo espaço da turma)
    async ocupacao(de, ate) {
      const res = (await S().list('reservas', x => x.data >= de && x.data <= ate)).map(x => ({ ...x, origem: 'reserva' }));
      const turmas = await S().list('turmas', t => t.status !== 'encerrada' && t.espaco_id);
      const aulasCanc = await S().list('aulas', a => a.status === 'cancelada');
      const out = [...res];
      for (let d = u().parseD(de); u().iso(d) <= ate; d.setDate(d.getDate() + 1)) {
        const k = u().iso(d);
        turmas.forEach(t => { if (t.dias.includes(d.getDay()) && !aulasCanc.some(a => a.turma_id === t.id && a.data === k)) out.push({ id: `fixo_${t.id}_${k}`, origem: 'turma', recurso_id: t.espaco_id, data: k, inicio: t.inicio, fim: t.fim, titulo: t.nome, turma_id: t.id, responsavel_id: t.professor_id }); });
      }
      return out.sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio));
    },
    async conflitos(o) {
      const oc = await agenda.ocupacao(o.data, o.data);
      return oc.filter(x => x.recurso_id === o.recurso_id && x.id !== o.id && sobrepoe(o.inicio, o.fim, x.inicio, x.fim));
    },
    async reservar(o) {
      need('agenda.reservar');
      if (!o.recurso_id || !o.data || !o.inicio || !o.fim || !o.titulo) throw new Error('Preencha espaço/insumo, data, horários e finalidade.');
      if (o.fim <= o.inicio) throw new Error('O horário final deve ser depois do inicial.');
      const c = await agenda.conflitos(o);
      if (c.length) { const e = new Error(`Conflito de horário com: ${c.map(x => `${x.titulo} (${x.inicio}–${x.fim})`).join(', ')}`); e.conflitos = c; throw e; }
      const x = o.id ? await S().update('reservas', o.id, o) : await S().insert('reservas', { responsavel_id: me().id, ...o });
      const r = await S().get('recursos', x.recurso_id);
      await audit('reservar', 'reservas', x.id, `${r.nome} ${u().fmtDate(x.data)} ${x.inicio}–${x.fim}: ${x.titulo}`); return x;
    },
    async cancelar(id) {
      const x = await S().get('reservas', id);
      if (!ICM.auth.can('agenda.gerir') && x.responsavel_id !== me().id) H().deny('Só quem reservou ou a coordenação pode cancelar.');
      await S().remove('reservas', id); await audit('cancelar', 'reservas', id, `Reserva cancelada: ${x.titulo}`);
    }
  };

  Object.assign(ICM.api, { espera, reunioes, voluntarios, certificados, doadores, associados, pesquisas, agenda });
})();
