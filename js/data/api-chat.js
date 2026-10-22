/* Chat interno da equipe (somente usuários do sistema — professores e colaboradores).
   Famílias e alunos não têm acesso: o Portal da Família não carrega este módulo.
   No Supabase: tabelas chat_canais / chat_mensagens / chat_lidos com RLS por membro + Realtime. */
(function () {
  window.ICM = window.ICM || {};
  const S = () => ICM.store;
  const me = () => ICM.auth.user();

  const idDireto = (a, b) => 'dm_' + [a, b].sort().join('__');
  const ehDireto = id => String(id).startsWith('dm_');
  const membrosDireto = id => id.slice(3).split('__');

  // Dados iniciais (base nova ou base criada antes do chat existir)
  ICM.seedChat = function (db) {
    const ids = (db.usuarios || []).map(u => u.id);
    const profs = (db.usuarios || []).filter(u => u.papel === 'professor').map(u => u.id);
    const gestao = (db.usuarios || []).filter(u => u.papel !== 'professor').map(u => u.id);
    const agora = new Date();
    const em = (diasAtras, hh, mm) => { const d = new Date(agora); d.setDate(d.getDate() - diasAtras); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
    const autor = (papel, i = 0) => ((db.usuarios || []).filter(u => u.papel === papel)[i] || {}).id || ids[0];
    const chat_canais = [
      { id: 'chg_geral', nome: 'Geral', descricao: 'Avisos para toda a equipe', tipo: 'grupo', membros: ids, fixo: true },
      { id: 'chg_prof', nome: 'Professores', descricao: 'Planejamento e trocas entre educadores', tipo: 'grupo', membros: [...new Set([...profs, autor('coordenacao')])] },
      { id: 'chg_gestao', nome: 'Coordenação e secretaria', descricao: 'Casos, matrículas e encaminhamentos', tipo: 'grupo', membros: gestao }
    ];
    const chat_mensagens = [
      { canal_id: 'chg_geral', autor_id: autor('coordenacao'), texto: 'Bom dia, equipe! Os planos de aula deste mês precisam estar no sistema até sexta.', em: em(1, 8, 12) },
      { canal_id: 'chg_geral', autor_id: autor('secretaria'), texto: 'As autorizações de saída para o próximo evento já estão na secretaria.', em: em(1, 9, 40) },
      { canal_id: 'chg_geral', autor_id: autor('professor', 1), texto: 'Obrigada! Passo aí depois do treino.', em: em(1, 9, 52) },
      { canal_id: 'chg_prof', autor_id: autor('professor', 0), texto: 'Alguém tem uma partitura de "Noite Feliz" a três vozes para adaptar?', em: em(1, 14, 5) },
      { canal_id: 'chg_prof', autor_id: autor('professor', 3), texto: 'Tenho sim, Carlos. Te mando em PDF.', em: em(1, 14, 20) },
      { canal_id: 'chg_gestao', autor_id: autor('secretaria'), texto: 'Dois alunos com faltas seguidas nas últimas semanas. Vou ligar para as famílias hoje.', em: em(0, 8, 30) },
      { canal_id: 'chg_geral', autor_id: autor('admin'), texto: 'Reunião geral na próxima quarta, às 17h, na sede.', em: em(0, 10, 2) }
    ].map((m, i) => ({ ...m, id: 'chm_' + (i + 1) }));
    return { chat_canais, chat_mensagens, chat_lidos: [] };
  };

  async function lidosDe(uid) { return (await S().get('chat_lidos', uid)) || { id: uid, canais: {} }; }

  async function podeVer(cid) {
    const u = me(); if (!u) return false;
    if (ehDireto(cid)) return membrosDireto(cid).includes(u.id);
    const c = await S().get('chat_canais', cid);
    return !!c && (c.membros || []).includes(u.id);
  }

  const chat = {
    idDireto,

    // Grupos do usuário + uma conversa direta com cada colega ativo
    async conversas() {
      const u = me();
      const [canais, msgs, usuarios, lidos] = [await S().list('chat_canais', c => (c.membros || []).includes(u.id)), await S().list('chat_mensagens'), await S().list('usuarios', x => x.ativo), await lidosDe(u.id)];
      const resumo = cid => {
        const l = msgs.filter(m => m.canal_id === cid).sort((a, b) => a.em.localeCompare(b.em));
        const ult = l[l.length - 1] || null;
        const naoLidas = l.filter(m => m.autor_id !== u.id && m.em > (lidos.canais[cid] || '')).length;
        return { ultima: ult, naoLidas };
      };
      const nome = id => (usuarios.find(x => x.id === id) || {}).nome || '';
      const grupos = canais.map(c => ({ ...c, ...resumo(c.id), ultimaAutor: '' })).map(c => ({ ...c, ultimaAutor: c.ultima ? nome(c.ultima.autor_id) : '' }));
      const diretos = usuarios.filter(x => x.id !== u.id).map(x => {
        const cid = idDireto(u.id, x.id);
        return { id: cid, tipo: 'direto', nome: x.nome, descricao: x.cargo || ICM.C.PAPEIS[x.papel].nome, outro: { id: x.id, nome: x.nome, foto: x.foto, cargo: x.cargo, papel: x.papel }, ...resumo(cid) };
      }).sort((a, b) => (b.ultima ? b.ultima.em : '').localeCompare(a.ultima ? a.ultima.em : '') || a.nome.localeCompare(b.nome));
      return { grupos, diretos };
    },

    async mensagens(cid) {
      if (!(await podeVer(cid))) { const e = new Error('Você não participa desta conversa.'); e.code = 403; throw e; }
      const usuarios = await S().list('usuarios');
      return (await S().list('chat_mensagens', m => m.canal_id === cid)).sort((a, b) => a.em.localeCompare(b.em))
        .map(m => { const a = usuarios.find(x => x.id === m.autor_id) || { nome: 'Usuário removido' }; return { ...m, autor: { id: a.id, nome: a.nome, foto: a.foto } }; });
    },

    async enviar(cid, texto) {
      texto = String(texto || '').trim();
      if (!texto) return null;
      if (texto.length > 4000) throw new Error('Mensagem muito longa (máximo 4.000 caracteres).');
      if (!(await podeVer(cid))) { const e = new Error('Você não participa desta conversa.'); e.code = 403; throw e; }
      const r = await S().insert('chat_mensagens', { canal_id: cid, autor_id: me().id, texto, em: new Date().toISOString() });
      await chat.marcarLido(cid);
      return r;
    },

    async marcarLido(cid) {
      const u = me(); const l = await lidosDe(u.id);
      const ult = (await S().list('chat_mensagens', m => m.canal_id === cid)).reduce((mx, m) => m.em > mx ? m.em : mx, '');
      if (!ult || (l.canais[cid] || '') >= ult) return;
      l.canais[cid] = ult;
      if (await S().get('chat_lidos', u.id)) await S().update('chat_lidos', u.id, { canais: l.canais });
      else await S().insert('chat_lidos', { id: u.id, canais: l.canais });
    },

    async naoLidas() {
      const { grupos, diretos } = await chat.conversas();
      return [...grupos, ...diretos].reduce((s, c) => s + c.naoLidas, 0);
    },

    async salvarGrupo(g) {
      if (!ICM.auth.can('chat.grupos')) { const e = new Error('Só a coordenação cria e edita grupos.'); e.code = 403; throw e; }
      if (!g.nome || g.nome.trim().length < 2) throw new Error('Dê um nome ao grupo.');
      const membros = [...new Set([...(g.membros || []), me().id])];
      const dados = { nome: g.nome.trim(), descricao: (g.descricao || '').trim(), membros, tipo: 'grupo' };
      const r = g.id ? await S().update('chat_canais', g.id, dados) : await S().insert('chat_canais', { ...dados, criado_por: me().id });
      await ICM.api.audit(g.id ? 'editar' : 'criar', 'chat_canais', r.id, `Grupo do chat: ${r.nome}`);
      return r;
    }
  };

  ICM.api = ICM.api || {};
  ICM.api.chat = chat;
})();
