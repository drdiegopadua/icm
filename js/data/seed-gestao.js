/* Dados fictícios: estoque de consumo, equipe (RH), comunicados, assinaturas digitais e governança. */
(function () {
  window.ICM = window.ICM || {};
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function build(db) {
    const u = ICM.util, r = rng(4242), pick = a => a[Math.floor(r() * a.length)];
    const hoje = u.today(), ano = hoje.slice(0, 4), stamp = new Date().toISOString();
    const codigo = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(r() * a.length)]; return s.slice(0, 4) + '-' + s.slice(4); };

    // Código de acesso da família ao portal (um por aluno)
    db.alunos.forEach(a => { if (!a.acesso_familia) a.acesso_familia = { codigo: codigo(), gerado_em: a.data_matricula || hoje }; });
    (db.associados || []).forEach((a, i) => { if (!a.categoria) a.categoria = i < 2 ? 'efetivo' : 'contribuinte'; });

    // ---------------- Estoque de consumo ----------------
    let ni = 0;
    const item = (nome, categoria, unidade, minimo, extra = {}) => ({ id: 'est_' + String(++ni).padStart(3, '0'), codigo: `EST-${String(ni).padStart(4, '0')}`, nome, categoria, unidade, estoque_minimo: minimo, variacao: '', local: 'Almoxarifado', ativo: true, criado_em: stamp, ...extra });
    const estoque_itens = [
      item('Camiseta do uniforme', 'uniforme', 'un', 10, { variacao: 'Tam. 10' }),
      item('Camiseta do uniforme', 'uniforme', 'un', 10, { variacao: 'Tam. 12' }),
      item('Camiseta do uniforme', 'uniforme', 'un', 10, { variacao: 'Tam. 14' }),
      item('Camiseta do uniforme', 'uniforme', 'un', 8, { variacao: 'Tam. P' }),
      item('Short esportivo', 'uniforme', 'un', 10, { variacao: 'Tam. M' }),
      item('Caderno brochura 96 fls', 'didatico', 'un', 30),
      item('Lápis grafite (cx 72)', 'didatico', 'cx', 2),
      item('Papel sulfite A4', 'escritorio', 'resma', 5),
      item('Cordas de violino (jogo)', 'didatico', 'kit', 6, { local: 'Sala de Música' }),
      item('Breu para arco', 'didatico', 'un', 5, { local: 'Sala de Música' }),
      item('Cone de treino', 'esportivo', 'un', 10, { local: 'Quadra' }),
      item('Sementes de hortaliças (pct)', 'didatico', 'pct', 10, { local: 'Horta' }),
      item('Detergente 500 ml', 'limpeza', 'un', 12),
      item('Álcool 70% 1 L', 'limpeza', 'L', 6),
      item('Papel higiênico (fardo 12)', 'limpeza', 'pct', 4),
      item('Suco de caixinha 200 ml', 'alimentacao', 'un', 60, { local: 'Cozinha' }),
      item('Biscoito (pct 400 g)', 'alimentacao', 'pct', 20, { local: 'Cozinha' })
    ];
    const mov = [];
    const ent = (id, d, q, v, o = {}) => mov.push({ id: u.uid('mov_'), item_id: id, tipo: 'entrada', data: d, quantidade: q, valor_unitario: v, origem: 'compra', fornecedor: 'Distribuidora Central', nota_fiscal: 'NF ' + (1000 + mov.length), projeto_id: '', obs: '', usuario: 'Renata Alves', criado_em: stamp, ...o });
    const sai = (id, d, q, o = {}) => mov.push({ id: u.uid('mov_'), item_id: id, tipo: 'saida', data: d, quantidade: q, projeto_id: '', turma_id: '', aluno_id: '', destinatario: '', obs: '', usuario: 'Renata Alves', criado_em: stamp, ...o });
    ent('est_001', `${ano}-02-10`, 25, 32, { projeto_id: 'prj_esp' }); ent('est_002', `${ano}-02-10`, 25, 32, { projeto_id: 'prj_esp' }); ent('est_003', `${ano}-02-10`, 20, 34, { projeto_id: 'prj_esp' }); ent('est_004', `${ano}-02-10`, 12, 36, { projeto_id: 'prj_orq' }); ent('est_005', `${ano}-02-10`, 30, 28, { projeto_id: 'prj_esp' });
    ent('est_006', `${ano}-02-15`, 120, 9.5, { projeto_id: 'prj_edu' }); ent('est_007', `${ano}-02-15`, 6, 38, { projeto_id: 'prj_edu' }); ent('est_008', `${ano}-03-01`, 20, 27);
    ent('est_009', `${ano}-03-05`, 20, 45, { projeto_id: 'prj_orq' }); ent('est_010', `${ano}-03-05`, 15, 18, { projeto_id: 'prj_orq' });
    ent('est_011', `${ano}-03-08`, 30, 6, { projeto_id: 'prj_esp' }); ent('est_012', `${ano}-04-02`, 40, 4.5, { projeto_id: 'prj_verde', origem: 'doacao', fornecedor: 'Supermercado Bom Preço', nota_fiscal: '' });
    ent('est_013', `${ano}-08-01`, 36, 3.2); ent('est_014', `${ano}-08-01`, 24, 9.9); ent('est_015', `${ano}-08-01`, 12, 24.9);
    ent('est_016', `${ano}-09-01`, 480, 1.6, { projeto_id: 'prj_edu', origem: 'doacao', fornecedor: 'Supermercado Bom Preço', nota_fiscal: '' }); ent('est_017', `${ano}-09-01`, 80, 6.9, { projeto_id: 'prj_edu' });
    // Saídas: uniformes entregues a alunos, consumo por projeto
    const futsal = db.matriculas.filter(m => m.turma_id === 'tur_futsal' && m.status === 'ativo').map(m => m.aluno_id);
    const volei = db.matriculas.filter(m => m.turma_id === 'tur_volei' && m.status === 'ativo').map(m => m.aluno_id);
    futsal.forEach((a, i) => sai(i % 2 ? 'est_001' : 'est_002', `${ano}-03-0${2 + (i % 5)}`, 1, { aluno_id: a, projeto_id: 'prj_esp', turma_id: 'tur_futsal', obs: 'Entrega de uniforme' }));
    volei.forEach((a, i) => sai(i % 2 ? 'est_003' : 'est_005', `${ano}-03-1${i % 9}`, 1, { aluno_id: a, projeto_id: 'prj_esp', turma_id: 'tur_volei', obs: 'Entrega de uniforme' }));
    sai('est_006', `${ano}-02-20`, 90, { projeto_id: 'prj_edu', turma_id: 'tur_mat', obs: 'Kit escolar do semestre' });
    sai('est_007', `${ano}-02-20`, 5, { projeto_id: 'prj_edu' });
    sai('est_009', `${ano}-06-10`, 16, { projeto_id: 'prj_orq', turma_id: 'tur_cordas', obs: 'Troca de cordas' });
    sai('est_010', `${ano}-06-10`, 12, { projeto_id: 'prj_orq', turma_id: 'tur_cordas' });
    sai('est_012', `${ano}-04-10`, 33, { projeto_id: 'prj_verde', turma_id: 'tur_horta', obs: 'Plantio nos canteiros' });
    sai('est_013', `${ano}-09-30`, 30, { obs: 'Consumo da limpeza' }); sai('est_014', `${ano}-09-30`, 20, { obs: 'Consumo da limpeza' }); sai('est_015', `${ano}-10-01`, 9, { obs: 'Consumo da limpeza' });
    for (let k = 0; k < 6; k++) { sai('est_016', u.addDays(hoje, -7 * (k + 1)), 70, { projeto_id: 'prj_edu', obs: 'Lanche do reforço escolar' }); sai('est_017', u.addDays(hoje, -7 * (k + 1)), 11, { projeto_id: 'prj_edu', obs: 'Lanche do reforço escolar' }); }

    // ---------------- Equipe (RH) ----------------
    const doc = (tipo, validade, numero = '') => ({ id: u.uid('doc_'), tipo, numero, emissao: validade ? u.addDays(validade, -365) : '', validade: validade || '', obs: '' });
    const cap = (titulo, instituicao, data, carga) => ({ id: u.uid('cap_'), titulo, instituicao, data, carga });
    const esc = (dia, inicio, fim, local, atividade) => ({ id: u.uid('esc_'), dia, inicio, fim, local, atividade });
    const base = (o) => ({ id: o.id, nome: o.nome, cpf: '', nascimento: o.nasc, telefone: '(00) 9' + String(Math.floor(r() * 1e8)).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'), email: o.email || '', cargo: o.cargo, vinculo: o.vinculo, usuario_id: o.usuario_id || '', projeto_ids: o.projetos || [], admissao: o.admissao, contrato: { inicio: o.admissao, fim: o.fim || '', carga_semanal: o.carga, remuneracao: o.rem }, documentos: o.docs, capacitacoes: o.caps || [], escala: o.escala || [], status: 'ativo', desligamento: '', criado_em: stamp });
    const equipe = [
      base({ id: 'eq_1', nome: 'Diego Pádua', nasc: '1985-04-12', cargo: 'Diretor executivo', vinculo: 'clt', usuario_id: 'usr_admin', admissao: `${+ano - 4}-01-10`, carga: 40, rem: 6500, email: 'admin@icm.org', docs: [doc('rg', ''), doc('cpf', ''), doc('ctps', ''), doc('antecedentes', u.addDays(hoje, 120)), doc('aso', u.addDays(hoje, 200))], caps: [cap('Gestão de OSCs e MROSC', 'Escola de Gestão Social', `${ano}-03-12`, 20)], escala: [1, 2, 3, 4, 5].map(d => esc(d, '08:00', '17:00', 'Sede', 'Direção')) }),
      base({ id: 'eq_2', nome: 'Mariana Coelho', nasc: '1988-09-02', cargo: 'Coordenadora pedagógica', vinculo: 'clt', usuario_id: 'usr_coord', admissao: `${+ano - 3}-02-01`, carga: 40, rem: 4800, email: 'coordenacao@icm.org', projetos: ['prj_orq', 'prj_esp', 'prj_verde', 'prj_edu'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, -12)), doc('aso', u.addDays(hoje, 25)), doc('diploma', '')], caps: [cap('Primeiros socorros', 'Cruz Vermelha', `${ano}-02-20`, 8), cap('ECA na prática', 'CMDCA', `${ano}-05-14`, 12)], escala: [1, 2, 3, 4, 5].map(d => esc(d, '09:00', '18:00', 'Sede', 'Coordenação')) }),
      base({ id: 'eq_3', nome: 'Renata Alves', nasc: '1990-12-20', cargo: 'Assistente social', vinculo: 'clt', usuario_id: 'usr_sec', admissao: `${+ano - 2}-03-01`, carga: 30, rem: 3900, email: 'secretaria@icm.org', projetos: ['prj_edu', 'prj_saude'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, 60)), doc('registro', u.addDays(hoje, 300), 'CRESS 00000'), doc('aso', u.addDays(hoje, 150))], caps: [cap('Primeiros socorros', 'Cruz Vermelha', `${ano}-02-20`, 8), cap('LGPD para o terceiro setor', 'Instituto Privacidade', `${ano}-07-03`, 6)], escala: [1, 2, 3, 4, 5].map(d => esc(d, '08:00', '14:00', 'Secretaria', 'Atendimento às famílias')) }),
      base({ id: 'eq_4', nome: 'Carlos Menezes', nasc: '1982-06-30', cargo: 'Professor de música', vinculo: 'pj', usuario_id: 'usr_prof1', admissao: `${ano}-02-01`, fim: `${ano}-12-20`, carga: 16, rem: 2400, email: 'carlos@icm.org', projetos: ['prj_orq'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, 40)), doc('diploma', ''), doc('contrato', '')], caps: [cap('Primeiros socorros', 'Cruz Vermelha', `${ano}-02-20`, 8)] }),
      base({ id: 'eq_5', nome: 'Fernanda Rocha', nasc: '1993-01-15', cargo: 'Professora de educação física', vinculo: 'rpa', usuario_id: 'usr_prof2', admissao: `${ano}-03-01`, fim: u.addDays(hoje, 20), carga: 12, rem: 1800, email: 'fernanda@icm.org', projetos: ['prj_esp'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, 70)), doc('registro', u.addDays(hoje, -30), 'CREF 000000-G/UF'), doc('contrato', '')], caps: [cap('Primeiros socorros', 'Cruz Vermelha', `${ano}-02-20`, 8), cap('Esporte educacional', 'Instituto Esporte & Educação', `${ano}-06-02`, 16)] }),
      base({ id: 'eq_6', nome: 'Paulo Henrique', nasc: '1987-11-11', cargo: 'Educador ambiental', vinculo: 'pj', usuario_id: 'usr_prof3', admissao: `${ano}-04-01`, fim: `${ano}-11-30`, carga: 8, rem: 1200, email: 'paulo@icm.org', projetos: ['prj_verde'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, 10))] }),
      base({ id: 'eq_7', nome: 'Juliana Prado', nasc: '1991-03-08', cargo: 'Pedagoga', vinculo: 'clt', usuario_id: 'usr_prof4', admissao: `${ano}-02-10`, carga: 20, rem: 2600, email: 'juliana@icm.org', projetos: ['prj_edu'], docs: [doc('rg', ''), doc('cpf', ''), doc('antecedentes', u.addDays(hoje, 90)), doc('aso', u.addDays(hoje, 210)), doc('diploma', '')], caps: [cap('Alfabetização e letramento', 'Secretaria de Educação', `${ano}-04-22`, 30)] }),
      base({ id: 'eq_8', nome: 'Sônia Ribeiro', nasc: '1972-07-19', cargo: 'Auxiliar de serviços gerais', vinculo: 'clt', admissao: `${+ano - 5}-08-01`, carga: 44, rem: 1700, docs: [doc('rg', ''), doc('cpf', ''), doc('ctps', ''), doc('aso', u.addDays(hoje, -5)), doc('antecedentes', u.addDays(hoje, 30))], caps: [cap('Boas práticas na manipulação de alimentos', 'Vigilância Sanitária', `${ano}-03-30`, 4)], escala: [1, 2, 3, 4, 5].map(d => esc(d, '07:00', '16:00', 'Sede', 'Limpeza e cozinha')) })
    ];

    // ---------------- Comunicados do portal ----------------
    const comunicados = [
      { id: 'com_1', titulo: 'Concerto de Natal ICM', texto: 'Dia 12/12, às 19h, no Teatro Municipal. Os ensaios extras de dezembro serão às sextas, das 14h às 16h.', publico: 'projeto', projeto_id: 'prj_orq', turma_id: '', data: u.addDays(hoje, -2), autor: 'Mariana Coelho' },
      { id: 'com_2', titulo: 'Recesso de fim de ano', texto: 'As atividades serão encerradas em 19/12 e retornam em 03/02. Boas festas!', publico: 'todos', projeto_id: '', turma_id: '', data: u.addDays(hoje, -1), autor: 'Diego Pádua' },
      { id: 'com_3', titulo: 'Copa Regional de Futsal', texto: 'A equipe Sub-13 foi convocada! Saída da van às 7h30 da sede. Levar documento com foto e garrafinha de água.', publico: 'turma', projeto_id: '', turma_id: 'tur_futsal', data: u.addDays(hoje, -4), autor: 'Fernanda Rocha' }
    ].map(c => ({ ...c, criado_em: stamp }));

    // ---------------- Assinaturas digitais (algumas pendentes) ----------------
    const tok = () => u.uid('').slice(0, 16);
    const assinaturas = [];
    db.alunos.filter(a => a.status === 'ativo').slice(0, 4).forEach(a => ['lgpd', 'imagem'].forEach(t => assinaturas.push({ id: u.uid('ass_'), token: tok(), tipo: t, aluno_id: a.id, referencia_id: '', status: 'pendente', criado_em: stamp, criado_por: 'usr_sec', solicitado_em: u.addDays(hoje, -3) })));

    // ---------------- Governança ----------------
    const atas = [
      { id: 'ata_1', tipo: 'ago', numero: `01/${ano}`, data: `${ano}-03-28`, horario: '19:00', local: 'Sede do Instituto', presentes: 'Diego Pádua (presidente), Mariana Coelho (secretária), Antônio Ribeiro (tesoureiro), Helena Martins, José Ferreira e mais 18 associados — total de 23 presentes.', pauta: 'Aprovação das contas de ' + (+ano - 1) + '\nAprovação do plano de trabalho ' + ano + '\nAssuntos gerais', deliberacoes: 'Contas do exercício anterior aprovadas por unanimidade, com parecer favorável do Conselho Fiscal.\nPlano de trabalho aprovado.', texto: 'Aos vinte e oito dias do mês de março, reuniram-se em Assembleia Geral Ordinária os associados do Instituto ICM, em primeira convocação, com quórum regular…', registrada: true, registro: 'Cartório de Registro Civil de Pessoas Jurídicas — averbação nº 0000' },
      { id: 'ata_2', tipo: 'diretoria', numero: `05/${ano}`, data: `${ano}-08-14`, horario: '18:30', local: 'Sede do Instituto', presentes: 'Diego Pádua, Mariana Coelho, Antônio Ribeiro.', pauta: 'Aprovação de parceria com Fundação Futuro Melhor\nCompra de instrumentos', deliberacoes: 'Aprovada a assinatura do termo de parceria.\nAutorizada a cotação de 3 orçamentos para compra de 4 violas.', texto: '', registrada: false, registro: '' },
      { id: 'ata_3', tipo: 'fiscal', numero: `01/${ano}`, data: `${ano}-03-20`, horario: '17:00', local: 'Sede do Instituto', presentes: 'Membros do Conselho Fiscal: Luís Andrade, Cecília Moura, Ricardo Santos.', pauta: 'Parecer sobre as contas de ' + (+ano - 1), deliberacoes: 'Parecer favorável à aprovação das contas.', texto: '', registrada: false, registro: '' }
    ].map(x => ({ ...x, criado_em: stamp }));
    const mand = (orgao, cargo, nome, ini, fim) => ({ id: u.uid('man_'), orgao, cargo, nome, inicio: ini, fim, ata_id: 'ata_1', criado_em: stamp });
    const mandatos = [
      mand('diretoria', 'Presidente', 'Diego Pádua', `${+ano - 2}-04-01`, u.addDays(hoje, 60)),
      mand('diretoria', 'Vice-presidente', 'Helena Martins', `${+ano - 2}-04-01`, u.addDays(hoje, 60)),
      mand('diretoria', '1ª Secretária', 'Mariana Coelho', `${+ano - 2}-04-01`, u.addDays(hoje, 60)),
      mand('diretoria', 'Tesoureiro', 'Antônio Ribeiro', `${+ano - 2}-04-01`, u.addDays(hoje, 60)),
      mand('fiscal', 'Conselheiro fiscal', 'Luís Andrade', `${+ano - 1}-04-01`, `${+ano + 1}-03-31`),
      mand('fiscal', 'Conselheira fiscal', 'Cecília Moura', `${+ano - 1}-04-01`, `${+ano + 1}-03-31`),
      mand('fiscal', 'Conselheiro fiscal', 'Ricardo Santos', `${+ano - 1}-04-01`, `${+ano + 1}-03-31`)
    ];
    const estatuto = [
      { id: 'etu_1', versao: 'Estatuto original', data_aprovacao: `${+ano - 9}-05-10`, registro: 'Registro nº 0000, Livro A-00', resumo: 'Constituição do Instituto, finalidades e estrutura de governança.', arquivo: '', arquivo_nome: '' },
      { id: 'etu_2', versao: '1ª alteração — adequação ao MROSC', data_aprovacao: `${+ano - 3}-11-20`, registro: 'Averbação nº 0000', resumo: 'Adequação à Lei 13.019/2014: objetivos voltados à promoção de atividades de relevância pública, transferência de patrimônio em caso de dissolução e escrituração contábil conforme as Normas Brasileiras de Contabilidade.', arquivo: '', arquivo_nome: '' }
    ].map(x => ({ ...x, criado_em: stamp }));

    return { estoque_itens, estoque_mov: mov, equipe, comunicados, assinaturas, avisos_log: [], atas, mandatos, estatuto };
  }

  // Documentos institucionais + datas de nascimento para aniversários
  function buildInst(db) {
    const u = ICM.util, r = rng(99), hoje = u.today(), ano = +hoje.slice(0, 4), stamp = new Date().toISOString();
    const D = (tipo, emissao, validade, numero = '', extra = {}) => ({ id: u.uid('din_'), tipo, numero, emissao, validade, orgao: '', obs: '', arquivo: null, criado_em: stamp, ...extra });
    const docs_inst = [
      D('cnd_federal', u.addDays(hoje, -150), u.addDays(hoje, 30), '0000.0000.0000.0000'),
      D('crf_fgts', u.addDays(hoje, -32), u.addDays(hoje, -2), '2026000000000000'),
      D('cndt', u.addDays(hoje, -40), u.addDays(hoje, 140), '00000000/2026'),
      D('cnd_estadual', u.addDays(hoje, -70), u.addDays(hoje, 20)),
      D('cnd_municipal', u.addDays(hoje, -20), u.addDays(hoje, 70)),
      D('cepim', u.addDays(hoje, -10), u.addDays(hoje, 20), '', { obs: 'Nada consta' }),
      D('cnpj', u.addDays(hoje, -60), ''),
      D('alvara', `${ano}-02-01`, `${ano + 1}-01-31`, 'ALV-000/' + ano),
      D('avcb', `${ano - 2}-05-10`, `${ano + 1}-05-10`),
      D('sanitaria', `${ano - 1}-11-05`, u.addDays(hoje, 14)),
      D('cmdca', `${ano - 2}-03-15`, `${ano + 2}-03-15`, 'Registro CMDCA nº 000'),
      D('cmas', `${ano - 3}-06-01`, '', 'Inscrição CMAS nº 000'),
      D('estatuto', `${ano - 3}-11-20`, ''),
      D('ata_eleicao', `${ano - 2}-04-01`, '')
    ];
    // Datas de nascimento fictícias para associados e doadores pessoa física
    (db.associados || []).forEach((a, i) => { if (!a.nascimento) a.nascimento = `${ano - 30 - (i % 15)}-${String(1 + ((i * 5) % 12)).padStart(2, '0')}-${String(3 + (i * 7) % 25).padStart(2, '0')}`; });
    (db.doadores || []).forEach((d, i) => { if (d.tipo === 'PF' && !d.nascimento) d.nascimento = `${ano - 45 - i}-${hoje.slice(5, 7)}-${String(5 + i * 9).padStart(2, '0')}`; });
    // Alguém faz aniversário hoje (para demonstrar)
    const al = (db.alunos || []).find(a => a.status === 'ativo'); if (al) al.nascimento = `${+al.nascimento.slice(0, 4)}-${hoje.slice(5)}`;
    const vo = (db.voluntarios || [])[0]; if (vo) vo.nascimento = `${+(vo.nascimento || '1990').slice(0, 4)}-${hoje.slice(5)}`;
    // Ex-alunos antigos (saíram há mais de 5 anos) — para demonstrar a anonimização LGPD
    [['Roberto Lima Souza', `${ano - 7}-03-01`, `${ano - 6}-06-30`], ['Patrícia Gomes Alves', `${ano - 8}-02-10`, `${ano - 6}-11-20`]].forEach(([nome, ent, sai], i) => {
      const id = 'alu_old' + (i + 1);
      if ((db.alunos || []).some(a => a.id === id)) return;
      db.alunos.push({ id, matricula: `ICM-${ano - 7}-${String(900 + i).padStart(4, '0')}`, nome, nascimento: `${ano - 22}-04-1${i}`, sexo: i ? 'F' : 'M', cor_raca: 'Parda', cpf: '', rg: '', nis: '', foto: '', status: 'desligado', data_matricula: ent, telefone: '(00) 98888-777' + i, email: '', endereco: { logradouro: 'Rua das Flores', numero: '10' + i, bairro: 'Vila Nova', cidade: 'Sua Cidade' }, responsavel: { nome: 'Responsável ' + nome.split(' ')[1], parentesco: 'Mãe', telefone: '(00) 97777-666' + i }, social: { pessoas_casa: 4, cadunico: true }, financeiro: { renda_familiar: 1500 }, saude: { alergias: 'Dipirona' }, escolaridade: { escola: 'E.M. Monteiro Lobato', rede: 'Municipal' }, autorizacoes: { lgpd: true }, criado_em: stamp });
      (db.matriculas || []).push({ id: u.uid('mat_'), turma_id: 'tur_futsal', aluno_id: id, entrada: ent, saida: sai, motivo_saida: 'Idade fora da faixa', status: 'saiu' });
    });
    void r;
    return { docs_inst };
  }

  ICM.seedGestao = build;
  ICM.seedInst = buildInst;
})();
