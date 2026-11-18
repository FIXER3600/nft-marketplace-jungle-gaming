import { http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/lib/realtime-events'
import { authenticatedUser, readDatabase, resetDatabase } from './database'
import { recoverOrder } from './checkout'
import { updateNftMarket } from './nft-market'
import { scenario } from './network'
import { publishMockEvent, subscribeMockEvents } from './realtime-bus'

// MSW normalizes the Engine.IO /socket.io/ path to the Socket.IO namespace.
const channel = ws.link(import.meta.env.VITE_SOCKET_URL ?? location.origin)
const connections = new Set<{ close: () => void }>()
let pausedUntil = 0
const diagnostics = {
  connections: 0,
  marketSubscriptions: 0,
  orderSubscriptions: 0,
  marketFrames: 0,
  orderFrames: 0,
}

function sessionUser(token: string) {
  return authenticatedUser(
    new Request(new URL('/api/session', location.origin), {
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
}
function orderEvent(userId: string, id: string): OrderUpdatedEvent | null {
  const order = recoverOrder(userId, id)
  return order
    ? {
        eventId: `${order.id}:${order.version}`,
        userId,
        id: order.id,
        version: order.version,
        order: structuredClone(order),
      }
    : null
}
function marketEvent(): NftUpdatedEvent | null {
  const state = readDatabase().nftMarket['nft-001']
  return state
    ? {
        ...state,
        id: 'nft-001',
        editionId: 'limited-50',
        eventId: `nft-001:${state.version}`,
      }
    : null
}
function disconnect(duration: number) {
  pausedUntil = Date.now() + duration
  for (const connection of [...connections]) connection.close()
}

export const realtimeHandlers = [
  channel.addEventListener('connection', (connection) => {
    const socket = toSocketIo(connection)
    const entry = {
      close: () => connection.client.close(1012, 'Interrupção simulada'),
    }
    connections.add(entry)
    diagnostics.connections++
    let market = false
    let token = ''
    let orderId = ''
    let orderUserId = ''
    let lastOrderVersion = 0
    let closed = false
    const sendOrder = (event: OrderUpdatedEvent) => {
      if (closed || !token || sessionUser(token)?.id !== orderUserId) return
      if (event.userId !== orderUserId || event.id !== orderId) return
      socket.client.emit('order.updated', event)
      diagnostics.orderFrames++
      lastOrderVersion = Math.max(lastOrderVersion, event.version)
    }
    const unsubscribe = subscribeMockEvents((event) => {
      if (closed) return
      if (event.name === 'nft.updated' && market) {
        socket.client.emit(event.name, event.data)
        diagnostics.marketFrames++
      } else if (event.name === 'order.updated') sendOrder(event.data)
    })
    socket.client.on('nft.subscribe', () => {
      market = true
      diagnostics.marketSubscriptions++
      const current = marketEvent()
      if (current) {
        socket.client.emit('nft.updated', current)
        diagnostics.marketFrames++
      }
    })
    socket.client.on(
      'order.subscribe',
      (_event, input: { token?: string; orderId?: string }) => {
        if (
          typeof input?.token !== 'string' ||
          typeof input.orderId !== 'string'
        )
          return
        const user = sessionUser(input.token)
        if (!user) {
          socket.client.emit('session.expired')
          return
        }
        token = input.token
        orderId = input.orderId
        orderUserId = user.id
        diagnostics.orderSubscriptions++
        const current = orderEvent(user.id, orderId)
        if (current) sendOrder(current)
      },
    )
    // Engine.IO heartbeat: the published 0.2 binding supplies the handshake,
    // while the mock server must keep a long-lived connection alive.
    const heartbeat = window.setInterval(
      () => connection.client.send('2'),
      20_000,
    )
    const tick = window.setInterval(() => {
      if (Date.now() < pausedUntil) {
        entry.close()
        return
      }
      const current = scenario()
      if (
        market &&
        current === 'nft-updated' &&
        !readDatabase().nftMarket['nft-001']
      )
        updateNftMarket()
      if (
        market &&
        current === 'nft-sold-out' &&
        readDatabase().nftMarket['nft-001']?.available !== 0
      )
        updateNftMarket({ available: 0 })
      if (token && orderId) {
        if (sessionUser(token)?.id !== orderUserId) {
          socket.client.emit('session.expired')
          entry.close()
          return
        }
        const currentOrder = orderEvent(orderUserId, orderId)
        if (currentOrder && currentOrder.version > lastOrderVersion)
          sendOrder(currentOrder)
      }
    }, 250)
    connection.client.addEventListener('close', () => {
      closed = true
      connections.delete(entry)
      unsubscribe()
      window.clearInterval(tick)
      window.clearInterval(heartbeat)
    })
    if (Date.now() < pausedUntil) queueMicrotask(entry.close)
  }),
  // These endpoints exist only inside MSW. They configure deterministic network
  // fixtures; they never invoke UI setters, callbacks, or the Query cache.
  http.get('*/api/mock/realtime', () =>
    HttpResponse.json({ ...diagnostics, activeConnections: connections.size }),
  ),
  http.post('*/api/mock/realtime', async ({ request }) => {
    const input = (await request.json()) as {
      action: string
      price?: string
      available?: number
      duration?: number
      userId?: string
      orderId?: string
      version?: number
    }
    if (input.action === 'market') {
      if (
        (input.price !== undefined &&
          !/^\d+(\.\d{1,18})?$/.test(input.price)) ||
        (input.available !== undefined &&
          (!Number.isInteger(input.available) || input.available < 0))
      )
        return HttpResponse.json(
          { message: 'Estado de mercado inválido.' },
          { status: 422 },
        )
      return HttpResponse.json(updateNftMarket(input))
    }
    if (input.action === 'replay-market') {
      const event = marketEvent()
      if (event)
        publishMockEvent({
          name: 'nft.updated',
          data: {
            ...event,
            version: input.version ?? event.version,
            price: input.price ?? event.price,
          },
        })
      return HttpResponse.json({ emitted: !!event })
    }
    if (input.action === 'replay-order' && input.userId && input.orderId) {
      const event = orderEvent(input.userId, input.orderId)
      if (event) {
        const old = input.version !== undefined && input.version < event.version
        publishMockEvent({
          name: 'order.updated',
          data: {
            ...event,
            version: input.version ?? event.version,
            order: old
              ? {
                  ...event.order,
                  version: input.version!,
                  status: 'pending',
                  transactionId: null,
                }
              : event.order,
          },
        })
      }
      return HttpResponse.json({ emitted: !!event })
    }
    if (input.action === 'disconnect') {
      disconnect(Math.min(Math.max(input.duration ?? 2000, 0), 30_000))
      return HttpResponse.json({ disconnected: true })
    }
    return HttpResponse.json(
      { message: 'Ação de cenário desconhecida.' },
      { status: 422 },
    )
  }),
  http.post('*/api/mock/reset', () => {
    resetDatabase()
    pausedUntil = 0
    for (const connection of [...connections]) connection.close()
    for (const key of Object.keys(diagnostics) as (keyof typeof diagnostics)[])
      diagnostics[key] = 0
    return HttpResponse.json({ reset: true })
  }),
]
