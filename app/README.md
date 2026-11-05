# App do Instituto

PWA para as famílias, em HTML, CSS e JavaScript puros. Usa o **mesmo banco do Sistema ICM**.

- Publicado em `https://drdiegopadua.github.io/icm/app/`
- Demonstração, sem banco: abra com `?demo` no endereço.

## De onde vem cada informação

| No app | Vem de |
|---|---|
| Projetos, turmas e horários | Sistema ICM → Projetos (seção "No App do Instituto") |
| Calendário letivo | Sistema ICM → Pedagógico → Calendário letivo |
| Apresentações | Sistema ICM → Eventos |
| Aulas, frequência e avisos do aluno | Sistema ICM (função `app_familia`) |
| Van | Sistema ICM → ficha do aluno + `VAN.md` |
| Inscrição | Entra na Lista de espera do Sistema ICM |
| Notícias | Blog do site |
| Foto e texto de projeto sem cadastro completo | Site (`js/data.js`, pelo nome do projeto) |
| Instituto, números, montanhas, linha do tempo, parceiros, bairros | Fixos em `js/data.js` |

## Acesso

- **Família**: matrícula + código do aluno (o mesmo do Portal da Família, gerado na ficha do aluno).
- **Motorista**: e-mail e senha do Sistema ICM, com "Opera a van" marcado em Usuários.

Visitante e família não leem tabelas: só chamam as funções de `supabase/icm_v5_app.sql`, que devolvem o mínimo necessário.

Ao alterar JS/CSS, suba o `?v=N` no `index.html` e em `sw.js`, e o nome do cache em `sw.js`.
