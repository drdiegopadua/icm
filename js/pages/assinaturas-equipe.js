/* Assinaturas da equipe: cada pessoa (professor, assistente social, coordenação, diretoria…) cadastra
   a própria assinatura uma vez — pelo link enviado no WhatsApp ou no aparelho de quem coleta.
   Os relatórios e atas puxam a imagem e imprimem acima do nome (ICM.assinaturasEquipe.bloco).
   Coleção 'assinaturas_equipe' (id = id do usuário; pessoas sem acesso ao sistema: id "av_…"). */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const S = () => ICM.store;
  const nrm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const FUNCOES = ['Presidência', 'Vice-presidência', 'Direção', 'Direção executiva', 'Representante legal da OSC', 'Coordenação', 'Coordenação pedagógica', 'Serviço social',
    'Psicologia', 'Secretaria', 'Tesouraria', 'Conselho Fiscal', 'Recursos humanos', 'Responsável pelo patrimônio', 'Responsável pelo almoxarifado', 'Responsável pelas compras'];
  const linkMinha = () => window.ICM_LINK('/minha-assinatura');

  // ---------- dados ----------
  const api = {
    async list() { try { return await S().list('assinaturas_equipe'); } catch (e) { return []; } },
    async minha() { const u = ICM.auth.user(); return (await api.list()).find(x => x.id === u.id) || null; },
    async salvar(id, patch) {
      const ja = (await api.list()).find(x => x.id === id);
      const r = ja ? await S().update('assinaturas_equipe', id, patch) : await S().insert('assinaturas_equipe', { id, funcoes: [], ...patch });
      ICM.api.audit(patch.imagem ? 'registrar_assinatura' : 'editar', 'assinaturas_equipe', id, `Assinatura da equipe: ${r.nome || ''}`).catch(() => { });
      cache = null; return r;
    },
    async remover(id) { await S().remove('assinaturas_equipe', id); ICM.api.audit('excluir', 'assinaturas_equipe', id, 'Assinatura da equipe apagada').catch(() => { }); cache = null; }
  };

  // ---------- usado pelos relatórios ----------
  let cache = null;
  // Imagem embutida no documento (o link do armazenamento expira em 1 h; o PDF/HTML baixado não pode perder a assinatura)
  const embutidas = new Map();
  async function embutir(src) {
    if (!/^https?:/.test(src)) return src;
    const chave = src.split('?')[0]; if (embutidas.has(chave)) return embutidas.get(chave);
    try { const b = await (await fetch(src)).blob(); const d = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }); embutidas.set(chave, d); return d; } catch (e) { return src; }
  }
  async function carregar() { const l = (await api.list()).filter(x => x.imagem); for (const x of l) x.imagem = await embutir(x.imagem); cache = l; return cache; }
  // Acha a assinatura para um rótulo como "Maria Souza — Professor(a)" (pelo nome) ou "Coordenação" (pela função)
  function achar(rotulo) {
    const lista = cache || [];
    const [esq, dir] = String(rotulo).split(' — ');
    if (dir !== undefined) {
      const p = lista.find(x => nrm(x.nome) === nrm(esq));
      if (p) return { p, txt: rotulo };
      if (!FUNCOES.some(f => nrm(f) === nrm(esq))) return null;   // nome de pessoa sem assinatura: não usa a de outra
    }
    const alvo = nrm(dir !== undefined ? esq : rotulo);
    const p = lista.find(x => (x.funcoes || []).some(f => { const k = nrm(f); return alvo === k || alvo.startsWith(k + ' ') || alvo.startsWith(k + '/'); }));
    return p ? { p, txt: `${p.nome} — ${rotulo}` } : null;
  }
  function bloco(rotulo) {
    const r = achar(rotulo);
    return `<div class="sg">${r ? `<img src="${esc(r.p.imagem)}" alt="Assinatura de ${esc(r.p.nome)}">` : ''}<div class="sg-l">${esc(r ? r.txt : rotulo)}</div></div>`;
  }
  ICM.assinaturasEquipe = { carregar, achar, bloco, FUNCOES, api };

  // ---------- quadro de assinatura ----------
  function recortar(cv) {
    const ctx = cv.getContext('2d'); const { width: w, height: h } = cv; const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    const m = 12, c = document.createElement('canvas'); c.width = x1 - x0 + m * 2; c.height = y1 - y0 + m * 2;
    c.getContext('2d').drawImage(cv, x0 - m, y0 - m, c.width, c.height, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }
  function quadro(box) {
    box.innerHTML = `<div class="sig-wrap"><canvas class="sig-pad" width="900" height="300"></canvas><div class="sig-line">Assine aqui com o dedo, a caneta ou o mouse</div></div>
      <div class="row between mt-2"><button type="button" class="btn btn-sm" data-limpar>${I('refresh', 14)} Limpar</button><span class="xs muted">Assine como no papel.</span></div>`;
    const cv = box.querySelector('canvas'); const pad = ICM.signaturePad(cv);
    box.querySelector('[data-limpar]').addEventListener('click', () => pad.clear());
    return { vazio: () => pad.vazio(), png: () => recortar(cv) };
  }

  // ---------- Minha assinatura (qualquer pessoa da equipe) ----------
  ICM.pages.minhaAssinatura = async function (el) {
    ICM.app.setCrumbs([['Minha assinatura']]);
    const u = ICM.auth.user(); const atual = await api.minha();
    el.innerHTML = `<div class="page" style="max-width:760px">
      <div class="page-head"><div><h1 class="page-title">Minha assinatura</h1><div class="page-sub">Usada para assinar os relatórios e atas do Instituto em que você aparece como responsável.</div></div></div>
      ${atual && atual.imagem ? `<div class="card mb-4"><div class="card-title mb-2">Assinatura cadastrada</div><div class="row wrap between"><img src="${esc(atual.imagem)}" alt="Sua assinatura" style="max-height:90px;max-width:100%;background:#fff;border-radius:10px;padding:8px">
        <div class="xs muted">Cadastrada em ${esc(fmtDate((atual.registrada_em || '').slice(0, 10)))}${(atual.funcoes || []).length ? `<br>Assina como: ${esc(atual.funcoes.join(', '))}` : ''}</div></div></div>` : ''}
      <div class="card"><div class="card-title mb-2">${atual && atual.imagem ? 'Trocar assinatura' : 'Cadastrar assinatura'}</div>
        <div class="field mb-4"><label class="label">Nome como deve sair nos documentos</label><input class="input" data-nome value="${esc((atual && atual.nome) || u.nome)}"></div>
        <div data-quadro></div>
        <label class="check mt-4"><input type="checkbox" data-aceite> <span class="small">Autorizo o ${esc(ICM.C.ORG.nome)} a reproduzir esta assinatura nos relatórios, atas e documentos institucionais em que eu constar como responsável. Posso apagá-la a qualquer momento.</span></label>
        <div class="row end mt-4">${atual && atual.imagem ? `<button class="btn" data-apagar>${I('trash', 16)} Apagar minha assinatura</button>` : ''}<button class="btn btn-primary" data-salvar>${I('check', 18)} Salvar assinatura</button></div>
      </div></div>`;
    const q = quadro(el.querySelector('[data-quadro]'));
    el.querySelector('[data-salvar]').addEventListener('click', async () => {
      if (q.vazio()) { ui().toast('Faça sua assinatura no quadro.', 'warn'); return; }
      if (!el.querySelector('[data-aceite]').checked) { ui().toast('Marque a autorização para usar a assinatura nos documentos.', 'warn'); return; }
      const nome = el.querySelector('[data-nome]').value.trim() || u.nome;
      await ui().run(() => api.salvar(u.id, { nome, usuario_id: u.id, imagem: q.png(), registrada_em: new Date().toISOString(), registrada_por: u.nome, autorizou_uso: true }), 'Assinatura salva');
      ICM.pages.minhaAssinatura(el);
    });
    const ap = el.querySelector('[data-apagar]');
    if (ap) ap.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Apagar assinatura', text: 'Os próximos documentos sairão sem a sua assinatura. Continuar?', ok: 'Apagar', danger: true }))) return;
      await ui().run(() => api.salvar(u.id, { imagem: '', registrada_em: '' }), 'Assinatura apagada'); ICM.pages.minhaAssinatura(el);
    });
  };

  // ---------- Assinaturas da equipe (direção e coordenação) ----------
  ICM.pages.assinaturasEquipe = async function (el) {
    ICM.app.setCrumbs([['Gestão'], ['Assinaturas da equipe']]);
    const [users, regs] = await Promise.all([ICM.api.usuarios.list().catch(() => []), api.list()]);
    const pessoas = users.filter(x => x.ativo !== false && !x.convite).map(x => ({ id: x.id, nome: x.nome, cargo: x.cargo || ICM.C.PAPEIS[x.papel]?.nome || '', telefone: x.telefone || '', reg: regs.find(r => r.id === x.id) || null }))
      .concat(regs.filter(r => !users.some(x => x.id === r.id)).map(r => ({ id: r.id, nome: r.nome, cargo: r.cargo || 'Sem acesso ao sistema', telefone: r.telefone || '', reg: r, avulsa: true })))
      .sort((a, b) => (b.reg && b.reg.imagem ? 1 : 0) - (a.reg && a.reg.imagem ? 1 : 0) || a.nome.localeCompare(b.nome));
    const com = pessoas.filter(p => p.reg && p.reg.imagem).length;
    const cobertas = new Set(regs.filter(r => r.imagem).flatMap(r => r.funcoes || []));
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Assinaturas da equipe</h1><div class="page-sub">${com} de ${pessoas.length} pessoa(s) com assinatura. Relatórios e atas saem assinados por quem estiver cadastrado em cada função.</div></div>
        <div class="row wrap"><button class="btn" data-copiar>${I('send', 16)} Copiar link</button><button class="btn btn-primary" data-avulsa>${I('plus', 18)} Pessoa sem acesso ao sistema</button></div></div>
      <div class="card mb-4"><div class="card-title mb-2">Funções que assinam documentos</div>
        <div class="row wrap" style="gap:6px">${FUNCOES.map(f => `<span class="badge ${cobertas.has(f) ? 'ok' : 'neutral'}">${cobertas.has(f) ? '✓ ' : ''}${esc(f)}</span>`).join('')}</div>
        <div class="xs muted mt-2">Verde = já tem alguém com assinatura nessa função. Professores assinam pelo próprio nome nos relatórios das turmas.</div></div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Pessoa</th><th>Assinatura</th><th>Assina como</th><th></th></tr></thead><tbody>
        ${pessoas.map((p, i) => `<tr><td><b>${esc(p.nome)}</b><div class="xs muted">${esc(p.cargo)}</div></td>
          <td>${p.reg && p.reg.imagem ? `<img src="${esc(p.reg.imagem)}" alt="" style="max-height:44px;max-width:160px;background:#fff;border-radius:6px;padding:2px 6px"><div class="xs muted">${esc(fmtDate((p.reg.registrada_em || '').slice(0, 10)))}</div>` : '<span class="badge warn">Pendente</span>'}</td>
          <td class="small">${esc(((p.reg && p.reg.funcoes) || []).join(', ') || '—')} <button class="btn btn-sm btn-ghost" data-func="${i}">${I('edit', 14)}</button></td>
          <td style="text-align:right;white-space:nowrap">${!p.avulsa ? `<button class="btn btn-sm btn-wa" data-link="${i}" ${p.telefone ? '' : 'disabled title="Sem telefone no cadastro do usuário"'}>${ICM.waIcon ? ICM.waIcon(15) : ''} Enviar link</button>` : ''}
            <button class="btn btn-sm" data-coletar="${i}">${I('edit', 14)} Coletar aqui</button>
            ${p.reg && p.reg.imagem ? `<button class="btn btn-sm btn-ghost" data-apagar="${i}" title="Apagar assinatura">${I('trash', 14)}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div></div>`;
    const recarregar = () => ICM.pages.assinaturasEquipe(el);

    el.querySelector('[data-copiar]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(linkMinha()); ui().toast('Link copiado: ' + linkMinha(), 'ok', 5000); } catch (e) { ui().toast(linkMinha(), 'info', 8000); } });
    el.querySelectorAll('[data-link]').forEach(b => b.addEventListener('click', () => {
      const p = pessoas[+b.dataset.link];
      const texto = `Olá, ${p.nome.split(' ')[0]}! 💙 Para os relatórios e atas do ${ICM.C.ORG.nome} saírem já assinados, cadastre sua assinatura no sistema (leva 1 minuto):\n${linkMinha()}\nEntre com seu login e assine com o dedo na tela.`;
      ICM.wa.abrir({ tipo: 'assinatura_equipe', key: `assin_equipe:${p.id}`, responsavel: p.nome, telefone: p.telefone, texto });
    }));
    el.querySelectorAll('[data-func]').forEach(b => b.addEventListener('click', () => editarFuncoes(pessoas[+b.dataset.func], recarregar)));
    el.querySelectorAll('[data-coletar]').forEach(b => b.addEventListener('click', () => coletar(pessoas[+b.dataset.coletar], recarregar)));
    el.querySelectorAll('[data-apagar]').forEach(b => b.addEventListener('click', async () => {
      const p = pessoas[+b.dataset.apagar];
      if (!(await ui().confirm({ title: 'Apagar assinatura', text: `Apagar a assinatura de ${p.nome}? Os próximos documentos sairão sem ela.`, ok: 'Apagar', danger: true }))) return;
      await ui().run(() => p.avulsa ? api.remover(p.id) : api.salvar(p.id, { imagem: '', registrada_em: '' }), 'Assinatura apagada'); recarregar();
    }));
    el.querySelector('[data-avulsa]').addEventListener('click', () => coletar({ id: ICM.util.uid('av_'), nome: '', cargo: '', avulsa: true, nova: true }, recarregar));
  };

  function editarFuncoes(p, depois) {
    const atuais = new Set((p.reg && p.reg.funcoes) || []);
    const m = ui().modal({ title: `Funções de ${p.nome}`, size: 'sm', body: `<p class="small muted mb-4">Nos documentos com estas funções, a assinatura de ${esc(p.nome)} será impressa.</p>
      <div class="col">${FUNCOES.map(f => `<label class="row"><input type="checkbox" value="${esc(f)}" ${atuais.has(f) ? 'checked' : ''}> ${esc(f)}</label>`).join('')}</div>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
    m.$('[data-ok]').addEventListener('click', async () => {
      const funcoes = [...m.el.querySelectorAll('input:checked')].map(c => c.value);
      m.close(); await ui().run(() => api.salvar(p.id, { nome: (p.reg && p.reg.nome) || p.nome, usuario_id: p.avulsa ? null : p.id, funcoes }), 'Funções salvas'); depois();
    });
  }

  function coletar(p, depois) {
    const m = ui().modal({ title: p.nova ? 'Pessoa sem acesso ao sistema' : `Assinatura de ${p.nome}`, body: `
      ${p.nova ? `<div class="grid grid-2 mb-4"><div class="field"><label class="label">Nome completo</label><input class="input" data-nome></div><div class="field"><label class="label">Cargo</label><input class="input" data-cargo placeholder="Ex.: Presidente, Assistente social"></div></div>` : ''}
      <p class="small muted mb-2">Entregue o aparelho para ${p.nova ? 'a pessoa' : esc(p.nome)} assinar no quadro.</p>
      <div data-quadro></div>
      <label class="check mt-4"><input type="checkbox" data-aceite> <span class="small">A pessoa autoriza o ${esc(ICM.C.ORG.nome)} a reproduzir esta assinatura nos documentos institucionais em que constar como responsável.</span></label>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar assinatura</button>` });
    const q = quadro(m.$('[data-quadro]'));
    m.$('[data-ok]').addEventListener('click', async () => {
      const nome = p.nova ? m.$('[data-nome]').value.trim() : ((p.reg && p.reg.nome) || p.nome);
      if (!nome || nome.split(/\s+/).length < 2) { ui().toast('Informe o nome completo.', 'warn'); return; }
      if (q.vazio()) { ui().toast('Faça a assinatura no quadro.', 'warn'); return; }
      if (!m.$('[data-aceite]').checked) { ui().toast('Marque a autorização.', 'warn'); return; }
      const dados = { nome, usuario_id: p.avulsa ? null : p.id, imagem: q.png(), registrada_em: new Date().toISOString(), registrada_por: ICM.auth.user().nome, autorizou_uso: true };
      if (p.nova) Object.assign(dados, { cargo: m.$('[data-cargo]').value.trim(), avulsa: true });
      m.close(); await ui().run(() => api.salvar(p.id, dados), 'Assinatura salva'); depois();
    });
  }
})();
