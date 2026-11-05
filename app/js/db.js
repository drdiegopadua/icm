/*
 * Acesso a dados: tudo vem do banco do Sistema ICM.
 *   Público (projetos, turmas, calendário, apresentações): função app_publico.
 *   Família: matrícula + código (o mesmo do Portal da Família): função app_familia.
 *   Quem opera a van: e-mail e senha do Sistema ICM.
 * Sem banco (?demo): dados fictícios de data.js; o estado fica no sessionStorage.
 */
const DB = (() => {
  const temSupabase = Boolean(APP_CONFIG.usarSupabase && APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey && window.supabase);
  const sb = temSupabase
    ? window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
        // Chave própria: entrar ou sair aqui não mexe na sessão do Sistema ICM no mesmo navegador.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce", storageKey: "icmapp-auth" },
      })
    : null;

  const sess = {
    get(k, def) { try { const v = sessionStorage.getItem("icmapp_" + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { v === null ? sessionStorage.removeItem("icmapp_" + k) : sessionStorage.setItem("icmapp_" + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };
  const local = {
    get(k, def) { try { const v = localStorage.getItem("icmapp_" + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { v === null ? localStorage.removeItem("icmapp_" + k) : localStorage.setItem("icmapp_" + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };

  const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
  const limpar = (v, max = 120) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  // Freio no aparelho contra tentativas seguidas; o limite de verdade é do banco.
  let falhas = 0, bloqueadoAte = 0;
  const conferirFreio = () => {
    if (Date.now() < bloqueadoAte) throw new Error(`Muitas tentativas. Aguarde ${Math.ceil((bloqueadoAte - Date.now()) / 1000)} s.`);
  };
  const contarFalha = () => { falhas++; if (falhas >= 5) bloqueadoAte = Date.now() + 60000 * Math.min(falhas - 4, 10); };

  const ALUNO_PADRAO = {
    id: "demo-aluno-1", nome: "Aluno(a) Exemplo", matricula: "ICM-2026-0147",
    usaVan: true, pontoVan: "Colina do Cruzeiro",
    turmas: ["ojt-violino-b", "ojt-ensaio"], status: "ativa",
    frequencia: { P: 23, F: 2, J: 0, ano: "2026" }, comunicados: ALUNO_DEMO.avisos.map((a) => ({ titulo: a.titulo, texto: a.texto })),
  };

  /* ----- Dados públicos ----- */
  // Foto, etiqueta e texto de divulgação do site completam o que o projeto ainda não tem no sistema.
  PROJETOS.forEach((p) => { p.categoria = p.id; });
  const VITRINE = PROJETOS.slice();
  const daVitrine = (nome) => {
    const n = norm(nome);
    return VITRINE.find((v) => norm(v.nome) === n) || VITRINE.find((v) => n && (norm(v.nome).includes(n) || n.includes(norm(v.nome)))) || null;
  };
  const substituir = (lista, novos) => { lista.length = 0; lista.push(...novos); };

  function aplicarPublico(d) {
    substituir(PROJETOS, (d.projetos || []).map((p) => {
      const v = daVitrine(p.nome) || {};
      return {
        id: p.id, nome: p.nome, area: p.area, cor: p.cor, novo: Boolean(p.novo), categoria: v.categoria,
        tag: v.tag || areaNome(p.area), foto: p.foto || v.foto || img("criancas-violinos-montanhas.jpg"),
        resumo: p.resumo || v.resumo || "", texto: p.texto || v.texto || p.resumo || "",
        publico: p.publico || v.publico || "", local: p.local || v.local || "",
      };
    }));
    substituir(TURMAS, (d.turmas || []).map((t) => ({ ...t, dias: t.dias || [], professor: "" })));
    substituir(CALENDARIO_LETIVO, (d.calendario || []).map((e) => ({ inicio: e.inicio, fim: e.fim || undefined, titulo: e.titulo, tipo: e.tipo })));
    substituir(APRESENTACOES, (d.apresentacoes || []).map((a) => ({ data: a.data, hora: a.hora || undefined, titulo: a.titulo, grupo: a.grupo || "", local: a.local || "" })));
  }

  /* ----- Famílias: matrícula + código de cada aluno ----- */
  const credenciais = () => [...local.get("familias", []), ...sess.get("familias", [])];
  function guardarCredencial(c, lembrar) {
    const fora = (l) => l.filter((x) => x.m !== c.m);
    local.set("familias", fora(local.get("familias", [])));
    sess.set("familias", fora(sess.get("familias", [])));
    if (lembrar) local.set("familias", [...local.get("familias", []), c]);
    else sess.set("familias", [...sess.get("familias", []), c]);
  }
  function esquecerCredencial(m) {
    local.set("familias", local.get("familias", []).filter((x) => x.m !== m));
    sess.set("familias", sess.get("familias", []).filter((x) => x.m !== m));
  }

  async function dadosFamilia(c) {
    const { data, error } = await sb.rpc("app_familia", { p_matricula: c.m, p_codigo: c.c });
    if (error) throw new Error("Não foi possível falar com o sistema. Tente de novo.");
    if (data.erro) { const e = new Error(data.erro); e.negado = true; throw e; }
    return data;
  }
  function alunoDoBanco(d) {
    // As turmas do aluno trazem o professor e valem mesmo se o projeto estiver fora da lista pública.
    d.turmas.forEach((t) => {
      const i = TURMAS.findIndex((x) => x.id === t.id);
      const nova = { ...t, dias: t.dias || [], professor: t.professor || "" };
      if (i >= 0) TURMAS[i] = { ...TURMAS[i], ...nova }; else TURMAS.push(nova);
    });
    d.projetos.forEach((p) => { if (!PROJETOS.some((x) => x.id === p.id)) PROJETOS.push({ id: p.id, nome: p.nome, oculto: true }); });
    const a = d.aluno;
    return {
      id: a.id, nome: a.nome, matricula: a.matricula, usaVan: a.usa_van, pontoVan: a.ponto_van || "",
      status: a.status === "ativo" ? "ativa" : "pendente", turmas: d.turmas.map((t) => t.id),
      frequencia: d.frequencia, comunicados: d.comunicados,
    };
  }

  return {
    modo: temSupabase ? "supabase" : "demo",

    validarEmail: (e) => EMAIL_RE.test(String(e).trim()),

    // Traz projetos, turmas, calendário e apresentações. Sem internet, usa a última cópia.
    async carregarPublico() {
      if (!sb) return;
      const copia = local.get("publico", null);
      if (copia) aplicarPublico(copia);
      try {
        const espera = new Promise((_, nao) => setTimeout(() => nao(new Error("demorou")), 6000));
        const { data, error } = await Promise.race([sb.rpc("app_publico"), espera]);
        if (error) throw error;
        aplicarPublico(data);
        local.set("publico", data);
      } catch { /* continua com a cópia (ou com o conteúdo do site, na primeira abertura) */ }
    },

    // Família: confere matrícula + código no banco. "lembrar" mantém neste aparelho.
    async entrarFamilia(matricula, codigo, lembrar) {
      const c = { m: limpar(matricula, 40).toUpperCase(), c: limpar(codigo, 40).toUpperCase() };
      if (!c.m || !c.c) throw new Error("Preencha matrícula e código.");
      conferirFreio();
      if (sb) {
        try { await dadosFamilia(c); } catch (e) { if (e.negado) contarFalha(); throw e; }
        falhas = 0;
        guardarCredencial(c, lembrar);
        return { familia: true };
      }
      sess.set("usuario", { nome: "Família Exemplo", email: "" });
      sess.set("saiu", null);
      if (!sess.get("alunos", null)) sess.set("alunos", [ALUNO_PADRAO]);
      return sess.get("usuario", null);
    },

    // Equipe que opera a van: e-mail e senha do Sistema ICM.
    async entrar(email, senha) {
      email = limpar(email, 254).replace(/\s+/g, "").toLowerCase();
      if (!email || !senha) throw new Error("Preencha e-mail e senha.");
      conferirFreio();
      if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido.");
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) {
          contarFalha();
          throw new Error(error.status === 429 ? "Muitas tentativas. Tente mais tarde." : "E-mail ou senha incorretos.");
        }
        falhas = 0;
        const { data: pode } = await sb.rpc("pode_operar_van");
        if (!pode) {
          await sb.auth.signOut();
          throw new Error("Este acesso é só para quem opera a van. A equipe usa o Sistema ICM.");
        }
        return data.user;
      }
      sess.set("usuario", { email, nome: email });
      sess.set("saiu", null);
      sess.set("alunos", []);
      return sess.get("usuario", null);
    },

    /* ----- Rotas da van (quem opera) ----- */
    async rotas() {
      if (!sb) return sess.get("rotas", Object.entries(ROTAS_VAN).map(([id, r]) => ({ id, nome: r.nome, em_andamento: false, iniciada_em: null })));
      const { data, error } = await sb.from("rotas").select("id, nome, em_andamento, iniciada_em").eq("ativa", true).order("nome");
      if (error) throw new Error("Não foi possível carregar as rotas.");
      return data;
    },
    async iniciarRota(id) {
      if (!sb) {
        sess.set("rotas", (await this.rotas()).map((r) => ({ ...r, em_andamento: r.id === id, iniciada_em: r.id === id ? new Date().toISOString() : null })));
        return;
      }
      const { error } = await sb.rpc("iniciar_rota", { p_rota: id });
      if (error) throw new Error(error.message.includes("permiss") ? "Seu usuário não pode iniciar rotas." : "Não foi possível iniciar a rota.");
    },
    async encerrarRota(id) {
      if (!sb) {
        sess.set("rotas", (await this.rotas()).map((r) => ({ ...r, em_andamento: false, iniciada_em: null })));
        return;
      }
      const { error } = await sb.rpc("encerrar_rota", { p_rota: id });
      if (error) throw new Error("Não foi possível encerrar a rota.");
    },
    // Última posição recebida (para conferir se o GPS está chegando).
    async ultimaPosicao() {
      if (!sb) return null;
      const { data } = await sb.from("van_posicao_atual").select("rota_id, atualizado_em").order("atualizado_em", { ascending: false }).limit(1).maybeSingle();
      return data;
    },

    // "transporte" = opera a van; "responsavel" = família.
    async meuPapel() {
      if (!sb) return sess.get("alunos", []).length ? "responsavel" : "transporte";
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return credenciais().length ? "responsavel" : null;
      const { data: pode } = await sb.rpc("pode_operar_van");
      return pode ? "transporte" : null;
    },

    async usuario() {
      if (sb) {
        const { data: s } = await sb.auth.getSession();
        if (s.session) return { email: s.session.user.email, nome: s.session.user.email };
        return credenciais().length ? { email: "", nome: "Família" } : null;
      }
      // Demonstração: entra direto com a família de exemplo (a não ser que tenha saído).
      if (!sess.get("usuario", null) && !sess.get("saiu", false)) {
        sess.set("usuario", { email: "", nome: "Família Exemplo" });
        sess.set("alunos", [ALUNO_PADRAO]);
      }
      return sess.get("usuario", null);
    },

    async sair() {
      if (sb) { await sb.auth.signOut(); local.set("familias", null); sess.set("familias", null); }
      sess.set("usuario", null);
      sess.set("alunos", null);
      sess.set("saiu", true);
    },

    // Alunos da família. Código trocado pela secretaria deixa de valer: sai da lista.
    async meusAlunos() {
      if (!sb) return sess.get("alunos", []);
      const alunos = [];
      for (const c of credenciais()) {
        try { alunos.push(alunoDoBanco(await dadosFamilia(c))); }
        catch (e) { if (e.negado) esquecerCredencial(c.m); }
      }
      return alunos;
    },

    // A inscrição entra na Lista de espera do sistema; a secretaria confere e matricula.
    async solicitarMatricula(d) {
      const dados = {
        aluno_nome: limpar(d.alunoNome), aluno_nascimento: limpar(d.nascimento, 10),
        escola: limpar(d.escola), serie: limpar(d.serie, 40), cad_unico: Boolean(d.cadUnico),
        responsavel_nome: limpar(d.respNome), responsavel_telefone: limpar(d.respTel, 20),
        parentesco: limpar(d.parentesco, 30), turma_id: limpar(d.turmaId, 60),
        usa_van: Boolean(d.usaVan), ponto_van: d.usaVan ? limpar(d.pontoVan, 60) : null,
        autoriza_imagem: Boolean(d.autorizaImagem), aceite_lgpd: Boolean(d.aceiteLgpd),
      };
      if (!dados.aceite_lgpd) throw new Error("É preciso aceitar o termo de uso de dados.");
      if (sb) {
        const { data, error } = await sb.rpc("app_solicitar_matricula", { p: dados });
        if (error) throw new Error("Não foi possível enviar a inscrição. Tente de novo.");
        if (data.erro) throw new Error(data.erro);
        return data.protocolo;
      }
      return "ESP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    },

    /*
     * Posição da van: consulta a cada 8 s. A regra de quem pode ver está no banco
     * (aluno ativo que usa a van, rota em andamento, sinal com menos de 3 minutos).
     * No demo: simula a van andando pelo trajeto real.
     */
    assinarVan(callback, aluno) {
      if (sb) {
        let ativo = true;
        const entregar = (p) => {
          if (!ativo) return;
          const vale = p && p.em_rota && Date.now() - new Date(p.atualizado_em) < 180000;
          callback(vale ? p : { em_rota: false });
        };
        const cred = credenciais().find((c) => aluno && c.m === String(aluno.matricula || "").toUpperCase());
        const consultar = cred
          ? () => sb.rpc("app_van_posicao", { p_matricula: cred.m, p_codigo: cred.c }).then(({ data }) => entregar(data)).catch(() => {})
          : () => sb.from("van_posicao_atual").select("rota_id, lat, lng, atualizado_em, em_rota")
              .order("atualizado_em", { ascending: false }).limit(1).maybeSingle()
              .then(({ data }) => entregar(data)).catch(() => {});
        consultar();
        const timer = setInterval(consultar, 8000);
        return () => { ativo = false; clearInterval(timer); };
      }
      // Demo: anda pela rota iniciada no painel (ou pela rota padrão, se o painel
      // nunca foi usado). Rota encerrada no painel = van fora de rota.
      const tick = () => {
        const rotas = sess.get("rotas", null);
        const andamento = rotas?.find((r) => r.em_andamento);
        if (rotas && !andamento) return callback({ em_rota: false });
        const rotaId = (andamento || { id: ROTA_PADRAO }).id;
        const pts = ROTAS_VAN[rotaId].pontos;
        const ciclo = ROTAS_VAN[rotaId].duracaoSeg * 1000 * 0.25; // acelerado: volta completa em ~6 min
        const f = (Date.now() % ciclo) / ciclo;
        const pos = f * (pts.length - 1);
        const i = Math.floor(pos), t = pos - i;
        const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
        callback({ rota_id: rotaId, lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t, indice: pos, atualizado_em: new Date().toISOString(), em_rota: true });
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    },
  };
})();
