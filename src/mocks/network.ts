import { delay, http, HttpResponse } from 'msw'

export const scenario = () =>
  localStorage.getItem('kurio.mock-scenario') ?? 'default'

/** Predictable timings allow out-of-order requests to be reproduced. */
export const networkHandlers = [
  http.all('*/api/*', async ({ request }) => {
    if (new URL(request.url).pathname.startsWith('/api/mock/')) return
    const current = scenario()
    if (current === 'network-error') return HttpResponse.error()
    if (current === 'forbidden' && request.headers.has('Authorization'))
      return HttpResponse.json(
        { message: 'Sem permissão para acessar este recurso.' },
        { status: 403 },
      )
    if (current === 'slow') await delay(1200)
    if (current === 'variable-latency' || current === 'out-of-order') {
      const query = new URL(request.url).searchParams.get('q') ?? ''
      await delay(query.toLowerCase().includes('emerald') ? 1200 : 80)
    }
  }),
]
