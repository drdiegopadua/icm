/* Chat interno — somente professores e colaboradores */
(function () {
  const { esc, icon, $ } = UI;
  window.Views = window.Views || {};

  const hora = (iso) => iso.slice(11, 16);

  Views.chat = function (el, canalId) {
    const eu = Store.sessao().id;
    const meusCanais = Store.filtrar('canais', (c) => c.membros.includes(eu));
    const colegas = Store.filtrar('equipe', (p) => p.id !== eu && p.ativo);
    const dmId = (outro) => `dm_${outro}`;
    const msgsDe = (cid) => Store.filtrar('mensagens', (m) => m.canal_id === cid).sort((a, b) => a.em.localeCompare(b.em));
    const lidos = () => Store.meta('lidos') || {};
    const naoLidasDe = (cid) => msgsDe(cid).filter((m) => m.autor_id !== eu && m.em > (lidos()[cid] || '')).length;
    const chaveDm = (outro) => [eu, outro].sort().join('__');
    // conversas diretas são guardadas com id determinístico por par de pessoas
    const idConversa = (cid) => (cid?.startsWith('dm_') ? 'dm:' + chaveDm(cid.slice(3)) : cid);

    const ativo = canalId || meusCanais[0]?.id;

    el.innerHTML = `
      <div class="cabecalho"><div class="titulos"><h1>Chat da equipe</h1><p class="sub">${icon('cadeado', 'width="14" style="vertical-align:-2px"')} Conversas internas entre professores e colaboradores. Alunos e famílias não têm acesso.</p></div></div>
      <div class="painel chat ${canalId ? 'conversa' : ''}" id="chat">
        <aside class="chat-lado">
          <div class="topo-lado"><input class="entrada" id="chat-busca" placeholder="Buscar pessoa ou grupo"></div>
          <div class="canais" id="canais"></div>
        </aside>
        <section class="chat-main" id="chat-main"></section>
      </div>`;

    const desenharLado = () => {
      const q = UI.normaliza($('#chat-busca').value);
      const ultima = (cid) => { const l = msgsDe(cid); return l[l.length - 1]; };
      const linhaCanal = (id, nome, avatarHtml, sub) => {
        const n = naoLidasDe(idConversa(id));
        return `<button class="canal ${id === ativo ? 'ativo' : ''}" data-canal="${id}">${avatarHtml}<span class="corpo"><b>${esc(nome)}</b><small>${esc(sub)}</small></span>${n ? `<span class="nao-lidas">${n}</span>` : ''}</button>`;
      };
      $('#canais').innerHTML =
        `<h4>Grupos</h4>` +
        meusCanais.filter((c) => UI.normaliza(c.nome).includes(q)).map((c) => {
          const u = ultima(c.id);
          return linhaCanal(c.id, c.nome, `<span class="hash">#</span>`, u ? `${D.nomePessoa(u.autor_id).split(' ')[0]}: ${u.texto}` : c.descricao);
        }).join('') +
        `<h4>Mensagens diretas</h4>` +
        colegas.filter((p) => UI.normaliza(p.nome).includes(q)).map((p) => {
          const u = ultima(idConversa(dmId(p.id)));
          return linhaCanal(dmId(p.id), p.nome, UI.avatar(p.nome, 'p'), u ? u.texto : p.funcao);
        }).join('');
    };

    const desenharConversa = () => {
      if (!ativo) { $('#chat-main').innerHTML = UI.vazio('Escolha uma conversa', 'chat'); return; }
      const ehDm = ativo.startsWith('dm_');
      const outro = ehDm ? D.pessoa(ativo.slice(3)) : null;
      const canal = ehDm ? null : Store.obter('canais', ativo);
      if (!outro && !canal) { $('#chat-main').innerHTML = UI.vazio('Conversa não encontrada', 'chat'); return; }
      const cid = idConversa(ativo);
      const msgs = msgsDe(cid);
      let dia = '', autorAnt = '';
      $('#chat-main').innerHTML = `
        <div class="chat-cab">
          <a class="btn-icone chat-voltar" href="#/chat" aria-label="Voltar">${icon('seta')}</a>
          ${ehDm ? UI.avatar(outro.nome) : '<span class="hash" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.12);font-weight:700">#</span>'}
          <div style="flex:1;min-width:0"><b>${esc(ehDm ? outro.nome : canal.nome)}</b><div class="pequeno muted">${esc(ehDm ? outro.funcao : `${canal.membros.length} membros · ${canal.descricao}`)}</div></div>
        </div>
        <div class="chat-msgs" id="msgs">${msgs.length ? msgs.map((m) => {
          const d = m.em.slice(0, 10);
          const sep = d !== dia ? `<div class="dia-sep">${d === UI.hojeISO() ? 'Hoje' : UI.data(d)}</div>` : '';
          const mesmo = d === dia && m.autor_id === autorAnt;
          dia = d; autorAnt = m.autor_id;
          const minha = m.autor_id === eu;
          const nome = D.nomePessoa(m.autor_id);
          return `${sep}<div class="msg ${minha ? 'minha' : ''} ${mesmo ? 'mesmo' : ''}">${minha ? '' : UI.avatar(nome, 'p')}<div class="bolha">${!minha && !ehDm && !mesmo ? `<div class="autor">${esc(nome)}</div>` : ''}<div>${esc(m.texto)}</div><div class="hora">${hora(m.em)}</div></div></div>`;
        }).join('') : UI.vazio(ehDm ? `Comece uma conversa com ${outro.nome.split(' ')[0]}` : 'Nenhuma mensagem ainda', 'chat')}</div>
        <form class="chat-envio" id="envio">
          <textarea id="txt" rows="1" placeholder="Escreva uma mensagem…  (Enter envia, Shift+Enter quebra linha)" aria-label="Mensagem"></textarea>
          <button class="btn" type="submit" aria-label="Enviar">${icon('enviar')}</button>
        </form>`;
      const box = $('#msgs');
      box.scrollTop = box.scrollHeight;
      // marca como lido
      const l = lidos();
      if (msgs.length) { l[cid] = msgs[msgs.length - 1].em; Store.meta('lidos', l); }
      App.atualizarPontoChat();

      const txt = $('#txt');
      txt.addEventListener('input', () => { txt.style.height = 'auto'; txt.style.height = Math.min(140, txt.scrollHeight) + 'px'; });
      txt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#envio').requestSubmit(); } });
      $('#envio').onsubmit = (e) => {
        e.preventDefault();
        const texto = txt.value.trim();
        if (!texto) return;
        const d = new Date();
        const em = `${UI.hojeISO()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        Store.salvar('mensagens', { canal_id: cid, autor_id: eu, texto, em });
        desenharConversa(); desenharLado();
        $('#txt').focus();
      };
      if (window.innerWidth > 1000) txt.focus();
    };

    $('#canais').onclick = (e) => { const b = e.target.closest('[data-canal]'); if (b) location.hash = `#/chat/${b.dataset.canal}`; };
    $('#chat-busca').oninput = desenharLado;
    desenharConversa();
    desenharLado();
  };
})();
