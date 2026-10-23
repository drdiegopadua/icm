/* Acompanhamento social: painel, PIA (Plano Individual de Atendimento), encaminhamentos à rede,
   pareceres e avaliações de evolução dos alunos (inicial → intermediária → final). */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;
  const SE = () => ICM.C.STATUS_ENCAMINHAMENTO;
  const COMP = () => ICM.C.COMPETENCIAS;
  const STO = { pendente: ['Pendente', 'neutral'], em_andamento: ['Em andamento', 'warn'], concluido: ['Concluído', 'ok'] };

  // ================= Painel =================
  ICM.pages.social = async function (el) {
    if (!ICM.auth.can('social.gerir')) { el.innerHTML = ui().empty('Acesso restrito ao serviço social e coordenação.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Acompanhamento social']]);
    const p = await ICM.api.social.painel();
    const projetos = await ICM.api.projetos.list(); const turmas = await ICM.api.turmas.list();
    const evo = []; for (const pr of projetos) { const tids = turmas.filter(t => t.projeto_id === pr.id).map(t => t.id); if (tids.length) evo.push({ pr, e: await ICM.api.social.evolucao({ turma_ids: tids }) }); }
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Acompanhamento social</h1><div class="page-sub">Planos individuais, encaminhamentos à rede de proteção e evolução dos alunos</div></div>
        <button class="btn btn-primary" data-enc>${I('plus', 18)} Novo encaminhamento</button></div>
      <div class="grid grid-4 stagger mb-4">
        ${ICM.pages._stat('clipboard', '#2563eb', p.totalPia, 'Alunos com PIA')}
        ${ICM.pages._stat('upload', '#f59e0b', p.encAbertos.length, 'Encaminhamentos em aberto')}
        ${ICM.pages._stat('alert', '#ef4444', p.encSemRetorno.length, 'Sem retorno da rede')}
        ${ICM.pages._stat('calendar', '#8b5cf6', p.piasRevisar.length, 'PIAs para revisar')}
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="card-title mb-4">${I('alert', 18)} Cobrar retorno da rede</div>${p.encSemRetorno.map(e => `<a class="list-item" href="#/alunos/${esc(e.aluno_id)}?tab=social"><div class="grow"><b>${esc(e.aluno_nome)}</b><div class="xs muted">${esc(e.orgao)} · ${esc(e.motivo)}</div></div><span class="badge danger">${e.dias} dias</span></a>`).join('') || ui().empty('Nenhum encaminhamento parado 🎉', 'check')}</div>
        <div class="card"><div class="card-title mb-4">${I('calendar', 18)} PIAs para revisar</div>${p.piasRevisar.map(x => `<a class="list-item" href="#/alunos/${esc(x.aluno_id)}?tab=social"><b class="grow">${esc(x.aluno_nome)}</b><span class="badge warn">revisar ${esc(fmtDate(x.revisar_em))}</span></a>`).join('') || ui().empty('Nenhuma revisão pendente', 'check')}</div>
        <div class="card span-all"><div class="card-head"><div><div class="card-title">${I('chart', 18)} Evolução dos alunos por projeto</div><div class="card-sub">Comparação entre a avaliação inicial e a mais recente de cada aluno (escala 1 a 5)</div></div><button class="btn btn-sm" data-rel>${I('fileText', 14)} Relatório de resultados</button></div>
          <div class="grid grid-2">${evo.filter(x => x.e.alunos).map(({ pr, e }) => `<div class="card flat"><div class="row between"><b>${esc(pr.nome)}</b><span class="badge ok">${e.pct_geral}% evoluíram</span></div><div class="xs muted mb-4">${e.alunos} alunos avaliados</div>${barrasEvo(e.linhas)}</div>`).join('') || ui().empty('Sem avaliações ainda', 'chart')}</div></div>
        <div class="card span-all"><div class="card-title mb-4">${I('upload', 18)} Encaminhamentos em aberto</div>${tabelaEnc(p.encAbertos, true)}</div>
      </div></div>`;
    el.querySelector('[data-enc]').addEventListener('click', () => encForm({}));
    el.querySelector('[data-rel]').addEventListener('click', () => ICM.reports.openDialog('social_resultados'));
    bindEnc(el);
  };

  function barrasEvo(linhas) {
    return linhas.filter(l => l.inicial != null).map(l => `<div class="evo-row"><span class="small grow">${esc(l.nome)}</span><div class="evo-bar"><span class="ini" style="width:${l.inicial / 5 * 100}%"></span><span class="at" style="width:${l.atual / 5 * 100}%"></span></div><b class="xs" style="width:72px;text-align:right">${l.inicial} → ${l.atual}</b></div>`).join('') + '<div class="row xs muted mt-2"><span class="evo-leg ini"></span> inicial <span class="evo-leg at"></span> atual</div>';
  }
  ICM.pages._barrasEvo = barrasEvo;

  function tabelaEnc(l, comAluno) {
    if (!l.length) return ui().empty('Nenhum encaminhamento', 'upload');
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th>${comAluno ? '<th>Aluno(a)</th>' : ''}<th>Órgão</th><th>Motivo</th><th>Retorno</th><th>Situação</th><th></th></tr></thead><tbody>${l.map(e => `<tr><td class="small">${esc(fmtDate(e.data))}</td>${comAluno ? `<td><a href="#/alunos/${esc(e.aluno_id)}?tab=social"><b>${esc(e.aluno_nome || '')}</b></a></td>` : ''}<td><b>${esc(e.orgao)}</b></td><td class="small">${esc(e.motivo)}</td><td class="xs">${esc(e.retorno || '—')}${e.data_retorno ? `<div class="muted">${esc(fmtDate(e.data_retorno))}</div>` : ''}</td><td>${ui().badge(SE()[e.status][0], SE()[e.status][1], true)}</td><td><button class="btn btn-sm" data-enced="${esc(e.id)}">${I('edit', 14)} Atualizar</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function bindEnc(root, after) {
    root.querySelectorAll('[data-enced]').forEach(b => b.addEventListener('click', async () => { const e = (await ICM.api.social.encaminhamentos()).find(x => x.id === b.dataset.enced); encForm(e, after); }));
  }
  async function encForm(e, after) {
    const F = o => ui().field(o); const alunos = await ICM.api.alunos.list({ status: 'ativo' });
    const m = ui().modal({ title: e.id ? 'Atualizar encaminhamento' : 'Novo encaminhamento à rede', body: `<form class="grid grid-2">
      ${e.aluno_id ? '' : F({ name: 'aluno_id', label: 'Aluno(a)', type: 'select', options: [['', 'Selecione…'], ...alunos.map(a => [a.id, a.nome])], cls: 'span-2' })}
      ${F({ name: 'orgao', label: 'Encaminhado para', type: 'select', value: e.orgao, options: ICM.C.ORGAOS_REDE })}${F({ name: 'data', label: 'Data', type: 'date', value: e.data || ICM.util.today() })}
      ${F({ name: 'motivo', label: 'Motivo', value: e.motivo, cls: 'span-2', required: true })}${F({ name: 'descricao', label: 'Detalhes / contato no órgão', type: 'textarea', rows: 2, value: e.descricao, cls: 'span-2' })}
      ${F({ name: 'status', label: 'Situação', type: 'select', value: e.status || 'enviado', options: Object.entries(SE()).map(([k, v]) => [k, v[0]]) })}${F({ name: 'data_retorno', label: 'Data do retorno', type: 'date', value: e.data_retorno })}
      ${F({ name: 'retorno', label: 'Retorno recebido', type: 'textarea', rows: 2, value: e.retorno, cls: 'span-2' })}</form>
      <div class="xs muted mt-2">${I('lock', 12)} Informação sigilosa — visível apenas ao serviço social e coordenação.</div>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` });
    m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.social.salvarEncaminhamento({ ...e, ...ICM.util.formData(m.$('form')), aluno_nome: undefined, dias: undefined }), 'Encaminhamento salvo'); m.close(); after ? after() : ICM.app.reload(); });
  }

  // ================= Aba "Acompanhamento social" na ficha do aluno =================
  ICM.pages._abaSocial = async function (panel, a) {
    if (!ICM.auth.can('social.gerir')) { panel.innerHTML = `<div class="card">${ui().empty('Informação restrita ao serviço social e coordenação.', 'lock')}</div>`; return; }
    const pia = await ICM.api.social.pia(a.id);
    const enc = await ICM.api.social.encaminhamentos({ aluno_id: a.id });
    const par = await ICM.api.social.pareceres(a.id);
    const redraw = () => ICM.pages._abaSocial(panel, a);
    panel.innerHTML = `<div class="col tab-panel">
      <div class="card"><div class="card-head"><div><div class="card-title">${I('clipboard', 18)} Plano Individual de Atendimento (PIA)</div><div class="card-sub">${pia ? `Elaborado em ${esc(fmtDate(pia.elaborado_em))} por ${esc(pia.responsavel || '')} · revisar em ${esc(fmtDate(pia.revisar_em))}` : 'Ainda não elaborado'}</div></div><div class="row"><button class="btn btn-sm" data-piaobj>${I('plus', 14)} Objetivo</button><button class="btn btn-sm btn-primary" data-pia>${I('edit', 14)} ${pia ? 'Editar' : 'Elaborar'} PIA</button></div></div>
        ${pia ? `<p class="small"><b>Situação:</b> ${esc(pia.situacao || '')}</p>${pia.participaram ? `<p class="xs muted">Participaram: ${esc(pia.participaram)}</p>` : ''}
          <div class="table-wrap mt-4"><table class="table"><thead><tr><th>Área</th><th>Objetivo</th><th>Ações</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>${(pia.objetivos || []).map(o => `<tr><td class="small bold">${esc(o.area)}</td><td class="small">${esc(o.objetivo)}</td><td class="xs">${esc(o.acoes)}</td><td class="xs">${esc(o.responsavel)}</td><td class="xs">${esc(fmtDate(o.prazo))}</td><td><select class="select" data-ost="${esc(o.id)}" style="height:32px;font-size:12px">${Object.entries(STO).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : ''}</div>
      <div class="card"><div class="card-head"><div class="card-title">${I('upload', 18)} Encaminhamentos à rede</div><button class="btn btn-sm btn-primary" data-novoenc>${I('plus', 14)} Encaminhar</button></div>${tabelaEnc(enc, false)}</div>
      <div class="card"><div class="card-head"><div class="card-title">${I('fileText', 18)} Pareceres</div><button class="btn btn-sm btn-primary" data-par>${I('plus', 14)} Novo parecer</button></div>${par.map(x => `<div class="list-item" style="align-items:flex-start">${I('fileText', 18)}<div class="grow"><div class="row wrap">${ui().badge({ social: 'Social', pedagogico: 'Pedagógico', psicologico: 'Psicológico' }[x.tipo] || x.tipo, 'neutral')}<span class="xs muted">${esc(fmtDate(x.data))} · ${esc(x.autor)}</span></div><div class="text-block small mt-2">${esc(x.texto)}</div></div></div>`).join('') || ui().empty('Nenhum parecer', 'fileText')}</div>
      <div class="xs muted">${I('lock', 12)} Dados sigilosos (LGPD e ECA). Cada acesso fica registrado na auditoria.</div></div>`;
    panel.querySelectorAll('[data-ost]').forEach(s => s.addEventListener('change', async () => { pia.objetivos.find(o => o.id === s.dataset.ost).status = s.value; await ICM.api.social.salvarPia(pia); ui().toast('Objetivo atualizado', 'ok'); }));
    panel.querySelector('[data-novoenc]').addEventListener('click', () => encForm({ aluno_id: a.id }, redraw));
    bindEnc(panel, redraw);
    panel.querySelector('[data-par]').addEventListener('click', () => { const F = o => ui().field(o); const m = ui().modal({ title: 'Novo parecer', body: `<form class="col">${F({ name: 'tipo', label: 'Tipo', type: 'select', options: [['social', 'Social'], ['pedagogico', 'Pedagógico'], ['psicologico', 'Psicológico']] })}${F({ name: 'texto', label: 'Parecer', type: 'textarea', rows: 6 })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` }); m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.social.salvarParecer({ ...ICM.util.formData(m.$('form')), aluno_id: a.id }), 'Parecer registrado'); m.close(); redraw(); }); });
    const piaForm = () => { const F = o => ui().field(o); const x = pia || {}; const m = ui().modal({ title: 'Plano Individual de Atendimento', body: `<form class="grid grid-2">${F({ name: 'situacao', label: 'Situação atual (diagnóstico)', type: 'textarea', rows: 4, value: x.situacao, cls: 'span-2' })}${F({ name: 'participaram', label: 'Quem participou da elaboração', value: x.participaram, cls: 'span-2' })}${F({ name: 'elaborado_em', label: 'Elaborado em', type: 'date', value: x.elaborado_em || ICM.util.today() })}${F({ name: 'revisar_em', label: 'Revisar em', type: 'date', value: x.revisar_em || ICM.util.addDays(ICM.util.today(), 90) })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Salvar</button>` }); m.$('[data-ok]').addEventListener('click', async () => { await ui().run(() => ICM.api.social.salvarPia({ objetivos: [], ...x, ...ICM.util.formData(m.$('form')), aluno_id: a.id }), 'PIA salvo'); m.close(); redraw(); }); };
    panel.querySelector('[data-pia]').addEventListener('click', piaForm);
    panel.querySelector('[data-piaobj]').addEventListener('click', () => {
      if (!pia) { ui().toast('Elabore o PIA primeiro.', 'warn'); return piaForm(); }
      const F = o => ui().field(o);
      const m = ui().modal({ title: 'Novo objetivo do PIA', body: `<form class="grid grid-2">${F({ name: 'area', label: 'Área', type: 'select', options: ICM.C.AREAS_PIA })}${F({ name: 'prazo', label: 'Prazo', type: 'date', value: ICM.util.addDays(ICM.util.today(), 90) })}${F({ name: 'objetivo', label: 'Objetivo', cls: 'span-2' })}${F({ name: 'acoes', label: 'Ações combinadas', type: 'textarea', rows: 2, cls: 'span-2' })}${F({ name: 'responsavel', label: 'Responsável', value: ICM.auth.user().nome })}</form>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>Adicionar</button>` });
      m.$('[data-ok]').addEventListener('click', async () => { const d = ICM.util.formData(m.$('form')); if (!d.objetivo) return ui().toast('Escreva o objetivo.', 'warn'); pia.objetivos.push({ id: ICM.util.uid('obj_'), status: 'pendente', ...d }); await ICM.api.social.salvarPia(pia); m.close(); redraw(); });
    });
  };

  // ================= Aba "Evolução" na ficha do aluno =================
  ICM.pages._abaEvolucao = async function (panel, a) {
    const avs = await ICM.api.social.avaliacoes({ aluno_id: a.id });
    const turmas = await ICM.api.raw('turmas');
    const porTurma = {}; avs.forEach(x => { (porTurma[x.turma_id] = porTurma[x.turma_id] || []).push(x); });
    panel.innerHTML = `<div class="col tab-panel">${Object.entries(porTurma).map(([tid, l]) => { const t = turmas.find(x => x.id === tid) || {}; const ini = l.find(x => x.momento === 'inicial') || l[0]; const at = l[l.length - 1];
      return `<div class="card"><div class="card-head"><div><div class="card-title">${esc(t.nome || '')}</div><div class="card-sub">${l.map(x => `${ICM.C.MOMENTOS_AVALIACAO[x.momento]} (${fmtDate(x.data)})`).join(' → ')}</div></div>${ICM.auth.can('avaliacoes.registrar') ? `<button class="btn btn-sm btn-primary" data-av="${esc(tid)}">${I('plus', 14)} Avaliar</button>` : ''}</div>
        ${barrasEvo(Object.keys(COMP()).map(c => ({ nome: COMP()[c], inicial: ini.notas[c], atual: at.notas[c] })).filter(x => x.inicial != null))}
        ${at.obs ? `<p class="small mt-4"><b>Observação:</b> ${esc(at.obs)}</p>` : ''}</div>`; }).join('') || `<div class="card">${ui().empty('Nenhuma avaliação de evolução ainda', 'chart')}</div>`}
      <div class="xs muted">Escala: 1 = precisa de muito apoio · 3 = em desenvolvimento · 5 = desenvolvido.</div></div>`;
    panel.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => ICM.pages._avaliarTurma(b.dataset.av, [a.id], () => ICM.pages._abaEvolucao(panel, a))));
  };

  // ================= Avaliar alunos de uma turma (professor) =================
  ICM.pages._avaliarTurma = async function (turmaId, soAlunos, after) {
    const mats = (await ICM.api.turmas.alunos(turmaId)).filter(m => m.status === 'ativo' && (!soAlunos || soAlunos.includes(m.aluno_id)));
    const existentes = await ICM.api.social.avaliacoes({ turma_id: turmaId });
    const ks = Object.keys(COMP());
    let momento = existentes.some(x => x.momento === 'inicial') ? (existentes.some(x => x.momento === 'intermediaria') ? 'final' : 'intermediaria') : 'inicial';
    const m = ui().modal({
      title: 'Avaliação de evolução', size: 'wide',
      body: `<div class="row wrap mb-4"><span class="label">Momento</span><div class="segmented" data-mom>${Object.entries(ICM.C.MOMENTOS_AVALIACAO).map(([k, v]) => `<button type="button" data-v="${k}" class="${k === momento ? 'active' : ''}">${v}</button>`).join('')}</div><span class="xs muted">1 = precisa de muito apoio · 5 = desenvolvido</span></div>
        <div class="table-wrap" style="max-height:480px;overflow:auto"><table class="table aval"><thead><tr><th>Aluno(a)</th>${ks.map(k => `<th style="text-align:center;font-size:10px;max-width:90px;white-space:normal">${esc(COMP()[k])}</th>`).join('')}</tr></thead><tbody>
        ${mats.map(mt => `<tr><td><b class="small">${esc(mt.aluno.nome)}</b></td>${ks.map(k => `<td style="text-align:center"><select class="select av-sel" data-a="${esc(mt.aluno_id)}" data-k="${k}"><option value="">–</option>${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('check', 16)} Salvar avaliações</button>`
    });
    const preencher = () => m.$$('.av-sel').forEach(s => { const ex = existentes.find(x => x.aluno_id === s.dataset.a && x.momento === momento); s.value = ex && ex.notas[s.dataset.k] ? ex.notas[s.dataset.k] : ''; });
    preencher();
    m.$$('[data-mom] button').forEach(b => b.addEventListener('click', () => { m.$$('[data-mom] button').forEach(x => x.classList.toggle('active', x === b)); momento = b.dataset.v; preencher(); }));
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      let n = 0;
      for (const mt of mats) {
        const notas = {}; m.$$(`.av-sel[data-a="${mt.aluno_id}"]`).forEach(s => { if (s.value) notas[s.dataset.k] = Number(s.value); });
        if (Object.keys(notas).length) { await ICM.api.social.salvarAvaliacao({ aluno_id: mt.aluno_id, turma_id: turmaId, momento, notas }); n++; }
      }
      ui().toast(`${n} avaliação(ões) salvas`, 'ok'); m.close(); after && after();
    }).catch(() => { }));
  };
})();
