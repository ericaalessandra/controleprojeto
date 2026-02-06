# Guia de Deploy Completo - Gestão de Projetos

Este guia ensina como colocar seu projeto no ar **do zero**, conectando o código do seu computador (GitHub), o banco de dados (Supabase) e a hospedagem do site (Vercel).

---

## Passo 1: GitHub (Código)

Seu projeto já está configurado com o GitHub. O primeiro passo é garantir que todo o seu código mais recente está salvo lá.

1.  Abra o terminal (se não estiver aberto).
2.  Execute os comandos para enviar as últimas alterações:
    ```bash
    git add .
    git commit -m "Preparando para deploy final"
    git push origin main
    ```
3.  Verifique se o código apareceu no seu repositório: [https://github.com/ericaalessandra/gpcontroledegasto](https://github.com/ericaalessandra/gpcontroledegasto)

---

## Passo 2: Supabase (Banco de Dados e IA)

O Supabase vai guardar seus dados e executar a inteligência artificial.

### 2.1 Criar o Projeto
1.  Acesse [database.new](https://database.new) e crie um novo projeto.
2.  Deixe a região em **São Paulo** (ou a mais próxima).
3.  Defina uma senha forte para o banco de dados e aguarde a criação.

### 2.2 Pegar as Chaves de Acesso
Assim que o projeto for criado:
1.  Vá em **Project Settings** (ícone de engrenagem) > **API**.
2.  Você precisará copiar dois valores para usar na Vercel depois:
    - **Project URL**
    - **Project API Key (anon public)**

### 2.3 Configurar a IA (Edge Function)
Para a IA funcionar, precisamos enviar o código da função `ai-chat` para o Supabase.

1.  No painel do Supabase, vá em **Edge Functions** > **Manage Secrets** e adicione:
    - `GEMINI_API_KEY`: Cole sua chave da API do Google AI Studio aqui.
2.  No seu terminal (no VS Code), faça login no Supabase:
    ```bash
    npx supabase login
    ```
3.  Faça o deploy da função:
    ```bash
    npx supabase functions deploy ai-chat --project-ref SEU_ID_DO_PROJETO
    ```
    > **Dica:** O `SEU_ID_DO_PROJETO` é o código que aparece na URL do seu painel Supabase (ex: `https://app.supabase.com/project/abcdefghijklmn`).

---

## Passo 3: Vercel (Colocar o Site no Ar)

A Vercel vai pegar seu código do GitHub e transformá-lo em um site acessível.

1.  Acesse [vercel.com/new](https://vercel.com/new).
2.  Em **Import Git Repository**, encontre seu projeto `gpcontroledegasto` e clique em **Import**.
3.  Na tela de configuração (**Configure Project**):
    - **Framework Preset:** Vite (deve ser detectado automaticamente).
    - **Root Directory:** `./` (padrão).
    - **Environment Variables:** Aqui é o ponto masi importante. Adicione as 3 chaves abaixo:

| Nome da Variável | Valor (Onde encontrar) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase > Settings > API > URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Settings > API > anon public |
| `VITE_GEMINI_API_KEY` | Sua chave do Google (pode usar a mesma da função) |

4.  Clique em **Deploy**.

---

## Passo 4: Finalização

Aguarde a Vercel construir o site (leva cerca de 1-2 minutos). Quando terminar, você receberá um link (ex: `gpcontroledegasto.vercel.app`).

**Teste o site:**
- Crie uma conta ou faça login.
- Tente criar um projeto.
- Teste o chat de IA para garantir que a Edge Function está respondendo.

### Problemas Comuns?
- **Tela branca na IA:** Verifique se adicionou a `GEMINI_API_KEY` nos "Secrets" da Edge Function no Supabase.
- **Erro ao conectar:** Confirme se a `VITE_SUPABASE_URL` e a `anon key` estão certas na Vercel.
- **Página não encontrada (404) ao recarregar:** O arquivo `vercel.json` na raiz do projeto resolve isso. (Já está criado!).
