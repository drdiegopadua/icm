/* Endereço do aluno → coordenada (para a Localização dos atendidos).
   - Roda sozinho em segundo plano enquanto alguém que edita alunos (secretaria, coordenação,
     direção) está com o sistema aberto: 1 endereço por segundo, sem precisar clicar em nada.
   - Envia ao OpenStreetMap (Nominatim) SÓ rua, número, bairro e cidade — nunca nome ou matrícula.
   - A coordenada fica na parte privada da ficha (aluno.geo) e só é buscada de novo se o endereço mudar.
   - Só uma aba por computador faz o trabalho (trava no localStorage). */
(function () {
  const limpa = v => String(v || '').trim();
  const chave = e => [e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep].map(x => limpa(x).toLowerCase()).join('|');
  const temEndereco = a => { const e = a.endereco || {}; return !!(limpa(e.cidade) && (limpa(e.logradouro) || limpa(e.bairro))); };
  const geoValido = a => !!(a.geo && a.geo.lat != null && a.geo.chave === chave(a.endereco || {}));
  const tentado = a => !!(a.geo && a.geo.chave === chave(a.endereco || {}));   // achou ou já sabemos que não acha
  const pendente = a => temEndereco(a) && !tentado(a);
  const temCep = c => /\d{5}-?\d{3}/.test(c || '') && !/0{5}-?0{3}/.test(c);
  const espera = ms => new Promise(r => setTimeout(r, ms));

  const cacheBusca = new Map();
  let ultimaChamada = 0;
  async function nominatim(params) {
    const k = JSON.stringify(params);
    if (cacheBusca.has(k)) return cacheBusca.get(k);
    const falta = 1100 - (Date.now() - ultimaChamada); if (falta > 0) await espera(falta);
    ultimaChamada = Date.now();
    const q = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR', ...params });
    const r = await fetch('https://nominatim.openstreetmap.org/search?' + q, { referrerPolicy: 'strict-origin-when-cross-origin', credentials: 'omit' });
    if (r.status === 429) { await espera(30000); return nominatim(params); }
    if (!r.ok) throw new Error('Serviço de mapas indisponível (' + r.status + ').');
    const j = await r.json(); const res = j[0] ? { lat: +j[0].lat, lng: +j[0].lon, tipo: j[0].addresstype || j[0].type || '' } : null;
    cacheBusca.set(k, res); return res;
  }
  async function localizar(e) {
    const cidade = limpa(e.cidade).replace(/\s*[—-]\s*[A-Z]{2}$/, ''), uf = limpa(e.uf) || (limpa(e.cidade).match(/[A-Z]{2}$/) || [''])[0];
    const base = { city: cidade, ...(uf ? { state: uf } : {}), ...(temCep(e.cep) ? { postalcode: limpa(e.cep) } : {}) };
    const rua = limpa(e.logradouro), num = limpa(e.numero).replace(/\D.*$/, '');
    if (rua && num) { const r = await nominatim({ ...base, street: `${num} ${rua}` }); if (r) return { ...r, precisao: ['house', 'building', 'residential_building'].includes(r.tipo) ? 'endereco' : 'rua' }; }
    if (rua) { const r = await nominatim({ ...base, street: rua }); if (r) return { ...r, precisao: 'rua' }; }
    if (limpa(e.bairro)) { const r = await nominatim({ q: [e.bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ') }); if (r) return { ...r, precisao: 'bairro' }; }
    if (cidade) { const r = await nominatim({ city: cidade, ...(uf ? { state: uf } : {}) }); if (r) return { ...r, precisao: 'cidade' }; }
    return null;
  }

  // ---------- Trabalho em segundo plano ----------
  const estado = { ativo: false, feitos: 0, total: 0, ok: 0, aprox: 0, falha: 0, erro: '' };
  const avisar = () => document.dispatchEvent(new CustomEvent('icm:geo', { detail: { ...estado } }));
  const LOCK = 'icm_geo_lock', EU = Math.random().toString(36).slice(2);
  const pegarTrava = () => {
    try {
      const t = JSON.parse(localStorage.getItem(LOCK) || 'null');
      if (t && t.id !== EU && Date.now() - t.em < 30000) return false;
      localStorage.setItem(LOCK, JSON.stringify({ id: EU, em: Date.now() })); return true;
    } catch (e) { return true; }
  };
  const soltarTrava = () => { try { const t = JSON.parse(localStorage.getItem(LOCK) || 'null'); if (t && t.id === EU) localStorage.removeItem(LOCK); } catch (e) { /* */ } };
  window.addEventListener('pagehide', soltarTrava);

  async function rodada() {
    if (estado.ativo || !pegarTrava()) return;
    const alunos = await ICM.api.alunos.list({ status: '' }).catch(() => []);
    const fila = alunos.filter(pendente).sort((a, b) => (a.status === 'ativo' ? 0 : 1) - (b.status === 'ativo' ? 0 : 1));
    if (!fila.length) { soltarTrava(); return; }
    Object.assign(estado, { ativo: true, feitos: 0, total: fila.length, ok: 0, aprox: 0, falha: 0, erro: '' }); avisar();
    try {
      for (const a of fila) {
        if (!pegarTrava()) break;   // outra aba assumiu
        const ch = chave(a.endereco || {});
        const r = await localizar(a.endereco || {});
        const geo = r ? { lat: +r.lat.toFixed(6), lng: +r.lng.toFixed(6), precisao: r.precisao, chave: ch, em: new Date().toISOString() }
          : { lat: null, lng: null, precisao: 'nao_encontrado', chave: ch, em: new Date().toISOString() };
        await ICM.api.alunos.salvarGeo(a.id, geo);
        if (!r) estado.falha++; else if (['endereco', 'rua'].includes(r.precisao)) estado.ok++; else estado.aprox++;
        estado.feitos++; avisar();
      }
      if (estado.ok + estado.aprox) ICM.api.audit('localizar_enderecos', 'alunos', '', `Localização dos atendidos: ${estado.ok} pela rua, ${estado.aprox} pelo bairro/cidade, ${estado.falha} não encontrados`).catch(() => { });
    } catch (e) { estado.erro = e.message || String(e); }
    estado.ativo = false; avisar(); soltarTrava();
  }

  let iniciado = false;
  function iniciar() {
    if (iniciado || (window.ICM_CONFIG || {}).modo !== 'supabase' || !ICM.auth.can('alunos.editar')) return;
    iniciado = true;
    setTimeout(() => rodada().catch(() => { }), 15000);                      // começa 15 s depois de entrar
    setInterval(() => rodada().catch(() => { }), 5 * 60000);                // e confere de novo a cada 5 min
  }

  ICM.geo = { chave, temEndereco, geoValido, tentado, pendente, localizar, estado, iniciar, agora: () => { if ((window.ICM_CONFIG || {}).modo === 'supabase' && ICM.auth.can('alunos.editar')) rodada().catch(() => { }); } };
})();
