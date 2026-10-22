/* Certificados: emissão em lote (turma, evento, voluntário, avulso), QR de verificação e revogação */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const TP = () => ICM.C.TIPOS_CERTIFICADO;

  ICM.pages.certificados = async function (el) {
    ICM.app.setCrumbs([['Início', '#/'], ['Certificados']]);
    const list = await ICM.api.certificados.list();
    const pode = ICM.auth.can('certificados.emitir');
    let tipo = '', q = '';
    const sel = new Set();
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Certificados</h1><div class="page-sub">Emitidos automaticamente para alunos e voluntários, com QR Code de verificação de autenticidade</div></div>
        ${pode ? `<button class="btn btn-primary" data-emitir>${I('award', 18)} Emitir certificados</button>` : ''}</div>
      <div class="grid grid-2 mb-4">
        <div class="card"><div class="section-title">${I('shield', 18)} Verificar autenticidade</div><div class="row"><input class="input" data-cod placeholder="Código do certificado (ex.: ABCD-EFGH-JKLM)" style="text-transform:uppercase"><button class="btn btn-primary" data-ver>Verificar</button></div><div class="mt-4" data-res></div></div>
        <div class="card"><div class="section-title">${I('info', 18)} Como funciona</div><div class="small muted">Cada certificado recebe um código único e um QR Code. Quem recebe (escola, empresa, edital) aponta a câmera para o QR e vê se o certificado é válido. Certificados emitidos por engano podem ser <b>revogados</b> — o QR passa a indicar "revogado".</div></div>
      </div>
      <div class="card">
        <div class="row wrap between mb-4">
          <div class="segmented" data-tipo><button data-v="" class="active">Todos</button>${Object.entries(TP()).map(([k, v]) => `<button data-v="${k}">${esc(v.nome.split(' ')[0])}</button>`).join('')}</div>
          <div class="row"><div class="input-icon" style="width:240px">${I('search', 18)}<input class="input" data-q placeholder="Nome ou código"></div><button class="btn" data-imp disabled>${I('printer', 16)} Imprimir selecionados</button></div>
        </div><div data-l></div></div></div>`;

    const draw = () => {
      const l = list.filter(c => (!tipo || c.tipo === tipo) && (!q || (c.nome + c.codigo + c.titulo).toLowerCase().includes(q)));
      el.querySelector('[data-l]').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th><span class="check"><input type="checkbox" data-all></span></th><th>Nome</th><th>Certificado</th><th>Tipo</th><th>Carga</th><th>Emissão</th><th>Código</th><th>Situação</th><th></th></tr></thead><tbody>
        ${l.map(c => `<tr><td><span class="check"><input type="checkbox" data-s="${esc(c.id)}" ${sel.has(c.id) ? 'checked' : ''}></span></td><td><b>${esc(c.nome)}</b><div class="xs muted">${c.destinatario_tipo === 'aluno' ? 'Aluno(a)' : c.destinatario_tipo === 'voluntario' ? 'Voluntário(a)' : 'Externo'}</div></td><td class="small">${esc(c.titulo)}</td><td><span class="area-chip" style="--c:${TP()[c.tipo].cor}">${esc(TP()[c.tipo].nome.split(' ')[0])}</span></td><td class="small">${c.carga_horaria ? esc(ICM.util.num(c.carga_horaria)) + 'h' : '—'}</td><td class="small">${esc(fmtDate(c.data_emissao))}</td><td class="small bold" style="white-space:nowrap">${esc(c.codigo)}</td><td>${c.status === 'valido' ? ui().badge('Válido', 'ok', true) : ui().badge('Revogado', 'danger', true)}</td>
          <td style="white-space:nowrap;text-align:right"><button class="btn btn-sm btn-ghost" data-p="${esc(c.id)}">${I('printer', 14)}</button>${pode && c.status === 'valido' ? `<button class="btn btn-sm btn-ghost" data-rev="${esc(c.id)}" title="Revogar">${I('x', 14)}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : ui().empty('Nenhum certificado', 'award');
      el.querySelectorAll('[data-s]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? sel.add(cb.dataset.s) : sel.delete(cb.dataset.s); upd(); }));
      const all = el.querySelector('[data-all]'); if (all) all.addEventListener('change', () => { l.forEach(c => all.checked ? sel.add(c.id) : sel.delete(c.id)); draw(); upd(); });
      el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => ICM.reports.certificados(list.filter(c => c.id === b.dataset.p))));
      el.querySelectorAll('[data-rev]').forEach(b => b.addEventListener('click', () => revogar(b.dataset.rev)));
    };
    const upd = () => { const b = el.querySelector('[data-imp]'); b.disabled = !sel.size; b.innerHTML = `${I('printer', 16)} Imprimir selecionados${sel.size ? ` (${sel.size})` : ''}`; };
    el.querySelectorAll('[data-tipo] button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('[data-tipo] button').forEach(x => x.classList.toggle('active', x === b)); tipo = b.dataset.v; draw(); }));
    el.querySelector('[data-q]').addEventListener('input', ICM.util.debounce(e => { q = e.target.value.toLowerCase(); draw(); }, 200));
    el.querySelector('[data-imp]').addEventListener('click', () => ICM.reports.certificados(list.filter(c => sel.has(c.id))));
    el.querySelector('[data-ver]').addEventListener('click', async () => { el.querySelector('[data-res]').innerHTML = resultadoVerificacao(await ICM.api.certificados.verificar(el.querySelector('[data-cod]').value)); });
    const eb = el.querySelector('[data-emitir]'); if (eb) eb.addEventListener('click', () => emitirModal());
    draw();

    async function revogar(id) {
      const m = ui().modal({ title: 'Revogar certificado', size: 'sm', body: `<form class="col"><p class="small">O certificado continuará existindo, mas a verificação mostrará que foi revogado.</p>${ui().field({ name: 'motivo', label: 'Motivo', type: 'textarea', rows: 2, required: true })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-danger solid" data-ok>Revogar</button>` });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.certificados.revogar(id, m.$('[name=motivo]').value.trim()), 'Certificado revogado'); m.close(); ICM.app.reload(); }).catch(() => { }));
    }
  };

  function resultadoVerificacao(c) {
    if (!c) return `<div class="sens-lock" style="background:var(--danger-soft);color:#dc2626">${I('x', 18)} Código não encontrado. Este certificado não foi emitido pelo ${esc(ICM.C.ORG.nome)}.</div>`;
    if (c.status !== 'valido') return `<div class="sens-lock" style="background:var(--danger-soft);color:#dc2626">${I('alert', 18)} Certificado REVOGADO — ${esc(c.nome)}, "${esc(c.titulo)}". Motivo: ${esc(c.motivo_revogacao || '')}</div>`;
    return `<div class="sens-lock" style="background:var(--ok-soft);color:#047857">${I('shield', 18)} <span>Certificado <b>VÁLIDO</b>: ${esc(c.nome)} — "${esc(c.titulo)}"${c.carga_horaria ? `, ${esc(ICM.util.num(c.carga_horaria))}h` : ''}, emitido em ${esc(fmtDate(c.data_emissao))}.</span></div>`;
  }

  // Página pública de verificação (abre sem login, a partir do QR Code)
  ICM.pages.verificar = async function (root, codigo) {
    const c = await ICM.api.certificados.verificar(decodeURIComponent(codigo || ''));
    root.innerHTML = `<div class="login-screen"><div class="bg-orbs"><div class="orb ring o1"></div><div class="orb o3"></div></div>
      <div class="login-card" style="width:min(560px,100%)"><div class="login-logo" style="width:120px;height:120px;border-radius:36px">${ICM.logo(76)}</div>
        <h1 class="login-title" style="font-size:30px">Verificação de certificado</h1><div class="login-sub">${esc(ICM.C.ORG.nome)}</div>
        <div class="card mt-6" style="width:100%;text-align:left">${resultadoVerificacao(c)}
          ${c && c.status === 'valido' ? `<div class="kv mt-4"><div><div class="k">Nome</div><div class="v">${esc(c.nome)}</div></div><div><div class="k">Certificado</div><div class="v">${esc(c.titulo)}</div></div><div><div class="k">Código</div><div class="v">${esc(c.codigo)}</div></div><div><div class="k">Emissão</div><div class="v">${esc(fmtDate(c.data_emissao))}</div></div></div>` : ''}</div>
        <a class="btn mt-6" href="#/">${I('arrowLeft', 16)} Ir para o sistema</a></div></div>`;
  };

  ICM.pages.verificarApp = (el, params) => { ICM.app.setCrumbs([['Certificados', '#/certificados'], ['Verificação']]); return ICM.pages.verificar(el, params.codigo); };

  async function emitirModal() {
    const F = o => ui().field(o);
    const turmas = await ICM.api.turmas.list(); const eventos = await ICM.api.eventos.list();
    const vols = (await ICM.api.voluntarios.list()).filter(v => v.status === 'ativo');
    const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const m = ui().modal({
      title: 'Emitir certificados', size: 'wide',
      body: `<div class="segmented mb-4" data-modo><button data-v="turma" class="active">Conclusão de turma</button><button data-v="evento">Participação em evento</button><button data-v="voluntario">Voluntários</button><button data-v="avulso">Avulso</button></div>
        <form class="grid grid-3" data-f></form><div class="mt-4" data-dest></div>`,
      foot: `<span class="small muted" data-n style="margin-right:auto"></span><button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('award', 18)} Emitir e imprimir</button>`
    });
    let modo = 'turma', dest = [];
    const sel = new Set();
    const f = m.$('[data-f]');
    const forms = {
      turma: () => `${F({ name: 'turma_id', label: 'Turma', type: 'select', options: turmas.map(t => [t.id, t.nome]), cls: 'span-2' })}${F({ name: 'freq', label: 'Frequência mínima (%)', type: 'number', value: 75 })}${F({ name: 'titulo', label: 'Título do curso', value: '', cls: 'span-2' })}${F({ name: 'carga', label: 'Carga horária (h)', type: 'number', value: '' })}`,
      evento: () => `${F({ name: 'evento_id', label: 'Evento', type: 'select', options: eventos.filter(e => e.data <= ICM.util.today()).map(e => [e.id, `${fmtDate(e.data)} — ${e.titulo}`]), cls: 'span-2' })}${F({ name: 'carga', label: 'Carga horária (h)', type: 'number', value: 3 })}`,
      voluntario: () => `<div class="span-all small muted">Gera um certificado para cada voluntário selecionado com o total de horas doadas.</div>`,
      avulso: () => `${F({ name: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(TP()).map(([k, v]) => [k, v.nome]) })}${F({ name: 'titulo', label: 'Título', cls: 'span-2' })}${F({ name: 'nome', label: 'Nome do destinatário (externo)', cls: 'span-2', hint: 'Ou selecione alunos abaixo' })}${F({ name: 'carga', label: 'Carga horária (h)', type: 'number' })}${F({ name: 'descricao', label: 'Texto ("Certificamos que FULANO …")', value: 'participou de', cls: 'span-all' })}`
    };
    function renderForm() { f.innerHTML = forms[modo](); carregar(); }
    async function carregar() {
      sel.clear();
      const d = ICM.util.formData(f);
      if (modo === 'turma' && d.turma_id) {
        const t = turmas.find(x => x.id === d.turma_id);
        if (!f.titulo.value) f.titulo.value = t.nome;
        const aulas = await ICM.api.aulas.list(t.id);
        if (!f.carga.value) f.carga.value = Math.round(aulas.filter(a => a.status === 'realizada').reduce((s, a) => s + a.horas, 0));
        dest = (await ICM.api.certificados.elegiveisTurma(t.id, Number(d.freq) || 75)).filter(l => l.status_turma === 'ativo').map(l => ({ id: l.aluno_id, nome: l.nome, info: `frequência ${l.freq ?? '—'}%`, ok: l.elegivel, tipo: 'aluno' }));
      } else if (modo === 'evento' && d.evento_id) {
        const e = eventos.find(x => x.id === d.evento_id);
        dest = alunos.filter(a => (e.alunos || []).includes(a.id)).map(a => ({ id: a.id, nome: a.nome, info: a.matricula, ok: true, tipo: 'aluno' }));
      } else if (modo === 'voluntario') dest = vols.map(v => ({ id: v.id, nome: v.nome, info: `${ICM.util.num(v.total_horas, 1)}h · ${v.area}`, ok: v.total_horas > 0, tipo: 'voluntario', horas: v.total_horas, area: v.area, inicio: v.inicio }));
      else dest = alunos.map(a => ({ id: a.id, nome: a.nome, info: a.matricula, ok: false, tipo: 'aluno' }));
      dest.forEach(x => { if (x.ok) sel.add(x.id); });
      drawDest();
    }
    function drawDest() {
      m.$('[data-dest]').innerHTML = dest.length ? `<div class="section-title">${I('users', 18)} Destinatários ${modo === 'turma' ? '<span class="xs muted">(pré-selecionados os que atingiram a frequência mínima)</span>' : ''}</div><div class="grid grid-3" style="gap:6px;max-height:300px;overflow:auto">${dest.map(x => `<label class="check small card flat" style="padding:10px"><input type="checkbox" data-d="${esc(x.id)}" ${sel.has(x.id) ? 'checked' : ''}><span><b>${esc(x.nome)}</b><br><span class="xs ${x.ok ? 'muted' : ''}" style="${x.ok ? '' : 'color:var(--danger)'}">${esc(x.info)}</span></span></label>`).join('')}</div>` : '';
      m.$$('[data-d]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? sel.add(cb.dataset.d) : sel.delete(cb.dataset.d); cnt(); }));
      cnt();
    }
    const cnt = () => { m.$('[data-n]').textContent = `${sel.size} certificado(s) a emitir`; };
    m.$$('[data-modo] button').forEach(b => b.addEventListener('click', () => { m.$$('[data-modo] button').forEach(x => x.classList.toggle('active', x === b)); modo = b.dataset.v; renderForm(); }));
    f.addEventListener('change', e => { if (['turma_id', 'evento_id', 'freq'].includes(e.target.name)) { if (e.target.name === 'turma_id') { f.titulo.value = ''; f.carga.value = ''; } carregar(); } });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(f); const lista = [];
      const escolhidos = dest.filter(x => sel.has(x.id));
      if (modo === 'turma') escolhidos.forEach(x => lista.push({ tipo: 'conclusao', destinatario_tipo: 'aluno', destinatario_id: x.id, nome: x.nome, titulo: d.titulo, descricao: 'concluiu com aproveitamento a turma/curso', carga_horaria: Number(d.carga) || null, referencia: { turma_id: d.turma_id } }));
      if (modo === 'evento') { const ev = eventos.find(x => x.id === d.evento_id); escolhidos.forEach(x => lista.push({ tipo: 'participacao', destinatario_tipo: 'aluno', destinatario_id: x.id, nome: x.nome, titulo: ev.titulo, descricao: `participou do evento (${ICM.C.TIPOS_EVENTO[ev.tipo].nome.toLowerCase()}) realizado em ${fmtDate(ev.data)}`, carga_horaria: Number(d.carga) || null, referencia: { evento_id: ev.id } })); }
      if (modo === 'voluntario') escolhidos.forEach(x => lista.push({ tipo: 'voluntariado', destinatario_tipo: 'voluntario', destinatario_id: x.id, nome: x.nome, titulo: `Trabalho voluntário — ${x.area || ICM.C.ORG.nome}`, descricao: `atuou como voluntário(a) em ${x.area || 'atividades da instituição'}, desde ${fmtDate(x.inicio)}`, carga_horaria: x.horas }));
      if (modo === 'avulso') {
        if (d.nome) lista.push({ tipo: d.tipo, destinatario_tipo: 'externo', destinatario_id: '', nome: d.nome, titulo: d.titulo, descricao: d.descricao, carga_horaria: Number(d.carga) || null });
        escolhidos.forEach(x => lista.push({ tipo: d.tipo, destinatario_tipo: 'aluno', destinatario_id: x.id, nome: x.nome, titulo: d.titulo, descricao: d.descricao, carga_horaria: Number(d.carga) || null }));
      }
      if (!lista.length) { ui().toast('Selecione ao menos um destinatário.', 'warn'); return; }
      const certs = await ui().run(() => ICM.api.certificados.emitir(lista), `${lista.length} certificado(s) emitido(s)`);
      m.close(); await ICM.reports.certificados(certs); ICM.app.reload();
    }).catch(() => { }));
    renderForm();
  }
})();
