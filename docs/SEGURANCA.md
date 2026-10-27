# Segurança e LGPD — ICM Sistema

O sistema guarda dados de **crianças e adolescentes**, incluindo dados sensíveis (saúde, situação social e financeira, cor/raça). Pela LGPD (art. 11 e 14), esses dados exigem consentimento do responsável, finalidade clara e proteção reforçada.

## O que já está no protótipo

| Medida | Onde |
|---|---|
| Perfis de acesso (admin, coordenação, secretaria, professor) | `js/data/constants.js` → `PERMISSOES` |
| Professor só vê as próprias turmas e alunos | `js/data/api.js` (escopo do professor) |
| Dados social, financeiro e de saúde completos ocultos para professor; ele vê apenas a ficha de emergência | `sanitizeAluno()` em `api.js` |
| CPF mascarado para quem não tem permissão | `maskCPF()` |
| Registro de auditoria: login, logout, matrícula, edições, exclusões, visualização de dado sensível e relatórios | `api.audit()`, tela **Auditoria** |
| Logout automático após 30 min sem uso | `js/core/auth.js` |
| Bloqueio de 5 min após 5 senhas erradas | `auth.js` |
| Tempo de resposta constante no login (não revela quais e-mails existem) | `auth.js` |
| Política de Segurança de Conteúdo (CSP): só roda scripts do próprio site, nada inline e nada de terceiros | `index.html` |
| Todo texto exibido passa por `esc()` (proteção contra XSS) | `js/core/util.js` |
| Fotos reduzidas e regravadas (remove EXIF/GPS); só aceita JPG, PNG e WEBP até 15 MB | `compressImage()` |
| Alerta quando o aluno não tem autorização de uso de imagem | Chamada / fotos da aula |
| Aulas realizadas e turmas com histórico não podem ser excluídas (integridade da prestação de contas) | `api.js` |
| Relatórios com código de autenticidade e registro na auditoria | `reports.js` |
| `noindex` + `no-referrer` (não aparece no Google, não vaza URL) | `index.html` |

> **Importante:** no protótipo, os dados fictícios ficam no navegador e as regras rodam no próprio navegador. Isso serve para validar telas e fluxos, **não** para dados reais. Nenhum dado real de aluno deve ser lançado antes da fase Supabase.

## O que entra na fase Supabase (obrigatório antes de usar com dados reais)

1. **Supabase Auth**:
   - senha guardada com bcrypt no servidor;
   - sessão com token curto;
   - convite por e-mail (o usuário define a própria senha);
   - redefinição de senha;
   - **MFA** para admin e coordenação.
2. **RLS em todas as tabelas** (`supabase/schema.sql`): as permissões passam a ser garantidas **pelo banco**, mesmo que alguém altere o código do navegador.
3. **Dados sensíveis em tabela separada** (`alunos_sensivel`), sem nenhuma política de leitura para professor.
4. **Fotos em bucket privado**: acesso só por URL assinada que expira.
5. **Auditoria por gatilho no banco**, imutável (sem UPDATE/DELETE).
6. **Chave `service_role` NUNCA no front-end**. No navegador vai só a chave `anon`; operações administrativas ficam em Edge Functions.
7. **Backups diários** (plano Pro do Supabase) e teste de restauração.
8. **Repositório GitHub privado**. Segredos ficam só em variáveis de ambiente.
9. **HTTPS obrigatório**, domínio próprio, cabeçalhos de segurança no servidor (CSP, HSTS, X-Frame-Options, nosniff).
10. **Retenção de dados**: definir prazo para guardar dados de ex-alunos (ex.: 5 anos após o fim do projeto, pela prestação de contas) e depois anonimizar.

## Boas práticas para a equipe

- Cada pessoa usa **o próprio login**; nunca compartilhar senha.
- Coletar o **termo LGPD** e a **autorização de imagem** assinados pelo responsável na matrícula.
- Relatórios para **órgãos públicos** já saem sem dados sensíveis. A ficha do aluno é **confidencial** e de uso interno.
- Desativar o acesso de colaboradores desligados no mesmo dia.
