/* App do Instituto Cultural das Montanhas — protótipo (SPA com rotas por hash). */

const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");

/* ---------- Ícones (traço) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  news: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-4 0"/><path d="M8 9h5M8 13h5M8 17h3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.3 3.8 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4c3.4 0 5.6 3.3 4.4 6.6C19.5 15.4 12 20 12 20z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.9-3.5 3.4-5.5 6.5-5.5s5.6 2 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.1-2.1l.8-1-1-2z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  bus: '<rect x="4" y="3.5" width="16" height="14" rx="3"/><path d="M4 11h16M8 17.5V20M16 17.5V20"/><circle cx="8" cy="14.3" r=".9" fill="currentColor"/><circle cx="16" cy="14.3" r=".9" fill="currentColor"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/>',
  mountain: '<path d="M2 20l6.5-11 4 6 3-4.5L22 20z"/><path d="M8.5 9l1.8 3"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5M8 7h8M8 11h6"/>',
  map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
};
const icon = (name, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ""}</svg>`;

document.querySelectorAll("[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
$("#btn-voltar").innerHTML = icon("back");
$("#btn-avisos").innerHTML = icon("bell") + '<span class="dot"></span>';

/* ---------- Serra em camadas (identidade visual das montanhas) ---------- */
function serra(cls = "") {
  return `<svg class="serra ${cls}" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 62 L38 40 L62 52 L96 22 L128 46 L150 36 L188 58 L222 30 L246 18 L262 26 L300 52 L332 40 L364 56 L400 44 V90 H0Z" fill="currentColor" opacity=".18"/>
    <path d="M0 74 L30 60 L70 70 L112 48 L150 66 L196 52 L232 70 L270 58 L314 72 L352 60 L400 70 V90 H0Z" fill="currentColor" opacity=".32"/>
    <path d="M0 84 L48 76 L96 82 L150 74 L210 84 L262 76 L318 84 L370 78 L400 82 V90 H0Z" fill="currentColor" opacity=".55"/>
  </svg>`;
}

/* ---------- Utilitários ---------- */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const absUrl = (u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : `${SITE}/${String(u).replace(/^\/+/, "")}`);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const parseData = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtData = (s) => { const d = parseData(s); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const waLink = (txt) => `https://wa.me/${INSTITUTO.whatsapp}?text=${encodeURIComponent(txt)}`;
const turma = (id) => TURMAS.find((t) => t.id === id);
const projeto = (id) => PROJETOS.find((p) => p.id === id);
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

async function copiar(texto, msg) {
  try { await navigator.clipboard.writeText(texto); toast(msg); } catch { toast("Não foi possível copiar."); }
}

function sheet(html) {
  const bg = document.createElement("div");
  bg.className = "sheet-backdrop";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-close]")) bg.remove(); });
  $("#app").appendChild(bg);
  return bg;
}

const protoNote = (txt) => `<div class="proto-note">${icon("info")}<span>${txt}</span></div>`;
const modoNote = () => (DB.modo === "demo" ? protoNote("Modo demonstração: dados fictícios, nada é enviado nem guardado depois que o app é fechado.") : "");

// Imagens que falham somem (sem atributos onerror inline — a CSP bloqueia).
document.addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.style.visibility = "hidden"; }, true);

// Remove scripts, iframes e atributos perigosos do HTML vindo do blog.
function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,link,meta,input,button,svg").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((n) => {
    [...n.attributes].forEach((a) => {
      const nome = a.name.toLowerCase();
      const okAttr = ["href", "src", "alt", "title"].includes(nome);
      if (!okAttr) n.removeAttribute(a.name);
      else if ((nome === "href" || nome === "src") && !/^(https?:|\/|[a-z0-9])/i.test(a.value.trim())) n.removeAttribute(a.name);
      else if (/^\s*(javascript|data|vbscript):/i.test(a.value)) n.removeAttribute(a.name);
    });
    if (n.tagName === "IMG") { n.setAttribute("src", absUrl(n.getAttribute("src"))); n.setAttribute("loading", "lazy"); }
    if (n.tagName === "A") { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener noreferrer"); }
  });
  return doc.body.firstChild.innerHTML;
}

/* ---------- Blog (API pública do site) ---------- */
// As notícias vêm direto do blog do site. A lista baixada vale por 5 minutos;
// depois disso (ou quando o app volta para a tela) busca de novo.
const cacheNoticias = new Map();
const VALIDADE_NOTICIAS = 5 * 60 * 1000;
async function buscarNoticias({ categoria = "", limit = 20 } = {}) {
  const chave = `${categoria}|${limit}`;
  const guardado = cacheNoticias.get(chave);
  if (guardado && Date.now() - guardado.em < VALIDADE_NOTICIAS) return guardado.posts;
  const qs = new URLSearchParams({ page: "1", limit: String(limit) });
  if (categoria) qs.set("categoria", categoria);
  const r = await fetch(`${BLOG_API}?${qs}`, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-cache" });
  if (!r.ok) throw new Error("blog " + r.status);
  const posts = (await r.json()).posts || [];
  cacheNoticias.set(chave, { posts, em: Date.now() });
  return posts;
}

// App voltou para a tela depois de um tempo: descarta a lista e atualiza a tela atual,
// se ela mostra notícias.
let saiuDaTelaEm = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { saiuDaTelaEm = Date.now(); return; }
  if (saiuDaTelaEm && Date.now() - saiuDaTelaEm > 60000) {
    cacheNoticias.clear();
    const rota = (location.hash.replace(/^#\/?/, "") || "inicio").split(/[/?]/)[0];
    if (["inicio", "noticias", "aulas"].includes(rota)) render();
  }
});
async function buscarNoticia(slug) {
  const r = await fetch(`${BLOG_API}?slug=${encodeURIComponent(slug)}`, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("post " + r.status);
  const j = await r.json();
  return j.post || j;
}
const catNome = (c) => CATEGORIAS[c] || "Instituto";
const newsItem = (p) => `<a class="news-item" href="#/noticia/${encodeURIComponent(p.slug)}">
    <img src="${esc(absUrl(p.capa_url))}" alt="" loading="lazy">
    <div><div class="news-meta"><span class="cat">${esc(catNome(p.categoria))}</span><span>${fmtData(p.publicado_em)}</span></div>
    <h3>${esc(p.titulo)}</h3></div></a>`;
const newsFeature = (p) => `<a class="news-feature" href="#/noticia/${encodeURIComponent(p.slug)}">
    <img src="${esc(absUrl(p.capa_url))}" alt="" loading="lazy">
    <div class="nf-body"><div class="news-meta"><span class="cat">${esc(catNome(p.categoria))}</span><span>${fmtData(p.publicado_em)}</span></div>
    <h3>${esc(p.titulo)}</h3><p>${esc((p.resumo || "").slice(0, 140))}…</p></div></a>`;
const skeletonNews = (n = 3) => Array.from({ length: n }, () => `<div class="skeleton" style="height:100px"></div>`).join("");

/* ---------- Sessão ---------- */
let USUARIO = null;
let ALUNOS = [];
let alunoSel = 0;
let PAPEL = null;
const ehEquipe = () => PAPEL === "coordenacao" || PAPEL === "transporte";

async function carregarSessao() {
  USUARIO = await DB.usuario();
  PAPEL = USUARIO ? await DB.meuPapel().catch(() => null) : null;
  ALUNOS = USUARIO ? await DB.meusAlunos().catch(() => []) : [];
  if (alunoSel >= ALUNOS.length) alunoSel = 0;
}
const alunoAtual = () => ALUNOS[alunoSel] || null;

// Aulas do aluno numa data (respeitando feriados e recessos do calendário letivo).
function diaSemAula(d) {
  const s = iso(d);
  return CALENDARIO_LETIVO.find((e) => (e.tipo === "feriado" || e.tipo === "recesso") && s >= e.inicio && s <= (e.fim || e.inicio));
}
function aulasDoDia(aluno, d) {
  if (!aluno || aluno.status !== "ativa" || diaSemAula(d)) return [];
  return aluno.turmas.map(turma).filter((t) => t && t.dias.includes(d.getDay())).sort((a, b) => a.inicio.localeCompare(b.inicio));
}
function proximaAula(aluno) {
  const agora = new Date();
  for (let i = 0; i < 21; i++) {
    const d = hoje(); d.setDate(d.getDate() + i);
    for (const t of aulasDoDia(aluno, d)) {
      const [h, m] = t.inicio.split(":").map(Number);
      const quando = new Date(d); quando.setHours(h, m);
      if (quando > agora) return { t, d };
    }
  }
  return null;
}
const rotuloDia = (d) => {
  const dif = Math.round((d - hoje()) / 864e5);
  return dif === 0 ? "Hoje" : dif === 1 ? "Amanhã" : `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
};

/* =====================================================================
   TELAS
   ===================================================================== */

function telaInicio() {
  const aluno = alunoAtual();
  const prox = aluno && aluno.status === "ativa" ? proximaAula(aluno) : null;
  const apres = APRESENTACOES.filter((a) => parseData(a.data) >= hoje()).slice(0, 3);
  const destaque = PROJETOS.find((p) => p.novo && !p.oculto);
  const nome = USUARIO ? (aluno ? aluno.nome.split(" ")[0] : "família") : "";

  view.innerHTML = `
    <section class="hero hero-serra">
      <img src="${img("criancas-violinos-montanhas.jpg")}" alt="">
      <span class="eyebrow">${nome ? `Olá, ${esc(nome)}` : "Nas trilhas da cultura"}</span>
      <h2>Transformando vidas nas <em>montanhas capixabas.</em></h2>
      <p>Música, coral, orquestra e esporte — gratuitos, em Afonso Cláudio.</p>
      ${serra("serra-hero")}
    </section>

    <nav class="quick" aria-label="Atalhos">
      <a href="#/matricula" class="gold"><span class="q-ico">${icon("pen")}</span>Matrícula</a>
      <a href="#/calendario"><span class="q-ico">${icon("calendar")}</span>Calendário</a>
      <a href="#/van"><span class="q-ico">${icon("bus")}</span>Van</a>
      <a href="#/doar"><span class="q-ico">${icon("heart")}</span>Doar</a>
    </nav>

    ${prox ? `<section class="section">
      <div class="section-head"><h2>Próxima parada da trilha</h2><a href="#/aulas">Minhas aulas</a></div>
      <a class="card trilha-card" href="#/aulas">
        <div class="tc-alt">${icon("mountain")}</div>
        <div><span class="eyebrow">${rotuloDia(prox.d)} · ${prox.t.inicio}</span>
        <div class="tc-tit">${esc(prox.t.nome)}</div>
        <div class="small muted">${esc(prox.t.local)}</div></div>
      </a></section>` : ""}

    ${!USUARIO ? `<section class="section">
      <a class="card gold matricula-cta" href="#/matricula">
        <div><span class="eyebrow">Matrículas abertas</span>
        <div class="tc-tit">Comece sua trilha no Instituto</div>
        <div class="small muted">Tudo gratuito · inscrição online em poucos passos</div></div>
        <span class="icon-btn" style="color:var(--gold)">${icon("arrow")}</span>
      </a></section>` : ""}

    ${destaque ? `<section class="section">
      <div class="section-head"><h2>Inscrições abertas</h2></div>
      <a class="card row-between" href="#/projeto/${destaque.id}" style="gap:14px">
        <img src="${esc(destaque.foto)}" alt="" class="thumb">
        <div style="flex:1"><span class="chip gold">${esc(destaque.tag)}</span>
        <div style="font-weight:800;margin-top:8px">${esc(destaque.nome)}</div>
        <div class="small muted">${esc(destaque.publico)}</div></div>
        ${icon("chev", 'style="width:18px;color:var(--muted)"')}
      </a>
    </section>` : ""}

    <section class="section">
      <div class="section-head"><h2>Projetos</h2><a href="#/projetos">Ver todos</a></div>
      <div class="hscroll">${PROJETOS.filter((p) => !p.oculto).slice(0, 7).map(projCard).join("")}</div>
    </section>

    <section class="section" style="margin-top:8px">
      <div class="section-head"><h2>Próximas apresentações</h2><a href="#/calendario?aba=apresentacoes">Calendário</a></div>
      ${apres.map(apresHtml).join("")}
    </section>

    <section class="section">
      <div class="section-head"><h2>Nossas montanhas</h2><a href="#/sobre">O Instituto</a></div>
      <div class="hscroll">${MONTANHAS.map((m) => `<div class="mont-card">${serra("serra-card")}<span class="eyebrow">${icon("mountain", 'style="width:14px;height:14px;vertical-align:-2px"')} Marco</span><strong>${esc(m.nome)}</strong><p>${esc(m.texto)}</p></div>`).join("")}</div>
    </section>

    <section class="section" style="margin-top:8px">
      <div class="section-head"><h2>Do alto das montanhas</h2></div>
      <div class="stats">${NUMEROS.map((n) => `<div class="stat"><strong>${n.valor}</strong><span>${n.rotulo}</span></div>`).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Últimas notícias</h2><a href="#/noticias">Ver todas</a></div>
      <div id="home-news" class="news-list">${skeletonNews(3)}</div>
    </section>

    <div class="rodape-serra">${serra()}<p><b>Instituto Cultural das Montanhas</b><br>Afonso Cláudio · Espírito Santo</p></div>`;

  buscarNoticias({ limit: 4 }).then((posts) => {
    const box = $("#home-news");
    if (box) box.innerHTML = posts.length ? newsFeature(posts[0]) + posts.slice(1).map(newsItem).join("") : `<p class="muted small">Nenhuma notícia por enquanto.</p>`;
  }).catch(() => { const box = $("#home-news"); if (box) box.innerHTML = `<p class="muted small">Não foi possível carregar as notícias agora.</p>`; });
}

const projCard = (p) => `<a class="proj-card" href="#/projeto/${p.id}">
    <img src="${esc(p.foto)}" alt="" loading="lazy">
    <div class="pc-body"><span class="chip outline">${esc(areaNome(p.area))}</span><strong>${esc(p.nome)}</strong></div>
  </a>`;

function apresHtml(a) {
  const d = parseData(a.data);
  const passou = d < hoje();
  return `<div class="event ${passou ? "passou" : "evento"}">
    <div class="ev-date"><strong>${d.getDate()}</strong><span>${MESES[d.getMonth()]}</span></div>
    <div style="min-width:0;flex:1"><h3>${esc(a.titulo)}</h3><p>${esc([a.grupo, a.local, a.hora].filter(Boolean).join(" · "))}</p></div>
    ${passou ? `<span class="chip">Realizada</span>` : `<button class="icon-btn add" data-lembrar="${esc(a.titulo)}" aria-label="Lembrar">${icon("bell")}</button>`}
  </div>`;
}

/* ----- Aulas do aluno ----- */
function telaAulas() {
  if (!USUARIO) return telaPedirLogin("Entre para ver as aulas, dias e horários do seu aluno.", "aulas");
  if (!ALUNOS.length) return vazioMatricula();
  const aluno = alunoAtual();
  const semana = Array.from({ length: 7 }, (_, i) => { const d = hoje(); d.setDate(d.getDate() + i); return d; });
  let dia = 0;

  const render = () => {
    const d = semana[dia];
    const aulas = aulasDoDia(aluno, d);
    const folga = diaSemAula(d);
    const cats = [...new Set(aluno.turmas.map((t) => projeto(turma(t)?.projeto)?.categoria).filter((c) => CATEGORIAS[c]))];

    view.innerHTML = `
      ${seletorAluno()}
      ${aluno.status !== "ativa" ? `<div class="card gold mt-16"><span class="eyebrow">Matrícula em análise</span><div style="font-weight:800;margin-top:6px">Protocolo ${esc(aluno.protocolo || "")}</div><p class="small muted" style="margin:4px 0 0">A secretaria confere os dados e confirma a vaga pelo WhatsApp. As aulas aparecem aqui assim que a matrícula for ativada.</p></div>` : ""}
      <div class="week mt-16">${semana.map((s, i) => `<button class="${i === dia ? "on" : ""} ${aulasDoDia(aluno, s).length ? "has" : ""}" data-dia="${i}">${DIAS[s.getDay()]}<strong>${s.getDate()}</strong></button>`).join("")}</div>

      <div class="section-head"><h2>${rotuloDia(d)}</h2></div>
      ${folga ? `<div class="card inset folga">${icon("flag")}<div><b>${esc(folga.titulo)}</b><br><span class="small muted">Sem aulas neste dia.</span></div></div>`
        : aulas.length ? aulas.map((t) => `<div class="aula">
            <div class="aula-hora"><strong>${t.inicio}</strong><span>${t.fim}</span></div>
            <div class="aula-body"><span class="chip ${t.ensaio ? "gold" : ""}">${esc(projeto(t.projeto)?.nome || "")}</span>
              <h3>${esc(t.nome)}</h3>
              <p>${icon("pin")} ${esc(t.local)}</p>${t.professor ? `<p>${icon("user")} ${esc(t.professor)}</p>` : ""}</div></div>`).join("")
        : `<div class="card inset folga">${icon("mountain")}<div><b>Dia livre</b><br><span class="small muted">Nenhuma aula de ${esc(aluno.nome.split(" ")[0])} neste dia.</span></div></div>`}

      <section class="section">
        <div class="section-head"><h2>Grade semanal</h2></div>
        <div class="grade">${[1, 2, 3, 4, 5, 6].map((wd) => {
          const ts = aluno.turmas.map(turma).filter((t) => t && t.dias.includes(wd));
          return `<div class="grade-dia ${ts.length ? "tem" : ""}"><span>${DIAS[wd]}</span>${ts.map((t) => `<b>${t.inicio}</b><small>${esc(t.nome.split(" — ")[0])}</small>`).join("") || "<small>—</small>"}</div>`;
        }).join("")}</div>
      </section>

      ${aluno.status === "ativa" ? `<section class="section">
        <div class="section-head"><h2>Altitude da frequência</h2></div>
        <div class="card altitude">
          ${serra("serra-alt")}
          ${altitude(aluno)}
        </div>
      </section>` : ""}

      ${(aluno.comunicados || []).length ? `<section class="section"><div class="section-head"><h2>Avisos do Instituto</h2></div>
        ${aluno.comunicados.map((c) => `<div class="card inset mb-14"><b>${esc(c.titulo)}</b><p class="small muted" style="margin:6px 0 0">${esc(c.texto)}</p></div>`).join("")}</section>` : ""}

      ${cats.length ? `<section class="section"><div class="section-head"><h2>Notícias dos seus projetos</h2></div><div id="aluno-news" class="news-list">${skeletonNews(2)}</div></section>` : ""}
      ${modoNote()}`;

    view.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => { dia = Number(b.dataset.dia); render(); }));
    ligarSeletorAluno(render);
    if (cats.length) {
      Promise.all(cats.map((c) => buscarNoticias({ categoria: c, limit: 3 }).catch(() => [])))
        .then((ls) => {
          const box = $("#aluno-news");
          if (!box) return;
          const posts = ls.flat().sort((a, b) => b.publicado_em.localeCompare(a.publicado_em)).slice(0, 4);
          box.innerHTML = posts.length ? posts.map(newsItem).join("") : `<p class="muted small">Ainda não há notícias destes projetos.</p>`;
        });
    }
  };
  render();
}

function altitude(aluno) {
  const f = aluno.frequencia || {};
  const total = (f.P || 0) + (f.F || 0) + (f.J || 0);
  if (!total) return `<div class="alt-num"><strong>—</strong><span>ainda sem aulas registradas em ${esc(f.ano || "")}</span></div>`;
  const pct = Math.round((((f.P || 0) + (f.J || 0)) / total) * 100);
  return `<div class="alt-num"><strong>${pct}%</strong><span>de presença em ${esc(f.ano || "")}</span></div>
          <div class="alt-meta"><span class="chip ${pct >= 75 ? "gold" : ""}">${pct >= 75 ? "Sem alertas" : "Atenção às faltas"}</span><span class="small muted">${f.P || 0} presença${f.P === 1 ? "" : "s"} · ${f.F || 0} falta${f.F === 1 ? "" : "s"}${f.J ? ` · ${f.J} justificada${f.J === 1 ? "" : "s"}` : ""}</span></div>`;
}

function seletorAluno() {
  if (ALUNOS.length < 2) return `<div class="aluno-head"><span class="avatar">${esc(alunoAtual().nome[0])}</span><div><b>${esc(alunoAtual().nome)}</b><span class="small muted">${esc(alunoAtual().matricula)}</span></div></div>`;
  return `<div class="chips-scroll" style="margin-bottom:0">${ALUNOS.map((a, i) => `<button class="${i === alunoSel ? "on" : ""}" data-aluno="${i}">${esc(a.nome.split(" ")[0])}</button>`).join("")}</div>`;
}
function ligarSeletorAluno(render) {
  view.querySelectorAll("[data-aluno]").forEach((b) => b.addEventListener("click", () => { alunoSel = Number(b.dataset.aluno); render(); }));
}
function vazioMatricula() {
  view.innerHTML = `<div class="auth"><div class="success"><div class="ok">${icon("mountain")}</div><h2>Nenhum aluno ainda</h2>
    <p class="muted">Faça a matrícula para ver aulas, horários e a van.</p>
    <a class="btn gold block" style="margin-top:22px" href="#/matricula">Fazer matrícula ${icon("arrow")}</a></div></div>`;
}

/* ----- Calendário letivo e de apresentações ----- */
function telaCalendario(params) {
  let aba = params.get("aba") === "apresentacoes" ? "apresentacoes" : "letivo";
  const h = hoje();
  let ano = h.getFullYear(), mes = h.getMonth();

  const eventosDoMes = () => {
    const ini = iso(new Date(ano, mes, 1)), fim = iso(new Date(ano, mes + 1, 0));
    if (aba === "letivo") return CALENDARIO_LETIVO.filter((e) => e.inicio <= fim && (e.fim || e.inicio) >= ini);
    return APRESENTACOES.filter((a) => a.data >= ini && a.data <= fim);
  };
  const marcasDoDia = (s) => aba === "letivo"
    ? CALENDARIO_LETIVO.filter((e) => s >= e.inicio && s <= (e.fim || e.inicio)).map((e) => e.tipo)
    : APRESENTACOES.filter((a) => a.data === s).map(() => "apresentacao");

  const render = () => {
    const primeiro = new Date(ano, mes, 1);
    const dias = new Date(ano, mes + 1, 0).getDate();
    const cel = [];
    for (let i = 0; i < primeiro.getDay(); i++) cel.push(`<span></span>`);
    for (let d = 1; d <= dias; d++) {
      const s = iso(new Date(ano, mes, d));
      const m = marcasDoDia(s);
      const cls = [s === iso(h) ? "hoje" : "", m.includes("feriado") || m.includes("recesso") ? "off" : "", m.length ? "tem " + m[0] : ""].join(" ");
      cel.push(`<span class="${cls}">${d}</span>`);
    }
    const evs = eventosDoMes();
    view.innerHTML = `
      <div class="seg"><button class="${aba === "letivo" ? "on" : ""}" data-aba="letivo">Letivo</button><button class="${aba === "apresentacoes" ? "on" : ""}" data-aba="apresentacoes">Apresentações</button></div>
      <div class="cal card mt-16">
        <div class="cal-head"><button class="icon-btn" data-mes="-1" aria-label="Mês anterior">${icon("chevL")}</button>
          <strong>${MESES_LONGOS[mes]} ${ano}</strong>
          <button class="icon-btn" data-mes="1" aria-label="Próximo mês">${icon("chev")}</button></div>
        <div class="cal-grid cal-dows">${DIAS.map((d) => `<span>${d[0]}</span>`).join("")}</div>
        <div class="cal-grid">${cel.join("")}</div>
        <div class="cal-legenda">${aba === "letivo"
          ? `<span><i class="lg marco"></i>Marco</span><span><i class="lg feriado"></i>Feriado</span><span><i class="lg recesso"></i>Recesso</span><span><i class="lg reuniao"></i>Reunião</span>`
          : `<span><i class="lg apresentacao"></i>Apresentação</span>`}</div>
      </div>
      <div class="month-label">${MESES_LONGOS[mes]} · ${evs.length} ${evs.length === 1 ? "item" : "itens"}</div>
      ${evs.length ? (aba === "letivo" ? evs.map(letivoHtml).join("") : evs.map(apresHtml).join(""))
        : `<p class="muted small">Nada programado neste mês.</p>`}
      ${aba === "letivo" ? protoNote("Calendário letivo proposto para 2026 — datas a confirmar com a coordenação. Feriados municipais de Afonso Cláudio ainda não incluídos.") : protoNote("Apresentações realizadas vêm das notícias do site; as futuras são ilustrativas.")}`;
    view.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => { aba = b.dataset.aba; render(); }));
    view.querySelectorAll("[data-mes]").forEach((b) => b.addEventListener("click", () => {
      mes += Number(b.dataset.mes);
      if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; }
      render();
    }));
  };
  render();
}
function letivoHtml(e) {
  const d = parseData(e.inicio);
  const periodo = e.fim ? `${d.getDate()} ${MESES[d.getMonth()]} a ${parseData(e.fim).getDate()} ${MESES[parseData(e.fim).getMonth()]}` : DIAS_LONGOS[d.getDay()];
  const rot = { feriado: "Feriado", marco: "Marco", recesso: "Recesso", reuniao: "Reunião" }[e.tipo];
  return `<div class="event letivo-${e.tipo}"><div class="ev-date"><strong>${d.getDate()}</strong><span>${MESES[d.getMonth()]}</span></div>
    <div style="flex:1;min-width:0"><h3>${esc(e.titulo)}</h3><p>${periodo}</p></div><span class="chip">${rot}</span></div>`;
}

/* ----- Van em tempo real ----- */
let pararVan = null;
let pararPainel = null;
let leafletPronto = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletPronto) return leafletPronto;
  leafletPronto = new Promise((ok, erro) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H"; css.crossOrigin = "anonymous";
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.integrity = "sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH"; js.crossOrigin = "anonymous";
    js.onload = ok; js.onerror = () => { leafletPronto = null; erro(new Error("mapa")); };
    document.head.append(css, js);
  });
  return leafletPronto;
}

async function telaVan() {
  if (!USUARIO) return telaPedirLogin("A localização da van é exclusiva para famílias de alunos matriculados que usam o transporte.", "van");
  const aluno = ALUNOS.find((a) => a.usaVan && a.status === "ativa") || (ehEquipe() ? { pontoVan: null } : null);
  if (!aluno) {
    view.innerHTML = `<div class="auth"><div class="success"><div class="ok">${icon("bus")}</div><h2>Van indisponível</h2>
      <p class="muted">O mapa aparece para alunos com matrícula ativa que usam o transporte gratuito. Para incluir a van, fale com a secretaria.</p>
      <a class="btn block" style="margin-top:22px" href="${waLink("Olá! Gostaria de incluir o transporte (van) para meu filho(a).")}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")} Falar com a secretaria</a></div></div>`;
    return;
  }
  view.innerHTML = `
    <div class="mapa-wrap"><div id="mapa" class="mapa" role="img" aria-label="Mapa de Afonso Cláudio com a posição da van"></div>
      <div class="mapa-status" id="van-status">${icon("bus")}<span>Localizando a van…</span></div></div>
    ${ehEquipe() ? `<div class="card painel-rota mt-16" id="painel-rota"><div class="skeleton" style="height:90px"></div></div>` : ""}
    <div class="card eta-card mt-16">
      <div><span class="eyebrow" id="eta-ponto">${aluno.pontoVan ? `Seu ponto · ${esc(aluno.pontoVan)}` : "Destino"}</span><div class="eta-num" id="eta">—</div><div class="small muted" id="eta-sub">aguardando a van</div></div>
      <div class="eta-ico">${icon("pin")}</div>
    </div>
    <section class="section">
      <div class="section-head"><h2 id="rota-nome"></h2><span class="small muted" id="rota-km"></span></div>
      <ol class="paradas" id="paradas"></ol>
    </section>
    <div class="proto-note">${icon("shield")}<span>A posição da van só é visível para famílias de alunos ativos que usam o transporte, e só enquanto a rota está em andamento. O app não guarda histórico de trajetos. Paradas intermediárias provisórias.${DB.modo === "demo" ? " <b>Demonstração:</b> a van percorre as ruas reais em velocidade acelerada." : ""}</span></div>`;

  try { await carregarLeaflet(); } catch {
    $("#mapa").innerHTML = `<p class="muted small" style="padding:20px">Não foi possível carregar o mapa. Verifique sua conexão.</p>`;
    return;
  }
  if (!$("#mapa")) return;

  const mapa = L.map("mapa", { zoomControl: false, attributionControl: true, fadeAnimation: false }).setView([-20.079, -41.123], 14);
  // Mapa do OpenStreetMap, escurecido via CSS (.mapa .leaflet-tile-pane) para o tema do app.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapa);
  L.control.zoom({ position: "bottomright" }).addTo(mapa);
  const vanMarker = L.marker([-20.079, -41.123], {
    icon: L.divIcon({ className: "", html: `<span class="pin-van">${icon("bus")}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
    zIndexOffset: 1000, title: "Van do Instituto",
  });

  // Desenha a rota (ida ou volta) conforme a que estiver em andamento.
  let rotaId = null, rota, paradas, minha, segPorPonto, linha = null, marcadores = [];
  const desenharRota = (id) => {
    if (id === rotaId || !ROTAS_VAN[id]) return;
    rotaId = id; rota = ROTAS_VAN[id]; paradas = rota.paradas;
    // Família: o ponto do aluno. Equipe: o destino final da rota.
    minha = paradas.find((p) => p.nome === aluno.pontoVan) || paradas[paradas.length - 1];
    segPorPonto = rota.duracaoSeg / (rota.pontos.length - 1);
    linha?.remove(); marcadores.forEach((m) => m.remove()); marcadores = [];
    linha = L.polyline(rota.pontos, { color: "#c9a55a", weight: 4, opacity: .85 }).addTo(mapa);
    mapa.fitBounds(linha.getBounds(), { padding: [24, 24] });
    paradas.forEach((p) => {
      const sede = p.nome.startsWith("Sede");
      marcadores.push(L.marker(rota.pontos[p.i], {
        icon: L.divIcon({ className: "", html: `<span class="pin-parada ${p === minha ? "minha" : ""} ${sede ? "sede" : ""}"></span>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
        title: p.nome,
      }).addTo(mapa).bindTooltip(p.nome, { direction: "top", offset: [0, -8] }));
    });
    $("#rota-nome").textContent = rota.nome;
    $("#rota-km").textContent = `${(rota.distanciaM / 1000).toFixed(1)} km`;
    $("#eta-ponto").textContent = aluno.pontoVan ? `Seu ponto · ${minha.nome}` : `Destino · ${minha.nome}`;
    $("#paradas").innerHTML = paradas.map((p) => `<li data-i="${p.i}" class="${p === minha ? "minha" : ""}"><i></i><div><b>${esc(p.nome)}</b><span></span></div></li>`).join("");
  };
  desenharRota(ROTA_PADRAO);

  // Índice do ponto mais próximo da rota (para posições reais vindas do Supabase).
  const indiceMaisProximo = (lat, lng) => {
    let bi = 0, bd = Infinity;
    rota.pontos.forEach(([a, b], i) => { const d = (a - lat) ** 2 + (b - lng) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  if (ehEquipe()) painelRota();

  pararVan = DB.assinarVan((pos) => {
    if (!$("#mapa")) return;
    const st = $("#van-status");
    if (!pos.em_rota) {
      vanMarker.remove();
      st.innerHTML = `${icon("bus")}<span>Van fora de rota no momento</span>`;
      $("#eta").textContent = "—";
      $("#eta-sub").textContent = "aguardando a van";
      view.querySelectorAll("#paradas li").forEach((li) => { li.classList.remove("feita"); li.querySelector("span").textContent = ""; });
      return;
    }
    if (pos.rota_id) desenharRota(pos.rota_id);
    vanMarker.setLatLng([pos.lat, pos.lng]).addTo(mapa);
    const idx = pos.indice ?? indiceMaisProximo(pos.lat, pos.lng);
    const seg = Math.round((Date.now() - new Date(pos.atualizado_em)) / 1000);
    st.innerHTML = `<span class="ao-vivo"></span><span>Ao vivo · atualizado ${seg < 5 ? "agora" : `há ${seg}s`}</span>`;

    const faltaMin = (alvo) => Math.max(0, Math.round(((alvo - idx) * segPorPonto) / 60));
    if (idx <= minha.i) {
      const m = faltaMin(minha.i);
      $("#eta").textContent = m <= 1 ? "Chegando!" : `${m} min`;
      const prox = paradas.find((p) => p.i > idx);
      $("#eta-sub").textContent = prox ? `próxima parada: ${prox.nome}` : "";
    } else {
      $("#eta").textContent = "Já passou";
      $("#eta-sub").textContent = `a van seguiu para ${paradas[paradas.length - 1].nome}`;
    }
    view.querySelectorAll("#paradas li").forEach((li) => {
      const i = Number(li.dataset.i);
      li.classList.toggle("feita", i < idx);
      li.querySelector("span").textContent = i < idx ? "passou" : `~${faltaMin(i)} min`;
    });
  }, aluno);
}

/* ----- Painel do transporte: iniciar e encerrar rota ----- */
async function painelRota() {
  const box = $("#painel-rota");
  if (!box) return;
  const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  let rotas;
  try { rotas = await DB.rotas(); } catch (err) { box.innerHTML = `<p class="muted small">${esc(err.message)}</p>`; return; }
  if (!$("#painel-rota")) return;
  const andamento = rotas.find((r) => r.em_andamento);

  if (!andamento) {
    box.innerHTML = `
      <span class="eyebrow">Transporte · rota parada</span>
      <div class="field mt-12" style="margin-bottom:14px"><label for="sel-rota">Qual rota vai fazer?</label>
        <select id="sel-rota">${rotas.map((r) => `<option value="${esc(r.id)}">${esc(r.nome)}</option>`).join("")}</select></div>
      <button class="btn gold block" id="btn-iniciar">${icon("flag")} Iniciar rota</button>
      <p class="small muted" style="margin:12px 0 0">Depois de iniciar, ligue o <b style="color:var(--text-2)">Traccar Client</b>. Sem rota iniciada, nenhuma posição aparece para as famílias.</p>`;
    $("#btn-iniciar").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try { await DB.iniciarRota($("#sel-rota").value); toast("Rota iniciada! Ligue o Traccar."); painelRota(); }
      catch (err) { e.currentTarget.disabled = false; toast(err.message); }
    });
    return;
  }

  const sinal = await DB.ultimaPosicao().catch(() => null);
  if (!$("#painel-rota")) return;
  const seg = sinal ? Math.round((Date.now() - new Date(sinal.atualizado_em)) / 1000) : null;
  const gps = DB.modo === "demo" ? `<span class="ao-vivo"></span> GPS simulado`
    : seg === null ? `<span class="ponto-alerta"></span> Aguardando o GPS — o Traccar está ligado?`
    : seg > 60 ? `<span class="ponto-alerta"></span> Último sinal há ${Math.round(seg / 60)} min — confira o Traccar`
    : `<span class="ao-vivo"></span> GPS chegando · há ${seg}s`;
  box.innerHTML = `
    <div class="row-between"><span class="eyebrow">Rota em andamento</span><span class="chip gold">desde ${hora(andamento.iniciada_em)}</span></div>
    <div class="tc-tit" style="margin-top:8px">${esc(andamento.nome)}</div>
    <p class="small gps-linha">${gps}</p>
    <button class="btn block" id="btn-encerrar" style="margin-top:14px">${icon("check")} Encerrar rota</button>`;
  $("#btn-encerrar").addEventListener("click", () => {
    const bg = sheet(`<h3>Encerrar a rota?</h3>
      <p class="muted">A van some do mapa das famílias na hora. Depois, desligue o Traccar no celular.</p>
      <div class="btn-row" style="margin-top:18px"><button class="btn ghost" data-close>Voltar</button><button class="btn gold" style="flex:1" data-sim>Encerrar</button></div>`);
    bg.querySelector("[data-sim]").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      try { await DB.encerrarRota(andamento.id); bg.remove(); toast("Rota encerrada. Desligue o Traccar."); painelRota(); }
      catch (err) { e.currentTarget.disabled = false; toast(err.message); }
    });
  });
  clearTimeout(pararPainel);
  pararPainel = setTimeout(painelRota, 10000);
}

/* ----- Matrícula (assistente em etapas) ----- */
function telaMatricula(params) {
  const d = { projetoId: params.get("projeto") || "", turmaId: "", usaVan: false, pontoVan: "", cadUnico: false, autorizaImagem: false, aceiteLgpd: false };
  let passo = 0;
  const PASSOS = ["Responsável", "Aluno", "Turma", "Transporte", "Termos"];

  const campos = {
    0: () => `
      <div class="field"><label for="m-resp">Nome do responsável</label><input id="m-resp" autocomplete="name" maxlength="120" value="${esc(d.respNome || "")}"></div>
      <div class="field"><label for="m-par">Parentesco</label><select id="m-par">${["Mãe", "Pai", "Avó/Avô", "Tio(a)", "Responsável legal", "O próprio aluno (maior de idade)"].map((p) => `<option ${d.parentesco === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>
      <div class="field"><label for="m-tel">WhatsApp</label><input id="m-tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="(27) 9 0000-0000" value="${esc(d.respTel || "")}"></div>`,
    1: () => `
      <div class="field"><label for="m-aluno">Nome completo do aluno</label><input id="m-aluno" maxlength="120" value="${esc(d.alunoNome || "")}"></div>
      <div class="field"><label for="m-nasc">Data de nascimento</label><input id="m-nasc" type="date" max="${iso(hoje())}" value="${esc(d.nascimento || "")}"></div>
      <div class="field"><label for="m-escola">Escola</label><input id="m-escola" maxlength="120" placeholder="Escola onde estuda" value="${esc(d.escola || "")}"></div>
      <div class="field"><label for="m-serie">Ano / série</label><input id="m-serie" maxlength="40" placeholder="Ex.: 6º ano" value="${esc(d.serie || "")}"></div>
      <div class="field"><label>A família tem CadÚnico?</label><div class="pills" data-bool="cadUnico"><button type="button" class="${d.cadUnico ? "on" : ""}" data-v="1">Sim</button><button type="button" class="${!d.cadUnico ? "on" : ""}" data-v="0">Não</button></div>
      <span class="hint">Só perguntamos sim ou não. Não pedimos número de NIS nem documentos pelo app.</span></div>`,
    2: () => `
      <div class="field"><label for="m-proj">Projeto</label><select id="m-proj"><option value="">Escolha…</option>${PROJETOS.filter((p) => !p.oculto).map((p) => `<option value="${p.id}" ${d.projetoId === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></div>
      <div id="m-turmas" class="turma-opcoes"></div>`,
    3: () => `
      <div class="field"><label>Vai usar a van gratuita?</label><div class="pills" data-bool="usaVan"><button type="button" class="${d.usaVan ? "on" : ""}" data-v="1">Sim</button><button type="button" class="${!d.usaVan ? "on" : ""}" data-v="0">Não</button></div></div>
      <div class="field" id="m-ponto-wrap" ${d.usaVan ? "" : "hidden"}><label for="m-ponto">Ponto de embarque</label><select id="m-ponto">${ROTAS_VAN[ROTA_PADRAO].paradas.filter((p) => !p.nome.startsWith("Sede")).map((p) => `<option ${d.pontoVan === p.nome ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></div>`,
    4: () => `
      <label class="check"><input type="checkbox" id="m-lgpd" ${d.aceiteLgpd ? "checked" : ""}><span>Li e aceito o <a href="#/privacidade" target="_blank">termo de uso de dados</a>. Os dados servem só para a matrícula, frequência, transporte e prestação de contas dos projetos (LGPD).</span></label>
      <label class="check"><input type="checkbox" id="m-img" ${d.autorizaImagem ? "checked" : ""}><span>Autorizo o uso de imagem do aluno em fotos e vídeos de divulgação do Instituto. <em>(opcional)</em></span></label>
      <div class="resumo card inset mt-16">
        <span class="eyebrow">Resumo</span>
        <p><b>${esc(d.alunoNome || "—")}</b> · ${esc(projeto(d.projetoId)?.nome || "—")}<br>
        <span class="muted">${esc(turma(d.turmaId)?.nome || "—")} · ${turma(d.turmaId) ? turma(d.turmaId).dias.map((x) => DIAS[x]).join(" e ") + " " + turma(d.turmaId).inicio : ""}</span><br>
        <span class="muted">Van: ${d.usaVan ? esc(d.pontoVan) : "não"}</span></p>
      </div>`,
  };

  const coletar = () => {
    const v = (id) => $("#" + id)?.value.trim() ?? "";
    if (passo === 0) Object.assign(d, { respNome: v("m-resp"), parentesco: v("m-par"), respTel: v("m-tel") });
    if (passo === 1) Object.assign(d, { alunoNome: v("m-aluno"), nascimento: v("m-nasc"), escola: v("m-escola"), serie: v("m-serie") });
    if (passo === 2) d.projetoId = v("m-proj");
    if (passo === 3) d.pontoVan = d.usaVan ? v("m-ponto") : "";
    if (passo === 4) { d.aceiteLgpd = $("#m-lgpd").checked; d.autorizaImagem = $("#m-img").checked; }
  };
  const validar = () => {
    if (passo === 0) {
      if (d.respNome.length < 3) return "Informe o nome do responsável.";
      if (d.respTel.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido com DDD.";
    }
    if (passo === 1) {
      if (d.alunoNome.split(/\s+/).length < 2) return "Informe o nome completo do aluno.";
      if (!d.nascimento || parseData(d.nascimento) >= hoje()) return "Informe a data de nascimento.";
    }
    if (passo === 2 && !d.turmaId) return "Escolha a turma.";
    if (passo === 4 && !d.aceiteLgpd) return "É preciso aceitar o termo de uso de dados.";
    return "";
  };

  const renderTurmas = () => {
    const box = $("#m-turmas");
    if (!box) return;
    const ts = TURMAS.filter((t) => t.projeto === d.projetoId && !t.ensaio);
    box.innerHTML = !d.projetoId ? "" : ts.length ? ts.map((t) => `<button type="button" class="turma-op ${d.turmaId === t.id ? "on" : ""}" data-turma="${t.id}">
        <b>${esc(t.nome)}</b><span>${t.dias.map((x) => DIAS_LONGOS[x]).join(" e ")} · ${t.inicio}–${t.fim}</span>
        <span>${esc(t.local)}</span><em>${t.vagas == null ? "Inscrições abertas" : t.vagas > 0 ? `${t.vagas} vaga${t.vagas > 1 ? "s" : ""}` : "Lista de espera"}</em></button>`).join("")
      : `<p class="muted small">Sem turmas abertas neste projeto. Fale com a secretaria.</p>`;
    box.querySelectorAll("[data-turma]").forEach((b) => b.addEventListener("click", () => { d.turmaId = b.dataset.turma; renderTurmas(); }));
  };

  const render = () => {
    view.innerHTML = `
      <div class="passos">${PASSOS.map((p, i) => `<span class="${i < passo ? "feito" : i === passo ? "atual" : ""}"><i>${i < passo ? icon("check") : i + 1}</i><small>${p}</small></span>`).join("")}</div>
      <div class="trilha-prog"><i style="width:${(passo / (PASSOS.length - 1)) * 100}%"></i>${serra("serra-prog")}</div>
      <h2 class="passo-tit">${["Quem é o responsável?", "Sobre o aluno", "Escolha a turma", "Transporte", "Termos e confirmação"][passo]}</h2>
      <form id="f-mat" novalidate>${campos[passo]()}
        <div class="btn-row mt-16" style="margin-top:24px">
          ${passo > 0 ? `<button type="button" class="btn ghost" id="m-voltar">${icon("chevL")}</button>` : ""}
          <button type="submit" class="btn gold" style="flex:1">${passo < PASSOS.length - 1 ? "Continuar" : "Enviar matrícula"} ${icon("arrow")}</button>
        </div>
      </form>
      ${modoNote()}`;
    view.scrollTop = 0;
    view.querySelectorAll("[data-bool]").forEach((g) => g.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      d[g.dataset.bool] = b.dataset.v === "1";
      g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      if (g.dataset.bool === "usaVan") $("#m-ponto-wrap").hidden = !d.usaVan;
    })));
    if (passo === 2) {
      renderTurmas();
      $("#m-proj").addEventListener("change", (e) => { d.projetoId = e.target.value; d.turmaId = ""; renderTurmas(); });
    }
    $("#m-voltar")?.addEventListener("click", () => { coletar(); passo--; render(); });
    $("#f-mat").addEventListener("submit", async (e) => {
      e.preventDefault();
      coletar();
      const erro = validar();
      if (erro) return toast(erro);
      if (passo < PASSOS.length - 1) { passo++; return render(); }
      const btn = e.submitter || e.target.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const protocolo = await DB.solicitarMatricula(d);
        sucesso("Inscrição enviada!", `Protocolo <b style="color:var(--gold)">${esc(protocolo)}</b>.<br>A secretaria vai conferir os dados e confirmar a vaga de <b>${esc(d.alunoNome.split(" ")[0])}</b> pelo WhatsApp. Depois da matrícula, você recebe o código para acompanhar pelo app.`);
      } catch (err) { btn.disabled = false; toast(err.message); }
    });
  };
  render();
}

/* ----- Login por usuário e senha ----- */
function telaPedirLogin(motivo, voltar) {
  view.innerHTML = `
    <div class="auth">
      <div class="auth-serra">${serra()}</div>
      <img class="auth-logo" src="icons/logo-transparente.png" alt="Instituto Cultural das Montanhas">
      <h2>Entrar</h2>
      <p class="sub">${esc(motivo)}</p>
      <div class="seg" style="margin-bottom:18px">
        <button type="button" class="on" data-modo="familia">Família</button>
        <button type="button" data-modo="van">Motorista</button>
      </div>
      <form id="f-login" novalidate>
        <div data-campos="familia">
          <div class="input-wrap">${icon("user")}<input id="l-matricula" autocapitalize="characters" spellcheck="false" autocomplete="off" placeholder="Matrícula do aluno" maxlength="40"></div>
          <div class="input-wrap">${icon("lock")}<input id="l-codigo" type="password" autocapitalize="characters" spellcheck="false" autocomplete="off" placeholder="Código de acesso" maxlength="40"></div>
          <label class="check mt-12"><input type="checkbox" id="l-lembrar"><span>Manter neste aparelho. Só marque se o celular for seu.</span></label>
          <p class="small muted" style="margin:12px 0 0">O código é o mesmo do Portal da Família. Não tem? <a href="${waLink("Olá! Preciso do código de acesso do app do Instituto.")}" target="_blank" rel="noopener noreferrer">Peça à secretaria</a>.</p>
        </div>
        <div data-campos="van" hidden>
          <div class="input-wrap">${icon("user")}<input id="l-usuario" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="E-mail" maxlength="254"></div>
          <div class="input-wrap">${icon("lock")}<input id="l-senha" type="password" autocomplete="current-password" placeholder="Senha" maxlength="128"></div>
        </div>
        <button class="btn block" type="submit" style="margin-top:22px">Entrar ${icon("arrow")}</button>
      </form>
      ${DB.modo === "demo" ? protoNote("Demonstração: qualquer matrícula e código entram com a família de exemplo.") : ""}
    </div>`;
  let modoLogin = "familia";
  view.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
    modoLogin = b.dataset.modo;
    view.querySelectorAll("[data-modo]").forEach((x) => x.classList.toggle("on", x === b));
    view.querySelectorAll("[data-campos]").forEach((c) => { c.hidden = c.dataset.campos !== modoLogin; });
  }));
  $("#f-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector("[type=submit]");
    btn.disabled = true;
    const senha = modoLogin === "familia" ? $("#l-codigo") : $("#l-senha");
    try {
      if (modoLogin === "familia") await DB.entrarFamilia($("#l-matricula").value, senha.value, $("#l-lembrar").checked);
      else await DB.entrar($("#l-usuario").value, senha.value);
      senha.value = "";
      await carregarSessao();
      toast("Bem-vindo(a)!");
      if (location.hash === `#/${voltar}`) render(); else location.hash = `#/${voltar}`;
    } catch (err) {
      btn.disabled = false;
      senha.value = "";
      senha.focus();
      toast(err.message);
    }
  });
}

/* ----- Perfil ----- */
function telaPerfil() {
  if (!USUARIO) return telaPedirLogin("Entre para ver seus alunos, carteirinhas e matrículas.", "perfil");
  view.innerHTML = `
    <div class="perfil-topo">${serra("serra-perfil")}<img src="icons/logo-transparente.png" alt="Instituto Cultural das Montanhas"></div>
    ${ehEquipe() ? `<div class="card gold"><span class="eyebrow">Acesso da equipe</span><div style="font-weight:800;margin-top:6px">${PAPEL === "coordenacao" ? "Coordenação" : "Transporte"}</div><p class="small muted" style="margin:4px 0 12px">Você vê a van em tempo real e pode iniciar e encerrar as rotas.</p><a class="btn gold block" href="#/van">${icon("bus")} Operar a van</a></div>` : ""}
    <section class="section">
      <div class="section-head"><h2>Meus alunos</h2></div>
      ${ALUNOS.length ? ALUNOS.map((a) => `
        <div class="id-card mb-14">
          ${serra("serra-id")}
          <div class="id-top"><span class="eyebrow">Carteirinha digital</span><span class="chip ${a.status === "ativa" ? "gold" : ""}">${a.status === "ativa" ? "Ativa" : "Em análise"}</span></div>
          <h3>${esc(a.nome)}</h3>
          <div class="id-sub">${a.turmas.map((t) => esc(turma(t)?.nome || "")).join(" · ")}</div>
          <div class="id-bottom"><div><small>Matrícula</small><b>${esc(a.matricula)}</b>${a.usaVan ? `<small style="margin-top:10px">Van</small><b style="color:var(--text)">${esc(a.pontoVan)}</b>` : ""}</div>
          ${a.status === "ativa" ? `<div class="qr" aria-label="QR da carteirinha">${qrFake(a.matricula)}</div>` : ""}</div>
        </div>`).join("") : `<p class="muted small">Nenhum aluno cadastrado.</p>`}
      <a class="btn gold block" href="#/matricula">${icon("pen")} Nova matrícula</a>
      ${ehEquipe() ? "" : `<a class="btn ghost block" style="margin-top:12px" href="#/entrar">${icon("people")} Adicionar outro aluno</a>`}
    </section>
    <section class="section">
      <div class="section-head"><h2>Instituto</h2></div>
      <div class="list">
        <a href="#/sobre"><span class="li-ico">${icon("mountain")}</span><div class="li-txt"><strong>O Instituto</strong><span>História, montanhas, equipe e transparência</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#/projetos"><span class="li-ico">${icon("music")}</span><div class="li-txt"><strong>Projetos</strong><span>Cultura e esporte</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#/noticias"><span class="li-ico">${icon("news")}</span><div class="li-txt"><strong>Notícias</strong><span>Direto do blog do Instituto</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#/doar"><span class="li-ico">${icon("heart")}</span><div class="li-txt"><strong>Doar</strong><span>PIX, FIA e Nota Premiada</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#/ouvidoria"><span class="li-ico">${icon("chat")}</span><div class="li-txt"><strong>Ouvidoria</strong><span>Elogios, dúvidas e reclamações</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#/privacidade"><span class="li-ico">${icon("shield")}</span><div class="li-txt"><strong>Privacidade e segurança</strong><span>Como protegemos os seus dados</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#" data-sair><span class="li-ico">${icon("logout")}</span><div class="li-txt"><strong>Sair</strong><span>${esc(USUARIO.email || "Sair deste aparelho")}</span></div>${icon("chev", 'class="chev"')}</a>
      </div>
    </section>
    ${modoNote()}`;
  view.querySelector("[data-sair]").addEventListener("click", async (e) => {
    e.preventDefault();
    await DB.sair(); await carregarSessao();
    toast("Você saiu da sua conta."); location.hash = "#/inicio";
  });
}

/* ----- Projetos, notícias, doação, ouvidoria (conteúdo público) ----- */
function telaProjetos(params) {
  let area = params.get("area") || "todos";
  const render = () => {
    const visiveis = PROJETOS.filter((p) => !p.oculto);
    const areas = ["todos", ...new Set(visiveis.map((p) => p.area))];
    if (!areas.includes(area)) area = "todos";
    const lista = visiveis.filter((p) => area === "todos" || p.area === area);
    view.innerHTML = `
      <div class="seg">${areas.map((a) => `<button class="${a === area ? "on" : ""}" data-area="${esc(a)}">${esc(a === "todos" ? "Todos" : areaNome(a))}</button>`).join("")}</div>
      <div class="proj-list">${lista.map((p) => `<a class="proj-row" href="#/projeto/${p.id}">
          <img src="${esc(p.foto)}" alt="" loading="lazy">
          <div><span class="chip ${p.novo ? "gold" : ""}">${esc(p.tag)}</span><strong>${esc(p.nome)}</strong><p>${esc(p.resumo)}</p></div></a>`).join("")}</div>
      ${protoNote("Todos os projetos são <b>gratuitos</b>. A matrícula organiza as turmas e o transporte.")}`;
    view.querySelectorAll("[data-area]").forEach((b) => b.addEventListener("click", () => { area = b.dataset.area; render(); }));
  };
  render();
}

function telaProjeto(id) {
  const p = projeto(id);
  if (!p) return naoEncontrado();
  const ts = TURMAS.filter((t) => t.projeto === p.id);
  view.innerHTML = `
    <div class="cover"><img src="${esc(p.foto)}" alt="">${serra("serra-cover")}
      <div class="cv-body"><span class="chip outline">${esc(p.tag)}</span><h2>${esc(p.nome)}</h2></div></div>
    <p style="color:var(--text-2)">${esc(p.texto)}</p>
    <div class="info-list mt-16">
      ${p.publico ? `<div>${icon("people")}<div><small>Público</small><span>${esc(p.publico)}</span></div></div>` : ""}
      ${p.local ? `<div>${icon("pin")}<div><small>Local</small><span>${esc(p.local)}</span></div></div>` : ""}
    </div>
    ${ts.length ? `<section class="section"><div class="section-head"><h2>Turmas e horários</h2></div>
      ${ts.map((t) => `<div class="aula"><div class="aula-hora"><strong>${t.inicio}</strong><span>${t.fim}</span></div><div class="aula-body"><h3>${esc(t.nome)}</h3><p>${icon("calendar")} ${t.dias.map((x) => DIAS_LONGOS[x]).join(" e ")}</p><p>${icon("pin")} ${esc(t.local)}</p>${t.professor ? `<p>${icon("user")} ${esc(t.professor)}</p>` : ""}</div></div>`).join("")}</section>` : ""}
    <div class="btn-row" style="margin-top:26px">
      <a class="btn gold block" href="#/matricula?projeto=${p.id}">Fazer matrícula ${icon("arrow")}</a>
      <a class="btn ghost block" href="${waLink(`Olá! Gostaria de saber mais sobre o projeto ${p.nome}.`)}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")} Tirar dúvidas</a>
    </div>
    <section class="section" id="proj-news-sec"><div class="section-head"><h2>Notícias do projeto</h2></div><div id="proj-news" class="news-list">${skeletonNews(2)}</div></section>`;
  if (!CATEGORIAS[p.categoria]) return $("#proj-news-sec").remove();
  buscarNoticias({ categoria: p.categoria, limit: 3 }).then((posts) => {
    const box = $("#proj-news"); if (!box) return;
    if (!posts.length) $("#proj-news-sec").remove(); else box.innerHTML = posts.map(newsItem).join("");
  }).catch(() => $("#proj-news-sec")?.remove());
}

function telaNoticias() {
  let cat = "";
  const cats = ["", "geral", "orquestra-jonice-tristao", "corais-das-montanhas", "musicalizacao-agricola", "scfv", "voleibol-feminino", "artes-marciais", "basquete"];
  view.innerHTML = `<div class="chips-scroll">${cats.map((c) => `<button class="${c === cat ? "on" : ""}" data-cat="${c}">${c ? catNome(c) : "Todas"}</button>`).join("")}</div><div id="news-box" class="news-list"></div>`;
  const carregar = async () => {
    const box = $("#news-box");
    box.innerHTML = skeletonNews(5);
    try {
      const posts = await buscarNoticias({ categoria: cat, limit: 20 });
      if (!$("#news-box")) return;
      box.innerHTML = posts.length ? newsFeature(posts[0]) + posts.slice(1).map(newsItem).join("") : `<p class="muted">Sem notícias nesta categoria.</p>`;
    } catch { box.innerHTML = `<p class="muted">Não foi possível carregar as notícias.</p>`; }
  };
  view.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    cat = b.dataset.cat;
    view.querySelectorAll("[data-cat]").forEach((x) => x.classList.toggle("on", x === b));
    carregar();
  }));
  carregar();
}

async function telaNoticia(slug) {
  view.innerHTML = `<div class="skeleton" style="height:240px;margin:-8px -18px 0;border-radius:0"></div><div class="skeleton mt-16" style="height:28px"></div><div class="skeleton mt-12" style="height:160px"></div>`;
  const hashAtual = location.hash;
  try {
    const p = await buscarNoticia(slug);
    if (location.hash !== hashAtual) return;
    view.innerHTML = `<article class="article">
      ${p.capa_url ? `<div class="article-cover"><img src="${esc(absUrl(p.capa_url))}" alt=""></div>` : ""}
      <div class="news-meta" style="margin-top:14px"><span class="cat">${esc(catNome(p.categoria))}</span><span>${fmtData(p.publicado_em)}</span></div>
      <h1>${esc(p.titulo)}</h1>
      ${p.resumo ? `<p class="lead">${esc(p.resumo)}</p>` : ""}
      <div class="body">${sanitize(p.conteudo || "")}</div>
      <button class="btn block mt-16" id="btn-share">Compartilhar ${icon("arrow")}</button></article>`;
    $("#btn-share").addEventListener("click", async () => {
      const url = `${SITE}/blog-post.html?slug=${encodeURIComponent(slug)}`;
      if (navigator.share) { try { await navigator.share({ title: p.titulo, url }); } catch { /* cancelado */ } } else copiar(url, "Link copiado!");
    });
  } catch { view.innerHTML = `<div class="success"><div class="ok">${icon("news")}</div><h2>Ops!</h2><p class="muted">Não conseguimos abrir esta notícia.</p></div>`; }
}

function telaDoar() {
  view.innerHTML = `
    <section class="hero hero-serra" style="min-height:220px">
      <img src="${img("orquestra-1.jpg")}" alt="">
      <span class="eyebrow">Faça parte dessa história</span>
      <h2>Uma oportunidade pode <em>mudar uma vida.</em></h2>
      ${serra("serra-hero")}
    </section>
    <section class="card section">
      <span class="eyebrow">Doe pelo PIX</span>
      <div style="font-weight:800;margin-top:8px">${INSTITUTO.nome}</div>
      <div class="pix-box"><code>${INSTITUTO.cnpj}</code><button class="icon-btn" id="btn-pix" aria-label="Copiar chave PIX" style="color:var(--gold)">${icon("copy")}</button></div>
      <p class="small muted" style="margin:0">Chave PIX: CNPJ. No app do seu banco, cole a chave, informe o valor e <b style="color:var(--text-2)">confira o nome do Instituto antes de confirmar</b>. O Instituto nunca pede doação por outra chave.</p>
    </section>
    <section class="section">
      <div class="section-head"><h2>Outras formas de apoiar</h2></div>
      <div class="list">
        <a href="#" data-info="fia"><span class="li-ico">${icon("star")}</span><div class="li-txt"><strong>FIA — Imposto de Renda</strong><span>Destine parte do seu IR à infância</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="#" data-info="nota"><span class="li-ico">${icon("doc")}</span><div class="li-txt"><strong>Nota Premiada Capixaba</strong><span>CPF na nota apoia o Instituto</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="${waLink("Olá! Tenho interesse em ser patrocinador do Instituto.")}" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("people")}</span><div class="li-txt"><strong>Seja patrocinador</strong><span>Empresas e leis de incentivo</span></div>${icon("chev", 'class="chev"')}</a>
      </div>
    </section>`;
  $("#btn-pix").addEventListener("click", () => copiar(INSTITUTO.cnpj.replace(/\D/g, ""), "Chave PIX copiada!"));
  view.querySelectorAll("[data-info]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    if (el.dataset.info === "fia") sheet(`<h3>FIA · Infância e adolescência</h3><p class="muted">A destinação de parte do Imposto de Renda aos Fundos dos Direitos da Criança e do Adolescente fortalece iniciativas como as do Instituto, conforme as regras aplicáveis. Siga as orientações do CMDCA de Afonso Cláudio.</p><button class="btn block mt-16" data-close>Entendi</button>`);
    else sheet(`<h3>Nota Premiada Capixaba</h3><p class="muted">Cadastre-se no programa e escolha <b style="color:var(--text)">Instituto Tres Pontoes de Acao Social e Cultural - Instituto Cultural das Montanhas</b> como entidade apoiada. Depois, é só pedir CPF na nota.</p><button class="btn block mt-16" data-close>Entendi</button>`);
  }));
}

function telaOuvidoria() {
  view.innerHTML = `
    <div class="auth" style="justify-content:flex-start;padding-top:4px">
      <h2>Fale com o Instituto</h2>
      <p class="sub">Elogios, sugestões, dúvidas ou reclamações. Todas as mensagens são lidas pela coordenação.</p>
      <form id="f-ouv" novalidate>
        <div class="field"><label>Tipo de mensagem</label><div class="pills" data-pills>${["Elogio", "Sugestão", "Dúvida", "Reclamação"].map((t, i) => `<button type="button" class="${i === 0 ? "on" : ""}">${t}</button>`).join("")}</div></div>
        <div class="field"><label>Quer se identificar?</label><div class="seg"><button type="button" class="on" data-id="sim">Sim</button><button type="button" data-id="nao">Anônimo</button></div></div>
        <div id="ident-campos">
          <div class="field"><label for="o-nome">Nome</label><input id="o-nome" maxlength="120"></div>
          <div class="field"><label for="o-cont">E-mail ou telefone</label><input id="o-cont" maxlength="120"></div>
        </div>
        <div class="field"><label for="o-msg">Mensagem</label><textarea id="o-msg" maxlength="2000"></textarea></div>
        <button class="btn gold block" type="submit">Enviar mensagem ${icon("arrow")}</button>
      </form>
      <section class="section">
        <div class="section-head"><h2>Outros canais</h2></div>
        <div class="list">
          <a href="${waLink("Olá, tudo bem? Gostaria de saber mais sobre o Instituto Cultural das Montanhas")}" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("whatsapp")}</span><div class="li-txt"><strong>WhatsApp</strong><span>${INSTITUTO.telefone}</span></div>${icon("chev", 'class="chev"')}</a>
          <a href="mailto:${INSTITUTO.ouvidoria}"><span class="li-ico">${icon("mail")}</span><div class="li-txt"><strong>E-mail da ouvidoria</strong><span>${INSTITUTO.ouvidoria}</span></div>${icon("chev", 'class="chev"')}</a>
          <a href="${INSTITUTO.instagram}" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("instagram")}</span><div class="li-txt"><strong>Instagram</strong><span>@institutodasmontanhas</span></div>${icon("chev", 'class="chev"')}</a>
          <div class="li"><span class="li-ico">${icon("pin")}</span><div class="li-txt"><strong>Sede</strong><span>${INSTITUTO.endereco}</span></div></div>
        </div>
      </section>
      ${protoNote("Protótipo: a mensagem não é enviada. Na versão final, usa a mesma ouvidoria do site.")}
    </div>`;
  view.querySelectorAll("[data-pills] button").forEach((b, _, all) => b.addEventListener("click", () => all.forEach((x) => x.classList.toggle("on", x === b))));
  view.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => {
    view.querySelectorAll("[data-id]").forEach((x) => x.classList.toggle("on", x === b));
    $("#ident-campos").hidden = b.dataset.id === "nao";
  }));
  $("#f-ouv").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!$("#o-msg").value.trim()) return toast("Escreva sua mensagem.");
    sucesso("Mensagem recebida!", "Obrigado por falar com a gente. A coordenação vai ler e, se você se identificou, responder em breve.");
  });
}

function telaSobre() {
  const maxB = BAIRROS_ATENDIDOS[0][1];
  view.innerHTML = `
    <section class="hero hero-serra" style="min-height:250px">
      <img src="${img("coral-1.jpg")}" alt="">
      <span class="eyebrow">Desde 16 de agosto de 2021</span>
      <h2>Nas trilhas da cultura, <em>guiamos cada passo.</em></h2>
      ${serra("serra-hero")}
    </section>
    <p style="color:var(--text-2);margin-top:22px">Fundado em Afonso Cláudio, o Instituto Cultural das Montanhas cria oportunidades reais para quem mais precisa, unindo cultura, esporte e educação. A razão social homenageia um dos símbolos da região: <b style="color:var(--text)">Instituto Três Pontões de Ação Social e Cultural</b>.</p>

    <section class="section"><div class="list">
      <div class="li"><span class="li-ico">${icon("compass")}</span><div class="li-txt"><strong>Missão</strong><span>${esc(INSTITUTO.missao)}</span></div></div>
      <div class="li"><span class="li-ico">${icon("mountain")}</span><div class="li-txt"><strong>Visão</strong><span>${esc(INSTITUTO.visao)}</span></div></div>
      <div class="li"><span class="li-ico">${icon("heart")}</span><div class="li-txt"><strong>Valores</strong><span>${esc(INSTITUTO.valores)}</span></div></div>
    </div></section>

    <section class="section">
      <div class="section-head"><h2>Nossas montanhas</h2></div>
      ${MONTANHAS.map((m) => `<div class="mont-linha">${icon("mountain")}<div><b>${esc(m.nome)}</b><p>${esc(m.texto)}</p></div></div>`).join("")}
    </section>

    <section class="section">
      <div class="section-head"><h2>A escalada até aqui</h2></div>
      <div class="escalada">${LINHA_DO_TEMPO.map((t, i) => `<div class="degrau" style="--n:${i}"><strong>${t.ano}</strong>${t.marcos.map((m) => `<p>${esc(m)}</p>`).join("")}</div>`).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Quem atendemos</h2></div>
      <div class="stats">
        <div class="stat"><strong>494</strong><span>alunos em 2025</span></div>
        <div class="stat"><strong>100%</strong><span>de escola pública</span></div>
        <div class="stat"><strong>42%</strong><span>com CadÚnico</span></div>
        <div class="stat"><strong>67,6%</strong><span>usam o transporte</span></div>
      </div>
      <div class="card mt-16"><span class="eyebrow">Alunos por bairro</span>
        <div class="barras-h">${BAIRROS_ATENDIDOS.map(([b, n]) => `<div><span>${esc(b)}</span><i style="width:${(n / maxB) * 100}%"></i><b>${n}</b></div>`).join("")}</div></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Parceiros</h2></div>
      <div class="parceiros">${PARCEIROS.map((p) => `<span>${esc(p)}</span>`).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Transparência</h2></div>
      <div class="list">
        <a href="${SITE}/transparencia.html" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("doc")}</span><div class="li-txt"><strong>Documentos e termos de fomento</strong><span>Estatuto, atas, certificados e contas</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="${SITE}/perfil-dos-atendidos.html" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("people")}</span><div class="li-txt"><strong>Perfil dos atendidos</strong><span>Dados sociais completos</span></div>${icon("chev", 'class="chev"')}</a>
        <a href="${SITE}/assets/docs/relatorio-anual-2025.pdf" target="_blank" rel="noopener noreferrer"><span class="li-ico">${icon("book")}</span><div class="li-txt"><strong>Relatório anual 2025</strong><span>Conquistas e números do ano</span></div>${icon("chev", 'class="chev"')}</a>
      </div>
    </section>
    <div class="rodape-serra">${serra()}<p><b>${INSTITUTO.razao}</b><br>CNPJ ${INSTITUTO.cnpj}<br>${INSTITUTO.endereco}</p></div>`;
}

function telaPrivacidade() {
  view.innerHTML = `
    <div class="auth" style="justify-content:flex-start;padding-top:4px">
      <h2>Privacidade e segurança</h2>
      <p class="sub">Como o app protege os dados das famílias e dos alunos.</p>
      <div class="list">
        <div class="li"><span class="li-ico">${icon("lock")}</span><div class="li-txt"><strong>Acesso por código</strong><span>Cada aluno tem um código próprio, entregue pela secretaria. A secretaria pode trocá-lo a qualquer momento, e tentativas erradas bloqueiam o acesso por 15 minutos.</span></div></div>
        <div class="li"><span class="li-ico">${icon("shield")}</span><div class="li-txt"><strong>Cada família vê só o que é seu</strong><span>O próprio banco de dados confere o código e entrega só as informações daquele aluno, mesmo por fora do app.</span></div></div>
        <div class="li"><span class="li-ico">${icon("doc")}</span><div class="li-txt"><strong>Dados mínimos</strong><span>Pedimos só o necessário. CadÚnico é apenas sim/não; não coletamos CPF, NIS ou documentos pelo app.</span></div></div>
        <div class="li"><span class="li-ico">${icon("bus")}</span><div class="li-txt"><strong>Van sem histórico</strong><span>Só a posição atual, só durante a rota e só para famílias de alunos que usam o transporte.</span></div></div>
        <div class="li"><span class="li-ico">${icon("people")}</span><div class="li-txt"><strong>Imagem só com autorização</strong><span>O uso de foto ou vídeo do aluno depende de autorização separada e opcional.</span></div></div>
        <div class="li"><span class="li-ico">${icon("mail")}</span><div class="li-txt"><strong>Seus direitos (LGPD)</strong><span>Peça acesso, correção ou exclusão dos dados pela ouvidoria: ${INSTITUTO.ouvidoria}</span></div></div>
      </div>
    </div>`;
}

function sucesso(titulo, texto, href = "#/inicio", rotulo = "Voltar ao início", ico = "check") {
  view.innerHTML = `<div class="auth"><div class="success"><div class="ok">${icon(ico)}</div><h2>${titulo}</h2><p class="muted">${texto}</p>
    <a class="btn block" style="margin-top:24px" href="${href}">${rotulo}</a></div></div>`;
}
function naoEncontrado() { sucesso("Trilha não encontrada", "Este endereço não existe no app.", "#/inicio", "Voltar ao início", "compass"); }

// QR decorativo (não é um QR real; na versão final vem um QR assinado pelo servidor).
function qrFake(seed) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = 21; let rects = "";
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#1b1d21"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#eceef1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#1b1d21"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
    h = (h * 1103515245 + 12345) >>> 0;
    if ((h >>> 16) & 1) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><g fill="#1b1d21">${rects}</g>${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}</svg>`;
}

/* ---------- Avisos (sino) ---------- */
$("#btn-avisos").addEventListener("click", () => {
  $("#btn-avisos .dot")?.remove();
  const prox = APRESENTACOES.find((a) => parseData(a.data) >= hoje());
  sheet(`<h3>Avisos</h3><div class="list">
    <div class="li"><span class="li-ico">${icon("star")}</span><div class="li-txt"><strong>Hidroginástica 60+</strong><span>Inscrições abertas para aulas gratuitas.</span></div></div>
    ${prox ? `<div class="li"><span class="li-ico">${icon("music")}</span><div class="li-txt"><strong>${esc(prox.titulo)}</strong><span>${fmtData(prox.data)} · ${esc(prox.local)}</span></div></div>` : ""}
    <div class="li"><span class="li-ico">${icon("calendar")}</span><div class="li-txt"><strong>Reunião de pais</strong><span>28 de novembro, 14h, na sede.</span></div></div>
  </div><button class="btn block mt-16" style="margin-top:20px" data-close>Fechar</button>`);
});

view.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lembrar]");
  if (b) { b.style.color = "var(--gold)"; toast("Lembrete criado: " + b.dataset.lembrar); }
});

/* ---------- Roteador ---------- */
const ABAS = ["inicio", "aulas", "calendario", "van", "perfil"];
const TITULOS = { projeto: "", projetos: "Projetos", noticia: "Notícia", noticias: "Notícias", doar: "Doar", ouvidoria: "Ouvidoria", sobre: "O Instituto", matricula: "Matrícula", privacidade: "Privacidade", entrar: "Entrar" };
const MAE = { projeto: "inicio", projetos: "inicio", noticia: "inicio", noticias: "inicio", matricula: "perfil", doar: "inicio", ouvidoria: "perfil", sobre: "perfil", privacidade: "perfil", entrar: "perfil" };

function render() {
  if (pararVan) { pararVan(); pararVan = null; }
  clearTimeout(pararPainel);
  const hash = location.hash.replace(/^#\/?/, "") || "inicio";
  const [caminho, query = ""] = hash.split("?");
  const [rota, param] = caminho.split("/");
  const params = new URLSearchParams(query);
  const ehAba = ABAS.includes(rota);

  $("#btn-voltar").hidden = ehAba;
  $("#brand").hidden = !ehAba;
  $("#topbar-title").hidden = ehAba;
  $("#topbar-title").textContent = TITULOS[rota] ?? "";
  const abaAtiva = ehAba ? rota : MAE[rota] || "";
  document.querySelectorAll("#tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === abaAtiva));
  view.classList.toggle("sem-pad", rota === "van");

  const telas = {
    inicio: telaInicio, aulas: telaAulas, calendario: () => telaCalendario(params), van: telaVan, perfil: telaPerfil,
    projetos: () => telaProjetos(params), projeto: () => telaProjeto(param),
    matricula: () => telaMatricula(params), noticias: telaNoticias, noticia: () => telaNoticia(decodeURIComponent(param || "")),
    doar: telaDoar, ouvidoria: telaOuvidoria, sobre: telaSobre, privacidade: telaPrivacidade,
    entrar: () => telaPedirLogin("Digite a matrícula e o código do outro aluno.", "perfil"),
  };
  (telas[rota] || naoEncontrado)();
  view.scrollTop = 0;
  view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
}

// Sem zoom de pinça na página (o iPhone ignora user-scalable=no). O mapa continua com zoom próprio.
["gesturestart", "gesturechange", "gestureend"].forEach((ev) =>
  document.addEventListener(ev, (e) => { if (!e.target.closest?.(".leaflet-container")) e.preventDefault(); }, { passive: false }));
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1 && !e.target.closest(".leaflet-container")) e.preventDefault();
}, { passive: false });

$("#btn-voltar").addEventListener("click", () => { if (history.length > 1) history.back(); else location.hash = "#/inicio"; });
window.addEventListener("hashchange", render);

// Abertura: "Transformando vidas em 3 2 1 . . ." e só então mostra o app.
function contagemAbertura() {
  return new Promise((pronto) => {
    const num = $("#contagem");
    if (!num) return pronto();
    let n = 3;
    const passo = () => {
      n--;
      num.textContent = n;
      num.style.animation = "none"; void num.offsetWidth; num.style.animation = "";
      if (n > 1) return setTimeout(passo, 650);
      num.insertAdjacentHTML("afterend", " <i>.</i> <i>.</i> <i>.</i>");
      setTimeout(pronto, 1300);
    };
    setTimeout(passo, 750);
  });
}

Promise.all([DB.carregarPublico().finally(carregarSessao).finally(render), contagemAbertura()])
  .finally(() => $("#splash")?.classList.add("hide"));

if ("serviceWorker" in navigator && location.protocol === "https:") {
  // Procura versão nova ao abrir e sempre que o app volta para a tela;
  // quando a versão nova assume, recarrega uma vez.
  const haviaControle = Boolean(navigator.serviceWorker.controller);
  let recarregou = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (haviaControle && !recarregou) { recarregou = true; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}
