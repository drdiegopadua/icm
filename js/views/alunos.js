/* Alunos: lista e matrícula em etapas */
(function () {
  const { esc, icon, $, $$ } = UI;
  window.Views = window.Views || {};

  Views.alunos = function (el) {
    const prm = App.params || new URLSearchParams();
    const f = { q: '', projeto: '', turma: '', status: 'ativo', van: prm.get('van') === '1' ? 'sim' : '' };
    const projetos = Store.todos('projetos');

    el.innerHTML = `
      <div class="cabecalho">
        <div class="titulos"><h1>Alunos</h1><p class="sub" id="al-resumo"></p></div>
        <a class="btn quente" href="#/alunos/novo">${icon('mais')}Nova matrícula</a>
      </div>
      <section class="painel">
        <div class="filtros">
          <input class="entrada busca" id="f-q" placeholder="Buscar por nome, matrícula ou responsável">
          <select class="entrada" id="f-projeto">${UI.sel(projetos.map((p) => [p.id, p.nome]), '', 'Todos os projetos')}</select>
          <select class="entrada" id="f-turma"></select>
          <select class="entrada" id="f-status">${UI.sel([['ativo', 'Ativos'], ['espera', 'Lista de espera'], ['desligado', 'Desligados'], ['todos', 'Todos']], f.status)}</select>
          <select class="entrada" id="f-van">${UI.sel([['sim', 'Usam van'], ['nao', 'Não usam van']], f.van, 'Van: todos')}</select>
        </div>
        <div class="tabela-wrap"><table class="tabela">
          <thead><tr><th>Aluno</th><th class="some-movel">Matrícula</th><th>Turmas</th><th class="some-movel">Responsável</th><th class="centro">Van</th><th class="num some-movel">Frequência</th><th>Situação</th></tr></thead>
          <tbody id="al-corpo"></tbody>
        </table></div>
      </section>`;

    const turmasSel = () => {
      const ts = Store.filtrar('turmas', (t) => !f.projeto || t.projeto_id === f.projeto);
      $('#f-turma').innerHTML = UI.sel(ts.map((t) => [t.id, t.nome]), f.turma, 'Todas as turmas');
    };
    const desenhar = () => {
      const q = UI.normaliza(f.q);
      const lista = Store.todos('alunos').filter((a) => {
        if (f.status !== 'todos' && a.status !== f.status) return false;
        if (f.van === 'sim' && !a.van?.usa) return false;
        if (f.van === 'nao' && a.van?.usa) return false;
        if (f.turma && !a.turmas.includes(f.turma)) return false;
        if (f.projeto && !a.turmas.some((t) => D.turma(t)?.projeto_id === f.projeto)) return false;
        if (q && !UI.normaliza(`${a.nome} ${a.matricula} ${a.responsavel?.nome}`).includes(q)) return false;
        return true;
      }).sort((a, b) => a.nome.localeCompare(b.nome));
      $('#al-resumo').textContent = `${lista.length} aluno(s) encontrados`;
      $('#al-corpo').innerHTML = lista.length ? lista.map((a) => {
        const fr = D.freqAluno(a.id);
        return `<tr class="clica" data-id="${a.id}">
          <td><div class="pessoa">${UI.avatar(a.nome)}<div><div class="nome">${esc(a.nome)}</div><div class="det">${UI.idade(a.nascimento)} anos · ${esc(a.endereco?.bairro || '')}</div></div></div></td>
          <td class="some-movel">${esc(a.matricula)}</td>
          <td><div class="chips">${a.turmas.map((t) => { const tu = D.turma(t); return tu ? `<span class="chip"><span class="bola" style="background:${D.projeto(tu.projeto_id)?.cor}"></span>${esc(tu.nome)}</span>` : ''; }).join('') || '<span class="fraco">—</span>'}</div></td>
          <td class="some-movel"><div>${esc(a.responsavel?.nome || '')}</div><div class="pequeno muted">${esc(a.responsavel?.telefone || '')}</div></td>
          <td class="centro">${a.van?.usa ? `<span title="${esc(a.van.embarque)}" style="color:var(--laranja)">${icon('van', 'width="20" height="20"')}</span>` : '<span class="fraco">—</span>'}</td>
          <td class="num some-movel">${fr.pct == null ? '—' : `<span class="chip ${fr.pct >= 75 ? 'ok' : fr.pct >= 50 ? 'alerta' : 'risco'}">${UI.pct(fr.pct)}</span>`}</td>
          <td>${D.statusChip(a.status)}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="7">${UI.vazio('Nenhum aluno com esses filtros', 'alunos')}</td></tr>`;
    };

    turmasSel();
    desenhar();
    $('#f-q').addEventListener('input', (e) => { f.q = e.target.value; desenhar(); });
    $('#f-projeto').addEventListener('change', (e) => { f.projeto = e.target.value; f.turma = ''; turmasSel(); desenhar(); });
    $('#f-turma').addEventListener('change', (e) => { f.turma = e.target.value; desenhar(); });
    $('#f-status').addEventListener('change', (e) => { f.status = e.target.value; desenhar(); });
    $('#f-van').addEventListener('change', (e) => { f.van = e.target.value; desenhar(); });
    $('#al-corpo').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = `#/alunos/${tr.dataset.id}`; });
  };

  /* ---------- Matrícula (nova ou edição) ---------- */
  const ETAPAS = ['Aluno', 'Responsável', 'Escola e saúde', 'Transporte', 'Turmas', 'Autorizações'];

  Views.matricula = function (el, id) {
    const existente = id ? Store.obter('alunos', id) : null;
    const a = existente ? JSON.parse(JSON.stringify(existente)) : {
      nome: '', sexo: '', nascimento: '', cpf: '', nis: '', cor_raca: '', telefone: '',
      endereco: { rua: '', numero: '', bairro: '', cidade: 'Afonso Cláudio', cep: '' },
      responsavel: { nome: '', parentesco: '', telefone: '', cpf: '', email: '' },
      escola: { nome: '', serie: '', turno: '' },
      saude: { alergias: '', medicamentos: '', deficiencia: '', sus: '', obs: '' },
      van: { usa: false, embarque: '', desembarque: '', obs: '' },
      autorizacoes: { imagem: false, saida: false, lgpd: false },
      turmas: [], status: 'ativo',
    };
    let etapa = 0;

    el.innerHTML = `
      <div class="migalhas"><a href="#/alunos">Alunos</a>›${existente ? `<a href="#/alunos/${a.id}">${esc(a.nome)}</a>›<span>Editar</span>` : '<span>Nova matrícula</span>'}</div>
      <div class="cabecalho"><div class="titulos"><h1>${existente ? 'Editar cadastro' : 'Nova matrícula'}</h1><p class="sub">${existente ? `Matrícula nº ${esc(a.matricula)}` : 'Preencha as etapas. Os campos com * são obrigatórios.'}</p></div></div>
      <div class="etapas" id="etapas"></div>
      <form class="painel" id="form-mat" novalidate>
        <div id="etapa-corpo"></div>
        <div class="linha-flex mt" style="border-top:1px solid var(--linha);padding-top:16px">
          <button type="button" class="btn sec" id="bt-voltar">${icon('seta')}Voltar</button>
          <span class="espaco"></span>
          <a class="btn sec" href="${existente ? `#/alunos/${a.id}` : '#/alunos'}">Cancelar</a>
          <button type="button" class="btn" id="bt-avancar">Avançar${icon('setaD')}</button>
        </div>
      </form>`;

    const campo = (rot, nome, val, { tipo = 'text', c = 'c3', req = false, opcoes, ajuda, ph = '' } = {}) => {
      const idc = 'm-' + nome.replace(/\./g, '-');
      const ctrl = opcoes
        ? `<select id="${idc}" name="${nome}" ${req ? 'required' : ''}>${UI.sel(opcoes, val, 'Selecione')}</select>`
        : tipo === 'area'
          ? `<textarea id="${idc}" name="${nome}" placeholder="${esc(ph)}">${esc(val)}</textarea>`
          : `<input id="${idc}" name="${nome}" type="${tipo}" value="${esc(val)}" placeholder="${esc(ph)}" ${req ? 'required' : ''}>`;
      return `<div class="campo ${c}"><label for="${idc}">${esc(rot)}${req ? ' *' : ''}</label>${ctrl}${ajuda ? `<div class="ajuda">${esc(ajuda)}</div>` : ''}</div>`;
    };

    const corpos = [
      () => `<div class="form">
        <div class="secao-form">Dados do aluno</div>
        ${campo('Nome completo', 'nome', a.nome, { c: 'c4', req: true })}
        ${campo('Data de nascimento', 'nascimento', a.nascimento, { tipo: 'date', c: 'c2', req: true })}
        ${campo('Sexo', 'sexo', a.sexo, { c: 'c2', opcoes: [['F', 'Feminino'], ['M', 'Masculino']] })}
        ${campo('Cor/raça (autodeclarada)', 'cor_raca', a.cor_raca, { c: 'c2', opcoes: ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não declarada'] })}
        ${campo('CPF', 'cpf', a.cpf, { c: 'c2', ph: '000.000.000-00' })}
        ${campo('NIS', 'nis', a.nis, { c: 'c3', ajuda: 'Número do Cadastro Único, se houver' })}
        ${campo('Telefone do aluno', 'telefone', a.telefone, { c: 'c3', tipo: 'tel' })}
        <div class="secao-form">Endereço</div>
        ${campo('Rua', 'endereco.rua', a.endereco.rua, { c: 'c4' })}
        ${campo('Número', 'endereco.numero', a.endereco.numero, { c: 'c2' })}
        ${campo('Bairro / comunidade', 'endereco.bairro', a.endereco.bairro, { c: 'c2', req: true })}
        ${campo('Cidade', 'endereco.cidade', a.endereco.cidade, { c: 'c2' })}
        ${campo('CEP', 'endereco.cep', a.endereco.cep, { c: 'c2' })}
      </div>`,
      () => `<div class="form">
        <div class="secao-form">Responsável legal</div>
        ${campo('Nome do responsável', 'responsavel.nome', a.responsavel.nome, { c: 'c4', req: true })}
        ${campo('Parentesco', 'responsavel.parentesco', a.responsavel.parentesco, { c: 'c2', opcoes: ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã(o)', 'Responsável legal', 'Outro'] })}
        ${campo('Telefone / WhatsApp', 'responsavel.telefone', a.responsavel.telefone, { c: 'c2', tipo: 'tel', req: true })}
        ${campo('CPF do responsável', 'responsavel.cpf', a.responsavel.cpf, { c: 'c2' })}
        ${campo('E-mail', 'responsavel.email', a.responsavel.email, { c: 'c2', tipo: 'email' })}
      </div>`,
      () => `<div class="form">
        <div class="secao-form">Escola</div>
        ${campo('Escola', 'escola.nome', a.escola.nome, { c: 'c3' })}
        ${campo('Série / ano', 'escola.serie', a.escola.serie, { c: 'c2' })}
        ${campo('Turno', 'escola.turno', a.escola.turno, { c: 'c1', opcoes: ['Matutino', 'Vespertino', 'Integral', 'Noturno'] })}
        <div class="secao-form">Saúde</div>
        ${campo('Alergias', 'saude.alergias', a.saude.alergias, { c: 'c3', ph: 'Nenhuma' })}
        ${campo('Medicamentos de uso contínuo', 'saude.medicamentos', a.saude.medicamentos, { c: 'c3' })}
        ${campo('Deficiência / necessidade específica', 'saude.deficiencia', a.saude.deficiencia, { c: 'c3' })}
        ${campo('Cartão SUS', 'saude.sus', a.saude.sus, { c: 'c3' })}
        ${campo('Observações de saúde', 'saude.obs', a.saude.obs, { c: 'c6', tipo: 'area' })}
      </div>`,
      () => `<div class="form">
        <div class="secao-form">Transporte</div>
        <div class="campo c6"><span class="rotulo">O aluno precisa da van para ir às aulas?</span>
          <div class="opcoes"><label class="marcar"><input type="radio" name="van.usa" value="sim" ${a.van.usa ? 'checked' : ''}>Sim, precisa da van</label>
          <label class="marcar"><input type="radio" name="van.usa" value="nao" ${!a.van.usa ? 'checked' : ''}>Não precisa</label></div></div>
        <div class="c6" id="van-campos" style="display:${a.van.usa ? 'contents' : 'none'}">
          ${campo('Ponto de embarque', 'van.embarque', a.van.embarque, { c: 'c3', ph: 'Ex.: Grama – em frente à igreja' })}
          ${campo('Ponto de desembarque', 'van.desembarque', a.van.desembarque, { c: 'c3', ph: 'Ex.: o mesmo do embarque' })}
          ${campo('Observações para o transporte', 'van.obs', a.van.obs, { c: 'c6', tipo: 'area', ph: 'Quem acompanha, quem pode buscar, horários…' })}
        </div>
      </div>`,
      () => {
        const projetos = Store.todos('projetos');
        return `<div class="secao-form" style="margin-bottom:12px">Em quais turmas o aluno vai estudar?</div>
          ${projetos.map((p) => `<div style="margin-bottom:16px">
            <div class="linha-flex" style="margin-bottom:8px"><span class="chip"><span class="bola" style="background:${p.cor}"></span>${esc(p.area)}</span><b>${esc(p.nome)}</b></div>
            <div class="grade g3" style="gap:10px">${D.turmasDoProjeto(p.id).map((t) => {
              const ocup = D.alunosDaTurma(t.id).length;
              return `<label class="registro marcar" style="margin:0;align-items:flex-start">
                <input type="checkbox" name="turmas" value="${t.id}" data-lista ${a.turmas.includes(t.id) ? 'checked' : ''}>
                <span><b>${esc(t.nome)}</b><br><span class="pequeno muted">${esc(D.diasTexto(t.dias))} · ${esc(t.horario)}<br>${esc(t.faixa || '')} · ${ocup}/${t.vagas} vagas</span></span>
              </label>`;
            }).join('')}</div></div>`).join('')}`;
      },
      () => `<div class="form">
        <div class="secao-form">Autorizações e termos</div>
        <label class="marcar c6"><input type="checkbox" name="autorizacoes.imagem" ${a.autorizacoes.imagem ? 'checked' : ''}>Autoriza o uso de imagem e voz em divulgação do Instituto</label>
        <label class="marcar c6"><input type="checkbox" name="autorizacoes.saida" ${a.autorizacoes.saida ? 'checked' : ''}>Autoriza participação em eventos e viagens fora do município</label>
        <label class="marcar c6"><input type="checkbox" name="autorizacoes.lgpd" ${a.autorizacoes.lgpd ? 'checked' : ''}>Consentimento para tratamento de dados pessoais (LGPD) *</label>
        ${existente ? '' : `<div class="campo c6"><label for="m-docs">Documentos da matrícula (opcional)</label><input type="file" id="m-docs" multiple><div class="ajuda">Certidão, comprovante de residência, declaração escolar… Nesta fase guardamos só o nome do arquivo.</div></div>`}
        ${existente ? `${campo('Situação', 'status', a.status, { c: 'c2', opcoes: [['ativo', 'Ativo'], ['espera', 'Lista de espera'], ['desligado', 'Desligado']] })}` : ''}
        <div class="secao-form">Resumo</div>
        <div class="c6" id="resumo-mat"></div>
      </div>`,
    ];

    const coletar = () => {
      const dados = UI.lerForm($('#form-mat'));
      if (etapa === 3) dados.van.usa = dados.van.usa === 'sim';
      if (etapa === 4) dados.turmas = dados.turmas || [];
      const mesclar = (alvo, src) => Object.entries(src).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) { alvo[k] = alvo[k] || {}; mesclar(alvo[k], v); } else alvo[k] = v;
      });
      mesclar(a, dados);
    };

    const validar = () => {
      const faltam = $$('[required]', $('#form-mat')).filter((i) => !i.value.trim());
      faltam.forEach((i) => { i.style.borderColor = 'var(--vermelho)'; i.addEventListener('input', () => (i.style.borderColor = ''), { once: true }); });
      if (faltam.length) { faltam[0].focus(); return false; }
      return true;
    };

    const desenhar = () => {
      $('#etapas').innerHTML = ETAPAS.map((n, i) => `<div class="etapa ${i === etapa ? 'ativa' : i < etapa ? 'feita' : ''}" data-i="${i}"><span class="n">${i < etapa ? '✓' : i + 1}</span>${n}</div>`).join('');
      $('#etapa-corpo').innerHTML = corpos[etapa]();
      $('#bt-voltar').style.visibility = etapa ? 'visible' : 'hidden';
      $('#bt-avancar').innerHTML = etapa === ETAPAS.length - 1 ? `${icon('check')}${existente ? 'Salvar alterações' : 'Concluir matrícula'}` : `Avançar${icon('setaD')}`;
      if (etapa === 3) $$('[name="van.usa"]').forEach((r) => r.addEventListener('change', () => { $('#van-campos').style.display = $('[name="van.usa"]:checked').value === 'sim' ? 'contents' : 'none'; }));
      if (etapa === 5) {
        $('#resumo-mat').innerHTML = `<dl class="dl">
          <dt>Aluno</dt><dd>${esc(a.nome || '—')} ${a.nascimento ? `· ${UI.idade(a.nascimento)} anos` : ''}</dd>
          <dt>Responsável</dt><dd>${esc(a.responsavel.nome || '—')} ${a.responsavel.telefone ? '· ' + esc(a.responsavel.telefone) : ''}</dd>
          <dt>Endereço</dt><dd>${esc([a.endereco.rua, a.endereco.numero, a.endereco.bairro].filter(Boolean).join(', ') || '—')}</dd>
          <dt>Van</dt><dd>${a.van.usa ? `Sim · embarque: ${esc(a.van.embarque || '—')}` : 'Não'}</dd>
          <dt>Turmas</dt><dd>${a.turmas.map((t) => esc(D.turma(t)?.nome)).join(', ') || '<span style="color:var(--amarelo)">Nenhuma turma escolhida</span>'}</dd>
        </dl>`;
      }
    };

    $('#etapas').addEventListener('click', (e) => {
      const i = e.target.closest('.etapa')?.dataset.i;
      if (i == null) return;
      coletar();
      etapa = +i; desenhar();
    });
    $('#bt-voltar').onclick = () => { coletar(); etapa--; desenhar(); };
    $('#bt-avancar').onclick = () => {
      if (!validar()) return;
      coletar();
      if (etapa < ETAPAS.length - 1) { etapa++; desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (!a.nome || !a.nascimento || !a.responsavel.nome) { UI.toast('Faltam dados obrigatórios nas etapas anteriores'); etapa = !a.nome || !a.nascimento ? 0 : 1; desenhar(); return; }
      if (!a.autorizacoes.lgpd) { UI.toast('Marque o consentimento LGPD para concluir'); return; }
      if (!existente) {
        const ano = UI.hojeISO().slice(0, 4);
        const seq = Store.filtrar('alunos', (x) => x.matricula.startsWith(ano)).length + 1;
        a.matricula = `${ano}${String(seq).padStart(4, '0')}`;
        a.data_matricula = UI.hojeISO();
        const docs = UI.arquivosDe($('#m-docs'));
        const salvo = Store.salvar('alunos', a);
        if (docs.length) Store.salvar('registros', { aluno_id: salvo.id, tipo: 'documento', data: UI.hojeISO(), titulo: 'Documentos de matrícula', autor: Store.sessao().id, texto: '', arquivos: docs, sigiloso: false });
        UI.toast(`Matrícula nº ${a.matricula} concluída`);
        location.hash = `#/alunos/${salvo.id}`;
      } else {
        if (a.status === 'desligado' && !a.desligamento) a.desligamento = { data: UI.hojeISO(), motivo: 'Desligado pela coordenação' };
        if (a.status !== 'desligado') a.desligamento = null;
        Store.salvar('alunos', a);
        UI.toast('Cadastro atualizado');
        location.hash = `#/alunos/${a.id}`;
      }
    };
    desenhar();
  };
})();
