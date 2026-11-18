import { useEffect, useRef } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { router } from './router'
import AuthProvider from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/context'
import CartProvider from '@/features/cart/CartProvider'
import NftRealtimeProvider from '@/features/nft/NftRealtimeProvider'

function AuthenticatedRouter() {
  const { user, loading } = useAuth()
  const identity = user?.id ?? null
  const previous = useRef<{ identity: string | null; loading: boolean } | null>(
    null,
  )
  useEffect(() => {
    const old = previous.current
    previous.current = { identity, loading }
    if (old && (old.identity !== identity || old.loading !== loading))
      void router.invalidate()
  }, [identity, loading])
  return <RouterProvider router={router} />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <NftRealtimeProvider>
            <AuthenticatedRouter />
          </NftRealtimeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
