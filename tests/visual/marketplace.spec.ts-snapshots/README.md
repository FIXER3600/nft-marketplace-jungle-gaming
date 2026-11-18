# Baselines visuais

As capturas versionadas correspondem ao Chromium distribuído pela versão de Playwright fixada no lockfile, em Windows (Win32), com a fonte Roboto Mono local. O workflow de CI usa Windows e Node 22 para manter a mesma plataforma de rasterização.

- Início, detalhe do NFT, carrinho e pagamento: desktop 1440 × 900 e mobile 390 × 844.
- Tablet 768 × 1024: o mesmo fluxo verifica carregamento e ausência de overflow horizontal.
- Contexto de navegador novo por teste; carrinho e autenticação são preparados pela interface e pelos handlers MSW, com dados padrão estáveis.
- A captura aguarda fontes e imagens, rola a página para carregar os assets lazy e volta ao topo. Animações e cursor de texto são desativados somente na screenshot.

Comparar: `npm run test:visual`.

Atualizar após revisar uma alteração visual intencional: `npx playwright test tests/visual --update-snapshots`.

Em outro sistema operacional, execute os testes funcionais com `npx playwright test tests/e2e`. Novas baselines dessa plataforma precisam de revisão visual própria; não reutilize capturas antigas com fontes diferentes. O relatório HTML padrão fica em `playwright-report` e traces de falhas em `test-results`.
