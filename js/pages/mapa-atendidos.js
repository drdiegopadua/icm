/* Localização dos atendidos (mapa): onde moram os alunos, identificados só pelo número de matrícula.
   - Só quem vê dados sensíveis abre esta tela (a coordenada exata fica na parte privada da ficha).
   - A localização dos endereços é feita sozinha em segundo plano (js/core/geo.js). */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const DEMO = (window.ICM_CONFIG || {}).modo !== 'supabase';
  const SEDE = { nome: 'Sede do Instituto (Campo 21)', ll: [-20.09311, -41.12004] };
  const PARADAS_VAN = [['João Valim', [-20.09516, -41.11851]], ['Campo Vinte', [-20.08336, -41.12107]], ['Bela Vista', [-20.08525, -41.12795]], ['São Vicente', [-20.08237, -41.12579]], ['Vila Nova', [-20.08061, -41.12706]], ['Centro', [-20.07756, -41.12453]], ['Boa Fé', [-20.07044, -41.12944]], ['Colina do Cruzeiro', [-20.07456, -41.12097]], ['Grama', [-20.06295, -41.11512]]];
  const PREC = { endereco: 'Endereço exato', rua: 'Localizado pela rua (o mapa não tem o número)', bairro: 'Aproximado — centro do bairro', cidade: 'Aproximado — centro da cidade', demo: 'Demonstração' };
  const f = { situacao: 'ativo', projeto: '', turma: '', van: '', corProjeto: true, sede: true, paradas: false };

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

  const limpa = v => String(v || '').trim();
  const { geoValido, temEndereco, pendente } = ICM.geo;

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
    let [alunos, mats, turmas, projetos] = await Promise.all([
      ICM.api.alunos.list({ status: '' }), ICM.api.raw('matriculas'), ICM.api.turmas.list(), ICM.api.projetos.list()
    ]);
    try { await carregarLeaflet(); } catch (e) { el.innerHTML = `<div class="page">${ICM.ui.empty(e.message, 'alert')}</div>`; return; }
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
        <div class="row wrap no-print"><a class="btn" href="#/mapa-atendidos/relatorio">${I('folder', 18)} Mapa por projeto</a><button class="btn" data-cheia>${I('maximize', 18)} Tela cheia</button><button class="btn" data-imprimir>${I('fileText', 18)} Imprimir</button></div>
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
        <div class="card ma-mapa-card" data-mapa-card><div class="ma-mapa" data-mapa></div><button class="ma-fs no-print" data-cheia title="Tela cheia">${I('maximize', 16)} <span>Tela cheia</span></button></div>
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
      .mapa-at .ma-mapa-card{position:relative}
      .mapa-at .ma-fs{position:absolute;z-index:500;top:14px;right:14px;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;background:#fff;color:#0e1838;font-weight:700;font-size:13px;border:0;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}
      .mapa-at .ma-mapa-card:fullscreen,.mapa-at .ma-mapa-card.cheia{padding:0;border-radius:0;background:#000}
      .mapa-at .ma-mapa-card:fullscreen .ma-mapa,.mapa-at .ma-mapa-card.cheia .ma-mapa{height:100vh;height:100dvh;border-radius:0}
      .mapa-at .ma-mapa-card.cheia{position:fixed;inset:0;z-index:9999;margin:0}
      .ma-janela{position:fixed;inset:0;z-index:9999}
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
    // O OSM exige saber de qual site vem o pedido (o sistema, por padrão, não envia o referer)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', referrerPolicy: 'strict-origin-when-cross-origin' }).addTo(mapa);
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
      const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
      const grupos = {};
      lista.forEach(a => { const b = limpa((a.endereco || {}).bairro) || 'Não informado'; const k = norm(b); const g = grupos[k] || (grupos[k] = { n: 0, nomes: {} }); g.n++; g.nomes[b] = (g.nomes[b] || 0) + 1; });
      const bairros = Object.values(grupos).map(g => [Object.entries(g.nomes).sort((x, y) => /[^\x00-\x7f]/.test(y[0]) - /[^\x00-\x7f]/.test(x[0]) || y[1] - x[1])[0][0], g.n]).sort((x, y) => y[1] - x[1]);
      const mx = bairros.length ? bairros[0][1] : 1;
      el.querySelector('[data-bairros]').innerHTML = bairros.map(([b, n]) => `<div class="ma-b"><span class="truncate">${esc(b)}</span><b>${n}</b><i style="width:${n / mx * 100}%"></i></div>`).join('') || ICM.ui.empty('Nenhum aluno');
      const projsNoMapa = f.corProjeto ? projetos.filter(p => comPonto.some(({ a }) => { const t = turmasDo(a)[0]; return t && t.projeto_id === p.id; })) : [];
      el.querySelector('[data-leg]').innerHTML = projsNoMapa.map(p => `<span><i class="ma-dot" style="--c:${p.cor || '#2563eb'}"></i>${esc(p.nome)}</span>`).join('')
        + `<span><i class="ma-dot" style="--c:#2563eb;opacity:.75;border-style:dashed"></i>Posição aproximada</span>`
        + (f.sede ? `<span><i class="ma-dot" style="--c:#1d2a5c;border-radius:4px"></i>Sede</span>` : '') + (f.paradas ? `<span><i class="ma-dot" style="--c:#f59e0b;border-radius:3px"></i>Paradas da van</span>` : '');
      status(lista, comPonto.length);
    }

    function status(lista, noMapa) {
      const box = el.querySelector('[data-status]'); if (!box) return;
      const g = ICM.geo.estado;
      const pend = lista.filter(pendente).length;
      const semEnd = lista.filter(a => !temEndereco(a)).length;
      const naoAchou = lista.filter(a => temEndereco(a) && !pendente(a) && !geoValido(a)).length;
      const aprox = lista.filter(a => geoValido(a) && !['endereco', 'rua'].includes(a.geo.precisao)).length;
      const detalhes = [aprox ? `${aprox} em posição aproximada (bairro ou cidade)` : '', naoAchou ? `${naoAchou} endereço(s) não encontrados no mapa — confira a ficha` : '', semEnd ? `${semEnd} sem endereço na ficha` : ''].filter(Boolean).join(' · ');
      let andamento = '';
      if (DEMO) andamento = 'Demonstração: pontos fictícios perto da sede.';
      else if (g.ativo) andamento = `Localizando os endereços sozinho, em segundo plano: ${g.feitos} de ${g.total}. Os pontos aparecem aos poucos; pode usar o sistema normalmente.`;
      else if (pend && ICM.auth.can('alunos.editar')) andamento = `${pend} endereço(s) na fila — a localização começa sozinha em instantes.`;
      else if (pend) andamento = `${pend} endereço(s) ainda não localizados — serão localizados automaticamente quando a secretaria ou a coordenação estiver usando o sistema.`;
      box.innerHTML = `<div><b>${noMapa} de ${lista.length} aluno(s) no mapa</b>
        ${andamento ? `<div class="xs mt-1" style="color:var(--primary);font-weight:600">${esc(andamento)}</div>` : ''}
        ${detalhes ? `<div class="xs muted mt-1">${esc(detalhes)}</div>` : ''}</div>
        ${g.ativo && g.total ? `<div class="ma-prog"><span style="width:${g.feitos / g.total * 100}%"></span></div>` : ''}`;
    }

    // Acompanha o trabalho em segundo plano: atualiza a barra sempre e o mapa a cada ~8 s
    let ultimoMapa = 0, agendado = null;
    const aoGeo = async () => {
      if (!document.body.contains(el.querySelector('[data-mapa]'))) { document.removeEventListener('icm:geo', aoGeo); return; }
      alunos = await ICM.api.alunos.list({ status: '' });
      const terminou = !ICM.geo.estado.ativo;
      if (terminou || Date.now() - ultimoMapa > 8000) { ultimoMapa = Date.now(); desenhar(); }
      else { status(filtrados(), filtrados().filter(a => geoDe(a)).length); clearTimeout(agendado); agendado = setTimeout(aoGeo, 8500); }
    };
    document.addEventListener('icm:geo', aoGeo);
    if (!DEMO && !ICM.geo.estado.ativo && alunos.some(pendente)) ICM.geo.agora();

    // Tela cheia (no iPhone, que não permite, ocupa a janela toda)
    const card = el.querySelector('[data-mapa-card]');
    const emCheia = () => document.fullscreenElement === card || card.classList.contains('cheia');
    const rotulo = () => [...el.querySelectorAll('[data-cheia]'), ...card.querySelectorAll('[data-cheia]')].forEach(b => { const t = emCheia() ? 'Sair da tela cheia' : 'Tela cheia'; b.innerHTML = `${I(emCheia() ? 'minimize' : 'maximize', b.classList.contains('ma-fs') ? 16 : 18)} <span>${t}</span>`; });
    const ajustar = () => { rotulo(); setTimeout(() => mapa.invalidateSize(), 150); };
    el.querySelectorAll('[data-cheia]').forEach(b => b.addEventListener('click', async () => {
      if (emCheia()) { if (document.fullscreenElement) await document.exitFullscreen().catch(() => { }); sairJanela(); ajustar(); return; }
      if (card.requestFullscreen) { try { await card.requestFullscreen(); return; } catch (e) { /* cai no modo janela */ } }
      entrarJanela(); ajustar();
    }));
    // Sem tela cheia do navegador: leva o mapa para cima de tudo (fora da página) e devolve depois
    const marca = document.createComment('mapa');
    const entrarJanela = () => { card.parentNode.insertBefore(marca, card); const w = document.createElement('div'); w.className = 'mapa-at ma-janela'; document.body.appendChild(w); w.appendChild(card); card.classList.add('cheia'); };
    const sairJanela = () => { if (!card.classList.contains('cheia')) return; const w = card.parentNode; card.classList.remove('cheia'); if (marca.parentNode) marca.parentNode.replaceChild(card, marca); if (w && w.classList.contains('ma-janela')) w.remove(); };
    const aoSairPagina = () => { if (card.classList.contains('cheia')) sairJanela(); window.removeEventListener('hashchange', aoSairPagina); };
    window.addEventListener('hashchange', aoSairPagina);
    document.addEventListener('fullscreenchange', ajustar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && card.classList.contains('cheia')) { sairJanela(); ajustar(); } });

    desenhar();
    setTimeout(() => mapa.invalidateSize(), 200);
  };

  // ======================= Relatório: mapa por projeto (prestação de contas) =======================
  // Uma folha por projeto: mapa com círculos por bairro (sem pontos individuais) + tabela de atendidos por bairro.
  const normB = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  ICM.pages.mapaRelatorio = async function (el, params, query) {
    ICM.app.setCrumbs([['Pedagógico'], ['Localização dos atendidos', '#/mapa-atendidos'], ['Mapa por projeto']]);
    el.innerHTML = `<div class="page"><div class="card" style="height:120px"></div></div>`;
    const [alunos, mats, turmas, projetos] = await Promise.all([ICM.api.alunos.list({ status: '' }), ICM.api.raw('matriculas'), ICM.api.turmas.list(), ICM.api.projetos.list()]);
    try { await carregarLeaflet(); } catch (e) { el.innerHTML = `<div class="page">${ICM.ui.empty(e.message, 'alert')}</div>`; return; }
    const ativosP = projetos.filter(p => p.status !== 'encerrado');
    let sel = (query && query.get('projeto')) || '';
    let situacao = 'ativo';

    function dadosProjeto(p) {
      const tids = new Set(turmas.filter(t => t.projeto_id === p.id).map(t => t.id));
      const ids = new Set(mats.filter(m => tids.has(m.turma_id) && (situacao !== 'ativo' || m.status === 'ativo')).map(m => m.aluno_id));
      const lista = alunos.filter(a => ids.has(a.id) && (situacao !== 'ativo' || a.status === 'ativo'));
      const g = {};
      lista.forEach(a => {
        const nome = String((a.endereco || {}).bairro || '').trim() || 'Não informado'; const k = normB(nome);
        const x = g[k] || (g[k] = { nomes: {}, n: 0, pts: [] }); x.n++; x.nomes[nome] = (x.nomes[nome] || 0) + 1;
        const geo = geoValido(a) ? a.geo : (DEMO ? geoDemo(a) : null); if (geo && k !== normB('Não informado')) x.pts.push([geo.lat, geo.lng]);
      });
      const bairros = Object.values(g).map(x => ({ nome: Object.entries(x.nomes).sort((q, r) => /[^\x00-\x7f]/.test(r[0]) - /[^\x00-\x7f]/.test(q[0]) || r[1] - q[1])[0][0], n: x.n, ll: x.pts.length ? [x.pts.reduce((s, q) => s + q[0], 0) / x.pts.length, x.pts.reduce((s, q) => s + q[1], 0) / x.pts.length] : null })).sort((q, r) => r.n - q.n);
      return { p, total: lista.length, bairros, semLocal: bairros.filter(b => !b.ll).reduce((s, b) => s + b.n, 0) };
    }

    function render() {
      const lista = (sel ? ativosP.filter(p => p.id === sel) : ativosP).map(dadosProjeto);
      el.innerHTML = `<div class="page mapa-rel">
        <div class="page-head no-print"><div><h1 class="page-title">Mapa por projeto</h1><div class="page-sub">Uma folha por projeto, pronta para anexar à prestação de contas. Mostra só quantidades por bairro — nenhum aluno é identificado.</div></div>
          <div class="row wrap">
            <select class="input" style="width:auto" data-proj><option value="">Todos os projetos (${ativosP.length} folhas)</option>${ativosP.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
            <select class="input" style="width:auto" data-sit><option value="ativo" ${situacao === 'ativo' ? 'selected' : ''}>Só atendidos ativos</option><option value="" ${situacao === '' ? 'selected' : ''}>Todos que já passaram pelo projeto</option></select>
            <button class="btn btn-primary" data-imprimir>${I('fileText', 18)} Imprimir / salvar PDF</button>
          </div></div>
        ${lista.map((d, i) => `<section class="folha card mb-4">
          <div class="fl-cab"><div>${ICM.logoCompleta ? ICM.logoCompleta(40) : ''}</div><div class="fl-tit"><div class="xs muted bold">${esc(ICM.C.ORG.razao)} · CNPJ ${esc(ICM.C.ORG.cnpj)}</div><h2>${esc(d.p.nome)}</h2><div class="small muted">Território atendido — ${d.total} ${situacao === 'ativo' ? 'atendido(s) ativo(s)' : 'atendido(s)'} · ${esc(ICM.util.fmtDateLong(ICM.util.today()))}</div></div></div>
          <div class="fl-corpo"><div class="fl-mapa" data-m="${i}"></div>
            <div class="fl-tab"><table class="table"><thead><tr><th>Bairro / localidade</th><th style="text-align:right">Atendidos</th><th style="text-align:right">%</th></tr></thead><tbody>
              ${d.bairros.map(b => `<tr><td>${esc(b.nome)}${b.ll ? '' : ' <span class="xs muted">*</span>'}</td><td style="text-align:right"><b>${b.n}</b></td><td style="text-align:right">${d.total ? Math.round(b.n / d.total * 100) : 0}%</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sem atendidos</td></tr>'}
              <tr><td><b>Total</b></td><td style="text-align:right"><b>${d.total}</b></td><td style="text-align:right">100%</td></tr></tbody></table>
              ${d.semLocal ? `<div class="xs muted mt-2">* ${d.semLocal} atendido(s) sem localização no mapa (bairro não informado ou endereço não encontrado) — contados na tabela.</div>` : ''}</div></div>
          <div class="xs muted mt-2">Círculos = quantidade de atendidos por bairro (posição média dos endereços). Base cartográfica © colaboradores do OpenStreetMap. Gerado pelo ICM Sistema.</div>
        </section>`).join('') || ICM.ui.empty('Nenhum projeto ativo.', 'folder')}
      </div>
      <style>
        .mapa-rel .folha{padding:22px}
        .mapa-rel .fl-cab{display:flex;gap:16px;align-items:center;border-bottom:2px solid var(--line-2);padding-bottom:12px;margin-bottom:14px}
        .mapa-rel .fl-tit h2{margin:4px 0 2px;font-size:22px}
        .mapa-rel .fl-corpo{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}
        .mapa-rel .fl-mapa{height:430px;border-radius:12px;overflow:hidden;z-index:0}
        .mapa-rel .fl-tab .table td,.mapa-rel .fl-tab .table th{padding:6px 8px;font-size:12.5px}
        .rel-circ{display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--c) 75%,transparent);border:2px solid #fff;color:#fff;font-weight:800;font-size:12px;box-shadow:0 1px 6px rgba(0,0,0,.4);text-shadow:0 1px 2px rgba(0,0,0,.4)}
        .rel-sede{width:14px;height:14px;border-radius:4px;background:#1d2a5c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)}
        @media (max-width:900px){.mapa-rel .fl-corpo{grid-template-columns:1fr}}
        @media print{.topnav,.subbar,.no-print,.bg-orbs,.leaflet-control-zoom{display:none!important}
          .mapa-rel .folha{box-shadow:none;border:0;padding:0;margin:0;break-after:page;page-break-after:always}
          .mapa-rel .folha:last-child{break-after:auto;page-break-after:auto}
          .mapa-rel .fl-corpo{grid-template-columns:1.5fr 1fr}.mapa-rel .fl-mapa{height:120mm}
          .rel-circ,.rel-sede{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style>`;
      lista.forEach((d, i) => {
        const box = el.querySelector(`[data-m="${i}"]`);
        const m = L.map(box, { zoomControl: true, scrollWheelZoom: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', referrerPolicy: 'strict-origin-when-cross-origin' }).addTo(m);
        const cor = d.p.cor || '#2563eb'; const mx = Math.max(1, ...d.bairros.map(b => b.n));
        const pts = [];
        d.bairros.filter(b => b.ll).forEach(b => {
          const t = Math.round(26 + 34 * Math.sqrt(b.n / mx));
          L.marker(b.ll, { icon: L.divIcon({ html: `<div class="rel-circ" style="--c:${cor};width:${t}px;height:${t}px">${b.n}</div>`, className: '', iconSize: [t, t], iconAnchor: [t / 2, t / 2] }) }).bindTooltip(`${esc(b.nome)}: ${b.n}`).addTo(m);
          pts.push(b.ll);
        });
        L.marker(SEDE.ll, { icon: L.divIcon({ html: '<div class="rel-sede"></div>', className: '', iconSize: [14, 14], iconAnchor: [7, 7] }) }).bindTooltip('Sede do Instituto').addTo(m);
        if (pts.length) m.fitBounds(L.latLngBounds(pts.concat([SEDE.ll])).pad(.15), { maxZoom: 15 }); else m.setView(SEDE.ll, 13);
        setTimeout(() => m.invalidateSize(), 200);
      });
      el.querySelector('[data-proj]').addEventListener('change', e => { sel = e.target.value; render(); });
      el.querySelector('[data-sit]').addEventListener('change', e => { situacao = e.target.value; render(); });
      el.querySelector('[data-imprimir]').addEventListener('click', () => window.print());
    }
    render();
  };
})();
