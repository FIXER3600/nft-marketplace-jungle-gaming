import { expect, test, type Page } from '@playwright/test'

async function search(page: Page, value: string) {
  const trigger = page.getByRole('button', { name: 'Abrir busca', exact: true })
  if (await trigger.isVisible()) await trigger.click()
  const input = page.getByRole('searchbox', { name: 'Buscar coleções' })
  await input.fill(value)
  await input.press('Enter')
}

for (const [route, label, ready] of [
  ['/', 'Carregando NFTs', 'catalog-grid'],
  ['/nfts/nft-001', 'Carregando detalhes do NFT', 'nft-detail'],
  ['/carrinho', 'Carregando carrinho', 'empty-cart'],
]) {
  test(`skeleton com shimmer e movimento reduzido em ${route}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() =>
      localStorage.setItem('kurio.mock-scenario', 'slow'),
    )
    await page.goto(route)
    const loading = page.getByLabel(label, { exact: true })
    await expect(loading).toBeVisible()
    const shimmer = loading.locator('.skeleton-shimmer').first()
    await expect(shimmer).toBeVisible()
    expect(
      await shimmer.evaluate((element) => {
        const style = getComputedStyle(element, '::after')
        return (
          style.animationName === 'none' ||
          parseFloat(style.animationDuration) <= 0.01
        )
      }),
    ).toBe(true)
    await expect(loading).toBeHidden()
    if (ready === 'catalog-grid')
      await expect(page.getByTestId(ready).getByRole('article')).toHaveCount(9)
    else if (ready === 'nft-detail')
      await expect(
        page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
      ).toBeVisible()
    else
      await expect(
        page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
      ).toBeVisible()
  })
}

test('falha de conexão MSW permite recuperar o catálogo pela interface', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByTestId('catalog-grid').getByRole('article'),
  ).toHaveCount(9)
  await page.evaluate(() =>
    localStorage.setItem('kurio.mock-scenario', 'network-error'),
  )
  await search(page, 'Golden Signal')
  const catalog = page.getByRole('region', {
    name: 'Catálogo de NFTs',
    exact: true,
  })
  await expect(catalog.getByRole('alert')).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('kurio.mock-scenario'))
  await catalog
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(
    page.getByTestId('catalog-grid').getByRole('article'),
  ).toHaveCount(4)
  await expect(catalog.getByRole('alert')).toHaveCount(0)
})

test('resposta antiga não substitui a busca mais recente', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') })
  await page.goto('/')
  await expect(
    page.getByTestId('catalog-grid').getByRole('article'),
  ).toHaveCount(9)
  await page.evaluate(() =>
    localStorage.setItem('kurio.mock-scenario', 'variable-latency'),
  )
  const oldRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/nfts?') &&
      request.url().toLowerCase().includes('emerald'),
  )
  await search(page, 'Emerald')
  await oldRequest
  await search(page, 'Golden Signal')
  const cards = page.getByTestId('catalog-grid').getByRole('article')
  await expect(cards).toHaveCount(4)
  await page.clock.runFor(1600)
  await expect(page).toHaveURL(/q=Golden/)
  await expect(cards).toHaveCount(4)
  for (const card of await cards.all())
    await expect(card).toContainText('Golden Signal')
})

test('login é operável por teclado e devolve o foco ao acionador', async ({
  page,
}) => {
  await page.goto('/')
  const trigger = page.getByRole('button', {
    name: 'Entrar na conta',
    exact: true,
  })
  await expect(trigger).toBeEnabled()
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible()
  for (let index = 0; index < 14; index++) {
    await page.keyboard.press('Tab')
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(
    await trigger.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none')
})
