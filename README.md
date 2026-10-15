# Riff Theory 🎸
### Aplicativo de violão e guitarra tudo em um
<div align="center">
  <img src="/public/icon.jpg" width="256" height="256">
  <p>Riff Theory é capaz de te ajudar em todos os seus sonhos guitarreiros.</p>
</div>

## Planos
Nós, desenvolvedores do Riff Theory, temos muitos planos para o aplicativo. Queremos que ele seja um hub de cifras, um aplicativo de tutorial e uma ferramenta para criação de tablatura e colaboração tudo em um.

Um sonho ambicioso e de código aberto que é realizado pouco a pouco, o aplicativo não tem um público-alvo específico. Queremos que iniciantes, intermediários e profissionais possam se divertir e usar o app sem comprometê-lo com simplicidade ou complexidade exagerada.

Veja [nossos planos](TODO.md).


---

## 📦 Gerar o app (APK Android e .exe Windows)

Este repositório é o Riff Theory empacotado para instalar como aplicativo:

- **Android (APK)** via [Capacitor](https://capacitorjs.com/) — pasta `android/`
- **Windows (.exe)** via [Electron](https://www.electronjs.org/) — pasta `electron/`
- **Web (Vercel)** continua funcionando igual (`npm run build`)

O front-end (React/Vite) é o mesmo nas três versões. Só o chatbot precisa de atenção: ele
depende da função `api/chat.js`, que **continua rodando na Vercel**. Os apps chamam essa URL.

### 1. Configurar a URL da API

```bash
cp .env.app.example .env.app
# edite .env.app e coloque a URL do seu deploy:  VITE_API_BASE=https://SEU-PROJETO.vercel.app
```

Faça o deploy deste repo na Vercel (mesma config de antes, com `GROQ_API_KEY`).
O `api/chat.js` já libera CORS para os apps conseguirem chamá-lo.

### 2. Android (APK)

Requisitos: Node 22+, JDK 21 e Android SDK (ou Android Studio).

```bash
npm install
npm run android:apk        # gera android/app/build/outputs/apk/debug/app-debug.apk
npm run android:open       # ou abre no Android Studio (Build > Build APK)
```

O APK debug já instala direto no celular (ative "instalar apps desconhecidos").
Para publicar na Play Store, gere um APK/AAB **assinado** pelo Android Studio
(Build > Generate Signed Bundle / APK).

### 3. Windows (.exe)

Requisitos: Node 22+, rodando **no Windows** (ou use o GitHub Actions abaixo).

```bash
npm install
npm run electron:dev       # abre o app com hot reload
npm run electron:start     # abre o app já compilado
npm run electron:build     # gera release/RiffTheory-<versão>-nsis.exe (instalador) e -portable.exe
```

### 4. Sem instalar nada: GitHub Actions

Em **Settings > Secrets and variables > Actions > Variables**, crie `VITE_API_BASE`
com a URL da Vercel. Depois vá em **Actions > Build APK e .exe > Run workflow**.
Os arquivos aparecem em *Artifacts* (ou na aba *Releases*, se você criar uma tag `v1.0.0`).

### Observações

- O afinador usa o microfone: o Android pede a permissão na primeira vez; no Windows o app já libera o microfone.
- Links de cifras abrem no navegador do sistema.
- Dados de uso/"últimos acessos" ficam no `localStorage` de cada instalação (não sincronizam entre aparelhos).
- Depois de mudar o código web, `npm run android:sync` recopia o build para o projeto Android.

## Painel de acessos e proteção antiabuso

O painel fica fora da navegação pública em `/admin/acessos` e usa o login Google do Supabase. As métricas contam navegadores pseudônimos; não armazenam IP, caminho de página ou user-agent.

1. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_TURNSTILE_SITE_KEY` na Vercel (Production; Preview separadamente, se necessário).
2. Crie no Cloudflare Turnstile um widget para `rifftheory.vercel.app`.
3. No Supabase, aplique as seis migrações em `supabase/migrations/`, nessa ordem (a primeira usa o prefixo `20261014000000` para que a ordenação automática do Supabase seja segura).
4. Em **Edge Functions → Secrets**, salve o segredo com o nome `TURNSTILE_SECRET_KEY`. Não o coloque no código ou no navegador.
5. Implante `supabase/functions/register-anonymous-access` usando `supabase/config.toml`; a função é pública (`verify_jwt = false`), mas falha fechada sem as chaves e valida Turnstile antes de gravar.
6. Cadastre administradores pelo SQL Editor do projeto:

```sql
insert into public.access_monitor_admins (email)
select lower(trim('SEU_EMAIL_GOOGLE'))
on conflict (email) do update set active = true;
```

Para revogar o acesso, use `update public.access_monitor_admins set active = false where email = lower(trim('EMAIL'));`.
