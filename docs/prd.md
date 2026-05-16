# PRD — Aplicativo de Finanças Pessoal
**Produto:** FinançasPessoal
**Plataforma:** Mobile (Expo / React Native)
**Versão:** 1.0
**Data:** Maio 2026

---

## 1. Visão Geral

Aplicativo mobile para registro e controle de contas mensais. Qualquer pessoa pode baixar, criar sua conta e começar a usar. Suporta uso colaborativo entre membros de um mesmo grupo (ex: casal, família, república) com sincronização em tempo real.

---

## 2. Problema

Muitas pessoas controlam contas mensais em planilhas manuais. Elas funcionam, mas:

- Só uma pessoa edita por vez (sem colaboração em tempo real)
- Não estão disponíveis facilmente no celular
- Não avisam quando algo muda
- Não mantêm histórico organizado por mês

---

## 3. Usuários

| Perfil | Descrição |
|---|---|
| Usuário solo | Baixa o app e controla as próprias contas individualmente |
| Usuário colaborativo | Compartilha um grupo com outra(s) pessoa(s) — cada membro vê e edita as contas de todos |

Qualquer usuário cadastrado pode criar ou entrar em um grupo. Não há hierarquia entre membros.

---

## 4. Objetivos do Produto

1. Permitir que qualquer pessoa registre e acompanhe suas contas mensais pelo celular
2. Suportar uso compartilhado em tempo real entre membros de um grupo
3. Calcular automaticamente total de contas, saldo e diferença em relação ao salário
4. Ser simples o suficiente para uso diário sem treinamento

---

## 5. Fora do Escopo (v1.0)

- Gráficos e relatórios analíticos
- Categorias de despesas
- Exportar para Excel/PDF
- Notificações de vencimento
- Integração bancária
- Multi-idioma

---

## 6. Funcionalidades

### 6.1 Autenticação

- Cadastro com nome, e-mail e senha
- Login com e-mail e senha
- Sessão persistente (não precisa logar toda vez)
- Identificação visual do usuário logado (nome/avatar)

---

### 6.2 Grupos

- Ao entrar no app pela primeira vez, o usuário pode:
  - **Criar um grupo** (ex: "Finanças Casa") e receber um código de convite
  - **Entrar em um grupo existente** via código de convite
  - **Usar solo** sem grupo
- Cada membro do grupo vê as contas de todos os outros membros
- Máximo de 6 membros por grupo na v1.0

---

### 6.3 Tela Principal — Visão Geral do Mês

- Exibe o mês atual com navegação para meses anteriores (← →)
- Um card por membro do grupo (ou apenas o card do próprio usuário se solo)
- Cada card mostra:
  - Nome do membro
  - Total de contas do mês
  - Salário informado
  - Saldo (salário − total de contas)
  - Saldo em vermelho se negativo, verde se positivo
- Botão de acesso rápido para adicionar nova conta

---

### 6.4 Tela de Contas — Por Membro

Exibe a lista de contas do membro selecionado no mês atual.

**Cada item da lista mostra:**

| Campo | Exemplo |
|---|---|
| Empresa / Descrição | CONDOMÍNIO |
| Valor | R$ 380,00 |
| Vencimento | 10/mai |
| Status | pago / pendente |

**Ações em cada item:**
- Editar (abre modal de edição)
- Marcar como pago (toggle)
- Excluir (com confirmação)

**Rodapé da lista:**
- Total das contas
- Salário
- Saldo calculado automaticamente
- Nota do mês: campo de texto livre por membro, por mês (ex: "pagar conta com cartão de crédito") — aparece abaixo do saldo como observação geral daquele mês

---

### 6.5 Adicionar / Editar Conta

Modal ou tela com os campos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| Empresa / Descrição | Texto | Sim |
| Valor | Numérico (R$) | Sim |
| Vencimento | Data (dia/mês) | Não |
| Status | Toggle pago/pendente | Não |
| Observação | Texto livre | Não |

- Ao salvar, a lista atualiza em tempo real para todos os membros do grupo
- Ao editar conta de outro membro, exibe aviso: "Você está editando uma conta de [nome do membro]"

---

### 6.6 Configuração do Salário

- Cada membro informa o próprio salário do mês
- Campo editável diretamente na tela de contas
- Membros do grupo podem visualizar e editar o salário uns dos outros

---

### 6.7 Sincronização em Tempo Real

- Qualquer alteração (adicionar, editar, excluir, marcar como pago) é refletida imediatamente na tela dos outros membros
- Indicador visual quando outro membro está online ("[Nome] está online agora")

---

### 6.8 Histórico por Mês

- Ao navegar para meses anteriores, os dados ficam somente leitura
- Possível visualizar mas não editar meses já encerrados (proteção contra alteração acidental)

---

### 6.9 Duplicar Contas do Mês Anterior

Permite copiar todas as contas de um mês anterior para o mês atual com um único toque, evitando retrabalho para contas que se repetem todo mês.

**Quando aparece:**
- O mês atual está aberto (editável)
- O mês atual ainda não tem nenhuma conta cadastrada OU o usuário aciona manualmente pelo menu
- Existe pelo menos um mês anterior com contas registradas

**Fluxo principal — mês atual vazio:**

1. Ao abrir o mês atual sem contas, exibe um banner/card no topo da tela:
   "Nenhuma conta cadastrada. Deseja copiar as contas de maio/2026?"
   - Botão "Copiar do mês anterior"
   - Botão "Começar do zero" (dispensa o banner)

2. Ao tocar em "Copiar do mês anterior", exibe um modal de confirmação com prévia:
   - Título: "Copiar contas de maio/2026 → junho/2026"
   - Lista resumida das contas que serão copiadas (empresa + valor), separadas por membro
   - Total de itens: "11 contas de [Membro A] · 10 contas de [Membro B]"
   - Dois botões: Confirmar e Cancelar

3. Ao confirmar, todas as contas são duplicadas para o mês atual com:
   - Mesmos campos: empresa, valor, vencimento, observação
   - Status resetado para pendente (não pago) em todas
   - `month` atualizado para o mês atual
   - `copied_from` preenchido com o mês de origem (rastreabilidade)
   - Salário copiado como ponto de partida; pode ser editado depois

4. Após a cópia, a lista do mês atual aparece normalmente, pronta para edição.

**Fluxo alternativo — mês atual já tem contas:**

- O banner não aparece automaticamente
- A opção fica disponível no menu (⋮) da tela de contas: "Importar contas do mês anterior"
- Ao acionar, exibe modal de aviso:
  "Atenção: o mês atual já possui X contas. As contas importadas serão adicionadas sem apagar as existentes. Deseja continuar?"
- Botões: Continuar e Cancelar
- Se confirmado, as contas são adicionadas (sem duplicar itens que já existam com o mesmo nome)

**O que é copiado / não copiado:**

| Campo | Copiado? |
|---|---|
| Empresa / Descrição | ✅ Sim |
| Valor | ✅ Sim |
| Vencimento (dia) | ✅ Sim |
| Observação da conta | ✅ Sim |
| Salário | ✅ Sim |
| Status (pago/pendente) | ❌ Resetado para pendente |
| Nota do mês | ❌ Não copiada |

---

## 7. Modelo de Dados (Supabase / PostgreSQL)

### Tabela: `users`
```sql
id          uuid PRIMARY KEY
name        text
email       text UNIQUE
created_at  timestamp
```

### Tabela: `groups`
```sql
id           uuid PRIMARY KEY
name         text
invite_code  text UNIQUE
created_by   uuid REFERENCES users(id)
created_at   timestamp
```

### Tabela: `group_members`
```sql
id        uuid PRIMARY KEY
group_id  uuid REFERENCES groups(id)
user_id   uuid REFERENCES users(id)
joined_at timestamp
```

### Tabela: `months`
```sql
id        uuid PRIMARY KEY
group_id  uuid REFERENCES groups(id)
user_id   uuid REFERENCES users(id)
month     text           -- ex: "2026-05"
salary    numeric(10,2)
note      text
```

### Tabela: `bills`
```sql
id           uuid PRIMARY KEY
group_id     uuid REFERENCES groups(id)
user_id      uuid REFERENCES users(id)
month        text           -- ex: "2026-05"
company      text
amount       numeric(10,2)
due_date     text           -- ex: "10/05"
paid         boolean DEFAULT false
note         text
copied_from  text           -- ex: "2026-04" ou null
created_at   timestamp
updated_at   timestamp
updated_by   uuid REFERENCES users(id)
```

---

## 8. Stack Técnica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Mobile | Expo (React Native) | iOS e Android com uma única base de código |
| Backend/DB | Supabase (PostgreSQL) | Banco relacional, tempo real via Realtime, gratuito para esse volume |
| Autenticação | Supabase Auth | Integrado ao banco, suporte a e-mail/senha |
| Sincronização | Supabase Realtime | Subscriptions em tempo real por tabela/linha |
| State | Zustand ou Context API | Simples para o escopo do app |

---

## 9. Telas do App (Mapa de Navegação)

```
Onboarding (cadastro / login)
  └── Configuração do Grupo (criar / entrar / solo)
        └── Visão Geral do Mês
              ├── Contas do Membro A
              │     ├── Adicionar Conta
              │     ├── Editar Conta
              │     └── [Menu ⋮] Importar contas do mês anterior
              ├── Contas do Membro B
              │     ├── Adicionar Conta
              │     ├── Editar Conta
              │     └── [Menu ⋮] Importar contas do mês anterior
              ├── Modal: Duplicar Mês (prévia + confirmação)
              └── Configurações (perfil, grupo, salário, logout)
```

---

## 10. Regras de Negócio

1. **Saldo** = Salário − Total das Contas (por membro)
2. Contas sem valor preenchido são tratadas como R$ 0,00
3. Meses anteriores são somente leitura após o 1º dia do mês seguinte
4. Qualquer membro do grupo pode criar, editar e excluir contas dos outros membros
5. A nota do mês é individual por membro por mês e não é copiada na duplicação
6. O código de convite do grupo pode ser regenerado pelo criador do grupo

---

## 11. Critérios de Aceitação — v1.0

| # | Critério |
|---|---|
| 1 | Usuário consegue se cadastrar e logar com e-mail e senha |
| 2 | Usuário consegue criar um grupo e convidar outra pessoa via código |
| 3 | Membros do grupo veem as contas uns dos outros em tempo real |
| 4 | Adicionar uma conta reflete imediatamente na tela dos outros membros |
| 5 | O saldo é recalculado automaticamente ao adicionar/editar/excluir |
| 6 | É possível marcar uma conta como paga |
| 7 | É possível navegar entre meses anteriores |
| 8 | Meses anteriores não podem ser editados |
| 9 | Ao abrir um mês vazio, o app sugere copiar as contas do mês anterior |
| 10 | A cópia reseta o status de todas as contas para "pendente" |
| 11 | Contas duplicadas não sobrescrevem contas já existentes no mês destino |
| 12 | É possível escolher um mês de origem diferente do imediatamente anterior |

---

## 12. Métricas de Sucesso

- Usuários utilizam o app diariamente no lugar de planilhas
- Zero perda de dados após 30 dias de uso
- Tempo para adicionar uma conta: menos de 20 segundos
- Taxa de retenção após 7 dias: acima de 60%

---

## 13. Próximas Versões (Backlog Futuro)

| Funcionalidade | Versão |
|---|---|
| Notificação de vencimento (push) | 1.1 |
| Resumo mensal com gráfico simples | 1.2 |
| Exportar mês como PDF | 1.2 |
| Suporte a múltiplos grupos por usuário | 2.0 |
| Integração com Open Finance | 2.0 |
