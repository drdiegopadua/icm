/* Dados fictícios: lista de espera, reuniões, voluntários, certificados, doadores,
   associados, pesquisas e agenda de espaços. Recebe a base já montada (alunos, turmas…). */
(function () {
  window.ICM = window.ICM || {};

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function build(db) {
    const u = ICM.util, r = rng(777), pick = a => a[Math.floor(r() * a.length)];
    const hoje = u.today(), ano = hoje.slice(0, 4), stamp = new Date().toISOString();
    const ym = hoje.slice(0, 7);
    const ativosTurma = tid => db.matriculas.filter(m => m.turma_id === tid && m.status === 'ativo').map(m => m.aluno_id);

    // CadÚnico nos alunos (quem tem benefício ou acompanhamento do CRAS está no CadÚnico)
    // (critério do CadÚnico: renda per capita até ½ salário mínimo)
    db.alunos.forEach(a => {
      if (!a.social || a.social.cadunico !== undefined) return;
      const pc = a.financeiro && a.financeiro.renda_per_capita;
      a.social.cadunico = pc != null && pc <= ICM.C.SALARIO_MINIMO / 2;
      if (!a.social.cadunico) a.social.beneficios = (a.social.beneficios || []).filter(b => !['Bolsa Família', 'BPC'].includes(b));
    });

    // ---------- Espaços e insumos (agenda) ----------
    const recursos = [
      { id: 'rec_musica', nome: 'Sala de Música', tipo: 'espaco', capacidade: 25, cor: '#8b5cf6' },
      { id: 'rec_quadra', nome: 'Quadra poliesportiva', tipo: 'espaco', capacidade: 60, cor: '#f97316' },
      { id: 'rec_horta', nome: 'Horta pedagógica', tipo: 'espaco', capacidade: 25, cor: '#10b981' },
      { id: 'rec_sala1', nome: 'Sala 1', tipo: 'espaco', capacidade: 20, cor: '#3b82f6' },
      { id: 'rec_sala2', nome: 'Sala 2', tipo: 'espaco', capacidade: 20, cor: '#0ea5e9' },
      { id: 'rec_patio', nome: 'Pátio / auditório', tipo: 'espaco', capacidade: 150, cor: '#ec4899' },
      { id: 'rec_projetor', nome: 'Projetor multimídia', tipo: 'insumo', patrimonio_id: 'pat_004', cor: '#7c3aed' },
      { id: 'rec_som', nome: 'Caixa de som amplificada', tipo: 'insumo', patrimonio_id: 'pat_005', cor: '#db2777' },
      { id: 'rec_notes', nome: 'Kit notebooks (6)', tipo: 'insumo', patrimonio_id: 'pat_001', cor: '#2563eb' }
    ].map(x => ({ ...x, ativo: true, descricao: '', criado_em: stamp }));
    const mapa = { tur_cordas: 'rec_musica', tur_sopros: 'rec_musica', tur_futsal: 'rec_quadra', tur_volei: 'rec_quadra', tur_horta: 'rec_horta', tur_mat: 'rec_sala1', tur_port: 'rec_sala2' };
    db.turmas.forEach(t => { if (!t.espaco_id && mapa[t.id]) t.espaco_id = mapa[t.id]; });
    const reservas = [
      { recurso_id: 'rec_patio', data: u.addDays(hoje, 2), inicio: '19:00', fim: '21:00', titulo: 'Reunião de pais — Orquestra', responsavel_id: 'usr_coord' },
      { recurso_id: 'rec_som', data: u.addDays(hoje, 2), inicio: '18:30', fim: '21:30', titulo: 'Reunião de pais — Orquestra', responsavel_id: 'usr_coord' },
      { recurso_id: 'rec_projetor', data: u.addDays(hoje, 2), inicio: '18:30', fim: '21:30', titulo: 'Reunião de pais — Orquestra', responsavel_id: 'usr_coord' },
      { recurso_id: 'rec_sala1', data: u.addDays(hoje, 1), inicio: '14:00', fim: '16:00', titulo: 'Oficina de currículo (parceria)', responsavel_id: 'usr_sec' },
      { recurso_id: 'rec_quadra', data: u.addDays(hoje, 3), inicio: '08:00', fim: '12:00', titulo: 'Festival interno de futsal', responsavel_id: 'usr_prof2' },
      { recurso_id: 'rec_notes', data: u.addDays(hoje, 4), inicio: '08:00', fim: '10:00', titulo: 'Reforço — atividade no computador', responsavel_id: 'usr_prof4' }
    ].map((x, i) => ({ ...x, id: 'res_' + (i + 1), obs: '', criado_em: stamp }));

    // ---------- Lista de espera ----------
    const nomes = ['Pedro Lucas Moreira', 'Ana Clara Batista', 'Júlia Fernandes Rocha', 'Gabriel Henrique Dias', 'Isadora Melo Santos', 'Ryan Oliveira Pinto', 'Larissa Cardoso Lima', 'Davi Lucca Teixeira', 'Maria Alice Correia', 'Enzo Gabriel Prado', 'Lara Vitória Nunes', 'João Miguel Freitas'];
    const vul = Object.keys(ICM.C.TRIAGEM.vulnerabilidades);
    const espera = nomes.map((n, i) => {
      const idade = 8 + Math.floor(r() * 7), pessoas = 3 + Math.floor(r() * 4), renda = Math.round((600 + r() * 3200) / 10) * 10;
      return {
        id: 'esp_' + String(i + 1).padStart(3, '0'), protocolo: `ESP-${ano}-${String(i + 1).padStart(4, '0')}`,
        nome: n, nascimento: `${+ano - idade}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-1${Math.floor(r() * 9)}`,
        responsavel: { nome: `${pick(['Cláudia', 'Aline', 'Márcia', 'Roberto', 'Simone', 'Fátima'])} ${n.split(' ').pop()}`, telefone: '(00) 9' + String(Math.floor(r() * 1e8)).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'), parentesco: pick(['Mãe', 'Mãe', 'Pai', 'Avó']) },
        bairro: pick(['Jardim Esperança', 'Vila Nova', 'Morro Alto', 'São José', 'Centro']), escola: pick(['E.M. Monteiro Lobato', 'E.E. Prof. Ana Rosa', 'Colégio Particular Alfa']),
        rede: i === 9 ? 'Particular' : pick(['Municipal', 'Estadual']),
        interesses: [pick(Object.keys(mapa)), ...(r() > .6 ? [pick(Object.keys(mapa))] : [])].filter((x, k, a) => a.indexOf(x) === k),
        renda_familiar: renda, pessoas_casa: pessoas, cadunico: r() > .45, beneficio: r() > .55,
        vulnerabilidades: vul.filter(() => r() > .78), encaminhamento: r() > .7 ? pick(['CRAS', 'Conselho Tutelar', 'Escola', 'CREAS']) : '',
        data_inscricao: u.addDays(hoje, -Math.floor(20 + r() * 300)), status: i === 11 ? 'desistiu' : 'aguardando', obs: '', criado_em: stamp
      };
    });

    // ---------- Reuniões de pais ----------
    const cordasSopros = ativosTurma('tur_cordas').concat(ativosTurma('tur_sopros'));
    const esporte = ativosTurma('tur_futsal').concat(ativosTurma('tur_volei'));
    const pres = ids => Object.fromEntries(ids.map(id => [id, r() > .3]));
    const reunioes = [
      { id: 'reu_1', titulo: 'Reunião de início de semestre — Orquestra', data: `${ano}-08-06`, horario: '19:00', local: 'Pátio / auditório', projeto_id: 'prj_orq', turma_id: '', pauta: 'Apresentação do calendário do semestre\nRegras de empréstimo e cuidado com os instrumentos\nFrequência e regra de faltas\nConcerto de Natal', ata: 'Reunião aberta pela coordenadora Mariana Coelho. Foram apresentados o calendário e as regras de empréstimo dos instrumentos. As famílias tiraram dúvidas sobre transporte. Ficou acordado que o grupo de WhatsApp será o canal oficial de avisos.', encaminhamentos: 'Enviar calendário pelo WhatsApp\nVerificar parceria de transporte com a prefeitura', presencas: pres(cordasSopros) },
      { id: 'reu_2', titulo: 'Reunião geral de famílias — Esporte', data: `${ano}-09-10`, horario: '18:30', local: 'Quadra poliesportiva', projeto_id: 'prj_esp', turma_id: '', pauta: 'Resultados do Torneio Interescolar\nUniformes\nCopa Regional', ata: 'Comemorado o 3º lugar no vôlei. Apresentada a convocação para a Copa Regional. Famílias autorizaram transporte em van.', encaminhamentos: 'Coletar autorizações de viagem', presencas: pres(esporte) },
      { id: 'reu_3', titulo: 'Reunião de pais — Concerto de Natal', data: u.addDays(hoje, 2), horario: '19:00', local: 'Pátio / auditório', projeto_id: 'prj_orq', turma_id: '', pauta: 'Ensaios extras de dezembro\nFigurino\nIngressos para familiares', ata: '', encaminhamentos: '', presencas: {} }
    ].map(x => ({ ...x, fotos: [], criado_em: stamp }));

    // ---------- Voluntários ----------
    const horas = (n, ativ, proj) => Array.from({ length: n }, (_, i) => ({ id: u.uid('hv_'), data: u.addDays(hoje, -(7 * (i + 1)) - Math.floor(r() * 3)), horas: 2 + Math.floor(r() * 3), atividade: pick(ativ), projeto_id: proj }));
    const voluntarios = [
      { nome: 'Beatriz Lacerda', profissao: 'Psicóloga', area: 'Atendimento às famílias', disponibilidade: 'Sábados pela manhã', h: horas(8, ['Roda de conversa com famílias', 'Atendimento individual'], 'prj_saude') },
      { nome: 'Rafael Souza Lima', profissao: 'Músico', area: 'Monitoria de música', disponibilidade: 'Terças e quintas à tarde', h: horas(12, ['Monitoria de naipe de cordas', 'Afinação dos instrumentos'], 'prj_orq') },
      { nome: 'Camila Duarte', profissao: 'Estudante de Pedagogia', area: 'Reforço escolar', disponibilidade: 'Segundas e quartas pela manhã', h: horas(10, ['Apoio ao reforço de matemática', 'Roda de leitura'], 'prj_edu') },
      { nome: 'Sérgio Batista', profissao: 'Engenheiro agrônomo', area: 'Horta e meio ambiente', disponibilidade: 'Sextas pela manhã', h: horas(6, ['Orientação técnica na horta', 'Mutirão de plantio'], 'prj_verde') },
      { nome: 'Patrícia Gomes', profissao: 'Contadora', area: 'Apoio administrativo', disponibilidade: 'Remoto', h: horas(4, ['Revisão da prestação de contas'], ''), status: 'inativo' }
    ].map((v, i) => ({ id: 'vol_' + (i + 1), nome: v.nome, cpf: '', nascimento: `${+ano - 25 - i * 6}-0${1 + i}-15`, telefone: '(00) 98000-000' + i, email: v.nome.split(' ')[0].toLowerCase() + '@email.com', endereco: '', profissao: v.profissao, area: v.area, disponibilidade: v.disponibilidade, inicio: `${ano}-0${2 + i}-01`, fim: '', status: v.status || 'ativo', termo_assinado: i !== 3, horas: v.h, criado_em: stamp }));

    // ---------- Certificados ----------
    const codigo = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 12; i++) s += a[Math.floor(r() * a.length)]; return s.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'); };
    const evt2 = db.eventos.find(e => e.id === 'evt_2');
    const certificados = [
      ...(evt2 ? evt2.alunos.slice(0, 6).map(aid => ({ tipo: 'participacao', destinatario_tipo: 'aluno', destinatario_id: aid, nome: (db.alunos.find(a => a.id === aid) || {}).nome, titulo: 'Masterclass de Violino com convidado', descricao: 'participou da Masterclass de Violino com violinista convidado da orquestra sinfônica estadual', carga_horaria: 3, referencia: { evento_id: 'evt_2' }, data_emissao: evt2.data })) : []),
      { tipo: 'voluntariado', destinatario_tipo: 'voluntario', destinatario_id: 'vol_2', nome: 'Rafael Souza Lima', titulo: 'Trabalho voluntário — Orquestra Jovem ICM', descricao: 'atuou como voluntário(a) na monitoria de música do projeto Orquestra Jovem ICM', carga_horaria: voluntarios[1].horas.reduce((s, h) => s + h.horas, 0), referencia: { projeto_id: 'prj_orq' }, data_emissao: u.addDays(hoje, -3) }
    ].map((c, i) => ({ ...c, id: 'cer_' + (i + 1), codigo: codigo(), status: 'valido', emitido_por: 'usr_coord', criado_em: stamp }));

    // ---------- Doadores e doações ----------
    const doadores = [
      { tipo: 'PJ', nome: 'Supermercado Bom Preço Ltda', documento: '22.222.222/0001-22', contato: 'Luciana (RH)', categoria: 'Empresa', email: 'rh@bompreco.com', telefone: '(00) 3222-0000' },
      { tipo: 'PJ', nome: 'Fundação Futuro Melhor', documento: '33.333.333/0001-33', contato: 'Carlos Andrade (programas)', categoria: 'Fundação / instituto', email: 'editais@futuromelhor.org', telefone: '(00) 3333-1111' },
      { tipo: 'PJ', nome: 'Construtora Horizonte S.A.', documento: '44.444.444/0001-44', contato: 'Diretoria', categoria: 'Empresa', email: 'social@horizonte.com', telefone: '(00) 3444-2222' },
      { tipo: 'PF', nome: 'Helena Martins', documento: '', categoria: 'Pessoa física', email: 'helena.m@email.com', telefone: '(00) 98111-2222' },
      { tipo: 'PF', nome: 'Antônio Ribeiro', documento: '', categoria: 'Pessoa física', email: 'antonio.r@email.com', telefone: '(00) 98222-3333' },
      { tipo: 'PF', nome: 'Grupo de Amigos do ICM', documento: '', categoria: 'Pessoa física', email: '', telefone: '' }
    ].map((d, i) => ({ ...d, id: 'doa_' + (i + 1), endereco: '', aceita_comunicacao: true, observacoes: '', criado_em: stamp }));
    let nd = 0;
    const doacao = (doador_id, data, tipo, valor, forma, projeto_id, descricao) => ({ id: 'dcc_' + (++nd), recibo: `REC-${ano}-${String(nd).padStart(4, '0')}`, doador_id, data, tipo, valor, forma, projeto_id, descricao, criado_em: stamp });
    const doacoes = [
      doacao('doa_1', `${ano}-03-15`, 'bens', 1800, '', 'prj_edu', 'Cestas de lanche para o reforço escolar (3 meses)'),
      doacao('doa_2', `${ano}-04-02`, 'dinheiro', 25000, 'Transferência', 'prj_verde', 'Apoio institucional ao projeto Guardiões do Verde'),
      doacao('doa_3', `${ano}-05-20`, 'dinheiro', 12000, 'Transferência', '', 'Doação institucional'),
      doacao('doa_3', `${ano}-09-20`, 'servicos', 4500, '', '', 'Reforma do banheiro da sede (mão de obra)'),
      ...['04', '05', '06', '07', '08', '09', '10'].map(m => doacao('doa_4', `${ano}-${m}-05`, 'dinheiro', 100, 'Débito automático', '', 'Doação mensal recorrente')),
      ...['06', '08', '10'].map(m => doacao('doa_5', `${ano}-${m}-12`, 'dinheiro', 250, 'PIX', 'prj_orq', 'Doação para manutenção de instrumentos')),
      doacao('doa_6', `${ano}-07-01`, 'dinheiro', 1350, 'PIX', 'prj_esp', 'Vaquinha para uniformes do vôlei')
    ];

    // ---------- Associados e mensalidades ----------
    const semCad = db.alunos.filter(a => a.status === 'ativo' && a.social && !a.social.cadunico);
    const assoc = semCad.slice(0, Math.max(0, semCad.length - 2));
    const associados = assoc.map((a, i) => ({
      id: 'ass_' + String(i + 1).padStart(3, '0'), numero: `ASS-${String(i + 1).padStart(4, '0')}`, aluno_id: a.id,
      titular: a.responsavel ? a.responsavel.nome : a.nome, cpf: '', telefone: a.responsavel ? a.responsavel.telefone : '', email: '',
      data_adesao: a.data_matricula, valor_mensal: pick([30, 30, 40, 50]), dia_vencimento: pick([5, 10, 15]), status: 'ativo', observacoes: '', criado_em: stamp
    }));
    const mensalidades = [];
    const meses = []; for (let k = 2; k >= 0; k--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); meses.push(u.iso(d).slice(0, 7)); }
    associados.forEach((s, i) => meses.forEach(m => {
      const venc = `${m}-${String(s.dia_vencimento).padStart(2, '0')}`;
      const devedor = i % 5 === 1 || (i % 7 === 3 && m === ym);
      const paga = !devedor && (venc < hoje || r() > .5);
      mensalidades.push({ id: u.uid('men_'), associado_id: s.id, competencia: m, vencimento: venc, valor: s.valor_mensal, status: paga ? 'paga' : 'aberta', pago_em: paga ? u.addDays(venc, -Math.floor(r() * 4)) : null, forma: paga ? pick(['PIX', 'PIX', 'Dinheiro (espécie)', 'Boleto']) : '', recibo: paga ? `MEN-${m.replace('-', '')}-${s.numero.slice(4)}` : '', criado_em: stamp });
    }));

    // ---------- Pesquisas de satisfação ----------
    const mkPesq = (id, titulo, publico, inicio, fim, n) => {
      const perguntas = ICM.C.PERGUNTAS_PADRAO[publico].map((p, k) => ({ ...p, id: 'q' + (k + 1) }));
      const coment = ['Meu filho está muito mais disciplinado.', 'Gostaria de mais apresentações.', 'Excelente trabalho!', 'Poderia ter aula aos sábados.', 'Os professores são muito atenciosos.', 'Melhorar a comunicação de mudanças de horário.', ''];
      const respostas = Array.from({ length: n }, () => ({
        id: u.uid('rsp_'), data: u.addDays(fim, -Math.floor(r() * 10)),
        valores: Object.fromEntries(perguntas.map(p => [p.id, p.tipo === 'nps' ? (r() > .15 ? 8 + Math.floor(r() * 3) : 5 + Math.floor(r() * 3)) : p.tipo === 'escala' ? (r() > .2 ? 4 + Math.floor(r() * 2) : 3) : p.tipo === 'sim_nao' ? (r() > .1 ? 'sim' : 'nao') : pick(coment)]))
      }));
      return { id, titulo, publico, inicio, fim, perguntas, respostas, status: fim < hoje ? 'encerrada' : 'aberta', anonima: true, criado_em: stamp };
    };
    const pesquisas = [
      mkPesq('pes_1', `Pesquisa de satisfação das famílias — 1º semestre ${ano}`, 'familias', `${ano}-06-15`, `${ano}-07-05`, 28),
      mkPesq('pes_2', `Avaliação dos alunos — 2º semestre ${ano}`, 'alunos', `${ano}-10-01`, `${ano}-11-30`, 19)
    ];

    return { recursos, reservas, espera, reunioes, voluntarios, certificados, doadores, doacoes, associados, mensalidades, pesquisas };
  }

  ICM.seed = ICM.seed || {};
  ICM.seedComunidade = build;
})();
