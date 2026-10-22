/* Equipe (RH): contratos, documentos com validade, capacitações e escala de trabalho */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money, num } = ICM.util;
  const ui = () => ICM.ui;
  const DOCS = () => ICM.C.DOCS_EQUIPE;
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  ICM.pages.equipe = async function (el, params, query) {
    if (!ICM.auth.can('equipe.gerir')) { el.innerHTML = ui().empty('Acesso restrito à direção e coordenação.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Equipe']]);
    const list = await ICM.api.equipe.list();
    const ativos = list.filter(p => p.status === 'ativo');
    const alertas = ativos.flatMap(p => p.alertas.map(a => ({ ...a, p })));
    const projetos = await ICM.api.raw('projetos');
    const tab0 = query.get('tab') || 'pessoas';
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Equipe</h1><div class="page-sub">Contratos, documentos, capacitações e escala de trabalho</div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('fileText', 18)} Quadro de pessoal</button><button class="btn btn-primary" data-novo>${I('userPlus', 18)} Novo colaborador</button></div></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('users', '#2563eb', ativos.length, 'Colaboradores ativos')}
        ${ICM.pages._stat('clock', '#8b5cf6', ativos.reduce((s, p) => s + Number((p.contrato || {}).carga_semanal || 0), 0), 'Horas semanais contratadas')}
        ${ICM.pages._stat('award', '#10b981', Math.round(ativos.reduce((s, p) => s + p.horas_capacitacao, 0)), 'Horas de capacitação')}
        ${ICM.pages._stat('alert', '#ef4444', alertas.length, 'Pendências (contratos/docs)')}
      </div>
      ${alertas.length ? `<div class="card mb-4" style="box-shadow:0 0 0 2px rgba(239,68,68,.3),var(--sh-out)"><div class="card-title mb-4">${I('alert', 18)} Atenção</div>${alertas.map(a => `<a class="list-item" href="#/equipe/${esc(a.p.id)}"><span class="badge ${a.nivel}">${a.nivel === 'danger' ? 'Urgente' : 'Em breve'}</span><b>${esc(a.p.nome)}</b><span class="small grow">${esc(a.txt)}</span>${I('chevronRight', 16)}</a>`).join('')}</div>` : ''}
      <div class="tabs mb-4">${[['pessoas', 'Colaboradores', 'users'], ['escala', 'Escala da semana', 'calendar']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    const R = {
      pessoas() {
        panel.innerHTML = `<div class="card tab-panel"><div class="table-wrap"><table class="table"><thead><tr><th>Colaborador</th><th>Vínculo</th><th>Projetos</th><th>Carga</th><th>Contrato até</th><th>Documentos</th><th>Situação</th></tr></thead><tbody>
          ${list.map(p => { const c = p.contrato || {}; return `<tr class="clickable" data-href="#/equipe/${esc(p.id)}"><td><div class="row">${ICM.util.avatar(p.nome, null, 'sm')}<div><b>${esc(p.nome)}</b><div class="xs muted">${esc(p.cargo)}</div></div></div></td><td>${ui().badge(ICM.C.VINCULOS[p.vinculo] || p.vinculo, 'neutral')}</td>
            <td class="small">${(p.projeto_ids || []).map(id => esc(((projetos.find(x => x.id === id) || {}).nome || '').split(' ')[0])).join(', ') || '—'}</td><td class="small">${c.carga_semanal ? c.carga_semanal + 'h/sem' : '—'}</td><td class="small">${c.fim ? esc(fmtDate(c.fim)) : 'Indeterminado'}</td>
            <td>${p.alertas.length ? p.alertas.map(a => `<span class="badge ${a.nivel}" title="${esc(a.txt)}">${a.nivel === 'danger' ? '!' : '⏳'}</span>`).join(' ') : ui().badge('Em dia', 'ok')}</td><td>${p.status === 'ativo' ? ui().badge('Ativo', 'ok', true) : ui().badge('Desligado', 'neutral', true)}</td></tr>`; }).join('')}
        </tbody></table></div></div>`;
        panel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      },
      async escala() {
        const esc2 = await ICM.api.equipe.escalaSemana();
        panel.innerHTML = `<div class="card tab-panel"><div class="grid" style="grid-template-columns:repeat(6,minmax(0,1fr));gap:10px">${[1, 2, 3, 4, 5, 6].map(d => `<div><div class="bold mb-4" style="text-align:center">${DIAS[d]}</div>${esc2.filter(x => x.dia === d).map(x => `<div class="card flat" style="padding:10px;margin-bottom:8px"><div class="xs bold" style="color:var(--primary)">${esc(x.inicio)}–${esc(x.fim)}</div><div class="small bold">${esc(x.pessoa)}</div><div class="xs muted">${esc(x.atividade || '')}${x.local ? ' · ' + esc(x.local) : ''}</div></div>`).join('') || '<div class="xs muted" style="text-align:center">—</div>'}</div>`).join('')}</div>
          <div class="xs muted mt-4">Inclui os turnos cadastrados e, para professores com login, os horários das turmas automaticamente.</div><button class="btn btn-sm mt-4" data-relesc>${I('printer', 14)} Imprimir escala</button></div>`;
        panel.querySelector('[data-relesc]').addEventListener('click', () => ICM.reports.generate('equipe_escala', {}));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => R[k]());
    el.querySelector('[data-novo]').addEventListener('click', () => form({}));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.generate('equipe_quadro', {}));
    await R[tab0]();
  };

  ICM.pages.colaborador = async function (el, params, query) {
    const p = await ICM.api.equipe.get(params.id);
    if (!p) { el.innerHTML = ui().empty('Colaborador não encontrado'); return; }
    ICM.app.setCrumbs([['Equipe', '#/equipe'], [p.nome]]);
    const projetos = await ICM.api.raw('projetos'); const users = await ICM.api.usuarios.list();
    const c = p.contrato || {};
    const tab0 = query.get('tab') || 'dados';
    el.innerHTML = `<div class="page">
      <div class="card mb-4"><div class="profile-hero">${ICM.util.avatar(p.nome, null, 'lg')}<div class="grow"><h1 class="page-title" style="font-size:28px">${esc(p.nome)}</h1>
        <div class="meta mt-2"><span>${I('award', 15)} ${esc(p.cargo)}</span><span>${I('key', 15)} ${esc(ICM.C.VINCULOS[p.vinculo] || '')}</span><span>${I('calendar', 15)} desde ${esc(fmtDate(p.admissao))}</span></div>
        <div class="row wrap mt-2">${p.alertas.map(a => `<span class="badge ${a.nivel}">${esc(a.txt)}</span>`).join('') || ui().badge('Documentação em dia', 'ok', true)}</div></div>
        <div class="row wrap"><button class="btn" data-edit>${I('edit', 18)} Editar</button></div></div></div>
      <div class="tabs mb-4">${[['dados', 'Dados e contrato', 'user'], ['docs', 'Documentos', 'fileText'], ['caps', 'Capacitações', 'award'], ['escala', 'Escala', 'clock']].map(([k, n, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${n}</button>`).join('')}</div>
      <div data-panel></div></div>`;
    const panel = el.querySelector('[data-panel]');
    const salvar = async (patch, msg) => { await ui().run(() => ICM.api.equipe.save({ ...p, ...patch }), msg); location.hash = `#/equipe/${p.id}?tab=${cur}`; ICM.app.reload(); };
    let cur = tab0;
    const R = {
      dados() {
        panel.innerHTML = `<div class="grid grid-2 tab-panel"><div class="card"><div class="section-title">${I('user', 18)} Dados pessoais</div>${ui().kv([['CPF', p.cpf ? ICM.util.maskCPF(p.cpf) : ''], ['Nascimento', fmtDate(p.nascimento)], ['Telefone', p.telefone], ['E-mail', p.email], ['Login no sistema', (users.find(u => u.id === p.usuario_id) || {}).email || 'Sem acesso']])}</div>
          <div class="card"><div class="section-title">${I('fileText', 18)} Contrato</div>${ui().kv([['Vínculo', ICM.C.VINCULOS[p.vinculo]], ['Início', fmtDate(c.inicio)], ['Término', c.fim ? fmtDate(c.fim) : 'Indeterminado'], ['Carga semanal', c.carga_semanal ? c.carga_semanal + ' horas' : ''], ['Remuneração', c.remuneracao != null ? money(c.remuneracao) : (ICM.auth.can('equipe.salarios') ? '' : 'Restrito à direção')], ['Projetos', (p.projeto_ids || []).map(id => (projetos.find(x => x.id === id) || {}).nome).join(', ')]])}
            ${c.fim ? `<div class="row mt-4"><button class="btn btn-sm" data-renova>${I('refresh', 14)} Renovar contrato</button></div>` : ''}</div>
          <div class="card span-all"><div class="card-head"><div class="section-title" style="margin:0">${I('wallet', 18)} Conta para pagamento</div>${ICM.auth.can('equipe.salarios') ? `<button class="btn btn-sm" data-banco>${I('edit', 14)} ${p.banco ? 'Editar' : 'Cadastrar'} conta</button>` : ''}</div>
            ${p._bancoRestrito ? `<div class="sens-lock">${I('lock', 16)} Dados bancários visíveis apenas para a direção.</div>` : p.banco ? `${ui().kv([['Titular', p.banco.titular], ['CPF/CNPJ do titular', p.banco.cpf_titular], ['Banco', p.banco.banco], ['Agência', p.banco.agencia], ['Conta', p.banco.conta], ['Tipo', ICM.C.TIPOS_CONTA[p.banco.tipo_conta] || ''], ['Chave PIX', p.banco.pix ? `${p.banco.pix} (${ICM.C.TIPOS_PIX[p.banco.tipo_pix] || ''})` : '']])}
              ${p.banco.titular && norm(p.banco.titular) !== norm(p.nome) ? `<div class="sens-lock mt-4">${I('alert', 16)} A conta não está no nome do colaborador. Pagamentos de recurso público devem ir para conta do próprio contratado.</div>` : ''}
              ${(p.documentos || []).some(d => d.tipo === 'bancario' && d.arquivo) ? `<div class="xs mt-4" style="color:var(--ok)">${I('check', 12)} Comprovante da conta anexado na aba Documentos</div>` : `<div class="xs muted mt-4">Anexe o comprovante da conta na aba Documentos.</div>`}` : ui().empty('Nenhuma conta cadastrada', 'wallet')}</div></div>`;
        const bb = panel.querySelector('[data-banco]'); if (bb) bb.addEventListener('click', () => {
          const b = p.banco || { titular: p.nome, cpf_titular: p.cpf };
          const F = o => ui().field(o);
          const m = ui().modal({ title: 'Conta para pagamento', body: `<form class="grid grid-2">${F({ name: 'titular', label: 'Titular da conta', value: b.titular, cls: 'span-2' })}${F({ name: 'cpf_titular', label: 'CPF/CNPJ do titular', value: b.cpf_titular })}${F({ name: 'banco', label: 'Banco', value: b.banco, placeholder: 'Ex.: 001 — Banco do Brasil' })}${F({ name: 'agencia', label: 'Agência', value: b.agencia })}${F({ name: 'conta', label: 'Conta com dígito', value: b.conta })}${F({ name: 'tipo_conta', label: 'Tipo de conta', type: 'select', value: b.tipo_conta, options: Object.entries(ICM.C.TIPOS_CONTA) })}${F({ name: 'tipo_pix', label: 'Tipo de chave PIX', type: 'select', value: b.tipo_pix, options: [['', 'Sem PIX'], ...Object.entries(ICM.C.TIPOS_PIX)] })}${F({ name: 'pix', label: 'Chave PIX', value: b.pix, cls: 'span-2' })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar conta</button>` });
          m.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('form')); if (!d.pix && !(d.banco && d.agencia && d.conta)) return ui().toast('Informe banco, agência e conta, ou uma chave PIX.', 'warn'); m.close(); await salvar({ banco: d }, 'Conta de pagamento salva').catch(() => { }); });
        });
        const rb = panel.querySelector('[data-renova]'); if (rb) rb.addEventListener('click', () => {
          const m = ui().modal({ title: 'Renovar contrato', size: 'sm', body: `<form class="col">${ui().field({ name: 'fim', label: 'Novo término', type: 'date', value: ICM.util.addDays(c.fim, 365) })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Renovar</button>` });
          m.$('[data-ok]').addEventListener('click', async () => { m.close(); await salvar({ contrato: { ...c, fim: m.$('[name=fim]').value } }, 'Contrato renovado'); });
        });
      },
      docs() {
        const hoje = ICM.util.today();
        const docs = p.documentos || [];
        const nomeDoc = d => d.tipo === 'outro' && d.descricao ? d.descricao : (DOCS()[d.tipo] || { nome: d.tipo }).nome;
        const essenciais = ['rg', 'cpf', 'residencia', 'antecedentes', 'contrato', 'bancario'];
        const semArquivo = essenciais.filter(k => !docs.some(d => d.tipo === k && d.arquivo));
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Documentos e arquivos</div><div class="card-sub">Anexe PDF ou foto (JPG/PNG) de cada documento — ficam guardados no cadastro do colaborador</div></div><button class="btn btn-sm btn-primary" data-add>${I('upload', 14)} Anexar documento</button></div>
          ${Object.entries(DOCS()).filter(([k, v]) => v.obrig && !docs.some(d => d.tipo === k)).map(([, v]) => `<div class="sens-lock mb-4" style="background:var(--danger-soft);color:#dc2626">${I('alert', 16)} Falta: ${esc(v.nome)} — obrigatório para quem trabalha com crianças e adolescentes.</div>`).join('')}
          ${semArquivo.length ? `<div class="sens-lock mb-4">${I('info', 16)} Sem arquivo anexado: ${semArquivo.map(k => esc(DOCS()[k].nome)).join(', ')}.</div>` : ''}
          <div class="table-wrap"><table class="table"><thead><tr><th>Documento</th><th>Número</th><th>Validade</th><th>Situação</th><th>Arquivo</th><th></th></tr></thead><tbody>
          ${docs.map(d => { const n = d.validade ? Math.round((ICM.util.parseD(d.validade) - ICM.util.parseD(hoje)) / 864e5) : null; return `<tr><td><b>${esc(nomeDoc(d))}</b>${d.emissao ? `<div class="xs muted">emitido em ${esc(fmtDate(d.emissao))}</div>` : ''}</td><td class="small">${esc(d.numero || '—')}</td><td class="small">${esc(d.validade ? fmtDate(d.validade) : 'Não vence')}</td><td>${n == null ? ui().badge('OK', 'ok') : n < 0 ? ui().badge('Vencido', 'danger', true) : n <= 30 ? ui().badge(`Vence em ${n}d`, 'warn', true) : ui().badge('Válido', 'ok', true)}</td>
            <td>${d.arquivo ? `<button class="btn btn-sm" data-ver="${esc(d.arquivo.id)}" title="${esc(d.arquivo.nome)}">${I(d.arquivo.mime === 'application/pdf' ? 'fileText' : 'image', 14)} Ver</button>` : `<label class="btn btn-sm btn-ghost" style="color:var(--primary)">${I('upload', 14)} Anexar<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-up="${esc(d.id)}" hidden></label>`}</td>
            <td style="white-space:nowrap">${d.arquivo ? `<label class="btn btn-icon btn-sm btn-ghost" title="Trocar arquivo">${I('refresh', 14)}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" data-up="${esc(d.id)}" hidden></label>` : ''}<button class="btn btn-icon btn-sm btn-ghost" data-rm="${esc(d.id)}" aria-label="Remover">${I('trash', 14)}</button></td></tr>`; }).join('') || `<tr><td colspan="6">${ui().empty('Nenhum documento', 'fileText')}</td></tr>`}
          </tbody></table></div><div class="xs muted mt-2">${I('lock', 12)} Arquivos com dados pessoais — acesso restrito à direção e coordenação, e cada abertura fica registrada na auditoria.</div></div>`;
        const anexar = async (file, docId) => ui().run(async () => {
          const arq = await ICM.api.arquivos.salvar(file, { col: 'equipe', id: p.id });
          const antigo = docs.find(x => x.id === docId).arquivo;
          if (antigo) await ICM.api.arquivos.remove(antigo.id);
          await salvar({ documentos: docs.map(x => x.id === docId ? { ...x, arquivo: arq } : x) }, 'Arquivo anexado');
        });
        panel.querySelectorAll('[data-up]').forEach(inp => inp.addEventListener('change', () => inp.files[0] && anexar(inp.files[0], inp.dataset.up).catch(() => { })));
        panel.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => verArquivo(b.dataset.ver)));
        panel.querySelector('[data-add]').addEventListener('click', () => {
          const m = ui().modal({ title: 'Anexar documento', size: 'sm', body: `<form class="col">${ui().field({ name: 'tipo', label: 'Documento', type: 'select', options: Object.entries(DOCS()).map(([k, v]) => [k, v.nome]) })}<div data-desc hidden>${ui().field({ name: 'descricao', label: 'Qual documento?' })}</div>${ui().field({ name: 'numero', label: 'Número (se houver)' })}<div class="grid grid-2">${ui().field({ name: 'emissao', label: 'Emissão', type: 'date' })}${ui().field({ name: 'validade', label: 'Validade (se houver)', type: 'date' })}</div>
            <label class="photo-drop" style="aspect-ratio:auto;padding:20px" data-drop>${I('upload', 26)}<span data-fn>Escolher arquivo (PDF ou foto)</span><input type="file" name="_arq" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></label></form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar</button>` });
          const fi = m.$('[name=_arq]');
          fi.addEventListener('change', () => { m.$('[data-fn]').textContent = fi.files[0] ? `${fi.files[0].name} (${Math.round(fi.files[0].size / 1024)} KB)` : 'Escolher arquivo'; });
          m.$('[name=tipo]').addEventListener('change', e => { m.$('[data-desc]').hidden = e.target.value !== 'outro'; });
          m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
            const d = ICM.util.formData(m.$('form')); delete d._arq;
            if (d.tipo === 'outro' && !d.descricao) return ui().toast('Informe qual é o documento.', 'warn');
            let arquivo = null;
            if (fi.files[0]) arquivo = await ui().run(() => ICM.api.arquivos.salvar(fi.files[0], { col: 'equipe', id: p.id }));
            const substitui = DOCS()[d.tipo] && DOCS()[d.tipo].validade && d.tipo !== 'outro';
            m.close();
            await salvar({ documentos: docs.filter(x => !(substitui && x.tipo === d.tipo)).concat([{ id: ICM.util.uid('doc_'), ...d, arquivo }]) }, 'Documento registrado');
          }).catch(() => { }));
        });
        panel.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => {
          if (!(await ui().confirm({ title: 'Remover documento', text: 'O registro e o arquivo anexado serão removidos.', ok: 'Remover', danger: true }))) return;
          const d = docs.find(x => x.id === b.dataset.rm); if (d && d.arquivo) await ICM.api.arquivos.remove(d.arquivo.id);
          await salvar({ documentos: docs.filter(x => x.id !== b.dataset.rm) }, 'Documento removido');
        }));
      },
      caps() {
        const tot = (p.capacitacoes || []).reduce((s, x) => s + Number(x.carga || 0), 0);
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Capacitações</div><div class="card-sub">${num(tot)} horas de formação</div></div><button class="btn btn-sm btn-primary" data-add>${I('plus', 14)} Capacitação</button></div>
          ${(p.capacitacoes || []).length ? (p.capacitacoes).sort((a, b) => b.data.localeCompare(a.data)).map(x => `<div class="list-item">${I('award', 18)}<div class="grow"><b>${esc(x.titulo)}</b><div class="xs muted">${esc(x.instituicao || '')} · ${esc(fmtDate(x.data))} · ${esc(x.carga)}h</div></div><button class="btn btn-icon btn-sm btn-ghost" data-rm="${esc(x.id)}" aria-label="Remover">${I('trash', 14)}</button></div>`).join('') : ui().empty('Nenhuma capacitação registrada', 'award')}</div>`;
        panel.querySelector('[data-add]').addEventListener('click', () => {
          const m = ui().modal({ title: 'Registrar capacitação', size: 'sm', body: `<form class="col">${ui().field({ name: 'titulo', label: 'Curso / formação', required: true })}${ui().field({ name: 'instituicao', label: 'Instituição' })}${ui().field({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today() })}${ui().field({ name: 'carga', label: 'Carga horária (h)', type: 'number' })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Registrar</button>` });
          m.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('form')); if (!d.titulo) return ui().toast('Informe o curso.', 'warn'); m.close(); await salvar({ capacitacoes: (p.capacitacoes || []).concat([{ id: ICM.util.uid('cap_'), ...d }]) }, 'Capacitação registrada'); });
        });
        panel.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => salvar({ capacitacoes: p.capacitacoes.filter(x => x.id !== b.dataset.rm) }, 'Removida')));
      },
      escala() {
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Escala de trabalho</div><div class="card-sub">Turnos fixos semanais${p.usuario_id ? ' — as aulas das turmas do professor entram automaticamente na escala da equipe' : ''}</div></div><button class="btn btn-sm btn-primary" data-add>${I('plus', 14)} Turno</button></div>
          ${(p.escala || []).length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Dia</th><th>Horário</th><th>Local</th><th>Atividade</th><th></th></tr></thead><tbody>${[...p.escala].sort((a, b) => a.dia - b.dia).map(x => `<tr><td class="bold">${DIAS[x.dia]}</td><td>${esc(x.inicio)}–${esc(x.fim)}</td><td class="small">${esc(x.local || '')}</td><td class="small">${esc(x.atividade || '')}</td><td><button class="btn btn-icon btn-sm btn-ghost" data-rm="${esc(x.id)}" aria-label="Remover">${I('trash', 14)}</button></td></tr>`).join('')}</tbody></table></div>` : ui().empty('Sem turnos cadastrados', 'clock')}</div>`;
        panel.querySelector('[data-add]').addEventListener('click', () => {
          const m = ui().modal({ title: 'Adicionar turno', size: 'sm', body: `<form class="grid grid-2"><div class="field span-2"><span class="label">Dias</span><div class="row wrap">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="check"><input type="checkbox" name="dias" value="${d}" data-multi> ${DIAS[d]}</label>`).join('')}</div></div>${ui().field({ name: 'inicio', label: 'Início', type: 'time', value: '08:00' })}${ui().field({ name: 'fim', label: 'Fim', type: 'time', value: '12:00' })}${ui().field({ name: 'local', label: 'Local', cls: 'span-2' })}${ui().field({ name: 'atividade', label: 'Atividade', cls: 'span-2' })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Adicionar</button>` });
          m.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('form')); if (!(d.dias || []).length) return ui().toast('Marque ao menos um dia.', 'warn'); m.close(); await salvar({ escala: (p.escala || []).concat(d.dias.map(x => ({ id: ICM.util.uid('esc_'), dia: Number(x), inicio: d.inicio, fim: d.fim, local: d.local, atividade: d.atividade }))) }, 'Turno adicionado'); });
        });
        panel.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => salvar({ escala: p.escala.filter(x => x.id !== b.dataset.rm) }, 'Turno removido')));
      }
    };
    ui().tabs(el.querySelector('.tabs'), k => { cur = k; R[k](); });
    el.querySelector('[data-edit]').addEventListener('click', () => form(p));
    R[tab0]();
  };

  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  // Abre o arquivo anexado: imagem na tela; PDF em nova aba (com opção de baixar)
  async function verArquivo(id) {
    const a = await ICM.api.arquivos.get(id);
    if (!a) return ui().toast('Arquivo não encontrado.', 'danger');
    const bin = atob(a.data.split(',')[1]); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: a.mime }));
    const m = ui().modal({
      title: a.nome, size: 'wide',
      body: a.mime.startsWith('image/') ? `<img src="${esc(a.data)}" alt="${esc(a.nome)}" style="max-width:100%;border-radius:12px;margin:0 auto">` : `<div class="empty">${I('fileText', 48)}<div class="mt-4"><b>${esc(a.nome)}</b> · ${Math.round(a.tamanho / 1024)} KB</div><div class="small mt-2">Enviado por ${esc(a.enviado_por || '')} em ${esc(new Date(a.criado_em).toLocaleString('pt-BR'))}</div></div>`,
      foot: `<a class="btn" href="${url}" download="${esc(a.nome)}">${I('download', 16)} Baixar</a>${a.mime === 'application/pdf' ? `<button class="btn btn-primary" data-abrir>${I('eye', 16)} Abrir PDF</button>` : ''}<button class="btn" data-close>Fechar</button>`
    });
    const ab = m.$('[data-abrir]'); if (ab) ab.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60000);
  }

  ICM.pages._verArquivo = verArquivo;

  async function form(p) {
    const F = o => ui().field(o);
    const projetos = await ICM.api.projetos.list(); const users = await ICM.api.usuarios.list();
    const c = p.contrato || {};
    const m = ui().modal({
      title: p.id ? `Editar ${p.nome}` : 'Novo colaborador', size: 'wide',
      body: `<form class="grid grid-3">
        ${F({ name: 'nome', label: 'Nome completo', value: p.nome, required: true, cls: 'span-2' })}${F({ name: 'cpf', label: 'CPF', value: p.cpf })}
        ${F({ name: 'cargo', label: 'Cargo / função', value: p.cargo, required: true })}${F({ name: 'vinculo', label: 'Vínculo', type: 'select', value: p.vinculo, options: Object.entries(ICM.C.VINCULOS) })}${F({ name: 'nascimento', label: 'Nascimento', type: 'date', value: p.nascimento })}
        ${F({ name: 'telefone', label: 'Telefone', value: p.telefone })}${F({ name: 'email', label: 'E-mail', type: 'email', value: p.email })}${F({ name: 'usuario_id', label: 'Login no sistema', type: 'select', value: p.usuario_id, options: [['', 'Sem acesso'], ...users.map(u => [u.id, `${u.nome} (${u.email})`])] })}
        ${F({ name: 'admissao', label: 'Admissão', type: 'date', value: p.admissao || ICM.util.today() })}${F({ name: 'contrato.fim', label: 'Término do contrato', type: 'date', value: c.fim, hint: 'Em branco = indeterminado' })}${F({ name: 'contrato.carga_semanal', label: 'Carga semanal (h)', type: 'number', value: c.carga_semanal })}
        ${ICM.auth.can('equipe.salarios') ? F({ name: 'contrato.remuneracao', label: 'Remuneração mensal (R$)', type: 'number', value: c.remuneracao, attrs: 'step="0.01"' }) : ''}
        ${F({ name: 'status', label: 'Situação', type: 'select', value: p.status || 'ativo', options: [['ativo', 'Ativo'], ['desligado', 'Desligado']] })}
        <div class="field span-all"><span class="label">Atua nos projetos</span><div class="row wrap">${projetos.map(x => `<label class="check"><input type="checkbox" name="projeto_ids" value="${esc(x.id)}" data-multi ${(p.projeto_ids || []).includes(x.id) ? 'checked' : ''}> ${esc(x.nome)}</label>`).join('')}</div></div>
      </form>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const d = ICM.util.formData(m.$('form')); d.projeto_ids = d.projeto_ids || [];
      d.contrato = { ...c, inicio: d.admissao, ...d.contrato };
      const x = await ui().run(() => ICM.api.equipe.save(p.id ? { ...p, ...d } : d), 'Colaborador salvo');
      m.close(); location.hash = `#/equipe/${x.id}`; ICM.app.reload();
    }).catch(() => { }));
  }
})();
