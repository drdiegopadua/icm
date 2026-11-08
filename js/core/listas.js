/* Listas de opções que o Instituto pode ampliar (botão "+" ao lado do campo):
   áreas de atuação, fontes de recurso, tipos de evento, categorias de patrimônio e estoque,
   rubricas, categorias de receita, tipos de ocorrência, motivos de saída e outras.
   As opções novas ficam em config.listas e são somadas às listas padrão (ICM.C) ao entrar. */
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

  function aplicar(cfg) {
    const L = (cfg && cfg.listas) || {};
    Object.entries(L).forEach(([k, itens]) => {
      const d = DEF[k]; if (!d || !ICM.C[k]) return;
      if (d.t === 'arr') (itens || []).forEach(x => { if (!ICM.C[k].includes(x)) ICM.C[k].push(x); });
      else Object.entries(itens || {}).forEach(([key, v]) => { if (!ICM.C[k][key]) ICM.C[k][key] = v; });
    });
  }
  async function carregar() { try { aplicar(await ICM.store.getConfig()); } catch (e) { /* sem config: só as padrão */ } }

  async function adicionar(lista, nome, cor) {
    if (!pode()) throw new Error('Só a direção e a coordenação criam novas opções.');
    const d = DEF[lista]; nome = String(nome || '').trim();
    if (!d) throw new Error('Lista desconhecida.');
    if (nome.length < 2) throw new Error('Digite o nome da nova opção.');
    const atual = ICM.C[lista];
    const nomes = d.t === 'arr' ? atual : Object.values(atual).map(v => typeof v === 'string' ? v : v.nome);
    if (nomes.some(n => slug(n) === slug(nome))) throw new Error('Essa opção já existe.');
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

  // Botão "+" ao lado do rótulo (ICM.ui.field com lista: 'AREAS')
  function botao(lista) { return pode() && DEF[lista] ? `<button type="button" class="lbl-mais" data-mais="${lista}" title="Criar nova opção de ${esc(DEF[lista].titulo.toLowerCase())}" aria-label="Criar nova opção">${I('plus', 13)}</button>` : ''; }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mais]'); if (!b) return;
    e.preventDefault();
    const lista = b.dataset.mais, d = DEF[lista];
    const campo = b.closest('.field'); const sel = campo && campo.querySelector('select, input[list]');
    const cores = ICM.C.CORES_PROJETO || [];
    const m = ICM.ui.modal({ title: `Nova opção — ${d.titulo}`, size: 'sm', body: `<form class="col" onsubmit="return false">
      <div class="field"><label>Nome</label><input class="input" data-nome autocomplete="off" placeholder="Ex.: ${lista === 'AREAS' ? 'Música' : lista === 'FONTES' ? 'Fundo municipal' : 'Nova opção'}"></div>
      ${d.cor ? `<div class="field"><label>Cor</label><div class="row wrap" style="gap:6px">${cores.map((c, i) => `<label style="cursor:pointer"><input type="radio" name="cor" value="${c}" ${i === 0 ? 'checked' : ''} hidden><span class="cor-op" style="--c:${c}"></span></label>`).join('')}</div></div>` : ''}
      <p class="xs muted">A opção fica disponível para todos, neste e nos próximos cadastros.</p></form>
      <style>.cor-op{display:block;width:26px;height:26px;border-radius:8px;background:var(--c);border:3px solid transparent}input:checked+.cor-op{border-color:var(--text)}</style>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('plus', 16)} Criar</button>` });
    setTimeout(() => m.$('[data-nome]').focus(), 80);
    const ok = async () => {
      const nome = m.$('[data-nome]').value; const c = m.el.querySelector('input[name=cor]:checked');
      try {
        const v = await ICM.ui.run(() => adicionar(lista, nome, c && c.value), 'Opção criada');
        if (sel && sel.tagName === 'SELECT') { const o = document.createElement('option'); o.value = v; o.textContent = nome.trim(); sel.appendChild(o); sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        m.close();
      } catch (er) { /* aviso já mostrado */ }
    };
    m.$('[data-ok]').addEventListener('click', ok);
    m.$('[data-nome]').addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); });
  });

  ICM.listas = { DEF, carregar, aplicar, adicionar, botao, pode };
})();
