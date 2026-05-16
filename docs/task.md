# Lista de tarefas — Meubolso (FinançasPessoal)

Status por item: **pendente** | **em progresso** | **concluído**

Atualizar este arquivo ao iniciar (`em progresso`) e ao concluir (`concluído`) cada entrega, conforme `docs/guia-desenvolvimento.md`.

---

## Documentação e processo

| Tarefa | Status |
|--------|--------|
| Criar documentação do agente (`agente.md`, `task.md`, `guia-desenvolvimento.md`) | concluído |
| Revisar PRD vs. implementação e ajustar gaps de escopo | concluído — revisão interna alinha código + PRD/matrix §11; gaps residuais documentados: Realtime no cliente (§11.3–4), seletor de mês de origem na cópia (§11.12) |
| Definir convenção de branches e PRs com o time | pendente |

---

## Setup e infraestrutura

| Tarefa | Status |
|--------|--------|
| Configurar app Expo na raiz (SDK, TypeScript, ESLint/Prettier) | concluído |
| Configurar variáveis de ambiente (ex.: `EXPO_PUBLIC_SUPABASE_*`) sem commitar secrets | concluído |
| Conectar repositório a projeto Supabase (projeto dev/staging) | concluído — cliente (`src/lib/supabase.ts`) + `.env.example`; preencher `.env` local com URL/chave do Dashboard |
| Documentar setup local em README (sem secrets) | concluído — `README.md` na raiz (+ env via `.env.example`) |

---

## Banco de dados (Supabase / PostgreSQL)

| Tarefa | Status |
|--------|--------|
| Criar schema: `users`, `groups`, `group_members`, `months`, `bills` (PRD §7) | concluído — impl. via `profiles` (`id` FK `auth.users`) + `groups`, `group_members`, `months`, `bills` em `supabase/migrations/20260515153000_finance_core_schema.sql` |
| Definir índices e constraints (invite_code único, FKs, limites de grupo) | concluído — índices parciais (solo vs grupo), uniques compostos bills, único por mês/membro/grupo |
| Implementar RLS e políticas por `user_id` / `group_id` (leitura/escrita segura) | concluído — RLS base em `supabase/migrations/20260515153000_finance_core_schema.sql` **+ patch** `20260515174500_rls_join_invite_months_bills_checks.sql`: entrada em grupo apenas via `join_group_by_invite`; creator vira owner por trigger (`groups_after_insert_add_owner`); `months`/`bills` em modo grupo exige `user_id` ser **membro** do `group_id`; soft-delete em `bills` com `WITH CHECK` ajustado; `lookup_group_by_invite` e guard de convite mantidos |
| Habilitar **Realtime** nas tabelas necessárias (contas, meses, membros) | concluído — `supabase_realtime` inclui `bills`, `months`, `group_members` (migration inicial + garantia **idempotente** no patch `20260515174500_…`) |
| Testes manuais RLS/Realtime | concluído — roteiro em `docs/testing-rls-realtime.md` (dois usuários; MCP Supabase só se o projeto estiver ligado ao Cursor) |
| Seeds ou dados de fixture para desenvolvimento | pendente |
| (Opcional) Adotar Prisma ou manter SQL/migrations via Supabase CLI | pendente |

---

## Autenticação e sessão

| Tarefa | Status |
|--------|--------|
| Integrar Supabase Auth (e-mail/senha) no app | concluído — `src/app/(auth)/sign-in.tsx`, `(auth)/sign-up.tsx`, cliente `src/lib/supabase.ts` |
| Fluxo de cadastro e login com validação (Zod/RHF conforme regras) | concluído — `react-hook-form` + `zod` + schemas em `src/forms/auth-group-schemas.ts` |
| Sessão persistente segura (ex.: SecureStore onde aplicável) | concluído — persistência oficial com AsyncStorage (`supabase.ts`); avaliar SecureStore numa revisão posterior de modelo de tokens |
| Gating de rotas Expo Router (onboarding autenticado vs. convidado) | concluído — `Stack.Protected` + `AuthProvider` em `src/app/_layout.tsx`; fluxos `(auth)` / `(onboarding)` / `(tabs)` |
| Exibir identidade do usuário (nome/avatar quando houver) | concluído — nome na home (`profiles.display_name`); avatar quando campo existir (UI placeholder futura) |

---

## Backend / lógica de servidor

| Tarefa | Status |
|--------|--------|
| Validar regras sensíveis no servidor (RPC/Edge Functions se necessário) — ex.: regenerar convite só criador | pendente |
| Garantir que autorização não dependa só do client (alinhado a `security.md`) | pendente |

---

## Frontend mobile — fluxos PRD

| Tarefa | Status |
|--------|--------|
| Onboarding: criar grupo / entrar com código / usar solo | concluído — `src/app/(onboarding)/` + RPC `join_group_by_invite` / pref. solo AsyncStorage `@meubolso/pref_solo_mode` |
| Tela principal: mês atual, navegação entre meses, cards por membro | concluído — `src/app/(tabs)/index.tsx`, serviço `src/services/dashboard.ts`, mês `YYYY-MM` + setas; cria linha em `months` se faltar |
| Tela de contas por membro: lista, totais, salário, nota do mês | concluído — `src/app/(tabs)/contas.tsx` + serviços `bills` / `month-settings` |
| Adicionar/editar conta (modal/tela) + confirmação ao editar conta de outro membro | concluído — `BillEditorModal` + aviso RLS em edição alheia |
| Marcar pago/pendente, excluir com confirmação | concluído — toggle otimista + soft-delete `deleted_at` + `Alert` |
| Indicador “membro online” (Realtime/presence conforme design) | concluído — `useGroupPresence`: canal `group-presence:{groupId}`, presence key = `userId`; indicador nos cards da home e chips em Contas |
| Meses anteriores somente leitura após regra de negócio (PRD §10 item 3) | concluído — `isReadOnlyMonth` em `month-key.ts`; mês com `YYYY-MM` anterior ao mês corrente bloqueia edição na UI e nas mutations do hook |
| Duplicar/importar contas do mês anterior (banner, menu, modais, anti-duplicidade) | concluído |
| Configurações: perfil, grupo, salário, logout | parcial — salário e nota do mês por membro na tela Contas (`months`); perfil/grupo/logout pendente |

---

## Testes e qualidade

| Tarefa | Status |
|--------|--------|
| Configurar Jest + @testing-library/react-native | concluído — `jest.config.js`, `jest.setup.ts`, scripts `test` / `test:watch` |
| Testes unitários/integrados para hooks e services críticos | concluído (smoke) — `src/lib/__tests__/month-key.test.ts`, `bill-company.test.ts`; `src/components/__tests__/PrimaryButton.test.tsx` |
| E2E (Detox ou estratégia definida) para login + fluxo principal | pendente — **E2E não configurado** (sem Detox/Maestro no repo); apenas Jest |
| Checagens manuais ou automatizadas de acessibilidade (RN) | parcial — checklist aplicada às telas-chave (rótulos/hitSlop em botões só ícone, banner de erro, hints em `FormTextField`, modal de duplicação); revisão completa de foco/teclado e modais avançados fica para próximo passo |

---

## Observabilidade e release

| Tarefa | Status |
|--------|--------|
| Estratégia de logs/crash em produção (sem PII indevida) | parcial — princípios em `README.md` § Observabilidade; sem SDK de crash/analytics integrado |
| Pipeline EAS Build (iOS/Android) e critérios de release v1.0 | concluído — `eas.json`, scripts `eas:build` / `eas:submit`, checklist em `README.md` |

---

## Critérios de aceitação (PRD §11)

Validação contra código (`src`) + migrações (`supabase/migrations`). Legenda: **concluído** | **parcial** | **pendente**.

| # | Tarefa | Status | Notas |
|---|--------|--------|--------|
| 1 | Cadastro e login e-mail/senha | concluído | `(auth)/sign-in`, `sign-up`, Zod/RHF |
| 2 | Criar grupo e convidar por código | concluído | Onboarding + `invite_code`; entrada via RPC `join_group_by_invite` |
| 3 | Membros veem contas uns dos outros em tempo real | parcial | RLS permite ler contas do grupo; migrações publicam Realtime em `bills`/`months`/`group_members`, mas o app **não** subscreve `postgres_changes` — só **Presence** (`useGroupPresence`). Lista/resumo atualizam em nova carga/navegação, não ao vivo entre dispositivos. |
| 4 | Adicionar conta reflete imediatamente para outros | pendente | Depende de subscription Realtime ou pull ao focar ecrã; hoje não há listener Supabase nas telas de visão geral/contas. |
| 5 | Saldo recalculado automaticamente | concluído | Totais/saldo derivados de bill list + `months.salary` em `useContasScreen` / `loadMonthOverview`; após mutations chama-se `refreshMemberData` / reload. |
| 6 | Marcar conta como paga | concluído | Toggle otimista + persistência em `bills.paid` |
| 7 | Navegar entre meses anteriores | concluído | Home e Contas com `monthLabel` / setas |
| 8 | Meses anteriores não editáveis | concluído | `isReadOnlyMonth` bloqueia edição na UI e mutations |
| 9 | Sugestão de copiar contas ao abrir mês vazio | concluído | Banner `useDuplicateMonthImport` quando mês sem contas e mês anterior com dados |
| 10 | Cópia reseta status para pendente | concluído | `executeBillDuplication` força `paid: false` |
| 11 | Importação não sobrescreve contas existentes (regra PRD) | concluído | Merge por nome/membro; duplicados ignorados + feedback no modal |
| 12 | Escolher mês de origem diferente do imediatamente anterior | pendente | `useDuplicateMonthImport` fixa origem em `shiftMonthKey(monthLabel, -1)`; UI sem selector de outro mês. |

---

*Gerado para acompanhar fases do PRD; ajustar granularidade conforme o backlog do time.*
