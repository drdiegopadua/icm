/* Dados fictícios de demonstração (gerados de forma determinística).
   Nenhum dado real deve ser colocado aqui. */
(function () {
  window.ICM = window.ICM || {};
  const U = () => ICM.util;

  // Gerador pseudoaleatório com semente (dados sempre iguais)
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // Foto ilustrativa em SVG (placeholder leve)
  function fakePhoto(cor, label, r) {
    const shapes = Array.from({ length: 5 }, () => {
      const x = Math.round(r() * 400), y = Math.round(150 + r() * 120), rr = Math.round(20 + r() * 40);
      return `<circle cx='${x}' cy='${y}' r='${rr}' fill='white' fill-opacity='${(0.12 + r() * 0.2).toFixed(2)}'/>`;
    }).join('');
    const people = Array.from({ length: 4 }, (_, i) => {
      const x = 70 + i * 85 + Math.round(r() * 20);
      return `<circle cx='${x}' cy='170' r='18' fill='white' fill-opacity='.85'/><rect x='${x - 24}' y='192' width='48' height='70' rx='22' fill='white' fill-opacity='.75'/>`;
    }).join('');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${cor}'/><stop offset='1' stop-color='#0e1838'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/>${shapes}${people}<rect x='0' y='262' width='400' height='38' fill='black' fill-opacity='.35'/><text x='14' y='287' font-family='Segoe UI,Arial' font-size='15' font-weight='700' fill='white'>${label}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  async function build() {
    const u = U();
    const r = rng(20261022);
    const pick = a => a[Math.floor(r() * a.length)];
    const now = new Date();
    const hoje = u.iso(now);
    const ano = now.getFullYear();
    const stamp = new Date().toISOString();

    // ---------------- Usuários (senha demo: icm@2026) ----------------
    const senhaHash = await u.sha256('icm-salt::icm@2026');
    const usuarios = [
      { id: 'usr_admin', nome: 'Diego Pádua', email: 'admin@icm.org', papel: 'admin', cargo: 'Diretor executivo' },
      { id: 'usr_coord', nome: 'Mariana Coelho', email: 'coordenacao@icm.org', papel: 'coordenacao', cargo: 'Coordenadora pedagógica' },
      { id: 'usr_sec', nome: 'Renata Alves', email: 'secretaria@icm.org', papel: 'secretaria', cargo: 'Assistente social' },
      { id: 'usr_prof1', nome: 'Carlos Menezes', email: 'carlos@icm.org', papel: 'professor', cargo: 'Professor de música' },
      { id: 'usr_prof2', nome: 'Fernanda Rocha', email: 'fernanda@icm.org', papel: 'professor', cargo: 'Professora de educação física' },
      { id: 'usr_prof3', nome: 'Paulo Henrique', email: 'paulo@icm.org', papel: 'professor', cargo: 'Educador ambiental' },
      { id: 'usr_prof4', nome: 'Juliana Prado', email: 'juliana@icm.org', papel: 'professor', cargo: 'Pedagoga' }
    ].map(x => ({ ...x, ativo: true, senha_hash: senhaHash, telefone: '(00) 90000-0000', criado_em: stamp }));

    // ---------------- Projetos ----------------
    const projetos = [
      {
        id: 'prj_orq', nome: 'Orquestra Jovem ICM', area: 'cultura', status: 'execucao', cor: '#8b5cf6',
        fonte: 'lei_incentivo', financiador: 'Lei Federal de Incentivo à Cultura (PRONAC 000000)', numero_termo: 'PRONAC 26-0000',
        valor: 385000, inicio: `${ano}-02-01`, fim: `${ano}-12-20`, coordenador_id: 'usr_coord',
        local: 'Sede do Instituto — Sala de Música', publico_alvo: 'Crianças e adolescentes de 8 a 17 anos, estudantes da rede pública',
        justificativa: 'A região atendida apresenta baixa oferta de equipamentos culturais e alto índice de vulnerabilidade social. O ensino coletivo de instrumentos de orquestra amplia o repertório cultural, desenvolve disciplina, convivência e autoestima, e abre caminhos de profissionalização artística.',
        objetivo_geral: 'Promover a formação musical de crianças e adolescentes por meio da prática orquestral coletiva.',
        objetivos_especificos: ['Ofertar aulas gratuitas de cordas e sopros', 'Realizar ao menos 4 apresentações públicas no ano', 'Formar repertório com música brasileira e erudita', 'Fortalecer vínculos familiares e comunitários'],
        metas: [
          { descricao: 'Atender alunos regularmente', indicador: 'Alunos ativos', alvo: 40, unidade: 'alunos' },
          { descricao: 'Carga horária de aulas no ano', indicador: 'Horas de aula', alvo: 320, unidade: 'horas' },
          { descricao: 'Apresentações públicas', indicador: 'Apresentações', alvo: 4, unidade: 'apresentações' },
          { descricao: 'Frequência média', indicador: '% de presença', alvo: 80, unidade: '%' }
        ],
        metodologia: 'Ensino coletivo de instrumentos (método Suzuki adaptado), ensaios de naipe e tutti, prática de leitura musical, oficinas com músicos convidados e apresentações em espaços públicos.',
        contrapartidas: 'Concertos gratuitos em escolas públicas e praças; doação de 10% dos ingressos de eventos a projetos sociais.'
      },
      {
        id: 'prj_esp', nome: 'Esporte que Transforma', area: 'esporte', status: 'execucao', cor: '#f97316',
        fonte: 'lei_incentivo', financiador: 'Lei de Incentivo ao Esporte — Ministério do Esporte', numero_termo: 'LIE 26-0000',
        valor: 298000, inicio: `${ano}-03-01`, fim: `${ano}-12-15`, coordenador_id: 'usr_coord',
        local: 'Quadra poliesportiva do bairro', publico_alvo: 'Crianças e adolescentes de 9 a 15 anos',
        justificativa: 'O esporte educacional reduz a exposição de crianças e adolescentes a situações de risco no contraturno escolar, promove saúde, cooperação e respeito às regras.',
        objetivo_geral: 'Oferecer iniciação esportiva em futsal e vôlei com foco no desenvolvimento integral.',
        objetivos_especificos: ['Ofertar treinos 2x por semana', 'Participar de campeonatos regionais', 'Acompanhar o desempenho escolar dos atletas'],
        metas: [
          { descricao: 'Atender alunos regularmente', indicador: 'Alunos ativos', alvo: 40, unidade: 'alunos' },
          { descricao: 'Carga horária de treinos', indicador: 'Horas de aula', alvo: 280, unidade: 'horas' },
          { descricao: 'Participação em competições', indicador: 'Campeonatos', alvo: 3, unidade: 'campeonatos' },
          { descricao: 'Frequência média', indicador: '% de presença', alvo: 75, unidade: '%' }
        ],
        metodologia: 'Esporte educacional com aquecimento lúdico, fundamentos técnicos, jogos reduzidos e roda de conversa sobre valores ao final de cada aula.',
        contrapartidas: 'Festival esportivo aberto à comunidade no encerramento.'
      },
      {
        id: 'prj_verde', nome: 'Guardiões do Verde', area: 'meio_ambiente', status: 'execucao', cor: '#10b981',
        fonte: 'privada', financiador: 'Edital Empresa Parceira — Responsabilidade Social', numero_termo: 'Contrato 012/' + ano,
        valor: 72000, inicio: `${ano}-04-01`, fim: `${ano}-11-30`, coordenador_id: 'usr_coord',
        local: 'Horta comunitária do Instituto', publico_alvo: 'Crianças de 7 a 12 anos e suas famílias',
        justificativa: 'A educação ambiental prática aproxima as crianças do cuidado com o território e promove hábitos alimentares saudáveis.',
        objetivo_geral: 'Desenvolver consciência ambiental por meio da horta pedagógica e de ações de cuidado com o bairro.',
        objetivos_especificos: ['Manter horta pedagógica ativa', 'Realizar mutirões de plantio', 'Promover oficinas de compostagem'],
        metas: [
          { descricao: 'Atender alunos', indicador: 'Alunos ativos', alvo: 20, unidade: 'alunos' },
          { descricao: 'Mudas plantadas no bairro', indicador: 'Mudas', alvo: 300, unidade: 'mudas', atual_manual: 210 },
          { descricao: 'Frequência média', indicador: '% de presença', alvo: 75, unidade: '%' }
        ],
        metodologia: 'Aprendizagem baseada em projetos, oficinas práticas na horta, saídas de campo e mutirões com a comunidade.',
        contrapartidas: 'Distribuição de mudas e hortaliças às famílias participantes.'
      },
      {
        id: 'prj_edu', nome: 'Futuro Certo — Reforço Escolar', area: 'educacao', status: 'execucao', cor: '#3b82f6',
        fonte: 'publica_municipal', financiador: 'Prefeitura Municipal — Termo de Fomento (Lei 13.019/2014)', numero_termo: 'Termo de Fomento 034/' + ano,
        valor: 156000, inicio: `${ano}-02-15`, fim: `${ano}-12-10`, coordenador_id: 'usr_coord',
        local: 'Sede do Instituto — Salas 1 e 2', publico_alvo: 'Estudantes do 4º ao 9º ano com defasagem de aprendizagem',
        justificativa: 'Indicadores municipais apontam defasagem em leitura e matemática agravada no pós-pandemia. O reforço no contraturno contribui para a permanência e o sucesso escolar.',
        objetivo_geral: 'Reduzir a defasagem de aprendizagem em língua portuguesa e matemática.',
        objetivos_especificos: ['Ofertar reforço 3x por semana', 'Aplicar avaliação diagnóstica e final', 'Acompanhar boletins escolares'],
        metas: [
          { descricao: 'Atender alunos', indicador: 'Alunos ativos', alvo: 30, unidade: 'alunos' },
          { descricao: 'Carga horária de aulas', indicador: 'Horas de aula', alvo: 360, unidade: 'horas' },
          { descricao: 'Frequência média', indicador: '% de presença', alvo: 85, unidade: '%' }
        ],
        metodologia: 'Avaliação diagnóstica, agrupamentos por nível, sequências didáticas, jogos matemáticos e rodas de leitura.',
        contrapartidas: 'Relatórios trimestrais enviados às escolas de origem.'
      },
      {
        id: 'prj_saude', nome: 'Saúde em Movimento', area: 'saude', status: 'planejamento', cor: '#ec4899',
        fonte: 'emenda', financiador: 'Emenda Parlamentar Estadual', numero_termo: 'Convênio 0000/' + ano,
        valor: 98000, inicio: `${ano}-11-01`, fim: `${ano + 1}-06-30`, coordenador_id: 'usr_coord',
        local: 'Sede do Instituto', publico_alvo: 'Alunos dos projetos e familiares',
        justificativa: 'Promoção de saúde preventiva, alimentação saudável e saúde mental para as famílias atendidas.',
        objetivo_geral: 'Promover hábitos saudáveis e acesso a orientações preventivas de saúde.',
        objetivos_especificos: ['Realizar oficinas mensais', 'Promover feira de saúde', 'Encaminhar casos à rede de saúde'],
        metas: [{ descricao: 'Pessoas atendidas', indicador: 'Pessoas', alvo: 150, unidade: 'pessoas' }],
        metodologia: 'Oficinas, rodas de conversa, triagens com parceiros da rede pública.',
        contrapartidas: 'Feira de saúde aberta à comunidade.'
      }
    ].map(p => ({ ...p, criado_em: stamp }));

    // ---------------- Turmas ----------------
    const turmas = [
      { id: 'tur_cordas', projeto_id: 'prj_orq', nome: 'Cordas — Violino e Viola', modalidade: 'Violino / Viola', professor_id: 'usr_prof1', dias: [2, 4], inicio: '14:00', fim: '16:00', vagas: 20, faixa: '8 a 14 anos', local: 'Sala de Música' },
      { id: 'tur_sopros', projeto_id: 'prj_orq', nome: 'Sopros — Flauta e Clarinete', modalidade: 'Sopros', professor_id: 'usr_prof1', dias: [3, 5], inicio: '14:00', fim: '16:00', vagas: 16, faixa: '10 a 17 anos', local: 'Sala de Música' },
      { id: 'tur_futsal', projeto_id: 'prj_esp', nome: 'Futsal Sub-13', modalidade: 'Futsal', professor_id: 'usr_prof2', dias: [1, 3], inicio: '15:00', fim: '16:30', vagas: 22, faixa: '9 a 13 anos', local: 'Quadra' },
      { id: 'tur_volei', projeto_id: 'prj_esp', nome: 'Vôlei Sub-15', modalidade: 'Vôlei', professor_id: 'usr_prof2', dias: [2, 4], inicio: '16:30', fim: '18:00', vagas: 18, faixa: '11 a 15 anos', local: 'Quadra' },
      { id: 'tur_horta', projeto_id: 'prj_verde', nome: 'Horta Pedagógica', modalidade: 'Educação ambiental', professor_id: 'usr_prof3', dias: [5], inicio: '09:00', fim: '11:00', vagas: 20, faixa: '7 a 12 anos', local: 'Horta' },
      { id: 'tur_mat', projeto_id: 'prj_edu', nome: 'Reforço — Matemática', modalidade: 'Matemática', professor_id: 'usr_prof4', dias: [1, 3], inicio: '08:00', fim: '10:00', vagas: 15, faixa: '4º ao 9º ano', local: 'Sala 1' },
      { id: 'tur_port', projeto_id: 'prj_edu', nome: 'Reforço — Leitura e Escrita', modalidade: 'Língua Portuguesa', professor_id: 'usr_prof4', dias: [2, 4], inicio: '08:00', fim: '10:00', vagas: 15, faixa: '4º ao 9º ano', local: 'Sala 2' }
    ].map(t => ({ ...t, status: 'ativa', criado_em: stamp }));

    // ---------------- Alunos ----------------
    const nomes = ['Ana Beatriz', 'João Pedro', 'Maria Eduarda', 'Lucas Gabriel', 'Gabriela', 'Enzo', 'Isabela', 'Miguel', 'Sophia', 'Arthur', 'Laura', 'Davi', 'Valentina', 'Heitor', 'Helena', 'Bernardo', 'Alice', 'Théo', 'Manuela', 'Samuel', 'Lívia', 'Rafael', 'Yasmin', 'Gustavo', 'Lorena', 'Pedro Henrique', 'Clara', 'Matheus', 'Cecília', 'Nicolas', 'Ester', 'Kauã', 'Bianca', 'Vitor', 'Emanuelly', 'Caio', 'Rebeca', 'Breno', 'Luana', 'Otávio'];
    const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Barbosa'];
    const bairros = ['Jardim Esperança', 'Vila Nova', 'Centro', 'Parque das Flores', 'São José', 'Morro Alto'];
    const escolas = ['E.M. Monteiro Lobato', 'E.E. Prof. Ana Rosa', 'E.M. Cecília Meireles', 'E.E. Dom Pedro II'];
    const beneficiosOpts = ['Bolsa Família', 'BPC', 'Tarifa Social', 'Auxílio municipal'];

    const alunos = nomes.map((n, i) => {
      const sob = `${pick(sobrenomes)} ${pick(sobrenomes)}`;
      const idade = 8 + Math.floor(r() * 9);
      const nasc = `${ano - idade}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 27)).padStart(2, '0')}`;
      const renda = Math.round((900 + r() * 2600) / 10) * 10;
      const pessoas = 2 + Math.floor(r() * 5);
      const fem = /a$|Alice|Helena|Clara|Ester|Isabela|Sophia|Laura|Valentina|Manuela|Lívia|Yasmin|Lorena|Cecília|Bianca|Emanuelly|Rebeca|Luana|Gabriela|Ana Beatriz|Maria Eduarda/.test(n);
      const status = i === 38 ? 'espera' : i === 39 ? 'desligado' : 'ativo';
      return {
        id: 'alu_' + String(i + 1).padStart(3, '0'),
        matricula: `ICM-${ano}-${String(i + 1).padStart(4, '0')}`,
        nome: `${n} ${sob}`, nome_social: '', nascimento: nasc, sexo: fem ? 'F' : 'M', cor_raca: pick(['Parda', 'Preta', 'Branca', 'Parda', 'Preta', 'Indígena']),
        cpf: '', rg: '', nis: '', foto: '', status, data_matricula: `${ano}-0${2 + Math.floor(r() * 3)}-${String(1 + Math.floor(r() * 25)).padStart(2, '0')}`,
        telefone: '(00) 9' + String(Math.floor(r() * 1e8)).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'),
        email: '',
        endereco: { logradouro: `Rua ${pick(['das Acácias', 'Bela Vista', 'São Jorge', 'do Sol', 'Esperança', 'das Palmeiras'])}`, numero: String(10 + Math.floor(r() * 900)), bairro: pick(bairros), cidade: 'Sua Cidade', uf: 'UF', cep: '00000-000' },
        responsavel: { nome: `${pick(['Cláudia', 'Rosângela', 'Marcos', 'Patrícia', 'Sandra', 'José', 'Adriana', 'Luciana'])} ${sob.split(' ')[0]}`, parentesco: pick(['Mãe', 'Mãe', 'Pai', 'Avó', 'Tia']), telefone: '(00) 9' + String(Math.floor(r() * 1e8)).padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'), cpf: '', profissao: pick(['Diarista', 'Autônomo(a)', 'Comerciário(a)', 'Desempregado(a)', 'Cozinheiro(a)', 'Motorista']) },
        autorizacoes: { imagem: r() > .1, saida_sozinho: idade >= 12 && r() > .4, lgpd: true, data_termo: `${ano}-02-10` },
        social: {
          pessoas_casa: pessoas, moradia: pick(['Alugada', 'Própria', 'Cedida', 'Alugada']), cras: r() > .5 ? 'Sim' : 'Não',
          beneficios: beneficiosOpts.filter(() => r() > .7), vulnerabilidades: r() > .7 ? 'Família monoparental; insegurança alimentar relatada.' : '',
          observacoes: ''
        },
        financeiro: {
          renda_familiar: renda, renda_per_capita: Math.round(renda / pessoas), fonte_renda: pick(['Trabalho formal', 'Trabalho informal', 'Benefícios', 'Trabalho informal']),
          isencao: true, contribuicao_mensal: 0, observacoes: ''
        },
        saude: {
          tipo_sanguineo: pick(['O+', 'A+', 'B+', 'O-', 'AB+', 'Não informado']),
          alergias: r() > .8 ? pick(['Dipirona', 'Amendoim', 'Lactose', 'Picada de inseto']) : '',
          medicamentos: r() > .88 ? pick(['Bombinha para asma (salbutamol)', 'Ritalina']) : '',
          condicoes: r() > .85 ? pick(['Asma', 'TDAH', 'Rinite alérgica', 'TEA nível 1']) : '',
          deficiencia: '', plano_saude: 'SUS', ubs: 'UBS ' + pick(bairros),
          apto_atividade_fisica: true, contato_emergencia: '', observacoes: ''
        },
        escolaridade: { escola: pick(escolas), rede: pick(['Municipal', 'Estadual']), serie: `${Math.min(9, Math.max(3, idade - 6))}º ano`, turno: pick(['Manhã', 'Tarde']), desempenho: pick(['Bom', 'Regular', 'Ótimo', 'Precisa de apoio']), observacoes: '' },
        criado_em: stamp
      };
    });

    // ---------------- Matrículas em turmas ----------------
    const matriculas = [];
    const turmaAlunos = { tur_cordas: [], tur_sopros: [], tur_futsal: [], tur_volei: [], tur_horta: [], tur_mat: [], tur_port: [] };
    const ordem = Object.keys(turmaAlunos);
    alunos.forEach((a, i) => {
      if (a.status === 'espera') return;
      const idade = u.age(a.nascimento);
      const prim = ordem[i % ordem.length];
      const escolhidas = [prim];
      if (r() > .55) { const sec = pick(ordem); if (sec !== prim) escolhidas.push(sec); }
      escolhidas.forEach(t => {
        const entrada = projetos.find(p => p.id === turmas.find(x => x.id === t).projeto_id).inicio;
        const desligado = a.status === 'desligado';
        matriculas.push({ id: u.uid('mat_'), turma_id: t, aluno_id: a.id, entrada: entrada > a.data_matricula ? entrada : a.data_matricula, saida: desligado ? `${ano}-09-15` : null, motivo_saida: desligado ? 'Excesso de faltas' : null, status: desligado ? 'saiu' : 'ativo' });
        turmaAlunos[t].push(a.id);
      });
      void idade;
    });

    // ---------------- Aulas ----------------
    const temas = {
      tur_cordas: ['Postura e empunhadura do arco', 'Escala de Ré maior', 'Leitura rítmica em semínimas', 'Repertório: Asa Branca', 'Ensaio de naipe', 'Dinâmicas: piano e forte', 'Afinação e cuidado com o instrumento', 'Repertório: Ode à Alegria'],
      tur_sopros: ['Respiração diafragmática', 'Emissão de som e embocadura', 'Escala de Si bemol', 'Repertório: Carinhoso', 'Articulação e staccato', 'Ensaio geral com cordas'],
      tur_futsal: ['Condução de bola', 'Passe e recepção', 'Finalização', 'Marcação e cobertura', 'Jogo reduzido 3x3', 'Goleiro: posicionamento', 'Regras e fair play'],
      tur_volei: ['Toque por cima', 'Manchete', 'Saque por baixo', 'Recepção e levantamento', 'Rodízio e posições', 'Jogo adaptado'],
      tur_horta: ['Preparo dos canteiros', 'Compostagem doméstica', 'Plantio de hortaliças', 'Ciclo da água', 'Colheita e alimentação saudável', 'Mutirão de mudas no bairro'],
      tur_mat: ['Frações no cotidiano', 'Operações com decimais', 'Problemas de proporção', 'Geometria: perímetro e área', 'Jogo do mercadinho', 'Avaliação diagnóstica'],
      tur_port: ['Roda de leitura', 'Produção de texto narrativo', 'Pontuação e coesão', 'Interpretação de texto', 'Gêneros textuais: notícia', 'Reescrita coletiva']
    };
    const relatos = [
      'Turma participativa. Os objetivos foram alcançados pela maioria dos alunos. Retomar o conteúdo com quem faltou.',
      'Aula produtiva, boa concentração. Dois alunos apresentaram dificuldade e receberam atenção individual.',
      'Atividade em grupos funcionou muito bem; houve cooperação e respeito. Turma demonstrou evolução visível.',
      'Início agitado, mas após a dinâmica de acolhimento o grupo se engajou. Conteúdo concluído.',
      'Excelente aula. Alunos pediram para repetir a atividade. Registrado avanço técnico significativo.'
    ];
    // Alunos "faltosos" para demonstrar os alertas de assiduidade
    const faltososMes = new Set(['alu_004', 'alu_011', 'alu_018', 'alu_025']);
    const criticos = new Set(['alu_011', 'alu_025']);

    const aulas = [];
    const inicioAulas = u.parseD(`${ano}-08-01`);
    const fimAulas = u.parseD(u.addDays(hoje, 14));
    turmas.forEach(t => {
      const proj = projetos.find(p => p.id === t.projeto_id);
      if (proj.status === 'planejamento') return;
      let cont = 0;
      for (let d = new Date(inicioAulas); d <= fimAulas; d.setDate(d.getDate() + 1)) {
        if (!t.dias.includes(d.getDay())) continue;
        const data = u.iso(d);
        const passada = data < hoje;
        const tema = temas[t.id][cont % temas[t.id].length];
        cont++;
        const presencas = {};
        const ativosNaData = matriculas.filter(m => m.turma_id === t.id && m.entrada <= data && (!m.saida || m.saida > data)).map(m => m.aluno_id);
        if (passada) {
          const mesAtual = data.slice(0, 7) === hoje.slice(0, 7);
          ativosNaData.forEach(aid => {
            let v = r() > .1 ? 'P' : (r() > .5 ? 'F' : 'J');
            if (mesAtual && faltososMes.has(aid)) { const lim = criticos.has(aid) ? .55 : .7; v = r() > lim ? 'F' : 'P'; }
            presencas[aid] = v;
          });
        }
        const fotos = passada && r() > .45 ? Array.from({ length: 1 + Math.floor(r() * 3) }, (_, k) => ({ id: u.uid('fot_'), src: fakePhoto(proj.cor, `${t.modalidade} — ${u.fmtDate(data)}`, r), legenda: k === 0 ? tema : 'Registro da atividade' })) : [];
        aulas.push({
          id: u.uid('aul_'), turma_id: t.id, data, inicio: t.inicio, fim: t.fim, horas: u.hoursBetween(t.inicio, t.fim),
          status: passada ? 'realizada' : 'planejada', professor_id: t.professor_id,
          plano: { tema, objetivos: `Desenvolver: ${tema.toLowerCase()}.`, conteudo: `Aquecimento/acolhimento; explicação e demonstração de "${tema}"; prática orientada; fechamento com roda de conversa.`, recursos: pick(['Instrumentos, estantes, partituras', 'Bolas, cones, coletes', 'Ferramentas de jardinagem, sementes', 'Quadro, material impresso, jogos', 'Projetor, caixa de som']), avaliacao: 'Observação direta e participação.' },
          relatorio: passada ? { texto: pick(relatos), ocorrencias: r() > .85 ? 'Um aluno passou mal e a família foi comunicada.' : '' } : { texto: '', ocorrencias: '' },
          presencas, fotos, criado_em: stamp
        });
      }
    });

    // ---------------- Eventos ----------------
    const evPart = (ids, n) => ids.slice(0, n);
    const eventos = [
      { id: 'evt_1', tipo: 'participacao', titulo: 'Festival de Inverno da Cidade', data: `${ano}-07-20`, fim: `${ano}-07-20`, horario: '16:00', local: 'Praça Central', projeto_id: 'prj_orq', descricao: 'Apresentação da Orquestra Jovem na programação oficial do festival.', publico: 600, resultado: 'Apresentação com 6 peças; matéria no jornal local.', alunos: evPart(turmaAlunos.tur_cordas.concat(turmaAlunos.tur_sopros), 18) },
      { id: 'evt_2', tipo: 'masterclass', titulo: 'Masterclass de Violino com convidado', data: `${ano}-09-12`, horario: '14:00', local: 'Sede do Instituto', projeto_id: 'prj_orq', descricao: 'Masterclass com violinista da orquestra sinfônica estadual.', publico: 45, resultado: 'Alunos receberam orientação individual de técnica.', alunos: evPart(turmaAlunos.tur_cordas, 12) },
      { id: 'evt_3', tipo: 'acao', titulo: 'Mutirão de Plantio no Bairro', data: `${ano}-09-21`, horario: '08:00', local: 'Parque das Flores', projeto_id: 'prj_verde', descricao: 'Plantio de mudas nativas com famílias e voluntários.', publico: 120, resultado: '210 mudas plantadas.', alunos: evPart(turmaAlunos.tur_horta, 14) },
      { id: 'evt_4', tipo: 'campeonato', titulo: 'Copa Regional de Futsal Sub-13', data: u.addDays(hoje, 17), horario: '09:00', local: 'Ginásio Municipal', projeto_id: 'prj_esp', descricao: 'Participação da equipe Sub-13 na copa regional.', publico: 0, resultado: '', alunos: evPart(turmaAlunos.tur_futsal, 12) },
      { id: 'evt_5', tipo: 'apresentacao', titulo: 'Concerto de Natal ICM', data: `${ano}-12-12`, horario: '19:00', local: 'Teatro Municipal', projeto_id: 'prj_orq', descricao: 'Concerto de encerramento do ano com todas as turmas da orquestra.', publico: 0, resultado: '', alunos: evPart(turmaAlunos.tur_cordas.concat(turmaAlunos.tur_sopros), 30) },
      { id: 'evt_6', tipo: 'evento', titulo: 'Feira de Saúde e Bem-Estar', data: `${ano}-11-22`, horario: '09:00', local: 'Sede do Instituto', projeto_id: 'prj_saude', descricao: 'Feira com aferição de pressão, orientação nutricional e vacinação em parceria com a UBS.', publico: 0, resultado: '', alunos: [] },
      { id: 'evt_7', tipo: 'campeonato', titulo: 'Torneio Interescolar de Vôlei', data: `${ano}-08-30`, horario: '08:00', local: 'Quadra da E.E. Dom Pedro II', projeto_id: 'prj_esp', descricao: 'Primeira competição oficial da equipe de vôlei.', publico: 200, resultado: '3º lugar — medalha de bronze.', alunos: evPart(turmaAlunos.tur_volei, 10) }
    ].map(e => ({ ...e, fotos: e.data < hoje ? [{ id: u.uid('fot_'), src: fakePhoto(ICM.C.TIPOS_EVENTO[e.tipo].cor, e.titulo, r), legenda: e.titulo }] : [], criado_em: stamp }));

    // ---------------- Ocorrências ----------------
    const ocorrencias = [
      { aluno_id: 'alu_011', tipo: 'advertencia', data: u.addDays(hoje, -9), titulo: 'Faltas sem justificativa', descricao: 'Aluno acumulou faltas no mês. Família contatada por telefone; mãe relatou dificuldade de transporte.', registrado_por: 'usr_sec' },
      { aluno_id: 'alu_004', tipo: 'ocorrencia', data: u.addDays(hoje, -20), titulo: 'Desentendimento em aula', descricao: 'Discussão com colega durante atividade em grupo. Mediação realizada pela professora.', registrado_por: 'usr_prof2' },
      { aluno_id: 'alu_002', tipo: 'elogio', data: u.addDays(hoje, -12), titulo: 'Destaque no ensaio', descricao: 'Executou o solo da peça com excelência e ajudou colegas do naipe.', registrado_por: 'usr_prof1' },
      { aluno_id: 'alu_025', tipo: 'atendimento', data: u.addDays(hoje, -5), titulo: 'Atendimento à família', descricao: 'Visita domiciliar realizada. Família encaminhada ao CRAS para atualização do CadÚnico.', registrado_por: 'usr_sec' },
      { aluno_id: 'alu_007', tipo: 'elogio', data: `${ano}-08-30`, titulo: 'Medalha de bronze', descricao: 'Ótima atuação no Torneio Interescolar de Vôlei.', registrado_por: 'usr_prof2' }
    ].map(o => ({ ...o, id: u.uid('oco_'), criado_em: stamp }));

    // ---------------- Patrimônio ----------------
    const { patrimonio, emprestimos } = buildPatrimonio({ u, ano, hoje, stamp, turmaAlunos });

    const base = {
      meta: { versao: 3, criado_em: stamp, org: ICM.C.ORG },
      patrimonio, emprestimos,
      config: { assiduidade: { ...ICM.C.ASSIDUIDADE }, org: { ...ICM.C.ORG } },
      usuarios, projetos, turmas, alunos, matriculas, aulas, eventos, ocorrencias,
      auditoria: [{ id: u.uid('aud_'), em: stamp, usuario_id: 'sistema', acao: 'seed', entidade: 'sistema', entidade_id: '', resumo: 'Base de demonstração criada' }]
    };
    Object.assign(base, ICM.seedComunidade(base));
    Object.assign(base, ICM.seedGestao(base));
    Object.assign(base, ICM.seedInst(base));
    Object.assign(base, ICM.seedFinanceiro(base));
    return base;
  }

  function buildPatrimonio({ u, ano, hoje, stamp, turmaAlunos }) {
    let n = 0;
    const it = (nome, categoria, quantidade, extra = {}) => ({
      id: 'pat_' + String(++n).padStart(3, '0'), tombo: `ICM-PAT-${String(n).padStart(4, '0')}`, nome, categoria, quantidade,
      marca: '', modelo: '', numero_serie: '', estado: 'bom', situacao: 'ativo', emprestavel: false, local: 'Sede',
      projeto_id: '', data_aquisicao: `${ano - 1}-03-10`, valor_unitario: 0, nota_fiscal: '', fornecedor: '', observacoes: '', historico: [], criado_em: stamp, ...extra
    });
    const patrimonio = [
      it('Notebook Dell Inspiron 15', 'informatica', 6, { marca: 'Dell', modelo: 'Inspiron 15 3520', local: 'Sala 1', projeto_id: 'prj_edu', valor_unitario: 3290, nota_fiscal: 'NF 18.204', fornecedor: 'Loja Informática Ltda', data_aquisicao: `${ano}-03-02`, estado: 'novo' }),
      it('Computador desktop', 'informatica', 4, { marca: 'Positivo', local: 'Secretaria', valor_unitario: 2800, nota_fiscal: 'NF 9.871' }),
      it('Impressora multifuncional', 'informatica', 1, { marca: 'Epson', modelo: 'L3250', local: 'Secretaria', valor_unitario: 1150 }),
      it('Projetor multimídia', 'audio_video', 1, { marca: 'Epson', modelo: 'PowerLite X49', local: 'Sala 2', valor_unitario: 3900, emprestavel: true, numero_serie: 'X49B7712' }),
      it('Caixa de som amplificada', 'audio_video', 2, { marca: 'JBL', modelo: 'PartyBox 310', local: 'Almoxarifado', valor_unitario: 3200, emprestavel: true, projeto_id: 'prj_orq' }),
      it('Microfone sem fio (kit)', 'audio_video', 2, { marca: 'Shure', local: 'Almoxarifado', valor_unitario: 890, emprestavel: true }),
      it('Ar-condicionado split 12.000 BTUs', 'climatizacao', 3, { marca: 'LG', modelo: 'Dual Inverter', local: 'Salas 1, 2 e Música', valor_unitario: 2650 }),
      it('Ventilador de parede', 'climatizacao', 4, { local: 'Quadra e salas', valor_unitario: 210, estado: 'regular' }),
      it('Geladeira 340 L', 'eletrodomestico', 1, { marca: 'Consul', local: 'Cozinha', valor_unitario: 2490 }),
      it('Bebedouro industrial', 'eletrodomestico', 1, { local: 'Pátio', valor_unitario: 1350 }),
      it('Violino 4/4', 'instrumento', 12, { marca: 'Eagle', local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 780, emprestavel: true, data_aquisicao: `${ano}-02-20`, nota_fiscal: 'NF 3.330', fornecedor: 'Casa da Música' }),
      it('Violino 3/4', 'instrumento', 8, { marca: 'Eagle', local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 690, emprestavel: true, data_aquisicao: `${ano}-02-20`, nota_fiscal: 'NF 3.330', fornecedor: 'Casa da Música' }),
      it('Viola de arco', 'instrumento', 4, { local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 1100, emprestavel: true }),
      it('Flauta transversal', 'instrumento', 6, { marca: 'Yamaha', modelo: 'YFL-212', local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 2900, emprestavel: true }),
      it('Clarinete', 'instrumento', 4, { marca: 'Yamaha', local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 3100, emprestavel: true }),
      it('Kimono infantil M1', 'esportivo', 10, { local: 'Almoxarifado', valor_unitario: 160, emprestavel: true }),
      it('Kimono juvenil A1', 'esportivo', 8, { local: 'Almoxarifado', valor_unitario: 190, emprestavel: true }),
      it('Bola de futsal oficial', 'esportivo', 15, { marca: 'Penalty', local: 'Quadra', projeto_id: 'prj_esp', valor_unitario: 120 }),
      it('Rede de vôlei', 'esportivo', 2, { local: 'Quadra', projeto_id: 'prj_esp', valor_unitario: 340 }),
      it('Kit ferramentas de jardinagem', 'jardinagem', 5, { local: 'Horta', projeto_id: 'prj_verde', valor_unitario: 230, emprestavel: true }),
      it('Mesa escolar', 'mobiliario', 30, { local: 'Salas 1 e 2', valor_unitario: 280 }),
      it('Cadeira escolar', 'mobiliario', 60, { local: 'Salas 1 e 2', valor_unitario: 150 }),
      it('Estante de partitura', 'mobiliario', 20, { local: 'Sala de Música', projeto_id: 'prj_orq', valor_unitario: 95 })
    ];
    patrimonio.find(p => p.id === 'pat_008').historico.push({ data: `${ano}-08-12`, tipo: 'manutencao', descricao: 'Um ventilador enviado para conserto (motor).', usuario: 'Mariana Coelho' });
    patrimonio.find(p => p.id === 'pat_008').situacao = 'ativo';

    let k = 0;
    const emp = (o) => ({ id: 'emp_' + String(++k).padStart(3, '0'), numero: `EMP-${ano}-${String(k).padStart(4, '0')}`, quantidade: 1, estado_saida: 'bom', termo_assinado: true, entregue_por: 'usr_sec', criado_em: stamp, status: 'ativo', data_devolucao: null, estado_devolucao: '', obs_devolucao: '', recebido_por: '', terceiro: null, aluno_id: null, colaborador_id: null, ...o });
    const cordas = turmaAlunos.tur_cordas, sopros = turmaAlunos.tur_sopros;
    const emprestimos = [
      ...cordas.slice(0, 5).map((a, i) => emp({ item_id: i % 2 ? 'pat_012' : 'pat_011', tipo_tomador: 'aluno', aluno_id: a, data_saida: `${ano}-03-05`, previsao_devolucao: `${ano}-12-20`, finalidade: 'Estudo em casa durante o projeto Orquestra Jovem' })),
      ...sopros.slice(0, 2).map(a => emp({ item_id: 'pat_014', tipo_tomador: 'aluno', aluno_id: a, data_saida: `${ano}-03-12`, previsao_devolucao: `${ano}-12-20`, finalidade: 'Estudo em casa' })),
      emp({ item_id: 'pat_016', tipo_tomador: 'aluno', aluno_id: turmaAlunos.tur_futsal[0], quantidade: 1, data_saida: `${ano}-08-01`, previsao_devolucao: u.addDays(hoje, -6), finalidade: 'Treino de judô em parceria' }),
      emp({ item_id: 'pat_005', tipo_tomador: 'terceiro', terceiro: { nome: 'Associação de Moradores do Jardim Esperança', documento: 'CNPJ 11.111.111/0001-11', responsavel: 'José Ferreira (presidente)', telefone: '(00) 98888-0000', endereco: 'Rua das Acácias, 200' }, data_saida: u.addDays(hoje, -3), previsao_devolucao: u.addDays(hoje, 2), finalidade: 'Festa comunitária do Dia das Crianças' }),
      emp({ item_id: 'pat_004', tipo_tomador: 'terceiro', terceiro: { nome: 'E.M. Monteiro Lobato', documento: 'INEP 00000000', responsavel: 'Profa. Sandra Lima (diretora)', telefone: '(00) 3333-0000', endereco: 'Av. Central, 50' }, data_saida: `${ano}-09-02`, previsao_devolucao: `${ano}-09-05`, status: 'devolvido', data_devolucao: `${ano}-09-05`, estado_devolucao: 'bom', recebido_por: 'usr_sec', obs_devolucao: 'Devolvido completo com cabos e controle.', finalidade: 'Feira de ciências da escola' }),
      emp({ item_id: 'pat_020', tipo_tomador: 'colaborador', colaborador_id: 'usr_prof3', quantidade: 2, data_saida: `${ano}-09-20`, previsao_devolucao: `${ano}-09-22`, status: 'devolvido', data_devolucao: `${ano}-09-22`, estado_devolucao: 'regular', recebido_por: 'usr_coord', obs_devolucao: 'Uma pá com cabo trincado.', finalidade: 'Mutirão de plantio no bairro' })
    ];
    return { patrimonio, emprestimos };
  }

  ICM.seed = { build, fakePhoto, buildPatrimonio };
})();
