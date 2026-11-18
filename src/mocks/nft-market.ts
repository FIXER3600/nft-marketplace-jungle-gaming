import type { NftUpdatedEvent } from '@/lib/realtime-events'
import { readDatabase, writeDatabase } from './database'
import { publishMockEvent } from './realtime-bus'

export function updateNftMarket(
  input: { price?: string; available?: number } = {},
): NftUpdatedEvent {
  const data = readDatabase()
  const previous = data.nftMarket['nft-001']
  const event: NftUpdatedEvent = {
    eventId: `nft-001:${(previous?.version ?? 0) + 1}`,
    id: 'nft-001',
    editionId: 'limited-50',
    version: (previous?.version ?? 0) + 1,
    price: input.price ?? '1.29',
    available: input.available ?? 1,
  }
  data.nftMarket[event.id] = {
    version: event.version,
    price: event.price,
    available: event.available,
  }
  for (const [owner, lines] of Object.entries(data.carts)) {
    const line = lines.find(
      (item) => item.nftId === event.id && item.editionId === event.editionId,
    )
    if (!line) continue
    const warnings = new Set(data.cartWarnings[owner] ?? [])
    warnings.add(
      'O preço ou a disponibilidade de Emerald Ape #042 mudou. Revise os valores antes de comprar.',
    )
    if (line.quantity > event.available) {
      line.quantity = event.available
      warnings.add(
        'A quantidade de Emerald Ape #042 foi ajustada ao limite disponível.',
      )
    }
    data.carts[owner] = lines.filter((item) => item.quantity > 0)
    data.cartWarnings[owner] = [...warnings]
  }
  writeDatabase(data)
  publishMockEvent({ name: 'nft.updated', data: event })
  return event
}
