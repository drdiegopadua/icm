/* Portal da Família: o responsável acompanha frequência, agenda, avisos, certificados e assina documentos */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;
  const tema = () => `<button class="theme-fab" data-theme-toggle aria-label="Alternar tema">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 22)}</button>`;

  ICM.pages.portal = async function (root) {
    document.title = 'Portal da Família · ICM';
    if (ICM.api.portal.sessao()) return painel(root);
    root.innerHTML = `<div class="login-screen"><div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o2"></div><div class="orb ring o3"></div><div class="orb o4"></div></div>${tema()}
      <div class="login-card"><div class="login-logo">${ICM.logo(104, true)}</div>
        <h1 class="login-title">Portal da Família</h1><div class="login-sub">Acompanhe seu filho(a)</div>
        <form class="login-form" novalidate>
          <label class="login-input">${I('user', 24)}<input name="matricula" placeholder="Matrícula (ex.: ICM-2026-0003)" autocomplete="username" style="text-transform:uppercase" required></label>
          <label class="login-input">${I('key', 24)}<input name="codigo" placeholder="Código de acesso" autocomplete="current-password" style="text-transform:uppercase" required></label>
          <div class="login-error" role="alert"></div>
          <button class="login-btn" type="submit"><span class="btn-label">Entrar</span><span class="arrow">${I('arrowRight', 22)}</span></button>
          <div class="small muted" style="text-align:center">Não tem o código? Peça na secretaria do Instituto — enviamos pelo WhatsApp.</div>
        </form>
        <a class="btn mt-6" href="#/">${I('arrowLeft', 16)} Sou da equipe</a>
      </div></div>`;
    const f = root.querySelector('form'); const btn = f.querySelector('.login-btn'); const err = f.querySelector('.login-error'); const card = root.querySelector('.login-card');
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; btn.classList.add('is-loading'); btn.disabled = true;
      try { await ICM.api.portal.login(f.matricula.value, f.codigo.value); btn.classList.remove('is-loading'); btn.classList.add('success'); await ICM.util.sleep(500); painel(root); }
      catch (ex) { btn.classList.remove('is-loading'); btn.disabled = false; err.textContent = ex.message; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    });
  };

  async function painel(root) {
    let d;
    try { d = await ICM.api.portal.dados(); } catch (e) { ICM.api.portal.sair(); return ICM.pages.portal(root); }
    const pend = d.assinaturas.filter(a => a.status === 'pendente');
    const alertas = d.freq.filter(f => f.nivel !== 'ok');
    const mensAbertas = d.mensalidades.filter(m => m.status === 'aberta' && m.vencimento < ICM.util.today());
    root.innerHTML = `<div class="portal">
      <div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o3"></div></div>
      <header class="portal-head glass"><div class="row">${ICM.logo(34)}<div><b>Portal da Família</b><div class="xs muted">${esc(ICM.C.ORG.nome)}</div></div></div><div class="row"><button class="btn btn-icon btn-sm" data-theme-toggle aria-label="Tema">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon', 18)}</button><button class="btn btn-sm" data-sair>${I('logout', 16)} Sair</button></div></header>
      <main class="portal-main page">
        <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(d.aluno.nome, d.aluno.foto, 'lg')}<div class="grow"><div class="xs muted bold">Olá, ${esc((d.aluno.responsavel || '').split(' ')[0] || 'família')}! Você está acompanhando</div><h1 class="page-title" style="font-size:26px">${esc(d.aluno.nome)}</h1><div class="meta mt-2"><span>${I('key', 14)} ${esc(d.aluno.matricula)}</span>${d.turmas.map(t => `<span>${I('layers', 14)} ${esc(t.nome)}</span>`).join('')}</div></div></div></div>
        ${pend.length ? `<div class="card mb-4 portal-alert"><div class="row between wrap"><div><b>${I('edit', 16)} ${pend.length} documento(s) aguardando sua assinatura</b><div class="small muted">Assine pelo celular em menos de 2 minutos.</div></div><button class="btn btn-primary" data-ir="docs">Assinar agora</button></div></div>` : ''}
        ${alertas.map(a => `<div class="card mb-4 portal-alert ${a.nivel}"><b>${I('alert', 16)} ${a.faltas_mes} falta(s) este mês em ${esc(a.turma)}</b><div class="small">${a.nivel === 'danger' ? 'Pela regra do projeto, com 3 faltas a vaga pode ser liberada. Procure a coordenação.' : 'Com 2 faltas no mês, acendemos um alerta. A presença é muito importante!'}</div></div>`).join('')}
        ${mensAbertas.length ? `<div class="card mb-4 portal-alert danger"><b>${I('dollar', 16)} Contribuição associativa em aberto: ${mensAbertas.map(m => esc(ICM.util.fmtMonth(m.competencia))).join(', ')}</b><div class="small">Regularize na secretaria ou por PIX.</div></div>` : ''}
        <div class="tabs mb-4">${[['inicio', 'Início', 'home'], ['freq', 'Frequência', 'userCheck'], ['agenda', 'Agenda', 'calendar'], ['avisos', 'Avisos', 'bell'], ['certs', 'Certificados', 'award'], ['docs', 'Documentos', 'edit']].map(([k, n, ic], i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
        <div data-panel></div>
      </main></div>`;
    const panel = root.querySelector('[data-panel]');
    const R = {
      inicio() {
        panel.innerHTML = `<div class="grid grid-2 tab-panel">
          <div class="card"><div class="section-title">${I('layers', 18)} Turmas e horários</div>${d.turmas.map(t => `<div class="list-item"><div class="grow"><b>${esc(t.nome)}</b><div class="xs muted">${esc(ICM.pages._diasTxt(t.dias))} · ${esc(t.inicio)}–${esc(t.fim)} · ${esc(t.local || '')}<br>Professor(a): ${esc(t.professor || '')}</div></div></div>`).join('') || ui().empty('Sem turma ativa', 'layers')}</div>
          <div class="card"><div class="section-title">${I('calendar', 18)} Próximos compromissos</div>${d.agenda.slice(0, 6).map(ag).join('') || ui().empty('Nada agendado', 'calendar')}</div>
          ${d.emprestimos.length ? `<div class="card"><div class="section-title">${I('download', 18)} Bens emprestados</div>${d.emprestimos.map(e => `<div class="list-item"><b class="grow">${e.quantidade}x ${esc(e.item)}</b><span class="xs muted">devolver até ${esc(fmtDate(e.previsao_devolucao))}</span></div>`).join('')}</div>` : ''}
          ${d.associado ? `<div class="card"><div class="section-title">${I('key', 18)} Associação ${esc(d.associado.numero)}</div>${d.mensalidades.map(m => `<div class="list-item"><span class="grow" style="text-transform:capitalize">${esc(ICM.util.fmtMonth(m.competencia))}</span><span class="small">${esc(money(m.valor))}</span>${m.status === 'paga' ? ui().badge('Paga', 'ok') : m.vencimento < ICM.util.today() ? ui().badge('Em atraso', 'danger') : ui().badge('Em aberto', 'warn')}</div>`).join('')}</div>` : ''}
        </div>`;
      },
      freq() {
        panel.innerHTML = `<div class="col tab-panel">${d.freq.map(f => `<div class="card"><div class="card-head"><div><div class="card-title">${esc(f.turma)}</div><div class="card-sub">${f.total} aulas registradas · ${f.faltas_mes} falta(s) este mês</div></div><b style="font-size:24px">${f.freq ?? '—'}%</b></div>
          <div class="progress ${f.freq >= 75 ? 'ok' : 'warn'}"><span style="width:${f.freq || 0}%"></span></div>
          <div class="row wrap mt-4"><span class="badge ok">${f.P} presenças</span><span class="badge danger">${f.F} faltas</span><span class="badge warn">${f.J} justificadas</span></div>
          <div class="section-title mt-4">Últimas aulas</div>${f.ultimas.map(x => `<div class="list-item"><span class="small" style="width:90px">${esc(fmtDate(x.data))}</span><span class="grow small">${esc(x.tema || '')}</span>${x.v === 'P' ? ui().badge('Presente', 'ok') : x.v === 'F' ? ui().badge('Falta', 'danger') : ui().badge('Justificada', 'warn')}</div>`).join('')}</div>`).join('') || ui().empty('Sem frequência registrada', 'userCheck')}</div>`;
      },
      agenda() { panel.innerHTML = `<div class="card tab-panel">${d.agenda.map(ag).join('') || ui().empty('Nada agendado', 'calendar')}</div>`; },
      avisos() { panel.innerHTML = `<div class="card tab-panel">${d.comunicados.map(c => `<div class="list-item" style="align-items:flex-start">${I('bell', 18)}<div class="grow"><b>${esc(c.titulo)}</b><div class="small mt-2">${esc(c.texto)}</div><div class="xs muted mt-2">${esc(fmtDate(c.data))}</div></div></div>`).join('') || ui().empty('Nenhum aviso', 'bell')}</div>`; },
      certs() {
        panel.innerHTML = `<div class="card tab-panel">${d.certificados.map(c => `<div class="list-item">${I('award', 20)}<div class="grow"><b>${esc(c.titulo)}</b><div class="xs muted">${esc(fmtDate(c.data_emissao))}${c.carga_horaria ? ` · ${c.carga_horaria}h` : ''} · código ${esc(c.codigo)}</div></div><button class="btn btn-sm" data-c="${esc(c.id)}">${I('printer', 14)} Ver / imprimir</button></div>`).join('') || ui().empty('Nenhum certificado ainda', 'award')}</div>`;
        panel.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => ICM.reports.certificados(d.certificados.filter(c => c.id === b.dataset.c))));
      },
      docs() {
        panel.innerHTML = `<div class="card tab-panel">${d.assinaturas.filter(a => a.status !== 'cancelado').map(a => `<div class="list-item">${I(a.status === 'assinado' ? 'check' : 'edit', 20)}<div class="grow"><b>${esc(ICM.C.DOCS_ASSINATURA[a.tipo])}</b><div class="xs muted">${a.status === 'assinado' ? `Assinado em ${esc(new Date(a.assinado_em).toLocaleString('pt-BR'))}` : a.status === 'recusado' ? 'Recusado' : `Enviado em ${esc(fmtDate(a.solicitado_em))}`}</div></div>${a.status === 'pendente' ? `<a class="btn btn-sm btn-primary" href="#/assinar/${esc(a.token)}">Assinar</a>` : a.status === 'assinado' ? ui().badge('Assinado', 'ok', true) : ui().badge('Recusado', 'danger', true)}</div>`).join('') || ui().empty('Nenhum documento', 'edit')}</div>`;
      }
    };
    const tabsEl = root.querySelector('.tabs');
    ui().tabs(tabsEl, k => R[k]());
    root.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => tabsEl.querySelector(`[data-tab="${b.dataset.ir}"]`).click()));
    root.querySelector('[data-sair]').addEventListener('click', () => { ICM.api.portal.sair(); ICM.pages.portal(root); });
    R.inicio();
  }
  const ag = a => `<div class="list-item"><div class="avatar sm" style="--c:${a.tipo === 'Aula' ? '#2563eb' : a.tipo === 'Reunião de pais' ? '#10b981' : '#8b5cf6'}">${esc(ICM.util.fmtDateShort(a.data).split(' ')[0])}</div><div class="grow"><b>${esc(a.titulo)}</b><div class="xs muted">${esc(a.tipo)} · ${esc(fmtDate(a.data))} ${a.hora ? '· ' + esc(a.hora) : ''} ${a.local ? '· ' + esc(a.local) : ''}</div></div></div>`;
})();
