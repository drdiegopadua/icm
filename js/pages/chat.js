/* Chat interno da equipe: grupos + conversas diretas */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, today } = ICM.util;
  let timer = null;

  const hora = iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const diaDe = iso => ICM.util.iso(new Date(iso));
  // Links clicáveis e quebras de linha, sempre depois do escape
  const formatar = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>');

  ICM.pages.chat = async function (el, params) {
    clearInterval(timer);
    ICM.app.setCrumbs([['Chat da equipe']]);
    const user = ICM.auth.user();
    let ativo = params.id || null;
    let filtro = '';
    let ultimaAssinatura = '';

    el.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1 class="page-title">Chat da equipe</h1><div class="page-sub">${I('lock', 14)} Só professores e colaboradores com acesso ao sistema. Famílias e alunos não veem estas conversas.</div></div>
        ${ICM.auth.can('chat.grupos') ? `<button class="btn" data-novo-grupo>${I('plus', 18)} Novo grupo</button>` : ''}
      </div>
      <div class="chat card ${ativo ? 'em-conversa' : ''}">
        <aside class="chat-lado">
          <div class="chat-busca input-icon">${I('search', 18)}<input class="input" type="search" placeholder="Buscar pessoa ou grupo" aria-label="Buscar conversa"></div>
          <div class="chat-lista"></div>
        </aside>
        <section class="chat-conversa"></section>
      </div>
    </div>`;

    const $ = s => el.querySelector(s);
    const raiz = $('.chat');

    async function desenharLista() {
      const { grupos, diretos } = await ICM.api.chat.conversas();
      const q = filtro.toLowerCase();
      const item = c => `<a class="chat-item ${c.id === ativo ? 'ativo' : ''}" href="#/chat/${c.id}">
        ${c.tipo === 'direto' ? ICM.util.avatar(c.outro.nome, c.outro.foto, 'sm') : `<span class="chat-hash">${I('users', 18)}</span>`}
        <span class="grow" style="min-width:0"><b class="truncate">${esc(c.nome)}</b><small class="truncate">${c.ultima ? esc((c.tipo === 'grupo' && c.ultimaAutor ? c.ultimaAutor.split(' ')[0] + ': ' : c.ultima.autor_id === user.id ? 'Você: ' : '') + c.ultima.texto) : esc(c.descricao || '')}</small></span>
        <span class="chat-meta">${c.ultima ? `<small>${diaDe(c.ultima.em) === today() ? hora(c.ultima.em) : fmtDate(diaDe(c.ultima.em)).slice(0, 5)}</small>` : ''}${c.naoLidas ? `<span class="chat-badge">${c.naoLidas}</span>` : ''}</span>
      </a>`;
      const gs = grupos.filter(c => c.nome.toLowerCase().includes(q));
      const ds = diretos.filter(c => c.nome.toLowerCase().includes(q));
      $('.chat-lista').innerHTML = `<div class="chat-sec">Grupos</div>${gs.map(item).join('') || '<div class="xs muted" style="padding:8px 12px">Nenhum grupo</div>'}
        <div class="chat-sec">Mensagens diretas</div>${ds.map(item).join('') || '<div class="xs muted" style="padding:8px 12px">Ninguém encontrado</div>'}`;
      return { grupos, diretos };
    }

    async function desenharConversa(lista, forcar = false) {
      const alvo = $('.chat-conversa');
      if (!ativo) { alvo.innerHTML = ICM.ui.empty('Escolha um grupo ou um colega para conversar', 'chat'); return; }
      const conv = [...lista.grupos, ...lista.diretos].find(c => c.id === ativo);
      if (!conv) { alvo.innerHTML = ICM.ui.empty('Conversa não encontrada ou sem acesso.', 'lock'); return; }
      const msgs = await ICM.api.chat.mensagens(ativo);
      const assinatura = ativo + ':' + msgs.length + ':' + (msgs.length ? msgs[msgs.length - 1].id : '');
      if (!forcar && assinatura === ultimaAssinatura) return;
      ultimaAssinatura = assinatura;
      const rascunho = alvo.querySelector('textarea') ? alvo.querySelector('textarea').value : '';
      let dia = '', autorAnt = '';
      alvo.innerHTML = `
        <header class="chat-cab">
          <a class="btn btn-icon btn-sm chat-voltar" href="#/chat" aria-label="Voltar">${I('arrowLeft', 18)}</a>
          ${conv.tipo === 'direto' ? ICM.util.avatar(conv.outro.nome, conv.outro.foto, 'sm') : `<span class="chat-hash">${I('users', 18)}</span>`}
          <div class="grow" style="min-width:0"><b class="truncate">${esc(conv.nome)}</b><div class="xs muted truncate">${conv.tipo === 'grupo' ? `${conv.membros.length} participantes · ${esc(conv.descricao || '')}` : esc(conv.descricao)}</div></div>
          ${conv.tipo === 'grupo' && ICM.auth.can('chat.grupos') ? `<button class="btn btn-sm" data-editar-grupo>${I('settings', 16)} Participantes</button>` : ''}
        </header>
        <div class="chat-msgs">${msgs.length ? msgs.map(m => {
          const d = diaDe(m.em);
          const sep = d !== dia ? `<div class="chat-dia">${d === today() ? 'Hoje' : fmtDate(d)}</div>` : '';
          const seguida = d === dia && m.autor_id === autorAnt;
          dia = d; autorAnt = m.autor_id;
          const minha = m.autor_id === user.id;
          return `${sep}<div class="chat-msg ${minha ? 'minha' : ''} ${seguida ? 'seguida' : ''}">
            ${minha ? '' : ICM.util.avatar(m.autor.nome, m.autor.foto, 'sm')}
            <div class="chat-bolha">${!minha && conv.tipo === 'grupo' && !seguida ? `<div class="chat-autor">${esc(m.autor.nome)}</div>` : ''}<div>${formatar(m.texto)}</div><div class="chat-hora">${hora(m.em)}</div></div>
          </div>`;
        }).join('') : ICM.ui.empty(conv.tipo === 'direto' ? `Comece a conversa com ${conv.nome.split(' ')[0]}` : 'Nenhuma mensagem ainda', 'chat')}</div>
        <form class="chat-envio">
          <textarea class="textarea" rows="1" placeholder="Escreva uma mensagem…  (Enter envia · Shift+Enter quebra linha)" aria-label="Mensagem" maxlength="4000"></textarea>
          <button class="btn btn-primary btn-icon" type="submit" aria-label="Enviar">${I('send', 18)}</button>
        </form>`;
      const box = alvo.querySelector('.chat-msgs'); box.scrollTop = box.scrollHeight;
      const tx = alvo.querySelector('textarea'); tx.value = rascunho;
      const ajusta = () => { tx.style.height = 'auto'; tx.style.height = Math.min(160, tx.scrollHeight) + 'px'; };
      tx.addEventListener('input', ajusta); ajusta();
      tx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); alvo.querySelector('form').requestSubmit(); } });
      alvo.querySelector('form').addEventListener('submit', async e => {
        e.preventDefault();
        const texto = tx.value; if (!texto.trim()) return;
        tx.value = '';
        try { await ICM.api.chat.enviar(ativo, texto); } catch (er) { tx.value = texto; ICM.ui.toast(er.message, 'danger'); return; }
        await atualizar(true);
        alvo.querySelector('textarea').focus();
      });
      const ed = alvo.querySelector('[data-editar-grupo]');
      if (ed) ed.addEventListener('click', () => formGrupo(conv));
      if (matchMedia('(min-width: 900px)').matches && !rascunho) tx.focus();
      await ICM.api.chat.marcarLido(ativo);
      ICM.app.refreshChat && ICM.app.refreshChat();
    }

    async function atualizar(forcar = false) {
      if (!document.body.contains(raiz)) { clearInterval(timer); return; }
      const lista = await desenharLista();
      await desenharConversa(lista, forcar);
      if (forcar) await desenharLista();
    }

    async function formGrupo(g) {
      const usuarios = (await ICM.api.usuarios.list()).filter(u => u.ativo);
      const m = ICM.ui.modal({
        title: g ? 'Participantes do grupo' : 'Novo grupo', size: 'sm',
        body: `<form data-f style="display:grid;gap:14px">
          ${ICM.ui.field({ label: 'Nome do grupo', name: 'nome', value: g ? g.nome : '', required: true })}
          ${ICM.ui.field({ label: 'Descrição', name: 'descricao', value: g ? g.descricao || '' : '' })}
          <div><div class="label" style="margin-bottom:8px">Participantes</div><div style="display:grid;gap:10px;max-height:280px;overflow:auto;padding:4px">${usuarios.map(u => `<label class="check"><input type="checkbox" value="${u.id}" ${!g || (g.membros || []).includes(u.id) || u.id === user.id ? 'checked' : ''} ${u.id === user.id ? 'disabled' : ''}> ${esc(u.nome)} <span class="xs muted">${esc(u.cargo || ICM.C.PAPEIS[u.papel].nome)}</span></label>`).join('')}</div></div>
        </form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
      });
      m.$('[data-ok]').addEventListener('click', async () => {
        const f = m.$('[data-f]');
        const membros = [...f.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
        try {
          const r = await ICM.api.chat.salvarGrupo({ id: g && g.id, nome: f.nome.value, descricao: f.descricao.value, membros });
          m.close(); ICM.ui.toast('Grupo salvo', 'ok');
          if (ativo === r.id) atualizar(true); else location.hash = '#/chat/' + r.id;
        } catch (er) { ICM.ui.toast(er.message, 'danger'); }
      });
    }

    $('.chat-busca input').addEventListener('input', ICM.util.debounce(e => { filtro = e.target.value; desenharLista(); }, 150));
    const ng = el.querySelector('[data-novo-grupo]'); if (ng) ng.addEventListener('click', () => formGrupo(null));

    await atualizar(true);
    // Sem banco ainda: verifica mensagens novas a cada 4 s (no Supabase vira Realtime)
    timer = setInterval(() => atualizar(false).catch(() => { }), 4000);
  };
})();
