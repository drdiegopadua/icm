/* Exportar período: baixa um .zip com tudo o que foi registrado entre duas datas, organizado em pastas
   (matrículas, fotos, termos e assinaturas, atas, documentos, eventos, financeiro…).
   Em cada pasta: planilha (.csv, abre no Excel) + os arquivos (fotos, PDFs, assinaturas) + fichas em HTML.
   O .zip é montado aqui no navegador (sem biblioteca externa). Só a direção (backup.exportar). */
(function () {
  const S = () => ICM.store;
  const u = () => ICM.util;

  // ---------------- ZIP (método "store": fotos e PDFs já são comprimidos) ----------------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = new TextEncoder();
  function criarZip() {
    const partes = [], central = [], usados = new Set(); let pos = 0;
    const agora = new Date();
    const dosT = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
    const dosD = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
    function unico(nome) {
      if (!usados.has(nome)) { usados.add(nome); return nome; }
      const i = nome.lastIndexOf('.'), base = i > nome.lastIndexOf('/') ? nome.slice(0, i) : nome, ext = i > nome.lastIndexOf('/') ? nome.slice(i) : '';
      for (let n = 2; ; n++) { const x = `${base} (${n})${ext}`; if (!usados.has(x)) { usados.add(x); return x; } }
    }
    return {
      add(nome, dados) {
        const bytes = typeof dados === 'string' ? enc.encode(dados) : dados;
        const nm = enc.encode(unico(nome)), crc = crc32(bytes), n = bytes.length;
        const h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
        h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true);
        h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
        c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true);
        c.setUint16(28, nm.length, true); c.setUint32(42, pos, true);
        partes.push(new Uint8Array(h.buffer), nm, bytes); central.push(new Uint8Array(c.buffer), nm);
        pos += 30 + nm.length + n;
        if (pos > 3.9 * 1024 ** 3 || usados.size > 65000) throw new Error('Período grande demais para um arquivo só. Escolha um intervalo menor.');
      },
      blob() {
        const tam = central.reduce((s, x) => s + x.length, 0);
        const f = new DataView(new ArrayBuffer(22));
        f.setUint32(0, 0x06054b50, true); f.setUint16(8, usados.size, true); f.setUint16(10, usados.size, true); f.setUint32(12, tam, true); f.setUint32(16, pos, true);
        return new Blob([...partes, ...central, new Uint8Array(f.buffer)], { type: 'application/zip' });
      },
      get qtd() { return usados.size; }
    };
  }

  // ---------------- O que vai em cada pasta ----------------
  // [coleção, nome da planilha, campos de data (o 1º preenchido decide se entra no período), gera ficha HTML?]
  const PASTAS = [
    ['01 Matrículas', [['alunos', 'Alunos matriculados no período', ['data_matricula', 'criado_em'], true], ['matriculas', 'Entradas em turmas', ['entrada']], ['espera', 'Lista de espera', ['data_inscricao', 'criado_em']], ['associados', 'Associados', ['data_adesao', 'criado_em']]]],
    ['02 Aulas e frequência', [['aulas', 'Aulas e chamadas', ['data']], ['planos_mensais', 'Planos de aula do mês', ['ym']], ['avaliacoes', 'Avaliações', ['data']], ['ocorrencias', 'Advertências e ocorrências', ['data'], true], ['conferencias', 'Conferência mensal', ['ym']]]],
    ['03 Termos e assinaturas', [['assinaturas', 'Termos assinados (famílias)', ['assinado_em', 'solicitado_em', 'criado_em']], ['assinaturas_equipe', 'Assinaturas da equipe', ['criado_em']], ['emprestimos', 'Termos de empréstimo', ['data_saida', 'criado_em'], true], ['certificados', 'Certificados emitidos', ['data_emissao', 'criado_em']]]],
    ['04 Atas e reuniões', [['atas', 'Atas (diretoria e assembleia)', ['data'], true], ['reunioes', 'Reuniões de pais', ['data'], true], ['acompanhamentos', 'Atas pedagógicas e visitas de aula', ['data'], true], ['pareceres', 'Pareceres', ['data'], true], ['mandatos', 'Mandatos', ['inicio']]]],
    ['05 Eventos', [['eventos', 'Eventos e apresentações', ['data'], true], ['reservas', 'Reservas de espaços', ['data']], ['calendario', 'Calendário letivo', ['data', 'inicio']], ['cronograma_pedagogico', 'Cronograma pedagógico', ['inicio']]]],
    ['06 Documentos', [['docs_inst', 'Documentos da instituição', ['emissao', 'criado_em']], ['estatuto', 'Estatuto', ['data_aprovacao', 'criado_em']], ['arquivos', 'Anexos enviados', ['criado_em']], ['comunicados', 'Comunicados', ['data'], true]]],
    ['07 Acompanhamento social', [['pia', 'PIA', ['elaborado_em', 'criado_em'], true], ['encaminhamentos', 'Encaminhamentos', ['data'], true]]],
    ['08 Financeiro', [['fin_lancamentos', 'Lançamentos', ['data', 'vencimento']], ['mensalidades', 'Mensalidades', ['pago_em', 'vencimento', 'competencia']], ['doacoes', 'Doações', ['data']], ['doacoes_online', 'Doações online', ['criado_em']], ['compras', 'Compras', ['solicitado_em', 'criado_em']], ['estoque_mov', 'Movimentos de estoque', ['data']], ['campanhas', 'Campanhas', ['inicio']]]],
    ['09 Equipe e voluntários', [['equipe', 'Equipe (admitidos no período)', ['admissao', 'criado_em']], ['voluntarios', 'Voluntários', ['inicio', 'criado_em']]]],
    ['10 Sistema', [['auditoria', 'Registro de auditoria (quem fez o quê)', ['em']], ['avisos_log', 'Mensagens de WhatsApp enviadas', ['em', 'data', 'criado_em']], ['pesquisas', 'Pesquisas', ['inicio', 'criado_em']]]]
  ];
  // Cadastros que dão contexto (sem data): vão inteiros, só em planilha
  const REFERENCIA = [['projetos', 'Projetos'], ['turmas', 'Turmas'], ['patrimonio', 'Patrimônio'], ['recursos', 'Espaços e insumos'], ['fornecedores', 'Fornecedores'], ['fin_contas', 'Contas bancárias'], ['fin_orcamentos', 'Orçamentos dos projetos'], ['estoque_itens', 'Estoque — itens'], ['doadores', 'Doadores']];

  // ---------------- Utilidades ----------------
  const limpa = s => String(s == null ? '' : s).replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'sem nome';
  const ehArquivo = s => typeof s === 'string' && (/^data:[a-z]+\/[a-z0-9.+-]+[;,]/i.test(s) && s.length > 200 || /\/storage\/v1\/object\/sign\/arquivos\//.test(s));
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'text/xml': 'xml', 'application/xml': 'xml' };
  function dataDe(r, campos) {
    for (const c of campos) { const v = r[c]; if (typeof v === 'string' && /^\d{4}-\d{2}/.test(v)) return v; }
    return '';
  }
  function noPeriodo(v, de, ate) {
    if (!v) return false;
    if (/^\d{4}-\d{2}$/.test(v)) return v >= de.slice(0, 7) && v <= ate.slice(0, 7);   // mês (ex.: planos do mês)
    const d = v.length > 10 ? new Date(v).toLocaleDateString('sv-SE') : v.slice(0, 10);    // data com hora: no fuso local
    return d >= de && d <= ate;
  }
  async function bytesDe(s) {
    if (s.startsWith('data:')) {
      const virg = s.indexOf(','), b64 = /;base64/i.test(s.slice(0, virg));
      const corpo = s.slice(virg + 1);
      if (!b64) return { bytes: enc.encode(decodeURIComponent(corpo)), mime: s.slice(5, s.search(/[;,]/)) };
      const bin = atob(corpo), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return { bytes: arr, mime: s.slice(5, s.search(/[;,]/)) };
    }
    const r = await fetch(s); if (!r.ok) throw new Error('arquivo indisponível');
    return { bytes: new Uint8Array(await r.arrayBuffer()), mime: (r.headers.get('content-type') || '').split(';')[0] };
  }
  // Achata o registro em colunas "a.b"; arquivos viram o caminho dentro do .zip
  function achatar(o, mapa, pre = '', out = {}) {
    Object.entries(o || {}).forEach(([k, v]) => {
      const kk = pre ? `${pre}.${k}` : k;
      if (ehArquivo(v)) out[kk] = mapa.get(v) || '[arquivo]';
      else if (k === 'doc_html' && v) out[kk] = mapa.get(v) || '[ver documento assinado]';
      else if (v && typeof v === 'object' && !Array.isArray(v)) achatar(v, mapa, kk, out);
      else if (Array.isArray(v)) out[kk] = v.some(x => x && typeof x === 'object') ? JSON.stringify(v.map(x => ehArquivo(x) ? (mapa.get(x) || '[arquivo]') : x && typeof x === 'object' ? JSON.parse(JSON.stringify(x, (kx, vx) => ehArquivo(vx) ? (mapa.get(vx) || '[arquivo]') : vx)) : x)).slice(0, 30000) : v.join(', ');
      else out[kk] = v;
    });
    return out;
  }
  function csv(linhas) {
    if (!linhas.length) return '';
    const cols = [...new Set(linhas.flatMap(l => Object.keys(l)))];
    const q = v => { const s = v == null ? '' : typeof v === 'boolean' ? (v ? 'sim' : 'não') : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '﻿' + [cols.map(q).join(';'), ...linhas.map(l => cols.map(c => q(l[c])).join(';'))].join('\r\n');
  }
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // Ficha legível de um registro (atas, reuniões, alunos…): campo → valor, arquivos com link
  function ficha(titulo, r, mapa, base) {
    const lin = achatar(r, mapa);
    const rot = k => k.replace(/_/g, ' ').replace(/\./g, ' › ');
    const caminhos = new Set(mapa.values());
    const val = v => { const s = String(v == null ? '' : v); return caminhos.has(s) && s.includes('/') ? `<a href="${escH(rel(base, s))}">${escH(s.split('/').slice(-2).join(' / '))}</a>` : escH(s).replace(/\n/g, '<br>'); };
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escH(titulo)}</title><style>body{font-family:Inter,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.6;color:#1a2140;max-width:190mm;margin:12mm auto;padding:0 8mm}h1{font-size:18px;border-bottom:3px solid #2563eb;padding-bottom:6px}table{width:100%;border-collapse:collapse}td{padding:4px 8px;border-bottom:1px solid #e3e9f5;vertical-align:top}td:first-child{width:32%;color:#5b6788;font-weight:600;text-transform:capitalize}.org{font-size:11px;color:#5b6788}</style></head><body>
      <div class="org">${escH(ICM.C.ORG.razao)} · CNPJ ${escH(ICM.C.ORG.cnpj)}</div><h1>${escH(titulo)}</h1>
      <table>${Object.entries(lin).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)).map(([k, v]) => `<tr><td>${escH(rot(k))}</td><td>${val(v)}</td></tr>`).join('')}</table></body></html>`;
  }
  function rel(de, para) { const a = de.split('/'), b = para.split('/'); a.pop(); while (a.length && b.length && a[0] === b[0]) { a.shift(); b.shift(); } return '../'.repeat(a.length) + b.join('/'); }

  // ---------------- Exportação ----------------
  async function exportar(de, ate, progresso = () => { }) {
    if (!ICM.auth.can('backup.exportar')) throw new Error('Somente a direção pode exportar os dados.');
    if (!de || !ate || de > ate) throw new Error('Escolha a data inicial e a final (a inicial antes da final).');
    const zip = criarZip();
    const raiz = `ICM ${de} a ${ate}`;
    const lista = async c => { try { return await S().list(c); } catch (e) { return []; } };
    progresso('Lendo cadastros');
    const [alunos, turmas, projetos, eventos] = await Promise.all(['alunos', 'turmas', 'projetos', 'eventos'].map(lista));
    const nomeAluno = id => (alunos.find(a => a.id === id) || {}).nome || '';
    const nomeTurma = id => (turmas.find(t => t.id === id) || {}).nome || '';
    const nomeProjeto = id => (projetos.find(p => p.id === id) || {}).nome || '';
    const resumo = []; let falhas = 0, nArq = 0;

    // Rótulo de cada registro (nome da subpasta dos arquivos)
    const rotulo = (col, r, data) => limpa([String(data || '').slice(0, 10), r.titulo || r.nome || r.tema || r.tipo_nome || r.descricao || r.tipo || '', r.turma_id && nomeTurma(r.turma_id), r.aluno_id && nomeAluno(r.aluno_id), r.projeto_id && !r.turma_id && nomeProjeto(r.projeto_id), col === 'alunos' && r.matricula].filter(Boolean).join(' - '));

    for (const [pasta, itens] of PASTAS) {
      for (const [col, nome, campos, comFicha] of itens) {
        progresso(`${pasta.slice(3)} — ${nome}`);
        const regs = (await lista(col)).map(r => ({ r, d: dataDe(r, campos) })).filter(x => noPeriodo(x.d, de, ate)).sort((a, b) => String(a.d).localeCompare(String(b.d)));
        if (!regs.length) continue;
        const mapa = new Map(); const linhas = [];
        for (const { r, d } of regs) {
          const lab = rotulo(col, r, d);
          // Arquivos do registro: fotos de aulas/eventos/alunos vão para "Fotos"; o resto fica na pasta do assunto
          const achados = [];
          (function andar(v, chave) {
            if (ehArquivo(v)) achados.push({ s: v, chave });
            else if (Array.isArray(v)) v.forEach((x, i) => andar(x, `${chave}-${i + 1}`));
            else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => andar(x, chave ? `${chave}-${k}` : k));
          })(r, '');
          let i = 0;
          for (const a of achados) {
            if (mapa.has(a.s)) continue;
            try {
              const { bytes, mime } = await bytesDe(a.s);
              const foto = /^image\//.test(mime) && /foto/i.test(a.chave);
              const dir = foto && ['aulas', 'eventos', 'alunos'].includes(col)
                ? `${raiz}/Fotos/${{ aulas: 'Aulas', eventos: 'Eventos', alunos: 'Alunos' }[col]}/${lab}`
                : `${raiz}/${pasta}/${nome} - arquivos/${lab}`;
              const arq = `${dir}/${limpa(a.chave.replace(/^fotos-(\d+)-src$/, 'foto-$1').replace(/-src$/, '').replace(/-data$/, '') || 'arquivo')}.${EXT[mime] || 'bin'}`;
              zip.add(arq, bytes); mapa.set(a.s, arq.slice(raiz.length + 1)); nArq++; i++;
              if (nArq % 20 === 0) progresso(`${pasta.slice(3)} — ${nArq} arquivo(s)`);
            } catch (e) { falhas++; mapa.set(a.s, '[arquivo indisponível]'); }
          }
          // Termos assinados: o documento como foi assinado
          if (r.doc_html) { const p = `${raiz}/${pasta}/${nome} - arquivos/${lab}/documento assinado.html`; zip.add(p, `<!doctype html><meta charset="utf-8">${r.doc_html}${r.assinatura_img ? `<p><img src="${escH(r.assinatura_img)}" style="max-height:90px"></p>` : ''}`); mapa.set(r.doc_html, p.slice(raiz.length + 1)); }
          if (comFicha) { const p = `${raiz}/${pasta}/${nome} - fichas/${lab}.html`; zip.add(p, ficha(`${nome.replace(/ no período$/, '')} — ${lab}`, r, mapa, p.slice(raiz.length + 1))); }
          const linha = achatar(r, mapa);
          if (r.aluno_id) linha['aluno (nome)'] = nomeAluno(r.aluno_id);
          if (r.turma_id) linha['turma (nome)'] = nomeTurma(r.turma_id);
          if (r.projeto_id) linha['projeto (nome)'] = nomeProjeto(r.projeto_id);
          if (r.evento_id) linha['evento (nome)'] = (eventos.find(e => e.id === r.evento_id) || {}).titulo || '';
          linhas.push(linha);
        }
        zip.add(`${raiz}/${pasta}/${nome}.csv`, csv(linhas));
        resumo.push(`${pasta} › ${nome}: ${regs.length} registro(s)`);
      }
    }
    progresso('Cadastros de referência');
    for (const [col, nome] of REFERENCIA) {
      const regs = await lista(col); if (!regs.length) continue;
      zip.add(`${raiz}/00 Cadastros de referência/${nome}.csv`, csv(regs.map(r => achatar(r, new Map()))));
    }
    const quem = (ICM.auth.user() || {}).nome || '';
    zip.add(`${raiz}/LEIA-ME.txt`, [
      `${ICM.C.ORG.nome} — exportação de ${u().fmtDate(de)} a ${u().fmtDate(ate)}`,
      `Gerada por ${quem} em ${new Date().toLocaleString('pt-BR')}.`, '',
      'Como está organizado:',
      '- Cada pasta é um assunto. Dentro dela, uma planilha (.csv, abre no Excel) por tipo de registro;',
      '  "… - arquivos" guarda os anexos (PDFs, assinaturas, comprovantes) e "… - fichas" uma página por registro (abre no navegador).',
      '- Fotos: separadas por aulas, eventos e alunos, uma pasta por data.',
      '- 00 Cadastros de referência: projetos, turmas, patrimônio etc. completos, para consultar os nomes.',
      '- Só entram registros cuja data (da aula, da matrícula, da assinatura, do lançamento…) cai no período.', '',
      'Resumo:', ...(resumo.length ? resumo.map(x => '  ' + x) : ['  Nenhum registro no período.']),
      `  Arquivos: ${nArq}${falhas ? ` (${falhas} não puderam ser baixados)` : ''}`, '',
      'ATENÇÃO (LGPD): contém dados pessoais e sensíveis de crianças e adolescentes.',
      'Guarde só em local protegido e com acesso restrito. Não envie por e-mail nem WhatsApp.'
    ].join('\r\n'));
    progresso('Montando o arquivo');
    const blob = zip.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ICM-exportacao-${de}-a-${ate}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    await ICM.api.audit('exportar', 'sistema', '', `Exportação do período ${de} a ${ate}: ${resumo.length} grupo(s), ${nArq} arquivo(s)`);
    return { grupos: resumo.length, arquivos: nArq, falhas, tamanho: blob.size };
  }

  ICM.exportarPeriodo = exportar;
})();
