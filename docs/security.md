# Segurança — documentação do repositório

Este arquivo resume o que **não** pode entrar na documentação nem no histórico Git por engano. As regras completas de engenharia estão em `.cursor/rules/security.md`.

## O que nunca documentar nem commitar

- Ficheiros `.env` preenchidos ou cópias com valores reais.
- **Service role** do Supabase, tokens de loja, certificados privados, passwords ou strings que concedam privilégio no servidor.
- URLs temporárias com credenciais embutidas.

## Variáveis públicas no Expo (`EXPO_PUBLIC_*`)

- São incluídas no bundle da aplicação e podem ser inspecionadas.
- Use apenas a **chave anon / publishable** do Supabase no cliente; toda autorização sensível deve estar em **RLS** e políticas no Postgres.

## Boas práticas para PRs e docs

- Usar sempre placeholders nos exemplos (`YOUR_PROJECT`, `…`, ou variáveis sem valor).
- Rotacionar qualquer segredo que tenha sido exposto acidentalmente.

Para decisões de stack (sessão, APIs, validação), siga o documento de regras citado acima.
