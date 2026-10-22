/* Lista de espera com triagem socioeconômica e pontuação automática */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate, money } = ICM.util;
  const ui = () => ICM.ui;
  const ST = { aguardando: ['Aguardando', ''], convocado: ['Convocado', 'warn'], matriculado: ['Matriculado', 'ok'], desistiu: ['Desistiu', 'neutral'] };

  const ptsBadge = n => `<span class="score" style="--p:${Math.min(100, n)}">${n}</span>`;

  ICM.pages.espera = async function (el) {
    if (!ICM.auth.can('espera.gerir')) { el.innerHTML = ui().empty('Acesso restrito à coordenação e secretaria.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Lista de espera']]);
    const turmas = await ICM.api.espera.vagasTurmas();
    const abertas = turmas.filter(t => t.livres > 0);
    let status = 'aguardando', turma = '';

    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Lista de espera</h1><div class="page-sub">Triagem socioeconômica com pontuação automática e transparente para preencher as vagas</div></div>
        <div class="row wrap"><button class="btn" data-rel>${I('fileText', 18)} Classificação (PDF)</button><button class="btn btn-primary" data-novo>${I('userPlus', 18)} Nova inscrição</button></div></div>
      <div class="card mb-4"><div class="card-head"><div><div class="card-title">${I('layers', 18)} Vagas abertas agora</div><div class="card-sub">Ao abrir vaga, chame o candidato de maior pontuação interessado na turma</div></div></div>
        ${abertas.length ? `<div class="grid grid-3">${abertas.map(t => `<div class="card flat"><div class="row between"><b>${esc(t.nome)}</b><span class="badge ok">${t.livres} vaga(s)</span></div><div class="xs muted mt-2">${t.ocupadas}/${t.vagas} ocupadas · ${esc(t.faixa || '')}</div><button class="btn btn-sm btn-primary mt-4" data-chamar="${esc(t.id)}">${I('sparkles', 14)} Chamar próximo da fila</button></div>`).join('')}</div>` : ui().empty('Todas as turmas estão lotadas', 'layers')}
      </div>
      <div class="card">
        <div class="row wrap between mb-4">
          <div class="segmented" data-st>${Object.entries(ST).map(([k, v]) => `<button data-v="${k}" class="${k === status ? 'active' : ''}">${v[0]}</button>`).join('')}<button data-v="">Todos</button></div>
          <select class="select" data-turma style="width:260px"><option value="">Todas as turmas</option>${turmas.map(t => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join('')}</select>
        </div><div data-l></div>
      </div></div>`;

    const tn = id => (turmas.find(t => t.id === id) || {}).nome || '';
    async function draw() {
      const l = await ICM.api.espera.list({ status, turma_id: turma || undefined });
      el.querySelector('[data-l]').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Candidato</th><th>Idade</th><th>Interesse</th><th>Critérios</th><th>Inscrição</th><th>Pontos</th><th>Situação</th></tr></thead><tbody>
        ${l.map((c, i) => `<tr class="clickable" data-id="${esc(c.id)}"><td class="bold">${status === 'aguardando' ? i + 1 + 'º' : ''}</td>
          <td><b>${esc(c.nome)}</b><div class="xs muted">${esc(c.protocolo)} · ${esc(c.responsavel.nome)}</div></td><td>${c.idade ?? '—'}</td>
          <td class="small">${(c.interesses || []).map(t => `<span class="badge neutral">${esc(tn(t))}</span>`).join(' ')}</td>
          <td class="xs muted" style="max-width:260px">${c.triagem.itens.slice(0, 3).map(x => esc(x.txt)).join(' · ')}${c.triagem.itens.length > 3 ? ` +${c.triagem.itens.length - 3}` : ''}</td>
          <td class="small">${esc(fmtDate(c.data_inscricao))}</td><td>${ptsBadge(c.triagem.total)}</td><td>${ui().badge(ST[c.status][0], ST[c.status][1], true)}</td></tr>`).join('')}
      </tbody></table></div>` : ui().empty('Nenhuma inscrição', 'users');
      el.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => detalhe(tr.dataset.id)));
    }
    el.querySelectorAll('[data-st] button').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('[data-st] button').forEach(x => x.classList.toggle('active', x === b)); status = b.dataset.v; draw(); }));
    el.querySelector('[data-turma]').addEventListener('change', e => { turma = e.target.value; draw(); });
    el.querySelector('[data-novo]').addEventListener('click', () => form());
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('espera_classificacao'));
    el.querySelectorAll('[data-chamar]').forEach(b => b.addEventListener('click', () => chamar(b.dataset.chamar)));
    await draw();

    async function chamar(turmaId) {
      const t = turmas.find(x => x.id === turmaId);
      const l = (await ICM.api.espera.list({ turma_id: turmaId })).filter(c => c.status === 'aguardando' || c.status === 'convocado');
      const m = ui().modal({
        title: `Fila para ${t.nome}`, body: l.length ? `<p class="small muted mb-4">${t.livres} vaga(s). Ordem por pontuação; empate pela data de inscrição.</p>${l.map((c, i) => `<div class="list-item"><b style="width:28px">${i + 1}º</b>${ptsBadge(c.triagem.total)}<div class="grow"><b>${esc(c.nome)}</b><div class="xs muted">${c.idade} anos · ${esc(c.responsavel.nome)} · ${esc(c.responsavel.telefone)}</div></div>${ui().badge(ST[c.status][0], ST[c.status][1])}<button class="btn btn-sm" data-ver="${esc(c.id)}">Ver</button></div>`).join('')}` : ui().empty('Ninguém na fila para esta turma', 'users')
      });
      m.$$('[data-ver]').forEach(b => b.addEventListener('click', () => { m.close(); detalhe(b.dataset.ver, turmaId); }));
    }

    async function detalhe(id, turmaSugerida) {
      const c = await ICM.api.espera.get(id);
      const m = ui().modal({
        title: `${c.protocolo} — ${c.nome}`, size: 'wide',
        body: `<div class="grid grid-2">
          <div><div class="section-title">${I('user', 18)} Dados</div>${ui().kv([['Idade', `${c.idade} anos`], ['Responsável', `${c.responsavel.nome} (${c.responsavel.parentesco || ''})`], ['Telefone', c.responsavel.telefone], ['Bairro', c.bairro], ['Escola', `${c.escola || ''} — ${c.rede || ''}`], ['Inscrito em', fmtDate(c.data_inscricao)], ['Interesse', (c.interesses || []).map(tn).join(', ')], ['Observações', c.obs]])}</div>
          <div><div class="section-title">${I('target', 18)} Pontuação da triagem</div>
            <div class="row mb-4">${ptsBadge(c.triagem.total)}<div><b style="font-size:20px">${c.triagem.total} pontos</b><div class="xs muted">Renda per capita: ${c.triagem.renda_pc != null ? esc(money(c.triagem.renda_pc)) : '—'}</div></div></div>
            ${c.triagem.itens.map(x => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line-2)"><span>${esc(x.txt)}</span><b>+${x.pts}</b></div>`).join('') || '<div class="muted small">Nenhum critério de prioridade</div>'}</div>
        </div>`,
        foot: `<button class="btn" data-ficha style="margin-right:auto">${I('printer', 16)} Ficha de triagem</button>
          ${c.status === 'aguardando' || c.status === 'convocado' ? `<button class="btn" data-edit>${I('edit', 16)} Editar</button><button class="btn btn-danger" data-desist>Desistiu</button>${c.status === 'aguardando' ? `<button class="btn" data-conv>${I('phone', 16)} Marcar convocado</button>` : ''}<button class="btn btn-primary" data-mat>${I('userCheck', 16)} Matricular</button>` : c.aluno_id ? `<a class="btn btn-primary" href="#/alunos/${esc(c.aluno_id)}">Ver aluno</a>` : ''}`
      });
      const on = (s, fn) => { const b = m.$(s); if (b) b.addEventListener('click', fn); };
      on('[data-ficha]', () => ICM.reports.generate('espera_ficha', { id }));
      on('[data-edit]', () => { m.close(); form(c); });
      on('[data-conv]', async () => { await ui().run(() => ICM.api.espera.status(id, 'convocado'), 'Marcado como convocado — registre o contato com a família'); m.close(); draw(); });
      on('[data-desist]', async () => { if (await ui().confirm({ title: 'Registrar desistência', text: `${c.nome} sairá da fila.`, ok: 'Confirmar', danger: true })) { await ui().run(() => ICM.api.espera.status(id, 'desistiu'), 'Desistência registrada'); m.close(); draw(); } });
      on('[data-mat]', () => {
        const opts = turmas.filter(t => t.livres > 0 || t.livres === null);
        const mm = ui().modal({
          title: 'Matricular candidato', size: 'sm',
          body: `<p class="small">Cria o cadastro de <b>${esc(c.nome)}</b> com os dados da triagem e inclui na turma. Depois complete a ficha (documentos, saúde e termo LGPD).</p>
            ${ui().field({ name: 'turma', label: 'Turma', type: 'select', value: turmaSugerida || (c.interesses || [])[0], options: opts.map(t => [t.id, `${t.nome} (${t.livres ?? '∞'} vaga)`]) })}`,
          foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Matricular</button>`
        });
        mm.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
          const a = await ui().run(() => ICM.api.espera.matricular(id, mm.$('[name=turma]').value), 'Matrícula criada a partir da lista de espera');
          mm.close(); m.close(); location.hash = `#/alunos/${a.id}/editar`;
        }).catch(() => { }));
      });
    }

    function form(c = { responsavel: {}, interesses: [], vulnerabilidades: [] }) {
      const F = o => ui().field(o);
      const V = ICM.C.TRIAGEM.vulnerabilidades;
      const m = ui().modal({
        title: c.id ? 'Editar inscrição' : 'Nova inscrição na lista de espera', size: 'wide',
        body: `<form class="grid grid-3">
          ${F({ name: 'nome', label: 'Nome da criança/adolescente', value: c.nome, required: true, cls: 'span-2' })}
          ${F({ name: 'nascimento', label: 'Nascimento', type: 'date', value: c.nascimento })}
          ${F({ name: 'responsavel.nome', label: 'Responsável', value: c.responsavel.nome, required: true })}
          ${F({ name: 'responsavel.parentesco', label: 'Parentesco', type: 'select', value: c.responsavel.parentesco, options: ['', 'Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Tutor(a)', 'Outro'] })}
          ${F({ name: 'responsavel.telefone', label: 'Telefone', value: c.responsavel.telefone, required: true })}
          ${F({ name: 'bairro', label: 'Bairro', value: c.bairro })}
          ${F({ name: 'escola', label: 'Escola', value: c.escola })}
          ${F({ name: 'rede', label: 'Rede de ensino', type: 'select', value: c.rede, options: ['', 'Municipal', 'Estadual', 'Federal', 'Particular', 'Não estuda'] })}
          <div class="field span-all"><span class="label">Turmas de interesse</span><div class="row wrap">${turmas.map(t => `<label class="check"><input type="checkbox" name="interesses" value="${esc(t.id)}" data-multi ${(c.interesses || []).includes(t.id) ? 'checked' : ''}> ${esc(t.nome)}</label>`).join('')}</div></div>
          <div class="span-all section-title mt-4">${I('wallet', 18)} Triagem socioeconômica</div>
          ${F({ name: 'renda_familiar', label: 'Renda familiar (R$)', type: 'number', value: c.renda_familiar, attrs: 'min="0"' })}
          ${F({ name: 'pessoas_casa', label: 'Pessoas na casa', type: 'number', value: c.pessoas_casa, attrs: 'min="1"' })}
          ${F({ name: 'encaminhamento', label: 'Encaminhado por', type: 'select', value: c.encaminhamento, options: ICM.C.ENCAMINHAMENTOS.map(x => [x, x || 'Procura espontânea']) })}
          ${F({ name: 'cadunico', label: 'Inscrito no CadÚnico', type: 'toggle', value: c.cadunico })}
          ${F({ name: 'beneficio', label: 'Recebe benefício social', type: 'toggle', value: c.beneficio })}
          <div class="span-all field"><span class="label">Situações de vulnerabilidade</span><div class="grid grid-2" style="gap:8px">${Object.entries(V).map(([k, v]) => `<label class="check small"><input type="checkbox" name="vulnerabilidades" value="${k}" data-multi ${(c.vulnerabilidades || []).includes(k) ? 'checked' : ''}> ${esc(v.txt)} <span class="muted">(+${v.pts})</span></label>`).join('')}</div></div>
          ${F({ name: 'obs', label: 'Observações', type: 'textarea', value: c.obs, cls: 'span-all', rows: 2 })}
          <div class="span-all card flat row" data-preview></div>
        </form>`,
        foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 18)} Salvar inscrição</button>`
      });
      const f = m.$('form');
      const prev = () => { const d = ICM.util.formData(f); const t = ICM.api.espera.pontuar({ ...d, data_inscricao: c.data_inscricao || ICM.util.today() }); m.$('[data-preview]').innerHTML = `${ptsBadge(t.total)}<div><b>Pontuação calculada: ${t.total}</b><div class="xs muted">${t.itens.map(x => esc(x.txt)).join(' · ') || 'Nenhum critério marcado'}</div></div>`; };
      f.addEventListener('input', prev); f.addEventListener('change', prev); prev();
      m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
        const d = ICM.util.formData(f); d.interesses = d.interesses || []; d.vulnerabilidades = d.vulnerabilidades || [];
        const r = await ui().run(() => ICM.api.espera.save(c.id ? { ...c, ...d, triagem: undefined, idade: undefined } : d), c.id ? 'Inscrição atualizada' : 'Inscrição registrada');
        m.close(); draw(); if (!c.id) ICM.ui.toast(`Protocolo ${r.protocolo}`, 'ok');
      }).catch(() => { }));
    }
  };
})();
