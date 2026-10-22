/* Cenário de fundo: montanhas ao entardecer, pinheiros dourados e lago (SVG gerado) */
(function () {
  const W = 1600, H = 900;

  function aleatorio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Cumeada por deslocamento do ponto médio; devolve pontos [x,y] */
  function cumeada(base, amp, aspereza, semente, picos = []) {
    const r = aleatorio(semente);
    const n = 128;
    const ys = new Array(n + 1).fill(0);
    ys[0] = base - r() * amp * 0.4;
    ys[n] = base - r() * amp * 0.4;
    let passo = n, escala = amp;
    while (passo > 1) {
      const meio = passo / 2;
      for (let i = meio; i < n; i += passo) ys[i] = (ys[i - meio] + ys[i + meio]) / 2 - (r() - 0.35) * escala;
      escala *= aspereza;
      passo = meio;
    }
    // picos marcantes (pontões)
    picos.forEach(([px, alt, larg]) => {
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W;
        const d = Math.abs(x - px) / larg;
        if (d < 1) ys[i] -= alt * Math.pow(1 - d, 1.6);
      }
    });
    return ys.map((y, i) => [(i / n) * W, y]);
  }
  const caminho = (pts) => `M0,${H} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L${W},${H} Z`;
  const alturaEm = (pts, x) => {
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor((x / W) * (pts.length - 1))));
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  };

  function pinheiro(x, base, h, larg, fill, tronco = '#3a2a3a') {
    const n = 5;
    const dir = [], esq = [];
    for (let i = 1; i <= n; i++) {
      const y = base - h + (h * 0.9 * i) / n;
      const hw = (larg / 2) * (0.22 + 0.78 * (i / n));
      dir.push(`${(x + hw * 0.55).toFixed(1)},${(y - (h / n) * 0.42).toFixed(1)}`, `${(x + hw).toFixed(1)},${y.toFixed(1)}`);
      esq.unshift(`${(x - hw).toFixed(1)},${y.toFixed(1)}`, `${(x - hw * 0.55).toFixed(1)},${(y - (h / n) * 0.42).toFixed(1)}`);
    }
    const tw = Math.max(2, larg * 0.07);
    return `<rect x="${(x - tw / 2).toFixed(1)}" y="${(base - h * 0.12).toFixed(1)}" width="${tw.toFixed(1)}" height="${(h * 0.14).toFixed(1)}" fill="${tronco}"/>` +
      `<polygon points="${x.toFixed(1)},${(base - h).toFixed(1)} ${dir.join(' ')} ${esq.join(' ')}" fill="${fill}"/>` +
      `<polygon points="${x.toFixed(1)},${(base - h).toFixed(1)} ${dir.join(' ')} ${x.toFixed(1)},${(base - h * 0.1).toFixed(1)}" fill="#7a2e1f" opacity=".16"/>`;
  }

  function arvoreRedonda(x, base, r, cor, sombra) {
    const tw = Math.max(3, r * 0.14);
    return `<rect x="${(x - tw / 2).toFixed(1)}" y="${(base - r * 0.9).toFixed(1)}" width="${tw.toFixed(1)}" height="${(r * 0.95).toFixed(1)}" fill="#2a2140"/>` +
      `<ellipse cx="${x.toFixed(1)}" cy="${(base - r * 1.55).toFixed(1)}" rx="${(r * 0.92).toFixed(1)}" ry="${(r * 1.15).toFixed(1)}" fill="${cor}"/>` +
      `<path d="M${(x + r * 0.05).toFixed(1)},${(base - r * 2.65).toFixed(1)} a${(r * 0.92).toFixed(1)},${(r * 1.15).toFixed(1)} 0 0 1 0,${(r * 2.3).toFixed(1)}" fill="${sombra}" opacity=".55"/>`;
  }

  function nuvem(x, y, w, cls = '') {
    return `<g class="nuvem ${cls}" fill="#fff" opacity=".95">
      <rect x="${x}" y="${y}" width="${w}" height="7" rx="3.5"/>
      <ellipse cx="${x + w * 0.38}" cy="${y + 1}" rx="${w * 0.17}" ry="9"/>
      <ellipse cx="${x + w * 0.56}" cy="${y - 1}" rx="${w * 0.13}" ry="12"/>
      <ellipse cx="${x + w * 0.7}" cy="${y + 2}" rx="${w * 0.1}" ry="6"/>
    </g>`;
  }

  function gerar() {
    const r = aleatorio(20261021);
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gCeu" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1c2453"/>
        <stop offset=".3" stop-color="#34407a"/>
        <stop offset=".52" stop-color="#7a6b98"/>
        <stop offset=".68" stop-color="#d98d84"/>
        <stop offset=".8" stop-color="#f3b48c"/>
      </linearGradient>
      <radialGradient id="gSol" cx=".5" cy=".7" r=".45">
        <stop offset="0" stop-color="#ffd2a1" stop-opacity=".7"/>
        <stop offset="1" stop-color="#ffd2a1" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gPinho" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd068"/>
        <stop offset=".55" stop-color="#f4a33e"/>
        <stop offset="1" stop-color="#d9662f"/>
      </linearGradient>
      <linearGradient id="gPinho2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f3b45c"/>
        <stop offset="1" stop-color="#b9603f"/>
      </linearGradient>
      <linearGradient id="gNevoa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f0a990" stop-opacity="0"/>
        <stop offset="1" stop-color="#f0a990" stop-opacity=".35"/>
      </linearGradient>
      <linearGradient id="gLago" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6b77a8"/>
        <stop offset=".25" stop-color="#4a5890"/>
        <stop offset="1" stop-color="#26305f"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#gCeu)"/>
    <rect width="${W}" height="${H}" fill="url(#gSol)"/>`;

    // estrelas
    s += '<g fill="#fff">';
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * 340, rr = 0.5 + r() * 1.3;
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(2)}" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
    }
    s += '</g>';

    // nuvens
    s += nuvem(110, 190, 150, 'lenta') + nuvem(480, 250, 110) + nuvem(1030, 205, 140, 'lenta') + nuvem(1340, 285, 120) + nuvem(760, 140, 90);

    // montanhas (do fundo para a frente)
    const longe = cumeada(470, 210, 0.55, 7, [[1180, 120, 160], [300, 70, 140]]);
    const media = cumeada(560, 170, 0.52, 21, [[560, 150, 120], [1320, 90, 150]]);
    const perto = cumeada(650, 90, 0.5, 33);
    s += `<path d="${caminho(longe)}" fill="#8b7aa5"/>`;
    s += `<rect y="380" width="${W}" height="260" fill="url(#gNevoa)"/>`;
    s += `<path d="${caminho(media)}" fill="#64628f"/>`;
    s += `<rect y="470" width="${W}" height="200" fill="url(#gNevoa)" opacity=".7"/>`;
    s += `<path d="${caminho(perto)}" fill="#454a7b"/>`;

    // pinheirinhos na encosta próxima
    s += '<g>';
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      if (x > 640 && x < 960 && r() < 0.7) continue;
      const y = alturaEm(perto, x) + 6 + r() * 30;
      const h = 22 + r() * 34;
      s += pinheiro(x, y, h, h * 0.42, '#363c6c', '#2c3160');
    }
    s += '</g>';

    // faixa de terreno (margem do lago)
    s += `<path d="M0,790 C220,770 420,782 620,786 S1020,786 1180,780 S1480,770 1600,786 L1600,${H} L0,${H} Z" fill="#2f3768"/>`;

    // lago
    s += `<rect x="0" y="796" width="${W}" height="${H - 796}" fill="url(#gLago)"/>`;
    s += '<g>';
    for (let i = 0; i < 46; i++) {
      const y = 806 + r() * 90, x = r() * W, w = 30 + r() * 220;
      const cor = x > 500 && x < 1100 && r() < 0.6 ? '#f6c09a' : '#c9d2f2';
      s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(1.5 + r() * 2.5).toFixed(1)}" rx="2" fill="${cor}" opacity="${(0.12 + r() * 0.28).toFixed(2)}"/>`;
    }
    s += '</g>';

    // bosques laterais
    const bosque = (x0, x1, lado) => {
      let g = '';
      // pinheiros do fundo
      for (let i = 0; i < 9; i++) {
        const x = x0 + r() * (x1 - x0);
        const h = 120 + r() * 70;
        g += pinheiro(x, 786, h, h * 0.42, 'url(#gPinho2)');
      }
      // árvores redondas (vinho e azul-noite)
      for (let i = 0; i < 7; i++) {
        const x = x0 + r() * (x1 - x0);
        const rad = 30 + r() * 26;
        const vinho = r() < 0.5;
        g += arvoreRedonda(x, 800, rad, vinho ? '#9a4f68' : '#30366a', vinho ? '#5e2f4f' : '#1d2147');
      }
      // pinheiros da frente, altos e dourados
      for (let i = 0; i < 7; i++) {
        const borda = lado === 'e' ? x0 + (x1 - x0) * (i / 7) : x1 - (x1 - x0) * (i / 7);
        const x = borda + (r() - 0.5) * 40;
        const h = 210 + r() * 140 - i * 10;
        g += pinheiro(x, 806, h, h * 0.4, 'url(#gPinho)');
      }
      // arbustos e moitas na margem
      for (let i = 0; i < 9; i++) {
        const x = x0 + r() * (x1 - x0);
        const rx = 30 + r() * 50;
        const cor = ['#3d6d8c', '#c98c4c', '#2b5d79', '#a2643f'][Math.floor(r() * 4)];
        g += `<ellipse cx="${x.toFixed(0)}" cy="${(806 + r() * 8).toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * 0.4).toFixed(0)}" fill="${cor}"/>`;
      }
      // capim
      for (let i = 0; i < 10; i++) {
        const x = x0 + r() * (x1 - x0), y = 808;
        let d = '';
        for (let k = 0; k < 5; k++) {
          const bx = x + k * 4;
          d += `M${bx},${y} Q${bx + (r() - 0.5) * 10},${y - 16} ${bx + (r() - 0.5) * 14},${y - 26 - r() * 14} `;
        }
        g += `<path d="${d}" stroke="#e79a4e" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>`;
      }
      return g;
    };
    s += bosque(-30, 400, 'e');
    s += bosque(1200, 1630, 'd');

    // pássaros
    s += '<g stroke="#2d2c4f" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75">';
    [[640, 300, 1], [680, 285, 0.8], [712, 312, 0.7], [1160, 330, 0.75]].forEach(([x, y, k]) => {
      s += `<path d="M${x - 10 * k},${y - 4 * k} q${5 * k},${-4 * k} ${10 * k},${4 * k} q${5 * k},${-8 * k} ${10 * k},${-4 * k}"/>`;
    });
    s += '</g>';

    s += '</svg>';
    return s;
  }

  window.Paisagem = { montar(el) { el.innerHTML = gerar(); } };
})();
