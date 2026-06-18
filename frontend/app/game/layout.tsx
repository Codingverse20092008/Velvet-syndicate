import { VaultLaunchGuard } from '@/components/vault/VaultLaunchGuard'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <VaultLaunchGuard>{children}</VaultLaunchGuard>
}