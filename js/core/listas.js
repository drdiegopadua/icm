/* Listas de opções que o Instituto pode gerenciar (botão "+" ao lado do campo):
   áreas de atuação, fontes de recurso, tipos de evento, categorias de patrimônio e estoque,
   rubricas, categorias de receita, tipos de ocorrência, motivos de saída e outras.
   - Opções novas ficam em config.listas e são somadas às listas padrão (ICM.C) ao entrar.
   - Nome e cor editados e opções excluídas ficam em config.listas_ajustes[lista][chave].
     Excluir só esconde a opção dos próximos cadastros: os registros antigos continuam com ela. */
(function () {
  const I = (n, s) => ICM.icon(n, s);
  const esc = s => ICM.util.esc(s);
  // tipo: obj (objeto com nome/cor/ícone), str (chave → texto), arr (lista de textos)
  const DEF = {
    AREAS: { t: 'obj', titulo: 'Área de atuação', cor: true, base: { icon: 'folder' } },
    FONTES: { t: 'str', titulo: 'Fonte de recurso' },
    TIPOS_EVENTO: { t: 'obj', titulo: 'Tipo de evento', cor: true, base: { icon: 'star' } },
    CATEGORIAS_PAT: { t: 'obj', titulo: 'Categoria de patrimônio', cor: true, base: { icon: 'more' } },
    CATEGORIAS_ESTOQUE: { t: 'obj', titulo: 'Categoria de estoque', cor: true, base: { icon: 'more' } },
    ORIGENS_PAT: { t: 'str', titulo: 'Origem do recurso', prefixo: 'origem:' },
    TIPOS_OCORRENCIA: { t: 'obj', titulo: 'Tipo de ocorrência', base: { cls: 'neutral', icon: 'info' } },
    RUBRICAS: { t: 'str', titulo: 'Rubrica de despesa' },
    CATEGORIAS_RECEITA: { t: 'str', titulo: 'Categoria de receita' },
    TIPOS_DOACAO: { t: 'str', titulo: 'Tipo de doação' },
    MOTIVOS_SAIDA: { t: 'arr', titulo: 'Motivo de saída' },
    UNIDADES: { t: 'arr', titulo: 'Unidade' },
    ORGAOS_REDE: { t: 'arr', titulo: 'Órgão da rede' },
    ENCAMINHAMENTOS: { t: 'arr', titulo: 'Encaminhamento' },
    FORMAS_PAGTO: { t: 'arr', titulo: 'Forma de pagamento' }
  };
  const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'opcao';
  const pode = () => ICM.auth && ICM.auth.can('listas.editar');
  const OCULTOS = {};   // lista → Set de chaves excluídas (escondidas dos próximos cadastros)

  // Itens da lista: { chave, nome, cor }
  function itens(lista) {
    const d = DEF[lista], atual = ICM.C[lista] || (d.t === 'arr' ? [] : {});
    return d.t === 'arr' ? atual.map(n => ({ chave: n, nome: n }))
      : Object.entries(atual).map(([k, v]) => ({ chave: k, nome: typeof v === 'string' ? v : v.nome, cor: typeof v === 'string' ? '' : v.cor }));
  }
  const oculto = (lista, chave) => !!(OCULTOS[lista] && OCULTOS[lista].has(chave));
  // Valor da opção no <select> (a origem do patrimônio tem prefixo) → chave da lista
  const chaveDoValor = (lista, v) => { const p = DEF[lista].prefixo || ''; v = String(v ?? ''); return p ? (v.startsWith(p) ? v.slice(p.length) : null) : v; };
  // Opções do campo sem as excluídas (a que já está gravada no registro continua aparecendo)
  function filtrar(lista, options, valorAtual) {
    if (!DEF[lista] || !OCULTOS[lista] || !OCULTOS[lista].size) return options;
    return options.filter(o => { const v = Array.isArray(o) ? o[0] : o; const k = chaveDoValor(lista, v); return k == null || !oculto(lista, k) || String(v) === String(valorAtual ?? ''); });
  }

  function aplicar(cfg) {
    const L = (cfg && cfg.listas) || {};
    Object.entries(L).forEach(([k, novos]) => {
      const d = DEF[k]; if (!d || !ICM.C[k]) return;
      if (d.t === 'arr') (novos || []).forEach(x => { if (!ICM.C[k].includes(x)) ICM.C[k].push(x); });
      else Object.entries(novos || {}).forEach(([key, v]) => { if (!ICM.C[k][key]) ICM.C[k][key] = v; });
    });
    const A = (cfg && cfg.listas_ajustes) || {};
    Object.entries(A).forEach(([k, porChave]) => {
      const d = DEF[k]; if (!d || !ICM.C[k]) return;
      OCULTOS[k] = new Set();
      Object.entries(porChave || {}).forEach(([key, aj]) => {
        if (aj.oculto) OCULTOS[k].add(key);
        if (d.t === 'arr' || !(key in ICM.C[k])) return;
        if (d.t === 'str') { if (aj.nome) ICM.C[k][key] = aj.nome; }
        else { if (aj.nome) ICM.C[k][key].nome = aj.nome; if (aj.cor) ICM.C[k][key].cor = aj.cor; }
      });
    });
  }
  async function carregar() { try { aplicar(await ICM.store.getConfig()); } catch (e) { /* sem config: só as padrão */ } }

  function exigir() { if (!pode()) throw new Error('Só a direção e a coordenação alteram as listas de opções.'); }
  const nomesAtivos = (lista, exceto) => itens(lista).filter(x => x.chave !== exceto && !oculto(lista, x.chave)).map(x => slug(x.nome));

  async function adicionar(lista, nome, cor) {
    exigir();
    const d = DEF[lista]; nome = String(nome || '').trim();
    if (!d) throw new Error('Lista desconhecida.');
    if (nome.length < 2) throw new Error('Digite o nome da nova opção.');
    const atual = ICM.C[lista];
    // Opção excluída com o mesmo nome: só traz de volta
    const igual = itens(lista).find(x => slug(x.nome) === slug(nome));
    if (igual && oculto(lista, igual.chave)) { await ajustar(lista, igual.chave, { oculto: false }); return igual.chave; }
    if (igual) throw new Error('Essa opção já existe.');
    const cfg = await ICM.store.getConfig(); const listas = { ...((cfg && cfg.listas) || {}) };
    let valor;
    if (d.t === 'arr') { listas[lista] = [...(listas[lista] || []), nome]; valor = nome; }
    else {
      let key = slug(nome), n = 2; while (atual[key]) key = slug(nome) + '_' + n++;
      const v = d.t === 'str' ? nome : { ...d.base, nome, ...(d.cor ? { cor: cor || '#64748b' } : {}) };
      listas[lista] = { ...(listas[lista] || {}), [key]: v }; valor = key;
    }
    await ICM.store.setConfig({ listas });
    aplicar({ listas });
    ICM.api.audit('editar', 'config', 'listas', `${d.titulo}: nova opção "${nome}"`).catch(() => { });
    return valor;
  }

  // Guarda nome/cor/exclusão de uma opção (padrão ou criada)
  async function ajustar(lista, chave, mud) {
    exigir();
    const cfg = await ICM.store.getConfig();
    const todos = { ...((cfg && cfg.listas_ajustes) || {}) };
    const daLista = { ...(todos[lista] || {}) };
    const aj = { ...(daLista[chave] || {}), ...mud };
    if (aj.oculto === false) delete aj.oculto;
    daLista[chave] = aj; todos[lista] = daLista;
    await ICM.store.setConfig({ listas_ajustes: todos });
    aplicar({ listas_ajustes: { [lista]: daLista } });
  }

  async function renomear(lista, chave, nome, cor) {
    const d = DEF[lista]; nome = String(nome || '').trim();
    if (nome.length < 2) throw new Error('Digite o nome da opção.');
    if (nomesAtivos(lista, chave).includes(slug(nome))) throw new Error('Já existe uma opção com esse nome.');
    const antes = itens(lista).find(x => x.chave === chave) || {};
    if (d.t === 'arr') {
      // Texto puro: cria a opção com o nome novo e esconde a antiga (registros antigos mantêm o texto que tinham)
      if (slug(nome) !== slug(antes.nome)) { await adicionar(lista, nome); await ajustar(lista, chave, { oculto: true }); }
    } else await ajustar(lista, chave, { nome, ...(d.cor && cor ? { cor } : {}) });
    ICM.api.audit('editar', 'config', 'listas', `${d.titulo}: "${antes.nome}" → "${nome}"`).catch(() => { });
  }
  async function excluir(lista, chave) {
    const nome = (itens(lista).find(x => x.chave === chave) || {}).nome;
    await ajustar(lista, chave, { oculto: true });
    ICM.api.audit('editar', 'config', 'listas', `${DEF[lista].titulo}: opção "${nome}" excluída`).catch(() => { });
  }
  async function restaurar(lista, chave) {
    await ajustar(lista, chave, { oculto: false });
    ICM.api.audit('editar', 'config', 'listas', `${DEF[lista].titulo}: opção "${(itens(lista).find(x => x.chave === chave) || {}).nome}" restaurada`).catch(() => { });
  }

  // Botão "+" ao lado do rótulo (ICM.ui.field com lista: 'AREAS')
  function botao(lista) { return pode() && DEF[lista] ? `<button type="button" class="lbl-mais" data-mais="${lista}" title="Criar, editar ou excluir opções de ${esc(DEF[lista].titulo.toLowerCase())}" aria-label="Gerenciar opções">${I('plus', 13)}</button>` : ''; }

  // Atualiza o <select> do formulário aberto: nomes novos, opções novas e excluídas
  function atualizarSelect(sel, lista) {
    if (!sel || sel.tagName !== 'SELECT') return;
    const p = DEF[lista].prefixo || '';
    const porChave = Object.fromEntries(itens(lista).map(x => [x.chave, x]));
    [...sel.options].forEach(o => {
      const k = chaveDoValor(lista, o.value); if (k == null || !(k in porChave)) return;
      if (oculto(lista, k) && !o.selected) o.remove(); else o.textContent = porChave[k].nome;
    });
    const tem = new Set([...sel.options].map(o => o.value));
    itens(lista).filter(x => !oculto(lista, x.chave) && !tem.has(p + x.chave)).forEach(x => { const o = document.createElement('option'); o.value = p + x.chave; o.textContent = x.nome; sel.appendChild(o); });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mais]'); if (!b) return;
    e.preventDefault();
    const lista = b.dataset.mais, d = DEF[lista];
    const campo = b.closest('.field'); const sel = campo && campo.querySelector('select, input[list]');
    const cores = ICM.C.CORES_PROJETO || [];
    const corPicker = (nome, atual) => `<div class="row wrap" style="gap:6px">${cores.map((c, i) => `<label style="cursor:pointer"><input type="radio" name="${nome}" value="${c}" ${(atual ? c === atual : i === 0) ? 'checked' : ''} hidden><span class="cor-op" style="--c:${c}"></span></label>`).join('')}</div>`;
    let editando = null;
    const m = ICM.ui.modal({ title: `Opções — ${d.titulo}`, body: `<form class="col" onsubmit="return false">
      <div class="field"><label>Nova opção</label><div class="row" style="gap:8px"><input class="input grow" data-nome autocomplete="off" maxlength="60" placeholder="Ex.: ${lista === 'AREAS' ? 'Música' : lista === 'FONTES' ? 'Fundo municipal' : 'Nova opção'}"><button type="button" class="btn btn-primary" data-add>${I('plus', 16)} Criar</button></div></div>
      ${d.cor ? `<div class="field"><label>Cor da nova opção</label>${corPicker('cor')}</div>` : ''}
      <div class="section-title" style="margin:6px 0 0">Opções existentes</div>
      <div class="col lst-itens" data-itens></div>
      <p class="xs muted">Editar muda o nome em todos os cadastros. Excluir tira a opção dos próximos cadastros; o que já foi cadastrado com ela continua igual.</p></form>
      <style>.cor-op{display:block;width:24px;height:24px;border-radius:8px;background:var(--c);border:3px solid transparent}input:checked+.cor-op{border-color:var(--text)}</style>`,
      foot: `<button class="btn btn-primary" data-close>Concluir</button>` });
    const desenhar = () => {
      const xs = itens(lista), ativos = xs.filter(x => !oculto(lista, x.chave)), excl = xs.filter(x => oculto(lista, x.chave));
      const linha = x => editando === x.chave
        ? `<div class="lst-item editando"><div class="col grow" style="gap:8px"><input class="input" data-ed-nome value="${esc(x.nome)}" maxlength="60" aria-label="Nome da opção">${d.cor ? corPicker('cor_ed', x.cor) : ''}</div>
            <div class="row" style="gap:6px"><button type="button" class="btn btn-sm btn-primary" data-salvar="${esc(x.chave)}">${I('check', 14)} Salvar</button><button type="button" class="btn btn-sm" data-cancelar>Cancelar</button></div></div>`
        : `<div class="lst-item">${d.cor ? `<span class="lst-cor" style="--c:${esc(x.cor || '#64748b')}"></span>` : ''}<span class="grow">${esc(x.nome)}</span>
            <button type="button" class="btn btn-sm btn-icon" data-editar="${esc(x.chave)}" title="Editar" aria-label="Editar ${esc(x.nome)}">${I('edit', 15)}</button>
            <button type="button" class="btn btn-sm btn-icon lst-del" data-excluir="${esc(x.chave)}" title="Excluir" aria-label="Excluir ${esc(x.nome)}">${I('trash', 15)}</button></div>`;
      m.$('[data-itens]').innerHTML = (ativos.length ? ativos.map(linha).join('') : '<div class="xs muted">Nenhuma opção ativa.</div>')
        + (excl.length ? `<details class="mt-2"><summary class="small bold" style="cursor:pointer">Excluídas (${excl.length})</summary><div class="col mt-2">${excl.map(x => `<div class="lst-item excluida"><span class="grow">${esc(x.nome)}</span><button type="button" class="btn btn-sm" data-restaurar="${esc(x.chave)}">${I('history', 14)} Restaurar</button></div>`).join('')}</div></details>` : '');
      const ed = m.$('[data-ed-nome]'); if (ed) { ed.focus(); ed.select(); ed.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); m.$('[data-salvar]').click(); } else if (ev.key === 'Escape') { ev.stopPropagation(); editando = null; desenhar(); } }); }
    };
    const depois = () => { atualizarSelect(sel, lista); desenhar(); };
    m.$('[data-itens]').addEventListener('click', async ev => {
      const t = ev.target.closest('button'); if (!t) return;
      try {
        if (t.dataset.editar) { editando = t.dataset.editar; desenhar(); }
        else if (t.hasAttribute('data-cancelar')) { editando = null; desenhar(); }
        else if (t.dataset.salvar) {
          const c = m.el.querySelector('input[name=cor_ed]:checked');
          await ICM.ui.run(() => renomear(lista, t.dataset.salvar, m.$('[data-ed-nome]').value, c && c.value), 'Opção atualizada');
          editando = null; depois();
        }
        else if (t.dataset.excluir) {
          const x = itens(lista).find(i => i.chave === t.dataset.excluir);
          if (!(await ICM.ui.confirm({ title: 'Excluir opção', text: `Excluir "${x.nome}" da lista de ${d.titulo.toLowerCase()}? Os cadastros que já usam essa opção continuam iguais, e dá para restaurar depois.`, ok: 'Excluir', danger: true }))) return;
          await ICM.ui.run(() => excluir(lista, x.chave), 'Opção excluída'); depois();
        }
        else if (t.dataset.restaurar) { await ICM.ui.run(() => restaurar(lista, t.dataset.restaurar), 'Opção restaurada'); depois(); }
      } catch (er) { /* aviso já mostrado */ }
    });
    const criar = async () => {
      const nome = m.$('[data-nome]').value; const c = m.el.querySelector('input[name=cor]:checked');
      try {
        const v = await ICM.ui.run(() => adicionar(lista, nome, c && c.value), 'Opção criada');
        m.$('[data-nome]').value = '';
        atualizarSelect(sel, lista);
        if (sel && sel.tagName === 'SELECT') { sel.value = (d.prefixo || '') + v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        desenhar();
      } catch (er) { /* aviso já mostrado */ }
    };
    m.$('[data-add]').addEventListener('click', criar);
    m.$('[data-nome]').addEventListener('keydown', ev => { if (ev.key === 'Enter') criar(); });
    desenhar();
    setTimeout(() => m.$('[data-nome]').focus(), 80);
  });

  ICM.listas = { DEF, carregar, aplicar, adicionar, renomear, excluir, restaurar, filtrar, oculto, botao, pode };
})();
