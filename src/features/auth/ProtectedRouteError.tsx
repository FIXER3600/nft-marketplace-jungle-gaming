import { useEffect } from 'react'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useCatalogControls } from '@/features/catalog/useCatalogControls'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuth } from './context'
import { AuthenticationRequiredError } from './session-query'

export default function ProtectedRouteError({ error }: ErrorComponentProps) {
  const { openLogin } = useAuth()
  const controls = useCatalogControls()
  const router = useRouter()
  const location = useLocation()
  const checkout = location.pathname === '/pagamento'
  const needsLogin = error instanceof AuthenticationRequiredError
  useEffect(() => {
    const previous = document.title
    document.title = checkout ? 'Pagamento | Kurio' : 'Minha conta | Kurio'
    return () => {
      document.title = previous
    }
  }, [checkout])
  return (
    <>
      <div className="hidden lg:block">
        <Header {...controls} />
      </div>
      <main
        className={
          checkout
            ? 'page-container min-h-dvh px-7! pt-7 pb-6 lg:min-h-0 lg:px-6! lg:pt-8 lg:pb-24'
            : 'page-container min-h-dvh pt-5 pb-36 lg:pt-8 lg:pb-16'
        }
      >
        <div className="mb-5 flex min-h-11 items-center gap-4 lg:hidden">
          <Link
            to={checkout ? '/carrinho' : '/'}
            aria-label={checkout ? 'Voltar ao carrinho' : 'Voltar ao início'}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
          <p className="text-xl font-bold">
            {checkout ? 'Pagamento com carteira' : 'Minha conta'}
          </p>
        </div>
        {checkout && (
          <nav
            aria-label="Caminho da página"
            className="mb-7 hidden gap-2 text-sm font-bold lg:flex"
          >
            <Link to="/">Início</Link>
            <span>/</span>
            <Link to="/" hash="catalogo">
              Mercado
            </Link>
            <span>/</span>
            <h1>Pagamento</h1>
          </nav>
        )}
        <section className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-xl font-bold">
            {needsLogin
              ? checkout
                ? 'Entre para concluir sua compra'
                : 'Entre para acessar sua conta'
              : 'Não foi possível recuperar a sessão'}
          </h1>
          <p
            role={needsLogin ? undefined : 'alert'}
            className="mt-3 text-sm leading-relaxed text-muted-foreground"
          >
            {needsLogin
              ? checkout
                ? 'Seus NFTs continuam no carrinho. Após entrar, você poderá escolher a carteira e revisar o pagamento.'
                : 'Seus dados e carteiras ficam disponíveis após o login.'
              : apiErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={needsLogin ? openLogin : () => void router.invalidate()}
            className="mt-6 min-h-12 w-full rounded-full bg-primary px-5 font-bold text-primary-foreground"
          >
            {needsLogin
              ? checkout
                ? 'Entrar para continuar'
                : 'Entrar na conta'
              : 'Tentar novamente'}
          </button>
          <Link
            to={checkout ? '/carrinho' : '/'}
            className="mt-3 flex min-h-11 items-center justify-center text-primary"
          >
            {checkout ? 'Voltar ao carrinho' : 'Voltar ao início'}
          </Link>
        </section>
      </main>
      {checkout && (
        <div className="hidden lg:block">
          <Footer />
        </div>
      )}
    </>
  )
}
