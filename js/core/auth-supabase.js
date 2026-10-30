/* Login pelo Supabase Auth (substitui o login de demonstração quando o banco está conectado).
   Senhas ficam só no Supabase (criptografadas). Acesso só para quem tem convite (tabela convites)
   e perfil ativo. Logout automático por inatividade continua valendo. */
(function () {
  if (!window.ICM || !ICM.store || ICM.store.modo !== 'supabase') return;
  const sb = ICM.store.sb;
  const IDLE_MIN = 30;
  const SITE = location.origin + location.pathname;
  let current = null, idleTimer = null, recuperando = false;
  // Hora da última atividade (fica no aparelho): vale mesmo com a aba fechada ou o computador hibernado
  const AKEY = 'icm_ultima_atividade', PKEY = 'icm_perfil';
  // Chamadas feitas sem internet: envia assim que houver conexão
  const sincronizarFila = () => { if (!navigator.onLine || !ICM.store.sincronizar) return; setTimeout(() => ICM.store.sincronizar().then(n => { if (n && ICM.ui) ICM.ui.toast(`${n} chamada(s) feita(s) sem internet enviada(s) ao sistema`, 'ok', 4500); }).catch(() => { }), 1500); };
  const ultima = () => { try { return Number(localStorage.getItem(AKEY)) || 0; } catch (e) { return 0; } };
  const marcar = () => { try { localStorage.setItem(AKEY, String(Date.now())); } catch (e) { /* ignore */ } };
  const expirou = () => Date.now() - ultima() > IDLE_MIN * 60000;

  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') recuperando = true; });

  async function carregarPerfil() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    let { data: p, error } = await sb.from('perfis').select('*').eq('id', session.user.id).maybeSingle();
    if (error) {
      // Sem internet: usa o perfil guardado neste aparelho no último acesso (chamada offline)
      const loc = (() => { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { return null; } })();
      if (!navigator.onLine || /fetch|network/i.test(error.message)) { if (loc && loc.id === session.user.id) p = loc; else throw new Error('Sem internet. Entre uma vez com internet neste aparelho para poder usar a chamada sem conexão.'); }
      else throw new Error(error.message);
    } else if (p) { try { localStorage.setItem(PKEY, JSON.stringify({ id: p.id, nome: p.nome, email: p.email, papel: p.papel, cargo: p.cargo, ativo: p.ativo, exige_2fa: p.exige_2fa, da_aulas: p.da_aulas })); } catch (e) { /* */ } }
    if (!p) { await sb.auth.signOut(); throw new Error('Seu acesso ainda não foi liberado. Peça à direção um convite com este e-mail.'); }
    if (!p.ativo) { await sb.auth.signOut(); throw new Error('Seu acesso está desativado. Fale com a direção.'); }
    // Direção (admin) e quem tiver "exige_2fa": só entra depois do código do celular
    const { data: n } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (n && n.currentLevel !== 'aal2' && (n.nextLevel === 'aal2' || p.papel === 'admin' || p.exige_2fa)) {
      const e = new Error(n.nextLevel === 'aal2' ? 'Digite o código do aplicativo autenticador.' : 'Seu perfil exige verificação em duas etapas. Vamos configurar agora.');
      e.code = n.nextLevel === 'aal2' ? 'MFA_VERIFICAR' : 'MFA_CADASTRAR'; throw e;
    }
    current = { id: p.id, nome: p.nome, email: p.email, papel: p.papel, cargo: p.cargo, telefone: p.telefone, ativo: p.ativo, exige_2fa: !!p.exige_2fa, da_aulas: !!p.da_aulas };
    sincronizarFila();
    return current;
  }

  function msgErro(e) {
    const m = String(e && e.message || e);
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha inválidos.';
    if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail: abra o link que enviamos para a sua caixa de entrada.';
    if (/User already registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar" ou "Esqueceu a senha?".';
    if (/Password should be|weak/i.test(m)) return 'Senha fraca: use pelo menos 8 caracteres, com letras e números.';
    if (/Invalid TOTP|invalid.*code|expired/i.test(m)) return 'Código inválido ou vencido. Confira a hora do celular e digite o código atual.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    return m;
  }

  const auth = {
    modo: 'supabase', IDLE_MIN,
    async login(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password: senha });
      if (error) throw new Error(msgErro(error));
      marcar();
      return auth.concluirLogin();
    },
    // Chamado de novo depois do código de 2 etapas (lança MFA_* enquanto faltar)
    async concluirLogin() {
      const u = await carregarPerfil();
      ICM.store.invalidar();
      await ICM.api.audit('login', 'usuarios', u.id, 'Acesso ao sistema');
      startIdle(); return u;
    },
    // Verificação em duas etapas (aplicativo autenticador: Google/Microsoft Authenticator)
    mfa: {
      async fatores() { const { data, error } = await sb.auth.mfa.listFactors(); if (error) throw new Error(msgErro(error)); return (data.all || data.totp || []).filter(f => f.factor_type === 'totp'); },
      async verificar(codigo) {
        const f = (await auth.mfa.fatores()).find(x => x.status === 'verified');
        if (!f) throw new Error('Nenhum aplicativo autenticador cadastrado.');
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: String(codigo).replace(/\D/g, '') });
        if (error) throw new Error(msgErro(error));
      },
      // Devolve o QR Code para escanear; a confirmação vem com o primeiro código
      async iniciarCadastro() {
        for (const f of await auth.mfa.fatores()) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'ICM Sistema', friendlyName: 'Celular ' + new Date().toLocaleString('pt-BR') });
        if (error) throw new Error(msgErro(error));
        return { id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret };
      },
      async confirmarCadastro(factorId, codigo) {
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: String(codigo).replace(/\D/g, '') });
        if (error) throw new Error(msgErro(error));
        if (current) await ICM.api.audit('2fa_ativado', 'usuarios', current.id, 'Aplicativo autenticador cadastrado');
      },
      async remover(factorId) {
        if ((await auth.mfa.fatores()).filter(f => f.status === 'verified').length <= 1 && current && (current.papel === 'admin' || current.exige_2fa)) throw new Error('Seu perfil exige duas etapas: cadastre outro aparelho antes de remover este.');
        const { error } = await sb.auth.mfa.unenroll({ factorId }); if (error) throw new Error(msgErro(error));
        await ICM.api.audit('2fa_removido', 'usuarios', current.id, 'Aparelho autenticador removido');
      }
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
      try {
        const { data: { session } } = await sb.auth.getSession(); if (recuperando) return null;
        // Voltou depois de 30 min sem uso (aba fechada, computador desligado…): pede login de novo
        if (session && expirou() && navigator.onLine) { await sb.auth.signOut().catch(() => { }); sessionStorage.setItem('icm_logout_msg', 'Sessão encerrada por inatividade.'); return null; }
        const u = await carregarPerfil(); if (u) { marcar(); startIdle(); } return u;
      }
      catch (e) {
        if (/^MFA_/.test(e.code || '')) { await sb.auth.signOut().catch(() => { }); return null; }   // pede senha + código de novo
        sessionStorage.setItem('icm_logout_msg', e.message); return null;
      }
    },
    async logout(motivo) {
      clearTimeout(idleTimer); current = null;
      try { localStorage.removeItem(PKEY); } catch (e) { /* */ }
      if (ICM.store.limparCopias) ICM.store.limparCopias();   // não deixa dados de alunos no aparelho
      await sb.auth.signOut().catch(() => { });
      if (motivo) sessionStorage.setItem('icm_logout_msg', motivo);
      location.hash = ''; location.reload();
    },
    can(perm) { if (!current) return false; const roles = ICM.C.PERMISSOES[perm]; return !!roles && roles.includes(current.papel); },
    user: () => current
  };

  function touch() { if (!current) return; marcar(); clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (navigator.onLine) auth.logout('Sessão encerrada por inatividade.'); }, IDLE_MIN * 60000); }
  // Confere a cada 30 s (o relógio do navegador para quando o computador hiberna) e entre abas abertas
  // Sem internet a desconexão espera a conexão voltar (senão o professor não consegue entrar de novo
  // nem fazer a chamada offline); quando volta, primeiro envia as chamadas pendentes e depois desconecta.
  const sairSeInativo = async () => { if (!current || !expirou() || !navigator.onLine) return; if (ICM.store.sincronizar) await ICM.store.sincronizar().catch(() => { }); auth.logout('Sessão encerrada por inatividade.'); };
  setInterval(sairSeInativo, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sairSeInativo(); });
  window.addEventListener('online', () => setTimeout(sairSeInativo, 3000));
  function startIdle() { ['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, ICM.util.debounce(touch, 1000), { passive: true })); touch(); }

  ICM.auth = auth;
})();
