# CLAUDE.md — MeuBolso

Guia rápido de arquitetura e padrões do repositório para Claude Code.

---

## Stack e versões-chave

- **Expo SDK 56**, React 19, React Native 0.85
- **Expo Router ~56** (typed routes, `experiments.typedRoutes: true`)
- **Supabase** (`@supabase/supabase-js ^2`): Auth, Postgres + RLS, Realtime
- **TypeScript** strict, alias `@/*` → `./src/*`
- **react-hook-form** + **Zod** para formulários
- Sem TanStack Query, sem Zustand — estado via `useState`/`useEffect` + cancel tokens

---

## Estrutura de rotas

```
src/app/
  _layout.tsx          ← providers globais (AuthProvider, fonts, splash)
  (auth)/              ← sign-in, sign-up (sem autenticação)
  (app)/               ← rotas protegidas (Stack.Protected)
    _layout.tsx        ← tabs/stack layout do app
    overview.tsx       ← visão geral do mês (home)
    contas.tsx         ← lista de contas por membro
    my-groups.tsx
    create-group.tsx
    join-group.tsx
    index.tsx          ← hub pós-login (decidir grupo/solo)
    perfil.tsx
  modal.tsx            ← About modal
```

**Nota:** rotas `(tabs)` / `(onboarding)` existem só no histórico git; não usar como referência.

---

## Camadas de código (`src/`)

| Pasta | O que vai aqui |
|---|---|
| `app/` | Só rotas. Sem HTTP direto, sem regra de negócio. |
| `components/ui/` | Primitivos sem domínio: `Themed`, `PrimaryButton`, `FormTextField`, `ScreenBody` |
| `components/shared/` | Compostos reutilizáveis: `BillEditorModal`, `ContasBillCard`, `DuplicateBillsModal`, `MemberMonthCard`, `MeubolsoWordmark`, `SupabaseConfigMissing` |
| `hooks/` | Lógica de tela (`useContasScreen`, `useMonthOverview`) + realtime (`useGroupPresence`, `useGroupRealtime`) |
| `services/` | Chamadas ao Supabase (`dashboard.ts`, `bills.ts`, `bill-duplication.ts`, …) |
| `forms/` | Schemas Zod (`bill-form-schema.ts`, `auth-group-schemas.ts`) |
| `lib/` | Cliente Supabase (`supabase.ts`), utilitários (`month-key.ts`, `active-group-preference.ts`, …) |
| `types/` | Tipos globais (`finance.ts`) |
| `constants/` | `Colors.ts`, `Layout.ts` |
| `navigation/` | Helpers de tema de navegação |
| `providers/` | `AuthProvider` (Context) |

---

## Cliente Supabase

`src/lib/supabase.ts` — lazy `Proxy` (`getSupabase()`); guard `isSupabaseConfigured` previne crash sem `.env`.

Env vars **obrigatórias** (inlined no bundle pelo Metro — nunca colocar chaves privadas aqui):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Padrão de estado (sem TanStack Query)

```ts
const [data, setData] = useState<T | null>(null);
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

useEffect(() => {
  let cancelled = false;
  setStatus('loading');
  fetchData().then(result => {
    if (!cancelled) { setData(result); setStatus('success'); }
  }).catch(() => {
    if (!cancelled) setStatus('error');
  });
  return () => { cancelled = true; };
}, [deps]);
```

---

## Realtime

- **Presence** (`useGroupPresence`): indicador "online" por membro no grupo.
- **`postgres_changes`** (`useGroupRealtime`): subscreve `bills` e `months`; filtra por `group_id` (grupo) ou `user_id` (solo); hub global por tópico com cleanup quando último listener sai; debounce 300ms no callback.
- Wired em `overview.tsx` e `contas.tsx` — qualquer INSERT/UPDATE/DELETE dispara reload automático.
- RLS garante que cada cliente só recebe mudanças que pode ler.

---

## Formulários

- `react-hook-form` + `zodResolver` + schema em `src/forms/`.
- `FormTextField` (em `components/ui/`) — label, hint, errorText, passwordToggle.
- Submit desabilita CTA (`isSubmitting`), evita double-submit.

---

## Segurança (resumo)

- Autorização vive no servidor (Supabase RLS). Client reflete estado para UX.
- Nunca `service_role` key no app. Apenas `anon` key.
- Sem secrets em `.env` commitado (`.gitignore` cobre `.env`).
- SecureStore preferível ao AsyncStorage para tokens em builds futuros.
- Validação client-side é UX; o servidor valida de novo.

---

## Comandos úteis

```bash
npm run start              # Expo dev server
npm run lint               # ESLint
npm test                   # Jest
npm run test:connection    # Ping /auth/v1/health no Supabase (valida .env)
npm run eas:build:preview  # APK standalone Android (sem Metro, para testar)
eas build -p android --profile preview  # idem direto via CLI
```

**Preview vs Development build:**
- Development: precisa Metro rodando. Para desenvolvimento local.
- Preview: APK standalone, abre direto. Para testar "como produção".

---

## Testes

- Jest com `jest-expo`; arquivos em `src/**/__tests__/` ou `*.test.ts(x)`.
- `npm run test:connection` — script Node puro, sem Jest; testa conectividade real ao Supabase.
- Rodar `npm install` se `expo-modules-core` faltar em node_modules (pode acontecer após upgrade de SDK).
