import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'warn', quiet: true })
  }

  // Engine.IO captures WebSocket during module evaluation. Import the app only
  // after MSW patches that constructor, so socket.io-client uses the mock wire.
  const { App } = await import('@/app/App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
