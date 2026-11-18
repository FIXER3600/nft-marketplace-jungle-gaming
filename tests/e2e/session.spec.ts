import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function login(page: Page, email = 'ana@kurio.test') {
  await page
    .getByRole('button', { name: /^Entrar (para continuar|na conta)$/ })
    .filter({ visible: true })
    .last()
    .click()
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await dialog.getByLabel('E-mail', { exact: true }).fill(email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio123!')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
}

for (const path of [
  '/perfil',
  '/perfil/carteiras',
  '/perfil/favoritos',
  '/pagamento',
]) {
  test('protege o acesso direto e retoma a rota ' + path, async ({ page }) => {
    const privateRequests: string[] = []
    page.on('request', (request) => {
      if (
        /\/api\/(profile|wallets|checkout|favorites|orders)(?:[/?]|$)/.test(
          request.url(),
        )
      )
        privateRequests.push(request.url())
    })
    await page.goto(path)
    await expect(
      page.getByRole('heading', {
        name:
          path === '/pagamento'
            ? 'Entre para concluir sua compra'
            : 'Entre para acessar sua conta',
        exact: true,
      }),
    ).toBeVisible()
    expect(privateRequests).toEqual([])
    await expect(page).toHaveURL(new RegExp(path + '$'))
    await login(page)
    await expect(page).toHaveURL(new RegExp(path + '$'))
    await expect(
      page.getByRole('heading', {
        name:
          path === '/pagamento'
            ? 'Entre para concluir sua compra'
            : 'Entre para acessar sua conta',
        exact: true,
      }),
    ).toBeHidden()
    await page.reload()
    await expect(
      page.getByRole('heading', {
        name:
          path === '/pagamento'
            ? 'Entre para concluir sua compra'
            : 'Entre para acessar sua conta',
        exact: true,
      }),
    ).toBeHidden()
    if (path === '/perfil')
      await expect(
        page.getByLabel('Nome de exibição', { exact: false }),
      ).toHaveValue('Ana')
    if (path === '/perfil/carteiras')
      await expect(
        page.getByRole('heading', { name: 'Suas carteiras', exact: true }),
      ).toBeVisible()
    if (path === '/perfil/favoritos')
      await expect(
        page.getByRole('heading', {
          name: 'Sua lista ainda está vazia',
          exact: true,
        }),
      ).toBeVisible()
  })
}

test('expiração da sessão no checkout preserva carrinho e a rota para retomada', async ({
  page,
}) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click()
  await page.getByRole('link', { name: 'Ver carrinho' }).click()
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await login(page)
  await page
    .getByRole('button', { name: 'Conectar carteira', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeVisible()
  const mobile = page.viewportSize()!.width < 1024
  if (mobile)
    await page.getByRole('button', { name: 'Dados do colecionador' }).click()
  await page
    .getByLabel('Nome de exibição', { exact: true })
    .fill('Ana Rascunho')
  await page.evaluate(() =>
    localStorage.setItem('kurio.mock-scenario', 'session-expired'),
  )
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Entre para concluir sua compra',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(
    page.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toHaveCount(0)
  await page.evaluate(() => localStorage.removeItem('kurio.mock-scenario'))
  await login(page)
  if (!mobile)
    await expect(
      page.getByText('Emerald Ape #042', { exact: true }),
    ).toBeVisible()
  const total = page.getByTestId(
    mobile ? 'checkout-total-mobile' : 'checkout-total',
  )
  await expect(total).toHaveText('1.206 ETH')
  if (mobile)
    await page.getByRole('button', { name: 'Dados do colecionador' }).click()
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Ana Rascunho')
  await page.reload()
  await expect(total).toHaveText('1.206 ETH')
  await page.goto('/carrinho')
  await expect(
    page.getByRole('listitem', {
      name: 'Emerald Ape #042, edição 1/50',
      exact: true,
    }),
  ).toBeVisible()
})

test('atividade informa fora do escopo e não expõe uma página funcional', async ({
  page,
}) => {
  await page.goto('/perfil')
  await login(page)
  const nav = page.getByRole('navigation', {
    name:
      page.viewportSize()!.width >= 1024
        ? 'Menu do perfil'
        : 'Menu do perfil mobile',
    exact: true,
  })
  await nav.getByRole('button', { name: 'Atividade', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Atividade', exact: true }),
  ).toContainText('não faz parte desta demonstração')
  await page.keyboard.press('Escape')
  await expect(
    nav.getByRole('button', { name: 'Atividade', exact: true }),
  ).toBeFocused()
  await page.goto('/perfil/atividade')
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada', exact: true }),
  ).toBeVisible()
})

test('erros dos dados de carteira são associados aos campos e recebem foco', async ({
  page,
}) => {
  await page.goto('/perfil/carteiras')
  await login(page)
  const displayName = page.getByLabel('Nome de exibição', { exact: false })
  await displayName.fill('')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(displayName).toHaveAttribute('aria-invalid', 'true')
  await expect(displayName).toBeFocused()
  await expect(page.locator('#wallet-displayName-error')).toHaveText(
    'Informe o nome de exibição.',
  )
  await displayName.fill('Ana')
  const email = page.getByLabel('E-mail', { exact: false })
  await email.fill('invalido')
  await page
    .getByRole('button', { name: 'Salvar carteira', exact: true })
    .click()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toBeFocused()
  await expect(page.locator('#wallet-email-error')).toHaveText(
    'Informe um e-mail válido.',
  )
})
