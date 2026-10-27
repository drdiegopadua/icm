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
- **Financeiro por projeto**: contas a pagar e receber, rubricas, **rateio** entre projetos, comprovante anexado, importação de **NF-e (XML)**, orçamento **previsto × realizado** por rubrica com alerta de estouro, conta específica por parceria (Lei 13.019) e **conciliação bancária** por extrato OFX/CSV. Relatórios de execução financeira, fluxo de caixa e contas em aberto.
- **Compras**: pedido → **3 orçamentos** → mapa comparativo → aprovação (justificativa obrigatória se não for o menor preço) → conta a pagar gerada no Financeiro. Cadastro de fornecedores. **Depreciação** automática do patrimônio.
- **Arrecadação online**: campanhas com meta e termômetro, **página pública de doação** (`#/doar`) com **Pix copia e cola e QR Code** (padrão BR Code do Banco Central), confirmação que gera doador, recibo e receita, e mensagens de agradecimento e lembrete para doadores mensais.
- **Acompanhamento social**: **PIA** (Plano Individual de Atendimento), **encaminhamentos à rede** com retorno, pareceres e **avaliação de evolução** dos alunos (7 competências, de 1 a 5, inicial/intermediária/final), com relatório de resultados por projeto.
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
js/config.js            Endereço e chave PÚBLICA (anon) do Supabase
js/data/store.js        Armazenamento local (modo demonstração)
js/data/store-supabase.js Armazenamento no Supabase (mesma interface)
js/core/auth-supabase.js Login real: convite, primeiro acesso, esqueci a senha
supabase/icm_banco.sql  ⭐ Banco usado pelo sistema (rodar este no SQL Editor)
supabase/icm_v2_arquivos_2fa.sql  Atualização 2: pasta privada de arquivos + duas etapas obrigatórias
supabase/icm_v3_professor.sql  Atualização 3: campo "Também dá aulas" nos usuários
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

## Ligar o banco (uma vez só)

1. Supabase → **SQL Editor** → colar e rodar `supabase/icm_banco.sql` e, depois, `supabase/icm_v2_arquivos_2fa.sql` e `supabase/icm_v3_professor.sql`.
2. Supabase → **Authentication → URL Configuration**: Site URL e Redirect URLs = `https://drdiegopadua.github.io/icm/`.
3. Supabase → **Project Settings → API**: copiar a chave **anon public** para `supabaseKey` em `js/config.js`. **Nunca** a `service_role`.
4. Abrir o sistema → **Primeiro acesso? Criar minha senha** com o e-mail convidado no fim do SQL (o administrador).
5. Novos usuários: Administração → Novo usuário (vira convite). A pessoa entra em "Primeiro acesso" com esse e-mail.

Dados sensíveis (CPF, NIS, renda, saúde completa, endereço, conta bancária e salário) ficam em registros separados (`*_privado`), que o banco só entrega a quem tem permissão. Professor só vê alunos das próprias turmas.

## Fotos e anexos

Ficam no bucket **privado** `arquivos` do Supabase Storage, na pasta `<coleção>/<id do registro>/`. No banco fica só a referência; o sistema mostra cada arquivo por **link temporário de 1 hora**, e o banco só gera o link para quem pode ver o registro dono (o laudo de saúde segue a regra dos dados privados do aluno). Apagar o registro apaga os arquivos. Limite: 10 MB por arquivo.

## Verificação em duas etapas

Obrigatória para **Administrador** e para quem tiver "Exigir verificação em duas etapas" marcado em Usuários. No primeiro login aparece o QR Code para o Google/Microsoft Authenticator; depois, a cada login, pede o código de 6 dígitos. O banco só libera os dados com a sessão confirmada pelo código (não adianta burlar a tela).

Cadastre **dois aparelhos** (Configurações → Verificação em duas etapas). Perdeu o celular? Supabase → Authentication → Users → abrir a pessoa → apagar o fator (MFA) → ela cadastra de novo no próximo login.

## Próximos passos

1. Domínio próprio com HTTPS.
2. Backup automático diário.
