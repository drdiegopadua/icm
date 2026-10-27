/* Shell do aplicativo: tema, menu no topo (com menus suspensos), busca, rotas */
(function () {
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const root = document.getElementById('root');

  // ---------- Tema ----------
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('icm_theme', t); } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.innerHTML = I(t === 'dark' ? 'sun' : 'moon', 22); });
  }
  let saved = null; try { saved = localStorage.getItem('icm_theme'); } catch (e) { /* ignore */ }
  applyTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  document.addEventListener('click', e => {
    if (e.target.closest('[data-theme-toggle]')) applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // ---------- Rotas ----------
  const routes = [
    { re: /^\/?$/, page: 'dashboard' },
    { re: /^\/dashboard$/, page: 'dashboard' },
    { re: /^\/alunos$/, page: 'alunos' },
    { re: /^\/alunos\/novo$/, page: 'alunoForm' },
    { re: /^\/alunos\/([\w-]+)\/editar$/, page: 'alunoForm', keys: ['id'] },
    { re: /^\/alunos\/([\w-]+)$/, page: 'alunoDetalhe', keys: ['id'] },
    { re: /^\/projetos$/, page: 'projetos' },
    { re: /^\/projetos\/([\w-]+)$/, page: 'projetoDetalhe', keys: ['id'] },
    { re: /^\/turmas\/([\w-]+)$/, page: 'turma', keys: ['id'] },
    { re: /^\/eventos$/, page: 'eventos' },
    { re: /^\/eventos\/([\w-]+)$/, page: 'eventoDetalhe', keys: ['id'] },
    { re: /^\/relatorios$/, page: 'relatorios' },
    { re: /^\/verificar\/([\w-]+)$/, page: 'verificarApp', keys: ['codigo'] },
    { re: /^\/rotina$/, page: 'rotina' },
    { re: /^\/chamada$/, page: 'chamada' },
    { re: /^\/aniversariantes$/, page: 'aniversariantes' },
    { re: /^\/documentos$/, page: 'documentos', perm: 'docinst.ver' },
    { re: /^\/dados$/, page: 'dados', perm: 'backup.exportar' },
    { re: /^\/estoque$/, page: 'estoque' },
    { re: /^\/equipe$/, page: 'equipe', perm: 'equipe.gerir' },
    { re: /^\/equipe\/([\w-]+)$/, page: 'colaborador', keys: ['id'], perm: 'equipe.gerir' },
    { re: /^\/avisos$/, page: 'avisos' },
    { re: /^\/espera$/, page: 'espera' },
    { re: /^\/reunioes$/, page: 'reunioes' },
    { re: /^\/reunioes\/([\w-]+)$/, page: 'reuniao', keys: ['id'] },
    { re: /^\/voluntarios$/, page: 'voluntarios' },
    { re: /^\/voluntarios\/([\w-]+)$/, page: 'voluntario', keys: ['id'] },
    { re: /^\/certificados$/, page: 'certificados' },
    { re: /^\/doadores$/, page: 'doadores', perm: 'doadores.gerir' },
    { re: /^\/doadores\/([\w-]+)$/, page: 'doador', keys: ['id'], perm: 'doadores.gerir' },
    { re: /^\/associados$/, page: 'associados', perm: 'associados.gerir' },
    { re: /^\/associados\/([\w-]+)$/, page: 'associado', keys: ['id'], perm: 'associados.gerir' },
    { re: /^\/pesquisas$/, page: 'pesquisas' },
    { re: /^\/pesquisas\/([\w-]+)$/, page: 'pesquisa', keys: ['id'] },
    { re: /^\/agenda$/, page: 'agenda' },
    { re: /^\/patrimonio$/, page: 'patrimonio' },
    { re: /^\/patrimonio\/([\w-]+)$/, page: 'patrimonioItem', keys: ['id'] },
    { re: /^\/usuarios$/, page: 'usuarios', perm: 'usuarios.gerenciar' },
    { re: /^\/config$/, page: 'config' },
    { re: /^\/auditoria$/, page: 'auditoria', perm: 'auditoria.ver' },
    { re: /^\/financeiro$/, page: 'financeiro', perm: 'financeiro.ver' },
    { re: /^\/compras$/, page: 'compras' },
    { re: /^\/campanhas$/, page: 'campanhas', perm: 'campanhas.gerir' },
    { re: /^\/social$/, page: 'social', perm: 'social.gerir' },
    { re: /^\/chat$/, page: 'chat' },
    { re: /^\/chat\/([\w-]+)$/, page: 'chat', keys: ['id'] }
  ];

  // Menu no topo: links diretos + grupos que abrem em menu suspenso
  const NAV = () => [
    { href: '#/dashboard', icon: 'home', label: 'Início', match: /^\/(dashboard)?$/ },
    { label: 'Alunos', icon: 'users', itens: [
      { href: '#/alunos', icon: 'users', label: 'Alunos', desc: 'Matrícula, ficha e histórico', match: /^\/alunos/ },
      { href: '#/chamada', icon: 'userCheck', label: 'Chamada (celular)', desc: 'Presença rápida pelo QR da carteirinha', match: /^\/chamada/ },
      ICM.auth.can('espera.gerir') && { href: '#/espera', icon: 'list', label: 'Lista de espera', desc: 'Triagem e vagas', match: /^\/espera/ },
      ICM.auth.can('social.gerir') && { href: '#/social', icon: 'heartPulse', label: 'Acompanhamento social', desc: 'PIA, encaminhamentos à rede e evolução', match: /^\/social/ },
      { href: '#/aniversariantes', icon: 'star', label: 'Aniversariantes', match: /^\/aniversariantes/ }
    ] },
    { label: 'Pedagógico', icon: 'folder', itens: [
      { href: '#/rotina', icon: 'sun', label: 'Rotina do dia', desc: 'Aulas, pendências e avisos de hoje', match: /^\/rotina/ },
      { href: '#/projetos', icon: 'folder', label: 'Projetos e turmas', desc: 'Planos de aula, chamadas e relatórios de aula', match: /^\/(projetos|turmas)/ },
      { href: '#/eventos', icon: 'star', label: 'Eventos e ações', desc: 'Apresentações, campeonatos e participantes', match: /^\/eventos/ },
      { href: '#/agenda', icon: 'calendar', label: 'Agenda de espaços', match: /^\/agenda/ }
    ] },
    { label: 'Comunidade', icon: 'heart', itens: [
      { href: '#/avisos', icon: 'bell', label: 'Avisos (WhatsApp)', match: /^\/avisos/ },
      { href: '#/reunioes', icon: 'users', label: 'Reuniões de pais', match: /^\/reunioes/ },
      { href: '#/voluntarios', icon: 'heart', label: 'Voluntários', match: /^\/voluntarios/ },
      ICM.auth.can('associados.gerir') && { href: '#/associados', icon: 'key', label: 'Associados', match: /^\/associados/, count: 'inadimplentes' },
      ICM.auth.can('doadores.gerir') && { href: '#/doadores', icon: 'dollar', label: 'Doadores e parceiros', match: /^\/doadores/ },
      ICM.auth.can('campanhas.gerir') && { href: '#/campanhas', icon: 'heart', label: 'Campanhas e doação online', desc: 'Página de doação com Pix', match: /^\/campanhas/ },
      { href: '#/pesquisas', icon: 'pie', label: 'Pesquisas', match: /^\/pesquisas/ }
    ] },
    { label: 'Documentos', icon: 'fileText', itens: [
      { href: '#/relatorios', icon: 'fileText', label: 'Relatórios', desc: 'Turma, projeto, prestação de contas e anual', match: /^\/relatorios/, count: 'alertas' },
      { href: '#/certificados', icon: 'award', label: 'Certificados', match: /^\/certificados/ },
      ICM.auth.can('docinst.ver') && { href: '#/documentos', icon: 'shield', label: 'Docs da instituição', match: /^\/documentos/, count: 'docs' }
    ] },
    { label: 'Gestão', icon: 'building', itens: [
      ICM.auth.can('financeiro.ver') && { href: '#/financeiro', icon: 'dollar', label: 'Financeiro', desc: 'Pagar e receber, orçamento por projeto, conciliação', match: /^\/financeiro/ },
      { href: '#/compras', icon: 'clipboard', label: 'Compras', desc: 'Pedidos, 3 orçamentos e aprovação', match: /^\/compras/ },
      { href: '#/patrimonio', icon: 'building', label: 'Patrimônio', match: /^\/patrimonio/, count: 'atrasos' },
      { href: '#/estoque', icon: 'layers', label: 'Estoque de consumo', match: /^\/estoque/ },
      ICM.auth.can('equipe.gerir') && { href: '#/equipe', icon: 'users', label: 'Equipe (RH)', desc: 'Professores e colaboradores', match: /^\/equipe/ },
      ICM.auth.can('usuarios.gerenciar') && { href: '#/usuarios', icon: 'key', label: 'Usuários e acessos', match: /^\/usuarios/ },
      ICM.auth.can('auditoria.ver') && { href: '#/auditoria', icon: 'shield', label: 'Auditoria', match: /^\/auditoria/ },
      ICM.auth.can('backup.exportar') && { href: '#/dados', icon: 'download', label: 'Backup e privacidade', match: /^\/dados/ },
      { href: '#/config', icon: 'settings', label: 'Configurações', match: /^\/config/ }
    ] },
    { href: '#/chat', icon: 'chat', label: 'Chat', match: /^\/chat/, count: 'chat' }
  ].map(n => n.itens ? { ...n, itens: n.itens.filter(Boolean) } : n);

  let alertCount = 0, atrasoCount = 0, inadCount = 0, docsCount = 0, chatCount = 0;
  const contagem = c => ({ alertas: alertCount, atrasos: atrasoCount, inadimplentes: inadCount, docs: docsCount, chat: chatCount }[c] || 0);
  const DICA = { alertas: 'Alunos em alerta de faltas', atrasos: 'Empréstimos atrasados', inadimplentes: 'Associados inadimplentes', docs: 'Documentos vencidos ou vencendo', chat: 'Mensagens não lidas' };

  function shell(user) {
    root.innerHTML = `
      <div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o3"></div></div>
      <div class="app app-topo">
        <header class="topnav glass">
          <a class="brand" href="#/dashboard" aria-label="Início — Instituto Cultural das Montanhas">${ICM.logoCompleta(42)}<span class="brand-txt">Gestão</span></a>
          <nav class="tn-menu" aria-label="Menu principal"></nav>
          <div class="tn-acoes">
            <div class="search tn-busca input-icon">${I('search', 18)}<input class="input" type="search" placeholder="Buscar" aria-label="Busca global"></div>
            <button class="btn btn-icon btn-sm btn-ghost" data-theme-toggle aria-label="Alternar tema">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18)}</button>
            <div class="tn-user">
              <button class="tn-user-btn" data-user aria-haspopup="true" aria-expanded="false" aria-label="Minha conta">${ICM.util.avatar(user.nome, user.foto, 'sm')}</button>
              <div class="tn-drop tn-drop-user" role="menu">
                <div class="tn-quem">${ICM.util.avatar(user.nome, user.foto, 'sm')}<div><b>${esc(user.nome)}</b><div class="xs muted">${esc(ICM.C.PAPEIS[user.papel].nome)}</div></div></div>
                <a class="tn-link" href="#/config">${I('settings', 18)}<span>Configurações</span></a>
                <button class="tn-link" data-logout>${I('logout', 18)}<span>Sair</span></button>
              </div>
            </div>
            <button class="btn btn-icon btn-sm menu-btn" data-menu aria-label="Abrir menu" aria-expanded="false">${I('menu', 18)}</button>
          </div>
        </header>
        <main class="main">
          <div class="subbar">
            <button class="btn btn-sm back-btn" data-back hidden title="Voltar (Alt + ←)">${I('arrowLeft', 16)} Voltar</button>
            <div class="crumbs"></div>
          </div>
          <div id="view"></div>
        </main>
      </div>`;

    const fecharMenus = (exceto) => root.querySelectorAll('.tn-grupo.aberto, .tn-user.aberto').forEach(g => {
      if (g === exceto) return;
      g.classList.remove('aberto');
      const b = g.querySelector('[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    root.querySelector('.topnav').addEventListener('click', e => {
      const gb = e.target.closest('.tn-grupo-btn, [data-user]');
      if (gb) {
        const g = gb.parentElement; const abrir = !g.classList.contains('aberto');
        fecharMenus(g); g.classList.toggle('aberto', abrir); gb.setAttribute('aria-expanded', String(abrir));
        return;
      }
      if (e.target.closest('.tn-drop a, .tn-menu > a')) { fecharMenus(); root.querySelector('.app').classList.remove('mobile-open'); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.topnav')) fecharMenus(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenus(); });

    root.querySelector('[data-logout]').addEventListener('click', async () => {
      fecharMenus();
      if (await ICM.ui.confirm({ title: 'Sair do sistema', text: 'Deseja encerrar sua sessão?', ok: 'Sair' })) { await ICM.api.audit('logout', 'usuarios', user.id, 'Saída do sistema'); ICM.auth.logout(); }
    });
    root.querySelector('[data-menu]').addEventListener('click', e => {
      const app = root.querySelector('.app'); app.classList.toggle('mobile-open');
      e.currentTarget.setAttribute('aria-expanded', String(app.classList.contains('mobile-open')));
    });
    root.querySelector('[data-back]').addEventListener('click', voltar);
    setupSearch();
  }

  function renderNav(path) {
    const nav = root.querySelector('.tn-menu');
    const aberto = nav.querySelector('.tn-grupo.aberto .tn-grupo-btn');
    const abertoLbl = aberto ? aberto.dataset.lbl : null;
    const badge = c => contagem(c) ? `<span class="count" title="${esc(DICA[c])}">${contagem(c)}</span>` : '';
    nav.innerHTML = NAV().map(n => {
      if (!n.itens) return `<a class="tn-item ${n.match.test(path) ? 'active' : ''}" href="${n.href}">${I(n.icon, 18)}<span>${esc(n.label)}</span>${n.count && contagem(n.count) ? (n.count === 'chat' ? `<span class="tn-cont" title="${esc(DICA[n.count])}">${contagem(n.count) > 99 ? '99+' : contagem(n.count)}</span>` : `<span class="tn-ponto" title="${esc(DICA[n.count])}"></span>`) : ''}</a>`;
      if (!n.itens.length) return '';
      const ativo = n.itens.some(x => x.match.test(path));
      const pend = n.itens.some(x => x.count && contagem(x.count));
      const ab = abertoLbl === n.label;
      return `<div class="tn-grupo ${ab ? 'aberto' : ''}">
        <button class="tn-item tn-grupo-btn ${ativo ? 'active' : ''}" data-lbl="${esc(n.label)}" aria-haspopup="true" aria-expanded="${ab}">${I(n.icon, 18)}<span>${esc(n.label)}</span><span class="tn-seta">${I('chevronDown', 14)}</span>${pend ? '<span class="tn-ponto"></span>' : ''}</button>
        <div class="tn-drop" role="menu">${n.itens.map(x => `<a class="tn-link ${x.match.test(path) ? 'active' : ''}" href="${x.href}" role="menuitem"><span class="tn-ic">${I(x.icon, 18)}</span><span class="grow"><b>${esc(x.label)}</b>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</span>${x.count ? badge(x.count) : ''}</a>`).join('')}</div>
      </div>`;
    }).join('');
  }

  // Voltar: vai para a tela "mãe" da trilha (ex.: aluno → lista de alunos); se não houver, volta no histórico
  let parentHref = null;
  function voltar() {
    if (parentHref) location.hash = parentHref;
    else if (history.length > 1) history.back();
    else location.hash = '#/dashboard';
  }

  function setCrumbs(items) {
    const el = root.querySelector('.crumbs'); if (!el) return;
    const parent = items.length > 1 ? items[items.length - 2] : null;
    parentHref = parent && parent[1] ? parent[1] : null;
    const bb = root.querySelector('[data-back]');
    if (bb) bb.hidden = items.length < 2;
    el.innerHTML = items.map((c, i) => i === items.length - 1 ? `<span class="cur">${esc(c[0])}</span>` : `<a href="${c[1]}">${esc(c[0])}</a>${I('chevronRight', 14)}`).join('');
    document.title = `${chatCount ? `(${chatCount}) ` : ''}${items[items.length - 1][0]} · ICM Sistema`;
  }

  function setupSearch() {
    const inp = root.querySelector('.search input'); const wrap = root.querySelector('.search');
    let box = null, hl = -1;
    const closeBox = () => { box && box.remove(); box = null; hl = -1; };
    inp.addEventListener('input', ICM.util.debounce(async () => {
      const res = await ICM.api.buscar(inp.value.trim());
      closeBox();
      if (!inp.value.trim()) return;
      box = document.createElement('div'); box.className = 'search-results';
      box.innerHTML = res.length ? res.map(r => `<a href="${r.href}"><span class="badge neutral">${esc(r.tipo)}</span><span class="grow truncate"><b>${esc(r.nome)}</b> <span class="muted small">${esc(r.sub)}</span></span>${I('chevronRight', 16)}</a>`).join('') : `<div class="empty small">Nada encontrado</div>`;
      wrap.appendChild(box);
      box.addEventListener('click', () => { inp.value = ''; closeBox(); });
    }, 200));
    inp.addEventListener('keydown', e => {
      if (!box) return; const links = [...box.querySelectorAll('a')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach((l, i) => l.classList.toggle('hl', i === hl)); }
      if (e.key === 'Enter' && links[Math.max(0, hl)]) { location.hash = links[Math.max(0, hl)].getAttribute('href'); inp.value = ''; closeBox(); }
      if (e.key === 'Escape') { inp.value = ''; closeBox(); }
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeBox(); });
  }

  async function route() {
    const path = (location.hash || '#/').slice(1).split('?')[0];
    const query = new URLSearchParams((location.hash.split('?')[1]) || '');
    const view = document.getElementById('view');
    if (!view) return;
    root.querySelector('.app').classList.remove('mobile-open');
    root.querySelectorAll('.tn-grupo.aberto, .tn-user.aberto').forEach(g => g.classList.remove('aberto'));
    renderNav(path);
    let match = null, params = {};
    for (const r of routes) { const m = path.match(r.re); if (m) { match = r; (r.keys || []).forEach((k, i) => params[k] = m[i + 1]); break; } }
    window.scrollTo({ top: 0 });
    if (!match) { view.innerHTML = `<div class="page">${ICM.ui.empty('Página não encontrada', 'alert')}</div>`; return; }
    if (match.perm && !ICM.auth.can(match.perm)) { view.innerHTML = `<div class="page">${ICM.ui.empty('Acesso restrito ao seu perfil.', 'lock')}</div>`; return; }
    view.innerHTML = `<div class="page"><div class="card" style="height:120px;background:linear-gradient(90deg,var(--surface) 0,var(--surface-2) 50%,var(--surface) 100%);background-size:800px 100%;animation:shimmer 1.2s linear infinite"></div></div>`;
    try {
      await ICM.pages[match.page](view, params, query);
      ICM.ui.countUp(view);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="page">${ICM.ui.empty(e.code === 403 ? e.message : 'Não foi possível carregar esta página.', e.code === 403 ? 'lock' : 'alert')}</div>`;
    }
  }

  async function refreshAlerts() {
    try { alertCount = (await ICM.api.assiduidade.alertas()).length; } catch (e) { alertCount = 0; }
    try { atrasoCount = (await ICM.api.emprestimos.list({ status: 'atrasado' })).length; } catch (e) { atrasoCount = 0; }
    try { docsCount = ICM.auth.can('docinst.ver') ? (await ICM.api.docsInst.list()).filter(d => d.status.nivel === 'danger').length : 0; } catch (e) { docsCount = 0; }
    try { inadCount = ICM.auth.can('associados.gerir') ? (await ICM.api.associados.list()).filter(a => a.status === 'ativo' && !a.em_dia).length : 0; } catch (e) { inadCount = 0; }
    try { chatCount = await ICM.api.chat.naoLidas(); } catch (e) { chatCount = 0; }
    const path = (location.hash || '#/').slice(1).split('?')[0];
    if (root.querySelector('.tn-menu')) renderNav(path);
  }

  async function start(user) {
    shell(user);
    window.addEventListener('hashchange', route);
    await route();
    refreshAlerts();
    refreshChat();
    setInterval(() => { if (!document.hidden) refreshChat(); }, 10000);
    ICM.pages._rotinaAutomatica().catch(() => { });
  }

  // Mensagens novas do chat: número no menu, no título da aba e aviso clicável
  let chatAvisada = null, chatPrimeira = true;
  async function refreshChat() {
    try {
      const n = await ICM.api.chat.novidades(); chatCount = n.total;
      if (n.ultima && n.ultima.id !== chatAvisada) {
        if (!chatPrimeira && !/^#\/chat/.test(location.hash)) avisarMensagem(n.ultima);
        chatAvisada = n.ultima.id;
      }
      chatPrimeira = false;
    } catch (e) { chatCount = 0; }
    document.title = (chatCount ? `(${chatCount}) ` : '') + document.title.replace(/^\(\d+\)\s*/, '');
    const path = (location.hash || '#/').slice(1).split('?')[0];
    if (root.querySelector('.tn-menu')) renderNav(path);
  }

  function avisarMensagem(m) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'toast info toast-chat';
    t.innerHTML = `<div class="ic">${I('chat', 18)}</div><div><b>${esc(m.autor)}${m.conversa ? ' · ' + esc(m.conversa) : ''}</b><div class="small">${esc(String(m.texto).slice(0, 90))}${String(m.texto).length > 90 ? '…' : ''}</div></div>`;
    const sair = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    t.addEventListener('click', () => { location.hash = '#/chat/' + m.cid; sair(); });
    box.appendChild(t); setTimeout(sair, 8000);
  }

  ICM.app = { setCrumbs, refreshAlerts, refreshChat, go: h => { location.hash = h; }, reload: route };

  // ---------- Inicialização ----------
  (async function boot() {
    // App instalável e com funcionamento offline (exige HTTPS ou localhost)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
    await ICM.store.init();
    // Verificação pública de certificado (QR Code) — não exige login
    const pub = (location.hash || '').match(/^#\/verificar\/([\w-]+)/);
    const fam = (location.hash || '').match(/^#\/(portal|assinar\/([\w-]+))/);
    if (fam) { window.addEventListener('hashchange', () => location.reload()); return fam[2] ? ICM.pages.assinar(root, fam[2]) : ICM.pages.portal(root); }
    // Página pública de doação (campanhas + Pix)
    const doar = (location.hash || '').match(/^#\/doar(?:\/([\w-]+))?$/);
    if (doar) { window.addEventListener('hashchange', () => location.reload()); return ICM.pages.doar(root, doar[1]); }
    if (pub) { await ICM.pages.verificar(root, pub[1]); window.addEventListener('hashchange', () => location.reload(), { once: true }); return; }
    const user = await ICM.auth.restore();
    if (user) start(user);
    else ICM.pages.login(root, start);
  })();
})();
