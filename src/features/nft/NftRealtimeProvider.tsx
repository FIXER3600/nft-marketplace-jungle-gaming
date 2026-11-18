import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useAuth } from '@/features/auth/context'
import { readSessionToken } from '@/lib/session-token'
import type { NftUpdatedEvent } from '@/lib/realtime-events'

export default function NftRealtimeProvider({
  children,
}: {
  children: ReactNode
}) {
  const client = useQueryClient()
  const { user } = useAuth()
  const token = readSessionToken()
  const versions = useRef(new Map<string, number>())
  useEffect(() => {
    let active = true
    let connectedOnce = false
    versions.current.clear()
    const socket = io(
      import.meta.env.VITE_SOCKET_URL ?? window.location.origin,
      {
        transports: ['websocket'],
        forceNew: true,
        autoConnect: false,
        reconnectionDelay: 500,
        reconnectionDelayMax: 1000,
        randomizationFactor: 0,
      },
    )
    const reconcile = () => {
      if (!active || readSessionToken() !== token) return
      // REST is authoritative, including filters, sorting, stock and totals.
      // Cancellation prevents an older in-flight response from replacing it.
      for (const queryKey of [
        ['catalog'],
        ['nft'],
        ['nft-related'],
        ['cart'],
      ]) {
        void client.cancelQueries({ queryKey }).then(() => {
          if (active && readSessionToken() === token)
            void client.invalidateQueries({ queryKey, refetchType: 'active' })
        })
      }
    }
    const receive = (event: NftUpdatedEvent) => {
      if (
        !active ||
        readSessionToken() !== token ||
        !event.eventId ||
        !Number.isInteger(event.version) ||
        event.version <= (versions.current.get(event.id) ?? 0)
      )
        return
      versions.current.set(event.id, event.version)
      reconcile()
    }
    const connect = () => {
      if (!active || readSessionToken() !== token) return
      socket.emit('nft.subscribe')
      if (connectedOnce) reconcile()
      connectedOnce = true
    }
    socket.on('connect', connect)
    socket.on('nft.updated', receive)
    socket.connect()
    return () => {
      active = false
      socket.off('connect', connect)
      socket.off('nft.updated', receive)
      socket.disconnect()
    }
  }, [client, user?.id, token])
  return children
}
