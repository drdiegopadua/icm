/* Backup (Excel/JSON, cópia no Google Drive) e privacidade (anonimização LGPD de ex-alunos) */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc, fmtDate } = ICM.util;
  const ui = () => ICM.ui;

  ICM.pages.dados = async function (el) {
    if (!ICM.auth.can('backup.exportar')) { el.innerHTML = ui().empty('Somente administradores.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Backup e privacidade']]);
    const prazo = await ICM.api.privacidade.prazo();
    const eleg = await ICM.api.privacidade.elegiveis();
    let ultimo = null; try { ultimo = localStorage.getItem('icm_ultimo_backup'); } catch (e) { /* */ }
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Backup e privacidade</h1><div class="page-sub">Cópias de segurança dos dados e proteção de dados de ex-alunos (LGPD)</div></div></div>
      <div class="grid grid-2">
        <div class="card"><div class="section-title">${I('download', 18)} Backup com um clique</div>
          <p class="small muted mb-4">Último backup neste computador: <b>${ultimo ? esc(new Date(ultimo).toLocaleString('pt-BR')) : 'nunca'}</b></p>
          <div class="col">
            <button class="btn btn-primary" data-xlsx>${I('grid', 18)} Baixar tudo em Excel</button>
            <div class="xs muted">Uma aba por assunto (alunos, turmas, aulas, doações, estoque…). Bom para consultar e conferir.</div>
            <button class="btn" data-json>${I('shield', 18)} Baixar backup completo (para restaurar)</button>
            <div class="xs muted">Arquivo .json com <b>todos</b> os dados e anexos — é o que permite recuperar o sistema inteiro.</div>
            <label class="btn btn-ghost" style="color:var(--danger)">${I('refresh', 16)} Restaurar de um backup…<input type="file" accept="application/json,.json" data-rest hidden></label>
          </div>
          <div class="sens-lock mt-4">${I('lock', 16)} O backup contém dados pessoais e sensíveis de crianças. Guarde só em local protegido (Drive da instituição com acesso restrito) — nunca em pen drive ou e-mail pessoal.</div></div>
        <div class="card"><div class="section-title">${I('folder', 18)} Backup no Google Drive</div>
          <ol class="text-block small" style="padding-left:18px;margin:0">
            <li><b>Agora (protótipo):</b> ao baixar, salve na pasta <b>Meu Drive › ICM SISTEMA › Backups</b>. Como o Google Drive para computador está instalado, o arquivo sobe sozinho para a nuvem.<br><span class="xs muted">Dica: no Chrome, ative "Perguntar onde salvar cada arquivo" (Configurações › Downloads) para escolher a pasta.</span></li>
            <li class="mt-2"><b>Com o Supabase conectado:</b> além do backup diário automático do próprio Supabase, uma rotina agendada (Apps Script ou função no servidor) gera a cópia todo dia de madrugada e salva <b>automaticamente</b> nessa pasta do Drive, mantendo os últimos 30 dias.</li>
          </ol>
          <hr class="divider"><div class="section-title">${I('info', 18)} Regra 3-2-1</div><div class="small muted">3 cópias, em 2 lugares diferentes, sendo 1 fora da instituição: banco Supabase + Google Drive + backup do Supabase.</div></div>

        <div class="card span-all"><div class="section-title">${I('shield', 18)} Anonimização de ex-alunos (LGPD)</div>
          <p class="text-block small"><b>O que é:</b> a LGPD manda guardar dados pessoais só pelo tempo necessário. Depois que um aluno sai e passa o prazo de guarda (exigido para prestação de contas e auditorias — normalmente 5 anos ou o prazo do convênio), o sistema <b>apaga o que identifica a pessoa</b> (nome, CPF, NIS, telefone, endereço, foto, responsável, dados de saúde e socioeconômicos) e <b>mantém só o que é estatístico</b> (ano de nascimento, sexo, bairro, frequência e participação). Assim os relatórios antigos continuam com os números corretos, mas ninguém consegue saber quem era a criança.</p>
          <div class="row wrap mt-4"><span class="label">Prazo de guarda após a saída</span><input type="number" class="input" data-prazo value="${prazo}" min="1" max="20" style="width:90px"><span class="small">anos</span><button class="btn btn-sm" data-sprazo>Salvar prazo</button></div>
          <div class="mt-4">${eleg.length ? `<div class="sens-lock mb-4">${I('alert', 16)} ${eleg.length} ex-aluno(s) passaram do prazo de ${prazo} anos.</div>
            <div class="table-wrap"><table class="table"><thead><tr><th>Ex-aluno</th><th>Matrícula</th><th>Situação</th><th>Última participação</th></tr></thead><tbody>${eleg.map(a => `<tr><td><b>${esc(a.nome)}</b></td><td class="small">${esc(a.matricula)}</td><td>${ui().badge(a.status, 'neutral')}</td><td class="small">${esc(fmtDate(a.ultima))}</td></tr>`).join('')}</tbody></table></div>
            <button class="btn btn-danger solid mt-4" data-anon>${I('shield', 16)} Anonimizar ${eleg.length} ex-aluno(s)</button>` : ui().empty(`Nenhum ex-aluno passou do prazo de ${prazo} anos.`, 'shield')}</div>
          <div class="xs muted mt-4">A anonimização não pode ser desfeita. Faça um backup antes. Na versão com Supabase ela roda automaticamente todo mês e o resultado aparece na Rotina do dia.</div></div>
      </div></div>`;

    const marca = () => { try { localStorage.setItem('icm_ultimo_backup', new Date().toISOString()); } catch (e) { /* */ } };
    el.querySelector('[data-xlsx]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.backup.baixarExcel(), 'Excel gerado — salve na pasta Backups do Drive'); marca(); }).catch(() => { }));
    el.querySelector('[data-json]').addEventListener('click', e => ui().busy(e.currentTarget, async () => { await ui().run(() => ICM.api.backup.baixarJSON(), 'Backup completo baixado — salve na pasta Backups do Drive'); marca(); }).catch(() => { }));
    el.querySelector('[data-rest]').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const snap = await ICM.api.backup.restaurar(f);
        if (!(await ui().confirm({ title: 'Restaurar backup', text: `Todos os dados atuais serão SUBSTITUÍDOS pelo backup de ${new Date(snap.gerado_em).toLocaleString('pt-BR')}. Continuar?`, ok: 'Restaurar', danger: true }))) return;
        await ICM.store.restaurar(snap); ICM.auth.logout('Backup restaurado. Entre novamente.');
      } catch (ex) { ui().toast(ex.message, 'danger'); }
    });
    el.querySelector('[data-sprazo]').addEventListener('click', async () => { await ui().run(() => ICM.api.privacidade.setPrazo(Number(el.querySelector('[data-prazo]').value)), 'Prazo salvo').catch(() => { }); ICM.app.reload(); });
    const an = el.querySelector('[data-anon]');
    if (an) an.addEventListener('click', async () => {
      if (!(await ui().confirm({ title: 'Anonimizar ex-alunos', text: `Os dados pessoais de ${eleg.length} ex-aluno(s) serão apagados de forma definitiva, mantendo apenas estatísticas. Já fez um backup?`, ok: 'Anonimizar', danger: true }))) return;
      await ui().run(() => ICM.api.privacidade.anonimizar(eleg.map(a => a.id)), 'Ex-alunos anonimizados');
      ICM.app.reload();
    });
  };
})();
