/* Utilitários gerais */
(function () {
  window.ICM = window.ICM || {};

  // Escapa HTML — TODO texto vindo de dados passa por aqui (proteção contra XSS)
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefix = '') {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return prefix + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  // Datas no formato ISO 'AAAA-MM-DD' sem fuso
  function parseD(s) { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function today() { return iso(new Date()); }
  function fmtDate(s) { const d = parseD(s); return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—'; }
  function fmtDateLong(s) { const d = parseD(s); return d ? `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` : '—'; }
  function fmtDateShort(s) { const d = parseD(s); return d ? `${String(d.getDate()).padStart(2, '0')} ${MESES_C[d.getMonth()]}` : '—'; }
  function fmtMonth(ym) { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} de ${y}`; }
  function age(s) { const d = parseD(s); if (!d) return null; const n = new Date(); let a = n.getFullYear() - d.getFullYear(); const m = n.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--; return a; }
  function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); }
  function money(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function num(v, dec = 0) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function initials(n) { return String(n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(); }
  function hoursBetween(a, b) { if (!a || !b) return 0; const [h1, m1] = a.split(':').map(Number); const [h2, m2] = b.split(':').map(Number); return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60); }

  // Cor estável a partir de texto (avatares)
  const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#4f46e5', '#c026d3'];
  function colorFor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }

  function avatar(nome, foto, cls = '') {
    return `<div class="avatar ${cls}" style="--c:${colorFor(nome)}">${foto ? `<img src="${esc(foto)}" alt="">` : esc(initials(nome))}</div>`;
  }

  function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Lê um formulário em objeto, aceitando nomes aninhados: "saude.alergias"
  function formData(form) {
    const out = {};
    form.querySelectorAll('[name]').forEach(el => {
      if (el.disabled) return;
      let v;
      if (el.type === 'checkbox') {
        if (el.dataset.multi !== undefined) { const path = el.name; const arr = getPath(out, path) || []; if (el.checked) arr.push(el.value); setPath(out, path, arr); return; }
        v = el.checked;
      } else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
      else if (el.type === 'number') v = el.value === '' ? null : Number(el.value);
      else v = el.value.trim();
      setPath(out, el.name, v);
    });
    return out;
  }
  function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
  function setPath(o, p, v) { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach(k => { if (typeof c[k] !== 'object' || c[k] === null) c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }

  // Reduz imagem antes de salvar (economiza espaço, remove metadados EXIF como GPS)
  function compressImage(file, max = 1280, quality = .8) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Formato não permitido. Use JPG, PNG ou WEBP.'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('Arquivo acima de 15 MB.'));
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.src = r.result;
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const c of text) h = (h * 33 + c.charCodeAt(0)) >>> 0; return 'x' + h.toString(16);
  }

  // Validação de CPF
  function cpfValido(cpf) {
    const c = String(cpf || '').replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
    let d = (s * 10) % 11 % 10; if (d !== +c[9]) return false;
    s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
    d = (s * 10) % 11 % 10; return d === +c[10];
  }
  function maskCPF(cpf) { const c = String(cpf || '').replace(/\D/g, ''); return c.length === 11 ? `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**` : '—'; }

  ICM.util = {
    esc, uid, parseD, iso, today, fmtDate, fmtDateLong, fmtDateShort, fmtMonth, age, addDays, money, num, pct,
    initials, hoursBetween, colorFor, avatar, debounce, sleep, formData, getPath, setPath, compressImage, sha256,
    cpfValido, maskCPF, MESES, MESES_C, DIAS, DIAS_C
  };
})();
