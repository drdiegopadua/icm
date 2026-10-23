/* Dados fictícios: financeiro por projeto, fornecedores, compras, campanhas de doação
   e acompanhamento social (PIA, encaminhamentos, pareceres, avaliações de evolução). */
(function () {
  window.ICM = window.ICM || {};
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function build(db) {
    const u = ICM.util, r = rng(31337), pick = a => a[Math.floor(r() * a.length)];
    const hoje = u.today(), ano = +hoje.slice(0, 4), stamp = new Date().toISOString();
    const mesAtual = +hoje.slice(5, 7);

    // ---------------- Contas ----------------
    const fin_contas = [
      { id: 'cta_mov', nome: 'Conta movimento', tipo: 'corrente', banco: '001 — Banco do Brasil', agencia: '1234-5', conta: '10.000-1', projeto_id: '', saldo_inicial: 18500, data_saldo: `${ano}-01-01` },
      { id: 'cta_edu', nome: 'Conta específica — Termo de Fomento 034', tipo: 'especifica', banco: '001 — Banco do Brasil', agencia: '1234-5', conta: '20.034-0', projeto_id: 'prj_edu', saldo_inicial: 0, data_saldo: `${ano}-01-01` },
      { id: 'cta_orq', nome: 'Conta captação — PRONAC Orquestra', tipo: 'especifica', banco: '001 — Banco do Brasil', agencia: '1234-5', conta: '30.111-2', projeto_id: 'prj_orq', saldo_inicial: 0, data_saldo: `${ano}-01-01` },
      { id: 'cta_esp', nome: 'Conta captação — Lei de Incentivo ao Esporte', tipo: 'especifica', banco: '104 — Caixa', agencia: '0001', conta: '40.222-3', projeto_id: 'prj_esp', saldo_inicial: 0, data_saldo: `${ano}-01-01` },
      { id: 'cta_caixa', nome: 'Caixa da secretaria', tipo: 'caixa', banco: '', agencia: '', conta: '', projeto_id: '', saldo_inicial: 350, data_saldo: `${ano}-01-01` }
    ].map(c => ({ ...c, ativa: true, criado_em: stamp }));

    // ---------------- Orçamento por projeto e rubrica ----------------
    const dist = { prj_orq: { pessoal: .45, servicos_pf: .08, material_consumo: .07, material_permanente: .22, transporte: .05, comunicacao: .05, administrativas: .06, tarifas: .02 },
      prj_esp: { pessoal: .42, servicos_pf: .06, material_consumo: .10, material_permanente: .12, alimentacao: .08, transporte: .12, comunicacao: .04, administrativas: .04, tarifas: .02 },
      prj_verde: { pessoal: .35, material_consumo: .25, material_permanente: .15, transporte: .08, comunicacao: .07, administrativas: .08, tarifas: .02 },
      prj_edu: { pessoal: .55, material_consumo: .12, alimentacao: .18, comunicacao: .03, administrativas: .10, tarifas: .02 },
      prj_saude: { pessoal: .40, servicos_pj: .30, material_consumo: .20, comunicacao: .10 } };
    const fin_orcamentos = [];
    (db.projetos || []).forEach(p => Object.entries(dist[p.id] || {}).forEach(([rub, pc]) => fin_orcamentos.push({ id: u.uid('orc_'), projeto_id: p.id, rubrica: rub, valor: Math.round((p.valor || 0) * pc), obs: '' })));

    // ---------------- Fornecedores ----------------
    const fornecedores = [
      { id: 'for_1', nome: 'Casa da Música Instrumentos Ltda', documento: '55.555.555/0001-55', categoria: 'Instrumentos musicais', contato: 'Rogério', telefone: '(00) 3555-1000', email: 'vendas@casadamusica.com', pix: '55.555.555/0001-55' },
      { id: 'for_2', nome: 'Esporte Total Comércio', documento: '66.666.666/0001-66', categoria: 'Material esportivo', contato: 'Aline', telefone: '(00) 3666-2000', email: 'contato@esportetotal.com', pix: 'pix@esportetotal.com' },
      { id: 'for_3', nome: 'Distribuidora Central', documento: '77.777.777/0001-77', categoria: 'Limpeza e alimentação', contato: 'Marcos', telefone: '(00) 3777-3000', email: 'pedidos@central.com', pix: '' },
      { id: 'for_4', nome: 'Transportes Boa Viagem', documento: '88.888.888/0001-88', categoria: 'Transporte', contato: 'Sr. Pedro', telefone: '(00) 98888-4000', email: '', pix: '(00) 98888-4000' },
      { id: 'for_5', nome: 'Papelaria Saber', documento: '99.999.999/0001-99', categoria: 'Papelaria', contato: 'Lúcia', telefone: '(00) 3999-5000', email: 'saber@papelaria.com', pix: '' },
      { id: 'for_6', nome: 'Musical Brasil Online', documento: '12.121.212/0001-12', categoria: 'Instrumentos musicais', contato: 'SAC', telefone: '', email: 'sac@musicalbrasil.com', pix: '' }
    ].map(f => ({ ...f, endereco: '', observacoes: '', criado_em: stamp }));

    // ---------------- Lançamentos ----------------
    const fin_lancamentos = [];
    const L = (o) => fin_lancamentos.push({ id: u.uid('lan_'), status: 'pago', documento: '', fornecedor_id: '', rateio: null, comprovante: null, conciliado: false, obs: '', criado_em: stamp, ...o });
    // Receitas: repasses e captação
    L({ tipo: 'receita', data: `${ano}-02-20`, vencimento: `${ano}-02-20`, descricao: 'Repasse 1ª parcela — Termo de Fomento 034', valor: 52000, categoria: 'repasse', projeto_id: 'prj_edu', conta_id: 'cta_edu', documento: 'OB 000123' });
    L({ tipo: 'receita', data: `${ano}-06-18`, vencimento: `${ano}-06-18`, descricao: 'Repasse 2ª parcela — Termo de Fomento 034', valor: 52000, categoria: 'repasse', projeto_id: 'prj_edu', conta_id: 'cta_edu', documento: 'OB 000456' });
    L({ tipo: 'receita', data: '', vencimento: `${ano}-11-20`, descricao: 'Repasse 3ª parcela — Termo de Fomento 034', valor: 52000, categoria: 'repasse', projeto_id: 'prj_edu', conta_id: 'cta_edu', status: 'previsto' });
    L({ tipo: 'receita', data: `${ano}-02-05`, vencimento: `${ano}-02-05`, descricao: 'Captação PRONAC — patrocínio Construtora Horizonte', valor: 200000, categoria: 'incentivo', projeto_id: 'prj_orq', conta_id: 'cta_orq' });
    L({ tipo: 'receita', data: `${ano}-04-10`, vencimento: `${ano}-04-10`, descricao: 'Captação PRONAC — patrocínio Supermercado Bom Preço', valor: 120000, categoria: 'incentivo', projeto_id: 'prj_orq', conta_id: 'cta_orq' });
    L({ tipo: 'receita', data: `${ano}-03-01`, vencimento: `${ano}-03-01`, descricao: 'Captação LIE — patrocínios esportivos', valor: 210000, categoria: 'incentivo', projeto_id: 'prj_esp', conta_id: 'cta_esp' });
    L({ tipo: 'receita', data: `${ano}-04-02`, vencimento: `${ano}-04-02`, descricao: 'Doação Fundação Futuro Melhor', valor: 25000, categoria: 'doacao_pj', projeto_id: 'prj_verde', conta_id: 'cta_mov' });
    for (let m = 1; m <= mesAtual; m++) L({ tipo: 'receita', data: `${ano}-${String(m).padStart(2, '0')}-28`, vencimento: `${ano}-${String(m).padStart(2, '0')}-28`, descricao: `Rendimento de aplicação — ${u.MESES_C[m - 1]}`, valor: Math.round(180 + r() * 120), categoria: 'rendimento', projeto_id: 'prj_edu', conta_id: 'cta_edu' });
    // Despesas mensais por projeto (salários com rateio, materiais, alimentação, transporte)
    for (let m = 2; m <= mesAtual; m++) {
      const mm = String(m).padStart(2, '0'); const pago = m < mesAtual;
      const st = d => (pago || +d < +hoje.slice(8)) ? 'pago' : 'a_pagar';
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-05` : '', vencimento: `${ano}-${mm}-05`, status: st('05'), descricao: `Folha — Juliana Prado (pedagoga) ${u.MESES_C[m - 1]}`, valor: 2600, rubrica: 'pessoal', projeto_id: 'prj_edu', conta_id: 'cta_edu' });
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-05` : '', vencimento: `${ano}-${mm}-05`, status: st('05'), descricao: `Folha — Mariana Coelho (coordenação) ${u.MESES_C[m - 1]}`, valor: 4800, rubrica: 'pessoal', projeto_id: '', conta_id: 'cta_mov', rateio: [{ projeto_id: 'prj_orq', pct: 30 }, { projeto_id: 'prj_esp', pct: 30 }, { projeto_id: 'prj_edu', pct: 25 }, { projeto_id: 'prj_verde', pct: 15 }] });
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-10` : '', vencimento: `${ano}-${mm}-10`, status: st('10'), descricao: `Prof. Carlos Menezes — NF serviços ${u.MESES_C[m - 1]}`, valor: 2400, rubrica: 'servicos_pf', projeto_id: 'prj_orq', conta_id: 'cta_orq', documento: 'NFS-e ' + (100 + m) });
      if (m >= 3) L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-10` : '', vencimento: `${ano}-${mm}-10`, status: st('10'), descricao: `Prof. Fernanda Rocha — RPA ${u.MESES_C[m - 1]}`, valor: 1800, rubrica: 'servicos_pf', projeto_id: 'prj_esp', conta_id: 'cta_esp', documento: 'RPA ' + m });
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-15` : '', vencimento: `${ano}-${mm}-15`, status: st('15'), descricao: `Lanche do reforço — ${u.MESES_C[m - 1]}`, valor: Math.round(900 + r() * 400), rubrica: 'alimentacao', projeto_id: 'prj_edu', conta_id: 'cta_edu', fornecedor_id: 'for_3', documento: 'NF ' + (2000 + m) });
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-20` : '', vencimento: `${ano}-${mm}-20`, status: st('20'), descricao: `Água, luz e internet — ${u.MESES_C[m - 1]}`, valor: Math.round(780 + r() * 200), rubrica: 'administrativas', projeto_id: '', conta_id: 'cta_mov', rateio: [{ projeto_id: 'prj_edu', pct: 50 }, { projeto_id: 'prj_orq', pct: 30 }, { projeto_id: 'prj_esp', pct: 20 }] });
      L({ tipo: 'despesa', data: pago ? `${ano}-${mm}-28` : '', vencimento: `${ano}-${mm}-28`, status: st('28'), descricao: `Tarifa bancária — ${u.MESES_C[m - 1]}`, valor: 39.9, rubrica: 'tarifas', projeto_id: 'prj_edu', conta_id: 'cta_edu' });
    }
    L({ tipo: 'despesa', data: `${ano}-02-20`, vencimento: `${ano}-02-20`, descricao: 'Compra de 20 violinos (4/4 e 3/4)', valor: 14880, rubrica: 'material_permanente', projeto_id: 'prj_orq', conta_id: 'cta_orq', fornecedor_id: 'for_1', documento: 'NF 3.330' });
    L({ tipo: 'despesa', data: `${ano}-03-08`, vencimento: `${ano}-03-08`, descricao: 'Bolas, cones e redes', valor: 2660, rubrica: 'material_consumo', projeto_id: 'prj_esp', conta_id: 'cta_esp', fornecedor_id: 'for_2', documento: 'NF 7.410' });
    L({ tipo: 'despesa', data: `${ano}-02-10`, vencimento: `${ano}-02-10`, descricao: 'Uniformes (camisetas e shorts)', valor: 3502, rubrica: 'material_consumo', projeto_id: 'prj_esp', conta_id: 'cta_esp', fornecedor_id: 'for_2', documento: 'NF 7.002' });
    L({ tipo: 'despesa', data: `${ano}-08-30`, vencimento: `${ano}-08-30`, descricao: 'Transporte — Torneio Interescolar de Vôlei', valor: 650, rubrica: 'transporte', projeto_id: 'prj_esp', conta_id: 'cta_esp', fornecedor_id: 'for_4', documento: 'Recibo 045' });
    L({ tipo: 'despesa', data: '', vencimento: u.addDays(hoje, -4), status: 'a_pagar', descricao: 'Papelaria — cadernos e lápis (2º semestre)', valor: 1185, rubrica: 'material_consumo', projeto_id: 'prj_edu', conta_id: 'cta_edu', fornecedor_id: 'for_5', documento: 'NF 9.876' });
    L({ tipo: 'despesa', data: '', vencimento: u.addDays(hoje, 17), status: 'a_pagar', descricao: 'Transporte — Copa Regional de Futsal', valor: 780, rubrica: 'transporte', projeto_id: 'prj_esp', conta_id: 'cta_esp', fornecedor_id: 'for_4' });
    // Doações viram receitas da conta movimento
    (db.doacoes || []).filter(d => d.tipo === 'dinheiro').forEach(d => L({ tipo: 'receita', data: d.data, vencimento: d.data, descricao: `Doação ${d.recibo}`, valor: d.valor, categoria: (db.doadores.find(x => x.id === d.doador_id) || {}).tipo === 'PJ' ? 'doacao_pj' : 'doacao_pf', projeto_id: d.projeto_id || '', conta_id: 'cta_mov', documento: d.recibo, doacao_id: d.id }));
    // Pagamentos de mensalidades de associados
    (db.mensalidades || []).filter(m => m.status === 'paga').forEach(m => L({ tipo: 'receita', data: m.pago_em, vencimento: m.vencimento, descricao: `Contribuição associativa ${m.recibo}`, valor: m.valor, categoria: 'mensalidade', projeto_id: '', conta_id: m.forma === 'Dinheiro (espécie)' ? 'cta_caixa' : 'cta_mov', documento: m.recibo }));

    // ---------------- Compras ----------------
    const cot = (forn, valor, prazo, obs = '') => ({ id: u.uid('cot_'), fornecedor_id: forn, valor, prazo_entrega: prazo, validade: u.addDays(hoje, 15), obs, arquivo: null });
    const compras = [
      { id: 'cmp_1', numero: `CMP-${ano}-0001`, titulo: 'Compra de 4 violas de arco', justificativa: 'Ampliação do naipe de violas aprovada em reunião de diretoria (ata 05).', solicitante: 'Carlos Menezes', solicitado_em: `${ano}-08-15`, projeto_id: 'prj_orq', rubrica: 'material_permanente', itens: [{ descricao: 'Viola de arco 15,5" com estojo e arco', quantidade: 4, unidade: 'un' }], cotacoes: [cot('for_1', 4400, '10 dias'), cot('for_6', 4180, '20 dias', 'Frete incluso'), cot('for_2', 4950, '15 dias')], escolhida: '', justificativa_escolha: '', status: 'aguardando_aprovacao' },
      { id: 'cmp_2', numero: `CMP-${ano}-0002`, titulo: 'Coletes e bolas para a Copa Regional', justificativa: 'Reposição de material para o campeonato.', solicitante: 'Fernanda Rocha', solicitado_em: u.addDays(hoje, -6), projeto_id: 'prj_esp', rubrica: 'material_consumo', itens: [{ descricao: 'Colete de treino numerado', quantidade: 20, unidade: 'un' }, { descricao: 'Bola de futsal oficial', quantidade: 6, unidade: 'un' }], cotacoes: [cot('for_2', 1290, '5 dias')], escolhida: '', justificativa_escolha: '', status: 'cotacao' },
      { id: 'cmp_3', numero: `CMP-${ano}-0003`, titulo: 'Kit limpeza trimestral', justificativa: 'Reposição do almoxarifado.', solicitante: 'Renata Alves', solicitado_em: `${ano}-07-20`, projeto_id: '', rubrica: 'material_consumo', itens: [{ descricao: 'Detergente 500 ml', quantidade: 36, unidade: 'un' }, { descricao: 'Álcool 70% 1 L', quantidade: 24, unidade: 'L' }], cotacoes: [cot('for_3', 420, '3 dias'), cot('for_5', 510, '5 dias'), cot('for_2', 495, '7 dias')], escolhida: '', justificativa_escolha: 'Menor preço', status: 'concluida', aprovado_por: 'Diego Pádua', aprovado_em: `${ano}-07-25` }
    ].map(c => ({ ...c, criado_em: stamp }));
    compras[2].escolhida = compras[2].cotacoes[0].id;

    // ---------------- Campanhas e doações online ----------------
    const campanhas = [
      { id: 'cmp_natal', titulo: 'Concerto de Natal: instrumento para todos', descricao: 'Ajude a comprar 10 novos violinos para que mais crianças toquem no Concerto de Natal.', meta: 8000, inicio: `${ano}-10-01`, fim: `${ano}-12-10`, projeto_id: 'prj_orq', cor: '#8b5cf6', ativa: true },
      { id: 'cmp_copa', titulo: 'Leve o time para a Copa Regional', descricao: 'Transporte, lanche e uniformes para 12 atletas Sub-13.', meta: 2500, inicio: u.addDays(hoje, -15), fim: u.addDays(hoje, 17), projeto_id: 'prj_esp', cor: '#f97316', ativa: true },
      { id: 'cmp_geral', titulo: 'Doe para o Instituto', descricao: 'Sua doação mantém todas as atividades: cultura, esporte, meio ambiente, educação e saúde.', meta: 0, inicio: `${ano}-01-01`, fim: `${ano}-12-31`, projeto_id: '', cor: '#2563eb', ativa: true }
    ].map(c => ({ ...c, criado_em: stamp }));
    const nomes = ['Ana Paula Rios', 'Bruno Teixeira', 'Carla Mendes', 'Diego Alves', 'Elaine Costa', 'Fábio Nunes', 'Gisele Prado', 'Hugo Martins'];
    const doacoes_online = [];
    nomes.forEach((n, i) => doacoes_online.push({ id: u.uid('don_'), campanha_id: i < 5 ? 'cmp_natal' : i < 7 ? 'cmp_copa' : 'cmp_geral', nome: n, email: n.split(' ')[0].toLowerCase() + '@email.com', telefone: '(00) 9' + String(Math.floor(r() * 1e8)).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'), valor: pick([50, 100, 150, 200, 300, 500]), recorrente: i % 3 === 0, txid: 'ICM' + String(1000 + i), status: i < 6 ? 'confirmada' : 'aguardando', criado_em: new Date(Date.now() - (i + 1) * 864e5 * 2).toISOString(), confirmado_em: i < 6 ? u.addDays(hoje, -(i + 1) * 2) : null, aceita_comunicacao: true }));

    // ---------------- Acompanhamento social ----------------
    const ativos = (db.alunos || []).filter(a => a.status === 'ativo');
    const vul = ativos.filter(a => a.social && (a.social.vulnerabilidades || a.social.cras === 'Sim')).slice(0, 5);
    const pia = vul.slice(0, 3).map((a, i) => ({ id: u.uid('pia_'), aluno_id: a.id, elaborado_em: `${ano}-03-1${i}`, revisar_em: i === 0 ? u.addDays(hoje, -5) : u.addDays(hoje, 40), situacao: 'Família com renda instável; aluno com histórico de faltas escolares. Mãe trabalha como diarista e avó auxilia nos cuidados.', responsavel: 'Renata Alves', participaram: 'Mãe, avó e o(a) aluno(a)',
      objetivos: [
        { id: u.uid('obj_'), area: 'Escolar', objetivo: 'Melhorar a frequência e o desempenho escolar', acoes: 'Reforço escolar 2x/semana; contato mensal com a escola', responsavel: 'Juliana Prado', prazo: `${ano}-12-10`, status: 'em_andamento' },
        { id: u.uid('obj_'), area: 'Socioeconômica', objetivo: 'Atualizar CadÚnico e acessar benefícios', acoes: 'Encaminhar ao CRAS', responsavel: 'Renata Alves', prazo: `${ano}-06-30`, status: i === 1 ? 'em_andamento' : 'concluido' },
        { id: u.uid('obj_'), area: 'Desenvolvimento pessoal', objetivo: 'Fortalecer autoestima e convivência', acoes: 'Participação nas apresentações; roda de conversa', responsavel: 'Mariana Coelho', prazo: `${ano}-12-10`, status: 'em_andamento' }
      ], criado_em: stamp }));
    const encaminhamentos = [
      { aluno: vul[0], orgao: 'CRAS', motivo: 'Atualização do CadÚnico e inclusão em benefício', data: `${ano}-04-12`, status: 'concluido', retorno: 'Família incluída no programa de transferência de renda.', data_retorno: `${ano}-05-20` },
      { aluno: vul[1], orgao: 'UBS / Saúde', motivo: 'Avaliação oftalmológica — dificuldade de leitura', data: u.addDays(hoje, -45), status: 'enviado', retorno: '', data_retorno: '' },
      { aluno: vul[2], orgao: 'CAPS / CAPSi', motivo: 'Avaliação psicológica — ansiedade relatada pela família', data: u.addDays(hoje, -20), status: 'atendimento', retorno: 'Primeira consulta realizada; acompanhamento quinzenal.', data_retorno: u.addDays(hoje, -6) },
      { aluno: vul[3] || vul[0], orgao: 'Conselho Tutelar', motivo: 'Faltas escolares recorrentes (comunicação obrigatória)', data: u.addDays(hoje, -60), status: 'sem_retorno', retorno: '', data_retorno: '' }
    ].filter(e => e.aluno).map(e => ({ id: u.uid('enc_'), aluno_id: e.aluno.id, orgao: e.orgao, motivo: e.motivo, descricao: '', data: e.data, status: e.status, retorno: e.retorno, data_retorno: e.data_retorno, responsavel: 'Renata Alves', criado_em: stamp }));
    const pareceres = vul.slice(0, 3).map((a, i) => ({ id: u.uid('par_'), aluno_id: a.id, data: u.addDays(hoje, -30 - i * 20), tipo: i === 1 ? 'pedagogico' : 'social', texto: i === 1 ? 'Aluno(a) apresenta avanço na leitura e maior participação nas aulas de reforço. Recomenda-se manter o acompanhamento e reforçar a parceria com a escola.' : 'Após visita domiciliar, observa-se melhora na organização familiar e maior presença do responsável nas reuniões. Mantém-se o acompanhamento mensal.', autor: i === 1 ? 'Juliana Prado' : 'Renata Alves', criado_em: stamp }));
    // Avaliações de evolução (inicial e intermediária) para as turmas com projeto em execução
    const avaliacoes = [];
    const comp = Object.keys(ICM.C.COMPETENCIAS);
    (db.matriculas || []).filter(m => m.status === 'ativo').forEach(m => {
      const t = (db.turmas || []).find(x => x.id === m.turma_id); if (!t) return;
      const base = {}; comp.forEach(c => { base[c] = 1 + Math.floor(r() * 3); });
      avaliacoes.push({ id: u.uid('ava_'), aluno_id: m.aluno_id, turma_id: m.turma_id, data: `${ano}-03-1${Math.floor(r() * 9)}`, momento: 'inicial', notas: base, obs: '', avaliador: (db.usuarios.find(x => x.id === t.professor_id) || {}).nome || '', criado_em: stamp });
      const inter = {}; comp.forEach(c => { inter[c] = Math.min(5, base[c] + (r() > .3 ? 1 : 0) + (r() > .75 ? 1 : 0)); });
      avaliacoes.push({ id: u.uid('ava_'), aluno_id: m.aluno_id, turma_id: m.turma_id, data: `${ano}-07-0${1 + Math.floor(r() * 8)}`, momento: 'intermediaria', notas: inter, obs: '', avaliador: (db.usuarios.find(x => x.id === t.professor_id) || {}).nome || '', criado_em: stamp });
    });

    if (db.config) db.config.pix = db.config.pix || { chave: 'doacoes@institutoicm.org.br', nome: 'INSTITUTO ICM', cidade: 'SUA CIDADE' };
    return { fin_contas, fin_orcamentos, fin_lancamentos, fin_extratos: [], fornecedores, compras, campanhas, doacoes_online, pia, encaminhamentos, pareceres, avaliacoes };
  }

  ICM.seedFinanceiro = build;
})();
