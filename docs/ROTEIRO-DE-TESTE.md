# Roteiro de teste com a equipe (banco real)

Objetivo: conferir, com pessoas e perfis diferentes ao mesmo tempo, que cada um vê só o que deve, que o chat
e a chamada funcionam e que nada sensível aparece para quem não pode. Leva cerca de 1 hora.

**Quem participa (mínimo):** 1 administrador (você), 1 professor, 1 secretaria/social. Se possível, 1 coordenação.
**Antes de começar:** rode no Supabase os SQL `icm_v2_arquivos_2fa.sql`, `icm_v3_professor.sql` e `icm_v4_chat_tempo_real.sql`.
Use dados de teste (alunos fictícios) e apague no final.

Marque cada item: ✅ funcionou · ❌ não funcionou (anote o que apareceu na tela).

## 1. Convites e primeiro acesso
| # | Quem | Passo | Esperado | Resultado |
|---|------|-------|----------|-----------|
| 1.1 | Admin | Usuários → Novo usuário para o professor e para a secretaria (papéis corretos) | Aparecem como convite | |
| 1.2 | Professor | Abre o site → "Primeiro acesso" com o e-mail convidado → cria senha → confirma o e-mail | Entra no sistema | |
| 1.3 | Secretaria | Mesmo processo | Entra no sistema | |
| 1.4 | Admin | Entra com senha | Pede o código do aplicativo autenticador (2 etapas) | |
| 1.5 | Qualquer um | Fica 31 min sem mexer (ou fecha a aba e volta depois de 31 min) | Pede login de novo | |

## 2. Permissões (o mais importante)
| # | Quem | Passo | Esperado | Resultado |
|---|------|-------|----------|-----------|
| 2.1 | Admin | Cria projeto, 2 turmas (uma com o professor, outra sem) e 3 alunos de teste com CPF, renda e saúde | Salva normalmente | |
| 2.2 | Professor | Abre Alunos | Vê **só** os alunos da turma dele | |
| 2.3 | Professor | Abre a ficha de um aluno | **Não** vê CPF, NIS, renda, endereço completo, diagnósticos | |
| 2.4 | Professor | Tenta abrir Financeiro, Equipe, Usuários, Auditoria (menu ou endereço direto) | Acesso negado | |
| 2.5 | Secretaria | Abre a ficha do aluno | Vê dados sociais e de saúde | |
| 2.6 | Secretaria | Abre Equipe (RH) | Não vê salário nem conta bancária | |
| 2.7 | Admin | Auditoria | Aparecem os logins e as ações de todos | |

## 3. Aulas, chamada e fotos
| # | Quem | Passo | Esperado | Resultado |
|---|------|-------|----------|-----------|
| 3.1 | Professor | Turma → Registrar aula → chamada → fotos → salvar | Salva; fotos aparecem | |
| 3.2 | Admin | Abre a mesma aula | Vê a chamada e as fotos | |
| 3.3 | Professor | No celular: Chamada → faz a chamada **com o modo avião ligado** | "Chamada salva no aparelho" | |
| 3.4 | Professor | Desliga o modo avião | Aviso "chamada(s) enviada(s)"; admin vê a chamada | |
| 3.5 | Admin | Relatórios → mensal da turma e execução do objeto | Documentos completos, com fotos | |

## 4. Chat
| # | Quem | Passo | Esperado | Resultado |
|---|------|-------|----------|-----------|
| 4.1 | Professor | Manda mensagem direta para a secretaria | — | |
| 4.2 | Secretaria (outra tela) | Sem atualizar a página | Aparece o número vermelho no Chat e o aviso na hora | |
| 4.3 | Admin | Abre o chat | **Não** vê a conversa direta entre professor e secretaria | |
| 4.4 | Todos | Grupo "Geral" | Todos veem as mensagens do grupo | |

## 5. Famílias (portal e assinatura)
| # | Quem | Passo | Esperado | Resultado |
|---|------|-------|----------|-----------|
| 5.1 | Secretaria | Ficha do aluno → Assinaturas e portal → pedir LGPD e imagem → enviar pelo WhatsApp (para seu próprio celular) | Link chega | |
| 5.2 | "Responsável" | Abre o link no celular, assina | Documento assinado | |
| 5.3 | Secretaria | Gera o comprovante de assinatura | Mostra "Conferido" (integridade) | |
| 5.4 | "Responsável" | Portal da Família com matrícula e código | Vê só o próprio aluno | |
| 5.5 | Qualquer um | Portal com código errado 5 vezes | Bloqueia por 15 minutos | |

## 6. Automações (depois de instalar o Apps Script)
| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.1 | Executar `backupDiario` | Arquivo `ICM-backup-AAAA-MM-DD.json.gz` na pasta do Drive | |
| 6.2 | Executar `avisosDiarios` (com uma certidão vencendo) | E-mail "avisos para hoje" chega | |

## Depois do teste
- Apague os alunos, turmas e projeto de teste (ou marque como encerrados).
- Envie para quem desenvolve a lista dos itens ❌ com a mensagem que apareceu.
