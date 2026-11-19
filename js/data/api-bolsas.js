/* Bolsistas, monitores e jovens aprendizes: vínculo, requisitos do mês (frequência e horas),
   folha mensal (gerar → aprovar → pagar) e lançamento no financeiro.
   Coleções: bolsistas (vínculo + horas de atuação) e bolsas_pagamentos (uma linha por pessoa/mês). */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const H = () => ICM.api._h;
  const need = p => H().need(p);
  const audit = (...a) => H().audit(...a);
  const me = () => H().me();
  const R2 = v => Math.round(Number(v || 0) * 100) / 100;

  const TIPOS = {
    bolsista: { nome: 'Bolsista', plural: 'Bolsistas', cor: '#2563eb', icon: 'award', desc: 'Aluno(a) que recebe bolsa-auxílio para estudar no instituto' },
    monitor: { nome: 'Monitor(a)', plural: 'Monitores', cor: '#10b981', icon: 'users', desc: 'Aluno(a) avançado(a) que ajuda nas aulas' },
    aprendiz: { nome: 'Jovem aprendiz', plural: 'Jovens aprendizes', cor: '#8b5cf6', icon: 'school', desc: 'Jovem em formação profissional com carga horária' }
  };
  const STATUS = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado' };
  const PAG = { pendente: 'A aprovar', aprovado: 'Aprovado', pago: 'Pago', suspenso: 'Não pago no mês' };

  const fimMes = ym => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; };
  const vigenteNoMes = (b, ym) => b.status === 'ativo' && (!b.inicio || b.inicio <= fimMes(ym)) && (!b.fim || b.fim >= `${ym}-01`);
  const horasMes = (b, ym) => R2((b.atividades || []).filter(h => String(h.data || '').startsWith(ym)).reduce((s, h) => s + Number(h.horas || 0), 0));
  // Horas mínimas do mês: o que foi combinado; sem isso, carga semanal × 4
  const horasMinimas = b => b.horas_minimas_mes === '' || b.horas_minimas_mes == null ? Number(b.carga_semanal || 0) * 4 : Number(b.horas_minimas_mes);

  // Frequência do aluno nas aulas do mês (todas as turmas em que está matriculado)
  async function freqAluno(aluno_id, ym) {
    if (!aluno_id) return null;
    const mats = await S().list('matriculas', m => m.aluno_id === aluno_id);
    const tids = new Set(mats.map(m => m.turma_id));
    const aulas = await S().list('aulas', a => tids.has(a.turma_id) && a.status === 'realizada' && String(a.data || '').startsWith(ym));
    let P = 0, F = 0, J = 0;
    aulas.forEach(a => { const v = (a.presencas || {})[aluno_id]; if (v === 'P') P++; else if (v === 'F') F++; else if (v === 'J') J++; });
    const total = P + F + J;
    return { P, F, J, total, freq: total ? Math.round((P + J) / total * 100) : null };
  }

  async function situacao(b, ym) {
    const f = await freqAluno(b.aluno_id, ym);
    const horas = horasMes(b, ym), minH = horasMinimas(b), minF = Number(b.freq_minima || 75);
    const motivos = [];
    if (b.aluno_id && f && f.total && f.freq < minF) motivos.push(`Frequência ${f.freq}% (mínimo ${minF}%)`);
    if (b.aluno_id && f && !f.total) motivos.push('Sem chamada registrada no mês');
    if (minH > 0 && horas < minH) motivos.push(`${u().num(horas, 1)}h de atuação (mínimo ${u().num(minH, 1)}h)`);
    return { freq: f ? f.freq : null, presencas: f, horas, horas_minimas: minH, freq_minima: minF, ok: !motivos.length, motivos };
  }

  async function nomeAluno(id) { if (!id) return ''; const a = await S().get('alunos', id); return a ? a.nome : ''; }

  const bolsas = {
    TIPOS, STATUS, PAG, horasMes, horasMinimas, vigenteNoMes,

    async list({ tipo, status } = {}) {
      need('bolsas.gerir');
      const l = await S().list('bolsistas', b => (!tipo || b.tipo === tipo) && (!status || b.status === status));
      return l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },
    async get(id) { need('bolsas.gerir'); return S().get('bolsistas', id); },

    async save(b) {
      need('bolsas.gerir');
      b = { ...b };
      if (b.aluno_id && !b.nome) b.nome = await nomeAluno(b.aluno_id);
      if (!b.nome) throw new Error('Informe o nome ou escolha o aluno.');
      if (!TIPOS[b.tipo]) throw new Error('Escolha o tipo de vínculo.');
      if (!b.inicio) throw new Error('Informe a data de início.');
      if (b.fim && b.fim < b.inicio) throw new Error('O término não pode ser antes do início.');
      b.valor_mensal = R2(b.valor_mensal);
      if (!(b.valor_mensal >= 0)) throw new Error('Valor mensal inválido.');
      ['carga_semanal', 'freq_minima', 'horas_minimas_mes'].forEach(k => { b[k] = b[k] === '' || b[k] == null ? '' : Number(b[k]); });
      if (b.freq_minima === '') b.freq_minima = 75;
      const x = b.id ? await S().update('bolsistas', b.id, b) : await S().insert('bolsistas', { status: 'ativo', atividades: [], freq_minima: 75, ...b });
      await audit(b.id ? 'editar' : 'criar', 'bolsistas', x.id, `${TIPOS[x.tipo].nome} ${x.nome} — ${u().money(x.valor_mensal)}/mês`);
      return x;
    },
    async encerrar(id, { data, motivo }) {
      need('bolsas.gerir');
      const x = await S().update('bolsistas', id, { status: 'encerrado', fim: data || u().today(), motivo_encerramento: motivo || '' });
      await audit('encerrar', 'bolsistas', id, `Vínculo encerrado — ${x.nome}${motivo ? ': ' + motivo : ''}`); return x;
    },
    async addHoras(id, h) {
      need('bolsas.gerir');
      if (!h.data || !(Number(h.horas) > 0)) throw new Error('Informe a data e as horas.');
      if (!String(h.descricao || '').trim()) throw new Error('Descreva a atividade.');
      const b = await S().get('bolsistas', id);
      const r = await S().update('bolsistas', id, { atividades: (b.atividades || []).concat([{ id: u().uid('bh_'), data: h.data, horas: Number(h.horas), turma_id: h.turma_id || '', descricao: h.descricao, lancado_por: me().nome }]) });
      await audit('editar', 'bolsistas', id, `${h.horas}h de atuação — ${b.nome}`); return r;
    },
    async removeHoras(id, hid) { need('bolsas.gerir'); const b = await S().get('bolsistas', id); return S().update('bolsistas', id, { atividades: (b.atividades || []).filter(h => h.id !== hid) }); },

    situacao: async (id, ym) => situacao(await S().get('bolsistas', id), ym),

    async pagamentos({ bolsista_id, ym } = {}) {
      need('bolsas.gerir');
      return (await S().list('bolsas_pagamentos', p => (!bolsista_id || p.bolsista_id === bolsista_id) && (!ym || p.ym === ym))).sort((a, b) => b.ym.localeCompare(a.ym) || a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    // Folha do mês: pessoas com vínculo vigente + linha de pagamento (se já gerada)
    async folha(ym) {
      need('bolsas.gerir');
      const pags = await S().list('bolsas_pagamentos', p => p.ym === ym);
      const pessoas = await S().list('bolsistas');
      const faltam = pessoas.filter(b => vigenteNoMes(b, ym) && !pags.some(p => p.bolsista_id === b.id));
      return { pagamentos: pags.map(p => ({ ...p, bolsista: pessoas.find(b => b.id === p.bolsista_id) || null })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), faltam };
    },
    // Gera (ou atualiza, enquanto pendente) a folha do mês com frequência e horas conferidas
    async gerarFolha(ym) {
      need('bolsas.gerir');
      const pags = await S().list('bolsas_pagamentos', p => p.ym === ym);
      const pessoas = (await S().list('bolsistas')).filter(b => vigenteNoMes(b, ym));
      let novos = 0, atualizados = 0;
      for (const b of pessoas) {
        const s = await situacao(b, ym);
        const snap = { nome: b.nome, tipo: b.tipo, projeto_id: b.projeto_id || '', valor: R2(b.valor_mensal), freq: s.freq, horas: s.horas, horas_minimas: s.horas_minimas, freq_minima: s.freq_minima, requisito_ok: s.ok, motivos: s.motivos };
        const p = pags.find(x => x.bolsista_id === b.id);
        if (!p) { await S().insert('bolsas_pagamentos', { bolsista_id: b.id, ym, desconto: 0, motivo_desconto: '', status: 'pendente', gerado_por: me().nome, gerado_em: u().today(), ...snap }); novos++; }
        else if (p.status === 'pendente') { await S().update('bolsas_pagamentos', p.id, snap); atualizados++; }
      }
      await audit('gerar', 'bolsas_pagamentos', ym, `Folha de bolsas ${u().fmtMonth(ym)}: ${novos} nova(s), ${atualizados} atualizada(s)`);
      return { novos, atualizados };
    },
    async ajustar(pid, { desconto, motivo_desconto, obs }) {
      need('bolsas.gerir');
      const p = await S().get('bolsas_pagamentos', pid);
      if (p.status !== 'pendente') throw new Error('Só dá para ajustar enquanto a folha não foi aprovada.');
      const d = R2(desconto);
      if (d < 0 || d > p.valor) throw new Error('Desconto inválido.');
      if (d > 0 && !String(motivo_desconto || '').trim()) throw new Error('Informe o motivo do desconto.');
      return S().update('bolsas_pagamentos', pid, { desconto: d, motivo_desconto: motivo_desconto || '', obs: obs || '' });
    },
    async suspender(pid, motivo) {
      need('bolsas.gerir');
      const p = await S().get('bolsas_pagamentos', pid);
      if (p.status === 'pago') throw new Error('Pagamento já realizado.');
      if (!String(motivo || '').trim()) throw new Error('Informe o motivo.');
      await S().update('bolsas_pagamentos', pid, { status: 'suspenso', motivo_suspensao: motivo });
      await audit('suspender', 'bolsas_pagamentos', pid, `Bolsa de ${p.nome} não paga em ${u().fmtMonth(p.ym)}: ${motivo}`);
    },
    async reabrir(pid) {
      need('bolsas.aprovar');
      const p = await S().get('bolsas_pagamentos', pid);
      if (p.status === 'pago') throw new Error('Pagamento já realizado: estorne no financeiro antes.');
      await S().update('bolsas_pagamentos', pid, { status: 'pendente', aprovado_por: '', aprovado_em: '', motivo_suspensao: '' });
      await audit('reabrir', 'bolsas_pagamentos', pid, `Bolsa de ${p.nome} (${u().fmtMonth(p.ym)}) voltou para aprovação`);
    },
    async aprovar(ids) {
      need('bolsas.aprovar');
      let n = 0;
      for (const id of ids) { const p = await S().get('bolsas_pagamentos', id); if (p && p.status === 'pendente') { await S().update('bolsas_pagamentos', id, { status: 'aprovado', aprovado_por: me().nome, aprovado_em: u().today() }); n++; } }
      await audit('aprovar', 'bolsas_pagamentos', ids.join(','), `${n} bolsa(s) aprovada(s)`); return n;
    },
    // Marca como pago; com conta escolhida, cria a despesa paga no financeiro (uma por pessoa)
    async pagar(ids, { data, conta_id, rubrica }) {
      need('bolsas.gerir');
      if (conta_id) need('financeiro.lancar');
      let n = 0;
      for (const id of ids) {
        const p = await S().get('bolsas_pagamentos', id);
        if (!p || p.status !== 'aprovado') continue;
        const liquido = R2(p.valor - (p.desconto || 0));
        let lancamento_id = '';
        if (conta_id && liquido > 0) {
          const l = await ICM.api.financeiro.salvar({ tipo: 'despesa', status: 'pago', data: data || u().today(), vencimento: data || u().today(), descricao: `${TIPOS[p.tipo] ? TIPOS[p.tipo].nome : 'Bolsa'} — ${p.nome} — ${u().fmtMonth(p.ym)}`, valor: liquido, rubrica: rubrica || 'outras', projeto_id: p.projeto_id || '', conta_id, documento: 'Recibo de bolsa', bolsa_pagamento_id: p.id });
          lancamento_id = l.id;
        }
        await S().update('bolsas_pagamentos', id, { status: 'pago', pago_em: data || u().today(), valor_pago: liquido, lancamento_id, pago_por: me().nome });
        n++;
      }
      await audit('pagar', 'bolsas_pagamentos', ids.join(','), `${n} bolsa(s) paga(s)${conta_id ? ' e lançada(s) no financeiro' : ''}`);
      return n;
    }
  };

  Object.assign(ICM.api, { bolsas });
})();
