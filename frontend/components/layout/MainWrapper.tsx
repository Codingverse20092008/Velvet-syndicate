'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { PageTransition } from './PageTransition'

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <PageTransition>
      <main className={`flex-1 ${isAuthPage ? '' : 'pb-24 md:pb-0'}`}>
        {children}
      </main>
    </PageTransition>
  )
}
