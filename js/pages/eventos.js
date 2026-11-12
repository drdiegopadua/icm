/* Eventos, masterclasses, apresentações, campeonatos e participações */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.eventos = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Eventos e ações']]);
    const list = await ICM.api.eventos.list();
    const projetos = await ICM.api.raw('projetos');
    let tipo = '', quando = 'todos';
    const hoje = ICM.util.today();
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Eventos e ações</h1><div class="page-sub">Eventos, masterclasses, apresentações, campeonatos e participações externas</div></div>
        ${ICM.auth.can('eventos.editar') ? `<button class="btn btn-primary" data-new>${I('plus', 18)} Novo evento</button>` : ''}</div>
      <div class="row wrap between mb-4">
        <div class="segmented" data-tipo><button data-v="" class="active">Todos</button>${Object.entries(ICM.C.TIPOS_EVENTO).map(([k, v]) => `<button data-v="${k}">${esc(v.nome)}</button>`).join('')}</div>
        <div class="segmented" data-quando><button data-v="todos" class="active">Todos</button><button data-v="futuros">Próximos</button><button data-v="passados">Realizados</button></div>
      </div>
      <div class="grid grid-3 stagger" data-list></div></div>`;
    const render = () => {
      const l = list.filter(e => (!tipo || e.tipo === tipo) && (quando === 'todos' || (quando === 'futuros' ? e.data >= hoje : e.data < hoje)));
      el.querySelector('[data-list]').innerHTML = l.length ? l.map(e => { const t = ICM.C.TIPOS_EVENTO[e.tipo]; const ps = ICM.util.projetosEvento(e).map(id => projetos.find(x => x.id === id)).filter(Boolean); const p = ps[0]; const fut = e.data >= hoje; return `
        <div class="card project-card hoverable" style="--c:${p ? p.cor : t.cor}" data-href="#/eventos/${esc(e.id)}">
          ${(e.fotos || [])[0] ? `<div class="photo" style="margin:-8px -8px 0;aspect-ratio:16/8"><img src="${esc(e.fotos[0].src)}" alt=""></div>` : ''}
          <div class="row between"><span class="area-chip" style="--c:${t.cor}">${esc(t.nome)}</span>${fut ? ui().badge('Programado', '', true) : ui().badge('Realizado', 'ok', true)}</div>
          <div class="name">${esc(e.titulo)}</div>
          <div class="meta"><span>${I('calendar', 15)} ${esc(fmtDate(e.data))}${e.horario ? ' · ' + esc(e.horario) : ''}</span><span>${I('pin', 15)} ${esc(e.local || '')}</span></div>
          <div class="meta"><span>${I('users', 15)} ${(e.alunos || []).length} alunos</span>${e.publico ? `<span>${I('eye', 15)} ${num(e.publico)} público</span>` : ''}${ps.length ? `<span>${I('folder', 15)} ${esc(ps.length > 1 ? `${ps.length} projetos` : p.nome)}</span>` : ''}</div>
          ${e.resultado ? `<div class="small bold" style="color:${t.cor}">${I('award', 15)} ${esc(e.resultado)}</div>` : ''}
        </div>`; }).join('') : `<div class="span-all">${ui().empty('Nenhum evento', 'star')}</div>`;
      el.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
    };
    const seg = (sel, fn) => el.querySelectorAll(`${sel} button`).forEach(b => b.addEventListener('click', () => { el.querySelectorAll(`${sel} button`).forEach(x => x.classList.toggle('active', x === b)); fn(b.dataset.v); render(); }));
    seg('[data-tipo]', v => { tipo = v; }); seg('[data-quando]', v => { quando = v; });
    const nb = el.querySelector('[data-new]'); if (nb) nb.addEventListener('click', () => eventoForm());
    render();
  };

  ICM.pages.eventoDetalhe = async function (el, params) {
    const e = await ICM.api.eventos.get(params.id);
    if (!e) { el.innerHTML = ui().empty('Evento não encontrado'); return; }
    ICM.app.setCrumbs([['Eventos', '#/eventos'], [e.titulo]]);
    const t = ICM.C.TIPOS_EVENTO[e.tipo];
    const todosProj = await ICM.api.projetos.list();
    const ps = ICM.util.projetosEvento(e).map(id => todosProj.find(x => x.id === id)).filter(Boolean); const p = ps[0];
    const alunos = (await ICM.api.alunos.list({ status: '' })).filter(a => (e.alunos || []).includes(a.id));
    const fotos = (e.fotos || []).map(f => ({ ...f }));
    const canEdit = ICM.auth.can('eventos.editar');
    // Menor de idade na data do evento (sem data de nascimento: trata como menor, por segurança)
    const menor = a => { const n = ICM.util.parseD(a.nascimento), d = ICM.util.parseD(e.data); if (!n || !d) return true; let id = d.getFullYear() - n.getFullYear(); if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) id--; return id < 18; };
    const menores = alunos.filter(menor);
    el.innerHTML = `<div class="page">
      <div class="card mb-4 project-card" style="--c:${p ? p.cor : t.cor};cursor:default">
        <div class="row between wrap"><div>
          <span class="area-chip" style="--c:${t.cor}">${esc(t.nome)}</span>
          <h1 class="page-title mt-2" style="font-size:28px">${esc(e.titulo)}</h1>
          <div class="meta mt-2"><span>${I('calendar', 15)} ${esc(ICM.util.fmtDateLong(e.data))}${e.horario ? ' · ' + esc(e.horario) : ''}</span><span>${I('pin', 15)} ${esc(e.local || '')}</span>${ps.map(x => `<a href="#/projetos/${esc(x.id)}">${I('folder', 15)} ${esc(x.nome)}</a>`).join('')}</div></div>
          <div class="row wrap">${canEdit ? `<button class="btn" data-edit>${I('edit', 18)} Editar</button>` : ''}${menores.length ? `<button class="btn" data-aut title="Autorização para os pais assinarem, já preenchida com os dados da matrícula">${I('fileText', 18)} Autorizações de viagem <span class="badge">${menores.length}</span></button>` : ''}<button class="btn btn-primary" data-rel>${I('fileText', 18)} Relatório do evento</button></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('info', 18)} Descrição</div><div class="text-block">${esc(e.descricao || 'Sem descrição')}</div>
          <hr class="divider">${ui().kv([['Público estimado', e.publico ? num(e.publico) : ''], ['Alunos participantes', String(alunos.length)], ['Resultado / premiação', e.resultado]])}
          <hr class="divider"><div class="grid grid-2" style="gap:14px"><div>${transporteHtml(e.transporte, e.veiculos)}</div><div><div class="xs bold muted" style="text-transform:uppercase;letter-spacing:.04em">${I('heart', 13)} Alimentação</div>
            <div class="small mt-2">${(e.alimentacao || {}).tipo ? `<b>${esc(ICM.C.ALIMENTACAO_EVENTO[e.alimentacao.tipo] || e.alimentacao.tipo)}</b>${e.alimentacao.detalhes ? `<div class="xs muted">${esc(e.alimentacao.detalhes)}</div>` : ''}` : '<span class="muted">Não informado</span>'}</div></div></div>
          <hr class="divider"><div class="grid grid-2" style="gap:14px">${[['Equipe do Instituto presente', e.equipe_presente], ['Acompanham os alunos', e.acompanhantes]].map(([tit, ps]) => `<div><div class="xs bold muted" style="text-transform:uppercase;letter-spacing:.04em">${esc(tit)}</div>
            ${(ps || []).length ? `<div class="col mt-2" style="gap:6px">${ps.map(x => `<div class="small"><b>${esc(x.nome)}</b>${descPessoa(x) ? `<div class="xs muted">${esc(descPessoa(x))}</div>` : ''}</div>`).join('')}</div>` : `<div class="small muted mt-2">Não informado${canEdit ? ' — use Editar' : ''}</div>`}</div>`).join('')}</div></div>
        <div class="card"><div class="section-title">${I('users', 18)} Alunos participantes</div>
          ${alunos.length ? `<div class="col" style="max-height:340px;overflow:auto">${alunos.map(a => `<a class="list-item" href="#/alunos/${esc(a.id)}">${ICM.util.avatar(a.nome, a.foto, 'sm')}<div class="grow"><b>${esc(a.nome)}</b><div class="xs muted">${esc(a.matricula)}</div></div>${menor(a) ? ui().badge('Menor', 'warn') : ''}</a>`).join('')}</div>` : ui().empty('Nenhum aluno vinculado', 'users')}</div>
        ${menores.length && verAut() ? `<div class="card span-all" data-aut-assinadas></div>` : ''}
        <div class="span-all ev-duo"><div class="card" data-veiculos></div>
        <div class="card"><div class="card-head"><div class="section-title" style="margin:0">${I('clipboard', 18)} Checklist do evento <span class="badge" data-ck-cnt></span></div></div>
          <div class="progress ok mb-4"><span data-ck-bar style="width:0%"></span></div><div data-checklist></div></div></div>
        <div class="card span-all"><div class="card-head"><div class="section-title" style="margin:0">${I('camera', 18)} Fotos</div>${canEdit ? `<button class="btn btn-sm btn-primary" data-savefotos>${I('check', 16)} Salvar fotos</button>` : ''}</div><div data-fotos></div></div>
      </div></div>`;
    ui().photoPicker(el.querySelector('[data-fotos]'), fotos, () => { }, { editable: canEdit });
    // Só as fotos: não sobrescreve o checklist nem outros campos gravados nesta tela
    const sf = el.querySelector('[data-savefotos]'); if (sf) sf.addEventListener('click', ev => ui().busy(ev.currentTarget, async () => { await ui().run(() => ICM.api.eventos.atualizar(e.id, { fotos }), 'Fotos salvas'); e.fotos = fotos; }).catch(() => { }));
    checklist(el.querySelector('[data-checklist]'), e, canEdit);
    if (ICM.transporte) {
      el.insertAdjacentHTML('beforeend', ICM.transporte.css + '<style>.ev-duo{display:grid;grid-template-columns:minmax(0,auto) minmax(320px,1fr);gap:16px;align-items:start}.ev-duo>.card{min-width:0}@media (max-width:1000px){.ev-duo{grid-template-columns:1fr}}</style>');
      const equipeEv = [...(e.equipe_presente || []), ...(e.acompanhantes || [])].filter((p, i, a) => a.findIndex(q => q.nome === p.nome) === i);
      ICM.transporte.card(el.querySelector('[data-veiculos]'), e, { alunos, equipe: equipeEv, canEdit, recarregar: () => ICM.pages.eventoDetalhe(el, params) });
    } else el.querySelector('[data-veiculos]').remove();
    const autBox = el.querySelector('[data-aut-assinadas]');
    const drawAut = () => { if (autBox) listaAutorizacoes(autBox, e, menores, canEdit); };
    drawAut();
    const ab = el.querySelector('[data-aut]'); if (ab) ab.addEventListener('click', () => autorizacoes(e, menores, canEdit, drawAut));
    const eb = el.querySelector('[data-edit]'); if (eb) eb.addEventListener('click', () => eventoForm(e));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.generate('evento', { evento_id: e.id }));
  };

  // ---------- Checklist do evento ----------
  // Começa com a lista padrão (ICM.C.CHECKLIST_EVENTO); ela só é gravada no evento na primeira alteração.
  function checklist(box, e, canEdit) {
    const card = box.closest('.card');
    let itens = Array.isArray(e.checklist) ? e.checklist.map(x => ({ ...x })) : ICM.C.CHECKLIST_EVENTO.map(t => ({ id: ICM.util.uid('ck_'), t, ok: false }));
    let editando = null;
    const salvar = async () => { await ICM.api.eventos.atualizar(e.id, { checklist: itens }); e.checklist = itens.map(x => ({ ...x })); };
    const draw = () => {
      const feitos = itens.filter(x => x.ok).length;
      card.querySelector('[data-ck-cnt]').textContent = `${feitos}/${itens.length}`;
      card.querySelector('[data-ck-bar]').style.width = itens.length ? `${Math.round(feitos / itens.length * 100)}%` : '0%';
      box.innerHTML = `<div class="ck-lista">${itens.map(x => editando === x.id
        ? `<div class="ck-item editando"><input class="input grow" data-ck-texto value="${esc(x.t)}" maxlength="200" aria-label="Texto do item"><button type="button" class="btn btn-sm btn-primary" data-ck-ok="${esc(x.id)}">${I('check', 14)} Salvar</button><button type="button" class="btn btn-sm" data-ck-cancelar>Cancelar</button></div>`
        : `<div class="ck-item ${x.ok ? 'feito' : ''}"><label class="ck-check"><input type="checkbox" data-ck="${esc(x.id)}" ${x.ok ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span>${esc(x.t)}</span></label>
          ${canEdit ? `<button type="button" class="btn btn-sm btn-icon" data-ck-editar="${esc(x.id)}" title="Editar" aria-label="Editar item">${I('edit', 15)}</button><button type="button" class="btn btn-sm btn-icon lst-del" data-ck-excluir="${esc(x.id)}" title="Excluir" aria-label="Excluir item">${I('trash', 15)}</button>` : ''}</div>`).join('') || '<div class="xs muted">Nenhum item no checklist.</div>'}</div>
        ${canEdit ? `<div class="row mt-4" style="gap:8px"><input class="input grow" data-ck-novo maxlength="200" placeholder="Novo item do checklist (ex.: levar extensão elétrica)" aria-label="Novo item do checklist"><button type="button" class="btn btn-primary" data-ck-add>${I('plus', 16)} Adicionar</button></div>` : ''}`;
      const ed = box.querySelector('[data-ck-texto]');
      if (ed) { ed.focus(); ed.addEventListener('keydown', ev => { if (ev.key === 'Enter') box.querySelector('[data-ck-ok]').click(); else if (ev.key === 'Escape') { editando = null; draw(); } }); }
      const novo = box.querySelector('[data-ck-novo]');
      if (novo) novo.addEventListener('keydown', ev => { if (ev.key === 'Enter') box.querySelector('[data-ck-add]').click(); });
    };
    box.addEventListener('change', async ev => {
      const c = ev.target.closest('[data-ck]'); if (!c) return;
      const x = itens.find(i => i.id === c.dataset.ck); x.ok = c.checked; draw();
      try { await salvar(); } catch (er) { x.ok = !c.checked; draw(); ui().toast(er.message, 'danger'); }
    });
    box.addEventListener('click', async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      const antes = itens.map(x => ({ ...x }));
      try {
        if (b.dataset.ckEditar) { editando = b.dataset.ckEditar; draw(); return; }
        if (b.hasAttribute('data-ck-cancelar')) { editando = null; draw(); return; }
        if (b.dataset.ckOk) { const t = box.querySelector('[data-ck-texto]').value.trim(); if (!t) return ui().toast('Escreva o texto do item.', 'warn'); itens.find(i => i.id === b.dataset.ckOk).t = t; editando = null; }
        else if (b.dataset.ckExcluir) { itens = itens.filter(i => i.id !== b.dataset.ckExcluir); }
        else if (b.hasAttribute('data-ck-add')) { const t = box.querySelector('[data-ck-novo]').value.trim(); if (!t) return; itens.push({ id: ICM.util.uid('ck_'), t, ok: false }); }
        else return;
        draw(); await salvar();
        if (b.hasAttribute('data-ck-add')) box.querySelector('[data-ck-novo]').focus();
      } catch (er) { itens = antes; draw(); ui().toast(er.message, 'danger'); }
    });
    draw();
  }

  // ---------- Autorizações de viagem (menores de idade) ----------
  function autorizacoes(e, menores, canEdit, aoGerar) {
    const F = o => ui().field(o);
    const D = ICM.C.AUTORIZACAO_VIAGEM, v = e.viagem || {};
    // Texto dos responsáveis montado com quem acompanha os alunos (cadastrado no evento)
    const doEvento = (e.acompanhantes || []).length ? `${textoPessoas(e.acompanhantes)}, que acompanharão os alunos durante o percurso e nas atividades programadas.` : '';
    const t = ICM.C.TIPOS_EVENTO[e.tipo] || { nome: 'Evento' };
    // Programação montada com o transporte cadastrado no evento (o que faltar fica "____" para completar)
    const tr = e.transporte || {};
    const hora = h => h ? h.replace(':', 'h') : '____';
    const evLinha = `${t.nome}: ${[e.horario && `às ${hora(e.horario)}`, e.local].filter(Boolean).join(' — ') || 'horário e local'}`;
    const al = e.alimentacao || {};
    const alLinha = al.tipo === 'cedida' ? `Alimentação: cedida, sem custo para o aluno${al.detalhes ? ` — ${al.detalhes}` : ''}`
      : al.tipo === 'aluno' ? `Alimentação: por conta do aluno${al.detalhes ? ` — ${al.detalhes}` : ' (levar lanche e/ou dinheiro para alimentação)'}`
      : al.tipo === 'nao_ha' ? `Alimentação: não haverá refeição${al.detalhes ? ` — ${al.detalhes}` : ''}`
      : 'Alimentação: horário e local (informar se terá custo)';
    const progPadrao = (tr.tem ? [
      `Saída: ${tr.saida_local || '____'}, às ${hora(tr.saida_hora)}${tipoTr(e) ? ` (${tipoTr(e)})` : ''}`,
      alLinha,
      evLinha,
      `Retorno: chegada prevista às ${hora(tr.chegada_hora)} em ${tr.chegada_local || tr.saida_local || '____'} (avisaremos assim que sairmos e o horário previsto de chegada)`
    ] : [
      'Transporte: por conta do responsável (o Instituto não oferecerá transporte para este evento)',
      alLinha,
      evLinha
    ]).join('\n');
    const m = ui().modal({
      title: 'Autorizações de viagem', size: 'wide',
      body: `<form class="col" onsubmit="return false">
        <p class="small muted">Uma autorização por aluno menor de idade, já preenchida com os dados da matrícula (nome e documento do responsável, cidade, parentesco, alergias e medicação). O que faltar no cadastro sai em branco para o responsável completar. Os textos abaixo ficam salvos neste evento.</p>
        ${F({ name: 'responsaveis', label: 'Responsáveis pela viagem', type: 'textarea', rows: 2, value: v.responsaveis || doEvento || D.responsaveis })}
        ${doEvento ? `<div class="row" style="margin-top:-6px"><button type="button" class="btn btn-sm" data-usar-acomp>${I('refresh', 14)} Usar quem acompanha os alunos (cadastrado no evento)</button></div>` : `<div class="xs muted" style="margin-top:-6px">Dica: em Editar evento, preencha "Quem acompanha os alunos" e este texto passa a ser montado sozinho.</div>`}
        ${F({ name: 'programacao', label: 'Programação (um item por linha)', type: 'textarea', rows: 5, value: v.programacao || progPadrao })}
        <div class="row" style="margin-top:-6px"><button type="button" class="btn btn-sm" data-usar-prog>${I('refresh', 14)} Montar com o transporte e o horário do evento</button></div>
        ${F({ name: 'compromisso', label: 'Compromisso do responsável', type: 'textarea', rows: 4, value: v.compromisso ?? D.compromisso, hint: '{data} é trocado pela data do evento.' })}
        ${F({ name: 'lembretes', label: 'Dicas e lembretes para o aluno (um por linha)', type: 'textarea', rows: 5, value: v.lembretes ?? D.lembretes })}
        <div class="row between wrap"><div class="section-title" style="margin:0">${I('users', 18)} Alunos menores de idade <span class="badge" data-aut-cnt>${menores.length}</span></div>
          <label class="check small"><input type="checkbox" data-aut-todos checked> Marcar todos</label></div>
        <div class="grid grid-3" data-aut-alunos style="max-height:220px;overflow:auto;gap:8px">${menores.map(a => `<label class="check small"><input type="checkbox" value="${esc(a.id)}" checked> ${esc(a.nome)}</label>`).join('')}</div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('sparkles', 18)} Gerar autorizações</button>`
    });
    const ua = m.$('[data-usar-acomp]'); if (ua) ua.addEventListener('click', () => { m.$('[name=responsaveis]').value = doEvento; });
    m.$('[data-usar-prog]').addEventListener('click', () => { m.$('[name=programacao]').value = progPadrao; });
    const marcados = () => [...m.$$('[data-aut-alunos] input:checked')].map(c => c.value);
    const conta = () => { m.$('[data-aut-cnt]').textContent = marcados().length; };
    m.$('[data-aut-alunos]').addEventListener('change', conta);
    m.$('[data-aut-todos]').addEventListener('change', ev => { m.$$('[data-aut-alunos] input').forEach(c => { c.checked = ev.target.checked; }); conta(); });
    m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
      const ids = marcados(); if (!ids.length) return ui().toast('Marque pelo menos um aluno.', 'warn');
      const viagem = ICM.util.formData(m.$('form'));
      if (canEdit) {
        try { await ICM.api.eventos.atualizar(e.id, { viagem }); e.viagem = viagem; } catch (er) { /* sem permissão de gravar: gera mesmo assim */ }
        try { e.autorizacoes = await ICM.api.eventos.autorizacoesGeradas(e.id, ids); if (aoGerar) aoGerar(); } catch (er) { /* fica só sem o registro */ }
      }
      m.close(); setTimeout(() => ICM.reports.generate('autorizacao_viagem', { evento_id: e.id, alunos: ids, viagem }), 250);
    }).catch(() => { }));
  }

  // ---------- Autorizações assinadas (entregue / pendente) ----------
  // Ver a folha assinada: quem edita eventos ou vê dados sensíveis dos alunos
  const verAut = () => ICM.auth.can('eventos.editar') || ICM.auth.can('alunos.sensivel');
  ICM.autViagem = {
    verAut,
    // Abre o arquivo (link temporário do banco ou, no modo demonstração, o arquivo guardado no navegador)
    abrir(arq) {
      if (!arq || !arq.data) return ui().toast('Arquivo indisponível.', 'warn');
      if (!arq.data.startsWith('data:')) return window.open(arq.data, '_blank', 'noopener');
      const b64 = arq.data.slice(arq.data.indexOf(',') + 1), bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: arq.mime || 'application/octet-stream' }));
      window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
    // Escolhe o arquivo e anexa; chama depois(registro) ao terminar
    escolher(eventoId, alunoId, depois) {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/jpeg,image/png,image/webp';
      inp.addEventListener('change', () => { const f = inp.files[0]; if (!f) return; ui().run(() => ICM.api.eventos.anexarAutorizacao(eventoId, alunoId, f), 'Autorização assinada anexada').then(r => depois && depois(r)).catch(() => { }); });
      inp.click();
    },
    async remover(eventoId, alunoId, depois) {
      if (!await ui().confirm({ title: 'Remover autorização assinada', text: 'O arquivo anexado será apagado e o aluno volta a ficar pendente. Continuar?', ok: 'Remover', danger: true })) return;
      await ui().run(() => ICM.api.eventos.removerAutorizacao(eventoId, alunoId), 'Autorização removida').catch(() => { });
      if (depois) depois();
    },
    situacao(au) {
      if (au && au.entregue_em) return ui().badge(`Entregue em ${ICM.util.fmtDate(au.entregue_em.slice(0, 10))}`, 'ok', true);
      if (au && au.gerada_em) return ui().badge('Pendente — gerada, falta a assinada', 'warn', true);
      return ui().badge('Pendente — ainda não gerada', 'neutral', true);
    }
  };
  function listaAutorizacoes(box, e, menores, canEdit) {
    const aut = e.autorizacoes || {};
    const ok = menores.filter(a => (aut[a.id] || {}).entregue_em).length;
    const recarregar = async () => { const n = await ICM.api.eventos.get(e.id); e.autorizacoes = (n && n.autorizacoes) || {}; listaAutorizacoes(box, e, menores, canEdit); };
    box.innerHTML = `<div class="card-head"><div class="section-title" style="margin:0">${I('fileText', 18)} Autorizações assinadas <span class="badge ${ok === menores.length ? 'ok' : 'warn'}">${ok}/${menores.length}</span></div>
        <div class="xs muted">Anexe a foto ou o PDF da autorização assinada pelos pais. Fica também no cadastro do aluno (aba Documentos).</div></div>
      <div class="progress ${ok === menores.length ? 'ok' : 'warn'} mb-4"><span style="width:${menores.length ? Math.round(ok / menores.length * 100) : 0}%"></span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Situação</th><th style="text-align:right">Arquivo</th></tr></thead><tbody>
      ${menores.map(a => { const au = aut[a.id] || {}; return `<tr><td><a class="bold" href="#/alunos/${esc(a.id)}?tab=documentos">${esc(a.nome)}</a></td><td>${ICM.autViagem.situacao(au)}${au.recebido_por ? `<div class="xs muted">Recebida por ${esc(au.recebido_por)}</div>` : ''}</td>
        <td style="text-align:right;white-space:nowrap">${au.arquivo ? `<button class="btn btn-sm" data-ver-aut="${esc(a.id)}">${I(au.arquivo.mime === 'application/pdf' ? 'fileText' : 'image', 14)} Ver</button>` : ''}
        ${canEdit ? (au.arquivo ? `<button class="btn btn-sm btn-ghost" data-anx-aut="${esc(a.id)}">${I('upload', 14)} Trocar</button><button class="btn btn-sm btn-icon lst-del" data-rm-aut="${esc(a.id)}" title="Remover" aria-label="Remover arquivo">${I('trash', 14)}</button>` : `<button class="btn btn-sm btn-primary" data-anx-aut="${esc(a.id)}">${I('upload', 14)} Anexar assinada</button>`) : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
    box.querySelectorAll('[data-ver-aut]').forEach(b => b.addEventListener('click', () => ICM.autViagem.abrir((aut[b.dataset.verAut] || {}).arquivo)));
    box.querySelectorAll('[data-anx-aut]').forEach(b => b.addEventListener('click', () => ICM.autViagem.escolher(e.id, b.dataset.anxAut, recarregar)));
    box.querySelectorAll('[data-rm-aut]').forEach(b => b.addEventListener('click', () => ICM.autViagem.remover(e.id, b.dataset.rmAut, recarregar)));
  }

  // ---------- Pessoas do Instituto no evento ----------
  // Usuários do sistema + equipe (RH, só para quem pode ver) — sem repetir nomes. Guardamos no evento
  // só nome, cargo e telefone, para todos que veem o evento saberem quem vai.
  // Quem da equipe (com acesso ao sistema) foi incluído agora recebe um aviso no chat
  async function avisarEquipe(antes, r, pessoas) {
    if (!ICM.api.chat) return;
    const sem = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const uidDe = p => p.uid || (pessoas.find(x => sem(x.nome) === sem(p.nome)) || {}).uid;
    const ja = new Set([...(antes.equipe_presente || []), ...(antes.acompanhantes || [])].map(p => sem(p.nome)));
    const eu = ICM.auth.user().id;
    const novos = [...(r.equipe_presente || []).map(p => ({ ...p, papel: 'presente' })), ...(r.acompanhantes || []).map(p => ({ ...p, papel: 'acompanhante' }))]
      .filter(p => !ja.has(sem(p.nome))).map(p => ({ ...p, uid: uidDe(p) })).filter((p, i, a) => p.uid && p.uid !== eu && a.findIndex(q => q.uid === p.uid) === i);
    if (!novos.length) return;
    const tr = r.transporte || {};
    let ok = 0;
    for (const p of novos) {
      const texto = `📣 Olá, ${String(p.nome).split(' ')[0]}! Você foi incluído(a) ${p.papel === 'acompanhante' ? 'para acompanhar os alunos' : 'na equipe'} do evento “${r.titulo}”.\n📅 ${ICM.util.fmtDateLong(r.data)}${r.horario ? ', às ' + r.horario : ''}${r.local ? '\n📍 ' + r.local : ''}${tr.tem && tr.saida_local ? `\n🚌 Saída: ${tr.saida_local}${tr.saida_hora ? ' às ' + tr.saida_hora : ''}` : ''}\nVeja os detalhes e o seu lugar no transporte em Pedagógico → Eventos e ações.`;
      try { await ICM.api.chat.enviar(ICM.api.chat.idDireto(eu, p.uid), texto); ok++; } catch (er) { /* sem permissão ou sem internet */ }
    }
    if (ok) ui().toast(`Aviso enviado no chat para ${ok} pessoa(s) da equipe`, 'ok', 4000);
  }
  async function pessoasDoInstituto() {
    const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const us = await ICM.api.usuarios.list().catch(() => []);
    const eq = ICM.auth.can('equipe.gerir') ? await ICM.api.equipe.list().catch(() => []) : [];
    const mapa = new Map();
    [...eq.filter(p => !/deslig|inativ/i.test(p.status || '')).map(p => ({ nome: p.nome, cargo: p.cargo || '', telefone: p.telefone || '' })),
      ...us.filter(u => u.ativo !== false && !u.convite).map(u => ({ nome: u.nome, cargo: u.cargo || (ICM.C.PAPEIS && ICM.C.PAPEIS[u.papel] ? ICM.C.PAPEIS[u.papel].nome : ''), telefone: u.telefone || '', uid: u.id }))]
      .filter(p => p.nome).forEach(p => { const k = sem(p.nome); const j = mapa.get(k); mapa.set(k, j ? { ...p, ...Object.fromEntries(Object.entries(j).filter(([, v]) => v)) } : p); });
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }
  const descPessoa = p => [p.cargo, p.telefone].filter(Boolean).join(' · ');
  // Bloco "Transporte" da página do evento
  const tipoTr = ev => ICM.transporte ? ICM.transporte.descricao(ev) : ((ev.transporte || {}).tipo || '');
  function transporteHtml(tr, vs) {
    tr = tr || {};
    const tit = `<div class="xs bold muted" style="text-transform:uppercase;letter-spacing:.04em">${I('pin', 13)} Transporte</div>`;
    if (!tr.tem) return `${tit}<div class="small muted mt-2">Sem transporte do Instituto (ou não informado)</div>`;
    return `${tit}${ui().kv([['Tipo', tipoTr({ transporte: tr, veiculos: vs })], ['Sai de', tr.saida_local], ['Previsão de saída', tr.saida_hora], ['Previsão de chegada (volta)', tr.chegada_hora ? `${tr.chegada_hora}${tr.chegada_local ? ' — ' + tr.chegada_local : ''}` : '']])}`;
  }
  // Lista suspensa + etiquetas; "Outra pessoa…" permite digitar um nome que não está no sistema
  function pessoasPicker(box, pessoas, sel, rotulo) {
    const draw = (digitando = false) => {
      const livres = pessoas.filter(p => !sel.some(s => s.nome === p.nome));
      box.innerHTML = `<div class="proj-sel">${digitando
        ? `<div class="row" style="gap:6px;flex:0 0 300px;max-width:100%"><input class="input grow" data-outra placeholder="Nome (e função, se quiser)" maxlength="80" aria-label="Nome da pessoa"><button type="button" class="btn btn-sm btn-primary" data-outra-ok>${I('check', 14)}</button></div>`
        : `<select class="select" data-add aria-label="${esc(rotulo)}"><option value="">${esc(rotulo)}</option>${livres.map((p, i) => `<option value="${i}">${esc(p.nome)}${p.cargo ? ` — ${esc(p.cargo)}` : ''}</option>`).join('')}<option value="__outra">Outra pessoa (digitar o nome)…</option></select>`}
        <div class="proj-tags">${sel.length ? sel.map((p, i) => `<span class="proj-tag" style="--c:#2563eb" title="${esc(descPessoa(p))}"><span class="truncate">${esc(p.nome)}${p.cargo ? ` <small class="muted">· ${esc(p.cargo)}</small>` : ''}</span><button type="button" data-rm="${i}" aria-label="Tirar ${esc(p.nome)}" title="Tirar">${I('x', 13)}</button></span>`).join('') : '<span class="xs muted">Ninguém adicionado</span>'}</div></div>`;
      const s = box.querySelector('[data-add]');
      if (s) s.addEventListener('change', () => { if (s.value === '__outra') return draw(true); if (s.value !== '') { sel.push({ ...livres[+s.value] }); draw(); } });
      const inp = box.querySelector('[data-outra]');
      if (inp) {
        inp.focus();
        const ok = () => { const nome = inp.value.trim(); if (nome) sel.push({ nome, cargo: '', telefone: '' }); draw(); };
        box.querySelector('[data-outra-ok]').addEventListener('click', ok);
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } else if (ev.key === 'Escape') { ev.stopPropagation(); draw(); } });
      }
      box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { sel.splice(+b.dataset.rm, 1); draw(); }));
    };
    draw();
  }
  // "Fulano (Maestro, (27) 9...), Ciclano (Secretária)" — usado nas autorizações de viagem
  const textoPessoas = ps => ps.map(p => `${p.nome}${descPessoa(p) ? ` (${descPessoa(p)})` : ''}`).join(', ').replace(/, ([^,]*)$/, ' e $1');

  async function eventoForm(e = {}) {
    const F = o => ui().field(o);
    const projetos = await ICM.api.projetos.list();
    const turmas = await ICM.api.turmas.list();
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const mats = await ICM.api.raw('matriculas');
    const sel = new Set(e.alunos || []);
    const projSel = new Set(ICM.util.projetosEvento(e));
    const pessoas = await pessoasDoInstituto();
    const presentes = (e.equipe_presente || []).map(x => ({ ...x }));
    const acompanhantes = (e.acompanhantes || []).map(x => ({ ...x }));
    const tr = e.transporte || {};
    const m = ui().modal({
      title: e.id ? 'Editar evento' : 'Novo evento', size: 'wide',
      body: `<form class="grid grid-3">
        ${F({ name: 'tipo', label: 'Tipo', type: 'select', value: e.tipo, options: Object.entries(ICM.C.TIPOS_EVENTO).map(([k, v]) => [k, v.nome]) , lista: 'TIPOS_EVENTO' })}
        ${F({ name: 'titulo', label: 'Título', value: e.titulo, required: true, cls: 'span-2' })}
        ${F({ name: 'data', label: 'Data', type: 'date', value: e.data || ICM.util.today(), required: true })}
        ${F({ name: 'horario', label: 'Horário', type: 'time', value: e.horario })}
        ${F({ name: 'local', label: 'Local', value: e.local })}
        ${F({ name: 'publico', label: 'Público estimado', type: 'number', value: e.publico, attrs: 'min="0"' })}
        ${F({ name: 'resultado', label: 'Resultado / premiação', value: e.resultado, cls: 'span-2' })}
        <div class="field span-all"><label for="f_proj_add">Projetos vinculados <span class="muted" style="font-weight:500">— nenhum = ação institucional</span></label>
          <div class="proj-sel"><select class="select" id="f_proj_add" data-proj-add></select><div class="proj-tags" data-projs></div></div></div>
        ${F({ name: 'transporte.tem', label: 'Haverá transporte do Instituto para os alunos', type: 'toggle', value: tr.tem, cls: 'span-all' })}
        <div class="span-all grid grid-3" data-transp ${tr.tem ? '' : 'hidden'} style="gap:12px 16px">
          ${F({ name: 'transporte.saida_local', label: 'Local de saída', value: tr.saida_local, placeholder: 'Ex.: pracinha da grama', cls: 'span-2' })}
          ${F({ name: 'transporte.saida_hora', label: 'Previsão de saída', type: 'time', value: tr.saida_hora })}
          ${F({ name: 'transporte.chegada_hora', label: 'Previsão de chegada (volta)', type: 'time', value: tr.chegada_hora })}
          ${F({ name: 'transporte.chegada_local', label: 'Local de chegada', value: tr.chegada_local, placeholder: 'Vazio = o mesmo local de saída' })}
        </div>
        ${F({ name: 'alimentacao.tipo', label: 'Alimentação', type: 'select', value: (e.alimentacao || {}).tipo || '', options: [['', 'Não informado'], ...Object.entries(ICM.C.ALIMENTACAO_EVENTO)] })}
        ${F({ name: 'alimentacao.detalhes', label: 'Detalhes da alimentação', value: (e.alimentacao || {}).detalhes, cls: 'span-2', placeholder: 'Ex.: almoço às 11h30 no local do evento / levar lanche e dinheiro' })}
        <div class="field span-all"><label>${I('users', 15)} Equipe do Instituto presente no evento</label><div data-pessoas="presentes"></div></div>
        <div class="field span-all"><label>${I('userCheck', 15)} Quem acompanha os alunos <span class="muted" style="font-weight:500">— na viagem e durante o evento; aparece nas autorizações de viagem</span></label><div data-pessoas="acompanhantes"></div></div>
        ${F({ name: 'descricao', label: 'Descrição', type: 'textarea', value: e.descricao, cls: 'span-all', rows: 3 })}
        ${F({ name: 'app_oculto', label: 'Não mostrar este evento no App do Instituto', type: 'toggle', value: e.app_oculto, cls: 'span-all' })}
        <div class="span-all"><div class="row between wrap"><div class="section-title" style="margin:0">${I('users', 18)} Alunos participantes <span class="badge" data-cnt>${sel.size}</span></div>
          <div class="row"><select class="select" data-turma style="width:240px"><option value="">Adicionar turma inteira…</option>${turmas.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join('')}</select></div></div>
          <div class="row wrap mt-4" style="gap:10px"><div class="busca-aluno grow">${I('search', 16)}<input class="input" type="search" data-busca placeholder="Procurar aluno pelo nome…" aria-label="Procurar aluno pelo nome" autocomplete="off"></div>
            <label class="check small"><input type="checkbox" data-so-sel> Só os selecionados</label></div>
          <div class="grid grid-3 mt-4" data-alunos style="max-height:260px;overflow:auto;gap:8px"></div></div>
      </form>`,
      foot: `${e.id ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 18)} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    // Busca pelo nome sem diferenciar acento nem maiúscula
    const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const drawAl = () => {
      const q = sem(m.$('[data-busca]').value.trim()), soSel = m.$('[data-so-sel]').checked;
      const vis = alunos.filter(a => (!q || sem(a.nome).includes(q)) && (!soSel || sel.has(a.id)));
      m.$('[data-alunos]').innerHTML = vis.length ? vis.map(a => `<label class="check small"><input type="checkbox" value="${esc(a.id)}" ${sel.has(a.id) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('')
        : `<div class="xs muted" style="grid-column:1/-1">${soSel && !sel.size ? 'Nenhum aluno selecionado ainda.' : 'Nenhum aluno encontrado com esse nome.'}</div>`;
      m.$$('[data-alunos] input').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.value) : sel.delete(c.value); m.$('[data-cnt]').textContent = sel.size; }));
      m.$('[data-cnt]').textContent = sel.size;
    };
    drawAl();
    m.$('[data-busca]').addEventListener('input', drawAl);
    m.$('[data-busca]').addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); });
    m.$('[data-so-sel]').addEventListener('change', drawAl);
    // Projetos: escolhe no dropdown e cada um vira uma etiqueta ao lado (× para tirar)
    const drawProj = () => {
      const livres = projetos.filter(p => !projSel.has(p.id));
      m.$('[data-proj-add]').innerHTML = `<option value="">${livres.length ? 'Adicionar projeto…' : 'Todos os projetos já foram adicionados'}</option>${livres.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}`;
      m.$('[data-proj-add]').disabled = !livres.length;
      const ps = [...projSel].map(id => projetos.find(p => p.id === id)).filter(Boolean);
      m.$('[data-projs]').innerHTML = ps.length ? ps.map(p => `<span class="proj-tag" style="--c:${esc(p.cor || '#2563eb')}"><span class="truncate">${esc(p.nome)}</span><button type="button" data-proj-rm="${esc(p.id)}" aria-label="Tirar ${esc(p.nome)}" title="Tirar">${I('x', 13)}</button></span>`).join('')
        : '<span class="xs muted">Ação institucional (nenhum projeto)</span>';
    };
    drawProj();
    m.$('[name="transporte.tem"]').addEventListener('change', ev => { m.$('[data-transp]').hidden = !ev.target.checked; });
    pessoasPicker(m.$('[data-pessoas="presentes"]'), pessoas, presentes, 'Adicionar pessoa presente…');
    pessoasPicker(m.$('[data-pessoas="acompanhantes"]'), pessoas, acompanhantes, 'Adicionar acompanhante…');
    m.$('[data-proj-add]').addEventListener('change', ev => { if (ev.target.value) { projSel.add(ev.target.value); drawProj(); } });
    m.$('[data-projs]').addEventListener('click', ev => { const b = ev.target.closest('[data-proj-rm]'); if (b) { projSel.delete(b.dataset.projRm); drawProj(); } });
    m.$('[data-turma]').addEventListener('change', ev => {
      mats.filter(x => x.turma_id === ev.target.value && x.status === 'ativo').forEach(x => sel.add(x.aluno_id));
      // A turma adicionada também vincula o projeto dela
      const tu = turmas.find(x => x.id === ev.target.value);
      if (tu && tu.projeto_id && !projSel.has(tu.projeto_id)) { projSel.add(tu.projeto_id); drawProj(); }
      ev.target.value = ''; drawAl();
    });
    m.$('[data-ok]').addEventListener('click', ev => ui().busy(ev.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const projeto_ids = [...projSel].filter(id => projetos.some(p => p.id === id));   // na ordem em que foram adicionados
      const r = await ui().run(() => ICM.api.eventos.save({ ...e, ...d, projeto_ids, alunos: [...sel], equipe_presente: presentes, acompanhantes }), 'Evento salvo');
      await avisarEquipe(e, r, pessoas);
      m.close(); location.hash = `#/eventos/${r.id}`; ICM.app.reload();
    }).catch(() => { }));
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Excluir evento', text: `Excluir "${e.titulo}"?`, ok: 'Excluir', danger: true }))) return;
      await ui().run(() => ICM.api.eventos.remove(e.id), 'Evento excluído'); m.close(); location.hash = '#/eventos';
    });
  }
})();
