/* Casca do sistema: login, navegação, busca global e rotas */
(function () {
  const { esc, $, $$, icon } = UI;
  const Views = (window.Views = window.Views || {});

  const NAV = [
    ['painel', '#/', 'Painel'],
    ['alunos', '#/alunos', 'Alunos'],
    ['projetos', '#/projetos', 'Projetos'],
    ['turmas', '#/turmas', 'Turmas'],
    ['eventos', '#/eventos', 'Eventos'],
    ['equipe', '#/equipe', 'Equipe'],
    ['relatorios', '#/relatorios', 'Relatórios'],
    ['chat', '#/chat', 'Chat'],
  ];

  const ROTAS = [
    [/^\/?$/, 'painel', () => Views.painel],
    [/^\/alunos\/novo$/, 'alunos', () => (el) => Views.matricula(el)],
    [/^\/alunos\/([^/]+)\/editar$/, 'alunos', () => (el, id) => Views.matricula(el, id)],
    [/^\/alunos\/([^/]+)(?:\/([^/]+))?$/, 'alunos', () => Views.ficha],
    [/^\/alunos$/, 'alunos', () => Views.alunos],
    [/^\/projetos\/([^/]+)(?:\/([^/]+))?$/, 'projetos', () => Views.projeto],
    [/^\/projetos$/, 'projetos', () => Views.projetos],
    [/^\/turmas\/([^/]+)(?:\/([^/]+))?$/, 'turmas', () => Views.turma],
    [/^\/turmas$/, 'turmas', () => Views.turmas],
    [/^\/eventos\/([^/]+)$/, 'eventos', () => Views.evento],
    [/^\/eventos$/, 'eventos', () => Views.eventos],
    [/^\/equipe$/, 'equipe', () => Views.equipe],
    [/^\/relatorios$/, 'relatorios', () => Views.relatorios],
    [/^\/chat(?:\/([^/]+))?$/, 'chat', () => Views.chat],
  ];

  /* ---------- Login ---------- */
  function telaLogin() {
    document.body.classList.remove('app-ativo');
    $('#app').innerHTML = `
      <div class="login-tela">
        <header class="login-topo">
          <img src="img/logo-branca.png" alt="Instituto Cultural das Montanhas">
          <a href="https://www.institutoculturaldasmontanhas.org/" target="_blank" rel="noopener">Site do Instituto</a>
        </header>
        <main class="login-meio">
          <div class="login-cartao vidro">
            <img class="login-marca" src="img/icm-marca.png" alt="ICM">
            <h1>Entrar</h1>
            <p class="sub">Sistema de gestão · acesso restrito à equipe</p>
            <form id="form-login" autocomplete="on">
              <div class="campo-linha"><label for="lg-u">Usuário</label><input id="lg-u" name="usuario" autocomplete="username" required></div>
              <div class="campo-linha"><label for="lg-s">Senha</label><input id="lg-s" name="senha" type="password" autocomplete="current-password" required></div>
              <button class="btn" type="submit">Entrar</button>
            </form>
            <p class="rodape">versão de demonstração</p>
            <p class="pequeno muted" style="margin-top:10px">Nesta fase qualquer usuário e senha entram com dados de exemplo.</p>
          </div>
        </main>
      </div>`;
    $('#form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      Store.entrar($('#lg-u').value.trim());
      iniciarApp();
    });
  }

  /* ---------- Casca ---------- */
  function naoLidas() {
    const eu = Store.sessao()?.id;
    const lidos = Store.meta('lidos') || {};
    return Store.todos('mensagens').filter((m) => m.autor_id !== eu && m.em > (lidos[m.canal_id] || '') && (m.canal_id.startsWith('dm:') ? m.canal_id.slice(3).split('__').includes(eu) : Store.obter('canais', m.canal_id)?.membros.includes(eu))).length;
  }

  function casca() {
    document.body.classList.add('app-ativo');
    const eu = Store.sessao();
    const p = D.pessoa(eu.id);
    $('#app').innerHTML = `
      <header class="topo vidro">
        <a class="marca" href="#/" aria-label="Painel ICM"><img src="img/icm-marca.png" alt="ICM"><span class="marca-txt">Gestão</span></a>
        <nav class="nav" id="nav">
          ${NAV.map(([k, h, r]) => `<a href="${h}" data-nav="${k}">${icon(k)}${r}${k === 'chat' ? '<span class="ponto" id="nav-chat-ponto" hidden></span>' : ''}</a>`).join('')}
        </nav>
        <div class="acoes" style="position:relative">
          <label class="busca-pilula">${icon('busca', 'width="18" height="18"')}<input id="busca-global" placeholder="Buscar" autocomplete="off" aria-label="Buscar no sistema"></label>
          <button class="btn-icone" id="btn-usuario" aria-label="Minha conta">${icon('usuario')}</button>
          <button class="btn-icone menu-movel" id="btn-menu" aria-label="Menu">${icon('menu')}</button>
          <div class="usuario-menu vidro" id="menu-usuario" hidden>
            <div class="quem"><b>${esc(eu.nome)}</b><small>${esc(p?.funcao || '')}</small></div>
            <button data-acao="restaurar">${icon('restaurar')}Restaurar dados de exemplo</button>
            <button data-acao="sair">${icon('sair')}Sair</button>
          </div>
          <div class="resultados-busca vidro" id="resultados-busca" hidden></div>
        </div>
      </header>
      <main class="conteudo" id="principal"></main>`;

    const menu = $('#menu-usuario');
    $('#btn-usuario').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    $('#btn-menu').onclick = (e) => { e.stopPropagation(); $('#nav').classList.toggle('aberto'); };
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) menu.hidden = true;
      if (!e.target.closest('#nav') && !e.target.closest('#btn-menu')) $('#nav')?.classList.remove('aberto');
      if (!e.target.closest('.busca-pilula') && !e.target.closest('#resultados-busca')) $('#resultados-busca').hidden = true;
    });
    menu.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-acao]')?.dataset.acao;
      if (a === 'sair') { Store.sair(); location.hash = ''; telaLogin(); }
      if (a === 'restaurar' && (await UI.confirmar('Apagar as alterações feitas e voltar aos dados de exemplo?', { ok: 'Restaurar', perigo: true }))) {
        Store.restaurar(); UI.toast('Dados de exemplo restaurados'); rotear();
      }
    });
    ligarBusca();
  }

  function ligarBusca() {
    const inp = $('#busca-global'), box = $('#resultados-busca');
    let foco = -1;
    const buscar = () => {
      const q = UI.normaliza(inp.value.trim());
      if (q.length < 2) { box.hidden = true; return; }
      const r = [];
      const casa = (s) => UI.normaliza(s).includes(q);
      Store.todos('alunos').filter((a) => casa(a.nome) || a.matricula.includes(q)).slice(0, 8).forEach((a) => r.push([`#/alunos/${a.id}`, UI.avatar(a.nome, 'p'), a.nome, 'Aluno']));
      Store.todos('turmas').filter((t) => casa(t.nome)).forEach((t) => r.push([`#/turmas/${t.id}`, icon('turmas', 'width="20"'), t.nome, 'Turma']));
      Store.todos('projetos').filter((p) => casa(p.nome)).forEach((p) => r.push([`#/projetos/${p.id}`, icon('projetos', 'width="20"'), p.nome, 'Projeto']));
      Store.todos('eventos').filter((e) => casa(e.nome)).forEach((e) => r.push([`#/eventos/${e.id}`, icon('eventos', 'width="20"'), e.nome, 'Evento']));
      Store.todos('equipe').filter((e) => casa(e.nome) || casa(e.funcao)).forEach((e) => r.push(['#/equipe', UI.avatar(e.nome, 'p'), e.nome, e.funcao]));
      foco = -1;
      box.innerHTML = r.length ? r.map(([h, ic, n, t]) => `<a href="${h}">${ic}<span>${esc(n)}</span><span class="tipo">${esc(t)}</span></a>`).join('') : '<div class="vazio">Nada encontrado</div>';
      box.hidden = false;
    };
    inp.addEventListener('input', buscar);
    inp.addEventListener('focus', buscar);
    inp.addEventListener('keydown', (e) => {
      const links = $$('a', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        foco = (foco + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((l, i) => l.classList.toggle('foco', i === foco));
      } else if (e.key === 'Enter' && links.length) {
        location.hash = links[Math.max(0, foco)].getAttribute('href');
        box.hidden = true; inp.value = ''; inp.blur();
      } else if (e.key === 'Escape') { box.hidden = true; inp.blur(); }
    });
    box.addEventListener('click', () => { box.hidden = true; inp.value = ''; });
  }

  function atualizarPontoChat() {
    const p = $('#nav-chat-ponto');
    if (p) p.hidden = naoLidas() === 0;
  }

  /* ---------- Rotas ---------- */
  function rotear() {
    if (!Store.sessao()) return telaLogin();
    if (!$('#principal')) casca();
    const [caminhoBruto, qs = ''] = decodeURI(location.hash.replace(/^#/, '')).split('?');
    const caminho = caminhoBruto || '/';
    App.params = new URLSearchParams(qs);
    const el = $('#principal');
    for (const [re, nav, fn] of ROTAS) {
      const m = caminho.match(re);
      if (!m) continue;
      $$('[data-nav]').forEach((a) => a.classList.toggle('ativo', a.dataset.nav === nav));
      $('#nav').classList.remove('aberto');
      el.innerHTML = '';
      el.onclick = null;
      fn()(el, ...m.slice(1));
      atualizarPontoChat();
      if (!rotear.manterRolagem) window.scrollTo(0, 0);
      rotear.manterRolagem = false;
      return;
    }
    el.innerHTML = `<div class="painel">${UI.vazio('Página não encontrada')}</div>`;
  }

  /* Navega dentro da mesma tela (abas) sem voltar ao topo */
  window.App = {
    rotear,
    irPara(hash, manterRolagem = false) {
      rotear.manterRolagem = manterRolagem;
      if (location.hash === hash) rotear(); else location.hash = hash;
    },
    atualizarPontoChat,
    naoLidas,
  };

  function iniciarApp() {
    casca();
    rotear();
  }

  Paisagem.montar($('#cena'));
  Store.iniciar();
  window.addEventListener('hashchange', rotear);
  if (Store.sessao()) iniciarApp(); else telaLogin();
})();
