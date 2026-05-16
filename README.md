# Meubolso — app mobile (Expo)

Cliente **FinançasPessoal**: Expo Router + Supabase. Código em TypeScript.

**Layout do repositório:** app Expo na raiz (`app/`, `src/`, `package.json`); `docs/` e `supabase/` são pastas irmãs (sem npm workspaces).

## Pré-requisitos

- Node.js compatível com Expo SDK 54 (ver [documentação Expo](https://docs.expo.dev/))
- Conta Supabase (projeto dev/staging) para URL e chave **anon** (publicável)

## Setup local

1. Na raiz do repositório, copie `.env.example` para `.env`.
2. Preencha apenas variáveis públicas do app (nunca commite `.env`):

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   Origem dos valores: Supabase Dashboard → **Project Settings** → API (URL + anon/publishable key).  
   A chave **anon** é embutida no bundle do app — use políticas **RLS** no banco; não use service role no cliente.

3. Instalar dependências e subir o bundler:

   ```bash
   npm install
   npm run start
   ```

4. Qualidade:

   ```bash
   npm run lint
   npm test
   ```

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

4. Gerar build (exemplos):

   ```bash
   npm run eas:build -- --profile preview --platform android
   npm run eas:build -- --profile production --platform all
   ```

   Não é necessário rodar builds longos no CI local para validar o repo; use `npm run lint` e testes antes de disparar o EAS.

### Builds locais / legado

Para experimentação sem EAS, consulte `npx expo run:android` / `npx expo run:ios` na documentação Expo (requer ambientes nativos configurados).

## Release (checklist)

1. **Versão**
   - Ajustar `version` em `app.json` (semântico para lojas) e, quando aplicável, `android.versionCode` / `ios.buildNumber` conforme política do projeto no EAS.

2. **Variáveis de ambiente**
   - Confirmar projeto Supabase correto (staging vs produção).
   - Secrets da loja (API keys Apple/Google) ficam no EAS Secrets ou no painel EAS, **não** em Markdown nem no repositório.

3. **Loja**
   - Android: `eas submit -p android` (Google Play) após build production.
   - iOS: `eas submit -p ios` (App Store Connect).
   - Seguir taxonomia de tracks (internal testing → production) da cada loja.

4. **Pós-release**
   - Tag Git opcional alinhada à versão do app.
   - Monitoramento: ver secção de observabilidade em `docs/task.md` e `docs/security.md`.

## Observabilidade (orientação)

- Não registrar PII (e-mail completo, valores financeiros detalhados) em logs de produção sem política explícita.
- Mensagens de erro para o usuário devem ser claras; detalhes técnicos ficam em ferramentas dedicadas (crash/analytics), quando integradas.
- Integração concreta (Sentry, etc.) é backlog; até lá, priorizar testes manuais e `docs/testing-rls-realtime.md` onde aplicável.

## Segurança e documentação

- Nunca colocar chaves reais em README, `docs/` ou issues — ver `docs/security.md` e `.cursor/rules/security.md`.
