# ICM Sistema — Gestão da OSC

Sistema de gestão para a OSC que atua em **cultura, esporte, meio ambiente, educação e saúde**.
Fase atual: **protótipo funcional (design + funções)** com dados fictícios salvos no navegador.
Próximas fases: banco **Supabase** e repositório **GitHub**.

## Como abrir

Não precisa instalar nada. No Windows (PowerShell), dentro da pasta do projeto:

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Depois abra **http://localhost:5510**.

### Acessos de demonstração (dados fictícios)

Senha de todos: `icm@2026`. Também dá para entrar clicando nos botões de demonstração na tela de login.

| Perfil | E-mail | O que vê |
|---|---|---|
| Administrador | admin@icm.org | Tudo, inclusive usuários, configurações e auditoria |
| Coordenação | coordenacao@icm.org | Projetos, turmas, alunos, eventos e todos os relatórios |
| Secretaria / Social | secretaria@icm.org | Matrículas e cadastro completo (social, financeiro, saúde) |
| Professor | carlos@icm.org | Só as próprias turmas e a ficha de emergência dos alunos |

> Essas contas existem só no protótipo e serão apagadas na fase Supabase.

## O que já funciona

- **Menu no topo** com menus suspensos (Alunos, Pedagógico, Comunidade, Documentos, Gestão) e Chat. No celular vira um menu em lista. Os pontos vermelhos indicam pendências (faltas, empréstimos atrasados, documentos vencendo, mensagens não lidas).
- **Marca ICM animada** (letras-montanha que sobem e um brilho que percorre os picos), usada no login, no topo, nos relatórios e nos ícones do app. Original em `icone/`.
- **Chat da equipe**: grupos (Geral, Professores, Coordenação e secretaria; a coordenação cria e edita grupos) e mensagens diretas entre colegas, com contador de não lidas. Só usuários do sistema; famílias e alunos não têm acesso.
- **Login animado**: tema claro/escuro, bloqueio após tentativas erradas e logout automático após 15 min sem uso.
- **Matrícula em 6 etapas**: dados do aluno, responsável e endereço, social e financeiro, saúde, escolaridade, turmas e termos (LGPD e uso de imagem). O número de matrícula é gerado automaticamente.
- **Ficha do aluno** com as abas:
  - visão geral;
  - **linha do tempo** (matrícula, turmas, aulas, ocorrências, apresentações e campeonatos, passados e futuros);
  - turmas e frequência;
  - **calendário** de aulas e eventos;
  - advertências e ocorrências;
  - social e financeiro;
  - saúde;
  - escolaridade.
- **Projetos**: justificativa, objetivos, metas com indicadores calculados automaticamente, metodologia, contrapartidas, financiador, termo e valor.
- **Turmas** dentro de cada projeto:
  - incluir e retirar alunos, com motivo e histórico preservado;
  - **plano de aula**, **chamada** (P/F/J), **relatório da aula** e **fotos**;
  - mapa de frequência;
  - planejamento automático das aulas do mês.
- **Assiduidade**: 2 faltas no mês geram **alerta** e 3 faltas indicam **desligamento** (regra configurável). Os alertas aparecem no início, no menu e nos relatórios.
- **Eventos**: eventos, masterclasses, apresentações, campeonatos, participações externas e ações sociais, com alunos participantes, público, resultado e fotos.
- **Relatórios com geração animada**, cada um com código de autenticidade, para imprimir ou salvar em PDF:
  - mensal da turma (plano de aula, horas, professor, fotos, relatório e chamada de cada aula);
  - anual da turma;
  - do projeto por período, para prestação de contas: metas x resultados, perfil dos beneficiários, eventos e fotos;
  - anual do projeto;
  - de assiduidade;
  - **anual de atividades da OSC** (números de impacto e transparência dos recursos);
  - do evento;
  - ficha do aluno.
- **Patrimônio**:
  - inventário com tombo automático, categoria, quantidade (inclusive em lote, como 10 kimonos), local, estado, nota fiscal, valor e projeto de origem;
  - **empréstimos** a alunos, colaboradores ou terceiros, que só são liberados se houver unidade disponível;
  - **Termo de Empréstimo** gerado na saída e **Termo de Devolução e Recebimento** gerado na volta;
  - alerta de devoluções atrasadas;
  - registro de extravio, avaria, manutenção e baixa;
  - o empréstimo aparece na ficha e na linha do tempo do aluno, e o sistema avisa ao retirar da turma um aluno que ainda está com bens;
  - relatórios: inventário, empréstimos do período e bens por projeto (este também entra no relatório do projeto).
- **Lista de espera com triagem socioeconômica**:
  - pontuação automática e pública: renda per capita, CadÚnico, benefício, escola pública, encaminhamento da rede, 8 situações de vulnerabilidade e tempo de espera;
  - painel de vagas abertas com "chamar próximo da fila";
  - matrícula direta a partir da inscrição;
  - lista de classificação em PDF que identifica os candidatos só por protocolo e iniciais.
- **Reuniões de pais**: pauta, público (todas as famílias, um projeto ou uma turma), lista de presença, ata, encaminhamentos e fotos. Gera ata com lista para assinatura, e a presença da família entra na linha do tempo do aluno.
- **Voluntários**:
  - cadastro;
  - **Termo de Adesão (Lei 9.608/98)**;
  - lançamento de horas por atividade e projeto;
  - relatório de horas valoradas como contrapartida;
  - certificado.
- **Certificados** com **QR Code de verificação**:
  - emissão em lote para uma turma (só quem atingiu a frequência mínima), para os participantes de um evento, para voluntários ou avulsa;
  - página pública de verificação, que não exige login;
  - revogação.
- **Doadores e parceiros**:
  - pessoas físicas e empresas;
  - doações em dinheiro, bens ou serviços, com destinação por projeto;
  - **recibo de doação**;
  - **relatório de impacto para o doador**;
  - relatório de doações do período.
- **Associados**:
  - alunos fora do CadÚnico ficam vinculados a um associado (o responsável);
  - mensalidades geradas por competência, baixa de pagamento e recibo;
  - situação em dia ou inadimplente, com dias de atraso;
  - alerta de alunos sem CadÚnico ainda não associados;
  - selo na ficha do aluno.
- **Pesquisas de satisfação** (famílias e alunos):
  - modelos prontos, NPS, escala de 1 a 5, sim/não e comentários;
  - **modo totem** para responder num tablet, de forma anônima;
  - resultados com gráficos, que entram no relatório anual.
- **Agenda de espaços e insumos**:
  - grade semanal com os horários fixos das turmas e as reservas avulsas;
  - **bloqueio automático de choque de horário**, inclusive ao cadastrar turmas no mesmo espaço;
  - insumos ligados aos bens do patrimônio.
- O **relatório anual da OSC** passa a incluir NPS, reuniões e participação das famílias, horas voluntárias, certificados, doações privadas, famílias associadas e demanda da lista de espera.
- **Usuários e perfis de acesso**, com matriz de permissões, e **auditoria** de todas as ações.

## Estrutura

```
index.html              Página única (SPA) com política de segurança (CSP)
css/design-system.css   Cores, botões, campos, sombras, animações (estilo da referência)
css/app.css             Telas (login, menu, painéis, linha do tempo, calendário…)
css/report.css          Documento de relatório (tela + impressão/PDF)
js/core/                util, ícones, autenticação, componentes de interface
js/data/constants.js    Áreas, perfis, permissões, tipos de evento, regra de faltas
js/data/seed.js         Dados fictícios de demonstração
js/data/store.js        Armazenamento local  ← será trocado pelo Supabase
js/data/api.js          Regras de negócio + controle de acesso (as telas só usam isto)
js/pages/               Telas
js/reports/reports.js   Motor de relatórios
supabase/schema.sql     Banco completo com RLS, auditoria e bucket privado de fotos
supabase/schema-chat.sql Chat da equipe (canais, membros, mensagens, RLS e Realtime)
js/core/marca.js        Marca ICM em SVG (animada)
js/data/api-chat.js     Regras do chat · js/pages/chat.js  Tela do chat
docs/SEGURANCA.md       Plano de segurança e LGPD
tools/serve.ps1         Servidor local para testes
```

## Próximos passos

1. Criar o projeto no Supabase e rodar `supabase/schema.sql`, depois `supabase/schema-comunidade.sql` e `supabase/schema-chat.sql`.
2. Trocar `js/data/store.js` por um adaptador Supabase. A interface é a mesma, então as telas não mudam.
3. Login pelo Supabase Auth (convite por e-mail, redefinição de senha e MFA para a direção).
4. Mover as fotos para o bucket privado `fotos`, com links temporários.
5. Publicar pelo repositório GitHub, com hospedagem estática e domínio próprio com HTTPS.
