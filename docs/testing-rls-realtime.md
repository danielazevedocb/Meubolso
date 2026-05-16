# Testes manuais — RLS e Realtime (dois usuários)

Projeto Supabase do Meubolso não aparece ligado ao MCP deste workspace — estes passos são para validar contra o **seu** projeto (`supabase link` / Dashboard) após `supabase db push` ou aplicar migrations.

## Preparação

1. Duas contas Auth (por exemplo `user_a@example.com` e `user_b@example.com`).
2. No SQL Editor ou `supabase migration up`, garantir migrations até `supabase/migrations/20260515174500_rls_join_invite_months_bills_checks.sql`.
3. Opcional — conferir publication:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('bills','months','group_members')
order by tablename;
```

## RLS — usuário solo

| # | Passo | Esperado |
|---|-------|----------|
| S1 | Logar como A; criar linha em `months` com `group_id` null | OK |
| S2 | Inserir `bills` com `group_id` null, `user_id` = sessão atual | OK |
| S3 | Como B via API (sessão anon), só `select` onde `group_id is null and user_id = B`; tentar ler linhas solo de A | 0 linhas |
| S4 | Como B tentar `insert` em `months` com `group_id` null e `user_id` = UUID de A | recusado por RLS |

## RLS — grupo e convite

| # | Passo | Esperado |
|---|-------|----------|
| G1 | Logar como A; `insert into groups (...) returning id` sem insert manual em `group_members` | Uma linha em `group_members` com papel `owner` (trigger after insert). |
| G2 | Logar como B; chamar RPC `join_group_by_invite` / `join_group_by_invite('CODIGO')` correto via `supabase.rpc` | B aparece como `member` em `group_members`. |
| G3 | B tentando `insert` direto em `group_members` (client com anon key) | Erro permissão (`INSERT` revogado de `authenticated` — só entrada via RPC/privilege do dono da função). |
| G4 | B tenta `supabase.rpc("join_group_by_invite", { p_invite_code: "INVÁLIDO" })` | Erro tratável (“Invalid or unknown …”). |

## RLS — atribuição a membro real

| # | Passo | Esperado |
|---|-------|----------|
| R1 | A e B no mesmo grupo. A insere uma `bill` com `group_id` do grupo e `user_id` = B | OK (PRD: qualquer um edita contas uns dos outros). |
| R2 | A tenta insert `bill` com `group_id` do grupo mas `user_id` = usuário **não-membro** C | Recusado (políticas exige `group_members` alinhando `group_id` + `user_id`). |

## Soft-delete de contas

| # | Passo | Esperado |
|---|-------|----------|
| D1 | `update bills set deleted_at = now() where …` sobre linha visível antes | UPDATE aceito (`WITH CHECK` não exige mais `deleted_at is null`). |
| D2 | Select com política atual | Linhas soft-deleted somem das listagens (`bills_select_active`). |

## Realtime (rápido)

1. Dois dispositivos/sessões: A e B no mesmo grupo, ambos subscribed em `postgres_changes` em `bills` (filtrando `filter: group_id=eq.<uuid>` quando aplicável ao client).
2. A insere ou atualiza uma conta elegível ao filtro.

**Esperado:** B recebe o evento; usuário solo de um terceiro grupo **não** deve receber (RLS não filtra o fan-out do servidor sozinho — use sempre `filter` no canal alinhado ao `group_id` em modo colaborativo, conforme `.cursor/skills/supabase/supabase.md`).

## MCP / advisors (opcional)

Com o **project ID** correto Meubolso configurado na integração Cursor, usar `get_advisors` tipo `security` depois das migrations para checar avisos adicionais de RLS.
