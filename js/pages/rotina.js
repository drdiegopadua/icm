/* Documentos da instituição, aniversariantes e rotina do dia */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const DI = () => ICM.C.DOCS_INST;

  // ================= Documentos da instituição =================
  ICM.pages.documentos = async function (el) {
    if (!ICM.auth.can('docinst.ver')) { el.innerHTML = ui().empty('Acesso restrito.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Documentos da instituição']]);
    const list = await ICM.api.docsInst.list();
    const apto = await ICM.api.docsInst.aptoRepasse();
    const edit = ICM.auth.can('docinst.gerir');
    const nome = d => d.tipo === 'outro' ? (d.nome || 'Outro') : d.cfg.nome;
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Documentos da instituição</h1><div class="page-sub">Certidões, alvarás e registros com validade — certidão vencida trava repasse de recurso público</div></div>
        ${edit ? `<button class="btn btn-primary" data-novo>${I('upload', 18)} Novo documento</button>` : ''}</div>
      <div class="card mb-4 apto ${apto.apto ? 'ok' : 'danger'}"><div class="row wrap" style="gap:18px"><div class="apto-ic">${I(apto.apto ? 'shield' : 'alert', 34)}</div>
        <div class="grow"><div style="font-size:22px;font-weight:900">${apto.apto ? 'Apta a receber recursos públicos' : 'Atenção: repasses podem ser bloqueados'}</div>
        <div class="small mt-2">${apto.apto ? 'Todas as certidões exigidas em convênios e termos de fomento estão válidas.' : [apto.vencidos.length ? `<b>Vencidos:</b> ${apto.vencidos.map(esc).join(', ')}` : '', apto.faltando.length ? `<b>Não cadastrados:</b> ${apto.faltando.map(esc).join(', ')}` : ''].filter(Boolean).join('<br>')}</div></div></div></div>
      <div class="grid grid-3 stagger">${list.map(d => `<div class="card doc-inst ${d.status.nivel}">
        <div class="row between"><span class="badge ${d.status.nivel === 'ok' ? 'ok' : d.status.nivel}">${esc(d.status.txt)}</span>${d.cfg.repasse ? `<span class="badge neutral" title="Exigido para receber recurso público">Repasse</span>` : ''}</div>
        <div class="bold mt-2" style="font-size:16px">${esc(nome(d))}</div>
        <div class="xs muted">${d.numero ? 'Nº ' + esc(d.numero) + ' · ' : ''}${d.emissao ? 'emitido em ' + esc(fmtDate(d.emissao)) : ''}</div>
        ${d.validade && d.status.dias != null && d.cfg.dias ? `<div class="progress mt-2 ${d.status.nivel === 'ok' ? 'ok' : d.status.nivel}"><span style="width:${Math.max(3, Math.min(100, d.status.dias / d.cfg.dias * 100))}%"></span></div>` : ''}
        ${d.obs ? `<div class="xs muted mt-2">${esc(d.obs)}</div>` : ''}
        <div class="row wrap mt-4">
          ${d.arquivo ? `<button class="btn btn-sm" data-ver="${esc(d.arquivo.id)}">${I('eye', 14)} Ver arquivo</button>` : '<span class="xs" style="color:var(--warn)">Sem arquivo anexado</span>'}
          ${d.cfg.link ? `<a class="btn btn-sm btn-ghost" href="${esc(d.cfg.link)}" target="_blank" rel="noopener noreferrer">${I('refresh', 14)} Emitir nova</a>` : ''}
          ${edit ? `<button class="btn btn-sm btn-ghost" data-edit="${esc(d.id)}">${I('edit', 14)}</button>` : ''}
        </div></div>`).join('') || `<div class="span-all">${ui().empty('Nenhum documento cadastrado', 'fileText')}</div>`}</div></div>`;
    const nb = el.querySelector('[data-novo]'); if (nb) nb.addEventListener('click', () => form({}));
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => form(list.find(d => d.id === b.dataset.edit))));
    el.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => ICM.pages._verArquivo(b.dataset.ver)));

    function form(d) {
      const F = o => ui().field(o);
      const m = ui().modal({
        title: d.id ? 'Atualizar documento' : 'Novo documento da instituição',
        body: `<form class="grid grid-2">${F({ name: 'tipo', label: 'Documento', type: 'select', value: d.tipo, options: Object.entries(DI()).map(([k, v]) => [k, v.nome]), cls: 'span-2' })}
          <div class="span-2" data-nome ${d.tipo === 'outro' ? '' : 'hidden'}>${F({ name: 'nome', label: 'Nome do documento', value: d.nome })}</div>
          ${F({ name: 'numero', label: 'Número / código', value: d.numero })}${F({ name: 'orgao', label: 'Órgão emissor', value: d.orgao })}
          ${F({ name: 'emissao', label: 'Emissão', type: 'date', value: d.emissao || ICM.util.today() })}${F({ name: 'validade', label: 'Validade', type: 'date', value: d.validade, hint: 'Calculada pela validade padrão — confira na certidão' })}
          ${F({ name: 'obs', label: 'Observações', cls: 'span-2', value: d.obs })}
          <label class="photo-drop span-2" style="aspect-ratio:auto;padding:18px">${I('upload', 24)}<span data-fn>${d.arquivo ? 'Trocar arquivo (' + esc(d.arquivo.nome) + ')' : 'Anexar certidão (PDF ou foto)'}</span><input type="file" name="_arq" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></label></form>
          <div class="xs muted mt-2" data-link></div>`,
        foot: `${d.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>`
      });
      const tipo = m.$('[name=tipo]'), emi = m.$('[name=emissao]'), val = m.$('[name=validade]'), fi = m.$('[name=_arq]');
      const calc = () => { const c = DI()[tipo.value]; m.$('[data-nome]').hidden = tipo.value !== 'outro'; if (c.dias && emi.value) val.value = ICM.util.addDays(emi.value, c.dias); m.$('[data-link]').innerHTML = c.link ? `Emitir em: <a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">${esc(new URL(c.link).hostname)}</a>` : ''; };
      tipo.addEventListener('change', calc); emi.addEventListener('change', calc); if (!d.id) calc(); else m.$('[data-link]').innerHTML = DI()[d.tipo].link ? `Emitir em: <a href="${esc(DI()[d.tipo].link)}" target="_blank" rel="noopener noreferrer">${esc(new URL(DI()[d.tipo].link).hostname)}</a>` : '';
      fi.addEventListener('change', () => { m.$('[data-fn]').textContent = fi.files[0] ? fi.files[0].name : 'Anexar'; });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const x = ICM.util.formData(m.$('form')); delete x._arq;
        let arquivo = d.arquivo || null;
        if (fi.files[0]) { const novo = await ui().run(() => ICM.api.arquivos.salvar(fi.files[0], { col: 'docs_inst', id: d.id || 'novo' })); if (arquivo) await ICM.api.arquivos.remove(arquivo.id); arquivo = novo; }
        await ui().run(() => ICM.api.docsInst.save({ ...d, ...x, arquivo }), 'Documento salvo');
        m.close(); ICM.app.reload();
      }).catch(() => { }));
      const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (await ui().confirm({ title: 'Excluir documento', text: 'Remover este documento e o arquivo anexado?', ok: 'Excluir', danger: true })) { await ICM.api.docsInst.remove(d.id); m.close(); ICM.app.reload(); } });
    }
  };

  // ================= Aniversariantes =================
  ICM.pages.aniversariantes = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Aniversariantes']]);
    let mes = new Date().getMonth() + 1, grupo = '';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Aniversariantes 🎂</h1><div class="page-sub">Alunos, equipe, voluntários, associados, doadores e patrocinadores — com mensagem pronta no WhatsApp</div></div>
        <div class="row"><button class="btn btn-icon btn-sm" data-m="-1" aria-label="Mês anterior">${I('chevronLeft', 16)}</button><b data-lbl style="min-width:120px;text-align:center;text-transform:capitalize"></b><button class="btn btn-icon btn-sm" data-m="1" aria-label="Próximo mês">${I('chevronRight', 16)}</button></div></div>
      <div class="segmented mb-4" data-g></div><div data-l></div></div>`;
    async function draw() {
      el.querySelector('[data-lbl]').textContent = ICM.util.MESES[mes - 1];
      const l = await ICM.api.aniversarios(mes);
      const grupos = [...new Set(l.map(x => x.grupo))];
      el.querySelector('[data-g]').innerHTML = `<button data-v="" class="${!grupo ? 'active' : ''}">Todos (${l.length})</button>${grupos.map(g => `<button data-v="${esc(g)}" class="${grupo === g ? 'active' : ''}">${esc(g)} (${l.filter(x => x.grupo === g).length})</button>`).join('')}`;
      el.querySelectorAll('[data-g] button').forEach(b => b.addEventListener('click', () => { grupo = b.dataset.v; draw(); }));
      const f = l.filter(x => !grupo || x.grupo === grupo);
      el.querySelector('[data-l]').innerHTML = f.length ? `<div class="grid grid-3 stagger">${f.map(x => `<div class="card aniv ${x.hoje ? 'hoje' : ''}">
        <div class="row"><div class="aniv-dia"><b>${x.dia}</b><span>${esc(ICM.util.MESES_C[mes - 1])}</span></div><div class="grow"><a href="${esc(x.href)}" style="color:inherit"><b>${esc(x.nome)}</b></a><div class="xs muted">${esc(x.grupo)}${x.legenda ? ' · ' + esc(x.legenda) : ''}</div><div class="xs">${x.tipo === 'aniv_patrocinador' ? `${x.idade} ano(s) de parceria` : `${x.idade} anos`}${x.hoje ? ' · <b style="color:var(--primary)">HOJE! 🎉</b>' : ''}</div></div></div>
        <div class="row end mt-4">${ICM.wa.btn(x, { label: x.passou && !x.hoje ? 'Parabenizar (atrasado)' : 'Parabenizar' })}</div></div>`).join('')}</div>` : ui().empty('Nenhum aniversariante neste mês', 'star');
    }
    el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mes = ((mes - 1 + Number(b.dataset.m) + 12) % 12) + 1; draw(); }));
    await draw();
  };

  // ================= Rotina do dia =================
  async function rotinaHTML(r, compacto) {
    const bloco = (ic, cor, titulo, n, corpo, href) => n ? `<div class="card rotina-bloco" style="--c:${cor}"><div class="card-head"><div class="row"><span class="rot-ic">${I(ic, 18)}</span><b>${esc(titulo)}</b><span class="badge" style="background:color-mix(in srgb,${cor} 15%,transparent);color:${cor}">${n}</span></div>${href ? `<a class="btn btn-sm btn-ghost" href="${href}">Abrir ${I('chevronRight', 14)}</a>` : ''}</div>${corpo}</div>` : '';
    const lim = compacto ? 4 : 50;
    return [
      bloco('star', '#ec4899', 'Aniversariantes de hoje', r.aniversarios.length, r.aniversarios.slice(0, lim).map(x => `<div class="list-item"><b class="grow">${esc(x.nome)} <span class="xs muted">${esc(x.grupo)}</span></b>${ICM.wa.btn(x, { label: 'Parabenizar' })}</div>`).join(''), '#/aniversariantes'),
      bloco('alert', '#ef4444', 'Alunos com faltas (regra 2/3)', r.faltas.length, r.faltas.slice(0, lim).map(x => `<div class="list-item"><div class="grow"><b>${esc(x.aluno)}</b><div class="xs muted">${esc(x.contexto)}</div></div>${ICM.wa.btn(x, { label: 'Avisar família' })}</div>`).join(''), '#/avisos'),
      bloco('calendar', '#2563eb', 'Hoje e amanhã', r.aulasHoje.length + r.agenda.length, r.aulasHoje.slice(0, lim).map(a => `<a class="list-item" href="#/turmas/${esc(a.turma_id)}?aula=${esc(a.id)}"><span class="badge">${esc(a.inicio)}</span><b class="grow">${esc(a.turma)}</b>${a.status === 'realizada' ? ui().badge('Chamada feita', 'ok') : ui().badge('Fazer chamada', 'warn')}</a>`).join('') + r.agenda.map(a => `<a class="list-item" href="${esc(a.href)}"><span class="badge neutral">${a.data === ICM.util.today() ? 'Hoje' : 'Amanhã'}</span><b class="grow">${esc(a.titulo)}</b><span class="xs muted">${esc(a.tipo)} ${esc(a.hora || '')}</span></a>`).join(''), '#/chamada'),
      bloco('fileText', '#d97706', 'Documentos da instituição', r.docsInst.length, `${r.apto && !r.apto.apto ? `<div class="sens-lock mb-4" style="background:var(--danger-soft);color:#dc2626">${I('alert', 16)} Repasses podem ser bloqueados</div>` : ''}${r.docsInst.slice(0, lim).map(d => `<div class="list-item"><b class="grow">${esc(d.tipo === 'outro' ? d.nome : d.cfg.nome)}</b>${ui().badge(d.status.txt, d.status.nivel)}</div>`).join('')}`, '#/documentos'),
      bloco('users', '#7c3aed', 'Equipe: contratos e documentos', r.rh.length, r.rh.slice(0, lim).map(a => `<a class="list-item" href="#/equipe/${esc(a.id)}"><b>${esc(a.pessoa)}</b><span class="small grow">${esc(a.txt)}</span></a>`).join(''), '#/equipe'),
      bloco('dollar', '#dc2626', 'Mensalidades em atraso', r.mensalidades.length, r.mensalidades.slice(0, lim).map(x => `<div class="list-item"><div class="grow"><b>${esc(x.responsavel)}</b><div class="xs muted">${esc(x.contexto)}</div></div>${ICM.wa.btn(x, { label: 'Cobrar' })}</div>`).join(''), '#/associados'),
      bloco('download', '#0891b2', 'Empréstimos atrasados', r.emprestimos.length, r.emprestimos.slice(0, lim).map(e => `<div class="list-item"><b class="grow">${esc(e.tomador)}</b><span class="xs muted">${e.quantidade}x ${esc(e.item.nome)}</span></div>`).join(''), '#/patrimonio'),
      bloco('layers', '#10b981', 'Estoque abaixo do mínimo', r.estoque.length, r.estoque.slice(0, lim).map(i => `<div class="list-item"><b class="grow">${esc(i.nome)} ${esc(i.variacao || '')}</b><span class="badge danger">${i.saldo} ${esc(i.unidade)}</span></div>`).join(''), '#/estoque'),
      bloco('clipboard', '#f59e0b', 'Aulas passadas sem chamada', r.semRegistro ? 1 : 0, `<div class="small">${r.semRegistro} aula(s) sem registro de chamada/relatório.</div>`, '#/dashboard'),
      bloco('key', '#64748b', 'Mandatos a vencer', r.mandatos.length, r.mandatos.map(a => `<div class="list-item small">${esc(a.txt)}</div>`).join(''), ''),
      bloco('shield', '#475569', 'Privacidade (LGPD)', r.anonimizar, `<div class="small">${r.anonimizar} ex-aluno(s) passaram do prazo de guarda e podem ser anonimizados.</div>`, '#/dados')
    ].join('');
  }

  ICM.pages.rotina = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Rotina do dia']]);
    const r = await ICM.api.rotina();
    el.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">Rotina do dia ☀️</h1><div class="page-sub">${esc(ICM.util.DIAS[new Date().getDay()])}, ${esc(ICM.util.fmtDateLong(ICM.util.today()))} — tudo o que precisa de atenção hoje</div></div></div>
      ${r.total ? `<div class="grid grid-2 stagger">${await rotinaHTML(r, false)}</div>` : ui().empty('Tudo em dia! Nenhuma pendência hoje. 🎉', 'check')}</div>`;
  };

  // Abre a rotina automaticamente no primeiro acesso de cada dia
  ICM.pages._rotinaAutomatica = async function () {
    const user = ICM.auth.user(); if (!user) return;
    const k = `icm_rotina_${user.id}`; const hoje = ICM.util.today();
    try { if (localStorage.getItem(k) === hoje) return; localStorage.setItem(k, hoje); } catch (e) { return; }
    const r = await ICM.api.rotina(); if (!r.total) return;
    const m = ui().modal({ title: `${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, ${user.nome.split(' ')[0]}! Sua rotina de hoje ☀️`, size: 'wide', body: `<div class="grid grid-2">${await rotinaHTML(r, true)}</div>`, foot: `<a class="btn" href="#/rotina" data-close>Ver rotina completa</a><button class="btn btn-primary" data-close>Começar o dia</button>` });
    m.$$('a[href]').forEach(a => a.addEventListener('click', () => m.close()));
  };
})();
