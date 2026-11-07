/* Arrumar cadastros: pendências que afetam relatórios, mapa e LGPD.
   - Termos: quem ainda não assinou o termo LGPD e a autorização de imagem (enviar pelo WhatsApp ou marcar papel).
   - Bairros: junta grafias diferentes ("Joao Valim" / "João Valim") e mantém a lista oficial usada no cadastro.
   - Datas de matrícula: corrige a data da 1ª matrícula no Instituto (ex.: alunos vindos de planilha). */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const acentos = t => (String(t).match(/[^\x00-\x7f]/g) || []).length;
  // Grafia preferida: a que tem acento (forma correta); depois a mais usada; depois a com maiúsculas
  const melhor = nomes => Object.entries(nomes).sort((x, y) => acentos(y[0]) - acentos(x[0]) || y[1] - x[1] || (/[A-Z]/.test(y[0]) - /[A-Z]/.test(x[0])))[0][0];
  const pad = n => String(n).padStart(2, '0');
  function dataPlanilha(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${pad(m[2])}-${pad(m[1])}`; }
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + (+s) * 864e5); return d.toISOString().slice(0, 10); }
    return '';
  }

  let aba = 'termos';
  ICM.pages.cadastros = async function (el, params, query) {
    ICM.app.setCrumbs([['Alunos', '#/alunos'], ['Com pendências', '#/alunos?status=pendencias'], ['Resolver em lote']]);
    if (query && query.get('tab')) aba = query.get('tab');
    const alunos = await ICM.api.alunos.list({ status: '' });
    const ativos = alunos.filter(a => a.status === 'ativo');
    const semTermo = ativos.filter(a => !(a.autorizacoes || {}).lgpd || !(a.autorizacoes || {}).imagem).length;
    const grupos = gruposBairros(ativos.concat(alunos.filter(a => a.status !== 'ativo')));
    const variantes = grupos.filter(g => Object.keys(g.nomes).length > 1).length;
    const lotes = lotesDatas(alunos);

    el.innerHTML = `<div class="page cad">
      <div class="page-head"><div><h1 class="page-title">Resolver pendências em lote</h1><div class="page-sub">Pendências que deixam relatórios, mapa e documentos incompletos.</div></div></div>
      <div class="tabs mb-4">
        <button class="tab ${aba === 'termos' ? 'active' : ''}" data-tab="termos">${I('edit', 16)} Termos LGPD e imagem ${semTermo ? `<span class="badge warn">${semTermo}</span>` : ''}</button>
        <button class="tab ${aba === 'bairros' ? 'active' : ''}" data-tab="bairros">${I('pin', 16)} Bairros ${variantes ? `<span class="badge warn">${variantes}</span>` : ''}</button>
        <button class="tab ${aba === 'datas' ? 'active' : ''}" data-tab="datas">${I('calendar', 16)} Datas de matrícula ${lotes.length ? `<span class="badge warn">${lotes.reduce((s, l) => s + l.n, 0)}</span>` : ''}</button>
      </div>
      <div data-painel></div>
    </div>
    <style>
      .cad .tab .badge{margin-left:6px}
      .cad table input[type=date]{max-width:160px}
      .cad .var{display:flex;flex-wrap:wrap;gap:6px}
      .cad .var span{font-size:12px;padding:3px 8px;border-radius:8px;background:var(--surface-sunken)}
      .cad .lote{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:var(--surface-2);margin-bottom:8px}
    </style>`;
    const painel = el.querySelector('[data-painel]');
    const R = { termos: () => termos(painel, ativos, el), bairros: () => bairros(painel, alunos, el), datas: () => datas(painel, alunos, el) };
    ui().tabs(el.querySelector('.tabs'), k => { aba = k; R[k](); });
    await R[aba]();
  };
  const recarregar = el => ICM.pages.cadastros(el, {}, null);

  // ======================= TERMOS =======================
  async function termos(painel, ativos, el) {
    const pend = await ICM.api.assinaturas.list({ status: 'pendente' }).catch(() => []);
    const lista = ativos.map(a => {
      const au = a.autorizacoes || {};
      const falta = [!au.lgpd && 'lgpd', !au.imagem && 'imagem'].filter(Boolean);
      const aguardando = pend.filter(p => p.aluno_id === a.id && falta.includes(p.tipo));
      return { a, falta, aguardando };
    }).filter(x => x.falta.length).sort((x, y) => x.a.nome.localeCompare(y.a.nome));
    const podePedir = ICM.auth.can('assinaturas.solicitar');
    const semLgpd = lista.filter(x => x.falta.includes('lgpd')).length, semImg = lista.filter(x => x.falta.includes('imagem')).length;
    const nomeT = { lgpd: 'Termo LGPD', imagem: 'Uso de imagem' };
    painel.innerHTML = `<div class="card">
      <div class="card-head"><div><div class="card-title">Alunos ativos sem termos assinados</div>
        <div class="card-sub">${semLgpd} sem termo LGPD · ${semImg} sem autorização de imagem. O responsável assina pelo celular (nome, CPF e assinatura com o dedo) e o termo fica guardado na ficha.</div></div>
        ${podePedir && lista.length ? `<button class="btn btn-primary" data-todos>${I('edit', 18)} Pedir assinatura de todos (${lista.filter(x => x.aguardando.length < x.falta.length).length})</button>` : ''}</div>
      ${lista.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Falta assinar</th><th>Situação</th><th></th></tr></thead><tbody>
        ${lista.map((x, i) => `<tr><td><a href="#/alunos/${esc(x.a.id)}"><b>${esc(x.a.nome)}</b></a><div class="xs muted">${esc((x.a.responsavel || {}).nome || 'Responsável não informado')}</div></td><td class="small">${esc(x.a.matricula || '')}</td>
          <td>${x.falta.map(t => `<span class="badge ${t === 'lgpd' ? 'danger' : 'warn'}">${nomeT[t]}</span>`).join(' ')}</td>
          <td class="small">${x.aguardando.length ? `Pedido enviado em ${esc(fmtDate(x.aguardando[0].solicitado_em))}` : '<span class="muted">Ainda não pedido</span>'}</td>
          <td style="text-align:right;white-space:nowrap">${podePedir ? `<button class="btn btn-sm btn-wa" data-pedir="${i}" ${!(x.a.responsavel || {}).telefone ? 'disabled title="Sem telefone do responsável"' : ''}>${ICM.waIcon ? ICM.waIcon(15) : ''} ${x.aguardando.length ? 'Reenviar' : 'Pedir assinatura'}</button>` : ''}
            <button class="btn btn-sm" data-papel="${i}" title="O responsável assinou o termo em papel">${I('check', 14)} Assinado em papel</button></td></tr>`).join('')}
      </tbody></table></div>` : ui().empty('Todos os alunos ativos têm os termos assinados. 🎉', 'userCheck')}
    </div>`;
    const linkPortal = `${location.origin}${location.pathname}#/portal`;
    painel.querySelectorAll('[data-pedir]').forEach(b => b.addEventListener('click', async () => {
      const x = lista[+b.dataset.pedir];
      try {
        await ICM.api.assinaturas.solicitar(x.a.id, x.falta);
        const item = await ICM.api.avisos.montar('assinatura', x.a, { link: linkPortal, key: `assin:${x.a.id}:${x.falta.join('+')}` });
        await ICM.wa.abrir(item);
        termos(painel, ativos, el);
      } catch (e) { ui().toast(e.message, 'danger'); }
    }));
    painel.querySelectorAll('[data-papel]').forEach(b => b.addEventListener('click', async () => {
      const x = lista[+b.dataset.papel];
      if (!(await ui().confirm({ title: 'Termos assinados em papel', text: `Confirmar que o responsável por ${x.a.nome} assinou ${x.falta.map(t => nomeT[t]).join(' e ')} em papel? Guarde a via assinada na pasta do aluno (ou anexe na ficha).`, ok: 'Confirmar' }))) return;
      const aut = { data_termo: ICM.util.today(), termo_papel: true }; x.falta.forEach(t => { aut[t] = true; });
      await ui().run(() => ICM.api.alunos.corrigir(x.a.id, { autorizacoes: aut }), 'Marcado como assinado');
      x.a.autorizacoes = { ...(x.a.autorizacoes || {}), ...aut }; recarregar(el);
    }));
    const bt = painel.querySelector('[data-todos]');
    if (bt) bt.addEventListener('click', async () => {
      const alvo = lista.filter(x => x.aguardando.length < x.falta.length);
      if (!(await ui().confirm({ title: 'Pedir assinatura de todos', text: `Criar o pedido de assinatura para ${alvo.length} aluno(s)? As mensagens prontas aparecem em Comunidade → Avisos e na Rotina do dia, para enviar pelo WhatsApp.`, ok: 'Criar pedidos' }))) return;
      await ui().run(async () => { for (const x of alvo) await ICM.api.assinaturas.solicitar(x.a.id, x.falta); }, `${alvo.length} pedido(s) criados`);
      termos(painel, ativos, el);
    });
  }

  // ======================= BAIRROS =======================
  function gruposBairros(alunos) {
    const g = {};
    alunos.forEach(a => { const b = String((a.endereco || {}).bairro || '').trim(); if (!b) return; const k = norm(b); (g[k] = g[k] || { k, n: 0, nomes: {}, ids: [] }); g[k].n++; g[k].nomes[b] = (g[k].nomes[b] || 0) + 1; g[k].ids.push(a.id); });
    return Object.values(g).map(x => ({ ...x, nome: melhor(x.nomes) })).sort((x, y) => y.n - x.n);
  }
  async function bairros(painel, alunos, el) {
    const grupos = gruposBairros(alunos);
    const oficial = await ICM.api.alunos.bairros();
    const ofN = new Set(oficial.map(norm));
    const podeLista = ICM.auth.can('importar.dados');
    const semBairro = alunos.filter(a => a.status === 'ativo' && !String((a.endereco || {}).bairro || '').trim()).length;
    const comVar = grupos.filter(g => Object.keys(g.nomes).length > 1 || (ofN.has(g.k) && !g.nomes[oficial.find(o => norm(o) === g.k)]));
    painel.innerHTML = `<div class="card mb-4">
      <div class="card-head"><div><div class="card-title">Bairros dos alunos</div>
        <div class="card-sub">${grupos.length} bairro(s) · ${comVar.length} com grafias diferentes${semBairro ? ` · ${semBairro} aluno(s) ativo(s) sem bairro` : ''}. Para juntar dois bairros com nomes diferentes (ex.: "Campo 20" e "Campo Vinte"), marque os dois e use "Juntar".</div></div>
        <div class="row wrap">${comVar.length ? `<button class="btn btn-primary" data-auto>${I('check', 18)} Padronizar grafias (${comVar.length})</button>` : ''}</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th style="width:34px"></th><th>Bairro</th><th>Alunos</th><th>Grafias encontradas</th><th>Lista oficial</th></tr></thead><tbody>
        ${grupos.map((g, i) => { const nomeOf = oficial.find(o => norm(o) === g.k); const alvo = nomeOf || g.nome; return `<tr><td><input type="checkbox" data-sel="${i}"></td><td><b>${esc(alvo)}</b></td><td>${g.n}</td>
          <td><div class="var">${Object.entries(g.nomes).map(([n, c]) => `<span>${esc(n)} (${c})</span>`).join('')}</div></td><td>${ofN.has(g.k) ? '<span class="badge ok">Na lista</span>' : '<span class="badge neutral">Fora da lista</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="row wrap mt-4"><button class="btn" data-juntar>${I('layers', 16)} Juntar selecionados em…</button></div>
    </div>
    <div class="card"><div class="card-head"><div><div class="card-title">Lista oficial de bairros (${oficial.length})</div><div class="card-sub">Aparece como sugestão ao digitar o bairro na ficha do aluno. Quem digitar "joao valim" recebe "João Valim" automaticamente.</div></div>
      ${podeLista ? `<button class="btn" data-lista>${I('refresh', 16)} ${oficial.length ? 'Atualizar com os bairros acima' : 'Criar lista com os bairros acima'}</button>` : ''}</div>
      ${oficial.length ? `<div class="var">${oficial.map(o => `<span>${esc(o)}</span>`).join('')}</div>` : '<p class="small muted">Ainda não há lista oficial.' + (podeLista ? ' Padronize as grafias e clique em "Criar lista".' : ' Peça à coordenação para criar.') + '</p>'}
      ${podeLista ? `<div class="row mt-4"><input class="input" data-novo placeholder="Adicionar bairro à lista (ex.: Vila Nova)" style="max-width:320px"><button class="btn" data-add>${I('plus', 16)} Adicionar</button></div>` : ''}
    </div>`;

    const aplicar = async (alvos, nome) => {
      const ids = alvos.flatMap(g => g.ids.filter(id => { const a = alunos.find(x => x.id === id); return String((a.endereco || {}).bairro || '').trim() !== nome; }));
      if (!ids.length) return 0;
      await ui().run(async () => { for (const id of ids) { await ICM.api.alunos.corrigir(id, { bairro: nome }); const a = alunos.find(x => x.id === id); a.endereco = { ...(a.endereco || {}), bairro: nome }; } }, `${ids.length} ficha(s) atualizada(s)`);
      return ids.length;
    };
    const bAuto = painel.querySelector('[data-auto]');
    if (bAuto) bAuto.addEventListener('click', async () => {
      const txt = comVar.map(g => `${Object.keys(g.nomes).filter(n => n !== (oficial.find(o => norm(o) === g.k) || g.nome)).join(', ')} → ${oficial.find(o => norm(o) === g.k) || g.nome}`).join('; ');
      if (!(await ui().confirm({ title: 'Padronizar grafias', text: `As fichas serão corrigidas assim:\n${txt}`, ok: 'Padronizar' }))) return;
      for (const g of comVar) await aplicar([g], oficial.find(o => norm(o) === g.k) || g.nome);
      recarregar(el);
    });
    painel.querySelector('[data-juntar]').addEventListener('click', async () => {
      const sel = [...painel.querySelectorAll('[data-sel]:checked')].map(c => grupos[+c.dataset.sel]);
      if (sel.length < 2) { ui().toast('Marque pelo menos dois bairros para juntar.', 'warn'); return; }
      const m = ui().modal({ title: 'Juntar bairros', size: 'sm', body: `<p class="small muted mb-4">${sel.map(g => esc(g.nome)).join(', ')} — ${sel.reduce((s, g) => s + g.n, 0)} aluno(s). Qual nome fica?</p>
        <div class="col">${sel.map((g, i) => `<label class="row"><input type="radio" name="alvo" value="${i}" ${i === 0 ? 'checked' : ''}> ${esc(g.nome)}</label>`).join('')}<label class="row"><input type="radio" name="alvo" value="outro"> Outro nome: <input class="input" data-outro style="max-width:220px"></label></div>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Juntar</button>` });
      m.$('[data-ok]').addEventListener('click', async () => {
        const v = m.$('input[name=alvo]:checked').value; const nome = v === 'outro' ? m.$('[data-outro]').value.trim() : sel[+v].nome;
        if (!nome) { ui().toast('Digite o nome do bairro.', 'warn'); return; }
        m.close(); await aplicar(sel, nome); recarregar(el);
      });
    });
    const bLista = painel.querySelector('[data-lista]');
    if (bLista) bLista.addEventListener('click', async () => {
      const nova = [...new Set([...oficial, ...gruposBairros(alunos).map(g => oficial.find(o => norm(o) === g.k) || g.nome)])];
      await ui().run(() => ICM.api.alunos.salvarBairros(nova), 'Lista oficial salva'); bairros(painel, alunos, el);
    });
    const bAdd = painel.querySelector('[data-add]');
    if (bAdd) bAdd.addEventListener('click', async () => {
      const v = painel.querySelector('[data-novo]').value.trim(); if (!v) return;
      if (ofN.has(norm(v))) { ui().toast('Esse bairro já está na lista.', 'warn'); return; }
      await ui().run(() => ICM.api.alunos.salvarBairros([...oficial, v]), 'Bairro adicionado'); bairros(painel, alunos, el);
    });
  }

  // ======================= DATAS DE MATRÍCULA =======================
  // Dias com muitas matrículas de uma vez = provável data da importação da planilha
  function lotesDatas(alunos) {
    const por = {}; alunos.forEach(a => { if (a.data_matricula) (por[a.data_matricula] = por[a.data_matricula] || []).push(a); });
    return Object.entries(por).filter(([, l]) => l.length >= 15).map(([d, l]) => ({ d, n: l.length, ids: l.map(a => a.id) })).sort((x, y) => y.n - x.n);
  }
  async function datas(painel, alunos, el) {
    const lotes = lotesDatas(alunos);
    const desconhecidas = alunos.filter(a => !a.data_matricula).length;
    let filtro = lotes.length ? 'lotes' : 'todos';
    const desenhar = () => {
      const ids = new Set(lotes.flatMap(l => l.ids));
      const lista = alunos.filter(a => filtro === 'todos' || (filtro === 'lotes' ? ids.has(a.id) : !a.data_matricula)).sort((x, y) => x.nome.localeCompare(y.nome));
      painel.innerHTML = `<div class="card mb-4">
        <div class="card-head"><div><div class="card-title">Data da 1ª matrícula no Instituto</div>
          <div class="card-sub">É a data em que o aluno entrou no Instituto pela primeira vez. Ela aparece na ficha ("No Instituto desde"), conta os "novos" do painel e entra nos relatórios.</div></div></div>
        ${lotes.length ? lotes.map(l => `<div class="lote">${I('alert', 18)}<div class="grow"><b>${l.n} alunos com a data ${esc(fmtDate(l.d))}</b><div class="xs muted">Muitos alunos no mesmo dia — provavelmente a data em que a planilha foi importada, não a matrícula real.</div></div>
          <button class="btn btn-sm" data-desc="${esc(l.d)}">Marcar como "data não informada"</button></div>`).join('') : '<p class="small muted">Nenhum lote suspeito de datas iguais. 👍</p>'}
        ${desconhecidas ? `<p class="small muted mt-2">${desconhecidas} aluno(s) com a data não informada.</p>` : ''}
      </div>
      <div class="card mb-4"><div class="card-head"><div><div class="card-title">${I('upload', 18)} Corrigir pela planilha</div>
        <div class="card-sub">Se você tem as datas reais numa planilha (Excel ou CSV), envie com as colunas <b>matricula</b> (ou <b>nome</b>) e <b>data_primeira_matricula</b>. O sistema mostra o que vai mudar antes de gravar.</div></div>
        <div class="row wrap"><button class="btn" data-modelo>${I('download', 16)} Baixar modelo</button><label class="btn btn-primary">${I('upload', 16)} Enviar planilha<input type="file" accept=".xlsx,.xls,.csv" hidden data-arq></label></div></div>
        <div data-prev></div></div>
      <div class="card"><div class="card-head"><div><div class="card-title">Corrigir uma a uma</div><div class="card-sub">Mude a data e clique em Salvar alterações.</div></div>
        <div class="segmented" data-filtro>${[['lotes', 'Datas suspeitas'], ['vazias', 'Sem data'], ['todos', 'Todos']].map(([k, t]) => `<button data-v="${k}" class="${k === filtro ? 'active' : ''}">${t}</button>`).join('')}</div></div>
        ${lista.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Nascimento</th><th>1ª matrícula no Instituto</th></tr></thead><tbody>
          ${lista.slice(0, 300).map(a => `<tr><td><a href="#/alunos/${esc(a.id)}">${esc(a.nome)}</a></td><td class="small">${esc(a.matricula || '')}</td><td class="small">${esc(fmtDate(a.nascimento))}</td><td><input class="input" type="date" data-dt="${esc(a.id)}" value="${esc(a.data_matricula || '')}" max="${ICM.util.today()}"></td></tr>`).join('')}
        </tbody></table></div>${lista.length > 300 ? `<p class="xs muted mt-2">Mostrando 300 de ${lista.length}. Use a planilha para corrigir muitos de uma vez.</p>` : ''}
        <div class="row end mt-4"><button class="btn btn-primary" data-salvar>${I('check', 18)} Salvar alterações</button></div>` : ui().empty('Nada aqui.', 'userCheck')}
      </div>`;
      painel.querySelectorAll('[data-filtro] button').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.v; desenhar(); }));
      painel.querySelectorAll('[data-desc]').forEach(b => b.addEventListener('click', async () => {
        const l = lotes.find(x => x.d === b.dataset.desc);
        if (!(await ui().confirm({ title: 'Data não informada', text: `Os ${l.n} alunos com a data ${fmtDate(l.d)} ficarão com a 1ª matrícula "não informada" e deixam de contar como novos no painel. Depois você pode preencher as datas reais (uma a uma ou pela planilha).`, ok: 'Confirmar' }))) return;
        await ui().run(async () => { for (const id of l.ids) await ICM.api.alunos.corrigir(id, { data_matricula: '' }); }, `${l.n} aluno(s) atualizados`);
        recarregar(el);
      }));
      const bs = painel.querySelector('[data-salvar]');
      if (bs) bs.addEventListener('click', async () => {
        const mud = [...painel.querySelectorAll('[data-dt]')].map(i => ({ a: alunos.find(x => x.id === i.dataset.dt), v: i.value })).filter(x => x.a && (x.a.data_matricula || '') !== x.v);
        if (!mud.length) { ui().toast('Nenhuma data foi alterada.', 'info'); return; }
        await ui().run(async () => { for (const x of mud) { await ICM.api.alunos.corrigir(x.a.id, { data_matricula: x.v }); x.a.data_matricula = x.v; } }, `${mud.length} data(s) salva(s)`);
        recarregar(el);
      });
      painel.querySelector('[data-modelo]').addEventListener('click', async () => {
        await ICM.api._carregarScript('js/vendor/xlsx.full.min.js'); const X = window.XLSX;
        const ws = X.utils.aoa_to_sheet([['matricula', 'nome', 'data_primeira_matricula'], ...alunos.map(a => [a.matricula || '', a.nome, a.data_matricula && !lotes.some(l => l.d === a.data_matricula) ? fmtDate(a.data_matricula) : ''])]);
        ws['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 24 }];
        const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Datas'); X.writeFile(wb, 'datas-primeira-matricula.xlsx');
      });
      painel.querySelector('[data-arq]').addEventListener('change', e => lerPlanilha(e.target.files[0], painel.querySelector('[data-prev]'), alunos, el));
    };
    desenhar();
  }

  async function lerPlanilha(arq, box, alunos, el) {
    if (!arq) return;
    try {
      await ICM.api._carregarScript('js/vendor/xlsx.full.min.js'); const X = window.XLSX;
      const wb = X.read(await arq.arrayBuffer(), { type: 'array', cellDates: true });
      const linhas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const col = (l, ...nomes) => { const k = Object.keys(l).find(c => nomes.includes(norm(c).replace(/[^a-z0-9]+/g, '_'))); return k ? l[k] : ''; };
      const res = linhas.map((l, i) => {
        const mat = String(col(l, 'matricula', 'n_matricula', 'numero_matricula')).trim(), nome = String(col(l, 'nome', 'aluno', 'nome_do_aluno')).trim();
        const d = dataPlanilha(col(l, 'data_primeira_matricula', 'data_matricula', 'primeira_matricula', 'data'));
        const a = (mat && alunos.find(x => norm(x.matricula) === norm(mat))) || (nome && alunos.filter(x => norm(x.nome) === norm(nome)).length === 1 && alunos.find(x => norm(x.nome) === norm(nome)));
        return { linha: i + 2, mat, nome, d, a };
      });
      const ok = res.filter(r => r.a && r.d && r.d !== r.a.data_matricula);
      const semAluno = res.filter(r => !r.a && (r.mat || r.nome)), semData = res.filter(r => r.a && !r.d);
      box.innerHTML = `<div class="mt-4"><b>${ok.length} data(s) para atualizar</b>${semAluno.length ? ` · <span style="color:var(--danger)">${semAluno.length} linha(s) sem aluno encontrado</span>` : ''}${semData.length ? ` · ${semData.length} sem data` : ''}
        ${ok.length ? `<div class="table-wrap mt-2" style="max-height:300px;overflow:auto"><table class="table"><thead><tr><th>Aluno</th><th>Data atual</th><th>Nova data</th></tr></thead><tbody>${ok.map(r => `<tr><td>${esc(r.a.nome)}</td><td>${esc(fmtDate(r.a.data_matricula) || '—')}</td><td><b>${esc(fmtDate(r.d))}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${semAluno.length ? `<div class="xs muted mt-2">Não encontrados (linha): ${semAluno.slice(0, 20).map(r => `${r.linha}: ${esc(r.mat || r.nome)}`).join(' · ')}${semAluno.length > 20 ? '…' : ''}</div>` : ''}
        ${ok.length ? `<div class="row end mt-4"><button class="btn btn-primary" data-aplicar>${I('check', 18)} Gravar ${ok.length} data(s)</button></div>` : ''}</div>`;
      const b = box.querySelector('[data-aplicar]');
      if (b) b.addEventListener('click', async () => {
        await ui().run(async () => { for (const r of ok) await ICM.api.alunos.corrigir(r.a.id, { data_matricula: r.d }); }, `${ok.length} data(s) gravada(s)`);
        recarregar(el);
      });
    } catch (e) { box.innerHTML = `<p class="small" style="color:var(--danger)">Não consegui ler a planilha: ${esc(e.message)}</p>`; }
  }
})();
