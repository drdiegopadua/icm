/* Camada de dados. Hoje: memória + localStorage com dados de exemplo.
   Na etapa final, este é o único arquivo que passa a falar com o Supabase
   (carrega tudo no início e grava cada alteração), sem mudar as telas. */
(function () {
  const CHAVE = 'icm_demo_v1';
  const CHAVE_SESSAO = 'icm_sessao';
  let db = null;
  let sessaoMem = null;

  const ler = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch { return p; } };
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* sem armazenamento: segue só em memória */ } };
  const novoId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const Store = {
    iniciar() {
      db = ler(CHAVE, null);
      if (!db || db.versao !== 1) { db = Seed.gerar(); gravar(); }
    },
    todos: (col) => db[col] || [],
    obter: (col, id) => (db[col] || []).find((x) => x.id === id),
    filtrar: (col, fn) => (db[col] || []).filter(fn),
    salvar(col, obj) {
      db[col] = db[col] || [];
      if (!obj.id) obj.id = novoId(col.slice(0, 2) + '_');
      const i = db[col].findIndex((x) => x.id === obj.id);
      if (i >= 0) db[col][i] = { ...db[col][i], ...obj };
      else db[col].push(obj);
      gravar();
      return i >= 0 ? db[col][i] : obj;
    },
    remover(col, id) {
      db[col] = (db[col] || []).filter((x) => x.id !== id);
      gravar();
    },
    meta(chave, valor) {
      if (valor === undefined) return db[chave];
      db[chave] = valor;
      gravar();
    },
    restaurar() { db = Seed.gerar(); gravar(); },

    /* Sessão (demonstração: entra como a coordenação) */
    sessao() { try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)) || sessaoMem; } catch { return sessaoMem; } },
    entrar(usuario) {
      const pessoa = db.equipe.find((e) => UI.normaliza(e.nome).startsWith(UI.normaliza(usuario))) || db.equipe[0];
      const s = { id: pessoa.id, nome: pessoa.nome, papel: pessoa.papel };
      sessaoMem = s;
      try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch { /* ignora */ }
      return s;
    },
    sair() { sessaoMem = null; try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* ignora */ } },
  };

  window.Store = Store;
})();
