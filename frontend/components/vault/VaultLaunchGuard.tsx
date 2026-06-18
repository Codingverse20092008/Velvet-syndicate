'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { isVaultLive, canAccessVault } from '@/lib/vault-launch'
import { trackEvent } from '@/lib/analytics'

export function VaultLaunchGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isLoading) return

    if (!canAccessVault(user)) {
      if (isVaultLive()) {
        trackEvent('VAULT_LOGIN_REDIRECT', {
          userId: user?.id,
          path: pathname,
        })
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      } else {
        trackEvent('VAULT_ACCESS_BLOCKED', {
          userId: user?.id,
          role: user?.role,
        })
        router.replace('/vault-coming-soon')
      }
    } else if (isVaultLive() && user) {
      trackEvent('VAULT_ENTRY_SUCCESS', {
        userId: user.id,
        path: pathname,
      })
    }
  }, [user, isLoading, router, pathname])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-velvet-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-velvet-white" />
      </div>
    )
  }

  if (!canAccessVault(user)) {
    return null
  }

  return <>{children}</>
}
