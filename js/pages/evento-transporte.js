/* Transporte do evento: veículos com mapa de assentos que se preenche conforme as pessoas
   são colocadas (alunos e equipe do evento, ou outra pessoa), e lista para imprimir.
   Fica em evento.veiculos = [{ id, tipo, nome, placa, motorista, lugares, ocupantes: [ {tipo,id,nome} | null ] }]
   (evento.transporte continua com saída/chegada usados nas autorizações de viagem). */
(function () {
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const ui = () => ICM.ui;
  const TIPOS = {
    carro: { nome: 'Carro', lugares: 4, frente: 1, filas: [3, 0], icon: 'home' },
    van: { nome: 'Van', lugares: 15, frente: 2, filas: [2, 1], icon: 'layers' },
    micro: { nome: 'Micro-ônibus', lugares: 26, frente: 1, filas: [2, 2], icon: 'layers' },
    onibus: { nome: 'Ônibus', lugares: 44, frente: 1, filas: [2, 2], icon: 'layers' }
  };
  const ini = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const curto = n => { const p = String(n || '').split(/\s+/).filter(Boolean); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : (p[0] || ''); };

  // Desenho dos assentos: 1ª fila = motorista + quem vai na frente; depois filas com corredor
  function mapa(v) {
    const T = TIPOS[v.tipo] || TIPOS.van;
    const [esq, dir] = T.filas, cols = esq + (dir ? 1 + dir : 0);
    const n = Math.max(1, Number(v.lugares) || T.lugares);
    const occ = v.ocupantes || [];
    const seat = i => {
      const o = occ[i];
      return `<button type="button" class="ts-seat ${o ? 'on ' + o.tipo : ''}" data-seat="${i}" title="${o ? esc(o.nome) + ' — clique para tirar' : 'Lugar ' + (i + 1) + ' livre'}">${o ? `<b>${esc(ini(o.nome))}</b><small>${esc(curto(o.nome))}</small>` : `<span>${i + 1}</span>`}</button>`;
    };
    let html = '', k = 0;
    // primeira fila: motorista à esquerda, passageiros da frente à direita
    const frente = Math.min(T.frente, n);
    html += `<div class="ts-row" style="grid-template-columns:repeat(${cols},44px)"><div class="ts-seat drv" title="Motorista${v.motorista ? ': ' + esc(v.motorista) : ''}">${I('user', 14)}<small>Motor.</small></div>`;
    const vaziosFrente = cols - 1 - frente;
    for (let j = 0; j < vaziosFrente; j++) html += '<div></div>';
    for (let j = 0; j < frente; j++) html += seat(k++);
    html += '</div>';
    while (k < n) {
      html += `<div class="ts-row" style="grid-template-columns:repeat(${cols},44px)">`;
      for (let j = 0; j < esq; j++) html += k < n ? seat(k++) : '<div></div>';
      if (dir) { html += '<div class="ts-aisle"></div>'; for (let j = 0; j < dir; j++) html += k < n ? seat(k++) : '<div></div>'; }
      html += '</div>';
    }
    return `<div class="ts-bus ${v.tipo}"><div class="ts-front"></div>${html}</div>`;
  }

  // Cartão "Transporte" na página do evento
  async function card(box, e, { alunos, equipe, canEdit, recarregar }) {
    const transp = (e.veiculos || []).map(v => ({ ...v, ocupantes: [...(v.ocupantes || [])] }));
    const salvar = async (msg) => { await ui().run(() => ICM.api.eventos.atualizar(e.id, { veiculos: transp }), msg); e.veiculos = transp; recarregar(); };
    const pessoas = [...alunos.map(a => ({ tipo: 'aluno', id: a.id, nome: a.nome })), ...equipe.map(u => ({ tipo: 'equipe', id: u.uid || u.id || u.nome, nome: u.nome }))];
    const sentados = new Set(transp.flatMap(v => (v.ocupantes || []).filter(Boolean).map(o => o.tipo + ':' + (o.id || o.nome))));
    const semLugar = pessoas.filter(p => !sentados.has(p.tipo + ':' + p.id));
    const totalLug = transp.reduce((s, v) => s + (Number(v.lugares) || 0), 0), totalOc = transp.reduce((s, v) => s + (v.ocupantes || []).filter(Boolean).length, 0);
    box.innerHTML = `<div class="card-head"><div><div class="section-title" style="margin:0">${I('flag', 18)} Transporte</div>
        <div class="card-sub">${transp.length ? `${transp.length} veículo(s) · ${totalOc} de ${totalLug} lugares ocupados` : 'Nenhum veículo'}${pessoas.length ? ` · ${semLugar.length ? `<b style="color:var(--warn)">${semLugar.length} participante(s) sem lugar</b>` : 'todos os participantes com lugar'}` : ''}</div></div>
        <div class="row wrap">${transp.length ? `<button class="btn btn-sm" data-imp>${I('printer', 14)} Lista do transporte</button>` : ''}${canEdit ? `<button class="btn btn-sm btn-primary" data-novo>${I('plus', 14)} Veículo</button>` : ''}</div></div>
      ${transp.length ? `<div class="ts-grid">${transp.map((v, vi) => { const oc = (v.ocupantes || []).filter(Boolean).length; return `<div class="ts-card">
        <div class="row between wrap mb-2"><div><b>${esc(v.nome || TIPOS[v.tipo].nome)}</b> <span class="xs muted">${esc(TIPOS[v.tipo].nome)}${v.placa ? ' · ' + esc(v.placa) : ''}${v.motorista ? ' · motorista: ' + esc(v.motorista) : ''}</span></div>
          <span class="badge ${oc >= v.lugares ? 'danger' : 'ok'}">${oc}/${v.lugares} lugares</span></div>
        ${mapa(v)}
        <div class="ts-leg xs muted"><span><i class="aluno"></i>Aluno</span><span><i class="equipe"></i>Equipe</span><span><i class="outro"></i>Outra pessoa</span><span><i></i>Livre</span></div>
        ${canEdit ? `<div class="row wrap mt-2" style="gap:6px">
          <select class="input" data-add="${vi}" style="width:auto;min-width:200px" ${oc >= v.lugares ? 'disabled' : ''}><option value="">+ Colocar pessoa…</option>${semLugar.map(p => `<option value="${p.tipo}:${esc(p.id)}">${p.tipo === 'equipe' ? '👤 ' : ''}${esc(p.nome)}</option>`).join('')}<option value="outro">Outra pessoa (acompanhante, pai, mãe…)</option></select>
          ${semLugar.length && oc < v.lugares ? `<button class="btn btn-sm" data-encher="${vi}">${I('users', 14)} Preencher</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-ed="${vi}" title="Editar veículo">${I('edit', 14)}</button>
          ${oc ? `<button class="btn btn-sm btn-ghost" data-esvaziar="${vi}" title="Tirar todos">${I('refresh', 14)}</button>` : ''}
        </div>` : ''}</div>`; }).join('')}</div>` : ui().empty(canEdit ? 'Adicione o carro, a van ou o ônibus que vai levar o grupo.' : 'Sem transporte cadastrado.', 'flag')}`;

    if (!canEdit) { const bi = box.querySelector('[data-imp]'); if (bi) bi.addEventListener('click', () => ICM.reports.generate('evento_transporte', { evento_id: e.id })); return; }
    const veiculoModal = (vi) => {
      const v = vi == null ? { tipo: 'van', lugares: TIPOS.van.lugares } : transp[vi];
      const m = ui().modal({ title: vi == null ? 'Novo veículo' : 'Editar veículo', size: 'sm', body: `<form class="col">
        <div class="field"><label>Tipo</label><div class="segmented" data-tipo>${Object.entries(TIPOS).map(([k, t]) => `<button type="button" data-v="${k}" class="${k === v.tipo ? 'active' : ''}">${t.nome}</button>`).join('')}</div></div>
        <div class="grid grid-2">${ui().field({ name: 'lugares', label: 'Lugares para passageiros', type: 'number', value: v.lugares, attrs: 'min="1" max="70"' })}${ui().field({ name: 'nome', label: 'Identificação', value: v.nome, placeholder: 'Ex.: Van do Instituto' })}</div>
        <div class="grid grid-2">${ui().field({ name: 'placa', label: 'Placa', value: v.placa })}${ui().field({ name: 'motorista', label: 'Motorista', value: v.motorista })}</div>
        <div data-prev></div></form>`,
        foot: `${vi != null ? `<button class="btn btn-danger" data-del style="margin-right:auto">${I('trash', 16)}</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
      let tipo = v.tipo;
      const prev = () => { const n = Number(m.$('[name=lugares]').value) || 1; m.$('[data-prev]').innerHTML = `<div class="ts-prev">${mapa({ tipo, lugares: Math.min(70, n), ocupantes: [] })}</div>`; };
      m.$$('[data-tipo] button').forEach(b => b.addEventListener('click', () => { m.$$('[data-tipo] button').forEach(x => x.classList.toggle('active', x === b)); tipo = b.dataset.v; m.$('[name=lugares]').value = TIPOS[tipo].lugares; prev(); }));
      m.$('[name=lugares]').addEventListener('input', prev); prev();
      m.$('[data-ok]').addEventListener('click', async () => {
        const d = ICM.util.formData(m.$('form')); const n = Math.max(1, Math.min(70, Number(d.lugares) || 1));
        const occ = vi == null ? [] : [...transp[vi].ocupantes];
        const tirados = occ.slice(n).filter(Boolean);
        const novo = { ...(vi == null ? { id: ICM.util.uid('vei_') } : transp[vi]), tipo, lugares: n, nome: d.nome.trim(), placa: d.placa.trim(), motorista: d.motorista.trim(), ocupantes: occ.slice(0, n) };
        if (vi == null) transp.push(novo); else transp[vi] = novo;
        m.close(); await salvar(tirados.length ? `Veículo salvo — ${tirados.length} pessoa(s) ficaram sem lugar` : 'Veículo salvo');
      });
      const del = m.$('[data-del]'); if (del) del.addEventListener('click', async () => { if (!(await ui().confirm({ title: 'Remover veículo', text: 'As pessoas deste veículo ficam sem lugar. Continuar?', ok: 'Remover', danger: true }))) return; transp.splice(vi, 1); m.close(); await salvar('Veículo removido'); });
    };
    const livre = v => { for (let i = 0; i < v.lugares; i++) if (!v.ocupantes[i]) return i; return -1; };
    box.querySelector('[data-novo]').addEventListener('click', () => veiculoModal(null));
    box.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => veiculoModal(+b.dataset.ed)));
    box.querySelectorAll('[data-add]').forEach(s => s.addEventListener('change', async () => {
      const v = transp[+s.dataset.add]; let p;
      if (s.value === 'outro') {
        const nome = await new Promise(res => { const m = ui().modal({ title: 'Outra pessoa no transporte', size: 'sm', body: '<input class="input" data-n placeholder="Nome completo">', foot: '<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Colocar</button>' }); let ok = false; m.$('[data-ok]').addEventListener('click', () => { ok = true; const n = m.$('[data-n]').value.trim(); m.close(); res(n); }); setTimeout(() => m.$('[data-n]').focus(), 60); const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!ok) res(''); } }); o.observe(document.body, { childList: true }); });
        if (!nome) { s.value = ''; return; }
        p = { tipo: 'outro', id: '', nome };
      } else { const [tp, ...rest] = s.value.split(':'); p = pessoas.find(x => x.tipo === tp && x.id === rest.join(':')); }
      if (!p) return;
      const i = livre(v); if (i < 0) { ui().toast('Veículo lotado.', 'warn'); return; }
      v.ocupantes[i] = { tipo: p.tipo, id: p.id, nome: p.nome };
      await salvar(`${p.nome.split(' ')[0]} no lugar ${i + 1}`);
    }));
    box.querySelectorAll('[data-encher]').forEach(b => b.addEventListener('click', async () => {
      const v = transp[+b.dataset.encher]; let n = 0;
      for (const p of semLugar) { const i = livre(v); if (i < 0) break; v.ocupantes[i] = { tipo: p.tipo, id: p.id, nome: p.nome }; n++; }
      await salvar(`${n} pessoa(s) colocada(s)`);
    }));
    box.querySelectorAll('[data-esvaziar]').forEach(b => b.addEventListener('click', async () => { const v = transp[+b.dataset.esvaziar]; v.ocupantes = []; await salvar('Veículo esvaziado'); }));
    box.querySelectorAll('.ts-seat.on').forEach(b => b.addEventListener('click', async () => {
      const vi = [...box.querySelectorAll('.ts-card')].indexOf(b.closest('.ts-card')); const v = transp[vi]; const o = v.ocupantes[+b.dataset.seat];
      v.ocupantes[+b.dataset.seat] = null; await salvar(`${o.nome.split(' ')[0]} saiu do lugar ${+b.dataset.seat + 1}`);
    }));
    const bi = box.querySelector('[data-imp]'); if (bi) bi.addEventListener('click', () => ICM.reports.generate('evento_transporte', { evento_id: e.id }));
  }

  const css = `<style>
    .ts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
    .ts-card{padding:14px;border-radius:16px;background:var(--surface-2);box-shadow:var(--sh-out-sm)}
    .ts-bus{position:relative;display:inline-flex;flex-direction:column;gap:6px;padding:14px 12px 12px;border:2px solid var(--line-2);border-radius:26px 26px 14px 14px;background:var(--surface)}
    .ts-bus.carro{border-radius:34px 34px 20px 20px}
    .ts-front{height:6px;border-radius:6px;background:var(--line-2);margin:-4px 18px 4px}
    .ts-row{display:grid;gap:6px}
    .ts-seat{width:44px;height:44px;border-radius:10px 10px 6px 6px;border:2px solid var(--line-2);background:var(--surface-2);display:grid;place-items:center;align-content:center;font-size:11px;color:var(--muted);cursor:pointer;padding:0;line-height:1.05}
    .ts-seat span{font-weight:700}
    .ts-seat b{font-size:12px;color:#fff}.ts-seat small{font-size:8.5px;color:#fff;opacity:.95;max-width:42px;overflow:hidden;white-space:nowrap}
    .ts-seat.on{border-color:transparent;background:var(--primary)}.ts-seat.on.equipe{background:#8b5cf6}.ts-seat.on.outro{background:#0891b2}
    .ts-seat.on:hover{filter:brightness(.9)}
    .ts-seat.drv{background:#1e293b;border-color:#1e293b;color:#fff;cursor:default}.ts-seat.drv small{font-size:8.5px;color:#fff}
    .ts-aisle{width:10px}
    .ts-leg{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}.ts-leg span{display:flex;align-items:center;gap:4px}
    .ts-leg i{width:12px;height:12px;border-radius:4px;border:2px solid var(--line-2);background:var(--surface-2)}
    .ts-leg i.aluno{background:var(--primary);border-color:var(--primary)}.ts-leg i.equipe{background:#8b5cf6;border-color:#8b5cf6}.ts-leg i.outro{background:#0891b2;border-color:#0891b2}
    .ts-prev{display:flex;justify-content:center;max-height:340px;overflow:auto;padding:6px}
  </style>`;

  // Lista do transporte (folha timbrada)
  ICM.reports.register('evento_transporte', {
    title: 'Lista do transporte', steps: ['Carregando o evento', 'Organizando veículos e lugares', 'Montando a lista'],
    async build({ evento_id }) {
      const { sec, head, meta, table, signs } = ICM.reports.h;
      const e = await ICM.api.eventos.get(evento_id);
      const alunos = await ICM.api.alunos.list({ status: '' }).catch(() => []);
      let html = head('Lista do transporte', `${e.titulo} — ${ICM.util.fmtDateLong(e.data)}${e.horario ? ', às ' + e.horario : ''}`);
      html += meta([['Destino / local', e.local || ''], ['Saída', [(e.transporte || {}).saida_local, (e.transporte || {}).saida_hora].filter(Boolean).join(' — ')], ['Veículos', String((e.veiculos || []).length)], ['Passageiros', String((e.veiculos || []).reduce((s, v) => s + (v.ocupantes || []).filter(Boolean).length, 0))]]);
      (e.veiculos || []).forEach(v => {
        const ls = (v.ocupantes || []).map((o, i) => o ? [i + 1, o.nome, { aluno: 'Aluno(a)', equipe: 'Equipe', outro: 'Acompanhante' }[o.tipo] || '', o.tipo === 'aluno' ? (alunos.find(a => a.id === o.id) || {}).matricula || '' : '', ''] : null).filter(Boolean);
        html += sec(`<h2>${ICM.util.esc(v.nome || TIPOS[v.tipo].nome)} — ${TIPOS[v.tipo].nome}${v.placa ? ' · placa ' + ICM.util.esc(v.placa) : ''}${v.motorista ? ' · motorista: ' + ICM.util.esc(v.motorista) : ''}</h2>${table([{ t: 'Lugar', c: 1 }, 'Nome', 'Participação', 'Matrícula', 'Embarque (✓)'], ls)}<p style="font-size:11px;color:#3a4669">${ls.length} de ${v.lugares} lugares ocupados.</p>`);
      });
      html += signs('Responsável pela viagem', 'Coordenação');
      return { title: `Transporte — ${e.titulo}`, html, file: `transporte-${e.id}` };
    }
  });

  ICM.transporte = { card, mapa, TIPOS, css };
})();
