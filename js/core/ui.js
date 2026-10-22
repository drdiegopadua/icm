/* Componentes de interface reutilizáveis */
(function () {
  window.ICM = window.ICM || {};
  const { esc } = ICM.util;
  const I = (n, s) => ICM.icon(n, s);

  // ---------- Toast ----------
  function toast(msg, type = 'info', ms = 3200) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const ic = { info: 'info', ok: 'check', warn: 'alert', danger: 'alert' }[type] || 'info';
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="ic">${I(ic, 18)}</div><div>${esc(msg)}</div>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  // ---------- Modal ----------
  function modal({ title, body, foot = '', size = '', onMount } = {}) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><div class="modal-title">${esc(title)}</div><button class="btn btn-icon btn-ghost" data-close aria-label="Fechar">${I('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    const close = () => {
      ov.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { ov.remove(); prevFocus && prevFocus.focus && prevFocus.focus(); }, 240);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    const first = ov.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
    setTimeout(() => first && first.focus(), 60);
    const m = { el: ov, close, $: s => ov.querySelector(s), $$: s => ov.querySelectorAll(s) };
    onMount && onMount(m);
    return m;
  }

  function confirm({ title = 'Confirmar', text = '', ok = 'Confirmar', danger = false } = {}) {
    return new Promise(res => {
      let done = false;
      const m = modal({
        title, size: 'sm',
        body: `<p class="text-block">${esc(text)}</p>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger solid' : 'btn-primary'}" data-ok>${esc(ok)}</button>`
      });
      m.$('[data-ok]').addEventListener('click', () => { done = true; res(true); m.close(); });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) res(false); } });
      obs.observe(document.body, { childList: true });
    });
  }

  // ---------- Botão com estado de carregamento ----------
  async function busy(btn, fn) {
    if (!btn) return fn();
    btn.classList.add('is-loading'); btn.disabled = true;
    try { return await fn(); }
    finally { btn.classList.remove('is-loading'); btn.disabled = false; }
  }

  // Executa ação mostrando erro amigável
  async function run(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; }
    catch (e) { console.error(e); toast(e.message || 'Erro inesperado.', 'danger', 4500); throw e; }
  }

  // ---------- Ripple global nos botões ----------
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .login-btn, .demo-user');
    if (!b) return;
    const r = b.getBoundingClientRect(); const s = Math.max(r.width, r.height);
    const sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });

  // ---------- Fragmentos ----------
  const badge = (txt, cls = '', dot = false) => `<span class="badge ${cls}">${dot ? '<span class="dot"></span>' : ''}${esc(txt)}</span>`;
  const areaChip = area => { const a = ICM.C.AREAS[area] || { nome: area, cor: '#64748b' }; return `<span class="area-chip" style="--c:${a.cor}">${esc(a.nome)}</span>`; };
  const statusAluno = s => { const x = ICM.C.STATUS_ALUNO[s] || { nome: s, cls: 'neutral' }; return badge(x.nome, x.cls, true); };
  const statusProjeto = s => { const x = ICM.C.STATUS_PROJETO[s] || { nome: s, cls: 'neutral' }; return badge(x.nome, x.cls, true); };
  const empty = (txt, icon = 'info') => `<div class="empty">${I(icon, 40)}<div>${esc(txt)}</div></div>`;
  const kv = (pairs) => `<div class="kv">${pairs.map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v ${v === '' || v == null ? 'empty-v' : ''}">${v === '' || v == null ? 'Não informado' : esc(v)}</div></div>`).join('')}</div>`;
  const nivelPill = (nivel, F) => nivel === 'danger' ? `<span class="alert-pill danger">${I('alert', 14)} ${F} faltas — desligamento</span>` : nivel === 'warn' ? `<span class="alert-pill warn">${I('alert', 14)} ${F} faltas — alerta</span>` : '';

  // Campos de formulário
  function field({ name, label, value = '', type = 'text', options, required, placeholder = '', hint = '', cls = '', rows = 4, attrs = '' }) {
    const id = 'f_' + name.replace(/\W/g, '_');
    let ctl;
    if (type === 'select') {
      ctl = `<select class="select" id="${id}" name="${esc(name)}" ${required ? 'required' : ''} ${attrs}>${(options || []).map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
    } else if (type === 'textarea') {
      ctl = `<textarea class="textarea" id="${id}" name="${esc(name)}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>${esc(value)}</textarea>`;
    } else if (type === 'toggle') {
      return `<div class="field ${cls}"><label class="toggle"><input type="checkbox" name="${esc(name)}" ${value ? 'checked' : ''} ${attrs}><span class="track"></span><span class="label">${esc(label)}</span></label></div>`;
    } else {
      ctl = `<input class="input" id="${id}" type="${type}" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs} autocomplete="off">`;
    }
    return `<div class="field ${cls}"><label for="${id}">${esc(label)}${required ? ' *' : ''}</label>${ctl}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  }

  // Abas: html de botões + lógica
  function tabs(el, onChange) {
    el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
      onChange(t.dataset.tab);
    }));
  }

  // Seletor de fotos (upload + compressão)
  function photoPicker(container, fotos, onChange, { editable = true } = {}) {
    function render() {
      container.innerHTML = `<div class="photo-grid">
        ${fotos.map((f, i) => `<div class="photo"><img src="${esc(f.src)}" alt="${esc(f.legenda || 'Foto')}" loading="lazy">${editable ? `<button class="rm" data-rm="${i}" aria-label="Remover foto">${I('x', 14)}</button>` : ''}</div>`).join('')}
        ${editable ? `<label class="photo-drop">${I('camera', 26)}<span>Adicionar fotos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label>` : ''}
      </div>${!fotos.length && !editable ? empty('Nenhuma foto registrada', 'image') : ''}`;
      container.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { fotos.splice(+b.dataset.rm, 1); onChange(fotos); render(); }));
      const inp = container.querySelector('input[type=file]');
      const drop = container.querySelector('.photo-drop');
      if (inp) {
        const add = async files => {
          for (const f of files) {
            try { const src = await ICM.util.compressImage(f); fotos.push({ id: ICM.util.uid('fot_'), src, legenda: f.name.replace(/\.\w+$/, '') }); }
            catch (e) { toast(e.message, 'danger'); }
          }
          onChange(fotos); render();
        };
        inp.addEventListener('change', () => add([...inp.files]));
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
        drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); add([...e.dataTransfer.files]); });
      }
    }
    render();
  }

  // Contador animado
  function countUp(root = document) {
    root.querySelectorAll('[data-count]').forEach(el => {
      const end = Number(el.dataset.count); const suf = el.dataset.suffix || ''; const t0 = performance.now(); const dur = 900;
      const step = t => { const p = Math.min(1, (t - t0) / dur); const v = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('pt-BR') + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  // Rosca SVG
  function donut(data, size = 150) {
    const total = data.reduce((s, d) => s + d.v, 0) || 1; const R = 54, C = 2 * Math.PI * R; let off = 0;
    const segs = data.map(d => { const len = d.v / total * C; const s = `<circle class="seg" cx="70" cy="70" r="${R}" fill="none" stroke="${d.c}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>`; off += len; return s; }).join('');
    return `<div class="donut-wrap"><svg class="donut" width="${size}" height="${size}" viewBox="0 0 140 140"><g transform="rotate(-90 70 70)"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-sunken)" stroke-width="18"/>${segs}</g><text x="70" y="68" text-anchor="middle" font-size="24" font-weight="900" fill="var(--text)">${total}</text><text x="70" y="86" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">MATRÍCULAS</text></svg>
      <div class="legend">${data.map(d => `<div><span class="sw" style="background:${d.c}"></span>${esc(d.l)} — <b>${d.v}</b></div>`).join('')}</div></div>`;
  }

  ICM.ui = { toast, modal, confirm, busy, run, badge, areaChip, statusAluno, statusProjeto, empty, kv, field, tabs, photoPicker, countUp, donut, nivelPill };
})();
