/* Armazenamento no Supabase — mesma interface do store.js (list/get/insert/update/remove…).
   As telas e a camada ICM.api não mudam. A segurança (quem vê o quê) é garantida pelo RLS do banco.
   Dados sensíveis são gravados em coleções *_privado, que professor não consegue ler. */
(function () {
  const CFG = window.ICM_CONFIG || {};
  if (CFG.modo !== 'supabase' || !window.supabase) return;

  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const clone = o => JSON.parse(JSON.stringify(o));
  const TTL = 20000;              // recarrega cada coleção no máximo a cada 20 s
  const cache = new Map();        // colecao → { em, dados: [] }
  let modoPublico = null;         // snapshot usado no Portal da Família (sem login)

  // ---------- Separação de dados sensíveis ----------
  const PRIVADO = {
    alunos: a => {
      const pub = { ...a }, priv = {};
      ['cpf', 'rg', 'nis', 'social', 'financeiro', 'acesso_familia'].forEach(k => { if (k in pub) { priv[k] = pub[k]; delete pub[k]; } });
      if (a.saude) { priv.saude = a.saude; const s = a.saude; pub.saude = { alergias: s.alergias || '', medicamentos: s.medicamentos || '', condicoes: s.condicoes || '', apto_atividade_fisica: s.apto_atividade_fisica, contato_emergencia: s.contato_emergencia || '' }; }
      if (a.endereco) { priv.endereco = a.endereco; pub.endereco = { bairro: a.endereco.bairro || '', cidade: a.endereco.cidade || '' }; }
      if (a.responsavel && a.responsavel.cpf) { priv.responsavel_cpf = a.responsavel.cpf; pub.responsavel = { ...a.responsavel }; delete pub.responsavel.cpf; }
      return [pub, priv];
    },
    equipe: p => {
      const pub = { ...p }, priv = {};
      if ('banco' in pub) { priv.banco = pub.banco; delete pub.banco; }
      if ('cpf' in pub) { priv.cpf = pub.cpf; delete pub.cpf; }
      if (pub.contrato && 'remuneracao' in pub.contrato) { priv.remuneracao = pub.contrato.remuneracao; pub.contrato = { ...pub.contrato }; delete pub.contrato.remuneracao; }
      return [pub, priv];
    }
  };
  const juntar = (col, pub, priv) => {
    if (!priv) return pub;
    if (col === 'alunos') { const r = { ...pub, ...priv }; if (priv.responsavel_cpf) r.responsavel = { ...(pub.responsavel || {}), cpf: priv.responsavel_cpf }; delete r.responsavel_cpf; return r; }
    if (col === 'equipe') { const r = { ...pub, ...priv }; r.contrato = { ...(pub.contrato || {}), remuneracao: priv.remuneracao ?? null }; delete r.remuneracao; return r; }
    return { ...pub, ...priv };
  };

  // ---------- Fotos e anexos no Storage privado ----------
  // No banco fica só a referência "sb:<coleção>/<id>/<arquivo>". Na leitura ela vira um link
  // temporário (1 h); na gravação, fotos/PDFs em base64 sobem para o bucket e viram referência.
  const BUCKET = 'arquivos', REF = 'sb:', VALIDADE = 3600;
  const INLINE = new Set(['assinaturas', 'campanhas', 'certificados']);   // usados por páginas públicas
  const MIME_OK = /^data:(image\/(jpeg|png|webp|gif|svg\+xml)|application\/pdf|text\/xml|application\/xml)[;,]/;
  const assinados = new Map();    // caminho → { url, ate }
  const urlParaCaminho = new Map();
  const ext = mime => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' })[mime] || 'xml';

  function percorrer(v, fn) {
    if (typeof v === 'string') return fn(v);
    if (Array.isArray(v)) return v.map(x => percorrer(x, fn));
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = percorrer(v[k], fn); return o; }
    return v;
  }
  function caminhos(v, out = new Set()) { percorrer(v, s => { if (s.startsWith(REF)) out.add(s.slice(REF.length)); return s; }); return out; }

  async function assinar(lista) {
    const falta = [...new Set(lista)].filter(p => !(assinados.get(p) && assinados.get(p).ate > Date.now() + 60000));
    for (let i = 0; i < falta.length; i += 100) {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(falta.slice(i, i + 100), VALIDADE);
      if (error) { console.warn('storage', error.message); continue; }
      data.forEach(d => { if (d.signedUrl) { assinados.set(d.path, { url: d.signedUrl, ate: Date.now() + VALIDADE * 1000 }); urlParaCaminho.set(d.signedUrl, d.path); } });
    }
  }
  async function resolverArquivos(lista) {
    const ps = caminhos(lista);
    if (!ps.size) return lista;
    await assinar([...ps]);
    return percorrer(lista, s => s.startsWith(REF) ? ((assinados.get(s.slice(REF.length)) || {}).url || '') : s);
  }
  // Base64 → arquivo no bucket; link temporário → volta a ser referência
  async function prepararArquivos(col, id, dados) {
    const envios = [];
    if (INLINE.has(col)) return { dados, envios };
    const pendentes = [];
    percorrer(dados, s => { if (s.length > 2000 && MIME_OK.test(s)) pendentes.push(s); return s; });
    const novos = new Map();
    for (const s of pendentes) {
      if (novos.has(s)) continue;
      const mime = s.slice(5, s.search(/[;,]/));
      const hash = (await ICM.util.sha256(s)).slice(0, 24);
      const caminho = `${col}/${id}/${hash}.${ext(mime)}`;
      novos.set(s, caminho);
      envios.push({ caminho, mime, s });
    }
    const out = percorrer(dados, s => {
      if (novos.has(s)) return REF + novos.get(s);
      if (urlParaCaminho.has(s)) return REF + urlParaCaminho.get(s);
      const m = s.match(/\/storage\/v1\/object\/sign\/arquivos\/([^?]+)/);
      return m ? REF + decodeURIComponent(m[1]) : s;
    });
    return { dados: out, envios };
  }
  async function enviarArquivos(envios) {
    for (const e of envios) {
      const b64 = e.s.slice(e.s.indexOf(",") + 1), bin = /;base64,/.test(e.s.slice(0, 80)) ? atob(b64) : decodeURIComponent(b64);
      const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i) & 255;
      const blob = new Blob([arr], { type: e.mime });
      const { error } = await sb.storage.from(BUCKET).upload(e.caminho, blob, { contentType: e.mime, upsert: false });
      if (error && !/exists|Duplicate/i.test(error.message)) throw new Error('Não foi possível enviar o arquivo: ' + error.message);
    }
  }
  // Apaga do bucket os arquivos do registro que não são mais usados
  async function limparArquivos(col, id, manter) {
    const { data } = await sb.storage.from(BUCKET).list(`${col}/${id}`, { limit: 1000 });
    const sobra = (data || []).map(f => `${col}/${id}/${f.name}`).filter(p => !manter.has(p));
    if (sobra.length) await sb.storage.from(BUCKET).remove(sobra);
  }

  // ---------- Leitura ----------
  async function buscarColecao(col) {
    const out = []; let de = 0; const passo = 1000;
    for (;;) {
      const { data, error } = await sb.from('registros').select('id,dados').eq('colecao', col).range(de, de + passo - 1);
      if (error) throw traduzir(error);
      data.forEach(r => out.push({ ...r.dados, id: r.id }));
      if (data.length < passo) break; de += passo;
    }
    return out;
  }
  async function carregar(col) {
    if (modoPublico) return percorrer(modoPublico[col] || [], v => v.startsWith(REF) ? '' : v);
    const c = cache.get(col);
    if (c && Date.now() - c.em < TTL) return c.dados;
    let dados;
    if (col === 'usuarios') dados = await usuarios();
    else if (col === 'auditoria') { const { data, error } = await sb.from('auditoria').select('*').order('em', { ascending: false }).limit(2000); if (error) throw traduzir(error); dados = data.map(x => ({ ...x, id: String(x.id) })); }
    else {
      dados = await buscarColecao(col);
      if (PRIVADO[col]) { const priv = await buscarColecao(col + '_privado').catch(() => []); const m = new Map(priv.map(p => [p.id, p])); dados = dados.map(d => juntar(col, d, m.get(d.id))); }
      dados = await resolverArquivos(dados);
    }
    cache.set(col, { em: Date.now(), dados });
    return dados;
  }
  async function usuarios() {
    const { data, error } = await sb.from('perfis').select('*').order('nome');
    if (error) throw traduzir(error);
    const lista = data.map(p => ({ ...p, id: p.id }));
    const { data: cv } = await sb.from('convites').select('*');
    (cv || []).forEach(c => lista.push({ id: 'convite:' + c.email, nome: c.nome, email: c.email, papel: c.papel, cargo: c.cargo, telefone: c.telefone, exige_2fa: !!c.exige_2fa, da_aulas: !!c.da_aulas, ativo: false, convite: true }));
    return lista;
  }

  // ---------- Gravação ----------
  async function gravarParte(colecao, id, dadosBrutos, tinhaArquivos) {
    const { dados, envios } = await prepararArquivos(colecao, id, dadosBrutos);
    const { error } = await sb.from('registros').upsert({ colecao, id, dados });
    if (error) throw traduzir(error);
    await enviarArquivos(envios);   // depois do registro: a permissão do arquivo segue a do registro
    const usados = caminhos(dados);
    if (tinhaArquivos || usados.size) await limparArquivos(colecao, id, usados).catch(e => console.warn('storage', e.message));
  }
  async function gravar(col, rec) {
    const { id, ...dados } = rec;
    const c = cache.get(col), antigo = c && c.dados.find(x => x.id === id);
    const tinha = !!antigo && JSON.stringify(antigo).includes('/object/sign/arquivos/');
    if (PRIVADO[col]) {
      const [pub, priv] = PRIVADO[col](dados);
      await gravarParte(col, id, pub, tinha);
      // Conta bancária e salário da equipe: só a direção grava
      const podePriv = col !== 'equipe' || (ICM.auth && ICM.auth.can('equipe.salarios'));
      if (podePriv && Object.keys(priv).length) await gravarParte(col + '_privado', id, priv, tinha);
    } else await gravarParte(col, id, dados, tinha);
    if (c) { const i = c.dados.findIndex(x => x.id === id); if (i >= 0) c.dados[i] = rec; else c.dados.push(rec); }
  }
  function traduzir(e) {
    const m = String(e.message || e);
    if (/da_aulas|exige_2fa/.test(m) && /column|schema cache/i.test(m)) return new Error('O banco precisa de uma atualização: rode o arquivo supabase/icm_v3_professor.sql no SQL Editor do Supabase.');
    if (/row-level security|permission denied|violates row-level/i.test(m)) { const x = new Error('Você não tem permissão para esta ação.'); x.code = 403; return x; }
    if (/JWT|token/i.test(m)) return new Error('Sua sessão expirou. Entre novamente.');
    if (/Failed to fetch|NetworkError/i.test(m)) return new Error('Sem conexão com o servidor. Verifique a internet.');
    return new Error(m);
  }

  // ---------- Usuários (perfis + convites) ----------
  async function gravarUsuario(u, novo) {
    if (novo) {
      const { error } = await sb.from('convites').upsert({ email: String(u.email).toLowerCase().trim(), nome: u.nome, papel: u.papel, cargo: u.cargo || '', telefone: u.telefone || '', exige_2fa: !!u.exige_2fa, da_aulas: !!u.da_aulas });
      if (error) throw traduzir(error);
      return { ...u, id: 'convite:' + u.email, ativo: false, convite: true };
    }
    if (String(u.id).startsWith('convite:')) {
      const { error } = await sb.from('convites').update({ nome: u.nome, papel: u.papel, cargo: u.cargo || '', telefone: u.telefone || '', exige_2fa: !!u.exige_2fa, da_aulas: !!u.da_aulas }).eq('email', u.email);
      if (error) throw traduzir(error); return u;
    }
    const { error } = await sb.from('perfis').update({ nome: u.nome, papel: u.papel, cargo: u.cargo || '', telefone: u.telefone || '', ativo: !!u.ativo, exige_2fa: !!u.exige_2fa, da_aulas: !!u.da_aulas }).eq('id', u.id);
    if (error) throw traduzir(error);
    return u;
  }

  const novoId = col => col.slice(0, 3) + '_' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

  const store = {
    sb, modo: 'supabase',
    async init() { /* nada a carregar: os dados vêm sob demanda */ },
    async reset() { throw new Error('Na versão com banco não há "dados de demonstração" para restaurar.'); },
    invalidar(col) { if (col) cache.delete(col); else cache.clear(); },
    async list(col, filter) { const a = await carregar(col); return clone(filter ? a.filter(filter) : a); },
    async get(col, id) { const a = await carregar(col); const x = a.find(r => r.id === id); return x ? clone(x) : null; },
    async insert(col, obj) {
      if (modoPublico) throw new Error('Operação indisponível.');
      if (col === 'usuarios') return gravarUsuario(obj, true);
      if (col === 'auditoria') {
        const { error } = await sb.from('auditoria').insert({ usuario_id: obj.usuario_id, usuario_nome: obj.usuario_nome || '', acao: obj.acao, entidade: obj.entidade || '', entidade_id: String(obj.entidade_id || '').slice(0, 300), resumo: String(obj.resumo || '').slice(0, 1000) });
        if (error) console.warn('auditoria', error.message);
        cache.delete('auditoria'); return obj;
      }
      const rec = { ...obj, id: obj.id || novoId(col), criado_em: obj.criado_em || new Date().toISOString() };
      await gravar(col, rec); return clone(rec);
    },
    async update(col, id, patch) {
      if (col === 'usuarios') { const atual = (await carregar('usuarios')).find(u => u.id === id) || {}; const r = await gravarUsuario({ ...atual, ...patch, id }, false); cache.delete('usuarios'); return r; }
      const atual = (await carregar(col)).find(r => r.id === id) || (await buscarColecao(col)).find(r => r.id === id);
      if (!atual) throw new Error('Registro não encontrado');
      const rec = { ...atual, ...patch, id, atualizado_em: new Date().toISOString() };
      await gravar(col, rec); return clone(rec);
    },
    async remove(col, id) {
      if (col === 'usuarios') throw new Error('Para tirar o acesso, desative o usuário.');
      for (const cc of PRIVADO[col] ? [col, col + '_privado'] : [col]) await limparArquivos(cc, id, new Set()).catch(() => { });
      const { error } = await sb.from('registros').delete().eq('colecao', col).eq('id', id);
      if (error) throw traduzir(error);
      if (PRIVADO[col]) await sb.from('registros').delete().eq('colecao', col + '_privado').eq('id', id);
      const c = cache.get(col); if (c) c.dados = c.dados.filter(r => r.id !== id);
    },
    async getConfig() {
      if (modoPublico) return clone(modoPublico.config || {});
      const { data, error } = await sb.from('config').select('dados').eq('id', 'geral').maybeSingle();
      if (error) throw traduzir(error);
      return (data && data.dados) || { assiduidade: { alerta: 2, desligamento: 3, periodo: 'mes' } };
    },
    async setConfig(patch) {
      const atual = await store.getConfig(); const dados = { ...atual, ...patch };
      const { error } = await sb.from('config').update({ dados }).eq('id', 'geral');
      if (error) throw traduzir(error); return clone(dados);
    },
    // Importa um backup JSON (ex.: migrar o que foi lançado na versão de demonstração)
    async restaurar(snap) {
      const pular = new Set(['gerado_em', 'sistema', 'versao', 'config', 'usuarios', 'auditoria', 'meta']);
      for (const [col, lista] of Object.entries(snap)) { if (pular.has(col) || !Array.isArray(lista)) continue; for (const r of lista) await gravar(col, r); }
      if (snap.config) await store.setConfig(snap.config);
      cache.clear();
    },
    usage() { return 0; },
    // Funções públicas do banco (portal, doação, assinatura, certificado)
    async rpc(nome, args) { const { data, error } = await sb.rpc(nome, args); if (error) throw new Error(String(error.message).replace(/^.*?:\s*/, '')); return data; },
    usarSnapshot(snap) { modoPublico = snap; },
    sairSnapshot() { modoPublico = null; }
  };

  window.ICM = window.ICM || {};
  ICM.store = store;
})();
