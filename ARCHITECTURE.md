# Arquitetura

## Organização e escopo

React/TypeScript com Vite, Tailwind, componentes shadcn/ui (Button/Carousel), primitivas Radix, TanStack Router/Query, Axios e Socket.IO. MSW implementa os serviços simulados usados tanto em desenvolvimento quanto no build e nos testes.

- `src/app`: providers, bootstrap e roteamento.
- `src/pages`: telas; detalhe, conta, carrinho e checkout carregados sob demanda.
- `src/features`: componentes, hooks e contratos tipados por domínio.
- `src/components`: UI e estrutura compartilhada.
- `src/lib`: Axios, QueryClient, sessão, precisão ETH e contratos de eventos.
- `src/mocks`: REST/WebSocket, fixtures, banco e cenários.
- `tests/e2e`, `tests/visual`: testes funcionais e baselines.
- `scripts`, `reports`: auditorias e otimização de assets.

Atividade, ofertas, downloads, suporte e páginas editoriais permanecem fora do escopo. Seus controles apresentam aviso; login social, recuperação de senha e newsletter não simulam sucesso nem enviam dados a terceiros.

## Transporte e persistência

Chamadas de negócio passam por `src/lib/http.ts`: Axios com `Authorization: Bearer`, `X-Guest-Id` e AbortSignal das queries. Timeout padrão de 15 s; envio de pedido usa 3 s. A UI e os hooks não contêm fixtures ou caminhos alternativos de negócio.

O bootstrap inicia MSW **antes** de importar dinamicamente a aplicação. Engine.IO captura WebSocket durante a avaliação do módulo; importar o cliente antes de `worker.start()` faria o socket escapar da interceptação. `VITE_ENABLE_MOCKS=false` desativa os mocks; a origem do socket é a origem da página quando a variável correspondente é omitida.

O banco `kurio.mock-database.v1` guarda contas, sessões, favoritos, carrinhos, perfis, carteiras, mercado, cotações e pedidos. REST e socket compartilham esse estado. `POST /api/mock/reset` restaura o banco, identidades, tentativas, rascunhos e cenários; recarregar limpa também o cache em memória. A persistência é local ao navegador e não representa um backend de produção ou sincronização entre dispositivos.

## Contratos REST

Tipos de transporte são compartilhados entre UI e mocks em `src/features/*/types.ts`; eventos em `src/lib/realtime-events.ts`. ETH trafega como string decimal; quantidades são inteiras.

| Recurso       | Operações                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessão        | `GET /api/session` → `{ user }`; `POST` com `{ email, password }` → `{ user, token }`; `DELETE` → 204.                                                   |
| Cadastro      | `POST /api/users` com `{ username, email, password, confirmPassword }` → usuário/token, 201.                                                             |
| Catálogo      | `GET /api/nfts` com busca, coleção, redes, preços, categoria, ordenação, favoritos e página → itens, pageSize, página, total e totalPages.               |
| Contagens     | `GET /api/nfts/facets` → contagens globais por coleção/rede.                                                                                             |
| Detalhe       | `GET /api/nfts/:id` → galeria, edições, limites, estoque e metadados; `GET /api/nfts/:id/related` → relacionados.                                        |
| Favoritos     | `GET /api/favorites` → `{ ids }`; `PUT /api/favorites/:id` com `{ favorite }` → `{ ids }`.                                                               |
| Carrinho      | `GET /api/cart`; `POST /api/cart/items` com `{ nftId, editionId, quantity }`; `PATCH /api/cart/items/:nftId/:editionId` com `{ quantity }`, zero remove. |
| Cupom         | `PUT /api/cart/promotion` com `{ code }`, vazio remove; retorna resumo atualizado.                                                                       |
| Recomendações | `GET /api/cart/recommendations` → itens.                                                                                                                 |
| Checkout      | `GET /api/checkout` → perfil/carteiras; `PUT /api/checkout/profile` valida e salva dados.                                                                |
| Cotação       | `POST /api/checkout/quote` com `{ walletId, provider }` → validade, endereço/rede e snapshot do resumo.                                                  |
| Pedido        | `POST /api/orders` com `{ quoteId, profile }` e header `Idempotency-Key` → `Order`.                                                                      |
| Recuperação   | `GET /api/orders/attempt/:key` e `GET /api/orders/:id` → estado/recibo da própria conta.                                                                 |
| Perfil        | `GET /api/profile`; `PUT /api/profile` valida dados, avatar e alteração de senha na mesma operação.                                                      |
| Carteiras     | `GET/POST /api/wallets`; `PUT /api/wallets/:id`; `PUT /api/wallets/preferences`.                                                                         |
| Conexão       | `POST /api/wallets/:id/connection` com `{ provider, connect }` → carteiras atualizadas.                                                                  |

Erros: `{ message, fields?, code?, orderId? }`. Os handlers representam 401, 403, 404, 409, 422, 503 e falha de conexão sem resposta HTTP. Recursos privados de outra conta retornam 404 para não revelar sua existência. Cenários configuráveis estão documentados no README.

## Sessão, URL e cache

`beforeLoad` das rotas privadas consulta sessão por Query/Axios antes de carregar checkout, perfil, carteiras e favoritos. O gate conserva a URL e retoma após login. Sessões duram uma hora; há revalidação periódica, por foco e na navegação protegida. Um 401 só expira a sessão se corresponder ao token atual. Senhas são hashes SHA-256 no mock, sem persistência das senhas digitadas em claro.

Logout, troca de conta e expiração cancelam/removem queries privadas e subscriptions anteriores. Respostas/eventos validam a identidade capturada antes de atualizar o cache. Logout em outra aba também é observado. O rascunho do checkout fica em `sessionStorage` por usuário, sobrevive à expiração e é removido no logout explícito, confirmação e reset.

| Consulta             | Chave e política                                                            |
| -------------------- | --------------------------------------------------------------------------- |
| Catálogo             | Todos os parâmetros normalizados da URL; stale time 30 s. Facets 60 s.      |
| Detalhe/relacionados | ID do NFT; stale time 30 s.                                                 |
| Favoritos            | `['favorites', userId]`; stale time 30 s.                                   |
| Carrinho             | Identidade da conta/visitante e guestId; stale time 10 s.                   |
| Sessão               | `['session']`, com resposta validada pelo token capturado; stale time 30 s. |
| Conta/checkout       | `['checkout', userId, recurso]`; 30 s para setup/perfil/carteiras.          |
| Pedido               | Conta e ID; reconciliação REST a cada 1,5 s enquanto pendente.              |

As principais queries e mutations desativam retry automático e oferecem nova tentativa na interface. Consultas auxiliares sem configuração própria herdam os padrões do TanStack Query. A mutation de pedido nunca tem retry automático. AbortSignal e cancelamento descartam respostas obsoletas. Busca, filtros combinados, ordenação e página pertencem à URL; mudanças de filtro reiniciam a página.

Favorito usa atualização otimista: cancela query, guarda snapshot, altera cache e reverte em erro. O resultado REST prevalece após sucesso. Carrinho e demais mutations adotam a resposta da API. Eventos e reconexão invalidam recursos ativos para reconciliar com REST.

## Carrinho, cotação e pedido

`X-Guest-Id` preserva o carrinho do visitante. Login/cadastro mesclam itens com a conta e revalidam estoque/limites, com avisos. Linhas são identificadas por NFT e edição. Cálculos usam BigInt em unidades de 10^-18 ETH; não usam ponto flutuante nos totais. `KURIO10` aplica 10%; taxa inicial estimada 0.016 ETH em carrinhos não vazios.

A cotação vale 120 s e preserva carteira, rede, endereço, itens, cupom e valores. Antes do envio, a API revalida sessão, conexão, disponibilidade e fingerprint do carrinho. Mudanças retornam 409 e exigem nova revisão. Alteração do resumo recebida durante a revisão invalida a cotação aberta.

A tentativa `{ key, body }` é persistida em `kurio.checkout-attempt.USER` antes do envio. Mesma chave e conteúdo recuperam o mesmo pedido; conteúdo diferente retorna `IDEMPOTENCY_CONFLICT`. Clique repetido também é bloqueado pela UI. Após timeout, consulta-se a tentativa antes de oferecer reenvio com a mesma chave. `/pagamento?pedido=UUID` permite retomar por refresh/acesso direto.

Pedido passa de pendente a confirmado ou recusado; estados terminais não regridem. Falhas preservam o carrinho. Confirmação remove só as quantidades compradas, preservando itens adicionados depois. Recibo usa snapshot imutável, sem recalcular pelo catálogo. Transações/explorador são simulados, sem blockchain ou pagamento real.

## Socket.IO

`socket.io-client` usa WebSocket interceptado por `msw.ws.link` e `@mswjs/socket.io-binding@0.2.0`. O binding implementa handshake; o mock envia heartbeat a cada 20 s. O transporte simulado usa namespace padrão e mensagens de texto, sem servidor externo, HTTP polling, rooms ou payload binário.

| Evento            | Contrato                                                     |
| ----------------- | ------------------------------------------------------------ |
| `nft.subscribe`   | Assinatura pública de mercado, conexão global por sessão.    |
| `nft.updated`     | `{ eventId, id, editionId, version, price, available }`.     |
| `order.subscribe` | `{ token, orderId }`, validado contra sessão e propriedade.  |
| `order.updated`   | `{ eventId, userId, id, version, order }`.                   |
| `session.expired` | Encerra assinatura privada e solicita recuperação da sessão. |

Clientes descartam duplicatas/versões antigas por recurso e verificam conta/token/ID. Pedido terminal não volta a pendente. Listeners são removidos e sockets encerrados ao desmontar ou trocar sessão. Reconexão consulta REST. O polling de pedidos pendentes é somente fallback: testes verificam subscriptions/frames do transporte e `data-socket-version` só muda com eventos recebidos pelo cliente Socket.IO.

`POST /api/mock/realtime` permite atualizar mercado, interromper conexão e repetir eventos; `GET` expõe diagnósticos do transporte. São endpoints exclusivos do MSW e não chamam setters, UI ou QueryClient. As mesmas alterações atualizam REST e eventos. Não existe polling de `/api/nft-events`.

## Visual, acessibilidade e validação

Decisão do usuário: preservar composição do site de referência (hero mobile mais alto, grid regular, cards arredondados, sidebar desktop 280 px). A fonte exata Roboto Mono foi confirmada na cópia Figma `lPEqUCTCjFGAAVYns5abXW` e incluída localmente em WOFF2 variável com licença OFL. Não há dependência de CDN em execução.

As quatro imagens foram convertidas para WebP lossless, mantendo pixels RGBA idênticos. Prova em `reports/assets/lossless-verification.json`, originais em `references/original-assets`. Telas exportadas de referência não são usadas como interface. A galeria usa enquadramentos do mesmo asset, conforme a base recebida; avatar é otimizado em 256 px.

Radix fornece foco e semântica em diálogos, menus, drawers e abas. Há foco visível, labels/erros associados, feedback acessível, skeletons com shimmer e respeito a movimento reduzido. Contagens/valores vêm dos mocks e podem diferir dos números ilustrativos do Figma.

Playwright cobre 390, 768 e 1440 px, com contextos isolados, HTML e traces de falhas. Baselines foram produzidas em Windows/Chromium e o CI usa Windows. Lighthouse mede o build real, com mocks, fontes e imagens; três coletas por início/detalhe em mobile/desktop. `AUDIT.md` registra medianas, LCP/CLS/TBT, ambiente e metas eventualmente não atingidas.
