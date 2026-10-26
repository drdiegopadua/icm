/* Usuários, configurações e auditoria */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  // ---------- Usuários ----------
  ICM.pages.usuarios = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Usuários e acessos']]);
    const list = await ICM.api.usuarios.list();
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Usuários e acessos</h1><div class="page-sub">Professores e colaboradores com login no sistema</div></div><button class="btn btn-primary" data-new>${I('userPlus', 18)} Novo usuário</button></div>
      <div class="grid grid-4 mb-4">${Object.entries(ICM.C.PAPEIS).map(([k, v]) => `<div class="card flat"><div class="bold">${esc(v.nome)}</div><div class="xs muted mt-2">${esc(v.desc)}</div><div class="val mt-2" style="font-size:22px;font-weight:900">${list.filter(u => u.papel === k).length}</div></div>`).join('')}</div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Cargo</th><th>Situação</th><th></th></tr></thead><tbody>
        ${list.map(u => `<tr><td><div class="row">${ICM.util.avatar(u.nome, null, 'sm')}<b>${esc(u.nome)}</b></div></td><td class="small">${esc(u.email)}</td><td>${ui().badge(ICM.C.PAPEIS[u.papel].nome, u.papel === 'admin' ? 'danger' : u.papel === 'professor' ? '' : 'neutral')}</td><td class="small">${esc(u.cargo || '')}</td><td>${u.ativo ? ui().badge('Ativo', 'ok', true) : ui().badge('Bloqueado', 'danger', true)}</td>
          <td style="text-align:right"><button class="btn btn-sm" data-edit="${esc(u.id)}">${I('edit', 14)} Editar</button></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="card mt-6"><div class="section-title">${I('shield', 18)} Matriz de permissões</div><div class="table-wrap"><table class="table"><thead><tr><th>Permissão</th>${Object.values(ICM.C.PAPEIS).map(p => `<th style="text-align:center">${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>
        ${Object.entries(ICM.C.PERMISSOES).map(([k, roles]) => `<tr><td class="small bold">${esc(PERM_TXT[k] || k)}</td>${Object.keys(ICM.C.PAPEIS).map(r => `<td style="text-align:center">${roles.includes(r) ? `<span style="color:var(--ok)">${I('check', 18)}</span>` : `<span class="muted">${I('x', 16)}</span>`}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div></div>`;
    el.querySelector('[data-new]').addEventListener('click', () => form());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(u => u.id === b.dataset.edit))));

    function form(u = {}) {
      const F = o => ui().field(o);
      const m = ui().modal({
        title: u.id ? 'Editar usuário' : 'Novo usuário',
        body: `<form class="grid grid-2">
          ${F({ name: 'nome', label: 'Nome completo', value: u.nome, required: true, cls: 'span-2' })}
          ${F({ name: 'email', label: 'E-mail (login)', type: 'email', value: u.email, required: true })}
          ${F({ name: 'telefone', label: 'Telefone', value: u.telefone })}
          ${F({ name: 'papel', label: 'Perfil de acesso', type: 'select', value: u.papel || 'professor', options: Object.entries(ICM.C.PAPEIS).map(([k, v]) => [k, v.nome]) })}
          ${F({ name: 'cargo', label: 'Cargo / função', value: u.cargo })}
          ${ICM.auth.modo === 'supabase' ? (u.id ? '' : '<p class="small span-2">A pessoa receberá acesso pelo <b>Primeiro acesso</b> na tela de login, usando este e-mail, e criará a própria senha.</p>') : F({ name: 'senha', label: u.id ? 'Nova senha (opcional)' : 'Senha inicial', type: 'password', hint: 'Mínimo 8 caracteres com letras e números. Na versão final, o usuário recebe convite por e-mail e define a própria senha.', attrs: 'autocomplete="new-password"' })}
          ${F({ name: 'ativo', label: 'Acesso ativo', type: 'toggle', value: u.id ? u.ativo : true })}
        </form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        if (u.id === ICM.auth.user().id && !d.ativo) { ui().toast('Você não pode bloquear o próprio acesso.', 'warn'); return; }
        await ui().run(() => ICM.api.usuarios.save(u.id ? { ...u, ...d } : d), 'Usuário salvo');
        m.close(); ICM.app.reload();
      }).catch(() => { }));
    }
  };

  const PERM_TXT = {
    'alunos.ver_todos': 'Ver todos os alunos', 'alunos.editar': 'Matricular e editar alunos', 'alunos.sensivel': 'Ver dados sociais, financeiros e de saúde',
    'projetos.editar': 'Criar e editar projetos', 'turmas.editar': 'Criar e editar turmas', 'turmas.alunos': 'Incluir/retirar alunos de turmas',
    'aulas.registrar': 'Registrar aulas, chamada e fotos', 'ocorrencias.registrar': 'Registrar ocorrências', 'eventos.editar': 'Criar e editar eventos',
    'relatorios.gerais': 'Relatórios de projeto e da OSC', 'usuarios.gerenciar': 'Gerenciar usuários e configurações', 'auditoria.ver': 'Ver auditoria',
    'patrimonio.editar': 'Cadastrar bens, baixa e manutenção', 'patrimonio.emprestar': 'Emprestar e receber bens', 'patrimonio.valores': 'Ver valores e notas fiscais do patrimônio',
    'espera.gerir': 'Lista de espera e triagem', 'reunioes.gerir': 'Reuniões de pais (presença e ata)', 'voluntarios.gerir': 'Voluntários e horas',
    'certificados.emitir': 'Emitir e revogar certificados', 'doadores.gerir': 'Doadores, doações e recibos', 'associados.gerir': 'Associados e mensalidades',
    'pesquisas.gerir': 'Criar pesquisas de satisfação', 'agenda.reservar': 'Reservar espaços e insumos', 'agenda.gerir': 'Cadastrar espaços e insumos'
  };

  // ---------- Configurações ----------
  ICM.pages.config = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Configurações']]);
    const cfg = await ICM.api.config.get();
    const admin = ICM.auth.can('usuarios.gerenciar');
    const user = ICM.auth.user();
    const kb = Math.round(ICM.store.usage() / 1024);
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Configurações</h1><div class="page-sub">Preferências, regras e segurança</div></div></div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('user', 18)} Minha conta</div>
          ${ui().kv([['Nome', user.nome], ['E-mail', user.email], ['Perfil', ICM.C.PAPEIS[user.papel].nome], ['Cargo', user.cargo]])}
          <div class="row mt-4"><label class="toggle"><input type="checkbox" data-dark ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}><span class="track"></span><span>Modo escuro</span></label></div></div>
        <div class="card"><div class="section-title">${I('userCheck', 18)} Regra de assiduidade</div>
          <form class="grid grid-2" data-assid>
            ${ui().field({ name: 'alerta', label: 'Faltas no mês para ALERTA', type: 'number', value: cfg.assiduidade.alerta, attrs: `min="1" ${admin ? '' : 'disabled'}` })}
            ${ui().field({ name: 'desligamento', label: 'Faltas no mês para DESLIGAMENTO', type: 'number', value: cfg.assiduidade.desligamento, attrs: `min="1" ${admin ? '' : 'disabled'}` })}
          </form>
          ${admin ? `<button class="btn btn-primary mt-4" data-saveassid>${I('check', 18)} Salvar regra</button>` : '<div class="xs muted mt-2">Somente administradores alteram esta regra.</div>'}</div>
        <div class="card span-all"><div class="section-title">${I('shield', 18)} Segurança e privacidade</div>
          <div class="grid grid-3">
            ${sec('lock', 'Sessão protegida', `Logout automático após ${ICM.auth.IDLE_MIN} min sem uso; bloqueio temporário após 5 tentativas de senha erradas.`)}
            ${sec('key', 'Acesso por perfil', 'Professores só veem as próprias turmas e a ficha de emergência dos alunos. Dados sociais, financeiros e de saúde ficam restritos.')}
            ${sec('history', 'Auditoria', 'Toda ação (login, matrícula, edição, visualização de dados sensíveis, relatórios) fica registrada com usuário e horário.')}
            ${sec('shield', 'Proteção contra invasão', 'Política de segurança de conteúdo (CSP) bloqueia scripts externos; todo texto é sanitizado antes de exibir.')}
            ${sec('image', 'Fotos seguras', 'Imagens são reduzidas e têm metadados (GPS) removidos antes de salvar; autorização de imagem é sinalizada.')}
            ${sec('fileText', 'Relatórios autenticados', 'Cada relatório recebe um código de autenticidade e fica registrado na auditoria.')}
          </div>
          <div class="sens-lock mt-4">${I('info', 18)} Protótipo: os dados de demonstração ficam neste navegador (${kb} KB). Na conexão com o Supabase, os dados passam para o banco com criptografia, políticas RLS e backups — nada sensível ficará no navegador.</div>
          ${admin ? `<div class="row mt-4"><button class="btn btn-danger" data-reset>${I('refresh', 18)} Restaurar dados de demonstração</button></div>` : ''}
        </div>
      </div></div>`;
    el.querySelector('[data-dark]').addEventListener('change', () => document.querySelector('[data-theme-toggle]').click());
    const sa = el.querySelector('[data-saveassid]');
    if (sa) sa.addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(el.querySelector('[data-assid]'));
      if (!(d.alerta >= 1 && d.desligamento > d.alerta)) { ui().toast('O número para desligamento deve ser maior que o de alerta.', 'warn'); return; }
      await ui().run(() => ICM.api.config.set({ assiduidade: { ...cfg.assiduidade, ...d } }), 'Regra atualizada');
      ICM.app.refreshAlerts();
    }).catch(() => { }));
    const rs = el.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Restaurar demonstração', text: 'Todos os dados deste navegador serão substituídos pelos dados fictícios de demonstração. Continuar?', ok: 'Restaurar', danger: true }))) return;
      await ICM.store.reset(); ICM.auth.logout('Dados de demonstração restaurados.');
    });
  };
  function sec(ic, t, d) { return `<div class="card flat"><div class="row bold">${I(ic, 18)} ${esc(t)}</div><div class="small muted mt-2">${esc(d)}</div></div>`; }

  // ---------- Auditoria ----------
  ICM.pages.auditoria = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Auditoria']]);
    const list = await ICM.api.auditoria.list();
    let q = '';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Auditoria</h1><div class="page-sub">Registro de todas as ações realizadas no sistema</div></div>
        <div class="input-icon" style="width:300px">${I('search', 18)}<input class="input" data-q placeholder="Filtrar por usuário, ação ou texto"></div></div>
      <div class="card"><div data-l></div></div></div>`;
    const ACOES = { login: 'Login', logout: 'Logout', criar: 'Criação', editar: 'Edição', excluir: 'Exclusão', matricular: 'Matrícula', incluir_turma: 'Inclusão em turma', retirar_turma: 'Saída de turma', visualizar_sensivel: 'Acesso a dado sensível', gerar_relatorio: 'Relatório gerado', seed: 'Sistema' };
    const draw = () => {
      const l = list.filter(a => !q || JSON.stringify(a).toLowerCase().includes(q)).slice(0, 300);
      el.querySelector('[data-l]').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>
        ${l.map(a => `<tr><td class="small">${esc(new Date(a.em).toLocaleString('pt-BR'))}</td><td class="small bold">${esc(a.usuario_nome || a.usuario_id)}</td><td>${ui().badge(ACOES[a.acao] || a.acao, a.acao === 'excluir' ? 'danger' : a.acao === 'visualizar_sensivel' ? 'warn' : 'neutral')}</td><td class="small">${esc(a.resumo)}</td></tr>`).join('')}
      </tbody></table></div><div class="xs muted mt-2">${list.length} registros${l.length < list.length ? ' (exibindo até 300)' : ''}</div>` : ui().empty('Nada encontrado', 'shield');
    };
    el.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { q = e.target.value.toLowerCase(); draw(); }, 200));
    draw();
  };
  void fmtDate;
})();
