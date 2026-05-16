# Lista de tarefas — Meubolso (FinançasPessoal)

Status por item: **pendente** | **em progresso** | **concluído**

Atualizar este arquivo ao iniciar (`em progresso`) e ao concluir (`concluído`) cada entrega, conforme `docs/guia-desenvolvimento.md`.

---

## Documentação e processo

| Tarefa | Status |
|--------|--------|
| Criar documentação do agente (`agente.md`, `task.md`, `guia-desenvolvimento.md`) | concluído |
| Revisar PRD vs. implementação e ajustar gaps de escopo | pendente |
| Definir convenção de branches e PRs com o time | pendente |

---

## Setup e infraestrutura

| Tarefa | Status |
|--------|--------|
| Configurar monorepo/app Expo (SDK, TypeScript, ESLint/Prettier) | concluído |
| Configurar variáveis de ambiente (ex.: `EXPO_PUBLIC_SUPABASE_*`) sem commitar secrets | concluído |
| Conectar repositório a projeto Supabase (projeto dev/staging) | concluído — cliente (`apps/mobile/src/lib/supabase.ts`) + `.env.example`; preencher `.env` local com URL/chave do Dashboard |
| Documentar setup local em README (sem secrets) | pendente |

---

## Banco de dados (Supabase / PostgreSQL)

| Tarefa | Status |
|--------|--------|
| Criar schema: `users`, `groups`, `group_members`, `months`, `bills` (PRD §7) | pendente |
| Definir índices e constraints (invite_code único, FKs, limites de grupo) | pendente |
| Implementar RLS e políticas por `user_id` / `group_id` (leitura/escrita segura) | pendente |
| Habilitar **Realtime** nas tabelas necessárias (contas, meses, membros) | pendente |
| Seeds ou dados de fixture para desenvolvimento | pendente |
| (Opcional) Adotar Prisma ou manter SQL/migrations via Supabase CLI | pendente |

---

## Autenticação e sessão

| Tarefa | Status |
|--------|--------|
| Integrar Supabase Auth (e-mail/senha) no app | pendente |
| Fluxo de cadastro e login com validação (Zod/RHF conforme regras) | pendente |
| Sessão persistente segura (ex.: SecureStore onde aplicável) | pendente |
| Gating de rotas Expo Router (onboarding autenticado vs. convidado) | pendente |
| Exibir identidade do usuário (nome/avatar quando houver) | pendente |

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
| Onboarding: criar grupo / entrar com código / usar solo | pendente |
| Tela principal: mês atual, navegação entre meses, cards por membro | pendente |
| Tela de contas por membro: lista, totais, salário, nota do mês | pendente |
| Adicionar/editar conta (modal/tela) + confirmação ao editar conta de outro membro | pendente |
| Marcar pago/pendente, excluir com confirmação | pendente |
| Indicador “membro online” (Realtime/presence conforme design) | pendente |
| Meses anteriores somente leitura após regra de negócio (PRD §10 item 3) | pendente |
| Duplicar/importar contas do mês anterior (banner, menu, modais, anti-duplicidade) | pendente |
| Configurações: perfil, grupo, salário, logout | pendente |

---

## Testes e qualidade

| Tarefa | Status |
|--------|--------|
| Configurar Jest + @testing-library/react-native | pendente |
| Testes unitários/integrados para hooks e services críticos | pendente |
| E2E (Detox ou estratégia definida) para login + fluxo principal | pendente |
| Checagens manuais ou automatizadas de acessibilidade (RN) | pendente |

---

## Observabilidade e release

| Tarefa | Status |
|--------|--------|
| Estratégia de logs/crash em produção (sem PII indevida) | pendente |
| Pipeline EAS Build (iOS/Android) e critérios de release v1.0 | pendente |

---

## Critérios de aceitação (PRD §11)

| # | Tarefa | Status |
|---|--------|--------|
| 1 | Cadastro e login e-mail/senha | pendente |
| 2 | Criar grupo e convidar por código | pendente |
| 3 | Membros veem contas uns dos outros em tempo real | pendente |
| 4 | Adicionar conta reflete imediatamente para outros | pendente |
| 5 | Saldo recalculado automaticamente | pendente |
| 6 | Marcar conta como paga | pendente |
| 7 | Navegar entre meses anteriores | pendente |
| 8 | Meses anteriores não editáveis | pendente |
| 9 | Sugestão de copiar contas ao abrir mês vazio | pendente |
| 10 | Cópia reseta status para pendente | pendente |
| 11 | Importação não sobrescreve contas existentes (regra PRD) | pendente |
| 12 | Escolher mês de origem diferente do imediatamente anterior | pendente |

---

*Gerado para acompanhar fases do PRD; ajustar granularidade conforme o backlog do time.*
