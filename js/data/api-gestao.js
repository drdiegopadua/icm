/* Regras de negócio: estoque de consumo, equipe (RH), avisos por WhatsApp, Portal da Família,
   assinatura digital de termos, governança e importação de planilhas. */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const H = () => ICM.api._h;
  const need = p => H().need(p);
  const audit = (...a) => H().audit(...a);
  const me = () => H().me();
  const can = p => ICM.auth.can(p);

  async function seq(col, prefixo, campo) {
    const all = await S().list(col);
    const n = all.reduce((m, x) => Math.max(m, Number(((x[campo] || '').match(/(\d+)$/) || [0, 0])[1])), 0) + 1;
    return `${prefixo}${String(n).padStart(4, '0')}`;
  }
  const diasAte = d => d ? Math.round((u().parseD(d) - u().parseD(u().today())) / 864e5) : null;

  // ======================= ESTOQUE =======================
  function saldoDe(itemId, movs) {
    let q = 0, valor = 0, qEnt = 0;
    movs.filter(m => m.item_id === itemId).sort((a, b) => a.data.localeCompare(b.data)).forEach(m => {
      if (m.tipo === 'entrada') { q += m.quantidade; qEnt += m.quantidade; valor += m.quantidade * (Number(m.valor_unitario) || 0); }
      else if (m.tipo === 'saida') q -= m.quantidade;
      else if (m.tipo === 'ajuste') q += m.quantidade;
    });
    return { saldo: q, custo_medio: qEnt ? valor / qEnt : 0 };
  }
  const estoque = {
    async itens({ categoria, q } = {}) {
      need('estoque.ver');
      const movs = await S().list('estoque_mov');
      let l = await S().list('estoque_itens', i => i.ativo !== false);
      if (categoria) l = l.filter(i => i.categoria === categoria);
      if (q) { const s = q.toLowerCase(); l = l.filter(i => `${i.nome} ${i.variacao} ${i.codigo}`.toLowerCase().includes(s)); }
      return l.map(i => { const s = saldoDe(i.id, movs); return { ...i, ...s, abaixo: s.saldo <= (i.estoque_minimo || 0) }; })
        .sort((a, b) => a.nome.localeCompare(b.nome) || (a.variacao || '').localeCompare(b.variacao || ''));
    },
    async item(id) {
      need('estoque.ver');
      const i = await S().get('estoque_itens', id); const movs = await S().list('estoque_mov', m => m.item_id === id);
      let run = 0;
      const kardex = movs.sort((a, b) => a.data.localeCompare(b.data) || (a.criado_em || '').localeCompare(b.criado_em || '')).map(m => { run += m.tipo === 'saida' ? -m.quantidade : m.quantidade; return { ...m, saldo_apos: run }; });
      return { ...i, ...saldoDe(id, movs), kardex: kardex.reverse() };
    },
    async salvarItem(i) {
      need('estoque.editar');
      if (!i.nome) throw new Error('Informe o nome do item.');
      const x = i.id ? await S().update('estoque_itens', i.id, i) : await S().insert('estoque_itens', { ativo: true, estoque_minimo: 0, ...i, codigo: await seq('estoque_itens', 'EST-', 'codigo') });
      await audit(i.id ? 'editar' : 'criar', 'estoque', x.id, `${x.codigo} — ${x.nome} ${x.variacao || ''}`); return x;
    },
    async movimentar(m) {
      need('estoque.movimentar');
      m = { ...m, quantidade: Number(m.quantidade) };
      if (!m.item_id) throw new Error('Selecione o item.');
      if (!m.data) throw new Error('Informe a data.');
      if (m.tipo !== 'ajuste' && !(m.quantidade > 0)) throw new Error('Quantidade deve ser maior que zero.');
      const atual = (await estoque.item(m.item_id)).saldo;
      if (m.tipo === 'saida' && m.quantidade > atual) throw new Error(`Saldo insuficiente: há ${atual} em estoque.`);
      if (m.tipo === 'ajuste' && !m.obs) throw new Error('Explique o motivo do ajuste (inventário, perda, vencimento…).');
      const x = await S().insert('estoque_mov', { ...m, usuario: me().nome });
      const it = await S().get('estoque_itens', m.item_id);
      await audit(m.tipo, 'estoque', x.id, `${m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '-' : '±'}${m.quantidade} ${it.unidade} ${it.nome} ${it.variacao || ''}`);
      return x;
    },
    async movimentos({ de, ate, tipo, projeto_id, aluno_id } = {}) {
      need('estoque.ver');
      const itens = await S().list('estoque_itens');
      return (await S().list('estoque_mov', m => (!de || m.data >= de) && (!ate || m.data <= ate) && (!tipo || m.tipo === tipo) && (!projeto_id || m.projeto_id === projeto_id) && (!aluno_id || m.aluno_id === aluno_id)))
        .map(m => ({ ...m, item: itens.find(i => i.id === m.item_id) || { nome: '?' } }))
        .sort((a, b) => b.data.localeCompare(a.data));
    }
  };

  // ======================= EQUIPE (RH) =======================
  function alertasPessoa(p) {
    const out = [];
    const c = p.contrato || {};
    const dc = diasAte(c.fim);
    if (p.status === 'ativo' && c.fim) { if (dc < 0) out.push({ nivel: 'danger', txt: `Contrato vencido há ${-dc} dia(s)` }); else if (dc <= 30) out.push({ nivel: 'warn', txt: `Contrato vence em ${dc} dia(s)` }); }
    (p.documentos || []).forEach(d => { if (!d.validade) return; const n = diasAte(d.validade); const nome = (ICM.C.DOCS_EQUIPE[d.tipo] || { nome: d.tipo }).nome; if (n < 0) out.push({ nivel: 'danger', txt: `${nome} vencido(a)` }); else if (n <= 30) out.push({ nivel: 'warn', txt: `${nome} vence em ${n} dia(s)` }); });
    if (p.status === 'ativo' && !(p.documentos || []).some(d => d.tipo === 'antecedentes')) out.push({ nivel: 'danger', txt: 'Sem certidão de antecedentes criminais (obrigatória para trabalhar com crianças)' });
    return out;
  }
  // Remuneração e conta bancária: só a direção vê
  const semSalario = p => can('equipe.salarios') ? p : { ...p, contrato: { ...(p.contrato || {}), remuneracao: null }, banco: null, _bancoRestrito: true };
  const equipe = {
    alertasPessoa,
    async list() {
      need('equipe.gerir');
      return (await S().list('equipe')).map(p => ({ ...semSalario(p), alertas: alertasPessoa(p), horas_capacitacao: (p.capacitacoes || []).reduce((s, c) => s + Number(c.carga || 0), 0) })).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async get(id) { need('equipe.gerir'); const p = await S().get('equipe', id); return p ? { ...semSalario(p), alertas: alertasPessoa(p) } : null; },
    async save(p) {
      need('equipe.gerir');
      if (!p.nome || !p.cargo) throw new Error('Informe nome e cargo.');
      if (p.cpf && !u().cpfValido(p.cpf)) throw new Error('CPF inválido.');
      p = { ...p }; delete p.alertas; delete p.horas_capacitacao;
      delete p._bancoRestrito;
      if (p.id && !can('equipe.salarios')) { const old = await S().get('equipe', p.id); p.contrato = { ...(p.contrato || {}), remuneracao: old.contrato ? old.contrato.remuneracao : null }; p.banco = old.banco || null; }
      if (p.banco && p.banco.cpf_titular && !u().cpfValido(p.banco.cpf_titular) && String(p.banco.cpf_titular).replace(/\D/g, '').length === 11) throw new Error('CPF do titular da conta inválido.');
      const x = p.id ? await S().update('equipe', p.id, p) : await S().insert('equipe', { status: 'ativo', documentos: [], capacitacoes: [], escala: [], projeto_ids: [], ...p });
      await audit(p.id ? 'editar' : 'criar', 'equipe', x.id, `Equipe: ${x.nome} (${x.cargo})`); return x;
    },
    // Escala da semana: turnos cadastrados + aulas das turmas do professor vinculado
    async escalaSemana() {
      need('equipe.gerir');
      const pessoas = (await S().list('equipe', p => p.status === 'ativo'));
      const turmas = await S().list('turmas', t => t.status !== 'encerrada');
      const out = [];
      pessoas.forEach(p => {
        (p.escala || []).forEach(e => out.push({ pessoa: p.nome, cargo: p.cargo, dia: Number(e.dia), inicio: e.inicio, fim: e.fim, local: e.local, atividade: e.atividade, origem: 'escala' }));
        if (p.usuario_id) turmas.filter(t => t.professor_id === p.usuario_id).forEach(t => (t.dias || []).forEach(d => out.push({ pessoa: p.nome, cargo: p.cargo, dia: d, inicio: t.inicio, fim: t.fim, local: t.local, atividade: `Aula — ${t.nome}`, origem: 'turma' })));
      });
      return out.sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio));
    },
    async alertasGerais() { if (!can('equipe.gerir')) return []; return (await S().list('equipe', p => p.status === 'ativo')).flatMap(p => alertasPessoa(p).map(a => ({ ...a, pessoa: p.nome, id: p.id }))); }
  };

  // ======================= ARQUIVOS ANEXOS =======================
  // Protótipo: guardados no navegador (limite ~2 MB por arquivo). Na fase Supabase vão para bucket PRIVADO com link temporário.
  const TIPOS_OK = /^(application\/pdf|image\/(jpeg|png|webp))$/;
  const arquivos = {
    async salvar(file, dono) {
      need('equipe.gerir');
      if (!file) throw new Error('Selecione um arquivo.');
      if (!TIPOS_OK.test(file.type)) throw new Error('Envie PDF, JPG, PNG ou WEBP.');
      let data;
      if (file.type.startsWith('image/')) data = await u().compressImage(file, 1600, .82);
      else {
        if (file.size > 2 * 1024 * 1024) throw new Error('PDF acima de 2 MB. Reduza o arquivo (ex.: ilovepdf.com/pt/comprimir_pdf) ou fotografe o documento.');
        data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
      }
      const x = await S().insert('arquivos', { nome: file.name, mime: file.type.startsWith('image/') ? 'image/jpeg' : file.type, tamanho: Math.round(data.length * 0.75), data, dono, enviado_por: me().nome });
      await audit('anexar', dono.col, dono.id, `Arquivo anexado: ${file.name}`);
      return { id: x.id, nome: x.nome, mime: x.mime, tamanho: x.tamanho };
    },
    async get(id) { need('equipe.gerir'); const x = await S().get('arquivos', id); if (x) await audit('visualizar_arquivo', x.dono.col, x.dono.id, `Arquivo aberto: ${x.nome}`); return x; },
    async remove(id) { need('equipe.gerir'); await S().remove('arquivos', id); }
  };

  // ======================= AVISOS (WhatsApp) =======================
  function foneWA(t) { let d = String(t || '').replace(/\D/g, ''); if (!d) return ''; if (d.length <= 11) d = '55' + d; return d; }
  function linkWA(tel, texto) {
    const n = foneWA(tel); const tx = encodeURIComponent(texto || '');
    const mobile = matchMedia('(pointer: coarse)').matches;
    return mobile ? `https://wa.me/${n}?text=${tx}` : `https://web.whatsapp.com/send?phone=${n}&text=${tx}`;
  }
  function preencher(modelo, d) { return String(modelo || '').replace(/\{(\w+)\}/g, (_, k) => d[k] != null ? String(d[k]) : ''); }
  async function modelos() { const c = await S().getConfig(); return { ...ICM.C.MODELOS_WHATSAPP, ...((c && c.whatsapp) || {}) }; }
  const primeiroNome = n => String(n || '').split(' ')[0];
  const linkApp = h => `${location.origin}${location.pathname}#${h}`;

  const avisos = {
    foneWA, linkWA, preencher, modelos,
    async salvarModelos(m) { need('avisos.modelos'); const c = await S().getConfig(); await S().setConfig({ whatsapp: { ...((c && c.whatsapp) || {}), ...m } }); await audit('editar', 'config', 'whatsapp', 'Modelos de mensagem do WhatsApp'); },
    async log() { return (await S().list('avisos_log')).sort((a, b) => b.em.localeCompare(a.em)); },
    async registrar(item) {
      need('avisos.enviar');
      const x = await S().insert('avisos_log', { key: item.key, tipo: item.tipo, aluno_id: item.aluno_id || '', destinatario: item.responsavel, telefone: item.telefone, texto: item.texto, enviado_por: me().nome, em: new Date().toISOString() });
      await audit('whatsapp', 'avisos', item.key, `${item.tipo} → ${item.responsavel} (${item.telefone})`); return x;
    },
    // Monta um aviso pronto para um aluno (usado nos botões espalhados pelo sistema)
    async montar(tipo, aluno, extra = {}) {
      const M = await modelos();
      const r = aluno.responsavel || {};
      const d = { org: ICM.C.ORG.nome, responsavel: primeiroNome(r.nome) || 'responsável', aluno: primeiroNome(aluno.nome), matricula: aluno.matricula, ...extra };
      return { tipo, aluno_id: aluno.id, aluno: aluno.nome, responsavel: r.nome || '', telefone: r.telefone || '', texto: preencher(M[tipo], d), key: extra.key || `${tipo}:${aluno.id}:${u().today()}` };
    },
    async pendentes() {
      need('avisos.enviar');
      const out = []; const M = await modelos(); const hoje = u().today(); const ym = hoje.slice(0, 7);
      const alunos = await S().list('alunos'); const al = id => alunos.find(a => a.id === id) || {};
      const enviados = await S().list('avisos_log');
      const push = (tipo, aluno, d, key, contexto, data) => { const r = aluno.responsavel || {}; out.push({ tipo, key, aluno_id: aluno.id, aluno: aluno.nome, responsavel: r.nome || '', telefone: r.telefone || '', texto: preencher(M[tipo], { org: ICM.C.ORG.nome, responsavel: primeiroNome(r.nome), aluno: primeiroNome(aluno.nome), ...d }), contexto, data: data || hoje, enviado: enviados.filter(e => e.key === key).sort((a, b) => b.em.localeCompare(a.em))[0] || null }); };
      // Faltas (regra 2 / 3)
      (await ICM.api.assiduidade.alertas(ym)).forEach(a => push(a.nivel === 'danger' ? 'falta_desligamento' : 'falta_alerta', al(a.aluno_id), { faltas: a.F, mes: u().MESES[+ym.slice(5) - 1], turma: a.turma }, `falta:${a.aluno_id}:${a.turma_id}:${ym}:${a.nivel}`, `${a.F} faltas em ${a.turma}`));
      // Reuniões dos próximos 15 dias
      for (const r of (await S().list('reunioes', x => x.data >= hoje && x.data <= u().addDays(hoje, 15)))) {
        (await ICM.api.reunioes.convidados(r)).forEach(c => push('reuniao', al(c.id), { titulo: r.titulo, data: u().fmtDate(r.data), hora: r.horario || '', local: r.local || '' }, `reuniao:${r.id}:${c.id}`, r.titulo, r.data));
      }
      // Eventos dos próximos 30 dias
      const vis = await H().alunosVisiveisIds();
      (await S().list('eventos', e => e.data >= hoje && e.data <= u().addDays(hoje, 30))).forEach(e => (e.alunos || []).filter(id => !vis || vis.has(id)).forEach(id => push('evento', al(id), { titulo: e.titulo, data: u().fmtDate(e.data), hora: e.horario || '', local: e.local || '' }, `evento:${e.id}:${id}`, e.titulo, e.data)));
      // Mensalidades vencidas
      if (can('associados.gerir')) {
        const ass = await S().list('associados');
        (await S().list('mensalidades', m => m.status === 'aberta' && m.vencimento < hoje)).forEach(m => {
          const a = ass.find(x => x.id === m.associado_id) || {}; const aluno = al(a.aluno_id);
          const fake = { id: aluno.id || a.id, nome: aluno.nome || a.titular, responsavel: { nome: a.titular, telefone: a.telefone } };
          push('mensalidade', fake, { competencia: u().fmtMonth(m.competencia), valor: u().money(m.valor), vencimento: u().fmtDate(m.vencimento) }, `mens:${m.id}`, `${a.numero} — ${u().fmtMonth(m.competencia)}`, m.vencimento);
        });
      }
      // Assinaturas pendentes (um aviso por aluno)
      if (can('assinaturas.solicitar')) {
        const pend = await S().list('assinaturas', x => x.status === 'pendente');
        [...new Set(pend.map(p => p.aluno_id))].forEach(aid => push('assinatura', al(aid), { link: linkApp('/portal') }, `assin:${aid}:${pend.filter(p => p.aluno_id === aid).length}`, `${pend.filter(p => p.aluno_id === aid).length} documento(s) para assinar`));
      }
      return out;
    }
  };

  // ======================= PORTAL DA FAMÍLIA =======================
  const FKEY = 'icm_familia', FLOCK = 'icm_lock_fam';
  function sessaoFamilia() { try { const s = JSON.parse(sessionStorage.getItem(FKEY) || 'null'); if (!s || Date.now() > s.exp) { sessionStorage.removeItem(FKEY); return null; } return s; } catch (e) { return null; } }
  const portal = {
    link: () => linkApp('/portal'),
    sessao: sessaoFamilia,
    async login(matricula, codigo) {
      let lock = {}; try { lock = JSON.parse(localStorage.getItem(FLOCK) || '{}'); } catch (e) { /* */ }
      if (lock.ate && Date.now() < lock.ate) throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      await u().sleep(500);
      const a = (await S().list('alunos')).find(x => x.matricula.toUpperCase() === String(matricula || '').trim().toUpperCase());
      const ok = a && a.acesso_familia && a.acesso_familia.codigo === String(codigo || '').trim().toUpperCase() && a.status !== 'desligado';
      if (!ok) { const n = (lock.n || 0) + 1; try { localStorage.setItem(FLOCK, JSON.stringify(n >= 5 ? { n: 0, ate: Date.now() + 5 * 60000 } : { n })); } catch (e) { /* */ } throw new Error('Matrícula ou código inválidos.'); }
      try { localStorage.removeItem(FLOCK); } catch (e) { /* */ }
      sessionStorage.setItem(FKEY, JSON.stringify({ aluno_id: a.id, exp: Date.now() + 30 * 60000 }));
      await S().insert('auditoria', { em: new Date().toISOString(), usuario_id: 'familia', usuario_nome: `Família de ${a.nome}`, acao: 'login_portal', entidade: 'alunos', entidade_id: a.id, resumo: 'Acesso ao Portal da Família' });
      return a;
    },
    sair() { sessionStorage.removeItem(FKEY); },
    async gerarCodigo(alunoId) {
      need('alunos.editar');
      const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint8Array(8); crypto.getRandomValues(b);
      const c = Array.from(b, x => a[x % a.length]).join(''); const codigo = c.slice(0, 4) + '-' + c.slice(4);
      const al = await S().get('alunos', alunoId);
      await S().update('alunos', alunoId, { acesso_familia: { codigo, gerado_em: u().today() } });
      await audit('editar', 'alunos', alunoId, `Novo código do Portal da Família — ${al.nome}`); return codigo;
    },
    async codigo(alunoId) { need('alunos.editar'); const a = await S().get('alunos', alunoId); return a.acesso_familia || null; },
    // Tudo o que a família vê — somente do próprio filho(a)
    async dados() {
      const s = sessaoFamilia(); if (!s) throw new Error('Sessão expirada. Entre novamente.');
      const a = await S().get('alunos', s.aluno_id); const hoje = u().today(); const ym = hoje.slice(0, 7);
      const mats = await S().list('matriculas', m => m.aluno_id === a.id && m.status === 'ativo');
      const turmas = await S().list('turmas'); const users = await S().list('usuarios'); const projetos = await S().list('projetos');
      const cfg = (await S().getConfig()).assiduidade;
      const minhas = mats.map(m => { const t = turmas.find(x => x.id === m.turma_id) || {}; return { ...t, professor: (users.find(x => x.id === t.professor_id) || {}).nome, projeto: (projetos.find(p => p.id === t.projeto_id) || {}).nome }; });
      const tids = minhas.map(t => t.id); const pids = minhas.map(t => t.projeto_id);
      const aulas = await S().list('aulas', x => tids.includes(x.turma_id));
      const freq = minhas.map(t => { const l = aulas.filter(x => x.turma_id === t.id && x.status === 'realizada' && x.presencas && x.presencas[a.id]); const c = { P: 0, F: 0, J: 0 }; l.forEach(x => c[x.presencas[a.id]]++); const fm = l.filter(x => x.data.startsWith(ym) && x.presencas[a.id] === 'F').length; return { turma: t.nome, ...c, total: l.length, freq: l.length ? Math.round((c.P + c.J) / l.length * 100) : null, faltas_mes: fm, nivel: fm >= cfg.desligamento ? 'danger' : fm >= cfg.alerta ? 'warn' : 'ok', ultimas: l.sort((x, y) => y.data.localeCompare(x.data)).slice(0, 8).map(x => ({ data: x.data, v: x.presencas[a.id], tema: x.plano && x.plano.tema })) }; });
      const agenda = [];
      aulas.filter(x => x.data >= hoje && x.data <= u().addDays(hoje, 21) && x.status !== 'cancelada').forEach(x => { const t = minhas.find(y => y.id === x.turma_id); agenda.push({ data: x.data, hora: `${x.inicio}–${x.fim}`, titulo: t.nome, tipo: 'Aula', local: t.local }); });
      (await S().list('eventos', e => e.data >= hoje && (e.alunos || []).includes(a.id))).forEach(e => agenda.push({ data: e.data, hora: e.horario, titulo: e.titulo, tipo: ICM.C.TIPOS_EVENTO[e.tipo].nome, local: e.local }));
      for (const r of await S().list('reunioes', x => x.data >= hoje)) { const conv = await ICM.api.reunioes.convidados(r).catch(() => []); if (!r.projeto_id && !r.turma_id || conv.some(c => c.id === a.id) || pids.includes(r.projeto_id) || tids.includes(r.turma_id)) agenda.push({ data: r.data, hora: r.horario, titulo: r.titulo, tipo: 'Reunião de pais', local: r.local }); }
      agenda.sort((x, y) => x.data.localeCompare(y.data) || String(x.hora).localeCompare(String(y.hora)));
      const comunicados = (await S().list('comunicados', c => c.publico === 'todos' || (c.publico === 'projeto' && pids.includes(c.projeto_id)) || (c.publico === 'turma' && tids.includes(c.turma_id)))).sort((x, y) => y.data.localeCompare(x.data));
      const certificados = (await S().list('certificados', c => c.destinatario_id === a.id && c.status === 'valido'));
      const assinaturas = (await S().list('assinaturas', x => x.aluno_id === a.id)).sort((x, y) => (x.status === 'pendente' ? -1 : 1));
      const itens = await S().list('patrimonio');
      const emprestimos = (await S().list('emprestimos', e => e.aluno_id === a.id && e.status === 'ativo')).map(e => ({ ...e, item: (itens.find(i => i.id === e.item_id) || {}).nome }));
      const assoc = (await S().list('associados', x => x.aluno_id === a.id && x.status !== 'desligado'))[0];
      const mensalidades = assoc ? (await S().list('mensalidades', m => m.associado_id === assoc.id)).sort((x, y) => y.competencia.localeCompare(x.competencia)).slice(0, 6) : [];
      return { aluno: { id: a.id, nome: a.nome, matricula: a.matricula, foto: a.foto, nascimento: a.nascimento, responsavel: (a.responsavel || {}).nome }, turmas: minhas, freq, agenda, comunicados, certificados, assinaturas, emprestimos, associado: assoc ? { numero: assoc.numero, valor: assoc.valor_mensal } : null, mensalidades };
    }
  };
  const comunicados = {
    async list() { return (await S().list('comunicados')).sort((a, b) => b.data.localeCompare(a.data)); },
    async save(c) { need('reunioes.gerir'); if (!c.titulo || !c.texto) throw new Error('Informe título e texto.'); const x = c.id ? await S().update('comunicados', c.id, c) : await S().insert('comunicados', { data: u().today(), autor: me().nome, ...c }); await audit('publicar', 'comunicados', x.id, x.titulo); return x; },
    async remove(id) { need('reunioes.gerir'); await S().remove('comunicados', id); }
  };

  // ======================= ASSINATURA DIGITAL =======================
  function textoDocumento(tipo, a, ref) {
    const r = a.responsavel || {}; const en = a.endereco || {}; const org = ICM.C.ORG;
    const cab = `<p><b>Aluno(a):</b> ${u().esc(a.nome)} — matrícula ${u().esc(a.matricula)}, nascido(a) em ${u().esc(u().fmtDate(a.nascimento))}.<br><b>Responsável legal:</b> ${u().esc(r.nome || '')} (${u().esc(r.parentesco || '')}).</p>`;
    if (tipo === 'matricula') return cab + `<p>Declaro, como responsável legal, que as informações prestadas na ficha de matrícula do(a) aluno(a) acima no ${u().esc(org.razao)} são verdadeiras, incluindo endereço (${u().esc([en.logradouro, en.numero, en.bairro].filter(Boolean).join(', '))}), dados escolares, de saúde e socioeconômicos.</p><p>Comprometo-me a: (1) manter os dados atualizados; (2) zelar pela frequência do(a) aluno(a), ciente de que <b>2 faltas no mês geram alerta e 3 faltas podem levar ao desligamento</b> com liberação da vaga; (3) comunicar problemas de saúde, alergias e uso de medicamentos; (4) respeitar as normas de convivência do Instituto.</p>`;
    if (tipo === 'lgpd') return cab + `<p>Nos termos da Lei nº 13.709/2018 (LGPD), especialmente os arts. 11 e 14, <b>autorizo</b> o ${u().esc(org.razao)}, CNPJ ${u().esc(org.cnpj)}, a tratar os dados pessoais do(a) aluno(a) e do responsável, <b>inclusive dados sensíveis</b> (saúde, cor/raça, situação socioeconômica), com as finalidades de: matrícula e acompanhamento pedagógico e social; registro de frequência; segurança e atendimento em emergências; elaboração de relatórios e prestação de contas a financiadores e órgãos públicos (de forma anonimizada sempre que possível).</p><p>Fui informado(a) de que: os dados ficam em sistema com acesso restrito por perfil e registro de auditoria; não são vendidos nem compartilhados para fins comerciais; posso solicitar a qualquer momento acesso, correção, portabilidade ou eliminação dos dados, e revogar este consentimento, pelo canal da secretaria.</p>`;
    if (tipo === 'imagem') return cab + `<p><b>Autorizo</b>, de forma gratuita, o uso da imagem e da voz do(a) aluno(a) acima, captadas em aulas, eventos e apresentações do ${u().esc(org.razao)}, para fins <b>institucionais e não comerciais</b>: relatórios de prestação de contas, site, redes sociais, materiais de divulgação e reportagens sobre os projetos.</p><p>A instituição se compromete a não usar as imagens de forma que exponha o(a) aluno(a) a situação vexatória (ECA, art. 17) e a não identificar dados pessoais nas publicações. Esta autorização vale enquanto o(a) aluno(a) participar dos projetos e pode ser revogada a qualquer tempo.</p>`;
    if (tipo === 'emprestimo') return cab + `<p>Declaro ter recebido, em regime de <b>comodato gratuito</b>, o bem descrito no Termo de Empréstimo nº ${u().esc((ref && ref.numero) || '')} (${u().esc((ref && ref.item) || '')}), comprometendo-me a zelar por sua guarda e conservação, utilizá-lo apenas para as atividades do projeto, devolvê-lo na data prevista ou quando solicitado, e comunicar dano, perda ou furto em até 48 horas.</p>`;
    return cab;
  }
  const assinaturas = {
    textoDocumento,
    linkAssinar: token => linkApp(`/assinar/${token}`),
    async list({ aluno_id, status } = {}) {
      const l = await S().list('assinaturas', x => (!aluno_id || x.aluno_id === aluno_id) && (!status || x.status === status));
      const al = await S().list('alunos');
      return l.map(x => ({ ...x, aluno_nome: (al.find(a => a.id === x.aluno_id) || {}).nome })).sort((a, b) => (b.assinado_em || b.solicitado_em || '').localeCompare(a.assinado_em || a.solicitado_em || ''));
    },
    async solicitar(aluno_id, tipos, referencia_id) {
      need('assinaturas.solicitar');
      const ja = await S().list('assinaturas', x => x.aluno_id === aluno_id && x.status === 'pendente');
      const out = [];
      for (const t of tipos) {
        const ex = ja.find(x => x.tipo === t && (x.referencia_id || '') === (referencia_id || ''));
        if (ex) { out.push(ex); continue; }
        const b = new Uint8Array(12); crypto.getRandomValues(b);
        out.push(await S().insert('assinaturas', { token: Array.from(b, x => x.toString(16).padStart(2, '0')).join(''), tipo: t, aluno_id, referencia_id: referencia_id || '', status: 'pendente', solicitado_em: u().today(), criado_por: me().id }));
      }
      const a = await S().get('alunos', aluno_id);
      await audit('solicitar_assinatura', 'assinaturas', aluno_id, `${tipos.map(t => ICM.C.DOCS_ASSINATURA[t]).join(', ')} — ${a.nome}`);
      return out;
    },
    // Público (link enviado ao responsável)
    async porToken(token) {
      const x = (await S().list('assinaturas')).find(s => s.token === token);
      if (!x) return null;
      const a = await S().get('alunos', x.aluno_id);
      let ref = null;
      if (x.tipo === 'emprestimo' && x.referencia_id) { const e = await S().get('emprestimos', x.referencia_id); const it = e ? await S().get('patrimonio', e.item_id) : null; ref = { numero: e && e.numero, item: it ? `${e.quantidade}x ${it.nome} (${it.tombo})` : '' }; }
      const html = textoDocumento(x.tipo, a, ref);
      return { ...x, aluno: { nome: a.nome, matricula: a.matricula, responsavel: (a.responsavel || {}).nome }, html, titulo: ICM.C.DOCS_ASSINATURA[x.tipo] };
    },
    async assinar(token, { nome, cpf, imagem }) {
      const d = await assinaturas.porToken(token);
      if (!d) throw new Error('Link inválido.');
      if (d.status !== 'pendente') throw new Error('Este documento já foi respondido.');
      if (!nome || nome.trim().split(/\s+/).length < 2) throw new Error('Digite seu nome completo.');
      if (!u().cpfValido(cpf)) throw new Error('CPF inválido.');
      if (!imagem) throw new Error('Faça sua assinatura no quadro.');
      const hash = await u().sha256(d.html);
      await S().update('assinaturas', d.id, { status: 'assinado', assinado_em: new Date().toISOString(), signatario_nome: nome.trim(), signatario_cpf: String(cpf).replace(/\D/g, ''), assinatura_img: imagem, doc_hash: hash, doc_html: d.html, user_agent: navigator.userAgent.slice(0, 200) });
      const a = await S().get('alunos', d.aluno_id); const aut = { ...(a.autorizacoes || {}) };
      if (d.tipo === 'lgpd') { aut.lgpd = true; aut.data_termo = u().today(); }
      if (d.tipo === 'imagem') { aut.imagem = true; aut.data_termo = aut.data_termo || u().today(); }
      if (d.tipo === 'matricula') aut.matricula_assinada = u().today();
      await S().update('alunos', a.id, { autorizacoes: aut });
      if (d.tipo === 'emprestimo' && d.referencia_id) await S().update('emprestimos', d.referencia_id, { termo_assinado: true });
      await S().insert('auditoria', { em: new Date().toISOString(), usuario_id: 'familia', usuario_nome: nome.trim(), acao: 'assinar', entidade: 'assinaturas', entidade_id: d.id, resumo: `${d.titulo} — ${a.nome} (hash ${hash.slice(0, 12)}…)` });
      return hash;
    },
    async recusar(token, motivo) {
      const d = await assinaturas.porToken(token);
      if (!d || d.status !== 'pendente') throw new Error('Documento indisponível.');
      await S().update('assinaturas', d.id, { status: 'recusado', recusado_em: new Date().toISOString(), motivo_recusa: motivo || '' });
      if (d.tipo === 'imagem') { const a = await S().get('alunos', d.aluno_id); await S().update('alunos', a.id, { autorizacoes: { ...(a.autorizacoes || {}), imagem: false } }); }
      await S().insert('auditoria', { em: new Date().toISOString(), usuario_id: 'familia', usuario_nome: 'Responsável', acao: 'recusar', entidade: 'assinaturas', entidade_id: d.id, resumo: `${d.titulo} recusado` });
    },
    async cancelar(id) { need('assinaturas.solicitar'); await S().update('assinaturas', id, { status: 'cancelado' }); }
  };

  // ======================= GOVERNANÇA =======================
  const statusMandato = m => { const n = diasAte(m.fim); return n < 0 ? 'encerrado' : n <= 90 ? 'a_vencer' : 'vigente'; };
  const governanca = {
    statusMandato,
    async atas() { need('governanca.ver'); return (await S().list('atas')).sort((a, b) => b.data.localeCompare(a.data)); },
    async salvarAta(a) { need('governanca.gerir'); if (!a.tipo || !a.data) throw new Error('Informe tipo e data.'); const x = a.id ? await S().update('atas', a.id, a) : await S().insert('atas', a); await audit(a.id ? 'editar' : 'criar', 'atas', x.id, `${ICM.C.TIPOS_ATA[x.tipo]} ${x.numero || ''}`); return x; },
    async removerAta(id) { need('governanca.gerir'); await S().remove('atas', id); await audit('excluir', 'atas', id, 'Ata excluída'); },
    async mandatos() { need('governanca.ver'); return (await S().list('mandatos')).map(m => ({ ...m, status: statusMandato(m), dias: diasAte(m.fim) })).sort((a, b) => a.orgao.localeCompare(b.orgao) || b.inicio.localeCompare(a.inicio)); },
    async salvarMandato(m) { need('governanca.gerir'); if (!m.nome || !m.cargo || !m.inicio || !m.fim) throw new Error('Preencha nome, cargo e período.'); const x = m.id ? await S().update('mandatos', m.id, m) : await S().insert('mandatos', m); await audit(m.id ? 'editar' : 'criar', 'mandatos', x.id, `${x.cargo}: ${x.nome}`); return x; },
    async removerMandato(id) { need('governanca.gerir'); await S().remove('mandatos', id); },
    async estatuto() { need('governanca.ver'); return (await S().list('estatuto')).sort((a, b) => b.data_aprovacao.localeCompare(a.data_aprovacao)); },
    async salvarEstatuto(e) { need('governanca.gerir'); if (!e.versao || !e.data_aprovacao) throw new Error('Informe versão e data de aprovação.'); const x = e.id ? await S().update('estatuto', e.id, e) : await S().insert('estatuto', e); await audit(e.id ? 'editar' : 'criar', 'estatuto', x.id, x.versao); return x; },
    async livro() { need('governanca.ver'); const as = await S().list('associados'); const al = await S().list('alunos'); return as.map(a => ({ ...a, aluno_nome: (al.find(x => x.id === a.aluno_id) || {}).nome || '' })).sort((a, b) => a.numero.localeCompare(b.numero)); },
    async alertas() { if (!can('governanca.ver')) return []; return (await governanca.mandatos()).filter(m => m.status === 'a_vencer').map(m => ({ nivel: 'warn', txt: `Mandato de ${m.cargo} (${m.nome}) vence em ${m.dias} dia(s)` })); }
  };

  // ======================= IMPORTAÇÃO DE PLANILHAS =======================
  const importar = {
    async executar(tipo, linhas, opts = {}) {
      need('importar.dados');
      const res = { ok: 0, erros: [], duplicados: 0 };
      const turmas = await S().list('turmas');
      for (let i = 0; i < linhas.length; i++) {
        const l = linhas[i];
        try {
          if (tipo === 'alunos') {
            const dup = (await S().list('alunos')).find(a => norm(a.nome) === norm(l.nome) && (!l.nascimento || a.nascimento === l.nascimento));
            if (dup && !opts.duplicar) { res.duplicados++; continue; }
            const { turma, ...dados } = l;
            const al = await ICM.api.alunos.save({ status: 'ativo', autorizacoes: { lgpd: false, imagem: false }, ...dados, social: { ...(dados.social || {}) } });
            if (turma) { const t = turmas.find(x => norm(x.nome) === norm(turma) || norm(x.modalidade) === norm(turma)); if (t) await ICM.api.turmas.incluirAluno(t.id, al.id, al.data_matricula); else res.erros.push({ linha: i + 2, msg: `Turma "${turma}" não encontrada (aluno importado sem turma)` }); }
          } else if (tipo === 'patrimonio') await ICM.api.patrimonio.save({ quantidade: 1, categoria: 'outro', ...l });
          else if (tipo === 'estoque') { const { saldo_inicial, ...it } = l; const x = await estoque.salvarItem({ categoria: 'outro', unidade: 'un', ...it }); if (Number(saldo_inicial) > 0) await estoque.movimentar({ item_id: x.id, tipo: 'entrada', data: u().today(), quantidade: Number(saldo_inicial), valor_unitario: Number(l.valor_unitario) || 0, origem: 'saldo inicial', obs: 'Importação de planilha' }); }
          else if (tipo === 'equipe') await equipe.save({ vinculo: 'clt', ...l, contrato: { inicio: l.admissao, fim: l.contrato_fim || '', carga_semanal: l.carga_semanal || null } });
          else if (tipo === 'doadores') await ICM.api.doadores.save({ tipo: String(l.documento || '').replace(/\D/g, '').length > 11 ? 'PJ' : 'PF', ...l });
          else if (tipo === 'voluntarios') await ICM.api.voluntarios.save(l);
          res.ok++;
        } catch (e) { res.erros.push({ linha: i + 2, msg: e.message }); }
      }
      await audit('importar', tipo, '', `${res.ok} registro(s) importado(s) de planilha (${res.erros.length} erro(s))`);
      return res;
    }
  };
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  Object.assign(ICM.api, { arquivos, estoque, equipe, avisos, portal, comunicados, assinaturas, governanca, importar });
})();
