/* Proteção de tela nas páginas com dados sensíveis (alunos, social, RH, financeiro, mapa, chat…).
   Um site não consegue bloquear 100% uma captura de tela (quem manda é o sistema operacional, e
   sempre dá para fotografar a tela com outro celular). Então o sistema dificulta e deixa rastro:
   - marca d'água com nome e e-mail de quem está logado + data e hora (a imagem vazada mostra a origem);
   - a tela embaça quando a janela perde o foco ou quando se aperta Print Screen / tecla Windows
     (Win+Shift+S abre o recorte do Windows: a tela já está embaçada quando ele captura);
   - Print Screen apaga a área de transferência e fica registrado na auditoria;
   - Ctrl+P bloqueado nessas telas (documentos oficiais saem pelos relatórios, com código de autenticidade);
   - copiar, arrastar e menu do botão direito bloqueados fora dos campos de digitação. */
(function () {
  window.ICM = window.ICM || {};
  const SENSIVEIS = /^\/(alunos|turmas\/|chamada|espera|social|equipe|associados|doadores|financeiro|auditoria|dados|usuarios|mapa-atendidos|voluntarios\/|reunioes\/|aniversariantes|chat)/;
  const rota = () => (location.hash || '#/').slice(1).split('?')[0];
  const logado = () => !!(ICM.auth && ICM.auth.user && ICM.auth.user());
  const temRelatorio = () => !!document.querySelector('body > .report-viewer');
  const ativo = () => logado() && (SENSIVEIS.test(rota()) || temRelatorio());
  const B = () => document.body;
  let ultimaMarca = '';

  // Marca d'água em mosaico (SVG): nome · e-mail · data e hora
  function marcaDagua() {
    const u = ICM.auth.user() || {};
    const quando = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const txt = `${u.nome || ''} · ${u.email || ''} · ${quando} · CONFIDENCIAL`;
    if (txt === ultimaMarca) return;
    ultimaMarca = txt;
    const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="230"><g transform="rotate(-24 230 115)" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" fill="rgb(120,128,150)" fill-opacity="0.16"><text x="20" y="100">${e(txt)}</text><text x="-210" y="215">${e(txt)}</text></g></svg>`;
    B().style.setProperty('--marca-dagua', `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`);
  }
  function aplicar() {
    const on = ativo();
    B().classList.toggle('sens-on', on);
    if (on) marcaDagua(); else B().classList.remove('sens-blur');
  }

  // Embaça quando a janela sai de foco ou quando começa um atalho de captura
  let tEmbacar = null;
  const embacar = () => { if (B().classList.contains('sens-on')) { B().classList.add('sens-blur'); clearTimeout(tEmbacar); } };
  const mostrar = (atraso = 0) => { clearTimeout(tEmbacar); tEmbacar = setTimeout(() => { if (document.hasFocus() && !document.hidden) B().classList.remove('sens-blur'); }, atraso); };

  let ultimoRegistro = 0;
  function registrarTentativa(como) {
    if (Date.now() - ultimoRegistro < 15000) return;
    ultimoRegistro = Date.now();
    try { ICM.api.audit('tentativa_captura', 'tela', rota(), `${como} em tela com dados sensíveis (${rota()})`); } catch (e) { /* sem conexão: segue */ }
  }
  const avisar = (msg) => { if (ICM.ui && ICM.ui.toast) ICM.ui.toast(msg, 'warn', 4500); };

  window.addEventListener('blur', embacar);
  window.addEventListener('focus', () => mostrar(150));
  document.addEventListener('visibilitychange', () => { if (document.hidden) embacar(); else mostrar(150); });

  document.addEventListener('keydown', e => {
    if (!B().classList.contains('sens-on')) return;
    // Tecla Windows/Command (início do Win+Shift+S / Cmd+Shift+4) e Print Screen: embaça na hora
    if (e.key === 'Meta' || e.key === 'OS' || e.key === 'PrintScreen' || (e.shiftKey && (e.metaKey || e.ctrlKey) && /^[s34]$/i.test(e.key))) embacar();
    // Ctrl+P / Cmd+P: impressão só pelos relatórios oficiais
    if ((e.ctrlKey || e.metaKey) && /^p$/i.test(e.key) && !temRelatorio()) {
      e.preventDefault(); avisar('Impressão bloqueada nesta tela (dados sensíveis). Use Relatórios para gerar o documento oficial.');
      registrarTentativa('Ctrl+P');
    }
  }, true);
  document.addEventListener('keyup', e => {
    if (!B().classList.contains('sens-on')) return;
    if (e.key === 'PrintScreen') {
      try { if (navigator.clipboard) navigator.clipboard.writeText('Captura bloqueada: tela com dados sensíveis do ICM Sistema.').catch(() => { }); } catch (er) { /* */ }
      avisar('Captura de tela não permitida em telas com dados sensíveis. A tentativa foi registrada.');
      registrarTentativa('Print Screen');
      mostrar(1200);
    } else if (e.key === 'Meta' || e.key === 'OS') mostrar(700);
  }, true);

  // Copiar, recortar, arrastar e menu do botão direito (fora dos campos de digitação)
  const campo = el => el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]');
  ['copy', 'cut', 'contextmenu', 'dragstart'].forEach(ev => document.addEventListener(ev, e => {
    if (!B().classList.contains('sens-on') || campo(e.target)) return;
    e.preventDefault();
    if (ev === 'copy' || ev === 'cut') { avisar('Copiar dados desta tela não é permitido.'); registrarTentativa('Copiar'); }
  }, true));

  // Acompanha mudança de tela, abertura/fechamento de relatórios e atualiza a hora da marca
  window.addEventListener('hashchange', () => setTimeout(aplicar, 30));
  const observar = () => {
    new MutationObserver(aplicar).observe(document.body, { childList: true });            // relatório aberto/fechado
    const raiz = document.getElementById('root'); if (raiz) new MutationObserver(aplicar).observe(raiz, { childList: true });   // login/saída
  };
  if (document.body) observar(); else document.addEventListener('DOMContentLoaded', observar);
  setInterval(aplicar, 30000);
  ICM.protecaoTela = { aplicar, ativo };
})();
