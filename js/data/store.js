/* Armazenamento local do PROTÓTIPO.
   Na fase Supabase, este arquivo é substituído por um adaptador que chama o banco
   (mesma interface assíncrona: list/get/insert/update/remove). As telas não mudam. */
(function () {
  window.ICM = window.ICM || {};
  const KEY = 'icm_db_v1';
  let db = null;

  async function init(force = false) {
    if (!force) {
      try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); await migrate(); return; } } catch (e) { /* armazenamento indisponível */ }
    }
    db = await ICM.seed.build();
    await migrate();
    persist();
  }

  // Acrescenta coleções novas em bases criadas por versões anteriores do protótipo
  async function migrate() {
    let mudou = false;
    if (!db.patrimonio) {
      const fresh = await ICM.seed.build();
      db.patrimonio = fresh.patrimonio;
      db.emprestimos = fresh.emprestimos;
      mudou = true;
    }
    if (!db.espera) { Object.assign(db, ICM.seedComunidade(db)); mudou = true; }
    if (!db.estoque_itens) { Object.assign(db, ICM.seedGestao(db)); mudou = true; }
    if (!db.docs_inst) { Object.assign(db, ICM.seedInst(db)); mudou = true; }
    if (!db.chat_canais) { Object.assign(db, ICM.seedChat(db)); mudou = true; }
    if (!db.fin_contas) { Object.assign(db, ICM.seedFinanceiro(db)); mudou = true; }
    if (mudou) persist();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) {
      ICM.ui && ICM.ui.toast('Espaço local cheio. Remova fotos ou conecte o banco Supabase.', 'danger');
      throw e;
    }
  }

  const clone = o => JSON.parse(JSON.stringify(o));

  const store = {
    init,
    reset: () => init(true),
    async list(col, filter) { const a = db[col] || []; return clone(filter ? a.filter(filter) : a); },
    async get(col, id) { const x = (db[col] || []).find(r => r.id === id); return x ? clone(x) : null; },
    async insert(col, obj) {
      const rec = { ...obj, id: obj.id || ICM.util.uid(col.slice(0, 3) + '_'), criado_em: new Date().toISOString() };
      (db[col] = db[col] || []).push(rec); persist(); return clone(rec);
    },
    async update(col, id, patch) {
      const a = db[col] || []; const i = a.findIndex(r => r.id === id);
      if (i < 0) throw new Error('Registro não encontrado');
      a[i] = { ...a[i], ...patch, id, atualizado_em: new Date().toISOString() }; persist(); return clone(a[i]);
    },
    async remove(col, id) { db[col] = (db[col] || []).filter(r => r.id !== id); persist(); },
    async getConfig() { return clone(db.config); },
    async setConfig(patch) { db.config = { ...db.config, ...patch }; persist(); return clone(db.config); },
    // Restaura um backup completo (substitui tudo) — usado em Backup e privacidade
    async restaurar(snap) { const { gerado_em, sistema, versao, ...dados } = snap; db = { ...dados, meta: { versao, restaurado_de: gerado_em } }; persist(); },
    usage() { try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; } }
  };

  ICM.store = store;
})();
