/* Ficha completa do aluno */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, age, money } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.alunoDetalhe = async function (el, params, query) {
    const a = await ICM.api.alunos.get(params.id);
    if (!a) { el.innerHTML = ui().empty('Aluno não encontrado', 'user'); return; }
    ICM.app.setCrumbs([['Alunos', '#/alunos'], [a.nome]]);
    const sens = ICM.auth.can('alunos.sensivel');
    const freq = await ICM.api.alunos.frequencia(a.id);
    const alertaMax = freq.reduce((m, f) => f.faltas_mes > m.faltas_mes ? f : m, { faltas_mes: 0 });
    const tab0 = query.get('tab') || 'geral';
    const emprestados = await ICM.api.emprestimos.list({ aluno_id: a.id, status: 'ativo' });
    const assoc = ICM.auth.can('associados.gerir') ? await ICM.api.associados.doAluno(a.id) : null;
    const semCad = a.social && a.social.cadunico === false;

    const TABS = [
      ['geral', 'Visão geral', 'user'], ['timeline', 'Linha do tempo', 'history'], ['turmas', 'Turmas e frequência', 'layers'],
      ['agenda', 'Calendário', 'calendar'], ['ocorrencias', 'Advertências e ocorrências', 'alert'], ['emprestimos', 'Empréstimos', 'download'], ['evolucao', 'Evolução', 'chart'], ['social', 'Acompanhamento social', 'heart'],
      ['social', 'Social e financeiro', 'wallet'], ['saude', 'Saúde', 'heartPulse'], ['escola', 'Escolaridade', 'school']
    ];

    el.innerHTML = `<div class="page">
      <div class="card mb-4">
        <div class="profile-hero">
          ${ICM.util.avatar(a.nome, a.foto, 'lg')}
          <div class="grow">
            <h1 class="page-title" style="font-size:28px">${esc(a.nome)}</h1>
            <div class="meta">
              ${ui().statusAluno(a.status)}
              <span class="badge neutral">${esc(a.matricula)}</span>
              <span class="badge neutral">${age(a.nascimento) ?? '—'} anos</span>
              ${freq.filter(f => f.turma).map(f => `<span class="badge">${esc(f.turma.modalidade)}</span>`).join('')}
              ${alertaMax.faltas_mes ? ui().nivelPill(alertaMax.nivel, alertaMax.faltas_mes) : ''}
              ${a.saude && (a.saude.alergias || a.saude.condicoes || a.saude.medicamentos) ? `<span class="badge danger">${I('heartPulse', 13)} Atenção à saúde</span>` : ''}
              ${assoc ? `<a href="#/associados/${esc(assoc.id)}" class="badge ${assoc.em_dia ? 'ok' : 'danger'}">${I('key', 13)} Associado ${esc(assoc.numero)} — ${assoc.em_dia ? 'em dia' : `${assoc.vencidas} mensalidade(s) em atraso`}</a>` : semCad && ICM.auth.can('associados.gerir') ? `<a href="#/associados" class="badge warn">${I('alert', 13)} Sem CadÚnico e não associado</a>` : ''}
              ${a.social && a.social.cadunico ? `<span class="badge neutral">CadÚnico</span>` : ''}
              ${emprestados.length ? `<span class="badge" style="background:rgba(8,145,178,.14);color:#0891b2">${I('download', 13)} Com ${emprestados.reduce((s, e) => s + e.quantidade, 0)} bem(ns) emprestado(s)</span>` : ''}
              ${a.autorizacoes && !a.autorizacoes.imagem ? `<span class="badge warn">${I('camera', 13)} Sem autorização de imagem</span>` : ''}
            </div>
          </div>
          <div class="row wrap">
            ${ICM.auth.can('ocorrencias.registrar') ? `<button class="btn" data-oco>${I('plus', 18)} Registrar ocorrência</button>` : ''}
            ${ICM.auth.can('alunos.editar') ? `<a class="btn btn-primary" href="#/alunos/${esc(a.id)}/editar">${I('edit', 18)} Editar</a>` : ''}
            <button class="btn" data-ficha>${I('printer', 18)} Ficha</button>
          </div>
        </div>
      </div>
      <div class="tabs mb-4">${TABS.map(([k, t, ic]) => `<button class="tab ${k === tab0 ? 'active' : ''}" data-tab="${k}">${I(ic, 16)} ${t}</button>`).join('')}</div>
      <div data-panel></div>
    </div>`;

    const panel = el.querySelector('[data-panel]');
    const restricted = () => `<div class="card">${ui().empty('Informação restrita. Apenas coordenação, secretaria e direção têm acesso (LGPD).', 'lock')}</div>`;

    const renderers = {
      async geral() {
        const r = a.responsavel || {}, e = a.endereco || {}, au = a.autorizacoes || {};
        panel.innerHTML = `<div class="grid grid-2 tab-panel">
          <div class="card"><div class="section-title">${I('user', 18)} Dados pessoais</div>
            ${ui().kv([['Nome social', a.nome_social], ['Nascimento', fmtDate(a.nascimento)], ['Sexo', { F: 'Feminino', M: 'Masculino', O: 'Outro' }[a.sexo] || ''], ['Cor/raça', a.cor_raca], ['CPF', sens ? a.cpf : a.cpf], ['RG', a.rg], ['NIS', a.nis], ['Telefone', a.telefone], ['Matriculado em', fmtDate(a.data_matricula)]])}
          </div>
          <div class="card"><div class="section-title">${I('users', 18)} Responsável e endereço</div>
            ${ui().kv([['Responsável', r.nome], ['Parentesco', r.parentesco], ['Telefone', r.telefone], ['Profissão', r.profissao], ['Nascimento do responsável', r.nascimento ? `${fmtDate(r.nascimento)} (${age(r.nascimento)} anos)` : ''], ['Estado civil', r.estado_civil], ['Escolaridade do responsável', r.escolaridade], ['Endereço', [e.logradouro, e.numero].filter(Boolean).join(', ')], ['Bairro', e.bairro], ['Cidade', e.cidade], ['CEP', e.cep]])}
          </div>
          <div class="card span-all"><div class="section-title">${I('shield', 18)} Termos e autorizações</div>
            <div class="row wrap">
              ${au.lgpd ? ui().badge('Termo LGPD assinado', 'ok', true) : ui().badge('Termo LGPD pendente', 'danger', true)}
              ${au.imagem ? ui().badge('Uso de imagem autorizado', 'ok', true) : ui().badge('Uso de imagem NÃO autorizado', 'warn', true)}
              ${au.saida_sozinho ? ui().badge('Pode sair sozinho(a)', 'ok', true) : ui().badge('Sair somente com responsável', 'neutral', true)}
              ${au.data_termo ? `<span class="xs muted">Assinado em ${esc(fmtDate(au.data_termo))}</span>` : ''}
            </div>
          </div>
        </div>`;
      },

      async timeline() {
        const items = await ICM.api.alunos.timeline(a.id);
        const hoje = ICM.util.today();
        const fut = items.filter(x => x.data > hoje), past = items.filter(x => x.data <= hoje);
        const it = (x, f, i) => `<div class="tl-item ${f ? 'future' : ''}" style="animation-delay:${Math.min(i, 12) * .04}s"><div class="tl-dot" style="--c:${x.cor}">${I(x.icon, 15)}</div>
          <div class="tl-card"><div class="tl-date">${esc(fmtDate(x.data))}${f ? ' · programado' : ''}</div><div class="tl-title">${esc(x.titulo)}</div>${x.desc ? `<div class="tl-desc">${esc(x.desc)}</div>` : ''}</div></div>`;
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div><div class="card-title">Linha do tempo</div><div class="card-sub">Matrícula, turmas, aulas, ocorrências, apresentações e campeonatos</div></div></div>
          <div class="timeline">${fut.map((x, i) => it(x, true, i)).join('')}<div class="tl-now">Hoje</div>${past.map((x, i) => it(x, false, i + fut.length)).join('')}</div></div>`;
      },

      async turmas() {
        const mats = await ICM.api.alunos.turmas(a.id);
        panel.innerHTML = `<div class="col tab-panel">
          ${freq.length ? `<div class="grid grid-2">${freq.map(f => `<div class="card">
            <div class="card-head"><div><div class="card-title">${esc(f.turma.nome)}</div><div class="card-sub">${f.total} aulas registradas</div></div>${ui().nivelPill(f.nivel, f.faltas_mes) || ui().badge(`${f.freq ?? '—'}% presença`, f.freq >= 75 ? 'ok' : 'warn')}</div>
            <div class="progress ${f.freq >= 75 ? 'ok' : f.freq >= 60 ? 'warn' : 'danger'}"><span style="width:${f.freq || 0}%"></span></div>
            <div class="row mt-4 small"><span class="badge ok">${f.P} presenças</span><span class="badge danger">${f.F} faltas</span><span class="badge warn">${f.J} justificadas</span><span class="muted">· ${f.faltas_mes} falta(s) neste mês</span></div>
          </div>`).join('')}</div>` : ''}
          <div class="card"><div class="section-title">${I('history', 18)} Histórico de participação em turmas</div>
            ${mats.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Turma</th><th>Projeto</th><th>Entrada</th><th>Saída</th><th>Motivo</th><th>Situação</th></tr></thead><tbody>
            ${mats.map(m => `<tr class="clickable" data-href="#/turmas/${esc(m.turma_id)}"><td class="bold">${esc(m.turma.nome)}</td><td>${ui().areaChip(m.projeto.area)} <span class="small">${esc(m.projeto.nome)}</span></td><td>${esc(fmtDate(m.entrada))}</td><td>${esc(m.saida ? fmtDate(m.saida) : '—')}</td><td class="small">${esc(m.motivo_saida || '')}</td><td>${m.status === 'ativo' ? ui().badge('Ativo', 'ok', true) : ui().badge('Saiu', 'neutral', true)}</td></tr>`).join('')}
            </tbody></table></div>` : ui().empty('Ainda não participa de turmas', 'layers')}
          </div></div>`;
        panel.querySelectorAll('tr[data-href]').forEach(tr => tr.addEventListener('click', () => { location.hash = tr.dataset.href; }));
      },

      async agenda() {
        const evs = await ICM.api.alunos.agenda(a.id);
        let ref = new Date(); ref.setDate(1);
        const draw = () => {
          const y = ref.getFullYear(), m = ref.getMonth();
          const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - first.getDay());
          const hoje = ICM.util.today();
          const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
          panel.innerHTML = `<div class="card tab-panel">
            <div class="card-head"><div class="card-title" style="text-transform:capitalize">${esc(ICM.util.MESES[m])} de ${y}</div>
              <div class="row"><button class="btn btn-sm btn-icon" data-m="-1" aria-label="Mês anterior">${I('chevronLeft', 16)}</button><button class="btn btn-sm" data-m="0">Hoje</button><button class="btn btn-sm btn-icon" data-m="1" aria-label="Próximo mês">${I('chevronRight', 16)}</button></div></div>
            <div class="cal">${ICM.util.DIAS_C.map(d => `<div class="dow">${d}</div>`).join('')}
              ${cells.map(d => { const k = ICM.util.iso(d); const es = evs.filter(e => e.data === k); return `<div class="day ${d.getMonth() !== m ? 'other' : ''} ${k === hoje ? 'today' : ''}"><span class="n">${d.getDate()}</span>${es.map(e => `<span class="ev" style="--c:${e.cor}" title="${esc(e.titulo)}">${esc(e.hora || '')} ${esc(e.titulo)}</span>`).join('')}</div>`; }).join('')}
            </div>
            <div class="row wrap mt-4 xs muted"><span class="ev" style="--c:#2563eb">Aula</span>${Object.values(ICM.C.TIPOS_EVENTO).map(t => `<span class="ev" style="--c:${t.cor}">${esc(t.nome)}</span>`).join('')}</div>
          </div>`;
          panel.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { const v = +b.dataset.m; if (v === 0) { ref = new Date(); ref.setDate(1); } else ref.setMonth(ref.getMonth() + v); draw(); }));
        };
        draw();
      },

      async ocorrencias() {
        const list = await ICM.api.ocorrencias.list(a.id);
        const users = await ICM.api.usuarios.list();
        panel.innerHTML = `<div class="card tab-panel"><div class="card-head"><div class="card-title">Advertências, ocorrências e destaques</div>
          ${ICM.auth.can('ocorrencias.registrar') ? `<button class="btn btn-primary btn-sm" data-oco>${I('plus', 16)} Registrar</button>` : ''}</div>
          ${list.length ? list.map(o => { const t = ICM.C.TIPOS_OCORRENCIA[o.tipo]; const u = users.find(x => x.id === o.registrado_por); return `
            <div class="list-item" style="align-items:flex-start"><div class="avatar sm" style="--c:${{ danger: '#ef4444', warn: '#f59e0b', ok: '#10b981', neutral: '#64748b' }[t.cls]}">${I(t.icon, 15)}</div>
              <div class="grow"><div class="row wrap">${ui().badge(t.nome, t.cls)}<b>${esc(o.titulo)}</b><span class="xs muted">${esc(fmtDate(o.data))} · por ${esc(u ? u.nome : '—')}</span></div><div class="text-block small mt-2">${esc(o.descricao)}</div></div>
              ${ICM.auth.can('alunos.editar') ? `<button class="btn btn-icon btn-sm btn-ghost" data-del="${esc(o.id)}" aria-label="Excluir">${I('trash', 16)}</button>` : ''}</div>`; }).join('')
            : ui().empty('Nenhum registro', 'clipboardCheck')}</div>`;
        panel.querySelectorAll('[data-oco]').forEach(b => b.addEventListener('click', novaOcorrencia));
        panel.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
          if (await ui().confirm({ title: 'Excluir registro', text: 'Esta ação ficará registrada na auditoria.', ok: 'Excluir', danger: true })) { await ui().run(() => ICM.api.ocorrencias.remove(b.dataset.del), 'Registro excluído'); renderers.ocorrencias(); }
        }));
      },

      async social() {
        if (!sens) { panel.innerHTML = restricted(); return; }
        const s = a.social || {}, f = a.financeiro || {};
        panel.innerHTML = `<div class="grid grid-2 tab-panel">
          <div class="card"><div class="section-title">${I('home', 18)} Situação social</div>
            ${ui().kv([['Inscrito no CadÚnico', s.cadunico ? 'Sim' : s.cadunico === false ? 'Não (deve ser associado)' : ''], ['Pessoas na residência', s.pessoas_casa], ['Moradia', s.moradia], ['Acompanhado pelo CRAS', s.cras], ['Benefícios', (s.beneficios || []).join(', ')]])}
            ${s.vulnerabilidades ? `<div class="mt-4"><div class="k xs bold muted">VULNERABILIDADES</div><div class="text-block">${esc(s.vulnerabilidades)}</div></div>` : ''}</div>
          <div class="card"><div class="section-title">${I('wallet', 18)} Situação financeira</div>
            ${ui().kv([['Renda familiar', f.renda_familiar != null ? money(f.renda_familiar) : ''], ['Renda per capita', f.renda_per_capita != null ? money(f.renda_per_capita) : ''], ['Fonte de renda', f.fonte_renda], ['Isento de contribuição', f.isencao ? 'Sim' : 'Não'], ['Contribuição mensal', f.isencao ? '' : money(f.contribuicao_mensal)], ['Observações', f.observacoes]])}
            ${f.renda_per_capita != null ? `<div class="mt-4">${f.renda_per_capita <= 706 ? ui().badge('Renda per capita até ½ salário mínimo', 'warn', true) : ui().badge('Acima de ½ salário mínimo per capita', 'neutral', true)}</div>` : ''}</div>
        </div>`;
      },

      async saude() {
        const s = a.saude || {};
        panel.innerHTML = `<div class="card tab-panel">
          ${s._restrito ? `<div class="sens-lock mb-4">${I('lock', 18)} Você está vendo a ficha de emergência. Dados completos de saúde são restritos.</div>` : ''}
          <div class="grid grid-3 mb-4">
            ${[['Alergias', s.alergias, 'alert'], ['Medicamentos', s.medicamentos, 'heart'], ['Condições', s.condicoes, 'heartPulse']].map(([t, v, ic]) => `<div class="card flat" style="${v ? 'box-shadow:0 0 0 2px rgba(239,68,68,.35),var(--sh-out-sm)' : ''}"><div class="row">${I(ic, 18)}<b>${t}</b></div><div class="mt-2 ${v ? 'bold' : 'muted'}">${esc(v || 'Nenhuma informada')}</div></div>`).join('')}
          </div>
          ${ui().kv(s._restrito ? [['Apto a atividade física', s.apto_atividade_fisica ? 'Sim' : 'Não'], ['Contato de emergência', s.contato_emergencia]] :
            [['Tipo sanguíneo', s.tipo_sanguineo], ['Plano de saúde', s.plano_saude], ['UBS de referência', s.ubs], ['Deficiência', s.deficiencia], ['Apto a atividade física', s.apto_atividade_fisica ? 'Sim' : 'Não'], ['Contato de emergência', s.contato_emergencia], ['Observações', s.observacoes]])}
        </div>`;
      },

      async evolucao() { await ICM.pages._abaEvolucao(panel, a); },
      async social() { await ICM.pages._abaSocial(panel, a); },

      async emprestimos() {
        const l = await ICM.api.emprestimos.list({ aluno_id: a.id });
        const comigo = l.filter(e => e.status === 'ativo');
        panel.innerHTML = `<div class="card tab-panel">
          <div class="card-head"><div><div class="card-title">Bens emprestados ao aluno</div><div class="card-sub">${comigo.length ? `Em posse agora: ${comigo.map(e => `${e.quantidade}x ${esc(e.item.nome)}`).join(', ')}` : 'Nenhum bem em posse do aluno no momento'}</div></div>
            ${ICM.auth.can('patrimonio.emprestar') ? `<button class="btn btn-primary btn-sm" data-novoemp>${I('download', 16)} Emprestar bem</button>` : ''}</div>
          ${ICM.pages._empTable(l)}</div>`;
        ICM.pages._bindEmpTable(panel, () => renderers.emprestimos());
        const b = panel.querySelector('[data-novoemp]');
        if (b) b.addEventListener('click', async () => { await ICM.pages._emprestarModal({ aluno_id: a.id }); });
      },

      async escola() {
        const e = a.escolaridade || {};
        panel.innerHTML = `<div class="card tab-panel"><div class="section-title">${I('school', 18)} Escolaridade</div>${ui().kv([['Escola', e.escola], ['Rede', e.rede], ['Ano/série', e.serie], ['Turno', e.turno], ['Desempenho', e.desempenho], ['Observações', e.observacoes]])}</div>`;
      }
    };

    function novaOcorrencia() {
      const m = ui().modal({
        title: 'Registrar ocorrência', size: 'sm',
        body: `<form class="col">
          ${ui().field({ name: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(ICM.C.TIPOS_OCORRENCIA).filter(([k]) => k !== 'atendimento' || sens).map(([k, v]) => [k, v.nome]) })}
          ${ui().field({ name: 'data', label: 'Data', type: 'date', value: ICM.util.today(), required: true })}
          ${ui().field({ name: 'titulo', label: 'Título', required: true, placeholder: 'Resumo do ocorrido' })}
          ${ui().field({ name: 'descricao', label: 'Descrição', type: 'textarea', placeholder: 'Descreva os fatos de forma objetiva, as providências tomadas e se a família foi comunicada.' })}
        </form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Registrar</button>`
      });
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(m.$('form'));
        await ui().run(() => ICM.api.ocorrencias.save({ ...d, aluno_id: a.id }), 'Ocorrência registrada');
        m.close(); el.querySelector('[data-tab="ocorrencias"]').click();
      }).catch(() => { }));
    }

    el.querySelectorAll('[data-oco]').forEach(b => b.addEventListener('click', novaOcorrencia));
    el.querySelector('[data-ficha]').addEventListener('click', () => ICM.reports.fichaAluno(a.id));
    ui().tabs(el.querySelector('.tabs'), k => renderers[k]());
    await renderers[tab0]();
  };
})();
