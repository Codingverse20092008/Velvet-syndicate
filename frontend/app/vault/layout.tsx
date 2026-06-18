import { VaultLaunchGuard } from '@/components/vault/VaultLaunchGuard'

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <VaultLaunchGuard>{children}</VaultLaunchGuard>
}