/* Dados de exemplo (fictícios) para a fase de design. Serão substituídos pelo Supabase. */
(function () {
  function aleatorio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gerar() {
    const r = aleatorio(4242);
    const pega = (arr) => arr[Math.floor(r() * arr.length)];
    const hoje = UI.hojeISO();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const equipe = [
      { id: 'e1', nome: 'Helena Duarte', tipo: 'colaborador', funcao: 'Coordenação Pedagógica', papel: 'coordenacao', telefone: '(27) 99811-2040', email: 'helena@icm.org.br', admissao: '2024-02-05', vinculo: 'CLT', ativo: true },
      { id: 'e2', nome: 'Marcos Vieira', tipo: 'professor', funcao: 'Regente de Coral', papel: 'professor', telefone: '(27) 99702-1133', email: 'marcos@icm.org.br', admissao: '2025-03-01', vinculo: 'MEI', ativo: true },
      { id: 'e3', nome: 'Laura Monteiro', tipo: 'professor', funcao: 'Professora de Violino', papel: 'professor', telefone: '(27) 99654-7781', email: 'laura@icm.org.br', admissao: '2025-03-01', vinculo: 'MEI', ativo: true },
      { id: 'e4', nome: 'Rafael Souza', tipo: 'professor', funcao: 'Professor de Percussão', papel: 'professor', telefone: '(27) 99520-4410', email: 'rafael@icm.org.br', admissao: '2026-02-10', vinculo: 'Autônomo (RPA)', ativo: true },
      { id: 'e5', nome: 'Bruno Lacerda', tipo: 'professor', funcao: 'Professor de Educação Física', papel: 'professor', telefone: '(27) 99887-0912', email: 'bruno@icm.org.br', admissao: '2025-08-04', vinculo: 'CLT', ativo: true },
      { id: 'e6', nome: 'Camila Rocha', tipo: 'professor', funcao: 'Professora de Piano', papel: 'professor', telefone: '(27) 99431-2287', email: 'camila@icm.org.br', admissao: '2026-08-01', vinculo: 'MEI', ativo: true },
      { id: 'e7', nome: 'Patrícia Nunes', tipo: 'colaborador', funcao: 'Assistente Social', papel: 'social', telefone: '(27) 99610-5521', email: 'patricia@icm.org.br', admissao: '2025-01-15', vinculo: 'CLT', ativo: true },
      { id: 'e8', nome: 'Fernanda Alves', tipo: 'colaborador', funcao: 'Psicóloga', papel: 'psicologia', telefone: '(27) 99377-8890', email: 'fernanda@icm.org.br', admissao: '2025-06-02', vinculo: 'Autônomo (RPA)', ativo: true },
      { id: 'e9', nome: 'Joana Ribeiro', tipo: 'colaborador', funcao: 'Secretaria', papel: 'secretaria', telefone: '(27) 99255-1740', email: 'secretaria@icm.org.br', admissao: '2024-02-05', vinculo: 'CLT', ativo: true },
      { id: 'e10', nome: 'Sérgio Lima', tipo: 'colaborador', funcao: 'Transporte (motorista da van)', papel: 'transporte', telefone: '(27) 99140-6632', email: 'transporte@icm.org.br', admissao: '2025-03-10', vinculo: 'CLT', ativo: true },
    ];

    const projetos = [
      { id: 'p1', nome: 'Sons e Sonhos', area: 'Música', fonte: 'Termo de Fomento', instrumento: 'TF 003/2026', financiador: 'Secretaria de Estado da Cultura – ES', inicio: '2026-02-01', fim: '2026-12-20', valor: 380000, coordenador: 'e1', cor: '#f2a541', descricao: 'Formação musical gratuita para crianças e adolescentes: coral, cordas e percussão, com apresentações públicas ao longo do ano.', metas: 'Atender 120 alunos\nRealizar 4 apresentações públicas\nManter frequência média acima de 75%' },
      { id: 'p2', nome: 'Voleibol nas Montanhas', area: 'Esporte', fonte: 'Lei de Incentivo ao Esporte', instrumento: 'LIE 2025/0187', financiador: 'Ministério do Esporte', inicio: '2026-03-01', fim: '2027-02-28', valor: 220000, coordenador: 'e1', cor: '#5b8def', descricao: 'Iniciação e treinamento de voleibol para crianças e adolescentes, com participação em torneios regionais.', metas: 'Atender 80 alunos\nParticipar de 3 torneios\nFormar 2 equipes de competição' },
      { id: 'p3', nome: 'Música Clássica nas Montanhas', area: 'Música', fonte: 'Termo de Fomento', instrumento: 'TF 007/2026', financiador: 'Prefeitura Municipal', inicio: '2026-08-01', fim: '2027-07-31', valor: 150000, coordenador: 'e1', cor: '#c0607a', descricao: 'Ensino de piano e repertório erudito, com recitais semestrais abertos à comunidade.', metas: 'Atender 30 alunos\nRealizar 2 recitais' },
    ];

    const turmas = [
      { id: 't1', projeto_id: 'p1', nome: 'Coral Infantil A', professor_id: 'e2', local: 'Sede do Instituto', dias: [1, 3], horario: '14:00–16:30', vagas: 25, faixa: '7 a 11 anos', inicio: '2026-03-02' },
      { id: 't2', projeto_id: 'p1', nome: 'Violino Iniciante', professor_id: 'e3', local: 'Sede do Instituto', dias: [2, 4], horario: '08:00–09:30', vagas: 12, faixa: '9 a 15 anos', inicio: '2026-03-03' },
      { id: 't3', projeto_id: 'p1', nome: 'Percussão', professor_id: 'e4', local: 'Escola Estadual Centro', dias: [5], horario: '14:00–16:00', vagas: 15, faixa: '10 a 17 anos', inicio: '2026-04-03' },
      { id: 't4', projeto_id: 'p2', nome: 'Vôlei Sub-15 Feminino', professor_id: 'e5', local: 'Ginásio Municipal', dias: [2, 4], horario: '15:00–17:00', vagas: 20, faixa: '12 a 15 anos', inicio: '2026-03-03' },
      { id: 't5', projeto_id: 'p2', nome: 'Vôlei Misto Iniciação', professor_id: 'e5', local: 'Ginásio Municipal', dias: [1, 3], horario: '08:00–10:00', vagas: 24, faixa: '9 a 12 anos', inicio: '2026-03-02' },
      { id: 't6', projeto_id: 'p3', nome: 'Piano A', professor_id: 'e6', local: 'Sede do Instituto', dias: [3], horario: '13:00–15:00', vagas: 8, faixa: '10 a 17 anos', inicio: '2026-08-05' },
    ];

    const NOMES_F = ['Ana Clara', 'Beatriz', 'Lívia', 'Manuela', 'Sofia', 'Yasmin', 'Larissa', 'Gabriela', 'Isadora', 'Helena', 'Alice', 'Laura', 'Valentina', 'Emanuelly', 'Kamilly', 'Rafaela', 'Júlia', 'Maria Eduarda'];
    const NOMES_M = ['Arthur', 'Davi', 'Gabriel', 'Pedro Henrique', 'Miguel', 'Enzo', 'Lucas', 'Matheus', 'Heitor', 'Samuel', 'João Vitor', 'Bernardo', 'Kauã', 'Nicolas', 'Ryan', 'Lorenzo'];
    const SOBRENOMES = ['Schneider', 'Pereira', 'Krüger', 'Oliveira', 'Rodrigues', 'Bravim', 'Stein', 'Lima', 'Ferreira', 'Gomes', 'Barbosa', 'Klein', 'Moreira', 'Rocha', 'Almeida', 'Carvalho', 'Tesch', 'Zanotti'];
    const BAIRROS = ['Centro', 'Vila Nova', 'Grama', 'São Luiz', 'Serra Pelada', 'Boa Vista', 'Campo 21'];
    const ESCOLAS = ['EEEFM Centro', 'EMEF São Luiz', 'EEEF Grama', 'EMEF Vila Nova', 'EEEFM Boa Vista'];
    const PONTOS = ['Grama – em frente à igreja', 'Vila Nova – praça', 'São Luiz – escola municipal', 'Serra Pelada – mercearia', 'Boa Vista – ponto de ônibus'];
    const PAR = ['Mãe', 'Pai', 'Avó', 'Tia', 'Mãe', 'Mãe'];
    const RESP_F = ['Rosângela', 'Cristiane', 'Luciana', 'Adriana', 'Simone', 'Patrícia', 'Elaine', 'Marlene'];
    const RESP_M = ['Antônio', 'José Carlos', 'Edson', 'Marcelo', 'Gilberto'];

    // quais turmas por faixa de idade
    const turmasPara = (id, sexo) => {
      const op = [];
      if (id >= 7 && id <= 11) op.push('t1');
      if (id >= 9 && id <= 15) op.push('t2');
      if (id >= 10 && id <= 17) op.push('t3', 't6');
      if (id >= 12 && id <= 15 && sexo === 'F') op.push('t4', 't4');
      if (id >= 9 && id <= 12) op.push('t5', 't5');
      return op;
    };

    const alunos = [];
    const anoRef = +hoje.slice(0, 4);
    for (let i = 0; i < 46; i++) {
      const sexo = r() < 0.55 ? 'F' : 'M';
      const nome = `${pega(sexo === 'F' ? NOMES_F : NOMES_M)} ${pega(SOBRENOMES)} ${pega(SOBRENOMES)}`;
      const idadeA = 7 + Math.floor(r() * 10);
      const nasc = `${anoRef - idadeA - 1}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
      const ops = turmasPara(idadeA, sexo);
      const ts = [];
      if (ops.length) {
        ts.push(pega(ops));
        if (r() < 0.25) { const t2 = pega(ops); if (!ts.includes(t2)) ts.push(t2); }
      }
      const bairro = pega(BAIRROS);
      const usaVan = bairro !== 'Centro' && r() < 0.6;
      const ponto = usaVan ? pega(PONTOS) : '';
      const respF = r() < 0.8;
      const respNome = `${pega(respF ? RESP_F : RESP_M)} ${nome.split(' ').slice(-1)[0]}`;
      const matriculaData = `2026-0${2 + Math.floor(r() * 3)}-${String(2 + Math.floor(r() * 25)).padStart(2, '0')}`;
      alunos.push({
        id: 'a' + (i + 1),
        matricula: `2026${String(i + 1).padStart(4, '0')}`,
        nome, sexo, nascimento: nasc,
        cpf: '', nis: r() < 0.4 ? String(10000000000 + Math.floor(r() * 89999999999)) : '',
        cor_raca: pega(['Branca', 'Parda', 'Preta', 'Parda', 'Branca']),
        endereco: { rua: pega(['Rua das Hortênsias', 'Rua José Bravim', 'Estrada da Grama', 'Rua Alcino Martins de Souza', 'Rua Projetada']), numero: String(10 + Math.floor(r() * 400)), bairro, cidade: 'Afonso Cláudio', cep: '29600-000' },
        telefone: `(27) 99${Math.floor(100 + r() * 899)}-${Math.floor(1000 + r() * 8999)}`,
        responsavel: { nome: respNome, parentesco: respF ? pega(PAR.filter((p) => p !== 'Pai')) : 'Pai', telefone: `(27) 99${Math.floor(100 + r() * 899)}-${Math.floor(1000 + r() * 8999)}`, cpf: '', email: '' },
        escola: { nome: pega(ESCOLAS), serie: `${Math.max(1, Math.min(9, idadeA - 5))}º ano`, turno: pega(['Matutino', 'Vespertino']) },
        saude: { alergias: r() < 0.15 ? pega(['Amendoim', 'Dipirona', 'Picada de inseto', 'Lactose']) : '', medicamentos: r() < 0.08 ? 'Ritalina 10mg (manhã)' : '', deficiencia: r() < 0.06 ? pega(['TEA (autismo) nível 1', 'Baixa visão']) : '', sus: '', obs: '' },
        van: { usa: usaVan, embarque: ponto, desembarque: ponto, obs: usaVan && r() < 0.3 ? 'Irmão mais velho acompanha no embarque' : '' },
        autorizacoes: { imagem: r() < 0.9, saida: r() < 0.7, lgpd: true },
        turmas: ts,
        status: i === 44 ? 'desligado' : 'ativo',
        data_matricula: matriculaData,
        desligamento: i === 44 ? { data: '2026-08-31', motivo: 'Mudou de cidade' } : null,
        assiduidade: 0.62 + r() * 0.36,
      });
    }
    // dois alunos com faltas seguidas recentes (para os alertas)
    alunos[3].assiduidade = 0.2;
    alunos[11].assiduidade = 0.35;

    // aulas + presenças
    const CONT = {
      t1: ['Aquecimento vocal e respiração diafragmática', 'Ensaio de "Asa Branca" a duas vozes', 'Leitura rítmica com percussão corporal', 'Afinação em uníssono e cânone', 'Repertório natalino – primeira leitura', 'Postura e projeção vocal', 'Ensaio geral com piano'],
      t2: ['Postura, arco e cordas soltas', 'Escala de Ré maior – 1ª posição', 'Exercícios de détaché e legato', 'Leitura de partitura: figuras e pausas', 'Peça "Ode à Alegria"', 'Afinação do instrumento e cuidados'],
      t3: ['Rudimentos: toque simples e duplo', 'Ritmos brasileiros: baião e xote', 'Prática de conjunto com alfaias', 'Leitura rítmica em semicolcheias', 'Construção de arranjo coletivo'],
      t4: ['Fundamentos: toque e manchete', 'Saque por baixo e por cima', 'Sistema 6x0 e rodízio', 'Jogo reduzido 3x3', 'Recepção e levantamento', 'Treino tático para torneio'],
      t5: ['Coordenação motora e jogos com bola', 'Toque de bola em duplas', 'Manchete com alvo', 'Minivôlei 2x2', 'Regras básicas e jogo adaptado'],
      t6: ['Postura ao piano e dedilhado', 'Escala de Dó maior – mãos separadas', 'Leitura em clave de Sol e Fá', 'Minueto em Sol – Bach (trecho)', 'Dinâmicas: piano e forte'],
    };
    const aulas = [];
    const fim = new Date(hoje + 'T12:00');
    turmas.forEach((t) => {
      const membros = alunos.filter((a) => a.turmas.includes(t.id));
      const ini = new Date(Math.max(new Date(t.inicio + 'T12:00'), new Date('2026-08-01T12:00')));
      let k = 0;
      for (let d = new Date(ini); d < fim; d.setDate(d.getDate() + 1)) {
        if (!t.dias.includes(d.getDay())) continue;
        const dia = iso(d);
        if (r() < 0.06) continue; // feriado/cancelada
        const presencas = {};
        const recente = (fim - d) / 864e5 < 16;
        membros.forEach((a) => {
          if (a.status !== 'ativo' && dia > (a.desligamento?.data || '9999')) return;
          let p = r() < a.assiduidade;
          if (recente && a.assiduidade < 0.4) p = false;
          presencas[a.id] = p ? 'P' : r() < 0.25 ? 'J' : 'F';
        });
        const semRelatorio = recente && t.id === 't3' && r() < 0.8;
        aulas.push({
          id: `au_${t.id}_${dia}`, turma_id: t.id, data: dia,
          conteudo: semRelatorio ? '' : CONT[t.id][k % CONT[t.id].length],
          relatorio: semRelatorio ? '' : 'Turma participativa. Atividade realizada conforme o plano, com retomada dos pontos de dificuldade ao final.',
          observacoes: r() < 0.1 ? 'Chuva forte – parte dos alunos da van chegou atrasada.' : '',
          presencas,
        });
        k++;
      }
    });

    // planos mensais
    const planos = [];
    const mesAtual = hoje.slice(0, 7);
    ['2026-08', '2026-09', '2026-10'].forEach((m) => {
      turmas.forEach((t) => {
        if (m > mesAtual) return;
        if (t.id === 't3' && m === mesAtual) return; // pendência proposital
        if (t.id === 't6' && m < '2026-08') return;
        planos.push({
          id: `pl_${t.id}_${m}`, turma_id: t.id, mes: m,
          objetivos: 'Desenvolver os fundamentos técnicos da modalidade e a convivência em grupo.',
          conteudos: CONT[t.id].slice(0, 4).join('\n'),
          metodologia: 'Aulas práticas em grupo, demonstração, repetição orientada e prática de conjunto.',
          recursos: 'Instrumentos/equipamentos do projeto, caixa de som, quadro branco.',
          avaliacao: 'Observação contínua, participação e evolução individual registrada pelo professor.',
          enviado_em: `${m}-03`,
        });
      });
    });

    // registros da ficha
    const reg = [];
    let rid = 1;
    const add = (o) => reg.push({ id: 'r' + rid++, arquivos: [], sigiloso: false, ...o });
    alunos.slice(0, 30).forEach((a, i) => {
      if (i % 2 === 0) add({ aluno_id: a.id, tipo: 'entrevista_social', data: a.data_matricula, titulo: 'Entrevista social de ingresso', autor: 'e7', texto: 'Família receptiva ao projeto. Aluno demonstra interesse pela atividade.', dados: { composicao: `${2 + Math.floor(r() * 4)} pessoas: responsável, aluno e irmãos`, renda: pega(['Até 1 salário mínimo', '1 a 2 salários mínimos', '2 a 3 salários mínimos']), moradia: pega(['Própria', 'Alugada', 'Cedida']), beneficios: r() < 0.5 ? ['Bolsa Família'] : [], vulnerabilidades: r() < 0.3 ? ['Distância da sede'] : [] } });
      if (i % 5 === 1) add({ aluno_id: a.id, tipo: 'atend_social', data: '2026-09-' + String(3 + i).padStart(2, '0'), titulo: 'Contato com a família por faltas', autor: 'e7', texto: 'Responsável informou dificuldade de transporte em dias de chuva. Orientado sobre o ponto da van mais próximo.' });
      if (i % 7 === 2) add({ aluno_id: a.id, tipo: 'atend_psicologico', data: '2026-09-' + String(10 + (i % 15)).padStart(2, '0'), titulo: 'Acolhimento', autor: 'e8', texto: 'Atendimento individual de acolhimento. Registro detalhado mantido em prontuário sigiloso.', sigiloso: true });
      if (i % 6 === 3) add({ aluno_id: a.id, tipo: 'atend_pedagogico', data: '2026-10-0' + (1 + (i % 8)), titulo: 'Acompanhamento de leitura musical', autor: 'e1', texto: 'Aluno com dificuldade na leitura rítmica. Combinado reforço de 15 min antes da aula.' });
      if (i % 4 === 0) add({ aluno_id: a.id, tipo: 'documento', data: a.data_matricula, titulo: 'Documentos de matrícula', autor: 'e9', texto: 'Certidão de nascimento, comprovante de residência e declaração escolar.', arquivos: [{ nome: 'certidao_nascimento.pdf', tamanho: 284000 }, { nome: 'comprovante_residencia.jpg', tamanho: 1210000 }] });
      if (i % 9 === 4) add({ aluno_id: a.id, tipo: 'atestado', data: '2026-09-1' + (i % 9), titulo: 'Atestado médico – 3 dias', autor: 'e9', texto: 'Afastamento por gripe.', arquivos: [{ nome: 'atestado.pdf', tamanho: 96000 }] });
      if (i % 11 === 5) add({ aluno_id: a.id, tipo: 'ocorrencia', data: '2026-10-0' + (2 + (i % 6)), titulo: 'Desentendimento com colega', autor: 'e5', texto: 'Discussão durante o jogo reduzido. Conversa mediada pelo professor; situação resolvida.' });
      if (i % 3 === 0) add({ aluno_id: a.id, tipo: 'formulario', data: a.data_matricula, titulo: 'Autorização de uso de imagem', autor: 'e9', texto: 'Assinada pelo responsável.', arquivos: [{ nome: 'autorizacao_imagem.pdf', tamanho: 120000 }] });
    });
    add({ aluno_id: 'a2', tipo: 'noticia', data: '2026-07-28', titulo: 'Coral Infantil emociona público no Festival de Inverno', autor: 'e1', texto: 'As crianças do Coral Infantil A se apresentaram no Festival de Inverno com repertório de música popular brasileira…' });
    add({ aluno_id: 'a7', tipo: 'noticia', data: '2026-09-15', titulo: 'Atleta do projeto é convocada para seleção regional', autor: 'e5', texto: 'A aluna do Vôlei Sub-15 foi convocada para a seleção regional após destaque no torneio…' });

    const eventos = [
      { id: 'ev1', nome: 'Festival de Inverno', tipo: 'Apresentação', data: '2026-07-25', hora: '19:00', local: 'Praça Central', cidade: 'Domingos Martins', projeto_id: 'p1', descricao: 'Apresentação do Coral Infantil e grupo de percussão na programação oficial do festival.', saida: '15:30', retorno: '22:30', transporte: 'Van do Instituto + ônibus fretado', participantes: [] },
      { id: 'ev2', nome: 'Torneio Regional de Vôlei Sub-15', tipo: 'Competição', data: '2026-11-08', hora: '08:00', local: 'Ginásio Poliesportivo', cidade: 'Venda Nova do Imigrante', projeto_id: 'p2', descricao: 'Participação da equipe Sub-15 feminina no torneio regional.', saida: '06:30', retorno: '18:00', transporte: 'Van do Instituto', participantes: [] },
      { id: 'ev3', nome: 'Recital de Piano', tipo: 'Recital', data: '2026-11-22', hora: '18:00', local: 'Auditório da Sede', cidade: 'Afonso Cláudio', projeto_id: 'p3', descricao: 'Primeiro recital dos alunos de piano, aberto às famílias.', saida: '', retorno: '', transporte: '', participantes: [] },
      { id: 'ev4', nome: 'Cantata de Natal', tipo: 'Apresentação', data: '2026-12-12', hora: '19:30', local: 'Igreja Matriz', cidade: 'Afonso Cláudio', projeto_id: 'p1', descricao: 'Encerramento do ano com coral, violinos e percussão.', saida: '', retorno: '', transporte: '', participantes: [] },
    ];
    const membrosDe = (...tids) => alunos.filter((a) => a.status === 'ativo' && a.turmas.some((t) => tids.includes(t))).map((a) => a.id);
    eventos[0].participantes = membrosDe('t1', 't3').slice(0, 18);
    eventos[1].participantes = membrosDe('t4').slice(0, 12);
    eventos[2].participantes = membrosDe('t6');
    eventos[3].participantes = membrosDe('t1', 't2', 't3');

    const despesas = [];
    let did = 1;
    const CAT = [['Recursos humanos', 0.55], ['Material pedagógico', 0.12], ['Transporte', 0.12], ['Alimentação', 0.08], ['Uniformes', 0.06], ['Divulgação', 0.03]];
    projetos.forEach((p) => {
      const meses = [];
      for (let m = new Date(p.inicio + 'T12:00'); iso(m).slice(0, 7) <= mesAtual; m.setMonth(m.getMonth() + 1)) meses.push(iso(m).slice(0, 7));
      const mensal = p.valor / 11;
      meses.forEach((m) => {
        CAT.forEach(([c, peso]) => {
          if (c !== 'Recursos humanos' && r() < 0.45) return;
          despesas.push({ id: 'd' + did++, projeto_id: p.id, data: `${m}-${String(5 + Math.floor(r() * 20)).padStart(2, '0')}`, categoria: c, descricao: c === 'Recursos humanos' ? 'Pagamento de educadores e coordenação' : c === 'Transporte' ? 'Combustível e manutenção da van' : c === 'Alimentação' ? 'Lanche dos alunos' : c, fornecedor: c === 'Recursos humanos' ? 'Folha do projeto' : pega(['Comercial Montanhas Ltda', 'Posto Serrano', 'Gráfica Pontões', 'Distribuidora ES']), documento: `NF ${1000 + did}`, valor: Math.round(mensal * peso * (0.8 + r() * 0.4)) });
        });
      });
    });

    const canais = [
      { id: 'c1', nome: 'Geral', tipo: 'grupo', descricao: 'Avisos para toda a equipe', membros: equipe.map((e) => e.id) },
      { id: 'c2', nome: 'Professores', tipo: 'grupo', descricao: 'Planejamento e trocas entre educadores', membros: equipe.filter((e) => e.tipo === 'professor').map((e) => e.id).concat('e1') },
      { id: 'c3', nome: 'Coordenação e Social', tipo: 'grupo', descricao: 'Casos e encaminhamentos', membros: ['e1', 'e7', 'e8', 'e9'] },
      { id: 'c4', nome: 'Van e transporte', tipo: 'grupo', descricao: 'Rotas, horários e imprevistos', membros: ['e1', 'e9', 'e10', 'e5', 'e2'] },
    ];
    const ontem = new Date(fim); ontem.setDate(ontem.getDate() - 1);
    const t = (d, h) => `${iso(d)}T${h}:00`;
    const mensagens = [
      { id: 'm1', canal_id: 'c1', autor_id: 'e1', texto: 'Bom dia, equipe! Lembrete: os planos de aula de outubro precisam estar no sistema até sexta.', em: t(ontem, '08:12') },
      { id: 'm2', canal_id: 'c1', autor_id: 'e9', texto: 'As fichas de autorização para o Torneio de Vôlei já estão na secretaria.', em: t(ontem, '09:40') },
      { id: 'm3', canal_id: 'c1', autor_id: 'e5', texto: 'Obrigado, Joana! Passo aí depois do treino.', em: t(ontem, '09:52') },
      { id: 'm4', canal_id: 'c2', autor_id: 'e2', texto: 'Alguém tem a partitura de "Noite Feliz" a 3 vozes? Quero adaptar para o coral.', em: t(ontem, '14:05') },
      { id: 'm5', canal_id: 'c2', autor_id: 'e3', texto: 'Tenho sim, Marcos. Te mando em PDF.', em: t(ontem, '14:20') },
      { id: 'm6', canal_id: 'c3', autor_id: 'e7', texto: 'Dois alunos com faltas seguidas nas últimas semanas. Vou ligar para as famílias hoje.', em: t(fim, '08:30') },
      { id: 'm7', canal_id: 'c4', autor_id: 'e10', texto: 'A estrada da Grama está com obra. Hoje a van vai sair 10 minutos mais cedo.', em: t(fim, '06:45') },
      { id: 'm8', canal_id: 'c1', autor_id: 'e1', texto: 'Reunião geral na próxima quarta, 17h, na sede.', em: t(fim, '10:02') },
    ];

    return { versao: 1, equipe, projetos, turmas, alunos, aulas, planos, registros: reg, eventos, despesas, canais, mensagens, lidos: {} };
  }

  window.Seed = { gerar };
})();
