/* Tela de login animada */
(function () {
  window.ICM = window.ICM || {};
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;

  const DEMO = [
    { email: 'admin@icm.org', nome: 'Admin', papel: 'Diretoria' },
    { email: 'coordenacao@icm.org', nome: 'Coord.', papel: 'Coordenação' },
    { email: 'secretaria@icm.org', nome: 'Social', papel: 'Secretaria' },
    { email: 'carlos@icm.org', nome: 'Professor', papel: 'Professor' }
  ];

  ICM.pages.login = function (root, onSuccess) {
    const banco = ICM.auth.modo === 'supabase';
    const msg = sessionStorage.getItem('icm_logout_msg') || '';
    sessionStorage.removeItem('icm_logout_msg');
    root.innerHTML = `
      <div class="login-screen">
        <div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o2"></div><div class="orb ring o3"></div><div class="orb o4"></div><div class="orb o5"></div></div>
        <button class="theme-fab" data-theme-toggle aria-label="Alternar tema">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 22)}</button>
        <div class="login-card">
          <div class="login-logo">${ICM.logo(104, true)}</div>
          <h1 class="login-title">Bem-vindo de volta</h1>
          <div class="login-sub">Entre para continuar</div>
          <form class="login-form" autocomplete="on" novalidate>
            <label class="login-input">${I('user', 24)}<input name="email" type="email" placeholder="E-mail" autocomplete="username" required aria-label="E-mail"></label>
            <label class="login-input">${I('lock', 24)}<input name="senha" type="password" placeholder="Senha" autocomplete="current-password" required aria-label="Senha"><button type="button" class="eye" aria-label="Mostrar senha">${I('eyeOff', 22)}</button></label>
            <div class="login-row"><label class="check"><input type="checkbox" name="lembrar"> Lembrar e-mail</label><a href="#" data-forgot>Esqueceu a senha?</a></div>
            <div class="login-error" role="alert">${esc(msg)}</div>
            <button class="login-btn" type="submit"><span class="btn-label">Entrar</span><span class="arrow">${I('arrowRight', 22)}</span></button>
            ${banco ? `<div class="login-row" style="justify-content:center"><a href="#" data-primeiro>Primeiro acesso? Criar minha senha</a></div>` : `<div class="login-divider">acesso de demonstração</div>`}
          </form>
          ${banco ? '' : `<div class="demo-users">
            ${DEMO.map(d => `<button type="button" class="demo-user" data-demo="${esc(d.email)}">${ICM.util.avatar(d.nome)}<span>${esc(d.papel)}</span></button>`).join('')}
          </div>`}
          <div class="login-tagline">Cultura • Esporte • Meio Ambiente • Educação • Saúde</div>
        </div>
      </div>`;

    const form = root.querySelector('form');
    const card = root.querySelector('.login-card');
    const err = root.querySelector('.login-error');
    const btn = root.querySelector('.login-btn');
    const email = form.email, senha = form.senha;

    try { const saved = localStorage.getItem('icm_last_email'); if (saved) { email.value = saved; form.lembrar.checked = true; } } catch (e) { /* ignore */ }

    root.querySelector('.eye').addEventListener('click', e => {
      const show = senha.type === 'password';
      senha.type = show ? 'text' : 'password';
      e.currentTarget.innerHTML = I(show ? 'eye' : 'eyeOff', 22);
    });
    root.querySelector('[data-forgot]').addEventListener('click', e => {
      e.preventDefault();
      if (!banco) { ICM.ui.toast('Na versão de demonstração não há troca de senha.', 'info', 4500); return; }
      const m = ICM.ui.modal({ title: 'Esqueceu a senha?', size: 'sm', body: `<form class="col"><p class="small">Informe seu e-mail. Enviaremos um link seguro para você criar uma nova senha.</p>${ICM.ui.field({ name: 'email', label: 'E-mail', type: 'email', value: email.value })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Enviar link</button>` });
      m.$('[data-ok]').addEventListener('click', ev => ICM.ui.busy(ev.currentTarget, async () => { await ICM.ui.run(() => ICM.auth.esqueciSenha(m.$('[name=email]').value), 'Se o e-mail estiver cadastrado, o link chega em instantes.'); m.close(); }).catch(() => { }));
    });
    const pa = root.querySelector('[data-primeiro]');
    if (pa) pa.addEventListener('click', e => {
      e.preventDefault();
      const m = ICM.ui.modal({ title: 'Primeiro acesso', size: 'sm', body: `<form class="col"><p class="small">Use o e-mail em que você recebeu o convite da direção e crie sua senha (8+ caracteres, com letras e números).</p>${ICM.ui.field({ name: 'email', label: 'E-mail do convite', type: 'email', value: email.value })}${ICM.ui.field({ name: 'senha', label: 'Crie sua senha', type: 'password', attrs: 'autocomplete="new-password"' })}${ICM.ui.field({ name: 'senha2', label: 'Repita a senha', type: 'password', attrs: 'autocomplete="new-password"' })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Criar acesso</button>` });
      m.$('[data-ok]').addEventListener('click', ev => ICM.ui.busy(ev.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        if (d.senha !== d.senha2) return ICM.ui.toast('As senhas não conferem.', 'warn');
        const r = await ICM.ui.run(() => ICM.auth.primeiroAcesso(d.email, d.senha));
        m.close();
        if (r.precisaConfirmar) ICM.ui.modal({ title: 'Confirme seu e-mail', size: 'sm', body: `<p>Enviamos um link de confirmação para <b>${esc(d.email)}</b>. Abra o e-mail, clique no link e depois entre com sua senha.</p>` });
        else { email.value = d.email; ICM.ui.toast('Acesso criado! Entre com sua senha.', 'ok'); }
      }).catch(() => { }));
    });
    // Voltou pelo link de "esqueci a senha": pede a nova senha
    if (banco && ICM.auth.emRecuperacao()) {
      const m = ICM.ui.modal({ title: 'Crie sua nova senha', size: 'sm', body: `<form class="col">${ICM.ui.field({ name: 'senha', label: 'Nova senha', type: 'password', attrs: 'autocomplete="new-password"' })}${ICM.ui.field({ name: 'senha2', label: 'Repita a nova senha', type: 'password', attrs: 'autocomplete="new-password"' })}</form>`, foot: `<button class="btn btn-primary" data-ok>Salvar nova senha</button>` });
      m.$('[data-ok]').addEventListener('click', ev => ICM.ui.busy(ev.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        if (d.senha !== d.senha2) return ICM.ui.toast('As senhas não conferem.', 'warn');
        await ICM.ui.run(() => ICM.auth.novaSenha(d.senha), 'Senha alterada! Entre com a nova senha.');
        await ICM.store.sb.auth.signOut(); m.close(); history.replaceState(null, '', location.pathname);
      }).catch(() => { }));
    }
    root.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
      email.value = b.dataset.demo; senha.value = 'icm@2026';
      form.requestSubmit();
    }));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      if (!email.value || !senha.value) { err.textContent = 'Preencha e-mail e senha.'; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
      btn.classList.add('is-loading'); btn.disabled = true;
      try {
        const user = await ICM.auth.login(email.value, senha.value);
        try { form.lembrar.checked ? localStorage.setItem('icm_last_email', email.value.trim()) : localStorage.removeItem('icm_last_email'); } catch (er) { /* ignore */ }
        btn.classList.remove('is-loading'); btn.classList.add('success');
        btn.querySelector('.arrow').innerHTML = I('check', 22);
        btn.querySelector(".btn-label").textContent = `Olá, ${user.nome.split(' ')[0]}!`;
        await ICM.util.sleep(650);
        root.querySelector('.login-screen').classList.add('login-exit');
        await ICM.util.sleep(600);
        onSuccess(user);
      } catch (ex) {
        btn.classList.remove('is-loading'); btn.disabled = false;
        err.textContent = ex.message;
        senha.value = ''; senha.focus();
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      }
    });
  };
})();
