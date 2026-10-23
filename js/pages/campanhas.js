/* Arrecadação online: campanhas com termômetro, página pública de doação com Pix (BR Code)
   e confirmação das doações recebidas. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;
  const linkDoar = id => `${location.origin}${location.pathname}#/doar${id ? '/' + id : ''}`;

  const termometro = c => `<div class="termo"><div class="row between small"><b>${esc(money(c.arrecadado))}</b><span class="muted">${c.meta ? `meta ${esc(money(c.meta))}` : `${c.doadores} doação(ões)`}</span></div>${c.meta ? `<div class="progress mt-2 ok" style="height:14px"><span style="width:${c.pct}%"></span></div><div class="xs muted mt-2">${c.pct}% · ${c.doadores} doador(es) · até ${esc(fmtDate(c.fim))}</div>` : ''}</div>`;

  // ---------- Painel da equipe ----------
  ICM.pages.campanhas = async function (el) {
    if (!ICM.auth.can('campanhas.gerir')) { el.innerHTML = ui().empty('Acesso restrito.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Campanhas e doação online']]);
    const cs = await ICM.api.captacao.campanhas();
    const pend = await ICM.api.captacao.doacoesOnline({ status: 'aguardando' });
    const conf = await ICM.api.captacao.doacoesOnline({ status: 'confirmada' });
    const pix = await ICM.api.captacao.configPix();
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Campanhas e doação online</h1><div class="page-sub">Página pública de doação com Pix, campanhas com meta e confirmação das doações</div></div>
        <div class="row wrap"><a class="btn" href="${esc(linkDoar())}" target="_blank" rel="noopener">${I('eye', 18)} Ver página de doação</a><button class="btn" data-pix>${I('key', 18)} Chave Pix</button><button class="btn btn-primary" data-nova>${I('plus', 18)} Nova campanha</button></div></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('heart', '#ec4899', conf.length, 'Doações online confirmadas')}
        ${ICM.pages._stat('dollar', '#10b981', Math.round(conf.reduce((s, d) => s + d.valor, 0)), 'Arrecadado online (R$)')}
        ${ICM.pages._stat('refresh', '#8b5cf6', conf.filter(d => d.recorrente).length, 'Doadores mensais')}
        ${ICM.pages._stat('clock', '#f59e0b', pend.length, 'Aguardando confirmação')}
      </div>
      ${!pix.chave ? `<div class="sens-lock mb-4">${I('alert', 16)} Cadastre a chave Pix da instituição para a página de doação funcionar.</div>` : ''}
      ${pend.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(245,158,11,.4),var(--sh-out)"><div class="card-head"><div><div class="card-title">${I('clock', 18)} Confirme as doações que caíram na conta</div><div class="card-sub">Confira no extrato do banco pelo valor e pelo identificador (txid). Ao confirmar: cria o doador, o recibo e a receita no Financeiro.</div></div></div>
        ${pend.map(d => `<div class="list-item"><div class="grow"><b>${esc(d.nome)}</b> — ${esc(money(d.valor))}${d.recorrente ? ' <span class="badge">mensal</span>' : ''}<div class="xs muted">${esc((cs.find(c => c.id === d.campanha_id) || {}).titulo || '')} · ${esc(new Date(d.criado_em).toLocaleString('pt-BR'))} · txid ${esc(d.txid)}</div></div><button class="btn btn-sm btn-ghost" data-canc="${esc(d.id)}">Não recebido</button><button class="btn btn-sm btn-primary" data-conf="${esc(d.id)}">${I('check', 14)} Confirmar</button></div>`).join('')}</div>` : ''}
      <div class="grid grid-3 stagger">${cs.map(c => `<div class="card project-card" style="--c:${c.cor || '#2563eb'}"><div class="row between">${c.ativa && c.fim >= ICM.util.today() ? ui().badge('No ar', 'ok', true) : ui().badge('Encerrada', 'neutral', true)}<button class="btn btn-icon btn-sm btn-ghost" data-ed="${esc(c.id)}">${I('edit', 14)}</button></div>
        <div class="name">${esc(c.titulo)}</div><div class="small muted">${esc(c.descricao || '')}</div>${termometro(c)}
        <div class="row wrap"><button class="btn btn-sm" data-link="${esc(c.id)}">${I('upload', 14)} Divulgar</button></div></div>`).join('')}</div>
      <div class="card mt-6 small muted">${I('info', 16)} <b>Como funciona hoje:</b> o doador escolhe o valor e recebe um Pix "copia e cola" e QR Code no padrão do Banco Central, com a chave da instituição. Você confirma quando cair no extrato. <b>Com o Supabase + um meio de pagamento (Asaas, Mercado Pago ou o banco)</b>, a confirmação fica automática e entram cartão, boleto e <b>Pix Automático</b> para doação mensal.</div></div>`;
    const on = (s, fn) => el.querySelectorAll(s).forEach(b => b.addEventListener('click', () => fn(b)));
    on('[data-nova]', () => form({}));
    on('[data-ed]', b => form(cs.find(c => c.id === b.dataset.ed)));
    on('[data-conf]', async b => { await ui().run(() => ICM.api.captacao.confirmar(b.dataset.conf), 'Doação confirmada — doador, recibo e receita criados'); ICM.app.reload(); });
    on('[data-canc]', async b => { if (await ui().confirm({ title: 'Doação não recebida', text: 'Marcar como não recebida (cancelada)?', ok: 'Marcar' })) { await ICM.api.captacao.cancelar(b.dataset.canc); ICM.app.reload(); } });
    on('[data-pix]', () => { const F = o => ui().field(o); const m = ui().modal({ title: 'Chave Pix da instituição', size: 'sm', body: `<form class="col">${F({ name: 'chave', label: 'Chave Pix (CNPJ, e-mail, telefone ou aleatória)', value: pix.chave })}${F({ name: 'nome', label: 'Nome do recebedor (como no banco)', value: pix.nome })}${F({ name: 'cidade', label: 'Cidade', value: pix.cidade })}</form><div class="xs muted mt-2">Use preferencialmente a chave CNPJ da conta movimento da instituição.</div>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` }); m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.captacao.salvarPix(ICM.util.formData(m.$('form'))), 'Chave Pix salva'); m.close(); ICM.app.reload(); }); });
    on('[data-link]', b => { const c = cs.find(x => x.id === b.dataset.link); const url = linkDoar(c.id); ui().modal({ title: 'Divulgar campanha', size: 'sm', body: `<div style="text-align:center"><div style="width:200px;margin:0 auto">${ICM.reports.qrSvg(url)}</div><div class="small mt-4" style="word-break:break-all">${esc(url)}</div><p class="xs muted mt-2">Use o QR Code em cartazes e eventos, e o link no WhatsApp e redes sociais.</p></div>` }); });

    function form(c) {
      const F = o => ui().field(o);
      ICM.api.projetos.list().then(projetos => {
        const m = ui().modal({ title: c.id ? 'Editar campanha' : 'Nova campanha', body: `<form class="grid grid-2">${F({ name: 'titulo', label: 'Título', value: c.titulo, required: true, cls: 'span-2' })}${F({ name: 'descricao', label: 'Descrição (aparece para o doador)', type: 'textarea', rows: 3, value: c.descricao, cls: 'span-2' })}${F({ name: 'meta', label: 'Meta (R$) — 0 = sem meta', type: 'number', value: c.meta ?? 0 })}${F({ name: 'projeto_id', label: 'Destino', type: 'select', value: c.projeto_id, options: [['', 'Institucional'], ...projetos.map(p => [p.id, p.nome])] })}${F({ name: 'inicio', label: 'Início', type: 'date', value: c.inicio || ICM.util.today() })}${F({ name: 'fim', label: 'Fim', type: 'date', value: c.fim || ICM.util.addDays(ICM.util.today(), 30) })}${F({ name: 'cor', label: 'Cor', type: 'color', value: c.cor || '#2563eb' })}${F({ name: 'ativa', label: 'No ar', type: 'toggle', value: c.ativa !== false })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
        m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.captacao.salvarCampanha({ ...c, ...ICM.util.formData(m.$('form')), arrecadado: undefined, doadores: undefined, pct: undefined }), 'Campanha salva'); m.close(); ICM.app.reload(); });
      });
    }
  };

  // ---------- Página pública de doação ----------
  ICM.pages.doar = async function (root, campanhaId) {
    document.title = 'Doe para o Instituto ICM';
    const cs = await ICM.api.captacao.campanhas({ publicas: true });
    const sel = cs.find(c => c.id === campanhaId) || null;
    const wrap = inner => `<div class="portal"><div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o3"></div></div>
      <header class="portal-head glass"><div class="row">${ICM.logo(56)}<div><b>Doe para o ${esc(ICM.C.ORG.nome)}</b><div class="xs muted">Cultura · Esporte · Meio ambiente · Educação · Saúde</div></div></div>${campanhaId ? `<a class="btn btn-sm" href="#/doar">${I('arrowLeft', 14)} Campanhas</a>` : ''}</header><main class="portal-main page">${inner}</main></div>`;
    if (!sel) {
      root.innerHTML = wrap(`<div style="text-align:center" class="mb-4"><h1 class="login-title" style="font-size:32px">Transforme vidas com a gente 💙</h1><p class="muted mt-2">Escolha uma campanha. Toda doação gera recibo e é aplicada com transparência.</p></div>
        <div class="grid grid-2 stagger">${cs.map(c => `<a class="card hoverable project-card" style="--c:${c.cor || '#2563eb'};color:inherit" href="#/doar/${esc(c.id)}"><div class="name">${esc(c.titulo)}</div><div class="small muted">${esc(c.descricao || '')}</div>${termometro(c)}<span class="btn btn-primary">${I('heart', 16)} Quero doar</span></a>`).join('') || ui().empty('Nenhuma campanha no ar', 'heart')}</div>`);
      return;
    }
    root.innerHTML = wrap(`<div class="grid grid-2">
      <div class="card project-card" style="--c:${sel.cor || '#2563eb'}"><div class="name" style="font-size:22px">${esc(sel.titulo)}</div><p class="text-block">${esc(sel.descricao || '')}</p>${termometro(sel)}</div>
      <form class="card" data-f novalidate><div class="section-title">${I('heart', 18)} Sua doação</div>
        <div class="row wrap" data-vals>${[30, 50, 100, 200, 500].map((v, i) => `<button type="button" class="btn ${i === 2 ? 'btn-primary' : ''}" data-v="${v}">${esc(money(v).replace(',00', ''))}</button>`).join('')}</div>
        <div class="mt-4">${ui().field({ name: 'valor', label: 'Outro valor (R$)', type: 'number', value: 100, attrs: 'min="5" step="1"' })}</div>
        <label class="toggle mt-4"><input type="checkbox" name="recorrente"><span class="track"></span><span class="small"><b>Quero doar todo mês</b> — enviamos um lembrete com o Pix mensal</span></label>
        <div class="grid grid-2 mt-4">${ui().field({ name: 'nome', label: 'Seu nome', required: true, cls: 'span-2' })}${ui().field({ name: 'email', label: 'E-mail', type: 'email' })}${ui().field({ name: 'telefone', label: 'WhatsApp' })}</div>
        <label class="check mt-4"><input type="checkbox" name="aceita_comunicacao" checked> <span class="small">Aceito receber o recibo e notícias do Instituto (LGPD — você pode cancelar quando quiser).</span></label>
        <div class="login-error mt-2" role="alert"></div>
        <button class="btn btn-primary btn-lg mt-4" style="width:100%" type="submit">${I('heart', 20)} Gerar Pix</button>
      </form></div>`);
    const f = root.querySelector('[data-f]');
    root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { root.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('btn-primary', x === b)); f.valor.value = b.dataset.v; }));
    f.addEventListener('submit', async e => {
      e.preventDefault(); const err = f.querySelector('.login-error'); err.textContent = '';
      try {
        const d = ICM.util.formData(f);
        const r = await ICM.api.captacao.doar({ ...d, campanha_id: sel.id });
        f.outerHTML = `<div class="card" style="text-align:center"><div class="section-title" style="justify-content:center">${I('check', 18)} Quase lá, ${esc(r.nome.split(' ')[0])}!</div><p class="small">Pague <b>${esc(money(r.valor))}</b> pelo app do seu banco:</p>
          <div style="width:230px;margin:12px auto;background:#fff;padding:10px;border-radius:14px">${ICM.reports.qrSvg(r.payload)}</div>
          <div class="small bold">Pix copia e cola</div><textarea class="textarea" rows="3" readonly data-cc style="font-family:monospace;font-size:11px">${esc(r.payload)}</textarea>
          <button class="btn btn-primary mt-2" data-copiar>${I('clipboard', 16)} Copiar código</button>
          <p class="xs muted mt-4">Recebedor: ${esc(r.pix.nome)} · chave ${esc(r.pix.chave)}<br>Assim que o pagamento for confirmado, enviamos o recibo para você. Obrigado! 💙</p></div>`;
        root.querySelector('[data-copiar]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.payload); ui().toast('Código Pix copiado!', 'ok'); } catch (er) { root.querySelector('[data-cc]').select(); } });
      } catch (ex) { err.textContent = ex.message; }
    });
  };
})();
