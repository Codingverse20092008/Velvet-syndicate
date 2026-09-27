import type { Metadata } from 'next'
// Force redeploy - Production Wipe Complete
import './globals.css'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { AuthProvider } from './providers'
import { ActiveOrderBanner } from '@/components/user/ActiveOrderBanner'
import { ReturnVisitTracker } from '@/components/analytics/ReturnVisitTracker'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { SocialProof } from '@/components/ui/SocialProof'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SplashScreen />
        <SocialProof />
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
        </AuthProvider>
      </body>
    </html>
  )
}
