# Playbook do agente — Meubolso (FinançasPessoal)

Documento de referência para agentes e desenvolvedores: contexto do produto, regras do Cursor, skills do projeto, MCPs e boas práticas de execução.

---

## 1. Contexto do produto (síntese do PRD)

- **Produto:** aplicativo mobile de **finanças pessoais** (contas mensais), com opção **solo** ou **grupo** (até 6 membros), sincronização em **tempo real**.
- **Stack alvo (PRD):** **Expo / React Native**, **Supabase** (PostgreSQL, Auth, Realtime), estado com **Zustand ou Context API**.
- **Funcionalidades centrais:** cadastro/login e-mail+senha; criar/entrar em grupo (código) ou usar solo; visão geral do mês por membro; lista de contas (empresa, valor, vencimento, pago/pendente); salário e nota do mês; edição colaborativa; histórico de meses **somente leitura**; duplicar/importar contas do mês anterior com regras de reset de status e rastreabilidade (`copied_from`).
- **Fora do escopo v1:** gráficos, categorias, exportação, notificações de vencimento, Open Banking, multi-idioma.
- **Modelo de dados:** tabelas `users`, `groups`, `group_members`, `months`, `bills` — ver `docs/prd.md` §7 para detalhes.

---

## 2. Regras `.cursor/rules/` — quando aplicam

| Arquivo | Escopo | Quando carregar / lembrar |
|--------|--------|---------------------------|
| `01-geral.mdc` | Sempre (`alwaysApply`) | Documentação via Context7; qualidade; processo; validação/erros em todas as camadas. |
| `01-frontend-geral.mdc` | Sempre | Componentes, tema/tokens, a11y, estados de UI, formulários. |
| `security.md` | Sempre | Zero trust; RLS no Supabase; não expor secrets no client; SecureStore quando fizer sentido; validação no servidor. |
| `01-backend-geral.mdc` | Backend / API | Camadas, validação, erros — útil para **Edge Functions**, RPC ou qualquer BFF; no Meubolso o “backend” é sobretudo **Supabase + policies**. |
| `01-python-geral.mdc` | Código Python | Só se o repo passar a usar scripts/serviços em Python. |
| `02-react-native-expo.mdc` | Globs `src/app/`, `src/`, etc. | **Mobile Expo:** estrutura, performance, rede, env, auth persistência. |
| `02-expo-router-stack.mdc` | Idem | **Expo Router:** layouts, grupos `(auth)`, modais, params tipados/Zod, gating centralizado. |
| `03-expo-data-state-forms.mdc` | Idem | **Dados:** React Query / Zustand, RHF + Zod, services, offline/rede. |
| `04-expo-quality-testing-observability.mdc` | App + testes | Lint, Jest + Testing Library, E2E (ex.: Detox), a11y RN, observabilidade. |
| `03-tests.mdc` | `tests/**/*.py`, etc. | Testes **Python** — secundário para o stack atual. |
| `05-frontend-sem-cara-de-ia.mdc` | Front web/mobile (globs) | Microcopy, hierarquia visual, evitar UI genérica. |
| `02-nextjs.mdc`, `02-shadcn.mdc` | Web Next | **Não é stack do PRD v1**; usar só se o repositório incluir web. |
| `02-fastapi.mdc`, `02-django.mdc`, `03-nestjs.mdc` | Respectivas stacks | **Opcional** se houver API fora do Supabase. |
| `04-prisma.mdc` | Prisma no repo | PRD cita Postgres via Supabase; Prisma é **opcional** (client direto ou ORM). |
| `saas.mdc` | SaaS/multi-tenant | Avaliar alinhamento com grupos/RLS antes de mudanças grandes. |

**Resumo Meubolso:** em implementação mobile, priorizar **`02-react-native-expo`**, **`02-expo-router-stack`**, **`03-expo-data-state-forms`**, **`04-expo-quality-testing-observability`** + **`security`** + **`01-geral`** + **`01-frontend-geral`**.

---

## 3. Skills do projeto (`.cursor/skills/`)

Pasta **presente e populada** no repositório. Carregar conforme a tarefa:

| Skill / caminho | Quando usar |
|-----------------|-------------|
| `supabase/supabase.md` | Schema, Auth, Realtime, RLS, client Expo, variáveis de ambiente, fluxos backend-as-a-service. |
| `prisma/SKILL.md` | Se o projeto usar Prisma contra o Postgres do Supabase (migrations, client). |
| `nestjs/SKILL.md` | Só se existir (ou for introduzido) backend Nest. |
| `ui-screen-design-system/SKILL.md` | Telas novas, consistência visual, composição de UI. |
| `frontend-design/SKILL.md` | Exploração visual e UX de interface. |
| `a11y-interaction-checklist/SKILL.md` | Checagem de acessibilidade e interações. |
| `code-review/SKILL.md` | Revisão estruturada antes de merge. |
| `writing-plans/SKILL.md` | Planos de implementação e decomposição de trabalho. |
| `brainstorming/SKILL.md` | Ideações e alternativas de produto/técnica. |
| `token-efficiency/SKILL.md` | Respostas enxutas quando o contexto for grande. |
| `multitenant/multitenant.md` | Modelagem multi-tenant — **avaliar** vs. grupos do PRD (isolamento por `group_id` + RLS). |
| `pagamento/pagamento.md`, `qrcode/qrcode.md` | **Fora do escopo v1**; manter para evoluções futuras. |
| `teste.md` | Skill de teste local do projeto (conteúdo específico do arquivo). |

**Skills globais do Cursor:** o ambiente pode expor skills adicionais (ex.: Supabase oficial, Prisma CLI, Stripe, Twilio, Figma). Se **não** estiverem copiadas para `.cursor/skills/`, tratá-las como **disponíveis no Cursor** conforme plugins/configuração do usuário; preferir sempre a skill do **repositório** quando existir duplicata temática.

---

## 4. MCP — servidores e ferramentas

**No workspace `C:\Users\DanielPlay\Desktop\Meubolso`:** não há pasta `mcps/` versionada nem arquivo óbvio de configuração MCP no repositório. Os servidores abaixo referem-se à **configuração típica do Cursor** neste projeto (ajustar se o time desabilitar algum).

| Servidor / família | Uso alinhado ao Meubolso |
|--------------------|---------------------------|
| **Context7** | Documentação atualizada de **Expo**, **React Native**, **Supabase**, **Zustand**, **React Query**, **testing-library**, etc. **Obrigatório** por `01-geral.mdc` para libs e APIs. |
| **Supabase (MCP)** | Inspecionar projeto, tabelas, logs, advisors, migrações; **nunca** colar secrets em docs ou commits. |
| **Prisma (MCP)** | Se/adotar Prisma: validate, migrate, consultar skills oficiais. |
| **Playwright (MCP)** | Prioridade para **web**; no mobile, o PRD/regras sugerem **Detox** / testes RN conforme `04-expo-quality-testing-observability.mdc`. |
| **Figma (MCP)** | Mockups, design system, telas — quando houver fluxo design ↔ código. |
| **Stripe (MCP)** | Pagamentos **não** estão no escopo v1; usar só em evoluções. |
| **Twilio-docs (MCP)** | Mensagens voz/SMS — **não** é requisito do PRD v1. |

**Boas práticas:** antes de chamar qualquer ferramenta MCP, **ler o schema/descriptor** do tool; não commitar chaves; preferir **RLS** e políticas testadas no Supabase para dados de grupos.

---

## 5. Fluxo de trabalho recomendado para o agente

1. Ler `docs/prd.md` e este `agente.md` para escopo e restrições.  
2. Para código mobile: aplicar regras Expo listadas na §2; consultar **Context7** para detalhes de API.  
3. Para banco/auth/realtime: skill **`supabase/supabase.md`** + MCP Supabase; seguir **`security.md`** (RLS, anon vs service role).  
4. Para UI: `01-frontend-geral`, `05-frontend-sem-cara-de-ia`, `ui-screen-design-system` / `frontend-design` quando necessário.  
5. Atualizar **`docs/task.md`** (`em progresso` → `concluído`) conforme cada entrega.  
6. Commits em **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, …), um escopo lógico por mudança.

---

## 6. O que não fazer

- Documentar ou versionar **secrets** (`.env`, service role, URLs com tokens).  
- Assumir Prisma/Nest/Next como obrigatórios — o PRD é **Expo + Supabase**.  
- Ignorar **Realtime** e **regras de negócio** de mês somente leitura e duplicação de contas.

---

*Última atualização: alinhado ao PRD maio/2026 e às regras/skills presentes no repositório.*
