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
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Permissões</th><th>Situação</th><th></th></tr></thead><tbody>
        ${list.map(u => { const p = u.permissoes || {}, ne = (p.extra || []).length, nb = (p.bloqueadas || []).length; return `<tr><td><div class="row">${ICM.util.avatar(u.nome, null, 'sm')}<div><b>${esc(u.nome)}</b>${u.cargo ? `<div class="xs muted">${esc(u.cargo)}</div>` : ''}</div></div></td><td class="small">${esc(u.email)}</td><td>${ui().badge(ICM.C.PAPEIS[u.papel].nome, u.papel === 'admin' ? 'danger' : u.papel === 'professor' ? '' : 'neutral')}${u.da_aulas && u.papel !== 'professor' ? ' ' + ui().badge('Dá aulas', '') : ''}</td>
          <td>${ne || nb ? `${ne ? ui().badge(`+${ne} liberada${ne > 1 ? 's' : ''}`, 'ok') : ''} ${nb ? ui().badge(`−${nb} bloqueada${nb > 1 ? 's' : ''}`, 'danger') : ''}` : '<span class="xs muted">Padrão do perfil</span>'}</td>
          <td>${u.convite ? ui().badge('Convite enviado', 'warn', true) : u.ativo ? ui().badge('Ativo', 'ok', true) : ui().badge('Bloqueado', 'danger', true)}</td>
          <td style="text-align:right;white-space:nowrap">${u.papel !== 'admin' ? `<button class="btn btn-sm" data-perm="${esc(u.id)}">${I('shield', 14)} Permissões</button> ` : ''}<button class="btn btn-sm" data-edit="${esc(u.id)}">${I('edit', 14)} Editar</button></td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="card mt-6"><div class="card-head"><div><div class="section-title" style="margin:0">${I('shield', 18)} Padrão de cada perfil</div><div class="card-sub">O que cada perfil faz de fábrica. Para liberar ou bloquear algo só para uma pessoa, use o botão <b>Permissões</b> ao lado do nome dela.</div></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Permissão</th>${Object.values(ICM.C.PAPEIS).map(p => `<th style="text-align:center">${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>
        ${ICM.C.PERM_GRUPOS.map(g => `<tr><td colspan="${1 + Object.keys(ICM.C.PAPEIS).length}" style="background:var(--surface-2);font-weight:800">${I(g.icon, 16)} ${esc(g.nome)}</td></tr>` + g.itens.map(([k, nome]) => { const roles = ICM.C.PERMISSOES[k] || []; return `<tr><td class="small">${esc(nome)}${ICM.C.PERM_SO_PERFIL.has(k) ? ' <span class="xs muted">(só pelo perfil)</span>' : ''}</td>${Object.keys(ICM.C.PAPEIS).map(r => `<td style="text-align:center">${roles.includes(r) ? `<span style="color:var(--ok)">${I('check', 18)}</span>` : `<span class="muted">${I('x', 16)}</span>`}</td>`).join('')}</tr>`; }).join('')).join('')}
      </tbody></table></div></div></div>`;
    el.querySelector('[data-new]').addEventListener('click', () => form());
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(u => u.id === b.dataset.edit))));
    el.querySelectorAll('[data-perm]').forEach(b => b.addEventListener('click', () => permissoes(list.find(u => u.id === b.dataset.perm))));

    // ---------- Permissões de um usuário: padrão do perfil + liberar / bloquear item a item ----------
    function permissoes(u) {
      const p0 = u.permissoes || {};
      const extra = new Set(p0.extra || []), bloq = new Set(p0.bloqueadas || []);
      const papel = ICM.C.PAPEIS[u.papel].nome;
      let soMudancas = false, busca = '';
      const efetiva = k => ICM.C.temPerm({ papel: u.papel, permissoes: { extra: [...extra], bloqueadas: [...bloq] } }, k);
      const m = ui().modal({
        title: `Permissões de ${u.nome}`, size: 'wide',
        body: `<div class="col">
          <div class="small">Perfil <b>${esc(papel)}</b>. Cada item começa no <b>padrão do perfil</b>; você pode <b style="color:var(--ok)">liberar</b> algo a mais ou <b style="color:var(--danger)">bloquear</b> algo só para esta pessoa. ${u.papel === 'professor' ? 'O que for liberado para um professor vale para o sistema todo, não só para as turmas dele.' : ''}</div>
          <div class="row wrap"><input class="input" data-busca placeholder="Procurar permissão…" style="max-width:280px"><label class="check"><input type="checkbox" data-so> Mostrar só o que foi alterado</label><span class="grow"></span><span class="small" data-resumo></span></div>
          <div data-lista class="col" style="gap:14px"></div>
          <div class="xs muted">${I('info', 14)} Itens marcados "só pelo perfil" dependem do perfil da pessoa (para eles, troque o perfil em Editar). A mudança vale no próximo login da pessoa.</div>
        </div>`,
        foot: `<button class="btn btn-ghost" data-reset style="margin-right:auto">${I('refresh', 16)} Voltar tudo ao padrão</button><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar permissões</button>`
      });
      const seg = (k, est, dis) => `<div class="seg" role="group" style="display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;${dis ? 'opacity:.45;pointer-events:none' : ''}">
        ${[['padrao', 'Padrão', ''], ['liberar', 'Liberar', 'var(--ok)'], ['bloquear', 'Bloquear', 'var(--danger)']].map(([v, t, c]) => `<button type="button" data-k="${esc(k)}" data-v="${v}" style="border:0;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;background:${est === v ? (c || 'var(--primary)') : 'transparent'};color:${est === v ? '#fff' : 'var(--text-2)'}">${t}</button>`).join('')}</div>`;
      function draw() {
        const q = busca.toLowerCase();
        m.$('[data-lista]').innerHTML = ICM.C.PERM_GRUPOS.map(g => {
          const itens = g.itens.filter(([k, nome, desc]) => (!q || (nome + ' ' + desc).toLowerCase().includes(q)) && (!soMudancas || extra.has(k) || bloq.has(k)));
          if (!itens.length) return '';
          return `<div class="card flat" style="padding:12px 14px"><div class="bold mb-2">${I(g.icon, 16)} ${esc(g.nome)}</div>
            ${itens.map(([k, nome, desc]) => {
              const padrao = (ICM.C.PERMISSOES[k] || []).includes(u.papel), so = ICM.C.PERM_SO_PERFIL.has(k);
              const est = extra.has(k) ? 'liberar' : bloq.has(k) ? 'bloquear' : 'padrao', ok = efetiva(k);
              const faltam = (ICM.C.PERM_DEPENDE[k] || []).filter(d => !efetiva(d));
              return `<div class="row wrap" style="padding:8px 0;border-top:1px solid var(--line-2);gap:10px">
                <div class="grow" style="min-width:220px"><div class="small bold">${esc(nome)}</div>
                  <div class="xs muted">${padrao ? `No padrão de ${esc(papel)}` : `Fora do padrão de ${esc(papel)}`}${desc ? ' · ' + esc(desc) : ''}${so ? ' · <b>só pelo perfil</b>' : ''}${faltam.length && (padrao || extra.has(k)) ? ` · <span style="color:var(--warn)">precisa de: ${faltam.map(d => esc(ICM.C.permNome(d))).join(', ')}</span>` : ''}</div></div>
                <span style="width:92px;text-align:center">${ok ? ui().badge('Tem acesso', 'ok') : ui().badge('Sem acesso', 'neutral')}</span>
                ${seg(k, est, so)}</div>`;
            }).join('')}</div>`;
        }).join('') || '<div class="small muted">Nada encontrado.</div>';
        m.$('[data-resumo]').innerHTML = `${extra.size ? `<b style="color:var(--ok)">+${extra.size} liberada(s)</b>` : ''} ${bloq.size ? `<b style="color:var(--danger)">−${bloq.size} bloqueada(s)</b>` : ''}` || 'Igual ao padrão do perfil';
        if (!extra.size && !bloq.size) m.$('[data-resumo]').textContent = 'Igual ao padrão do perfil';
      }
      m.$('[data-lista]').addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        const k = b.dataset.k, v = b.dataset.v, padrao = (ICM.C.PERMISSOES[k] || []).includes(u.papel);
        extra.delete(k); bloq.delete(k);
        if (v === 'liberar') {
          if (padrao) ui().toast('Já faz parte do padrão do perfil.', 'info');
          else {
            extra.add(k);
            // libera junto o que ela precisa para funcionar
            const add = []; const dep = x => (ICM.C.PERM_DEPENDE[x] || []).forEach(d => { if (!(ICM.C.PERMISSOES[d] || []).includes(u.papel) && !extra.has(d) && !ICM.C.PERM_SO_PERFIL.has(d)) { extra.add(d); bloq.delete(d); add.push(ICM.C.permNome(d)); dep(d); } else if (bloq.has(d)) { bloq.delete(d); add.push(ICM.C.permNome(d)); } });
            dep(k); if (add.length) ui().toast('Liberado junto, porque é necessário: ' + add.join(', '), 'info');
          }
        }
        if (v === 'bloquear') { if (!padrao) ui().toast('Fora do padrão do perfil: a pessoa já não tem. Bloquear garante que continue sem.', 'info'); bloq.add(k); }
        draw();
      });
      m.$('[data-busca]').addEventListener('input', e => { busca = e.target.value; draw(); });
      m.$('[data-so]').addEventListener('change', e => { soMudancas = e.target.checked; draw(); });
      m.$('[data-reset]').addEventListener('click', () => { extra.clear(); bloq.clear(); draw(); });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const permissoes = { extra: [...extra].sort(), bloqueadas: [...bloq].sort() };
        await ui().run(() => ICM.api.usuarios.save({ ...u, permissoes }), 'Permissões salvas');
        ICM.api.audit('permissoes', 'usuarios', u.id, `Permissões de ${u.nome}: ${permissoes.extra.length ? 'liberou ' + permissoes.extra.map(ICM.C.permNome).join(', ') : ''}${permissoes.extra.length && permissoes.bloqueadas.length ? '; ' : ''}${permissoes.bloqueadas.length ? 'bloqueou ' + permissoes.bloqueadas.map(ICM.C.permNome).join(', ') : ''}${!permissoes.extra.length && !permissoes.bloqueadas.length ? 'voltou ao padrão do perfil' : ''}`).catch(() => { });
        m.close(); ICM.app.reload();
      }).catch(() => { }));
      draw();
    }

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
          ${ICM.auth.modo === 'supabase' ? F({ name: 'exige_2fa', label: 'Exigir verificação em duas etapas (código no celular)', type: 'toggle', value: u.exige_2fa, cls: 'span-2' }) + '<p class="xs muted span-2" style="margin-top:-6px">Administradores sempre usam duas etapas. Marque também para quem lida com dados sensíveis (coordenação, secretaria/social).</p>' : ''}
          ${F({ name: 'da_aulas', label: 'Também dá aulas (aparece na lista de professores ao cadastrar turmas)', type: 'toggle', value: u.da_aulas, cls: 'span-2' })}
          ${F({ name: 'opera_van', label: 'Opera a van (inicia e encerra rotas no App do Instituto)', type: 'toggle', value: u.opera_van, cls: 'span-2' })}
          ${F({ name: 'ativo', label: 'Acesso ativo', type: 'toggle', value: u.id ? u.ativo : true })}
        </form>`,
        foot: `${u.id && u.id !== ICM.auth.user().id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} ${u.convite ? 'Cancelar convite' : 'Excluir usuário'}</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
      });
      const del = m.$('[data-del]');
      if (del) del.addEventListener('click', async () => {
        const txt = u.convite
          ? `Cancelar o convite de ${u.nome} (${u.email})? A pessoa não conseguirá mais criar o acesso pelo "Primeiro acesso".`
          : `Excluir ${u.nome} (${u.email})? O login é apagado de vez e não dá para desfazer. O que essa pessoa já registrou (aulas, chamadas, histórico) continua no sistema. Se for só para impedir o acesso por um tempo, desligue "Acesso ativo" em vez de excluir.`;
        if (!(await ui().confirm({ title: u.convite ? 'Cancelar convite' : 'Excluir usuário', text: txt, ok: u.convite ? 'Cancelar convite' : 'Excluir de vez', danger: true }))) return;
        try { await ui().run(() => ICM.api.usuarios.excluir(u.id), u.convite ? 'Convite cancelado' : 'Usuário excluído'); m.close(); ICM.app.reload(); } catch (er) { /* aviso já mostrado */ }
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
        ${ICM.auth.modo === 'supabase' ? `<div class="card"><div class="section-title">${I('shield', 18)} Verificação em duas etapas</div>
          <div class="small muted">Além da senha, um código do aplicativo autenticador no celular (Google ou Microsoft Authenticator).${user.papel === 'admin' || user.exige_2fa ? ' <b>Obrigatória para o seu perfil.</b>' : ''}</div>
          <div class="col mt-4" data-fatores><div class="small muted">Carregando…</div></div>
          <button class="btn mt-4" data-novofator>${I('plus', 16)} Cadastrar outro aparelho</button></div>` : ''}
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
          ${ICM.store.modo === 'supabase' ? `<div class="sens-lock mt-4">${I('lock', 18)} Dados no banco Supabase com regras de acesso (RLS) por perfil. Fotos e anexos ficam em pasta privada e só abrem por link temporário de 1 hora.</div>` : ''}
          ${ICM.store.modo === 'supabase' ? '' : `<div class="sens-lock mt-4">${I('info', 18)} Demonstração: os dados fictícios ficam neste navegador (${kb} KB). Nada real deve ser lançado aqui.</div>`}
          ${admin && ICM.store.modo !== 'supabase' ? `<div class="row mt-4"><button class="btn btn-danger" data-reset>${I('refresh', 18)} Restaurar dados de demonstração</button></div>` : ''}
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
    const fat = el.querySelector('[data-fatores]');
    if (fat) {
      const carregar = async () => {
        const l = (await ICM.auth.mfa.fatores()).filter(x => x.status === 'verified');
        fat.innerHTML = l.length ? l.map(x => `<div class="list-item">${I('key', 18)}<div class="grow"><div class="bold">${esc(x.friendly_name || 'Aparelho')}</div><div class="xs muted">Ativo desde ${esc(new Date(x.created_at).toLocaleDateString('pt-BR'))}</div></div><button class="btn btn-sm btn-ghost" data-rmfator="${esc(x.id)}">${I('trash', 14)} Remover</button></div>`).join('') : '<div class="small muted">Nenhum aparelho cadastrado.</div>';
        fat.querySelectorAll('[data-rmfator]').forEach(b => b.addEventListener('click', async () => {
          if (!(await ui().confirm({ title: 'Remover aparelho', text: 'Este celular deixará de gerar códigos para entrar. Continuar?', ok: 'Remover', danger: true }))) return;
          await ui().run(() => ICM.auth.mfa.remover(b.dataset.rmfator), 'Aparelho removido').catch(() => { }); carregar();
        }));
      };
      carregar().catch(e => { fat.innerHTML = `<div class="small muted">${esc(e.message)}</div>`; });
      el.querySelector('[data-novofator]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const fator = await ui().run(() => ICM.auth.mfa.iniciarCadastro());
        const m = ui().modal({ title: 'Cadastrar aparelho', size: 'sm',
          body: `<form class="col"><p class="small">No aplicativo autenticador do novo celular, toque em <b>+</b> e escaneie:</p><div style="background:#fff;border-radius:14px;padding:10px;width:200px;margin:0 auto"><img src="${esc(fator.qr)}" alt="QR Code" width="180" height="180"></div><details class="small"><summary>Digitar a chave</summary><code style="word-break:break-all">${esc(fator.segredo)}</code></details>${ui().field({ name: 'codigo', label: 'Código de 6 dígitos', attrs: 'inputmode="numeric" maxlength="7"' })}</form>`,
          foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Confirmar</button>` });
        m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => { await ui().run(() => ICM.auth.mfa.confirmarCadastro(fator.id, m.$('[name=codigo]').value), 'Aparelho cadastrado'); m.close(); carregar(); }).catch(() => { }));
      }).catch(() => { }));
    }
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
