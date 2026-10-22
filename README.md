# ICM — Sistema de Gestão do Instituto Cultural das Montanhas

Sistema web (HTML, CSS e JavaScript puros, sem instalação) para a gestão do Instituto.

## Módulos

- **Painel**: alunos ativos, frequência do mês, alertas de faltas, pendências dos professores, aulas de hoje e próximos eventos.
- **Alunos**: matrícula em 6 etapas e ficha completa do aluno, com dados, transporte (van, embarque e desembarque), frequência, entrevista social, atendimentos (social, psicológico e pedagógico), documentos, atestados, formulários e anexos, ocorrências, notícias e histórico na instituição.
- **Projetos**: cadastro, metas, turmas de cada projeto e financeiro (despesas por rubrica).
- **Turmas**: alunos, plano de aula mensal, relatórios de aula e registro de presença (P/F/J).
- **Eventos**: cadastro e inclusão de alunos matriculados, com aviso de quem não tem autorização de viagem.
- **Equipe**: professores e colaboradores, com perfil de acesso.
- **Relatórios** (folha timbrada, imprimir ou salvar em PDF): mensal da turma, mensal do projeto, prestação de contas e atividades do ano.
- **Chat**: grupos e mensagens diretas, só entre a equipe.

## Rodar localmente

```bash
python -m http.server 8857
```

Abra http://localhost:8857. Nesta fase qualquer usuário e senha entram com **dados de exemplo fictícios**.
Para voltar aos dados iniciais, use o menu do usuário (canto superior direito) → *Restaurar dados de exemplo*.

## Estrutura

```
index.html
css/app.css            visual (vidro fosco sobre a paisagem)
js/ui.js               utilitários, ícones, modal, toast
js/paisagem.js         cenário de montanhas gerado em SVG
js/seed.js             dados de exemplo
js/store.js            camada de dados (único ponto a trocar pelo Supabase)
js/dominio.js          regras: frequência, alertas, pendências, histórico
js/views/*.js          telas
js/app.js              login, navegação, busca e rotas
```

## Próxima etapa: Supabase

Só `js/store.js` muda: carregar as tabelas no início, gravar cada alteração e trocar o login de demonstração pelo Supabase Auth.
Antes de qualquer dado real entrar, as políticas de acesso (RLS) precisam estar prontas: os dados são de menores e alguns são sensíveis
(atendimento psicológico e social). Arquivos anexados irão para o Supabase Storage em bucket privado.
