/* Ficha do aluno (pós-matrícula): dados, transporte, frequência, atendimentos, documentos, ocorrências, notícias e histórico */
(function () {
  const { esc, icon, $, $$ } = UI;
  window.Views = window.Views || {};

  const ABAS = [
    ['geral', 'Dados', 'alunos'],
    ['transporte', 'Transporte', 'van'],
    ['frequencia', 'Frequência', 'grafico'],
    ['entrevista', 'Entrevista social', 'social'],
    ['atendimentos', 'Atendimentos', 'saude'],
    ['documentos', 'Documentos e anexos', 'clipe'],
    ['ocorrencias', 'Ocorrências', 'alerta'],
    ['noticias', 'Notícias', 'jornal'],
    ['historico', 'Histórico', 'relogio'],
  ];
  const ATEND = ['atend_social', 'atend_psicologico', 'atend_pedagogico'];
  const DOCS = ['documento', 'atestado', 'formulario', 'anexo'];

  /* Quem pode ler registros sigilosos */
  const podeVerSigilo = (r) => {
    const s = Store.sessao();
    return ['coordenacao', 'psicologia', 'social'].includes(s?.papel) || r.autor === s?.id;
  };

  function registroHTML(r) {
    const tp = D.TIPOS_REGISTRO[r.tipo] || {};
    const oculto = r.sigiloso && !podeVerSigilo(r);
    return `<div class="registro" data-reg="${r.id}">
      <div class="cab">
        <span style="color:${tp.cor}">${icon(tp.icone, 'width="20" height="20"')}</span>
        <b>${esc(r.titulo)}</b>
        ${r.sigiloso ? `<span class="chip sigilo">${icon('cadeado', 'width="13" height="13"')}Sigiloso</span>` : ''}
        <span class="chip">${esc(tp.rotulo)}</span>
        <span class="pequeno muted nowrap">${UI.data(r.data)} · ${esc(D.nomePessoa(r.autor))}</span>
        ${oculto ? '' : `<button class="btn sec p so-icone" data-editar="${r.id}" aria-label="Editar">${icon('lapis')}</button>`}
      </div>
      ${oculto ? '<div class="txt"><i>Conteúdo restrito à coordenação e à equipe técnica.</i></div>' : r.texto ? `<div class="txt">${esc(r.texto)}</div>` : ''}
      ${!oculto && r.dados ? `<dl class="dl mt-p pequeno">${Object.entries(ROT_ENTREVISTA).filter(([k]) => r.dados[k] && (!Array.isArray(r.dados[k]) || r.dados[k].length)).map(([k, rot]) => `<dt>${rot}</dt><dd>${esc(Array.isArray(r.dados[k]) ? r.dados[k].join(', ') : r.dados[k])}</dd>`).join('')}</dl>` : ''}
      ${!oculto && r.arquivos?.length ? `<div class="anexos">${r.arquivos.map((f) => `<span class="anexo">${icon('arquivo')}${esc(f.nome)} <span class="fraco">${UI.tamanhoArq(f.tamanho || 0)}</span></span>`).join('')}</div>` : ''}
    </div>`;
  }

  const ROT_ENTREVISTA = {
    composicao: 'Composição familiar', renda: 'Renda familiar', moradia: 'Moradia', beneficios: 'Benefícios sociais',
    escolaridade_resp: 'Escolaridade do responsável', vulnerabilidades: 'Vulnerabilidades', encaminhamentos: 'Encaminhamentos',
  };

  /* Formulário de registro (atendimento, documento, ocorrência, notícia…) */
  function formRegistro(alunoId, tipos, existente, aoSalvar) {
    const r = existente || { tipo: tipos[0], data: UI.hojeISO(), titulo: '', texto: '', arquivos: [], sigiloso: tipos[0] === 'atend_psicologico' };
    const ehEntrevista = r.tipo === 'entrevista_social';
    const d = r.dados || {};
    const opcoesChk = (nome, lista, marcados = []) => `<div class="opcoes">${lista.map((v) => `<label class="marcar"><input type="checkbox" name="dados.${nome}" value="${esc(v)}" data-lista ${marcados.includes(v) ? 'checked' : ''}>${esc(v)}</label>`).join('')}</div>`;

    const m = UI.modal({
      titulo: existente ? 'Editar registro' : `Novo registro · ${D.TIPOS_REGISTRO[tipos[0]].rotulo}`,
      tamanho: ehEntrevista ? 'largo' : '',
      corpo: `<form class="form" id="f-reg">
        ${tipos.length > 1 ? `<div class="campo c3"><label>Tipo</label><select name="tipo">${UI.sel(tipos.map((t) => [t, D.TIPOS_REGISTRO[t].rotulo]), r.tipo)}</select></div>` : `<input type="hidden" name="tipo" value="${r.tipo}">`}
        <div class="campo ${tipos.length > 1 ? 'c3' : 'c2'}"><label>Data</label><input type="date" name="data" value="${esc(r.data)}" required></div>
        <div class="campo ${tipos.length > 1 ? 'c6' : 'c4'}"><label>Título</label><input name="titulo" value="${esc(r.titulo)}" required placeholder="${ehEntrevista ? 'Entrevista social de ingresso' : 'Resumo em poucas palavras'}"></div>
        ${ehEntrevista ? `
          <div class="secao-form">Situação familiar</div>
          <div class="campo c6"><label>Composição familiar</label><textarea name="dados.composicao" placeholder="Quem mora com o aluno, idades, ocupação">${esc(d.composicao || '')}</textarea></div>
          <div class="campo c2"><label>Renda familiar</label><select name="dados.renda">${UI.sel(['Sem renda', 'Até 1 salário mínimo', '1 a 2 salários mínimos', '2 a 3 salários mínimos', 'Acima de 3 salários mínimos'], d.renda, 'Selecione')}</select></div>
          <div class="campo c2"><label>Moradia</label><select name="dados.moradia">${UI.sel(['Própria', 'Alugada', 'Cedida', 'Ocupação', 'Outra'], d.moradia, 'Selecione')}</select></div>
          <div class="campo c2"><label>Escolaridade do responsável</label><select name="dados.escolaridade_resp">${UI.sel(['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior'], d.escolaridade_resp, 'Selecione')}</select></div>
          <div class="campo c6"><span class="rotulo">Benefícios sociais</span>${opcoesChk('beneficios', ['Bolsa Família', 'BPC', 'Auxílio municipal', 'Tarifa social', 'Nenhum'], d.beneficios)}</div>
          <div class="campo c6"><span class="rotulo">Vulnerabilidades observadas</span>${opcoesChk('vulnerabilidades', ['Distância da sede', 'Insegurança alimentar', 'Trabalho infantil', 'Conflito familiar', 'Evasão escolar', 'Deficiência na família'], d.vulnerabilidades)}</div>
          <div class="campo c6"><label>Encaminhamentos</label><input name="dados.encaminhamentos" value="${esc(d.encaminhamentos || '')}" placeholder="CRAS, CAPS, conselho tutelar…"></div>
          <div class="campo c6"><label>Parecer social</label><textarea name="texto">${esc(r.texto)}</textarea></div>`
        : `<div class="campo c6"><label>Descrição</label><textarea name="texto" style="min-height:130px">${esc(r.texto)}</textarea></div>`}
        <div class="campo c6"><label>Anexar arquivos</label><input type="file" name="_arquivos" multiple>
          ${r.arquivos?.length ? `<div class="anexos" style="margin-top:8px">${r.arquivos.map((f) => `<span class="anexo">${icon('arquivo')}${esc(f.nome)}</span>`).join('')}</div>` : ''}</div>
        <label class="marcar c6"><input type="checkbox" name="sigiloso" ${r.sigiloso ? 'checked' : ''}>${icon('cadeado', 'width="16"')} Sigiloso — visível só para coordenação, equipe técnica e autor</label>
      </form>`,
      rodape: `${existente ? `<button class="btn perigo" data-excluir style="margin-right:auto">${icon('lixo')}Excluir</button>` : ''}<button class="btn sec" data-fechar>Cancelar</button><button class="btn" data-salvar>${icon('check')}Salvar</button>`,
    });
    m.el.querySelector('[data-salvar]').onclick = () => {
      const f = m.el.querySelector('#f-reg');
      if (!f.titulo.value.trim()) { f.titulo.focus(); f.titulo.style.borderColor = 'var(--vermelho)'; return; }
      const dados = UI.lerForm(f);
      const novos = UI.arquivosDe(f.querySelector('[name=_arquivos]'));
      const obj = { ...r, ...dados, aluno_id: alunoId, autor: r.autor || Store.sessao().id, arquivos: [...(r.arquivos || []), ...novos] };
      Store.salvar('registros', obj);
      m.fechar(); UI.toast('Registro salvo'); aoSalvar();
    };
    const ex = m.el.querySelector('[data-excluir]');
    if (ex) ex.onclick = async () => { if (await UI.confirmar('Excluir este registro?', { ok: 'Excluir', perigo: true })) { Store.remover('registros', r.id); m.fechar(); UI.toast('Registro excluído'); aoSalvar(); } };
  }

  Views.ficha = function (el, id, aba = 'geral') {
    const a = Store.obter('alunos', id);
    if (!a) { el.innerHTML = `<div class="painel">${UI.vazio('Aluno não encontrado', 'alunos')}</div>`; return; }
    const regs = Store.filtrar('registros', (r) => r.aluno_id === id).sort((x, y) => y.data.localeCompare(x.data));
    const fr = D.freqAluno(id);
    const evs = Store.filtrar('eventos', (e) => (e.participantes || []).includes(id));
    const cont = (tipos) => regs.filter((r) => tipos.includes(r.tipo)).length;
    const contAba = { atendimentos: cont(ATEND), documentos: cont(DOCS), ocorrencias: cont(['ocorrencia']), noticias: cont(['noticia']), entrevista: cont(['entrevista_social']) };
    const recarregar = () => App.irPara(`#/alunos/${id}/${aba}`, true);

    el.innerHTML = `
      <div class="migalhas"><a href="#/alunos">Alunos</a>›<span>${esc(a.nome)}</span></div>
      <section class="painel">
        <div class="ficha-topo">
          ${UI.avatar(a.nome, 'g')}
          <div class="info">
            <div class="linha-flex"><h1>${esc(a.nome)}</h1>${D.statusChip(a.status)}${a.van?.usa ? `<span class="chip info">${icon('van', 'width="14"')}Van</span>` : ''}</div>
            <div class="meta">
              <span>Matrícula ${esc(a.matricula)}</span>
              <span>${icon('calendario')}${UI.idade(a.nascimento)} anos · ${UI.data(a.nascimento)}</span>
              <span>${icon('pin')}${esc(a.endereco?.bairro || '')}</span>
              <span>${icon('telefone')}${esc(a.responsavel?.nome || '')} · ${esc(a.responsavel?.telefone || '')}</span>
            </div>
            <div class="chips mt-p">${a.turmas.map((t) => { const tu = D.turma(t); return tu ? `<a class="chip" href="#/turmas/${tu.id}" style="text-decoration:none"><span class="bola" style="background:${D.projeto(tu.projeto_id)?.cor}"></span>${esc(tu.nome)}</a>` : ''; }).join('')}</div>
          </div>
          <div class="ficha-numeros">
            <div><b style="color:${fr.pct >= 75 ? 'var(--verde)' : fr.pct >= 50 ? 'var(--amarelo)' : 'var(--vermelho)'}">${UI.pct(fr.pct)}</b><small>frequência</small></div>
            <div><b>${evs.length}</b><small>eventos</small></div>
            <div><b>${contAba.atendimentos}</b><small>atendimentos</small></div>
          </div>
        </div>
        <div class="linha-flex mt">
          <a class="btn sec p" href="#/alunos/${id}/editar">${icon('lapis')}Editar cadastro</a>
          <button class="btn sec p" id="bt-imprimir">${icon('imprimir')}Imprimir ficha</button>
          <span class="espaco"></span>
          <button class="btn p" id="bt-novo-reg">${icon('mais')}Novo registro</button>
        </div>
      </section>

      <div class="abas mt" id="abas">${ABAS.map(([k, r, ic]) => `<button data-aba="${k}" class="${k === aba ? 'ativo' : ''}">${icon(ic, 'width="17" height="17"')}${r}${contAba[k] ? `<span class="qtd">${contAba[k]}</span>` : ''}</button>`).join('')}</div>
      <div id="aba-corpo"></div>`;

    $('#abas').addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) App.irPara(`#/alunos/${id}/${b.dataset.aba}`, true); });
    $('#bt-imprimir').onclick = () => Doc.fichaAluno(id);
    $('#bt-novo-reg').onclick = () => {
      const porAba = { atendimentos: ATEND, documentos: DOCS, ocorrencias: ['ocorrencia'], noticias: ['noticia'], entrevista: ['entrevista_social'] };
      formRegistro(id, porAba[aba] || [...ATEND, 'ocorrencia', ...DOCS, 'noticia', 'entrevista_social'], null, recarregar);
    };

    const corpo = $('#aba-corpo');
    const listaRegs = (tipos, titulo, txtVazio, icVazio) => {
      const lista = regs.filter((r) => tipos.includes(r.tipo));
      return `<section class="painel">
        <div class="painel-cab"><h2>${titulo}</h2><button class="btn p" data-novo="${tipos.join(',')}">${icon('mais')}Adicionar</button></div>
        ${lista.length ? lista.map(registroHTML).join('') : UI.vazio(txtVazio, icVazio)}
      </section>`;
    };

    if (aba === 'geral') {
      const s = a.saude || {};
      corpo.innerHTML = `<div class="grade g2">
        <section class="painel"><div class="painel-cab"><h2>Dados pessoais</h2></div><dl class="dl">
          <dt>Nome</dt><dd>${esc(a.nome)}</dd>
          <dt>Nascimento</dt><dd>${UI.data(a.nascimento)} (${UI.idade(a.nascimento)} anos)</dd>
          <dt>Sexo</dt><dd>${a.sexo === 'F' ? 'Feminino' : a.sexo === 'M' ? 'Masculino' : '—'}</dd>
          <dt>Cor/raça</dt><dd>${esc(a.cor_raca || '—')}</dd>
          <dt>CPF</dt><dd>${esc(a.cpf || '—')}</dd>
          <dt>NIS</dt><dd>${esc(a.nis || '—')}</dd>
          <dt>Endereço</dt><dd>${esc([a.endereco?.rua, a.endereco?.numero].filter(Boolean).join(', '))}<br>${esc(a.endereco?.bairro || '')} · ${esc(a.endereco?.cidade || '')}</dd>
          <dt>Matriculado em</dt><dd>${UI.data(a.data_matricula)}</dd>
          ${a.desligamento ? `<dt>Desligamento</dt><dd>${UI.data(a.desligamento.data)} · ${esc(a.desligamento.motivo)}</dd>` : ''}
        </dl></section>
        <div>
          <section class="painel"><div class="painel-cab"><h2>Responsável</h2></div><dl class="dl">
            <dt>Nome</dt><dd>${esc(a.responsavel?.nome || '—')}</dd>
            <dt>Parentesco</dt><dd>${esc(a.responsavel?.parentesco || '—')}</dd>
            <dt>Telefone</dt><dd>${esc(a.responsavel?.telefone || '—')}</dd>
            <dt>E-mail</dt><dd>${esc(a.responsavel?.email || '—')}</dd>
          </dl></section>
          <section class="painel"><div class="painel-cab"><h2>Escola e saúde</h2></div><dl class="dl">
            <dt>Escola</dt><dd>${esc([a.escola?.nome, a.escola?.serie, a.escola?.turno].filter(Boolean).join(' · ') || '—')}</dd>
            <dt>Alergias</dt><dd>${s.alergias ? `<span class="chip alerta">${esc(s.alergias)}</span>` : 'Nenhuma informada'}</dd>
            <dt>Medicamentos</dt><dd>${esc(s.medicamentos || '—')}</dd>
            <dt>Deficiência</dt><dd>${esc(s.deficiencia || '—')}</dd>
            <dt>Autorizações</dt><dd class="chips">
              <span class="chip ${a.autorizacoes?.imagem ? 'ok' : 'risco'}">Imagem: ${a.autorizacoes?.imagem ? 'sim' : 'não'}</span>
              <span class="chip ${a.autorizacoes?.saida ? 'ok' : 'risco'}">Viagens: ${a.autorizacoes?.saida ? 'sim' : 'não'}</span>
              <span class="chip ${a.autorizacoes?.lgpd ? 'ok' : 'risco'}">LGPD</span></dd>
          </dl></section>
        </div>
      </div>`;
    }

    if (aba === 'transporte') {
      const v = a.van || {};
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Transporte</h2><a class="btn sec p" href="#/alunos/${id}/editar">${icon('lapis')}Alterar</a></div>
        ${v.usa ? `<div class="grade g3">
          <div class="registro"><div class="pequeno muted">Precisa da van?</div><div style="font-size:20px;font-weight:700;color:var(--verde)">Sim</div></div>
          <div class="registro"><div class="pequeno muted">${icon('pin', 'width="14"')} Ponto de embarque</div><div style="font-size:17px;font-weight:600">${esc(v.embarque || '—')}</div></div>
          <div class="registro"><div class="pequeno muted">${icon('pin', 'width="14"')} Ponto de desembarque</div><div style="font-size:17px;font-weight:600">${esc(v.desembarque || '—')}</div></div>
        </div>
        ${v.obs ? `<div class="registro mt"><div class="pequeno muted">Observações</div><div>${esc(v.obs)}</div></div>` : ''}
        <h3 class="mt" style="font-size:16px">Dias em que usa a van</h3>
        <div class="chips mt-p">${a.turmas.map((t) => { const tu = D.turma(t); return tu ? `<span class="chip">${esc(D.diasTexto(tu.dias))} · ${esc(tu.horario)} · ${esc(tu.nome)}</span>` : ''; }).join('')}</div>`
        : `<div class="registro"><div class="pequeno muted">Precisa da van?</div><div style="font-size:20px;font-weight:700">Não</div><div class="muted mt-p">O aluno vai às aulas por conta própria ou com a família.</div></div>`}
      </section>`;
    }

    if (aba === 'frequencia') {
      corpo.innerHTML = a.turmas.map((tid) => {
        const t = D.turma(tid);
        if (!t) return '';
        const aulas = D.aulasDaTurma(tid).filter((au) => au.presencas && id in au.presencas);
        const meses = [...new Set(aulas.map((au) => au.data.slice(0, 7)))];
        const ft = D.freqAluno(id, { turma: tid });
        return `<section class="painel">
          <div class="painel-cab"><h2>${esc(t.nome)}</h2><span class="chip ${ft.pct >= 75 ? 'ok' : ft.pct >= 50 ? 'alerta' : 'risco'}">${UI.pct(ft.pct)} de frequência</span></div>
          <div class="tabela-wrap"><table class="tabela">
            <thead><tr><th>Mês</th><th class="num">Aulas</th><th class="num">Presenças</th><th class="num">Faltas</th><th class="num">Justificadas</th><th style="width:30%">Frequência</th></tr></thead>
            <tbody>${meses.map((m) => { const c = D.freqAluno(id, { turma: tid, mes: m }); return `<tr><td>${UI.mesNome(m)}</td><td class="num">${c.total}</td><td class="num">${c.p}</td><td class="num">${c.f}</td><td class="num">${c.j}</td><td><div class="linha-flex"><div class="barra verde" style="flex:1"><i style="width:${c.pct || 0}%"></i></div><b class="pequeno">${UI.pct(c.pct)}</b></div></td></tr>`; }).join('') || `<tr><td colspan="6">${UI.vazio('Sem aulas registradas')}</td></tr>`}</tbody>
          </table></div>
          <h3 class="mt" style="font-size:15px">Últimas aulas</h3>
          <div class="chips mt-p">${aulas.slice(-24).map((au) => `<span title="${UI.data(au.data)} – ${esc(au.conteudo || 'sem relatório')}" class="mk ${au.presencas[id]}">${au.presencas[id]}</span>`).join('')}</div>
          <p class="pequeno fraco mt-p">P = presente · F = falta · J = falta justificada (conta como presença no percentual)</p>
        </section>`;
      }).join('') || `<section class="painel">${UI.vazio('Aluno sem turmas', 'turmas')}</section>`;
    }

    if (aba === 'entrevista') corpo.innerHTML = listaRegs(['entrevista_social'], 'Entrevista social', 'Nenhuma entrevista social registrada', 'social');

    if (aba === 'atendimentos') {
      const filtro = App.params?.get('tipo') || '';
      const tipos = filtro ? [filtro] : ATEND;
      corpo.innerHTML = `<div class="abas mini">${[['', 'Todos'], ...ATEND.map((t) => [t, D.TIPOS_REGISTRO[t].rotulo])].map(([v, r]) => `<button data-filtro="${v}" class="${v === filtro ? 'ativo' : ''}">${r} <span class="qtd">${regs.filter((x) => (v ? x.tipo === v : ATEND.includes(x.tipo))).length}</span></button>`).join('')}</div>` +
        listaRegs(tipos, filtro ? D.TIPOS_REGISTRO[filtro].rotulo : 'Atendimentos social, psicológico e pedagógico', 'Nenhum atendimento registrado', 'saude');
      $$('[data-filtro]', corpo).forEach((b) => b.onclick = () => App.irPara(`#/alunos/${id}/atendimentos${b.dataset.filtro ? '?tipo=' + b.dataset.filtro : ''}`, true));
    }

    if (aba === 'documentos') corpo.innerHTML = listaRegs(DOCS, 'Documentos, atestados, formulários e anexos', 'Nenhum documento anexado', 'clipe');
    if (aba === 'ocorrencias') corpo.innerHTML = listaRegs(['ocorrencia'], 'Ocorrências', 'Nenhuma ocorrência registrada', 'check');
    if (aba === 'noticias') corpo.innerHTML = listaRegs(['noticia'], 'Notícias e destaques', 'Nenhuma notícia sobre este aluno', 'jornal');

    if (aba === 'historico') {
      const h = D.historico(id);
      let mesAtual = '';
      corpo.innerHTML = `<section class="painel">
        <div class="painel-cab"><h2>Histórico na instituição</h2><span class="sub">${h.length} registros desde ${UI.data(a.data_matricula)}</span><button class="btn sec p" id="bt-hist-pdf">${icon('imprimir')}Imprimir histórico</button></div>
        <div class="linha-tempo">${h.map((x) => {
          const m = x.data.slice(0, 7);
          const sep = m !== mesAtual ? `<div class="lt-mes">${UI.mesNome(m)}</div>` : '';
          mesAtual = m;
          return `${sep}<div class="lt-item" style="--cor:${x.cor || 'var(--laranja)'}">
            <div class="quando">${x.tipo === 'freq' ? 'Resumo do mês' : UI.data(x.data)}</div>
            <div class="o-que">${x.link ? `<a href="${x.link}">${esc(x.titulo)}</a>` : esc(x.titulo)}</div>
            ${x.detalhe ? `<div class="detalhe">${esc(x.detalhe)}</div>` : ''}
          </div>`;
        }).join('')}</div>
      </section>`;
      $('#bt-hist-pdf').onclick = () => Doc.fichaAluno(id, true);
    }

    corpo.addEventListener('click', (e) => {
      const nv = e.target.closest('[data-novo]');
      if (nv) formRegistro(id, nv.dataset.novo.split(','), null, recarregar);
      const ed = e.target.closest('[data-editar]');
      if (ed) { const r = Store.obter('registros', ed.dataset.editar); formRegistro(id, [r.tipo], r, recarregar); }
    });
  };

  window.Ficha = { registroHTML };
})();
