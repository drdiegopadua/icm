/* Painel de pendências: tudo o que está atrasado num lugar só, cada item com o botão que resolve.
   Aulas sem chamada/relatório/3 fotos, plano do mês, termos sem assinatura, folha de bolsas,
   documentos da instituição vencendo e alunos em risco de faltas. Cada pessoa vê só o que pode resolver. */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const can = p => ICM.auth.can(p);
  const tentar = async fn => { try { return await fn(); } catch (e) { console.warn('pendências', e.message); return null; } };

  async function coletar() {
    const hoje = ICM.util.today(), ym = hoje.slice(0, 7);
    const ymAnt = ICM.util.addDays(`${ym}-01`, -1).slice(0, 7);
    const S = [];
    const eu = ICM.auth.user();
    const ehProf = eu.papel === 'professor';

    // 1) Aulas: chamada, relatório e 3 fotos (últimos 30 dias)
    if (can('aulas.registrar') || can('pedagogico.gestao')) {
      const l = await tentar(() => ICM.api.pedagogico.aulasPendentes(30)) || [];
      const users = ehProf ? [] : await tentar(() => ICM.api.usuarios.list()) || [];
      S.push({ k: 'aulas', titulo: 'Aulas sem registro completo', icon: 'book', cor: '#ef4444', desc: 'Últimos 30 dias: chamada, relatório da aula e as 3 fotos', itens: l.map(x => ({
        txt: `${x.turma} — ${fmtDate(x.data)}${x.hoje ? ' (hoje)' : ''}`, sub: `Falta: ${x.faltas.join(', ')}${!ehProf ? ` · ${(users.find(u => u.id === x.professor_id) || {}).nome || 'sem professor'}` : ''}`,
        href: x.aula_id ? `#/turmas/${x.turma_id}?aula=${x.aula_id}` : `#/turmas/${x.turma_id}?nova=${x.data}`, acao: 'Lançar',
        avisar: !ehProf && x.professor_id && x.professor_id !== eu.id ? { uid: x.professor_id, texto: `Olá! A aula da turma ${x.turma} de ${fmtDate(x.data)} ainda está sem ${x.faltas.join(', ')}. Pode lançar no sistema, por favor?` } : null,
        nivel: x.hoje ? 'warn' : 'danger'
      })) });
    }

    // 2) Plano do mês (e do próximo, a partir do dia 25)
    if (can('aulas.registrar') || can('pedagogico.gestao')) {
      const turmas = (await tentar(() => ICM.api.turmas.list()) || []).filter(t => t.status !== 'encerrada');
      const meses = [ym]; if (+hoje.slice(8) >= 25) meses.push(ICM.util.addDays(`${ym}-28`, 7).slice(0, 7));
      const itens = [];
      for (const m of meses) {
        const pls = await tentar(() => ICM.api.pedagogico.planos.list(m)) || [];
        turmas.filter(t => !pls.some(p => p.turma_id === t.id && [p.tema, p.objetivos, p.conteudos, p.metodologia].some(v => String(v || '').trim())))
          .filter(t => !ehProf || t.professor_id === eu.id)
          .forEach(t => itens.push({ txt: `${t.nome} — ${ICM.util.fmtMonth(m)}`, sub: m === ym ? 'Plano de aula do mês não preenchido' : 'Plano do próximo mês ainda não enviado', href: `#/turmas/${t.id}?tab=plano&mes=${m}`, acao: 'Preencher', nivel: m === ym ? 'danger' : 'warn' }));
      }
      S.push({ k: 'planos', titulo: 'Planos do mês', icon: 'clipboard', cor: '#f59e0b', desc: 'Plano de aula mensal de cada turma', itens });
    }

    // 3) Termos sem assinatura
    {
      const itens = [];
      if (can('alunos.editar')) {
        const al = (await tentar(() => ICM.api.alunos.list({ status: 'ativo' })) || []).filter(a => !(a.autorizacoes || {}).lgpd || !(a.autorizacoes || {}).imagem);
        if (al.length) itens.push({ txt: `${al.length} aluno(s) sem termo de LGPD ou de imagem`, sub: al.slice(0, 6).map(a => a.nome.split(' ')[0]).join(', ') + (al.length > 6 ? '…' : ''), href: '#/cadastros?tab=termos', acao: 'Resolver', nivel: 'warn' });
      }
      if (can('bolsas.gerir')) (await tentar(() => ICM.api.bolsas.list({ status: 'ativo' })) || []).filter(b => !b.termo_assinado)
        .forEach(b => itens.push({ txt: b.nome, sub: `Termo de compromisso (${ICM.api.bolsas.TIPOS[b.tipo].nome.toLowerCase()}) não assinado`, href: `#/bolsistas/${b.id}`, acao: 'Abrir', nivel: 'danger' }));
      if (can('voluntarios.gerir')) (await tentar(() => ICM.api.voluntarios.list()) || []).filter(v => v.status === 'ativo' && !v.termo_assinado)
        .forEach(v => itens.push({ txt: v.nome, sub: 'Termo de adesão ao voluntariado não assinado', href: `#/voluntarios/${v.id}`, acao: 'Abrir', nivel: 'warn' }));
      if (can('alunos.editar') || can('bolsas.gerir') || can('voluntarios.gerir')) S.push({ k: 'termos', titulo: 'Termos sem assinatura', icon: 'edit', cor: '#8b5cf6', desc: 'Alunos, bolsistas e voluntários', itens });
    }

    // 4) Folha de bolsas
    if (can('bolsas.gerir')) {
      const itens = [];
      for (const m of [ymAnt, ym]) {
        const f = await tentar(() => ICM.api.bolsas.folha(m)); if (!f) continue;
        const pend = f.pagamentos.filter(p => p.status === 'pendente'), aprov = f.pagamentos.filter(p => p.status === 'aprovado');
        if (m === ymAnt && f.faltam.length) itens.push({ txt: `Folha de ${ICM.util.fmtMonth(m)} incompleta`, sub: `${f.faltam.length} pessoa(s) fora da folha`, href: `#/bolsistas?aba=folha&mes=${m}`, acao: 'Gerar folha', nivel: 'danger' });
        if (pend.length) itens.push({ txt: `${pend.length} bolsa(s) a aprovar — ${ICM.util.fmtMonth(m)}`, sub: can('bolsas.aprovar') ? 'Aguardando a sua aprovação' : 'Aguardando a aprovação da direção', href: `#/bolsistas?aba=folha&mes=${m}`, acao: can('bolsas.aprovar') ? 'Aprovar' : 'Ver', nivel: m === ymAnt ? 'danger' : 'warn' });
        if (aprov.length) itens.push({ txt: `${aprov.length} bolsa(s) aprovada(s) sem pagamento registrado — ${ICM.util.fmtMonth(m)}`, sub: 'Registre o pagamento e imprima os recibos', href: `#/bolsistas?aba=folha&mes=${m}`, acao: 'Pagar', nivel: 'warn' });
      }
      S.push({ k: 'bolsas', titulo: 'Folha de bolsas', icon: 'wallet', cor: '#2563eb', desc: 'Mês passado e mês atual', itens });
    }

    // 5) Documentos da instituição
    if (can('docinst.ver')) {
      const ds = (await tentar(() => ICM.api.docsInst.list()) || []).filter(d => d.status.nivel !== 'ok');
      S.push({ k: 'docs', titulo: 'Documentos vencendo ou vencidos', icon: 'shield', cor: '#0ea5e9', desc: 'Certidões, alvarás e registros da instituição', itens: ds.map(d => ({ txt: d.nome || (d.cfg || {}).nome || 'Documento', sub: d.status.txt, href: '#/documentos', acao: 'Renovar', nivel: d.status.nivel === 'danger' ? 'danger' : 'warn' })) });
    }

    // 6) Alunos em risco de faltas
    {
      const al = await tentar(() => ICM.api.assiduidade.alertas(ym)) || [];
      S.push({ k: 'faltas', titulo: 'Alunos em risco por faltas', icon: 'alert', cor: '#f97316', desc: `Faltas em ${ICM.util.fmtMonth(ym)}`, itens: al.map(a => ({ txt: a.nome, sub: `${a.F} falta(s) em ${a.turma}${a.nivel === 'danger' ? ' — avaliar desligamento' : ''}`, href: `#/alunos/${a.aluno_id}`, acao: 'Ver aluno', nivel: a.nivel === 'danger' ? 'danger' : 'warn', extra: can('avisos.enviar') ? { href: '#/avisos', acao: 'Avisar família' } : null })) });
    }
    return S;
  }

  ICM.pages.pendencias = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Pendências']]);
    el.innerHTML = `<div class="page"><div class="page-head"><div><h1 class="page-title">Pendências</h1><div class="page-sub">Tudo o que está atrasado, com o botão que resolve</div></div></div><div class="card">${ui().empty('Conferindo…', 'refresh')}</div></div>`;
    const secoes = await coletar();
    const total = secoes.reduce((s, x) => s + x.itens.length, 0);
    let aberta = null;
    const draw = () => {
      el.innerHTML = `<div class="page">
        <div class="page-head"><div><h1 class="page-title">Pendências</h1><div class="page-sub">${total ? `${total} item(ns) para resolver` : 'Nada atrasado. Tudo em dia!'}</div></div>
          <div class="row wrap"><button class="btn" data-atualizar>${I('refresh', 16)} Atualizar</button></div></div>
        <div class="pend-resumo mb-4">${secoes.map(s => `<button type="button" class="pend-chip ${aberta === s.k ? 'ativo' : ''}" data-ir="${s.k}" style="--c:${s.cor}">${I(s.icon, 16)}<span>${esc(s.titulo)}</span><b>${s.itens.length}</b></button>`).join('')}</div>
        ${secoes.filter(s => !aberta || s.k === aberta).map(s => `<div class="card mb-4" id="pend-${s.k}">
          <div class="section-title" style="--c:${s.cor}"><span class="pend-ic" style="background:${s.cor}">${I(s.icon, 16)}</span> ${esc(s.titulo)} <span class="badge ${s.itens.length ? 'danger' : 'ok'}">${s.itens.length || 'em dia'}</span></div>
          <div class="xs muted mb-2">${esc(s.desc)}</div>
          ${s.itens.length ? `<div class="pend-lista">${s.itens.slice(0, aberta ? 500 : 8).map((it, i) => `<div class="pend-item ${it.nivel}">
              <span class="pend-dot"></span><div class="grow" style="min-width:0"><b class="truncate">${esc(it.txt)}</b><div class="xs muted">${esc(it.sub || '')}</div></div>
              <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${it.avisar ? `<button class="btn btn-sm" data-avisar="${s.k}:${i}" title="Mandar lembrete no chat">${I('chat', 14)} Avisar</button>` : ''}${it.extra ? `<a class="btn btn-sm" href="${esc(it.extra.href)}">${esc(it.extra.acao)}</a>` : ''}<a class="btn btn-sm btn-primary" href="${esc(it.href)}">${esc(it.acao)} ${I('arrowRight', 14)}</a></div></div>`).join('')}</div>
            ${!aberta && s.itens.length > 8 ? `<button class="btn btn-sm btn-ghost mt-2" data-ir="${s.k}">Ver todos (${s.itens.length})</button>` : ''}` : `<div class="small muted">${I('check', 14)} Nada pendente.</div>`}
        </div>`).join('')}
        ${aberta ? `<button class="btn" data-ir="">${I('arrowLeft', 16)} Ver todas as categorias</button>` : ''}
        <style>.pend-resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
        .pend-chip{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;text-align:left;font:inherit}
        .pend-chip svg{color:var(--c)}.pend-chip span{flex:1;font-size:13px;font-weight:600}.pend-chip b{font-size:18px;color:var(--c)}.pend-chip.ativo{box-shadow:0 0 0 2px var(--c)}
        .pend-ic{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;color:#fff}
        .pend-lista{display:flex;flex-direction:column;gap:6px}.pend-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2, rgba(127,127,127,.06))}
        .pend-dot{width:8px;height:8px;border-radius:50%;flex:none;background:#f59e0b}.pend-item.danger .pend-dot{background:#ef4444}
        @media (max-width:600px){.pend-item{flex-wrap:wrap}}</style></div>`;
      el.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => { aberta = b.dataset.ir && aberta !== b.dataset.ir ? b.dataset.ir : null; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      el.querySelector('[data-atualizar]').addEventListener('click', () => ICM.pages.pendencias(el));
      el.querySelectorAll('[data-avisar]').forEach(b => b.addEventListener('click', () => ui().busy(b, async () => {
        const [k, i] = b.dataset.avisar.split(':'); const it = secoes.find(s => s.k === k).itens[+i];
        await ui().run(() => ICM.api.chat.enviar(ICM.api.chat.idDireto(ICM.auth.user().id, it.avisar.uid), it.avisar.texto), 'Lembrete enviado no chat');
        b.disabled = true; b.innerHTML = `${I('check', 14)} Avisado`;
      }).catch(() => { })));
    };
    draw();
  };
})();
