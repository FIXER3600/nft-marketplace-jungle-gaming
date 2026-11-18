# Kurio — NFT Marketplace

Aplicação frontend para o desafio técnico da Jungle Gaming, reproduzindo um marketplace de NFTs completo com fluxos de descoberta, compra, carrinho, carteiras, perfil do colecionador e atualizações em tempo real com dados simulados.

- **Deploy:** [jungle-gaming-frontend-challenge-two.vercel.app](https://jungle-gaming-frontend-challenge-two.vercel.app/)
- **Repositório:** [github.com/FIXER3600/nft-marketplace-jungle-gaming](https://github.com/FIXER3600/nft-marketplace-jungle-gaming)

---

## 🚀 Stack Obrigatória

| Camada | Tecnologia |
| --- | --- |
| **Interface & Linguagem** | React 19 + TypeScript |
| **Roteamento** | TanStack Router (com proteção de rotas e estado na URL) |
| **Estado Remoto & Cache** | TanStack Query v5 (com atualizações otimistas e rollback) |
| **Cliente HTTP** | Axios |
| **Mocking & Rede** | MSW (Mock Service Worker v2) |
| **Tempo Real** | Socket.IO Client + `@mswjs/socket.io-binding` |
| **Estilização & UI** | Tailwind CSS v4 + shadcn/ui |
| **Testes E2E & Visual** | Playwright (Desktop, Tablet e Mobile) |
| **Auditoria** | Lighthouse CI |

---

## 💻 Como Executar

### Pré-requisitos
- Node.js `20.x` ou `22.x`
- npm

### Passo a passo

```bash
# 1. Instalar dependências
npm ci

# 2. Instalar navegadores do Playwright (para testes e auditoria)
npx playwright install chromium

# 3. Iniciar em ambiente de desenvolvimento (com mocks ativados)
npm run dev:mocks
```

Acesse [http://localhost:5173](http://localhost:5173).

Para testar o build de produção local:
```bash
npm run build:mocks
npm run preview
```

---

## 🔑 Credenciais Fictícias para Avaliação

| Usuário | E-mail | Senha | Perfil |
| --- | --- | --- | --- |
| **Ana Colecionadora** | `ana@kurio.test` | `Kurio123!` | Carteira cadastrada e histórico |
| **Bruno Investidor** | `bruno@kurio.test` | `Kurio123!` | Conta secundária |

> Também é possível cadastrar novos usuários pela interface. As senhas são armazenadas como hash SHA-256 no mock.

---

## 🛒 Cupons de Desconto Disponíveis

- `KURIO10`: Aplica 10% de desconto no carrinho.
- `KURIOEXPIRED`: Simula erro de cupom expirado.

---

## 🧪 Cenários de Teste e Falhas Simuladas

O projeto inclui simulação de cenários de rede diretamente pelo MSW. Na tela de checkout/pagamento, utilize o painel **Modo Demonstração** ou defina via console do navegador:

```javascript
// Exemplo: Simular rede lenta (1200ms) para avaliar skeletons
localStorage.setItem('kurio.mock-scenario', 'slow')
location.reload()

// Resetar para o cenário padrão
localStorage.removeItem('kurio.mock-scenario')
location.reload()
```

### Principais cenários suportados:
- `default`: Fluxo padrão de sucesso.
- `slow`: Latência de 1200ms nas requisições para inspeção de skeletons.
- `variable-latency`: Respostas fora de ordem para validar descarte de respostas obsoletas.
- `network-error`: Simula perda de conexão de rede (sem resposta HTTP).
- `session-expired`: Revoga a sessão simulando token expirado.
- `payment-declined`: Simula recusa de pagamento mantendo o carrinho intacto.
- `order-timeout`: Simula timeout na criação de pedido, recuperável via idempotência.
- `quote-changed`: Altera a cotação da taxa durante a revisão, exigindo revalidação.

### Reset do Banco de Dados Mock
Para resetar o banco local simulado para o estado inicial:
```javascript
await fetch('/api/mock/reset', { method: 'POST' })
location.reload()
```

---

## ⚡ Tempo Real (Socket.IO)

As atualizações em tempo real utilizam cliente Socket.IO real interceptado pelo `@mswjs/socket.io-binding`:
- Evento `nft.updated`: Atualiza instantaneamente preço e disponibilidade no catálogo, detalhe e carrinho.
- Evento `order.updated`: Notifica alterações de status do pedido (pendente, aprovado ou recusado).

Para simular alteração de mercado via console durante o checkout:
```javascript
await fetch('/api/mock/realtime', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'market', price: '1.29', available: 1 }),
})
```

---

## 📋 Comandos Disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev:mocks` | Inicia o servidor Vite com MSW ativo |
| `npm run build:mocks` | Gera o build de produção com mocks ativados |
| `npm run typecheck` | Executa a validação estática de tipos TypeScript |
| `npm run lint` | Executa a análise estática com ESLint |
| `npm run test:e2e` | Executa a suíte de testes E2E com Playwright |
| `npm run test:visual` | Executa testes de regressão visual |
| `npm run audit:lighthouse` | Executa auditoria automatizada do Lighthouse (12 medições) |

---

## 📑 Documentação Adicional

- [ARCHITECTURE.md](ARCHITECTURE.md): Detalhamento técnico dos contratos REST, política de cache, idempotência, eventos do Socket.IO e tolerância a falhas.
- [AUDIT.md](AUDIT.md): Relatório completo das medições do Lighthouse com métricas de LCP, CLS, TBT e justificativas.
- [CHALLENGE.md](CHALLENGE.md): Enunciado original do desafio.
