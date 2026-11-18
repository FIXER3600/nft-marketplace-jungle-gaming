import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/lib/realtime-events'

export type MockEvent =
  | { name: 'nft.updated'; data: NftUpdatedEvent }
  | { name: 'order.updated'; data: OrderUpdatedEvent }

// This bus only joins mock REST state and the mock server transport. UI code
// never imports it: all events leave through an intercepted Socket.IO frame.
const subscribers = new Set<(event: MockEvent) => void>()
export function publishMockEvent(event: MockEvent) {
  for (const subscriber of subscribers) subscriber(event)
}
export function subscribeMockEvents(listener: (event: MockEvent) => void) {
  subscribers.add(listener)
  return () => {
    subscribers.delete(listener)
  }
}
