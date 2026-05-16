# Guia de desenvolvimento — prompts para implementação (Meubolso)

Instruções numeradas para executar durante a implementação do **FinançasPessoal** (Expo + Supabase). Cada prompt deve ser tratado como uma unidade de trabalho com entrega clara.

**Obrigatório em todo prompt:**

1. **Antes de codar:** revisar `docs/prd.md`, `docs/agente.md` e as regras listadas.  
2. **Durante:** marcar no `docs/task.md` o(s) item(ns) correspondente(s) como **em progresso**.  
3. **Ao concluir:** atualizar o(s) mesmo(s) item(ns) no `docs/task.md` para **concluído**.  
4. **Git:** criar **commit** com **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, etc.), escopado apenas ao trabalho daquele prompt (mensagem em português ou inglês, mas prefixo no padrão conventional).  
5. **Documentação de libs:** usar MCP **Context7** (regra `01-geral.mdc`) para API/sintaxe de Expo, Supabase, React Query, Zustand, etc.

**Skills úteis globais:** conforme plugins do Cursor (ex.: skill oficial Supabase); no repositório, preferir `.cursor/skills/supabase/supabase.md` e demais skills em `docs/agente.md` §3.

**MCPs:** **Context7** (docs); **Supabase** (schema, logs, migrações); **Prisma** (se adotado); **Playwright** (só web); **Figma** (UI); **Stripe/Twilio** — só se o escopo mudar (fora do PRD v1).

---

## Fase 0 — Fundação

### Prompt 1 — Setup do app Expo e qualidade base

**Objetivo:** projeto Expo (TypeScript), ESLint/Prettier, estrutura de pastas alinhada ao Expo Router.

**Regras:** `01-geral.mdc`, `01-frontend-geral.mdc`, `security.md`, `02-react-native-expo.mdc`, `02-expo-router-stack.mdc`, `04-expo-quality-testing-observability.mdc`.

**Skills:** `writing-plans/SKILL.md` (se precisar de plano), `ui-screen-design-system/SKILL.md` (estrutura de telas).

**MCP:** Context7 (Expo, Router).

**Task.md:** itens em "Setup e infraestrutura" relevantes (ex.: configurar monorepo/app Expo).

**Ao terminar:** atualizar `docs/task.md` → **concluído**; **commit** `chore:` ou `feat:` conforme o que foi entregue.

---

### Prompt 2 — Integração Supabase (cliente + env)

**Objetivo:** cliente `@supabase/supabase-js` no Expo, armazenamento de sessão adequado, `.env.example` sem valores secretos.

**Regras:** `security.md`, `02-react-native-expo.mdc`, `03-expo-data-state-forms.mdc`, `01-backend-geral.mdc` (contratos e validação).

**Skills:** `.cursor/skills/supabase/supabase.md`.

**MCP:** Context7 (supabase-js, auth Expo); **Supabase** MCP para checar projeto e chaves publicáveis.

**Task.md:** "Configurar variáveis de ambiente", "Conectar repositório a projeto Supabase".

**Ao terminar:** `docs/task.md` **concluído** nos itens aplicáveis; **commit** `feat:` ou `chore:`.

---

## Fase 1 — Dados e segurança

### Prompt 3 — Schema SQL e migrações

**Objetivo:** tabelas `users`, `groups`, `group_members`, `months`, `bills` conforme PRD §7; FKs e unicidades.

**Regras:** `01-backend-geral.mdc`, `security.md`.

**Skills:** `supabase/supabase.md`; `prisma/SKILL.md` **somente** se for usar Prisma.

**MCP:** **Supabase** (migração / SQL); Context7 (DDL, boas práticas).

**Task.md:** seção "Banco de dados" — criar schema, índices/constraints.

**Ao terminar:** marcar itens **concluídos**; **commit** `feat:` (schema) ou `chore:`.

---

### Prompt 4 — RLS e Realtime

**Objetivo:** políticas RLS por grupo/usuário; publicação Realtime para mudanças em contas/meses; testar com dois usuários.

**Regras:** `security.md` (obrigatório), `01-backend-geral.mdc`.

**Skills:** `supabase/supabase.md`; `multitenant/multitenant.md` para revisar padrões de isolamento (ajustar ao modelo de grupos).

**MCP:** Supabase (policies, advisors, logs).

**Task.md:** "RLS", "Realtime".

**Ao terminar:** **concluído**; **commit** `feat:` ou `fix:`.

---

## Fase 2 — Autenticação e onboarding

### Prompt 5 — Auth e fluxo de grupo (criar / entrar / solo)

**Objetivo:** cadastro, login, persistência de sessão; telas de criar grupo, entrar por código, opção solo; respeitar limite de membros (PRD).

**Regras:** `02-react-native-expo.mdc`, `02-expo-router-stack.mdc`, `03-expo-data-state-forms.mdc`, `security.md`, `01-frontend-geral.mdc`.

**Skills:** `supabase/supabase.md`, `a11y-interaction-checklist/SKILL.md`.

**MCP:** Context7 (Supabase Auth + Expo); Supabase MCP.

**Task.md:** "Autenticação e sessão", item de onboarding em "Frontend mobile".

**Ao terminar:** **concluído**; **commit** `feat:`.

---

## Fase 3 — Núcleo do produto

### Prompt 6 — Visão geral do mês e navegação entre meses

**Objetivo:** cards por membro, totais, salário, saldo e cores; navegação ← → entre meses.

**Regras:** `01-frontend-geral.mdc`, `05-frontend-sem-cara-de-ia.mdc`, `02-react-native-expo.mdc`, `03-expo-data-state-forms.mdc`.

**Skills:** `ui-screen-design-system/SKILL.md`, `frontend-design/SKILL.md`.

**MCP:** Figma (se houver layout); Context7.

**Task.md:** tela principal + navegação de meses.

**Ao terminar:** **concluído**; **commit** `feat:`.

---

### Prompt 7 — CRUD de contas + salário + nota do mês

**Objetivo:** lista, modal adicionar/editar, toggle pago, exclusão com confirmação, aviso ao editar conta de outro membro; salário e nota por mês/membro.

**Regras:** idem Prompt 6 + `security.md` (não confiar só no client).

**Skills:** `supabase/supabase.md`.

**MCP:** Supabase; Context7.

**Task.md:** "Tela de contas", partes de "Adicionar/editar", configuração de salário.

**Ao terminar:** **concluído**; **commit** `feat:` ou `fix:`.

---

### Prompt 8 — Somente leitura para meses encerrados + presença online

**Objetivo:** bloquear edição em meses anteriores conforme regra de negócio PRD §10; indicador de membro online (usar estratégia com Realtime/presence documentada).

**Regras:** `02-expo-router-stack.mdc`, `03-expo-data-state-forms.mdc`, `security.md`.

**Skills:** `supabase/supabase.md`.

**MCP:** Context7 (Realtime/presence); Supabase.

**Task.md:** itens "Meses anteriores somente leitura" e "Indicador online".

**Ao terminar:** **concluído**; **commit** `feat:`.

---

### Prompt 9 — Duplicar / importar contas do mês anterior

**Objetivo:** banner para mês vazio, modais de confirmação e prévia, menu ⋮ quando mês já tem contas; reset de `paid`, `copied_from`, não copiar nota do mês; anti-duplicidade por nome (PRD §6.9).

**Regras:** `01-geral.mdc`, `03-expo-data-state-forms.mdc`, `security.md`.

**Skills:** `writing-plans/SKILL.md` (para destrinchar edge cases).

**MCP:** Supabase (transações/RPC se necessário); Context7.

**Task.md:** item "Duplicar/importar contas".

**Ao terminar:** **concluído**; **commit** `feat:`.

---

## Fase 4 — Testes, polish e release

### Prompt 10 — Testes automatizados e acessibilidade

**Objetivo:** Jest + Testing Library; smoke E2E se configurado; passar checklist a11y RN.

**Regras:** `04-expo-quality-testing-observability.mdc`, `01-frontend-geral.mdc`.

**Skills:** `a11y-interaction-checklist/SKILL.md`, `code-review/SKILL.md`.

**MCP:** Context7 (Jest RN, Detox); Playwright **apenas** se houver alvo web.

**Task.md:** seção "Testes e qualidade".

**Ao terminar:** **concluído**; **commit** `test:` ou `chore:`.

---

### Prompt 11 — Observabilidade, builds EAS e critérios de aceitação PRD §11

**Objetivo:** revisar todos os critérios de aceitação; configurar build; documentar release.

**Regras:** `04-expo-quality-testing-observability.mdc`, `security.md`.

**Task.md:** "Observabilidade e release" + marcar linhas da tabela "Critérios de aceitação" conforme validação.

**Ao terminar:** **concluído**; **commit** `chore:` ou `docs:`.

---

## Prompt auxiliar — Revisão de código

**Objetivo:** PR interno: legibilidade, segurança, performance de listas.

**Skills:** `code-review/SKILL.md`.

**Regras:** todas de frontend mobile + `security.md`.

**Task.md:** opcional — marcar item de processo "Revisar PRD vs. implementação".

**Ao terminar:** ajustes em **commits** `fix:` ou `refactor:` pequenos.

---

*Mantenha este guia sincronizado com mudanças de escopo no `docs/prd.md`.*
