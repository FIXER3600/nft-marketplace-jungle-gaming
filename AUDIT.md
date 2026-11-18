# Auditoria Lighthouse

Executada em quarta-feira, 18 de novembro de 2026 às 12:13. Comando reproduzível: `npm run audit:lighthouse`. Foram realizadas três medições sequenciais para cada página e perfil, totalizando 12 navegações. As medianas abaixo são calculadas separadamente por categoria e métrica, sem escolher apenas a melhor execução.

| Perfil | Página | Performance ≥90 | Acessibilidade ≥95 | Boas práticas ≥95 | SEO ≥90 | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | inicio | 84 | 100 | 100 | 92 | 3.44 s | 0.0000 | 318 ms |
| mobile | detalhe | 79 | 100 | 100 | 92 | 3.69 s | 0.0000 | 292 ms |
| desktop | inicio | 98 | 100 | 100 | 92 | 0.97 s | 0.0001 | 30 ms |
| desktop | detalhe | 99 | 100 | 100 | 92 | 0.92 s | 0.0004 | 6 ms |

## Ambiente e condições

- Windows_NT 10.0.22631 x64; AMD Ryzen 5 3600 6-Core Processor              ; 12 CPUs lógicas; 32 GiB RAM.
- Node v20.19.6; Playwright 1.64.1; Lighthouse 12.6.1; Lighthouse CI 0.15.1.
- Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36.
- Build Vite otimizado, MSW padrão, assets locais completos, Chromium headless, perfil novo, cache/storage limpos pelo Lighthouse a cada navegação, sem extensões. Rede e CPU simuladas pelo Lighthouse conforme perfil; medições sequenciais na máquina local.
- Mobile: 390 × 844; desktop: 1440 × 900. Configurações de rede/CPU resolvidas constam em cada JSON e em `reports/lighthouse/summary.json`.
- Identificador SHA-256 dos fontes/assets/build inputs: `d013d0e0c215f685d9945226630f0e399183ce0793ca5450b11fd7ed25954701`.
- Relatórios completos HTML e JSON: `reports/lighthouse/`; resumo legível por máquina: [summary.json](reports/lighthouse/summary.json); ambiente: [environment.json](reports/lighthouse/environment.json).

## Diagnóstico

As causas abaixo vêm do relatório cuja pontuação de performance está mais próxima da mediana de cada conjunto. As medições dependem da máquina e do ambiente; os scores não são garantias de produção. Nenhuma imagem, fonte ou funcionalidade é removida para a auditoria.

### mobile / inicio

Abaixo da meta: performance (84 < 90). As limitações observadas são registradas abaixo; não se declara atendimento integral das metas.

- Largest Contentful Paint — 3.4 s (audit: `largest-contentful-paint`).
- Total Blocking Time — 320 ms (audit: `total-blocking-time`).
- Max Potential First Input Delay — 330 ms (audit: `max-potential-fid`).
- Largest Contentful Paint element — 3,440 ms (audit: `largest-contentful-paint-element`).
- Largest Contentful Paint image was lazily loaded (audit: `lcp-lazy-loaded`).
- Preload Largest Contentful Paint image — Est savings of 170 ms (audit: `prioritize-lcp-image`).
- Eliminate render-blocking resources — Est savings of 0 ms (audit: `render-blocking-resources`).
- Reduce unused JavaScript — Est savings of 71 KiB (audit: `unused-javascript`).
- Properly size images — Est savings of 4,832 KiB (audit: `uses-responsive-images`).
- robots.txt is not valid — 25 errors found (audit: `robots-txt`).

Relatórios: [medição 1](reports/lighthouse/mobile-inicio-1.html), [medição 2](reports/lighthouse/mobile-inicio-2.html), [medição 3](reports/lighthouse/mobile-inicio-3.html).

### mobile / detalhe

Abaixo da meta: performance (79 < 90). As limitações observadas são registradas abaixo; não se declara atendimento integral das metas.

- First Contentful Paint — 2.8 s (audit: `first-contentful-paint`).
- Largest Contentful Paint — 3.8 s (audit: `largest-contentful-paint`).
- Total Blocking Time — 270 ms (audit: `total-blocking-time`).
- Max Potential First Input Delay — 230 ms (audit: `max-potential-fid`).
- Time to Interactive — 3.9 s (audit: `interactive`).
- Largest Contentful Paint element — 3,760 ms (audit: `largest-contentful-paint-element`).
- Preload Largest Contentful Paint image — Est savings of 20 ms (audit: `prioritize-lcp-image`).
- Eliminate render-blocking resources — Est savings of 0 ms (audit: `render-blocking-resources`).
- Reduce unused JavaScript — Est savings of 70 KiB (audit: `unused-javascript`).
- Properly size images — Est savings of 5,014 KiB (audit: `uses-responsive-images`).

Relatórios: [medição 1](reports/lighthouse/mobile-detalhe-1.html), [medição 2](reports/lighthouse/mobile-detalhe-2.html), [medição 3](reports/lighthouse/mobile-detalhe-3.html).

### desktop / inicio

Todas as medianas atendem às metas.

- Max Potential First Input Delay — 150 ms (audit: `max-potential-fid`).
- Browser errors were logged to the console (audit: `errors-in-console`).
- Preload Largest Contentful Paint image — Est savings of 90 ms (audit: `prioritize-lcp-image`).
- Eliminate render-blocking resources — Est savings of 0 ms (audit: `render-blocking-resources`).
- Reduce unused JavaScript — Est savings of 71 KiB (audit: `unused-javascript`).
- Properly size images — Est savings of 4,606 KiB (audit: `uses-responsive-images`).
- robots.txt is not valid — 25 errors found (audit: `robots-txt`).
- Page prevented back/forward cache restoration — 1 failure reason (audit: `bf-cache`).
- Forced reflow (audit: `forced-reflow-insight`).
- LCP request discovery (audit: `lcp-discovery-insight`).

Relatórios: [medição 1](reports/lighthouse/desktop-inicio-1.html), [medição 2](reports/lighthouse/desktop-inicio-2.html), [medição 3](reports/lighthouse/desktop-inicio-3.html).

### desktop / detalhe

Todas as medianas atendem às metas.

- Preload Largest Contentful Paint image — Est savings of 30 ms (audit: `prioritize-lcp-image`).
- Eliminate render-blocking resources — Est savings of 0 ms (audit: `render-blocking-resources`).
- Reduce unused JavaScript — Est savings of 70 KiB (audit: `unused-javascript`).
- Properly size images — Est savings of 4,920 KiB (audit: `uses-responsive-images`).
- robots.txt is not valid — 25 errors found (audit: `robots-txt`).
- Page prevented back/forward cache restoration — 1 failure reason (audit: `bf-cache`).
- LCP request discovery (audit: `lcp-discovery-insight`).
- Network dependency tree (audit: `network-dependency-tree-insight`).
- Render blocking requests (audit: `render-blocking-insight`).

Relatórios: [medição 1](reports/lighthouse/desktop-detalhe-1.html), [medição 2](reports/lighthouse/desktop-detalhe-2.html), [medição 3](reports/lighthouse/desktop-detalhe-3.html).

