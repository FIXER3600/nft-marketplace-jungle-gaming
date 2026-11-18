import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const lhciRequire = createRequire(require.resolve('@lhci/cli/package.json'))
const { default: lighthouse, desktopConfig } = await import(
  pathToFileURL(lhciRequire.resolve('lighthouse')).href
)
const chromeLauncher = lhciRequire('chrome-launcher')
const { chromium } = await import('@playwright/test')
const output = path.join(root, 'reports', 'lighthouse')
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const targets = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

async function fingerprint() {
  const hash = createHash('sha256')
  async function add(relative) {
    const files = await readdir(path.join(root, relative), {
      withFileTypes: true,
    })
    for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(relative, file.name)
      if (file.isDirectory()) await add(next)
      else {
        hash.update(next.replaceAll('\\', '/'))
        hash.update(await readFile(path.join(root, next)))
      }
    }
  }
  await add('src')
  await add('public')
  for (const name of [
    'package-lock.json',
    'vite.config.ts',
    'index.html',
    '.env.mocks',
  ]) {
    hash.update(name)
    hash.update(await readFile(path.join(root, name)))
  }
  return hash.digest('hex')
}

async function startPreview(port) {
  const server = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let logs = ''
  server.stdout.on('data', (data) => {
    logs += data.toString()
  })
  server.stderr.on('data', (data) => {
    logs += data.toString()
  })
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`Preview encerrou: ${logs}`)
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`)
        if (response.ok) return server
      } catch {
        /* The local server is still starting. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`Preview não iniciou: ${logs}`)
  } catch (error) {
    server.kill()
    throw error
  }
}

await mkdir(output, { recursive: true })
const chromePath = process.env.CHROME_PATH || chromium.executablePath()
const environment = {
  date: new Date().toISOString(),
  timezone: 'America/Sao_Paulo',
  os: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  logicalCpus: os.cpus().length,
  memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
  node: process.version,
  playwright: require('@playwright/test/package.json').version,
  lighthouse: lhciRequire('lighthouse/package.json').version,
  lighthouseCI: require('@lhci/cli/package.json').version,
  chromePath,
  sourceSha256: await fingerprint(),
  conditions:
    'Build Vite otimizado, MSW padrão, assets locais completos, Chromium headless, perfil novo, cache/storage limpos pelo Lighthouse a cada navegação, sem extensões. Rede e CPU simuladas pelo Lighthouse conforme perfil; medições sequenciais na máquina local.',
}
const results = []
for (const profile of ['mobile', 'desktop']) {
  const config = require(
    path.join(
      root,
      profile === 'mobile' ? 'lighthouserc.cjs' : 'lighthouserc.desktop.cjs',
    ),
  )
  const settings = { ...config.ci.collect.settings }
  delete settings.preset
  const port = profile === 'mobile' ? 4182 : 4183
  const preview = await startPreview(port)
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
    ],
  })
  try {
    for (const [page, pathname] of [
      ['inicio', '/'],
      ['detalhe', '/nfts/nft-001'],
    ]) {
      const runs = []
      for (let run = 1; run <= config.ci.collect.numberOfRuns; run++) {
        const name = `${profile}-${page}-${run}`
        console.log(`Lighthouse ${name}`)
        const result = await lighthouse(
          `http://127.0.0.1:${port}${pathname}`,
          {
            ...settings,
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'error',
          },
          profile === 'desktop' ? desktopConfig : undefined,
        )
        if (!result || result.lhr.runtimeError) {
          throw new Error(
            `${name}: ${result?.lhr.runtimeError?.message || 'sem relatório'}`,
          )
        }
        await writeFile(path.join(output, `${name}.html`), result.report[0])
        await writeFile(path.join(output, `${name}.json`), result.report[1])
        runs.push({
          report: `${name}.html`,
          scores: Object.fromEntries(
            categories.map((key) => [
              key,
              Math.round(result.lhr.categories[key].score * 100),
            ]),
          ),
          metrics: {
            LCP: result.lhr.audits['largest-contentful-paint'].numericValue,
            CLS: result.lhr.audits['cumulative-layout-shift'].numericValue,
            TBT: result.lhr.audits['total-blocking-time'].numericValue,
          },
          browser: result.lhr.environment.hostUserAgent,
          settings: result.lhr.configSettings,
          warnings: result.lhr.runWarnings,
          issues: Object.values(result.lhr.audits)
            .filter(
              (audit) =>
                audit.score !== null &&
                audit.score < 0.9 &&
                audit.scoreDisplayMode !== 'informative',
            )
            .map((audit) => ({
              id: audit.id,
              title: audit.title,
              score: audit.score,
              displayValue: audit.displayValue,
            })),
        })
        console.log(JSON.stringify(runs.at(-1).scores))
      }
      results.push({
        profile,
        page,
        pathname,
        runs,
        scores: Object.fromEntries(
          categories.map((key) => [
            key,
            median(runs.map((run) => run.scores[key])),
          ]),
        ),
        metrics: Object.fromEntries(
          ['LCP', 'CLS', 'TBT'].map((key) => [
            key,
            median(runs.map((run) => run.metrics[key])),
          ]),
        ),
      })
    }
  } finally {
    await chrome.kill()
    preview.kill()
  }
}
if ((await fingerprint()) !== environment.sourceSha256) {
  throw new Error(
    'Os fontes mudaram durante a auditoria. Execute novamente sobre um build estável.',
  )
}
await writeFile(
  path.join(output, 'environment.json'),
  JSON.stringify(environment, null, 2),
)
await writeFile(
  path.join(output, 'summary.json'),
  JSON.stringify({ environment, results }, null, 2),
)
const rows = results
  .map(
    ({ profile, page, scores, metrics }) =>
      `| ${profile} | ${page} | ${categories.map((key) => scores[key]).join(' | ')} | ${(metrics.LCP / 1000).toFixed(2)} s | ${metrics.CLS.toFixed(4)} | ${Math.round(metrics.TBT)} ms |`,
  )
  .join('\n')
const findings = results
  .map((result) => {
    const failed = categories.filter((key) => result.scores[key] < targets[key])
    const sample = [...result.runs].sort(
      (a, b) =>
        Math.abs(a.scores.performance - result.scores.performance) -
        Math.abs(b.scores.performance - result.scores.performance),
    )[0]
    const issues = [
      ...new Map(sample.issues.map((issue) => [issue.id, issue])).values(),
    ]
    return `### ${result.profile} / ${result.page}\n\n${failed.length ? `Abaixo da meta: ${failed.map((key) => `${key} (${result.scores[key]} < ${targets[key]})`).join(', ')}. As limitações observadas são registradas abaixo; não se declara atendimento integral das metas.` : 'Todas as medianas atendem às metas.'}\n\n${
      issues.length
        ? issues
            .slice(0, 10)
            .map(
              (issue) =>
                `- ${issue.title}${issue.displayValue ? ` — ${issue.displayValue}` : ''} (audit: \`${issue.id}\`).`,
            )
            .join('\n')
        : 'Sem auditorias pontuadas abaixo de 0,90 no relatório representativo.'
    }\n\nRelatórios: ${result.runs.map((run, index) => `[medição ${index + 1}](reports/lighthouse/${run.report})`).join(', ')}.\n`
  })
  .join('\n')
const date = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: environment.timezone,
}).format(new Date(environment.date))
await writeFile(
  path.join(root, 'AUDIT.md'),
  `# Auditoria Lighthouse\n\nExecutada em ${date}. Comando reproduzível: \`npm run audit:lighthouse\`. Foram realizadas três medições sequenciais para cada página e perfil, totalizando 12 navegações. As medianas abaixo são calculadas separadamente por categoria e métrica, sem escolher apenas a melhor execução.\n\n| Perfil | Página | Performance ≥90 | Acessibilidade ≥95 | Boas práticas ≥95 | SEO ≥90 | LCP | CLS | TBT |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n## Ambiente e condições\n\n- ${environment.os}; ${environment.cpu}; ${environment.logicalCpus} CPUs lógicas; ${environment.memoryGiB} GiB RAM.\n- Node ${environment.node}; Playwright ${environment.playwright}; Lighthouse ${environment.lighthouse}; Lighthouse CI ${environment.lighthouseCI}.\n- Browser: ${results[0].runs[0].browser}.\n- ${environment.conditions}\n- Mobile: 390 × 844; desktop: 1440 × 900. Configurações de rede/CPU resolvidas constam em cada JSON e em \`reports/lighthouse/summary.json\`.\n- Identificador SHA-256 dos fontes/assets/build inputs: \`${environment.sourceSha256}\`.\n- Relatórios completos HTML e JSON: \`reports/lighthouse/\`; resumo legível por máquina: [summary.json](reports/lighthouse/summary.json); ambiente: [environment.json](reports/lighthouse/environment.json).\n\n## Diagnóstico\n\nAs causas abaixo vêm do relatório cuja pontuação de performance está mais próxima da mediana de cada conjunto. As medições dependem da máquina e do ambiente; os scores não são garantias de produção. Nenhuma imagem, fonte ou funcionalidade é removida para a auditoria.\n\n${findings}\n`,
)
console.log('Relatórios salvos em reports/lighthouse/ e AUDIT.md')
