/**
 * ICM SISTEMA — Automações diárias (Google Apps Script)
 * Instituto Cultural das Montanhas
 *
 * O que faz, sozinho, todo dia:
 *   1) 02h: BACKUP completo do banco (Supabase) em arquivo .json.gz na pasta do Google Drive
 *      escolhida, apagando os backups com mais de 30 dias (configurável).
 *   2) 07h: E-MAIL DE AVISOS para a direção/coordenação, só quando houver pendência:
 *      documentos da instituição vencendo, alunos com faltas no limite de desligamento,
 *      PIAs para revisar, encaminhamentos sem retorno da rede, mandatos e contratos vencendo
 *      e empréstimos de bens atrasados.
 *
 * Como instalar (uma vez só) — passo a passo também no README do sistema:
 *   1. script.google.com → Novo projeto → apague o conteúdo e cole ESTE arquivo inteiro → Salvar.
 *   2. Configurações do projeto (engrenagem) → Propriedades do script → adicionar:
 *        SUPABASE_URL          https://syzqaxqwzgcjompqlhjg.supabase.co
 *        SUPABASE_SECRET_KEY   chave SECRETA do Supabase (Project Settings → API Keys → secret/service_role)
 *        PASTA_BACKUP_ID       ID da pasta do Drive (o código no fim do endereço da pasta)
 *        EMAILS_AVISOS         e-mails separados por vírgula (vazio = administradores e coordenação do sistema)
 *        DIAS_MANTER           30   (opcional: quantos dias de backup guardar)
 *   3. No editor, escolha a função "instalar" e clique em Executar. Autorize o acesso pedido pelo Google.
 *   4. Para testar na hora: execute "backupDiario" e depois "avisosDiarios".
 *
 * SEGURANÇA: a chave secreta dá acesso total ao banco. Ela fica só nas Propriedades deste script,
 * na conta Google do Instituto. NUNCA cole a chave dentro do código nem no site do sistema.
 * O backup contém dados pessoais de alunos (LGPD): mantenha a pasta do Drive sem compartilhamento público.
 */

// ===================== Configuração =====================
function cfg_() {
  const p = PropertiesService.getScriptProperties();
  const c = {
    url: String(p.getProperty('SUPABASE_URL') || '').replace(/\/+$/, ''),
    chave: p.getProperty('SUPABASE_SECRET_KEY') || '',
    pasta: p.getProperty('PASTA_BACKUP_ID') || '',
    emails: p.getProperty('EMAILS_AVISOS') || '',
    dias: Number(p.getProperty('DIAS_MANTER') || 30)
  };
  if (!c.url || !c.chave) throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET_KEY nas Propriedades do script.');
  return c;
}

// Cria os gatilhos diários (rodar uma vez). Remove gatilhos antigos destas funções antes.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['backupDiario', 'avisosDiarios'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupDiario').timeBased().everyDays(1).atHour(2).inTimezone('America/Sao_Paulo').create();
  ScriptApp.newTrigger('avisosDiarios').timeBased().everyDays(1).atHour(7).inTimezone('America/Sao_Paulo').create();
  const c = cfg_();
  if (!c.pasta) throw new Error('Configure PASTA_BACKUP_ID (pasta do Drive para os backups).');
  DriveApp.getFolderById(c.pasta); // confere se a pasta existe e se há permissão
  Logger.log('Pronto: backup às 2h e avisos às 7h, todos os dias (horário de Brasília).');
}

// ===================== Acesso ao banco (REST do Supabase) =====================
function cabecalhos_(c) {
  const h = { apikey: c.chave, Accept: 'application/json' };
  if (/^eyJ/.test(c.chave)) h.Authorization = 'Bearer ' + c.chave; // chave antiga (service_role em formato JWT)
  return h;
}
function buscar_(c, caminho) {
  const r = UrlFetchApp.fetch(c.url + '/rest/v1/' + caminho, { headers: cabecalhos_(c), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('Supabase ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText() || '[]');
}
// Lê uma tabela inteira em páginas de 1000
function tabela_(c, nome, filtro, ordem) {
  const out = []; const passo = 1000;
  for (let de = 0; ; de += passo) {
    const l = buscar_(c, nome + '?select=*' + (filtro ? '&' + filtro : '') + '&order=' + (ordem || 'id') + '&limit=' + passo + '&offset=' + de);
    Array.prototype.push.apply(out, l);
    if (l.length < passo) break;
  }
  return out;
}
// Registros agrupados por coleção: { alunos: [...], aulas: [...], ... }
function colecoes_(c, somente) {
  const filtro = somente ? 'colecao=in.(' + somente.join(',') + ')' : '';
  const regs = tabela_(c, 'registros', filtro, 'colecao,id');
  const o = {};
  regs.forEach(function (r) { const d = r.dados || {}; d.id = r.id; (o[r.colecao] = o[r.colecao] || []).push(d); });
  return o;
}

// ===================== 1) Backup diário =====================
function backupDiario() {
  const c = cfg_();
  if (!c.pasta) throw new Error('Configure PASTA_BACKUP_ID.');
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const snap = colecoes_(c);
  snap.config = (buscar_(c, 'config?select=dados&id=eq.geral')[0] || {}).dados || {};
  snap.perfis = tabela_(c, 'perfis', '', 'nome');
  snap.auditoria_90dias = tabela_(c, 'auditoria', 'em=gte.' + Utilities.formatDate(new Date(Date.now() - 90 * 864e5), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"), 'em');
  snap.gerado_em = new Date().toISOString();
  snap.sistema = 'ICM Sistema';
  snap.observacao = 'Fotos e anexos ficam no Storage do Supabase (bucket privado "arquivos"); este arquivo guarda os registros e as referências.';
  const json = JSON.stringify(snap);
  const gz = Utilities.gzip(Utilities.newBlob(json, 'application/json', 'ICM-backup-' + hoje + '.json'), 'ICM-backup-' + hoje + '.json.gz');
  const pasta = DriveApp.getFolderById(c.pasta);
  const arq = pasta.createFile(gz);
  // Apaga backups antigos (mantém os últimos DIAS_MANTER dias)
  const limite = Date.now() - c.dias * 864e5; let apagados = 0;
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^ICM-backup-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f.getName()) && f.getDateCreated().getTime() < limite) { f.setTrashed(true); apagados++; }
  }
  const total = Object.keys(snap).reduce(function (s, k) { return s + (Array.isArray(snap[k]) ? snap[k].length : 0); }, 0);
  Logger.log('Backup ' + arq.getName() + ': ' + total + ' registros, ' + Math.round(arq.getSize() / 1024) + ' KB. Antigos na lixeira: ' + apagados + '.');
  return arq.getName();
}

// ===================== 2) Avisos por e-mail =====================
function avisosDiarios() {
  const c = cfg_();
  const tz = 'America/Sao_Paulo';
  const hoje = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const mais = function (dias) { return Utilities.formatDate(new Date(Date.now() + dias * 864e5), tz, 'yyyy-MM-dd'); };
  const br = function (iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; };
  const dif = function (iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 864e5); };
  const d = colecoes_(c, ['docs_inst', 'alunos', 'turmas', 'aulas', 'matriculas', 'pia', 'encaminhamentos', 'mandatos', 'equipe', 'emprestimos', 'patrimonio']);
  const config = (buscar_(c, 'config?select=dados&id=eq.geral')[0] || {}).dados || {};
  const limiteFaltas = ((config.assiduidade || {}).desligamento) || 3;
  const nomeAluno = {}; (d.alunos || []).forEach(function (a) { nomeAluno[a.id] = a.nome; });
  const blocos = [];
  const bloco = function (titulo, itens) { if (itens.length) blocos.push({ titulo: titulo, itens: itens }); };

  const DOCS = { cnd_federal: 'CND Federal (Receita/PGFN)', crf_fgts: 'CRF — Regularidade do FGTS', cndt: 'CNDT — Débitos Trabalhistas', cnd_estadual: 'CND Estadual', cnd_municipal: 'CND Municipal', cepim: 'Consulta CEPIM', cnpj: 'Cartão CNPJ', alvara: 'Alvará de funcionamento', avcb: 'AVCB — Corpo de Bombeiros', sanitaria: 'Licença sanitária', cmdca: 'Registro no CMDCA', cmas: 'Inscrição no CMAS', cebas: 'CEBAS', utilidade: 'Título de Utilidade Pública', estatuto: 'Estatuto registrado', ata_eleicao: 'Ata de eleição da diretoria' };
  bloco('Documentos da instituição vencidos ou vencendo (15 dias)', (d.docs_inst || []).filter(function (x) { return x.validade && x.validade <= mais(15); })
    .sort(function (a, b) { return a.validade < b.validade ? -1 : 1; })
    .map(function (x) { const n = dif(x.validade); return (x.tipo === 'outro' ? (x.nome || 'Documento') : (DOCS[x.tipo] || x.nome || x.tipo)) + ' — ' + (n < 0 ? 'VENCIDO há ' + (-n) + ' dia(s)' : 'vence em ' + br(x.validade)); }));

  // Faltas no mês atual por aluno e turma
  const ym = hoje.slice(0, 7); const faltas = {};
  (d.aulas || []).filter(function (a) { return a.status === 'realizada' && String(a.data).slice(0, 7) === ym; }).forEach(function (a) {
    Object.keys(a.presencas || {}).forEach(function (id) { if (a.presencas[id] === 'F') { const k = id + '|' + a.turma_id; faltas[k] = (faltas[k] || 0) + 1; } });
  });
  const turma = {}; (d.turmas || []).forEach(function (t) { turma[t.id] = t.nome; });
  bloco('Alunos com ' + limiteFaltas + ' faltas ou mais neste mês', Object.keys(faltas).filter(function (k) { return faltas[k] >= limiteFaltas; })
    .map(function (k) { const p = k.split('|'); return (nomeAluno[p[0]] || 'Aluno') + ' — ' + (turma[p[1]] || '') + ' (' + faltas[k] + ' faltas)'; }));

  bloco('PIAs para revisar (próximos 7 dias)', (d.pia || []).filter(function (x) { return x.revisar_em && x.revisar_em <= mais(7); })
    .map(function (x) { return (nomeAluno[x.aluno_id] || 'Aluno') + ' — revisão ' + (x.revisar_em < hoje ? 'atrasada desde ' : 'em ') + br(x.revisar_em); }));

  bloco('Encaminhamentos à rede sem retorno há mais de 30 dias', (d.encaminhamentos || []).filter(function (x) { return x.status !== 'concluido' && !x.data_retorno && x.data && x.data <= mais(-30); })
    .map(function (x) { return (nomeAluno[x.aluno_id] || 'Aluno') + ' — ' + x.orgao + ' (desde ' + br(x.data) + '): ' + (x.motivo || ''); }));

  bloco('Mandatos da diretoria/conselhos vencendo (30 dias)', (d.mandatos || []).filter(function (x) { return x.fim && x.fim >= mais(-1) && x.fim <= mais(30); })
    .map(function (x) { return x.cargo + ' — ' + x.nome + ' (até ' + br(x.fim) + ')'; }));

  bloco('Contratos da equipe vencendo (30 dias)', (d.equipe || []).filter(function (x) { return x.status === 'ativo' && x.contrato && x.contrato.fim && x.contrato.fim <= mais(30); })
    .map(function (x) { return x.nome + ' (' + x.cargo + ') — ' + (x.contrato.fim < hoje ? 'VENCIDO em ' : 'vence em ') + br(x.contrato.fim); }));

  const bem = {}; (d.patrimonio || []).forEach(function (i) { bem[i.id] = i.nome; });
  bloco('Empréstimos de bens atrasados', (d.emprestimos || []).filter(function (x) { return x.status === 'ativo' && x.previsao_devolucao && x.previsao_devolucao < hoje; })
    .map(function (x) { return (x.quantidade || 1) + 'x ' + (bem[x.item_id] || 'bem') + ' — ' + (nomeAluno[x.aluno_id] || (x.terceiro && x.terceiro.nome) || 'tomador') + ' (devolução prevista ' + br(x.previsao_devolucao) + ')'; }));

  if (!blocos.length) { Logger.log('Nenhuma pendência hoje: e-mail não enviado.'); return 0; }
  let para = c.emails;
  if (!para) para = tabela_(c, 'perfis', 'ativo=eq.true&papel=in.(admin,coordenacao)', 'nome').map(function (p) { return p.email; }).join(',');
  if (!para) throw new Error('Nenhum destinatário: configure EMAILS_AVISOS.');
  const total = blocos.reduce(function (s, b) { return s + b.itens.length; }, 0);
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
  const html = '<div style="font-family:Arial,sans-serif;max-width:640px;color:#1c2440">' +
    '<h2 style="color:#1d4ed8;margin:0 0 4px">ICM Sistema — avisos do dia</h2><div style="color:#5b6788;margin-bottom:16px">' + br(hoje) + ' · ' + total + ' pendência(s)</div>' +
    blocos.map(function (b) { return '<h3 style="margin:18px 0 6px;font-size:15px">' + esc(b.titulo) + ' (' + b.itens.length + ')</h3><ul style="margin:0;padding-left:18px">' + b.itens.slice(0, 40).map(function (i) { return '<li style="margin:3px 0">' + esc(i) + '</li>'; }).join('') + '</ul>'; }).join('') +
    '<p style="margin-top:22px"><a href="https://drdiegopadua.github.io/icm/" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir o ICM Sistema</a></p>' +
    '<p style="color:#8a94b0;font-size:11px">E-mail automático do ICM Sistema. Contém dados pessoais de alunos: não encaminhe para fora da equipe.</p></div>';
  MailApp.sendEmail({ to: para, subject: 'ICM Sistema — ' + total + ' aviso(s) para hoje', htmlBody: html, name: 'ICM Sistema' });
  Logger.log('Avisos enviados para ' + para + ': ' + total + ' pendência(s).');
  return total;
}
