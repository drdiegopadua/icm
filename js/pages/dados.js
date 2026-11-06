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
        <div class="card span-all" data-espaco><div class="section-title">${I('grid', 18)} Espaço usado no Supabase</div><div class="small muted">Medindo…</div></div>
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
        <div class="card"><div class="section-title">${I('folder', 18)} Backup automático no Google Drive</div>
          <p class="text-block small">Todo dia às <b>2h</b>, o script de automações do Instituto salva uma cópia completa do banco na pasta <b>BACKUP ICM</b> do Google Drive (arquivo <span style="font-family:monospace">ICM-backup-AAAA-MM-DD.json.gz</span>) e apaga as cópias com mais de 30 dias. Às <b>7h</b>, manda o e-mail de avisos do dia.</p>
          <div class="xs muted">Para baixar uma cópia na hora, use os botões ao lado. Guarde só em local protegido.</div>
          <hr class="divider"><div class="section-title">${I('info', 18)} Regra 3-2-1</div><div class="small muted">3 cópias, em 2 lugares diferentes, sendo 1 fora da instituição: banco Supabase + pasta BACKUP ICM no Drive + cópia baixada quando necessário.</div></div>

        <div class="card span-all"><div class="section-title">${I('shield', 18)} Anonimização de ex-alunos (LGPD)</div>
          <p class="text-block small"><b>O que é:</b> a LGPD manda guardar dados pessoais só pelo tempo necessário. Depois que um aluno sai e passa o prazo de guarda (exigido para prestação de contas e auditorias — normalmente 5 anos ou o prazo do convênio), o sistema <b>apaga o que identifica a pessoa</b> (nome, CPF, NIS, telefone, endereço, foto, responsável, dados de saúde e socioeconômicos) e <b>mantém só o que é estatístico</b> (ano de nascimento, sexo, bairro, frequência e participação). Assim os relatórios antigos continuam com os números corretos, mas ninguém consegue saber quem era a criança.</p>
          <div class="row wrap mt-4"><span class="label">Prazo de guarda após a saída</span><input type="number" class="input" data-prazo value="${prazo}" min="1" max="20" style="width:90px"><span class="small">anos</span><button class="btn btn-sm" data-sprazo>Salvar prazo</button></div>
          <div class="mt-4">${eleg.length ? `<div class="sens-lock mb-4">${I('alert', 16)} ${eleg.length} ex-aluno(s) passaram do prazo de ${prazo} anos.</div>
            <div class="table-wrap"><table class="table"><thead><tr><th>Ex-aluno</th><th>Matrícula</th><th>Situação</th><th>Última participação</th></tr></thead><tbody>${eleg.map(a => `<tr><td><b>${esc(a.nome)}</b></td><td class="small">${esc(a.matricula)}</td><td>${ui().badge(a.status, 'neutral')}</td><td class="small">${esc(fmtDate(a.ultima))}</td></tr>`).join('')}</tbody></table></div>
            <button class="btn btn-danger solid mt-4" data-anon>${I('shield', 16)} Anonimizar ${eleg.length} ex-aluno(s)</button>` : ui().empty(`Nenhum ex-aluno passou do prazo de ${prazo} anos.`, 'shield')}</div>
          <div class="xs muted mt-4">A anonimização não pode ser desfeita. Faça um backup antes. Na versão com Supabase ela roda automaticamente todo mês e o resultado aparece na Rotina do dia.</div></div>
      </div></div>`;

    desenharEspaco(el.querySelector('[data-espaco]'));
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

  // ---------- Espaço usado no Supabase (banco e fotos/anexos) ----------
  const PASTAS = { aulas: 'Fotos das aulas', alunos: 'Fotos dos alunos', alunos_privado: 'Documentos dos alunos', arquivos: 'Anexos (RH, notas, certidões)', eventos: 'Fotos dos eventos', equipe: 'Equipe', reunioes: 'Reuniões de pais', estatuto: 'Estatuto', docs_inst: 'Docs da instituição', chat_mensagens: 'Chat' };
  function tamanho(b) { b = Number(b) || 0; return b >= 1024 ** 3 ? `${ICM.util.num(b / 1024 ** 3, 2)} GB` : b >= 1024 ** 2 ? `${ICM.util.num(b / 1024 ** 2, 1)} MB` : `${ICM.util.num(b / 1024, 0)} KB`; }
  async function desenharEspaco(box) {
    if (!box) return;
    if (!ICM.api.espaco.disponivel()) { box.innerHTML = `<div class="section-title">${I('grid', 18)} Espaço usado no Supabase</div><div class="small muted">Disponível só na versão com o banco (na demonstração os dados ficam neste navegador).</div>`; return; }
    let m;
    try { m = await ICM.api.espaco.medir(); }
    catch (e) {
      box.innerHTML = `<div class="section-title">${I('grid', 18)} Espaço usado no Supabase</div>${/uso_armazenamento|function|schema cache/i.test(e.message)
        ? `<div class="sens-lock">${I('info', 16)} Falta uma atualização no banco: rode o arquivo <b>supabase/icm_v6_espaco.sql</b> no SQL Editor do Supabase.</div>` : `<div class="small" style="color:var(--danger)">${esc(e.message)}</div>`}`;
      return;
    }
    if (!m) { box.innerHTML = `<div class="section-title">${I('grid', 18)} Espaço usado no Supabase</div><div class="small muted">Não foi possível medir agora.</div>`; return; }
    const barra = (titulo, usado, limite, pct, extra) => { const n = ICM.api.espaco.nivel(pct); return `<div><div class="row between"><b>${esc(titulo)}</b><span class="small"><b>${tamanho(usado)}</b> de ${tamanho(limite)} · <b style="color:var(--${n === 'ok' ? 'ok' : n})">${ICM.util.num(pct, 1)}%</b></span></div>
      <div class="progress mt-2 ${n}"><span style="width:${Math.max(1, Math.min(100, pct))}%"></span></div>${extra ? `<div class="xs muted mt-2">${extra}</div>` : ''}</div>`; };
    const pastas = Object.entries(m.arquivos_por_pasta || {}).sort((a, b) => b[1].bytes - a[1].bytes);
    const fotosAula = (m.arquivos_por_pasta || {}).aulas;
    const media = fotosAula && fotosAula.qtd ? fotosAula.bytes / fotosAula.qtd : 200 * 1024;
    const cabem = Math.max(0, Math.floor((m.limites.arquivos - m.arquivos_bytes) / media));
    const pior = Math.max(m.pctBanco, m.pctArquivos);
    box.innerHTML = `<div class="row between wrap"><div class="section-title" style="margin:0">${I('grid', 18)} Espaço usado no Supabase</div>
        <div class="row"><span class="small muted">Plano</span><select class="select" data-plano style="width:auto">${Object.entries(ICM.api.espaco.PLANOS).map(([k, p]) => `<option value="${k}" ${k === m.plano ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div></div>
      ${pior >= 90 ? `<div class="sens-lock mt-4" style="border-color:var(--danger)">${I('alert', 16)} <b>Quase sem espaço.</b> Ao chegar a 100%, o Supabase para de aceitar fotos e dados novos. Passe para o plano Pro (cerca de US$ 25 por mês) em supabase.com → Organization → Billing.</div>`
        : pior >= 70 ? `<div class="sens-lock mt-4">${I('alert', 16)} <b>Mais de 70% usado.</b> Planeje a mudança para o plano Pro (cerca de US$ 25 por mês, com 8 GB de banco e 100 GB de arquivos) antes de chegar ao limite.</div>` : ''}
      <div class="grid grid-2 mt-4" style="gap:22px">
        ${barra('Fotos e anexos', m.arquivos_bytes, m.limites.arquivos, m.pctArquivos, `${ICM.util.num(m.arquivos_qtd)} arquivo(s) · cabem cerca de <b>${ICM.util.num(cabem)}</b> fotos a mais`)}
        ${barra('Banco de dados', m.banco_bytes, m.limites.banco, m.pctBanco, `${ICM.util.num(Object.values(m.registros_por_colecao || {}).reduce((s, n) => s + n, 0))} registro(s) no total`)}
      </div>
      ${pastas.length ? `<div class="mt-4"><div class="small bold mb-2">O que mais ocupa</div>${pastas.slice(0, 6).map(([p, x]) => `<div class="row between small" style="padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(PASTAS[p] || p)}</span><span>${tamanho(x.bytes)} · ${ICM.util.num(x.qtd)} arquivo(s)</span></div>`).join('')}</div>` : ''}
      <div class="xs muted mt-4">Medido em ${esc(new Date(m.medido_em).toLocaleString('pt-BR'))}. O sistema avisa no menu e no e-mail diário quando passar de 70%. As fotos já são reduzidas automaticamente antes de subir.</div>`;
    box.querySelector('[data-plano]').addEventListener('change', async e => { await ui().run(() => ICM.api.espaco.salvarPlano(e.target.value), 'Plano atualizado').catch(() => { }); desenharEspaco(box); });
  }
  ICM.pages._tamanho = tamanho;
})();
