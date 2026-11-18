import { CancelledError, queryOptions } from '@tanstack/react-query'
import { http } from '@/lib/http'
import { readSessionToken, writeSessionToken } from '@/lib/session-token'
import type { SessionUser } from './context'

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async ({ signal }) => {
    const token = readSessionToken()
    const { data } = await http.get<{ user: SessionUser | null }>('/session', {
      signal,
    })
    // A response from a previous login must never restore that account.
    if (token !== readSessionToken()) throw new CancelledError({ silent: true })
    if (!data.user) writeSessionToken(null)
    return data
  },
  retry: false,
  staleTime: 30_000,
})

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Entre na sua conta para continuar.')
    this.name = 'AuthenticationRequiredError'
  }
}
