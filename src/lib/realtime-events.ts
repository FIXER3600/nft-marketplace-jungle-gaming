import type { Order } from '@/features/checkout/types'

/** Events identify both the resource and its monotonic revision. */
export type NftUpdatedEvent = {
  eventId: string
  id: string
  editionId: string
  version: number
  price: string
  available: number
}
export type OrderUpdatedEvent = {
  eventId: string
  userId: string
  id: string
  version: number
  order: Order
}
