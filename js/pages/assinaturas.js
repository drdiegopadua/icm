/* Assinatura digital pelo celular (assinatura eletrônica simples — Lei 14.063/2020):
   o responsável lê o documento, informa nome e CPF e desenha a assinatura com o dedo. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  // ---------- Página pública de assinatura ----------
  ICM.pages.assinar = async function (root, token) {
    document.title = 'Assinatura de documento · ICM';
    const d = await ICM.api.assinaturas.porToken(token);
    const wrap = inner => `<div class="portal"><div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o3"></div></div>
      <header class="portal-head glass"><div class="row">${ICM.logo(34)}<div><b>Assinatura de documento</b><div class="xs muted">${esc(ICM.C.ORG.nome)}</div></div></div><a class="btn btn-sm" href="#/portal">${I('arrowLeft', 16)} Portal da Família</a></header>
      <main class="portal-main page">${inner}</main></div>`;
    if (!d) { root.innerHTML = wrap(`<div class="card">${ui().empty('Link inválido ou expirado.', 'alert')}</div>`); return; }
    if (d.status !== 'pendente') {
      root.innerHTML = wrap(`<div class="card" style="text-align:center">${I(d.status === 'assinado' ? 'check' : 'info', 40)}<h2 class="mt-4">${d.status === 'assinado' ? 'Documento já assinado' : d.status === 'recusado' ? 'Documento recusado' : 'Solicitação cancelada'}</h2><p class="muted mt-2">${esc(d.titulo)} — ${esc(d.aluno.nome)}${d.assinado_em ? `<br>Assinado em ${esc(new Date(d.assinado_em).toLocaleString('pt-BR'))} por ${esc(d.signatario_nome)}` : ''}</p></div>`);
      return;
    }
    root.innerHTML = wrap(`
      <div class="card mb-4"><div class="xs muted bold">DOCUMENTO PARA ASSINATURA</div><h1 class="page-title mt-2" style="font-size:24px">${esc(d.titulo)}</h1><div class="small muted">${esc(ICM.C.ORG.razao)} · CNPJ ${esc(ICM.C.ORG.cnpj)}</div>
        <div class="doc-assin mt-4">${d.html}</div></div>
      <form class="card" novalidate>
        <div class="section-title">${I('edit', 18)} Seus dados</div>
        <div class="grid grid-2">${ui().field({ name: 'nome', label: 'Nome completo do responsável', value: d.aluno.responsavel || '', required: true })}${ui().field({ name: 'cpf', label: 'CPF', required: true, attrs: 'inputmode="numeric" maxlength="14"' })}</div>
        <div class="section-title mt-4">${I('edit', 18)} Assine no quadro abaixo</div>
        <div class="sig-wrap"><canvas class="sig-pad" width="900" height="260"></canvas><div class="sig-line">Assine aqui com o dedo ou o mouse</div></div>
        <div class="row between mt-2"><button type="button" class="btn btn-sm" data-limpar>${I('refresh', 14)} Limpar</button><span class="xs muted">Data e hora serão registradas.</span></div>
        <label class="check mt-4"><input type="checkbox" name="aceite"> <span class="small">Li o documento acima e concordo com seu conteúdo. Reconheço esta assinatura eletrônica como válida (Lei 14.063/2020).</span></label>
        <div class="login-error mt-2" role="alert"></div>
        <div class="row wrap mt-4"><button class="btn btn-primary btn-lg grow" type="submit">${I('check', 20)} Assinar documento</button>${d.tipo === 'imagem' ? `<button type="button" class="btn btn-lg" data-recusar>Não autorizo</button>` : ''}</div>
      </form>`);
    const f = root.querySelector('form'); const err = f.querySelector('.login-error');
    f.cpf.addEventListener('input', e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); e.target.value = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); });
    const pad = signaturePad(root.querySelector('.sig-pad'));
    root.querySelector('[data-limpar]').addEventListener('click', pad.clear);
    const rec = root.querySelector('[data-recusar]');
    if (rec) rec.addEventListener('click', async () => { if (await ui().confirm({ title: 'Não autorizar uso de imagem', text: 'Registraremos que você NÃO autoriza o uso da imagem do(a) aluno(a). Você pode mudar de ideia depois, na secretaria.', ok: 'Confirmar' })) { await ICM.api.assinaturas.recusar(token, 'Responsável não autorizou'); ICM.pages.assinar(root, token); } });
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      if (!f.aceite.checked) { err.textContent = 'Marque que leu e concorda com o documento.'; return; }
      if (pad.vazio()) { err.textContent = 'Faça sua assinatura no quadro.'; return; }
      const b = f.querySelector('[type=submit]'); b.classList.add('is-loading');
      try {
        const hash = await ICM.api.assinaturas.assinar(token, { nome: f.nome.value, cpf: f.cpf.value, imagem: pad.png() });
        root.querySelector('main').innerHTML = `<div class="card" style="text-align:center;padding:48px 20px"><div class="login-logo" style="margin:0 auto 20px;width:120px;height:120px">${I('check', 60)}</div><h1 class="login-title" style="font-size:30px">Documento assinado! ✅</h1><p class="muted mt-2">${esc(d.titulo)} — ${esc(d.aluno.nome)}</p><p class="xs muted mt-4">Código de integridade: <span style="font-family:monospace">${esc(hash.slice(0, 32))}</span></p><a class="btn btn-primary mt-6" href="#/portal">Ir para o Portal da Família</a></div>`;
      } catch (ex) { b.classList.remove('is-loading'); err.textContent = ex.message; }
    });
  };

  // Quadro de assinatura (mouse, caneta e toque)
  function signaturePad(cv) {
    const ctx = cv.getContext('2d'); let des = false, vazio = true, last = null;
    const style = () => { ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0e1838'; };
    style();
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    cv.addEventListener('pointerdown', e => { des = true; vazio = false; last = pos(e); cv.setPointerCapture(e.pointerId); cv.parentElement.classList.add('signing'); });
    cv.addEventListener('pointermove', e => { if (!des) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => { des = false; }));
    return { clear: () => { ctx.clearRect(0, 0, cv.width, cv.height); vazio = true; cv.parentElement.classList.remove('signing'); style(); }, vazio: () => vazio, png: () => cv.toDataURL('image/png') };
  }

  // ---------- Painel da equipe: solicitar e acompanhar assinaturas de um aluno ----------
  ICM.pages._documentosAluno = async function (alunoId, preset) {
    const a = await ICM.api.alunos.get(alunoId);
    const lista = await ICM.api.assinaturas.list({ aluno_id: alunoId });
    const r = a.responsavel || {};
    const m = ui().modal({
      title: `Documentos e assinaturas — ${a.nome}`, size: 'wide',
      body: `<div class="grid grid-2">
        <div><div class="section-title">${I('edit', 18)} Pedir assinatura pelo celular</div>
          <div class="col">${['matricula', 'lgpd', 'imagem'].map(t => { const ok = lista.find(x => x.tipo === t && x.status === 'assinado'); return `<label class="check card flat" style="padding:12px"><input type="checkbox" value="${t}" ${!ok && (preset || ['lgpd', 'imagem']).includes(t) ? 'checked' : ''} ${ok ? 'disabled' : ''}><span><b>${esc(ICM.C.DOCS_ASSINATURA[t])}</b>${ok ? `<br><span class="xs" style="color:var(--ok)">Assinado em ${esc(new Date(ok.assinado_em).toLocaleDateString('pt-BR'))}</span>` : ''}</span></label>`; }).join('')}</div>
          <button class="btn btn-primary mt-4" data-sol>${I('edit', 16)} Gerar link de assinatura</button>
          <div class="mt-4" data-out></div></div>
        <div><div class="section-title">${I('history', 18)} Histórico</div>${lista.length ? lista.map(x => `<div class="list-item"><div class="grow"><b class="small">${esc(ICM.C.DOCS_ASSINATURA[x.tipo])}</b><div class="xs muted">${x.status === 'assinado' ? `por ${esc(x.signatario_nome)} em ${esc(new Date(x.assinado_em).toLocaleString('pt-BR'))}` : x.status === 'pendente' ? `pedido em ${esc(fmtDate(x.solicitado_em))}` : esc(x.status)}</div></div>${x.status === 'assinado' ? `<button class="btn btn-sm" data-comp="${esc(x.id)}">${I('fileText', 14)} Comprovante</button>` : x.status === 'pendente' ? ui().badge('Pendente', 'warn') : ui().badge(x.status, 'neutral')}</div>`).join('') : ui().empty('Nenhuma assinatura', 'edit')}
          <hr class="divider"><div class="section-title">${I('key', 18)} Portal da Família</div><div data-portal></div></div>
      </div>`
    });
    const drawPortal = async () => {
      const c = await ICM.api.portal.codigo(alunoId);
      const item = await ICM.api.avisos.montar('portal', a, { link: ICM.api.portal.link(), codigo: c ? c.codigo : '', key: `portal:${a.id}:${c && c.codigo}` });
      m.$('[data-portal]').innerHTML = `<div class="small">Matrícula <b>${esc(a.matricula)}</b> · código <b style="font-family:monospace">${esc(c ? c.codigo : '—')}</b></div><div class="row wrap mt-2">${ICM.wa.btn(item, { label: 'Enviar acesso' })}<button class="btn btn-sm" data-novo-cod>${I('refresh', 14)} Gerar novo código</button></div>`;
      m.$('[data-novo-cod]').addEventListener('click', async () => { if (await ui().confirm({ title: 'Novo código', text: 'O código atual deixará de funcionar. Continuar?', ok: 'Gerar' })) { await ICM.api.portal.gerarCodigo(alunoId); drawPortal(); } });
    };
    drawPortal();
    m.$$('[data-comp]').forEach(b => b.addEventListener('click', () => ICM.reports.generate('assinatura_comprovante', { id: b.dataset.comp })));
    m.$('[data-sol]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const tipos = [...m.$$('input[type=checkbox]:checked')].map(x => x.value).filter(x => ICM.C.DOCS_ASSINATURA[x]);
      if (!tipos.length) return ui().toast('Marque ao menos um documento.', 'warn');
      await ui().run(() => ICM.api.assinaturas.solicitar(alunoId, tipos), 'Pedido de assinatura criado');
      const item = await ICM.api.avisos.montar('assinatura', a, { link: ICM.api.portal.link(), key: `assin:${a.id}:${Date.now()}` });
      m.$('[data-out]').innerHTML = `<div class="sens-lock" style="background:var(--ok-soft);color:#047857">${I('check', 18)} Pronto! O responsável assina pelo Portal da Família (aba Documentos).</div><div class="row wrap mt-4">${ICM.wa.btn(item, { label: `Enviar para ${(r.nome || 'responsável').split(' ')[0]}`, small: false })}</div>`;
    }).catch(() => { }));
  };

  // Pedido de assinatura de um termo de empréstimo
  ICM.pages._assinarEmprestimo = async function (emp) {
    const [x] = await ui().run(() => ICM.api.assinaturas.solicitar(emp.aluno_id, ['emprestimo'], emp.id), 'Pedido de assinatura criado');
    const a = await ICM.api.alunos.get(emp.aluno_id);
    const item = await ICM.api.avisos.montar('assinatura', a, { link: ICM.api.assinaturas.linkAssinar(x.token), key: `assin-emp:${emp.id}` });
    ICM.wa.abrir(item);
  };
})();
