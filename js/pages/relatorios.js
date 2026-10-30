/* Central de relatórios */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.relatorios = async function (el, params, query) {
    ICM.app.setCrumbs([['Início', '#/'], ['Relatórios']]);
    const gerais = ICM.auth.can('relatorios.gerais');
    const ym = ICM.util.today().slice(0, 7);
    const alertas = await ICM.api.assiduidade.alertas(ym);
    const card = ICM.pages._repCard;

    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Relatórios</h1><div class="page-sub">Documentos completos para prestação de contas, gerados a partir dos registros do sistema</div></div></div>

      <div class="card mb-4" id="assid">
        <div class="card-head"><div><div class="card-title">${I('alert', 18)} Assiduidade — ${esc(ICM.util.fmtMonth(ym))}</div><div class="card-sub">2 faltas no mês = alerta · 3 faltas = avaliar desligamento (faltas justificadas não contam)</div></div>
          <div class="row"><span class="badge warn">${alertas.filter(a => a.nivel === 'warn').length} em alerta</span><span class="badge danger">${alertas.filter(a => a.nivel === 'danger').length} para desligamento</span></div></div>
        ${alertas.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Turma</th><th>Presenças</th><th>Faltas</th><th>Situação</th><th></th></tr></thead><tbody>
          ${alertas.map(a => `<tr><td><a class="row" href="#/alunos/${esc(a.aluno_id)}" style="color:inherit">${ICM.util.avatar(a.nome, null, 'sm')}<b>${esc(a.nome)}</b></a></td><td><a href="#/turmas/${esc(a.turma_id)}?tab=frequencia">${esc(a.turma)}</a></td><td>${a.P}</td><td><b style="color:var(--danger)">${a.F}</b></td><td>${ui().nivelPill(a.nivel, a.F)}</td>
            <td style="text-align:right"><a class="btn btn-sm" href="#/alunos/${esc(a.aluno_id)}?tab=ocorrencias">${I('plus', 14)} Registrar contato</a></td></tr>`).join('')}
        </tbody></table></div>` : ui().empty('Nenhum aluno em alerta neste mês 🎉', 'userCheck')}
      </div>

      <div class="section-title">${I('layers', 18)} Turmas</div>
      <div class="grid grid-3 stagger mb-4">
        ${card('Relatório mensal da turma', 'Plano de aula, horas do mês, professor, fotos, relatório e chamada de cada aula com a lista de alunos.', 'calendar', '#2563eb', 'turma_mensal')}
        ${card('Relatório anual da turma', 'Aulas e horas por mês, frequência anual por aluno, movimentação, conteúdos, eventos e galeria.', 'chart', '#8b5cf6', 'turma_anual')}
        ${card('Relatório de assiduidade', 'Faltas por aluno e turma no mês, com alertas e encaminhamentos sugeridos.', 'userCheck', '#f97316', 'assiduidade')}
      </div>
      ${gerais ? `<div class="section-title">${I('folder', 18)} Projetos e instituição</div>
      <div class="grid grid-3 stagger">
        ${card('Relatório do projeto (prestação de contas)', 'Identificação completa, metas x resultados, turmas, horas, perfil dos beneficiários, eventos e fotos — por período.', 'fileText', '#0891b2', 'projeto')}
        ${card('Execução do objeto (MROSC)', 'Prestação de contas de termo de fomento/colaboração (Lei 13.019): ações, metas x resultados, listas de presença, fotos, satisfação e resumo financeiro.', 'clipboardCheck', '#1d4ed8', 'execucao_objeto')}
        ${card('Relatório anual do projeto', 'O mesmo relatório consolidado para o ano civil escolhido.', 'folder', '#10b981', 'projeto_anual')}
        ${card('Relatório anual de atividades da OSC', 'Todos os números de impacto do Instituto: atendidos, famílias, horas, áreas, conquistas e origem dos recursos.', 'sparkles', '#ec4899', 'osc_anual')}
      </div>` : ''}
      <div class="section-title mt-6">${I('users', 18)} Comunidade</div>
      <div class="grid grid-3 stagger">
        ${ICM.auth.can('espera.gerir') ? card('Lista de espera — classificação', 'Ranking pela triagem socioeconômica, com os critérios publicados (identificação por protocolo e iniciais).', 'list', '#2563eb', 'espera_classificacao') : ''}
        ${card('Horas voluntárias', 'Horas doadas por voluntário e atividade, valoradas como contrapartida para editais.', 'heart', '#10b981', 'voluntarios_horas')}
        ${ICM.auth.can('doadores.gerir') ? card('Relatório de doações', 'Doações do período por doador e destinação.', 'dollar', '#ec4899', 'doacoes_periodo') : ''}
        ${ICM.auth.can('associados.gerir') ? card('Situação dos associados', 'Em dia, inadimplentes e alunos sem CadÚnico ainda não associados.', 'key', '#8b5cf6', 'associados_situacao') : ''}
      </div>
      ${ICM.auth.can('patrimonio.emprestar') ? `<div class="section-title mt-6">${I('building', 18)} Patrimônio</div>
      <div class="grid grid-3 stagger">
        ${card('Inventário patrimonial', 'Todos os bens por categoria com tombo, local, estado, origem e valores.', 'grid', '#2563eb', 'pat_inventario')}
        ${card('Relatório de empréstimos', 'Em aberto, atrasados, devolvidos e extraviados no período — alunos, colaboradores e terceiros.', 'download', '#0891b2', 'pat_emprestimos')}
        ${card('Bens por projeto', 'Bens adquiridos com recursos de cada projeto, para anexar à prestação de contas.', 'folder', '#10b981', 'pat_por_projeto')}
      </div>` : ''}
    </div>`;

    el.querySelectorAll('[data-rep]').forEach(c => c.addEventListener('click', () => ICM.reports.openDialog(c.dataset.rep)));
    if (query.get('r') === 'assiduidade') setTimeout(() => el.querySelector('#assid').scrollIntoView({ behavior: 'smooth' }), 100);
  };
})();
