/* Importar planilhas (Excel ou CSV): modelo pronto para baixar, conferência antes de gravar e relatório de erros */
(function () {
  ICM.pages = ICM.pages || {};
  const I = (n, s) => ICM.icon(n, s);
  const { esc } = ICM.util;
  const ui = () => ICM.ui;

  // Colunas de cada modelo: [coluna da planilha, caminho no cadastro, exemplo, obrigatória]
  const MODELOS = {
    alunos: { nome: 'Alunos', icon: 'users', cor: '#2563eb', desc: 'Cadastro completo e, se quiser, já colocando na turma.', colunas: [
      ['nome', 'nome', 'Maria Clara Souza', true], ['nascimento', 'nascimento', '15/03/2014', true], ['sexo', 'sexo', 'F'], ['cor_raca', 'cor_raca', 'Parda'], ['cpf', 'cpf', ''], ['nis', 'nis', ''],
      ['telefone', 'telefone', ''], ['responsavel', 'responsavel.nome', 'Ana Souza', true], ['parentesco', 'responsavel.parentesco', 'Mãe'], ['telefone_responsavel', 'responsavel.telefone', '(27) 99999-0000', true],
      ['cpf_responsavel', 'responsavel.cpf', ''], ['profissao_responsavel', 'responsavel.profissao', ''], ['endereco', 'endereco.logradouro', 'Rua das Flores'], ['numero', 'endereco.numero', '10'],
      ['bairro', 'endereco.bairro', 'Centro'], ['cidade', 'endereco.cidade', 'Afonso Cláudio'], ['cep', 'endereco.cep', '29600-000'], ['escola', 'escolaridade.escola', 'EEEFM ...'], ['serie', 'escolaridade.serie', '5º ano'],
      ['alergias', 'saude.alergias', ''], ['data_matricula', 'data_matricula', '01/03/2026'], ['turma', 'turma', 'Nome exato da turma no sistema']] },
    turmas: { nome: 'Turmas', icon: 'layers', cor: '#8b5cf6', desc: 'Turmas dos projetos já cadastrados, com dias e horários.', colunas: [
      ['nome', 'nome', 'Violino — Turma A', true], ['projeto', 'projeto', 'Nome exato do projeto no sistema', true], ['modalidade', 'modalidade', 'Violino'], ['professor', 'professor', 'Nome ou e-mail do professor'],
      ['dias', 'dias', 'seg, qua'], ['inicio', 'inicio', '14:00'], ['fim', 'fim', '16:00'], ['local', 'local', 'Sede do Instituto'], ['vagas', 'vagas', '20'], ['faixa', 'faixa', '8 a 14 anos']] },
    equipe: { nome: 'Equipe (RH)', icon: 'users', cor: '#0891b2', desc: 'Professores e colaboradores, com vínculo e carga horária.', colunas: [
      ['nome', 'nome', 'João Pereira', true], ['cargo', 'cargo', 'Professor de violão', true], ['cpf', 'cpf', ''], ['nascimento', 'nascimento', ''], ['telefone', 'telefone', ''], ['email', 'email', ''],
      ['vinculo', 'vinculo', 'clt'], ['admissao', 'admissao', '01/02/2026'], ['carga_semanal', 'carga_semanal', '20']] },
    patrimonio: { nome: 'Patrimônio', icon: 'building', cor: '#f97316', desc: 'Bens, instrumentos e equipamentos com tombo.', colunas: [
      ['nome', 'nome', 'Violino 4/4', true], ['tombo', 'tombo', 'ICM-0001'], ['categoria', 'categoria', 'instrumento'], ['quantidade', 'quantidade', '1'], ['marca', 'marca', ''], ['modelo', 'modelo', ''],
      ['local', 'local', 'Sala de música'], ['estado', 'estado', 'bom'], ['data_aquisicao', 'data_aquisicao', ''], ['valor_unitario', 'valor_unitario', ''], ['nota_fiscal', 'nota_fiscal', '']] },
    estoque: { nome: 'Estoque', icon: 'grid', cor: '#10b981', desc: 'Itens de consumo com saldo inicial.', colunas: [
      ['nome', 'nome', 'Camiseta do uniforme', true], ['variacao', 'variacao', 'Tam. 10'], ['categoria', 'categoria', 'uniforme'], ['unidade', 'unidade', 'un'], ['estoque_minimo', 'estoque_minimo', '10'],
      ['local', 'local', 'Almoxarifado'], ['saldo_inicial', 'saldo_inicial', '30'], ['valor_unitario', 'valor_unitario', '25']] },
    doadores: { nome: 'Doadores e parceiros', icon: 'dollar', cor: '#ec4899', desc: 'Pessoas e empresas que apoiam o Instituto.', colunas: [
      ['nome', 'nome', 'Empresa Exemplo Ltda', true], ['documento', 'documento', 'CPF ou CNPJ'], ['categoria', 'categoria', 'Empresa'], ['contato', 'contato', ''], ['email', 'email', ''], ['telefone', 'telefone', '']] },
    voluntarios: { nome: 'Voluntários', icon: 'heart', cor: '#64748b', desc: 'Voluntários com área e disponibilidade.', colunas: [
      ['nome', 'nome', 'Paula Lima', true], ['telefone', 'telefone', ''], ['email', 'email', ''], ['profissao', 'profissao', ''], ['area', 'area', 'Reforço escolar'], ['disponibilidade', 'disponibilidade', 'Sábados de manhã'], ['inicio', 'inicio', '']] }
  };
  const DATAS = new Set(['nascimento', 'data_matricula', 'admissao', 'data_aquisicao', 'inicio']);

  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const pad = n => String(n).padStart(2, '0');
  // Data da planilha (data do Excel, "dd/mm/aaaa" ou "aaaa-mm-dd") → aaaa-mm-dd
  function data(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) { const a = m[3].length === 2 ? (Number(m[3]) > 30 ? '19' : '20') + m[3] : m[3]; return `${a}-${pad(m[2])}-${pad(m[1])}`; }
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    return s;
  }
  const hora = v => { if (v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`; const m = String(v || '').match(/(\d{1,2})[:h](\d{2})?/); return m ? `${pad(m[1])}:${m[2] || '00'}` : ''; };
  function setPath(o, caminho, v) { const p = caminho.split('.'); let x = o; p.slice(0, -1).forEach(k => { x = x[k] = x[k] || {}; }); x[p[p.length - 1]] = v; }

  // Linhas da planilha → objetos no formato do sistema
  function converter(tipo, linhas) {
    const cols = MODELOS[tipo].colunas;
    return linhas.map(l => {
      const porNome = {}; Object.keys(l).forEach(k => { porNome[norm(k)] = l[k]; });
      const o = {};
      cols.forEach(([col, caminho]) => {
        let v = porNome[col]; if (v === undefined || v === null || String(v).trim() === '') return;
        if (DATAS.has(col)) v = data(v); else if (col === 'inicio' || col === 'fim') v = tipo === 'turmas' ? hora(v) : data(v); else v = typeof v === 'string' ? v.trim() : v;
        if (col === 'sexo') v = String(v).toUpperCase().startsWith('F') ? 'F' : String(v).toUpperCase().startsWith('M') ? 'M' : 'O';
        if (col === 'vinculo') v = norm(v).replace('pj_mei', 'pj');
        setPath(o, caminho, v);
      });
      return o;
    }).filter(o => Object.keys(o).length);
  }
  const faltando = (tipo, o) => MODELOS[tipo].colunas.filter(c => c[3]).filter(([, caminho]) => !caminho.split('.').reduce((x, k) => x && x[k], o)).map(c => c[0]);

  async function xlsx() { await ICM.api._carregarScript('js/vendor/xlsx.full.min.js'); return window.XLSX; }
  async function baixarModelo(tipo) {
    const X = await xlsx(); const M = MODELOS[tipo];
    const ws = X.utils.aoa_to_sheet([M.colunas.map(c => c[0]), M.colunas.map(c => c[2])]);
    ws['!cols'] = M.colunas.map(c => ({ wch: Math.max(14, c[0].length + 2, String(c[2]).length + 2) }));
    const leia = X.utils.aoa_to_sheet([['Como preencher'], ['1. Uma linha por registro. A linha 2 é só um exemplo: apague antes de importar.'], ['2. Não mude os nomes das colunas da primeira linha.'], ['3. Datas no formato dd/mm/aaaa.'],
      ['4. Colunas obrigatórias: ' + M.colunas.filter(c => c[3]).map(c => c[0]).join(', ')], ...(tipo === 'alunos' ? [['5. Coluna "turma": nome exatamente igual ao cadastrado no sistema (opcional).']] : tipo === 'turmas' ? [['5. Coluna "projeto": nome exatamente igual ao cadastrado. "dias": seg, ter, qua, qui, sex, sab.']] : [])]);
    leia['!cols'] = [{ wch: 100 }];
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, M.nome.slice(0, 31)); X.utils.book_append_sheet(wb, leia, 'Como preencher');
    X.writeFile(wb, `modelo-importacao-${tipo}.xlsx`);
  }

  ICM.pages.importar = async function (el) {
    if (!ICM.auth.can('importar.dados')) { el.innerHTML = ui().empty('Acesso restrito.', 'lock'); return; }
    ICM.app.setCrumbs([['Início', '#/'], ['Importar planilhas']]);
    el.innerHTML = `<div class="page">
      <div class="page-head"><div><h1 class="page-title">Importar planilhas</h1><div class="page-sub">Traga de uma vez o que vocês já têm no Excel — o sistema confere tudo antes de gravar</div></div></div>
      <div class="card mb-4"><div class="row wrap" style="gap:18px"><div class="apto-ic">${I('info', 30)}</div><div class="grow small">
        <b>Como funciona:</b> 1) baixe o modelo do que quer importar; 2) cole os seus dados nas colunas (sem mudar a primeira linha); 3) envie a planilha e confira a prévia; 4) clique em importar.
        Registros repetidos (mesmo nome e nascimento, ou mesma turma no projeto) são pulados. Ordem sugerida: <b>projetos (cadastre na tela de Projetos) → turmas → alunos</b>.</div></div></div>
      <div class="grid grid-3 stagger">${Object.entries(MODELOS).map(([k, m]) => `<div class="card hoverable"><div class="row"><div class="ic" style="--c:${m.cor}">${I(m.icon, 22)}</div><div class="grow"><div class="bold" style="font-size:16px">${esc(m.nome)}</div><div class="xs muted">${esc(m.desc)}</div></div></div>
        <div class="row wrap mt-4"><button class="btn btn-sm" data-modelo="${k}">${I('download', 14)} Baixar modelo</button><label class="btn btn-sm btn-primary">${I('upload', 14)} Enviar planilha<input type="file" data-arq="${k}" accept=".xlsx,.xls,.csv" hidden></label></div></div>`).join('')}</div></div>`;
    el.querySelectorAll('[data-modelo]').forEach(b => b.addEventListener('click', e => ui().busy(e.currentTarget, () => ui().run(() => baixarModelo(b.dataset.modelo))).catch(() => { })));
    el.querySelectorAll('[data-arq]').forEach(inp => inp.addEventListener('change', async () => { const f = inp.files[0]; inp.value = ''; if (f) await previa(inp.dataset.arq, f).catch(e => ui().toast(e.message, 'danger', 5000)); }));
  };

  async function previa(tipo, arquivo) {
    const X = await xlsx();
    const wb = X.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const brutas = X.utils.sheet_to_json(ws, { defval: '', raw: true });
    const M0 = MODELOS[tipo].colunas[0];
    const linhas = converter(tipo, brutas).filter(o => o[M0[1]] !== M0[2]);   // ignora a linha de exemplo do modelo
    if (!linhas.length) throw new Error('Nenhuma linha encontrada. Confira se a primeira linha tem os nomes das colunas do modelo.');
    const M = MODELOS[tipo]; const cols = M.colunas.filter(c => linhas.some(l => c[1].split('.').reduce((x, k) => x && x[k], l) !== undefined));
    const val = (l, c) => c[1].split('.').reduce((x, k) => x && x[k], l);
    const probs = linhas.map(l => faltando(tipo, l));
    const comErro = probs.filter(p => p.length).length;
    const m = ui().modal({
      title: `Importar ${M.nome.toLowerCase()} — ${arquivo.name}`, size: 'wide',
      body: `<div class="row wrap mb-4">${ui().badge(`${linhas.length} linha(s) na planilha`, '', true)}${comErro ? ui().badge(`${comErro} com campo obrigatório vazio (serão puladas)`, 'warn', true) : ui().badge('Campos obrigatórios preenchidos', 'ok', true)}</div>
        <div class="table-wrap" style="max-height:380px;overflow:auto"><table class="table"><thead><tr><th>#</th>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>
        ${linhas.slice(0, 200).map((l, i) => `<tr ${probs[i].length ? 'style="background:rgba(245,158,11,.12)"' : ''}><td class="small">${i + 2}${probs[i].length ? ` ${ui().badge('falta: ' + probs[i].join(', '), 'warn')}` : ''}</td>${cols.map(c => `<td class="small">${esc(String(val(l, c) ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        ${linhas.length > 200 ? `<div class="xs muted mt-2">Mostrando 200 de ${linhas.length} linhas.</div>` : ''}<div data-res class="mt-4"></div>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn btn-primary" data-ok>${I('upload', 16)} Importar ${linhas.length - comErro} registro(s)</button>`
    });
    m.$('[data-ok]').addEventListener('click', e => ui().busy(e.currentTarget, async () => {
      const validas = linhas.filter((l, i) => !probs[i].length);
      const r = await ui().run(() => ICM.api.importar.executar(tipo, validas));
      m.$('[data-ok]').remove();
      m.$('[data-res]').innerHTML = `<div class="card flat"><div class="bold">${I('check', 18)} ${r.ok} importado(s) · ${r.duplicados} repetido(s) pulado(s) · ${r.erros.length + comErro} com problema</div>
        ${r.erros.length ? `<div class="small mt-2">${r.erros.slice(0, 30).map(x => `Linha ${x.linha}: ${esc(x.msg)}`).join('<br>')}</div>` : ''}</div>`;
      ui().toast(`${r.ok} registro(s) importado(s)`, 'ok');
    }).catch(() => { }));
  }
})();
