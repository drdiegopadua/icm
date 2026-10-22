/* Avisos às famílias pelo WhatsApp (WhatsApp Web no computador, app no celular) + comunicados do Portal */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  // Ícone do WhatsApp (balão + telefone)
  const WA_SVG = s => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3.6 29l6.4-1.7c2 1.1 4.2 1.6 6.4 1.6h0C23.2 28.9 29 23.2 29 16.1 29 8.9 23.2 3 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.8 1 1-3.7-.3-.4C5.8 20.1 5.3 18 5.3 15.9 5.3 10 10.1 5.3 16 5.3c5.9 0 10.7 4.8 10.7 10.7 0 5.9-4.8 10.6-10.7 10.6zm5.9-8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.7 5.1.8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>`;
  ICM.waIcon = WA_SVG;

  // Registro de botões → ao clicar abre o WhatsApp com a mensagem pronta e registra no histórico
  const reg = new Map(); let seqId = 0;
  ICM.wa = {
    btn(item, { label = 'WhatsApp', small = true, icone = false } = {}) {
      const id = 'wa' + (++seqId); reg.set(id, item);
      if (!item.telefone) return `<button class="btn ${small ? 'btn-sm' : ''} btn-wa" disabled title="Sem telefone cadastrado">${WA_SVG(16)}${icone ? '' : ' Sem telefone'}</button>`;
      return `<button class="btn ${small ? 'btn-sm' : ''} btn-wa ${icone ? 'btn-icon' : ''}" data-wa="${id}" title="Enviar pelo WhatsApp para ${esc(item.responsavel)} (${esc(item.telefone)})">${WA_SVG(16)}${icone ? '' : ' ' + esc(label)}</button>`;
    },
    async abrir(item, editar = true) {
      let texto = item.texto;
      if (editar) {
        texto = await new Promise(res => {
          const m = ui().modal({
            title: 'Mensagem pelo WhatsApp', size: 'sm',
            body: `<div class="row mb-4"><span class="wa-badge">${WA_SVG(22)}</span><div><b>${esc(item.responsavel || 'Responsável')}</b><div class="xs muted">${esc(item.telefone)}${item.aluno ? ' · responsável por ' + esc(item.aluno) : ''}</div></div></div><textarea class="textarea" rows="7" data-tx>${esc(item.texto)}</textarea><div class="xs muted mt-2">Abre o WhatsApp Web com a mensagem pronta — confira e clique em enviar lá.</div>`,
            foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-wa" data-ok>${WA_SVG(18)} Abrir no WhatsApp</button>`
          });
          let ok = false;
          m.$('[data-ok]').addEventListener('click', () => { ok = true; const t = m.$('[data-tx]').value; m.close(); res(t); });
          const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!ok) res(null); } }); obs.observe(document.body, { childList: true });
        });
        if (texto == null) return;
      }
      const w = window.open(ICM.api.avisos.linkWA(item.telefone, texto), '_blank', 'noopener');
      if (!w) ui().toast('O navegador bloqueou a janela. Permita pop-ups para este site.', 'warn', 5000);
      try { await ICM.api.avisos.registrar({ ...item, texto }); } catch (e) { /* sem permissão de registrar */ }
      ui().toast('WhatsApp aberto — envie a mensagem por lá', 'ok');
      document.dispatchEvent(new CustomEvent('icm:wa-enviado', { detail: item }));
    }
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-wa]'); if (!b) return; const it = reg.get(b.dataset.wa); if (it) ICM.wa.abrir(it); });

  const TIPOS = { falta_alerta: ['Faltas — alerta', 'warn'], falta_desligamento: ['Faltas — desligamento', 'danger'], reuniao: ['Reunião de pais', ''], evento: ['Evento', ''], mensalidade: ['Mensalidade em atraso', 'danger'], assinatura: ['Documentos para assinar', 'neutral'], portal: ['Acesso ao portal', 'neutral'] };

  ICM.pages.avisos = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Avisos às famílias']]);
    const tab0 = query.get('tab') || 'pendentes';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Avisos às famílias</h1><div class="page-sub">Mensagens prontas pelo WhatsApp: faltas (regra 2/3), reuniões, eventos, mensalidades e documentos para assinar</div></div>
        <button class="btn btn-wa" data-livre>${WA_SVG(18)} Mensagem livre</button></div>
      <div class="tabs mb-4">${[['pendentes', 'Para enviar', 'bell'], ['comunicados', 'Comunicados do Portal', 'info'], ['historico', 'Histórico de envios', 'history'], ...(ICM.auth.can('avisos.modelos') ? [['modelos', 'Modelos de mensagem', 'edit']] : [])].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    let cur = tab0;
    const R = {
      async pendentes() {
        const l = await ICM.api.avisos.pendentes();
        let tipo = '', ocultarEnviados = true;
        panel.innerHTML = `<div class="card tab-panel"><div class="row wrap between mb-4"><div class="segmented" data-t><button data-v="" class="active">Todos (${l.length})</button>${Object.entries(TIPOS).filter(([k]) => l.some(x => x.tipo === k)).map(([k, v]) => `<button data-v="${k}">${esc(v[0])} (${l.filter(x => x.tipo === k).length})</button>`).join('')}</div><label class="toggle"><input type="checkbox" data-oc checked><span class="track"></span><span class="small">Ocultar já enviados</span></label></div><div data-l></div></div>`;
        const draw = () => {
          const f = l.filter(x => (!tipo || x.tipo === tipo) && (!ocultarEnviados || !x.enviado));
          panel.querySelector('[data-l]').innerHTML = f.length ? f.map(x => `<div class="list-item" style="align-items:flex-start">
            ${ICM.util.avatar(x.aluno || x.responsavel, null, 'sm')}
            <div class="grow"><div class="row wrap">${ui().badge(TIPOS[x.tipo][0], TIPOS[x.tipo][1])}<b>${esc(x.responsavel || '—')}</b><span class="xs muted">${esc(x.telefone || 'sem telefone')} · ${esc(x.aluno)}</span></div>
              <div class="small mt-2">${esc(x.contexto)}${x.data && x.data !== ICM.util.today() ? ` · ${esc(fmtDate(x.data))}` : ''}</div>
              <details class="xs muted mt-2"><summary>Ver mensagem</summary><div class="text-block" style="margin-top:6px">${esc(x.texto)}</div></details>
              ${x.enviado ? `<div class="xs mt-2" style="color:var(--ok)">${I('check', 12)} Enviado por ${esc(x.enviado.enviado_por)} em ${esc(new Date(x.enviado.em).toLocaleString('pt-BR'))}</div>` : ''}</div>
            ${ICM.wa.btn(x, { label: x.enviado ? 'Reenviar' : 'Enviar' })}</div>`).join('') : ui().empty('Nenhum aviso pendente 🎉', 'bell');
        };
        panel.querySelectorAll('[data-t] button').forEach(b => b.addEventListener('click', () => { panel.querySelectorAll('[data-t] button').forEach(y => y.classList.toggle('active', y === b)); tipo = b.dataset.v; draw(); }));
        panel.querySelector('[data-oc]').addEventListener('change', e => { ocultarEnviados = e.target.checked; draw(); });
        const ref = () => { if (cur === 'pendentes') setTimeout(() => R.pendentes(), 400); };
        document.addEventListener('icm:wa-enviado', ref, { once: true });
        draw();
      },
      async comunicados() {
        const l = await ICM.api.comunicados.list(); const projetos = await ICM.api.raw('projetos'); const turmas = await ICM.api.raw('turmas');
        const pub = c => c.publico === 'todos' ? 'Todas as famílias' : c.publico === 'projeto' ? (projetos.find(p => p.id === c.projeto_id) || {}).nome : (turmas.find(t => t.id === c.turma_id) || {}).nome;
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Comunicados publicados no Portal da Família</div><div class="card-sub">Aparecem para os responsáveis quando entram no portal</div></div>${ICM.auth.can('reunioes.gerir') ? `<button class="btn btn-sm btn-primary" data-novo>${I('plus', 14)} Novo comunicado</button>` : ''}</div>
          ${l.map(c => `<div class="list-item" style="align-items:flex-start">${I('info', 18)}<div class="grow"><b>${esc(c.titulo)}</b> <span class="badge neutral">${esc(pub(c) || '')}</span><div class="small mt-2">${esc(c.texto)}</div><div class="xs muted mt-2">${esc(fmtDate(c.data))} · ${esc(c.autor || '')}</div></div>${ICM.auth.can('reunioes.gerir') ? `<button class="btn btn-icon btn-sm btn-ghost" data-rm="${esc(c.id)}" aria-label="Excluir">${I('trash', 14)}</button>` : ''}</div>`).join('') || ui().empty('Nenhum comunicado', 'info')}</div>`;
        const nb = panel.querySelector('[data-novo]'); if (nb) nb.addEventListener('click', async () => {
          const F = o => ui().field(o);
          const m = ui().modal({ title: 'Novo comunicado', body: `<form class="grid grid-2">${F({ name: 'titulo', label: 'Título', required: true, cls: 'span-2' })}${F({ name: 'texto', label: 'Texto', type: 'textarea', rows: 4, cls: 'span-2' })}${F({ name: 'publico', label: 'Para', type: 'select', options: [['todos', 'Todas as famílias'], ['projeto', 'Famílias de um projeto'], ['turma', 'Famílias de uma turma']] })}${F({ name: 'projeto_id', label: 'Projeto', type: 'select', options: [['', '—'], ...projetos.map(p => [p.id, p.nome])] })}${F({ name: 'turma_id', label: 'Turma', type: 'select', options: [['', '—'], ...turmas.map(t => [t.id, t.nome])] })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Publicar</button>` });
          m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.comunicados.save(ICM.util.formData(m.$('form'))), 'Comunicado publicado no portal'); m.close(); R.comunicados(); }).catch(() => { }));
        });
        panel.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir comunicado', text: 'Remover do portal?', ok: 'Excluir', danger: true })) { await ICM.api.comunicados.remove(b.dataset.rm); R.comunicados(); } }));
      },
      async historico() {
        const l = await ICM.api.avisos.log();
        panel.innerHTML = `<div class="card tab-panel">${l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Quando</th><th>Tipo</th><th>Para</th><th>Por</th><th>Mensagem</th></tr></thead><tbody>${l.map(x => `<tr><td class="small">${esc(new Date(x.em).toLocaleString('pt-BR'))}</td><td>${ui().badge((TIPOS[x.tipo] || ['Livre'])[0], 'neutral')}</td><td class="small"><b>${esc(x.destinatario)}</b><div class="xs muted">${esc(x.telefone)}</div></td><td class="small">${esc(x.enviado_por)}</td><td class="xs muted" style="max-width:380px">${esc(x.texto.slice(0, 140))}${x.texto.length > 140 ? '…' : ''}</td></tr>`).join('')}</tbody></table></div>` : ui().empty('Nenhuma mensagem enviada ainda', 'history')}</div>`;
      },
      async modelos() {
        const M = await ICM.api.avisos.modelos();
        const NOMES = { falta_alerta: 'Faltas — alerta (2 faltas)', falta_desligamento: 'Faltas — desligamento (3 faltas)', reuniao: 'Convite para reunião', evento: 'Aviso de evento', mensalidade: 'Mensalidade em atraso', portal: 'Acesso ao Portal da Família', assinatura: 'Documentos para assinar' };
        panel.innerHTML = `<div class="card tab-panel"><p class="small muted mb-4">Campos automáticos: {responsavel} {aluno} {org} {turma} {faltas} {mes} {titulo} {data} {hora} {local} {competencia} {valor} {vencimento} {link} {matricula} {codigo}</p><form class="col" data-f>${Object.entries(NOMES).map(([k, n]) => ui().field({ name: k, label: n, type: 'textarea', rows: 3, value: M[k] })).join('')}</form><div class="row end mt-4"><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar modelos</button></div></div>`;
        panel.querySelector('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, () => ui().run(() => ICM.api.avisos.salvarModelos(ICM.util.formData(panel.querySelector('[data-f]'))), 'Modelos salvos')).catch(() => { }));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => { cur = k; R[k](); });
    el.querySelector('[data-livre]').addEventListener('click', mensagemLivre);
    await R[tab0]();
  };

  // Mensagem livre para o responsável de qualquer aluno
  async function mensagemLivre(alunoPre) {
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const m = ui().modal({
      title: 'Mensagem pelo WhatsApp', size: 'sm',
      body: `<form class="col">${ui().field({ name: 'aluno', label: 'Família do aluno(a)', type: 'select', value: typeof alunoPre === 'string' ? alunoPre : '', options: [['', 'Selecione…'], ...alunos.map(a => [a.id, `${a.nome} — resp. ${(a.responsavel || {}).nome || ''}`])] })}${ui().field({ name: 'texto', label: 'Mensagem', type: 'textarea', rows: 5, value: `Olá! Aqui é do ${ICM.C.ORG.nome}. ` })}</form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-wa" data-ok>${WA_SVG(18)} Abrir no WhatsApp</button>`
    });
    m.$('[data-ok]').addEventListener('click', async () => {
      const d = ICM.util.formData(m.$('form')); const a = alunos.find(x => x.id === d.aluno);
      if (!a) return ui().toast('Selecione o aluno.', 'warn');
      if (!a.responsavel || !a.responsavel.telefone) return ui().toast('Responsável sem telefone cadastrado.', 'warn');
      m.close();
      ICM.wa.abrir({ tipo: 'livre', key: `livre:${a.id}:${Date.now()}`, aluno_id: a.id, aluno: a.nome, responsavel: a.responsavel.nome, telefone: a.responsavel.telefone, texto: d.texto }, false);
    });
  }
  ICM.pages._mensagemLivre = mensagemLivre;
})();
