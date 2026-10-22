/* Turmas: alunos, plano de aula mensal, relatórios de aula e registro de presença */
(function () {
  const { esc, icon, $, $$ } = UI;
  window.Views = window.Views || {};
  const DIAS = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];

  function form(t, aoSalvar) {
    t = { nome: '', projeto_id: '', professor_id: '', local: '', dias: [], horario: '', vagas: 20, faixa: '', inicio: UI.hojeISO(), ...t };
    const m = UI.modal({
      titulo: t.id ? 'Editar turma' : 'Nova turma',
      corpo: `<form class="form" id="f-turma">
        <div class="campo c4"><label>Nome da turma *</label><input name="nome" value="${esc(t.nome)}" required></div>
        <div class="campo c2"><label>Projeto *</label><select name="projeto_id" required>${UI.sel(Store.todos('projetos').map((p) => [p.id, p.nome]), t.projeto_id, 'Selecione')}</select></div>
        <div class="campo c3"><label>Professor(a)</label><select name="professor_id">${UI.sel(Store.filtrar('equipe', (e) => e.tipo === 'professor').map((e) => [e.id, e.nome]), t.professor_id, 'Selecione')}</select></div>
        <div class="campo c3"><label>Local</label><input name="local" value="${esc(t.local)}"></div>
        <div class="campo c6"><span class="rotulo">Dias da semana</span><div class="opcoes">${DIAS.map(([v, r]) => `<label class="marcar"><input type="checkbox" name="dias" value="${v}" data-lista ${t.dias.includes(v) ? 'checked' : ''}>${r}</label>`).join('')}</div></div>
        <div class="campo c2"><label>Horário</label><input name="horario" value="${esc(t.horario)}" placeholder="14:00–16:00"></div>
        <div class="campo c1"><label>Vagas</label><input type="number" name="vagas" value="${t.vagas ?? ''}"></div>
        <div class="campo c3"><label>Faixa etária</label><input name="faixa" value="${esc(t.faixa)}" placeholder="9 a 12 anos"></div>
        <div class="campo c2"><label>Início das aulas</label><input type="date" name="inicio" value="${esc(t.inicio)}"></div>
      </form>`,
      rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const dados = UI.lerForm(m.el.querySelector('#f-turma'));
      if (!dados.nome || !dados.projeto_id) { UI.toast('Informe nome e projeto'); return; }
      dados.dias = (dados.dias || []).map(Number);
      const salvo = Store.salvar('turmas', { ...t, ...dados });
      m.fechar(); UI.toast('Turma salva'); aoSalvar(salvo);
    };
  }

  /* Registro de aula: relatório + chamada */
  function formAula(turmaId, aula, aoSalvar) {
    const t = D.turma(turmaId);
    const alunos = D.alunosDaTurma(turmaId);
    aula = aula || { data: UI.hojeISO(), conteudo: '', relatorio: '', observacoes: '', presencas: Object.fromEntries(alunos.map((a) => [a.id, 'P'])) };
    const pres = { ...aula.presencas };
    alunos.forEach((a) => { if (!(a.id in pres)) pres[a.id] = 'P'; });

    const m = UI.modal({
      titulo: `${aula.id ? 'Aula de ' + UI.data(aula.data) : 'Registrar aula'} · ${t.nome}`,
      tamanho: 'largo',
      corpo: `<div class="grade g2" style="align-items:start">
        <form class="form" id="f-aula" style="grid-template-columns:1fr">
          <div class="campo"><label>Data da aula</label><input type="date" name="data" value="${esc(aula.data)}" required></div>
          <div class="campo"><label>Conteúdo trabalhado</label><input name="conteudo" value="${esc(aula.conteudo)}" placeholder="Tema da aula"></div>
          <div class="campo"><label>Relatório da aula</label><textarea name="relatorio" style="min-height:140px" placeholder="Como foi a aula, objetivos atingidos, dificuldades…">${esc(aula.relatorio)}</textarea></div>
          <div class="campo"><label>Observações</label><textarea name="observacoes" style="min-height:60px">${esc(aula.observacoes)}</textarea></div>
          <div class="campo"><label>Fotos / anexos</label><input type="file" name="_fotos" multiple accept="image/*,.pdf"></div>
        </form>
        <div>
          <div class="linha-flex" style="margin-bottom:10px"><b style="flex:1">Chamada</b><span class="pequeno muted" id="ch-resumo"></span><button class="btn sec p" id="ch-todos">Todos presentes</button></div>
          <div class="lista" id="ch-lista">${alunos.map((a) => `<div class="item" style="padding:7px 4px">${UI.avatar(a.nome, 'p')}<div class="corpo"><div class="t" style="font-weight:500">${esc(a.nome)}</div></div>
            <div class="pfj" data-aluno="${a.id}">${['P', 'F', 'J'].map((v) => `<button type="button" data-v="${v}" class="${pres[a.id] === v ? 'on' : ''}" title="${{ P: 'Presente', F: 'Falta', J: 'Falta justificada' }[v]}">${v}</button>`).join('')}</div></div>`).join('') || UI.vazio('Turma sem alunos')}</div>
        </div>
      </div>`,
      rodape: `${aula.id ? `<button class="btn perigo" data-excluir style="margin-right:auto">${icon('lixo')}Excluir aula</button>` : ''}<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar aula</button>`,
    });
    const resumo = () => {
      const v = Object.values(pres);
      $('#ch-resumo', m.el).textContent = `${v.filter((x) => x === 'P').length} presentes · ${v.filter((x) => x === 'F').length} faltas`;
    };
    resumo();
    m.el.querySelector('#ch-lista').onclick = (e) => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      const grupo = b.parentElement;
      pres[grupo.dataset.aluno] = b.dataset.v;
      $$('button', grupo).forEach((x) => x.classList.toggle('on', x === b));
      resumo();
    };
    m.el.querySelector('#ch-todos').onclick = () => {
      Object.keys(pres).forEach((k) => (pres[k] = 'P'));
      $$('.pfj button', m.el).forEach((x) => x.classList.toggle('on', x.dataset.v === 'P'));
      resumo();
    };
    m.el.querySelector('[data-salvar]').onclick = () => {
      const f = m.el.querySelector('#f-aula');
      const dados = UI.lerForm(f);
      if (!dados.data) return;
      const fotos = UI.arquivosDe(f.querySelector('[name=_fotos]'));
      const id = aula.id || `au_${turmaId}_${dados.data}`;
      if (!aula.id && Store.obter('aulas', id)) { UI.toast('Já existe aula registrada nesta data'); return; }
      Store.salvar('aulas', { ...aula, ...dados, id, turma_id: turmaId, presencas: pres, anexos: [...(aula.anexos || []), ...fotos] });
      m.fechar(); UI.toast('Aula registrada'); aoSalvar();
    };
    const ex = m.el.querySelector('[data-excluir]');
    if (ex) ex.onclick = async () => { if (await UI.confirmar('Excluir esta aula e a chamada?', { ok: 'Excluir', perigo: true })) { Store.remover('aulas', aula.id); m.fechar(); aoSalvar(); } };
  }

  Views.turmas = function (el) {
    const projetos = Store.todos('projetos');
    el.innerHTML = `
      <div class="cabecalho"><div class="titulos"><h1>Turmas</h1><p class="sub">${Store.todos('turmas').length} turmas em ${projetos.length} projetos</p></div>
        <button class="btn quente" id="bt-nova">${icon('mais')}Nova turma</button></div>
      ${projetos.map((p) => {
        const ts = D.turmasDoProjeto(p.id);
        return `<section class="painel">
          <div class="painel-cab"><span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.area)}</span><h2><a href="#/projetos/${p.id}" style="text-decoration:none">${esc(p.nome)}</a></h2><span class="sub">${ts.length} turmas</span></div>
          <div class="grade g3">${ts.map((t) => {
            const n = D.alunosDaTurma(t.id).length;
            const f = D.freqTurma(t.id, UI.hojeISO().slice(0, 7));
            return `<a class="registro" href="#/turmas/${t.id}" style="text-decoration:none;display:block">
              <div class="linha-flex"><b style="flex:1;font-size:16px">${esc(t.nome)}</b>${f == null ? '' : `<span class="chip ${f >= 75 ? 'ok' : f >= 50 ? 'alerta' : 'risco'}">${UI.pct(f)}</span>`}</div>
              <div class="pequeno muted mt-p">${esc(D.nomePessoa(t.professor_id))}</div>
              <div class="pequeno muted">${esc(D.diasTexto(t.dias))} · ${esc(t.horario)} · ${esc(t.local)}</div>
              <div class="linha-flex mt-p pequeno"><span>${n}/${t.vagas} alunos</span><span class="espaco"></span></div>
              <div class="barra azul" style="margin-top:4px;height:6px"><i style="width:${Math.min(100, (n / t.vagas) * 100)}%"></i></div>
            </a>`;
          }).join('') || UI.vazio('Sem turmas')}</div>
        </section>`;
      }).join('')}`;
    $('#bt-nova').onclick = () => form({}, (t) => (location.hash = `#/turmas/${t.id}`));
  };

  Views.turma = function (el, id, aba = 'alunos') {
    const t = Store.obter('turmas', id);
    if (!t) { el.innerHTML = `<div class="painel">${UI.vazio('Turma não encontrada')}</div>`; return; }
    const p = D.projeto(t.projeto_id);
    const alunos = D.alunosDaTurma(id);
    const mesSel = App.params?.get('mes') || UI.hojeISO().slice(0, 7);
    const recarregar = () => App.irPara(`#/turmas/${id}/${aba}${mesSel ? '?mes=' + mesSel : ''}`, true);

    el.innerHTML = `
      <div class="migalhas"><a href="#/turmas">Turmas</a>›<a href="#/projetos/${p?.id}">${esc(p?.nome || '')}</a>›<span>${esc(t.nome)}</span></div>
      <div class="cabecalho">
        <div class="titulos"><h1>${esc(t.nome)}</h1>
          <p class="sub">${esc(D.nomePessoa(t.professor_id))} · ${esc(D.diasTexto(t.dias))} · ${esc(t.horario)} · ${esc(t.local)}</p></div>
        <button class="btn sec" id="bt-editar">${icon('lapis')}Editar</button>
        <button class="btn quente" id="bt-aula">${icon('check')}Registrar aula e chamada</button>
      </div>
      <div class="abas" id="abas">${[['alunos', 'Alunos', 'alunos', alunos.length], ['plano', 'Plano de aula mensal', 'calendario'], ['aulas', 'Relatórios de aula', 'relatorios'], ['chamada', 'Frequência', 'grafico']].map(([k, r, ic, q]) => `<button data-aba="${k}" class="${k === aba ? 'ativo' : ''}">${icon(ic, 'width="17" height="17"')}${r}${q ? `<span class="qtd">${q}</span>` : ''}</button>`).join('')}</div>
      <div id="aba-corpo"></div>`;

    $('#abas').onclick = (e) => { const b = e.target.closest('[data-aba]'); if (b) App.irPara(`#/turmas/${id}/${b.dataset.aba}?mes=${mesSel}`, true); };
    $('#bt-editar').onclick = () => form(t, recarregar);
    $('#bt-aula').onclick = () => formAula(id, Store.obter('aulas', `au_${id}_${UI.hojeISO()}`), recarregar);
    const corpo = $('#aba-corpo');
    const seletorMes = () => `<input type="month" class="entrada" id="sel-mes" value="${mesSel}" style="width:auto">`;
    const ligarMes = () => { const s = $('#sel-mes'); if (s) s.onchange = () => App.irPara(`#/turmas/${id}/${aba}?mes=${s.value}`, true); };

    if (aba === 'alunos') {
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Alunos matriculados</h2><span class="sub">${alunos.length} de ${t.vagas} vagas</span><button class="btn p" id="bt-add">${icon('mais')}Incluir aluno</button></div>
        ${alunos.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Aluno</th><th class="some-movel">Responsável</th><th class="centro">Van</th><th class="num">Frequência</th><th></th></tr></thead><tbody>
          ${alunos.map((a) => { const f = D.freqAluno(a.id, { turma: id }); return `<tr>
            <td><a class="pessoa" href="#/alunos/${a.id}" style="text-decoration:none">${UI.avatar(a.nome)}<div><div class="nome">${esc(a.nome)}</div><div class="det">${UI.idade(a.nascimento)} anos</div></div></a></td>
            <td class="some-movel">${esc(a.responsavel?.nome || '')}<div class="pequeno muted">${esc(a.responsavel?.telefone || '')}</div></td>
            <td class="centro">${a.van?.usa ? `<span style="color:var(--laranja)" title="${esc(a.van.embarque)}">${icon('van', 'width="20"')}</span>` : '—'}</td>
            <td class="num">${f.pct == null ? '—' : `<span class="chip ${f.pct >= 75 ? 'ok' : f.pct >= 50 ? 'alerta' : 'risco'}">${UI.pct(f.pct)}</span>`}</td>
            <td class="acoes-td"><button class="btn sec p" data-tirar="${a.id}">Retirar</button></td></tr>`; }).join('')}
        </tbody></table></div>` : UI.vazio('Nenhum aluno nesta turma', 'alunos')}
      </section>`;
      $('#bt-add').onclick = () => {
        const fora = Store.filtrar('alunos', (a) => a.status === 'ativo' && !a.turmas.includes(id)).sort((a, b) => a.nome.localeCompare(b.nome));
        const m = UI.modal({
          titulo: `Incluir alunos em ${t.nome}`,
          corpo: `<input class="entrada" id="busca-inc" placeholder="Buscar aluno matriculado"><div class="lista mt-p" id="lista-inc" style="max-height:50vh;overflow:auto">${fora.map((a) => `<label class="item clica" data-nome="${esc(UI.normaliza(a.nome))}"><input type="checkbox" value="${a.id}" style="width:18px;height:18px;accent-color:var(--azul)">${UI.avatar(a.nome, 'p')}<div class="corpo"><div class="t">${esc(a.nome)}</div><div class="d">${UI.idade(a.nascimento)} anos · ${a.turmas.map((x) => esc(D.turma(x)?.nome)).join(', ') || 'sem turma'}</div></div></label>`).join('')}</div>`,
          rodape: `<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-ok>${icon('check')}Incluir selecionados</button>`,
        });
        m.el.querySelector('#busca-inc').oninput = (e) => { const q = UI.normaliza(e.target.value); $$('[data-nome]', m.el).forEach((l) => (l.style.display = l.dataset.nome.includes(q) ? '' : 'none')); };
        m.el.querySelector('[data-ok]').onclick = () => {
          const ids = $$('input[type=checkbox]:checked', m.el).map((c) => c.value);
          ids.forEach((aid) => { const a = Store.obter('alunos', aid); Store.salvar('alunos', { id: aid, turmas: [...a.turmas, id] }); });
          m.fechar(); UI.toast(`${ids.length} aluno(s) incluídos`); recarregar();
        };
      };
      corpo.onclick = async (e) => {
        const b = e.target.closest('[data-tirar]');
        if (!b) return;
        const a = Store.obter('alunos', b.dataset.tirar);
        if (await UI.confirmar(`Retirar ${a.nome} da turma? O histórico de frequência é mantido.`, { ok: 'Retirar' })) {
          Store.salvar('alunos', { id: a.id, turmas: a.turmas.filter((x) => x !== id) });
          recarregar();
        }
      };
    }

    if (aba === 'plano') {
      const pl = D.plano(id, mesSel) || {};
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Plano de aula · ${UI.mesNome(mesSel)}</h2>${pl.id ? `<span class="chip ok">Enviado em ${UI.data(pl.enviado_em)}</span>` : '<span class="chip alerta">Não enviado</span>'}${seletorMes()}</div>
        <form class="form" id="f-plano">
          <div class="campo c6"><label>Objetivos do mês</label><textarea name="objetivos">${esc(pl.objetivos || '')}</textarea></div>
          <div class="campo c3"><label>Conteúdos (um por linha)</label><textarea name="conteudos" style="min-height:140px">${esc(pl.conteudos || '')}</textarea></div>
          <div class="campo c3"><label>Metodologia</label><textarea name="metodologia" style="min-height:140px">${esc(pl.metodologia || '')}</textarea></div>
          <div class="campo c3"><label>Recursos</label><textarea name="recursos">${esc(pl.recursos || '')}</textarea></div>
          <div class="campo c3"><label>Avaliação</label><textarea name="avaliacao">${esc(pl.avaliacao || '')}</textarea></div>
        </form>
        <div class="linha-flex mt"><span class="pequeno muted">Professor(a): ${esc(D.nomePessoa(t.professor_id))}</span><span class="espaco"></span><button class="btn" id="bt-plano">${icon('check')}${pl.id ? 'Salvar alterações' : 'Enviar plano'}</button></div>
      </section>`;
      ligarMes();
      $('#bt-plano').onclick = () => {
        const dados = UI.lerForm($('#f-plano'));
        if (!dados.objetivos && !dados.conteudos) { UI.toast('Preencha ao menos objetivos ou conteúdos'); return; }
        Store.salvar('planos', { ...pl, ...dados, id: pl.id || `pl_${id}_${mesSel}`, turma_id: id, mes: mesSel, enviado_em: pl.enviado_em || UI.hojeISO() });
        UI.toast('Plano de aula salvo'); recarregar();
      };
    }

    if (aba === 'aulas') {
      const aulas = D.aulasDaTurma(id, mesSel).reverse();
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Relatórios de aula · ${UI.mesNome(mesSel)}</h2><span class="sub">${aulas.length} aulas</span>${seletorMes()}<button class="btn sec p" id="bt-rel-mes">${icon('imprimir')}Relatório mensal</button></div>
        ${aulas.length ? aulas.map((au) => {
          const v = Object.values(au.presencas || {});
          return `<div class="registro clica" data-aula="${au.id}" style="cursor:pointer">
            <div class="cab"><span class="data-bloco"><b>${au.data.slice(8, 10)}</b><small>${UI.diaSemana(au.data)}</small></span>
              <div style="flex:1;min-width:180px"><b>${esc(au.conteudo || 'Sem relatório')}</b><div class="pequeno muted">${v.filter((x) => x === 'P').length} presentes · ${v.filter((x) => x === 'F').length} faltas · ${v.filter((x) => x === 'J').length} justificadas</div></div>
              ${au.conteudo ? '<span class="chip ok">Relatório enviado</span>' : '<span class="chip alerta">Relatório pendente</span>'}
            </div>
            ${au.relatorio ? `<div class="txt">${esc(au.relatorio)}</div>` : ''}
            ${au.observacoes ? `<div class="txt" style="color:var(--amarelo)">${esc(au.observacoes)}</div>` : ''}
          </div>`;
        }).join('') : UI.vazio('Nenhuma aula registrada neste mês', 'relatorios')}
      </section>`;
      ligarMes();
      $('#bt-rel-mes').onclick = () => Doc.mensalTurma(id, mesSel);
      corpo.onclick = (e) => { const r = e.target.closest('[data-aula]'); if (r) formAula(id, Store.obter('aulas', r.dataset.aula), recarregar); };
    }

    if (aba === 'chamada') {
      const aulas = D.aulasDaTurma(id, mesSel);
      const todos = D.alunosDaTurma(id, true).filter((a) => a.status === 'ativo' || aulas.some((au) => au.presencas && a.id in au.presencas));
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Frequência · ${UI.mesNome(mesSel)}</h2><span class="sub">clique numa marcação para alterar</span>${seletorMes()}</div>
        ${aulas.length ? `<div class="tabela-wrap"><table class="tabela grade-freq editavel">
          <thead><tr><th>Aluno</th>${aulas.map((au) => `<th class="f" title="${esc(au.conteudo)}">${au.data.slice(8, 10)}<br><span class="fraco" style="font-size:11px">${UI.diaSemana(au.data)}</span></th>`).join('')}<th class="num">%</th></tr></thead>
          <tbody>${todos.map((a) => { const c = D.contar(aulas, a.id); return `<tr><td class="nowrap"><a href="#/alunos/${a.id}" style="text-decoration:none">${esc(a.nome)}</a></td>
            ${aulas.map((au) => { const v = au.presencas?.[a.id]; return `<td class="f"><span class="mk ${v || 'vz'}" data-aula="${au.id}" data-aluno="${a.id}">${v || '·'}</span></td>`; }).join('')}
            <td class="num"><b style="color:${c.pct >= 75 ? 'var(--verde)' : c.pct >= 50 ? 'var(--amarelo)' : 'var(--vermelho)'}">${UI.pct(c.pct)}</b></td></tr>`; }).join('')}</tbody>
        </table></div>
        <p class="pequeno fraco mt-p">P = presente · F = falta · J = falta justificada</p>` : UI.vazio('Nenhuma aula neste mês', 'calendario')}
      </section>`;
      ligarMes();
      corpo.onclick = (e) => {
        const mk = e.target.closest('.mk[data-aula]');
        if (!mk) return;
        const au = Store.obter('aulas', mk.dataset.aula);
        const ordem = ['P', 'F', 'J'];
        const atual = au.presencas?.[mk.dataset.aluno];
        const novo = ordem[(ordem.indexOf(atual) + 1) % 3];
        Store.salvar('aulas', { id: au.id, presencas: { ...au.presencas, [mk.dataset.aluno]: novo } });
        recarregar();
      };
    }
  };

  window.Turmas = { form, formAula };
})();
