# Van em tempo real: como ligar

```
Celular do motorista (Traccar Client) ──► função van-posicao (Supabase do ICM) ──► app das famílias
```

- Quem opera **inicia a rota no app** (aba Van) e liga o Traccar. A van aparece para as famílias.
- Ao **encerrar a rota no app**, a posição é apagada e a van **some do mapa**.
- Sem rota iniciada, o GPS recebido é **ignorado**.
- Se o sinal parar por **3 minutos** durante a rota, a van também some.
- O banco guarda **só a posição atual**, sem histórico de trajeto.
- Só veem a van famílias de aluno **ativo** com **"Usa a van"** marcado na ficha do aluno.

## 1. Banco
Já vem em `supabase/icm_v5_app.sql` (rotas, posição atual e aparelhos).

## 2. Receptor do GPS (uma vez)
Supabase do ICM → **Edge Functions** → **Deploy a new function** → **Via editor**:
- Nome: `van-posicao`
- Cole o conteúdo de `supabase/functions/van-posicao/index.ts` → **Deploy**
- Em **Details / Settings**: **desligue "Verify JWT"** (o Traccar não faz login; a proteção é o código do aparelho).

## 3. Código do aparelho (um por celular)
No **SQL Editor**:
```sql
select public.criar_dispositivo_van('grama-sede', 'Celular do motorista');
```
Aparece um código de 48 caracteres, **uma vez só**. No banco fica só uma versão embaralhada.

Para bloquear um celular perdido: `update public.van_dispositivos set ativo = false where nome = 'Celular do motorista';`

## 4. Celular do motorista
1. Instale **Traccar Client** (Play Store / App Store, gratuito).
2. Configure:
   - **Device identifier**: o código do passo 3
   - **Server URL**: `https://syzqaxqwzgcjompqlhjg.supabase.co/functions/v1/van-posicao`
   - **Frequency / Interval**: `10` segundos
   - **Distance**: `0` · **Accuracy**: `High`
3. Permita localização **"o tempo todo"** e desative a economia de bateria para o Traccar.
4. No dia a dia: **app → Van → escolher a rota → Iniciar rota → ligar o Traccar**. No fim: **Encerrar rota → desligar o Traccar**.

## 5. Login do motorista
No Sistema ICM: **Usuários e acessos → Novo usuário**, marque **"Opera a van"**. A pessoa cria a senha no **Primeiro acesso** do sistema e entra no app pela aba **Motorista**, com e-mail e senha. Administrador e coordenação também podem operar, se a conta não exigir verificação em duas etapas.

Rotas atuais: `sede-grama` (ida) e `grama-sede` (volta). O desenho no mapa vem de `js/rota.js`; as paradas intermediárias são provisórias até gravar a rota real.
