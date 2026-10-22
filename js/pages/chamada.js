/* App do professor (celular): chamada rápida, funciona sem internet, leitura de carteirinha por QR Code */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const PREFIXO_QR = 'ICM-ALUNO:';

  // Instalação do app (PWA)
  let pedidoInstalacao = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalacao = e; document.dispatchEvent(new CustomEvent('icm:instalavel')); });

  ICM.pages.chamada = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Chamada (app do professor)']]);
    let data = query.get('d') || ICM.util.today();
    el.innerHTML = `<div class="page chamada-app">
      <div class="card mb-4"><div class="row between wrap">
        <div><h1 class="page-title" style="font-size:24px">Chamada</h1><div class="row small mt-2" data-net></div></div>
        <div class="row wrap"><button class="btn btn-sm" data-instalar hidden>${I('download', 14)} Instalar app no celular</button><button class="btn btn-sm" data-ajuda>${I('info', 14)} Como instalar</button></div>
      </div>
      <div class="row mt-4"><button class="btn btn-icon btn-sm" data-d="-1" aria-label="Dia anterior">${I('chevronLeft', 16)}</button><input type="date" class="input" data-data value="${data}" style="max-width:180px"><button class="btn btn-icon btn-sm" data-d="1" aria-label="Próximo dia">${I('chevronRight', 16)}</button><button class="btn btn-sm" data-hoje>Hoje</button></div></div>
      <div data-l></div></div>`;

    const net = () => { const f = ICM.api.offline.fila().length; const n = el.querySelector('[data-net]'); if (n) n.innerHTML = navigator.onLine ? `<span class="badge ok"><span class="dot"></span>Online</span>${f ? `<span class="badge warn">${f} chamada(s) a sincronizar</span>` : ''}` : `<span class="badge danger"><span class="dot"></span>Sem internet</span><span class="xs muted">As chamadas ficam salvas no aparelho e são enviadas quando a internet voltar.</span>`; };
    net(); ['online', 'offline'].forEach(ev => window.addEventListener(ev, net)); document.addEventListener('icm:fila', net);
    const bi = el.querySelector('[data-instalar]');
    const showInst = () => { if (pedidoInstalacao) bi.hidden = false; }; showInst(); document.addEventListener('icm:instalavel', showInst);
    bi.addEventListener('click', async () => { if (!pedidoInstalacao) return; pedidoInstalacao.prompt(); await pedidoInstalacao.userChoice; pedidoInstalacao = null; bi.hidden = true; });
    el.querySelector('[data-ajuda]').addEventListener('click', () => ui().modal({ title: 'Instalar o app no celular', size: 'sm', body: `<ol class="text-block" style="padding-left:18px"><li>Abra o sistema no <b>Chrome</b> do celular e entre com seu login.</li><li>Toque nos <b>três pontinhos ⋮</b> → <b>Adicionar à tela inicial</b> (ou "Instalar app").</li><li>Pronto: o ícone <b>ICM</b> aparece junto dos outros apps e abre direto na chamada.</li><li>No iPhone: Safari → botão <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</li></ol><p class="small muted mt-4">Depois de aberto uma vez com internet, o app funciona mesmo sem sinal.</p>` }));

    async function lista() {
      el.querySelector('[data-data]').value = data;
      const turmas = await ICM.api.turmas.list();
      const ds = ICM.util.parseD(data).getDay();
      const out = [];
      for (const t of turmas.filter(t => t.status !== 'encerrada')) {
        const aulas = (await ICM.api.aulas.list(t.id, data.slice(0, 7))).filter(a => a.data === data);
        if (aulas.length) aulas.forEach(a => out.push({ t, a }));
        else if ((t.dias || []).includes(ds)) out.push({ t, a: null });
      }
      el.querySelector('[data-l]').innerHTML = out.length ? `<div class="col stagger">${out.map(({ t, a }) => { const n = a ? Object.keys(a.presencas || {}).length : 0; return `<div class="card hoverable chamada-card" data-t="${esc(t.id)}" data-a="${esc(a ? a.id : '')}"><div class="row between"><div><b style="font-size:17px">${esc(t.nome)}</b><div class="small muted">${esc(t.inicio)}–${esc(t.fim)} · ${esc(t.local || '')}</div></div>${a && a.status === 'realizada' ? ui().badge(`Feita · ${n} marcados`, 'ok', true) : ui().badge('Fazer chamada', 'warn', true)}</div></div>`; }).join('')}</div>` : ui().empty(`Nenhuma aula sua em ${fmtDate(data)}`, 'calendar');
      el.querySelectorAll('.chamada-card').forEach(c => c.addEventListener('click', () => abrirChamada(c.dataset.t, c.dataset.a)));
    }
    el.querySelector('[data-data]').addEventListener('change', e => { data = e.target.value; lista(); });
    el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { data = ICM.util.addDays(data, +b.dataset.d); lista(); }));
    el.querySelector('[data-hoje]').addEventListener('click', () => { data = ICM.util.today(); lista(); });
    await lista();

    // ---------- Tela de chamada ----------
    async function abrirChamada(turmaId, aulaId) {
      const t = await ICM.api.turmas.get(turmaId);
      let a = aulaId ? await ICM.api.aulas.get(aulaId) : { turma_id: t.id, data, inicio: t.inicio, fim: t.fim, plano: {}, relatorio: {}, presencas: {}, fotos: [], status: 'planejada', professor_id: t.professor_id };
      const mats = (await ICM.api.turmas.alunos(t.id)).filter(m => m.entrada <= data && (!m.saida || m.saida > data));
      const pres = { ...(a.presencas || {}) };
      const ov = document.createElement('div'); ov.className = 'report-viewer chamada-full';
      ov.innerHTML = `<div class="report-toolbar"><button class="btn btn-sm" data-x>${I('arrowLeft', 16)} Voltar</button><div class="title truncate">${esc(t.nome)} · ${esc(fmtDate(data))}</div><span class="badge" data-cnt></span></div>
        <div class="report-scroll"><div style="max-width:720px;margin:0 auto">
          <div class="row wrap mb-4"><button class="btn btn-primary grow" data-qr>${I('camera', 18)} Ler carteirinhas (QR Code)</button><button class="btn" data-todos>${I('check', 16)} Todos presentes</button></div>
          <div class="xs muted mb-4">Toque no aluno para alternar: <b>Presente → Falta → Justificada</b>.</div>
          <div data-alunos></div>
          ${ui().field({ name: 'tema', label: 'Tema da aula (opcional)', value: (a.plano || {}).tema || '' })}
          <div class="mt-4">${ui().field({ name: 'relato', label: 'Relato rápido da aula (opcional)', type: 'textarea', rows: 3, value: (a.relatorio || {}).texto || '' })}</div>
          <button class="btn btn-primary btn-lg mt-6" style="width:100%" data-salvar>${I('check', 20)} Salvar chamada</button>
        </div></div>`;
      document.body.appendChild(ov); document.body.style.overflow = 'hidden';
      const fechar = () => { pararCamera(); ov.remove(); document.body.style.overflow = ''; lista(); };
      ov.querySelector('[data-x]').addEventListener('click', fechar);
      const CICLO = { undefined: 'P', P: 'F', F: 'J', J: undefined };
      const draw = () => {
        ov.querySelector('[data-alunos]').innerHTML = mats.map(m => { const v = pres[m.aluno_id]; return `<button class="ch-aluno ${v || ''}" data-al="${esc(m.aluno_id)}">${ICM.util.avatar(m.aluno.nome, m.aluno.foto, 'sm')}<span class="grow" style="text-align:left"><b>${esc(m.aluno.nome)}</b>${m.aluno.saude && m.aluno.saude.alergias ? `<br><span class="xs" style="color:var(--danger)">Alergia: ${esc(m.aluno.saude.alergias)}</span>` : ''}</span><span class="ch-v">${v === 'P' ? 'Presente' : v === 'F' ? 'Falta' : v === 'J' ? 'Justificada' : '—'}</span></button>`; }).join('') || ui().empty('Sem alunos ativos nesta data', 'users');
        ov.querySelectorAll('[data-al]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.al; const nv = CICLO[pres[id]]; if (nv) pres[id] = nv; else delete pres[id]; draw(); }));
        const p = Object.values(pres).filter(v => v === 'P').length; ov.querySelector('[data-cnt]').textContent = `${p}/${mats.length} presentes`;
      };
      draw();
      ov.querySelector('[data-todos]').addEventListener('click', () => { mats.forEach(m => { pres[m.aluno_id] = 'P'; }); draw(); });

      // --- Leitor de QR Code ---
      let stream = null, rodando = false;
      function pararCamera() { rodando = false; if (stream) stream.getTracks().forEach(tr => tr.stop()); stream = null; const s = ov.querySelector('.scanner'); if (s) s.remove(); }
      ov.querySelector('[data-qr]').addEventListener('click', async () => {
        try { await ICM.api._carregarScript('js/vendor/jsQR.js'); } catch (e) { return ui().toast('Leitor indisponível.', 'danger'); }
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
        catch (e) { return ui().toast('Não foi possível acessar a câmera. Permita o uso da câmera para este site.', 'danger', 5000); }
        const box = document.createElement('div'); box.className = 'scanner';
        box.innerHTML = `<video playsinline muted></video><div class="scan-frame"></div><div class="scan-info" data-info>Aponte para o QR Code da carteirinha</div><button class="btn" data-fim>${I('x', 16)} Encerrar leitura</button>`;
        ov.appendChild(box);
        const video = box.querySelector('video'); video.srcObject = stream; await video.play();
        const cv = document.createElement('canvas'); const ctx = cv.getContext('2d', { willReadFrequently: true });
        box.querySelector('[data-fim]').addEventListener('click', pararCamera);
        rodando = true; let ultimo = '', ultimoEm = 0;
        const loop = () => {
          if (!rodando) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            cv.width = video.videoWidth; cv.height = video.videoHeight; ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, cv.width, cv.height);
            const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data && (code.data !== ultimo || Date.now() - ultimoEm > 3000)) {
              ultimo = code.data; ultimoEm = Date.now();
              const info = box.querySelector('[data-info]');
              const mat = code.data.startsWith(PREFIXO_QR) ? code.data.slice(PREFIXO_QR.length) : '';
              const m = mats.find(x => x.aluno.matricula === mat);
              if (m) { pres[m.aluno_id] = 'P'; draw(); info.innerHTML = `✅ <b>${esc(m.aluno.nome)}</b> — presente`; info.className = 'scan-info ok'; if (navigator.vibrate) navigator.vibrate(80); }
              else { info.textContent = mat ? `Aluno ${mat} não é desta turma` : 'QR Code não reconhecido'; info.className = 'scan-info erro'; }
            }
          }
          requestAnimationFrame(loop);
        };
        loop();
      });

      ov.querySelector('[data-salvar]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const faltam = mats.length - Object.keys(pres).length;
        if (faltam && !(await ui().confirm({ title: 'Chamada incompleta', text: `${faltam} aluno(s) sem marcação. Marcar como falta e salvar?`, ok: 'Marcar falta e salvar' }))) return;
        mats.forEach(m => { if (!pres[m.aluno_id]) pres[m.aluno_id] = 'F'; });
        const payload = { ...a, presencas: pres, status: data <= ICM.util.today() ? 'realizada' : a.status, plano: { ...(a.plano || {}), tema: ov.querySelector('[name=tema]').value.trim() || (a.plano || {}).tema }, relatorio: { ...(a.relatorio || {}), texto: ov.querySelector('[name=relato]').value.trim() || (a.relatorio || {}).texto } };
        const r = await ui().run(() => ICM.api.aulas.save(payload));
        if (!navigator.onLine) ICM.api.offline.enfileirar({ tipo: 'chamada', aula_id: r.id, turma: t.nome, data });
        ui().toast(navigator.onLine ? 'Chamada salva!' : 'Chamada salva no aparelho — será enviada quando a internet voltar', 'ok', 4000);
        ICM.app.refreshAlerts(); fechar();
      }).catch(() => { }));
    }
  };

  // ---------- Carteirinhas com QR Code ----------
  ICM.pages._carteirinhas = async function (alunos) {
    const turmas = await ICM.api.raw('turmas'); const mats = await ICM.api.raw('matriculas');
    const card = a => { const ts = mats.filter(m => m.aluno_id === a.id && m.status === 'ativo').map(m => (turmas.find(t => t.id === m.turma_id) || {}).modalidade).filter(Boolean); return `<div class="carteirinha"><div class="ct-top">${ICM.logo(26)}<b>${esc(ICM.C.ORG.nome)}</b></div><div class="ct-body">${ICM.util.avatar(a.nome, a.foto)}<div class="grow"><div class="ct-nome">${esc(a.nome)}</div><div class="ct-mat">${esc(a.matricula)}</div><div class="ct-turma">${esc(ts.join(' · '))}</div></div><div class="ct-qr">${ICM.reports.qrSvg(PREFIXO_QR + a.matricula)}</div></div><div class="ct-foot">Carteirinha do aluno · válida ${new Date().getFullYear()}</div></div>`; };
    const v = document.createElement('div'); v.className = 'report-viewer';
    v.innerHTML = `<style>@page{size:A4;margin:10mm}</style><div class="report-toolbar"><button class="btn btn-sm" data-x>${I('arrowLeft', 16)} Voltar</button><div class="title">${alunos.length} carteirinha(s) — recorte e plastifique</div><button class="btn btn-sm btn-primary" data-pr>${I('printer', 16)} Imprimir</button><button class="btn btn-sm btn-icon" data-x2 aria-label="Fechar">${I('x', 18)}</button></div><div class="report-scroll"><div class="carteirinhas">${alunos.map(card).join('')}</div></div>`;
    document.body.appendChild(v); document.body.style.overflow = 'hidden';
    const close = () => { v.remove(); document.body.style.overflow = ''; };
    v.querySelector('[data-x]').addEventListener('click', close); v.querySelector('[data-x2]').addEventListener('click', close);
    v.querySelector('[data-pr]').addEventListener('click', () => window.print());
    await ICM.api.audit('gerar_relatorio', 'alunos', '', `${alunos.length} carteirinha(s) impressas`);
  };
})();
