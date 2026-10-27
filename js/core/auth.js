/* Autenticação do PROTÓTIPO.
   Em produção: Supabase Auth (senha com bcrypt no servidor, JWT curto, MFA opcional)
   e as permissões abaixo passam a ser garantidas por RLS no banco. */
(function () {
  window.ICM = window.ICM || {};
  const SKEY = 'icm_session';
  const LKEY = 'icm_lock';
  const IDLE_MIN = 30;        // logout automático por inatividade
  const MAX_TENTATIVAS = 5;   // bloqueio temporário após tentativas erradas
  const BLOQUEIO_MIN = 5;

  let current = null;
  let idleTimer = null;

  function readLock() { try { return JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch (e) { return {}; } }
  function writeLock(v) { try { localStorage.setItem(LKEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  async function login(email, senha) {
    const lock = readLock();
    if (lock.ate && Date.now() < lock.ate) {
      const min = Math.ceil((lock.ate - Date.now()) / 60000);
      throw new Error(`Muitas tentativas. Tente novamente em ${min} min.`);
    }
    email = String(email || '').trim().toLowerCase();
    const hash = await ICM.util.sha256('icm-salt::' + senha);
    const users = await ICM.store.list('usuarios');
    const u = users.find(x => x.email.toLowerCase() === email && x.ativo);
    await ICM.util.sleep(500); // tempo constante — dificulta descobrir e-mails válidos
    if (!u || u.senha_hash !== hash) {
      const n = (lock.n || 0) + 1;
      writeLock(n >= MAX_TENTATIVAS ? { n: 0, ate: Date.now() + BLOQUEIO_MIN * 60000 } : { n });
      throw new Error('E-mail ou senha inválidos.');
    }
    writeLock({});
    current = strip(u);
    sessionStorage.setItem(SKEY, JSON.stringify({ id: u.id, exp: Date.now() + IDLE_MIN * 60000 }));
    await ICM.api.audit('login', 'usuarios', u.id, 'Acesso ao sistema');
    startIdle();
    return current;
  }

  function strip(u) { const { senha_hash, ...rest } = u; return rest; }

  async function restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
      if (!s || Date.now() > s.exp) { sessionStorage.removeItem(SKEY); return null; }
      const u = await ICM.store.get('usuarios', s.id);
      if (!u || !u.ativo) return null;
      current = strip(u);
      startIdle();
      return current;
    } catch (e) { return null; }
  }

  function logout(motivo) {
    sessionStorage.removeItem(SKEY);
    current = null;
    clearTimeout(idleTimer);
    if (motivo) sessionStorage.setItem('icm_logout_msg', motivo);
    location.hash = '';
    location.reload();
  }

  function touch() {
    if (!current) return;
    try {
      const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null');
      if (s) { s.exp = Date.now() + IDLE_MIN * 60000; sessionStorage.setItem(SKEY, JSON.stringify(s)); }
    } catch (e) { /* ignore */ }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => logout('Sessão encerrada por inatividade.'), IDLE_MIN * 60000);
  }

  function startIdle() {
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, ICM.util.debounce(touch, 1000), { passive: true }));
    touch();
  }

  function can(perm) {
    if (!current) return false;
    const roles = ICM.C.PERMISSOES[perm];
    return !!roles && roles.includes(current.papel);
  }

  ICM.auth = { login, logout, restore, can, user: () => current, IDLE_MIN };
})();
