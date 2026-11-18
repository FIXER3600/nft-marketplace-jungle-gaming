import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function waitForAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    for (
      let y = 0;
      y < document.documentElement.scrollHeight;
      y += innerHeight
    ) {
      scrollTo(0, y)
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    }
    await Promise.all(
      [...document.images]
        .filter((image) => {
          const bounds = image.getBoundingClientRect()
          return bounds.right > 0 && bounds.left < innerWidth
        })
        .map((image) => {
          if (image.complete) return Promise.resolve()
          return new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          })
        }),
    )
    scrollTo(0, 0)
  })
}

async function addToCart(page: Page) {
  await page.goto('/nfts/nft-001')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
  await page.getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('1.206 ETH')
}

async function prepareCheckout(page: Page) {
  await addToCart(page)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.getByRole('button', { name: 'Entrar para continuar' }).click()
  const login = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await login.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(login).toBeHidden()
  await page
    .getByRole('button', { name: 'Conectar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeVisible()
}

// Playwright creates a fresh browser context for every test. No database writes
// bypass REST: cart and session fixtures are prepared through the visible flow.
for (const label of [
  'início',
  'detalhe-nft',
  'carrinho',
  'pagamento',
] as const) {
  test(`${label} preserva o layout e não causa overflow`, async ({ page }) => {
    if (label === 'carrinho') await addToCart(page)
    else if (label === 'pagamento') await prepareCheckout(page)
    else {
      await page.goto(label === 'início' ? '/' : '/nfts/nft-001')
      if (label === 'início')
        await expect(page.getByTestId('catalog-grid')).toBeVisible()
      else
        await expect(
          page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
        ).toBeVisible()
    }
    await waitForAssets(page)
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true)
    if (test.info().project.name !== 'tablet') {
      await expect(page).toHaveScreenshot(`${label}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      })
    }
  })
}
