/* Pesquisas de satisfação (famílias e alunos): NPS, médias, comentários e coleta em modo totem */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, num } = ICM.util;
  const ui = () => ICM.ui;
  const npsCor = n => n == null ? 'var(--muted)' : n >= 75 ? '#059669' : n >= 50 ? '#2563eb' : n >= 0 ? '#d97706' : '#dc2626';
  const npsTxt = n => n == null ? '—' : n >= 75 ? 'Excelente' : n >= 50 ? 'Muito bom' : n >= 0 ? 'Razoável' : 'Crítico';
  const PUB = { familias: 'Famílias', alunos: 'Alunos' };

  ICM.pages.pesquisas = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Pesquisas de satisfação']]);
    const list = await ICM.api.pesquisas.list();
    const edit = ICM.auth.can('pesquisas.gerir');
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Pesquisas de satisfação</h1><div class="page-sub">Ouça famílias e alunos — os resultados entram como indicador no relatório anual</div></div>
        ${edit ? `<button class="btn btn-primary" data-novo>${I('plus', 18)} Nova pesquisa</button>` : ''}</div>
      <div class="grid grid-2 stagger">${list.map(p => `<div class="card hoverable project-card" style="--c:${npsCor(p.res.nps)}" data-href="#/pesquisas/${esc(p.id)}">
        <div class="row between">${ui().badge(PUB[p.publico], 'neutral')}${p.status === 'aberta' ? ui().badge('Coletando respostas', 'ok', true) : ui().badge('Encerrada', 'neutral', true)}</div>
        <div class="name">${esc(p.titulo)}</div>
        <div class="grid grid-3" style="gap:10px">
          <div class="card flat" style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:900;color:${npsCor(p.res.nps)}">${p.res.nps ?? '—'}</div><div class="xs muted bold">NPS · ${esc(npsTxt(p.res.nps))}</div></div>
          <div class="card flat" style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:900">${p.res.satisfacao != null ? num(p.res.satisfacao, 1) : '—'}</div><div class="xs muted bold">Satisfação /5</div></div>
          <div class="card flat" style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:900">${p.res.n}</div><div class="xs muted bold">Respostas</div></div>
        </div>
        <div class="xs muted">${esc(fmtDate(p.inicio))} a ${esc(fmtDate(p.fim))}</div></div>`).join('') || `<div class="span-all">${ui().empty('Nenhuma pesquisa', 'chart')}</div>`}</div></div>`;
    el.querySelectorAll('[data-href]').forEach(c => c.addEventListener('click', () => { location.hash = c.dataset.href; }));
    const nb = el.querySelector('[data-novo]'); if (nb) nb.addEventListener('click', () => form());
  };

  ICM.pages.pesquisa = async function (el, params) {
    const p = await ICM.api.pesquisas.get(params.id);
    if (!p) { el.innerHTML = ui().empty('Pesquisa não encontrada'); return; }
    ICM.app.setCrumbs([['Pesquisas', '#/pesquisas'], [p.titulo]]);
    const r = p.res; const edit = ICM.auth.can('pesquisas.gerir');
    const bloco = q => {
      if (q.tipo === 'nps') { const t = q.n || 1; return `<div class="row wrap" style="gap:24px"><div style="text-align:center"><div style="font-size:54px;font-weight:900;color:${npsCor(q.nps)};line-height:1">${q.nps ?? '—'}</div><div class="small bold muted">NPS · ${esc(npsTxt(q.nps))}</div></div>
        <div class="grow"><div class="row" style="height:22px;border-radius:999px;overflow:hidden;gap:0"><span style="width:${q.det / t * 100}%;background:#ef4444;height:100%"></span><span style="width:${q.neu / t * 100}%;background:#f59e0b;height:100%"></span><span style="width:${q.prom / t * 100}%;background:#10b981;height:100%"></span></div>
        <div class="row wrap small mt-2"><span class="badge danger">${q.det} detratores (0–6)</span><span class="badge warn">${q.neu} neutros (7–8)</span><span class="badge ok">${q.prom} promotores (9–10)</span></div></div></div>`; }
      if (q.tipo === 'escala') { const mx = Math.max(1, ...q.dist); return `<div class="row" style="gap:20px;align-items:flex-end"><div style="text-align:center;min-width:90px"><div style="font-size:40px;font-weight:900;line-height:1">${q.media != null ? num(q.media, 1) : '—'}</div><div class="xs bold muted">média /5</div></div><div class="bars grow" style="height:120px">${q.dist.map((v, k) => `<div class="bar"><span class="v">${v}</span><div class="b" style="height:${Math.max(3, v / mx * 100)}%;animation-delay:${k * .06}s"></div><span class="l">${['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'][k]}</span></div>`).join('')}</div></div>`; }
      if (q.tipo === 'sim_nao') return `<div class="row"><b style="font-size:32px">${q.pct ?? '—'}%</b><span class="muted">responderam sim (${q.sim} sim · ${q.nao} não)</span></div><div class="progress ok mt-2"><span style="width:${q.pct || 0}%"></span></div>`;
      return (q.comentarios || []).filter(Boolean).map(c => `<div class="list-item small">${I('info', 14)} ${esc(c)}</div>`).join('') || '<div class="muted small">Sem comentários</div>';
    };
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="row between wrap"><div><div class="row">${ui().badge(PUB[p.publico], 'neutral')}${p.status === 'aberta' ? ui().badge('Coletando respostas', 'ok', true) : ui().badge('Encerrada', 'neutral', true)}${ui().badge('Anônima', 'neutral')}</div>
        <h1 class="page-title mt-2" style="font-size:26px">${esc(p.titulo)}</h1><div class="small muted">${esc(fmtDate(p.inicio))} a ${esc(fmtDate(p.fim))} · ${r.n} respostas</div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('fileText', 18)} Resultado (PDF)</button>${p.status === 'aberta' ? `<button class="btn btn-primary" data-totem>${I('sparkles', 18)} Coletar respostas (modo totem)</button>${edit ? `<button class="btn" data-enc>Encerrar</button>` : ''}` : ''}</div></div></div>
      <div class="col stagger">${r.porPergunta.map((q, i) => `<div class="card"><div class="section-title">${i + 1}. ${esc(q.texto)} <span class="xs muted">(${q.n} respostas)</span></div>${bloco(q)}</div>`).join('')}</div></div>`;
    const on = (s, fn) => { const b = el.querySelector(s); if (b) b.addEventListener('click', fn); };
    on('[data-rel]', () => ICM.reports.generate('pesquisa_resultado', { pesquisa_id: p.id }));
    on('[data-enc]', async () => { if (await ui().confirm({ title: 'Encerrar pesquisa', text: 'Não serão aceitas novas respostas.', ok: 'Encerrar' })) { await ICM.api.pesquisas.encerrar(p.id); ICM.app.reload(); } });
    on('[data-totem]', () => totem(p));
  };

  // Modo totem: tela cheia para a família/aluno responder num tablet; reinicia após cada resposta
  function totem(p) {
    const ov = document.createElement('div');
    ov.className = 'report-viewer totem';
    let n = 0;
    const draw = () => {
      ov.innerHTML = `<div class="report-toolbar"><button class="btn btn-icon btn-sm" data-x aria-label="Sair">${I('x', 18)}</button><div class="title truncate">${esc(p.titulo)}</div><span class="badge ok">${n} resposta(s) nesta sessão</span></div>
        <div class="report-scroll"><form class="card" style="max-width:720px;margin:0 auto">
          <div style="text-align:center" class="mb-4">${ICM.logo(64)}<h2 class="mt-2">Sua opinião é muito importante!</h2><div class="muted small">Pesquisa anônima — não perguntamos seu nome.</div></div>
          ${p.perguntas.map((q, i) => `<div class="mb-4"><div class="bold mb-4">${i + 1}. ${esc(q.texto)}</div>${q.tipo === 'nps' ? `<div class="row wrap" style="gap:6px">${Array.from({ length: 11 }, (_, k) => `<label class="totem-opt"><input type="radio" name="${q.id}" value="${k}"><span style="--c:${k <= 6 ? '#ef4444' : k <= 8 ? '#f59e0b' : '#10b981'}">${k}</span></label>`).join('')}</div>`
            : q.tipo === 'escala' ? `<div class="row wrap" style="gap:8px">${['😞 Péssimo', '🙁 Ruim', '😐 Regular', '🙂 Bom', '😍 Ótimo'].map((t, k) => `<label class="totem-opt"><input type="radio" name="${q.id}" value="${k + 1}"><span style="--c:#2563eb;min-width:96px">${t}</span></label>`).join('')}</div>`
            : q.tipo === 'sim_nao' ? `<div class="row" style="gap:8px"><label class="totem-opt"><input type="radio" name="${q.id}" value="sim"><span style="--c:#10b981;min-width:90px">Sim</span></label><label class="totem-opt"><input type="radio" name="${q.id}" value="nao"><span style="--c:#ef4444;min-width:90px">Não</span></label></div>`
            : `<textarea class="textarea" name="${q.id}" rows="3" maxlength="500"></textarea>`}</div>`).join('')}
          <button class="btn btn-primary btn-lg" style="width:100%" type="submit">${I('check', 20)} Enviar resposta</button>
        </form></div>`;
      ov.querySelector('[data-x]').addEventListener('click', () => { ov.remove(); document.body.style.overflow = ''; ICM.app.reload(); });
      ov.querySelector('form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target; const valores = {};
        p.perguntas.forEach(q => { const el2 = f.querySelector(`[name="${q.id}"]:checked`) || (q.tipo === 'texto' ? f.querySelector(`[name="${q.id}"]`) : null); if (el2 && el2.value.trim() !== '') valores[q.id] = q.tipo === 'nps' || q.tipo === 'escala' ? Number(el2.value) : el2.value.trim(); });
        if (!Object.keys(valores).length) { ui().toast('Responda ao menos uma pergunta.', 'warn'); return; }
        await ICM.api.pesquisas.responder(p.id, valores); n++;
        ov.querySelector('.report-scroll').innerHTML = `<div style="text-align:center;padding:80px 16px" class="page"><div class="login-logo" style="margin:0 auto 24px">${ICM.logo(100, true)}</div><h1 class="login-title">Obrigado! 💙</h1><p class="muted mt-2">Sua resposta foi registrada.</p></div>`;
        setTimeout(draw, 2500);
      });
    };
    document.body.appendChild(ov); document.body.style.overflow = 'hidden'; draw();
  }

  function form() {
    const F = o => ui().field(o);
    let perguntas = ICM.C.PERGUNTAS_PADRAO.familias.map(q => ({ ...q }));
    const hoje = ICM.util.today();
    const m = ui().modal({
      title: 'Nova pesquisa de satisfação', size: 'wide',
      body: `<form class="grid grid-3">${F({ name: 'titulo', label: 'Título', required: true, cls: 'span-3', value: `Pesquisa de satisfação — ${ICM.util.MESES[new Date().getMonth()]} ${hoje.slice(0, 4)}` })}
        ${F({ name: 'publico', label: 'Público', type: 'select', options: Object.entries(PUB) })}${F({ name: 'inicio', label: 'Início', type: 'date', value: hoje })}${F({ name: 'fim', label: 'Fim', type: 'date', value: ICM.util.addDays(hoje, 30) })}</form>
        <div class="row between mt-4"><div class="section-title" style="margin:0">${I('list', 18)} Perguntas</div><button class="btn btn-sm" data-add>${I('plus', 14)} Pergunta</button></div><div class="col mt-4" data-qs></div>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Criar pesquisa</button>`
    });
    const TIPOS = [['nps', 'NPS (0 a 10)'], ['escala', 'Escala (1 a 5)'], ['sim_nao', 'Sim / Não'], ['texto', 'Texto livre']];
    const drawQ = () => {
      m.$('[data-qs]').innerHTML = perguntas.map((q, i) => `<div class="row card flat" style="padding:10px"><b>${i + 1}.</b><input class="input grow" data-i="${i}" value="${esc(q.texto)}"><select class="select" data-t="${i}" style="width:170px">${TIPOS.map(([v, t]) => `<option value="${v}" ${q.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn btn-icon btn-sm btn-ghost" data-rm="${i}" aria-label="Remover">${I('trash', 14)}</button></div>`).join('');
      m.$$('[data-i]').forEach(x => x.addEventListener('input', () => { perguntas[+x.dataset.i].texto = x.value; }));
      m.$$('[data-t]').forEach(x => x.addEventListener('change', () => { perguntas[+x.dataset.t].tipo = x.value; }));
      m.$$('[data-rm]').forEach(x => x.addEventListener('click', () => { perguntas.splice(+x.dataset.rm, 1); drawQ(); }));
    };
    drawQ();
    m.$('[name=publico]').addEventListener('change', e => { perguntas = ICM.C.PERGUNTAS_PADRAO[e.target.value].map(q => ({ ...q })); drawQ(); });
    m.$('[data-add]').addEventListener('click', () => { perguntas.push({ tipo: 'escala', texto: '' }); drawQ(); });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form'));
      const x = await ui().run(() => ICM.api.pesquisas.save({ ...d, perguntas: perguntas.filter(q => q.texto.trim()).map((q, i) => ({ ...q, id: 'q' + (i + 1) })) }), 'Pesquisa criada');
      m.close(); location.hash = `#/pesquisas/${x.id}`;
    }).catch(() => { }));
  }
})();
