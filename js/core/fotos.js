/* Enquadramento das fotos para os relatórios.
   A foto original não é cortada: guardamos foto.enq = { x, y, z } (ponto de foco em % e zoom)
   e os relatórios mostram a foto numa moldura 4:3 com esse enquadramento.
   - ICM.fotos.estilo(f): estilo da <img> dentro da moldura
   - ICM.fotos.ajustar(f): abre a moldura para arrastar/zoom; devolve o enq novo (ou null)
   - ICM.fotos.salvar(f, enq): grava o enquadramento na aula/evento de onde a foto veio
   - ICM.fotos.revisar(lista): tela "Enquadrar fotos do relatório" antes de gerar */
(function () {
  const I = (n, s) => ICM.icon(n, s);
  const esc = s => ICM.util.esc(s);
  const PROP = 4 / 3;   // mesma proporção das fotos nos relatórios (css/report.css .photos img)
  const extra = new Map();   // ajustes feitos agora (vale mesmo se não puder gravar na origem)
  const chave = f => f.id || f.src;
  const enqDe = f => extra.get(chave(f)) || f.enq || null;
  function estilo(f) {
    const e = enqDe(f); if (!e) return 'object-fit:cover;object-position:50% 50%';
    const z = Math.max(1, Math.min(4, +e.z || 1));
    return `object-fit:cover;object-position:${+e.x}% ${+e.y}%;transform:scale(${z});transform-origin:${+e.x}% ${+e.y}%`;
  }

  function ajustar(f) {
    return new Promise(res => {
      const e0 = enqDe(f) || { x: 50, y: 50, z: 1 };
      let e = { ...e0 }; let feito = false;
      const m = ICM.ui.modal({ title: 'Ajustar foto para o relatório', body: `
        <p class="small muted mb-2">A área dentro da moldura é a que sai impressa. Arraste a foto para posicionar e use o zoom.</p>
        <div class="fe-moldura" data-mold><img src="${esc(f.src)}" alt="" draggable="false" data-img></div>
        <div class="row mt-4" style="gap:10px">${I('search', 16)}<input type="range" min="1" max="3" step="0.05" value="${e.z}" data-zoom style="flex:1"><button type="button" class="btn btn-sm" data-centro>${I('refresh', 14)} Centralizar</button></div>
        <style>.fe-moldura{position:relative;width:100%;max-width:560px;margin:0 auto;aspect-ratio:4/3;overflow:hidden;border-radius:10px;background:#0f172a;cursor:grab;touch-action:none;box-shadow:0 0 0 3px var(--primary)}
        .fe-moldura:active{cursor:grabbing}.fe-moldura img{width:100%;height:100%;display:block;user-select:none;pointer-events:none}</style>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Usar este enquadramento</button>` });
      const img = m.$('[data-img]'), mold = m.$('[data-mold]'), zoom = m.$('[data-zoom]');
      const pintar = () => { img.style.cssText = `object-fit:cover;object-position:${e.x}% ${e.y}%;transform:scale(${e.z});transform-origin:${e.x}% ${e.y}%`; };
      pintar();
      let arr = null;
      mold.addEventListener('pointerdown', ev => { arr = { px: ev.clientX, py: ev.clientY, x: e.x, y: e.y }; mold.setPointerCapture(ev.pointerId); });
      mold.addEventListener('pointermove', ev => {
        if (!arr) return;
        const r = mold.getBoundingClientRect();
        // arrastar para a direita mostra mais da esquerda da foto (o foco anda para a esquerda)
        e.x = Math.max(0, Math.min(100, arr.x - (ev.clientX - arr.px) / r.width * 100 / e.z * 1.6));
        e.y = Math.max(0, Math.min(100, arr.y - (ev.clientY - arr.py) / r.height * 100 / e.z * 1.6));
        pintar();
      });
      ['pointerup', 'pointercancel'].forEach(t => mold.addEventListener(t, () => { arr = null; }));
      mold.addEventListener('wheel', ev => { ev.preventDefault(); e.z = Math.max(1, Math.min(3, e.z - ev.deltaY / 600)); zoom.value = e.z; pintar(); }, { passive: false });
      zoom.addEventListener('input', () => { e.z = +zoom.value; pintar(); });
      m.$('[data-centro]').addEventListener('click', () => { e = { x: 50, y: 50, z: 1 }; zoom.value = 1; pintar(); });
      m.$('[data-ok]').addEventListener('click', () => { feito = true; const r = { x: Math.round(e.x * 10) / 10, y: Math.round(e.y * 10) / 10, z: Math.round(e.z * 100) / 100 }; extra.set(chave(f), r); f.enq = r; m.close(); res(r); });
      const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!feito) res(null); } }); o.observe(document.body, { childList: true });
    });
  }

  // Grava o enquadramento no registro de origem (aulas ou eventos); sem permissão, vale só para agora
  async function salvar(f, enq) {
    const S = ICM.store; const k = chave(f);
    for (const col of ['aulas', 'eventos']) {
      const regs = await S.list(col, r => (r.fotos || []).some(x => chave(x) === k)).catch(() => []);
      for (const r of regs) {
        const fotos = (r.fotos || []).map(x => chave(x) === k ? { ...x, enq } : x);
        try { await S.update(col, r.id, { fotos }); return true; } catch (e) { return false; }
      }
    }
    return false;
  }

  // Tela antes de gerar o relatório: todas as fotos enquadradas, com "Ajustar" em cada uma
  function revisar(lista) {
    return new Promise(res => {
      const fotos = []; const vistos = new Set();
      lista.forEach(f => { const k = chave(f); if (f.src && !vistos.has(k)) { vistos.add(k); fotos.push(f); } });
      if (!fotos.length) return res(true);
      let ok = false;
      const m = ICM.ui.modal({ title: `Enquadrar as fotos do relatório (${fotos.length})`, size: 'wide', body: `
        <p class="small muted mb-4">Assim as fotos vão sair no relatório. Clique em <b>Ajustar</b> para reposicionar ou dar zoom; o ajuste fica guardado para os próximos relatórios.</p>
        <div class="fe-grid" data-g></div>
        <style>.fe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
        .fe-item{display:flex;flex-direction:column;gap:6px}.fe-item .fe-m{aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:#0f172a}
        .fe-item img{width:100%;height:100%;display:block}.fe-item small{font-size:11px;color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
        .fe-item .fe-ok{font-size:11px;color:var(--ok);font-weight:700}</style>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('fileText', 16)} Gerar relatório</button>` });
      const desenhar = () => {
        m.$('[data-g]').innerHTML = fotos.map((f, i) => `<div class="fe-item"><div class="fe-m"><img src="${esc(f.src)}" alt="" style="${estilo(f)}"></div><small title="${esc(f.legenda || '')}">${esc(f.legenda || 'Sem legenda')}</small>
          <div class="row between"><button type="button" class="btn btn-sm" data-aj="${i}">${I('edit', 13)} Ajustar</button>${enqDe(f) ? `<span class="fe-ok">✓ enquadrada</span>` : ''}</div></div>`).join('');
        m.$$('[data-aj]').forEach(b => b.addEventListener('click', async () => {
          const f = fotos[+b.dataset.aj]; const enq = await ajustar(f);
          if (enq) { desenhar(); salvar(f, enq).then(g => { if (!g) ICM.ui.toast('Ajuste usado neste relatório (sem permissão para guardar na aula/evento).', 'info', 4000); }); }
        }));
      };
      desenhar();
      m.$('[data-ok]').addEventListener('click', () => { ok = true; m.close(); res(true); });
      const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!ok) res(false); } }); o.observe(document.body, { childList: true });
    });
  }

  ICM.fotos = { estilo, ajustar, salvar, revisar, PROP };
})();
