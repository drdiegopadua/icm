/* Login pelo Supabase Auth (substitui o login de demonstração quando o banco está conectado).
   Senhas ficam só no Supabase (criptografadas). Acesso só para quem tem convite (tabela convites)
   e perfil ativo. Logout automático por inatividade continua valendo. */
(function () {
  if (!window.ICM || !ICM.store || ICM.store.modo !== 'supabase') return;
  const sb = ICM.store.sb;
  const IDLE_MIN = 15;
  const SITE = location.origin + location.pathname;
  let current = null, idleTimer = null, recuperando = false;

  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') recuperando = true; });

  async function carregarPerfil() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data: p, error } = await sb.from('perfis').select('*').eq('id', session.user.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) { await sb.auth.signOut(); throw new Error('Seu acesso ainda não foi liberado. Peça à direção um convite com este e-mail.'); }
    if (!p.ativo) { await sb.auth.signOut(); throw new Error('Seu acesso está desativado. Fale com a direção.'); }
    current = { id: p.id, nome: p.nome, email: p.email, papel: p.papel, cargo: p.cargo, telefone: p.telefone, ativo: p.ativo };
    return current;
  }

  function msgErro(e) {
    const m = String(e && e.message || e);
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha inválidos.';
    if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail: abra o link que enviamos para a sua caixa de entrada.';
    if (/User already registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar" ou "Esqueceu a senha?".';
    if (/Password should be|weak/i.test(m)) return 'Senha fraca: use pelo menos 8 caracteres, com letras e números.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    return m;
  }

  const auth = {
    modo: 'supabase', IDLE_MIN,
    async login(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password: senha });
      if (error) throw new Error(msgErro(error));
      const u = await carregarPerfil();
      ICM.store.invalidar();
      await ICM.api.audit('login', 'usuarios', u.id, 'Acesso ao sistema');
      startIdle(); return u;
    },
    // Primeiro acesso: a pessoa convidada cria a própria senha
    async primeiroAcesso(email, senha) {
      if (!senha || senha.length < 8 || !/\d/.test(senha) || !/[a-zA-Z]/.test(senha)) throw new Error('A senha precisa ter 8+ caracteres, com letras e números.');
      const { data, error } = await sb.auth.signUp({ email: String(email).trim().toLowerCase(), password: senha, options: { emailRedirectTo: SITE } });
      if (error) throw new Error(msgErro(error));
      return { precisaConfirmar: !data.session };
    },
    async esqueciSenha(email) {
      const { error } = await sb.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), { redirectTo: SITE });
      if (error) throw new Error(msgErro(error));
    },
    emRecuperacao: () => recuperando,
    async novaSenha(senha) {
      if (!senha || senha.length < 8 || !/\d/.test(senha) || !/[a-zA-Z]/.test(senha)) throw new Error('A senha precisa ter 8+ caracteres, com letras e números.');
      const { error } = await sb.auth.updateUser({ password: senha });
      if (error) throw new Error(msgErro(error));
      recuperando = false;
    },
    async restore() {
      try { await sb.auth.getSession(); if (recuperando) return null; const u = await carregarPerfil(); if (u) startIdle(); return u; }
      catch (e) { sessionStorage.setItem('icm_logout_msg', e.message); return null; }
    },
    async logout(motivo) {
      clearTimeout(idleTimer); current = null;
      await sb.auth.signOut().catch(() => { });
      if (motivo) sessionStorage.setItem('icm_logout_msg', motivo);
      location.hash = ''; location.reload();
    },
    can(perm) { if (!current) return false; const roles = ICM.C.PERMISSOES[perm]; return !!roles && roles.includes(current.papel); },
    user: () => current
  };

  function touch() { if (!current) return; clearTimeout(idleTimer); idleTimer = setTimeout(() => auth.logout('Sessão encerrada por inatividade.'), IDLE_MIN * 60000); }
  function startIdle() { ['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, ICM.util.debounce(touch, 1000), { passive: true })); touch(); }

  ICM.auth = auth;
})();
