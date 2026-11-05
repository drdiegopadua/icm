/*
 * Conteúdo institucional fixo (Instituto, números, montanhas, linha do tempo, parceiros).
 * Projetos, turmas, calendário e apresentações vêm do banco do Sistema ICM (db.js): as listas
 * abaixo servem de vitrine (foto e texto do site) e para o modo demonstração (?demo).
 */
const SITE = "https://www.institutoculturaldasmontanhas.org";
const BLOG_API = `${SITE}/blog/api/posts.php`;

const INSTITUTO = {
  nome: "Instituto Cultural das Montanhas",
  razao: "Instituto Três Pontões de Ação Social e Cultural",
  cnpj: "51.892.817/0001-52",
  whatsapp: "5527996996584",
  telefone: "(27) 99699-6584",
  email: "institutodasmontanhas@gmail.com",
  ouvidoria: "ouvidoriadasmontanhas@gmail.com",
  endereco: "Rua Alcino Martins de Souza, 110 — João Valim, Afonso Cláudio/ES",
  instagram: "https://www.instagram.com/institutodasmontanhas",
  youtube: "https://www.youtube.com/@institutoculturaldasmontan8847",
  missao: "Promover o desenvolvimento humano e social por meio de ações culturais, esportivas e educacionais, criando oportunidades que transformam vidas e fortalecem comunidades.",
  visao: "Ser referência na transformação social nas montanhas capixabas, ampliando o acesso à cultura, educação e inclusão para todos.",
  valores: "Transparência, respeito, inclusão, responsabilidade social e transformação através da educação.",
};

const AREAS_NOME = { cultura: "Cultura", esporte: "Esporte", meio_ambiente: "Meio Ambiente", educacao: "Educação", saude: "Saúde" };
const areaNome = (a) => AREAS_NOME[a] || "Instituto";

const NUMEROS = [
  { valor: "+500", rotulo: "famílias atendidas" },
  { valor: "494", rotulo: "alunos em 2025" },
  { valor: "R$ 136 mil", rotulo: "em bolsas auxílio" },
  { valor: "+5 ton", rotulo: "de alimentos" },
];

const img = (nome) => `${SITE}/assets/img/${nome}`;

const PROJETOS = [
  {
    id: "orquestra-jonice-tristao", area: "cultura", tag: "Cordas friccionadas",
    nome: "Orquestra Jônice Tristão", foto: img("orquestra-jonice-tristao-hero.jpg"),
    resumo: "Primeiro grupo de cordas friccionadas de Afonso Cláudio e região, com cerca de 60 alunos.",
    texto: "Fundada em abril de 2025, atende cerca de 60 alunos com aulas de violino, viola, violoncelo e contrabaixo acústico. Pioneira na captação pela Lei Rouanet na região, hoje é mantida pelo Grupo Tristão com apoio da Fundação Jônice Tristão.",
    publico: "Crianças a partir de 4 anos, jovens e adultos", local: "Sede do Instituto",
    horarios: ["Turmas por instrumento e nível — consulte a secretaria"],
  },
  {
    id: "orquestra-de-viola", area: "cultura", tag: "Viola caipira",
    nome: "Orquestra de Viola das Montanhas", foto: img("orquestra-viola-hero.jpg"),
    resumo: "Prática coletiva de viola caipira que celebra a música de raiz da região.",
    texto: "Realizada pelo Termo de Fomento nº 998728/2026 com o Ministério da Cultura, sob regência do professor Beto Calil. Dá continuidade ao resgate da histórica Orquestra de Viola Filhos de Francisco.",
    publico: "Crianças, adolescentes e jovens", local: "Sede do Instituto",
    horarios: ["Aulas semanais em grupo"],
  },
  {
    id: "musicalizacao-infantil", area: "cultura", tag: "Iniciação",
    nome: "Musicalização Infantil", foto: img("musicalizacao-infantil-hero.jpg"),
    resumo: "Primeiro contato das crianças com ritmo, escuta e música.",
    texto: "Atividades lúdicas, jogos rítmicos, canto, percussão corporal e experimentação de instrumentos. Inclui a Orquestra Infantil, porta de entrada para as cordas friccionadas.",
    publico: "Crianças a partir de 4 anos", local: "Sede do Instituto",
    horarios: ["Turmas matutinas e vespertinas"],
  },
  {
    id: "musicalizacao-agricola", area: "cultura", tag: "Zona rural",
    nome: "Musicalização Agrícola", foto: img("musicalizacao-agricola-hero.jpg"),
    resumo: "Violão, sopros e percussão levados às comunidades rurais.",
    texto: "Viabilizado pela LICC com patrocínio da EDP Espírito Santo, já na 3ª edição. Organizado em 6 núcleos formativos em 3 turnos. Dele nasceu a Orquestra de Sopros das Montanhas.",
    publico: "Crianças, adolescentes e jovens do campo", local: "6 núcleos em comunidades rurais",
    horarios: ["3 turnos — conforme o núcleo"],
  },
  {
    id: "corais-das-montanhas", area: "cultura", tag: "Vozes",
    nome: "Corais das Montanhas", foto: img("corais-das-montanhas-hero.jpg"),
    resumo: "Coral Infantil, Coro Jovem e Coral Cantares, além de turmas de piano.",
    texto: "Formação vocal, pianística e cênica pela LICC com patrocínio da EDP. Conta com preparação cênica e acompanhamento psicossocial.",
    publico: "Crianças, jovens e adultos", local: "Sede do Instituto",
    horarios: ["Coral Infantil A, B e C", "Coro Jovem", "Coral Cantares"],
  },
  {
    id: "sons-e-sonhos", area: "cultura", tag: "Vitória/ES",
    nome: "Sons e Sonhos", foto: img("sons-e-sonhos-hero.jpg"),
    resumo: "Parceria com a Orquestra Acadêmica do Ifes Campus Vitória.",
    texto: "Formação musical gratuita e continuada para 40 alunos na capital, pelo Termo de Fomento nº 033/2025 (emenda parlamentar, apoio da Secult-ES).",
    publico: "40 alunos", local: "Ifes Campus Vitória",
    horarios: ["Cordas e percussão — Orquestra Acadêmica"],
  },
  {
    id: "musica-classica-nas-montanhas", area: "cultura", tag: "Repertório",
    nome: "Música Clássica nas Montanhas", foto: img("orquestra-2.jpg"),
    resumo: "Ensino de cordas friccionadas e acesso ao repertório erudito.",
    texto: "Termo de Fomento nº 007/2026 com a Secult-ES. Aulas coletivas, ensaios e apresentações abertas à comunidade. Os alunos integram a Orquestra Jônice Tristão.",
    publico: "Mínimo de 20 alunos", local: "Sede do Instituto",
    horarios: ["Aulas coletivas e ensaios de conjunto"],
  },
  {
    id: "scfv", area: "cultura", tag: "Convivência",
    nome: "SCFV", foto: img("oficina-1.jpg"),
    resumo: "Serviço de Convivência e Fortalecimento de Vínculos, com o CRAS.",
    texto: "Braço socioassistencial do Instituto, executado em parceria com o CRAS de Afonso Cláudio (Proteção Social Básica do SUAS). Até 100 usuários simultâneos.",
    publico: "Encaminhados pelo CRAS e comunidade", local: "Sede do Instituto",
    horarios: ["Encontros semanais"],
  },
  {
    id: "artes-marciais", area: "esporte", tag: "Tatame",
    nome: "Artes Marciais", foto: img("esporte-4.jpg"),
    resumo: "Jiu-jitsu e kickboxing gratuitos, com medalhas no Estadual.",
    texto: "Cerca de 60 alunos em turmas matutinas e vespertinas, em parceria com a Associação do Botafogo. Sem corte técnico; frequência escolar é condição de permanência.",
    publico: "Crianças, adolescentes e jovens", local: "Sede do Instituto",
    horarios: ["Turmas matutinas e vespertinas"],
  },
  {
    id: "voleibol-feminino", area: "esporte", tag: "Quadra",
    nome: "Voleibol Feminino", foto: img("esporte-1.jpg"),
    resumo: "Treinos gratuitos para meninas de 8 a 17 anos.",
    texto: "Cerca de 40 alunas, com bolsistas monitores, uniformes e material esportivo fornecidos pelo Instituto e acompanhamento psicossocial.",
    publico: "Meninas de 8 a 17 anos", local: "Quadra Anadir Barone (fundos do CMEI Jair Giestas)",
    horarios: ["Quintas, 18h às 20h"],
  },
  {
    id: "voleibol-misto", area: "esporte", tag: "OAB/CAAES",
    nome: "Voleibol Misto", foto: img("esporte-2.jpg"),
    resumo: "Vôlei para adultos em parceria com a OAB e a CAAES.",
    texto: "Voltado ao público adulto — advogados filiados à OAB e comunidade em geral. Expandido para Venda Nova do Imigrante.",
    publico: "Adultos", local: "Afonso Cláudio e Venda Nova do Imigrante",
    horarios: ["VNI: segundas e quintas, 20h"],
  },
  {
    id: "hidroginastica", area: "esporte", tag: "Novo · 60+",
    nome: "Hidroginástica 60+", foto: `${SITE}/blog/uploads/hidroginastica-60-inscricoes-abertas-para-aulas-gratuitas-em-afonso-claudio/capa-6ac95b1b2da94.jpeg`,
    resumo: "Aulas gratuitas para pessoas com 60 anos ou mais. Inscrições abertas!",
    texto: "Primeira vez que o Instituto oferece a modalidade, pelo Centro de Treinamento das Montanhas: exercício seguro, acompanhado e gratuito para a terceira idade.",
    publico: "Pessoas com 60 anos ou mais", local: "A confirmar",
    horarios: ["Inscrições abertas desde 09/10"], novo: true,
  },
];

// Agenda ilustrativa para o protótipo.
const AGENDA = [
  { data: "2026-10-22", hora: "18:00", titulo: "Treino Voleibol Feminino", local: "Quadra Anadir Barone", tipo: "aula" },
  { data: "2026-10-24", hora: "09:00", titulo: "Ensaio geral — Orquestra Jônice Tristão", local: "Sede do Instituto", tipo: "ensaio" },
  { data: "2026-10-31", hora: "—", titulo: "Encerramento das inscrições — Hidroginástica 60+", local: "Secretaria", tipo: "aviso" },
  { data: "2026-11-07", hora: "19:30", titulo: "Concerto de Rock em benefício do Instituto", local: "A definir", tipo: "evento" },
  { data: "2026-11-14", hora: "08:00", titulo: "Supercopa de Voleibol", local: "Ginásio municipal", tipo: "evento" },
  { data: "2026-11-21", hora: "19:00", titulo: "VIJAZZ — Festival de música instrumental", local: "Praça central", tipo: "evento" },
  { data: "2026-11-28", hora: "14:00", titulo: "Reunião de pais e responsáveis", local: "Sede do Instituto", tipo: "aviso" },
  { data: "2026-12-19", hora: "19:00", titulo: "Cantata de Natal — Corais das Montanhas", local: "Igreja Matriz", tipo: "evento" },
];

const LINHA_DO_TEMPO = [
  { ano: 2021, marcos: ["Fundação do Instituto — 16 de agosto"] },
  { ano: 2022, marcos: ["Primeiros projetos nas escolas: 100 atendidos"] },
  { ano: 2024, marcos: ["1º projeto aprovado na LICC", "Utilidade Pública Municipal — Lei nº 2.617/2024"] },
  { ano: 2025, marcos: ["Pioneiro na região pela Lei Rouanet", "Utilidade Pública Estadual — Lei nº 12.580/2025", "Inscrição no CMDCA"] },
  { ano: 2026, marcos: ["Ponto de Cultura — Ministério da Cultura"] },
];

// Perfil fictício para demonstrar a área do aluno.
const ALUNO_DEMO = {
  nome: "Aluno(a) Exemplo",
  matricula: "ICM-2026-0147",
  projeto: "Orquestra Jônice Tristão",
  turma: "Violino — Elementar B",
  professor: "Prof. de Violino",
  frequencia: 92,
  presencas: 23, faltas: 2,
  proximas: [
    { dia: "Qua", data: "22/10", hora: "14:00", aula: "Violino — Elementar B" },
    { dia: "Sáb", data: "24/10", hora: "09:00", aula: "Ensaio geral da orquestra" },
    { dia: "Qua", data: "29/10", hora: "14:00", aula: "Violino — Elementar B" },
  ],
  mensal: [ { m: "Jun", v: 88 }, { m: "Jul", v: 95 }, { m: "Ago", v: 90 }, { m: "Set", v: 100 }, { m: "Out", v: 92 } ],
  avisos: [
    { titulo: "Van: novo horário de saída", texto: "A partir de segunda, a van sai do Centro às 13h20.", quando: "há 2 dias" },
    { titulo: "Uniforme da orquestra", texto: "Traga a camisa preta para o ensaio geral de sábado.", quando: "há 4 dias" },
  ],
};

const CATEGORIAS = {
  geral: "Instituto", "artes-marciais": "Artes Marciais", basquete: "Basquete",
  "corais-das-montanhas": "Corais", "ensino-instrumentos": "Instrumentos",
  "futebol-de-campo": "Futebol", futsal: "Futsal",
  "musica-classica-nas-montanhas": "Música Clássica", "musicalizacao-agricola": "Musicalização Agrícola",
  "musicalizacao-infantil": "Musicalização Infantil", "orquestra-de-viola": "Orquestra de Viola",
  "orquestra-jonice-tristao": "Orquestra Jônice Tristão", scfv: "SCFV", "sons-e-sonhos": "Sons e Sonhos",
  voleibol: "Voleibol", "voleibol-feminino": "Vôlei Feminino", "voleibol-misto": "Vôlei Misto",
};

/* ---------- Turmas (dias: 0=dom … 6=sáb). Horários ilustrativos, exceto vôlei. ---------- */
const TURMAS = [
  { id: "ojt-violino-b", projeto: "orquestra-jonice-tristao", nome: "Violino — Elementar B", dias: [1, 3], inicio: "14:00", fim: "15:30", local: "Sede do Instituto · Sala 2", professor: "Prof. Flávio Henrique", vagas: 4 },
  { id: "ojt-cello", projeto: "orquestra-jonice-tristao", nome: "Violoncelo e Contrabaixo", dias: [2, 4], inicio: "14:00", fim: "15:30", local: "Sede do Instituto · Sala 3", professor: "Prof. Adriel Natan", vagas: 2 },
  { id: "ojt-ensaio", projeto: "orquestra-jonice-tristao", nome: "Ensaio geral da orquestra", dias: [6], inicio: "09:00", fim: "11:00", local: "Sede do Instituto · Salão", professor: "Maestro Marcelo Dutra", vagas: 0, ensaio: true },
  { id: "viola-caipira", projeto: "orquestra-de-viola", nome: "Viola caipira", dias: [5], inicio: "15:00", fim: "17:00", local: "Sede do Instituto", professor: "Prof. Beto Calil", vagas: 6 },
  { id: "musi-infantil", projeto: "musicalizacao-infantil", nome: "Musicalização 4 a 6 anos", dias: [2], inicio: "09:00", fim: "10:00", local: "Sede do Instituto · Sala 1", professor: "Equipe de musicalização", vagas: 5 },
  { id: "coral-infantil", projeto: "corais-das-montanhas", nome: "Coral Infantil", dias: [3], inicio: "15:30", fim: "17:00", local: "Sede do Instituto · Salão", professor: "Profa. Vanderleia", vagas: 8 },
  { id: "coro-jovem", projeto: "corais-das-montanhas", nome: "Coro Jovem", dias: [4], inicio: "18:30", fim: "20:00", local: "Sede do Instituto · Salão", professor: "Regência do Coro Jovem", vagas: 6 },
  { id: "piano", projeto: "corais-das-montanhas", nome: "Piano", dias: [1], inicio: "16:00", fim: "17:00", local: "Sede do Instituto · Sala 4", professor: "Prof. Vanderson", vagas: 1 },
  { id: "sopros-rural", projeto: "musicalizacao-agricola", nome: "Sopros — núcleo rural", dias: [2, 4], inicio: "08:00", fim: "10:00", local: "Núcleo rural (conforme a comunidade)", professor: "Equipe de sopros", vagas: 7 },
  { id: "jiu-jitsu", projeto: "artes-marciais", nome: "Jiu-jitsu", dias: [1, 3], inicio: "08:30", fim: "10:00", local: "Sede do Instituto · Tatame", professor: "Equipe de artes marciais", vagas: 5 },
  { id: "volei-fem", projeto: "voleibol-feminino", nome: "Vôlei Feminino (8 a 17 anos)", dias: [4], inicio: "18:00", fim: "20:00", local: "Quadra Anadir Barone", professor: "Prof. Felipe", vagas: 3 },
  { id: "volei-vni", projeto: "voleibol-misto", nome: "Vôlei Misto — Venda Nova", dias: [1, 4], inicio: "20:00", fim: "21:30", local: "Venda Nova do Imigrante", professor: "Prof. Gabriel Bozzi", vagas: 4 },
  { id: "hidro-60", projeto: "hidroginastica", nome: "Hidroginástica 60+", dias: [2, 5], inicio: "07:30", fim: "08:30", local: "A confirmar", professor: "Centro de Treinamento", vagas: 20 },
];

/* ---------- Calendário letivo 2026 (proposta — confirmar com a coordenação) ---------- */
const CALENDARIO_LETIVO = [
  { inicio: "2026-01-01", titulo: "Confraternização Universal", tipo: "feriado" },
  { inicio: "2026-02-16", fim: "2026-02-18", titulo: "Carnaval — sem aulas", tipo: "feriado" },
  { inicio: "2026-02-23", titulo: "Início do 1º semestre", tipo: "marco" },
  { inicio: "2026-04-03", titulo: "Sexta-feira Santa", tipo: "feriado" },
  { inicio: "2026-04-13", titulo: "Nossa Senhora da Penha (ES)", tipo: "feriado" },
  { inicio: "2026-04-21", titulo: "Tiradentes", tipo: "feriado" },
  { inicio: "2026-05-01", titulo: "Dia do Trabalho", tipo: "feriado" },
  { inicio: "2026-06-04", titulo: "Corpus Christi", tipo: "feriado" },
  { inicio: "2026-07-10", titulo: "Fim do 1º semestre", tipo: "marco" },
  { inicio: "2026-07-13", fim: "2026-07-24", titulo: "Recesso de julho", tipo: "recesso" },
  { inicio: "2026-07-27", titulo: "Início do 2º semestre", tipo: "marco" },
  { inicio: "2026-08-16", titulo: "Aniversário do Instituto", tipo: "marco" },
  { inicio: "2026-09-07", titulo: "Independência do Brasil", tipo: "feriado" },
  { inicio: "2026-10-12", titulo: "Nossa Senhora Aparecida", tipo: "feriado" },
  { inicio: "2026-11-02", titulo: "Finados", tipo: "feriado" },
  { inicio: "2026-11-20", titulo: "Consciência Negra", tipo: "feriado" },
  { inicio: "2026-11-28", titulo: "Reunião de pais e responsáveis", tipo: "reuniao" },
  { inicio: "2026-12-11", titulo: "Fim do 2º semestre", tipo: "marco" },
  { inicio: "2026-12-14", fim: "2026-12-31", titulo: "Férias", tipo: "recesso" },
  { inicio: "2026-12-25", titulo: "Natal", tipo: "feriado" },
];

/* ---------- Apresentações (as realizadas vêm das notícias do site) ---------- */
const APRESENTACOES = [
  { data: "2026-05-19", titulo: "Orquestra de Sopros na Festa do Afonsoclaudense Ausente", grupo: "Orquestra de Sopros", local: "Afonso Cláudio" },
  { data: "2026-06-25", titulo: "Coro Jovem na feira livre", grupo: "Coro Jovem das Montanhas", local: "Feira livre de Afonso Cláudio" },
  { data: "2026-07-04", titulo: "1º Festival de Cordas das Montanhas", grupo: "Orquestra Jônice Tristão", local: "Afonso Cláudio" },
  { data: "2026-07-04", titulo: "IV Encontro de Coros Vale Música", grupo: "Coral Infantil e Coro Jovem", local: "Vale Música" },
  { data: "2026-07-18", titulo: "31º Festival Internacional de Inverno", grupo: "Orquestra de Sopros", local: "Domingos Martins" },
  { data: "2026-09-12", titulo: "Conecta Sicoob — Parque do China", grupo: "Orquestra Jônice Tristão", local: "Domingos Martins" },
  { data: "2026-11-07", hora: "19:30", titulo: "Concerto de Rock em benefício do Instituto", grupo: "AFC 5 e convidados", local: "A definir" },
  { data: "2026-11-21", hora: "19:00", titulo: "VIJAZZ — música instrumental nas montanhas", grupo: "Alunos e convidados", local: "Praça Aderbal Galvão" },
  { data: "2026-12-12", hora: "18:00", titulo: "Concerto de fim de ano", grupo: "Orquestra Jônice Tristão", local: "Sede do Instituto" },
  { data: "2026-12-19", hora: "19:00", titulo: "Cantata de Natal", grupo: "Corais das Montanhas", local: "Igreja Matriz" },
];

/* ---------- Montanhas e território ---------- */
const MONTANHAS = [
  { nome: "Três Pontões", texto: "Conjunto de pontões rochosos de Afonso Cláudio que dá nome à razão social do Instituto — Instituto Três Pontões de Ação Social e Cultural." },
  { nome: "Pedra do Gato", texto: "Um dos marcos das montanhas de Afonso Cláudio, cenário do vídeo institucional gravado pelo Coro Jovem das Montanhas em 2026." },
  { nome: "Região Serrana", texto: "Afonso Cláudio fica nas montanhas capixabas, entre vales, pontões e comunidades rurais. Muitos alunos vêm da zona rural — por isso a van gratuita." },
];

const PARCEIROS = ["Grupo Tristão", "Fundação Jônice Tristão", "EDP Espírito Santo", "OAB / CAAES", "Ifes Campus Vitória", "Ministério da Cultura", "Secult-ES", "CRAS Afonso Cláudio", "Grupo Coroa"];

const BAIRROS_ATENDIDOS = [["São Vicente", 76], ["Grama", 58], ["Colina do Cruzeiro", 57], ["Centro", 42], ["Zona Rural", 41], ["Campo 21", 26], ["Campo 20", 25], ["Vila Nova", 23]];
