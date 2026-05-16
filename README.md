# Meubolso

App mobile e web de **finanças pessoais em grupo** (FinançasPessoal): contas mensais compartilhadas, modo solo e convites por código. Cliente em **Expo** (SDK 54) com **Expo Router**, **Supabase** (Auth + Postgres + RLS) e **TypeScript**.

## Funcionalidades

- Autenticação (cadastro e login) via Supabase Auth
- **Hub** pós-login: criar grupo, entrar com código, listar grupos ou usar **Eu solo**
- Visão geral do mês, contas (bills), duplicação de mês e presença em grupo (Realtime)
- Perfil e encerramento de sessão em **Conta**
- Tema claro/escuro e layout responsivo (inclui web para desenvolvimento e testes)

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | Expo ~54, React 19, React Native 0.81, Expo Router 6 |
| Formulários | react-hook-form, Zod |
| Backend | Supabase (`@supabase/supabase-js`) |
| Testes | Jest + Testing Library; Playwright (E2E web) |
| Build loja | EAS Build (`eas.json`) |

## Estrutura do repositório

```
├── src/
│   ├── app/           # Rotas Expo Router
│   │   ├── (auth)/    # Login e cadastro
│   │   └── (app)/     # Hub, grupos, visão geral, contas, perfil
│   ├── components/
│   ├── hooks/
│   ├── services/      # Chamadas Supabase
│   ├── forms/         # Schemas Zod
│   └── lib/           # Cliente Supabase, utilitários
├── supabase/migrations/   # Schema e políticas RLS
├── e2e/                   # Testes Playwright (web)
├── assets/
├── app.json
├── eas.json
└── package.json
```

Rotas legadas em `(tabs)` e `(onboarding)` podem existir no código; o fluxo principal autenticado usa o grupo `(app)`.

## Pré-requisitos

- Node.js compatível com [Expo SDK 54](https://docs.expo.dev/)
- Projeto Supabase (dev/staging) com migrações aplicadas
- Para E2E autenticado: usuário de teste no Supabase

## Setup local

1. Na raiz, copie `.env.example` para `.env`.
2. Preencha apenas variáveis **públicas** (nunca commite `.env`):

   | Variável | Origem |
   |----------|--------|
   | `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mesma tela (anon / publishable key) |

   A chave anon vai no bundle do app — proteja dados com **RLS** no Postgres; não use service role no cliente.

3. Instale dependências e inicie o bundler:

   ```bash
   npm install
   npm run start
   ```

   Atalhos: `npm run android`, `npm run ios`, `npm run web` (Metro na porta 8081 por padrão).

4. Opcional — links na tela Sobre (`.env`):

   - `EXPO_PUBLIC_PRIVACY_POLICY_URL`
   - `EXPO_PUBLIC_TERMS_URL`
   - `EXPO_PUBLIC_SUPPORT_URL`

### Banco (Supabase)

Aplique as migrações em `supabase/migrations/` no projeto Supabase (CLI local ou SQL no Dashboard), na ordem dos timestamps dos arquivos.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run start` | Expo dev server |
| `npm run lint` | ESLint (Expo) |
| `npm test` | Jest (unitários) |
| `npm run test:watch` | Jest em modo watch |
| `npm run test:e2e` | Playwright (sobe Expo web se necessário) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run format` / `format:check` | Prettier |
| `npm run eas:build` | Wrapper `eas build` |
| `npm run eas:submit` | Wrapper `eas submit` |

### Testes E2E

1. Copie `.env.e2e.example` para `.env.e2e` (não commitar).
2. Defina `E2E_EMAIL` e `E2E_PASSWORD` de um usuário válido no projeto.
3. Com o servidor já rodando em outro terminal, ou deixe o Playwright subir o Metro:

   ```bash
   npm run test:e2e
   ```

   Para reutilizar um servidor local: `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e`.

## Build na nuvem (EAS)

O repositório inclui `eas.json` com perfis `development`, `preview` e `production`.

1. Instale e autentique a CLI (uma vez por máquina):

   ```bash
   npm install
   npx eas-cli login
   ```

2. Associe o projeto ao Expo (gera `extra.eas.projectId` no `app.json`):

   ```bash
   npx eas-cli init
   ```

3. Defina **bundle identifier** (iOS) e **application id** (Android) antes da primeira loja — via `app.json` / `app.config.js` ou variáveis no perfil EAS, conforme [EAS Build](https://docs.expo.dev/build/introduction/).

4. Exemplos de build:

   ```bash
   npm run eas:build -- --profile preview --platform android
   npm run eas:build -- --profile production --platform all
   ```

   Valide localmente com `npm run lint` e `npm test` antes de builds longos no EAS.

### Builds locais

Para experimentação sem EAS: `npx expo run:android` / `npx expo run:ios` ([documentação Expo](https://docs.expo.dev/)) — exige ambientes nativos configurados.

## Release (checklist)

1. **Versão**
   - Builds **production** incrementam automaticamente `version`, `android.versionCode` e `ios.buildNumber` via EAS (`appVersionSource: remote`, `autoIncrement: version` em `eas.json`). Não é necessário editar números antes de cada publicação.
   - Perfis `preview` e `development` não incrementam versão (APKs de teste).
   - Opcional: após um build production, sincronizar o `app.json` local com `npx eas-cli build:version:sync`.

2. **Variáveis de ambiente**
   - Confirmar projeto Supabase correto (staging vs produção).
   - Secrets de loja (Apple/Google) no EAS Secrets ou painel EAS — **não** no repositório.

3. **Loja**
   - Android: `eas submit -p android` após build production.
   - iOS: `eas submit -p ios`.
   - Respeitar tracks de teste interno → produção de cada loja.

4. **Pós-release**
   - Tag Git opcional alinhada à versão do app.

## Segurança

- Nunca commitar `.env`, `.env.e2e` nem chaves reais no README ou em issues.
- Use apenas a chave **anon** no app; regras de acesso via RLS em `supabase/migrations/`.
- Não registrar PII ou valores financeiros detalhados em logs de produção sem política explícita.

## Licença

Projeto privado (`"private": true` no `package.json`).
