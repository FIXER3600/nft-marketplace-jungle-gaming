import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function control(page: Page, body: Record<string, unknown>) {
  return page.evaluate(async (payload) => {
    const response = await fetch('/api/mock/realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  }, body)
}
async function diagnostics(page: Page) {
  return page.evaluate(async () => (await fetch('/api/mock/realtime')).json())
}
async function setup(page: Page) {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
  await page.getByRole('link', { name: 'Ver carrinho' }).click()
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
async function review(page: Page) {
  await page
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Revisar pagamento' })
  await expect(dialog).toBeVisible()
  return dialog
}
const receipt = (page: Page) =>
  page.getByRole('dialog', { name: 'Pedido confirmado' })

test('evento Socket.IO altera checkout, invalida a revisão e exige confirmar a nova cotação', async ({
  page,
}) => {
  await setup(page)
  const first = await review(page)
  await expect(first.getByTestId('checkout-total')).toHaveText('1.206 ETH')
  await expect
    .poll(async () => (await diagnostics(page)).marketSubscriptions)
    .toBeGreaterThan(0)
  await control(page, { action: 'market', price: '1.29', available: 1 })
  await expect(first).toBeHidden()
  await expect(page.getByRole('alert')).toContainText('Revise a nova cotação')
  const second = await review(page)
  await expect(second.getByTestId('checkout-total')).toHaveText('1.306 ETH')
  await second.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(receipt(page)).toBeVisible({ timeout: 10000 })
  await expect(receipt(page)).toContainText('1.306 ETH')
  expect((await diagnostics(page)).marketFrames).toBeGreaterThan(0)
  // The field is updated only by order.updated received by socket.io-client.
  await expect(page.getByTestId('order-status')).toHaveAttribute(
    'data-socket-version',
    '2',
  )
})

test('eventos de mercado duplicados ou antigos não fazem preço e estoque regredirem', async ({
  page,
}) => {
  await page.goto('/nfts/nft-001')
  const price =
    page.viewportSize()!.width < 1024
      ? page.getByLabel('Total selecionado')
      : page.getByTestId('nft-edition-price')
  await expect(price).toHaveText('1.19 ETH')
  await expect
    .poll(async () => (await diagnostics(page)).marketSubscriptions)
    .toBeGreaterThan(0)
  await control(page, { action: 'market', price: '1.29', available: 1 })
  await expect(price).toHaveText('1.29 ETH')
  await control(page, { action: 'replay-market' })
  await control(page, { action: 'replay-market', version: 0, price: '0.01' })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(price).toHaveText('1.29 ETH')
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await page.reload()
  await expect(price).toHaveText('1.29 ETH')
  const state = await diagnostics(page)
  expect(state.marketSubscriptions).toBeGreaterThan(0)
  expect(state.marketFrames).toBeGreaterThan(0)
})

test('desconexão em pedido pendente reconcilia pela API e conserva uma única compra', async ({
  page,
}) => {
  const now = new Date('2026-11-17T12:00:00Z')
  await page.clock.setFixedTime(now)
  await setup(page)
  await page.evaluate(() =>
    localStorage.setItem('kurio.mock-scenario', 'order-pending'),
  )
  let submissions = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders'))
      submissions++
  })
  await (
    await review(page)
  )
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento em processamento' }),
  ).toBeVisible()
  await expect
    .poll(async () => (await diagnostics(page)).orderSubscriptions)
    .toBeGreaterThan(0)
  const before = await diagnostics(page)
  await control(page, { action: 'disconnect', duration: 2000 })
  await page.clock.setFixedTime(new Date(now.getTime() + 8000))
  await expect(receipt(page)).toBeVisible({ timeout: 10000 })
  await expect
    .poll(async () => (await diagnostics(page)).orderSubscriptions)
    .toBeGreaterThan(before.orderSubscriptions)
  await expect(page.getByTestId('order-status')).toHaveAttribute(
    'data-socket-version',
    '2',
  )
  const url = page.url()
  await page.reload()
  await expect(page).toHaveURL(url)
  await expect(receipt(page)).toBeVisible()
  expect(submissions).toBe(1)
})

test('evento terminal duplicado e evento antigo não reabrem pedido nem removem itens adicionais', async ({
  page,
}) => {
  const now = new Date('2026-11-17T13:00:00Z')
  await page.clock.setFixedTime(now)
  await setup(page)
  await (
    await review(page)
  )
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento em processamento' }),
  ).toBeVisible()
  const orderUrl = page.url()
  const orderId = new URL(orderUrl).searchParams.get('pedido')!
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Carrinho de NFTs' }),
  ).toContainText('Qtd. 2')
  await page.goto(orderUrl)
  await page.clock.setFixedTime(new Date(now.getTime() + 3000))
  await expect(receipt(page)).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('order-status')).toHaveAttribute(
    'data-socket-version',
    '2',
  )
  await control(page, { action: 'replay-order', userId: 'ana', orderId })
  await control(page, {
    action: 'replay-order',
    userId: 'ana',
    orderId,
    version: 1,
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(receipt(page)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Pagamento em processamento' }),
  ).toHaveCount(0)
  await page.goto('/carrinho')
  await expect(page.getByRole('spinbutton')).toHaveValue('1')
  await expect(page.getByTestId('cart-subtotal')).toHaveText('1.19 ETH')
})

test('edição esgotada por Socket.IO bloqueia compra e mantém a resposta REST coerente', async ({
  page,
}) => {
  await page.goto('/nfts/nft-001')
  const buy = page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
  await expect(buy).toBeEnabled()
  await expect
    .poll(async () => (await diagnostics(page)).marketSubscriptions)
    .toBeGreaterThan(0)
  await control(page, { action: 'market', available: 0 })
  await expect(buy).toBeDisabled()
  await expect(
    page.getByText('Esta edição está esgotada. Escolha outra edição.'),
  ).toBeVisible()
  await page.reload()
  await expect(buy).toBeDisabled()
})

test('troca de conta libera subscriptions e não recebe pedido da sessão anterior', async ({
  page,
}) => {
  const now = new Date('2026-11-17T14:00:00Z')
  await page.clock.setFixedTime(now)
  await setup(page)
  await (
    await review(page)
  )
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento em processamento' }),
  ).toBeVisible()
  await expect
    .poll(async () => (await diagnostics(page)).orderSubscriptions)
    .toBeGreaterThan(0)
  const orderUrl = page.url()
  const orderId = new URL(orderUrl).searchParams.get('pedido')!
  await page
    .getByRole('link', { name: 'Continuar explorando', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Abrir menu da conta de Ana', exact: true })
    .click()
  await page
    .getByRole('menuitem', { name: 'Sair da conta', exact: true })
    .click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Sair da conta', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Entrar na conta', exact: true })
    .click()
  const login = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await login.getByLabel('E-mail', { exact: true }).fill('bruno@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(login).toBeHidden()
  await expect(
    page.getByRole('button', {
      name: 'Abrir menu da conta de Bruno',
      exact: true,
    }),
  ).toBeVisible()
  await expect
    .poll(async () => (await diagnostics(page)).activeConnections)
    .toBe(1)
  const before = (await diagnostics(page)).orderFrames
  await page.clock.setFixedTime(new Date(now.getTime() + 3000))
  await control(page, { action: 'replay-order', userId: 'ana', orderId })
  expect((await diagnostics(page)).orderFrames).toBe(before)
  await expect(receipt(page)).toHaveCount(0)
  await page.goto(orderUrl)
  await expect(page.getByRole('alert')).toContainText(
    'Pedido não encontrado nesta conta',
  )
  await expect(receipt(page)).toHaveCount(0)
})
