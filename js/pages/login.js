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
            <div class="login-divider">acesso de demonstração</div>
          </form>
          <div class="demo-users">
            ${DEMO.map(d => `<button type="button" class="demo-user" data-demo="${esc(d.email)}">${ICM.util.avatar(d.nome)}<span>${esc(d.papel)}</span></button>`).join('')}
          </div>
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
      ICM.ui.toast('Na versão com Supabase, um link seguro de redefinição será enviado ao seu e-mail.', 'info', 4500);
    });
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
