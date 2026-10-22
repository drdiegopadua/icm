/* Documentos institucionais, aniversariantes, rotina do dia, privacidade (anonimização),
   backup e fila offline do app do professor. */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;
  const H = () => ICM.api._h;
  const need = p => H().need(p);
  const audit = (...a) => H().audit(...a);
  const can = p => ICM.auth.can(p);
  const diasAte = d => d ? Math.round((u().parseD(d) - u().parseD(u().today())) / 864e5) : null;

  // ======================= DOCUMENTOS DA INSTITUIÇÃO =======================
  function statusDoc(d) {
    const n = diasAte(d.validade);
    if (n == null) return { nivel: 'ok', txt: 'Sem vencimento', dias: null };
    if (n < 0) return { nivel: 'danger', txt: `Vencido há ${-n} dia(s)`, dias: n };
    if (n <= 15) return { nivel: 'danger', txt: `Vence em ${n} dia(s)`, dias: n };
    if (n <= 30) return { nivel: 'warn', txt: `Vence em ${n} dia(s)`, dias: n };
    return { nivel: 'ok', txt: `Válido até ${u().fmtDate(d.validade)}`, dias: n };
  }
  const docsInst = {
    statusDoc,
    async list() {
      need('docinst.ver');
      return (await S().list('docs_inst')).map(d => ({ ...d, cfg: ICM.C.DOCS_INST[d.tipo] || ICM.C.DOCS_INST.outro, status: statusDoc(d) }))
        .sort((a, b) => (a.status.dias ?? 99999) - (b.status.dias ?? 99999));
    },
    async save(d) {
      need('docinst.gerir');
      if (!d.tipo) throw new Error('Selecione o tipo de documento.');
      if (d.tipo === 'outro' && !d.nome) throw new Error('Informe o nome do documento.');
      d = { ...d }; delete d.cfg; delete d.status;
      const x = d.id ? await S().update('docs_inst', d.id, d) : await S().insert('docs_inst', d);
      await audit(d.id ? 'editar' : 'criar', 'docs_inst', x.id, `${(ICM.C.DOCS_INST[x.tipo] || {}).nome || x.nome} — validade ${x.validade ? u().fmtDate(x.validade) : 'sem'}`);
      return x;
    },
    async remove(id) { need('docinst.gerir'); const d = await S().get('docs_inst', id); if (d && d.arquivo) await S().remove('arquivos', d.arquivo.id); await S().remove('docs_inst', id); await audit('excluir', 'docs_inst', id, 'Documento institucional removido'); },
    // A instituição pode receber recursos públicos? (todas as certidões exigidas válidas)
    async aptoRepasse() {
      const l = await S().list('docs_inst');
      const exigidos = Object.entries(ICM.C.DOCS_INST).filter(([, v]) => v.repasse).map(([k]) => k);
      const faltando = [], vencidos = [];
      exigidos.forEach(k => {
        const docs = l.filter(d => d.tipo === k).sort((a, b) => (b.validade || '9999').localeCompare(a.validade || '9999'));
        if (!docs.length) faltando.push(ICM.C.DOCS_INST[k].nome);
        else if (docs[0].validade && diasAte(docs[0].validade) < 0) vencidos.push(ICM.C.DOCS_INST[k].nome);
      });
      return { apto: !faltando.length && !vencidos.length, faltando, vencidos };
    }
  };

  // ======================= ANIVERSARIANTES =======================
  async function aniversarios(mes, { soHoje = false } = {}) {
    const hoje = u().today(); const ano = +hoje.slice(0, 4);
    const M = await ICM.api.avisos.modelos();
    const out = [];
    const add = (grupo, o) => {
      if (!o.nasc) return;
      const md = o.nasc.slice(5);
      if (+md.slice(0, 2) !== mes) return;
      const data = `${ano}-${md}`;
      if (soHoje && data !== hoje) return;
      const idade = ano - +o.nasc.slice(0, 4);
      const prim = String(o.nomeMsg || o.nome).split(' ')[0];
      const texto = u().esc ? ICM.api.avisos.preencher(M[o.modelo], { org: ICM.C.ORG.nome, nome: prim, aluno: prim, responsavel: String(o.destinatario || '').split(' ')[0], idade, anos: `${idade} ano${idade > 1 ? 's' : ''}` }) : '';
      out.push({ grupo, id: o.id, nome: o.nome, data, dia: +md.slice(3), idade, hoje: data === hoje, passou: data < hoje, href: o.href, telefone: o.telefone || '', responsavel: o.destinatario || o.nome, aluno: o.nome, tipo: o.modelo, texto, key: `aniv:${grupo}:${o.id}:${ano}`, legenda: o.legenda || '' });
    };
    const vis = await H().alunosVisiveisIds();
    (await S().list('alunos', a => a.status === 'ativo' && (!vis || vis.has(a.id)))).forEach(a => add('Alunos', { id: a.id, nome: a.nome, nasc: a.nascimento, telefone: (a.responsavel || {}).telefone, destinatario: (a.responsavel || {}).nome, modelo: 'aniv_aluno', href: `#/alunos/${a.id}`, legenda: `responsável: ${(a.responsavel || {}).nome || '—'}` }));
    if (can('equipe.gerir')) (await S().list('equipe', p => p.status === 'ativo')).forEach(p => add('Equipe', { id: p.id, nome: p.nome, nasc: p.nascimento, telefone: p.telefone, modelo: 'aniv_equipe', href: `#/equipe/${p.id}`, legenda: p.cargo }));
    (await S().list('voluntarios', v => v.status === 'ativo')).forEach(v => add('Voluntários', { id: v.id, nome: v.nome, nasc: v.nascimento, telefone: v.telefone, modelo: 'aniv_voluntario', href: `#/voluntarios/${v.id}`, legenda: v.area }));
    if (can('associados.gerir')) (await S().list('associados', a => a.status === 'ativo')).forEach(a => add('Associados', { id: a.id, nome: a.titular, nasc: a.nascimento, telefone: a.telefone, modelo: 'aniv_associado', href: `#/associados/${a.id}`, legenda: a.numero }));
    if (can('doadores.gerir')) {
      const doacoes = await S().list('doacoes');
      (await S().list('doadores')).forEach(d => {
        if (d.tipo === 'PF') add('Doadores e patrocinadores', { id: d.id, nome: d.nome, nasc: d.nascimento, telefone: d.telefone, modelo: 'aniv_doador', href: `#/doadores/${d.id}`, legenda: 'Aniversário' });
        const prim = doacoes.filter(x => x.doador_id === d.id).map(x => x.data).sort()[0];
        if (prim && +prim.slice(0, 4) < ano) add('Doadores e patrocinadores', { id: d.id + '_parc', nome: d.nome, nomeMsg: d.contato || d.nome, nasc: prim, telefone: d.telefone, modelo: 'aniv_patrocinador', href: `#/doadores/${d.id}`, legenda: 'Aniversário de parceria' });
      });
    }
    return out.sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
  }

  // ======================= ROTINA DO DIA =======================
  async function rotina() {
    const hoje = u().today(); const amanha = u().addDays(hoje, 1);
    const tentar = async fn => { try { return await fn(); } catch (e) { return null; } };
    const r = {};
    r.aniversarios = await tentar(() => aniversarios(+hoje.slice(5, 7), { soHoje: true })) || [];
    const pend = await tentar(() => ICM.api.avisos.pendentes()) || [];
    r.faltas = pend.filter(x => x.tipo.startsWith('falta') && !x.enviado);
    r.mensalidades = pend.filter(x => x.tipo === 'mensalidade' && !x.enviado);
    r.docsInst = can('docinst.ver') ? (await docsInst.list()).filter(d => d.status.nivel !== 'ok') : [];
    r.apto = can('docinst.ver') ? await docsInst.aptoRepasse() : null;
    r.rh = await tentar(() => ICM.api.equipe.alertasGerais()) || [];
    r.emprestimos = await tentar(() => ICM.api.emprestimos.list({ status: 'atrasado' })) || [];
    r.estoque = (await tentar(() => ICM.api.estoque.itens()) || []).filter(i => i.abaixo);
    r.mandatos = await tentar(() => ICM.api.governanca.alertas()) || [];
    const tids = await H().minhasTurmasIds(); const turmas = await S().list('turmas');
    r.aulasHoje = (await S().list('aulas', a => a.data === hoje && tids.includes(a.turma_id) && a.status !== 'cancelada')).map(a => ({ ...a, turma: (turmas.find(t => t.id === a.turma_id) || {}).nome }));
    r.semRegistro = (await S().list('aulas', a => a.data < hoje && a.status === 'planejada' && tids.includes(a.turma_id))).length;
    r.agenda = [...(await S().list('reunioes', x => x.data === hoje || x.data === amanha)).map(x => ({ tipo: 'Reunião de pais', titulo: x.titulo, data: x.data, hora: x.horario, href: `#/reunioes/${x.id}` })),
      ...(await S().list('eventos', x => x.data === hoje || x.data === amanha)).map(x => ({ tipo: ICM.C.TIPOS_EVENTO[x.tipo].nome, titulo: x.titulo, data: x.data, hora: x.horario, href: `#/eventos/${x.id}` }))];
    r.anonimizar = can('privacidade.gerir') ? (await privacidade.elegiveis()).length : 0;
    r.total = r.aniversarios.length + r.faltas.length + r.mensalidades.length + r.docsInst.length + r.rh.length + r.emprestimos.length + r.estoque.length + r.mandatos.length + (r.semRegistro ? 1 : 0);
    return r;
  }

  // ======================= PRIVACIDADE (LGPD) =======================
  const privacidade = {
    async prazo() { const c = await S().getConfig(); return (c.privacidade && c.privacidade.prazo_anos) || 5; },
    async setPrazo(anos) { need('privacidade.gerir'); if (!(anos >= 1 && anos <= 20)) throw new Error('Prazo entre 1 e 20 anos.'); await S().setConfig({ privacidade: { prazo_anos: Number(anos) } }); await audit('editar', 'config', 'privacidade', `Prazo de guarda: ${anos} anos`); },
    // Ex-alunos (desligados/inativos) cuja última participação passou do prazo de guarda
    async elegiveis() {
      const prazo = await privacidade.prazo(); const limite = u().addDays(u().today(), -Math.round(prazo * 365.25));
      const mats = await S().list('matriculas');
      return (await S().list('alunos', a => ['desligado', 'inativo'].includes(a.status) && !a.anonimizado)).map(a => {
        const ult = [a.data_matricula, ...mats.filter(m => m.aluno_id === a.id).map(m => m.saida || m.entrada)].filter(Boolean).sort().pop();
        return { id: a.id, nome: a.nome, matricula: a.matricula, status: a.status, ultima: ult };
      }).filter(a => a.ultima && a.ultima < limite);
    },
    // Apaga o que identifica a pessoa e mantém só o necessário para estatística e prestação de contas
    async anonimizar(ids) {
      need('privacidade.gerir');
      for (const id of ids) {
        const a = await S().get('alunos', id);
        if (!a || a.anonimizado) continue;
        await S().update('alunos', id, {
          nome: `Ex-aluno ${a.matricula}`, nome_social: '', cpf: '', rg: '', nis: '', telefone: '', email: '', foto: '',
          nascimento: a.nascimento ? `${a.nascimento.slice(0, 4)}-01-01` : '',
          endereco: { bairro: (a.endereco || {}).bairro || '', cidade: (a.endereco || {}).cidade || '' },
          responsavel: {}, social: { cadunico: (a.social || {}).cadunico }, financeiro: {}, saude: {},
          escolaridade: { rede: (a.escolaridade || {}).rede || '' }, autorizacoes: {}, acesso_familia: null,
          anonimizado: true, anonimizado_em: u().today()
        });
        for (const o of await S().list('ocorrencias', x => x.aluno_id === id)) await S().update('ocorrencias', o.id, { descricao: '[anonimizado]' });
        for (const s of await S().list('assinaturas', x => x.aluno_id === id)) await S().update('assinaturas', s.id, { signatario_nome: '[anonimizado]', signatario_cpf: '', assinatura_img: '', doc_html: '' });
      }
      await audit('anonimizar', 'alunos', ids.join(','), `${ids.length} ex-aluno(s) anonimizado(s) (LGPD — prazo de guarda vencido)`);
      return ids.length;
    }
  };

  // ======================= BACKUP =======================
  function carregarScript(src) {
    return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src.endsWith(src))) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.appendChild(s); });
  }
  const NOMES_ABA = { alunos: 'Alunos', matriculas: 'Matrículas em turmas', projetos: 'Projetos', turmas: 'Turmas', aulas: 'Aulas', eventos: 'Eventos', ocorrencias: 'Ocorrências', usuarios: 'Usuários', patrimonio: 'Patrimônio', emprestimos: 'Empréstimos', espera: 'Lista de espera', reunioes: 'Reuniões', voluntarios: 'Voluntários', certificados: 'Certificados', doadores: 'Doadores', doacoes: 'Doações', associados: 'Associados', mensalidades: 'Mensalidades', pesquisas: 'Pesquisas', recursos: 'Espaços e insumos', reservas: 'Reservas', estoque_itens: 'Estoque — itens', estoque_mov: 'Estoque — movimentos', equipe: 'Equipe', comunicados: 'Comunicados', assinaturas: 'Assinaturas', avisos_log: 'WhatsApp enviados', atas: 'Atas', mandatos: 'Mandatos', estatuto: 'Estatuto', docs_inst: 'Docs da instituição', auditoria: 'Auditoria' };
  const backup = {
    async snapshot({ comArquivos = true } = {}) {
      need('backup.exportar');
      const out = { gerado_em: new Date().toISOString(), sistema: 'ICM Sistema', versao: 3, config: await S().getConfig() };
      for (const k of Object.keys(NOMES_ABA).concat(comArquivos ? ['arquivos'] : [])) out[k] = await S().list(k);
      out.usuarios = out.usuarios.map(({ senha_hash, ...x }) => x);
      return out;
    },
    async baixarJSON() {
      const snap = await backup.snapshot();
      const blob = new Blob([JSON.stringify(snap)], { type: 'application/json' });
      baixar(blob, `ICM-backup-completo-${u().today()}.json`);
      await audit('backup', 'sistema', '', 'Backup completo (JSON) baixado');
    },
    async baixarExcel() {
      await carregarScript('js/vendor/xlsx.full.min.js');
      const snap = await backup.snapshot({ comArquivos: false });
      const wb = window.XLSX.utils.book_new();
      Object.entries(NOMES_ABA).forEach(([k, nome]) => {
        const linhas = (snap[k] || []).map(r => achatar(r));
        const ws = window.XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ vazio: '' }]);
        window.XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
      });
      window.XLSX.writeFile(wb, `ICM-backup-${u().today()}.xlsx`);
      await audit('backup', 'sistema', '', 'Backup em Excel baixado');
    },
    async restaurar(file) {
      need('backup.exportar');
      const txt = await file.text(); const snap = JSON.parse(txt);
      if (snap.sistema !== 'ICM Sistema') throw new Error('Arquivo não é um backup do ICM Sistema.');
      return snap;
    },
    NOMES_ABA
  };
  // Objeto aninhado → colunas "a.b.c"; listas viram texto
  function achatar(o, pre = '', out = {}) {
    Object.entries(o || {}).forEach(([k, v]) => {
      const kk = pre ? `${pre}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) achatar(v, kk, out);
      else if (Array.isArray(v)) out[kk] = v.length && typeof v[0] === 'object' ? JSON.stringify(v).slice(0, 32000) : v.join(', ');
      else if (typeof v === 'string' && v.startsWith('data:')) out[kk] = '[arquivo]';
      else out[kk] = v;
    });
    return out;
  }
  function baixar(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }

  // ======================= FILA OFFLINE (app do professor) =======================
  // No protótipo os dados já ficam no aparelho. Com o Supabase, chamadas feitas sem internet
  // ficam nesta fila e são enviadas automaticamente quando a conexão voltar.
  const FILA = 'icm_fila_sync';
  const offline = {
    fila() { try { return JSON.parse(localStorage.getItem(FILA) || '[]'); } catch (e) { return []; } },
    enfileirar(op) { const f = offline.fila(); f.push({ ...op, em: new Date().toISOString() }); try { localStorage.setItem(FILA, JSON.stringify(f)); } catch (e) { /* */ } document.dispatchEvent(new CustomEvent('icm:fila')); },
    async sincronizar() {
      const f = offline.fila(); if (!f.length || !navigator.onLine) return 0;
      // Fase Supabase: enviar cada operação ao banco aqui. No protótipo já estão salvas localmente.
      try { localStorage.setItem(FILA, '[]'); } catch (e) { /* */ }
      document.dispatchEvent(new CustomEvent('icm:fila'));
      return f.length;
    }
  };
  window.addEventListener('online', async () => { const n = await offline.sincronizar(); if (n && ICM.ui) ICM.ui.toast(`Internet de volta: ${n} chamada(s) sincronizada(s)`, 'ok'); });

  Object.assign(ICM.api, { docsInst, aniversarios, rotina, privacidade, backup, offline, _carregarScript: carregarScript });
})();
