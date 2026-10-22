/* Painel inicial */
(function () {
  const { esc, icon } = UI;

  window.Views = window.Views || {};
  Views.painel = function (el) {
    const eu = Store.sessao();
    const hoje = UI.hojeISO();
    const mes = hoje.slice(0, 7);
    const ativos = Store.filtrar('alunos', (a) => a.status === 'ativo');
    const van = ativos.filter((a) => a.van?.usa).length;
    const turmas = Store.todos('turmas');
    const projetos = Store.todos('projetos');
    const alertas = D.alertas();
    const pend = D.pendencias(mes);
    const proximos = Store.filtrar('eventos', (e) => e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 4);

    let pres = 0, tot = 0;
    Store.filtrar('aulas', (a) => a.data.startsWith(mes)).forEach((a) => Object.values(a.presencas || {}).forEach((v) => { tot++; if (v !== 'F') pres++; }));
    const freqMes = tot ? (pres / tot) * 100 : null;

    const diaSem = new Date().getDay();
    const deHoje = turmas.filter((t) => (t.dias || []).includes(diaSem));
    const hora = new Date().getHours();
    const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

    // frequência dos últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
    const serie = meses.map((m) => {
      let p = 0, t = 0;
      Store.filtrar('aulas', (a) => a.data.startsWith(m)).forEach((a) => Object.values(a.presencas || {}).forEach((v) => { t++; if (v !== 'F') p++; }));
      return [m, t ? (p / t) * 100 : null];
    });

    const kpi = (ic, cor, valor, rot, href) => `
      <a class="painel kpi" href="${href}" style="text-decoration:none">
        <span class="ic" style="background:${cor}33;color:${cor}">${icon(ic)}</span>
        <div><div class="valor">${valor}</div><div class="rot">${rot}</div></div>
      </a>`;

    el.innerHTML = `
      <div class="cabecalho">
        <div class="titulos">
          <h1>${saud}, ${esc(eu.nome.split(' ')[0])}</h1>
          <p class="sub">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <a class="btn quente" href="#/alunos/novo">${icon('mais')}Nova matrícula</a>
      </div>

      <div class="grade g4 kpi-grade">
        ${kpi('alunos', '#f2a541', ativos.length, 'Alunos ativos', '#/alunos')}
        ${kpi('turmas', '#8fb2ff', turmas.length, `Turmas em ${projetos.length} projetos`, '#/turmas')}
        ${kpi('grafico', '#4fc39a', UI.pct(freqMes), `Frequência de ${UI.MESES[+mes.slice(5) - 1].toLowerCase()}`, '#/relatorios')}
        ${kpi('van', '#f0a27f', van, 'Alunos usam a van', '#/alunos?van=1')}
      </div>

      <div class="grade g-lado mt">
        <div>
          <section class="painel">
            <div class="painel-cab"><h2>Alertas de faltas</h2><span class="chip ${alertas.length ? 'risco' : 'ok'}">${alertas.length}</span></div>
            ${alertas.length ? `<div class="lista">${alertas.slice(0, 6).map((a) => `
              <a class="item" href="#/alunos/${a.aluno.id}/frequencia">
                ${UI.avatar(a.aluno.nome)}
                <div class="corpo"><div class="t">${esc(a.aluno.nome)}</div><div class="d">${esc(a.turma?.nome || '')} · última aula ${UI.data(a.ultima)}</div></div>
                <span class="chip ${a.nivel}">${a.seguidas} faltas seguidas</span>
              </a>`).join('')}</div>
              <p class="pequeno fraco mt-p">2 faltas seguidas: a secretaria entra em contato · 3 ou mais: avaliar desligamento.</p>`
              : UI.vazio('Nenhum aluno com faltas seguidas', 'check')}
          </section>

          <section class="painel">
            <div class="painel-cab"><h2>Frequência geral</h2><span class="sub">últimos 6 meses</span></div>
            <div class="grafico">
              ${serie.map(([m, v]) => `<div class="col"><b>${v == null ? '—' : Math.round(v) + '%'}</b><i style="height:${v == null ? 2 : Math.max(4, v * 0.9)}%"></i><span>${UI.mesCurto(m)}</span></div>`).join('')}
            </div>
          </section>

          <section class="painel">
            <div class="painel-cab"><h2>Pendências de ${UI.mesNome(mes).toLowerCase()}</h2><span class="chip ${pend.length ? 'alerta' : 'ok'}">${pend.length}</span></div>
            ${pend.length ? `<div class="lista">${pend.map((p) => `
              <a class="item" href="#/turmas/${p.turma.id}/${p.tipo === 'plano' ? 'plano' : 'aulas'}">
                <span class="ic" style="color:var(--amarelo)">${icon(p.tipo === 'plano' ? 'calendario' : 'relatorios', 'width="22"')}</span>
                <div class="corpo"><div class="t">${esc(p.turma.nome)}</div><div class="d">${esc(p.texto)} · ${esc(D.nomePessoa(p.turma.professor_id))}</div></div>
                ${icon('setaD', 'width="18"')}
              </a>`).join('')}</div>` : UI.vazio('Tudo em dia', 'check')}
          </section>
        </div>

        <div>
          <section class="painel">
            <div class="painel-cab"><h2>Aulas de hoje</h2><span class="sub">${UI.diaSemana(hoje)}</span></div>
            ${deHoje.length ? `<div class="lista">${deHoje.map((t) => {
              const p = D.projeto(t.projeto_id);
              return `<a class="item" href="#/turmas/${t.id}/chamada">
                <span class="data-bloco" style="width:64px"><b style="font-size:15px">${esc(t.horario.split('–')[0])}</b><small>${esc(p?.area || '')}</small></span>
                <div class="corpo"><div class="t">${esc(t.nome)}</div><div class="d">${esc(D.nomePessoa(t.professor_id))} · ${esc(t.local)}</div></div>
              </a>`;
            }).join('')}</div>` : UI.vazio('Sem aulas hoje', 'calendario')}
          </section>

          <section class="painel">
            <div class="painel-cab"><h2>Próximos eventos</h2><a class="link pequeno" href="#/eventos">ver todos</a></div>
            ${proximos.length ? `<div class="lista">${proximos.map((e) => `
              <a class="item" href="#/eventos/${e.id}">
                <span class="data-bloco"><b>${e.data.slice(8, 10)}</b><small>${UI.MESES_C[+e.data.slice(5, 7) - 1]}</small></span>
                <div class="corpo"><div class="t">${esc(e.nome)}</div><div class="d">${esc(e.cidade)} · ${(e.participantes || []).length} alunos</div></div>
              </a>`).join('')}</div>` : UI.vazio('Nenhum evento agendado', 'eventos')}
          </section>

          <section class="painel">
            <div class="painel-cab"><h2>Projetos</h2></div>
            <div class="lista">${projetos.map((p) => {
              const g = D.gastoProjeto(p.id), perc = Math.min(100, (g / p.valor) * 100);
              return `<a class="item" href="#/projetos/${p.id}" style="display:block">
                <div class="linha-flex"><span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.area)}</span><b>${esc(p.nome)}</b></div>
                <div class="linha-flex mt-p pequeno muted"><span>Execução financeira</span><span class="espaco"></span><span>${Math.round(perc)}%</span></div>
                <div class="barra" style="margin-top:4px"><i style="width:${perc}%"></i></div>
              </a>`;
            }).join('')}</div>
          </section>
        </div>
      </div>`;
  };
})();
