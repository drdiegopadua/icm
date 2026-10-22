/* Utilitários de interface: escape, formatação, ícones, modal, toast */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const data = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)} ${MESES_C[+iso.slice(5, 7) - 1]}` : '—');
  const mesNome = (ym) => (ym ? `${MESES[+ym.slice(5, 7) - 1]} de ${ym.slice(0, 4)}` : '');
  const mesCurto = (ym) => `${MESES_C[+ym.slice(5, 7) - 1]}/${ym.slice(2, 4)}`;
  const diaSemana = (iso) => DIAS[new Date(iso + 'T12:00').getDay()];
  const idade = (nasc) => {
    if (!nasc) return null;
    const h = new Date(), n = new Date(nasc + 'T12:00');
    let i = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
    return i;
  };
  const moeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v)}%`);
  const iniciais = (nome) => String(nome || '?').split(/\s+/).filter((p) => p.length > 2 || p === p.toUpperCase()).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const CORES_AV = ['#f2a541', '#f0a27f', '#8fb2ff', '#7fd6b6', '#e7a0c0', '#f5c451', '#b9a7ff', '#86d0e8'];
  const corDe = (txt) => { let h = 0; for (const c of String(txt)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES_AV[h % CORES_AV.length]; };
  const avatar = (nome, cls = '') => `<span class="avatar ${cls}" style="background:${corDe(nome)}">${esc(iniciais(nome))}</span>`;
  const normaliza = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* Ícones (traço 1.8, estilo linear) */
  const P = {
    painel: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    alunos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.7c2 .7 3.2 2.5 3.5 5.3"/>',
    projetos: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    turmas: '<path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13"/><path d="M2 19h20M9 9h6M9 13h6"/>',
    eventos: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6"/>',
    equipe: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.7-3.8 3.5-6 7-6s6.3 2.2 7 6"/>',
    relatorios: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    usuario: '<circle cx="10" cy="8" r="4"/><path d="M3 20c.7-3.6 3.5-6 7-6 1.5 0 2.8.4 3.9 1.1"/><circle cx="18" cy="17" r="2.4"/><path d="M18 13.3v1.3M18 19.4v1.3M21.7 17h-1.3M15.6 17h-1.3"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
    van: '<path d="M3 16V8a2 2 0 0 1 2-2h10l4 4h1a1 1 0 0 1 1 1v5h-2"/><path d="M3 16h2m4 0h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M15 6v4h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clipe: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.4 3.4 0 0 1 4.8 4.8l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
    arquivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    saude: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/><path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9z" stroke-width="1.2"/>',
    social: '<path d="M7 11.5c-2 0-3.5 1.2-4 3.5M17 11.5c2 0 3.5 1.2 4 3.5"/><circle cx="7" cy="7.5" r="2.5"/><circle cx="17" cy="7.5" r="2.5"/><circle cx="12" cy="13" r="3"/><path d="M6.5 21c.5-2.6 2.8-4 5.5-4s5 1.4 5.5 4"/>',
    mente: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    livro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M19 19v2H6"/>',
    alerta: '<path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>',
    jornal: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    imprimir: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    seta: '<path d="M15 18 9 12l6-6"/>',
    setaD: '<path d="m9 18 6-6-6-6"/>',
    enviar: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    escola: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
    telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    restaurar: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    bola: '<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 0 1 4 9M3.5 9.5A14 14 0 0 1 12 12m0 0a14 14 0 0 0-6.5 8M12 12a14 14 0 0 0 8.3 4.5"/>',
    olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const icon = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[n] || ''}</svg>`;

  /* Modal */
  function modal({ titulo, corpo, rodape = '', tamanho = '', aoAbrir }) {
    const camada = $('#camada-modal');
    const wrap = document.createElement('div');
    wrap.className = 'fundo';
    wrap.innerHTML = `<div class="modal vidro ${tamanho}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="modal-cab"><h2>${esc(titulo)}</h2><button class="btn-icone" data-fechar aria-label="Fechar">${icon('fechar')}</button></div>
      <div class="modal-corpo">${corpo}</div>
      ${rodape ? `<div class="modal-rodape">${rodape}</div>` : ''}
    </div>`;
    camada.appendChild(wrap);
    const el = wrap.querySelector('.modal');
    const fechar = () => { wrap.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape' && camada.lastElementChild === wrap) fechar(); };
    document.addEventListener('keydown', tecla);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) fechar(); });
    $$('[data-fechar]', el).forEach((b) => b.addEventListener('click', fechar));
    const foco = el.querySelector('input:not([type=hidden]), select, textarea');
    if (foco) setTimeout(() => foco.focus(), 30);
    if (aoAbrir) aoAbrir(el, fechar);
    return { el, fechar };
  }

  function confirmar(msg, { ok = 'Confirmar', perigo = false } = {}) {
    return new Promise((res) => {
      const m = modal({
        titulo: 'Confirmar',
        tamanho: 'estreito',
        corpo: `<p>${esc(msg)}</p>`,
        rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn ${perigo ? 'perigo' : ''}" data-ok>${esc(ok)}</button>`,
      });
      m.el.querySelector('[data-ok]').onclick = () => { m.fechar(); res(true); };
      m.el.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => res(false)));
    });
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${icon('check')}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* Lê um formulário em objeto; nomes com ponto viram objetos aninhados (ex.: "responsavel.nome") */
  function lerForm(form) {
    const obj = {};
    const set = (caminho, v) => {
      const partes = caminho.split('.');
      let o = obj;
      partes.slice(0, -1).forEach((p) => { o[p] = o[p] || {}; o = o[p]; });
      o[partes[partes.length - 1]] = v;
    };
    $$('[name]', form).forEach((el) => {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') {
        if (el.dataset.lista !== undefined) {
          const atual = el.name.split('.').reduce((o, k) => (o ? o[k] : undefined), obj) || [];
          if (el.checked) atual.push(el.value);
          set(el.name, atual);
        } else set(el.name, el.checked);
      } else if (el.type === 'radio') {
        if (el.checked) set(el.name, el.value);
      } else if (el.type === 'number') set(el.name, el.value === '' ? null : Number(el.value));
      else set(el.name, el.value.trim());
    });
    return obj;
  }
  const arquivosDe = (input) => Array.from(input?.files || []).map((f) => ({ nome: f.name, tamanho: f.size, tipo: f.type }));
  const tamanhoArq = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  const sel = (opcoes, atual, vazio) =>
    (vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : '') +
    opcoes.map((o) => {
      const [v, r] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}" ${String(v) === String(atual ?? '') ? 'selected' : ''}>${esc(r)}</option>`;
    }).join('');

  const vazio = (txt, ic = 'lista') => `<div class="vazio-box">${icon(ic)}<div>${esc(txt)}</div></div>`;

  window.UI = { esc, $, $$, hojeISO, data, dataCurta, mesNome, mesCurto, diaSemana, idade, moeda, pct, iniciais, corDe, avatar, normaliza, icon, modal, confirmar, toast, lerForm, arquivosDe, tamanhoArq, sel, vazio, MESES, MESES_C };
})();
