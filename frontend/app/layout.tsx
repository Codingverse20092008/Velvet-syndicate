import type { Metadata } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
// @ts-ignore
import './globals.css'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { AuthProvider } from './providers'
import { ActiveOrderBanner } from '@/components/user/ActiveOrderBanner'
import { ReturnVisitTracker } from '@/components/analytics/ReturnVisitTracker'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ExitIntentModal } from '@/components/cart/ExitIntentModal'
import { SyndicateAIWidget } from '@/components/ai/SyndicateAIWidget'

export const metadata: Metadata = {
  title: 'Velvet Syndicate | Wear the Unspoken',
  description: 'Premium footwear designed for silent luxury. The unspoken presence.',
  keywords: ['luxury footwear', 'premium sneakers', 'minimal fashion', 'streetwear'],
  authors: [{ name: 'Velvet Syndicate' }],
  openGraph: {
    title: 'Velvet Syndicate | Wear the Unspoken',
    description: 'Premium footwear designed for silent luxury.',
    type: 'website',
    locale: 'en_US',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

import { MainWrapper } from '@/components/layout/MainWrapper'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-montserrat',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body className={montserrat.className}>
        <SplashScreen />
        <MobileBottomNav />
        <AuthProvider>
          <Navigation />
          <ActiveOrderBanner />
          <ReturnVisitTracker />
          <MainWrapper>{children}</MainWrapper>
          <div className="hidden md:block">
            <Footer />
          </div>
          <CartDrawer />
          <ExitIntentModal />
          <SyndicateAIWidget />
        </AuthProvider>
      </body>
    </html>
  )
}
