/* Localização dos atendidos (mapa): onde moram os alunos, identificados só pelo número de matrícula.
   - Só quem vê dados sensíveis abre esta tela (a coordenada exata fica na parte privada da ficha).
   - Para achar o ponto, o sistema envia ao OpenStreetMap (Nominatim) SÓ rua, número, bairro e cidade —
     nunca nome, matrícula ou outro dado do aluno. Limite do serviço: 1 endereço por segundo.
   - A coordenada fica guardada na ficha; só é buscada de novo se o endereço mudar. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const DEMO = (window.ICM_CONFIG || {}).modo !== 'supabase';
  const SEDE = { nome: 'Sede do Instituto (Campo 21)', ll: [-20.09311, -41.12004] };
  const PARADAS_VAN = [['João Valim', [-20.09516, -41.11851]], ['Campo Vinte', [-20.08336, -41.12107]], ['Bela Vista', [-20.08525, -41.12795]], ['São Vicente', [-20.08237, -41.12579]], ['Vila Nova', [-20.08061, -41.12706]], ['Centro', [-20.07756, -41.12453]], ['Boa Fé', [-20.07044, -41.12944]], ['Colina do Cruzeiro', [-20.07456, -41.12097]], ['Grama', [-20.06295, -41.11512]]];
  const PREC = { endereco: 'Endereço exato', rua: 'Localizado pela rua (o mapa não tem o número)', bairro: 'Aproximado — centro do bairro', cidade: 'Aproximado — centro da cidade', demo: 'Demonstração' };
  const f = { situacao: 'ativo', projeto: '', turma: '', van: '', corProjeto: true, sede: true, paradas: false };
  let busca = null; // processo de localização em andamento

  // ---------- Leaflet (carregado só nesta tela) ----------
  let leaflet = null;
  function carregarLeaflet() {
    if (window.L && L.markerClusterGroup) return Promise.resolve();
    if (leaflet) return leaflet;
    const css = h => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); };
    const js = s => new Promise((ok, erro) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = () => erro(new Error('Não foi possível carregar o mapa.')); document.head.appendChild(e); });
    css('js/vendor/leaflet/leaflet.css'); css('js/vendor/leaflet/MarkerCluster.css');
    leaflet = js('js/vendor/leaflet/leaflet.js').then(() => js('js/vendor/leaflet/leaflet.markercluster.js')).catch(e => { leaflet = null; throw e; });
    return leaflet;
  }

  // ---------- Endereço → coordenada ----------
  const limpa = v => String(v || '').trim();
  const temCep = c => /\d{5}-?\d{3}/.test(c || '') && !/0{5}-?0{3}/.test(c);
  const chave = e => [e.logradouro, e.numero, e.bairro, e.cidade, e.uf, e.cep].map(x => limpa(x).toLowerCase()).join('|');
  const geoValido = a => a.geo && a.geo.lat != null && a.geo.chave === chave(a.endereco || {});
  const temEndereco = a => { const e = a.endereco || {}; return !!(limpa(e.cidade) && (limpa(e.logradouro) || limpa(e.bairro))); };
  const cacheBusca = new Map();
  const espera = ms => new Promise(r => setTimeout(r, ms));
  let ultimaChamada = 0;

  async function nominatim(params) {
    const k = JSON.stringify(params);
    if (cacheBusca.has(k)) return cacheBusca.get(k);
    const falta = 1100 - (Date.now() - ultimaChamada); if (falta > 0) await espera(falta);
    ultimaChamada = Date.now();
    const q = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR', ...params });
    const r = await fetch('https://nominatim.openstreetmap.org/search?' + q, { referrerPolicy: 'origin', credentials: 'omit' });
    if (r.status === 429) { await espera(5000); cacheBusca.delete(k); return nominatim(params); }
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

  // Demonstração: dados fictícios ("Sua Cidade") ganham pontos inventados perto da sede
  function geoDemo(a) {
    let h = 0; for (const c of (a.endereco || {}).bairro || a.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    let g = 0; for (const c of a.id) g = (g * 17 + c.charCodeAt(0)) >>> 0;
    const ang = (h % 360) * Math.PI / 180, dist = .01 + (h % 7) * .006;
    return { lat: SEDE.ll[0] + Math.sin(ang) * dist + ((g % 100) - 50) / 40000, lng: SEDE.ll[1] + Math.cos(ang) * dist + ((g >> 7) % 100 - 50) / 40000, precisao: 'demo' };
  }

  ICM.pages.mapaAtendidos = async function (el) {
    ICM.app.setCrumbs([['Pedagógico'], ['Localização dos atendidos']]);
    el.innerHTML = `<div class="page"><div class="card" style="height:120px"></div></div>`;
    const [alunos, mats, turmas, projetos] = await Promise.all([
      ICM.api.alunos.list({ status: '' }), ICM.api.raw('matriculas'), ICM.api.turmas.list(), ICM.api.projetos.list()
    ]);
    try { await carregarLeaflet(); } catch (e) { el.innerHTML = `<div class="page">${ICM.ui.empty(e.message, 'alert')}</div>`; return; }
    const podeGravar = ICM.auth.can('alunos.editar');
    const proj = id => projetos.find(p => p.id === id) || {};
    const turmasDo = a => mats.filter(m => m.aluno_id === a.id && (m.status === 'ativo' || f.situacao !== 'ativo')).map(m => turmas.find(t => t.id === m.turma_id)).filter(Boolean);
    const geoDe = a => geoValido(a) ? a.geo : (DEMO ? geoDemo(a) : null);

    function filtrados() {
      return alunos.filter(a => (!f.situacao || a.status === f.situacao)
        && (!f.van || (f.van === 'sim' ? (a.van || {}).usa : !(a.van || {}).usa))
        && (!f.projeto || turmasDo(a).some(t => t.projeto_id === f.projeto))
        && (!f.turma || turmasDo(a).some(t => t.id === f.turma)));
    }

    el.innerHTML = `<div class="page mapa-at">
      <div class="page-head">
        <div><h1 class="page-title">Localização dos atendidos</h1><div class="page-sub">Cada ponto é um aluno, identificado só pela matrícula.</div></div>
        <div class="row wrap no-print"><button class="btn" data-imprimir>${I('fileText', 18)} Imprimir</button></div>
      </div>
      <div class="card mb-4 no-print"><div class="ma-filtros">
        <label>Situação<select class="input" data-f="situacao"><option value="ativo">Ativos</option><option value="">Todos</option><option value="inativo">Inativos</option></select></label>
        <label>Projeto<select class="input" data-f="projeto"><option value="">Todos</option>${projetos.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select></label>
        <label>Turma<select class="input" data-f="turma"><option value="">Todas</option></select></label>
        <label>Van<select class="input" data-f="van"><option value="">Todos</option><option value="sim">Usam a van</option><option value="nao">Não usam</option></select></label>
        <div class="ma-checks">
          <label><input type="checkbox" data-c="corProjeto" ${f.corProjeto ? 'checked' : ''}> Cor do projeto</label>
          <label><input type="checkbox" data-c="sede" ${f.sede ? 'checked' : ''}> Sede</label>
          <label><input type="checkbox" data-c="paradas" ${f.paradas ? 'checked' : ''}> Paradas da van</label>
        </div>
      </div></div>
      <div class="card mb-4" data-status></div>
      <div class="ma-grid">
        <div class="card ma-mapa-card"><div class="ma-mapa" data-mapa></div></div>
        <div class="card ma-lado"><div class="card-title mb-2">Por bairro</div><div data-bairros></div><div class="ma-leg mt-4" data-leg></div></div>
      </div>
      <div class="xs muted mt-2">Mapa © colaboradores do OpenStreetMap. Para localizar, só a rua, o número, o bairro e a cidade são enviados ao OpenStreetMap — nunca o nome ou a matrícula.</div>
    </div>
    <style>
      .mapa-at .ma-filtros{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;align-items:end}
      .mapa-at .ma-filtros>label{display:grid;gap:6px;font-size:12px;font-weight:700;color:var(--muted)}
      .mapa-at .ma-checks{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;font-weight:600;grid-column:span 2}
      .mapa-at .ma-checks label{display:flex;align-items:center;gap:6px;cursor:pointer}
      .mapa-at .ma-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:16px}
      .mapa-at .ma-mapa-card{padding:8px}
      .mapa-at .ma-mapa{height:62vh;min-height:420px;border-radius:14px;overflow:hidden;z-index:0}
      .mapa-at .ma-lado{max-height:calc(62vh + 16px);overflow:auto}
      .mapa-at .ma-b{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:13px;margin-bottom:8px}
      .mapa-at .ma-b i{grid-column:span 2;height:6px;border-radius:4px;background:var(--grad-primary,#2563eb)}
      .mapa-at .ma-leg{display:grid;gap:6px;font-size:12px}
      .mapa-at .ma-leg span{display:flex;align-items:center;gap:8px}
      .mapa-at .ma-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--c);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
      .mapa-at .ma-prog{height:8px;border-radius:6px;background:var(--surface-sunken);overflow:hidden;margin-top:10px}
      .mapa-at .ma-prog span{display:block;height:100%;background:var(--primary);transition:width .3s}
      .ma-pin{width:16px;height:16px;border-radius:50%;background:var(--c);border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)}
      .ma-pin.aprox{opacity:.75;border-style:dashed}
      .ma-sede{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#1d2a5c;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)}
      .ma-parada{width:12px;height:12px;border-radius:3px;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
      .ma-cl{display:grid;place-items:center;border-radius:50%;font-weight:800;color:#3b2a00;font-size:13px;box-shadow:0 0 0 6px rgba(250,204,21,.35)}
      .ma-cl.m{color:#4a1d00;box-shadow:0 0 0 7px rgba(249,115,22,.35)}.ma-cl.g{color:#fff;box-shadow:0 0 0 8px rgba(234,88,12,.35)}
      .mapa-at .leaflet-popup-content{font-family:inherit;font-size:13px;line-height:1.45}
      @media (max-width:900px){.mapa-at .ma-grid{grid-template-columns:1fr}.mapa-at .ma-checks{grid-column:auto}}
      @media print{.topnav,.subbar,.no-print,.bg-orbs,.leaflet-control-zoom{display:none!important}.mapa-at .ma-mapa{height:150mm}.mapa-at .card{box-shadow:none;border:1px solid #ddd}}
    </style>`;

    // filtros
    const selTurma = el.querySelector('[data-f="turma"]');
    const opcoesTurma = () => { selTurma.innerHTML = '<option value="">Todas</option>' + turmas.filter(t => !f.projeto || t.projeto_id === f.projeto).map(t => `<option value="${esc(t.id)}" ${t.id === f.turma ? 'selected' : ''}>${esc(t.nome)}</option>`).join(''); };
    el.querySelectorAll('[data-f]').forEach(s => { s.value = f[s.dataset.f]; s.addEventListener('change', () => { f[s.dataset.f] = s.value; if (s.dataset.f === 'projeto') { f.turma = ''; opcoesTurma(); } desenhar(); }); });
    opcoesTurma();
    el.querySelectorAll('[data-c]').forEach(c => c.addEventListener('change', () => { f[c.dataset.c] = c.checked; desenhar(); }));
    el.querySelector('[data-imprimir]').addEventListener('click', () => window.print());

    // mapa
    const mapa = L.map(el.querySelector('[data-mapa]'), { scrollWheelZoom: true }).setView(SEDE.ll, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
    const camadaExtras = L.layerGroup().addTo(mapa);
    let grupo = null, primeiraVez = true;

    function desenhar() {
      const lista = filtrados();
      const comPonto = lista.map(a => ({ a, g: geoDe(a) })).filter(x => x.g);
      if (grupo) mapa.removeLayer(grupo);
      grupo = L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 50, spiderfyOnMaxZoom: true,
        iconCreateFunction: c => { const n = c.getChildCount(); const t = n < 10 ? 34 : n < 100 ? 42 : 52; const cl = n < 10 ? '' : n < 100 ? 'm' : 'g'; const bg = n < 10 ? '#facc15' : n < 100 ? '#fb923c' : '#ea580c'; return L.divIcon({ html: `<div class="ma-cl ${cl}" style="width:${t}px;height:${t}px;background:${bg}">${n}</div>`, className: '', iconSize: [t, t] }); }
      });
      comPonto.forEach(({ a, g }) => {
        const ts = turmasDo(a); const p = ts.length ? proj(ts[0].projeto_id) : {};
        const cor = f.corProjeto && p.cor ? p.cor : '#2563eb';
        const aprox = !['endereco', 'rua'].includes(g.precisao);
        const m = L.marker([g.lat, g.lng], { icon: L.divIcon({ html: `<div class="ma-pin ${aprox ? 'aprox' : ''}" style="--c:${cor}"></div>`, className: '', iconSize: [16, 16], iconAnchor: [8, 8] }) });
        m.bindPopup(`<b>Matrícula ${esc(a.matricula || '—')}</b><br>${esc((a.endereco || {}).bairro || 'Bairro não informado')}<br>${ts.length ? ts.map(t => esc(t.nome)).join('<br>') : '<span style="opacity:.7">Sem turma ativa</span>'}<br><small style="opacity:.7">${esc(PREC[g.precisao] || '')}</small><br><a href="#/alunos/${esc(a.id)}">Abrir ficha →</a>`);
        grupo.addLayer(m);
      });
      mapa.addLayer(grupo);

      camadaExtras.clearLayers();
      if (f.sede) L.marker(SEDE.ll, { zIndexOffset: 1000, icon: L.divIcon({ html: `<div class="ma-sede">${I('building', 18)}</div>`, className: '', iconSize: [34, 34], iconAnchor: [17, 17] }) }).bindTooltip(SEDE.nome).addTo(camadaExtras);
      if (f.paradas) PARADAS_VAN.forEach(([n, ll]) => L.marker(ll, { zIndexOffset: 900, icon: L.divIcon({ html: '<div class="ma-parada"></div>', className: '', iconSize: [12, 12], iconAnchor: [6, 6] }) }).bindTooltip('Van: ' + n).addTo(camadaExtras));
      if (primeiraVez && comPonto.length) { mapa.fitBounds(L.latLngBounds(comPonto.map(x => [x.g.lat, x.g.lng])).pad(.08), { maxZoom: 15 }); primeiraVez = false; }

      // por bairro
      const bairros = Object.entries(lista.reduce((o, a) => { const b = limpa((a.endereco || {}).bairro) || 'Não informado'; o[b] = (o[b] || 0) + 1; return o; }, {})).sort((x, y) => y[1] - x[1]);
      const mx = bairros.length ? bairros[0][1] : 1;
      el.querySelector('[data-bairros]').innerHTML = bairros.map(([b, n]) => `<div class="ma-b"><span class="truncate">${esc(b)}</span><b>${n}</b><i style="width:${n / mx * 100}%"></i></div>`).join('') || ICM.ui.empty('Nenhum aluno');
      const projsNoMapa = f.corProjeto ? projetos.filter(p => comPonto.some(({ a }) => { const t = turmasDo(a)[0]; return t && t.projeto_id === p.id; })) : [];
      el.querySelector('[data-leg]').innerHTML = projsNoMapa.map(p => `<span><i class="ma-dot" style="--c:${p.cor || '#2563eb'}"></i>${esc(p.nome)}</span>`).join('')
        + `<span><i class="ma-dot" style="--c:#2563eb;opacity:.75;border-style:dashed"></i>Posição aproximada</span>`
        + (f.sede ? `<span><i class="ma-dot" style="--c:#1d2a5c;border-radius:4px"></i>Sede</span>` : '') + (f.paradas ? `<span><i class="ma-dot" style="--c:#f59e0b;border-radius:3px"></i>Paradas da van</span>` : '');
      status(lista, comPonto.length);
    }

    function status(lista, noMapa) {
      const box = el.querySelector('[data-status]');
      if (busca) return; // a barra de progresso cuida do quadro
      const pend = lista.filter(a => !geoValido(a) && temEndereco(a));
      const semEnd = lista.filter(a => !temEndereco(a)).length;
      const aprox = lista.filter(a => geoValido(a) && !['endereco', 'rua'].includes(a.geo.precisao)).length;
      box.innerHTML = `<div class="row between wrap">
        <div><b>${noMapa} de ${lista.length} aluno(s) no mapa</b>
          <div class="xs muted mt-1">${DEMO ? 'Demonstração: pontos fictícios perto da sede. ' : ''}${!DEMO && pend.length ? `${pend.length} endereço(s) ainda não localizados · ` : ''}${aprox ? `${aprox} em posição aproximada (endereço incompleto ou não encontrado) · ` : ''}${semEnd ? `${semEnd} sem endereço na ficha` : ''}</div></div>
        ${!DEMO && podeGravar && pend.length ? `<button class="btn btn-primary no-print" data-localizar>${I('pin', 18)} Localizar ${pend.length} endereço(s) · cerca de ${Math.max(1, Math.ceil(pend.length * 1.2 / 60))} min</button>` : ''}
      </div>`;
      const b = box.querySelector('[data-localizar]'); if (b) b.addEventListener('click', () => localizarTodos(pend));
    }

    async function localizarTodos(pend) {
      const box = el.querySelector('[data-status]');
      busca = { parar: false, ok: 0, aprox: 0, falha: 0 };
      const total = pend.length;
      const pinta = i => { box.innerHTML = `<div class="row between wrap"><div><b>Localizando endereços… ${i} de ${total}</b><div class="xs muted mt-1">${busca.ok} pela rua ou número · ${busca.aprox} pelo bairro/cidade · ${busca.falha} não encontrados. Pode continuar usando o mapa; não feche esta tela.</div></div><button class="btn no-print" data-parar>Parar</button></div><div class="ma-prog"><span style="width:${i / total * 100}%"></span></div>`; box.querySelector('[data-parar]').addEventListener('click', () => { busca.parar = true; }); };
      pinta(0);
      for (let i = 0; i < total && !busca.parar && document.body.contains(box); i++) {
        const a = pend[i];
        try {
          const r = await localizar(a.endereco || {});
          if (r) {
            const geo = { lat: +r.lat.toFixed(6), lng: +r.lng.toFixed(6), precisao: r.precisao, chave: chave(a.endereco || {}), em: new Date().toISOString() };
            await ICM.api.alunos.salvarGeo(a.id, geo); a.geo = geo;
            ['endereco', 'rua'].includes(r.precisao) ? busca.ok++ : busca.aprox++;
          } else busca.falha++;
        } catch (e) {
          if (/permiss|sess|conex|indispon/i.test(e.message)) { ICM.ui.toast(e.message, 'danger'); break; }
          busca.falha++;
        }
        pinta(i + 1);
        if ((i + 1) % 10 === 0) { const b = busca; busca = null; desenhar(); busca = b; pinta(i + 1); }
      }
      const fim = busca; busca = null;
      if (fim.ok + fim.aprox) ICM.api.audit('localizar_enderecos', 'alunos', '', `Localização dos atendidos: ${fim.ok} exatos, ${fim.aprox} aproximados, ${fim.falha} não encontrados`).catch(() => { });
      if (document.body.contains(box)) { desenhar(); ICM.ui.toast(`Pronto: ${fim.ok} pela rua, ${fim.aprox} pelo bairro ou cidade, ${fim.falha} não encontrados.`); }
    }

    desenhar();
    setTimeout(() => mapa.invalidateSize(), 200);
  };
})();
