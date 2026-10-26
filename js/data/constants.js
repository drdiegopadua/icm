/* Domínios fixos do sistema */
(function () {
  window.ICM = window.ICM || {};

  ICM.C = {
    ORG: {
      nome: 'Instituto Cultural das Montanhas',
      razao: 'Instituto Cultural das Montanhas (ICM)',
      cnpj: '00.000.000/0001-00',
      cidade: 'Sua Cidade — UF'
    },

    AREAS: {
      cultura: { nome: 'Cultura', cor: '#8b5cf6', icon: 'music' },
      esporte: { nome: 'Esporte', cor: '#f97316', icon: 'ball' },
      meio_ambiente: { nome: 'Meio Ambiente', cor: '#10b981', icon: 'leaf' },
      educacao: { nome: 'Educação', cor: '#3b82f6', icon: 'school' },
      saude: { nome: 'Saúde', cor: '#ec4899', icon: 'heartPulse' }
    },

    PAPEIS: {
      admin: { nome: 'Administrador', desc: 'Acesso total, inclusive usuários e auditoria' },
      coordenacao: { nome: 'Coordenação', desc: 'Projetos, turmas, alunos, eventos e relatórios' },
      secretaria: { nome: 'Secretaria / Social', desc: 'Matrículas e cadastro completo dos alunos' },
      professor: { nome: 'Professor(a)', desc: 'Somente as próprias turmas e seus alunos' }
    },

    // Matriz de permissões (espelhada nas políticas RLS do Supabase — ver supabase/schema.sql)
    PERMISSOES: {
      'chat.grupos': ['admin', 'coordenacao'],
      'alunos.ver_todos': ['admin', 'coordenacao', 'secretaria'],
      'alunos.editar': ['admin', 'coordenacao', 'secretaria'],
      'alunos.sensivel': ['admin', 'coordenacao', 'secretaria'],
      'projetos.editar': ['admin', 'coordenacao'],
      'turmas.editar': ['admin', 'coordenacao'],
      'turmas.alunos': ['admin', 'coordenacao', 'secretaria'],
      'aulas.registrar': ['admin', 'coordenacao', 'professor'],
      'ocorrencias.registrar': ['admin', 'coordenacao', 'secretaria', 'professor'],
      'eventos.editar': ['admin', 'coordenacao'],
      'relatorios.gerais': ['admin', 'coordenacao'],
      'usuarios.gerenciar': ['admin'],
      'auditoria.ver': ['admin'],
      'patrimonio.editar': ['admin', 'coordenacao'],
      'patrimonio.emprestar': ['admin', 'coordenacao', 'secretaria'],
      'patrimonio.valores': ['admin', 'coordenacao', 'secretaria'],
      'espera.gerir': ['admin', 'coordenacao', 'secretaria'],
      'reunioes.gerir': ['admin', 'coordenacao', 'secretaria'],
      'voluntarios.gerir': ['admin', 'coordenacao'],
      'certificados.emitir': ['admin', 'coordenacao', 'secretaria'],
      'doadores.gerir': ['admin', 'coordenacao'],
      'associados.gerir': ['admin', 'coordenacao', 'secretaria'],
      'pesquisas.gerir': ['admin', 'coordenacao'],
      'agenda.reservar': ['admin', 'coordenacao', 'secretaria', 'professor'],
      'agenda.gerir': ['admin', 'coordenacao'],
      'estoque.ver': ['admin', 'coordenacao', 'secretaria', 'professor'],
      'estoque.movimentar': ['admin', 'coordenacao', 'secretaria'],
      'estoque.editar': ['admin', 'coordenacao'],
      'equipe.gerir': ['admin', 'coordenacao'],
      'equipe.salarios': ['admin'],
      'avisos.enviar': ['admin', 'coordenacao', 'secretaria', 'professor'],
      'avisos.modelos': ['admin', 'coordenacao'],
      'assinaturas.solicitar': ['admin', 'coordenacao', 'secretaria'],
      'governanca.gerir': ['admin'],
      'governanca.ver': ['admin', 'coordenacao'],
      'importar.dados': ['admin', 'coordenacao'],
      'docinst.ver': ['admin', 'coordenacao', 'secretaria'],
      'docinst.gerir': ['admin', 'coordenacao'],
      'financeiro.ver': ['admin', 'coordenacao'],
      'financeiro.lancar': ['admin', 'coordenacao'],
      'financeiro.aprovar': ['admin'],
      'compras.solicitar': ['admin', 'coordenacao', 'secretaria', 'professor'],
      'compras.cotar': ['admin', 'coordenacao', 'secretaria'],
      'compras.aprovar': ['admin'],
      'campanhas.gerir': ['admin', 'coordenacao'],
      'social.gerir': ['admin', 'coordenacao', 'secretaria'],
      'avaliacoes.registrar': ['admin', 'coordenacao', 'professor'],
      'backup.exportar': ['admin'],
      'privacidade.gerir': ['admin']
    },

    // Documentos da instituição — validade padrão (dias) e onde emitir
    DOCS_INST: {
      cnd_federal: { nome: 'CND Federal (Receita/PGFN)', dias: 180, repasse: true, link: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir' },
      crf_fgts: { nome: 'CRF — Regularidade do FGTS', dias: 30, repasse: true, link: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf' },
      cndt: { nome: 'CNDT — Débitos Trabalhistas', dias: 180, repasse: true, link: 'https://cndt-certidao.tst.jus.br/inicio.faces' },
      cnd_estadual: { nome: 'CND Estadual', dias: 90, repasse: true, link: '' },
      cnd_municipal: { nome: 'CND Municipal', dias: 90, repasse: true, link: '' },
      cepim: { nome: 'Consulta CEPIM (entidades impedidas)', dias: 30, repasse: true, link: 'https://portaldatransparencia.gov.br/sancoes/cepim' },
      cnpj: { nome: 'Cartão CNPJ', dias: 0, repasse: false, link: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp' },
      alvara: { nome: 'Alvará de funcionamento', dias: 365, repasse: false, link: '' },
      avcb: { nome: 'AVCB — Corpo de Bombeiros', dias: 1095, repasse: false, link: '' },
      sanitaria: { nome: 'Licença sanitária', dias: 365, repasse: false, link: '' },
      cmdca: { nome: 'Registro no CMDCA', dias: 1460, repasse: true, link: '' },
      cmas: { nome: 'Inscrição no CMAS', dias: 0, repasse: false, link: '' },
      cebas: { nome: 'CEBAS', dias: 1095, repasse: false, link: '' },
      utilidade: { nome: 'Título de Utilidade Pública', dias: 0, repasse: false, link: '' },
      estatuto: { nome: 'Estatuto registrado em cartório', dias: 0, repasse: true, link: '' },
      ata_eleicao: { nome: 'Ata de eleição da diretoria atual', dias: 0, repasse: true, link: '' },
      outro: { nome: 'Outro documento', dias: 0, repasse: false, link: '' }
    },

    CATEGORIAS_ESTOQUE: {
      uniforme: { nome: 'Uniformes', cor: '#2563eb', icon: 'user' },
      didatico: { nome: 'Material didático', cor: '#8b5cf6', icon: 'book' },
      esportivo: { nome: 'Material esportivo', cor: '#f97316', icon: 'ball' },
      limpeza: { nome: 'Limpeza e higiene', cor: '#0891b2', icon: 'sparkles' },
      alimentacao: { nome: 'Alimentação / lanche', cor: '#10b981', icon: 'heart' },
      escritorio: { nome: 'Escritório', cor: '#64748b', icon: 'clipboard' },
      outro: { nome: 'Outros', cor: '#475569', icon: 'more' }
    },
    UNIDADES: ['un', 'par', 'pct', 'cx', 'resma', 'kg', 'L', 'rolo', 'kit'],

    VINCULOS: { clt: 'CLT', pj: 'PJ / MEI', rpa: 'Autônomo (RPA)', estagio: 'Estágio', bolsista: 'Bolsista', cedido: 'Cedido (parceiro/prefeitura)' },
    DOCS_EQUIPE: {
      rg: { nome: 'RG', validade: false }, cpf: { nome: 'CPF', validade: false }, ctps: { nome: 'Carteira de trabalho', validade: false },
      residencia: { nome: 'Comprovante de residência', validade: true },
      antecedentes: { nome: 'Certidão de antecedentes criminais', validade: true, obrig: true },
      aso: { nome: 'ASO — atestado de saúde ocupacional', validade: true },
      registro: { nome: 'Registro profissional (CREF, CRP…)', validade: true },
      diploma: { nome: 'Diploma / certificado de formação', validade: false },
      contrato: { nome: 'Contrato assinado', validade: false },
      pis: { nome: 'PIS / NIS', validade: false },
      titulo: { nome: 'Título de eleitor', validade: false },
      reservista: { nome: 'Certificado de reservista', validade: false },
      bancario: { nome: 'Comprovante da conta bancária', validade: false },
      outro: { nome: 'Outro documento', validade: true }
    },
    // ---------- Financeiro ----------
    RUBRICAS: {
      pessoal: 'Pessoal e encargos', servicos_pf: 'Serviços de terceiros — PF', servicos_pj: 'Serviços de terceiros — PJ',
      material_consumo: 'Material de consumo', material_permanente: 'Equipamentos e material permanente', alimentacao: 'Alimentação',
      transporte: 'Transporte e deslocamento', comunicacao: 'Comunicação e divulgação', administrativas: 'Despesas administrativas (água, luz, internet, aluguel)',
      tarifas: 'Tarifas bancárias', impostos: 'Impostos e taxas', outras: 'Outras despesas'
    },
    CATEGORIAS_RECEITA: {
      repasse: 'Repasse de parceria / convênio', incentivo: 'Captação via lei de incentivo', doacao_pf: 'Doação — pessoa física', doacao_pj: 'Doação — empresa / fundação',
      mensalidade: 'Contribuição de associados', evento: 'Eventos e bazar', rendimento: 'Rendimento de aplicação', outra: 'Outras receitas'
    },
    TIPOS_CONTA_FIN: { corrente: 'Conta corrente', especifica: 'Conta específica de parceria', aplicacao: 'Aplicação', caixa: 'Caixa (dinheiro)' },
    // Vida útil para depreciação linear (anos) — referência: tabela da Receita Federal (IN RFB 1.700/2017)
    VIDA_UTIL: { informatica: 5, climatizacao: 10, eletrodomestico: 10, audio_video: 5, instrumento: 10, esportivo: 5, jardinagem: 5, mobiliario: 10, outro: 10 },

    // ---------- Acompanhamento social e evolução ----------
    ORGAOS_REDE: ['CRAS', 'CREAS', 'Conselho Tutelar', 'UBS / Saúde', 'CAPS / CAPSi', 'Escola', 'Defensoria / Justiça', 'Assistência jurídica', 'Outro'],
    STATUS_ENCAMINHAMENTO: { enviado: ['Enviado', 'warn'], atendimento: ['Em atendimento', ''], concluido: ['Concluído', 'ok'], sem_retorno: ['Sem retorno', 'danger'] },
    AREAS_PIA: ['Convivência familiar', 'Escolar', 'Saúde', 'Socioeconômica', 'Desenvolvimento pessoal', 'Proteção / direitos', 'Projeto de vida'],
    COMPETENCIAS: {
      assiduidade: 'Assiduidade e pontualidade', tecnica: 'Habilidade técnica na modalidade', convivencia: 'Convivência e respeito',
      autonomia: 'Autonomia e responsabilidade', escola: 'Desempenho escolar', autoestima: 'Autoestima e confiança', cooperacao: 'Trabalho em equipe'
    },
    MOMENTOS_AVALIACAO: { inicial: 'Inicial', intermediaria: 'Intermediária', final: 'Final' },

    TIPOS_CONTA: { corrente: 'Conta corrente', poupanca: 'Conta poupança', pagamento: 'Conta de pagamento' },
    TIPOS_PIX: { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' },

    TIPOS_ATA: {
      ago: 'Assembleia Geral Ordinária', age: 'Assembleia Geral Extraordinária', diretoria: 'Reunião de Diretoria',
      fiscal: 'Conselho Fiscal', consultivo: 'Conselho Consultivo'
    },
    ORGAOS: { diretoria: 'Diretoria', fiscal: 'Conselho Fiscal', consultivo: 'Conselho Consultivo' },
    CATEGORIAS_ASSOCIADO: { fundador: 'Fundador', efetivo: 'Efetivo', contribuinte: 'Contribuinte', honorario: 'Honorário' },

    DOCS_ASSINATURA: {
      matricula: 'Ficha de matrícula e declaração do responsável',
      lgpd: 'Termo de consentimento — LGPD',
      imagem: 'Autorização de uso de imagem e voz',
      emprestimo: 'Termo de empréstimo de bem'
    },

    // Modelos de mensagem do WhatsApp — {campos} são preenchidos automaticamente
    MODELOS_WHATSAPP: {
      falta_alerta: 'Olá, {responsavel}! Aqui é do {org}. 💙 Notamos que {aluno} teve {faltas} faltas em {mes} na turma {turma}. Está tudo bem? A presença é muito importante para o desenvolvimento dele(a). Se houver alguma dificuldade, conte com a gente!',
      falta_desligamento: 'Olá, {responsavel}! Aqui é do {org}. {aluno} chegou a {faltas} faltas em {mes} na turma {turma}. Pela regra do projeto, a partir de 3 faltas a vaga pode ser liberada para outra criança da lista de espera. Precisamos conversar — qual o melhor horário para você?',
      reuniao: 'Olá, {responsavel}! O {org} convida você para a reunião "{titulo}" no dia {data}, às {hora}, em {local}. Sua presença é muito importante! 🙏',
      evento: 'Olá, {responsavel}! {aluno} vai participar de "{titulo}" no dia {data}, às {hora}, em {local}. Contamos com vocês! 🎉',
      mensalidade: 'Olá, {responsavel}! Aqui é do {org}. A contribuição associativa de {competencia} ({valor}) está em aberto desde {vencimento}. Você pode regularizar na secretaria ou por PIX. Obrigado por fazer parte! 💙',
      portal: 'Olá, {responsavel}! Acompanhe {aluno} pelo Portal da Família do {org}: {link}\nMatrícula: {matricula}\nCódigo de acesso: {codigo}\n(Não compartilhe este código.)',
      assinatura: 'Olá, {responsavel}! O {org} enviou documento(s) de {aluno} para você assinar pelo celular: {link}\nLeva menos de 2 minutos. 📝',
      aniv_aluno: 'Olá, {responsavel}! Hoje é um dia especial: {aluno} completa {idade} anos! 🎉 Toda a equipe do {org} deseja muitas felicidades, saúde e conquistas. Parabéns! 🎂💙',
      aniv_equipe: 'Parabéns, {nome}! 🎉 Toda a equipe do {org} deseja um feliz aniversário, muita saúde e alegria. Obrigado por fazer parte desta história! 🎂',
      aniv_voluntario: 'Feliz aniversário, {nome}! 🎉 Seu trabalho voluntário transforma vidas no {org}. Que seu novo ciclo seja cheio de alegria! 🎂💙',
      aniv_associado: 'Olá, {nome}! O {org} deseja um feliz aniversário! 🎉 Obrigado por caminhar com a gente como associado(a). 🎂',
      agradecimento_doacao: 'Olá, {nome}! 💙 Recebemos sua doação de {valor} para {destino}. Muito obrigado! Graças a pessoas como você, crianças e adolescentes do {org} têm acesso a cultura, esporte e educação. Seu recibo: {recibo}.',
      lembrete_recorrente: 'Olá, {nome}! Obrigado por ser doador(a) mensal do {org}. 💙 Segue o Pix para a doação deste mês ({valor}): {pix}\nSe preferir pausar, é só responder esta mensagem.',
      aniv_doador:'Feliz aniversário, {nome}! 🎉 O {org} agradece por apoiar nossas crianças e adolescentes. Desejamos um ano cheio de alegria! 🎂💙',
      aniv_patrocinador:'Olá, {nome}! Hoje celebramos {anos} de parceria com o {org}! 🎉 Graças ao seu apoio, crianças e adolescentes têm acesso a cultura, esporte e educação. Muito obrigado! 💙'
    },

    // Triagem socioeconômica (pontuação transparente — ajustável em Configurações futuramente)
    SALARIO_MINIMO: 1412,
    TRIAGEM: {
      renda: [{ ate: 0.25, pts: 30, txt: 'Renda per capita até ¼ do salário mínimo' }, { ate: 0.5, pts: 20, txt: 'Renda per capita até ½ salário mínimo' }, { ate: 1, pts: 10, txt: 'Renda per capita até 1 salário mínimo' }],
      cadunico: { pts: 10, txt: 'Família inscrita no CadÚnico' },
      beneficio: { pts: 5, txt: 'Recebe benefício social' },
      escola_publica: { pts: 10, txt: 'Estuda em escola pública' },
      encaminhamento: { pts: 10, txt: 'Encaminhado pela rede (CRAS, CREAS, Conselho Tutelar, escola, UBS)' },
      espera_mes: { pts: 1, max: 12, txt: '+1 ponto por mês de espera (máx. 12)' },
      vulnerabilidades: {
        monoparental: { pts: 5, txt: 'Família monoparental' },
        desemprego: { pts: 5, txt: 'Responsável desempregado' },
        inseguranca_alimentar: { pts: 10, txt: 'Insegurança alimentar' },
        pcd: { pts: 10, txt: 'Pessoa com deficiência na família' },
        violencia: { pts: 15, txt: 'Violência doméstica / medida protetiva' },
        trabalho_infantil: { pts: 15, txt: 'Risco de trabalho infantil' },
        acolhimento: { pts: 15, txt: 'Situação de rua, abrigo ou acolhimento' },
        evasao_escolar: { pts: 10, txt: 'Risco de evasão escolar' }
      }
    },
    ENCAMINHAMENTOS: ['', 'CRAS', 'CREAS', 'Conselho Tutelar', 'Escola', 'UBS / Saúde', 'Outro'],

    TIPOS_CERTIFICADO: {
      conclusao: { nome: 'Conclusão de curso / turma', cor: '#2563eb' },
      participacao: { nome: 'Participação em evento', cor: '#8b5cf6' },
      voluntariado: { nome: 'Trabalho voluntário', cor: '#10b981' },
      destaque: { nome: 'Mérito / destaque', cor: '#f59e0b' },
      outro: { nome: 'Outro', cor: '#64748b' }
    },

    TIPOS_DOACAO: { dinheiro: 'Dinheiro', bens: 'Bens / materiais', servicos: 'Serviços' },
    FORMAS_PAGTO: ['PIX', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro (espécie)', 'Débito automático'],

    PERGUNTAS_PADRAO: {
      familias: [
        { tipo: 'nps', texto: 'De 0 a 10, quanto você recomendaria o Instituto a outra família?' },
        { tipo: 'escala', texto: 'Satisfação com as aulas e atividades' },
        { tipo: 'escala', texto: 'Atendimento da equipe e comunicação com a família' },
        { tipo: 'escala', texto: 'Percebeu mudança positiva no comportamento ou na escola do seu filho(a)?' },
        { tipo: 'texto', texto: 'Sugestões ou comentários' }
      ],
      alunos: [
        { tipo: 'escala', texto: 'O quanto você gosta das aulas?' },
        { tipo: 'escala', texto: 'Você se sente acolhido(a) pelos professores e colegas?' },
        { tipo: 'sim_nao', texto: 'Você aprendeu algo novo este ano?' },
        { tipo: 'nps', texto: 'De 0 a 10, quanto você indicaria o Instituto para um amigo?' },
        { tipo: 'texto', texto: 'O que podemos melhorar?' }
      ]
    },

    CATEGORIAS_PAT: {
      informatica: { nome: 'Informática', icon: 'grid', cor: '#2563eb' },
      climatizacao: { nome: 'Climatização', icon: 'sun', cor: '#0891b2' },
      eletrodomestico: { nome: 'Eletrodomésticos', icon: 'home', cor: '#64748b' },
      audio_video: { nome: 'Áudio e vídeo', icon: 'mic', cor: '#7c3aed' },
      instrumento: { nome: 'Instrumentos musicais', icon: 'music', cor: '#8b5cf6' },
      esportivo: { nome: 'Material esportivo', icon: 'ball', cor: '#f97316' },
      jardinagem: { nome: 'Ferramentas e jardinagem', icon: 'leaf', cor: '#10b981' },
      mobiliario: { nome: 'Mobiliário', icon: 'building', cor: '#a16207' },
      outro: { nome: 'Outros', icon: 'more', cor: '#475569' }
    },

    ESTADOS_PAT: { novo: 'Novo', bom: 'Bom', regular: 'Regular', ruim: 'Ruim', inservivel: 'Inservível' },

    SITUACAO_PAT: {
      ativo: { nome: 'Em uso', cls: 'ok' },
      manutencao: { nome: 'Em manutenção', cls: 'warn' },
      baixado: { nome: 'Baixado', cls: 'neutral' }
    },

    TIPOS_TOMADOR: { aluno: 'Aluno(a)', colaborador: 'Colaborador(a)', terceiro: 'Terceiro (pessoa ou instituição)' },

    STATUS_ALUNO: {
      ativo: { nome: 'Ativo', cls: 'ok' },
      espera: { nome: 'Lista de espera', cls: 'neutral' },
      inativo: { nome: 'Inativo', cls: 'warn' },
      desligado: { nome: 'Desligado', cls: 'danger' }
    },

    STATUS_PROJETO: {
      planejamento: { nome: 'Em planejamento', cls: 'neutral' },
      execucao: { nome: 'Em execução', cls: 'ok' },
      prestacao: { nome: 'Prestação de contas', cls: 'warn' },
      encerrado: { nome: 'Encerrado', cls: 'neutral' }
    },

    FONTES: {
      publica_federal: 'Recurso público federal',
      publica_estadual: 'Recurso público estadual',
      publica_municipal: 'Recurso público municipal',
      lei_incentivo: 'Lei de incentivo fiscal',
      emenda: 'Emenda parlamentar',
      privada: 'Recurso privado / doação',
      propria: 'Recursos próprios'
    },

    TIPOS_EVENTO: {
      evento: { nome: 'Evento', cor: '#2563eb', icon: 'star' },
      apresentacao: { nome: 'Apresentação', cor: '#8b5cf6', icon: 'music' },
      campeonato: { nome: 'Campeonato', cor: '#f97316', icon: 'trophy' },
      masterclass: { nome: 'Masterclass', cor: '#0891b2', icon: 'mic' },
      participacao: { nome: 'Participação externa', cor: '#059669', icon: 'flag' },
      acao: { nome: 'Ação social', cor: '#ec4899', icon: 'heart' }
    },

    TIPOS_OCORRENCIA: {
      advertencia: { nome: 'Advertência', cls: 'danger', icon: 'alert' },
      ocorrencia: { nome: 'Ocorrência', cls: 'warn', icon: 'info' },
      elogio: { nome: 'Elogio / destaque', cls: 'ok', icon: 'award' },
      atendimento: { nome: 'Atendimento social', cls: 'neutral', icon: 'heart' }
    },

    MOTIVOS_SAIDA: ['Desistência', 'Excesso de faltas', 'Mudança de endereço', 'Conflito de horário escolar', 'Transferência de turma', 'Questões de saúde', 'Idade fora da faixa', 'Outro'],

    DIAS_SEMANA: [{ v: 1, n: 'Seg' }, { v: 2, n: 'Ter' }, { v: 3, n: 'Qua' }, { v: 4, n: 'Qui' }, { v: 5, n: 'Sex' }, { v: 6, n: 'Sáb' }, { v: 0, n: 'Dom' }],

    // Regra de assiduidade (configurável em Configurações)
    ASSIDUIDADE: { alerta: 2, desligamento: 3, periodo: 'mes' }
  };
})();
