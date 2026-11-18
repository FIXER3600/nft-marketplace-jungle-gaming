import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { HomePage } from '@/pages/home'
import { normalizeCatalogSearch } from '@/features/catalog/search'
import type { CatalogSearch } from '@/features/catalog/search'
import NotFoundPage from '@/pages/not-found'
import RootLayout from './RootLayout'
import type { QueryClient } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import {
  AuthenticationRequiredError,
  sessionQueryOptions,
} from '@/features/auth/session-query'

async function requireSession({
  context,
}: {
  context: { queryClient: QueryClient }
}) {
  const { user } = await context.queryClient.fetchQuery({
    ...sessionQueryOptions,
    staleTime: 0,
  })
  if (!user) throw new AuthenticationRequiredError()
  return { user }
}
const privateRouteOptions = {
  beforeLoad: requireSession,
  errorComponent: lazyRouteComponent(
    () => import('@/features/auth/ProtectedRouteError'),
  ),
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): CatalogSearch =>
    normalizeCatalogSearch(search),
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  validateSearch: (
    search: Record<string, unknown>,
  ): CatalogSearch & { edition?: string } => ({
    ...normalizeCatalogSearch(search),
    edition: typeof search.edition === 'string' ? search.edition : undefined,
  }),
  component: lazyRouteComponent(() => import('@/pages/nft-detail')),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  validateSearch: (search: Record<string, unknown>): CatalogSearch =>
    normalizeCatalogSearch(search),
  component: lazyRouteComponent(() => import('@/pages/cart')),
})

const checkoutRoute = createRoute({
  ...privateRouteOptions,
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  validateSearch: (search: Record<string, unknown>): { pedido?: string } => ({
    pedido:
      typeof search.pedido === 'string' &&
      /^[a-zA-Z0-9-]{10,100}$/.test(search.pedido)
        ? search.pedido
        : undefined,
  }),
  component: lazyRouteComponent(() => import('@/pages/checkout')),
})

const profileRoute = createRoute({
  ...privateRouteOptions,
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: lazyRouteComponent(() => import('@/pages/account')),
})
const walletsRoute = createRoute({
  ...privateRouteOptions,
  getParentRoute: () => rootRoute,
  path: '/perfil/carteiras',
  component: lazyRouteComponent(() => import('@/pages/account')),
})
const favoritesRoute = createRoute({
  ...privateRouteOptions,
  getParentRoute: () => rootRoute,
  path: '/perfil/favoritos',
  component: lazyRouteComponent(() => import('@/pages/account')),
})

export const router = createRouter({
  context: { queryClient },
  routeTree: rootRoute.addChildren([
    indexRoute,
    nftRoute,
    cartRoute,
    checkoutRoute,
    profileRoute,
    walletsRoute,
    favoritesRoute,
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
