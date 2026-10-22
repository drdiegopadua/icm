/* Painel inicial */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDateShort, fmtDate, DIAS } = ICM.util;

  ICM.pages.dashboard = async function (el) {
    ICM.app.setCrumbs([['Início']]);
    const user = ICM.auth.user();
    const d = await ICM.api.dashboard();
    const h = new Date().getHours();
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const maxH = Math.max(1, ...d.meses.map(m => m.h));
    const areaData = Object.entries(d.porArea).map(([k, v]) => ({ l: ICM.C.AREAS[k].nome, v, c: ICM.C.AREAS[k].cor }));
    const turmaNome = id => (d.turmasList.find(t => t.id === id) || {}).nome || '';

    el.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1 class="page-title">${saud}, ${esc(user.nome.split(' ')[0])} 👋</h1><div class="page-sub">${esc(DIAS[new Date().getDay()])}, ${esc(ICM.util.fmtDateLong(ICM.util.today()))} — aqui está o resumo do Instituto.</div></div>
        <div class="row wrap">
          ${ICM.auth.can('alunos.editar') ? `<a class="btn btn-primary" href="#/alunos/novo">${I('userPlus', 18)} Nova matrícula</a>` : ''}
          <a class="btn" href="#/relatorios">${I('fileText', 18)} Relatórios</a>
        </div>
      </div>

      <div class="grid grid-4 stagger">
        ${stat('users', '#2563eb', d.alunosAtivos, 'Alunos ativos')}
        ${stat('layers', '#8b5cf6', d.turmas, 'Turmas')}
        ${stat('clock', '#f97316', Math.round(d.horasMes), `Horas de aula no mês (${d.aulasMes} aulas)`, 'h')}
        ${stat('userCheck', '#10b981', d.freqMes, 'Frequência no mês', '%')}
      </div>

      <div class="grid grid-dash mt-6">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Horas de aula realizadas</div><div class="card-sub">Últimos 6 meses</div></div>${I('chart', 22)}</div>
          <div class="bars">${d.meses.map((m, i) => `<div class="bar"><span class="v">${Math.round(m.h)}h</span><div class="b" style="height:${Math.max(4, m.h / maxH * 100)}%;animation-delay:${i * .08}s"></div><span class="l">${esc(m.l)}</span></div>`).join('')}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Alunos por área</div><div class="card-sub">Matrículas ativas em turmas</div></div>${I('pie', 22)}</div>
          ${areaData.length ? ICM.ui.donut(areaData) : ICM.ui.empty('Sem matrículas')}
        </div>
      </div>

      <div class="grid grid-3 mt-6">
        <div class="card">
          <div class="card-head"><div class="card-title">${I('alert', 18)} Alertas de assiduidade</div><a class="btn btn-sm btn-ghost" href="#/relatorios?r=assiduidade">Ver tudo</a></div>
          ${d.alertas.length ? d.alertas.slice(0, 6).map(a => `
            <a class="list-item" href="#/alunos/${esc(a.aluno_id)}">${ICM.util.avatar(a.nome, null, 'sm')}
              <div class="grow"><div class="bold truncate">${esc(a.nome)}</div><div class="xs muted truncate">${esc(a.turma)}</div></div>
              <span class="badge ${a.nivel}">${a.F} faltas</span></a>`).join('')
            : ICM.ui.empty('Nenhum aluno em alerta este mês 🎉', 'userCheck')}
          <div class="xs muted mt-2">Regra: 2 faltas no mês = alerta · 3 faltas = avaliar desligamento.</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${I('calendar', 18)} Próximas aulas</div></div>
          ${d.proximas.length ? d.proximas.map(a => `
            <a class="list-item" href="#/turmas/${esc(a.turma_id)}?aula=${esc(a.id)}">
              <div class="avatar sm" style="--c:#2563eb">${esc(fmtDateShort(a.data).split(' ')[0])}</div>
              <div class="grow"><div class="bold truncate">${esc(turmaNome(a.turma_id))}</div><div class="xs muted">${esc(fmtDate(a.data))} · ${esc(a.inicio)}–${esc(a.fim)}</div></div>${I('chevronRight', 16)}</a>`).join('')
            : ICM.ui.empty('Nenhuma aula agendada', 'calendar')}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${I('star', 18)} Próximos eventos</div><a class="btn btn-sm btn-ghost" href="#/eventos">Agenda</a></div>
          ${d.eventos.length ? d.eventos.map(e => { const t = ICM.C.TIPOS_EVENTO[e.tipo]; return `
            <a class="list-item" href="#/eventos/${esc(e.id)}"><div class="avatar sm" style="--c:${t.cor}">${I(t.icon, 15)}</div>
              <div class="grow"><div class="bold truncate">${esc(e.titulo)}</div><div class="xs muted">${esc(t.nome)} · ${esc(fmtDate(e.data))}</div></div></a>`; }).join('')
            : ICM.ui.empty('Nenhum evento futuro', 'star')}
        </div>
      </div>

      ${d.pendentes.length ? `<div class="card mt-6">
        <div class="card-head"><div><div class="card-title">${I('clipboard', 18)} Aulas aguardando registro</div><div class="card-sub">Datas passadas sem chamada/relatório — necessárias para a prestação de contas</div></div><span class="badge warn">${d.pendentes.length}</span></div>
        <div class="row wrap">${d.pendentes.slice(0, 12).map(a => `<a class="btn btn-sm" href="#/turmas/${esc(a.turma_id)}?aula=${esc(a.id)}">${esc(fmtDate(a.data))} · ${esc(turmaNome(a.turma_id))}</a>`).join('')}</div>
      </div>` : ''}
    </div>`;
  };

  function stat(icon, color, val, label, suffix = '') {
    return `<div class="card stat hoverable"><div class="ic" style="--c:${color}">${I(icon, 22)}</div><div class="val" data-count="${val}" data-suffix="${suffix}">0</div><div class="lbl">${esc(label)}</div></div>`;
  }
})();
